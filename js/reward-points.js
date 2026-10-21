(function () {
  'use strict';

  const RewardPoints = {
    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <div style="display:flex; align-items:center; gap:10px;">
              <h2 class="page-title" style="margin:0;">🎁 Reward Point Settings</h2>
              <span class="badge" id="rp-header-badge" style="background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; font-weight:700;">Loyalty Program</span>
            </div>
            <p class="page-subtitle" style="margin-top:4px;">Configure customer loyalty points earning rates, spend thresholds, and points redemption cash value.</p>
          </div>
        </div>

        <div class="fade-in" style="max-width: 820px;">
          <div class="card" style="border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.04); margin-bottom:20px; overflow:hidden;">
            <div class="card-header" style="background:#f8fafc; border-bottom:1px solid #e2e8f0; padding:16px 20px;">
              <h3 style="margin:0; font-size:16px; font-weight:700; color:#0f172a; display:flex; align-items:center; gap:8px;">
                <span>⚙️</span> Customer Reward Point Rules
              </h3>
              <p style="margin:4px 0 0; font-size:12px; color:#64748b;">Automate points crediting on customer purchases and set point redemption rates during checkout.</p>
            </div>

            <div class="card-body" style="padding:24px 20px;">
              
              <!-- 1. System Activation Toggle -->
              <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:20px; padding-bottom:20px; border-bottom:1px solid #f1f5f9;">
                <div style="flex:1;">
                  <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:20px;">✨</span>
                    <h4 style="margin:0; font-size:15px; font-weight:700; color:#1e293b;">Active Reward Point System</h4>
                    <span id="badge-rp-status"></span>
                  </div>
                  <p style="margin:6px 0 0; font-size:13px; color:#475569; line-height:1.5;">
                    When turned ON, every saved customer who orders will automatically earn points based on their spent amount. Points can be redeemed for discounts in New Order.
                  </p>
                  <div id="rp-status-info" style="margin-top:10px; font-size:12px; padding:8px 12px; border-radius:6px;"></div>
                </div>
                <div style="flex-shrink:0;">
                  <button class="btn" id="btn-toggle-rp" style="min-width:110px; font-weight:700;"></button>
                </div>
              </div>

              <!-- 2. Point Earning Configuration -->
              <div style="padding:20px 0; border-bottom:1px solid #f1f5f9;">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px;">
                  <span style="font-size:20px;">🛍️</span>
                  <div>
                    <h4 style="margin:0; font-size:15px; font-weight:700; color:#1e293b;">Earning Points by Customer Spent</h4>
                    <p style="margin:2px 0 0; font-size:12.5px; color:#64748b;">Specify how much a customer needs to spend to earn reward points.</p>
                  </div>
                </div>

                <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:16px 18px; display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                  <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label" style="font-weight:700; color:#334155; font-size:12.5px;">For every spent amount (৳):</label>
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span style="font-weight:800; color:#64748b;">৳</span>
                      <input type="number" step="1" min="1" class="form-input" id="input-rp-spend-unit" style="font-size:14px; font-weight:700;" placeholder="100">
                    </div>
                    <span style="font-size:11px; color:#64748b; margin-top:3px; display:block;">e.g. 100 ৳ spent</span>
                  </div>

                  <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label" style="font-weight:700; color:#334155; font-size:12.5px;">Customer earns Points:</label>
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span style="font-weight:800; color:#64748b;">🎁</span>
                      <input type="number" step="0.1" min="0.1" class="form-input" id="input-rp-earn-unit" style="font-size:14px; font-weight:700;" placeholder="1">
                    </div>
                    <span style="font-size:11px; color:#64748b; margin-top:3px; display:block;">e.g. 1 Point earned per unit</span>
                  </div>
                </div>
              </div>

              <!-- 3. Point Value & Redemption Configuration -->
              <div style="padding:20px 0; border-bottom:1px solid #f1f5f9;">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px;">
                  <span style="font-size:20px;">💵</span>
                  <div>
                    <h4 style="margin:0; font-size:15px; font-weight:700; color:#1e293b;">Redemption Value per Point</h4>
                    <p style="margin:2px 0 0; font-size:12.5px; color:#64748b;">Specify the currency discount amount a customer gets per redeemed point.</p>
                  </div>
                </div>

                <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:16px 18px; max-width:380px;">
                  <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label" style="font-weight:700; color:#334155; font-size:12.5px;">1 Reward Point equals discount (৳):</label>
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span style="font-weight:800; color:#64748b;">৳</span>
                      <input type="number" step="0.01" min="0.01" class="form-input" id="input-rp-point-value" style="font-size:14px; font-weight:700;" placeholder="1.00">
                    </div>
                    <span style="font-size:11px; color:#64748b; margin-top:3px; display:block;">e.g. 1 point = ৳1.00 discount off order</span>
                  </div>
                </div>
              </div>

              <!-- 4. Dynamic Live Calculator Preview -->
              <div style="margin-top:20px; background:#EFF6FF; border:1px solid #BFDBFE; border-radius:10px; padding:16px 18px;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                  <span style="font-size:18px;">💡</span>
                  <h5 style="margin:0; font-size:13.5px; font-weight:700; color:#1E40AF;">Live Example & Simulation:</h5>
                </div>
                <p id="rp-simulation-text" style="margin:0; font-size:12.5px; color:#1E3A8A; line-height:1.6;">
                  If a customer spends <strong>৳500.00</strong>, they will earn <strong>5 Points</strong>. When redeeming those <strong>5 Points</strong> in a future order, they will get <strong>৳5.00 discount</strong>.
                </p>
              </div>

              <!-- Save Changes Button -->
              <div style="display:flex; justify-content:flex-end; margin-top:24px;">
                <button type="button" class="btn btn-primary" id="btn-save-rp-settings" style="padding:10px 24px; font-weight:700; font-size:13.5px;">
                  💾 Save Reward Point Rules
                </button>
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

      const isEnabled = settings.reward_points_enabled === '1';
      const spendUnit = parseFloat(settings.reward_points_spend_unit) || 100;
      const earnUnit = parseFloat(settings.reward_points_earn_unit) || 1;
      const pointValue = parseFloat(settings.reward_point_value) || 1.00;

      const badgeEl = document.getElementById('badge-rp-status');
      const toggleBtn = document.getElementById('btn-toggle-rp');
      const infoEl = document.getElementById('rp-status-info');
      const spendInput = document.getElementById('input-rp-spend-unit');
      const earnInput = document.getElementById('input-rp-earn-unit');
      const valInput = document.getElementById('input-rp-point-value');
      const simText = document.getElementById('rp-simulation-text');
      const saveBtn = document.getElementById('btn-save-rp-settings');

      if (spendInput) spendInput.value = spendUnit;
      if (earnInput) earnInput.value = earnUnit;
      if (valInput) valInput.value = pointValue;

      const updateSimulation = () => {
        if (!simText) return;
        const sp = parseFloat(spendInput.value) || 100;
        const ea = parseFloat(earnInput.value) || 1;
        const pv = parseFloat(valInput.value) || 1.0;
        const demoSpend = sp * 5;
        const demoPoints = (demoSpend / sp) * ea;
        const demoWorth = demoPoints * pv;
        simText.innerHTML = `If a customer spends <strong>৳${demoSpend.toFixed(2)}</strong>, they will earn <strong>${demoPoints.toFixed(1)} Points</strong>. When redeeming those <strong>${demoPoints.toFixed(1)} Points</strong> in a future order, they will get <strong>৳${demoWorth.toFixed(2)} discount</strong>.`;
      };

      if (spendInput) spendInput.oninput = updateSimulation;
      if (earnInput) earnInput.oninput = updateSimulation;
      if (valInput) valInput.oninput = updateSimulation;
      updateSimulation();

      if (badgeEl && toggleBtn && infoEl) {
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
          infoEl.innerHTML = `✅ <strong>Currently Active:</strong> Customers automatically accumulate reward points when orders are placed, and points can be redeemed in New Order checkout.`;
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
          infoEl.innerHTML = `ℹ️ <strong>Currently Inactive:</strong> The reward point system is disabled. Orders will not award points, and points cannot be redeemed.`;
        }

        toggleBtn.onclick = async () => {
          toggleBtn.disabled = true;
          toggleBtn.textContent = 'Updating...';
          const nextVal = isEnabled ? '0' : '1';
          const res = await S.updateSettings({ reward_points_enabled: nextVal });
          if (res && res.success !== false) {
            H.showToast(nextVal === '1' ? 'Turned ON: Reward point system is now active.' : 'Turned OFF: Reward point system deactivated.', 'success');
            await this.loadSettingsState();
          } else {
            H.showToast('Failed to update setting', 'error');
            toggleBtn.disabled = false;
          }
        };
      }

      if (saveBtn) {
        saveBtn.onclick = async () => {
          saveBtn.disabled = true;
          saveBtn.textContent = 'Saving...';
          const payload = {
            reward_points_spend_unit: String(parseFloat(spendInput.value) || 100),
            reward_points_earn_unit: String(parseFloat(earnInput.value) || 1),
            reward_point_value: String(parseFloat(valInput.value) || 1.00)
          };
          const res = await S.updateSettings(payload);
          saveBtn.disabled = false;
          saveBtn.textContent = '💾 Save Reward Point Rules';
          if (res && res.success !== false) {
            H.showToast('Reward point rules saved successfully!', 'success');
            updateSimulation();
          } else {
            H.showToast('Failed to save rules', 'error');
          }
        };
      }
    }
  };

  window.POS = window.POS || {};
  window.POS.RewardPoints = RewardPoints;
})();
