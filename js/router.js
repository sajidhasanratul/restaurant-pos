(function () {
  'use strict';

  const Router = {
    routes: {},
    current: null,

    register(path, handler) {
      this.routes[path] = handler;
    },

    navigate(path) {
      if (!path.startsWith('/')) {
        path = '/' + path;
      }
      window.history.pushState(null, '', path);
      this._resolve();
    },

    init() {
      window.addEventListener('popstate', () => this._resolve());

      // Intercept relative internal link clicks to perform SPA transitions
      document.addEventListener('click', (e) => {
        const anchor = e.target.closest('a');
        if (anchor) {
          const href = anchor.getAttribute('href');
          // Intercept paths starting with '/' but not API paths or HTML pages
          if (href && href.startsWith('/') && !href.startsWith('/api') && !href.endsWith('.html')) {
            e.preventDefault();
            this.navigate(href);
          }
        }
      });

      const user = POS.Store.getCurrentUser();
      if (!user) {
        window.location.href = '/login.html';
        return;
      }

      let path = window.location.pathname;
      if (path === '/' || path === '/index.html' || path === '') {
        const hasDash = POS.Helpers.hasPermission('dashboard', user);
        path = hasDash ? '/dashboard' : '/new-order';
        window.history.replaceState(null, '', path);
      }

      this._resolve();
    },

    _resolve() {
      let path = window.location.pathname;
      if (path === '/' || path === '/index.html' || path === '') {
        path = '/dashboard';
      }

      const S = POS.Store;
      const H = POS.Helpers;
      const currentUser = S.getCurrentUser();

      // Check session
      if (!currentUser) {
        window.location.href = '/login.html';
        return;
      }

      // Route authorizations guard
      if (currentUser && currentUser.role !== 'admin') {
        const getRequiredPermission = (p) => {
          if (p === '/dashboard') return 'dashboard';
          if (p === '/new-order' || p.startsWith('/edit-order/')) return 'pos';
          if (p === '/sales-list') return 'sales_list';
          if (p === '/sales-return') return 'sales_return';
          if (p === '/return-list') return 'return_list';
          if (p === '/custom-item-price') return 'custom_item_prices';
          if (p === '/products') return 'products';
          if (p === '/inventory-details') return 'inventory_details';
          if (p === '/bulk-scan') return 'bulk_stock';
          if (p === '/label-printer') return 'label_printer';
          if (p === '/expenses') return 'expenses';
          if (p === '/suppliers') return 'suppliers';
          if (p.startsWith('/reports')) return 'reports';
          if (p === '/coupons') return 'coupons';
          if (p === '/customers') return 'customers';
          if (p === '/gallery') return 'gallery';
          if (p === '/invoice-settings') return 'invoice_settings';
          if (p === '/payment-methods') return 'payment_methods';
          if (p === '/report-settings') return 'report_settings';
          if (p === '/users') return 'users';
          return null;
        };

        const requiredPerm = getRequiredPermission(path);
        if (requiredPerm && !H.hasPermission(requiredPerm, currentUser)) {
          H.showToast('Access Denied: You do not have permission for this function.', 'error');
          let fallback = '/new-order';
          if (H.hasPermission('dashboard', currentUser)) fallback = '/dashboard';
          else if (H.hasPermission('pos', currentUser) || H.hasPermission('new-order', currentUser)) fallback = '/new-order';
          else if (H.hasPermission('sales_list', currentUser) || H.hasPermission('sales', currentUser)) fallback = '/sales-list';
          else if (H.hasPermission('products', currentUser) || H.hasPermission('inventory', currentUser)) fallback = '/products';
          else if (H.hasPermission('expenses', currentUser)) fallback = '/expenses';
          else if (H.hasPermission('customers', currentUser)) fallback = '/customers';
          path = fallback;
          window.history.replaceState(null, '', path);
        }
      }

      let handler = this.routes[path];
      let params = {};

      if (!handler) {
        for (const [route, h] of Object.entries(this.routes)) {
          const rp = route.split('/');
          const pp = path.split('/');
          if (rp.length !== pp.length) continue;
          let match = true;
          const p = {};
          for (let i = 0; i < rp.length; i++) {
            if (rp[i].startsWith(':')) { p[rp[i].slice(1)] = pp[i]; }
            else if (rp[i] !== pp[i]) { match = false; break; }
          }
          if (match) { handler = h; params = p; break; }
        }
      }

      if (handler) {
        try {
          this.current = path;
          const mainContent = document.getElementById('main-content');
          if (mainContent) mainContent.scrollTop = 0;
          handler(params);
          this._updateNav(path);
          this._updateBreadcrumb(path);
        } catch (err) {
          console.error('Routing execution error on ' + path + ':', err);
          const msg = err && err.message ? err.message : String(err);
          if (msg.includes('render') || msg.includes('reader') || msg.includes('undefined')) {
            H.showToast('Page component not loaded yet. Please press Ctrl + F5 to hard refresh.', 'error');
          } else {
            H.showToast(`Routing error: ${msg}`, 'error');
          }
        }
      }
    },

    _updateNav(path) {
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      const link = document.querySelector('.nav-item[href="' + path + '"]');
      if (link) {
        link.classList.add('active');
        const groupItems = link.closest('.nav-group-items');
        if (groupItems) {
          groupItems.classList.add('open');
          const header = groupItems.previousElementSibling;
          if (header) header.classList.add('open');
        }
      }
    },

    _updateBreadcrumb(path) {
      const el = document.getElementById('breadcrumb');
      if (!el) return;
      const parts = path.split('/').filter(Boolean);
      const labels = parts.map(p =>
        p.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      );
      el.innerHTML = labels.map((name, i) =>
        i < labels.length - 1
          ? '<span class="bc-item">' + name + '</span><span class="bc-sep">›</span>'
          : '<span class="bc-item bc-active">' + name + '</span>'
      ).join('');
    }
  };

  window.POS = window.POS || {};
  window.POS.Router = Router;
})();
