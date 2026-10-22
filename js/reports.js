(function () {
  'use strict';

  const Reports = {
    getPeriodDates(period) {
      const H = POS.Helpers;
      const today = H.today();
      if (period === 'today') {
        return { from: today, to: today };
      }
      if (period === 'yesterday') {
        const y = H.yesterday();
        return { from: y, to: y };
      }
      if (period === 'this-week') {
        const now = new Date();
        const day = now.getDay(); // 0 is Sunday
        const startOfWeek = H.addDays(today, -day);
        return { from: startOfWeek, to: today };
      }
      if (period === 'this-month') {
        const p = H.getBDDateParts(new Date());
        const pad = n => String(n).padStart(2, '0');
        return { from: `${p.year}-${pad(p.month)}-01`, to: today };
      }
      return {
        from: localStorage.getItem('rep_from') || today,
        to: localStorage.getItem('rep_to') || today
      };
    },

    async render(type) {
      const mc = document.getElementById('main-content');
      const H = POS.Helpers;

      const titleMap = {
        'daily-sale': 'Daily Sale Report',
        'top-selling': 'Top Selling Products Report',
        'slow-selling': 'Slow Selling Products Report',
        'payment-method': 'Payment Method Report',
        'sales-summary': 'Sales Summary Report',
        'overall-profit': 'Overall Profit Report'
      };

      const title = titleMap[type] || 'Reports Overview';

      let currentPeriod = localStorage.getItem('rep_period') || 'today';
      let dates = this.getPeriodDates(currentPeriod);
      let fromDate = dates.from;
      let toDate = dates.to;
      if (currentPeriod === 'custom') {
        fromDate = localStorage.getItem('rep_from') || H.today();
        toDate = localStorage.getItem('rep_to') || H.today();
      }

      mc.innerHTML = `
        <!-- Top Bar: Date Range Filter + Export Action (Named Header Card Removed) -->
        <div class="filter-bar fade-in" style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:14px; margin-bottom:18px; background:#fff; padding:14px 18px; border-radius:12px; border:1px solid #EAE4D9; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
          <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:12px; font-weight:800; color:#64748B; text-transform:uppercase; letter-spacing:0.5px;">Filter:</span>
              <div class="btn-group" style="display:flex; gap:6px; background:#F8FAFC; padding:4px; border-radius:10px; border:1px solid #E2E8F0;">
                <button class="btn btn-sm rep-period-btn ${currentPeriod === 'today' ? 'active' : ''}" data-period="today" style="border-radius:7px; font-weight:700; padding:6px 14px; font-size:12.5px;">Today</button>
                <button class="btn btn-sm rep-period-btn ${currentPeriod === 'yesterday' ? 'active' : ''}" data-period="yesterday" style="border-radius:7px; font-weight:700; padding:6px 14px; font-size:12.5px;">Yesterday</button>
                <button class="btn btn-sm rep-period-btn ${currentPeriod === 'this-week' ? 'active' : ''}" data-period="this-week" style="border-radius:7px; font-weight:700; padding:6px 14px; font-size:12.5px;">This Week</button>
                <button class="btn btn-sm rep-period-btn ${currentPeriod === 'this-month' ? 'active' : ''}" data-period="this-month" style="border-radius:7px; font-weight:700; padding:6px 14px; font-size:12.5px;">This Month</button>
                <button class="btn btn-sm rep-period-btn ${currentPeriod === 'custom' ? 'active' : ''}" data-period="custom" style="border-radius:7px; font-weight:700; padding:6px 14px; font-size:12.5px;">Custom</button>
              </div>
            </div>

            <!-- Date inputs: Shown on Custom -->
            <div id="rep-custom-date-container" style="display:${currentPeriod === 'custom' ? 'flex' : 'none'}; gap:10px; align-items:center; flex-wrap:wrap;">
              <div class="form-group" style="margin-bottom:0; display:flex; align-items:center; gap:6px;">
                <label class="form-label" style="margin:0; font-size:12px; font-weight:700; color:#64748B;">From:</label>
                <input type="date" class="form-input" id="rep-from" value="${fromDate}" style="height:34px; font-size:13px; border-radius:8px; padding:0 8px;">
              </div>
              <div class="form-group" style="margin-bottom:0; display:flex; align-items:center; gap:6px;">
                <label class="form-label" style="margin:0; font-size:12px; font-weight:700; color:#64748B;">To:</label>
                <input type="date" class="form-input" id="rep-to" value="${toDate}" style="height:34px; font-size:13px; border-radius:8px; padding:0 8px;">
              </div>
              <button class="btn btn-primary btn-sm" id="btn-apply-rep-filter" style="height:34px; padding:0 14px; font-weight:700; border-radius:8px; background:#10B981; border-color:#10B981;">Apply</button>
            </div>

            <!-- Active range badge when not in custom mode -->
            <div id="rep-range-indicator" style="display:${currentPeriod !== 'custom' ? 'flex' : 'none'}; align-items:center; gap:6px; background:#F8FAFC; border:1px solid #CBD5E1; padding:6px 14px; border-radius:8px; font-size:12.5px; font-weight:600; color:#475569;">
              <span>📅</span>
              <span id="rep-range-text" style="color:#0F172A; font-weight:700;">${H.formatDate(fromDate)} to ${H.formatDate(toDate)}</span>
            </div>
          </div>

          <!-- Export CSV button on top right -->
          <div>
            <button class="btn btn-success btn-sm" id="btn-export-rep" style="height:36px; padding:0 16px; font-weight:700; display:flex; align-items:center; gap:6px; border-radius:8px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div id="report-output-container" class="fade-in"></div>
      `;

      // Filter events
      document.querySelectorAll('.rep-period-btn').forEach(btn => {
        btn.onclick = async () => {
          document.querySelectorAll('.rep-period-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const p = btn.dataset.period;
          currentPeriod = p;
          localStorage.setItem('rep_period', p);

          const customContainer = document.getElementById('rep-custom-date-container');
          const rangeIndicator = document.getElementById('rep-range-indicator');

          if (p === 'custom') {
            if (customContainer) customContainer.style.display = 'flex';
            if (rangeIndicator) rangeIndicator.style.display = 'none';
          } else {
            if (customContainer) customContainer.style.display = 'none';
            if (rangeIndicator) rangeIndicator.style.display = 'flex';
            const range = this.getPeriodDates(p);
            fromDate = range.from;
            toDate = range.to;
            const elFrom = document.getElementById('rep-from');
            const elTo = document.getElementById('rep-to');
            const elText = document.getElementById('rep-range-text');
            if (elFrom) elFrom.value = fromDate;
            if (elTo) elTo.value = toDate;
            if (elText) elText.textContent = `${H.formatDate(fromDate)} to ${H.formatDate(toDate)}`;
            await this.generateReport(type, fromDate, toDate);
          }
        };
      });

      const applyBtn = document.getElementById('btn-apply-rep-filter');
      if (applyBtn) {
        applyBtn.onclick = async () => {
          const elFrom = document.getElementById('rep-from');
          const elTo = document.getElementById('rep-to');
          fromDate = elFrom ? elFrom.value : H.today();
          toDate = elTo ? elTo.value : H.today();
          localStorage.setItem('rep_from', fromDate);
          localStorage.setItem('rep_to', toDate);
          await this.generateReport(type, fromDate, toDate);
        };
      }

      document.getElementById('btn-export-rep').onclick = async () => {
        await this.exportReportCSV(type, fromDate, toDate);
      };

      // Generate initial state
      await this.generateReport(type, fromDate, toDate);
    },

    async getRangeOrders(from, to) {
      const S = POS.Store;
      const H = POS.Helpers;
      try {
        if (from || to) {
          const q = new URLSearchParams();
          if (from) q.set('from', from);
          if (to) q.set('to', to);
          q.set('limit', '50000');
          const res = await fetch('/api/orders?' + q.toString());
          if (res.ok) {
            const data = await res.json();
            return Array.isArray(data) ? data : (data.orders || []);
          }
        }
      } catch (e) {}
      return await S.query('orders', o => H.isDateInRange(o.date, from, to));
    },

    async getRangeOrderItems(from, to) {
      const S = POS.Store;
      try {
        if (from || to) {
          const q = new URLSearchParams();
          if (from) q.set('from', from);
          if (to) q.set('to', to);
          const res = await fetch('/api/orderItems?' + q.toString());
          if (res.ok) return await res.json();
        }
      } catch (e) {}
      return await S.getAll('orderItems');
    },

    async getRangePayments(from, to) {
      const S = POS.Store;
      try {
        if (from || to) {
          const q = new URLSearchParams();
          if (from) q.set('from', from);
          if (to) q.set('to', to);
          const res = await fetch('/api/payments?' + q.toString());
          if (res.ok) return await res.json();
        }
      } catch (e) {}
      return await S.getAll('payments');
    },

    async generateReport(type, from, to) {
      const container = document.getElementById('report-output-container');
      const S = POS.Store;
      const H = POS.Helpers;

      const orders = await this.getRangeOrders(from, to);
      const orderItems = await this.getRangeOrderItems(from, to);
      const products = await S.getAll('products');
      const payments = await this.getRangePayments(from, to);

      switch (type) {
        case 'daily-sale':
          this.dailySaleReport(container, orders, H);
          break;
        case 'product-profit':
          this.productProfitReport(container, orders, orderItems, products, H);
          break;
        case 'top-selling':
          this.rankProductsReport(container, orders, orderItems, products, true, H);
          break;
        case 'slow-selling':
          this.rankProductsReport(container, orders, orderItems, products, false, H);
          break;
        case 'payment-method':
          this.paymentMethodReport(container, orders, payments, H);
          break;
        case 'sales-summary':
          this.salesSummaryReport(container, orders, H);
          break;
        case 'overall-profit':
          await this.overallProfitReport(container, orders, orderItems, products, S, H, from, to);
          break;
        default:
          container.innerHTML = `<div class="card"><div class="card-body">Please select a valid report option from the sidebar menu.</div></div>`;
      }
    },

    dailySaleReport(container, orders, H) {
      const salesByDay = {};

      orders.forEach(o => {
        const day = H.formatDate(o.date);
        if (!salesByDay[day]) {
          salesByDay[day] = { count: 0, subtotal: 0, discount: 0, tax: 0, total: 0 };
        }
        const sub = parseFloat(o.subtotal) || 0;
        const disc = parseFloat(o.discountAmount) || 0;
        const tax = parseFloat(o.taxAmount) || 0;
        const total = parseFloat(o.grandTotal) || 0;

        salesByDay[day].count++;
        salesByDay[day].subtotal += sub;
        salesByDay[day].discount += disc;
        salesByDay[day].tax += tax;
        salesByDay[day].total += total;
      });

      let tbodyRows = '';
      let sumCount = 0, sumSub = 0, sumDisc = 0, sumTax = 0, sumTotal = 0;

      Object.entries(salesByDay).forEach(([day, d]) => {
        sumCount += d.count;
        sumSub += d.subtotal;
        sumDisc += d.discount;
        sumTax += d.tax;
        sumTotal += d.total;

        tbodyRows += `
          <tr>
            <td style="font-weight:600;">${day}</td>
            <td class="text-center">${d.count}</td>
            <td class="text-right">${H.formatCurrency(d.subtotal)}</td>
            <td class="text-right text-danger">-${H.formatCurrency(d.discount)}</td>
            <td class="text-right">${H.formatCurrency(d.tax)}</td>
            <td class="text-right" style="font-weight:700; color:var(--primary);">${H.formatCurrency(d.total)}</td>
          </tr>
        `;
      });

      container.innerHTML = `
        <div class="card">
          <div class="card-body">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th class="text-center">Invoices Issued</th>
                    <th class="text-right">Subtotal</th>
                    <th class="text-right">Discount</th>
                    <th class="text-right">Tax</th>
                    <th class="text-right">Total sales</th>
                  </tr>
                </thead>
                <tbody>
                  ${tbodyRows || '<tr><td colspan="6" class="text-center text-muted">No sales orders found in this date range.</td></tr>'}
                  ${tbodyRows ? `
                    <tr class="total-row">
                      <td>Total Summary</td>
                      <td class="text-center">${sumCount}</td>
                      <td class="text-right">${H.formatCurrency(sumSub)}</td>
                      <td class="text-right text-danger">-${H.formatCurrency(sumDisc)}</td>
                      <td class="text-right">${H.formatCurrency(sumTax)}</td>
                      <td class="text-right" style="color:var(--primary);">${H.formatCurrency(sumTotal)}</td>
                    </tr>
                  ` : ''}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    },

    productProfitReport(container, orders, orderItems, products, H) {
      const orderIds = orders.map(o => o.id);
      const items = orderItems.filter(i => orderIds.includes(i.orderId));

      const profitByProduct = {};

      items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        let costPrice = parseFloat(item.costPrice) || 0;
        if (prod) {
          if (prod.variations && prod.variations.length > 0) {
            const v = prod.variations.find(v => v.name === item.variationName || (prod.name + ' ' + v.name) === item.productName);
            costPrice = v ? v.costPrice : prod.costPrice;
          } else {
            costPrice = prod.costPrice;
          }
        }

        const key = item.productId + '_' + (item.variationName || '');
        if (!profitByProduct[key]) {
          profitByProduct[key] = {
            name: item.productName + (item.variationName ? ` (${item.variationName})` : ''),
            qtySold: 0,
            revenue: 0,
            cost: 0
          };
        }

        const itemQty = parseInt(item.qty, 10) || 0;
        const itemTotal = parseFloat(item.total) || 0;

        profitByProduct[key].qtySold += itemQty;
        profitByProduct[key].revenue += itemTotal;
        profitByProduct[key].cost += (costPrice * itemQty);
      });

      const allRows = Object.values(profitByProduct);
      let grandQty = 0, grandRevenue = 0, grandCost = 0, grandProfit = 0;

      allRows.forEach(d => {
        const profit = d.revenue - d.cost;
        d.profit = profit;
        d.margin = d.revenue > 0 ? (profit / d.revenue) * 100 : 0;

        grandQty += d.qtySold;
        grandRevenue += d.revenue;
        grandCost += d.cost;
        grandProfit += profit;
      });

      const avgMargin = grandRevenue > 0 ? (grandProfit / grandRevenue) * 100 : 0;

      container.innerHTML = `
        <div class="card">
          <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <span style="font-weight:700;">📊 Product Profitability Analysis</span>
            <div style="display:flex; align-items:center; gap:6px;">
              <label style="font-size:12px; color:#64748b; font-weight:500; margin:0;">Show:</label>
              <select id="pp-limit-select" class="form-select" style="width:auto; padding:2px 8px; font-size:12px; height:28px;">
                <option value="10">10</option>
                <option value="50" selected>50</option>
                <option value="100">100</option>
                <option value="250">250</option>
                <option value="500">500</option>
                <option value="custom">Custom...</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>
          <div class="card-body">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Product / Variant</th>
                    <th class="text-center" style="width: 100px;">Qty Sold</th>
                    <th class="text-right" style="width: 130px;">Total Cost</th>
                    <th class="text-right" style="width: 130px;">Total Sales</th>
                    <th class="text-right" style="width: 130px;">Profit</th>
                    <th class="text-center" style="width: 120px;">Profit Margin</th>
                  </tr>
                </thead>
                <tbody id="pp-tbody"></tbody>
                ${allRows.length > 0 ? `
                  <tfoot>
                    <tr class="total-row">
                      <td>Grand Totals</td>
                      <td class="text-center">${grandQty}</td>
                      <td class="text-right">${H.formatCurrency(grandCost)}</td>
                      <td class="text-right">${H.formatCurrency(grandRevenue)}</td>
                      <td class="text-right text-success">${H.formatCurrency(grandProfit)}</td>
                      <td class="text-center">${avgMargin.toFixed(1)}%</td>
                    </tr>
                  </tfoot>
                ` : ''}
              </table>
            </div>
            <div id="pp-pagination" style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; font-size:12px; color:#64748b;"></div>
          </div>
        </div>
      `;

      let ppPage = 1;
      let ppLimit = 50;

      const renderPPTable = () => {
        const tbody = document.getElementById('pp-tbody');
        const pag = document.getElementById('pp-pagination');
        if (!tbody || !pag) return;

        const totalItems = allRows.length;
        if (totalItems === 0) {
          tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No sales items recorded in date range.</td></tr>';
          pag.innerHTML = '';
          return;
        }

        const effectiveLimit = ppLimit === 'all' ? totalItems : ppLimit;
        const totalPages = Math.ceil(totalItems / effectiveLimit) || 1;
        if (ppPage > totalPages) ppPage = totalPages;
        if (ppPage < 1) ppPage = 1;

        const startIdx = (ppPage - 1) * effectiveLimit;
        const pageItems = allRows.slice(startIdx, startIdx + effectiveLimit);

        tbody.innerHTML = pageItems.map(d => `
          <tr>
            <td style="font-weight:600;">${H.esc(d.name)}</td>
            <td class="text-center">${d.qtySold}</td>
            <td class="text-right">${H.formatCurrency(d.cost)}</td>
            <td class="text-right">${H.formatCurrency(d.revenue)}</td>
            <td class="text-right text-success" style="font-weight:700;">${H.formatCurrency(d.profit)}</td>
            <td class="text-center" style="font-weight:600;">${d.margin.toFixed(1)}%</td>
          </tr>
        `).join('');

        const endIdx = Math.min(startIdx + pageItems.length, totalItems);
        pag.innerHTML = `
          <div>Showing ${startIdx + 1}–${endIdx} of ${totalItems} items</div>
          <div style="display:flex; gap:6px; align-items:center;">
            <button class="btn btn-secondary btn-sm" id="btn-pp-prev" ${ppPage <= 1 ? 'disabled' : ''} style="padding:2px 8px; font-size:11px;">&laquo; Prev</button>
            <span style="font-weight:600;">${ppPage} / ${totalPages}</span>
            <button class="btn btn-secondary btn-sm" id="btn-pp-next" ${ppPage >= totalPages ? 'disabled' : ''} style="padding:2px 8px; font-size:11px;">Next &raquo;</button>
          </div>
        `;

        const prevBtn = document.getElementById('btn-pp-prev');
        const nextBtn = document.getElementById('btn-pp-next');
        if (prevBtn) prevBtn.onclick = () => { if (ppPage > 1) { ppPage--; renderPPTable(); } };
        if (nextBtn) nextBtn.onclick = () => { if (ppPage < totalPages) { ppPage++; renderPPTable(); } };
      };

      const ppLimitSelect = document.getElementById('pp-limit-select');
      if (ppLimitSelect) {
        ppLimitSelect.onchange = async () => {
          const val = ppLimitSelect.value;
          if (val === 'custom') {
            const customVal = await H.prompt('Enter number of rows to display per page:', '150');
            const num = parseInt(customVal, 10);
            if (num && num > 0) {
              ppLimit = num;
              ppPage = 1;
              renderPPTable();
            } else {
              ppLimitSelect.value = String(ppLimit);
            }
          } else if (val === 'all') {
            ppLimit = 'all';
            ppPage = 1;
            renderPPTable();
          } else {
            ppLimit = parseInt(val, 10) || 50;
            ppPage = 1;
            renderPPTable();
          }
        };
      }

      renderPPTable();
    },

    rankProductsReport(container, orders, orderItems, products, isTopSelling, H) {
      const orderIds = orders.map(o => o.id);
      const items = orderItems.filter(i => orderIds.includes(i.orderId));

      const totals = {};

      // For slow-selling report, populate all catalog active products first so zero-sales items show at top
      if (!isTopSelling && Array.isArray(products)) {
        products.forEach(p => {
          if (p.status === 'Trash' || p.deletedAt) return;
          if (p.variations && p.variations.length > 0) {
            p.variations.forEach(v => {
              const key = `${p.name} (${v.name})`;
              totals[key] = { qty: 0, amount: 0 };
            });
          } else {
            totals[p.name] = { qty: 0, amount: 0 };
          }
        });
      }

      items.forEach(i => {
        const key = i.productName + (i.variationName ? ` (${i.variationName})` : '');
        if (!totals[key]) {
          totals[key] = { qty: 0, amount: 0 };
        }
        totals[key].qty += (parseInt(i.qty, 10) || 0);
        totals[key].amount += (parseFloat(i.total) || 0);
      });

      // Sort logic
      const sorted = Object.entries(totals).sort((a, b) =>
        isTopSelling ? b[1].qty - a[1].qty : a[1].qty - b[1].qty
      );

      const title = isTopSelling ? '🔥 Top Selling Products' : '📉 Slow Selling Products';

      container.innerHTML = `
        <div class="card">
          <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <span style="font-weight:700;">${title}</span>
            <div style="display:flex; align-items:center; gap:6px;">
              <label style="font-size:12px; color:#64748b; font-weight:500; margin:0;">Show:</label>
              <select id="rank-limit-select" class="form-select" style="width:auto; padding:2px 8px; font-size:12px; height:28px;">
                <option value="10">10</option>
                <option value="50" selected>50</option>
                <option value="100">100</option>
                <option value="250">250</option>
                <option value="500">500</option>
                <option value="custom">Custom...</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>
          <div class="card-body">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th class="text-center" style="width: 80px;">Rank</th>
                    <th>Product / Variant</th>
                    <th class="text-center" style="width: 120px;">Qty Sold</th>
                    <th class="text-right" style="width: 140px;">Gross Amount</th>
                  </tr>
                </thead>
                <tbody id="rank-tbody"></tbody>
              </table>
            </div>
            <div id="rank-pagination" style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; font-size:12px; color:#64748b;"></div>
          </div>
        </div>
      `;

      let rankPage = 1;
      let rankLimit = 50;

      const renderRankTable = () => {
        const tbody = document.getElementById('rank-tbody');
        const pag = document.getElementById('rank-pagination');
        if (!tbody || !pag) return;

        const totalItems = sorted.length;
        if (totalItems === 0) {
          tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No sales items recorded in date range.</td></tr>';
          pag.innerHTML = '';
          return;
        }

        const effectiveLimit = rankLimit === 'all' ? totalItems : rankLimit;
        const totalPages = Math.ceil(totalItems / effectiveLimit) || 1;
        if (rankPage > totalPages) rankPage = totalPages;
        if (rankPage < 1) rankPage = 1;

        const startIdx = (rankPage - 1) * effectiveLimit;
        const pageItems = sorted.slice(startIdx, startIdx + effectiveLimit);

        tbody.innerHTML = pageItems.map(([name, data], idx) => `
          <tr>
            <td class="text-center" style="font-weight:700;">#${startIdx + idx + 1}</td>
            <td style="font-weight:600;">${H.esc(name)}</td>
            <td class="text-center" style="font-weight:600;">${data.qty}</td>
            <td class="text-right text-success" style="font-weight:700;">${H.formatCurrency(data.amount)}</td>
          </tr>
        `).join('');

        const endIdx = Math.min(startIdx + pageItems.length, totalItems);
        pag.innerHTML = `
          <div>Showing ${startIdx + 1}–${endIdx} of ${totalItems} ranked items</div>
          <div style="display:flex; gap:6px; align-items:center;">
            <button class="btn btn-secondary btn-sm" id="btn-rank-prev" ${rankPage <= 1 ? 'disabled' : ''} style="padding:2px 8px; font-size:11px;">&laquo; Prev</button>
            <span style="font-weight:600;">${rankPage} / ${totalPages}</span>
            <button class="btn btn-secondary btn-sm" id="btn-rank-next" ${rankPage >= totalPages ? 'disabled' : ''} style="padding:2px 8px; font-size:11px;">Next &raquo;</button>
          </div>
        `;

        const prevBtn = document.getElementById('btn-rank-prev');
        const nextBtn = document.getElementById('btn-rank-next');
        if (prevBtn) prevBtn.onclick = () => { if (rankPage > 1) { rankPage--; renderRankTable(); } };
        if (nextBtn) nextBtn.onclick = () => { if (rankPage < totalPages) { rankPage++; renderRankTable(); } };
      };

      const rankLimitSelect = document.getElementById('rank-limit-select');
      if (rankLimitSelect) {
        rankLimitSelect.onchange = async () => {
          const val = rankLimitSelect.value;
          if (val === 'custom') {
            const customVal = await H.prompt('Enter number of rows to display per page:', '150');
            const num = parseInt(customVal, 10);
            if (num && num > 0) {
              rankLimit = num;
              rankPage = 1;
              renderRankTable();
            } else {
              rankLimitSelect.value = String(rankLimit);
            }
          } else if (val === 'all') {
            rankLimit = 'all';
            rankPage = 1;
            renderRankTable();
          } else {
            rankLimit = parseInt(val, 10) || 50;
            rankPage = 1;
            renderRankTable();
          }
        };
      }

      renderRankTable();
    },

    paymentMethodReport(container, orders, payments, H) {
      const methods = {};
      H.paymentMethods.forEach(m => {
        methods[m] = { txn: 0, amount: 0 };
      });

      const orderIds = orders.map(o => o.id);
      const matchedPayments = payments.filter(p => orderIds.includes(p.orderId));

      matchedPayments.forEach(p => {
        const methodName = (p.method || 'Cash').trim();
        if (!methods[methodName]) {
          methods[methodName] = { txn: 0, amount: 0 };
        }
        methods[methodName].txn++;
        methods[methodName].amount += (parseFloat(p.amount) || 0);
      });

      let rows = '';
      let grandTxn = 0, grandAmount = 0;
      Object.entries(methods).forEach(([method, d]) => {
        if (d.amount > 0 || d.txn > 0) {
          grandTxn += d.txn;
          grandAmount += d.amount;

          rows += `
            <tr>
              <td style="font-weight:600;">${method}</td>
              <td class="text-center">${d.txn}</td>
              <td class="text-right text-success" style="font-weight:700;">${H.formatCurrency(d.amount)}</td>
            </tr>
          `;
        }
      });

      container.innerHTML = `
        <div class="card">
          <div class="card-body">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Payment Method</th>
                    <th class="text-center" style="width:150px;">Transactions</th>
                    <th class="text-right" style="width:200px;">Settled Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows || '<tr><td colspan="3" class="text-center text-muted">No transaction logs recorded in date range.</td></tr>'}
                  ${rows ? `
                    <tr class="total-row">
                      <td>Sum Summary</td>
                      <td class="text-center">${grandTxn}</td>
                      <td class="text-right text-success">${H.formatCurrency(grandAmount)}</td>
                    </tr>
                  ` : ''}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    },

    stockValueReport(container, products, Store, H) {
      let totalQty = 0, totalValCost = 0, totalValRetail = 0, totalProfitPotential = 0;
      const stockItems = [];

      products.forEach(p => {
        const cat = Store.getById('categories', p.categoryId);
        const catName = cat ? cat.name : 'N/A';

        if (p.variations && p.variations.length > 0) {
          p.variations.forEach(v => {
            const stock = parseInt(v.stock, 10) || 0;
            const costPrice = parseFloat(v.costPrice) || 0;
            const price = parseFloat(v.price) || 0;
            const valCost = costPrice * stock;
            const valRetail = price * stock;
            const potentialProfit = valRetail - valCost;

            totalQty += stock;
            totalValCost += valCost;
            totalValRetail += valRetail;
            totalProfitPotential += potentialProfit;

            stockItems.push({
              name: p.name,
              varName: v.name,
              sku: v.sku || '',
              catName,
              stock,
              costPrice,
              price,
              valCost,
              valRetail
            });
          });
        } else {
          const stock = parseInt(p.stock, 10) || 0;
          const costPrice = parseFloat(p.costPrice) || 0;
          const price = parseFloat(p.sellingPrice) || 0;
          const valCost = costPrice * stock;
          const valRetail = price * stock;
          const potentialProfit = valRetail - valCost;

          totalQty += stock;
          totalValCost += valCost;
          totalValRetail += valRetail;
          totalProfitPotential += potentialProfit;

          stockItems.push({
            name: p.name,
            varName: null,
            sku: p.sku || '',
            catName,
            stock,
            costPrice,
            price,
            valCost,
            valRetail
          });
        }
      });

      container.innerHTML = `
        <div class="stats-grid fade-in mb-2" style="grid-template-columns: repeat(3, 1fr);">
          <div class="stat-card blue" style="padding: 15px;">
            <div class="stat-icon">📦</div>
            <div class="stat-info">
              <div class="stat-label">Total Stock Quantity</div>
              <div class="stat-value">${totalQty} Unit(s)</div>
            </div>
          </div>
          <div class="stat-card orange" style="padding: 15px;">
            <div class="stat-icon">🪙</div>
            <div class="stat-info">
              <div class="stat-label">Stock Value (Cost)</div>
              <div class="stat-value">${H.formatCurrency(totalValCost)}</div>
            </div>
          </div>
          <div class="stat-card green" style="padding: 15px;">
            <div class="stat-icon">🏷️</div>
            <div class="stat-info">
              <div class="stat-label">Stock Value (Retail)</div>
              <div class="stat-value">${H.formatCurrency(totalValRetail)}</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <span style="font-weight:700;">📦 Stock Valuation Details</span>
            <div style="display:flex; align-items:center; gap:6px;">
              <label style="font-size:12px; color:#64748b; font-weight:500; margin:0;">Show:</label>
              <select id="stock-limit-select" class="form-select" style="width:auto; padding:2px 8px; font-size:12px; height:28px;">
                <option value="10">10</option>
                <option value="50" selected>50</option>
                <option value="100">100</option>
                <option value="250">250</option>
                <option value="500">500</option>
                <option value="custom">Custom...</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>
          <div class="card-body">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Product / Variation</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th class="text-center">Stock</th>
                    <th class="text-right">Cost Price</th>
                    <th class="text-right">Retail Price</th>
                    <th class="text-right">Value (Cost)</th>
                    <th class="text-right">Value (Retail)</th>
                  </tr>
                </thead>
                <tbody id="stock-tbody"></tbody>
                ${stockItems.length > 0 ? `
                  <tfoot>
                    <tr class="total-row">
                      <td colspan="3">Stock Summary Valuations</td>
                      <td class="text-center">${totalQty}</td>
                      <td colspan="2"></td>
                      <td class="text-right">${H.formatCurrency(totalValCost)}</td>
                      <td class="text-right text-success">${H.formatCurrency(totalValRetail)}</td>
                    </tr>
                  </tfoot>
                ` : ''}
              </table>
            </div>
            <div id="stock-pagination" style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; font-size:12px; color:#64748b;"></div>
          </div>
        </div>
      `;

      let stockPage = 1;
      let stockLimit = 50;

      const renderStockTable = () => {
        const tbody = document.getElementById('stock-tbody');
        const pag = document.getElementById('stock-pagination');
        if (!tbody || !pag) return;

        const totalItems = stockItems.length;
        if (totalItems === 0) {
          tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No stock available.</td></tr>';
          pag.innerHTML = '';
          return;
        }

        const effectiveLimit = stockLimit === 'all' ? totalItems : stockLimit;
        const totalPages = Math.ceil(totalItems / effectiveLimit) || 1;
        if (stockPage > totalPages) stockPage = totalPages;
        if (stockPage < 1) stockPage = 1;

        const startIdx = (stockPage - 1) * effectiveLimit;
        const pageItems = stockItems.slice(startIdx, startIdx + effectiveLimit);

        tbody.innerHTML = pageItems.map(item => `
          <tr>
            <td style="font-weight:600;">${H.esc(item.name)} ${item.varName ? `<span class="text-muted text-sm">(${H.esc(item.varName)})</span>` : ''}</td>
            <td>SKU: ${H.esc(item.sku)}</td>
            <td>${H.esc(item.catName)}</td>
            <td class="text-center">${item.stock}</td>
            <td class="text-right">${H.formatCurrency(item.costPrice)}</td>
            <td class="text-right">${H.formatCurrency(item.price)}</td>
            <td class="text-right">${H.formatCurrency(item.valCost)}</td>
            <td class="text-right text-success" style="font-weight:600;">${H.formatCurrency(item.valRetail)}</td>
          </tr>
        `).join('');

        const endIdx = Math.min(startIdx + pageItems.length, totalItems);
        pag.innerHTML = `
          <div>Showing ${startIdx + 1}–${endIdx} of ${totalItems} stock items</div>
          <div style="display:flex; gap:6px; align-items:center;">
            <button class="btn btn-secondary btn-sm" id="btn-stock-prev" ${stockPage <= 1 ? 'disabled' : ''} style="padding:2px 8px; font-size:11px;">&laquo; Prev</button>
            <span style="font-weight:600;">${stockPage} / ${totalPages}</span>
            <button class="btn btn-secondary btn-sm" id="btn-stock-next" ${stockPage >= totalPages ? 'disabled' : ''} style="padding:2px 8px; font-size:11px;">Next &raquo;</button>
          </div>
        `;

        const prevBtn = document.getElementById('btn-stock-prev');
        const nextBtn = document.getElementById('btn-stock-next');
        if (prevBtn) prevBtn.onclick = () => { if (stockPage > 1) { stockPage--; renderStockTable(); } };
        if (nextBtn) nextBtn.onclick = () => { if (stockPage < totalPages) { stockPage++; renderStockTable(); } };
      };

      const stockLimitSelect = document.getElementById('stock-limit-select');
      if (stockLimitSelect) {
        stockLimitSelect.onchange = async () => {
          const val = stockLimitSelect.value;
          if (val === 'custom') {
            const customVal = await H.prompt('Enter number of stock items to display per page:', '150');
            const num = parseInt(customVal, 10);
            if (num && num > 0) {
              stockLimit = num;
              stockPage = 1;
              renderStockTable();
            } else {
              stockLimitSelect.value = String(stockLimit);
            }
          } else if (val === 'all') {
            stockLimit = 'all';
            stockPage = 1;
            renderStockTable();
          } else {
            stockLimit = parseInt(val, 10) || 50;
            stockPage = 1;
            renderStockTable();
          }
        };
      }

      renderStockTable();
    },

    salesSummaryReport(container, orders, H) {
      let count = orders.length;
      let totalSales = orders.reduce((s, o) => s + (parseFloat(o.grandTotal) || 0), 0);
      let totalTax = orders.reduce((s, o) => s + (parseFloat(o.taxAmount) || 0), 0);
      let totalDiscount = orders.reduce((s, o) => s + (parseFloat(o.discountAmount) || 0), 0);
      let totalPaid = orders.reduce((s, o) => s + (parseFloat(o.paidAmount) || 0), 0);
      let totalDue = orders.reduce((s, o) => s + (parseFloat(o.dueAmount) || 0), 0);
      let totalReturned = orders.reduce((s, o) => s + (parseFloat(o.returnedAmount) || 0), 0);
      let totalSubtotal = orders.reduce((s, o) => s + (parseFloat(o.subtotal) || 0), 0);

      container.innerHTML = `
        <div class="card" style="max-width: 600px; margin: 0 auto;">
          <div class="card-header">📊 Comprehensive Sales Summary</div>
          <div class="card-body" style="display:flex; flex-direction:column; gap:12px;">
            <div class="flex justify-between" style="border-bottom:1px solid var(--border-light); padding-bottom:8px;">
              <span class="text-muted">Total Invoices Issued:</span>
              <span style="font-weight:700;">${count}</span>
            </div>
            <div class="flex justify-between" style="border-bottom:1px solid var(--border-light); padding-bottom:8px;">
              <span class="text-muted">Sub Total Gross:</span>
              <span style="font-weight:700;">${H.formatCurrency(totalSubtotal)}</span>
            </div>
            <div class="flex justify-between" style="border-bottom:1px solid var(--border-light); padding-bottom:8px;">
              <span class="text-muted">Total Discounts Allowed:</span>
              <span style="font-weight:700; color:var(--danger)">-${H.formatCurrency(totalDiscount)}</span>
            </div>
            <div class="flex justify-between" style="border-bottom:1px solid var(--border-light); padding-bottom:8px;">
              <span class="text-muted">Tax Amount Collected:</span>
              <span style="font-weight:700;">${H.formatCurrency(totalTax)}</span>
            </div>
            <div class="flex justify-between" style="border-bottom:2px solid var(--border); padding-bottom:8px; margin-bottom:8px;">
              <span style="font-weight:700;">Grand Total Sales Value:</span>
              <span style="font-weight:800; color:var(--primary); font-size:16px;">${H.formatCurrency(totalSales)}</span>
            </div>
            <div class="flex justify-between text-success" style="padding-bottom:4px;">
              <span>Total Received (Cleared):</span>
              <span style="font-weight:700;">${H.formatCurrency(totalPaid)}</span>
            </div>
          </div>
        </div>
      `;
    },

    async overallProfitReport(container, orders, orderItems, products, Store, H, from, to) {
      const totalSales = orders.reduce((s, o) => s + (parseFloat(o.grandTotal) || 0), 0);
      let totalCostOfGoods = 0;
      orders.forEach(order => {
        const items = orderItems.filter(i => i.orderId === order.id);
        items.forEach(item => {
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
          totalCostOfGoods += (parseFloat(cost) || 0) * (parseInt(item.qty, 10) || 0);
        });
      });

      const totalSubtotal = orders.reduce((s, o) => s + (parseFloat(o.subtotal) || 0), 0);
      const totalDiscount = orders.reduce((s, o) => s + (parseFloat(o.discountAmount) || 0), 0);
      const productProfit = totalSubtotal - totalCostOfGoods - totalDiscount;

      // 1. Operating Expenses
      const expenses = await Store.query('expenses', e => H.isDateInRange(e.date, from, to));
      const totalOpExpenses = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

      // 2. Ingredient Costs
      const ingredientCosts = await Store.query('ingredient-costs', ic => H.isDateInRange(ic.date, from, to));
      const totalIngredientCost = ingredientCosts.reduce((s, ic) => s + (parseFloat(ic.amount) || 0), 0);

      // 3. Supplier Payments
      const supplierPayments = await Store.query('supplier-payments', sp => H.isDateInRange(sp.date, from, to));
      const totalSupplierPayments = supplierPayments.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0);

      // 4. Expired & Waste
      const expiredWastes = await Store.query('expired-wastes', ew => H.isDateInRange(ew.date, from, to));
      const totalWasteCost = expiredWastes.reduce((s, ew) => {
        const cost = parseFloat(ew.totalCost) || ((parseFloat(ew.costPrice) || 0) * (parseFloat(ew.quantity) || 0));
        const comp = parseFloat(ew.compensationAmount) || 0;
        return s + Math.max(0, cost - comp);
      }, 0);

      // 5. Damaged Products
      const damagedProducts = await Store.query('damaged-products', dp => H.isDateInRange(dp.date, from, to));
      const totalDamagedCost = damagedProducts.reduce((s, dp) => s + (parseFloat(dp.totalCost) || 0), 0);

      // 6. Collected Tax
      const totalCollectedTax = orders.reduce((s, o) => s + (parseFloat(o.taxAmount) || 0), 0);

      // Report Settings
      const settings = (await Store.getSettings()) || {};
      const isSupplierAsExpense = settings.supplier_as_expense === '1';
      const isIngredientAsExpense = settings.ingredient_as_expense === '1';
      const isWasteAsExpense = settings.waste_as_expense === '1';
      const isDamagedAsExpense = settings.damaged_as_expense === '1';
      const isTaxAsExpense = settings.tax_as_expense === '1';

      // Turned on expenses from report.settings
      let turnedOnExpenses = 0;
      if (isSupplierAsExpense) turnedOnExpenses += totalSupplierPayments;
      if (isIngredientAsExpense) turnedOnExpenses += totalIngredientCost;
      if (isWasteAsExpense) turnedOnExpenses += totalWasteCost;
      if (isDamagedAsExpense) turnedOnExpenses += totalDamagedCost;
      if (isTaxAsExpense) turnedOnExpenses += totalCollectedTax;

      let combinedExpensesList = expenses.map(e => ({
        date: e.date,
        name: e.reason || e.name || 'Operational Expense',
        category: 'Operating Expense',
        amount: parseFloat(e.amount) || 0
      }));

      if (isSupplierAsExpense) {
        supplierPayments.forEach(sp => {
          combinedExpensesList.push({
            date: sp.date,
            name: `${sp.supplier_name || 'Supplier'} - ${sp.reason || 'Payment'}`,
            category: 'Supplier Payment',
            amount: parseFloat(sp.amount) || 0
          });
        });
      }

      if (isIngredientAsExpense) {
        ingredientCosts.forEach(ic => {
          combinedExpensesList.push({
            date: ic.date,
            name: `${ic.name || ic.reason || 'Ingredient'} (${ic.supplier_name || 'Kitchen Supply'})`,
            category: 'Ingredient Cost',
            amount: parseFloat(ic.amount) || 0
          });
        });
      }

      if (isWasteAsExpense) {
        expiredWastes.forEach(ew => {
          const cost = parseFloat(ew.totalCost) || ((parseFloat(ew.costPrice) || 0) * (parseFloat(ew.quantity) || 0));
          const comp = parseFloat(ew.compensationAmount) || 0;
          const netLoss = Math.max(0, cost - comp);
          combinedExpensesList.push({
            date: ew.date,
            name: `${ew.itemName || 'Item'} (${ew.quantity || 1} units waste)`,
            category: 'Expired & Waste',
            amount: netLoss
          });
        });
      }

      if (isDamagedAsExpense) {
        damagedProducts.forEach(dp => {
          combinedExpensesList.push({
            date: dp.date,
            name: `${dp.productName || 'Damaged Product'} (${dp.quantity || 1} units - ${dp.damageType || 'Defect'})`,
            category: 'Damaged Product',
            amount: parseFloat(dp.totalCost) || 0
          });
        });
      }

      if (isTaxAsExpense && totalCollectedTax > 0) {
        combinedExpensesList.push({
          date: to,
          name: 'Collected Sales Tax (Tax Liability)',
          category: 'Collected Tax',
          amount: totalCollectedTax
        });
      }

      combinedExpensesList.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Formula: Profit = Total Sales - expenses - turned on expense from report.settings
      const overallNetProfit = totalSales - totalOpExpenses - turnedOnExpenses;
      const netProfitColor = overallNetProfit >= 0 ? 'text-success' : 'text-danger';

      container.innerHTML = `
        <!-- Primary Financial Cards Grid -->
        <div class="stats-grid fade-in mb-3" style="grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap:14px;">
          <!-- 1. Total Sales -->
          <div class="stat-card purple" style="padding: 15px;">
            <div class="stat-icon">💰</div>
            <div class="stat-info">
              <div class="stat-label">Total Sales</div>
              <div class="stat-value" style="font-size:18px;">${H.formatCurrency(totalSales)}</div>
              <div class="stat-sub">${orders.length} Invoice(s)</div>
            </div>
          </div>

          <!-- 2. Collected Tax (New Card) -->
          <div class="stat-card sky" style="padding: 15px; background:#fff; border:1px solid #E2E8F0; border-left:4px solid #0284C7; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
            <div class="stat-icon" style="font-size:22px; width:44px; height:44px; border-radius:10px; background:#f0f9ff; display:flex; align-items:center; justify-content:center; color:#0284c7;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/><line x1="9" y1="11" x2="11" y2="11"/></svg>
            </div>
            <div class="stat-info">
              <div class="stat-label" style="font-weight:700;">Collected Tax</div>
              <div class="stat-value" style="font-size:18px; font-weight:800; color:#0284c7; margin-top:2px;">${H.formatCurrency(totalCollectedTax)}</div>
              <div class="stat-sub">${isTaxAsExpense ? 'Deducted as Expense (ON)' : 'Tax Invoiced in range'}</div>
            </div>
          </div>

          <!-- 3. Expenses (Direct Operating Expenses) -->
          <div class="stat-card" style="padding: 15px; background:#fff; border:1px solid #E2E8F0; border-left:4px solid #EF4444; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
            <div class="stat-icon" style="font-size:22px; width:44px; height:44px; border-radius:10px; background:#fef2f2; display:flex; align-items:center; justify-content:center;">💸</div>
            <div class="stat-info">
              <div class="stat-label" style="font-weight:700;">Expenses</div>
              <div class="stat-value text-danger" style="font-size:18px; font-weight:800; margin-top:2px;">${H.formatCurrency(totalOpExpenses)}</div>
              <div class="stat-sub">${expenses.length} operating logs</div>
            </div>
          </div>

          <!-- 4. Ingredient Cost (Only shown if enabled in Report Settings) -->
          ${isIngredientAsExpense ? `
            <div class="stat-card" style="padding: 15px; background:#fff; border:1px solid #E2E8F0; border-left:4px solid #10B981; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
              <div class="stat-icon" style="font-size:22px; width:44px; height:44px; border-radius:10px; background:#ecfdf5; display:flex; align-items:center; justify-content:center;">🥬</div>
              <div class="stat-info">
                <div class="stat-label" style="font-weight:700;">Ingredient Cost</div>
                <div class="stat-value text-success" style="font-size:18px; font-weight:800; margin-top:2px;">${H.formatCurrency(totalIngredientCost)}</div>
                <div class="stat-sub">${ingredientCosts.length} purchases</div>
              </div>
            </div>
          ` : ''}

          <!-- 5. Suppliers Payments (Only shown if enabled in Report Settings) -->
          ${isSupplierAsExpense ? `
            <div class="stat-card" style="padding: 15px; background:#fff; border:1px solid #E2E8F0; border-left:4px solid #3B82F6; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
              <div class="stat-icon" style="font-size:22px; width:44px; height:44px; border-radius:10px; background:#eff6ff; display:flex; align-items:center; justify-content:center;">🏢</div>
              <div class="stat-info">
                <div class="stat-label" style="font-weight:700;">Suppliers Payments</div>
                <div class="stat-value text-primary" style="font-size:18px; font-weight:800; margin-top:2px;">${H.formatCurrency(totalSupplierPayments)}</div>
                <div class="stat-sub">${supplierPayments.length} payment records</div>
              </div>
            </div>
          ` : ''}

          <!-- 6. Expired & Waste (Only shown if enabled in Report Settings) -->
          ${isWasteAsExpense ? `
            <div class="stat-card" style="padding: 15px; background:#fff; border:1px solid #E2E8F0; border-left:4px solid #F59E0B; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
              <div class="stat-icon" style="font-size:22px; width:44px; height:44px; border-radius:10px; background:#fffbeb; display:flex; align-items:center; justify-content:center;">🗑️</div>
              <div class="stat-info">
                <div class="stat-label" style="font-weight:700;">Expired & Waste</div>
                <div class="stat-value" style="font-size:18px; font-weight:800; color:#d97706; margin-top:2px;">${H.formatCurrency(totalWasteCost)}</div>
                <div class="stat-sub">${expiredWastes.length} waste entries</div>
              </div>
            </div>
          ` : ''}

          <!-- 7. Damaged Products (Only shown if enabled in Report Settings) -->
          ${isDamagedAsExpense ? `
            <div class="stat-card" style="padding: 15px; background:#fff; border:1px solid #E2E8F0; border-left:4px solid #DC2626; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
              <div class="stat-icon" style="font-size:22px; width:44px; height:44px; border-radius:10px; background:#fef2f2; display:flex; align-items:center; justify-content:center; color:#DC2626;">📦</div>
              <div class="stat-info">
                <div class="stat-label" style="font-weight:700;">Damaged Products</div>
                <div class="stat-value text-danger" style="font-size:18px; font-weight:800; margin-top:2px;">${H.formatCurrency(totalDamagedCost)}</div>
                <div class="stat-sub">${damagedProducts.length} damaged entries</div>
              </div>
            </div>
          ` : ''}

          <!-- 8. Overall Net Profit -->
          <div class="stat-card blue" style="padding: 15px;">
            <div class="stat-icon">⚖️</div>
            <div class="stat-info">
              <div class="stat-label">Overall Net Profit</div>
              <div class="stat-value ${netProfitColor}" style="font-size:18px; font-weight:800;">${H.formatCurrency(overallNetProfit)}</div>
              <div class="stat-sub">Sales - Expenses - Turned-on Rules</div>
            </div>
          </div>
        </div>

        <div class="grid-2 fade-in mt-3">
          <!-- Expenses Card with Pagination -->
          <div class="card" id="card-expenses-breakdown">
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <span style="font-weight:700;">💸 Shop Expenses Breakdown</span>
              <div style="display:flex; align-items:center; gap:6px;">
                <label style="font-size:12px; color:#64748b; font-weight:500; margin:0;">Show:</label>
                <select id="op-exp-limit-select" class="form-select" style="width:auto; padding:2px 8px; font-size:12px; height:28px;">
                  <option value="10">10</option>
                  <option value="50" selected>50</option>
                  <option value="100">100</option>
                  <option value="250">250</option>
                  <option value="500">500</option>
                  <option value="custom">Custom...</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>
            <div class="card-body">
              <div class="table-wrapper">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Expense Description</th>
                      <th>Category</th>
                      <th class="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody id="op-exp-tbody"></tbody>
                </table>
              </div>
              <div id="op-exp-pagination" style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; font-size:12px; color:#64748b;"></div>
            </div>
          </div>

          <!-- Invoiced Sales Card with Pagination -->
          <div class="card" id="card-invoiced-sales">
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <span style="font-weight:700;">📋 Invoiced Sales Summary</span>
              <div style="display:flex; align-items:center; gap:6px;">
                <label style="font-size:12px; color:#64748b; font-weight:500; margin:0;">Show:</label>
                <select id="op-ord-limit-select" class="form-select" style="width:auto; padding:2px 8px; font-size:12px; height:28px;">
                  <option value="10">10</option>
                  <option value="50" selected>50</option>
                  <option value="100">100</option>
                  <option value="250">250</option>
                  <option value="500">500</option>
                  <option value="custom">Custom...</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>
            <div class="card-body">
              <div class="table-wrapper">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Invoice ID</th>
                      <th>Customer</th>
                      <th class="text-right">Grand Total</th>
                    </tr>
                  </thead>
                  <tbody id="op-ord-tbody"></tbody>
                </table>
              </div>
              <div id="op-ord-pagination" style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; font-size:12px; color:#64748b;"></div>
            </div>
          </div>
        </div>
      `;

      // ── Expenses Pagination Handler ──────────────────
      let expPage = 1;
      let expLimit = 50;

      const renderExpensesTable = () => {
        const tbody = document.getElementById('op-exp-tbody');
        const pag = document.getElementById('op-exp-pagination');
        if (!tbody || !pag) return;

        const totalItems = combinedExpensesList.length;
        if (totalItems === 0) {
          tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No expenses in this period.</td></tr>';
          pag.innerHTML = '';
          return;
        }

        const effectiveLimit = expLimit === 'all' ? totalItems : expLimit;
        const totalPages = Math.ceil(totalItems / effectiveLimit) || 1;
        if (expPage > totalPages) expPage = totalPages;
        if (expPage < 1) expPage = 1;

        const startIdx = (expPage - 1) * effectiveLimit;
        const pageItems = combinedExpensesList.slice(startIdx, startIdx + effectiveLimit);

        tbody.innerHTML = pageItems.map(e => `
          <tr>
            <td>${H.formatDateTime(e.date)}</td>
            <td style="font-weight:600;">${H.esc(e.name)}</td>
            <td><span class="badge" style="font-size:10.5px; background:#f1f5f9; color:#475569;">${H.esc(e.category || 'Expense')}</span></td>
            <td class="text-right text-danger" style="font-weight:700;">${H.formatCurrency(e.amount)}</td>
          </tr>
        `).join('');

        const endIdx = Math.min(startIdx + pageItems.length, totalItems);
        pag.innerHTML = `
          <div>Showing ${startIdx + 1}–${endIdx} of ${totalItems}</div>
          <div style="display:flex; gap:6px; align-items:center;">
            <button class="btn btn-secondary btn-sm" id="btn-op-exp-prev" ${expPage <= 1 ? 'disabled' : ''} style="padding:2px 8px; font-size:11px;">&laquo; Prev</button>
            <span style="font-weight:600;">${expPage} / ${totalPages}</span>
            <button class="btn btn-secondary btn-sm" id="btn-op-exp-next" ${expPage >= totalPages ? 'disabled' : ''} style="padding:2px 8px; font-size:11px;">Next &raquo;</button>
          </div>
        `;

        const prevBtn = document.getElementById('btn-op-exp-prev');
        const nextBtn = document.getElementById('btn-op-exp-next');
        if (prevBtn) prevBtn.onclick = () => { if (expPage > 1) { expPage--; renderExpensesTable(); } };
        if (nextBtn) nextBtn.onclick = () => { if (expPage < totalPages) { expPage++; renderExpensesTable(); } };
      };

      const expLimitSelect = document.getElementById('op-exp-limit-select');
      if (expLimitSelect) {
        expLimitSelect.onchange = async () => {
          const val = expLimitSelect.value;
          if (val === 'custom') {
            const customVal = await H.prompt('Enter number of expense rows to display per page:', '150');
            const num = parseInt(customVal, 10);
            if (num && num > 0) {
              expLimit = num;
              expPage = 1;
              renderExpensesTable();
            } else {
              expLimitSelect.value = String(expLimit);
            }
          } else if (val === 'all') {
            expLimit = 'all';
            expPage = 1;
            renderExpensesTable();
          } else {
            expLimit = parseInt(val, 10) || 50;
            expPage = 1;
            renderExpensesTable();
          }
        };
      }

      renderExpensesTable();

      // ── Invoiced Sales Pagination Handler ────────────
      let ordPage = 1;
      let ordLimit = 50;

      const renderOrdersTable = () => {
        const tbody = document.getElementById('op-ord-tbody');
        const pag = document.getElementById('op-ord-pagination');
        if (!tbody || !pag) return;

        const totalItems = orders.length;
        if (totalItems === 0) {
          tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No sales orders in this period.</td></tr>';
          pag.innerHTML = '';
          return;
        }

        const effectiveLimit = ordLimit === 'all' ? totalItems : ordLimit;
        const totalPages = Math.ceil(totalItems / effectiveLimit) || 1;
        if (ordPage > totalPages) ordPage = totalPages;
        if (ordPage < 1) ordPage = 1;

        const startIdx = (ordPage - 1) * effectiveLimit;
        const pageItems = orders.slice(startIdx, startIdx + effectiveLimit);

        tbody.innerHTML = pageItems.map(o => `
          <tr>
            <td style="font-weight:700;">${o.invoiceId}</td>
            <td>${H.esc(o.customerName)}</td>
            <td class="text-right text-success" style="font-weight:700;">${H.formatCurrency(o.grandTotal)}</td>
          </tr>
        `).join('');

        const endIdx = Math.min(startIdx + pageItems.length, totalItems);
        pag.innerHTML = `
          <div>Showing ${startIdx + 1}–${endIdx} of ${totalItems}</div>
          <div style="display:flex; gap:6px; align-items:center;">
            <button class="btn btn-secondary btn-sm" id="btn-op-ord-prev" ${ordPage <= 1 ? 'disabled' : ''} style="padding:2px 8px; font-size:11px;">&laquo; Prev</button>
            <span style="font-weight:600;">${ordPage} / ${totalPages}</span>
            <button class="btn btn-secondary btn-sm" id="btn-op-ord-next" ${ordPage >= totalPages ? 'disabled' : ''} style="padding:2px 8px; font-size:11px;">Next &raquo;</button>
          </div>
        `;

        const prevBtn = document.getElementById('btn-op-ord-prev');
        const nextBtn = document.getElementById('btn-op-ord-next');
        if (prevBtn) prevBtn.onclick = () => { if (ordPage > 1) { ordPage--; renderOrdersTable(); } };
        if (nextBtn) nextBtn.onclick = () => { if (ordPage < totalPages) { ordPage++; renderOrdersTable(); } };
      };

      const ordLimitSelect = document.getElementById('op-ord-limit-select');
      if (ordLimitSelect) {
        ordLimitSelect.onchange = async () => {
          const val = ordLimitSelect.value;
          if (val === 'custom') {
            const customVal = await H.prompt('Enter number of sales invoice rows to display per page:', '150');
            const num = parseInt(customVal, 10);
            if (num && num > 0) {
              ordLimit = num;
              ordPage = 1;
              renderOrdersTable();
            } else {
              ordLimitSelect.value = String(ordLimit);
            }
          } else if (val === 'all') {
            ordLimit = 'all';
            ordPage = 1;
            renderOrdersTable();
          } else {
            ordLimit = parseInt(val, 10) || 50;
            ordPage = 1;
            renderOrdersTable();
          }
        };
      }

      renderOrdersTable();
    },

    async exportReportCSV(type, from, to) {
      const S = POS.Store;
      const H = POS.Helpers;
      const orders = await this.getRangeOrders(from, to);
      const orderItems = await this.getRangeOrderItems(from, to);
      const products = await S.getAll('products');
      const payments = await this.getRangePayments(from, to);
      const categories = await S.getAll('categories');

      let csvData = [];
      let filename = `report_${type}`;

      if (type === 'daily-sale') {
        const salesByDay = {};
        orders.forEach(o => {
          const day = H.formatDate(o.date);
          if (!salesByDay[day]) {
            salesByDay[day] = { Date: day, Invoices: 0, Subtotal: 0, Discount: 0, Tax: 0, Total: 0 };
          }
          const sub = parseFloat(o.subtotal) || 0;
          const disc = parseFloat(o.discountAmount) || 0;
          const tax = parseFloat(o.taxAmount) || 0;
          const total = parseFloat(o.grandTotal) || 0;

          salesByDay[day].Invoices++;
          salesByDay[day].Subtotal += sub;
          salesByDay[day].Discount += disc;
          salesByDay[day].Tax += tax;
          salesByDay[day].Total += total;
        });
        csvData = Object.values(salesByDay);
      } else if (type === 'product-profit') {
        const orderIds = orders.map(o => o.id);
        const items = orderItems.filter(i => orderIds.includes(i.orderId));
        const profitByProduct = {};
        items.forEach(item => {
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
          const itemQty = parseInt(item.qty, 10) || 0;
          const revenue = parseFloat(item.total) || 0;
          const totalCost = cost * itemQty;
          const key = item.productName + (item.variationName ? ` (${item.variationName})` : '');
          if (!profitByProduct[key]) {
            profitByProduct[key] = { Product: key, Sold: 0, Cost: 0, Sales: 0, Profit: 0 };
          }
          profitByProduct[key].Sold += itemQty;
          profitByProduct[key].Cost += totalCost;
          profitByProduct[key].Sales += revenue;
          profitByProduct[key].Profit += (revenue - totalCost);
        });
        csvData = Object.values(profitByProduct);
      } else if (type === 'top-selling' || type === 'slow-selling') {
        const orderIds = orders.map(o => o.id);
        const items = orderItems.filter(i => orderIds.includes(i.orderId));
        const totals = {};

        if (type === 'slow-selling' && Array.isArray(products)) {
          products.forEach(p => {
            if (p.status === 'Trash' || p.deletedAt) return;
            if (p.variations && p.variations.length > 0) {
              p.variations.forEach(v => {
                const key = `${p.name} (${v.name})`;
                totals[key] = { Product: key, Sold: 0, Revenue: 0 };
              });
            } else {
              totals[p.name] = { Product: p.name, Sold: 0, Revenue: 0 };
            }
          });
        }

        items.forEach(i => {
          const key = i.productName + (i.variationName ? ` (${i.variationName})` : '');
          if (!totals[key]) {
            totals[key] = { Product: key, Sold: 0, Revenue: 0 };
          }
          totals[key].Sold += (parseInt(i.qty, 10) || 0);
          totals[key].Revenue += (parseFloat(i.total) || 0);
        });
        csvData = Object.values(totals).sort((a, b) => type === 'top-selling' ? b.Sold - a.Sold : a.Sold - b.Sold);
      } else if (type === 'payment-method') {
        const methods = {};
        H.paymentMethods.forEach(m => { methods[m] = { Method: m, Txns: 0, Amount: 0 }; });
        const orderIds = orders.map(o => o.id);
        const matchedPayments = payments.filter(p => orderIds.includes(p.orderId));
        matchedPayments.forEach(p => {
          const mName = (p.method || 'Cash').trim();
          if (!methods[mName]) {
            methods[mName] = { Method: mName, Txns: 0, Amount: 0 };
          }
          methods[mName].Txns++;
          methods[mName].Amount += (parseFloat(p.amount) || 0);
        });
        csvData = Object.values(methods).filter(m => m.Amount > 0 || m.Txns > 0);
      } else if (type === 'stock-value') {
        products.forEach(p => {
          const cat = categories.find(c => c.id === p.categoryId);
          const catName = cat ? cat.name : 'Uncategorized';
          if (p.variations && p.variations.length > 0) {
            p.variations.forEach(v => {
              const stock = parseInt(v.stock, 10) || 0;
              const cost = parseFloat(v.costPrice) || 0;
              const price = parseFloat(v.price) || 0;
              csvData.push({
                Product: p.name,
                SKU: v.sku,
                Category: catName,
                Stock: stock,
                Cost: cost,
                Price: price,
                'Total Cost Val': cost * stock,
                'Total Retail Val': price * stock
              });
            });
          } else {
            const stock = parseInt(p.stock, 10) || 0;
            const cost = parseFloat(p.costPrice) || 0;
            const price = parseFloat(p.sellingPrice) || 0;
            csvData.push({
              Product: p.name,
              SKU: p.sku,
              Category: catName,
              Stock: stock,
              Cost: cost,
              Price: price,
              'Total Cost Val': cost * stock,
              'Total Retail Val': price * stock
            });
          }
        });
      } else if (type === 'sales-summary') {
        let totalSales = orders.reduce((s, o) => s + (parseFloat(o.grandTotal) || 0), 0);
        let totalTax = orders.reduce((s, o) => s + (parseFloat(o.taxAmount) || 0), 0);
        let totalDiscount = orders.reduce((s, o) => s + (parseFloat(o.discountAmount) || 0), 0);
        let totalPaid = orders.reduce((s, o) => s + (parseFloat(o.paidAmount) || 0), 0);
        let totalDue = orders.reduce((s, o) => s + (parseFloat(o.dueAmount) || 0), 0);
        let totalReturned = orders.reduce((s, o) => s + (parseFloat(o.returnedAmount) || 0), 0);
        let totalSubtotal = orders.reduce((s, o) => s + (parseFloat(o.subtotal) || 0), 0);
        csvData = [{
          'Total Invoices': orders.length,
          'Gross Revenue (Subtotal)': totalSubtotal,
          'Discounts Allowed': totalDiscount,
          'Taxes Collected': totalTax,
          'Net Sales (Grand Total)': totalSales,
          'Total Settled': totalPaid,
          'Total Due': totalDue,
          'Total Refunded': totalReturned
        }];
      } else if (type === 'overall-profit') {
        const totalSales = orders.reduce((s, o) => s + (parseFloat(o.grandTotal) || 0), 0);
        let totalCostOfGoods = 0;
        orders.forEach(order => {
          const items = orderItems.filter(i => i.orderId === order.id);
          items.forEach(item => {
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
            totalCostOfGoods += (parseFloat(cost) || 0) * (parseInt(item.qty, 10) || 0);
          });
        });
        const totalSubtotal = orders.reduce((s, o) => s + (parseFloat(o.subtotal) || 0), 0);
        const totalDiscount = orders.reduce((s, o) => s + (parseFloat(o.discountAmount) || 0), 0);
        const productProfit = totalSubtotal - totalCostOfGoods - totalDiscount;

        const expenses = await S.query('expenses', e => H.isDateInRange(e.date, from, to));
        const totalOpExpenses = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
        let totalExpenses = totalOpExpenses;
        let totalExpenseItems = expenses.length;

        const ingredientCosts = await S.query('ingredient-costs', ic => H.isDateInRange(ic.date, from, to));
        const totalIngredientCost = ingredientCosts.reduce((s, ic) => s + (parseFloat(ic.amount) || 0), 0);

        const supplierPayments = await S.query('supplier-payments', sp => H.isDateInRange(sp.date, from, to));
        const totalSupplierPayments = supplierPayments.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0);

        const expiredWastes = await S.query('expired-wastes', ew => H.isDateInRange(ew.date, from, to));
        const totalWasteCost = expiredWastes.reduce((s, ew) => {
          const cost = parseFloat(ew.totalCost) || ((parseFloat(ew.costPrice) || 0) * (parseFloat(ew.quantity) || 0));
          const comp = parseFloat(ew.compensationAmount) || 0;
          return s + Math.max(0, cost - comp);
        }, 0);

        const settings = (await S.getSettings()) || {};
        if (settings.supplier_as_expense === '1') {
          totalExpenses += totalSupplierPayments;
          totalExpenseItems += supplierPayments.length;
        }
        if (settings.ingredient_as_expense === '1') {
          totalExpenses += totalIngredientCost;
          totalExpenseItems += ingredientCosts.length;
        }
        if (settings.waste_as_expense === '1') {
          totalExpenses += totalWasteCost;
          totalExpenseItems += expiredWastes.length;
        }

        const overallNetProfit = productProfit - totalExpenses;

        csvData = [{
          'Total Sales': totalSales,
          'Product Sold': productProfit,
          'Ingredient Cost': totalIngredientCost,
          'Operating Expenses': totalOpExpenses,
          'Supplier Payments': totalSupplierPayments,
          'Expired & Waste Loss': totalWasteCost,
          'Consolidated Expenses': totalExpenses,
          'Overall Net Profit': overallNetProfit,
          'Sales Invoices Qty': orders.length,
          'Expense Items Qty': totalExpenseItems
        }];
      }

      if (csvData.length === 0) {
        H.showToast('No data to export', 'error');
        return;
      }
      H.exportCSV(csvData, filename);
    }
  };

  window.POS = window.POS || {};
  window.POS.Reports = Reports;
})();
