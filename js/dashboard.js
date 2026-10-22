(function () {
  'use strict';

  const Dashboard = {
    async render() {
      const mc = document.getElementById('main-content');
      const H = POS.Helpers;
      const today = H.today();
      const savedFrom = localStorage.getItem('dash_from');
      const savedTo = localStorage.getItem('dash_to');

      // Use saved range if available, otherwise default to today
      let fromDate = savedFrom || today;
      let toDate = savedTo || today;

      mc.innerHTML = `
        <!-- Streamlined Top Header: Date Range, Apply Button, Presets & Sync -->
        <div class="dash-top-header fade-in" style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:12px 18px; margin-bottom:20px; display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; box-shadow:0 1px 4px rgba(0,0,0,0.03);">
          
          <!-- Date Range Inputs + Apply Button directly on top -->
          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:12px; font-weight:700; color:#475569;">From:</span>
              <input type="date" class="form-input" id="dash-from" value="${fromDate}" style="font-size:12.5px; padding:6px 10px; height:36px; border-radius:8px; border:1px solid #cbd5e1; background:#f8fafc;">
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:12px; font-weight:700; color:#475569;">To:</span>
              <input type="date" class="form-input" id="dash-to" value="${toDate}" style="font-size:12.5px; padding:6px 10px; height:36px; border-radius:8px; border:1px solid #cbd5e1; background:#f8fafc;">
            </div>
            <button class="btn btn-primary" id="btn-filter" style="padding:6px 18px; height:36px; font-size:13px; font-weight:700; border-radius:8px; background:linear-gradient(135deg, #10b981 0%, #059669 100%); border:none; box-shadow:0 2px 6px rgba(16,185,129,0.25); cursor:pointer;">Apply Range</button>
            <span id="dash-last-updated" style="font-size:11px; color:#94a3b8; margin-left:6px;"></span>
          </div>

          <!-- Quick Date Presets & Sync -->
          <div class="page-actions" style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm" id="btn-today" style="font-size:12px; font-weight:700; height:34px;">Today</button>
            <button class="btn btn-secondary btn-sm" id="btn-yesterday" style="font-size:12px; font-weight:600; height:34px;">Yesterday</button>
            <button class="btn btn-secondary btn-sm" id="btn-this-week" style="font-size:12px; font-weight:600; height:34px;">This Week</button>
            <button class="btn btn-secondary btn-sm" id="btn-this-month" style="font-size:12px; font-weight:600; height:34px;">This Month</button>
            <button class="btn btn-secondary btn-sm" id="btn-all-time" style="font-size:12px; font-weight:600; height:34px;">All Time</button>
            <button class="btn btn-secondary btn-sm" id="btn-refresh-dash" title="Refresh data" style="display:inline-flex; align-items:center; gap:6px; height:34px; font-weight:700;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              <span>Sync</span>
            </button>
          </div>
        </div>

        <!-- Primary KPI Metrics -->
        <div class="stats-grid fade-in" id="dashboard-stats" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap:16px; margin-bottom:24px;">
          <div style="grid-column: 1/-1; text-align: center; padding: 30px;"><div class="spinner" style="margin: 0 auto 10px;"></div>Loading Business Intelligence...</div>
        </div>

        <!-- Payment Settlement Status Card -->
        <div class="card fade-in" style="border:1px solid #e2e8f0; border-radius:12px; margin-bottom:24px; box-shadow:0 1px 3px rgba(0,0,0,0.04); background:#fff; overflow:hidden;">
          <div class="card-header" style="background:#f8fafc; border-bottom:1px solid #edf2f7; padding:14px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <div style="font-weight:700; font-size:15px; color:#0f172a; display:flex; align-items:center; gap:8px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                Payment Settlement
              </div>
            </div>
            <div id="payment-summary-pill" style="font-size:12px; font-weight:700; color:#1e293b; background:#e2e8f0; padding:4px 12px; border-radius:20px;">
              Total Collections: ৳0.00
            </div>
          </div>
          <div class="card-body" style="padding:18px 20px;">
            <div id="payment-methods-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:14px;">
              <!-- Dynamic payment channel cards with authentic brand icons -->
            </div>
          </div>
        </div>

        <!-- Visual Analytics Grid (2 Columns) -->
        <div class="grid-2 fade-in" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(360px, 1fr)); gap:20px; margin-bottom:24px;">
          <!-- 1. Sales by Category (Executive Donut / Pie Chart) -->
          <div class="card modern-chart-card">
            <div class="chart-header-modern">
              <div class="chart-title-wrap">
                <div class="chart-icon-box" style="background:#f5f3ff; color:#7c3aed;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
                </div>
                <div>
                  <div class="chart-title-text">Sales by Category</div>
                  <div class="chart-subtitle-text">Pieces sold across product catalog categories</div>
                </div>
              </div>
              <div id="cat-summary-badge" class="chart-header-badge">
                <span style="width:7px; height:7px; background:#7c3aed; border-radius:50%;"></span>
                <span>Calculating...</span>
              </div>
            </div>
            <div class="card-body" style="padding:18px;">
              <div class="category-chart-layout">
                <div class="category-chart-canvas-wrap">
                  <canvas id="categoryPieChart"></canvas>
                  <div class="chart-donut-center" id="categoryChartCenterText">
                    <div class="chart-donut-label">Pieces Sold</div>
                    <div class="chart-donut-val" id="catCenterTotal">0 pcs</div>
                  </div>
                </div>
                <div id="categoryLegendList" class="category-legend-scroll">
                  <!-- Dynamic category legend rows -->
                </div>
              </div>
            </div>
          </div>

          <!-- 2. Payment Method Share (Executive Donut Chart) -->
          <div class="card modern-chart-card">
            <div class="chart-header-modern">
              <div class="chart-title-wrap">
                <div class="chart-icon-box" style="background:#eff6ff; color:#3b82f6;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10H12V2z"/></svg>
                </div>
                <div>
                  <div class="chart-title-text">Payment Method Share</div>
                  <div class="chart-subtitle-text">Tender channel volume and collection breakdown</div>
                </div>
              </div>
              <div id="payment-summary-badge" class="chart-header-badge">
                <span style="width:7px; height:7px; background:#3b82f6; border-radius:50%;"></span>
                <span>Channels</span>
              </div>
            </div>
            <div class="card-body" style="padding:18px;">
              <div class="category-chart-layout">
                <div class="category-chart-canvas-wrap">
                  <canvas id="paymentMethodChart"></canvas>
                  <div class="chart-donut-center" id="paymentChartCenterText">
                    <div class="chart-donut-label">Collected</div>
                    <div class="chart-donut-val" id="payCenterTotal">৳0</div>
                  </div>
                </div>
                <div id="paymentLegendList" class="category-legend-scroll">
                  <!-- Dynamic payment legend rows -->
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 24-Hour Peak Customer Traffic -->
        <div class="card modern-chart-card fade-in" style="margin-bottom:24px;">
          <div class="chart-header-modern">
            <div class="chart-title-wrap">
              <div class="chart-icon-box" style="background:#f0f9ff; color:#0284c7;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div>
                <div class="chart-title-text">24-Hour Peak Customer Traffic</div>
                <div class="chart-subtitle-text">Hourly order velocity and customer rush pattern</div>
              </div>
            </div>
            <div id="hourly-peak-badge" class="chart-header-badge" style="background:#ecfdf5; border-color:#a7f3d0; color:#065f46;">
              <span style="width:7px; height:7px; background:#10b981; border-radius:50%;"></span>
              <span>Peak: Analyzing...</span>
            </div>
          </div>
          <div class="card-body" style="padding:18px;">
            <div class="chart-container" style="height:230px; position:relative;">
              <canvas id="hourlySalesChart"></canvas>
            </div>
          </div>
        </div>

        <!-- Operational Insights: Top Selling Products -->
        <div class="card modern-chart-card fade-in" style="margin-bottom:24px;">
          <div class="chart-header-modern">
            <div class="chart-title-wrap">
              <div class="chart-icon-box" style="background:#fffbeb; color:#d97706;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </div>
              <div>
                <div class="chart-title-text">Top Selling Products</div>
                <div class="chart-subtitle-text">Best-performing inventory by units sold and gross revenue</div>
              </div>
            </div>
            <span class="chart-header-badge" style="background:#fff7ed; border-color:#fed7aa; color:#9a3412;">
              Top 5 Volume Leaders
            </span>
          </div>
          <div class="card-body" style="padding:0;">
            <div class="table-wrapper" style="border:none;">
              <table class="data-table" style="margin:0; font-size:13px;">
                <thead>
                  <tr style="background:#f8fafc; border-bottom:1px solid #e2e8f0;">
                    <th style="width:65px; text-align:center;">Rank</th>
                    <th>Product & Variation</th>
                    <th style="text-align:center; width:140px;">Units Sold</th>
                    <th style="text-align:right; width:180px;">Gross Revenue</th>
                  </tr>
                </thead>
                <tbody id="top-selling-tbody"></tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      // Set up event listeners
      document.getElementById('btn-filter').onclick = async () => {
        fromDate = document.getElementById('dash-from').value;
        toDate = document.getElementById('dash-to').value;
        localStorage.setItem('dash_from', fromDate);
        localStorage.setItem('dash_to', toDate);
        await this.updateStats(fromDate, toDate);
      };

      document.getElementById('btn-today').onclick = () => {
        const t = H.today();
        document.getElementById('dash-from').value = t;
        document.getElementById('dash-to').value = t;
        document.getElementById('btn-filter').click();
      };

      document.getElementById('btn-yesterday').onclick = () => {
        const y = H.yesterday();
        document.getElementById('dash-from').value = y;
        document.getElementById('dash-to').value = y;
        document.getElementById('btn-filter').click();
      };

      document.getElementById('btn-this-week').onclick = () => {
        const p = H.getBDDateParts(new Date());
        const bdInstant = new Date(Date.UTC(p.year, p.month - 1, p.day, 12, 0, 0));
        const dayOfWeek = bdInstant.getUTCDay();
        const start = H.addDays(`${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`, -dayOfWeek);
        document.getElementById('dash-from').value = start;
        document.getElementById('dash-to').value = H.today();
        document.getElementById('btn-filter').click();
      };

      document.getElementById('btn-this-month').onclick = () => {
        const p = H.getBDDateParts(new Date());
        const pad = n => String(n).padStart(2, '0');
        document.getElementById('dash-from').value = `${p.year}-${pad(p.month)}-01`;
        document.getElementById('dash-to').value = H.today();
        document.getElementById('btn-filter').click();
      };

      const btnAllTime = document.getElementById('btn-all-time');
      if (btnAllTime) {
        btnAllTime.onclick = () => {
          document.getElementById('dash-from').value = '2020-01-01';
          document.getElementById('dash-to').value = H.today();
          document.getElementById('btn-filter').click();
        };
      }

      document.getElementById('btn-refresh-dash').onclick = async () => {
        const btn = document.getElementById('btn-refresh-dash');
        btn.classList.add('disabled');
        btn.style.opacity = '0.6';
        await this.updateStats(document.getElementById('dash-from').value, document.getElementById('dash-to').value);
        btn.classList.remove('disabled');
        btn.style.opacity = '1';
        H.showToast('Dashboard metrics refreshed', 'info');
      };

      // Initial stats load
      await this.updateStats(fromDate, toDate);
    },

    async updateStats(from, to) {
      const S = POS.Store;
      const H = POS.Helpers;

      await H.loadPaymentMethods();

      const lastUpdatedEl = document.getElementById('dash-last-updated');
      if (lastUpdatedEl) {
        lastUpdatedEl.textContent = `Sync: ${H.formatTime(new Date())}`;
      }

      // ── 1. Fetch High-Speed Server-Side Aggregated Metrics (Under 5ms) ──
      let m = {};
      let totalSales = 0;
      let orderCount = 0;
      let aov = 0;
      let totalIngredientCost = 0;
      let paidIngredientCost = 0;
      let unpaidIngredientCost = 0;
      let totalWasteCost = 0;
      let totalCompensation = 0;
      let netWasteLoss = 0;
      let wasteQuantity = 0;
      let wasteCount = 0;
      let displayedExpenseTotal = 0;
      let displayedExpensePaid = 0;
      let displayedExpenseUnpaid = 0;
      let totalSupplierPayments = 0;
      let paidSupplierPayments = 0;
      let unpaidSupplierPayments = 0;
      let totalUnitsSold = 0;
      let uniqueSkusSold = 0;
      let paymentBreakdown = {};
      let paymentCount = {};

      let totalTax = 0;

      try {
        const mRes = await fetch(`/api/dashboard/metrics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
        if (mRes.ok) {
          m = await mRes.json();
          totalSales = m.totalSales || 0;
          totalTax = m.totalTax || 0;
          orderCount = m.orderCount || 0;
          aov = m.aov || 0;
          totalIngredientCost = m.totalIngredientCost || 0;
          paidIngredientCost = m.paidIngredientCost || 0;
          unpaidIngredientCost = m.unpaidIngredientCost || 0;
          totalWasteCost = m.totalWasteCost || 0;
          totalCompensation = m.totalCompensation || 0;
          netWasteLoss = m.netWasteLoss || 0;
          wasteQuantity = m.wasteQuantity || 0;
          wasteCount = m.wasteCount || 0;
          displayedExpenseTotal = m.totalExpenses || 0;
          displayedExpensePaid = m.paidExpenses || 0;
          displayedExpenseUnpaid = m.unpaidExpenses || 0;
          totalSupplierPayments = m.totalSupplierPayments || 0;
          paidSupplierPayments = m.paidSupplierPayments || 0;
          unpaidSupplierPayments = m.unpaidSupplierPayments || 0;
          totalUnitsSold = m.totalUnitsSold || 0;
          uniqueSkusSold = m.uniqueSkusSold || 0;
          paymentBreakdown = m.paymentBreakdown || {};
          paymentCount = m.paymentCount || {};
        }
      } catch (err) {
        console.warn('Could not fetch server-side metrics:', err);
      }

      // Cash drawer balance fallback if not in metrics
      let cashDrawer = m.cashDrawer || { currentBalance: 0, cashSales: 0, cashAdded: 0, cashWithdrawn: 0 };
      if (!m.cashDrawer && S.getCashDrawerSummary) {
        try {
          const cdSum = await S.getCashDrawerSummary();
          cashDrawer = {
            currentBalance: cdSum.currentBalance || 0,
            cashSales: cdSum.todayCashSales || 0,
            cashAdded: cdSum.todayAdded || 0,
            cashWithdrawn: cdSum.todayWithdrawn || 0
          };
        } catch (e) {
          console.warn('Failed to fetch cash drawer fallback in dashboard:', e);
        }
      }

      // Initialize active payment methods with zero if missing from breakdown
      H.paymentMethods.forEach(method => {
        if (paymentBreakdown[method] === undefined) paymentBreakdown[method] = 0;
        if (paymentCount[method] === undefined) paymentCount[method] = 0;
      });

      // ── 1. Render Executive KPI Cards (High-Contrast Metrics & Professional SVGs) ─────
      const statsGrid = document.getElementById('dashboard-stats');
      statsGrid.innerHTML = `
        <!-- 1. Total Sales Amount (Primary Hero Card) -->
        <div class="stat-card purple" style="background:linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border:none; border-radius:12px; padding:18px 16px; box-shadow:0 4px 14px rgba(99,102,241,0.25); display:flex; align-items:flex-start; gap:14px; min-width:0; box-sizing:border-box;">
          <div class="stat-icon" style="width:46px; height:46px; border-radius:12px; background:rgba(255,255,255,0.2); color:#ffffff; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div class="stat-info" style="min-width:0; flex:1;">
            <div class="stat-label" style="font-size:11px; font-weight:700; text-transform:uppercase; color:#ede9fe; letter-spacing:0.8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              Total Sales Amount
              <span style="display:block; font-size:10px; text-transform:none; letter-spacing:0; opacity:0.85; font-weight:500; margin-top:1px;">(+ including tax)</span>
            </div>
            <div class="stat-value" style="font-size:22px; font-weight:800; color:#ffffff; margin-top:2px; line-height:1.1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${H.formatCurrency(totalSales)}</div>
            <div style="font-size:11px; color:#ffffff; background:rgba(255,255,255,0.2); font-weight:700; padding:2px 8px; border-radius:12px; display:inline-flex; align-items:center; gap:4px; margin-top:6px; white-space:nowrap;">
              <span>${orderCount} Completed Invoices</span>
            </div>
          </div>
        </div>

        <!-- 2. Collected Tax Card (New) -->
        <div class="stat-card sky" style="background:#fff; border:1.5px solid #0284c7; border-radius:12px; padding:18px 16px; box-shadow:0 2px 8px rgba(2,132,199,0.08); display:flex; align-items:flex-start; gap:14px; min-width:0; box-sizing:border-box;">
          <div class="stat-icon" style="width:46px; height:46px; border-radius:12px; background:#f0f9ff; color:#0284c7; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/><line x1="9" y1="11" x2="11" y2="11"/></svg>
          </div>
          <div class="stat-info" style="min-width:0; flex:1;">
            <div class="stat-label" style="font-size:11px; font-weight:700; text-transform:uppercase; color:#334155; letter-spacing:0.8px; display:flex; align-items:center; justify-content:space-between; gap:4px; white-space:nowrap;">
              <span style="overflow:hidden; text-overflow:ellipsis;">Collected Tax</span>
              <span style="font-size:9.5px; padding:2px 7px; border-radius:10px; background:#e0f2fe; color:#0369a1; font-weight:700;">VAT / Govt</span>
            </div>
            <div class="stat-value" style="font-size:22px; font-weight:800; color:#0284c7; margin-top:2px; line-height:1.1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${H.formatCurrency(totalTax)}</div>
            <div style="font-size:11px; color:#0369a1; background:#e0f2fe; border:1px solid #bae6fd; font-weight:700; padding:2px 8px; border-radius:12px; display:inline-flex; align-items:center; gap:4px; margin-top:6px; white-space:nowrap;">
              <span>Sales Tax In Range</span>
            </div>
          </div>
        </div>

        <!-- 3. Current Cash Drawer Balance Card -->
        <div class="stat-card emerald" id="stat-card-cash-drawer" onclick="window.location.hash='#/cash-drawer'" style="background:#fff; border:1.5px solid #10b981; border-radius:12px; padding:18px 16px; box-shadow:0 2px 8px rgba(16,185,129,0.08); display:flex; align-items:flex-start; gap:14px; min-width:0; box-sizing:border-box; cursor:pointer; transition:transform 0.15s ease, box-shadow 0.15s ease;" title="Click to open Cash Drawer">
          <div class="stat-icon" style="width:46px; height:46px; border-radius:12px; background:#ecfdf5; color:#059669; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><circle cx="12" cy="15" r="2"/></svg>
          </div>
          <div class="stat-info" style="min-width:0; flex:1;">
            <div class="stat-label" style="font-size:11px; font-weight:700; text-transform:uppercase; color:#334155; letter-spacing:0.8px; display:flex; align-items:center; justify-content:space-between; gap:4px; white-space:nowrap;">
              <span style="overflow:hidden; text-overflow:ellipsis;">Cash Drawer Balance</span>
              <span style="font-size:9.5px; padding:2px 7px; border-radius:10px; background:#dcfce7; color:#15803d; font-weight:700; display:inline-flex; align-items:center; gap:3px;">
                <span style="width:5px; height:5px; background:#16a34a; border-radius:50%;"></span> Live
              </span>
            </div>
            <div class="stat-value" style="font-size:22px; font-weight:800; color:#065f46; margin-top:2px; line-height:1.1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${H.formatCurrency(cashDrawer.currentBalance)}</div>
            <div style="margin-top:8px; padding-top:6px; border-top:1px solid #d1fae5; display:flex; flex-direction:column; gap:4px;">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; font-size:11px; white-space:nowrap;">
                <span style="color:#64748b; font-weight:600;">Cash Sales (Period):</span>
                <span style="font-weight:700; color:#059669;">${H.formatCurrency(cashDrawer.cashSales)}</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; font-size:11px; white-space:nowrap;">
                <span style="color:#64748b; font-weight:600;">Net In / Out:</span>
                <span style="font-weight:700; color:#334155;">+${H.formatCurrency(cashDrawer.cashAdded)} / -${H.formatCurrency(cashDrawer.cashWithdrawn)}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. Ingredient Cost Card -->
        <div class="stat-card green" style="background:#fff; border:1.5px solid #10b981; border-radius:12px; padding:18px 16px; box-shadow:0 2px 8px rgba(16,185,129,0.08); display:flex; align-items:flex-start; gap:14px; min-width:0; box-sizing:border-box;">
          <div class="stat-icon" style="width:46px; height:46px; border-radius:12px; background:#ecfdf5; color:#059669; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
          </div>
          <div class="stat-info" style="min-width:0; flex:1;">
            <div class="stat-label" style="font-size:11px; font-weight:700; text-transform:uppercase; color:#334155; letter-spacing:0.8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Ingredient Cost</div>
            <div class="stat-value" style="font-size:22px; font-weight:800; color:#065f46; margin-top:2px; line-height:1.1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${H.formatCurrency(totalIngredientCost)}</div>
            <div style="margin-top:8px; padding-top:6px; border-top:1px solid #d1fae5; display:flex; flex-direction:column; gap:4px;">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; font-size:11px; white-space:nowrap;">
                <span style="color:#64748b; font-weight:600;">Paid:</span>
                <span style="font-weight:700; color:#059669;">${H.formatCurrency(paidIngredientCost)}</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; font-size:11px; white-space:nowrap;">
                <span style="color:#64748b; font-weight:600;">Unpaid:</span>
                <span style="font-weight:700; color:#dc2626;">${H.formatCurrency(unpaidIngredientCost)}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 5. Expired & Waste Card -->
        <div class="stat-card rose" style="background:#fff; border:1.5px solid #f43f5e; border-radius:12px; padding:18px 16px; box-shadow:0 2px 8px rgba(244,63,94,0.08); display:flex; align-items:flex-start; gap:14px; min-width:0; box-sizing:border-box;">
          <div class="stat-icon" style="width:46px; height:46px; border-radius:12px; background:#fff1f2; color:#e11d48; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </div>
          <div class="stat-info" style="min-width:0; flex:1;">
            <div class="stat-label" style="font-size:11px; font-weight:700; text-transform:uppercase; color:#334155; letter-spacing:0.8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Expired & Waste</div>
            <div class="stat-value" style="font-size:22px; font-weight:800; color:#9f1239; margin-top:2px; line-height:1.1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${H.formatCurrency(totalWasteCost)}</div>
            <div style="margin-top:8px; padding-top:6px; border-top:1px solid #ffe4e6; display:flex; flex-direction:column; gap:4px;">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; font-size:11px; white-space:nowrap;">
                <span style="color:#64748b; font-weight:600;">Net Loss:</span>
                <span style="font-weight:700; color:#e11d48;">${H.formatCurrency(netWasteLoss)}</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; font-size:11px; white-space:nowrap;">
                <span style="color:#64748b; font-weight:600;">Discarded:</span>
                <span style="font-weight:700; color:#475569;">${wasteQuantity} units (${wasteCount} logs)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 6. Expenses Amount Card -->
        <div class="stat-card red" style="background:#fff; border:1.5px solid #ef4444; border-radius:12px; padding:18px 16px; box-shadow:0 2px 8px rgba(239,68,68,0.08); display:flex; align-items:flex-start; gap:14px; min-width:0; box-sizing:border-box;">
          <div class="stat-icon" style="width:46px; height:46px; border-radius:12px; background:#fef2f2; color:#dc2626; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-8"/><path d="M16 12h-8"/><path d="M10 16h-2"/></svg>
          </div>
          <div class="stat-info" style="min-width:0; flex:1;">
            <div class="stat-label" style="font-size:11px; font-weight:700; text-transform:uppercase; color:#334155; letter-spacing:0.8px; display:flex; align-items:center; justify-content:space-between; gap:4px; white-space:nowrap;">
              <span style="overflow:hidden; text-overflow:ellipsis;">Expenses Amount</span>
            </div>
            <div class="stat-value" style="font-size:22px; font-weight:800; color:#b91c1c; margin-top:2px; line-height:1.1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${H.formatCurrency(displayedExpenseTotal)}</div>
            <div style="margin-top:8px; padding-top:6px; border-top:1px solid #fee2e2; display:flex; flex-direction:column; gap:4px;">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; font-size:11px; white-space:nowrap;">
                <span style="color:#64748b; font-weight:600;">Paid Amount:</span>
                <span style="font-weight:700; color:#059669;">${H.formatCurrency(displayedExpensePaid)}</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; font-size:11px; white-space:nowrap;">
                <span style="color:#64748b; font-weight:600;">Unpaid Amount:</span>
                <span style="font-weight:700; color:#dc2626;">${H.formatCurrency(displayedExpenseUnpaid)}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 7. Supplier Payments Card -->
        <div class="stat-card amber" style="background:#fff; border:1.5px solid #f59e0b; border-radius:12px; padding:18px 16px; box-shadow:0 2px 8px rgba(245,158,11,0.08); display:flex; align-items:flex-start; gap:14px; min-width:0; box-sizing:border-box;">
          <div class="stat-icon" style="width:46px; height:46px; border-radius:12px; background:#fffbeb; color:#d97706; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
          </div>
          <div class="stat-info" style="min-width:0; flex:1;">
            <div class="stat-label" style="font-size:11px; font-weight:700; text-transform:uppercase; color:#334155; letter-spacing:0.8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Supplier Payments</div>
            <div class="stat-value" style="font-size:22px; font-weight:800; color:#b45309; margin-top:2px; line-height:1.1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${H.formatCurrency(totalSupplierPayments)}</div>
            <div style="margin-top:8px; padding-top:6px; border-top:1px solid #fef3c7; display:flex; flex-direction:column; gap:4px;">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; font-size:11px; white-space:nowrap;">
                <span style="color:#64748b; font-weight:600;">Paid Amount:</span>
                <span style="font-weight:700; color:#059669;">${H.formatCurrency(paidSupplierPayments)}</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; font-size:11px; white-space:nowrap;">
                <span style="color:#64748b; font-weight:600;">Unpaid Amount:</span>
                <span style="font-weight:700; color:#dc2626;">${H.formatCurrency(unpaidSupplierPayments)}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Average Order Value (AOV) -->
        <div class="stat-card blue" style="background:#fff; border:1.5px solid #3b82f6; border-radius:12px; padding:18px 16px; box-shadow:0 2px 8px rgba(59,130,246,0.08); display:flex; align-items:flex-start; gap:14px; min-width:0; box-sizing:border-box;">
          <div class="stat-icon" style="width:46px; height:46px; border-radius:12px; background:#eff6ff; color:#2563eb; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          </div>
          <div class="stat-info" style="min-width:0; flex:1;">
            <div class="stat-label" style="font-size:11px; font-weight:700; text-transform:uppercase; color:#334155; letter-spacing:0.8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Avg Order Value</div>
            <div class="stat-value" style="font-size:22px; font-weight:800; color:#1e40af; margin-top:2px; line-height:1.1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${H.formatCurrency(aov)}</div>
            <div style="font-size:11px; color:#1e40af; background:#dbeafe; border:1px solid #bfdbfe; font-weight:700; padding:2px 8px; border-radius:12px; display:inline-flex; align-items:center; gap:4px; margin-top:6px; white-space:nowrap;">
              <span>Spend per Customer</span>
            </div>
          </div>
        </div>

        <!-- Total Items Sold -->
        <div class="stat-card teal" style="background:#fff; border:1.5px solid #0d9488; border-radius:12px; padding:18px 16px; box-shadow:0 2px 8px rgba(13,148,136,0.08); display:flex; align-items:flex-start; gap:14px; min-width:0; box-sizing:border-box;">
          <div class="stat-icon" style="width:46px; height:46px; border-radius:12px; background:#f0fdfa; color:#0d9488; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
          </div>
          <div class="stat-info" style="min-width:0; flex:1;">
            <div class="stat-label" style="font-size:11px; font-weight:700; text-transform:uppercase; color:#334155; letter-spacing:0.8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Units Sold</div>
            <div class="stat-value" style="font-size:22px; font-weight:800; color:#115e59; margin-top:2px; line-height:1.1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${totalUnitsSold} <span style="font-size:13px; font-weight:600; color:#0d9488;">pcs</span></div>
            <div style="font-size:11px; color:#115e59; background:#ccfbf1; border:1px solid #99f6e4; font-weight:700; padding:2px 8px; border-radius:12px; display:inline-flex; align-items:center; gap:4px; margin-top:6px; white-space:nowrap;">
              <span>Across ${uniqueSkusSold} SKUs</span>
            </div>
          </div>
        </div>
      `;

      // ── 2. Render Payment Method Settlement Cards ────
      let totalCollected = 0;
      Object.values(paymentBreakdown).forEach(amt => totalCollected += amt);

      const pmGrid = document.getElementById('payment-methods-grid');
      const pmPill = document.getElementById('payment-summary-pill');
      if (pmPill) pmPill.textContent = `Total Collections: ${H.formatCurrency(totalCollected)}`;

      if (pmGrid) {
        // Only display active configured payment methods so renamed methods never show stale cards
        const displayMethods = [...H.paymentMethods].filter(Boolean);

        pmGrid.innerHTML = displayMethods.map(method => {
          const amt = paymentBreakdown[method] || 0;
          const count = paymentCount[method] || 0;
          const pct = totalCollected > 0 ? ((amt / totalCollected) * 100).toFixed(1) : '0.0';
          const brandColor = H.getPaymentMethodColor(method);
          const iconHtml = H.getPaymentMethodIcon(method, 40);
          const isActive = amt > 0;

          return `
            <div class="payment-channel-card" style="background:#fff; border:1px solid ${isActive ? '#cbd5e1' : '#f1f5f9'}; border-radius:10px; padding:14px; display:flex; flex-direction:column; gap:10px; transition:all 0.2s ease; box-shadow:${isActive ? '0 2px 5px rgba(0,0,0,0.03)' : 'none'};">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                <div style="display:flex; align-items:center; gap:10px; min-width:0;">
                  ${iconHtml}
                  <div style="min-width:0;">
                    <div style="font-weight:700; font-size:14px; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${method}</div>
                    <div style="font-size:11px; color:#64748b;">${count} transaction${count === 1 ? '' : 's'}</div>
                  </div>
                </div>
                <div>
                  ${isActive 
                    ? `<span style="font-size:10px; font-weight:700; color:#16a34a; background:#f0fdf4; border:1px solid #bbf7d0; padding:2px 7px; border-radius:12px;">Active</span>`
                    : `<span style="font-size:10px; font-weight:600; color:#94a3b8; background:#f8fafc; border:1px solid #e2e8f0; padding:2px 7px; border-radius:12px;">0 Tx</span>`
                  }
                </div>
              </div>

              <div>
                <div style="font-size:17px; font-weight:800; color:#0f172a;">${H.formatCurrency(amt)}</div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px; font-size:11px; color:#64748b;">
                  <span>Channel share</span>
                  <span style="font-weight:700; color:${brandColor};">${pct}%</span>
                </div>
                <div style="width:100%; height:5px; background:#f1f5f9; border-radius:4px; margin-top:4px; overflow:hidden;">
                  <div style="width:${pct}%; height:100%; background:${brandColor}; border-radius:4px; transition:width 0.4s ease;"></div>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }

      // ── 3. Charts & Operational Insights ─────────────
      await this.renderCharts(m, paymentBreakdown, from, to);
      this.renderTopSelling(m.topSelling || []);
    },

    async renderCharts(metrics = {}, paymentBreakdown = {}, from, to) {
      const H = POS.Helpers;

      const diffTime = Math.abs(new Date(to) - new Date(from));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      // ── 1. Sales by Category (Executive Donut / Pie Chart) ──
      let catData = Array.isArray(metrics.categorySales) ? metrics.categorySales : [];
      if (catData.length === 0) {
        try {
          const resp = await fetch(`/api/dashboard/category-sales?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
          if (resp.ok) {
            catData = await resp.json();
          }
        } catch (err) {
          console.warn('Could not fetch server category sales:', err);
        }
      }

      // Modern cohesive executive palette
      const modernCatPalette = [
        '#6366f1', // Indigo
        '#10b981', // Emerald
        '#f59e0b', // Amber
        '#06b6d4', // Cyan
        '#ec4899', // Pink
        '#8b5cf6', // Violet
        '#3b82f6', // Blue
        '#f97316', // Orange
        '#14b8a6', // Teal
        '#84cc16', // Lime
        '#64748b'  // Slate
      ];

      let totalCatPieces = 0;
      catData.forEach(c => totalCatPieces += (parseInt(c.totalQty) || 0));

      const catBadge = document.getElementById('cat-summary-badge');
      if (catBadge) {
        catBadge.innerHTML = `<span style="width:7px; height:7px; background:#7c3aed; border-radius:50%; display:inline-block;"></span> <span>${catData.length} ${catData.length === 1 ? 'Category' : 'Categories'} • ${totalCatPieces} pcs sold</span>`;
      }

      const catCenterVal = document.getElementById('catCenterTotal');
      if (catCenterVal) {
        catCenterVal.textContent = `${totalCatPieces} pcs`;
      }

      const catLegendList = document.getElementById('categoryLegendList');
      if (catLegendList) {
        if (catData.length === 0) {
          catLegendList.innerHTML = `
            <div style="text-align:center; padding:30px 10px; color:#94a3b8;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.8" style="margin-bottom:6px;"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
              <div style="font-size:12px; font-weight:600;">No Category Sales</div>
              <div style="font-size:11px; color:#cbd5e1; margin-top:2px;">No orders found in date range</div>
            </div>
          `;
        } else {
          catLegendList.innerHTML = catData.map((cat, idx) => {
            const color = modernCatPalette[idx % modernCatPalette.length];
            const qty = parseInt(cat.totalQty) || 0;
            const pct = totalCatPieces > 0 ? ((qty / totalCatPieces) * 100).toFixed(1) : '0.0';
            return `
              <div class="cat-legend-row">
                <div class="cat-legend-left">
                  <span class="cat-dot" style="background:${color};"></span>
                  <span class="cat-name" title="${H.esc(cat.categoryName)}">${H.esc(cat.categoryName)}</span>
                </div>
                <div class="cat-legend-right">
                  <span class="cat-amount" style="font-weight:700; color:#1e293b;">${qty} <span style="font-size:11px; font-weight:600; color:#64748b;">pcs</span></span>
                  <span class="cat-pct-badge">${pct}%</span>
                </div>
              </div>
            `;
          }).join('');
        }
      }

      const catLabels = catData.length ? catData.map(c => c.categoryName) : ['No Sales'];
      const catChartData = catData.length ? catData.map(c => parseInt(c.totalQty) || 0) : [1];
      const catColors = catData.length 
        ? catData.map((_, i) => modernCatPalette[i % modernCatPalette.length]) 
        : ['#e2e8f0'];

      const catCanvas = document.getElementById('categoryPieChart');
      if (catCanvas && typeof Chart !== 'undefined') {
        const ctxCat = catCanvas.getContext('2d');
        if (window.categoryChart && typeof window.categoryChart.destroy === 'function') {
          window.categoryChart.destroy();
        }
        window.categoryChart = new Chart(ctxCat, {
          type: 'doughnut',
          data: {
            labels: catLabels,
            datasets: [{
              data: catChartData,
              backgroundColor: catColors,
              borderWidth: 2,
              borderColor: '#ffffff',
              hoverOffset: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: {
              legend: { display: false },
              tooltip: {
                enabled: catData.length > 0,
                backgroundColor: '#0f172a',
                titleFont: { size: 13, weight: '700' },
                bodyFont: { size: 12, weight: '600' },
                padding: 10,
                cornerRadius: 8,
                boxPadding: 4,
                callbacks: {
                  label: (context) => {
                    const val = context.raw || 0;
                    const pct = totalCatPieces > 0 ? ((val / totalCatPieces) * 100).toFixed(1) : '0.0';
                    return ` Pieces Sold: ${val} pcs (${pct}%)`;
                  }
                }
              }
            }
          }
        });
      }

      // ── 2. Payment Method Share (Executive Donut Chart) ──
      const payLabels = Object.keys(paymentBreakdown).filter(k => (paymentBreakdown[k] || 0) > 0);
      const payData = payLabels.map(k => paymentBreakdown[k]);
      const payColors = payLabels.map(k => H.getPaymentMethodColor(k));

      let totalCollected = 0;
      Object.values(paymentBreakdown).forEach(amt => totalCollected += (amt || 0));

      const payBadge = document.getElementById('payment-summary-badge');
      if (payBadge) {
        payBadge.innerHTML = `<span style="width:7px; height:7px; background:#3b82f6; border-radius:50%; display:inline-block;"></span> <span>${payLabels.length} Active Channels • ${H.formatCurrency(totalCollected)}</span>`;
      }

      const payCenterVal = document.getElementById('payCenterTotal');
      if (payCenterVal) {
        payCenterVal.textContent = H.formatCurrency(totalCollected);
      }

      const payLegendList = document.getElementById('paymentLegendList');
      if (payLegendList) {
        if (payLabels.length === 0) {
          payLegendList.innerHTML = `
            <div style="text-align:center; padding:30px 10px; color:#94a3b8;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.8" style="margin-bottom:6px;"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10H12V2z"/></svg>
              <div style="font-size:12px; font-weight:600;">No Collections</div>
              <div style="font-size:11px; color:#cbd5e1; margin-top:2px;">No payment records in range</div>
            </div>
          `;
        } else {
          payLegendList.innerHTML = payLabels.map(method => {
            const amt = paymentBreakdown[method] || 0;
            const pct = totalCollected > 0 ? ((amt / totalCollected) * 100).toFixed(1) : '0.0';
            const color = H.getPaymentMethodColor(method);
            return `
              <div class="cat-legend-row">
                <div class="cat-legend-left">
                  <span class="cat-dot" style="background:${color};"></span>
                  <span class="cat-name" title="${H.esc(method)}">${H.esc(method)}</span>
                </div>
                <div class="cat-legend-right">
                  <span class="cat-amount">${H.formatCurrency(amt)}</span>
                  <span class="cat-pct-badge">${pct}%</span>
                </div>
              </div>
            `;
          }).join('');
        }
      }

      const payCanvas = document.getElementById('paymentMethodChart');
      if (payCanvas && typeof Chart !== 'undefined') {
        const ctxPay = payCanvas.getContext('2d');
        if (window.payChart && typeof window.payChart.destroy === 'function') {
          window.payChart.destroy();
        }
        window.payChart = new Chart(ctxPay, {
          type: 'doughnut',
          data: {
            labels: payLabels.length ? payLabels : ['No Transactions'],
            datasets: [{
              data: payData.length ? payData : [1],
              backgroundColor: payColors.length ? payColors : ['#e2e8f0'],
              borderWidth: 2,
              borderColor: '#ffffff',
              hoverOffset: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: {
              legend: { display: false },
              tooltip: {
                enabled: payLabels.length > 0,
                backgroundColor: '#0f172a',
                titleFont: { size: 13, weight: '700' },
                bodyFont: { size: 12, weight: '600' },
                padding: 10,
                cornerRadius: 8,
                boxPadding: 4,
                callbacks: {
                  label: (context) => {
                    const val = context.raw || 0;
                    const pct = totalCollected > 0 ? ((val / totalCollected) * 100).toFixed(1) : '0.0';
                    return ` Share: ${H.formatCurrency(val)} (${pct}%)`;
                  }
                }
              }
            }
          }
        });
      }

      // ── 3. 24-Hour Distribution (Hourly Traffic & Rush Identification) ──
      const hourlyCounts = Array.isArray(metrics.hourlyTraffic) && metrics.hourlyTraffic.length === 24
        ? metrics.hourlyTraffic
        : Array(24).fill(0);

      const hourlyData = diffDays > 2 
        ? hourlyCounts.map(c => parseFloat((c / diffDays).toFixed(2))) 
        : hourlyCounts;

      const hourLabels = Array.from({ length: 24 }, (_, i) => {
        const h = i % 12 || 12;
        const ampm = i < 12 ? 'AM' : 'PM';
        return `${h} ${ampm}`;
      });

      const maxHourly = Math.max(...hourlyCounts, 0);
      const peakIndex = hourlyCounts.indexOf(maxHourly);
      const peakHourLabel = maxHourly > 0 ? hourLabels[peakIndex] : 'None';

      const peakBadge = document.getElementById('hourly-peak-badge');
      if (peakBadge) {
        if (maxHourly > 0) {
          peakBadge.innerHTML = `<span style="width:7px; height:7px; background:#10b981; border-radius:50%; display:inline-block;"></span> <span>🔥 Peak: <strong>${peakHourLabel}</strong> (${maxHourly} orders)</span>`;
          peakBadge.style.background = '#ecfdf5';
          peakBadge.style.borderColor = '#a7f3d0';
          peakBadge.style.color = '#065f46';
        } else {
          peakBadge.innerHTML = `<span style="width:7px; height:7px; background:#94a3b8; border-radius:50%; display:inline-block;"></span> <span>No Traffic Recorded</span>`;
          peakBadge.style.background = '#f8fafc';
          peakBadge.style.borderColor = '#e2e8f0';
          peakBadge.style.color = '#64748b';
        }
      }

      const barBgColors = hourlyCounts.map(val => 
        val === maxHourly && val > 0 ? '#7c3aed' : 'rgba(99, 102, 241, 0.72)'
      );
      const barBorderColors = hourlyCounts.map(val => 
        val === maxHourly && val > 0 ? '#6d28d9' : '#6366f1'
      );

      const hourCanvas = document.getElementById('hourlySalesChart');
      if (hourCanvas && typeof Chart !== 'undefined') {
        const ctxHour = hourCanvas.getContext('2d');
        if (window.hourChart && typeof window.hourChart.destroy === 'function') {
          window.hourChart.destroy();
        }
        window.hourChart = new Chart(ctxHour, {
          type: 'bar',
          data: {
            labels: hourLabels,
            datasets: [{
              label: diffDays > 2 ? 'Avg Hourly Invoices' : 'Hourly Invoices',
              data: hourlyData,
              backgroundColor: barBgColors,
              borderColor: barBorderColors,
              borderWidth: 1.5,
              borderRadius: 6,
              hoverBackgroundColor: '#4f46e5'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: '#0f172a',
                titleFont: { size: 13, weight: '700' },
                bodyFont: { size: 12, weight: '600' },
                padding: 10,
                cornerRadius: 8,
                callbacks: {
                  label: (context) => `Traffic Volume: ${context.raw} invoice(s)`
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { precision: 0, font: { size: 11, weight: '600' }, color: '#64748b' },
                grid: { color: 'rgba(226, 232, 240, 0.6)' }
              },
              x: {
                ticks: { font: { size: 10.5, weight: '600' }, color: '#64748b' },
                grid: { display: false }
              }
            }
          }
        });
      }
    },

    renderTopSelling(topSellingData = []) {
      const H = POS.Helpers;
      const sorted = Array.isArray(topSellingData) ? topSellingData.slice(0, 5) : [];

      const tbody = document.getElementById('top-selling-tbody');
      if (!tbody) return;
      tbody.innerHTML = '';

      if (sorted.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:32px 16px; color:#94a3b8; font-style:italic;">No product sales recorded in selected range.</td></tr>`;
        return;
      }

      const maxQty = sorted[0].qty || 1;

      sorted.forEach((item, idx) => {
        const rankMedals = ['🥇 1st', '🥈 2nd', '🥉 3rd', '4th', '5th'];
        const medal = rankMedals[idx] || `${idx + 1}th`;
        const barWidth = Math.round(((item.qty || 0) / maxQty) * 100);
        const displayName = item.productName + (item.variationName ? ` (${item.variationName})` : '');

        tbody.innerHTML += `
          <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s ease;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
            <td style="text-align:center; font-weight:800; font-size:13px; vertical-align:middle; color:#475569;">${medal}</td>
            <td style="padding:12px 14px;">
              <div style="font-weight:700; color:#1e293b; font-size:13.5px;">${H.esc(displayName)}</div>
              <div style="width:100%; height:5px; background:#f1f5f9; border-radius:4px; margin-top:6px; overflow:hidden;">
                <div style="width:${barWidth}%; height:100%; background:linear-gradient(90deg, #f59e0b, #fbbf24); border-radius:4px; transition:width 0.3s ease;"></div>
              </div>
            </td>
            <td style="text-align:center; vertical-align:middle;">
              <span style="display:inline-block; padding:3px 10px; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:12px; font-weight:700; color:#334155; font-size:12px;">
                ${item.qty} pcs
              </span>
            </td>
            <td style="text-align:right; font-weight:800; color:#059669; font-size:13.5px; vertical-align:middle; padding-right:16px;">
              ${H.formatCurrency(item.amount)}
            </td>
          </tr>
        `;
      });
    }
  };

  window.POS = window.POS || {};
  window.POS.Dashboard = Dashboard;
})();
