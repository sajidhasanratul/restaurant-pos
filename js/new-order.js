(function () {
  'use strict';

  const NewOrder = {
    cart: [],
    selectedCustomer: null,
    payments: [{ method: 'Cash', amount: 0 }],

    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

      this.cart = [];
      this.selectedCustomer = null;
      this.payments = [{ method: 'Cash', amount: 0, lastFour: '' }];

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <h2 class="page-title">New Sale</h2>
            <p class="page-subtitle">Add customer details, search or enter custom products, and process payment.</p>
          </div>
          <div class="page-actions">
            <a href="/sales-list" class="btn btn-secondary btn-sm">Back to Sales List</a>
          </div>
        </div>

        <div class="order-layout fade-in">
          <!-- Left Panel: Form & Cart -->
          <div class="flex flex-col gap-2">
            <!-- Customer & Date -->
            <div class="card">
              <div class="card-body form-row">
                <div class="form-group" style="position:relative;">
                  <label class="form-label" style="font-weight:700;">Customer Phone / Name</label>
                  <input type="text" class="form-input" id="search-customer" placeholder="Search phone or name..." style="border: 2px solid #64748b; font-weight:500;">
                  <div class="product-results" id="customer-results"></div>
                  <div id="customer-details" class="mt-1" style="display:none;"></div>
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-weight:700;">Sales Date</label>
                  <input type="date" class="form-input" id="sales-date" value="${H.today()}">
                </div>
              </div>
            </div>

            <!-- Product Search / Custom Product -->
            <div class="card">
              <div class="card-body">
                <div class="product-search-wrap">
                  <div style="display: flex; gap: 8px;">
                    <div class="search-box" style="flex: 1;">
                      <input type="text" id="search-product" placeholder="Type product name, SKU or scan barcode..." style="border: 2px solid #64748b; font-weight:500;">
                    </div>
                    <button class="btn btn-secondary" id="btn-add-custom-prod" title="Add Custom Product" style="white-space:nowrap; font-weight:600; padding:0 14px;">+ Custom Product</button>
                  </div>
                  <div class="product-results" id="product-results"></div>
                </div>

                <div class="table-wrapper mt-2">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Product / Variation</th>
                        <th>Price</th>
                        <th style="width:120px;">Qty</th>
                        <th>Total</th>
                        <th style="width:50px;"></th>
                      </tr>
                    </thead>
                    <tbody id="cart-tbody">
                      <tr>
                        <td colspan="5" class="text-center text-muted">Cart is empty. Add products to start.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- Discount & Tax -->
            <div class="card">
              <div class="card-header">Discount & Tax Settings</div>
              <div class="card-body form-row" style="grid-template-columns: repeat(4, 1fr);">
                <div class="form-group">
                  <label class="form-label">Discount Type</label>
                  <select class="form-select" id="discount-type">
                    <option value="none" selected>None</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="amount">Fixed Amount (৳)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Discount Value</label>
                  <input type="number" class="form-input" id="discount-value" value="0" min="0" disabled>
                </div>
                <div class="form-group">
                  <label class="form-label">Promo Coupon</label>
                  <div style="display:flex; gap:4px;">
                    <input type="text" class="form-input" id="coupon-code" placeholder="e.g. SAVE10" style="text-transform:uppercase;">
                    <button class="btn btn-secondary" id="btn-apply-coupon" style="padding:0 12px; font-size:12px; font-weight:700;">Apply</button>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Tax (%)</label>
                  <input type="number" class="form-input" id="tax-percent" value="0" min="0">
                </div>
              </div>
            </div>

            <!-- Multi Payment Options -->
            <div class="card">
              <div class="card-header flex justify-between items-center">
                <span>Payment Information</span>
                <button class="btn btn-secondary btn-sm" id="btn-add-payment">+ Add Split Payment</button>
              </div>
              <div class="card-body">
                <div id="payment-rows-container"></div>
              </div>
            </div>
          </div>

          <!-- Right Panel: Order Summary & Place Order -->
          <div class="order-summary flex flex-col gap-2">
            <div class="summary-header">Order Summary</div>
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

              <button class="btn btn-success btn-lg btn-block mt-3" id="btn-place-order" style="padding:16px; font-weight:700; letter-spacing:0.5px;">
                PLACE ORDER
              </button>
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
          custResults.innerHTML = `<div class="product-result-item" style="color:var(--text-secondary)">No customers found. Click to add new.</div>`;
          custResults.onclick = () => this.showAddCustomerModal(query);
        } else {
          matches.forEach(c => {
            const labelStyle = c.label ? `background:${H.labelColors[c.label] || '#64748b'};` : '';
            custResults.innerHTML += `
              <div class="product-result-item" data-id="${c.id}">
                <div>
                  <span class="pr-name">${H.esc(c.name)}</span>
                  <span class="pr-sku" style="margin-left: 8px;">${H.esc(c.phone)}</span>
                </div>
                ${c.label ? `<span class="badge-label" style="${labelStyle} font-size:9px; padding:2px 6px;">${c.label}</span>` : ''}
              </div>
            `;
          });

          // Click handler
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

      // Close dropdowns on outside click (only if elements exist in current view)
      document.addEventListener('click', (e) => {
        const custEl = document.getElementById('customer-results');
        const prodEl = document.getElementById('product-results');
        if (custEl && !e.target.closest('#search-customer')) custEl.classList.remove('open');
        if (prodEl && !e.target.closest('#search-product')) prodEl.classList.remove('open');
      });

      // ── Product Search ──────────────────────────────
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

        // Abort previous in-flight search request
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
                  sku: v.sku || p.sku,
                  barcode: v.barcode || p.barcode,
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
                sku: p.sku,
                barcode: p.barcode,
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
            prodResults.innerHTML = `<div class="product-result-item text-muted" style="padding:12px; text-align:center;">No products found.</div>`;
          } else {
            matches.forEach(m => {
              const imgHtml = m.image 
                ? `<img src="${m.image}" style="width:36px; height:36px; object-fit:cover; border-radius:var(--radius-sm); margin-right:10px;">`
                : `<div style="width:36px; height:36px; border-radius:var(--radius-sm); background:#f1f5f9; display:flex; align-items:center; justify-content:center; margin-right:10px; color:#64748b;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 16-9 5-9-5V8l9-5 9 5v8Z"/><path d="m3.27 6.96 8.73 4.86 8.73-4.86"/><path d="M12 22.08V12"/></svg></div>`;

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
                  <div class="pr-price">${H.formatCurrency(m.price)}</div>
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
          if (err.name === 'AbortError') return; // Expected when user is typing quickly
          console.error('Product search error:', err);
        }
      }, 300));

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
              const matchedItem = {
                productId: it.productId || it.id,
                productName: it.productName || it.name,
                variationName: it.variationName || '',
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

      // ── Add Payment Split ────────────────────────────
      document.getElementById('btn-add-payment').onclick = () => {
        this.payments.push({ method: 'Cash', amount: 0, lastFour: '' });
        this.renderPayments();
        this.recalculate();
      };

      // ── Place Order ──────────────────────────────────
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
              <label class="form-label" style="font-weight:700;">Product Name</label>
              <input type="text" class="form-input" id="custom-prod-name" placeholder="Enter product name..." value="" style="border: 2px solid #64748b;">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" style="font-weight:700;">Unit Price (৳)</label>
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

        this.addToCart({
          productId: 'custom_' + Date.now().toString(36),
          productName: pName,
          variationName: '',
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
          <div style="display:flex; align-items:center; gap:8px; background:var(--bg); padding:8px 12px; border-radius:var(--radius-xs); border:1px solid var(--border)">
            <span>${H.esc(c.name)} | Label: <span class="badge-label" style="${labelStyle} font-size:9px; padding:2px 6px;">${c.label}</span></span>
            ${c.customDiscount > 0 ? `<span class="text-success" style="font-weight:700;">(Auto Discount: ${c.customDiscount}%)</span>` : ''}
            <button class="btn btn-secondary btn-sm" id="btn-clear-customer" style="padding:2px 8px; margin-left:auto;">Clear</button>
          </div>
        `;
        det.style.display = 'block';

        // Auto apply custom customer discount if applicable
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
              <label class="form-label">Full Name</label>
              <input type="text" class="form-input" id="cust-modal-name" required>
            </div>
            <div class="form-group">
              <label class="form-label">Phone Number</label>
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
      // Check if item already exists in cart
      const existing = this.cart.find(i => i.productId === item.productId && i.variationName === item.variationName);
      if (existing) {
        if (existing.qty < item.stock) {
          existing.qty++;
        } else {
          POS.Helpers.showToast('Insufficient stock!', 'warning');
        }
      } else {
        this.cart.push(item);
      }
      this.renderCart();
      this.recalculate();
    },

    renderCart() {
      const H = POS.Helpers;
      const tbody = document.getElementById('cart-tbody');
      tbody.innerHTML = '';

      if (this.cart.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Cart is empty. Add products to start.</td></tr>`;
        return;
      }

      this.cart.forEach((item, index) => {
        const thumbHtml = item.image 
          ? `<img src="${item.image}" style="width:30px; height:30px; object-fit:cover; border-radius:var(--radius-xs); margin-right:8px;">`
          : `<div style="width:30px; height:30px; border-radius:var(--radius-xs); background:#f1f5f9; display:flex; align-items:center; justify-content:center; margin-right:8px; font-size:11px; font-weight:700; color:#64748b;">${item.isCustom ? 'C' : 'P'}</div>`;

        const nameDisplayHtml = item.isCustom
          ? `<input type="text" class="form-input input-custom-name" value="${H.esc(item.productName)}" placeholder="Custom product name..." style="padding:4px 6px; height:28px; width:100%; font-size:12px; font-weight:600;">`
          : `
            <div>
              <div class="cart-item-name">${H.esc(item.productName)}</div>
              ${item.variationName ? `<div class="cart-item-variant">${H.esc(item.variationName)}</div>` : ''}
            </div>
          `;

        tbody.innerHTML += `
          <tr class="cart-item-row" data-index="${index}">
            <td>
              <div style="display:flex; align-items:center;">
                ${thumbHtml}
                <div style="flex:1;">
                  ${nameDisplayHtml}
                </div>
              </div>
            </td>
            <td>
              <div style="display:flex; align-items:center; gap:4px; max-width:110px;">
                <span>৳</span>
                <input type="number" class="input-price form-input" value="${item.unitPrice || ''}" placeholder="0.00" min="0" step="0.01" style="padding:4px 6px; height:28px; width:100%; font-size:12px; font-weight:600;">
              </div>
            </td>
            <td>
              <div class="qty-control">
                <button class="btn-qty-dec">-</button>
                <input type="number" class="input-qty" value="${item.qty}" min="1" max="${item.stock}">
                <button class="btn-qty-inc">+</button>
              </div>
            </td>
            <td style="font-weight:700;">${H.formatCurrency(item.unitPrice * item.qty)}</td>
            <td>
              <button class="btn btn-secondary btn-sm btn-qty-remove" style="padding:2px 8px; color:var(--danger); border-color:#fee2e2; background:#fef2f2; font-weight:700;" title="Remove Item">&times;</button>
            </td>
          </tr>
        `;
      });

      // Bind events
      tbody.querySelectorAll('.cart-item-row').forEach(row => {
        const index = parseInt(row.dataset.index);
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
          let val = parseInt(e.target.value) || 1;
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
          // Re-render and recalculate without clearing input focus if possible,
          // but calling renderCart() is simple and correct
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
      container.innerHTML = '';

      this.payments.forEach((p, idx) => {
        container.innerHTML += `
          <div class="payment-row" data-index="${idx}">
            <div class="form-group">
              <label class="form-label">Payment Method</label>
              <select class="form-select payment-method-select">
                ${H.paymentMethods.map(m => `<option value="${m}" ${p.method === m ? 'selected' : ''}>${m}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Last 4 Digits</label>
              <input type="text" class="form-input payment-lastfour-input" value="${p.lastFour || ''}" maxlength="4" placeholder="e.g. 1234">
            </div>
            <div class="form-group">
              <label class="form-label">Amount (৳)</label>
              <input type="number" class="form-input payment-amount-input" value="${p.amount}" min="0">
            </div>
            ${this.payments.length > 1 ? `
              <button class="btn-remove-payment">🗑️</button>
            ` : ''}
          </div>
        `;
      });

      // Bind input events
      container.querySelectorAll('.payment-row').forEach(row => {
        const idx = parseInt(row.dataset.index);

        row.querySelector('.payment-method-select').onchange = (e) => {
          this.payments[idx].method = e.target.value;
        };

        row.querySelector('.payment-lastfour-input').oninput = (e) => {
          this.payments[idx].lastFour = e.target.value.trim();
        };

        row.querySelector('.payment-amount-input').oninput = (e) => {
          const val = parseFloat(e.target.value) || 0;
          this.payments[idx].amount = val;

          // Auto-balance remaining payment amount across other split row
          if (this.payments.length > 1) {
            const subtotal = this.cart.reduce((s, i) => s + (i.unitPrice * i.qty), 0);
            const discType = document.getElementById('discount-type').value;
            const discVal = parseFloat(document.getElementById('discount-value').value) || 0;
            let discountAmount = 0;
            if (discType === 'percentage') {
              discountAmount = subtotal * (discVal / 100);
            } else if (discType === 'amount') {
              discountAmount = discVal;
            }
            if (discountAmount > subtotal) discountAmount = subtotal;
            const taxPercent = parseFloat(document.getElementById('tax-percent').value) || 0;
            const taxAmount = (subtotal - discountAmount) * (taxPercent / 100);
            const grandTotal = subtotal - discountAmount + taxAmount;

            let balancingIdx = this.payments.length - 1;
            if (idx === balancingIdx) {
              balancingIdx = 0;
            }

            let sumOthers = 0;
            this.payments.forEach((p, pIdx) => {
              if (pIdx !== balancingIdx) {
                sumOthers += p.amount;
              }
            });

            let balancedAmount = grandTotal - sumOthers;
            if (balancedAmount < 0) balancedAmount = 0;
            this.payments[balancingIdx].amount = balancedAmount;

            const balancedInput = container.querySelector(`.payment-row[data-index="${balancingIdx}"] .payment-amount-input`);
            if (balancedInput) {
              balancedInput.value = balancedAmount.toFixed(2);
            }
          }
          this.recalculate();
        };

        const removeBtn = row.querySelector('.btn-remove-payment');
        if (removeBtn) {
          removeBtn.onclick = () => {
            this.payments.splice(idx, 1);
            this.renderPayments();
            this.recalculate();
          };
        }
      });
    },

    recalculate() {
      const H = POS.Helpers;

      // 1. Calculate Subtotal
      let subtotal = 0;
      this.cart.forEach(item => {
        subtotal += (item.unitPrice * item.qty);
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

      // 5. Default single payment row amount to grandTotal
      if (this.payments.length === 1) {
        this.payments[0].amount = grandTotal;
        const pInput = document.querySelector('.payment-amount-input');
        if (pInput) pInput.value = grandTotal.toFixed(2);
      }

      // 6. Total Paid sum
      const totalPaid = this.payments.reduce((s, p) => s + p.amount, 0);

      // 7. Due & Change
      let due = 0;
      let change = 0;

      if (totalPaid >= grandTotal) {
        change = totalPaid - grandTotal;
      } else {
        due = grandTotal - totalPaid;
      }

      // Update Summary Fields
      document.getElementById('summary-subtotal').textContent = H.formatCurrency(subtotal);
      document.getElementById('summary-discount').textContent = `-${H.formatCurrency(discountAmount)}`;
      document.getElementById('summary-tax').textContent = H.formatCurrency(taxAmount);
      document.getElementById('summary-total').textContent = H.formatCurrency(grandTotal);
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

      const totalPaid = this.payments.reduce((s, p) => s + p.amount, 0);

      const invoiceId = await S.getNextId('INV-');
      const orderId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

      // Construct a correct timezone-safe Date object keeping the current local hours/minutes/seconds
      const nowObj = new Date();
      const dateParts = salesDate.split('-'); // [YYYY, MM, DD]
      const finalDate = new Date(
        parseInt(dateParts[0]),
        parseInt(dateParts[1]) - 1,
        parseInt(dateParts[2]),
        nowObj.getHours(),
        nowObj.getMinutes(),
        nowObj.getSeconds()
      );

      const order = {
        id: orderId,
        invoiceId,
        customerId: this.selectedCustomer ? this.selectedCustomer.id : 'walk-in',
        customerName: this.selectedCustomer ? this.selectedCustomer.name : 'Walk-in Customer',
        customerPhone: this.selectedCustomer ? this.selectedCustomer.phone : 'N/A',
        date: finalDate.toISOString(),
        subtotal,
        discountType: discType,
        discountValue: discVal,
        discountAmount,
        taxPercent,
        taxAmount,
        grandTotal,
        paidAmount: totalPaid,
        dueAmount: 0,
        returnedAmount: 0,
        status: 'completed'
      };

      const orderItemsList = this.cart.map(item => ({
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9) + '_' + item.productId,
        orderId,
        productId: item.productId,
        productName: item.productName,
        variationName: item.variationName,
        qty: item.qty,
        unitPrice: item.unitPrice,
        total: item.unitPrice * item.qty
      }));

      const orderPaymentsList = this.payments.map(p => ({
        id: 'pay_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        orderId,
        method: p.method,
        amount: p.amount,
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
        H.showToast('Failed to place/update order: ' + result.error, 'error');
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
  window.POS.NewOrder = NewOrder;
})();
