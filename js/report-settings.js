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
              <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:20px; padding-bottom:20px; border-bottom:1px solid #f1f5f9;">
                <div style="flex:1;">
                  <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:18px;">🏢</span>
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

              <!-- Setting 2: Add Ingredient Cost as Expense -->
              <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:20px; padding:20px 0; border-bottom:1px solid #f1f5f9;">
                <div style="flex:1;">
                  <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:18px;">🥬</span>
                    <h4 style="margin:0; font-size:15px; font-weight:700; color:#1e293b;">Add Ingredient Cost as Expense</h4>
                    <span id="badge-ingredient-expense-status"></span>
                  </div>
                  <p style="margin:6px 0 0; font-size:13px; color:#475569; line-height:1.5;">
                    Add culinary ingredients and raw material costs as an Expense. If the button is ON, ingredient purchases will count as an Expense in the Report and Dashboard.
                  </p>
                  <div id="ingredient-expense-info" style="margin-top:10px; font-size:12px; padding:8px 12px; border-radius:6px;"></div>
                </div>
                <div style="flex-shrink:0;">
                  <button class="btn" id="btn-toggle-ingredient-expense" style="min-width:110px; font-weight:700;"></button>
                </div>
              </div>

              <!-- Setting 3: Add Expired & Waste as Expense -->
              <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:20px; padding:20px 0; border-bottom:1px solid #f1f5f9;">
                <div style="flex:1;">
                  <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:18px;">🗑️</span>
                    <h4 style="margin:0; font-size:15px; font-weight:700; color:#1e293b;">Add Expired & Waste as Expense</h4>
                    <span id="badge-waste-expense-status"></span>
                  </div>
                  <p style="margin:6px 0 0; font-size:13px; color:#475569; line-height:1.5;">
                    Add damaged, spoiled, or expired items as an Expense. If the button is ON, waste loss will count as an Expense in the Report and Dashboard.
                  </p>
                  <div id="waste-expense-info" style="margin-top:10px; font-size:12px; padding:8px 12px; border-radius:6px;"></div>
                </div>
                <div style="flex-shrink:0;">
                  <button class="btn" id="btn-toggle-waste-expense" style="min-width:110px; font-weight:700;"></button>
                </div>
              </div>

              <!-- Information Guide Box -->
              <div style="margin-top:20px; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:8px; padding:14px 16px;">
                <h5 style="margin:0 0 6px; font-size:13px; font-weight:700; color:#334155;">💡 How this affects your business metrics:</h5>
                <ul style="margin:0; padding-left:18px; font-size:12px; color:#64748b; line-height:1.6;">
                  <li><strong>Suppliers Payment:</strong> When ON, supplier dues settlements are counted towards total expenses and deducted from net profit.</li>
                  <li><strong>Ingredient Cost:</strong> When ON, raw kitchen inventory and ingredient purchases are counted towards total expenses.</li>
                  <li><strong>Expired & Waste:</strong> When ON, losses from damaged, spoiled, or expired items are deducted as expenses from overall profit.</li>
                  <li><strong>When OFF:</strong> Costs remain isolated in their dedicated ledgers without inflating general operational expenses.</li>
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
      const settings = (await S.getSettings()) || {};

      // Helper function to bind toggle buttons
      const bindToggle = (key, badgeId, btnId, infoId, titleName) => {
        const isEnabled = settings[key] === '1';
        const badgeEl = document.getElementById(badgeId);
        const toggleBtn = document.getElementById(btnId);
        const infoEl = document.getElementById(infoId);
        if (!toggleBtn || !badgeEl || !infoEl) return;

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
          infoEl.innerHTML = `✅ <strong>Currently Active:</strong> ${titleName} is counted into total expenses and deducted from overall net profit.`;
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
          infoEl.innerHTML = `ℹ️ <strong>Currently Inactive:</strong> ${titleName} is tracked independently and not added into general operational expenses.`;
        }

        toggleBtn.onclick = async () => {
          toggleBtn.disabled = true;
          toggleBtn.textContent = 'Updating...';

          const nextVal = isEnabled ? '0' : '1';
          const res = await S.updateSettings({ [key]: nextVal });

          if (res && res.success !== false) {
            H.showToast(
              nextVal === '1' 
                ? `Turned ON: ${titleName} is now counted as Expenses.` 
                : `Turned OFF: ${titleName} excluded from Expenses.`,
              'success'
            );
            await this.loadSettingsState();
          } else {
            H.showToast('Failed to update setting. Please try again.', 'error');
            toggleBtn.disabled = false;
          }
        };
      };

      bindToggle('supplier_as_expense', 'badge-supplier-expense-status', 'btn-toggle-supplier-expense', 'supplier-expense-info', 'Supplier Payments');
      bindToggle('ingredient_as_expense', 'badge-ingredient-expense-status', 'btn-toggle-ingredient-expense', 'ingredient-expense-info', 'Ingredient Cost');
      bindToggle('waste_as_expense', 'badge-waste-expense-status', 'btn-toggle-waste-expense', 'waste-expense-info', 'Expired & Waste');
    }
  };

  window.POS = window.POS || {};
  window.POS.ReportSettings = ReportSettings;
})();
