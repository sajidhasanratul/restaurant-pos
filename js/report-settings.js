(function () {
  'use strict';

  const ReportSettings = {
    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <div style="display:flex; align-items:center; gap:10px;">
              <h2 class="page-title" style="margin:0;">⚙️ Report Settings</h2>
              <span class="badge" style="background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; font-weight:700;">Financial Rules</span>
            </div>
            <p class="page-subtitle" style="margin-top:4px;">Configure reporting computations, expense consolidation, and financial metrics logic.</p>
          </div>
        </div>

        <div class="fade-in" style="max-width: 800px;">
          <!-- Financial Calculations Card -->
          <div class="card" style="border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.04); margin-bottom:20px; overflow:hidden;">
            <div class="card-header" style="background:#f8fafc; border-bottom:1px solid #e2e8f0; padding:16px 20px;">
              <h3 style="margin:0; font-size:16px; font-weight:700; color:#0f172a; display:flex; align-items:center; gap:8px;">
                <span>📊</span> Expense & Profit Reporting Rules
              </h3>
              <p style="margin:4px 0 0; font-size:12px; color:#64748b;">Determine how supplier disbursements and operational costs are factored into overall business performance.</p>
            </div>

            <div class="card-body" style="padding:24px 20px;">
              <!-- Setting 1: Add Suppliers Payment as Expense -->
              <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:20px; padding-bottom:24px; border-bottom:1px solid #f1f5f9;">
                <div style="flex:1;">
                  <div style="display:flex; align-items:center; gap:10px;">
                    <h4 style="margin:0; font-size:15px; font-weight:700; color:#1e293b;">Add Suppliers Payment as Expense</h4>
                    <span id="badge-supplier-expense-status"></span>
                  </div>
                  <p style="margin:6px 0 0; font-size:13px; color:#475569; line-height:1.5;">
                    Add suppliers payment as an Expense. If the button is ON, the supplier payment will count as an Expense in the Report and Dashboard.
                  </p>
                  <div id="supplier-expense-info" style="margin-top:10px; font-size:12px; padding:8px 12px; border-radius:6px;"></div>
                </div>
                <div style="flex-shrink:0;">
                  <button class="btn" id="btn-toggle-supplier-expense" style="min-width:110px; font-weight:700;"></button>
                </div>
              </div>

              <!-- Information Guide Box -->
              <div style="margin-top:20px; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:8px; padding:14px 16px;">
                <h5 style="margin:0 0 6px; font-size:13px; font-weight:700; color:#334155;">💡 How this affects your business metrics:</h5>
                <ul style="margin:0; padding-left:18px; font-size:12px; color:#64748b; line-height:1.6;">
                  <li><strong>When ON:</strong> Total Expenses in the Executive Dashboard and Overall Profit Report will include both direct operational expenses (rent, bills, salaries) and supplier payments. Overall Net Profit will be calculated as <code>Product Profit - (Expenses + Supplier Payments)</code>.</li>
                  <li><strong>When OFF:</strong> Operational expenses and supplier procurement payments remain separated in their individual ledgers.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      `;

      await this.loadSettingsState();
    },

    async loadSettingsState() {
      const S = POS.Store;
      const H = POS.Helpers;
      const settings = await S.getSettings();

      const isEnabled = settings.supplier_as_expense === '1';

      const badgeEl = document.getElementById('badge-supplier-expense-status');
      const toggleBtn = document.getElementById('btn-toggle-supplier-expense');
      const infoEl = document.getElementById('supplier-expense-info');

      if (!toggleBtn) return;

      if (isEnabled) {
        badgeEl.innerHTML = `<span class="badge" style="background:#ecfdf5; color:#059669; border:1px solid #a7f3d0; font-weight:700; font-size:11px;">Active (ON)</span>`;
        toggleBtn.textContent = 'Turn Off';
        toggleBtn.className = 'btn btn-secondary';
        toggleBtn.style.color = 'var(--danger)';
        toggleBtn.style.borderColor = '#fca5a5';
        toggleBtn.style.background = '#fff';

        infoEl.style.background = '#ecfdf5';
        infoEl.style.color = '#065f46';
        infoEl.style.border = '1px solid #a7f3d0';
        infoEl.innerHTML = `✅ <strong>Currently Active:</strong> Supplier payments are counted into total expenses and deducted from net profit on Dashboard and Reports.`;
      } else {
        badgeEl.innerHTML = `<span class="badge" style="background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1; font-weight:700; font-size:11px;">Inactive (OFF)</span>`;
        toggleBtn.textContent = 'Turn On';
        toggleBtn.className = 'btn btn-primary';
        toggleBtn.style.color = '#fff';
        toggleBtn.style.borderColor = '';
        toggleBtn.style.background = '';

        infoEl.style.background = '#f8fafc';
        infoEl.style.color = '#64748b';
        infoEl.style.border = '1px solid #e2e8f0';
        infoEl.innerHTML = `ℹ️ <strong>Currently Inactive:</strong> Supplier payments are tracked independently and not counted as operational expenses.`;
      }

      toggleBtn.onclick = async () => {
        toggleBtn.disabled = true;
        toggleBtn.textContent = 'Updating...';

        const nextVal = isEnabled ? '0' : '1';
        const res = await S.updateSettings({ supplier_as_expense: nextVal });

        if (res && res.success !== false) {
          H.showToast(
            nextVal === '1' 
              ? 'Turned ON: Supplier payments are now counted as Expenses.' 
              : 'Turned OFF: Supplier payments excluded from Expenses.',
            'success'
          );
          await this.loadSettingsState();
        } else {
          H.showToast('Failed to update setting. Please try again.', 'error');
          toggleBtn.disabled = false;
        }
      };
    }
  };

  window.POS = window.POS || {};
  window.POS.ReportSettings = ReportSettings;
})();
