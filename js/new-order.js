(function () {
  'use strict';

  const NewOrder = {
    cart: [],
    categories: [],
    products: [],
    selectedCategory: 'all',
    searchQuery: '',
    orderType: 'Dine In', // 'Dine In' or 'Take Away'
    selectedTable: 'Table 01',
    customerInfo: { name: 'Walk-in Guest', phone: '' },
    discount: { type: 'none', value: 0, amount: 0, code: '' },
    taxPercent: 5.0, // Default restaurant sales tax 5%
    savedBills: [],

    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

      // Reset state for new order
      this.cart = [];
      this.selectedCategory = 'all';
      this.searchQuery = '';
      this.orderType = 'Dine In';
      this.selectedTable = 'Table 01';
      this.customerInfo = { name: 'Walk-in Guest', phone: '' };
      this.discount = { type: 'none', value: 0, amount: 0, code: '' };

      // Preload payment methods
      await H.loadPaymentMethods();

      // Load configured tax settings from database
      try {
        const settings = await S.getSettings();
        if (settings) {
          const isEnabled = settings.order_tax_status !== 'disabled';
          if (isEnabled && settings.order_tax_percent !== undefined) {
            this.taxPercent = parseFloat(settings.order_tax_percent);
            if (isNaN(this.taxPercent)) this.taxPercent = 5.0;
          } else if (!isEnabled) {
            this.taxPercent = 0;
          }
        }
      } catch (e) {
        console.warn('Could not load tax settings, using default 5%:', e);
      }

      // Load products and categories from backend
      await this.loadCatalog();

      mc.innerHTML = `
        <div class="clapos-container fade-in">
          <!-- ── Top Header ── -->
          <div class="clapos-topbar">
            <div class="clapos-brand">
              <div class="clapos-brand-logo">ZP</div>
              <div class="clapos-brand-title">Zen<span>Pos</span></div>
            </div>

            <div class="clapos-search-wrap">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" class="clapos-search-input" id="clapos-search-input" placeholder="Search Items / Menu..." autocomplete="off">
            </div>

            <div class="clapos-top-status">
              <div class="clapos-status-pill" id="zenpos-token-pill" style="font-weight:800; color:#059669; background:#ECFDF5; border:1px solid #A7F3D0;" title="Today's Active Kitchen Token">
                🎟️ Token #<span id="clapos-next-token">01</span>
              </div>
              <div class="clapos-status-pill">
                <span id="clapos-live-time"></span>
              </div>
              <div class="clapos-status-pill" title="System Online & Synchronized">
                <span style="color:#10B981; font-size:14px;">●</span> Online
              </div>
            </div>
          </div>

          <!-- ── POS Body Layout (Category Rail + Products Grid + Order Details) ── -->
          <div class="clapos-body">
            <!-- 1. Left Vertical Category Rail -->
            <div class="clapos-category-rail" id="clapos-category-rail">
              <!-- Dynamically populated -->
            </div>

            <!-- 2. Center Products Grid -->
            <div class="clapos-products-area">
              <div class="clapos-grid-header">
                <div class="clapos-grid-title" id="clapos-active-cat-title">
                  All Menu
                  <span class="clapos-item-count-badge" id="clapos-prod-count">0 items</span>
                </div>
              </div>
              <div class="clapos-products-grid" id="clapos-products-grid">
                <!-- Dynamically populated product cards -->
              </div>
            </div>

            <!-- 3. Right Order Details Sidebar -->
            <div class="clapos-order-panel">
              <!-- Quick Action 3 Buttons (Save Bill Removed) -->
              <div class="clapos-actions-grid">
                <button class="clapos-action-btn" id="btn-order-customer" title="Customer Details (Optional)">
                  <span class="clapos-action-icon">👤</span>
                  <span>Customer</span>
                </button>
                <button class="clapos-action-btn" id="btn-order-tables" title="Select Table">
                  <span class="clapos-action-icon">🍽️</span>
                  <span>Tables</span>
                </button>
                <button class="clapos-action-btn" id="btn-order-discount" title="Apply Discount">
                  <span class="clapos-action-icon">🏷️</span>
                  <span>Discount</span>
                </button>
              </div>

              <!-- Order Details Header -->
              <div class="clapos-order-header">
                <div class="clapos-order-title-row">
                  <span class="clapos-order-title">Order Details</span>
                  <span class="clapos-table-badge" id="clapos-table-indicator">${this.orderType === 'Dine In' ? this.selectedTable : 'Take Away'}</span>
                </div>

                <!-- Dine In / Take Away Segmented Control -->
                <div class="clapos-mode-toggle">
                  <button class="clapos-mode-btn ${this.orderType === 'Dine In' ? 'active' : ''}" id="btn-mode-dinein">Dine In</button>
                  <button class="clapos-mode-btn ${this.orderType === 'Take Away' ? 'active' : ''}" id="btn-mode-takeaway">Take Away</button>
                </div>
              </div>

              <!-- Cart List -->
              <div class="clapos-cart-list" id="clapos-cart-list">
                <!-- Dynamically populated cart items -->
              </div>

              <!-- Clear all link -->
              <button class="clapos-clear-btn" id="btn-clear-order">Clear All Order</button>

              <!-- Order Summary Breakdown & Process Button -->
              <div class="clapos-order-footer">
                <div class="clapos-summary-row">
                  <span>Subtotal</span>
                  <span id="clapos-summary-subtotal" style="font-weight:700; color:#1E293B;">৳0.00</span>
                </div>
                <div class="clapos-summary-row">
                  <span id="clapos-summary-tax-label">Vat / Tax (${this.taxPercent}%)</span>
                  <span id="clapos-summary-tax">৳0.00</span>
                </div>
                <div class="clapos-summary-row" id="clapos-summary-discount-row" style="display:none;">
                  <span>Voucher / Discount</span>
                  <span id="clapos-summary-discount" style="color:#EF4444; font-weight:700;">-৳0.00</span>
                </div>
                <div class="clapos-summary-row total-row">
                  <span>Total</span>
                  <span class="clapos-grand-total" id="clapos-summary-total">৳0.00</span>
                </div>

                <button class="clapos-process-btn" id="btn-process-transaction" disabled>
                  Process Transaction
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Fetch live token for today
      fetch('/api/next-token')
        .then(r => r.json())
        .then(d => {
          const el = document.getElementById('clapos-next-token');
          if (el && d.tokenNo) el.textContent = String(d.tokenNo).padStart(2, '0');
        })
        .catch(() => {});

      this.setupClock();
      this.renderCategoryRail();
      this.renderProductCards();
      this.renderCart();
      this.bindEvents();
    },

    setupClock() {
      const update = () => {
        const el = document.getElementById('clapos-live-time');
        if (!el) return;
        const now = new Date();
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dName = days[now.getDay()];
        const mName = months[now.getMonth()];
        const day = now.getDate();
        let hours = now.getHours();
        const mins = String(now.getMinutes()).padStart(2, '0');
        el.textContent = `${hours}:${mins} ${dName} ${mName} ${day}`;
      };
      update();
      setInterval(update, 30000);
    },

    async loadCatalog() {
      try {
        const [catRes, prodRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/products')
        ]);
        this.categories = catRes.ok ? await catRes.json() : [];
        this.products = prodRes.ok ? await prodRes.json() : [];
      } catch (err) {
        console.error('Error loading catalog:', err);
      }
    },

    getCategoryIcon(catName) {
      const name = (catName || '').toLowerCase();
      if (name.includes('burger')) return '🍔';
      if (name.includes('chicken') || name.includes('wing')) return '🍗';
      if (name.includes('drink') || name.includes('beverage')) return '🥤';
      if (name.includes('coffee') || name.includes('tea')) return '☕';
      if (name.includes('dessert') || name.includes('ice cream')) return '🍨';
      if (name.includes('sides') || name.includes('fries')) return '🍟';
      if (name.includes('combo')) return '🍱';
      return '🍽️';
    },

    renderCategoryRail() {
      const rail = document.getElementById('clapos-category-rail');
      if (!rail) return;

      const allBtn = `
        <button class="clapos-cat-btn ${this.selectedCategory === 'all' ? 'active' : ''}" data-cat="all">
          <div class="clapos-cat-icon">🍽️</div>
          <div class="clapos-cat-name">All Menu</div>
        </button>
      `;

      const catBtns = this.categories.map(c => `
        <button class="clapos-cat-btn ${this.selectedCategory === c.id ? 'active' : ''}" data-cat="${c.id}">
          <div class="clapos-cat-icon" style="overflow:hidden; display:flex; align-items:center; justify-content:center;">
            ${c.image 
              ? `<img src="${c.image}" alt="${POS.Helpers.escapeHtml(c.name)}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">` 
              : (c.icon || this.getCategoryIcon(c.name))}
          </div>
          <div class="clapos-cat-name">${POS.Helpers.escapeHtml(c.name)}</div>
        </button>
      `).join('');

      rail.innerHTML = allBtn + catBtns;

      rail.querySelectorAll('.clapos-cat-btn').forEach(btn => {
        btn.onclick = () => {
          this.selectedCategory = btn.dataset.cat;
          rail.querySelectorAll('.clapos-cat-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          const catObj = this.categories.find(c => c.id === this.selectedCategory);
          const titleEl = document.getElementById('clapos-active-cat-title');
          if (titleEl) {
            titleEl.innerHTML = `
              ${this.selectedCategory === 'all' ? 'All Menu' : POS.Helpers.escapeHtml(catObj ? catObj.name : 'Category')}
              <span class="clapos-item-count-badge" id="clapos-prod-count">0 items</span>
            `;
          }
          this.renderProductCards();
        };
      });
    },

    renderProductCards() {
      const grid = document.getElementById('clapos-products-grid');
      const countEl = document.getElementById('clapos-prod-count');
      if (!grid) return;

      let filtered = this.products.filter(p => p.status !== 'Trash');

      if (this.selectedCategory !== 'all') {
        filtered = filtered.filter(p => p.categoryId === this.selectedCategory);
      }

      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase().trim();
        filtered = filtered.filter(p => 
          (p.name || '').toLowerCase().includes(q) ||
          (p.sku || '').toLowerCase().includes(q) ||
          (p.tag || '').toLowerCase().includes(q)
        );
      }

      if (countEl) countEl.textContent = `${filtered.length} items`;

      if (filtered.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: #94A3B8;">
            <div style="font-size: 32px; margin-bottom: 8px;">🍽️</div>
            <p style="font-size: 14px; font-weight:600;">No dishes found matching your criteria.</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = filtered.map(item => {
        const inCartItem = this.cart.find(c => c.productId === item.id);
        const qty = inCartItem ? inCartItem.qty : 0;
        const price = parseFloat(item.sellingPrice || 0);

        return `
          <div class="clapos-card ${qty > 0 ? 'in-cart' : ''}" data-id="${item.id}">
            <div class="clapos-card-img-wrap">
              ${item.image ? `
                <img src="${item.image}" alt="${POS.Helpers.escapeHtml(item.name)}" class="clapos-card-img" loading="lazy">
              ` : `
                <div style="font-size: 36px;">${this.getCategoryIcon(item.name)}</div>
              `}
            </div>
            <div class="clapos-card-name" title="${POS.Helpers.escapeHtml(item.name)}">
              ${POS.Helpers.escapeHtml(item.name)}
            </div>
            <div class="clapos-card-bottom">
              <span class="clapos-card-price">৳${price.toFixed(2)}</span>
              ${qty > 0 ? `
                <div class="clapos-qty-pill" onclick="event.stopPropagation();">
                  <button class="clapos-qty-btn btn-card-dec" data-id="${item.id}">-</button>
                  <span>${qty}</span>
                  <button class="clapos-qty-btn btn-card-inc" data-id="${item.id}">+</button>
                </div>
              ` : `
                <button class="clapos-card-add-btn btn-card-add" data-id="${item.id}" title="Add to Order">+</button>
              `}
            </div>
          </div>
        `;
      }).join('');

      // Bind card click & controls
      grid.querySelectorAll('.clapos-card').forEach(card => {
        card.onclick = () => {
          this.addToCart(card.dataset.id);
        };
      });

      grid.querySelectorAll('.btn-card-add').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          this.addToCart(btn.dataset.id);
        };
      });

      grid.querySelectorAll('.btn-card-inc').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          this.updateCartQty(btn.dataset.id, 1);
        };
      });

      grid.querySelectorAll('.btn-card-dec').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          this.updateCartQty(btn.dataset.id, -1);
        };
      });
    },

    addToCart(productId) {
      const prod = this.products.find(p => p.id === productId);
      if (!prod) return;

      const existing = this.cart.find(c => c.productId === productId);
      if (existing) {
        existing.qty += 1;
        existing.total = existing.qty * existing.price;
      } else {
        const price = parseFloat(prod.sellingPrice || 0);
        this.cart.push({
          productId: prod.id,
          productName: prod.name,
          image: prod.image || '',
          price: price,
          qty: 1,
          total: price
        });
      }

      this.renderCart();
      this.renderProductCards();
    },

    updateCartQty(productId, delta) {
      const item = this.cart.find(c => c.productId === productId);
      if (!item) return;

      item.qty += delta;
      if (item.qty <= 0) {
        this.cart = this.cart.filter(c => c.productId !== productId);
      } else {
        item.total = item.qty * item.price;
      }

      this.renderCart();
      this.renderProductCards();
    },

    renderCart() {
      const listEl = document.getElementById('clapos-cart-list');
      const processBtn = document.getElementById('btn-process-transaction');
      if (!listEl) return;

      if (this.cart.length === 0) {
        listEl.innerHTML = `
          <div class="clapos-cart-empty">
            <span style="font-size: 32px;">🛒</span>
            <p style="font-weight: 600; color:#475569;">No items in order</p>
            <span style="font-size:12px; color:#94A3B8;">Tap any dish from the menu to add</span>
          </div>
        `;
        if (processBtn) processBtn.disabled = true;
      } else {
        listEl.innerHTML = this.cart.map(item => `
          <div class="clapos-cart-item">
            <div class="clapos-cart-item-info">
              <div class="clapos-cart-item-name">${POS.Helpers.escapeHtml(item.productName)}</div>
              <div class="clapos-cart-item-unit">৳${item.price.toFixed(2)} × ${item.qty}</div>
            </div>
            <div class="clapos-cart-item-right">
              <div class="clapos-cart-item-price">৳${item.total.toFixed(2)}</div>
              <button class="clapos-cart-item-remove btn-cart-remove" data-id="${item.productId}" title="Remove">✕</button>
            </div>
          </div>
        `).join('');

        listEl.querySelectorAll('.btn-cart-remove').forEach(btn => {
          btn.onclick = () => {
            this.cart = this.cart.filter(c => c.productId !== btn.dataset.id);
            this.renderCart();
            this.renderProductCards();
          };
        });

        if (processBtn) processBtn.disabled = false;
      }

      this.updateSummary();
    },

    updateSummary() {
      let subtotal = 0;
      this.cart.forEach(item => {
        subtotal += item.total;
      });

      // Calculate discount
      let discountAmount = 0;
      if (this.discount.type === 'percentage') {
        discountAmount = subtotal * (this.discount.value / 100);
      } else if (this.discount.type === 'amount') {
        discountAmount = Math.min(subtotal, this.discount.value);
      }
      this.discount.amount = discountAmount;

      const discountedSubtotal = Math.max(0, subtotal - discountAmount);
      const taxAmount = discountedSubtotal * (this.taxPercent / 100);
      const grandTotal = discountedSubtotal + taxAmount;

      const subtotalEl = document.getElementById('clapos-summary-subtotal');
      const taxLabelEl = document.getElementById('clapos-summary-tax-label');
      const taxEl = document.getElementById('clapos-summary-tax');
      const discountRow = document.getElementById('clapos-summary-discount-row');
      const discountEl = document.getElementById('clapos-summary-discount');
      const totalEl = document.getElementById('clapos-summary-total');

      if (subtotalEl) subtotalEl.textContent = `৳${subtotal.toFixed(2)}`;
      if (taxLabelEl) taxLabelEl.textContent = `Vat / Tax (${this.taxPercent}%)`;
      if (taxEl) taxEl.textContent = `৳${taxAmount.toFixed(2)}`;

      if (discountRow && discountEl) {
        if (discountAmount > 0) {
          discountRow.style.display = 'flex';
          discountEl.textContent = `-৳${discountAmount.toFixed(2)}`;
        } else {
          discountRow.style.display = 'none';
        }
      }

      if (totalEl) totalEl.textContent = `৳${grandTotal.toFixed(2)}`;
    },

    bindEvents() {
      const searchInput = document.getElementById('clapos-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.searchQuery = e.target.value;
          this.renderProductCards();
        });
      }

      // Dine In / Take Away toggles
      const dineInBtn = document.getElementById('btn-mode-dinein');
      const takeAwayBtn = document.getElementById('btn-mode-takeaway');
      const tableIndicator = document.getElementById('clapos-table-indicator');

      if (dineInBtn && takeAwayBtn) {
        dineInBtn.onclick = () => {
          this.orderType = 'Dine In';
          dineInBtn.classList.add('active');
          takeAwayBtn.classList.remove('active');
          if (tableIndicator) tableIndicator.textContent = this.selectedTable;
        };
        takeAwayBtn.onclick = () => {
          this.orderType = 'Take Away';
          takeAwayBtn.classList.add('active');
          dineInBtn.classList.remove('active');
          if (tableIndicator) tableIndicator.textContent = 'Take Away';
        };
      }

      // Clear all
      const clearBtn = document.getElementById('btn-clear-order');
      if (clearBtn) {
        clearBtn.onclick = () => {
          if (this.cart.length === 0) return;
          if (confirm('Clear all items from this order?')) {
            this.cart = [];
            this.renderCart();
            this.renderProductCards();
          }
        };
      }

      // Quick Action Buttons
      const custBtn = document.getElementById('btn-order-customer');
      if (custBtn) custBtn.onclick = () => this.showCustomerModal();

      const tableBtn = document.getElementById('btn-order-tables');
      if (tableBtn) tableBtn.onclick = () => this.showTablesModal();

      const discBtn = document.getElementById('btn-order-discount');
      if (discBtn) discBtn.onclick = () => this.showDiscountModal();

      // Process Transaction checkout
      const processBtn = document.getElementById('btn-process-transaction');
      if (processBtn) processBtn.onclick = () => this.showTransactionModal();
    },

    // ── 1. Customer Modal (Optional info, NOT required) ──
    showCustomerModal() {
      const H = POS.Helpers;
      const modalHtml = `
        <div class="modal" id="modal-order-customer" style="max-width:440px;">
          <div class="modal-header">
            <h3>👤 Guest / Customer Details</h3>
            <button class="modal-close" id="btn-close-cust">&times;</button>
          </div>
          <div class="modal-body" style="padding:18px 24px;">
            <p style="font-size:12.5px; color:#64748B; margin-bottom:14px;">
              Customer details are <strong>completely optional</strong> for dining orders.
            </p>
            <div class="form-group mb-2">
              <label class="form-label">Guest / Customer Name</label>
              <input type="text" class="form-input" id="cust-modal-name" value="${H.escapeHtml(this.customerInfo.name || 'Walk-in Guest')}" placeholder="e.g. John Doe / Walk-in Guest">
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Phone Number (Optional)</label>
              <input type="text" class="form-input" id="cust-modal-phone" value="${H.escapeHtml(this.customerInfo.phone || '')}" placeholder="e.g. +1 555-0192">
            </div>
          </div>
          <div class="modal-footer" style="padding:12px 24px;">
            <button class="btn btn-secondary" id="btn-cancel-cust">Cancel</button>
            <button class="btn btn-primary" id="btn-save-cust" style="background:#10B981; border-color:#10B981;">Save Guest Details</button>
          </div>
        </div>
      `;

      H.showModal(modalHtml);

      document.getElementById('btn-close-cust').onclick = () => H.hideModal();
      document.getElementById('btn-cancel-cust').onclick = () => H.hideModal();
      document.getElementById('btn-save-cust').onclick = () => {
        const name = document.getElementById('cust-modal-name').value.trim() || 'Walk-in Guest';
        const phone = document.getElementById('cust-modal-phone').value.trim();
        this.customerInfo = { name, phone };
        H.showToast(`Guest set to: ${name}`, 'success');
        H.hideModal();
      };
    },

    // ── 2. Tables Modal ──
    async showTablesModal() {
      const H = POS.Helpers;
      let tablesList = [];
      try {
        const res = await fetch('/api/tables');
        if (res.ok) {
          const all = await res.json();
          tablesList = all.filter(t => t.status === 'active');
        }
      } catch (e) {
        console.warn('Error fetching tables:', e);
      }

      if (tablesList.length === 0) {
        tablesList = [
          { name: 'Table 01', zone: 'Main Dining', seats: 4 },
          { name: 'Table 02', zone: 'Main Dining', seats: 2 },
          { name: 'Table 03', zone: 'Main Dining', seats: 4 },
          { name: 'Table 04', zone: 'Main Dining', seats: 4 },
          { name: 'Table 05', zone: 'Main Dining', seats: 6 },
          { name: 'Table 06', zone: 'Main Dining', seats: 6 },
          { name: 'Patio 01', zone: 'Outdoor Patio', seats: 4 },
          { name: 'VIP 01', zone: 'VIP Lounge', seats: 8 }
        ];
      }

      // Group tables by zone
      const zones = {};
      tablesList.forEach(t => {
        const z = t.zone || 'Main Dining';
        if (!zones[z]) zones[z] = [];
        zones[z].push(t);
      });

      const modalHtml = `
        <div class="modal" id="modal-order-tables" style="max-width:540px;">
          <div class="modal-header">
            <h3>🍽️ Select Dining Table</h3>
            <button class="modal-close" id="btn-close-tables">&times;</button>
          </div>
          <div class="modal-body" style="padding:18px 24px; max-height:65vh; overflow-y:auto;">
            <p style="font-size:12.5px; color:#64748B; margin-bottom:14px;">Choose an active dining table for this Dine-In transaction:</p>
            
            ${Object.entries(zones).map(([zoneName, tList]) => `
              <div style="margin-bottom:16px;">
                <div style="font-size:11.5px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
                  <span>📍</span> <span>${H.escapeHtml(zoneName)}</span>
                </div>
                <div class="table-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(105px, 1fr)); gap:10px;">
                  ${tList.map(t => {
                    const isSel = this.selectedTable === t.name && this.orderType === 'Dine In';
                    return `
                      <div class="table-card ${isSel ? 'selected' : ''}" data-table="${H.escapeHtml(t.name)}" style="padding:10px 8px; border-radius:10px; border:2px solid ${isSel ? '#10B981' : '#E2E8F0'}; background:${isSel ? '#F0FDF4' : '#fff'}; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:4px; transition:all 0.15s;">
                        <span style="font-size:22px;">🪑</span>
                        <span style="font-size:12.5px; font-weight:800; color:#1E293B;">${H.escapeHtml(t.name)}</span>
                        <span style="font-size:10px; font-weight:700; color:#64748B; background:#F1F5F9; padding:1px 6px; border-radius:10px;">${t.seats ? `${t.seats} Seats` : 'Table'}</span>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `).join('')}
          </div>
          <div class="modal-footer" style="padding:12px 24px;">
            <button class="btn btn-secondary" id="btn-cancel-tables">Cancel</button>
          </div>
        </div>
      `;

      H.showModal(modalHtml);

      document.getElementById('btn-close-tables').onclick = () => H.hideModal();
      document.getElementById('btn-cancel-tables').onclick = () => H.hideModal();

      document.querySelectorAll('.table-card').forEach(card => {
        card.onclick = () => {
          this.selectedTable = card.dataset.table;
          this.orderType = 'Dine In';
          const tableIndicator = document.getElementById('clapos-table-indicator');
          if (tableIndicator) tableIndicator.textContent = this.selectedTable;
          const dineInBtn = document.getElementById('btn-mode-dinein');
          const takeAwayBtn = document.getElementById('btn-mode-takeaway');
          if (dineInBtn) dineInBtn.classList.add('active');
          if (takeAwayBtn) takeAwayBtn.classList.remove('active');
          H.showToast(`Assigned to ${this.selectedTable}`, 'success');
          H.hideModal();
        };
      });
    },

    // ── 3. Discount Modal ──
    showDiscountModal() {
      const H = POS.Helpers;
      const modalHtml = `
        <div class="modal" id="modal-order-discount" style="max-width:440px;">
          <div class="modal-header">
            <h3>🏷️ Order Discount</h3>
            <button class="modal-close" id="btn-close-disc">&times;</button>
          </div>
          <div class="modal-body" style="padding:18px 24px;">
            <div style="display:flex; gap:8px; margin-bottom:14px;">
              <button class="btn btn-secondary btn-sm btn-quick-disc" data-pct="5" style="flex:1;">5% Off</button>
              <button class="btn btn-secondary btn-sm btn-quick-disc" data-pct="10" style="flex:1;">10% Off</button>
              <button class="btn btn-secondary btn-sm btn-quick-disc" data-pct="15" style="flex:1;">15% Off</button>
              <button class="btn btn-secondary btn-sm btn-quick-disc" data-pct="20" style="flex:1;">20% Off</button>
            </div>
            <div class="form-group mb-2">
              <label class="form-label">Discount Type</label>
              <select class="form-select" id="disc-modal-type">
                <option value="none">None (0%)</option>
                <option value="percentage" ${this.discount.type === 'percentage' ? 'selected' : ''}>Percentage (%)</option>
                <option value="amount" ${this.discount.type === 'amount' ? 'selected' : ''}>Fixed Amount (৳)</option>
              </select>
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Discount Value</label>
              <input type="number" min="0" step="0.5" class="form-input" id="disc-modal-val" value="${this.discount.value || 0}">
            </div>
          </div>
          <div class="modal-footer" style="padding:12px 24px;">
            <button class="btn btn-secondary" id="btn-cancel-disc">Cancel</button>
            <button class="btn btn-primary" id="btn-save-disc" style="background:#10B981; border-color:#10B981;">Apply Discount</button>
          </div>
        </div>
      `;

      H.showModal(modalHtml);

      document.querySelectorAll('.btn-quick-disc').forEach(btn => {
        btn.onclick = () => {
          document.getElementById('disc-modal-type').value = 'percentage';
          document.getElementById('disc-modal-val').value = btn.dataset.pct;
        };
      });

      document.getElementById('btn-close-disc').onclick = () => H.hideModal();
      document.getElementById('btn-cancel-disc').onclick = () => H.hideModal();
      document.getElementById('btn-save-disc').onclick = () => {
        const type = document.getElementById('disc-modal-type').value;
        const val = parseFloat(document.getElementById('disc-modal-val').value) || 0;
        this.discount.type = type;
        this.discount.value = val;
        this.updateSummary();
        H.showToast('Discount applied', 'success');
        H.hideModal();
      };
    },

    // ── Helper to resolve icon for payment method ──
    getPaymentMethodIcon(name) {
      const n = String(name || '').toLowerCase().trim();
      if (n.includes('cash')) return '💵';
      if (n.includes('card') || n.includes('visa') || n.includes('master') || n.includes('debit') || n.includes('credit')) return '💳';
      if (n.includes('bkash')) return '📱';
      if (n.includes('nagad')) return '📱';
      if (n.includes('rocket')) return '🚀';
      if (n.includes('bank')) return '🏦';
      return '💸';
    },

    // ── Process Transaction Modal & Order Submission ──
    async showTransactionModal() {
      if (this.cart.length === 0) return;
      const H = POS.Helpers;
      const S = POS.Store;

      // Calculate final totals
      let subtotal = 0;
      this.cart.forEach(i => subtotal += i.total);
      const discountAmount = this.discount.amount || 0;
      const discountedSub = Math.max(0, subtotal - discountAmount);
      const taxAmount = discountedSub * (this.taxPercent / 100);
      const grandTotal = discountedSub + taxAmount;

      // Load active payment methods from settings
      await H.loadPaymentMethods();
      let activeMethods = (H.paymentMethodsList || []).filter(m => m.status === 'active');
      if (activeMethods.length === 0) {
        const fallbackNames = (H.paymentMethods && H.paymentMethods.length > 0) 
          ? H.paymentMethods 
          : ['Cash', 'Card', 'bKash', 'Nagad', 'Rocket'];
        activeMethods = fallbackNames.map(name => ({
          name,
          icon: this.getPaymentMethodIcon(name),
          color: H.getPaymentMethodColor(name)
        }));
      }

      let selectedMethod = activeMethods[0].name;

      const modalHtml = `
        <div class="modal" id="modal-process-transaction" style="max-width:540px;">
          <div class="modal-header" style="background:#FAF8F5; border-bottom:1px solid #E8E2D8;">
            <div>
              <h3 style="font-size:18px; font-weight:800; color:#1C1714;">💳 Process Payment</h3>
              <p style="font-size:12px; color:#64748B; margin:0;">${this.orderType === 'Dine In' ? this.selectedTable : 'Take Away'} • ${this.customerInfo.name || 'Walk-in Guest'}</p>
            </div>
            <button class="modal-close" id="btn-close-tx">&times;</button>
          </div>
          <div class="modal-body" style="padding:20px 24px;">
            <!-- Amount To Pay Banner -->
            <div style="background:#F0FDF4; border:1.5px solid #BBF7D0; border-radius:14px; padding:16px; text-align:center; margin-bottom:16px;">
              <div style="font-size:12px; font-weight:700; color:#166534; text-transform:uppercase; letter-spacing:0.5px;">Amount To Pay</div>
              <div style="font-size:32px; font-weight:900; color:#059669;">৳${grandTotal.toFixed(2)}</div>
            </div>

            <!-- Dynamic Payment Methods from Settings -->
            <div class="form-group mb-3">
              <label class="form-label" style="font-weight:700;">Select Payment Method</label>
              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(105px, 1fr)); gap:8px;" id="pm-buttons-wrap">
                ${activeMethods.map((m, idx) => `
                  <button class="btn btn-secondary btn-pay-method ${idx === 0 ? 'active' : ''}" 
                          data-method="${H.escapeHtml(m.name)}" 
                          style="font-weight:700; padding:10px 8px; border-radius:10px; display:flex; flex-direction:column; align-items:center; gap:6px; font-size:12px; transition:all 0.15s; ${idx === 0 ? 'background:#F0FDF4; border-color:#10B981; color:#059669; box-shadow:0 2px 6px rgba(16,185,129,0.2);' : ''}">
                    <div style="width:36px; height:36px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                      ${H.getPaymentMethodIcon(m, 34)}
                    </div>
                    <span style="font-weight:800; font-size:12px; line-height:1.2; text-align:center;">${H.escapeHtml(m.name)}</span>
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Cash Tender Section -->
            <div id="cash-tender-wrap">
              <label class="form-label" style="font-weight:700;">Cash Tendered (৳)</label>
              <input type="number" step="0.5" min="0" class="form-input mb-2" id="tx-tendered" value="${grandTotal.toFixed(2)}" style="font-size:18px; font-weight:800; height:44px; text-align:center;">
              
              <div style="display:flex; gap:6px; margin-bottom:14px;">
                <button class="btn btn-secondary btn-xs btn-quick-tender" data-val="${grandTotal.toFixed(2)}" style="flex:1; font-weight:700;">Exact</button>
                <button class="btn btn-secondary btn-xs btn-quick-tender" data-val="100" style="flex:1;">৳100</button>
                <button class="btn btn-secondary btn-xs btn-quick-tender" data-val="500" style="flex:1;">৳500</button>
                <button class="btn btn-secondary btn-xs btn-quick-tender" data-val="1000" style="flex:1;">৳1000</button>
                <button class="btn btn-secondary btn-xs btn-quick-tender" data-val="2000" style="flex:1;">৳2000</button>
              </div>

              <!-- Change calculation -->
              <div style="display:flex; justify-content:space-between; align-items:center; background:#FAF8F5; padding:10px 14px; border-radius:10px; border:1px solid #E8E2D8; margin-bottom:10px;">
                <span style="font-weight:700; font-size:13px; color:#475569;">Change to Return:</span>
                <span id="tx-change-amount" style="font-size:18px; font-weight:900; color:#0F172A;">৳0.00</span>
              </div>
            </div>

            <!-- Print Receipt Checkbox -->
            <div style="display:flex; align-items:center; gap:8px; margin-top:10px;">
              <input type="checkbox" id="tx-print-receipt" checked style="width:16px; height:16px; accent-color:#10B981;">
              <label for="tx-print-receipt" style="font-size:13px; font-weight:600; color:#475569; cursor:pointer;">
                Print Customer Receipt & Kitchen Ticket (KOT)
              </label>
            </div>
          </div>
          <div class="modal-footer" style="padding:14px 24px; background:#FAF8F5; border-top:1px solid #E8E2D8;">
            <button class="btn btn-secondary" id="btn-cancel-tx" style="height:44px;">Cancel</button>
            <button class="btn btn-primary" id="btn-confirm-transaction" style="height:44px; flex:1; background:#10B981; border-color:#10B981; font-size:15px; font-weight:800; box-shadow:0 4px 12px rgba(16,185,129,0.35);">
              ✓ Complete Transaction (৳${grandTotal.toFixed(2)})
            </button>
          </div>
        </div>
      `;

      H.showModal(modalHtml);

      const tenderInput = document.getElementById('tx-tendered');
      const changeEl = document.getElementById('tx-change-amount');
      const cashWrap = document.getElementById('cash-tender-wrap');

      const updateChange = () => {
        const tendered = parseFloat(tenderInput.value) || 0;
        const change = Math.max(0, tendered - grandTotal);
        if (changeEl) changeEl.textContent = `৳${change.toFixed(2)}`;
      };

      if (tenderInput) tenderInput.addEventListener('input', updateChange);

      document.querySelectorAll('.btn-pay-method').forEach(btn => {
        btn.onclick = () => {
          document.querySelectorAll('.btn-pay-method').forEach(b => {
            b.classList.remove('active');
            b.style.background = '';
            b.style.borderColor = '';
            b.style.color = '';
          });
          btn.classList.add('active');
          btn.style.background = '#F0FDF4';
          btn.style.borderColor = '#10B981';
          btn.style.color = '#059669';
          selectedMethod = btn.dataset.method;

          const isCash = selectedMethod.toLowerCase() === 'cash';
          if (cashWrap) {
            cashWrap.style.display = isCash ? 'block' : 'none';
          }
          if (!isCash && tenderInput) {
            tenderInput.value = grandTotal.toFixed(2);
            updateChange();
          }
        };
      });

      document.querySelectorAll('.btn-quick-tender').forEach(btn => {
        btn.onclick = () => {
          if (tenderInput) {
            tenderInput.value = parseFloat(btn.dataset.val).toFixed(2);
            updateChange();
          }
        };
      });

      document.getElementById('btn-close-tx').onclick = () => H.hideModal();
      document.getElementById('btn-cancel-tx').onclick = () => H.hideModal();

      document.getElementById('btn-confirm-transaction').onclick = async () => {
        const confirmBtn = document.getElementById('btn-confirm-transaction');
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Processing Transaction...';

        const tendered = (selectedMethod.toLowerCase() === 'cash' && tenderInput)
          ? (parseFloat(tenderInput.value) || grandTotal)
          : grandTotal;
        const paidAmount = selectedMethod.toLowerCase() === 'cash' ? Math.min(grandTotal, tendered) : grandTotal;
        const dueAmount = Math.max(0, grandTotal - paidAmount);

        // Fetch Next Invoice ID
        const invoiceId = await S.getNextId('INV-');
        const orderId = 'ord_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);

        const orderRecord = {
          id: orderId,
          invoiceId: invoiceId,
          customerId: null,
          customerName: this.customerInfo.name || 'Walk-in Guest',
          customerPhone: this.customerInfo.phone || '',
          orderType: this.orderType,
          tableName: this.selectedTable,
          date: H.getBangladeshDateTimeString ? H.getBangladeshDateTimeString(new Date()) : new Date().toISOString(),
          subtotal: subtotal,
          discountType: this.discount.type,
          discountValue: this.discount.value,
          discountAmount: discountAmount,
          taxPercent: this.taxPercent,
          taxAmount: taxAmount,
          grandTotal: grandTotal,
          paidAmount: paidAmount,
          dueAmount: dueAmount,
          returnedAmount: 0,
          status: 'completed'
        };

        const orderItems = this.cart.map(item => ({
          id: 'oi_' + Math.random().toString(36).substr(2, 9),
          orderId: orderId,
          productId: item.productId,
          productName: item.productName,
          variationName: '',
          qty: item.qty,
          unitPrice: item.price,
          total: item.total,
          costPrice: 0 // No cost price
        }));

        const payments = [{
          id: 'pay_' + Math.random().toString(36).substr(2, 9),
          method: selectedMethod,
          amount: paidAmount
        }];

        const shouldPrint = document.getElementById('tx-print-receipt').checked;

        const result = await S.placeOrder(orderRecord, orderItems, payments);

        if (result && result.success) {
          orderRecord.tokenNo = (result && result.tokenNo) ? result.tokenNo : 1;
          H.showToast(`Order #${invoiceId} processed! Token #${orderRecord.tokenNo}`, 'success');
          H.hideModal();

          // Update live header token counter for next customer
          const nextTokEl = document.getElementById('clapos-next-token');
          if (nextTokEl) nextTokEl.textContent = String(orderRecord.tokenNo + 1).padStart(2, '0');

          if (shouldPrint) {
            this.printCustomerReceipt(orderRecord, orderItems, payments, grandTotal, tendered);
          }

          // Show success post-order modal with quick reprint buttons
          this.showOrderSuccessModal(orderRecord, orderItems, payments, grandTotal, tendered);

          // Reset order
          this.cart = [];
          this.renderCart();
          this.renderProductCards();
        } else {
          confirmBtn.disabled = false;
          confirmBtn.textContent = 'Retry Transaction';
          H.showToast((result && result.error) || 'Failed to place order', 'error');
        }
      };
    },

    // ── Success Modal with Token & Quick Print Actions ──
    showOrderSuccessModal(order, items, payments, total, tendered) {
      const H = POS.Helpers;
      const modalHtml = `
        <div class="modal" id="modal-order-success" style="max-width:440px; text-align:center;">
          <div class="modal-body" style="padding:28px 24px;">
            <div style="font-size:46px; margin-bottom:8px;">✅</div>
            <h3 style="font-weight:900; font-size:22px; color:#1E293B; margin-bottom:4px;">Order Placed Successfully!</h3>
            <p style="color:#64748B; font-size:13px; margin-bottom:16px;">Invoice: <strong>${order.invoiceId}</strong></p>
            
            <div style="background:#F8FAFC; border:2px dashed #059669; border-radius:14px; padding:16px; margin-bottom:20px;">
              <div style="font-size:12px; font-weight:800; color:#065F46; text-transform:uppercase; letter-spacing:1px;">Today's Kitchen Token</div>
              <div style="font-size:44px; font-weight:900; color:#059669; line-height:1.1; margin:6px 0;">TOKEN #${String(order.tokenNo || 1).padStart(2, '0')}</div>
              <div style="font-size:13px; font-weight:700; color:#047857;">${order.orderType.toUpperCase()} • ${order.tableName}</div>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:10px;">
              <button class="btn btn-primary" id="btn-print-receipt-modal" style="height:44px; font-weight:800; background:#10B981; border-color:#10B981; font-size:14px;">
                🧾 Print Customer Receipt
              </button>
              <button class="btn btn-secondary" id="btn-print-kot-modal" style="height:42px; font-weight:700; font-size:13.5px;">
                🍳 Print Kitchen Ticket (KOT)
              </button>
              <button class="btn btn-secondary" id="btn-next-order-modal" style="height:40px; font-weight:700; color:#475569;">
                + Next Order
              </button>
            </div>
          </div>
        </div>
      `;

      H.showModal(modalHtml);

      const btnRcpt = document.getElementById('btn-print-receipt-modal');
      const btnKot = document.getElementById('btn-print-kot-modal');
      const btnNext = document.getElementById('btn-next-order-modal');

      if (btnRcpt) btnRcpt.onclick = () => this.printCustomerReceipt(order, items, payments, total, tendered);
      if (btnKot) btnKot.onclick = () => this.printKitchenToken(order, items);
      if (btnNext) btnNext.onclick = () => H.hideModal();
    },

    // ── Separate Kitchen Order Ticket (KOT) — Minimal Thermal Design ──
    printKitchenToken(order, items) {
      const H = POS.Helpers;
      const printWindow = window.open('', '_blank', 'width=380,height=600');
      if (!printWindow) return;

      const dateStr = order.date ? new Date(order.date).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }) : new Date().toLocaleString();

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>KOT - Token #${order.tokenNo || 1}</title>
          <style>
            body { font-family: monospace, sans-serif; font-size: 13px; margin: 0; padding: 12px; color: #000; line-height: 1.35; background: #fff; }
            .text-center { text-align: center; }
            .divider { border-top: 1.5px dashed #000; margin: 8px 0; }
            .bold { font-weight: 900; }
            .token-box {
              font-size: 28px;
              font-weight: 900;
              text-align: center;
              border: 2px dashed #000;
              background: transparent;
              color: #000;
              padding: 6px 0;
              margin: 8px 0;
              letter-spacing: 2px;
            }
            .table-box {
              font-size: 14px;
              font-weight: 800;
              text-align: center;
              border: 1.5px dashed #000;
              background: transparent;
              color: #000;
              padding: 4px;
              margin: 6px 0;
              letter-spacing: 1px;
            }
            .item-row {
              display: flex;
              justify-content: space-between;
              padding: 6px 0;
              border-bottom: 1px dashed #000;
              font-size: 14px;
              font-weight: 800;
            }
            .item-qty {
              font-size: 16px;
              width: 50px;
            }
          </style>
        </head>
        <body>
          <div class="text-center bold" style="font-size: 15px; letter-spacing: 1px;">*** KITCHEN ORDER TICKET (KOT) ***</div>
          <div class="text-center" style="font-size: 12px;">ZenPos Kitchen</div>
          <div class="divider"></div>
          
          <div class="token-box">TOKEN #${String(order.tokenNo || 1).padStart(2, '0')}</div>
          <div class="table-box">${order.orderType.toUpperCase()} — ${order.tableName}</div>
          
          <div style="margin-top: 6px; font-size: 12px;">
            <div>Time: ${dateStr}</div>
            <div>Invoice Ref: ${order.invoiceId}</div>
            <div>Server / Guest: ${H.escapeHtml(order.customerName || 'Walk-in')}</div>
          </div>
          <div class="divider"></div>
          
          <div style="font-weight: 900; margin-bottom: 6px; font-size: 13px;">ORDER ITEMS:</div>
          <div>
            ${items.map(i => `
              <div class="item-row">
                <span class="item-qty">[ ${i.qty} ]</span>
                <span style="flex:1;">${H.escapeHtml(i.productName)}</span>
              </div>
            `).join('')}
          </div>
          
          <div class="divider"></div>
          <div class="text-center bold" style="margin-top: 8px; font-size: 11px;">
            *** PREPARE FRESH & SERVE HOT ***
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    },

    // ── Customer Invoice Receipt — Minimal Thermal Design ──
    async printCustomerReceipt(order, items, payments, total, tendered) {
      const H = POS.Helpers;
      const S = POS.Store;
      const settings = (await S.getSettings()) || {};

      const printWindow = window.open('', '_blank', 'width=380,height=600');
      if (!printWindow) return;

      const change = Math.max(0, (tendered || total) - total);
      const dateStr = order.date ? new Date(order.date).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }) : new Date().toLocaleString();
      const showStoreName = settings.invoice_show_store_name !== '0';
      const storeName = showStoreName ? (settings.store_name || 'ZenPos Restaurant') : '';
      const storeAddress = settings.store_address || '';
      const storePhone = settings.store_phone || '';
      const storeLogo = settings.invoice_logo || '';
      const receiptWidth = settings.receipt_width || '80';

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt - ${order.invoiceId}</title>
          <style>
            body { font-family: monospace, sans-serif; font-size: 12px; margin: 0 auto; padding: 10px; color: #000; max-width: ${receiptWidth}mm; background: #fff; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .divider { border-top: 1px dashed #000; margin: 7px 0; }
            .table { width: 100%; border-collapse: collapse; margin: 6px 0; }
            .table td { padding: 3px 0; font-size: 11.5px; }
            .bold { font-weight: bold; }
            .receipt-header { margin-bottom: 6px; }
            .title { font-size: 16px; font-weight: 800; }
            .token-banner {
              font-size: 18px;
              font-weight: 900;
              text-align: center;
              padding: 5px;
              border: 1.5px dashed #000;
              background: transparent;
              color: #000;
              margin: 7px 0;
              letter-spacing: 1px;
            }
            .table-tag {
              display: inline-block;
              border: 1px dashed #000;
              background: transparent;
              color: #000;
              font-weight: 800;
              padding: 2px 8px;
              border-radius: 3px;
              font-size: 11px;
              margin: 3px 0;
            }
          </style>
        </head>
        <body>
          <div class="receipt-header text-center">
            ${storeLogo ? `<img src="${storeLogo}" style="max-width:60px; max-height:60px; object-fit:contain; margin-bottom:4px; display:block; margin-left:auto; margin-right:auto;">` : ''}
            ${storeName ? `<div class="title">${H.escapeHtml(storeName)}</div>` : ''}
            ${storeAddress ? `<div>${H.escapeHtml(storeAddress)}</div>` : ''}
            ${storePhone ? `<div>Tel: ${H.escapeHtml(storePhone)}</div>` : ''}
            ${settings.store_website ? `<div>${H.escapeHtml(settings.store_website)}</div>` : ''}
            <div class="token-banner">TOKEN #${String(order.tokenNo || 1).padStart(2, '0')}</div>
            <div><span class="table-tag">${order.orderType.toUpperCase()} • ${order.tableName}</span></div>
            <div class="divider"></div>
            <div style="font-size: 11px; text-align: left;">
              <div><strong>Invoice:</strong> ${order.invoiceId}</div>
              <div><strong>Date:</strong> ${dateStr}</div>
              <div><strong>Guest:</strong> ${H.escapeHtml(order.customerName || 'Walk-in')}</div>
            </div>
          </div>
          <div class="divider"></div>
          <table class="table">
            <thead>
              <tr class="bold" style="border-bottom: 1px dashed #000;">
                <td style="padding-bottom: 4px;">Item</td>
                <td class="text-center" style="padding-bottom: 4px;">Qty</td>
                <td class="text-right" style="padding-bottom: 4px;">Price</td>
              </tr>
            </thead>
            <tbody>
              ${items.map(i => `
                <tr style="border-bottom: 1px dotted #ccc;">
                  <td style="padding: 3px 0;">${H.escapeHtml(i.productName)}</td>
                  <td class="text-center" style="padding: 3px 0;">${i.qty}</td>
                  <td class="text-right" style="padding: 3px 0;">৳${i.total.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="divider"></div>
          <table class="table">
            <tr>
              <td>Subtotal:</td>
              <td class="text-right">৳${order.subtotal.toFixed(2)}</td>
            </tr>
            ${order.discountAmount > 0 ? `
              <tr>
                <td>Discount:</td>
                <td class="text-right">-৳${order.discountAmount.toFixed(2)}</td>
              </tr>
            ` : ''}
            ${order.taxAmount > 0 ? `
              <tr>
                <td>Vat / Tax (${order.taxPercent || 5}%):</td>
                <td class="text-right">৳${order.taxAmount.toFixed(2)}</td>
              </tr>
            ` : ''}
            <tr class="bold" style="font-size:13.5px; border-top: 1px dashed #000;">
              <td style="padding-top: 4px;">TOTAL:</td>
              <td class="text-right" style="padding-top: 4px;">৳${total.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Paid (${payments && payments[0] ? payments[0].method : 'Cash'}):</td>
              <td class="text-right">৳${order.paidAmount.toFixed(2)}</td>
            </tr>
            ${change > 0 ? `
              <tr>
                <td>Change Return:</td>
                <td class="text-right">৳${change.toFixed(2)}</td>
              </tr>
            ` : ''}
          </table>
          <div class="divider"></div>
          <div class="text-center" style="margin-top:8px;">
            ${settings.invoice_note ? `<div style="font-style:italic; margin-bottom:4px;">${H.escapeHtml(settings.invoice_note)}</div>` : '<div>Thank you for dining with us!</div>'}
            <div>Please visit again soon.</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    },

    // ── Combined Customer Receipt & Kitchen Token (Continuous Thermal Roll / Single Print) ──
    printCombinedReceiptAndKOT(order, items, payments, total, tendered) {
      const H = POS.Helpers;
      const printWindow = window.open('', '_blank', 'width=380,height=750');
      if (!printWindow) return;

      const change = Math.max(0, (tendered || total) - total);
      const dateStr = order.date ? new Date(order.date).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }) : new Date().toLocaleString();

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>ZenPos - #${order.invoiceId} (Token #${order.tokenNo || 1})</title>
          <style>
            body { font-family: monospace, sans-serif; font-size: 12px; margin: 0; padding: 12px; color: #000; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .table { width: 100%; border-collapse: collapse; margin: 6px 0; }
            .table td { padding: 3px 0; font-size: 11.5px; }
            .bold { font-weight: bold; }
            .title { font-size: 16px; font-weight: 800; }
            .token-banner {
              font-size: 24px;
              font-weight: 900;
              text-align: center;
              padding: 6px;
              border: 2px dashed #000;
              margin: 8px 0;
              letter-spacing: 1px;
            }
            .tear-off {
              border-top: 2px dashed #000;
              border-bottom: 2px dashed #000;
              padding: 8px 0;
              margin: 20px 0;
              text-align: center;
              font-size: 11px;
              font-weight: bold;
              letter-spacing: 1px;
            }
            .kot-box {
              padding-top: 10px;
            }
            .item-row {
              display: flex;
              justify-content: space-between;
              padding: 5px 0;
              border-bottom: 1px dotted #666;
              font-size: 14px;
              font-weight: 800;
            }
          </style>
        </head>
        <body>
          <!-- SECTION 1: CUSTOMER RECEIPT -->
          <div class="text-center">
            <div class="title">ZenPos Gourmet Bistro</div>
            <div>14 Gourmet Avenue, Food District</div>
            <div>Tel: +880 1712-345678</div>
            <div class="token-banner">TOKEN #${String(order.tokenNo || 1).padStart(2, '0')}</div>
            <div class="divider"></div>
            <div><strong>${order.orderType.toUpperCase()}</strong> • <strong>${order.tableName}</strong></div>
            <div>Invoice: ${order.invoiceId}</div>
            <div>Date: ${dateStr}</div>
            <div>Guest: ${H.escapeHtml(order.customerName)}</div>
          </div>
          <div class="divider"></div>
          <table class="table">
            <thead>
              <tr class="bold">
                <td>Item</td>
                <td class="text-center">Qty</td>
                <td class="text-right">Price</td>
              </tr>
            </thead>
            <tbody>
              ${items.map(i => `
                <tr>
                  <td>${H.escapeHtml(i.productName)}</td>
                  <td class="text-center">${i.qty}</td>
                  <td class="text-right">৳${i.total.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="divider"></div>
          <table class="table">
            <tr>
              <td>Subtotal:</td>
              <td class="text-right">৳${order.subtotal.toFixed(2)}</td>
            </tr>
            ${order.discountAmount > 0 ? `
              <tr>
                <td>Discount:</td>
                <td class="text-right">-৳${order.discountAmount.toFixed(2)}</td>
              </tr>
            ` : ''}
            <tr>
              <td>Vat / Tax (5%):</td>
              <td class="text-right">৳${order.taxAmount.toFixed(2)}</td>
            </tr>
            <tr class="bold" style="font-size:14px;">
              <td>TOTAL:</td>
              <td class="text-right">৳${total.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Paid (${payments && payments[0] ? payments[0].method : 'Cash'}):</td>
              <td class="text-right">৳${order.paidAmount.toFixed(2)}</td>
            </tr>
            ${change > 0 ? `
              <tr>
                <td>Change Return:</td>
                <td class="text-right">৳${change.toFixed(2)}</td>
              </tr>
            ` : ''}
          </table>
          <div class="divider"></div>
          <div class="text-center" style="margin-top:8px;">
            <div>Thank you for dining with us!</div>
          </div>

          <!-- SECTION 2: KITCHEN TOKEN (KOT) WITH TEAR-OFF LINE -->
          <div class="tear-off">
            ✂ - - - - - - - TEAR OFF FOR KITCHEN (KOT) - - - - - - - ✂
          </div>

          <div class="kot-box">
            <div class="text-center bold" style="font-size: 15px;">*** KITCHEN ORDER TICKET (KOT) ***</div>
            <div class="text-center" style="font-size: 12px;">ZenPos Kitchen</div>
            <div class="token-banner" style="font-size: 26px; border: 2px dashed #000; background: transparent; color: #000;">
              TOKEN #${String(order.tokenNo || 1).padStart(2, '0')}
            </div>
            <div class="text-center bold" style="border: 1.5px dashed #000; background: transparent; color: #000; padding: 4px; font-size: 14px; margin: 4px 0;">
              ${order.orderType.toUpperCase()} — ${order.tableName}
            </div>
            <div style="font-size:11.5px; margin-top:6px;">
              <div>Time: ${dateStr}</div>
              <div>Invoice Ref: ${order.invoiceId}</div>
            </div>
            <div class="divider"></div>
            <div class="bold" style="font-size:13px; margin-bottom:4px;">KITCHEN ITEMS:</div>
            <div>
              ${items.map(i => `
                <div class="item-row">
                  <span style="font-size:16px; width:45px;">[ ${i.qty} ]</span>
                  <span style="flex:1;">${H.escapeHtml(i.productName)}</span>
                </div>
              `).join('')}
            </div>
            <div class="divider"></div>
            <div class="text-center bold" style="margin-top:8px; font-size:11px;">
              *** SEND TO KITCHEN CHEF ***
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  window.POS = window.POS || {};
  window.POS.NewOrder = NewOrder;
})();
