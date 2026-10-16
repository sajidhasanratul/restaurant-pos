(function () {
  'use strict';

  const MODULE_DEFS = [
    { key: 'dashboard', label: 'POS Dashboard', icon: '📊', desc: 'Sales metrics, analytics, recent orders' },
    { key: 'new-order', label: 'New Order (POS Billing)', icon: '🛒', desc: 'Create sales, bar/cart checkout' },
    { key: 'sales', label: 'Sales Operations', icon: '📋', desc: 'Sales list, order returns, custom price' },
    { key: 'inventory', label: 'Inventory & Catalog', icon: '📦', desc: 'Products, stock updates, label printer' },
    { key: 'expenses', label: 'Shop Expenses', icon: '💸', desc: 'Track expense logs and receipts' },
    { key: 'suppliers', label: 'Suppliers & Payments', icon: '🏢', desc: 'Manage suppliers and purchase pay logs' },
    { key: 'reports', label: 'Analytical Reports', icon: '📈', desc: 'Daily sales, profit, slow/top selling' },
    { key: 'coupons', label: 'Manage Coupons', icon: '🏷️', desc: 'Discounts, promo coupons' },
    { key: 'customers', label: 'Customer Management', icon: '👥', desc: 'Customer directory and history' },
    { key: 'gallery', label: 'Media Gallery', icon: '🖼️', desc: 'Upload, delete, move photos, folders' },
    { key: 'invoice-settings', label: 'Invoice Settings', icon: '⚙️', desc: 'Invoice layout, thermal receipts' },
    { key: 'payment-methods', label: 'Payment Methods', icon: '💳', desc: 'Setup payment channels & cash' },
    { key: 'report-settings', label: 'Report Settings', icon: '📝', desc: 'Expense categories & supplier rule' },
    { key: 'users', label: 'Admin User Control', icon: '🛡️', desc: 'User accounts and permission control' }
  ];

  const PRESETS = {
    admin: MODULE_DEFS.map(m => m.key),
    manager: ['dashboard', 'new-order', 'sales', 'inventory', 'expenses', 'suppliers', 'customers', 'gallery', 'invoice-settings', 'payment-methods', 'report-settings'],
    cashier: ['new-order', 'sales', 'inventory', 'customers']
  };

  const Users = {
    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <h2 class="page-title">🛡️ User Access Control & Permissions</h2>
            <p class="page-subtitle">Create accounts and customize granular page and function permissions for every staff member on demand.</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary btn-sm" id="btn-add-user">+ Add New User</button>
          </div>
        </div>

        <div class="card fade-in">
          <div class="card-body">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Username</th>
                    <th>Role Privilege</th>
                    <th>Allowed Functions & Pages</th>
                    <th class="text-center" style="width:160px;">Actions</th>
                  </tr>
                </thead>
                <tbody id="users-tbody"></tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="modal-overlay" id="users-modal-overlay"></div>
      `;

      // Event handlers
      document.getElementById('btn-add-user').onclick = () => this.showAddEditModal(null);

      // Initial update
      await this.updateList();
    },

    async updateList() {
      const S = POS.Store;
      const H = POS.Helpers;
      const list = await S.getAll('users');

      const tbody = document.getElementById('users-tbody');
      tbody.innerHTML = '';

      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No user records found in database.</td></tr>`;
        return;
      }

      list.forEach(u => {
        let roleBadge = `<span class="badge badge-secondary">${u.role.toUpperCase()}</span>`;
        if (u.role === 'admin') {
          roleBadge = `<span class="badge" style="background:#5a5cea; color:#fff;">ADMIN</span>`;
        } else if (u.role === 'manager') {
          roleBadge = `<span class="badge" style="background:#f59e0b; color:#fff;">MANAGER</span>`;
        } else if (u.role === 'cashier') {
          roleBadge = `<span class="badge" style="background:#10b981; color:#fff;">CASHIER</span>`;
        }

        // Calculate allowed permissions summary
        let perms = u.permissions;
        if (typeof perms === 'string') {
          try { perms = JSON.parse(perms); } catch(e) { perms = []; }
        }
        if (!Array.isArray(perms) || perms.length === 0) {
          perms = PRESETS[u.role] || [];
        }

        let permsBadge = '';
        if (u.role === 'admin' || perms.length === MODULE_DEFS.length) {
          permsBadge = `<span class="badge" style="background:#ecfdf5; color:#059669; border:1px solid #a7f3d0; font-weight:700;">★ Full System Access (${MODULE_DEFS.length}/${MODULE_DEFS.length})</span>`;
        } else {
          permsBadge = `
            <div style="display:flex; flex-direction:column; gap:4px;">
              <span class="badge" style="background:#f1f5f9; color:#334155; border:1px solid #cbd5e1; width:fit-content; font-weight:600;">
                ${perms.length} of ${MODULE_DEFS.length} Functions Enabled
              </span>
              <div style="font-size:11px; color:#64748b; line-height:1.3; max-width:320px;">
                ${perms.map(p => {
                  const def = MODULE_DEFS.find(m => m.key === p);
                  return def ? def.label : p;
                }).join(', ')}
              </div>
            </div>
          `;
        }

        tbody.innerHTML += `
          <tr class="user-row" data-id="${u.id}">
            <td>
              <div style="font-weight:600; color:#1e293b;">${H.esc(u.name)}</div>
              <div style="font-size:11px; color:#64748b;">${u.email ? H.esc(u.email) : 'No Email Added'}</div>
            </td>
            <td style="font-weight:600; color:var(--primary); font-family:monospace;">${H.esc(u.username)}</td>
            <td>${roleBadge}</td>
            <td>${permsBadge}</td>
            <td class="text-center">
              <button class="btn btn-secondary btn-sm btn-edit-user">✏️ Edit</button>
              <button class="btn btn-secondary btn-sm btn-delete-user" style="color:var(--danger)">🗑️ Delete</button>
            </td>
          </tr>
        `;
      });

      // Bind actions
      tbody.querySelectorAll('.user-row').forEach(row => {
        const id = row.dataset.id;
        const u = list.find(user => user.id === id);

        row.querySelector('.btn-edit-user').onclick = () => this.showAddEditModal(u);
        row.querySelector('.btn-delete-user').onclick = async () => {
          const activeUser = S.getCurrentUser();
          if (activeUser && activeUser.id === u.id) {
            H.showToast('You cannot delete your own logged-in user profile!', 'error');
            return;
          }

          if (await H.confirm(`Are you sure you want to remove user "${u.name}"?`)) {
            const success = await S.delete('users', u.id);
            if (success) {
              H.showToast('User deleted from system.');
              await this.updateList();
            }
          }
        };
      });
    },

    showAddEditModal(u) {
      const S = POS.Store;
      const H = POS.Helpers;
      const overlay = document.getElementById('users-modal-overlay');

      const isEdit = !!u;
      const title = isEdit ? `Edit User: ${H.esc(u.name)}` : 'Create New User Account';

      let currentPerms = [];
      if (isEdit) {
        let p = u.permissions;
        if (typeof p === 'string') {
          try { p = JSON.parse(p); } catch(e) { p = []; }
        }
        currentPerms = (Array.isArray(p) && p.length > 0) ? p : (PRESETS[u.role] || []);
      } else {
        currentPerms = [...PRESETS.cashier];
      }

      overlay.innerHTML = `
        <div class="modal animate" style="max-width:680px; width:95%; max-height:90vh; display:flex; flex-direction:column; padding:0; overflow:hidden;">
          <div class="modal-header" style="padding:14px 20px; border-bottom:1px solid var(--border);">
            <h3 style="margin:0; font-size:16px;">${title}</h3>
            <button class="modal-close" id="modal-close-users">&times;</button>
          </div>
          <div class="modal-body" style="padding:20px; overflow-y:auto; flex:1;">
            <div class="grid-2 gap-2" style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Employee Full Name <span style="color:var(--danger)">*</span></label>
                <input type="text" class="form-input" id="u-name" value="${isEdit ? H.esc(u.name) : ''}" placeholder="e.g. John Doe" required>
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Email Address</label>
                <input type="email" class="form-input" id="u-email" value="${isEdit && u.email ? H.esc(u.email) : ''}" placeholder="e.g. employee@shop.com">
              </div>
            </div>

            <div class="grid-2 gap-2" style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Username Login <span style="color:var(--danger)">*</span></label>
                <input type="text" class="form-input" id="u-username" value="${isEdit ? H.esc(u.username) : ''}" placeholder="e.g. cashier1" ${isEdit ? 'disabled' : ''}>
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Password Key ${isEdit ? '(leave blank to keep current)' : '<span style="color:var(--danger)">*</span>'}</label>
                <input type="password" class="form-input" id="u-password" placeholder="Enter secure password">
              </div>
            </div>

            <div class="form-group mb-3">
              <label class="form-label">Primary Role Group</label>
              <select class="form-select" id="u-role">
                <option value="cashier" ${isEdit && u.role === 'cashier' ? 'selected' : ''}>Cashier (Standard billing & customer tasks)</option>
                <option value="manager" ${isEdit && u.role === 'manager' ? 'selected' : ''}>Manager (Operational access, inventory & sales)</option>
                <option value="admin" ${isEdit && u.role === 'admin' ? 'selected' : (!isEdit ? '' : '')}>Administrator (Unrestricted owner access)</option>
              </select>
            </div>

            <!-- Granular Permissions Panel -->
            <div style="border:1px solid #e2e8f0; border-radius:8px; background:#f8fafc; padding:16px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                <div>
                  <div style="font-weight:700; font-size:14px; color:#1e293b;">⚡ Function & Page Access Permissions</div>
                  <div style="font-size:12px; color:#64748b;">Check or uncheck individual functions to grant or restrict access for this user.</div>
                </div>
                <div style="display:flex; gap:6px;">
                  <button type="button" class="btn btn-secondary btn-sm" id="btn-perm-all" style="padding:2px 8px; font-size:11px;">Select All</button>
                  <button type="button" class="btn btn-secondary btn-sm" id="btn-perm-none" style="padding:2px 8px; font-size:11px;">Clear All</button>
                </div>
              </div>

              <div id="permissions-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:10px;">
                ${MODULE_DEFS.map(m => {
                  const isChecked = currentPerms.includes(m.key);
                  return `
                    <label class="perm-card" style="display:flex; align-items:flex-start; gap:10px; background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:10px; cursor:pointer; transition:all 0.15s; margin:0;">
                      <input type="checkbox" class="perm-chk" data-perm="${m.key}" ${isChecked ? 'checked' : ''} style="margin-top:3px; cursor:pointer; width:16px; height:16px; accent-color:var(--primary);">
                      <div style="flex:1; overflow:hidden;">
                        <div style="font-weight:600; font-size:13px; color:#1e293b; display:flex; align-items:center; gap:6px;">
                          <span>${m.icon}</span> <span>${m.label}</span>
                        </div>
                        <div style="font-size:11px; color:#64748b; margin-top:2px; line-height:1.3;">${m.desc}</div>
                      </div>
                    </label>
                  `;
                }).join('')}
              </div>
            </div>
          </div>

          <div class="modal-footer" style="padding:12px 20px; border-top:1px solid var(--border); background:#fff;">
            <button class="btn btn-secondary" id="btn-users-cancel">Cancel</button>
            <button class="btn btn-primary" id="btn-users-save">Save Permissions & User</button>
          </div>
        </div>
      `;

      overlay.classList.add('active');

      const close = () => overlay.classList.remove('active');
      overlay.querySelector('#modal-close-users').onclick = close;
      overlay.querySelector('#btn-users-cancel').onclick = close;

      // Role change auto-checks preset permissions
      const roleSelect = overlay.querySelector('#u-role');
      const setCheckboxes = (keys) => {
        overlay.querySelectorAll('.perm-chk').forEach(chk => {
          chk.checked = keys.includes(chk.dataset.perm);
        });
      };

      roleSelect.onchange = () => {
        const r = roleSelect.value;
        if (PRESETS[r]) {
          setCheckboxes(PRESETS[r]);
        }
      };

      overlay.querySelector('#btn-perm-all').onclick = () => {
        setCheckboxes(MODULE_DEFS.map(m => m.key));
      };

      overlay.querySelector('#btn-perm-none').onclick = () => {
        setCheckboxes([]);
      };

      overlay.querySelector('#btn-users-save').onclick = async () => {
        const name = document.getElementById('u-name').value.trim();
        const email = document.getElementById('u-email').value.trim();
        const username = document.getElementById('u-username').value.trim();
        const password = document.getElementById('u-password').value;
        const role = document.getElementById('u-role').value;

        if (!name || (!isEdit && !username) || (!isEdit && !password)) {
          H.showToast('Please fill all mandatory fields.', 'error');
          return;
        }

        const checkedPerms = Array.from(overlay.querySelectorAll('.perm-chk:checked')).map(chk => chk.dataset.perm);

        const data = {
          name,
          username,
          role,
          email,
          permissions: checkedPerms
        };
        if (password) {
          data.password = password;
        }

        if (isEdit) {
          const success = await S.update('users', u.id, data);
          if (success) {
            // If the updated user is currently logged in, update localStorage session
            const currentLogged = S.getCurrentUser();
            if (currentLogged && currentLogged.id === u.id) {
              const updatedSessionUser = { ...currentLogged, ...data };
              S.setCurrentUser(updatedSessionUser);
              if (window.POS && POS.App && typeof POS.App._setupSidebar === 'function') {
                POS.App._setupSidebar();
              }
            }
            H.showToast('User account & permissions updated successfully.');
            close();
            await this.updateList();
          }
        } else {
          data.id = 'u-' + Math.random().toString(36).substr(2, 9);
          const success = await S.add('users', data);
          if (success) {
            H.showToast('New user account created.');
            close();
            await this.updateList();
          }
        }
      };
    }
  };

  window.POS = window.POS || {};
  window.POS.Users = Users;
})();
