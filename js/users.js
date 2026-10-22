(function () {
  'use strict';

  const SYSTEM_FUNCTIONS = [
    {
      group: 'Sales & Order Operations',
      items: [
        { key: 'pos', label: 'POS / New Order', desc: 'Create restaurant orders and process transactions' },
        { key: 'sales_list', label: 'Sales List', desc: 'View past orders, token numbers, and invoices' },
        { key: 'cash_drawer', label: 'Cash Drawer', desc: 'Monitor cash balance, cash sales, add and withdraw cash' }
      ]
    },
    {
      group: 'Menu & Dishes',
      items: [
        { key: 'products', label: 'Menu Items', desc: 'View, add and edit restaurant menu dishes and categories' }
      ]
    },
    {
      group: 'Finance & Kitchen Costs',
      items: [
        { key: 'dashboard', label: 'Executive Dashboard', desc: 'View sales KPIs, charts, and metrics' },
        { key: 'ingredient_costs', label: 'Ingredient Costs', desc: 'Record raw kitchen ingredients, meats, and produce' },
        { key: 'expenses', label: 'Restaurant Expenses', desc: 'Record utilities, rent, and operational costs' },
        { key: 'suppliers', label: 'Suppliers & Payments', desc: 'Manage food vendors and payment records' },
        { key: 'reports', label: 'Analytical Reports', desc: 'Access sales reports and profit analytics' }
      ]
    },
    {
      group: 'Operations & Settings',
      items: [
        { key: 'gallery', label: 'Image Gallery', desc: 'Upload, organize and manage dish photo assets' },
        { key: 'customers', label: 'Customers', desc: 'Customer directory and dining records' },
        { key: 'coupons', label: 'Manage Coupons', desc: 'Configure promotional discount codes' },
        { key: 'invoice_settings', label: 'Invoice & Print Settings', desc: 'Store header, receipts, paper formats' },
        { key: 'payment_methods', label: 'Payment Methods', desc: 'Configure cash, card, and digital wallets' },
        { key: 'report_settings', label: 'Report Settings', desc: 'Configure reporting settings' },
        { key: 'users', label: 'Admin Control (Users)', desc: 'Grant employee access privileges and create accounts' }
      ]
    }
  ];

  const ROLE_DEFAULTS = {
    cashier: ['pos', 'sales_list', 'cash_drawer', 'products', 'gallery'],
    manager: [
      'dashboard', 'pos', 'sales_list', 'cash_drawer', 'products', 'ingredient_costs',
      'expenses', 'suppliers', 'customers', 'invoice_settings',
      'payment_methods', 'gallery', 'report_settings', 'reports'
    ],
    admin: ['*']
  };

  const Users = {
    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <h2 class="page-title">🛡️ User Access Control</h2>
            <p class="page-subtitle">Create user accounts, set security roles, and grant or revoke individual function access for any user at any time.</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary btn-sm" id="btn-add-user" style="display:inline-flex; align-items:center; gap:6px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Add New User
            </button>
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
                    <th>Active Function Access</th>
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
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:30px;">No user records found in database.</td></tr>`;
        return;
      }

      list.forEach(u => {
        let roleBadge = `<span class="badge badge-secondary">${H.esc(u.role.toUpperCase())}</span>`;
        if (u.role === 'admin') {
          roleBadge = `<span class="badge" style="background:#5a5cea; color:#fff;">ADMIN</span>`;
        } else if (u.role === 'manager') {
          roleBadge = `<span class="badge" style="background:#f59e0b; color:#fff;">MANAGER</span>`;
        } else if (u.role === 'cashier') {
          roleBadge = `<span class="badge" style="background:#10b981; color:#fff;">CASHIER</span>`;
        }

        let perms = u.permissions;
        if (typeof perms === 'string') {
          try { perms = JSON.parse(perms); } catch(e) { perms = []; }
        }

        let permsSummary = '';
        if (u.role === 'admin' || (Array.isArray(perms) && perms.includes('*'))) {
          permsSummary = `<span class="badge" style="background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0; font-weight:700;">★ Full System Access (All Functions)</span>`;
        } else {
          const effectivePerms = (Array.isArray(perms) && perms.length > 0) ? perms : (ROLE_DEFAULTS[u.role] || []);
          const totalFuncCount = SYSTEM_FUNCTIONS.reduce((acc, g) => acc + g.items.length, 0);
          permsSummary = `
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="badge" style="background:#eff6ff; color:#1e40af; border:1px solid #bfdbfe; font-weight:700;">
                ${effectivePerms.length} / ${totalFuncCount} Functions Enabled
              </span>
              <span style="font-size:11px; color:#64748b; max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${effectivePerms.join(', ')}">
                (${effectivePerms.join(', ')})
              </span>
            </div>
          `;
        }

        tbody.innerHTML += `
          <tr class="user-row" data-id="${u.id}">
            <td>
              <div style="font-weight:700; color:#1e293b;">${H.esc(u.name)}</div>
              <div style="font-size:11px; color:#64748b;">${u.email ? H.esc(u.email) : 'No Email Added'}</div>
            </td>
            <td style="font-weight:600; color:var(--primary); font-family:monospace;">${H.esc(u.username)}</td>
            <td>${roleBadge}</td>
            <td>${permsSummary}</td>
            <td class="text-center">
              <button class="btn btn-secondary btn-sm btn-edit-user" style="padding:4px 10px; font-size:11px;">✏️ Edit</button>
              <button class="btn btn-secondary btn-sm btn-delete-user" style="padding:4px 10px; font-size:11px; color:var(--danger)">🗑️ Delete</button>
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
      const title = isEdit ? `Edit User & Permissions: ${H.esc(u.name)}` : 'Create New User Account';

      // Determine initial permissions
      let currentPerms = [];
      if (isEdit) {
        let p = u.permissions;
        if (typeof p === 'string') {
          try { p = JSON.parse(p); } catch(e) { p = []; }
        }
        if (Array.isArray(p) && p.length > 0) {
          currentPerms = [...p];
        } else {
          currentPerms = [...(ROLE_DEFAULTS[u.role] || [])];
        }
      } else {
        currentPerms = [...ROLE_DEFAULTS.cashier];
      }

      const allKeys = [];
      SYSTEM_FUNCTIONS.forEach(g => g.items.forEach(it => allKeys.push(it.key)));

      // Render permission checkbox groups
      const renderPermissionGroups = (selectedKeys, isAdmin) => {
        return SYSTEM_FUNCTIONS.map(grp => `
          <div style="margin-bottom:14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">
              <span style="font-weight:700; font-size:12px; color:#334155; text-transform:uppercase; letter-spacing:0.5px;">${grp.group}</span>
              <button type="button" class="btn-group-toggle" data-keys="${grp.items.map(i => i.key).join(',')}" style="background:none; border:none; color:var(--primary); font-size:11px; font-weight:600; cursor:pointer; padding:0;" ${isAdmin ? 'disabled' : ''}>
                Toggle Group
              </button>
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(210px, 1fr)); gap:8px;">
              ${grp.items.map(it => {
                const checked = isAdmin || selectedKeys.includes('*') || selectedKeys.includes(it.key);
                return `
                  <label style="display:flex; align-items:flex-start; gap:8px; font-size:12px; cursor:${isAdmin ? 'not-allowed' : 'pointer'}; background:#fff; padding:6px 8px; border-radius:4px; border:1px solid #e2e8f0;">
                    <input type="checkbox" class="chk-perm" value="${it.key}" ${checked ? 'checked' : ''} ${isAdmin ? 'disabled' : ''} style="margin-top:2px;">
                    <div>
                      <div style="font-weight:600; color:#1e293b;">${it.label}</div>
                      <div style="font-size:10px; color:#64748b;">${it.desc}</div>
                    </div>
                  </label>
                `;
              }).join('')}
            </div>
          </div>
        `).join('');
      };

      overlay.innerHTML = `
        <div class="modal animate" style="max-width:720px; max-height:90vh; display:flex; flex-direction:column;">
          <div class="modal-header">
            <h3>${title}</h3>
            <button class="modal-close" id="modal-close-users">&times;</button>
          </div>
          <div class="modal-body" style="overflow-y:auto; padding:18px 20px;">
            
            <!-- User Basic Credentials -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Employee Full Name *</label>
                <input type="text" class="form-input" id="u-name" value="${isEdit ? H.esc(u.name) : ''}" placeholder="e.g. John Doe">
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Email Address</label>
                <input type="email" class="form-input" id="u-email" value="${isEdit && u.email ? H.esc(u.email) : ''}" placeholder="e.g. employee@example.com">
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Username *</label>
                <input type="text" class="form-input" id="u-username" value="${isEdit ? H.esc(u.username) : ''}" placeholder="e.g. johndoe" ${isEdit ? 'disabled' : ''}>
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Password Key ${isEdit ? '(leave blank to keep current)' : '*'}</label>
                <input type="password" class="form-input" id="u-password" placeholder="Enter secure password">
              </div>
            </div>

            <!-- Role Selection -->
            <div class="form-group" style="margin-bottom:16px; background:#f1f5f9; padding:12px; border-radius:6px; border:1px solid #cbd5e1;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <label class="form-label" style="margin:0; font-weight:700;">Base Security Role</label>
                  <p style="margin:2px 0 0 0; font-size:11px; color:#64748b;">Changing role auto-selects default recommended permissions below, which you can freely customize.</p>
                </div>
                <select class="form-select" id="u-role" style="width:220px; font-weight:600;">
                  <option value="cashier" ${isEdit && u.role === 'cashier' ? 'selected' : (!isEdit ? 'selected' : '')}>Cashier (Sales Desk)</option>
                  <option value="manager" ${isEdit && u.role === 'manager' ? 'selected' : ''}>Manager (Store Operations)</option>
                  <option value="admin" ${isEdit && u.role === 'admin' ? 'selected' : ''}>Administrator (Full Access)</option>
                </select>
              </div>
            </div>

            <!-- Granular Permissions Grid Header -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <div>
                <h4 style="margin:0; font-size:13px; font-weight:700; color:#0f172a;">Granular Function Privileges</h4>
                <p style="margin:2px 0 0 0; font-size:11px; color:#64748b;">Tick any function to grant this user access, or untick to restrict access.</p>
              </div>
              <div style="display:flex; gap:8px;">
                <button type="button" class="btn btn-secondary btn-sm" id="btn-perm-select-all" style="font-size:11px; padding:3px 10px;">Select All</button>
                <button type="button" class="btn btn-secondary btn-sm" id="btn-perm-clear-all" style="font-size:11px; padding:3px 10px;">Deselect All</button>
              </div>
            </div>

            <!-- Permissions Checklist Container -->
            <div id="permissions-container">
              ${renderPermissionGroups(currentPerms, (isEdit ? u.role : 'cashier') === 'admin')}
            </div>

          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="btn-users-cancel">Cancel</button>
            <button class="btn btn-primary" id="btn-users-save">Save Account & Permissions</button>
          </div>
        </div>
      `;

      overlay.classList.add('active');

      const close = () => overlay.classList.remove('active');
      overlay.querySelector('#modal-close-users').onclick = close;
      overlay.querySelector('#btn-users-cancel').onclick = close;

      const roleSelect = overlay.querySelector('#u-role');
      const permContainer = overlay.querySelector('#permissions-container');

      const refreshPermContainer = (keys, isAdmin) => {
        permContainer.innerHTML = renderPermissionGroups(keys, isAdmin);
        bindGroupToggles();
      };

      const bindGroupToggles = () => {
        permContainer.querySelectorAll('.btn-group-toggle').forEach(btn => {
          btn.onclick = () => {
            const keys = btn.dataset.keys.split(',');
            const chks = Array.from(permContainer.querySelectorAll('.chk-perm')).filter(c => keys.includes(c.value));
            const allChecked = chks.every(c => c.checked);
            chks.forEach(c => c.checked = !allChecked);
          };
        });
      };

      bindGroupToggles();

      // Quick Select / Deselect All
      overlay.querySelector('#btn-perm-select-all').onclick = () => {
        if (roleSelect.value === 'admin') return;
        permContainer.querySelectorAll('.chk-perm').forEach(c => c.checked = true);
      };
      overlay.querySelector('#btn-perm-clear-all').onclick = () => {
        if (roleSelect.value === 'admin') return;
        permContainer.querySelectorAll('.chk-perm').forEach(c => c.checked = false);
      };

      // Role change handler
      roleSelect.onchange = () => {
        const newRole = roleSelect.value;
        if (newRole === 'admin') {
          refreshPermContainer(allKeys, true);
        } else {
          const defaults = ROLE_DEFAULTS[newRole] || [];
          refreshPermContainer(defaults, false);
        }
      };

      // Save handler
      overlay.querySelector('#btn-users-save').onclick = async () => {
        const name = document.getElementById('u-name').value.trim();
        const email = document.getElementById('u-email').value.trim();
        const username = document.getElementById('u-username').value.trim();
        const password = document.getElementById('u-password').value;
        const role = roleSelect.value;

        if (!name || (!isEdit && !username) || (!isEdit && !password)) {
          H.showToast('Please fill all mandatory fields.', 'error');
          return;
        }

        // Collect checked permissions
        let permissions = [];
        if (role === 'admin') {
          permissions = ['*'];
        } else {
          permContainer.querySelectorAll('.chk-perm:checked').forEach(c => {
            permissions.push(c.value);
          });
        }

        const data = { name, username, role, email, permissions };
        if (password) {
          data.password = password;
        }

        if (isEdit) {
          const success = await S.update('users', u.id, data);
          if (success) {
            // If the updated user is the currently logged in user, refresh local storage
            const currentUser = S.getCurrentUser();
            if (currentUser && currentUser.id === u.id) {
              currentUser.name = name;
              currentUser.email = email;
              currentUser.role = role;
              currentUser.permissions = permissions;
              localStorage.setItem('pos_user', JSON.stringify(currentUser));
              // Refresh sidebar and route permissions
              if (window.POS && POS.App && typeof POS.App._setupSidebar === 'function') {
                POS.App._setupSidebar();
              }
            }

            H.showToast('User account & permissions updated successfully.');
            close();
            await this.updateList();
          } else {
            H.showToast('Failed to update user account.', 'error');
          }
        } else {
          data.id = 'u-' + Math.random().toString(36).substr(2, 9);
          const success = await S.add('users', data);
          if (success) {
            H.showToast('New user account and permissions created.');
            close();
            await this.updateList();
          } else {
            H.showToast('Failed to create user account.', 'error');
          }
        }
      };
    }
  };

  window.POS = window.POS || {};
  window.POS.Users = Users;
})();
