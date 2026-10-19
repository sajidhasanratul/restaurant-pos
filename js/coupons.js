(function () {
  'use strict';

  const Coupons = {
    currentTaxPercent: 5.0,
    currentTaxStatus: 'enabled',

    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

      // Fetch saved settings for tax rate
      try {
        const settings = await S.getSettings();
        if (settings) {
          if (settings.order_tax_percent !== undefined) {
            this.currentTaxPercent = parseFloat(settings.order_tax_percent);
            if (isNaN(this.currentTaxPercent)) this.currentTaxPercent = 5.0;
          }
          if (settings.order_tax_status) {
            this.currentTaxStatus = settings.order_tax_status;
          }
        }
      } catch (err) {
        console.warn('Could not load tax settings:', err);
      }

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <h2 class="page-title" style="display:flex; align-items:center; gap:8px;">
              <span>🏷️</span> Coupon and Tax
            </h2>
            <p class="page-subtitle">Configure discount coupon codes and fix default sales tax (VAT) for customer orders.</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary btn-sm" id="btn-add-coupon" style="background:#10B981; border-color:#10B981; font-weight:700;">
              + Add New Coupon
            </button>
          </div>
        </div>

        <!-- ── Order Tax Configuration Card ── -->
        <div class="card fade-in mb-3" style="border-radius:14px; border:1px solid #BBF7D0; background:linear-gradient(135deg, #ffffff 0%, #F0FDF4 100%); box-shadow:0 2px 8px rgba(16,185,129,0.06);">
          <div class="card-body" style="padding:22px 24px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">
              
              <div style="display:flex; align-items:center; gap:16px; flex:1; min-width:280px;">
                <div style="width:52px; height:52px; border-radius:14px; background:#DCFCE7; color:#15803D; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:900; flex-shrink:0;">
                  %
                </div>
                <div>
                  <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <h3 style="font-size:16px; font-weight:800; color:#14532D; margin:0;">Fix Order Tax / VAT Rate</h3>
                    <span id="badge-tax-status" class="badge" style="background:${this.currentTaxStatus === 'enabled' ? '#DCFCE7' : '#FEE2E2'}; color:${this.currentTaxStatus === 'enabled' ? '#15803D' : '#991B1B'}; font-weight:800; font-size:11px;">
                      ${this.currentTaxStatus === 'enabled' ? `${this.currentTaxPercent}% Active` : 'Tax Disabled (0%)'}
                    </span>
                  </div>
                  <p style="font-size:12.5px; color:#475569; margin:4px 0 0; line-height:1.4;">
                    Set the fixed tax percentage automatically applied to all orders at POS checkout and printed on thermal customer receipts.
                  </p>
                </div>
              </div>

              <!-- Form controls -->
              <div style="display:flex; flex-direction:column; gap:10px; width:360px; max-width:100%;">
                <div style="display:flex; gap:10px; align-items:center;">
                  <div style="flex:1;">
                    <label style="font-size:11.5px; font-weight:700; color:#166534; display:block; margin-bottom:4px;">Tax Rate (%)</label>
                    <input type="number" step="0.1" min="0" max="100" class="form-input" id="input-order-tax-rate" value="${this.currentTaxPercent}" style="font-size:14px; font-weight:800; padding:6px 12px; height:40px; border-color:#86EFAC; background:#fff;">
                  </div>
                  <div style="width:140px;">
                    <label style="font-size:11.5px; font-weight:700; color:#166534; display:block; margin-bottom:4px;">Tax Status</label>
                    <select class="form-select" id="select-order-tax-status" style="font-size:12.5px; font-weight:600; height:40px; border-color:#86EFAC; background:#fff;">
                      <option value="enabled" ${this.currentTaxStatus === 'enabled' ? 'selected' : ''}>Active</option>
                      <option value="disabled" ${this.currentTaxStatus === 'disabled' ? 'selected' : ''}>Disabled</option>
                    </select>
                  </div>
                </div>

                <!-- Quick Presets -->
                <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                  <span style="font-size:11px; font-weight:700; color:#475569;">Quick:</span>
                  <button type="button" class="btn btn-secondary btn-xs btn-tax-preset" data-val="0" style="padding:2px 8px; font-size:11px; font-weight:700;">0% (None)</button>
                  <button type="button" class="btn btn-secondary btn-xs btn-tax-preset" data-val="5" style="padding:2px 8px; font-size:11px; font-weight:700;">5% (Std)</button>
                  <button type="button" class="btn btn-secondary btn-xs btn-tax-preset" data-val="7.5" style="padding:2px 8px; font-size:11px; font-weight:700;">7.5%</button>
                  <button type="button" class="btn btn-secondary btn-xs btn-tax-preset" data-val="10" style="padding:2px 8px; font-size:11px; font-weight:700;">10%</button>
                  <button type="button" class="btn btn-secondary btn-xs btn-tax-preset" data-val="15" style="padding:2px 8px; font-size:11px; font-weight:700;">15% (VAT)</button>
                </div>

                <div style="display:flex; justify-content:flex-end; margin-top:4px;">
                  <button class="btn btn-primary btn-sm" id="btn-save-order-tax" style="background:#16A34A; border-color:#16A34A; font-weight:700; height:36px; padding:0 18px;">
                    💾 Save Tax Settings
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

        <!-- ── Coupons Section ── -->
        <div class="card fade-in">
          <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid #EAE4D9; background:#FAF8F5;">
            <div style="font-weight:800; font-size:14px; color:#1E293B; display:flex; align-items:center; gap:8px;">
              <span>🎟️</span> Promotional Coupons List
            </div>
            <div style="width:240px;">
              <input type="text" class="form-input" id="coupon-search-input" placeholder="Search coupon code..." style="height:34px; font-size:12.5px; border-radius:20px; padding:0 14px;">
            </div>
          </div>
          <div class="card-body" style="padding:0;">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Coupon Code</th>
                    <th>Discount Type</th>
                    <th>Discount Value</th>
                    <th style="width: 110px; text-align: center;">Actions</th>
                  </tr>
                </thead>
                <tbody id="coupons-tbody">
                  <tr>
                    <td colspan="4" class="text-center text-muted" style="padding:28px;">Loading coupons...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="modal-overlay" id="coupon-modal-overlay"></div>
      `;

      this.bindTaxEvents();
      document.getElementById('btn-add-coupon').onclick = () => this.showAddModal();
      document.getElementById('coupon-search-input').oninput = (e) => this.filterCouponsLocally(e.target.value);
      await this.updateList();
    },

    bindTaxEvents() {
      const S = POS.Store;
      const H = POS.Helpers;

      const taxInput = document.getElementById('input-order-tax-rate');
      const statusSelect = document.getElementById('select-order-tax-status');
      const badgeStatus = document.getElementById('badge-tax-status');
      const saveBtn = document.getElementById('btn-save-order-tax');

      document.querySelectorAll('.btn-tax-preset').forEach(btn => {
        btn.onclick = () => {
          taxInput.value = btn.dataset.val;
          if (parseFloat(btn.dataset.val) === 0) {
            statusSelect.value = 'disabled';
          } else {
            statusSelect.value = 'enabled';
          }
        };
      });

      saveBtn.onclick = async () => {
        const rate = parseFloat(taxInput.value);
        if (isNaN(rate) || rate < 0 || rate > 100) {
          H.showToast('Please enter a valid tax percentage between 0 and 100', 'error');
          return;
        }

        const status = statusSelect.value;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        try {
          const res = await S.updateSettings({
            order_tax_percent: String(rate),
            order_tax_status: status
          });

          this.currentTaxPercent = rate;
          this.currentTaxStatus = status;

          if (badgeStatus) {
            if (status === 'enabled') {
              badgeStatus.style.background = '#DCFCE7';
              badgeStatus.style.color = '#15803D';
              badgeStatus.textContent = `${rate}% Active`;
            } else {
              badgeStatus.style.background = '#FEE2E2';
              badgeStatus.style.color = '#991B1B';
              badgeStatus.textContent = 'Tax Disabled (0%)';
            }
          }

          H.showToast(`Order tax rate updated to ${status === 'enabled' ? rate + '%' : '0% (Disabled)'}!`, 'success');
        } catch (err) {
          H.showToast('Error saving tax settings: ' + err.message, 'error');
        } finally {
          saveBtn.disabled = false;
          saveBtn.textContent = '💾 Save Tax Settings';
        }
      };
    },

    allCoupons: [],

    async updateList() {
      const S = POS.Store;
      const H = POS.Helpers;
      const tbody = document.getElementById('coupons-tbody');
      if (!tbody) return;

      try {
        const list = await S.getAll('coupons');
        this.allCoupons = list || [];
        this.filterCouponsLocally('');
      } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted" style="padding:24px;">Error loading coupons: ${H.escapeHtml(err.message)}</td></tr>`;
      }
    },

    filterCouponsLocally(query = '') {
      const H = POS.Helpers;
      const S = POS.Store;
      const tbody = document.getElementById('coupons-tbody');
      if (!tbody) return;

      const q = query.toLowerCase().trim();
      const filtered = this.allCoupons.filter(c => !q || (c.code || '').toLowerCase().includes(q));

      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="4" class="text-center text-muted" style="padding:28px;">
              ${q ? 'No coupons found matching your search.' : 'No coupons configured yet. Click "+ Add New Coupon" to create one.'}
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = filtered.map(c => {
        const isPercent = c.discountType === 'percentage';
        const valText = isPercent 
          ? `${parseFloat(c.discountValue)}%` 
          : H.formatCurrency(c.discountValue);

        return `
          <tr>
            <td style="font-weight:800; color:#1E293B; letter-spacing:1px; font-size:14px;">
              <span style="background:#F1F5F9; padding:4px 10px; border-radius:6px; border:1px solid #E2E8F0;">
                ${H.escapeHtml(c.code)}
              </span>
            </td>
            <td>
              <span class="badge" style="background:${isPercent ? '#EFF6FF' : '#F0FDF4'}; color:${isPercent ? '#2563EB' : '#16A34A'}; font-weight:700;">
                ${isPercent ? 'Percentage (%)' : 'Fixed Amount (৳)'}
              </span>
            </td>
            <td style="font-weight:800; font-size:14px; color:#0F172A;">
              ${valText}
            </td>
            <td style="text-align:center;">
              <button class="btn btn-secondary btn-xs btn-delete-coupon" data-code="${H.escapeHtml(c.code)}" style="color:#EF4444; font-weight:600;" title="Delete Coupon">
                🗑️ Delete
              </button>
            </td>
          </tr>
        `;
      }).join('');

      tbody.querySelectorAll('.btn-delete-coupon').forEach(btn => {
        btn.onclick = async () => {
          const code = btn.dataset.code;
          if (confirm(`Are you sure you want to delete coupon "${code}"?`)) {
            const ok = await S.delete('coupons', code);
            if (ok) {
              H.showToast(`Coupon "${code}" deleted successfully!`);
              await this.updateList();
            } else {
              H.showToast('Could not delete coupon', 'error');
            }
          }
        };
      });
    },

    showAddModal() {
      const S = POS.Store;
      const H = POS.Helpers;
      const overlay = document.getElementById('coupon-modal-overlay');
      if (!overlay) return;

      overlay.innerHTML = `
        <div class="modal animate" style="max-width:420px; border-radius:14px; overflow:hidden;">
          <div class="modal-header" style="background:#F8FAFC; border-bottom:1px solid #E2E8F0; padding:16px 20px;">
            <h3 style="margin:0; font-size:16px; font-weight:800; color:#0F172A; display:flex; align-items:center; gap:8px;">
              🎟️ Create Promotional Coupon
            </h3>
            <button class="modal-close" id="modal-close-coupon">&times;</button>
          </div>
          <div class="modal-body" style="padding:20px; display:flex; flex-direction:column; gap:14px;">
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label" style="font-size:12px; font-weight:700; color:#334155;">Coupon Code (Uppercase) <span style="color:#ef4444;">*</span></label>
              <input type="text" class="form-input" id="coup-code" placeholder="e.g. SAVE20, WELCOME10, VIP50" required style="text-transform:uppercase; font-weight:800; letter-spacing:1px; height:40px;">
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label" style="font-size:12px; font-weight:700; color:#334155;">Discount Type</label>
              <select class="form-select" id="coup-type" style="height:40px; font-size:13px; font-weight:600;">
                <option value="percentage">Percentage (%)</option>
                <option value="amount">Fixed Amount (৳)</option>
              </select>
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label" style="font-size:12px; font-weight:700; color:#334155;">Discount Value <span style="color:#ef4444;">*</span></label>
              <input type="number" step="0.01" class="form-input" id="coup-val" placeholder="e.g. 10 for 10% or 50 for ৳50" min="0.01" required style="height:40px; font-size:14px; font-weight:700;">
            </div>
          </div>
          <div class="modal-footer" style="padding:14px 20px; background:#F8FAFC; border-top:1px solid #E2E8F0; display:flex; justify-content:flex-end; gap:10px;">
            <button class="btn btn-secondary" id="btn-coupon-cancel">Cancel</button>
            <button class="btn btn-primary" id="btn-coupon-save" style="background:#10B981; border-color:#10B981; font-weight:700;">
              Create Coupon
            </button>
          </div>
        </div>
      `;

      overlay.classList.add('active');

      const close = () => overlay.classList.remove('active');
      document.getElementById('modal-close-coupon').onclick = close;
      document.getElementById('btn-coupon-cancel').onclick = close;

      document.getElementById('btn-coupon-save').onclick = async () => {
        const code = document.getElementById('coup-code').value.trim().toUpperCase();
        const discountType = document.getElementById('coup-type').value;
        const discountValue = parseFloat(document.getElementById('coup-val').value) || 0;

        if (!code) {
          H.showToast('Please enter a coupon code.', 'error');
          return;
        }
        if (discountValue <= 0) {
          H.showToast('Please enter a discount value greater than 0.', 'error');
          return;
        }

        const res = await S.add('coupons', { code, discountType, discountValue });
        if (res) {
          H.showToast(`Coupon "${code}" created successfully!`);
          close();
          await this.updateList();
        }
      };
    }
  };

  window.POS = window.POS || {};
  window.POS.Coupons = Coupons;
})();
