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
    customerInfo: { id: null, name: '', phone: '', points: 0, customDiscount: 0 },
    discount: { type: 'none', value: 0, amount: 0, code: '' },
    taxPercent: 0,
    rewardPointsSettings: { enabled: false, spendUnit: 100, earnUnit: 1, pointValue: 1.00 },
    useRewardPoints: false,
    rewardPointsUsed: 0,
    rewardPointsDiscount: 0,
    savedBills: [],
    cachedTables: null,
    _gridDelegated: false,

    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

      // Automatically collapse sidebar on opening New Order to maximize POS workspace
      if (window.POS && window.POS.App && typeof window.POS.App.collapseSidebar === 'function') {
        window.POS.App.collapseSidebar();
      } else {
        const sidebar = document.getElementById('sidebar');
        const wrapper = document.getElementById('main-wrapper');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar) {
          if (window.innerWidth <= 1024) {
            sidebar.classList.remove('mobile-open');
            if (overlay) overlay.classList.remove('active');
          } else {
            sidebar.classList.add('collapsed');
            if (wrapper) wrapper.classList.add('expanded');
          }
        }
      }

      // Reset state for new order
      this.cart = [];
      this.selectedCategory = 'all';
      this.searchQuery = '';
      this.orderType = 'Dine In';
      this.selectedTable = 'Table 01';
      this.customerInfo = { id: null, name: '', phone: '', points: 0, customDiscount: 0 };
      this.discount = { type: 'none', value: 0, amount: 0, code: '' };
      this.taxPercent = 5.0;
      this.useRewardPoints = false;
      this.rewardPointsUsed = 0;
      this.rewardPointsDiscount = 0;
      this._gridDelegated = false;

      // Preload payment methods
      await H.loadPaymentMethods();

      // Load configured tax and reward points settings from database
      try {
        const settings = await S.getSettings();
        if (settings) {
          const isTaxEnabled = settings.order_tax_status !== 'disabled';
          if (isTaxEnabled && settings.order_tax_percent !== undefined) {
            this.taxPercent = parseFloat(settings.order_tax_percent);
            if (isNaN(this.taxPercent)) this.taxPercent = 5.0;
          } else if (!isTaxEnabled) {
            this.taxPercent = 0;
          } else {
            this.taxPercent = 5.0;
          }

          this.rewardPointsSettings = {
            enabled: settings.reward_points_enabled === '1',
            spendUnit: parseFloat(settings.reward_points_spend_unit) || 100,
            earnUnit: parseFloat(settings.reward_points_earn_unit) || 1,
            pointValue: parseFloat(settings.reward_point_value) || 1.00
          };
        }
      } catch (e) {
        console.warn('Could not load settings:', e);
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
                <div class="clapos-summary-row" id="clapos-summary-tax-row" style="${this.taxPercent > 0 ? 'display:flex;' : 'display:none;'}">
                  <span id="clapos-summary-tax-label">Vat / Tax (${this.taxPercent}%)</span>
                  <span id="clapos-summary-tax" style="font-weight:700; color:#1E293B;">৳0.00</span>
                </div>
                <div class="clapos-summary-row" id="clapos-summary-rp-row" style="display:flex; justify-content:space-between; align-items:center; padding:4px 0;">
                  <div>
                    <div style="font-weight:600; font-size:12px; color:#475569; display:flex; align-items:center; gap:5px;">
                      <span>🎁 Reward Points</span>
                      <span id="clapos-rp-available-badge" style="font-size:10.5px; font-weight:700; color:#059669; background:#ecfdf5; padding:1px 6px; border-radius:10px; border:1px solid #a7f3d0;">0 pts</span>
                    </div>
                    <div id="clapos-rp-worth-desc" style="font-size:10px; color:#64748b; margin-top:1px;">Worth ৳0.00</div>
                  </div>
                  <button type="button" class="btn btn-xs" id="btn-toggle-use-points" style="font-weight:700; font-size:11px; padding:3px 10px; border-radius:6px; background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; cursor:pointer;" disabled>
                    Use Points
                  </button>
                </div>
                <div class="clapos-summary-row" id="clapos-summary-discount-row" style="display:none;">
                  <span>Voucher / Discount</span>
                  <span id="clapos-summary-discount" style="color:#EF4444; font-weight:700;">-৳0.00</span>
                </div>
                <div class="clapos-summary-row" id="clapos-summary-rp-discount-row" style="display:none; color:#059669;">
                  <span id="clapos-summary-rp-label" style="font-weight:600;">Reward Points Discount</span>
                  <span id="clapos-summary-rp-discount" style="font-weight:700; color:#059669;">-৳0.00</span>
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
        const [catRes, prodRes, tableRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/products'),
          fetch('/api/tables')
        ]);
        this.categories = catRes.ok ? await catRes.json() : [];
        this.products = prodRes.ok ? await prodRes.json() : [];
        if (tableRes && tableRes.ok) {
          const allTables = await tableRes.json();
          this.cachedTables = allTables.filter(t => t.status === 'active');
        }
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
          <div class="clapos-card ${qty > 0 ? 'in-cart selected' : ''}" data-id="${item.id}">
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
                <div class="clapos-qty-pill">
                  <button type="button" class="clapos-qty-btn btn-card-dec" data-id="${item.id}">-</button>
                  <span>${qty}</span>
                  <button type="button" class="clapos-qty-btn btn-card-inc" data-id="${item.id}">+</button>
                </div>
              ` : `
                <button type="button" class="clapos-card-add-btn btn-card-add" data-id="${item.id}" title="Add to Order">+</button>
              `}
            </div>
          </div>
        `;
      }).join('');

      // Bind event delegation on current grid container
      if (!grid.dataset.delegated) {
        grid.dataset.delegated = 'true';
        grid.addEventListener('click', (e) => {
          const incBtn = e.target.closest('.btn-card-inc');
          if (incBtn) {
            e.stopPropagation();
            this.updateCartQty(incBtn.dataset.id, 1);
            return;
          }
          const decBtn = e.target.closest('.btn-card-dec');
          if (decBtn) {
            e.stopPropagation();
            this.updateCartQty(decBtn.dataset.id, -1);
            return;
          }
          const addBtn = e.target.closest('.btn-card-add');
          if (addBtn) {
            e.stopPropagation();
            this.addToCart(addBtn.dataset.id);
            return;
          }
          if (e.target.closest('.clapos-qty-pill')) {
            // Clicked quantity counter text or pill background, do not add another
            return;
          }
          const card = e.target.closest('.clapos-card');
          if (card) {
            this.addToCart(card.dataset.id);
          }
        });
      }
    },

    updateSingleCard(productId) {
      const card = document.querySelector(`.clapos-card[data-id="${productId}"]`);
      if (!card) return;
      const inCartItem = this.cart.find(c => c.productId === productId);
      const qty = inCartItem ? inCartItem.qty : 0;
      const bottom = card.querySelector('.clapos-card-bottom');
      const item = this.products.find(p => p.id === productId);
      const price = parseFloat(item?.sellingPrice || 0);

      if (qty > 0) {
        card.classList.add('in-cart', 'selected');
        if (bottom) {
          bottom.innerHTML = `
            <span class="clapos-card-price">৳${price.toFixed(2)}</span>
            <div class="clapos-qty-pill">
              <button type="button" class="clapos-qty-btn btn-card-dec" data-id="${productId}">-</button>
              <span>${qty}</span>
              <button type="button" class="clapos-qty-btn btn-card-inc" data-id="${productId}">+</button>
            </div>
          `;
        }
      } else {
        card.classList.remove('in-cart', 'selected');
        if (bottom) {
          bottom.innerHTML = `
            <span class="clapos-card-price">৳${price.toFixed(2)}</span>
            <button type="button" class="clapos-card-add-btn btn-card-add" data-id="${productId}" title="Add to Order">+</button>
          `;
        }
      }
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
      this.updateSingleCard(productId);
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
      this.updateSingleCard(productId);
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
            const pid = btn.dataset.id;
            this.cart = this.cart.filter(c => c.productId !== pid);
            this.renderCart();
            this.updateSingleCard(pid);
          };
        });

        if (processBtn) processBtn.disabled = false;
      }

      this.updateSummary();
    },

    updateOrderSummary() {
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

      // Reward points calculation
      const availPoints = parseFloat(this.customerInfo && this.customerInfo.points) || 0;
      const pointVal = (this.rewardPointsSettings && this.rewardPointsSettings.pointValue) || 1.00;
      const rpEnabled = this.rewardPointsSettings && this.rewardPointsSettings.enabled;

      let pointsDiscount = 0;
      let pointsUsed = 0;

      if (rpEnabled && this.useRewardPoints && availPoints > 0) {
        const maxPossibleDiscount = availPoints * pointVal;
        pointsDiscount = Math.min(discountedSubtotal, maxPossibleDiscount);
        pointsUsed = pointVal > 0 ? Math.min(availPoints, pointsDiscount / pointVal) : 0;
        pointsUsed = Math.round(pointsUsed * 100) / 100;
      }

      this.rewardPointsUsed = pointsUsed;
      this.rewardPointsDiscount = pointsDiscount;

      // Tax calculation (calculated on net subtotal after discounts & points)
      const afterPointsSubtotal = Math.max(0, discountedSubtotal - pointsDiscount);
      const taxAmount = this.taxPercent > 0 ? (afterPointsSubtotal * (this.taxPercent / 100)) : 0;
      const grandTotal = afterPointsSubtotal + taxAmount;

      const subtotalEl = document.getElementById('clapos-summary-subtotal');
      const taxRowEl = document.getElementById('clapos-summary-tax-row');
      const taxLabelEl = document.getElementById('clapos-summary-tax-label');
      const taxEl = document.getElementById('clapos-summary-tax');
      const discountRow = document.getElementById('clapos-summary-discount-row');
      const discountEl = document.getElementById('clapos-summary-discount');
      const totalEl = document.getElementById('clapos-summary-total');

      const rpBadge = document.getElementById('clapos-rp-available-badge');
      const rpWorth = document.getElementById('clapos-rp-worth-desc');
      const btnUsePoints = document.getElementById('btn-toggle-use-points');
      const rpDiscountRow = document.getElementById('clapos-summary-rp-discount-row');
      const rpDiscountEl = document.getElementById('clapos-summary-rp-discount');
      const rpLabelEl = document.getElementById('clapos-summary-rp-label');

      if (subtotalEl) subtotalEl.textContent = `৳${subtotal.toFixed(2)}`;

      if (taxRowEl && taxEl && taxLabelEl) {
        if (this.taxPercent > 0) {
          taxRowEl.style.display = 'flex';
          taxLabelEl.textContent = `Vat / Tax (${this.taxPercent}%)`;
          taxEl.textContent = `৳${taxAmount.toFixed(2)}`;
        } else {
          taxRowEl.style.display = 'none';
        }
      }

      if (discountRow && discountEl) {
        if (discountAmount > 0) {
          discountRow.style.display = 'flex';
          discountEl.textContent = `-৳${discountAmount.toFixed(2)}`;
        } else {
          discountRow.style.display = 'none';
        }
      }

      // Update Reward Points summary UI
      if (btnUsePoints && rpBadge && rpWorth) {
        rpBadge.textContent = `${availPoints} pts`;
        const potentialWorth = availPoints * pointVal;
        rpWorth.textContent = `Worth ৳${potentialWorth.toFixed(2)}`;

        if (!rpEnabled || availPoints <= 0 || discountedSubtotal <= 0) {
          btnUsePoints.disabled = true;
          btnUsePoints.style.opacity = '0.5';
          btnUsePoints.style.background = '#f1f5f9';
          btnUsePoints.style.color = '#94a3b8';
          btnUsePoints.style.borderColor = '#e2e8f0';
          btnUsePoints.textContent = 'Use Points';
          if (availPoints <= 0) this.useRewardPoints = false;
        } else {
          btnUsePoints.disabled = false;
          btnUsePoints.style.opacity = '1';
          if (this.useRewardPoints) {
            btnUsePoints.style.background = '#ecfdf5';
            btnUsePoints.style.color = '#059669';
            btnUsePoints.style.borderColor = '#a7f3d0';
            btnUsePoints.textContent = '✓ Points Active';
          } else {
            btnUsePoints.style.background = '#eff6ff';
            btnUsePoints.style.color = '#2563eb';
            btnUsePoints.style.borderColor = '#bfdbfe';
            btnUsePoints.textContent = 'Use Points';
          }
        }
      }

      if (rpDiscountRow && rpDiscountEl) {
        if (this.useRewardPoints && pointsDiscount > 0) {
          rpDiscountRow.style.display = 'flex';
          rpDiscountEl.textContent = `-৳${pointsDiscount.toFixed(2)}`;
          if (rpLabelEl) rpLabelEl.textContent = `Points Redeemed (${pointsUsed} pts)`;
        } else {
          rpDiscountRow.style.display = 'none';
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

      // Reward Points Use / Remove toggle button
      const rpBtn = document.getElementById('btn-toggle-use-points');
      if (rpBtn) {
        rpBtn.onclick = () => {
          const availPoints = parseFloat(this.customerInfo && this.customerInfo.points) || 0;
          if (availPoints <= 0) {
            H.showToast('Selected customer has no reward points', 'warning');
            return;
          }
          this.useRewardPoints = !this.useRewardPoints;
          this.updateOrderSummary();
          if (this.useRewardPoints) {
            H.showToast(`Applied ${this.rewardPointsUsed} reward points (-৳${this.rewardPointsDiscount.toFixed(2)})!`, 'success');
          } else {
            H.showToast('Removed reward points from this order', 'info');
          }
        };
      }

      // Process Transaction checkout
      const processBtn = document.getElementById('btn-process-transaction');
      if (processBtn) processBtn.onclick = () => this.showTransactionModal();
    },

    // ── 1. Customer Modal (Auto-fill by Phone, Suggestions, Reward Points & Custom Discount) ──
    showCustomerModal() {
      const H = POS.Helpers;
      const modalHtml = `
        <div class="modal" id="modal-order-customer" style="max-width:460px;">
          <div class="modal-header">
            <h3>👤 Guest / Customer Details</h3>
            <button class="modal-close" id="btn-close-cust">&times;</button>
          </div>
          <div class="modal-body" style="padding:18px 24px;">
            <p style="font-size:12.5px; color:#64748B; margin-bottom:14px;">
              Enter customer phone to auto-find customer and apply personalized discount or loyalty points.
            </p>
            <div class="form-group mb-2" style="position:relative;">
              <label class="form-label" style="display:flex; justify-content:space-between; align-items:center;">
                <span>Phone Number</span>
                <span id="cust-modal-vip-badge" style="display:none; font-size:11px; font-weight:700; color:#10B981; background:#ecfdf5; padding:2px 8px; border-radius:12px; border:1px solid #a7f3d0;">VIP Customer</span>
              </label>
              <input type="text" class="form-input" id="cust-modal-phone" value="${H.escapeHtml(this.customerInfo.phone || '')}" placeholder="Type customer phone number..." autocomplete="off">
              <!-- Autocomplete suggestions dropdown -->
              <div id="cust-suggestions-box" style="display:none; position:absolute; top:100%; left:0; right:0; background:#fff; border:1px solid #e2e8f0; border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.12); z-index:1000; max-height:220px; overflow-y:auto; margin-top:4px;"></div>
            </div>
            <div class="form-group mb-2">
              <label class="form-label">Guest / Customer Name</label>
              <input type="text" class="form-input" id="cust-modal-name" value="${H.escapeHtml(this.customerInfo.name || '')}" placeholder="Customer name">
            </div>

            <!-- Reward Points Confirmation Notice in Customer Details Modal -->
            <div id="cust-rp-notice" style="display:none; padding:12px 14px; background:#F0FDF4; border:1.5px solid #86EFAC; border-radius:10px; margin-top:10px;">
              <div style="font-weight:800; font-size:13px; color:#166534; display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                <span style="font-size:16px;">🎁</span>
                <span>Customer Reward Points:</span>
              </div>
              <div style="display:flex; align-items:baseline; gap:8px; margin-bottom:10px;">
                <span id="cust-rp-notice-pts" style="font-size:18px; font-weight:900; color:#15803D;">0 pts</span>
                <span id="cust-rp-notice-worth" style="font-size:13px; font-weight:700; color:#166534;">Worth ৳0.00</span>
              </div>
              <div style="padding-top:8px; border-top:1px dashed #86EFAC; display:flex; align-items:center; gap:8px;">
                <input type="checkbox" id="chk-modal-use-points" style="width:18px; height:18px; accent-color:#10B981; cursor:pointer;">
                <label for="chk-modal-use-points" style="cursor:pointer; font-weight:700; color:#166534; font-size:13px; margin:0; user-select:none;">
                  Use available reward points for this order
                </label>
              </div>
            </div>

            <div id="cust-discount-notice" style="display:none; padding:10px 14px; background:#ecfdf5; border:1px solid #a7f3d0; border-radius:8px; font-size:12.5px; color:#065f46; margin-top:8px;">
              <div style="font-weight:700; display:flex; align-items:center; gap:6px;">
                <span>🎉</span>
                <span id="cust-discount-notice-title">Customer Personalized Discount</span>
              </div>
              <div id="cust-discount-notice-desc" style="font-size:11.5px; margin-top:2px; color:#047857;"></div>
            </div>
          </div>
          <div class="modal-footer" style="padding:12px 24px;">
            <button class="btn btn-secondary" id="btn-cancel-cust">Cancel</button>
            <button class="btn btn-primary" id="btn-save-cust" style="background:#10B981; border-color:#10B981;">Save Guest Details</button>
          </div>
        </div>
      `;

      H.showModal(modalHtml);

      const nameInput = document.getElementById('cust-modal-name');
      const phoneInput = document.getElementById('cust-modal-phone');
      const suggestionsBox = document.getElementById('cust-suggestions-box');
      const vipBadge = document.getElementById('cust-modal-vip-badge');
      const discountNotice = document.getElementById('cust-discount-notice');
      const discountNoticeDesc = document.getElementById('cust-discount-notice-desc');
      const rpNotice = document.getElementById('cust-rp-notice');
      const rpNoticePts = document.getElementById('cust-rp-notice-pts');
      const rpNoticeWorth = document.getElementById('cust-rp-notice-worth');
      const chkUsePoints = document.getElementById('chk-modal-use-points');

      let selectedCustomer = null;
      let isCustomerSelected = false;

      const applyCustomerDetails = (c) => {
        selectedCustomer = c;
        isCustomerSelected = true;
        if (c.name) nameInput.value = c.name;
        if (c.phone) phoneInput.value = c.phone;
        const custPts = parseFloat(c.points || c.rewardPoints) || 0;
        this.customerInfo = {
          id: c.id || null,
          name: c.name || '',
          phone: c.phone || '',
          points: custPts,
          customDiscount: parseFloat(c.customDiscount) || 0
        };

        if (vipBadge) {
          vipBadge.style.display = 'inline-block';
          vipBadge.textContent = c.label || 'Customer';
        }

        const pointVal = (this.rewardPointsSettings && this.rewardPointsSettings.pointValue) || 1.00;
        const rpEnabled = this.rewardPointsSettings && this.rewardPointsSettings.enabled;

        // Reward points notice in modal
        if (rpNotice && rpNoticePts && rpNoticeWorth && chkUsePoints) {
          if (rpEnabled && custPts > 0) {
            rpNotice.style.display = 'block';
            rpNoticePts.textContent = `${custPts} pts`;
            rpNoticeWorth.textContent = `Worth ৳${(custPts * pointVal).toFixed(2)}`;
            chkUsePoints.checked = this.useRewardPoints;
          } else {
            rpNotice.style.display = 'none';
            chkUsePoints.checked = false;
            this.useRewardPoints = false;
          }
        }

        const disc = parseFloat(c.customDiscount) || 0;
        if (disc > 0) {
          this.discount = {
            type: 'percentage',
            value: disc,
            amount: 0,
            code: `${c.name ? c.name + ' ' : ''}VIP (${disc}%)`
          };
          this.updateOrderSummary();
          if (discountNotice && discountNoticeDesc) {
            discountNotice.style.display = 'block';
            discountNoticeDesc.textContent = `${disc}% custom discount applied for ${c.name || 'this customer'}!`;
          }
          H.showToast(`Applied ${disc}% discount for ${c.name || 'Customer'}!`, 'success');
        } else {
          if (discountNotice) discountNotice.style.display = 'none';
        }

        this.updateOrderSummary();
        suggestionsBox.style.display = 'none';
        suggestionsBox.innerHTML = '';
      };

      // Check current customer if already set
      if (this.customerInfo && this.customerInfo.customDiscount > 0) {
        if (discountNotice && discountNoticeDesc) {
          discountNotice.style.display = 'block';
          discountNoticeDesc.textContent = `${this.customerInfo.customDiscount}% custom discount active on this order.`;
        }
      }

      if (this.customerInfo && (parseFloat(this.customerInfo.points) || 0) > 0) {
        const custPts = parseFloat(this.customerInfo.points) || 0;
        const pointVal = (this.rewardPointsSettings && this.rewardPointsSettings.pointValue) || 1.00;
        if (rpNotice && rpNoticePts && rpNoticeWorth && chkUsePoints) {
          rpNotice.style.display = 'block';
          rpNoticePts.textContent = `${custPts} pts`;
          rpNoticeWorth.textContent = `Worth ৳${(custPts * pointVal).toFixed(2)}`;
          chkUsePoints.checked = this.useRewardPoints;
        }
      }

      // Checkbox listener in modal
      if (chkUsePoints) {
        chkUsePoints.onchange = (e) => {
          this.useRewardPoints = e.target.checked;
        };
      }

      // Phone input listener: only trigger search & suggestions once a full number is typed
      const searchCustomers = H.debounce(async (val) => {
        const query = (val || '').trim();
        const cleanDigits = query.replace(/\D/g, '');

        // If a customer was already selected and the phone matches, do not show suggestions
        if (isCustomerSelected && selectedCustomer && (selectedCustomer.phone || '').trim() === query) {
          suggestionsBox.style.display = 'none';
          suggestionsBox.innerHTML = '';
          return;
        }

        // Only show suggestions after typing full phone number (at least 10 digits)
        if (cleanDigits.length < 10) {
          suggestionsBox.style.display = 'none';
          suggestionsBox.innerHTML = '';
          return;
        }

        try {
          const res = await fetch(`/api/customers?search=${encodeURIComponent(query)}&limit=10`);
          if (!res.ok) return;
          const list = await res.json();

          if (!list || list.length === 0 || (isCustomerSelected && selectedCustomer && list.some(c => c.id === selectedCustomer.id))) {
            suggestionsBox.style.display = 'none';
            suggestionsBox.innerHTML = '';
            return;
          }

          suggestionsBox.innerHTML = `
            <div style="padding:6px 12px; font-size:11px; font-weight:800; color:#64748B; background:#F8FAFC; border-bottom:1px solid #E2E8F0; text-transform:uppercase; letter-spacing:0.5px;">
              Saved Customer Found (Click to select):
            </div>
          ` + list.map(c => {
            const disc = parseFloat(c.customDiscount) || 0;
            const pts = parseFloat(c.points || c.rewardPoints) || 0;
            return `
              <div class="cust-suggest-item" data-cust-id="${c.id}" style="padding:10px 14px; cursor:pointer; border-bottom:1px solid #f1f5f9; display:flex; align-items:center; justify-content:space-between; transition:background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='#fff'">
                <div>
                  <div style="font-weight:700; font-size:13px; color:#1e293b;">${H.escapeHtml(c.name)}</div>
                  <div style="font-size:11.5px; color:#64748b;">📞 ${H.escapeHtml(c.phone || 'No phone recorded')}</div>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                  ${pts > 0 ? `<span style="font-size:10.5px; font-weight:800; background:#f0fdf4; color:#15803d; padding:2px 7px; border-radius:6px; border:1px solid #bbf7d0;">🎁 ${pts} pts</span>` : ''}
                  ${c.label ? `<span style="font-size:10px; font-weight:700; background:#f1f5f9; color:#475569; padding:2px 6px; border-radius:4px;">${H.escapeHtml(c.label)}</span>` : ''}
                  ${disc > 0 ? `<span style="font-size:10.5px; font-weight:800; background:#ecfdf5; color:#059669; padding:2px 8px; border-radius:6px; border:1px solid #a7f3d0;">${disc}% OFF</span>` : ''}
                </div>
              </div>
            `;
          }).join('');

          suggestionsBox.style.display = 'block';

          // Click handler for suggestion items
          suggestionsBox.querySelectorAll('.cust-suggest-item').forEach(item => {
            item.onmousedown = (e) => {
              e.preventDefault();
              e.stopPropagation();
              const custId = item.dataset.custId;
              const matched = list.find(c => String(c.id) === String(custId));
              if (matched) {
                applyCustomerDetails(matched);
              }
            };
          });
        } catch (err) {
          console.warn('Customer search error:', err);
        }
      }, 150);

      phoneInput.addEventListener('input', (e) => {
        if (selectedCustomer && (selectedCustomer.phone || '').trim() !== e.target.value.trim()) {
          isCustomerSelected = false;
        }
        searchCustomers(e.target.value);
      });

      // Hide suggestions on blur or clicking outside
      phoneInput.addEventListener('blur', () => {
        setTimeout(() => { suggestionsBox.style.display = 'none'; }, 200);
      });

      document.getElementById('btn-close-cust').onclick = () => H.hideModal();
      document.getElementById('btn-cancel-cust').onclick = () => H.hideModal();
      document.getElementById('btn-save-cust').onclick = async () => {
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        const cleanDigits = phone.replace(/\D/g, '');
        
        // If user didn't click dropdown but phone matches a known customer, apply details
        if (cleanDigits.length >= 7 && (!selectedCustomer || selectedCustomer.phone !== phone)) {
          try {
            const checkRes = await fetch(`/api/customers?search=${encodeURIComponent(phone)}&limit=5`);
            if (checkRes.ok) {
              const matches = await checkRes.json();
              const exact = matches.find(c => (c.phone || '').trim() === phone);
              if (exact) {
                applyCustomerDetails(exact);
              }
            }
          } catch (e) {}
        }

        const chkUsePointsModal = document.getElementById('chk-modal-use-points');
        if (chkUsePointsModal && chkUsePointsModal.offsetParent !== null) {
          this.useRewardPoints = chkUsePointsModal.checked;
        }

        this.customerInfo = {
          id: (selectedCustomer && selectedCustomer.id) || this.customerInfo.id || null,
          name: name,
          phone: phone,
          points: (selectedCustomer && (parseFloat(selectedCustomer.points || selectedCustomer.rewardPoints) || 0)) || this.customerInfo.points || 0,
          customDiscount: (selectedCustomer && selectedCustomer.customDiscount) || this.customerInfo.customDiscount || 0
        };

        const custPts = parseFloat(this.customerInfo.points) || 0;
        const rpEnabled = this.rewardPointsSettings && this.rewardPointsSettings.enabled;

        // ONLY save new customer to database if BOTH full phone (at least 7 digits) and real name are provided
        if (name && cleanDigits.length >= 7 && name.toLowerCase() !== 'guest') {
          try {
            const saveRes = await fetch('/api/customers/quick-save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name, phone })
            });
            if (saveRes.ok) {
              const resData = await saveRes.json();
              if (resData && resData.customer && resData.customer.id) {
                this.customerInfo.id = resData.customer.id;
              }
            }
          } catch (e) {
            console.warn('Customer quick-save error:', e);
          }
        }

        const label = name ? `Guest set to: ${name}` : (phone ? `Phone set: ${phone}` : 'Customer details saved');
        H.showToast(label, 'success');
        this.updateCustomerButton();
        this.updateOrderSummary();
        H.hideModal();
      };
    },

    updateCustomerButton() {
      const btn = document.getElementById('btn-order-customer');
      if (btn) {
        const span = btn.querySelector('span:last-child');
        if (span) {
          if (this.customerInfo && this.customerInfo.name) {
            const disc = parseFloat(this.customerInfo.customDiscount) || 0;
            const pts = parseFloat(this.customerInfo.points) || 0;
            const ptsText = pts > 0 ? ` (🎁${pts}pts)` : '';
            span.textContent = disc > 0 ? `${this.customerInfo.name} (${disc}%)${ptsText}` : `${this.customerInfo.name}${ptsText}`;
          } else {
            span.textContent = 'Customer';
          }
        }
      }
    },

    // ── 2. Tables Modal ──
    async showTablesModal() {
      const H = POS.Helpers;
      let tablesList = this.cachedTables || [];
      if (!tablesList || tablesList.length === 0) {
        try {
          const res = await fetch('/api/tables');
          if (res.ok) {
            const all = await res.json();
            tablesList = all.filter(t => t.status === 'active');
            this.cachedTables = tablesList;
          }
        } catch (e) {
          console.warn('Error fetching tables:', e);
        }
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

      // Reward points calculation
      const availPoints = parseFloat(this.customerInfo && this.customerInfo.points) || 0;
      const pointVal = (this.rewardPointsSettings && this.rewardPointsSettings.pointValue) || 1.00;
      const rpEnabled = this.rewardPointsSettings && this.rewardPointsSettings.enabled;

      let pointsDiscount = 0;
      let pointsUsed = 0;

      if (rpEnabled && this.useRewardPoints && availPoints > 0) {
        const maxPossibleDiscount = availPoints * pointVal;
        pointsDiscount = Math.min(discountedSub, maxPossibleDiscount);
        pointsUsed = pointVal > 0 ? Math.min(availPoints, pointsDiscount / pointVal) : 0;
        pointsUsed = Math.round(pointsUsed * 100) / 100;
      }

      this.rewardPointsUsed = pointsUsed;
      this.rewardPointsDiscount = pointsDiscount;

      const afterPointsSub = Math.max(0, discountedSub - pointsDiscount);
      const taxAmount = this.taxPercent > 0 ? (afterPointsSub * (this.taxPercent / 100)) : 0;
      const grandTotal = afterPointsSub + taxAmount;

      // Load active payment methods from settings if not cached
      let activeMethods = (H.paymentMethodsList || []).filter(m => m.status === 'active');
      if (activeMethods.length === 0) {
        await H.loadPaymentMethods();
        activeMethods = (H.paymentMethodsList || []).filter(m => m.status === 'active');
      }
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
              <p style="font-size:12px; color:#64748B; margin:0;">${this.orderType === 'Dine In' ? this.selectedTable : 'Take Away'}${this.customerInfo.name ? ' • ' + H.escapeHtml(this.customerInfo.name) : ''}</p>
            </div>
            <button class="modal-close" id="btn-close-tx">&times;</button>
          </div>
          <div class="modal-body" style="padding:20px 24px;">
            <!-- Amount To Pay Banner -->
            <div style="background:#F0FDF4; border:1.5px solid #BBF7D0; border-radius:14px; padding:16px; text-align:center; margin-bottom:16px;">
              <div style="font-size:12px; font-weight:700; color:#166534; text-transform:uppercase; letter-spacing:0.5px;">Amount To Pay</div>
              <div style="font-size:32px; font-weight:900; color:#059669;">৳${grandTotal.toFixed(2)}</div>
              <div style="display:flex; justify-content:center; gap:8px; flex-wrap:wrap; margin-top:5px;">
                ${taxAmount > 0 ? `<div style="font-size:11.5px; font-weight:700; color:#475569; background:#e2e8f0; display:inline-block; padding:2px 8px; border-radius:10px;">Includes ৳${taxAmount.toFixed(2)} Tax (${this.taxPercent}%)</div>` : ''}
                ${pointsDiscount > 0 ? `<div style="font-size:11.5px; font-weight:700; color:#059669; background:#dcfce7; display:inline-block; padding:2px 8px; border-radius:10px;">🎁 Points Discount: -৳${pointsDiscount.toFixed(2)} (${pointsUsed} pts)</div>` : ''}
              </div>
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
          customerId: (this.customerInfo && this.customerInfo.id) || null,
          customerName: this.customerInfo.name ? this.customerInfo.name.trim() : '',
          customerPhone: this.customerInfo.phone ? this.customerInfo.phone.trim() : '',
          orderType: this.orderType,
          tableName: this.selectedTable,
          date: H.getBangladeshDateTimeString ? H.getBangladeshDateTimeString(new Date()) : new Date().toISOString(),
          subtotal: subtotal,
          discountType: this.discount.type,
          discountValue: this.discount.value,
          discountAmount: discountAmount,
          taxPercent: this.taxPercent,
          taxAmount: taxAmount,
          rewardPointsUsed: pointsUsed,
          rewardPointsDiscount: pointsDiscount,
          rewardPointsEarned: 0,
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
          orderRecord.rewardPointsEarned = (result && result.rewardPointsEarned) || 0;
          orderRecord.rewardPointsUsed = (result && result.rewardPointsUsed !== undefined) ? result.rewardPointsUsed : pointsUsed;
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
          this.customerInfo = { id: null, name: '', phone: '', points: 0, customDiscount: 0 };
          this.discount = { type: 'none', value: 0, amount: 0, code: '' };
          this.useRewardPoints = false;
          this.rewardPointsUsed = 0;
          this.rewardPointsDiscount = 0;
          this.updateCustomerButton();
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
            
            <div style="background:#F8FAFC; border:2px dashed #059669; border-radius:14px; padding:16px; margin-bottom:16px;">
              <div style="font-size:12px; font-weight:800; color:#065F46; text-transform:uppercase; letter-spacing:1px;">Today's Kitchen Token</div>
              <div style="font-size:44px; font-weight:900; color:#059669; line-height:1.1; margin:6px 0;">TOKEN #${String(order.tokenNo || 1).padStart(2, '0')}</div>
              <div style="font-size:13px; font-weight:700; color:#047857;">${order.orderType.toUpperCase()} • ${order.tableName}</div>
            </div>

            ${(order.rewardPointsEarned > 0 || order.rewardPointsUsed > 0) ? `
              <div style="background:#ECFDF5; border:1px solid #A7F3D0; border-radius:10px; padding:8px 12px; margin-bottom:16px; font-size:12px; color:#065F46; font-weight:700;">
                ${order.rewardPointsUsed > 0 ? `<div>🎁 Redeemed ${order.rewardPointsUsed} pts (-৳${Number(order.rewardPointsDiscount).toFixed(2)})</div>` : ''}
                ${order.rewardPointsEarned > 0 ? `<div style="color:#059669; font-weight:800;">✨ Customer Earned +${order.rewardPointsEarned} Loyalty Points!</div>` : ''}
              </div>
            ` : ''}
            
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
            ${order.rewardPointsDiscount > 0 ? `
              <tr>
                <td>Reward Points (${order.rewardPointsUsed || 0} pts):</td>
                <td class="text-right">-৳${Number(order.rewardPointsDiscount).toFixed(2)}</td>
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
            ${order.rewardPointsEarned > 0 ? `
              <tr>
                <td>Points Earned:</td>
                <td class="text-right">+${order.rewardPointsEarned} pts</td>
              </tr>
            ` : ''}
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
            <div style="font-size:10px; color:#666; margin-top:6px;">Software by ZenPlusIT</div>
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
            ${order.rewardPointsDiscount > 0 ? `
              <tr>
                <td>Reward Points (${order.rewardPointsUsed || 0} pts):</td>
                <td class="text-right">-৳${Number(order.rewardPointsDiscount).toFixed(2)}</td>
              </tr>
            ` : ''}
            ${order.taxAmount > 0 ? `
              <tr>
                <td>Vat / Tax (${order.taxPercent || 5}%):</td>
                <td class="text-right">৳${order.taxAmount.toFixed(2)}</td>
              </tr>
            ` : ''}
            <tr class="bold" style="font-size:14px;">
              <td>TOTAL:</td>
              <td class="text-right">৳${total.toFixed(2)}</td>
            </tr>
            ${order.rewardPointsEarned > 0 ? `
              <tr>
                <td>Points Earned:</td>
                <td class="text-right">+${order.rewardPointsEarned} pts</td>
              </tr>
            ` : ''}
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
            <div style="font-size:10px; color:#666; margin-top:4px;">Software by ZenPlusIT</div>
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
