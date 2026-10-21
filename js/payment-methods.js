(function () {
  'use strict';

  const PaymentMethods = {
    async render() {
      const mc = document.getElementById('main-content');
      const H = POS.Helpers;

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <h2 class="page-title">💳 Payment Method Management</h2>
            <p class="page-subtitle">Configure accepted payment channels, brand icons, theme colors, and display order for POS checkout and the live Dashboard.</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary" id="btn-add-pm" style="font-weight:700;">+ Add Payment Method</button>
          </div>
        </div>

        <!-- Info Strip & Stats -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:14px; margin-bottom:18px;" class="fade-in">
          <div class="card" style="padding:14px 18px; border-left:4px solid var(--primary);">
            <div style="font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">Total Channels</div>
            <div id="kpi-total-pm" style="font-size:24px; font-weight:800; color:#0f172a; margin-top:4px;">--</div>
          </div>
          <div class="card" style="padding:14px 18px; border-left:4px solid #10b981;">
            <div style="font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">Active Channels</div>
            <div id="kpi-active-pm" style="font-size:24px; font-weight:800; color:#10b981; margin-top:4px;">--</div>
          </div>
          <div class="card" style="padding:14px 18px; border-left:4px solid #f59e0b;">
            <div style="font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">Inactive / Disabled</div>
            <div id="kpi-inactive-pm" style="font-size:24px; font-weight:800; color:#f59e0b; margin-top:4px;">--</div>
          </div>
          <div class="card" style="padding:14px 18px; background:linear-gradient(135deg, #f8fafc, #f1f5f9); border:1px dashed #cbd5e1; display:flex; align-items:center; gap:10px;">
            <div style="font-size:22px;">ℹ️</div>
            <div style="font-size:12px; color:#475569; line-height:1.4;">
              Active channels automatically appear in <strong>New Order</strong> & <strong>Edit Order</strong> payment splits, and in the <strong>Dashboard</strong> summary cards.
            </div>
          </div>
        </div>

        <!-- Payment Methods Table -->
        <div class="card fade-in">
          <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
            <h3>Configured Payment Channels</h3>
            <button class="btn btn-secondary btn-sm" id="btn-refresh-pm" title="Reload Channels">↻ Refresh</button>
          </div>
          <div class="card-body" style="padding:0;">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width:70px; text-align:center;">Icon</th>
                    <th>Payment Method Name</th>
                    <th>Brand Color</th>
                    <th style="width:110px; text-align:center;">Sort Order</th>
                    <th style="width:130px; text-align:center;">Status</th>
                    <th style="width:160px; text-align:center;">Actions</th>
                  </tr>
                </thead>
                <tbody id="pm-tbody">
                  <tr>
                    <td colspan="6" class="text-center text-muted" style="padding:30px;">Loading payment methods...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      document.getElementById('btn-add-pm').onclick = () => this.showAddEditModal();
      document.getElementById('btn-refresh-pm').onclick = async () => {
        await H.loadPaymentMethods();
        await this.updateList();
        H.showToast('Payment channels refreshed');
      };

      await this.updateList();
    },

    async updateList() {
      const H = POS.Helpers;
      const S = POS.Store;
      const tbody = document.getElementById('pm-tbody');
      if (!tbody) return;

      const list = await H.loadPaymentMethods();

      // Update KPIs
      const kpiTotal = document.getElementById('kpi-total-pm');
      const kpiActive = document.getElementById('kpi-active-pm');
      const kpiInactive = document.getElementById('kpi-inactive-pm');
      if (kpiTotal) kpiTotal.textContent = list.length;
      if (kpiActive) kpiActive.textContent = list.filter(m => m.status === 'active').length;
      if (kpiInactive) kpiInactive.textContent = list.filter(m => m.status !== 'active').length;

      tbody.innerHTML = '';
      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:30px;">No payment channels found. Click "+ Add Payment Method" to create one.</td></tr>`;
        return;
      }

      list.forEach((pm, idx) => {
        const isActive = pm.status === 'active';
        const color = pm.color || H.getPaymentMethodColor(pm);
        const iconHtml = H.getPaymentMethodIcon(pm.name, 38);
        const sortOrder = pm.sortOrder !== undefined ? pm.sortOrder : (idx + 1);

        const row = document.createElement('tr');
        row.innerHTML = `
          <td style="text-align:center; vertical-align:middle;">
            <div style="display:inline-flex; align-items:center; justify-content:center;">
              ${iconHtml}
            </div>
          </td>
          <td style="vertical-align:middle;">
            <div style="font-weight:700; font-size:14px; color:#0f172a;">${H.esc(pm.name)}</div>
            <div style="font-size:11px; color:#64748b;">ID: ${H.esc(pm.id || 'pm_' + pm.name.toLowerCase())}</div>
          </td>
          <td style="vertical-align:middle;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="width:18px; height:18px; border-radius:50%; background:${color}; border:1px solid rgba(0,0,0,0.1); display:inline-block; flex-shrink:0;"></span>
              <code style="font-size:12px; font-weight:700; color:#334155;">${color}</code>
            </div>
          </td>
          <td style="text-align:center; vertical-align:middle;">
            <span class="badge" style="background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; font-weight:700;">#${sortOrder}</span>
          </td>
          <td style="text-align:center; vertical-align:middle;">
            <button class="btn btn-xs btn-status-toggle" style="border-radius:20px; padding:3px 12px; font-weight:700; font-size:11px; cursor:pointer; ${
              isActive 
                ? 'background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0;' 
                : 'background:#f8fafc; color:#94a3b8; border:1px solid #cbd5e1;'
            }">
              ${isActive ? '● Active' : '○ Inactive'}
            </button>
          </td>
          <td style="text-align:center; vertical-align:middle;">
            <div style="display:flex; gap:6px; justify-content:center;">
              <button class="btn btn-secondary btn-xs btn-edit-pm" title="Edit channel details">✏️ Edit</button>
              <button class="btn btn-danger btn-xs btn-delete-pm" title="Delete payment method" style="padding:2px 8px;">🗑️</button>
            </div>
          </td>
        `;

        tbody.appendChild(row);

        // Bind events
        row.querySelector('.btn-status-toggle').onclick = async () => {
          const newStatus = isActive ? 'inactive' : 'active';
          const ok = await S.update('payment-methods', pm.id, {
            ...pm,
            status: newStatus
          });
          if (ok) {
            H.showToast(`${pm.name} is now ${newStatus}`);
            await H.loadPaymentMethods();
            await this.updateList();
          }
        };

        row.querySelector('.btn-edit-pm').onclick = () => this.showAddEditModal(pm);

        row.querySelector('.btn-delete-pm').onclick = async () => {
          if (await H.confirm(`Are you sure you want to delete payment method "${pm.name}"?`)) {
            const ok = await S.delete('payment-methods', pm.id);
            if (ok) {
              H.showToast(`Deleted ${pm.name}`);
              await H.loadPaymentMethods();
              await this.updateList();
            }
          }
        };
      });
    },

    showAddEditModal(pm = null) {
      const H = POS.Helpers;
      const S = POS.Store;
      const isEdit = !!pm;

      const formatHex = (val, fallback = '#10B981') => {
        if (!val || typeof val !== 'string') return fallback;
        let s = val.trim();
        if (!s.startsWith('#')) s = '#' + s;
        if (/^#[0-9A-Fa-f]{6}$/.test(s)) return s.toUpperCase();
        if (/^#[0-9A-Fa-f]{3}$/.test(s)) {
          return (`#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`).toUpperCase();
        }
        return fallback;
      };

      let currentName = pm ? pm.name : '';
      let currentColor = formatHex(pm ? (pm.color || H.getPaymentMethodColor(pm)) : '#10B981', '#10B981');
      let currentSort = pm ? (pm.sortOrder !== undefined ? pm.sortOrder : 10) : 10;
      let currentStatus = pm ? (pm.status || 'active') : 'active';
      let currentIcon = pm ? (pm.icon || '') : '';

      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay active';
      overlay.innerHTML = `
        <div class="modal animate" style="max-width:540px;">
          <div class="modal-header">
            <h3>${isEdit ? '✏️ Edit Payment Method' : '💳 Add Payment Method'}</h3>
            <button class="modal-close" id="pm-modal-close">&times;</button>
          </div>
          <div class="modal-body" style="display:flex; flex-direction:column; gap:16px;">
            
            <!-- Method Name -->
            <div class="form-group">
              <label class="form-label" style="font-weight:700;">Payment Method Name <span class="text-danger">*</span></label>
              <input type="text" class="form-input" id="pm-modal-name" placeholder="e.g. Upay, Amex, Apple Pay, Cheque" value="${H.esc(currentName)}" style="border:2px solid #64748b; font-weight:600;">
            </div>

            <!-- Brand Color & Display Order -->
            <div class="form-row">
              <div class="form-group" style="flex:1;">
                <label class="form-label" style="font-weight:700;">Brand Color</label>
                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="color" id="pm-modal-color" value="${currentColor}" style="width:42px; height:38px; padding:2px; border:1px solid #cbd5e1; border-radius:8px; cursor:pointer; background:#fff;">
                  <input type="text" class="form-input" id="pm-modal-color-hex" value="${currentColor}" maxlength="7" placeholder="#10B981" style="font-family:monospace; font-weight:700; text-transform:uppercase;">
                </div>
                <!-- Quick Palette -->
                <div style="display:flex; gap:6px; margin-top:8px; flex-wrap:wrap;">
                  ${['#10B981', '#3B82F6', '#E2136E', '#F7941D', '#8C3494', '#1E40AF', '#06B6D4', '#F59E0B', '#64748B', '#EF4444', '#8B5CF6', '#14B8A6'].map(c => 
                    `<button type="button" class="btn-color-swatch" data-color="${c}" style="width:22px; height:22px; border-radius:50%; background:${c}; border:2px solid #fff; box-shadow:0 1px 3px rgba(0,0,0,0.2); cursor:pointer; padding:0; transition:transform 0.15s ease;" title="${c}"></button>`
                  ).join('')}
                </div>
              </div>

              <div class="form-group" style="flex:1;">
                <label class="form-label" style="font-weight:700;">Display Order & Status</label>
                <div style="display:flex; gap:8px;">
                  <input type="number" class="form-input" id="pm-modal-sort" value="${currentSort}" min="1" max="99" style="width:70px; text-align:center; font-weight:700;" title="Order on checkout dropdown">
                  <select class="form-select" id="pm-modal-status" style="flex:1; font-weight:600;">
                    <option value="active" ${currentStatus === 'active' ? 'selected' : ''}>Active</option>
                    <option value="inactive" ${currentStatus === 'inactive' ? 'selected' : ''}>Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Icon Setup -->
            <div class="form-group" style="border-top:1px solid #e2e8f0; padding-top:12px;">
              <label class="form-label" style="font-weight:700; margin-bottom:8px;">Method Icon / Logo</label>
              
              <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px; margin-bottom:10px;">
                <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px;">
                  <button type="button" class="btn btn-secondary btn-sm" id="btn-pm-pick-gallery" style="font-weight:700;">
                    🖼️ Choose from Gallery
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm" id="btn-pm-upload-device" style="font-weight:700;">
                    📤 Upload from Device
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm" id="btn-pm-tab-presets" style="font-weight:700;">
                    ⚡ Preset Icons
                  </button>
                </div>
                
                <div style="display:flex; gap:6px; align-items:center;">
                  <input type="text" class="form-input" id="pm-modal-url" placeholder="Or paste image URL / Base64..." value="${currentIcon.startsWith('http') || currentIcon.startsWith('/') || currentIcon.startsWith('data:') ? H.esc(currentIcon) : ''}" style="font-size:11px; height:30px; flex:1;">
                  <button type="button" class="btn btn-secondary btn-xs" id="btn-pm-clear-icon" style="color:#ef4444;" title="Clear Icon">✕ Clear</button>
                </div>
              </div>

              <!-- Tab 3: Presets -->
              <div id="tab-content-preset" style="display:none; background:#f8fafc; border:1px solid #e2e8f0; border-radius:var(--radius-sm); padding:10px;">
                <div style="font-size:11px; color:#64748b; margin-bottom:8px;">Click to assign an authentic preset SVG icon:</div>
                <div style="display:flex; gap:8px; flex-wrap:wrap;" id="preset-icons-container">
                  ${['bKash', 'Nagad', 'Rocket', 'Bank Transfer', 'Cash', 'Card', 'Other'].map(name => `
                    <button type="button" class="btn-preset-icon" data-name="${name}" style="padding:6px; border-radius:8px; border:1.5px solid #e2e8f0; background:#fff; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:4px; min-width:60px;">
                      ${H.getPaymentMethodIcon(name, 32)}
                      <span style="font-size:9px; font-weight:700; color:#475569;">${name}</span>
                    </button>
                  `).join('')}
                </div>
              </div>
            </div>

            <!-- Live Preview Mockup Box -->
            <div style="background:linear-gradient(135deg, #f8fafc, #edf2f7); border:1px solid #cbd5e1; border-radius:10px; padding:14px;">
              <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Live Preview</div>
              
              <div style="display:flex; gap:16px; align-items:center; flex-wrap:wrap;">
                <!-- 1. Cart / Dropdown Icon -->
                <div style="display:flex; align-items:center; gap:8px; background:#fff; padding:6px 12px; border-radius:8px; border:1px solid #e2e8f0; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
                  <div id="preview-icon-small"></div>
                  <div style="font-size:12px; font-weight:700;" id="preview-name-small">${H.esc(currentName) || 'Channel'}</div>
                </div>

                <!-- 2. Dashboard Settlement Card Mockup -->
                <div style="background:#fff; border:1px solid #cbd5e1; border-radius:10px; padding:10px 14px; min-width:200px; box-shadow:0 2px 4px rgba(0,0,0,0.04);">
                  <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                      <div id="preview-icon-card"></div>
                      <div>
                        <div style="font-weight:700; font-size:13px; color:#1e293b;" id="preview-name-card">${H.esc(currentName) || 'Channel'}</div>
                        <div style="font-size:10px; color:#64748b;">14 transactions</div>
                      </div>
                    </div>
                    <span style="font-size:9px; font-weight:700; color:#16a34a; background:#f0fdf4; border:1px solid #bbf7d0; padding:1px 6px; border-radius:10px;">Active</span>
                  </div>
                  <div style="font-size:15px; font-weight:800; color:#0f172a; margin-top:8px;">৳45,200.00</div>
                  <div style="width:100%; height:4px; background:#f1f5f9; border-radius:4px; margin-top:4px; overflow:hidden;">
                    <div id="preview-card-bar" style="width:65%; height:100%; background:${currentColor}; border-radius:4px;"></div>
                  </div>
                </div>
              </div>
            </div>

          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="pm-modal-cancel">Cancel</button>
            <button class="btn btn-primary" id="pm-modal-save" style="font-weight:700;">${isEdit ? 'Save Changes' : 'Create Channel'}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      const nameInput = overlay.querySelector('#pm-modal-name');
      const colorPicker = overlay.querySelector('#pm-modal-color');
      const colorHexInput = overlay.querySelector('#pm-modal-color-hex');
      const sortInput = overlay.querySelector('#pm-modal-sort');
      const statusSelect = overlay.querySelector('#pm-modal-status');
      const urlInput = overlay.querySelector('#pm-modal-url');

      const tabContentPreset = overlay.querySelector('#tab-content-preset');

      const previewIconSmall = overlay.querySelector('#preview-icon-small');
      const previewIconCard = overlay.querySelector('#preview-icon-card');
      const previewNameSmall = overlay.querySelector('#preview-name-small');
      const previewNameCard = overlay.querySelector('#preview-name-card');
      const previewCardBar = overlay.querySelector('#preview-card-bar');

      setTimeout(() => nameInput.focus(), 80);

      // Render live preview
      const updatePreview = () => {
        const name = nameInput.value.trim() || 'Channel';
        const color = formatHex(colorHexInput.value || colorPicker.value, '#10B981');
        previewNameSmall.textContent = name;
        previewNameCard.textContent = name;
        previewCardBar.style.backgroundColor = color;

        // Custom icon preview
        if (currentIcon && currentIcon.trim()) {
          const iconStr = currentIcon.trim();
          if (iconStr.startsWith('<svg')) {
            previewIconSmall.innerHTML = iconStr.replace(/width="[^"]*"/, 'width="28"').replace(/height="[^"]*"/, 'height="28"');
            previewIconCard.innerHTML = iconStr.replace(/width="[^"]*"/, 'width="36"').replace(/height="[^"]*"/, 'height="36"');
          } else {
            previewIconSmall.innerHTML = `<img src="${iconStr}" style="width:28px; height:28px; object-fit:contain; border-radius:6px;">`;
            previewIconCard.innerHTML = `<img src="${iconStr}" style="width:36px; height:36px; object-fit:contain; border-radius:6px;">`;
          }
        } else {
          // Fallback to helper icon with current color
          const tempHelper = {
            paymentMethodsList: [{ name, color, icon: '' }],
            getPaymentMethodColor: () => color,
            esc: H.esc
          };
          previewIconSmall.innerHTML = H.getPaymentMethodIcon.call(tempHelper, name, 28);
          previewIconCard.innerHTML = H.getPaymentMethodIcon.call(tempHelper, name, 36);
        }
      };

      const setColor = (newColor) => {
        const hex = formatHex(newColor, colorPicker.value || '#10B981');
        colorPicker.value = hex;
        colorHexInput.value = hex;
        updatePreview();
      };

      // Two-way synchronization for color picker and hex text input
      colorPicker.addEventListener('input', () => {
        colorHexInput.value = colorPicker.value.toUpperCase();
        updatePreview();
      });
      colorPicker.addEventListener('change', () => {
        colorHexInput.value = colorPicker.value.toUpperCase();
        updatePreview();
      });

      colorHexInput.addEventListener('input', () => {
        let val = colorHexInput.value.trim();
        if (val && !val.startsWith('#')) val = '#' + val;
        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
          colorPicker.value = val;
        }
        updatePreview();
      });
      colorHexInput.addEventListener('blur', () => {
        setColor(colorHexInput.value);
      });

      // Quick palette swatch buttons
      overlay.querySelectorAll('.btn-color-swatch').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const c = btn.dataset.color;
          if (c) setColor(c);
        });
      });

      // Name & URL live preview updates
      nameInput.addEventListener('input', () => updatePreview());
      urlInput.addEventListener('input', () => {
        currentIcon = urlInput.value.trim();
        updatePreview();
      });

      updatePreview();

      // Gallery & Device Upload handlers
      const btnPmGallery = overlay.querySelector('#btn-pm-pick-gallery');
      const btnPmUpload = overlay.querySelector('#btn-pm-upload-device');
      const btnPmPresets = overlay.querySelector('#btn-pm-tab-presets');
      const btnPmClear = overlay.querySelector('#btn-pm-clear-icon');

      btnPmGallery.onclick = () => {
        H.openMediaPicker({
          title: 'Choose Payment Logo from Gallery',
          folderName: 'Payment Methods',
          folderId: 'folder_payment_methods',
          activeTab: 'gallery',
          onSelect: (url) => {
            currentIcon = url;
            urlInput.value = url;
            updatePreview();
          }
        });
      };

      btnPmUpload.onclick = () => {
        H.openMediaPicker({
          title: 'Upload Payment Logo from Device',
          folderName: 'Payment Methods',
          folderId: 'folder_payment_methods',
          activeTab: 'upload',
          onSelect: (url) => {
            currentIcon = url;
            urlInput.value = url;
            updatePreview();
          }
        });
      };

      btnPmClear.onclick = () => {
        currentIcon = '';
        urlInput.value = '';
        updatePreview();
      };

      btnPmPresets.onclick = () => {
        const isShown = tabContentPreset.style.display !== 'none';
        tabContentPreset.style.display = isShown ? 'none' : 'block';
        btnPmPresets.classList.toggle('active', !isShown);
      };

      // Preset click handler
      overlay.querySelectorAll('.btn-preset-icon').forEach(btn => {
        btn.onclick = () => {
          const presetName = btn.dataset.name;
          currentIcon = H.getPaymentMethodIcon(presetName, 48);
          if (!nameInput.value.trim()) {
            nameInput.value = presetName;
          }
          const c = H.getPaymentMethodColor(presetName);
          setColor(c);
          H.showToast(`Selected ${presetName} icon preset`);
        };
      });

      const close = () => overlay.remove();
      overlay.querySelector('#pm-modal-close').onclick = close;
      overlay.querySelector('#pm-modal-cancel').onclick = close;

      // Save handler
      overlay.querySelector('#pm-modal-save').onclick = async () => {
        const name = nameInput.value.trim();
        if (!name) {
          H.showToast('Please enter a payment method name', 'warning');
          nameInput.focus();
          return;
        }

        const color = formatHex(colorHexInput.value || colorPicker.value, '#10B981');
        const sortOrder = parseInt(sortInput.value) || 10;
        const status = statusSelect.value;
        const id = pm ? pm.id : ('pm_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_'));

        const payload = {
          id,
          name,
          color,
          sortOrder,
          status,
          icon: currentIcon || ''
        };

        const res = isEdit
          ? await S.update('payment-methods', id, payload)
          : await S.add('payment-methods', payload);

        if (res) {
          H.showToast(`Payment method "${name}" saved successfully!`);
          close();
          await H.loadPaymentMethods();
          await this.updateList();
        }
      };
    }
  };

  window.POS = window.POS || {};
  window.POS.PaymentMethods = PaymentMethods;
})();
