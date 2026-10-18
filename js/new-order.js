(function () {
  'use strict';

  const NewOrder = {
    cart: [],
    selectedCustomer: null,
    payments: [{ method: 'Cash', amount: 0, lastFour: '' }],

    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

      this.cart = [];
      this.selectedCustomer = null;
      this.payments = [{ method: 'Cash', amount: 0, lastFour: '' }];

      // Ensure active payment channels with custom logos & colors are preloaded
      await H.loadPaymentMethods();

      mc.innerHTML = `
        <div class="page-header fade-in" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
          <div>
            <h2 class="page-title" style="display:flex; align-items:center; gap:8px;">
              <span>🛒</span> New Sales Order
            </h2>
            <p class="page-subtitle">Add customer details, scan barcodes or select products, and complete payment.</p>
          </div>
          <div class="page-actions">
            <a href="/sales-list" class="btn btn-secondary btn-sm" style="display:inline-flex; align-items:center; gap:6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
              Sales History
            </a>
          </div>
        </div>

        <div class="order-layout fade-in">
          <!-- Left Panel: Form, Search & Cart -->
          <div class="flex flex-col gap-2">
            <!-- Customer & Date -->
            <div class="card" style="box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
              <div class="card-body form-row" style="grid-template-columns: 2fr 1fr; gap:16px;">
                <div class="form-group" style="position:relative; margin-bottom:0;">
                  <label class="form-label" style="font-weight:700; font-size:12px; color:#334155;">Customer (Phone or Name)</label>
                  <input type="text" class="form-input" id="search-customer" placeholder="Search customer phone or name..." style="border: 1.5px solid #cbd5e1; font-weight:500; border-radius:6px; height:40px;">
                  <div class="product-results" id="customer-results"></div>
                  <div id="customer-details" class="mt-1" style="display:none;"></div>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" style="font-weight:700; font-size:12px; color:#334155;">Sales Date</label>
                  <input type="date" class="form-input" id="sales-date" value="${H.today()}" style="border: 1.5px solid #cbd5e1; border-radius:6px; height:40px;">
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
                    <button class="btn btn-secondary" id="btn-add-custom-prod" title="Add Custom Item" style="white-space:nowrap; font-weight:600; padding:0 14px; height:42px; border-radius:6px; border:1.5px solid #cbd5e1;">+ Custom Item</button>
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
                    <option value="none" selected>None</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="amount">Fixed Amount (৳)</option>
                  </select>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" style="font-size:11px; font-weight:700; color:#64748b;">Discount Value</label>
                  <input type="number" class="form-input" id="discount-value" value="0" min="0" disabled style="height:36px; font-size:13px; border-radius:6px;">
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
                  <input type="number" class="form-input" id="tax-percent" value="0" min="0" style="height:36px; font-size:13px; border-radius:6px;">
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

                <div class="summary-row" style="margin-top:6px; padding-top:8px; border-top:1px dashed #cbd5e1;">
                  <span style="font-weight:600; color:#475569;">Total Paid:</span>
                  <span class="summary-val text-success" id="summary-paid" style="font-weight:700;">৳0.00</span>
                </div>

                <!-- Due Balance Field -->
                <div class="summary-row" id="row-due-balance" style="display:none; color:#ea580c; font-weight:700; background:#fff7ed; padding:7px 10px; border-radius:6px; margin-top:6px; border:1px solid #fed7aa; justify-content:space-between; align-items:center;">
                  <span style="font-weight:700; color:#9a3412; font-size:12.5px;">Due Balance:</span>
                  <span class="summary-val" id="summary-due" style="font-weight:800; color:#ea580c; font-size:15px;">৳0.00</span>
                </div>

                <!-- Change Return: Field (Placed on Order Summary Card) -->
                <div class="summary-row" id="row-change-return" style="background:#f0fdf4; border:1.5px solid #86efac; border-radius:8px; padding:9px 12px; margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-weight:700; color:#166534; font-size:13px; display:flex; align-items:center; gap:5px;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
                    Change Return:
                  </span>
                  <span class="summary-val" id="summary-change" style="font-size:18px; font-weight:800; color:#15803d;">৳0.00</span>
                </div>

                <!-- Place Order Action Button (Placed on Order Summary Card) -->
                <button class="btn btn-success btn-lg btn-block mt-3" id="btn-place-order" style="padding:15px; font-weight:800; letter-spacing:0.5px; font-size:15px; border-radius:8px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25); display:flex; align-items:center; justify-content:center; gap:8px;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>COMPLETE & PLACE SALE</span>
                </button>
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
              </div>
            </div>
          </div>
        </div>
      `;

      this.initEvents();
      this.renderCart();
      this.renderPayments();
      this.recalculate();
    },

    initEvents() {
      const S = POS.Store;
      const H = POS.Helpers;

      // ── Customer Search & Select ─────────────────────
      const searchCust = document.getElementById('search-customer');
      const custResults = document.getElementById('customer-results');

      searchCust.addEventListener('input', H.debounce(async (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
          custResults.classList.remove('open');
          return;
        }

        const matches = await S.query('customers', c =>
          c.name.toLowerCase().includes(query) || c.phone.includes(query)
        );

        custResults.innerHTML = '';
        if (matches.length === 0) {
          custResults.innerHTML = `<div class="product-result-item" style="color:var(--text-secondary); cursor:pointer;">No customers found. Click to add new customer.</div>`;
          custResults.onclick = () => this.showAddCustomerModal(query);
        } else {
          matches.forEach(c => {
            const labelStyle = c.label ? `background:${H.labelColors[c.label] || '#64748b'};` : '';
            custResults.innerHTML += `
              <div class="product-result-item" data-id="${c.id}">
                <div>
                  <span class="pr-name" style="font-weight:600;">${H.esc(c.name)}</span>
                  <span class="pr-sku" style="margin-left: 8px; color:#64748b;">${H.esc(c.phone)}</span>
                </div>
                ${c.label ? `<span class="badge-label" style="${labelStyle} font-size:9px; padding:2px 6px;">${c.label}</span>` : ''}
              </div>
            `;
          });

          custResults.onclick = async (ev) => {
            const item = ev.target.closest('.product-result-item');
            if (!item) return;
            const cid = item.dataset.id;
            if (cid) {
              const customer = await S.getById('customers', cid);
              this.selectCustomer(customer);
            }
            custResults.classList.remove('open');
          };
        }
        custResults.classList.add('open');
      }, 200));

      // Close dropdowns on outside click
      document.addEventListener('click', (e) => {
        const custEl = document.getElementById('customer-results');
        const prodEl = document.getElementById('product-results');
        if (custEl && !e.target.closest('#search-customer')) custEl.classList.remove('open');
        if (prodEl && !e.target.closest('#search-product')) prodEl.classList.remove('open');
      });

      // ── Product Search (Server-Side MySQL, 300ms Debounce, AbortController) ──
      const searchProd = document.getElementById('search-product');
      const prodResults = document.getElementById('product-results');
      let searchAbortController = null;

      searchProd.addEventListener('input', H.debounce(async (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
          if (searchAbortController) searchAbortController.abort();
          prodResults.classList.remove('open');
          prodResults.innerHTML = '';
          return;
        }

        if (searchAbortController) searchAbortController.abort();
        searchAbortController = new AbortController();

        try {
          const res = await fetch(`${window.location.origin}/api/products/search?q=${encodeURIComponent(query)}&limit=25`, {
            headers: S.getHeaders(),
            signal: searchAbortController.signal
          });
          if (!res.ok) return;
          const products = await res.json();
          const matches = [];

          products.forEach(p => {
            if (p.variations && p.variations.length > 0) {
              p.variations.forEach(v => {
                matches.push({
                  id: p.id,
                  productId: p.id,
                  name: p.name + ` (${v.name})`,
                  rawName: p.name,
                  sku: v.sku || p.sku || '',
                  barcode: v.barcode || p.barcode || '',
                  generic: p.generic || '',
                  strength: p.strength || '',
                  category: p.category || '',
                  price: v.price !== null && v.price !== undefined ? parseFloat(v.price) : parseFloat(p.sellingPrice || 0),
                  stock: v.stock !== null && v.stock !== undefined ? parseInt(v.stock) : 0,
                  image: p.image,
                  variationName: v.name
                });
              });
            } else {
              matches.push({
                id: p.id,
                productId: p.id,
                name: p.name,
                rawName: p.name,
                sku: p.sku || '',
                barcode: p.barcode || '',
                generic: p.generic || '',
                strength: p.strength || '',
                category: p.category || '',
                price: parseFloat(p.sellingPrice || 0),
                stock: parseInt(p.stock || 0),
                image: p.image,
                variationName: ''
              });
            }
          });

          prodResults.innerHTML = '';
          if (matches.length === 0) {
            prodResults.innerHTML = `<div class="product-result-item text-muted" style="padding:12px; text-align:center;">No products found matching "${H.esc(query)}".</div>`;
          } else {
            matches.forEach(m => {
              const imgHtml = m.image 
                ? `<img src="${m.image}" style="width:36px; height:36px; object-fit:cover; border-radius:var(--radius-sm); margin-right:10px;">`
                : `<div style="width:36px; height:36px; border-radius:var(--radius-sm); background:#f1f5f9; display:flex; align-items:center; justify-content:center; margin-right:10px; color:#64748b;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21 16-9 5-9-5V8l9-5 9 5v8Z"/><path d="m3.27 6.96 8.73 4.86 8.73-4.86"/><path d="M12 22.08V12"/></svg></div>`;

              prodResults.innerHTML += `
                <div class="product-result-item" data-id="${m.id}" data-var="${H.esc(m.variationName)}" data-sku="${H.esc(m.sku)}" data-price="${m.price}" data-stock="${m.stock}" data-name="${H.esc(m.name)}" data-image="${m.image || ''}" style="display:flex; align-items:center;">
                  ${imgHtml}
                  <div style="flex:1;">
                    <div class="pr-name" style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                      <span style="font-weight:600;">${H.esc(m.rawName || m.name)}</span>
                      ${m.variationName ? `<span class="badge" style="background:#fef3c7; color:#b45309; font-size:11px; padding:1px 6px; border-radius:4px; font-weight:600; border:1px solid #fde68a;">(${H.esc(m.variationName)})</span>` : ''}
                      ${m.strength ? `<span class="badge" style="background:#eff6ff; color:#2563eb; font-size:11px; padding:1px 6px; border-radius:4px; font-weight:700; border:1px solid #bfdbfe;">${H.esc(m.strength)}</span>` : ''}
                    </div>
                    ${m.generic ? `<div style="font-size:11px; color:#475569; margin-top:2px; font-weight:500;">${H.esc(m.generic)}</div>` : ''}
                    <div class="pr-sku" style="font-size:11px; color:#64748b; margin-top:1px;">SKU: ${H.esc(m.sku)} | Stock: ${m.stock}</div>
                  </div>
                  <div class="pr-price" style="font-weight:700; color:#059669;">${H.formatCurrency(m.price)}</div>
                </div>
              `;
            });

            prodResults.onclick = (ev) => {
              const item = ev.target.closest('.product-result-item');
              if (!item) return;
              const ds = item.dataset;
              this.addToCart({
                productId: ds.id,
                productName: ds.name,
                variationName: ds.var,
                sku: ds.sku || '',
                unitPrice: parseFloat(ds.price),
                qty: 1,
                image: ds.image,
                stock: parseInt(ds.stock)
              });
              prodResults.classList.remove('open');
              searchProd.value = '';
              searchProd.focus();
            };
          }
          prodResults.classList.add('open');
        } catch (err) {
          if (err.name === 'AbortError') return;
          console.error('Product search error:', err);
        }
      }, 300));

      // Barcode Enter keypress lookup
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
              const matchedItem = {
                productId: it.productId || it.id,
                productName: it.productName || it.name,
                variationName: it.variationName || '',
                sku: it.sku || '',
                unitPrice: parseFloat(it.price || 0),
                qty: 1,
                image: it.image || '',
                stock: parseInt(it.currentStock || 0)
              };
              this.addToCart(matchedItem);
              searchProd.value = '';
              prodResults.classList.remove('open');
              H.showToast(`Scanned: ${matchedItem.productName} ${matchedItem.variationName ? `(${matchedItem.variationName})` : ''}`, 'success');
              this.playBeepSound();
            } else {
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

      // ── Discount & Tax Changes ───────────────────────
      const discType = document.getElementById('discount-type');
      const discVal = document.getElementById('discount-value');
      const taxPercent = document.getElementById('tax-percent');

      discType.onchange = () => {
        const isNone = discType.value === 'none';
        discVal.disabled = isNone;
        if (isNone) discVal.value = 0;
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

      // ── Add Payment Split Button ─────────────────────
      document.getElementById('btn-add-payment').onclick = () => {
        this.payments.push({ method: 'Cash', amount: 0, lastFour: '' });
        this.renderPayments();
        this.recalculate();
      };

      // ── Place Order Button ───────────────────────────
      document.getElementById('btn-place-order').onclick = () => this.placeOrder();
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
              <input type="text" class="form-input" id="custom-prod-name" placeholder="Enter product name..." value="" style="border: 1.5px solid #cbd5e1;">
            </div>
            <div class="form-row" style="grid-template-columns: 1fr 1fr; gap:12px;">
              <div class="form-group">
                <label class="form-label" style="font-weight:700;">Unit Price (৳) *</label>
                <input type="number" class="form-input" id="custom-prod-price" placeholder="0.00" value="" min="0" step="0.01" style="border: 1.5px solid #cbd5e1;">
              </div>
              <div class="form-group">
                <label class="form-label" style="font-weight:700;">Quantity</label>
                <input type="number" class="form-input" id="custom-prod-qty" value="1" min="1" style="border: 1.5px solid #cbd5e1;">
              </div>
            </div>
            <div class="form-group" style="margin-top:8px;">
              <label class="form-label" style="font-weight:700;">SKU Number (Optional)</label>
              <input type="text" class="form-input" id="custom-prod-sku" placeholder="e.g. CUST-01" style="border: 1.5px solid #cbd5e1;">
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
      const priceInput = overlay.querySelector('#custom-prod-price');
      const qtyInput = overlay.querySelector('#custom-prod-qty');
      const skuInput = overlay.querySelector('#custom-prod-sku');
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

    selectCustomer(c) {
      const H = POS.Helpers;
      this.selectedCustomer = c;
      const det = document.getElementById('customer-details');
      const searchInput = document.getElementById('search-customer');

      if (c) {
        searchInput.value = `${c.name} (${c.phone})`;
        const labelStyle = c.label ? `background:${H.labelColors[c.label] || '#64748b'};` : '';
        det.innerHTML = `
          <div style="display:flex; align-items:center; gap:8px; background:#f8fafc; padding:8px 12px; border-radius:6px; border:1px solid #e2e8f0;">
            <div style="flex:1;">
              <span style="font-weight:700; color:#1e293b;">${H.esc(c.name)}</span>
              ${c.label ? `<span class="badge-label" style="${labelStyle} font-size:9px; padding:2px 6px; margin-left:6px;">${c.label}</span>` : ''}
              ${c.customDiscount > 0 ? `<span class="text-success" style="font-weight:700; margin-left:6px; font-size:12px;">(Auto Discount: ${c.customDiscount}%)</span>` : ''}
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-clear-customer" style="padding:2px 8px; font-size:11px;">Change</button>
          </div>
        `;
        det.style.display = 'block';

        if (c.customDiscount > 0) {
          const discType = document.getElementById('discount-type');
          const discVal = document.getElementById('discount-value');
          discType.value = 'percentage';
          discType.dispatchEvent(new Event('change'));
          discVal.value = c.customDiscount;
        }

        document.getElementById('btn-clear-customer').onclick = () => {
          this.selectCustomer(null);
          const discType = document.getElementById('discount-type');
          discType.value = 'none';
          discType.dispatchEvent(new Event('change'));
        };
      } else {
        searchInput.value = '';
        det.innerHTML = '';
        det.style.display = 'none';
        this.selectedCustomer = null;
      }
      this.recalculate();
    },

    showAddCustomerModal(prefilledPhone) {
      const H = POS.Helpers;
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay active';
      overlay.innerHTML = `
        <div class="modal" style="max-width:450px;">
          <div class="modal-header">
            <h3>Add New Customer</h3>
            <button class="modal-close" id="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Full Name *</label>
              <input type="text" class="form-input" id="cust-modal-name" required>
            </div>
            <div class="form-group">
              <label class="form-label">Phone Number *</label>
              <input type="text" class="form-input" id="cust-modal-phone" value="${H.esc(prefilledPhone)}">
            </div>
            <div class="form-group">
              <label class="form-label">Customer Label</label>
              <select class="form-select" id="cust-modal-label">
                ${H.customerLabels.map(l => `<option value="${l}">${l}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Custom Discount (%)</label>
              <input type="number" class="form-input" id="cust-modal-discount" value="0" min="0" max="100">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="cust-modal-cancel">Cancel</button>
            <button class="btn btn-primary" id="cust-modal-save">Save & Select</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      const close = () => overlay.remove();
      overlay.querySelector('#modal-close').onclick = close;
      overlay.querySelector('#cust-modal-cancel').onclick = close;

      overlay.querySelector('#cust-modal-save').onclick = async () => {
        const name = overlay.querySelector('#cust-modal-name').value.trim();
        const phone = overlay.querySelector('#cust-modal-phone').value.trim();
        const label = overlay.querySelector('#cust-modal-label').value;
        const discount = parseFloat(overlay.querySelector('#cust-modal-discount').value) || 0;

        if (!name || !phone) {
          H.showToast('Please enter name and phone', 'error');
          return;
        }

        const newCust = await POS.Store.add('customers', {
          name, phone, label, customDiscount: discount, email: '', address: ''
        });

        this.selectCustomer(newCust);
        close();
        H.showToast('Customer created successfully');
      };
    },

    addToCart(item) {
      const existing = this.cart.find(i => i.productId === item.productId && i.variationName === item.variationName);
      if (existing) {
        if (existing.qty < item.stock) {
          existing.qty++;
        } else {
          POS.Helpers.showToast('Insufficient stock available!', 'warning');
        }
      } else {
        this.cart.push({
          ...item,
          sku: item.sku || ''
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
          if (item.qty < item.stock) {
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
          if (val > item.stock) {
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
      const paidEl = document.getElementById('summary-paid');
      const changeEl = document.getElementById('summary-change');
      const dueRow = document.getElementById('row-due-balance');
      const dueEl = document.getElementById('summary-due');

      if (subtotalEl) subtotalEl.textContent = H.formatCurrency(subtotal);
      if (discountEl) discountEl.textContent = `-${H.formatCurrency(discountAmount)}`;
      if (taxEl) taxEl.textContent = H.formatCurrency(taxAmount);
      if (totalEl) totalEl.textContent = H.formatCurrency(grandTotal);
      if (countEl) countEl.textContent = `${totalItemsCount} Item${totalItemsCount === 1 ? '' : 's'}`;
      if (paidEl) paidEl.textContent = H.formatCurrency(totalPaid);
      if (changeEl) changeEl.textContent = H.formatCurrency(change);

      if (dueRow && dueEl) {
        if (due > 0 && this.cart.length > 0) {
          dueRow.style.display = 'flex';
          dueEl.textContent = H.formatCurrency(due);
        } else {
          dueRow.style.display = 'none';
        }
      }
    },

    async placeOrder() {
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
      const dueAmount = Math.max(0, grandTotal - totalPaid);

      const invoiceId = await S.getNextId('INV-');
      const orderId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

      // Construct Bangladesh GMT+6 date-time string preserving the exact selected calendar date
      const sDate = salesDate || H.today();
      const nowTime = H.nowBDTime();
      const orderDate = `${sDate} ${nowTime}`;

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
        dueAmount,
        returnedAmount: 0,
        status: dueAmount > 0 ? 'due' : 'completed'
      };

      const orderItemsList = this.cart.map(item => ({
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9) + '_' + item.productId,
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
        amount: parseFloat(p.amount) || 0,
        lastFour: p.lastFour || null
      }));

      const result = await S.placeOrder(order, orderItemsList, orderPaymentsList);

      if (result.success) {
        H.showToast(`Order ${invoiceId} placed successfully!`);
        if (await H.confirm('Would you like to print the receipt?')) {
          H.printOrder(order, this.cart, orderPaymentsList);
        }
        POS.Router.navigate('/sales-list');
      } else {
        H.showToast('Failed to place order: ' + result.error, 'error');
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
        setTimeout(() => {
          try {
            oscillator.stop();
            audioCtx.close();
          } catch(e) {}
        }, 80);
      } catch (err) {
        // AudioContext not allowed or sound unavailable
      }
    }
  };

  window.POS = window.POS || {};
  window.POS.NewOrder = NewOrder;
})();
