(function () {
  'use strict';

  const SalesList = {
    currentPage: 1,
    perPage: 50,
    filters: {
      search: '',
      fromDate: '',
      toDate: '',
      paymentMethod: 'all',
      minTotal: '',
      maxTotal: ''
    },
    activePopover: null,

    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

      this.currentPage = 1;
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
        <div class="page-header fade-in">
          <div>
            <h2 class="page-title">Sales List</h2>
            <p class="page-subtitle">View, search, filter and export all completed sales orders.</p>
          </div>
          <div class="page-actions">
            <a href="/new-order" class="btn btn-primary btn-sm">+ Add New Sale</a>
            <button class="btn btn-success btn-sm" id="btn-export-csv">Export CSV</button>
          </div>
        </div>

        <div class="filter-bar fade-in" style="display:flex; gap:12px; align-items:center; justify-content:space-between; flex-wrap:wrap;">
          <div class="search-box" style="flex: 1; min-width:250px;">
            <input type="text" id="sales-search" placeholder="Search by Invoice ID, customer name or phone...">
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <label for="sales-per-page" style="font-size:13px; font-weight:600; color:#475569; white-space:nowrap;">Orders Per Page:</label>
            <select id="sales-per-page" class="form-select" style="width:auto; padding:6px 12px; font-size:13px; border-radius:var(--radius-sm); border:1px solid var(--border);">
              <option value="50" ${this.perPage === 50 ? 'selected' : ''}>50</option>
              <option value="100" ${this.perPage === 100 ? 'selected' : ''}>100</option>
              <option value="200" ${this.perPage === 200 ? 'selected' : ''}>200</option>
              <option value="500" ${this.perPage === 500 ? 'selected' : ''}>500</option>
              <option value="1000" ${this.perPage === 1000 ? 'selected' : ''}>1000</option>
              <option value="all" ${this.perPage === 'all' ? 'selected' : ''}>All Orders</option>
            </select>
          </div>
        </div>

        <div class="stats-grid fade-in" style="grid-template-columns: 1fr 1fr; gap:20px; margin-bottom: 20px;">
          <div class="stat-card green" style="padding: 15px;">
            <div class="stat-icon" style="font-weight:700; color:#16a34a;">৳</div>
            <div class="stat-info">
              <div class="stat-label">Total Sales Amount</div>
              <div class="stat-value" id="stats-total-amount">৳0.00</div>
            </div>
          </div>
          <div class="stat-card blue" style="padding: 15px;">
            <div class="stat-icon" style="font-weight:700; color:#2563eb;">#</div>
            <div class="stat-info">
              <div class="stat-label">Today's Sales</div>
              <div class="stat-value" id="stats-today-amount">৳0.00</div>
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

      // Export CSV
      document.getElementById('btn-export-csv').onclick = async () => {
        const { list, paymentsMap } = await this.getFilteredOrders();
        const csvData = list.map(o => {
          const orderPayments = paymentsMap[o.id] || [];
          const methodStr = orderPayments.length > 0 
            ? orderPayments.map(p => p.method + (p.lastFour ? ` (${p.lastFour})` : '')).join(', ') 
            : 'N/A';

          return {
            'Invoice ID': o.invoiceId,
            'Customer Name': o.customerName,
            'Customer Phone': o.customerPhone,
            'Sales Date': H.formatDateTime(o.date),
            'Payment Method': methodStr,
            'Subtotal': o.subtotal,
            'Discount Amount': o.discountAmount,
            'Tax Amount': o.taxAmount,
            'Grand Total': o.grandTotal,
            'Due Amount': o.dueAmount,
            'Returned Amount': o.returnedAmount
          };
        });
        H.exportCSV(csvData, 'sales_list');
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
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
        datePopover.querySelector('#pop-filter-from').value = `${year}-${month}-01`;
        datePopover.querySelector('#pop-filter-to').value = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
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
      const S = POS.Store;
      const H = POS.Helpers;

      const [allOrders, allPayments] = await Promise.all([
        S.getAll('orders'),
        S.getAll('payments')
      ]);

      const paymentsMap = {};
      allPayments.forEach(p => {
        if (!paymentsMap[p.orderId]) paymentsMap[p.orderId] = [];
        paymentsMap[p.orderId].push(p);
      });

      const filtered = allOrders.filter(o => {
        // Search filter
        if (this.filters.search) {
          const s = this.filters.search;
          const invMatch = (o.invoiceId || '').toLowerCase().includes(s);
          const custNameMatch = (o.customerName || '').toLowerCase().includes(s);
          const custPhoneMatch = (o.customerPhone || '').includes(s);
          if (!invMatch && !custNameMatch && !custPhoneMatch) return false;
        }

        // Date range filter
        if (this.filters.fromDate || this.filters.toDate) {
          if (!H.isDateInRange(o.date, this.filters.fromDate, this.filters.toDate)) return false;
        }

        // Payment method filter
        if (this.filters.paymentMethod && this.filters.paymentMethod !== 'all') {
          const orderPays = paymentsMap[o.id] || [];
          const methodMatch = orderPays.some(p => (p.method || '').toLowerCase() === this.filters.paymentMethod.toLowerCase());
          if (!methodMatch) return false;
        }

        // Grand total range filter
        const gTotal = parseFloat(o.grandTotal) || 0;
        if (this.filters.minTotal !== '' && gTotal < parseFloat(this.filters.minTotal)) {
          return false;
        }
        if (this.filters.maxTotal !== '' && gTotal > parseFloat(this.filters.maxTotal)) {
          return false;
        }

        return true;
      });

      return { list: filtered, paymentsMap };
    },

    async updateList() {
      const S = POS.Store;
      const H = POS.Helpers;

      const { list, paymentsMap } = await this.getFilteredOrders();
      const today = H.today();
      const todaySales = await S.query('orders', o => H.isDateInRange(o.date, today, today));

      const totalToday = todaySales.reduce((s, o) => s + (parseFloat(o.grandTotal) || 0), 0);
      const totalFiltered = list.reduce((s, o) => s + (parseFloat(o.grandTotal) || 0), 0);

      document.getElementById('stats-total-amount').textContent = H.formatCurrency(totalFiltered);
      document.getElementById('stats-today-amount').textContent = H.formatCurrency(totalToday);

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
        this.filters.fromDate || 
        this.filters.toDate || 
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
            this.filters.fromDate || this.filters.toDate,
            this.filters.paymentMethod !== 'all' ? this.filters.paymentMethod : null,
            this.filters.minTotal !== '' || this.filters.maxTotal !== ''
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
      const totalItems = list.length;
      let pageItems = list;
      let totalPages = 1;
      let startIndex = 0;

      if (this.perPage !== 'all') {
        const perPageNum = parseInt(this.perPage) || 50;
        totalPages = Math.ceil(totalItems / perPageNum) || 1;
        if (this.currentPage > totalPages) this.currentPage = totalPages;
        if (this.currentPage < 1) this.currentPage = 1;

        startIndex = (this.currentPage - 1) * perPageNum;
        pageItems = list.slice(startIndex, startIndex + perPageNum);
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

        const orderPayments = paymentsMap[o.id] || [];
        const methodStr = orderPayments.length > 0 
          ? orderPayments.map(p => p.method + (p.lastFour ? ` (${p.lastFour})` : '')).join(', ') 
          : 'N/A';

        tbody.innerHTML += `
          <tr class="sales-row" data-id="${o.id}">
            <td style="font-weight:700;">${o.invoiceId}</td>
            <td>
              <div style="font-weight:600;">${H.esc(o.customerName)}</div>
              <div class="text-muted text-sm">${H.esc(o.customerPhone)}</div>
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
                <button class="btn btn-secondary btn-sm btn-return-invoice" title="Return Items" style="padding:4px 8px; font-size:11px; color:var(--warning);">Return</button>
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
          const endIndex = Math.min(startIndex + (parseInt(this.perPage) || 50), totalItems);
          let pagHtml = `
            <div style="font-size:12px; color:#718096; font-weight:600;">
              Showing ${startIndex + 1} - ${endIndex} of ${totalItems} orders
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
        row.querySelector('.btn-return-invoice').onclick = () => {
          localStorage.setItem('return_search_invoice', order.invoiceId);
          POS.Router.navigate('/sales-return');
        };
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
            <button class="btn btn-primary" id="btn-print-inv-modal">Print Receipt</button>
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
    },

    async printReceipt(order) {
      const S = POS.Store;
      const H = POS.Helpers;
      const items = await S.query('orderItems', i => i.orderId === order.id);
      H.printOrder(order, items);
    }
  };

  window.POS = window.POS || {};
  window.POS.SalesList = SalesList;
})();
