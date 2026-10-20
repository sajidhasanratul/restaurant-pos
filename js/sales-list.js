(function () {
  'use strict';

  const SalesList = {
    currentPage: 1,
    perPage: 50,
    period: 'today',
    filters: {
      search: '',
      fromDate: '',
      toDate: '',
      paymentMethod: 'all',
      minTotal: '',
      maxTotal: ''
    },
    activePopover: null,

    getPeriodRange(period) {
      const H = POS.Helpers;
      const today = H.today();
      if (period === 'today') {
        return { from: today, to: today };
      } else if (period === 'yesterday') {
        const yest = H.yesterday();
        return { from: yest, to: yest };
      } else if (period === 'this_week') {
        const p = H.getBDDateParts();
        const d = new Date(Date.UTC(p.year, p.month - 1, p.day));
        const dayOfWeek = d.getUTCDay(); // 0 is Sunday
        const startOfWeek = H.addDays(today, -dayOfWeek);
        return { from: startOfWeek, to: today };
      } else if (period === 'this_month') {
        const p = H.getBDDateParts();
        const pad = n => String(n).padStart(2, '0');
        const startOfMonth = `${p.year}-${pad(p.month)}-01`;
        return { from: startOfMonth, to: today };
      }
      return { from: '', to: '' };
    },

    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

      this.currentPage = 1;
      this.period = 'today';
      this.filters = {
        search: '',
        fromDate: '',
        toDate: '',
        paymentMethod: 'all',
        minTotal: '',
        maxTotal: ''
      };
      this.activePopover = null;

      mc.innerHTML = `
        <!-- Top Section: 3-Card High-Speed Layout (Todays Sales Amount | Search Bar | Sales Actions) -->
        <div class="sales-top-cards fade-in" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(290px, 1fr)); gap:16px; margin-bottom:20px; align-items:stretch;">
          
          <!-- 1. Left Card: Todays Sales Amount (Filterable, Defaults to Today) -->
          <div class="card stat-card green" id="card-total-sales" style="margin:0; padding:16px 20px; display:flex; flex-direction:column; justify-content:space-between; border-radius:12px; background:linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%); border:1.5px solid #86efac; box-shadow:0 2px 8px rgba(16,185,129,0.08);">
            <div>
              <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <div class="stat-icon" style="width:36px; height:36px; border-radius:10px; background:#dcfce7; color:#16a34a; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:18px;">৳</div>
                  <span style="font-size:11.5px; font-weight:800; text-transform:uppercase; letter-spacing:0.6px; color:#166534;">Todays Sales Amount</span>
                </div>
                <select id="sales-period-select" class="form-select form-select-sm" style="padding:4px 8px; font-size:12px; font-weight:700; border-radius:8px; border:1px solid #86efac; background:#fff; color:#15803d; cursor:pointer;">
                  <option value="today" selected>Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="all">All Time</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              <div class="stat-value" id="stats-total-amount" style="font-size:26px; font-weight:900; color:#14532d; line-height:1.1;">৳0.00</div>
              <div id="stats-period-label" style="font-size:11.5px; color:#15803d; font-weight:700; margin-top:4px;">Today's Sales</div>
            </div>

            <!-- Custom Date Inputs (shown when custom is selected) -->
            <div id="sales-custom-date-box" style="display:none; align-items:center; gap:8px; padding-top:10px; margin-top:8px; border-top:1px dashed #bbf7d0; flex-wrap:wrap;">
              <div style="display:flex; align-items:center; gap:4px;">
                <span style="font-size:11px; font-weight:700; color:#166534;">From:</span>
                <input type="date" id="sales-custom-from" class="form-input" style="padding:2px 6px; font-size:11.5px; height:28px; width:125px; border-color:#86efac; background:#fff;">
              </div>
              <div style="display:flex; align-items:center; gap:4px;">
                <span style="font-size:11px; font-weight:700; color:#166534;">To:</span>
                <input type="date" id="sales-custom-to" class="form-input" style="padding:2px 6px; font-size:11.5px; height:28px; width:125px; border-color:#86efac; background:#fff;">
              </div>
              <button type="button" id="btn-apply-sales-custom" class="btn btn-primary btn-sm" style="height:28px; padding:0 10px; font-size:11px; font-weight:700; background:#16a34a; border-color:#16a34a;">Apply</button>
            </div>
          </div>

          <!-- 2. Middle Card: Search Bar & Per Page Controls -->
          <div class="card" style="margin:0; padding:16px 20px; display:flex; flex-direction:column; justify-content:space-between; border-radius:12px; border:1px solid #e2e8f0; box-shadow:0 1px 3px rgba(0,0,0,0.04); background:#fff;">
            <div>
              <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <div style="width:36px; height:36px; border-radius:10px; background:#f1f5f9; color:#475569; display:flex; align-items:center; justify-content:center; font-size:16px;">🔍</div>
                  <span style="font-size:11.5px; font-weight:800; text-transform:uppercase; letter-spacing:0.6px; color:#334155;">Search Sales Orders</span>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="font-size:11.5px; font-weight:600; color:#64748b;">Show:</span>
                  <select id="sales-per-page" class="form-select form-select-sm" title="Orders Per Page" style="width:72px; padding:4px 6px; font-size:12px; font-weight:700; border-radius:8px; border:1px solid #cbd5e1;">
                    <option value="50" selected>50</option>
                    <option value="100">100</option>
                    <option value="200">200</option>
                    <option value="500">500</option>
                    <option value="1000">1000</option>
                    <option value="all">All</option>
                  </select>
                </div>
              </div>

              <div class="search-box" style="margin:0; position:relative;">
                <input type="text" id="sales-search" placeholder="Search invoice, customer, table, or sold product..." style="height:42px; font-size:13px; padding-left:36px; border-radius:8px; border:1px solid #cbd5e1; width:100%; box-sizing:border-box;">
              </div>
            </div>
            <div style="font-size:11px; color:#64748b; margin-top:6px; display:flex; align-items:center; gap:4px;">
              <span>💡</span> Matches invoice #, guest, phone, table & sold dish names
            </div>
          </div>

          <!-- 3. Right Card: Quick Actions (+ Add New Sale & Export CSV) -->
          <div class="card" style="margin:0; padding:16px 20px; display:flex; flex-direction:column; justify-content:space-between; border-radius:12px; border:1px solid #e2e8f0; box-shadow:0 1px 3px rgba(0,0,0,0.04); background:#fff;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
              <div style="width:36px; height:36px; border-radius:10px; background:#eff6ff; color:#2563eb; display:flex; align-items:center; justify-content:center; font-size:16px;">⚡</div>
              <span style="font-size:11.5px; font-weight:800; text-transform:uppercase; letter-spacing:0.6px; color:#1e293b;">Sales Actions</span>
            </div>

            <div style="display:flex; flex-direction:column; gap:8px;">
              <a href="/new-order" class="btn btn-primary" id="btn-add-new-sale" style="height:40px; display:flex; align-items:center; justify-content:center; gap:8px; font-size:13px; font-weight:800; border-radius:8px; background:linear-gradient(135deg, #10b981 0%, #059669 100%); border:none; box-shadow:0 2px 6px rgba(16,185,129,0.25); text-decoration:none; color:#fff;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <span>+ Add New Sale</span>
              </a>
              <button type="button" class="btn btn-secondary" id="btn-export-csv" style="height:38px; display:flex; align-items:center; justify-content:center; gap:8px; font-size:12.5px; font-weight:700; border-radius:8px; border:1px solid #cbd5e1; background:#f8fafc; color:#334155;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                <span>📥 Export CSV</span>
              </button>
            </div>
          </div>

        </div>

        <div class="card fade-in" style="position:relative;">
          <div class="card-body" style="padding:0;">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Invoice ID</th>
                    <th>Customer</th>
                    <th style="position:relative;">
                      <div style="display:flex; align-items:center; gap:6px;">
                        <span>Sales Date</span>
                        <button class="btn-col-filter" id="btn-filter-date" title="Filter by Date">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                        </button>
                      </div>
                      <div class="col-filter-popover" id="popover-filter-date" style="display:none;"></div>
                    </th>
                    <th style="position:relative;">
                      <div style="display:flex; align-items:center; gap:6px;">
                        <span>Payment Method</span>
                        <button class="btn-col-filter" id="btn-filter-payment" title="Filter by Payment Method">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                        </button>
                      </div>
                      <div class="col-filter-popover" id="popover-filter-payment" style="display:none;"></div>
                    </th>
                    <th class="text-right">Subtotal</th>
                    <th class="text-right">Discount</th>
                    <th class="text-right">Tax</th>
                    <th class="text-right" style="position:relative;">
                      <div style="display:flex; align-items:center; justify-content:flex-end; gap:6px;">
                        <span>Grand Total</span>
                        <button class="btn-col-filter" id="btn-filter-total" title="Filter by Amount">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                        </button>
                      </div>
                      <div class="col-filter-popover" id="popover-filter-total" style="display:none; right:0; text-align:left;"></div>
                    </th>
                    <th class="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody id="sales-tbody"></tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="pagination-bar fade-in" id="sales-pagination" style="margin-top:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;"></div>

        <!-- Sticky Floating Clear Filters Popup at Bottom -->
        <div id="sales-clear-filter-popup" style="display:none; position:fixed; bottom:24px; left:50%; transform:translateX(-50%); z-index:100; background:#0f172a; color:#fff; padding:8px 18px; border-radius:30px; box-shadow:0 10px 25px rgba(0,0,0,0.3); align-items:center; gap:12px; font-size:13px; font-weight:600;">
          <span id="filter-status-text">Filters Active</span>
          <button id="btn-clear-floating-filters" style="background:#ef4444; border:none; color:#fff; border-radius:15px; padding:4px 10px; font-size:12px; cursor:pointer; font-weight:700;">Clear Filters &times;</button>
        </div>

        <div class="modal-overlay" id="sales-modal-overlay"></div>
      `;

      this.initFilterPopovers();

      // Search input
      document.getElementById('sales-search').oninput = H.debounce(async (e) => {
        this.filters.search = e.target.value.toLowerCase().trim();
        this.currentPage = 1;
        await this.updateList();
      }, 200);

      // Orders per page selector
      const perPageSelect = document.getElementById('sales-per-page');
      if (perPageSelect) {
        perPageSelect.onchange = async (e) => {
          const val = e.target.value;
          this.perPage = val === 'all' ? 'all' : (parseInt(val) || 50);
          this.currentPage = 1;
          await this.updateList();
        };
      }

      // Period filter inside Total Sales Amount card
      const periodSelect = document.getElementById('sales-period-select');
      const customDateBox = document.getElementById('sales-custom-date-box');
      const customFromInput = document.getElementById('sales-custom-from');
      const customToInput = document.getElementById('sales-custom-to');
      const btnApplyCustom = document.getElementById('btn-apply-sales-custom');

      periodSelect.onchange = async () => {
        const val = periodSelect.value;
        this.period = val;
        if (val === 'custom') {
          customDateBox.style.display = 'flex';
          if (!customFromInput.value) customFromInput.value = H.today();
          if (!customToInput.value) customToInput.value = H.today();
          this.filters.fromDate = customFromInput.value;
          this.filters.toDate = customToInput.value;
        } else {
          customDateBox.style.display = 'none';
          const range = this.getPeriodRange(val);
          this.filters.fromDate = range.from;
          this.filters.toDate = range.to;
        }
        this.currentPage = 1;
        await this.updateList();
      };

      btnApplyCustom.onclick = async () => {
        this.filters.fromDate = customFromInput.value;
        this.filters.toDate = customToInput.value;
        this.currentPage = 1;
        await this.updateList();
      };

      // Export CSV (prompts with date range selection modal)
      document.getElementById('btn-export-csv').onclick = () => {
        this.showExportModal();
      };

      // Floating clear filter button
      document.getElementById('btn-clear-floating-filters').onclick = async () => {
        this.resetAllFilters();
        await this.updateList();
      };

      // Close popover when clicking outside
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.col-filter-popover') && !e.target.closest('.btn-col-filter')) {
          this.closeAllPopovers();
        }
      });

      // Initial load
      await this.updateList();
    },

    resetAllFilters() {
      this.currentPage = 1;
      this.period = 'today';
      this.filters = {
        search: '',
        fromDate: '',
        toDate: '',
        paymentMethod: 'all',
        minTotal: '',
        maxTotal: ''
      };
      const searchInput = document.getElementById('sales-search');
      if (searchInput) searchInput.value = '';
      const periodSelect = document.getElementById('sales-period-select');
      if (periodSelect) periodSelect.value = 'today';
      const customDateBox = document.getElementById('sales-custom-date-box');
      if (customDateBox) customDateBox.style.display = 'none';
      this.closeAllPopovers();
    },

    closeAllPopovers() {
      document.querySelectorAll('.col-filter-popover').forEach(p => p.style.display = 'none');
      this.activePopover = null;
    },

    togglePopover(id) {
      const popover = document.getElementById(id);
      if (!popover) return;
      const isOpen = popover.style.display === 'block';
      this.closeAllPopovers();
      if (!isOpen) {
        popover.style.display = 'block';
        this.activePopover = id;
      }
    },

    initFilterPopovers() {
      const H = POS.Helpers;

      // 1. Sales Date Popover
      const datePopover = document.getElementById('popover-filter-date');
      datePopover.innerHTML = `
        <div style="padding:14px; min-width:260px; background:#fff; border:1px solid var(--border); border-radius:var(--radius-sm); box-shadow:var(--shadow-lg); font-size:13px;">
          <div style="font-weight:700; color:#0f172a; margin-bottom:10px;">Filter Sales Date</div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <div>
              <label style="font-size:11px; font-weight:600; color:#64748b;">From Date</label>
              <input type="date" class="form-input" id="pop-filter-from" style="padding:6px 10px; font-size:12px;" value="${this.filters.fromDate}">
            </div>
            <div>
              <label style="font-size:11px; font-weight:600; color:#64748b;">To Date</label>
              <input type="date" class="form-input" id="pop-filter-to" style="padding:6px 10px; font-size:12px;" value="${this.filters.toDate}">
            </div>
            <div style="display:flex; gap:6px; margin-top:4px;">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-quick-today" style="flex:1; padding:4px 0; font-size:11px;">Today</button>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-quick-month" style="flex:1; padding:4px 0; font-size:11px;">This Month</button>
            </div>
            <div style="display:flex; justify-content:space-between; gap:8px; margin-top:8px; border-top:1px solid #edf2f7; padding-top:8px;">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-date-clear">Reset</button>
              <button type="button" class="btn btn-primary btn-sm" id="btn-date-apply">Apply</button>
            </div>
          </div>
        </div>
      `;

      document.getElementById('btn-filter-date').onclick = (e) => {
        e.stopPropagation();
        this.togglePopover('popover-filter-date');
      };

      datePopover.querySelector('#btn-quick-today').onclick = () => {
        const today = H.today();
        datePopover.querySelector('#pop-filter-from').value = today;
        datePopover.querySelector('#pop-filter-to').value = today;
      };

      datePopover.querySelector('#btn-quick-month').onclick = () => {
        const p = H.getBDDateParts(new Date());
        const pad = n => String(n).padStart(2, '0');
        const lastDay = new Date(Date.UTC(p.year, p.month, 0)).getUTCDate();
        datePopover.querySelector('#pop-filter-from').value = `${p.year}-${pad(p.month)}-01`;
        datePopover.querySelector('#pop-filter-to').value = `${p.year}-${pad(p.month)}-${pad(lastDay)}`;
      };

      datePopover.querySelector('#btn-date-clear').onclick = async () => {
        this.filters.fromDate = '';
        this.filters.toDate = '';
        datePopover.querySelector('#pop-filter-from').value = '';
        datePopover.querySelector('#pop-filter-to').value = '';
        this.currentPage = 1;
        this.closeAllPopovers();
        await this.updateList();
      };

      datePopover.querySelector('#btn-date-apply').onclick = async () => {
        this.filters.fromDate = datePopover.querySelector('#pop-filter-from').value;
        this.filters.toDate = datePopover.querySelector('#pop-filter-to').value;
        this.currentPage = 1;
        this.closeAllPopovers();
        await this.updateList();
      };

      // 2. Payment Method Popover
      const paymentPopover = document.getElementById('popover-filter-payment');
      paymentPopover.innerHTML = `
        <div style="padding:14px; min-width:220px; background:#fff; border:1px solid var(--border); border-radius:var(--radius-sm); box-shadow:var(--shadow-lg); font-size:13px;">
          <div style="font-weight:700; color:#0f172a; margin-bottom:10px;">Filter Payment Method</div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <select class="form-select" id="pop-filter-method" style="padding:6px 10px; font-size:12px;">
              <option value="all">All Payment Methods</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="bKash">bKash</option>
              <option value="Nagad">Nagad</option>
              <option value="Rocket">Rocket</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
            <div style="display:flex; justify-content:space-between; gap:8px; margin-top:8px; border-top:1px solid #edf2f7; padding-top:8px;">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-payment-clear">Reset</button>
              <button type="button" class="btn btn-primary btn-sm" id="btn-payment-apply">Apply</button>
            </div>
          </div>
        </div>
      `;

      document.getElementById('btn-filter-payment').onclick = (e) => {
        e.stopPropagation();
        this.togglePopover('popover-filter-payment');
      };

      paymentPopover.querySelector('#btn-payment-clear').onclick = async () => {
        this.filters.paymentMethod = 'all';
        paymentPopover.querySelector('#pop-filter-method').value = 'all';
        this.currentPage = 1;
        this.closeAllPopovers();
        await this.updateList();
      };

      paymentPopover.querySelector('#btn-payment-apply').onclick = async () => {
        this.filters.paymentMethod = paymentPopover.querySelector('#pop-filter-method').value;
        this.currentPage = 1;
        this.closeAllPopovers();
        await this.updateList();
      };

      // 3. Grand Total Popover
      const totalPopover = document.getElementById('popover-filter-total');
      totalPopover.innerHTML = `
        <div style="padding:14px; min-width:240px; background:#fff; border:1px solid var(--border); border-radius:var(--radius-sm); box-shadow:var(--shadow-lg); font-size:13px;">
          <div style="font-weight:700; color:#0f172a; margin-bottom:10px;">Filter Grand Total (৳)</div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <div>
              <label style="font-size:11px; font-weight:600; color:#64748b;">Min Amount (৳)</label>
              <input type="number" class="form-input" id="pop-filter-min-total" placeholder="0.00" style="padding:6px 10px; font-size:12px;" value="${this.filters.minTotal}">
            </div>
            <div>
              <label style="font-size:11px; font-weight:600; color:#64748b;">Max Amount (৳)</label>
              <input type="number" class="form-input" id="pop-filter-max-total" placeholder="No limit" style="padding:6px 10px; font-size:12px;" value="${this.filters.maxTotal}">
            </div>
            <div style="display:flex; justify-content:space-between; gap:8px; margin-top:8px; border-top:1px solid #edf2f7; padding-top:8px;">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-total-clear">Reset</button>
              <button type="button" class="btn btn-primary btn-sm" id="btn-total-apply">Apply</button>
            </div>
          </div>
        </div>
      `;

      document.getElementById('btn-filter-total').onclick = (e) => {
        e.stopPropagation();
        this.togglePopover('popover-filter-total');
      };

      totalPopover.querySelector('#btn-total-clear').onclick = async () => {
        this.filters.minTotal = '';
        this.filters.maxTotal = '';
        totalPopover.querySelector('#pop-filter-min-total').value = '';
        totalPopover.querySelector('#pop-filter-max-total').value = '';
        this.currentPage = 1;
        this.closeAllPopovers();
        await this.updateList();
      };

      totalPopover.querySelector('#btn-total-apply').onclick = async () => {
        this.filters.minTotal = totalPopover.querySelector('#pop-filter-min-total').value;
        this.filters.maxTotal = totalPopover.querySelector('#pop-filter-max-total').value;
        this.currentPage = 1;
        this.closeAllPopovers();
        await this.updateList();
      };
    },

    async getFilteredOrders() {
      const H = POS.Helpers;
      const params = new URLSearchParams();

      if (this.filters.search) params.append('search', this.filters.search);
      if (this.filters.fromDate) params.append('from', this.filters.fromDate);
      if (this.filters.toDate) params.append('to', this.filters.toDate);
      if (this.filters.paymentMethod && this.filters.paymentMethod !== 'all') {
        params.append('paymentMethod', this.filters.paymentMethod);
      }
      if (this.filters.minTotal !== '') params.append('minTotal', this.filters.minTotal);
      if (this.filters.maxTotal !== '') params.append('maxTotal', this.filters.maxTotal);

      params.append('withSummary', 'true');
      if (this.perPage !== 'all') {
        params.append('limit', this.perPage);
        params.append('page', this.currentPage);
      } else {
        params.append('limit', 'all');
      }

      try {
        const res = await fetch(`/api/orders?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          return {
            list: data.orders || [],
            totalOrders: Number(data.totalOrders) || 0,
            totalSalesAmount: parseFloat(data.totalSalesAmount) || 0,
            todaySalesAmount: parseFloat(data.todaySalesAmount) || 0,
            todayOrders: Number(data.todayOrders) || 0
          };
        }
      } catch (err) {
        console.warn('Server-side orders fetch error, falling back:', err);
      }

      return { list: [], totalOrders: 0, totalSalesAmount: 0, todaySalesAmount: 0, todayOrders: 0 };
    },

    async updateList() {
      const S = POS.Store;
      const H = POS.Helpers;

      const { list, totalOrders, totalSalesAmount, todaySalesAmount, todayOrders } = await this.getFilteredOrders();

      const totalEl = document.getElementById('stats-total-amount');
      const periodLabel = document.getElementById('stats-period-label');

      // If initial open with period === 'today' and no explicit date filter, display today's sales on card
      const isInitialToday = this.period === 'today' && !this.filters.fromDate && !this.filters.toDate;
      const displayAmount = isInitialToday ? todaySalesAmount : totalSalesAmount;
      const displayCount = isInitialToday ? todayOrders : totalOrders;

      if (totalEl) totalEl.textContent = H.formatCurrency(displayAmount);

      if (periodLabel) {
        if (isInitialToday || this.period === 'today') {
          periodLabel.textContent = `Today (${H.formatDate(H.today())}) • ${displayCount} orders`;
        } else if (this.period === 'yesterday') {
          periodLabel.textContent = `Yesterday (${H.formatDate(H.yesterday())}) • ${totalOrders} orders`;
        } else if (this.period === 'this_week') {
          periodLabel.textContent = `This Week • ${totalOrders} orders`;
        } else if (this.period === 'this_month') {
          periodLabel.textContent = `This Month • ${totalOrders} orders`;
        } else if (this.period === 'custom') {
          periodLabel.textContent = `${this.filters.fromDate || 'Start'} to ${this.filters.toDate || 'Now'} • ${totalOrders} orders`;
        } else {
          periodLabel.textContent = `All Time • ${totalOrders} orders`;
        }
      }

      // Update Filter button active states
      const btnDate = document.getElementById('btn-filter-date');
      if (btnDate) {
        btnDate.classList.toggle('active', !!(this.filters.fromDate || this.filters.toDate));
      }
      const btnPayment = document.getElementById('btn-filter-payment');
      if (btnPayment) {
        btnPayment.classList.toggle('active', !!(this.filters.paymentMethod && this.filters.paymentMethod !== 'all'));
      }
      const btnTotal = document.getElementById('btn-filter-total');
      if (btnTotal) {
        btnTotal.classList.toggle('active', !!(this.filters.minTotal !== '' || this.filters.maxTotal !== ''));
      }

      // Check if any filter is active
      const isFiltered = !!(
        (this.filters.fromDate || this.filters.toDate) || 
        (this.filters.paymentMethod && this.filters.paymentMethod !== 'all') || 
        this.filters.minTotal !== '' || 
        this.filters.maxTotal !== '' || 
        this.filters.search
      );

      const clearPopup = document.getElementById('sales-clear-filter-popup');
      if (clearPopup) {
        if (isFiltered) {
          clearPopup.style.display = 'flex';
          const filterCount = [
            this.filters.search,
            this.period !== 'today' && (this.filters.fromDate || this.filters.toDate) ? 'Date' : null,
            this.filters.paymentMethod !== 'all' ? this.filters.paymentMethod : null,
            this.filters.minTotal !== '' || this.filters.maxTotal !== '' ? 'Total' : null
          ].filter(Boolean).length;
          document.getElementById('filter-status-text').textContent = `Filters Active (${filterCount})`;
        } else {
          clearPopup.style.display = 'none';
        }
      }

      const paginationEl = document.getElementById('sales-pagination');
      const tbody = document.getElementById('sales-tbody');
      tbody.innerHTML = '';

      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted" style="padding:32px;">No sales orders found matching criteria.</td></tr>`;
        if (paginationEl) paginationEl.innerHTML = '';
        return;
      }

      // Pagination calculation
      const totalItems = totalOrders;
      const pageItems = list;
      let totalPages = 1;
      let startIndex = 0;

      if (this.perPage !== 'all') {
        const perPageNum = parseInt(this.perPage) || 50;
        totalPages = Math.ceil(totalItems / perPageNum) || 1;
        if (this.currentPage > totalPages) this.currentPage = totalPages;
        if (this.currentPage < 1) this.currentPage = 1;

        startIndex = (this.currentPage - 1) * perPageNum;
      }

      // Track group totals for currently visible page
      let groupSub = 0, groupDisc = 0, groupTax = 0, groupTotal = 0;
      const currentUser = S.getCurrentUser();
      const isAdmin = currentUser && currentUser.role === 'admin';

      pageItems.forEach(o => {
        groupSub += parseFloat(o.subtotal) || 0;
        groupDisc += parseFloat(o.discountAmount) || 0;
        groupTax += parseFloat(o.taxAmount) || 0;
        groupTotal += parseFloat(o.grandTotal) || 0;

        const methodStr = o.paymentMethodsSummary || 'N/A';

        tbody.innerHTML += `
          <tr class="sales-row" data-id="${o.id}">
            <td style="font-weight:700;">
              <div>${o.invoiceId}</div>
              ${o.tokenNo ? `<span class="badge" style="background:#ECFDF5; color:#059669; border:1px solid #A7F3D0; font-size:11px; font-weight:800; margin-top:2px; display:inline-block;">Token #${String(o.tokenNo).padStart(2, '0')}</span>` : ''}
            </td>
            <td>
              <div style="font-weight:600;">${H.esc(o.customerName)}</div>
              <div class="text-muted text-sm">${H.esc(o.customerPhone || (o.tableName ? `${o.tableName} • ${o.orderType || 'Dine In'}` : ''))}</div>
            </td>
            <td>${H.formatDateTime(o.date)}</td>
            <td>
              <span style="font-size:12px; font-weight:600; color:#334155; background:#f1f5f9; padding:3px 8px; border-radius:4px; border:1px solid #e2e8f0;">
                ${H.esc(methodStr)}
              </span>
            </td>
            <td class="text-right">${H.formatCurrency(o.subtotal)}</td>
            <td class="text-right text-danger">${o.discountAmount > 0 ? '-' : ''}${H.formatCurrency(o.discountAmount)}</td>
            <td class="text-right">${H.formatCurrency(o.taxAmount)}</td>
            <td class="text-right" style="font-weight:700; color:var(--primary);">${H.formatCurrency(o.grandTotal)}</td>
            <td class="text-center">
              <div style="display:flex; justify-content:center; gap:6px;">
                <button class="btn btn-secondary btn-sm btn-view-invoice" title="View Details" style="padding:4px 8px; font-size:11px;">View</button>
                <button class="btn btn-secondary btn-sm btn-print-invoice" title="Print Receipt" style="padding:4px 8px; font-size:11px;">Print</button>
                <button class="btn btn-secondary btn-sm btn-print-kot" title="Print Kitchen Token" style="padding:4px 8px; font-size:11px; background:#fff7ed; color:#c2410c; border-color:#fed7aa;">KOT</button>
                ${isAdmin ? `
                  <button class="btn btn-secondary btn-sm btn-delete-invoice" title="Delete Order" style="padding:4px 8px; font-size:11px; color:var(--danger); border-color:#fee2e2; background:#fef2f2;">Delete</button>
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      });

      // Append group totals row
      tbody.innerHTML += `
        <tr class="total-row">
          <td colspan="4" style="font-weight:800;">Group Total</td>
          <td class="text-right">${H.formatCurrency(groupSub)}</td>
          <td class="text-right text-danger">-${H.formatCurrency(groupDisc)}</td>
          <td class="text-right">${H.formatCurrency(groupTax)}</td>
          <td class="text-right" style="color:var(--primary); font-weight:800;">${H.formatCurrency(groupTotal)}</td>
          <td></td>
        </tr>
      `;

      // Render Pagination Bar
      if (paginationEl) {
        if (this.perPage === 'all' || totalPages <= 1) {
          paginationEl.innerHTML = `
            <div style="font-size:12px; color:#718096; font-weight:600;">
              Showing all ${totalItems} orders
            </div>
          `;
        } else {
          const endIndex = Math.min(startIndex + pageItems.length, totalItems);
          let pagHtml = `
            <div style="font-size:12px; color:#718096; font-weight:600;">
              Showing ${totalItems > 0 ? startIndex + 1 : 0} - ${endIndex} of ${totalItems} orders
            </div>
            <div style="display:flex; gap:6px; align-items:center;">
          `;

          if (this.currentPage > 1) {
            pagHtml += `<button class="btn btn-secondary btn-sm" id="btn-sales-prev" style="padding:4px 10px;">◀ Prev</button>`;
          }
          pagHtml += `<span style="font-size:13px; font-weight:700; color:#4a5568; margin:0 8px;">Page ${this.currentPage} of ${totalPages}</span>`;
          if (this.currentPage < totalPages) {
            pagHtml += `<button class="btn btn-secondary btn-sm" id="btn-sales-next" style="padding:4px 10px;">Next ▶</button>`;
          }
          pagHtml += `</div>`;
          paginationEl.innerHTML = pagHtml;

          const prevBtn = document.getElementById('btn-sales-prev');
          if (prevBtn) {
            prevBtn.onclick = async () => {
              this.currentPage--;
              await this.updateList();
            };
          }
          const nextBtn = document.getElementById('btn-sales-next');
          if (nextBtn) {
            nextBtn.onclick = async () => {
              this.currentPage++;
              await this.updateList();
            };
          }
        }
      }

      // Bind button events
      tbody.querySelectorAll('.sales-row').forEach(row => {
        const id = row.dataset.id;
        const order = pageItems.find(o => o.id === id);

        row.querySelector('.btn-view-invoice').onclick = () => this.showDetailsModal(order);
        row.querySelector('.btn-print-invoice').onclick = () => this.printReceipt(order);
        const kotBtn = row.querySelector('.btn-print-kot');
        if (kotBtn) kotBtn.onclick = () => this.printKOT(order);
        if (isAdmin) {
          const deleteBtn = row.querySelector('.btn-delete-invoice');
          if (deleteBtn) {
            deleteBtn.onclick = async () => {
              if (await H.confirm(`WARNING: Deleting this order will restore catalog inventory levels and delete transaction data.\n\nAre you sure you want to delete order ${order.invoiceId}?`)) {
                deleteBtn.disabled = true;
                const success = await S.delete('orders', order.id);
                if (success) {
                  H.showToast(`Order ${order.invoiceId} deleted successfully.`);
                  await this.updateList();
                } else {
                  H.showToast('Failed to delete order', 'error');
                  deleteBtn.disabled = false;
                }
              }
            };
          }
        }
      });
    },

    async showDetailsModal(order) {
      const S = POS.Store;
      const H = POS.Helpers;
      const user = S.getCurrentUser();
      const overlay = document.getElementById('sales-modal-overlay');

      const items = await S.query('orderItems', i => i.orderId === order.id);
      const payments = await S.query('payments', p => p.orderId === order.id);

      let itemsHtml = '';
      items.forEach(i => {
        itemsHtml += `
          <tr>
            <td>
              <div style="font-weight:600;">${H.esc(i.productName)}</div>
              ${i.variationName ? `<div class="text-muted text-sm">${H.esc(i.variationName)}</div>` : ''}
            </td>
            <td class="text-center">${i.qty}</td>
            <td class="text-right">${H.formatCurrency(i.unitPrice)}</td>
            <td class="text-right" style="font-weight:600;">${H.formatCurrency(i.total)}</td>
          </tr>
        `;
      });

      let paymentsHtml = '';
      payments.forEach(p => {
        const suffix = (p.lastFour || p.lastfour) ? ` (xxxx-${p.lastFour || p.lastfour})` : '';
        paymentsHtml += `
          <div class="flex justify-between text-sm" style="border-bottom:1px solid var(--border-light); padding:4px 0;">
            <span class="text-muted">${p.method}${suffix}</span>
            <span style="font-weight:600;">${H.formatCurrency(p.amount)}</span>
          </div>
        `;
      });

      overlay.innerHTML = `
        <div class="modal" style="max-width:650px;">
          <div class="modal-header">
            <h3>Invoice Details: ${order.invoiceId}</h3>
            <button class="modal-close" id="modal-close-invoice">&times;</button>
          </div>
          <div class="modal-body">
            <div class="grid-2 mb-2">
              <div>
                <h4 style="margin-bottom:4px;">Customer Info</h4>
                <p><strong>Name:</strong> ${H.esc(order.customerName)}</p>
                <p><strong>Phone:</strong> ${H.esc(order.customerPhone)}</p>
              </div>
              <div class="text-right">
                <h4 style="margin-bottom:4px;">Order Info</h4>
                <p><strong>Date:</strong> ${H.formatDateTime(order.date)}</p>
                <p><strong>Status:</strong> <span class="badge badge-success">${order.status}</span></p>
              </div>
            </div>

            <div class="table-wrapper mb-2">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th class="text-center" style="width:60px;">Qty</th>
                    <th class="text-right" style="width:100px;">Price</th>
                    <th class="text-right" style="width:100px;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </div>

            <div class="grid-2">
              <div>
                <h4 style="margin-bottom:8px;">Payments Received</h4>
                ${paymentsHtml || '<p class="text-muted text-sm">No payment records found.</p>'}
              </div>
              <div class="flex flex-col gap-1 text-right">
                <div class="flex justify-between">
                  <span class="text-muted">Sub Total:</span>
                  <span style="font-weight:600;">${H.formatCurrency(order.subtotal)}</span>
                </div>
                ${order.discountAmount > 0 ? `
                  <div class="flex justify-between text-danger">
                    <span>Discount:</span>
                    <span>-${H.formatCurrency(order.discountAmount)}</span>
                  </div>
                ` : ''}
                ${order.taxAmount > 0 ? `
                  <div class="flex justify-between">
                    <span>Tax (${order.taxPercent}%):</span>
                    <span>${H.formatCurrency(order.taxAmount)}</span>
                  </div>
                ` : ''}
                <div class="flex justify-between" style="border-top:1px solid var(--border); padding-top:4px; margin-top:4px;">
                  <span style="font-weight:700;">Grand Total:</span>
                  <span style="font-weight:800; color:var(--primary);">${H.formatCurrency(order.grandTotal)}</span>
                </div>
                <div class="flex justify-between text-success">
                  <span>Paid Amount:</span>
                  <span style="font-weight:700;">${H.formatCurrency(order.paidAmount)}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            ${user && (user.role === 'admin' || user.role === 'manager') ? `<button class="btn btn-warning" id="btn-edit-inv-modal" style="margin-right:auto;">Edit Order</button>` : ''}
            <button class="btn btn-secondary" id="btn-close-inv-footer">Close</button>
            <button class="btn btn-secondary" id="btn-print-kot-modal" style="background:#fff7ed; color:#c2410c; border-color:#fed7aa;">👨‍🍳 Print KOT</button>
            <button class="btn btn-primary" id="btn-print-inv-modal">Print Invoice</button>
          </div>
        </div>
      `;

      overlay.classList.add('active');

      const close = () => overlay.classList.remove('active');
      overlay.querySelector('#modal-close-invoice').onclick = close;
      overlay.querySelector('#btn-close-inv-footer').onclick = close;

      const editBtn = overlay.querySelector('#btn-edit-inv-modal');
      if (editBtn) {
        editBtn.onclick = () => {
          close();
          POS.Router.navigate('/edit-order/' + order.id);
        };
      }

      overlay.querySelector('#btn-print-inv-modal').onclick = async () => {
        const items = await S.query('orderItems', i => i.orderId === order.id);
        H.printOrder(order, items);
      };

      const kotModalBtn = overlay.querySelector('#btn-print-kot-modal');
      if (kotModalBtn) {
        kotModalBtn.onclick = async () => {
          const items = await S.query('orderItems', i => i.orderId === order.id);
          H.printKitchenToken(order, items);
        };
      }
    },

    async printReceipt(order) {
      const S = POS.Store;
      const H = POS.Helpers;
      const items = await S.query('orderItems', i => i.orderId === order.id);
      H.printOrder(order, items);
    },

    async printKOT(order) {
      const S = POS.Store;
      const H = POS.Helpers;
      const items = await S.query('orderItems', i => i.orderId === order.id);
      H.printKitchenToken(order, items);
    },

    async showExportModal() {
      const H = POS.Helpers;
      const S = POS.Store;
      const today = H.today();
      const currentFrom = this.filters.fromDate || '';
      const currentTo = this.filters.toDate || '';

      const modalHtml = `
        <div class="modal" id="modal-export-sales-csv" style="max-width:460px;">
          <div class="modal-header" style="background:#F0FDF4; border-bottom:1px solid #DCFCE7;">
            <h3 class="modal-title" style="color:#166534; font-size:16px; font-weight:800; display:flex; align-items:center; gap:8px;">
              📥 Export Sales Orders to CSV
            </h3>
            <button class="modal-close" id="btn-close-export-modal">&times;</button>
          </div>
          <div style="padding:20px; display:flex; flex-direction:column; gap:14px;">
            <p style="font-size:13px; color:#475569; margin:0;">
              Select the date range of orders you would like to export.
            </p>

            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label" style="font-size:12px; font-weight:700; color:#334155;">Quick Date Preset</label>
              <select id="export-preset" class="form-select" style="font-size:13px;">
                <option value="current" selected>Current Active Filters (${currentFrom || currentTo ? (currentFrom + ' to ' + currentTo) : 'All Time'})</option>
                <option value="today">Today (${today})</option>
                <option value="yesterday">Yesterday</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="all">All Orders (All Time)</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label" style="font-size:12px; font-weight:700; color:#334155;">From Date</label>
                <input type="date" id="export-from-date" class="form-input" style="font-size:12.5px;" value="${currentFrom}">
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label" style="font-size:12px; font-weight:700; color:#334155;">To Date</label>
                <input type="date" id="export-to-date" class="form-input" style="font-size:12.5px;" value="${currentTo}">
              </div>
            </div>

            <div id="export-count-preview" style="font-size:12px; font-weight:700; color:#15803d; background:#F0FDF4; border:1px solid #BBF7D0; border-radius:8px; padding:10px 12px; display:flex; align-items:center; gap:8px;">
              <span>⏳</span> Calculating orders to export...
            </div>

            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:6px;">
              <button type="button" class="btn btn-secondary" id="btn-cancel-export">Cancel</button>
              <button type="button" class="btn btn-success" id="btn-confirm-export" style="background:#16a34a; border-color:#16a34a; font-weight:700; display:flex; align-items:center; gap:6px;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                Download CSV
              </button>
            </div>
          </div>
        </div>
      `;

      H.showModal(modalHtml);

      const fromInput = document.getElementById('export-from-date');
      const toInput = document.getElementById('export-to-date');
      const presetSelect = document.getElementById('export-preset');
      const previewEl = document.getElementById('export-count-preview');
      const confirmBtn = document.getElementById('btn-confirm-export');

      const updatePreview = async () => {
        const from = fromInput.value;
        const to = toInput.value;
        try {
          const res = await fetch(`/api/orders/metrics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
          if (res.ok) {
            const m = await res.json();
            const count = m.orderCount || 0;
            const rangeText = (from && to) ? `${from} to ${to}` : (from ? `From ${from}` : (to ? `Up to ${to}` : 'All Time'));
            previewEl.innerHTML = `<span>📊</span> <strong>${count}</strong> orders ready to export (${rangeText})`;
            return;
          }
        } catch (e) {}
        previewEl.innerHTML = `<span>📊</span> Ready to export selected range`;
      };

      presetSelect.onchange = () => {
        const p = presetSelect.value;
        if (p === 'current') {
          fromInput.value = currentFrom;
          toInput.value = currentTo;
        } else if (p === 'today') {
          fromInput.value = today;
          toInput.value = today;
        } else if (p === 'yesterday') {
          const y = H.yesterday();
          fromInput.value = y;
          toInput.value = y;
        } else if (p === 'this_week') {
          const r = this.getPeriodRange('this_week');
          fromInput.value = r.from;
          toInput.value = r.to;
        } else if (p === 'this_month') {
          const r = this.getPeriodRange('this_month');
          fromInput.value = r.from;
          toInput.value = r.to;
        } else if (p === 'all') {
          fromInput.value = '';
          toInput.value = '';
        }
        updatePreview();
      };

      fromInput.onchange = () => { presetSelect.value = 'custom'; updatePreview(); };
      toInput.onchange = () => { presetSelect.value = 'custom'; updatePreview(); };

      updatePreview();

      document.getElementById('btn-close-export-modal').onclick = () => H.hideModal();
      document.getElementById('btn-cancel-export').onclick = () => H.hideModal();

      confirmBtn.onclick = async () => {
        const from = fromInput.value;
        const to = toInput.value;
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Generating CSV...';

        try {
          const params = new URLSearchParams();
          if (from) params.append('from', from);
          if (to) params.append('to', to);
          params.append('limit', 'all');
          params.append('withSummary', 'true');

          const res = await fetch(`/api/orders?${params.toString()}`);
          const data = await res.json();
          const filtered = data.orders || [];

          if (filtered.length === 0) {
            H.showToast('No orders found in selected date range', 'error');
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Download CSV';
            return;
          }

          const csvData = filtered.map(o => {
            return {
              'Invoice ID': o.invoiceId,
              'Customer Name': o.customerName || 'Walk-in Customer',
              'Customer Phone': o.customerPhone || 'N/A',
              'Sales Date': H.formatDateTime(o.date),
              'Payment Method': o.paymentMethodsSummary || 'N/A',
              'Subtotal': o.subtotal,
              'Discount Amount': o.discountAmount,
              'Tax Amount': o.taxAmount,
              'Grand Total': o.grandTotal,
              'Due Amount': o.dueAmount,
              'Returned Amount': o.returnedAmount
            };
          });

          const dateSuffix = from && to ? `${from}_to_${to}` : (from ? `from_${from}` : (to ? `to_${to}` : 'all'));
          H.exportCSV(csvData, `sales_list_${dateSuffix}`);
          H.showToast(`Exported ${filtered.length} orders successfully!`, 'success');
          H.hideModal();
        } catch (err) {
          H.showToast('Failed to export CSV: ' + err.message, 'error');
          confirmBtn.disabled = false;
          confirmBtn.textContent = 'Download CSV';
        }
      };
    }
  };

  window.POS = window.POS || {};
  window.POS.SalesList = SalesList;
})();
