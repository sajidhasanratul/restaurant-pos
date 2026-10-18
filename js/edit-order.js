(function () {
  'use strict';

  const EditOrder = {
    editOrderId: null,
    activeOrder: null,
    cart: [],
    selectedCustomer: null,
    payments: [],

    async render(orderId) {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

      await H.loadPaymentMethods();

      this.editOrderId = orderId;
      this.cart = [];
      this.selectedCustomer = null;
      this.payments = [];

      this.activeOrder = await S.getById('orders', orderId);
      if (!this.activeOrder) {
        H.showToast('Order not found', 'error');
        POS.Router.navigate('/sales-list');
        return;
      }

      const items = await S.query('orderItems', i => i.orderId === orderId);
      const pmts = await S.query('payments', p => p.orderId === orderId);
      const prods = await S.getAll('products');

      this.cart = items.map(i => {
        const isCustom = (i.productId && i.productId.startsWith('custom_')) || !i.productId;
        const p = prods.find(prod => prod.id === i.productId);
        let stock = isCustom ? 999999 : (p ? p.stock : i.qty);
        let sku = '';
        if (p) {
          if (i.variationName && p.variations) {
            const v = p.variations.find(varObj => varObj.name === i.variationName);
            if (v) {
              stock = v.stock;
              sku = v.sku || p.sku || '';
            } else {
              sku = p.sku || '';
            }
          } else {
            sku = p.sku || '';
          }
        }
        return {
          id: i.id,
          productId: i.productId,
          productName: i.productName,
          variationName: i.variationName || '',
          sku: sku || (isCustom ? 'CUSTOM' : ''),
          unitPrice: parseFloat(i.unitPrice) || 0,
          costPrice: parseFloat(i.costPrice) || 0,
          qty: parseInt(i.qty) || 1,
          image: p ? p.image : '',
          stock: isCustom ? 999999 : (stock + i.qty), // make original quantity editable by adding back to stock pool
          isCustom: !!isCustom
        };
      });

      this.payments = pmts.map(p => ({
        method: p.method,
        amount: parseFloat(p.amount) || 0,
        lastFour: p.lastFour || p.lastfour || ''
      }));

      if (this.payments.length === 0) {
        this.payments = [{ method: 'Cash', amount: 0 }];
      }

      if (this.activeOrder.customerId && this.activeOrder.customerId !== 'walk-in') {
        const cust = await S.getById('customers', this.activeOrder.customerId);
        if (cust) this.selectedCustomer = cust;
      }

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <h2 class="page-title">✏️ Edit Sales Invoice</h2>
            <p class="page-subtitle">Modify items, pricing, SKU or payment splits for Invoice <strong>${H.esc(this.activeOrder.invoiceId)}</strong>.</p>
          </div>
          <div class="page-actions">
            <a href="/sales-list" class="btn btn-secondary btn-sm" style="display:flex; align-items:center; gap:6px; font-weight:600;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              Back to Sales List
            </a>
          </div>
        </div>

        <div class="order-layout fade-in">
          <!-- Left Panel: Form & Cart -->
          <div class="flex flex-col gap-3">
            <!-- Customer & Date -->
            <div class="card" style="box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
              <div class="card-body form-row" style="gap:16px;">
                <div class="form-group" style="position:relative; margin-bottom:0;">
                  <label class="form-label" style="font-weight:700; font-size:12px; color:#334155;">Customer Phone / Name</label>
                  <input type="text" class="form-input" id="search-customer" placeholder="Search phone or name..." style="border: 1.5px solid #cbd5e1; font-weight:500; border-radius:6px; height:40px;">
                  <div class="product-results" id="customer-results"></div>
                  <div id="customer-details" class="mt-2" style="display:none;"></div>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" style="font-weight:700; font-size:12px; color:#334155;">Sales Date</label>
                  <input type="date" class="form-input" id="sales-date" value="${H.formatDateInput(this.activeOrder.date)}" style="border: 1.5px solid #cbd5e1; border-radius:6px; height:40px;">
                </div>
              </div>
            </div>

            <!-- Product Search & Cart Table -->
            <div class="card" style="box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
              <div class="card-body">
                <div class="product-search-wrap">
                  <div style="display: flex; gap: 8px;">
                    <div class="search-box" style="flex: 1; position:relative;">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); pointer-events:none;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      <input type="text" id="search-product" placeholder="Type product name, SKU or scan barcode..." style="padding-left:36px; border: 1.5px solid #cbd5e1; font-weight:500; border-radius:6px; height:42px;">
                    </div>
                    <button class="btn btn-secondary" id="btn-add-custom-prod" title="Add Custom Product" style="white-space:nowrap; font-weight:600; padding:0 14px; height:42px; border-radius:6px; border:1.5px solid #cbd5e1;">+ Custom Item</button>
                  </div>
                  <div class="product-results" id="product-results"></div>
                </div>

                <div class="table-wrapper mt-3" style="border-radius:8px; border:1px solid #e2e8f0; max-height:480px; overflow-y:auto;">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Product / Variation & SKU</th>
                        <th style="width:125px;">Price</th>
                        <th style="width:120px;" class="text-center">Qty</th>
                        <th style="width:120px;" class="text-right">Total</th>
                        <th style="width:40px;"></th>
                      </tr>
                    </thead>
                    <tbody id="cart-tbody"></tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- Discount & Tax -->
            <div class="card" style="box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
              <div class="card-header" style="font-weight:700; font-size:12.5px; color:#475569; background:#f8fafc; border-bottom:1px solid #e2e8f0;">
                🏷️ Discount & Tax Settings
              </div>
              <div class="card-body form-row" style="grid-template-columns: repeat(4, 1fr); gap:12px;">
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" style="font-size:11px; font-weight:700; color:#64748b;">Discount Type</label>
                  <select class="form-select" id="discount-type" style="height:36px; font-size:13px; border-radius:6px;">
                    <option value="none" ${this.activeOrder.discountType === 'none' ? 'selected' : ''}>None</option>
                    <option value="percentage" ${this.activeOrder.discountType === 'percentage' ? 'selected' : ''}>Percentage (%)</option>
                    <option value="amount" ${this.activeOrder.discountType === 'amount' ? 'selected' : ''}>Fixed Amount (৳)</option>
                  </select>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" style="font-size:11px; font-weight:700; color:#64748b;">Discount Value</label>
                  <input type="number" class="form-input" id="discount-value" value="${this.activeOrder.discountValue}" min="0" ${this.activeOrder.discountType !== 'none' ? '' : 'disabled'} style="height:36px; font-size:13px; border-radius:6px;">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" style="font-size:11px; font-weight:700; color:#64748b;">Promo Coupon</label>
                  <div style="display:flex; gap:4px;">
                    <input type="text" class="form-input" id="coupon-code" placeholder="e.g. SAVE10" style="text-transform:uppercase; height:36px; font-size:12px; border-radius:6px;">
                    <button class="btn btn-secondary" id="btn-apply-coupon" style="padding:0 10px; font-size:11px; font-weight:700; height:36px; border-radius:6px;">Apply</button>
                  </div>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" style="font-size:11px; font-weight:700; color:#64748b;">Tax (%)</label>
                  <input type="number" class="form-input" id="tax-percent" value="${this.activeOrder.taxPercent}" min="0" style="height:36px; font-size:13px; border-radius:6px;">
                </div>
              </div>
            </div>
          </div>

          <!-- Right Panel: Order Summary & Payment Down the Summary -->
          <div class="order-summary-column flex flex-col gap-3">
            <!-- 1. Order Summary Card -->
            <div class="order-summary-card shadow-sm">
              <div class="summary-header">
                <span style="display:flex; align-items:center; gap:6px;">📋 Order Summary</span>
                <span id="summary-item-count" style="font-size:11px; font-weight:600; background:rgba(255,255,255,0.18); padding:2px 8px; border-radius:10px;">0 Items</span>
              </div>
              <div class="summary-body">
                <div class="summary-row">
                  <span>Sub Total:</span>
                  <span class="summary-val" id="summary-subtotal">৳0.00</span>
                </div>
                <div class="summary-row">
                  <span>Discount:</span>
                  <span class="summary-val text-danger" id="summary-discount">-৳0.00</span>
                </div>
                <div class="summary-row">
                  <span>Tax:</span>
                  <span class="summary-val" id="summary-tax">৳0.00</span>
                </div>
                <div class="summary-row total">
                  <span>Grand Total:</span>
                  <span class="summary-val" id="summary-total">৳0.00</span>
                </div>
              </div>
            </div>

            <!-- 2. Payment Information Card (Down the Order Summary) -->
            <div class="payment-info-card shadow-sm">
              <div class="payment-header">
                <span style="display:flex; align-items:center; gap:6px;">💳 Payment Details</span>
                <button type="button" class="btn btn-secondary btn-sm" id="btn-add-payment" style="font-size:11px; padding:3px 8px; font-weight:600; border-radius:6px; background:#fff;">
                  + Split Pay
                </button>
              </div>
              <div class="payment-body">
                <!-- Payment Slices Container -->
                <div id="payment-rows-container"></div>

                <!-- Payment Status Banner -->
                <div id="payment-balance-banner" style="display:none; margin-top:12px; padding:10px 12px; border-radius:8px; justify-content:space-between; align-items:center; font-size:12.5px; font-weight:700;"></div>

                <!-- Save Changes Action Button -->
                <button class="btn btn-success btn-lg btn-block mt-3" id="btn-place-order" style="padding:15px; font-weight:800; letter-spacing:0.5px; font-size:15px; border-radius:8px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25); display:flex; align-items:center; justify-content:center; gap:8px;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>SAVE & UPDATE INVOICE</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      this.initEvents();
      if (this.selectedCustomer) {
        this.selectCustomer(this.selectedCustomer);
      }
      this.renderCart();
      this.renderPayments();
      this.recalculate();
    },

    initEvents() {
      const S = POS.Store;
      const H = POS.Helpers;

      // Auto-close search result dropdowns (only if elements exist in current view)
      document.addEventListener('click', (e) => {
        const custEl = document.getElementById('customer-results');
        const prodEl = document.getElementById('product-results');
        if (custEl && !e.target.closest('#search-customer')) custEl.classList.remove('open');
        if (prodEl && !e.target.closest('#search-product')) prodEl.classList.remove('open');
      });

      // Customer Search
      const searchCust = document.getElementById('search-customer');
      const custResults = document.getElementById('customer-results');

      searchCust.oninput = H.debounce(async (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (query.length < 2) {
          custResults.innerHTML = '';
          custResults.classList.remove('open');
          return;
        }

        const list = await S.query('customers', c =>
          c.name.toLowerCase().includes(query) || c.phone.includes(query)
        );

        custResults.innerHTML = '';
        if (list.length === 0) {
          custResults.innerHTML = `<div class="p-2 text-muted text-sm text-center">No customers found. <button class="btn btn-primary btn-sm mt-1" id="btn-quick-add-cust">+ Add Quick</button></div>`;
          const quickBtn = custResults.querySelector('#btn-quick-add-cust');
          if (quickBtn) {
            quickBtn.onclick = () => this.quickAddCustomer(query);
          }
          custResults.classList.add('open');
          return;
        }

        list.forEach(c => {
          const item = document.createElement('div');
          item.className = 'product-result-item';
          item.innerHTML = `
            <div style="font-weight:600;">${H.esc(c.name)}</div>
            <div style="font-size:11px; color:#64748b;">Phone: ${H.esc(c.phone)}</div>
          `;
          item.onclick = () => {
            this.selectCustomer(c);
            searchCust.value = '';
            custResults.innerHTML = '';
            custResults.classList.remove('open');
          };
          custResults.appendChild(item);
        });
        custResults.classList.add('open');
      }, 200);

      // Product Search / Scanner Simulator (Server-Side MySQL, 300ms Debounce, AbortController)
      const searchProd = document.getElementById('search-product');
      const prodResults = document.getElementById('product-results');
      let searchAbortController = null;

      searchProd.oninput = H.debounce(async (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
          if (searchAbortController) searchAbortController.abort();
          prodResults.innerHTML = '';
          prodResults.classList.remove('open');
          return;
        }

        if (searchAbortController) {
          searchAbortController.abort();
        }
        searchAbortController = new AbortController();

        try {
          const res = await fetch(`${window.location.origin}/api/products/search?q=${encodeURIComponent(query)}&limit=25`, {
            headers: S.getHeaders(),
            signal: searchAbortController.signal
          });
          if (!res.ok) return;
          const prods = await res.json();
          const matches = [];

          prods.forEach(p => {
            if (p.variations && p.variations.length > 0) {
              p.variations.forEach(v => {
                matches.push({
                  product: p,
                  variant: v,
                  productId: p.id,
                  productName: p.name,
                  variationName: v.name,
                  name: `${p.name || ''} - ${v.name || ''}`,
                  sku: v.sku || p.sku,
                  barcode: v.barcode || p.barcode,
                  price: v.price !== null && v.price !== undefined ? parseFloat(v.price) : parseFloat(p.sellingPrice || 0),
                  stock: v.stock !== null && v.stock !== undefined ? parseInt(v.stock) : 0,
                  image: p.image
                });
              });
            } else {
              matches.push({
                product: p,
                variant: null,
                productId: p.id,
                productName: p.name,
                variationName: '',
                name: p.name,
                sku: p.sku,
                barcode: p.barcode,
                price: parseFloat(p.sellingPrice || 0),
                stock: parseInt(p.stock || 0),
                image: p.image
              });
            }
          });

          prodResults.innerHTML = '';
          if (matches.length === 0) {
            prodResults.innerHTML = `<div class="p-2 text-muted text-sm text-center">No products matched.</div>`;
            prodResults.classList.add('open');
            return;
          }

          matches.forEach(m => {
            const item = document.createElement('div');
            item.className = 'product-result-item';
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.gap = '10px';

            const imgHtml = m.image 
              ? `<img src="${m.image}" style="width:32px; height:32px; object-fit:cover; border-radius:4px;">`
              : `<div style="width:32px; height:32px; border-radius:4px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; color:#64748b; font-size:14px;">📦</div>`;

            item.innerHTML = `
              ${imgHtml}
              <div style="flex:1; min-width:0;">
                <div style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${H.esc(m.name)}</div>
                <div style="font-size:11px; color:#64748b;">SKU: ${H.esc(m.sku)} | Stock: ${m.stock}</div>
              </div>
              <div style="font-weight:700; color:var(--primary); font-size:12px; white-space:nowrap;">${H.formatCurrency(m.price)}</div>
            `;
            item.onclick = () => {
              this.addToCart(m);
              searchProd.value = '';
              prodResults.innerHTML = '';
              prodResults.classList.remove('open');
            };
            prodResults.appendChild(item);
          });
          prodResults.classList.add('open');
        } catch (err) {
          if (err.name === 'AbortError') return;
          console.error('Edit order product search error:', err);
        }
      }, 300);

      // Barcode Enter keypress lookup & Scan Button setup
      searchProd.onkeydown = async (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const query = searchProd.value.trim();
          if (!query) return;

          if (searchAbortController) searchAbortController.abort();

          try {
            const res = await fetch(`${window.location.origin}/api/products/resolve-scan?query=${encodeURIComponent(query)}`, {
              headers: S.getHeaders()
            });
            const data = await res.json();
            if (data && data.success && data.item) {
              const it = data.item;
              const matched = {
                product: { id: it.productId || it.id, name: it.productName || it.name, image: it.image, costPrice: 0 },
                variant: it.variationName ? { name: it.variationName } : null,
                productId: it.productId || it.id,
                productName: it.productName || it.name,
                variationName: it.variationName || '',
                name: it.name,
                sku: it.sku || '',
                barcode: it.barcode || '',
                price: parseFloat(it.price || 0),
                stock: parseInt(it.currentStock || 0),
                image: it.image || ''
              };
              this.addToCart(matched);
              searchProd.value = '';
              prodResults.innerHTML = '';
              prodResults.classList.remove('open');
              H.showToast(`Scanned: ${matched.name}`, 'success');
              this.playBeepSound();
            } else {
              // If not exact match, trigger normal filter search immediately
              searchProd.dispatchEvent(new Event('input'));
            }
          } catch (err) {
            console.error('Scan resolution error:', err);
            searchProd.dispatchEvent(new Event('input'));
          }
        }
      };

      const btnCustom = document.getElementById('btn-add-custom-prod');
      if (btnCustom) {
        btnCustom.onclick = () => this.showAddCustomProductModal();
      }

      // Discount & Tax recalculations
      const discType = document.getElementById('discount-type');
      const discVal = document.getElementById('discount-value');
      const taxPercent = document.getElementById('tax-percent');

      discType.onchange = () => {
        const type = discType.value;
        if (type === 'none') {
          discVal.value = 0;
          discVal.disabled = true;
        } else {
          discVal.disabled = false;
        }
        this.recalculate();
      };

      discVal.oninput = () => this.recalculate();
      taxPercent.oninput = () => this.recalculate();

      // Apply Coupon
      document.getElementById('btn-apply-coupon').onclick = async () => {
        const codeInput = document.getElementById('coupon-code');
        const code = codeInput.value.trim().toUpperCase();
        if (!code) {
          H.showToast('Please enter a coupon code', 'warning');
          return;
        }

        const coupon = await S.getById('coupons', code);
        if (coupon) {
          discType.value = coupon.discountType;
          discVal.value = coupon.discountValue;
          discVal.disabled = false;
          H.showToast(`Coupon "${coupon.code}" applied successfully!`);
          this.recalculate();
        } else {
          H.showToast('Invalid coupon code', 'error');
        }
      };

      // Add Payment splits
      document.getElementById('btn-add-payment').onclick = () => {
        this.payments.push({ method: 'Cash', amount: 0, lastFour: '' });
        this.renderPayments();
        this.recalculate();
      };

      // Place Order trigger
      document.getElementById('btn-place-order').onclick = () => this.saveChanges();
    },

    selectCustomer(c) {
      this.selectedCustomer = c;
      const details = document.getElementById('customer-details');
      details.style.display = 'block';
      details.innerHTML = `
        <div style="background:var(--primary-50); border:1.5px dashed var(--primary); padding:10px 14px; border-radius:var(--radius-sm); position:relative;">
          <div style="font-weight:700; color:var(--primary-dark); font-size:13px;">👥 ${POS.Helpers.esc(c.name)}</div>
          <div style="font-size:11px; color:var(--text-secondary);">Phone: ${POS.Helpers.esc(c.phone)} | Address: ${POS.Helpers.esc(c.address || 'N/A')}</div>
          <button id="btn-remove-cust" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); border:none; background:none; font-size:16px; cursor:pointer; color:var(--danger);" title="Deselect Customer">&times;</button>
        </div>
      `;
      document.getElementById('btn-remove-cust').onclick = () => {
        this.selectedCustomer = null;
        details.style.display = 'none';
        details.innerHTML = '';
      };
    },

    async quickAddCustomer(phone) {
      const H = POS.Helpers;
      const S = POS.Store;
      const name = await H.prompt('Quick register customer. Enter Customer Name:', 'Quick Customer');
      if (!name) return;

      const newCust = {
        id: 'cust_' + Math.random().toString(36).substr(2, 9),
        name,
        phone,
        email: '',
        label: 'General',
        customDiscount: 0,
        address: ''
      };

      const added = await S.add('customers', newCust);
      if (added) {
        this.selectCustomer(added);
        H.showToast('Customer registered and selected successfully.');
      }
    },

    showAddCustomProductModal() {
      const H = POS.Helpers;
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay active';
      overlay.innerHTML = `
        <div class="modal animate" style="max-width:440px;">
          <div class="modal-header">
            <h3>Add Custom Product</h3>
            <button class="modal-close" id="modal-close-custom">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label" style="font-weight:700;">Product Name *</label>
              <input type="text" class="form-input" id="custom-prod-name" placeholder="Enter product name..." value="" style="border: 2px solid #64748b;">
            </div>
            <div class="form-group">
              <label class="form-label" style="font-weight:700;">SKU Number</label>
              <input type="text" class="form-input" id="custom-prod-sku" placeholder="Optional SKU code..." value="" style="border: 1.5px solid #cbd5e1;">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" style="font-weight:700;">Unit Price (৳) *</label>
                <input type="number" class="form-input" id="custom-prod-price" placeholder="0.00" value="" min="0" step="0.01" style="border: 2px solid #64748b;">
              </div>
              <div class="form-group">
                <label class="form-label" style="font-weight:700;">Quantity</label>
                <input type="number" class="form-input" id="custom-prod-qty" value="1" min="1" style="border: 2px solid #64748b;">
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="custom-prod-cancel">Cancel</button>
            <button class="btn btn-primary" id="custom-prod-add">Add to Cart</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      const nameInput = overlay.querySelector('#custom-prod-name');
      const skuInput = overlay.querySelector('#custom-prod-sku');
      const priceInput = overlay.querySelector('#custom-prod-price');
      const qtyInput = overlay.querySelector('#custom-prod-qty');
      setTimeout(() => nameInput.focus(), 80);

      const close = () => overlay.remove();
      overlay.querySelector('#modal-close-custom').onclick = close;
      overlay.querySelector('#custom-prod-cancel').onclick = close;

      const submitCustom = () => {
        const pName = nameInput.value.trim();
        if (!pName) {
          H.showToast('Please enter a product name', 'warning');
          nameInput.focus();
          return;
        }
        const pPrice = parseFloat(priceInput.value) || 0;
        const pQty = parseInt(qtyInput.value) || 1;
        const pSku = skuInput.value.trim() || 'CUSTOM';

        this.addToCart({
          productId: 'custom_' + Date.now().toString(36),
          productName: pName,
          variationName: '',
          sku: pSku,
          unitPrice: pPrice,
          costPrice: 0,
          qty: pQty,
          image: '',
          stock: 999999,
          isCustom: true
        });
        close();
      };

      overlay.querySelector('#custom-prod-add').onclick = submitCustom;
      priceInput.onkeydown = (e) => {
        if (e.key === 'Enter') submitCustom();
      };
      nameInput.onkeydown = (e) => {
        if (e.key === 'Enter') priceInput.focus();
      };
    },

    addToCart(item) {
      if (item.isCustom) {
        this.cart.push({
          id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9) + '_' + item.productId,
          productId: item.productId,
          productName: item.productName,
          variationName: '',
          sku: item.sku || 'CUSTOM',
          unitPrice: parseFloat(item.unitPrice) || 0,
          costPrice: parseFloat(item.costPrice) || 0,
          qty: parseInt(item.qty) || 1,
          image: '',
          stock: 999999,
          isCustom: true
        });
        this.renderCart();
        this.recalculate();
        return;
      }

      const pId = item.product ? item.product.id : item.productId;
      const vName = item.variant ? item.variant.name : (item.variationName || null);
      const existing = this.cart.find(c =>
        c.productId === pId &&
        c.variationName === vName
      );

      const pSku = item.sku || (item.product && item.product.sku) || '';

      if (existing) {
        if (existing.qty < existing.stock) {
          existing.qty++;
        } else {
          POS.Helpers.showToast('Max available stock reached!', 'warning');
        }
      } else {
        this.cart.push({
          id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9) + '_' + pId,
          productId: pId,
          productName: item.product ? item.product.name : item.productName,
          variationName: vName,
          sku: pSku,
          unitPrice: parseFloat(item.price !== undefined ? item.price : item.unitPrice) || 0,
          costPrice: item.product ? (parseFloat(item.product.costPrice) || 0) : (parseFloat(item.costPrice) || 0),
          qty: parseInt(item.qty) || 1,
          image: (item.product && item.product.image) || item.image || '',
          stock: item.stock !== undefined ? item.stock : 999999,
          isCustom: false
        });
      }

      this.renderCart();
      this.recalculate();
    },

    renderCart() {
      const H = POS.Helpers;
      const tbody = document.getElementById('cart-tbody');
      tbody.innerHTML = '';

      if (this.cart.length === 0) {
        tbody.innerHTML = `
          <tr id="empty-cart-row">
            <td colspan="5" style="text-align:center; padding:45px 20px; color:#64748b;">
              <div style="width:48px; height:48px; margin:0 auto 10px auto; border-radius:50%; background:#f1f5f9; display:flex; align-items:center; justify-content:center; color:#94a3b8;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
              </div>
              <div style="font-weight:700; color:#334155; font-size:14px; margin-bottom:4px;">Your Cart is Empty</div>
              <div style="font-size:12px; color:#94a3b8;">Scan barcode or type in the search bar above to add products to sale.</div>
            </td>
          </tr>
        `;
        return;
      }

      this.cart.forEach((item, index) => {
        const thumbHtml = item.image 
          ? `<img src="${item.image}" style="width:34px; height:34px; object-fit:cover; border-radius:6px; margin-right:10px; flex-shrink:0;">`
          : `<div style="width:34px; height:34px; border-radius:6px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; margin-right:10px; font-size:11px; font-weight:700; color:#64748b; flex-shrink:0;">${item.isCustom ? 'C' : 'P'}</div>`;

        const skuHtml = item.sku 
          ? `<span style="display:inline-block; font-size:11px; color:#475569; font-family:monospace; background:#f1f5f9; padding:1px 6px; border-radius:4px; border:1px solid #e2e8f0; margin-top:2px;">SKU: ${H.esc(item.sku)}</span>`
          : `<span style="font-size:11px; color:#94a3b8; font-style:italic; margin-top:2px;">No SKU</span>`;

        const nameDisplayHtml = item.isCustom
          ? `
            <div style="flex:1; min-width:0;">
              <input type="text" class="form-input input-custom-name" value="${H.esc(item.productName)}" placeholder="Custom product name..." style="padding:4px 8px; height:28px; width:100%; font-size:12.5px; font-weight:600; border-radius:4px;">
              <div style="margin-top:2px;">${skuHtml}</div>
            </div>
          `
          : `
            <div style="flex:1; min-width:0;">
              <div class="cart-item-name" style="font-weight:600; font-size:13.5px; color:#1e293b; line-height:1.3;">
                ${H.esc(item.productName)}
                ${item.variationName ? `<span class="badge" style="background:#e0e7ff; color:#3730a3; font-size:11px; padding:1px 6px; border-radius:4px; font-weight:600; margin-left:4px;">(${H.esc(item.variationName)})</span>` : ''}
              </div>
              <div style="margin-top:2px;">${skuHtml}</div>
            </div>
          `;

        tbody.innerHTML += `
          <tr class="cart-item-row" data-index="${index}">
            <td>
              <div style="display:flex; align-items:center;">
                ${thumbHtml}
                ${nameDisplayHtml}
              </div>
            </td>
            <td>
              <div style="display:flex; align-items:center; gap:4px; max-width:115px;">
                <span style="font-weight:700; color:#64748b; font-size:13px;">৳</span>
                <input type="number" class="input-price form-input" value="${item.unitPrice || ''}" placeholder="0.00" min="0" step="0.01" style="padding:4px 6px; height:30px; width:100%; font-size:13px; font-weight:700; border-radius:4px;">
              </div>
            </td>
            <td class="text-center">
              <div class="qty-control" style="margin:0 auto; width:fit-content; border-radius:6px;">
                <button class="btn-qty-dec" style="width:28px; height:28px;">-</button>
                <input type="number" class="input-qty" value="${item.qty}" min="1" max="${item.stock}" style="width:36px; height:28px; font-weight:700;">
                <button class="btn-qty-inc" style="width:28px; height:28px;">+</button>
              </div>
            </td>
            <td class="text-right" style="font-weight:800; font-size:13.5px; color:#0f172a;">${H.formatCurrency(item.unitPrice * item.qty)}</td>
            <td class="text-center">
              <button class="btn btn-secondary btn-sm btn-qty-remove" style="width:28px; height:28px; padding:0; display:flex; align-items:center; justify-content:center; color:#ef4444; border-color:#fee2e2; background:#fef2f2; border-radius:6px;" title="Remove Item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </td>
          </tr>
        `;
      });

      // Bind events
      tbody.querySelectorAll('.cart-item-row').forEach(row => {
        const index = parseInt(row.dataset.index, 10);
        const item = this.cart[index];

        const customNameInput = row.querySelector('.input-custom-name');
        if (customNameInput) {
          customNameInput.onchange = (e) => {
            item.productName = e.target.value.trim() || 'Custom Item';
          };
        }

        row.querySelector('.btn-qty-dec').onclick = () => {
          if (item.qty > 1) {
            item.qty--;
            this.renderCart();
            this.recalculate();
          }
        };

        row.querySelector('.btn-qty-inc').onclick = () => {
          if (item.isCustom || item.qty < item.stock) {
            item.qty++;
            this.renderCart();
            this.recalculate();
          } else {
            H.showToast('Max available stock reached!', 'warning');
          }
        };

        row.querySelector('.input-qty').onchange = (e) => {
          let val = parseInt(e.target.value, 10) || 1;
          if (val < 1) val = 1;
          if (!item.isCustom && val > item.stock) {
            val = item.stock;
            H.showToast('Adjusted to max available stock', 'warning');
          }
          item.qty = val;
          this.renderCart();
          this.recalculate();
        };

        row.querySelector('.input-price').onchange = (e) => {
          let val = parseFloat(e.target.value) || 0;
          if (val < 0) val = 0;
          item.unitPrice = val;
          this.renderCart();
          this.recalculate();
        };

        row.querySelector('.btn-qty-remove').onclick = () => {
          this.cart.splice(index, 1);
          this.renderCart();
          this.recalculate();
        };
      });
    },

    renderPayments() {
      const H = POS.Helpers;
      const container = document.getElementById('payment-rows-container');
      if (!container) return;
      container.innerHTML = '';

      const allMethods = (H.paymentMethods && H.paymentMethods.length > 0)
        ? H.paymentMethods
        : ['Cash', 'Card', 'bKash', 'Nagad', 'Rocket', 'Bank Transfer', 'Other'];

      this.payments.forEach((p, idx) => {
        const isCash = (p.method || 'Cash').toLowerCase() === 'cash';

        const buttonsHtml = allMethods.map(m => {
          const isSelected = (p.method === m);
          const icon = H.getPaymentMethodIcon(m, 22);
          return `
            <button type="button" 
                    class="btn-pay-method ${isSelected ? 'active' : ''}" 
                    data-method="${H.esc(m)}" 
                    data-row="${idx}">
              <div class="pay-icon">${icon}</div>
              <span class="pay-name">${H.esc(m)}</span>
            </button>
          `;
        }).join('');

        container.innerHTML += `
          <div class="payment-slice-card" data-index="${idx}" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:10px;">
            ${this.payments.length > 1 ? `
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid #e2e8f0;">
                <span style="font-size:11px; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:0.5px;">Split Payment #${idx + 1}</span>
                <button type="button" class="btn-remove-payment" style="background:none; border:none; color:#ef4444; font-size:11px; font-weight:700; cursor:pointer; padding:0; display:flex; align-items:center; gap:3px;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  Remove
                </button>
              </div>
            ` : `
              <div style="font-size:11.5px; font-weight:700; color:#475569; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
                <span>Payment Method</span>
                <span class="badge" style="background:#e0e7ff; color:#3730a3; font-size:10px; padding:1px 6px; border-radius:4px; font-weight:700;">${H.esc(p.method)}</span>
              </div>
            `}

            <!-- Method Selection Grid (All buttons with logos - NO dropdown) -->
            <div class="pay-methods-grid">
              ${buttonsHtml}
            </div>

            <!-- Amount & Details Row -->
            <div style="display:flex; gap:8px; align-items:flex-end;">
              <div class="form-group" style="flex:1; margin-bottom:0;">
                <label class="form-label" style="font-size:11px; font-weight:700; color:#475569; margin-bottom:4px;">
                  Amount Paid (৳)
                </label>
                <div style="position:relative;">
                  <span style="position:absolute; left:10px; top:50%; transform:translateY(-50%); font-weight:700; color:#64748b;">৳</span>
                  <input type="number" 
                         class="form-input payment-amount-input" 
                         value="${p.amount !== undefined ? p.amount : ''}" 
                         min="0" 
                         step="0.01" 
                         placeholder="0.00"
                         style="padding-left:26px; font-weight:700; font-size:14px; color:#0f172a; border-radius:6px; background:#fff; height:38px;">
                </div>
              </div>

              ${!isCash ? `
                <div class="form-group" style="width:115px; margin-bottom:0;">
                  <label class="form-label" style="font-size:11px; font-weight:700; color:#475569; margin-bottom:4px;">
                    Last 4 / Trx
                  </label>
                  <input type="text" 
                         class="form-input payment-lastfour-input" 
                         value="${H.esc(p.lastFour || '')}" 
                         maxlength="15" 
                         placeholder="e.g. 1234"
                         style="font-size:12px; font-weight:600; text-align:center; border-radius:6px; background:#fff; height:38px;">
                </div>
              ` : ''}
            </div>

            ${isCash ? `
              <!-- Quick Cash Chips -->
              <div class="quick-cash-chips">
                <span style="font-size:10px; font-weight:700; color:#94a3b8; align-self:center; margin-right:2px;">Quick:</span>
                <button type="button" class="btn-cash-chip btn-chip-exact" data-row="${idx}">Exact</button>
                <button type="button" class="btn-cash-chip btn-chip-add" data-row="${idx}" data-add="50">+50</button>
                <button type="button" class="btn-cash-chip btn-chip-add" data-row="${idx}" data-add="100">+100</button>
                <button type="button" class="btn-cash-chip btn-chip-add" data-row="${idx}" data-add="500">+500</button>
                <button type="button" class="btn-cash-chip btn-chip-add" data-row="${idx}" data-add="1000">+1000</button>
              </div>
            ` : ''}
          </div>
        `;
      });

      // Bind button clicks for method selection
      container.querySelectorAll('.btn-pay-method').forEach(btn => {
        btn.onclick = () => {
          const rowIdx = parseInt(btn.dataset.row, 10);
          const chosenMethod = btn.dataset.method;
          if (this.payments[rowIdx]) {
            this.payments[rowIdx].method = chosenMethod;
            this.renderPayments();
            this.recalculate();
          }
        };
      });

      // Bind quick cash chips
      container.querySelectorAll('.btn-chip-exact').forEach(btn => {
        btn.onclick = () => {
          const rowIdx = parseInt(btn.dataset.row, 10);
          const subtotal = this.cart.reduce((s, i) => s + (i.unitPrice * i.qty), 0);
          const discType = document.getElementById('discount-type').value;
          const discVal = parseFloat(document.getElementById('discount-value').value) || 0;
          let discAmt = discType === 'percentage' ? subtotal * (discVal / 100) : (discType === 'amount' ? discVal : 0);
          if (discAmt > subtotal) discAmt = subtotal;
          const taxPct = parseFloat(document.getElementById('tax-percent').value) || 0;
          const grandTotal = subtotal - discAmt + ((subtotal - discAmt) * (taxPct / 100));

          if (this.payments.length === 1) {
            this.payments[0].amount = grandTotal;
          } else {
            let others = 0;
            this.payments.forEach((p, pIdx) => { if (pIdx !== rowIdx) others += p.amount; });
            this.payments[rowIdx].amount = Math.max(0, grandTotal - others);
          }
          this.renderPayments();
          this.recalculate();
        };
      });

      container.querySelectorAll('.btn-chip-add').forEach(btn => {
        btn.onclick = () => {
          const rowIdx = parseInt(btn.dataset.row, 10);
          const addVal = parseFloat(btn.dataset.add) || 0;
          this.payments[rowIdx].amount = (parseFloat(this.payments[rowIdx].amount) || 0) + addVal;
          this.renderPayments();
          this.recalculate();
        };
      });

      // Bind amount inputs
      container.querySelectorAll('.payment-slice-card').forEach(card => {
        const idx = parseInt(card.dataset.index, 10);

        const amountInput = card.querySelector('.payment-amount-input');
        if (amountInput) {
          amountInput.oninput = (e) => {
            const val = parseFloat(e.target.value) || 0;
            this.payments[idx].amount = val;
            this.recalculate(false);
          };
        }

        const lastFourInput = card.querySelector('.payment-lastfour-input');
        if (lastFourInput) {
          lastFourInput.oninput = (e) => {
            this.payments[idx].lastFour = e.target.value.trim();
          };
        }

        const removeBtn = card.querySelector('.btn-remove-payment');
        if (removeBtn) {
          removeBtn.onclick = () => {
            this.payments.splice(idx, 1);
            this.renderPayments();
            this.recalculate();
          };
        }
      });
    },

    recalculate(updateSingleInput = true) {
      const H = POS.Helpers;

      // 1. Calculate Subtotal
      let subtotal = 0;
      let totalItemsCount = 0;
      this.cart.forEach(item => {
        subtotal += (item.unitPrice * item.qty);
        totalItemsCount += item.qty;
      });

      // 2. Calculate Discount
      const discType = document.getElementById('discount-type').value;
      const discVal = parseFloat(document.getElementById('discount-value').value) || 0;
      let discountAmount = 0;

      if (discType === 'percentage') {
        discountAmount = subtotal * (discVal / 100);
      } else if (discType === 'amount') {
        discountAmount = discVal;
      }

      // Keep discount <= subtotal
      if (discountAmount > subtotal) discountAmount = subtotal;

      // 3. Calculate Tax
      const taxPercent = parseFloat(document.getElementById('tax-percent').value) || 0;
      const taxAmount = (subtotal - discountAmount) * (taxPercent / 100);

      // 4. Grand Total
      const grandTotal = subtotal - discountAmount + taxAmount;

      // 5. Default single payment row amount to grandTotal when appropriate
      if (this.payments.length === 1 && updateSingleInput) {
        this.payments[0].amount = grandTotal;
        const pInput = document.querySelector('.payment-amount-input');
        if (pInput && document.activeElement !== pInput) {
          pInput.value = grandTotal > 0 ? grandTotal.toFixed(2) : '0.00';
        }
      }

      // 6. Total Paid sum
      const totalPaid = this.payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

      // 7. Due & Change
      let due = 0;
      let change = 0;

      if (totalPaid >= grandTotal) {
        change = totalPaid - grandTotal;
      } else {
        due = grandTotal - totalPaid;
      }

      // Update Summary Fields
      const subtotalEl = document.getElementById('summary-subtotal');
      const discountEl = document.getElementById('summary-discount');
      const taxEl = document.getElementById('summary-tax');
      const totalEl = document.getElementById('summary-total');
      const countEl = document.getElementById('summary-item-count');

      if (subtotalEl) subtotalEl.textContent = H.formatCurrency(subtotal);
      if (discountEl) discountEl.textContent = `-${H.formatCurrency(discountAmount)}`;
      if (taxEl) taxEl.textContent = H.formatCurrency(taxAmount);
      if (totalEl) totalEl.textContent = H.formatCurrency(grandTotal);
      if (countEl) countEl.textContent = `${totalItemsCount} Item${totalItemsCount === 1 ? '' : 's'}`;

      // Update Payment Status Banner
      const balanceBanner = document.getElementById('payment-balance-banner');
      if (balanceBanner) {
        if (grandTotal === 0 && this.cart.length === 0) {
          balanceBanner.style.display = 'none';
        } else if (Math.abs(totalPaid - grandTotal) < 0.01) {
          balanceBanner.style.display = 'flex';
          balanceBanner.style.background = '#ecfdf5';
          balanceBanner.style.border = '1px solid #a7f3d0';
          balanceBanner.style.color = '#065f46';
          balanceBanner.innerHTML = `
            <span>Payment Status:</span>
            <span style="display:flex; align-items:center; gap:4px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Fully Paid (${H.formatCurrency(totalPaid)})
            </span>
          `;
        } else if (totalPaid > grandTotal) {
          balanceBanner.style.display = 'flex';
          balanceBanner.style.background = '#eff6ff';
          balanceBanner.style.border = '1px solid #bfdbfe';
          balanceBanner.style.color = '#1e40af';
          balanceBanner.innerHTML = `
            <span>Change Return:</span>
            <span style="font-size:15px; font-weight:800; color:#2563eb;">${H.formatCurrency(change)}</span>
          `;
        } else {
          balanceBanner.style.display = 'flex';
          balanceBanner.style.background = '#fff7ed';
          balanceBanner.style.border = '1px solid #fed7aa';
          balanceBanner.style.color = '#9a3412';
          balanceBanner.innerHTML = `
            <span>Due Balance:</span>
            <span style="font-size:15px; font-weight:800; color:#ea580c;">${H.formatCurrency(due)}</span>
          `;
        }
      }
    },

    async saveChanges() {
      const S = POS.Store;
      const H = POS.Helpers;

      if (this.cart.length === 0) {
        H.showToast('Cart is empty. Please add items first.', 'error');
        return;
      }

      const salesDate = document.getElementById('sales-date').value;
      const subtotal = this.cart.reduce((s, i) => s + (i.unitPrice * i.qty), 0);

      const discType = document.getElementById('discount-type').value;
      const discVal = parseFloat(document.getElementById('discount-value').value) || 0;
      let discountAmount = 0;
      if (discType === 'percentage') {
        discountAmount = subtotal * (discVal / 100);
      } else if (discType === 'amount') {
        discountAmount = discVal;
      }

      const taxPercent = parseFloat(document.getElementById('tax-percent').value) || 0;
      const taxAmount = (subtotal - discountAmount) * (taxPercent / 100);
      const grandTotal = subtotal - discountAmount + taxAmount;

      const totalPaid = this.payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

      // Preserve exact selected calendar date with original order's time (Bangladesh GMT+6)
      const sDate = salesDate || H.today();
      let timeStr = H.nowBDTime();
      if (this.activeOrder && this.activeOrder.date) {
        const tMatch = String(this.activeOrder.date).match(/\b(\d{2}:\d{2}:\d{2})\b/);
        if (tMatch) {
          timeStr = tMatch[1];
        }
      }
      const orderDate = `${sDate} ${timeStr}`;
      const orderId = this.editOrderId;
      const invoiceId = this.activeOrder.invoiceId;

      const order = {
        id: orderId,
        invoiceId,
        customerId: this.selectedCustomer ? this.selectedCustomer.id : 'walk-in',
        customerName: this.selectedCustomer ? this.selectedCustomer.name : 'Walk-in Customer',
        customerPhone: this.selectedCustomer ? this.selectedCustomer.phone : 'N/A',
        date: orderDate,
        subtotal,
        discountType: discType,
        discountValue: discVal,
        discountAmount,
        taxPercent,
        taxAmount,
        grandTotal,
        paidAmount: totalPaid,
        dueAmount: Math.max(0, grandTotal - totalPaid),
        returnedAmount: Math.max(0, totalPaid - grandTotal),
        status: 'completed'
      };

      const orderItemsList = this.cart.map(item => ({
        id: item.id || (Date.now().toString(36) + Math.random().toString(36).substr(2, 9) + '_' + item.productId),
        orderId,
        productId: item.productId,
        productName: item.productName,
        variationName: item.variationName || null,
        qty: item.qty,
        unitPrice: item.unitPrice,
        total: item.unitPrice * item.qty,
        costPrice: parseFloat(item.costPrice) || 0.00
      }));

      const orderPaymentsList = this.payments.map(p => ({
        id: 'pay_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        orderId,
        method: p.method,
        amount: p.amount,
        lastFour: p.lastFour || null
      }));

      const result = await S.updateOrder(this.editOrderId, order, orderItemsList, orderPaymentsList);

      if (result.success) {
        H.showToast(`Order ${invoiceId} updated successfully!`);
        if (await H.confirm('Would you like to print the receipt?')) {
          H.printOrder(order, this.cart, orderPaymentsList);
        }
        POS.Router.navigate('/sales-list');
      } else {
        H.showToast('Failed to update order: ' + result.error, 'error');
      }
    },

    async printInvoice(order, cartItems) {
      const H = POS.Helpers;
      H.printOrder(order, cartItems);
    },

    playBeepSound() {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
      } catch (err) {
        console.warn('Web Audio API beep failed:', err);
      }
    }
  };

  window.POS = window.POS || {};
  window.POS.EditOrder = EditOrder;
})();
