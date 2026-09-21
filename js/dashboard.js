(function () {
  'use strict';

  const Dashboard = {
    async render() {
      const mc = document.getElementById('main-content');
      const H = POS.Helpers;
      const today = H.today();

      // Get initial date range filters
      let fromDate = localStorage.getItem('dash_from') || today;
      let toDate = localStorage.getItem('dash_to') || today;

      mc.innerHTML = `
        <div class="page-header fade-in" style="margin-bottom: 20px;">
          <div>
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
              <h2 class="page-title" style="margin:0; font-size:24px; font-weight:800; color:#0f172a;">Executive POS Dashboard</h2>
              <span class="badge" style="background:#ecfdf5; color:#059669; font-weight:700; border:1px solid #a7f3d0; font-size:11px; padding:3px 10px; border-radius:20px; display:inline-flex; align-items:center; gap:6px;">
                <span style="width:7px; height:7px; background:#10b981; border-radius:50%; display:inline-block;"></span>
                Live Register • Ready
              </span>
            </div>
            <p class="page-subtitle" style="margin-top:4px; font-size:13px; color:#64748b;">Real-time sales performance, revenue analytics, and multi-channel payment reconciliation.</p>
          </div>
          <div class="page-actions" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm" id="btn-today">Today</button>
            <button class="btn btn-secondary btn-sm" id="btn-yesterday">Yesterday</button>
            <button class="btn btn-secondary btn-sm" id="btn-this-week">This Week</button>
            <button class="btn btn-secondary btn-sm" id="btn-this-month">This Month</button>
            <button class="btn btn-secondary btn-sm" id="btn-refresh-dash" title="Refresh data" style="display:inline-flex; align-items:center; gap:6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              <span>Sync</span>
            </button>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="filter-bar fade-in" style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:12px 16px; margin-bottom:20px; display:flex; gap:12px; align-items:center; flex-wrap:wrap; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
          <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:260px; flex-wrap:wrap;">
            <div class="form-group" style="margin-bottom:0; flex:1; min-width:130px;">
              <label class="form-label" style="font-size:11px; font-weight:700; color:#475569; margin-bottom:3px;">From Date</label>
              <input type="date" class="form-input" id="dash-from" value="${fromDate}" style="font-size:13px; padding:7px 10px;">
            </div>
            <div class="form-group" style="margin-bottom:0; flex:1; min-width:130px;">
              <label class="form-label" style="font-size:11px; font-weight:700; color:#475569; margin-bottom:3px;">To Date</label>
              <input type="date" class="form-input" id="dash-to" value="${toDate}" style="font-size:13px; padding:7px 10px;">
            </div>
          </div>
          <div style="display:flex; align-items:flex-end; gap:8px;">
            <button class="btn btn-primary" id="btn-filter" style="padding:7px 18px; font-size:13px; font-weight:600;">Apply Range</button>
            <span id="dash-last-updated" style="font-size:11px; color:#94a3b8; align-self:center; margin-left:6px;"></span>
          </div>
        </div>

        <!-- Primary KPI Metrics -->
        <div class="stats-grid fade-in" id="dashboard-stats" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:24px;">
          <div style="grid-column: 1/-1; text-align: center; padding: 30px;"><div class="spinner" style="margin: 0 auto 10px;"></div>Loading Business Intelligence...</div>
        </div>

        <!-- Payment Settlement Status Card -->
        <div class="card fade-in" style="border:1px solid #e2e8f0; border-radius:12px; margin-bottom:24px; box-shadow:0 1px 3px rgba(0,0,0,0.04); background:#fff; overflow:hidden;">
          <div class="card-header" style="background:#f8fafc; border-bottom:1px solid #edf2f7; padding:14px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <div style="font-weight:700; font-size:15px; color:#0f172a; display:flex; align-items:center; gap:8px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                Payment Settlement & Tender Channels
              </div>
              <p style="margin:2px 0 0; font-size:12px; color:#64748b;">Official brand channels reconciliation for bKash, Nagad, Rocket, Bank Transfer, Card, and Cash.</p>
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
        <div class="grid-2 fade-in" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(350px, 1fr)); gap:20px; margin-bottom:24px;">
          <div class="card" style="border:1px solid #e2e8f0; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,0.04); background:#fff;">
            <div class="card-header" style="border-bottom:1px solid #edf2f7; padding:14px 18px; font-weight:700; font-size:14px; color:#1e293b; display:flex; align-items:center; gap:8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              Sales Revenue Trend
            </div>
            <div class="card-body" style="padding:16px;">
              <div class="chart-container" style="height:260px; position:relative;">
                <canvas id="salesTrendChart"></canvas>
              </div>
            </div>
          </div>

          <div class="card" style="border:1px solid #e2e8f0; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,0.04); background:#fff;">
            <div class="card-header" style="border-bottom:1px solid #edf2f7; padding:14px 18px; font-weight:700; font-size:14px; color:#1e293b; display:flex; align-items:center; gap:8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10H12V2z"/></svg>
              Payment Method Share
            </div>
            <div class="card-body" style="padding:16px;">
              <div class="chart-container" style="height:260px; position:relative;">
                <canvas id="paymentMethodChart"></canvas>
              </div>
            </div>
          </div>
        </div>

        <!-- 24-Hour Hourly Distribution -->
        <div class="card fade-in" style="border:1px solid #e2e8f0; border-radius:12px; margin-bottom:24px; box-shadow:0 1px 3px rgba(0,0,0,0.04); background:#fff;">
          <div class="card-header" style="border-bottom:1px solid #edf2f7; padding:14px 18px; font-weight:700; font-size:14px; color:#1e293b; display:flex; align-items:center; gap:8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            24-Hour Peak Customer Traffic (Hourly Sales Distribution)
          </div>
          <div class="card-body" style="padding:16px;">
            <div class="chart-container" style="height:220px; position:relative;">
              <canvas id="hourlySalesChart"></canvas>
            </div>
          </div>
        </div>

        <!-- Operational Insights: Top Selling Products -->
        <div class="card fade-in" style="border:1px solid #e2e8f0; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,0.04); background:#fff; margin-bottom:24px;">
          <div class="card-header" style="border-bottom:1px solid #edf2f7; padding:14px 18px; font-weight:700; font-size:14px; color:#1e293b; display:flex; align-items:center; gap:8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            Top Selling Products
          </div>
          <div class="card-body" style="padding:0;">
            <div class="table-wrapper" style="border:none;">
              <table class="data-table" style="margin:0; font-size:13px;">
                <thead>
                  <tr style="background:#f8fafc;">
                    <th style="width:60px; text-align:center;">#</th>
                    <th>Product Name</th>
                    <th style="text-align:center; width:140px;">Units Sold</th>
                    <th style="text-align:right; width:180px;">Subtotal Revenue</th>
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
        const d = new Date();
        d.setDate(d.getDate() - 1);
        const y = d.toISOString().split('T')[0];
        document.getElementById('dash-from').value = y;
        document.getElementById('dash-to').value = y;
        document.getElementById('btn-filter').click();
      };

      document.getElementById('btn-this-week').onclick = () => {
        const now = new Date();
        const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
        const start = firstDay.toISOString().split('T')[0];
        document.getElementById('dash-from').value = start;
        document.getElementById('dash-to').value = H.today();
        document.getElementById('btn-filter').click();
      };

      document.getElementById('btn-this-month').onclick = () => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        document.getElementById('dash-from').value = `${y}-${m}-01`;
        document.getElementById('dash-to').value = H.today();
        document.getElementById('btn-filter').click();
      };

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

      const orders = await S.query('orders', o => H.isDateInRange(o.date, from, to));
      const orderItems = await S.getAll('orderItems');
      const payments = await S.getAll('payments');
      const products = await S.getAll('products');
      const expenses = await S.query('expenses', e => H.isDateInRange(e.date, from, to));
      const supplierPayments = await S.query('supplier-payments', sp => H.isDateInRange(sp.date, from, to));
      const settings = await S.getSettings();
      const isSupplierAsExpense = settings.supplier_as_expense === '1';

      let totalSales = 0;
      let totalDue = 0;
      let dueOrdersCount = 0;
      let cashSales = 0;
      let cardSales = 0;
      const paymentBreakdown = {};
      const paymentCount = {};

      H.paymentMethods.forEach(method => {
        paymentBreakdown[method] = 0;
        paymentCount[method] = 0;
      });

      orders.forEach(order => {
        const gTotal = parseFloat(order.grandTotal) || 0;
        const dAmt = parseFloat(order.dueAmount) || 0;
        totalSales += gTotal;
        totalDue += dAmt;
        if (dAmt > 0.01) dueOrdersCount++;

        // Sum payment methods for this order
        const ordPayments = payments.filter(p => p.orderId === order.id);
        if (ordPayments.length > 0) {
          ordPayments.forEach(p => {
            const amt = parseFloat(p.amount) || 0;
            const m = p.method || 'Cash';
            if (paymentBreakdown[m] !== undefined) {
              paymentBreakdown[m] += amt;
              paymentCount[m] = (paymentCount[m] || 0) + 1;
            } else {
              paymentBreakdown[m] = amt;
              paymentCount[m] = 1;
            }
            if (m === 'Cash') cashSales += amt;
            if (m === 'Card') cardSales += amt;
          });
        } else {
          // Fallback if order has direct paymentMethod
          const m = order.paymentMethod || 'Cash';
          const paid = parseFloat(order.paidAmount) || gTotal;
          if (paid > 0) {
            if (paymentBreakdown[m] !== undefined) {
              paymentBreakdown[m] += paid;
              paymentCount[m] = (paymentCount[m] || 0) + 1;
            } else {
              paymentBreakdown[m] = paid;
              paymentCount[m] = 1;
            }
            if (m === 'Cash') cashSales += paid;
            if (m === 'Card') cardSales += paid;
          }
        }
      });

      // Calculate profit: Sell Price - Cost Price
      let totalProfit = 0;
      let totalUnitsSold = 0;
      const uniqueSkusSold = new Set();

      orders.forEach(order => {
        const items = orderItems.filter(i => i.orderId === order.id);
        let orderCost = 0;
        items.forEach(item => {
          totalUnitsSold += (parseInt(item.qty) || 0);
          if (item.productId) uniqueSkusSold.add(item.productId);

          const product = products.find(p => p.id === item.productId);
          let cost = parseFloat(item.costPrice) || 0;
          if (product) {
            if (product.variations && product.variations.length > 0) {
              const variant = product.variations.find(v => v.name === item.variationName || (product.name + ' ' + v.name) === item.productName);
              cost = variant ? variant.costPrice : product.costPrice;
            } else {
              cost = product.costPrice;
            }
          }
          orderCost += (cost * item.qty);
        });

        const discountAllocated = parseFloat(order.discountAmount) || 0;
        const profitForOrder = (parseFloat(order.subtotal) || 0) - orderCost - discountAllocated;
        totalProfit += profitForOrder;
      });

      const aov = orders.length > 0 ? (totalSales / orders.length) : 0;
      const marginPct = totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : '0.0';

      // Update timestamp
      const lastUpdatedEl = document.getElementById('dash-last-updated');
      if (lastUpdatedEl) {
        const now = new Date();
        lastUpdatedEl.textContent = `Sync: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }

      // Expenses calculation
      let directExpenses = 0;
      let directPaidExpenses = 0;
      expenses.forEach(e => {
        const amt = parseFloat(e.amount) || 0;
        const paid = parseFloat(e.paid_amount) || (e.status === 'Paid' ? amt : 0);
        directExpenses += amt;
        directPaidExpenses += paid;
      });
      let directUnpaidExpenses = Math.max(0, directExpenses - directPaidExpenses);

      // Supplier payments calculation
      let totalSupplierPayments = 0;
      let paidSupplierPayments = 0;
      supplierPayments.forEach(sp => {
        const amt = parseFloat(sp.amount) || 0;
        const paid = parseFloat(sp.paid_amount) || (sp.status === 'Paid' ? amt : 0);
        totalSupplierPayments += amt;
        paidSupplierPayments += paid;
      });
      let unpaidSupplierPayments = Math.max(0, totalSupplierPayments - paidSupplierPayments);

      // If supplier_as_expense is turned on, reflect in expenses
      const displayedExpenseTotal = isSupplierAsExpense ? (directExpenses + totalSupplierPayments) : directExpenses;
      const displayedExpensePaid = isSupplierAsExpense ? (directPaidExpenses + paidSupplierPayments) : directPaidExpenses;
      const displayedExpenseUnpaid = isSupplierAsExpense ? (directUnpaidExpenses + unpaidSupplierPayments) : directUnpaidExpenses;

      // ── 1. Render Executive KPI Cards (High-Contrast Metrics) ─────
      const statsGrid = document.getElementById('dashboard-stats');
      statsGrid.innerHTML = `
        <!-- Total Revenue (Primary Hero Card) -->
        <div class="stat-card purple" style="background:linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border:none; border-radius:12px; padding:20px; box-shadow:0 4px 14px rgba(99,102,241,0.25); display:flex; align-items:center; gap:16px;">
          <div class="stat-icon" style="width:52px; height:52px; border-radius:12px; background:rgba(255,255,255,0.2); color:#ffffff; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
          </div>
          <div class="stat-info" style="min-width:0; flex:1;">
            <div class="stat-label" style="font-size:11px; font-weight:700; text-transform:uppercase; color:#ede9fe; letter-spacing:0.8px;">Gross Revenue</div>
            <div class="stat-value" style="font-size:24px; font-weight:800; color:#ffffff; margin-top:2px; line-height:1.1;">${H.formatCurrency(totalSales)}</div>
            <div style="font-size:11px; color:#ffffff; background:rgba(255,255,255,0.2); font-weight:700; padding:2px 8px; border-radius:12px; display:inline-flex; align-items:center; gap:4px; margin-top:5px;">
              <span>${orders.length} Completed Invoices</span>
            </div>
          </div>
        </div>

        <!-- Estimated Gross Profit -->
        <div class="stat-card green" style="background:#fff; border:1.5px solid #10b981; border-radius:12px; padding:20px; box-shadow:0 2px 8px rgba(16,185,129,0.08); display:flex; align-items:center; gap:16px;">
          <div class="stat-icon" style="width:52px; height:52px; border-radius:12px; background:#ecfdf5; color:#059669; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
          <div class="stat-info" style="min-width:0; flex:1;">
            <div class="stat-label" style="font-size:11px; font-weight:700; text-transform:uppercase; color:#334155; letter-spacing:0.8px;">Gross Profit</div>
            <div class="stat-value" style="font-size:24px; font-weight:800; color:#065f46; margin-top:2px; line-height:1.1;">${H.formatCurrency(totalProfit)}</div>
            <div style="font-size:11px; color:#065f46; background:#d1fae5; border:1px solid #a7f3d0; font-weight:700; padding:2px 8px; border-radius:12px; display:inline-flex; align-items:center; gap:4px; margin-top:5px;">
              <span>Margin: <strong>${marginPct}%</strong></span>
            </div>
          </div>
        </div>

        <!-- Expenses Amount Card -->
        <div class="stat-card red" style="background:#fff; border:1.5px solid #ef4444; border-radius:12px; padding:20px; box-shadow:0 2px 8px rgba(239,68,68,0.08); display:flex; align-items:center; gap:16px;">
          <div class="stat-icon" style="width:52px; height:52px; border-radius:12px; background:#fef2f2; color:#dc2626; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div class="stat-info" style="min-width:0; flex:1;">
            <div class="stat-label" style="font-size:11px; font-weight:700; text-transform:uppercase; color:#334155; letter-spacing:0.8px; display:flex; align-items:center; justify-content:space-between;">
              <span>Expenses Amount</span>
              ${isSupplierAsExpense ? '<span style="font-size:9px; background:#ecfdf5; color:#059669; padding:1px 5px; border-radius:4px; font-weight:700;">+Suppliers</span>' : ''}
            </div>
            <div class="stat-value" style="font-size:24px; font-weight:800; color:#b91c1c; margin-top:2px; line-height:1.1;">${H.formatCurrency(displayedExpenseTotal)}</div>
            <div style="font-size:11px; color:#64748b; margin-top:5px; font-weight:600; line-height:1.3;">
              Paid Amount: <span style="font-weight:700; color:#059669;">${H.formatCurrency(displayedExpensePaid)}</span> &bull; Unpaid Amount: <span style="font-weight:700; color:#dc2626;">${H.formatCurrency(displayedExpenseUnpaid)}</span>
            </div>
          </div>
        </div>

        <!-- Supplier Payments Card -->
        <div class="stat-card amber" style="background:#fff; border:1.5px solid #f59e0b; border-radius:12px; padding:20px; box-shadow:0 2px 8px rgba(245,158,11,0.08); display:flex; align-items:center; gap:16px;">
          <div class="stat-icon" style="width:52px; height:52px; border-radius:12px; background:#fffbeb; color:#d97706; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
          </div>
          <div class="stat-info" style="min-width:0; flex:1;">
            <div class="stat-label" style="font-size:11px; font-weight:700; text-transform:uppercase; color:#334155; letter-spacing:0.8px;">Supplier Payments</div>
            <div class="stat-value" style="font-size:24px; font-weight:800; color:#b45309; margin-top:2px; line-height:1.1;">${H.formatCurrency(totalSupplierPayments)}</div>
            <div style="font-size:11px; color:#64748b; margin-top:5px; font-weight:600; line-height:1.3;">
              Paid Amount: <span style="font-weight:700; color:#059669;">${H.formatCurrency(paidSupplierPayments)}</span> &bull; Unpaid Amount: <span style="font-weight:700; color:#dc2626;">${H.formatCurrency(unpaidSupplierPayments)}</span>
            </div>
          </div>
        </div>

        <!-- Average Order Value (AOV) -->
        <div class="stat-card blue" style="background:#fff; border:1.5px solid #3b82f6; border-radius:12px; padding:20px; box-shadow:0 2px 8px rgba(59,130,246,0.08); display:flex; align-items:center; gap:16px;">
          <div class="stat-icon" style="width:52px; height:52px; border-radius:12px; background:#eff6ff; color:#2563eb; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          </div>
          <div class="stat-info" style="min-width:0; flex:1;">
            <div class="stat-label" style="font-size:11px; font-weight:700; text-transform:uppercase; color:#334155; letter-spacing:0.8px;">Avg Order Value</div>
            <div class="stat-value" style="font-size:24px; font-weight:800; color:#1e40af; margin-top:2px; line-height:1.1;">${H.formatCurrency(aov)}</div>
            <div style="font-size:11px; color:#1e40af; background:#dbeafe; border:1px solid #bfdbfe; font-weight:700; padding:2px 8px; border-radius:12px; display:inline-flex; align-items:center; gap:4px; margin-top:5px;">
              <span>Spend per Customer</span>
            </div>
          </div>
        </div>

        <!-- Total Items Sold -->
        <div class="stat-card teal" style="background:#fff; border:1.5px solid #0d9488; border-radius:12px; padding:20px; box-shadow:0 2px 8px rgba(13,148,136,0.08); display:flex; align-items:center; gap:16px;">
          <div class="stat-icon" style="width:52px; height:52px; border-radius:12px; background:#f0fdfa; color:#0d9488; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
          </div>
          <div class="stat-info" style="min-width:0; flex:1;">
            <div class="stat-label" style="font-size:11px; font-weight:700; text-transform:uppercase; color:#334155; letter-spacing:0.8px;">Units Sold</div>
            <div class="stat-value" style="font-size:24px; font-weight:800; color:#115e59; margin-top:2px; line-height:1.1;">${totalUnitsSold} <span style="font-size:13px; font-weight:600; color:#0d9488;">pcs</span></div>
            <div style="font-size:11px; color:#115e59; background:#ccfbf1; border:1px solid #99f6e4; font-weight:700; padding:2px 8px; border-radius:12px; display:inline-flex; align-items:center; gap:4px; margin-top:5px;">
              <span>Across ${uniqueSkusSold.size} SKUs</span>
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
        const displayMethods = [...H.paymentMethods];
        Object.keys(paymentBreakdown).forEach(m => {
          if (!displayMethods.includes(m)) displayMethods.push(m);
        });

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
      this.renderCharts(orders, paymentBreakdown, from, to);
      this.renderTopSelling(orders, orderItems);
    },

    renderCharts(orders, paymentBreakdown, from, to) {
      const H = POS.Helpers;

      const diffTime = Math.abs(new Date(to) - new Date(from));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      // 1. Sales Trend (by day)
      const dailySales = {};
      orders.forEach(o => {
        const day = H.formatDate(o.date);
        dailySales[day] = (dailySales[day] || 0) + (parseFloat(o.grandTotal) || 0);
      });

      const trendLabels = Object.keys(dailySales).reverse();
      const trendData = Object.values(dailySales).reverse();

      const ctxTrend = document.getElementById('salesTrendChart').getContext('2d');
      if (window.trendChart) window.trendChart.destroy();

      // Create rich gradient
      const gradient = ctxTrend.createLinearGradient(0, 0, 0, 240);
      gradient.addColorStop(0, 'rgba(124, 58, 237, 0.25)');
      gradient.addColorStop(1, 'rgba(124, 58, 237, 0.0)');

      window.trendChart = new Chart(ctxTrend, {
        type: 'line',
        data: {
          labels: trendLabels.length ? trendLabels : ['No Data'],
          datasets: [{
            label: 'Sales Revenue',
            data: trendData.length ? trendData : [0],
            borderColor: '#7C3AED',
            backgroundColor: gradient,
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: 4,
            pointBackgroundColor: '#7C3AED',
            pointBorderColor: '#fff',
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => `Revenue: ${H.formatCurrency(context.raw)}`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0, 0, 0, 0.04)' }
            },
            x: {
              grid: { display: false }
            }
          }
        }
      });

      // 2. Payment Method Distribution (Authentic Brand Colors)
      const payLabels = Object.keys(paymentBreakdown).filter(k => paymentBreakdown[k] > 0);
      const payData = payLabels.map(k => paymentBreakdown[k]);
      const payColors = payLabels.map(k => H.getPaymentMethodColor(k));

      const ctxPay = document.getElementById('paymentMethodChart').getContext('2d');
      if (window.payChart) window.payChart.destroy();
      window.payChart = new Chart(ctxPay, {
        type: 'doughnut',
        data: {
          labels: payLabels.length ? payLabels : ['No Transactions'],
          datasets: [{
            data: payData.length ? payData : [1],
            backgroundColor: payColors.length ? payColors : ['#CBD5E1'],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 12,
                padding: 12,
                font: { size: 12, weight: 600 }
              }
            },
            tooltip: {
              callbacks: {
                label: (context) => `${context.label}: ${H.formatCurrency(context.raw)}`
              }
            }
          }
        }
      });

      // 3. 24-Hour Distribution (Hourly peaks)
      const hourlyCounts = Array(24).fill(0);
      orders.forEach(o => {
        const hr = new Date(o.date).getHours();
        if (hr >= 0 && hr < 24) {
          hourlyCounts[hr]++;
        }
      });

      const hourlyData = diffDays > 2 
        ? hourlyCounts.map(c => parseFloat((c / diffDays).toFixed(2))) 
        : hourlyCounts;

      const hourLabels = Array.from({ length: 24 }, (_, i) => {
        const h = i % 12 || 12;
        const ampm = i < 12 ? 'AM' : 'PM';
        return `${h} ${ampm}`;
      });

      const maxHourly = Math.max(...hourlyCounts, 1);
      const barColors = hourlyCounts.map(val => val === maxHourly && val > 0 ? '#7C3AED' : 'rgba(59, 130, 246, 0.7)');

      const ctxHour = document.getElementById('hourlySalesChart').getContext('2d');
      if (window.hourChart) window.hourChart.destroy();
      window.hourChart = new Chart(ctxHour, {
        type: 'bar',
        data: {
          labels: hourLabels,
          datasets: [{
            label: diffDays > 2 ? 'Avg Hourly Invoices' : 'Hourly Invoices',
            data: hourlyData,
            backgroundColor: barColors,
            borderColor: '#3B82F6',
            borderWidth: 1,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => `Traffic: ${context.raw} invoice(s)`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { precision: 0 },
              grid: { color: 'rgba(0, 0, 0, 0.04)' }
            },
            x: {
              grid: { display: false }
            }
          }
        }
      });
    },

    renderTopSelling(orders, orderItems) {
      const H = POS.Helpers;
      const orderIds = orders.map(o => o.id);
      const items = orderItems.filter(i => orderIds.includes(i.orderId));

      const totals = {};
      items.forEach(i => {
        const key = i.productName + (i.variationName ? ` (${i.variationName})` : '');
        if (!totals[key]) {
          totals[key] = { qty: 0, amount: 0 };
        }
        totals[key].qty += (parseInt(i.qty) || 0);
        totals[key].amount += (parseFloat(i.total) || 0);
      });

      const sorted = Object.entries(totals)
        .sort((a, b) => b[1].qty - a[1].qty)
        .slice(0, 5);

      const tbody = document.getElementById('top-selling-tbody');
      tbody.innerHTML = '';

      if (sorted.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:24px; color:#94a3b8; font-style:italic;">No sales recorded in selected range.</td></tr>`;
        return;
      }

      const maxQty = sorted[0][1].qty || 1;

      sorted.forEach(([name, data], idx) => {
        const rankMedals = ['🥇', '🥈', '🥉', '4', '5'];
        const medal = rankMedals[idx] || (idx + 1);
        const barWidth = Math.round((data.qty / maxQty) * 100);

        tbody.innerHTML += `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="text-align:center; font-weight:700; font-size:14px;">${medal}</td>
            <td style="padding:10px 12px;">
              <div style="font-weight:600; color:#1e293b;">${H.esc(name)}</div>
              <div style="width:100%; height:4px; background:#f1f5f9; border-radius:3px; margin-top:4px; overflow:hidden;">
                <div style="width:${barWidth}%; height:100%; background:#f59e0b; border-radius:3px;"></div>
              </div>
            </td>
            <td style="text-align:center; font-weight:700; color:#334155;">${data.qty}</td>
            <td style="text-align:right; font-weight:700; color:#059669;">${H.formatCurrency(data.amount)}</td>
          </tr>
        `;
      });
    }
  };

  window.POS = window.POS || {};
  window.POS.Dashboard = Dashboard;
})();
