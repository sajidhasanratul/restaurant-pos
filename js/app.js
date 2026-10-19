(function () {
  'use strict';

  const App = {
    init() {
      const S = POS.Store;
      S.init();

      // Register routes
      // Register routes with safe fallback handling
      const R = POS.Router;
      const safeRender = (modName, param) => {
        const mod = POS[modName] || window[modName];
        if (mod && typeof mod.render === 'function') {
          return mod.render(param);
        }
        if (mod && typeof mod.reader === 'function') {
          return mod.reader(param);
        }
        console.error(`POS.${modName} module is not available on window.POS. Ensure js/${modName.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')}.js is loaded.`);
        POS.Helpers.showToast(`${modName} module not loaded. Please hard refresh your browser (Ctrl + F5).`, 'error');
      };

      R.register('/dashboard',         () => safeRender('Dashboard'));
      R.register('/new-order',         () => safeRender('NewOrder'));
      R.register('/edit-order/:id',    (p) => safeRender('EditOrder', p.id));
      R.register('/sales-list',        () => safeRender('SalesList'));
      R.register('/sales-return',      () => R.navigate('/sales-list'));
      R.register('/return-list',       () => R.navigate('/sales-list'));
      R.register('/custom-item-price', () => R.navigate('/sales-list'));
      R.register('/payment-methods',   () => safeRender('PaymentMethods'));
      R.register('/tables',            () => safeRender('Tables'));
      R.register('/invoice-settings',  () => this.renderInvoiceSettings());
      R.register('/reports/:type',     (p) => safeRender('Reports', p.type));
      R.register('/products',          () => safeRender('Products'));
      R.register('/inventory-details', () => R.navigate('/products'));
      R.register('/bulk-scan',         () => R.navigate('/products'));
      R.register('/label-printer',     () => R.navigate('/products'));
      R.register('/gallery',           () => safeRender('Gallery'));
      R.register('/customers',         () => safeRender('Customers'));
      R.register('/expenses',          () => safeRender('Expenses'));
      R.register('/ingredient-costs',  () => safeRender('IngredientCosts'));
      R.register('/suppliers',         () => safeRender('Suppliers'));
      R.register('/expired-wastes',    () => safeRender('ExpiredWastes'));
      R.register('/report-settings',   () => safeRender('ReportSettings'));
      R.register('/coupons',           () => {
        const u = S.getCurrentUser();
        if (u && u.role === 'admin') {
          safeRender('Coupons');
        } else {
          POS.Helpers.showToast('Access denied: Admin only', 'error');
          R.navigate('/dashboard');
        }
      });
      R.register('/users',             () => safeRender('Users'));
      R.register('/label-printer',      () => safeRender('LabelPrinter'));

      // Pre-load dynamic payment channels and icons
      POS.Helpers.loadPaymentMethods();

      R.init();
      this._setupSidebar();
      this._updateHeaderDate();
      this._setupSettings();
      this._updateUserHeader();
    },

    /* ── Sidebar behaviour ─────────────────────────── */
    _setupSidebar() {
      const S = POS.Store;
      const toggle  = document.getElementById('menu-toggle');
      const sidebar = document.getElementById('sidebar');
      const wrapper = document.getElementById('main-wrapper');
      const overlay = document.getElementById('sidebar-overlay');

      const toggleMenu = () => {
        if (window.innerWidth <= 1024) {
          sidebar.classList.toggle('mobile-open');
          overlay.classList.toggle('active');
        } else {
          sidebar.classList.toggle('collapsed');
          wrapper.classList.toggle('expanded');
        }
      };

      toggle && toggle.addEventListener('click', toggleMenu);
      overlay && overlay.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('active');
      });

      // Close mobile drawer on navigation click
      document.querySelectorAll('#sidebar-nav a').forEach(link => {
        link.addEventListener('click', () => {
          if (window.innerWidth <= 1024) {
            sidebar.classList.remove('mobile-open');
            overlay.classList.remove('active');
          }
        });
      });

      document.querySelectorAll('.nav-group-header').forEach(header => {
        header.addEventListener('click', () => {
          const items = header.nextElementSibling;
          const isOpen = header.classList.contains('open');

          // Close others
          document.querySelectorAll('.nav-group-header.open').forEach(h => {
            if (h !== header) {
              h.classList.remove('open');
              h.nextElementSibling && h.nextElementSibling.classList.remove('open');
            }
          });

          header.classList.toggle('open', !isOpen);
          items && items.classList.toggle('open', !isOpen);
        });
      });

      // Filter sidebar links depending on user permissions
      const user = S.getCurrentUser();
      if (user) {
        const H = POS.Helpers;

        const setDisplay = (id, show) => {
          const el = document.getElementById(id);
          if (el) el.style.display = show ? '' : 'none';
        };

        const setElDisplay = (selector, show) => {
          const el = document.querySelector(selector);
          if (el) el.style.display = show ? '' : 'none';
        };

        setDisplay('nav-grp-dashboard', H.hasPermission('dashboard', user));
        setDisplay('nav-grp-new-order', H.hasPermission('pos', user) || H.hasPermission('new-order', user));

        // Direct nav items
        setDisplay('nav-grp-sales-list', H.hasPermission('sales_list', user) || H.hasPermission('sales', user));
        setDisplay('nav-grp-items', H.hasPermission('products', user) || H.hasPermission('inventory', user));
        // Operation Expenses sub-items
        const canIngredientCosts = H.hasPermission('ingredient_costs', user) || H.hasPermission('expenses', user);
        const canExpenses = H.hasPermission('expenses', user);
        const canSuppliers = H.hasPermission('suppliers', user);
        const canExpiredWastes = H.hasPermission('expired_wastes', user) || H.hasPermission('expenses', user);

        setDisplay('nav-sub-ingredient-costs', canIngredientCosts);
        setDisplay('nav-sub-expenses', canExpenses);
        setDisplay('nav-sub-suppliers', canSuppliers);
        setDisplay('nav-sub-expired-wastes', canExpiredWastes);

        const canAnyOpExpenses = canIngredientCosts || canExpenses || canSuppliers || canExpiredWastes;
        setDisplay('nav-grp-operation-expenses', canAnyOpExpenses);

        setDisplay('nav-grp-reports', H.hasPermission('reports', user));
        setDisplay('nav-grp-coupons', H.hasPermission('coupons', user));
        setDisplay('nav-grp-customers', H.hasPermission('customers', user));

        // Settings group sub-items
        const canInvoiceSettings = H.hasPermission('invoice_settings', user);
        const canUsers = H.hasPermission('users', user);
        const canPaymentMethods = H.hasPermission('payment_methods', user);
        const canTables = H.hasPermission('tables', user);
        const canReportSettings = H.hasPermission('report_settings', user);
        const canGallery = H.hasPermission('gallery', user);

        setDisplay('nav-invoice-settings', canInvoiceSettings);
        setDisplay('nav-admin-control', canUsers);
        setDisplay('nav-payment-methods', canPaymentMethods);
        setDisplay('nav-tables', canTables);
        setDisplay('nav-report-settings', canReportSettings);
        setDisplay('nav-gallery', canGallery);

        const canAnySettings = canInvoiceSettings || canUsers || canPaymentMethods || canTables || canReportSettings || canGallery;
        setDisplay('nav-grp-settings', canAnySettings);
      }

      // Logout handler
      const btnLogout = document.getElementById('nav-logout');
      if (btnLogout) {
        btnLogout.onclick = (e) => {
          e.preventDefault();
          S.logout();
        };
      }

      // Auto-open current group
      let path = window.location.pathname;
      if (path === '/' || path === '/index.html' || path === '') {
        path = '/dashboard';
      }
      const link = document.querySelector('.nav-item[href="' + path + '"]');
      if (link) {
        const group = link.closest('.nav-group-items');
        if (group) {
          group.classList.add('open');
          group.previousElementSibling && group.previousElementSibling.classList.add('open');
        }
      }
    },

    /* ── Header date (Always Bangladesh Standard Time GMT+6) ── */
    _updateHeaderDate() {
      const el = document.getElementById('header-date');
      if (el) {
        el.textContent = POS.Helpers.formatDateFull(new Date());
      }
    },

    _updateUserHeader() {
      const S = POS.Store;
      const el = document.getElementById('user-profile-badge');
      if (!el) return;

      const user = S.getCurrentUser();
      if (user) {
        let roleName = user.role.toUpperCase();
        el.innerHTML = `
          <div style="display:flex; align-items:center; gap:8px; cursor:pointer;" class="profile-click-trigger" title="Click to view profile details">
            <div style="text-align:right;">
              <div style="font-weight:700; color:var(--text-dark); font-size:13px;">${POS.Helpers.esc(user.name)}</div>
              <div style="font-size:10px; color:#64748b; font-weight:600; text-transform:uppercase;">${roleName}</div>
            </div>
            <div style="width:34px; height:34px; border-radius:50%; background:var(--primary); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px;">
              ${user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        `;
        el.querySelector('.profile-click-trigger').onclick = () => this.showUserProfileModal();
      } else {
        el.innerHTML = '';
      }
    },

    showUserProfileModal() {
      const S = POS.Store;
      const H = POS.Helpers;
      const user = S.getCurrentUser();
      if (!user) return;

      let modalOverlay = document.getElementById('global-profile-modal-overlay');
      if (!modalOverlay) {
        modalOverlay = document.createElement('div');
        modalOverlay.id = 'global-profile-modal-overlay';
        modalOverlay.className = 'modal-overlay';
        document.body.appendChild(modalOverlay);
      }

      let roleLabel = 'Cashier';
      let roleBg = '#6b7280';
      if (user.role === 'admin') {
        roleLabel = 'System Admin';
        roleBg = '#5a5cea';
      } else if (user.role === 'manager') {
        roleLabel = 'Store Manager';
        roleBg = '#f59e0b';
      }

      modalOverlay.innerHTML = `
        <div class="modal animate" style="max-width:440px;">
          <div class="modal-header">
            <h3>👤 User Account Profile</h3>
            <button class="modal-close" id="modal-close-global-profile">&times;</button>
          </div>
          <div class="modal-body">
            <!-- Profile Info Panel -->
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:var(--radius-sm); padding:16px; margin-bottom:20px;">
              <div style="display:flex; align-items:center; gap:16px; margin-bottom:14px;">
                <div style="width:48px; height:48px; border-radius:50%; background:var(--primary); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:18px;">
                  ${user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 style="margin:0; font-size:15px; font-weight:700; color:var(--text-dark);">${H.esc(user.name)}</h4>
                  <span class="badge" style="background:${roleBg}; color:#fff; font-size:10px; font-weight:700; text-transform:uppercase; padding:2px 8px; border-radius:10px; display:inline-block; margin-top:4px;">${roleLabel}</span>
                </div>
              </div>
              
              <div style="display:grid; grid-template-columns: 110px 1fr; row-gap:10px; font-size:13px; line-height:1.4;">
                <span style="font-weight:600; color:#64748b;">Username:</span>
                <span style="font-weight:700; color:var(--text-dark);">${H.esc(user.username)}</span>
                
                <span style="font-weight:600; color:#64748b;">Email Address:</span>
                <span style="font-weight:600; color:var(--text-dark);">${user.email ? H.esc(user.email) : '<span style="color:#ef4444; font-style:italic;">No Email Added</span>'}</span>
              </div>
            </div>

            <!-- Password Update Fields -->
            <h4 style="margin-top:0; margin-bottom:12px; font-size:14px; font-weight:700; color:var(--text-dark); border-bottom: 1px solid var(--border-light); padding-bottom:6px;">🔑 Change Account Password</h4>
            
            <div class="form-group mb-2">
              <label class="form-label">Current Password</label>
              <input type="password" class="form-input" id="pwd-old" placeholder="Enter current password" required>
            </div>
            <div class="form-group mb-2">
              <label class="form-label">New Password</label>
              <input type="password" class="form-input" id="pwd-new" placeholder="Enter new password" required>
            </div>
            <div class="form-group">
              <label class="form-label">Confirm New Password</label>
              <input type="password" class="form-input" id="pwd-confirm" placeholder="Confirm new password" required>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="btn-global-profile-cancel">Close</button>
            <button class="btn btn-primary" id="btn-global-pwd-save">Update Password</button>
          </div>
        </div>
      `;

      modalOverlay.classList.add('active');

      const close = () => modalOverlay.classList.remove('active');
      modalOverlay.querySelector('#modal-close-global-profile').onclick = close;
      modalOverlay.querySelector('#btn-global-profile-cancel').onclick = close;

      modalOverlay.querySelector('#btn-global-pwd-save').onclick = async () => {
        const oldP = document.getElementById('pwd-old').value;
        const newP = document.getElementById('pwd-new').value;
        const confP = document.getElementById('pwd-confirm').value;

        if (!oldP || !newP || !confP) {
          H.showToast('Please fill out all fields.', 'error');
          return;
        }
        if (newP !== confP) {
          H.showToast('New passwords do not match!', 'error');
          return;
        }

        const res = await S.changePassword(oldP, newP);
        if (res.success) {
          H.showToast('Password updated successfully!');
          close();
        } else {
          H.showToast(res.error || 'Password update failed', 'error');
        }
      };
    },



    _setupSettings() {
      const btn = document.getElementById('nav-invoice-settings') || document.getElementById('nav-settings');
      if (!btn) return;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        POS.Router.navigate('/invoice-settings');
      });
    },

    async renderInvoiceSettings() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

        mc.innerHTML = `
          <div class="page-header">
            <div>
              <h2 class="page-title">⚙️ Thermal Receipt & Store Settings</h2>
              <p class="page-subtitle">Configure restaurant branding, store info, and minimal thermal receipt styles. Optimized for thermal printers with zero heavy black ink.</p>
            </div>
          </div>
          
          <div style="display:grid; grid-template-columns:1.15fr 0.85fr; gap:24px; max-width:1180px; align-items:start;" class="fade-in">
            
            <!-- Left Column: Settings Form -->
            <div style="display:flex; flex-direction:column; gap:20px;">
              
              <!-- Card 1: Restaurant Identity -->
              <div class="card">
                <div class="card-header">
                  <h3>🏪 Restaurant Branding & Store Info</h3>
                </div>
                <div class="card-body" style="display:flex; flex-direction:column; gap:16px;">
                  <div class="form-group">
                    <label class="form-label" style="font-weight:700;">Store / Brand Logo</label>
                    <div style="display:flex; gap:14px; align-items:center; background:#f8fafc; padding:12px; border:1px solid var(--border); border-radius:var(--radius-sm);">
                      <div id="set-logo-preview" style="width:70px; height:70px; border:1px solid var(--border); border-radius:var(--radius-sm); display:flex; align-items:center; justify-content:center; overflow:hidden; background:#fff; flex-shrink:0;">
                        <span style="font-size:20px; color:#cbd5e1;">Logo</span>
                      </div>
                      <div style="flex:1; display:flex; flex-direction:column; gap:8px;">
                        <div style="display:flex; gap:8px; flex-wrap:wrap;">
                          <button type="button" class="btn btn-secondary btn-sm" id="btn-pick-logo-gallery" style="font-weight:600;">
                            🖼️ Choose from Gallery
                          </button>
                          <button type="button" class="btn btn-secondary btn-sm" id="btn-upload-logo-device" style="font-weight:600;">
                            📤 Upload from Device
                          </button>
                        </div>
                        <div style="display:flex; gap:6px;">
                          <input type="text" class="form-input" id="set-logo-url" placeholder="Or paste image URL / Base64..." style="height:28px; font-size:11px; flex:1;">
                          <button type="button" class="btn btn-secondary btn-xs" id="btn-clear-logo" style="color:#ef4444;" title="Remove Logo">✕ Clear</button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div class="form-group">
                    <label class="form-label">Store / Restaurant Name</label>
                    <input type="text" class="form-input" id="set-store-name" placeholder="e.g. ZenPos Restaurant">
                  </div>
                  
                  <div class="form-group">
                    <label class="form-label">Show Store Name on Thermal Receipts</label>
                    <select class="form-select" id="set-invoice-show-store-name">
                      <option value="1">Show</option>
                      <option value="0">Hide</option>
                    </select>
                  </div>
                  
                  <div class="form-group">
                    <label class="form-label">Restaurant Address</label>
                    <input type="text" class="form-input" id="set-store-address" placeholder="e.g. 14 Gourmet Avenue, Dhaka">
                  </div>
                  
                  <div class="form-group">
                    <label class="form-label">Contact / Phone Number</label>
                    <input type="text" class="form-input" id="set-store-phone" placeholder="e.g. +880 1712-345678">
                  </div>
                  
                  <div class="form-group">
                    <label class="form-label">Store Website / Social URL</label>
                    <input type="text" class="form-input" id="set-store-website" placeholder="e.g. www.zenposbistro.com">
                  </div>
                  
                  <div class="form-group">
                    <label class="form-label">Receipt Footer Note / Greeting</label>
                    <textarea class="form-input" id="set-invoice-note" rows="2" style="resize:vertical;" placeholder="e.g. Thank you for dining with us! Please come again."></textarea>
                  </div>
                </div>
              </div>

              <!-- Card 2: Thermal Printer & Minimal Styles -->
              <div class="card">
                <div class="card-header">
                  <h3>🖨️ Thermal Receipt Settings & Minimal Design</h3>
                </div>
                <div class="card-body" style="display:flex; flex-direction:column; gap:16px;">
                  <div class="form-group">
                    <label class="form-label">Minimal Receipt Theme (Zero Heavy Black Ink)</label>
                    <select class="form-select" id="set-receipt-style">
                      <option value="style-minimal-dashed">Minimalist Dashed (Clean Dashed Dividers, High Contrast)</option>
                      <option value="style-minimal-clean">Clean Monospace (Crisp Typewriter Font, Sharp & Fast)</option>
                      <option value="style-minimal-centered">Minimal Centered (Boutique Cafe & Bistro Vibe)</option>
                      <option value="style-minimal-compact">Ultra Compact (Paper-Saver, Short Roll Length)</option>
                      <option value="style-1">Standard Minimalist</option>
                      <option value="style-2">Classic Bordered</option>
                      <option value="style-3">Tabular Grid</option>
                    </select>
                    <small style="color:#64748b; font-size:11.5px; margin-top:4px; display:block;">All themes use clean high-contrast lines and dashed separators to prevent thermal printer head overheating.</small>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Thermal Paper Roll Width</label>
                    <select class="form-select" id="set-receipt-width">
                      <option value="80">80mm (Standard Desktop POS Thermal)</option>
                      <option value="58">58mm (Compact Mobile / Bluetooth Thermal)</option>
                      <option value="76">76mm (Specialty Roll)</option>
                    </select>
                  </div>

                  <button class="btn btn-primary" id="btn-save-settings" style="padding:14px; font-weight:700; width:100%; font-size:15px; margin-top:8px;">
                    💾 Save Thermal Settings
                  </button>
                </div>
              </div>

            </div>

            <!-- Right Column: Live Thermal Receipt Preview -->
            <div class="card" style="position:sticky; top:20px;">
              <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
                <h3>👁️ Live Receipt Preview</h3>
                <span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:700;">Thermal 80mm/58mm</span>
              </div>
              <div class="card-body" style="background:#f1f5f9; padding:20px; display:flex; justify-content:center;">
                <!-- Simulated Thermal Paper Roll -->
                <div id="thermal-preview-container" style="background:#fff; width:100%; max-width:320px; padding:18px 16px; border:1px solid #e2e8f0; border-radius:4px; box-shadow:0 4px 14px rgba(0,0,0,0.06); font-family:monospace; font-size:12px; color:#000; line-height:1.35;">
                  
                  <div style="text-align:center; margin-bottom:8px;">
                    <div id="prev-logo-box" style="margin-bottom:6px; display:none;">
                      <img id="prev-logo-img" src="" style="max-width:55px; max-height:55px; object-fit:contain; margin:0 auto; display:block;">
                    </div>
                    <div id="prev-store-name" style="font-size:15px; font-weight:800; line-height:1.2;">ZenPos Restaurant</div>
                    <div id="prev-store-address" style="font-size:11px; color:#333; margin-top:2px;">14 Gourmet Avenue, Food District</div>
                    <div id="prev-store-phone" style="font-size:11px; color:#333;">Tel: +880 1712-345678</div>
                    <div id="prev-store-website" style="font-size:10.5px; color:#555;">www.zenposbistro.com</div>
                    
                    <!-- Clean minimal token with dashed border — NO solid black -->
                    <div id="prev-token-banner" style="font-size:18px; font-weight:900; border:1.5px dashed #000; background:transparent; color:#000; padding:4px 0; margin:8px 0; letter-spacing:1px;">
                      TOKEN #01
                    </div>
                    
                    <div><span style="display:inline-block; border:1px dashed #000; background:transparent; color:#000; font-weight:800; padding:2px 8px; border-radius:3px; font-size:11px;">DINE IN • TABLE 02</span></div>
                  </div>

                  <div style="border-top:1px dashed #000; margin:8px 0;"></div>

                  <div style="font-size:11px; line-height:1.4; margin-bottom:6px;">
                    <div><strong>Invoice:</strong> INV-20261019-001</div>
                    <div><strong>Date:</strong> 19 Oct 2026, 04:00 AM</div>
                    <div><strong>Guest:</strong> Walk-in Guest</div>
                  </div>

                  <div style="border-top:1px dashed #000; margin:8px 0;"></div>

                  <!-- Sample Items -->
                  <div id="prev-items-table">
                    <div style="display:flex; justify-content:space-between; font-weight:bold; border-bottom:1px dashed #000; padding-bottom:3px; margin-bottom:4px;">
                      <span>Item</span>
                      <span style="width:30px; text-align:center;">Qty</span>
                      <span style="width:60px; text-align:right;">Price</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding:3px 0; border-bottom:1px dotted #ccc;">
                      <span style="flex:1;">Gourmet Burger</span>
                      <span style="width:30px; text-align:center;">1</span>
                      <span style="width:60px; text-align:right;">৳280.00</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding:3px 0; border-bottom:1px dotted #ccc;">
                      <span style="flex:1;">Mint Lemonade</span>
                      <span style="width:30px; text-align:center;">2</span>
                      <span style="width:60px; text-align:right;">৳180.00</span>
                    </div>
                  </div>

                  <div style="border-top:1px dashed #000; margin:8px 0;"></div>

                  <!-- Totals -->
                  <div style="font-size:11.5px; line-height:1.4;">
                    <div style="display:flex; justify-content:space-between;">
                      <span>Subtotal:</span>
                      <span>৳460.00</span>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                      <span>Vat / Tax (5%):</span>
                      <span>৳23.00</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:13.5px; font-weight:800; border-top:1px dashed #000; padding-top:4px; margin-top:4px;">
                      <span>TOTAL:</span>
                      <span>৳483.00</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:2px;">
                      <span>Paid (Cash):</span>
                      <span>৳500.00</span>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                      <span>Change Return:</span>
                      <span>৳17.00</span>
                    </div>
                  </div>

                  <div style="border-top:1px dashed #000; margin:8px 0;"></div>

                  <div style="text-align:center; font-size:11px; margin-top:6px;">
                    <div id="prev-note" style="font-style:italic; margin-bottom:4px;">Thank you for dining with us!</div>
                    <div style="font-size:10px; color:#555;">Software by ZenPos</div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        `;

        const settings = (await S.getSettings()) || {};
        
        let activeLogo = settings.invoice_logo || '';
        const logoPreview = document.getElementById('set-logo-preview');
        const logoUrlInput = document.getElementById('set-logo-url');
        const btnPickGallery = document.getElementById('btn-pick-logo-gallery');
        const btnUploadDevice = document.getElementById('btn-upload-logo-device');
        const btnClearLogo = document.getElementById('btn-clear-logo');
        
        // Preview DOM Elements
        const prevLogoBox = document.getElementById('prev-logo-box');
        const prevLogoImg = document.getElementById('prev-logo-img');
        const prevStoreName = document.getElementById('prev-store-name');
        const prevStoreAddress = document.getElementById('prev-store-address');
        const prevStorePhone = document.getElementById('prev-store-phone');
        const prevStoreWebsite = document.getElementById('prev-store-website');
        const prevNote = document.getElementById('prev-note');
        const prevContainer = document.getElementById('thermal-preview-container');

        const updateLogoPreview = (src) => {
          if (src) {
            logoPreview.innerHTML = `<img src="${src}" style="width:100%; height:100%; object-fit:contain;">`;
            if (prevLogoBox && prevLogoImg) {
              prevLogoImg.src = src;
              prevLogoBox.style.display = 'block';
            }
          } else {
            logoPreview.innerHTML = `<span style="font-size:16px; color:#cbd5e1;">Logo</span>`;
            if (prevLogoBox) prevLogoBox.style.display = 'none';
          }
        };

        const updateLivePreview = () => {
          const name = document.getElementById('set-store-name').value.trim();
          const showName = document.getElementById('set-invoice-show-store-name').value !== '0';
          const addr = document.getElementById('set-store-address').value.trim();
          const phone = document.getElementById('set-store-phone').value.trim();
          const web = document.getElementById('set-store-website').value.trim();
          const note = document.getElementById('set-invoice-note').value.trim();
          const widthVal = document.getElementById('set-receipt-width').value;
          const styleVal = document.getElementById('set-receipt-style').value;

          if (prevStoreName) {
            prevStoreName.style.display = showName ? 'block' : 'none';
            prevStoreName.textContent = name || 'ZenPos Restaurant';
          }
          if (prevStoreAddress) prevStoreAddress.textContent = addr || '';
          if (prevStorePhone) prevStorePhone.textContent = phone ? `Tel: ${phone}` : '';
          if (prevStoreWebsite) prevStoreWebsite.textContent = web || '';
          if (prevNote) prevNote.textContent = note || 'Thank you for dining with us! Please come again.';
          
          if (prevContainer) {
            if (widthVal === '58') {
              prevContainer.style.maxWidth = '250px';
              prevContainer.style.fontSize = '11px';
            } else {
              prevContainer.style.maxWidth = '320px';
              prevContainer.style.fontSize = '12px';
            }

            if (styleVal === 'style-minimal-clean' || styleVal === 'style-2') {
              prevContainer.style.fontFamily = '"Courier New", Courier, monospace';
            } else if (styleVal === 'style-minimal-centered') {
              prevContainer.style.fontFamily = 'Inter, sans-serif';
            } else {
              prevContainer.style.fontFamily = 'monospace, sans-serif';
            }
          }
        };

        updateLogoPreview(activeLogo);
        if (activeLogo) {
          logoUrlInput.value = activeLogo;
        }

        if (btnPickGallery) {
          btnPickGallery.onclick = () => {
            H.openMediaPicker({
              title: 'Choose Store Logo from Gallery',
              folderName: 'Store & Invoices',
              folderId: 'folder_store_invoices',
              activeTab: 'gallery',
              onSelect: (url) => {
                activeLogo = url;
                updateLogoPreview(activeLogo);
                logoUrlInput.value = url;
                updateLivePreview();
              }
            });
          };
        }

        if (btnUploadDevice) {
          btnUploadDevice.onclick = () => {
            H.openMediaPicker({
              title: 'Upload Store Logo from Device',
              folderName: 'Store & Invoices',
              folderId: 'folder_store_invoices',
              activeTab: 'upload',
              onSelect: (url) => {
                activeLogo = url;
                updateLogoPreview(activeLogo);
                logoUrlInput.value = url;
                updateLivePreview();
              }
            });
          };
        }

        if (btnClearLogo) {
          btnClearLogo.onclick = () => {
            activeLogo = '';
            updateLogoPreview('');
            logoUrlInput.value = '';
            updateLivePreview();
          };
        }

        logoUrlInput.oninput = (e) => {
          activeLogo = e.target.value.trim();
          updateLogoPreview(activeLogo);
          updateLivePreview();
        };

        // Populate Form Values
        document.getElementById('set-store-name').value = settings.store_name || 'ZenPos Restaurant';
        document.getElementById('set-invoice-show-store-name').value = settings.invoice_show_store_name || '1';
        document.getElementById('set-store-address').value = settings.store_address || '';
        document.getElementById('set-store-phone').value = settings.store_phone || '';
        document.getElementById('set-store-website').value = settings.store_website || '';
        document.getElementById('set-invoice-note').value = settings.invoice_note || 'Thank you for dining with us! Please come again.';
        document.getElementById('set-receipt-width').value = settings.receipt_width || '80';
        document.getElementById('set-receipt-style').value = settings.receipt_style || 'style-minimal-dashed';

        // Connect real-time preview listeners
        ['set-store-name', 'set-store-address', 'set-store-phone', 'set-store-website', 'set-invoice-note'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.addEventListener('input', updateLivePreview);
        });
        ['set-invoice-show-store-name', 'set-receipt-width', 'set-receipt-style'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.addEventListener('change', updateLivePreview);
        });

        updateLivePreview();

        const saveBtn = document.getElementById('btn-save-settings');
        saveBtn.disabled = false;

        saveBtn.onclick = async () => {
          const store_name = document.getElementById('set-store-name').value.trim() || 'ZenPos Restaurant';
          const invoice_show_store_name = document.getElementById('set-invoice-show-store-name').value;
          const store_address = document.getElementById('set-store-address').value.trim();
          const store_phone = document.getElementById('set-store-phone').value.trim();
          const store_website = document.getElementById('set-store-website').value.trim();
          const invoice_note = document.getElementById('set-invoice-note').value.trim();
          const receipt_width = document.getElementById('set-receipt-width').value.trim() || '80';
          const receipt_style = document.getElementById('set-receipt-style').value;

          saveBtn.disabled = true;
          saveBtn.innerText = 'Saving...';

          try {
            const res = await S.updateSettings({ 
              store_name, 
              invoice_show_store_name,
              store_address, 
              store_phone, 
              store_website,
              invoice_note,
              invoice_logo: activeLogo,
              receipt_width,
              receipt_style,
              default_print_type: 'receipt'
            });

            saveBtn.disabled = false;
            saveBtn.innerHTML = '💾 Save Thermal Settings';

            if (res && res.success) {
              H.showToast('Thermal receipt settings saved successfully!');
            } else {
              H.showToast('Could not save settings: ' + ((res && res.error) || 'Failed to update database'), 'error');
            }
          } catch (err) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '💾 Save Thermal Settings';
            H.showToast('Error saving settings: ' + err.message, 'error');
          }
        };
    }
  };

  window.POS = window.POS || {};
  window.POS.App = App;

  document.addEventListener('DOMContentLoaded', () => App.init());
})();
