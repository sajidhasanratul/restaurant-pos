(function () {
  'use strict';

  const CashDrawer = {
    summary: {
      currentBalance: 0,
      totalIn: 0,
      totalOut: 0,
      totalCashSales: 0,
      totalAdded: 0,
      totalTransactions: 0,
      todayCashSales: 0,
      todayAdded: 0,
      todayWithdrawn: 0,
      todayCashOrdersCount: 0
    },
    transactions: [],
    filterType: 'all',
    searchQuery: '',
    fromDate: '',
    toDate: '',

    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

      // Initialize date range: default to This Month
      const p = H.getBDDateParts(new Date());
      const pad = n => String(n).padStart(2, '0');
      const today = H.today();
      
      const savedFrom = localStorage.getItem('cash_drawer_from');
      const savedTo = localStorage.getItem('cash_drawer_to');

      this.fromDate = savedFrom || `${p.year}-${pad(p.month)}-01`;
      this.toDate = savedTo || today;

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <div style="display:flex; align-items:center; gap:10px;">
              <h2 style="margin:0; font-size:24px; font-weight:800; color:#0f172a; letter-spacing:-0.5px;">Cash Drawer</h2>
              <span id="cash-drawer-status-pill" style="font-size:11px; font-weight:700; color:#059669; background:#ecfdf5; border:1px solid #a7f3d0; padding:3px 10px; border-radius:20px; display:inline-flex; align-items:center; gap:5px;">
                <span style="width:7px; height:7px; background:#10b981; border-radius:50%; display:inline-block;"></span>
                <span>Active Register</span>
              </span>
            </div>
            <p style="margin:4px 0 0 0; color:#64748b; font-size:13.5px;">Real-time cash balance, register movements &amp; cash audit trail</p>
          </div>
          <div class="page-actions" style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <button class="btn btn-secondary" id="btn-refresh-drawer" style="display:inline-flex; align-items:center; gap:6px; font-weight:600; padding:8px 14px; border-radius:8px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-1.19"/></svg>
              <span>Refresh</span>
            </button>
            <button class="btn" id="btn-withdraw-cash" style="background:#f43f5e; color:#fff; border:none; display:inline-flex; align-items:center; gap:6px; font-weight:700; padding:8px 16px; border-radius:8px; box-shadow:0 2px 6px rgba(244,63,94,0.25);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>Withdraw Cash</span>
            </button>
            <button class="btn btn-primary" id="btn-add-cash" style="background:#059669; color:#fff; border:none; display:inline-flex; align-items:center; gap:6px; font-weight:700; padding:8px 16px; border-radius:8px; box-shadow:0 2px 6px rgba(5,150,105,0.25);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>Add Cash</span>
            </button>
          </div>
        </div>

        <!-- Metric KPI Cards -->
        <div class="stats-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:16px; margin-bottom:20px;">
          <!-- 1. Hero Balance Card -->
          <div style="background:linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius:14px; padding:20px; color:#ffffff; box-shadow:0 4px 15px rgba(16,185,129,0.25); display:flex; flex-direction:column; justify-content:space-between; position:relative; overflow:hidden;">
            <div style="position:absolute; right:-12px; bottom:-12px; opacity:0.15; pointer-events:none;">
              <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor"><rect width="20" height="13" x="2" y="4" rx="2"/><circle cx="12" cy="15" r="2"/></svg>
            </div>
            <div>
              <div style="font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#d1fae5;">Current Drawer Balance</div>
              <div id="card-drawer-balance" style="font-size:32px; font-weight:800; margin-top:6px; line-height:1.1; letter-spacing:-0.5px;">৳0.00</div>
            </div>
            <div style="margin-top:14px; display:flex; align-items:center; justify-content:space-between; font-size:12px; border-top:1px solid rgba(255,255,255,0.2); padding-top:10px;">
              <span style="color:#d1fae5;">Physical Register Cash</span>
              <span id="card-tx-count" style="background:rgba(255,255,255,0.2); padding:2px 8px; border-radius:12px; font-weight:700; font-size:11px;">0 Tx</span>
            </div>
          </div>

          <!-- 2. Cash from Sales Card -->
          <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:18px; box-shadow:0 2px 6px rgba(0,0,0,0.02); display:flex; flex-direction:column; justify-content:space-between;">
            <div style="display:flex; align-items:center; justify-content:space-between;">
              <span style="font-size:11.5px; font-weight:700; text-transform:uppercase; color:#64748b; letter-spacing:0.6px;">Cash Sales</span>
              <div style="width:36px; height:36px; border-radius:10px; background:#eff6ff; color:#2563eb; display:flex; align-items:center; justify-content:center;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
              </div>
            </div>
            <div style="margin-top:10px;">
              <div id="card-cash-sales" style="font-size:22px; font-weight:800; color:#1e293b; line-height:1.2;">৳0.00</div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px; font-size:11.5px; color:#64748b;">
                <span>Total from Orders</span>
                <span id="card-today-sales" style="color:#2563eb; font-weight:700;">Today: ৳0.00</span>
              </div>
            </div>
          </div>

          <!-- 3. Cash Injected (Added) -->
          <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:18px; box-shadow:0 2px 6px rgba(0,0,0,0.02); display:flex; flex-direction:column; justify-content:space-between;">
            <div style="display:flex; align-items:center; justify-content:space-between;">
              <span style="font-size:11.5px; font-weight:700; text-transform:uppercase; color:#64748b; letter-spacing:0.6px;">Cash In (Added)</span>
              <div style="width:36px; height:36px; border-radius:10px; background:#f0fdf4; color:#16a34a; display:flex; align-items:center; justify-content:center;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
              </div>
            </div>
            <div style="margin-top:10px;">
              <div id="card-cash-added" style="font-size:22px; font-weight:800; color:#15803d; line-height:1.2;">৳0.00</div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px; font-size:11.5px; color:#64748b;">
                <span>Manual Cash Float / Inflow</span>
                <span id="card-today-added" style="color:#16a34a; font-weight:700;">Today: ৳0.00</span>
              </div>
            </div>
          </div>

          <!-- 4. Cash Withdrawn -->
          <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:18px; box-shadow:0 2px 6px rgba(0,0,0,0.02); display:flex; flex-direction:column; justify-content:space-between;">
            <div style="display:flex; align-items:center; justify-content:space-between;">
              <span style="font-size:11.5px; font-weight:700; text-transform:uppercase; color:#64748b; letter-spacing:0.6px;">Cash Out (Withdrawn)</span>
              <div style="width:36px; height:36px; border-radius:10px; background:#fff1f2; color:#e11d48; display:flex; align-items:center; justify-content:center;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
              </div>
            </div>
            <div style="margin-top:10px;">
              <div id="card-cash-withdrawn" style="font-size:22px; font-weight:800; color:#be123c; line-height:1.2;">৳0.00</div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px; font-size:11.5px; color:#64748b;">
                <span>Bank Drops / Withdrawals</span>
                <span id="card-today-withdrawn" style="color:#e11d48; font-weight:700;">Today: ৳0.00</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter & Control Toolbar -->
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:14px 18px; margin-bottom:18px; box-shadow:0 2px 5px rgba(0,0,0,0.02); display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:14px;">
          <!-- Left: Quick Date Filters -->
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-sm btn-secondary date-preset-btn" id="btn-drawer-today">Today</button>
            <button class="btn btn-sm btn-secondary date-preset-btn" id="btn-drawer-yesterday">Yesterday</button>
            <button class="btn btn-sm btn-secondary date-preset-btn" id="btn-drawer-this-week">This Week</button>
            <button class="btn btn-sm btn-secondary date-preset-btn active" id="btn-drawer-this-month" style="font-weight:700;">This Month</button>
            <button class="btn btn-sm btn-secondary date-preset-btn" id="btn-drawer-all-time">All Time</button>
          </div>

          <!-- Right: Date Range Inputs & Type Filter -->
          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <div style="display:flex; align-items:center; gap:6px; font-size:13px; color:#475569;">
              <span>From:</span>
              <input type="date" id="drawer-from" class="form-control" style="width:138px; padding:6px 10px; font-size:12.5px; border-radius:7px;" value="${this.fromDate}">
              <span>To:</span>
              <input type="date" id="drawer-to" class="form-control" style="width:138px; padding:6px 10px; font-size:12.5px; border-radius:7px;" value="${this.toDate}">
              <button class="btn btn-sm btn-primary" id="btn-drawer-apply-range" style="padding:6px 12px; font-weight:600; border-radius:7px;">Apply</button>
            </div>

            <div style="display:flex; align-items:center; gap:6px;">
              <select id="drawer-type-filter" class="form-control" style="width:160px; padding:6px 10px; font-size:12.5px; border-radius:7px; font-weight:600;">
                <option value="all">All Movements</option>
                <option value="cash_sale">🛒 Cash Sales Only</option>
                <option value="add_cash">📥 Cash In (Added)</option>
                <option value="withdraw_cash">📤 Cash Out (Withdrawn)</option>
              </select>
            </div>

            <div style="position:relative; width:180px;">
              <input type="text" id="drawer-search" class="form-control" placeholder="Search notes/invoice..." style="padding:6px 10px 6px 28px; font-size:12px; border-radius:7px; width:100%; box-sizing:border-box;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" style="position:absolute; left:9px; top:9px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
          </div>
        </div>

        <!-- Transactions Card & Table -->
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; box-shadow:0 2px 6px rgba(0,0,0,0.02); overflow:hidden;">
          <div style="padding:14px 18px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center; background:#f8fafc;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:14px; font-weight:700; color:#1e293b;">Register Activity Log</span>
              <span id="drawer-table-count" style="font-size:11px; font-weight:700; color:#475569; background:#e2e8f0; padding:2px 8px; border-radius:12px;">0 items</span>
            </div>
            <div style="font-size:12px; color:#64748b;" id="drawer-date-scope-label">
              Range: ${this.fromDate} to ${this.toDate}
            </div>
          </div>

          <div class="table-responsive" style="max-height:620px; overflow-y:auto;">
            <table class="table" style="width:100%; border-collapse:collapse; text-align:left; font-size:13px;">
              <thead>
                <tr style="background:#f1f5f9; color:#475569; font-size:11.5px; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid #e2e8f0;">
                  <th style="padding:12px 16px; font-weight:700; width:150px;">Date &amp; Time</th>
                  <th style="padding:12px 14px; font-weight:700; width:140px;">Type</th>
                  <th style="padding:12px 14px; font-weight:700; width:130px;">Reference</th>
                  <th style="padding:12px 14px; font-weight:700;">Note / Reason</th>
                  <th style="padding:12px 14px; font-weight:700; width:110px;">Cashier / User</th>
                  <th style="padding:12px 14px; font-weight:700; text-align:right; width:120px;">Inflow (+)</th>
                  <th style="padding:12px 14px; font-weight:700; text-align:right; width:120px;">Outflow (−)</th>
                  <th style="padding:12px 18px; font-weight:700; text-align:right; width:130px;">Balance</th>
                </tr>
              </thead>
              <tbody id="drawer-transactions-tbody">
                <tr>
                  <td colspan="8" style="text-align:center; padding:36px; color:#94a3b8;">
                    Loading register transactions...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;

      // Set up events
      this._bindEvents();

      // Load data
      await this.loadData();
    },

    _bindEvents() {
      const H = POS.Helpers;

      // Quick filter buttons
      const btnToday = document.getElementById('btn-drawer-today');
      if (btnToday) {
        btnToday.onclick = () => {
          const t = H.today();
          this._setDateRange(t, t, btnToday);
        };
      }

      const btnYesterday = document.getElementById('btn-drawer-yesterday');
      if (btnYesterday) {
        btnYesterday.onclick = () => {
          const y = H.yesterday();
          this._setDateRange(y, y, btnYesterday);
        };
      }

      const btnThisWeek = document.getElementById('btn-drawer-this-week');
      if (btnThisWeek) {
        btnThisWeek.onclick = () => {
          const p = H.getBDDateParts(new Date());
          const bdInstant = new Date(Date.UTC(p.year, p.month - 1, p.day, 12, 0, 0));
          const dayOfWeek = bdInstant.getUTCDay();
          const start = H.addDays(`${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`, -dayOfWeek);
          this._setDateRange(start, H.today(), btnThisWeek);
        };
      }

      const btnThisMonth = document.getElementById('btn-drawer-this-month');
      if (btnThisMonth) {
        btnThisMonth.onclick = () => {
          const p = H.getBDDateParts(new Date());
          const pad = n => String(n).padStart(2, '0');
          this._setDateRange(`${p.year}-${pad(p.month)}-01`, H.today(), btnThisMonth);
        };
      }

      const btnAllTime = document.getElementById('btn-drawer-all-time');
      if (btnAllTime) {
        btnAllTime.onclick = () => {
          this._setDateRange('2020-01-01', H.today(), btnAllTime);
        };
      }

      // Apply Custom Range
      const btnApplyRange = document.getElementById('btn-drawer-apply-range');
      if (btnApplyRange) {
        btnApplyRange.onclick = async () => {
          this.fromDate = document.getElementById('drawer-from').value;
          this.toDate = document.getElementById('drawer-to').value;
          localStorage.setItem('cash_drawer_from', this.fromDate);
          localStorage.setItem('cash_drawer_to', this.toDate);
          this._clearActivePreset();
          await this.loadData();
        };
      }

      // Type filter
      const typeFilter = document.getElementById('drawer-type-filter');
      if (typeFilter) {
        typeFilter.onchange = (e) => {
          this.filterType = e.target.value;
          this.renderTable();
        };
      }

      // Search input
      const searchInput = document.getElementById('drawer-search');
      if (searchInput) {
        searchInput.oninput = (e) => {
          this.searchQuery = (e.target.value || '').toLowerCase().trim();
          this.renderTable();
        };
      }

      // Refresh button
      const btnRefresh = document.getElementById('btn-refresh-drawer');
      if (btnRefresh) {
        btnRefresh.onclick = async () => {
          btnRefresh.style.opacity = '0.5';
          await this.loadData();
          btnRefresh.style.opacity = '1';
          H.showToast('Cash drawer data refreshed', 'info');
        };
      }

      // Add Cash button
      const btnAddCash = document.getElementById('btn-add-cash');
      if (btnAddCash) {
        btnAddCash.onclick = () => this.showAddCashModal();
      }

      // Withdraw Cash button
      const btnWithdrawCash = document.getElementById('btn-withdraw-cash');
      if (btnWithdrawCash) {
        btnWithdrawCash.onclick = () => this.showWithdrawCashModal();
      }
    },

    _setDateRange(from, to, btnElement) {
      this.fromDate = from;
      this.toDate = to;
      document.getElementById('drawer-from').value = from;
      document.getElementById('drawer-to').value = to;
      localStorage.setItem('cash_drawer_from', from);
      localStorage.setItem('cash_drawer_to', to);

      document.querySelectorAll('.date-preset-btn').forEach(b => {
        b.classList.remove('active');
        b.style.fontWeight = 'normal';
      });
      if (btnElement) {
        btnElement.classList.add('active');
        btnElement.style.fontWeight = '700';
      }

      this.loadData();
    },

    _clearActivePreset() {
      document.querySelectorAll('.date-preset-btn').forEach(b => {
        b.classList.remove('active');
        b.style.fontWeight = 'normal';
      });
    },

    async loadData() {
      const S = POS.Store;
      const H = POS.Helpers;

      try {
        // Fetch summary & transactions in parallel
        const [sum, txs] = await Promise.all([
          S.getCashDrawerSummary(),
          S.getCashDrawerTransactions({
            from: this.fromDate,
            to: this.toDate,
            limit: 500
          })
        ]);

        this.summary = sum || this.summary;
        this.transactions = txs || [];

        this.updateCards();
        this.renderTable();

        const scopeLabel = document.getElementById('drawer-date-scope-label');
        if (scopeLabel) {
          scopeLabel.textContent = `Range: ${this.fromDate} to ${this.toDate}`;
        }
      } catch (err) {
        console.error('Failed to load cash drawer data:', err);
        H.showToast('Could not load cash drawer data: ' + err.message, 'error');
      }
    },

    updateCards() {
      const H = POS.Helpers;
      const s = this.summary;

      const balanceEl = document.getElementById('card-drawer-balance');
      if (balanceEl) balanceEl.textContent = H.formatCurrency(s.currentBalance || 0);

      const txCountEl = document.getElementById('card-tx-count');
      if (txCountEl) txCountEl.textContent = `${s.totalTransactions || 0} Total Tx`;

      const salesEl = document.getElementById('card-cash-sales');
      if (salesEl) salesEl.textContent = H.formatCurrency(s.totalCashSales || 0);

      const todaySalesEl = document.getElementById('card-today-sales');
      if (todaySalesEl) todaySalesEl.textContent = `Today: ${H.formatCurrency(s.todayCashSales || 0)}`;

      const addedEl = document.getElementById('card-cash-added');
      if (addedEl) addedEl.textContent = H.formatCurrency(s.totalAdded || 0);

      const todayAddedEl = document.getElementById('card-today-added');
      if (todayAddedEl) todayAddedEl.textContent = `Today: ${H.formatCurrency(s.todayAdded || 0)}`;

      const withdrawnEl = document.getElementById('card-cash-withdrawn');
      if (withdrawnEl) withdrawnEl.textContent = H.formatCurrency(s.totalOut || 0);

      const todayWithdrawnEl = document.getElementById('card-today-withdrawn');
      if (todayWithdrawnEl) todayWithdrawnEl.textContent = `Today: ${H.formatCurrency(s.todayWithdrawn || 0)}`;
    },

    renderTable() {
      const H = POS.Helpers;
      const tbody = document.getElementById('drawer-transactions-tbody');
      if (!tbody) return;

      let filtered = [...this.transactions];

      // Type filter
      if (this.filterType !== 'all') {
        filtered = filtered.filter(tx => tx.type === this.filterType);
      }

      // Search query
      if (this.searchQuery) {
        filtered = filtered.filter(tx => {
          const noteMatch = (tx.note || '').toLowerCase().includes(this.searchQuery);
          const invMatch = (tx.invoiceId || '').toLowerCase().includes(this.searchQuery);
          const userMatch = (tx.userName || '').toLowerCase().includes(this.searchQuery);
          return noteMatch || invMatch || userMatch;
        });
      }

      const countEl = document.getElementById('drawer-table-count');
      if (countEl) countEl.textContent = `${filtered.length} items`;

      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align:center; padding:48px 16px; color:#94a3b8;">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.8" style="margin-bottom:8px;"><rect width="20" height="13" x="2" y="4" rx="2"/><circle cx="12" cy="15" r="2"/></svg>
              <div style="font-size:14px; font-weight:700; color:#64748b;">No Cash Register Movements Found</div>
              <div style="font-size:12px; color:#94a3b8; margin-top:3px;">No transactions recorded for the selected filter and date range.</div>
            </td>
          </tr>
        `;
        return;
      }

      // Compute running balance in chronological order (oldest to newest), then display in table
      const chronological = [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date));
      let runBal = 0;
      const balanceMap = new Map();

      chronological.forEach(tx => {
        const amt = parseFloat(tx.amount) || 0;
        if (tx.type === 'withdraw_cash') {
          runBal -= amt;
        } else {
          runBal += amt;
        }
        balanceMap.set(tx.id, runBal);
      });

      tbody.innerHTML = filtered.map(tx => {
        const amt = parseFloat(tx.amount) || 0;
        const txBalance = balanceMap.get(tx.id);
        const formattedDate = H.formatDateTime(tx.date);

        let typeBadge = '';
        let inflow = '—';
        let outflow = '—';

        if (tx.type === 'cash_sale') {
          typeBadge = `
            <span style="display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:700; color:#15803d; background:#f0fdf4; border:1px solid #bbf7d0; padding:2px 8px; border-radius:12px;">
              <span style="font-size:12px;">🛒</span> Cash Sale
            </span>
          `;
          inflow = `<span style="color:#059669; font-weight:700;">+${H.formatCurrency(amt)}</span>`;
        } else if (tx.type === 'add_cash') {
          typeBadge = `
            <span style="display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:700; color:#1d4ed8; background:#eff6ff; border:1px solid #bfdbfe; padding:2px 8px; border-radius:12px;">
              <span style="font-size:12px;">📥</span> Cash Added
            </span>
          `;
          inflow = `<span style="color:#2563eb; font-weight:700;">+${H.formatCurrency(amt)}</span>`;
        } else if (tx.type === 'withdraw_cash') {
          typeBadge = `
            <span style="display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:700; color:#be123c; background:#fff1f2; border:1px solid #fecdd3; padding:2px 8px; border-radius:12px;">
              <span style="font-size:12px;">📤</span> Cash Withdrawn
            </span>
          `;
          outflow = `<span style="color:#e11d48; font-weight:700;">−${H.formatCurrency(amt)}</span>`;
        }

        const refHtml = tx.invoiceId 
          ? `<span style="font-weight:700; color:#0f172a;">${H.esc(tx.invoiceId)}</span>`
          : `<span style="color:#94a3b8; font-size:11.5px;">Manual Entry</span>`;

        return `
          <tr style="border-bottom:1px solid #f1f5f9; transition:background 0.15s ease;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
            <td style="padding:12px 16px; color:#475569; font-weight:600; white-space:nowrap;">
              ${formattedDate}
            </td>
            <td style="padding:12px 14px; white-space:nowrap;">
              ${typeBadge}
            </td>
            <td style="padding:12px 14px; white-space:nowrap;">
              ${refHtml}
            </td>
            <td style="padding:12px 14px; color:#334155;">
              ${H.esc(tx.note || '—')}
            </td>
            <td style="padding:12px 14px; color:#64748b; font-size:12px;">
              ${H.esc(tx.userName || 'Staff')}
            </td>
            <td style="padding:12px 14px; text-align:right; font-size:13px;">
              ${inflow}
            </td>
            <td style="padding:12px 14px; text-align:right; font-size:13px;">
              ${outflow}
            </td>
            <td style="padding:12px 18px; text-align:right; font-weight:800; color:#0f172a; font-size:13.5px;">
              ${txBalance !== undefined ? H.formatCurrency(txBalance) : '—'}
            </td>
          </tr>
        `;
      }).join('');
    },

    showAddCashModal() {
      const H = POS.Helpers;
      const S = POS.Store;
      const modalOverlay = document.getElementById('global-modal-overlay');
      if (!modalOverlay) return;

      const p = H.getBDDateParts(new Date());
      const pad = n => String(n).padStart(2, '0');
      const nowLocal = `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
      const currentBal = this.summary.currentBalance || 0;
      const user = S.getUser ? S.getUser() : null;

      modalOverlay.innerHTML = `
        <div class="modal animate" style="max-width: 500px; width: 95%; border-radius: 16px; overflow: hidden; background: #ffffff; box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05); border: none;">
          <!-- Modal Header -->
          <div style="padding: 18px 22px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; background: #ffffff;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 42px; height: 42px; border-radius: 12px; background: #ecfdf5; border: 1px solid #a7f3d0; color: #059669; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </div>
              <div>
                <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #0f172a; line-height: 1.2;">Add Cash to Drawer</h3>
                <div style="font-size: 12px; color: #64748b; font-weight: 500; margin-top: 2px;">Record float deposit, change replenishment, or top-up</div>
              </div>
            </div>
            <button class="modal-close" id="modal-close-add-cash" style="width: 32px; height: 32px; border-radius: 50%; border: none; background: #f8fafc; color: #64748b; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s;">&times;</button>
          </div>

          <!-- Modal Body -->
          <div class="modal-body" style="padding: 20px 22px;">
            <!-- Current vs Projected Balance Strip -->
            <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px; margin-bottom: 18px; display: flex; align-items: center; justify-content: space-between;">
              <div>
                <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #64748b;">Current Drawer</div>
                <div style="font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 1px;">${H.formatCurrency(currentBal)}</div>
              </div>
              <div style="font-size: 18px; color: #94a3b8; font-weight: 300;">➔</div>
              <div style="text-align: right;">
                <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #059669;">New Balance</div>
                <div id="add-projected-bal" style="font-size: 18px; font-weight: 800; color: #059669; margin-top: 1px;">${H.formatCurrency(currentBal)}</div>
              </div>
            </div>

            <!-- Amount Hero Field -->
            <div style="margin-bottom: 10px;">
              <div id="add-amount-card" style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 10px 14px; transition: border-color 0.2s, box-shadow 0.2s;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <label style="font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: #475569; margin: 0;">Amount to Add *</label>
                  <span style="font-size: 10.5px; font-weight: 700; color: #059669; background: #ecfdf5; padding: 1px 6px; border-radius: 6px;">BDT (৳)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 24px; font-weight: 800; color: #059669; line-height: 1;">৳</span>
                  <input type="number" id="add-cash-amount" placeholder="0.00" step="any" min="1" autofocus style="width: 100%; border: none; outline: none; background: transparent; font-size: 26px; font-weight: 800; color: #0f172a; padding: 0; font-family: inherit;">
                  <button type="button" id="btn-clear-add-amt" style="display: none; background: #f1f5f9; border: none; border-radius: 50%; width: 22px; height: 22px; font-size: 12px; color: #64748b; cursor: pointer; align-items: center; justify-content: center;">&times;</button>
                </div>
              </div>
            </div>

            <!-- Preset Amount Chips -->
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 16px;">
              <span style="font-size: 11px; font-weight: 700; color: #64748b; margin-right: 2px;">Presets:</span>
              <button type="button" class="btn-cash-chip quick-add-chip" data-amt="200">+৳200</button>
              <button type="button" class="btn-cash-chip quick-add-chip" data-amt="500">+৳500</button>
              <button type="button" class="btn-cash-chip quick-add-chip" data-amt="1000">+৳1,000</button>
              <button type="button" class="btn-cash-chip quick-add-chip" data-amt="2000">+৳2,000</button>
              <button type="button" class="btn-cash-chip quick-add-chip" data-amt="5000">+৳5,000</button>
            </div>

            <!-- Reason / Note with Quick Tags -->
            <div style="margin-bottom: 14px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <label style="font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: #475569; margin: 0;">Reason / Purpose</label>
                <span style="font-size: 10.5px; color: #94a3b8;">Click tag or type</span>
              </div>
              <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px;">
                <button type="button" class="btn-reason-chip add-reason-tag" data-text="Morning Shift Opening Float">Opening Float</button>
                <button type="button" class="btn-reason-chip add-reason-tag" data-text="Change / Coin Replenishment">Change Replenish</button>
                <button type="button" class="btn-reason-chip add-reason-tag" data-text="Owner Cash In / Deposit">Owner Deposit</button>
                <button type="button" class="btn-reason-chip add-reason-tag" data-text="Petty Cash Top-up">Petty Cash</button>
              </div>
              <textarea id="add-cash-note" rows="2" placeholder="e.g., Morning starting float for cash register..." style="width: 100%; border: 1.5px solid #cbd5e1; border-radius: 9px; font-size: 12.5px; padding: 8px 11px; resize: none; font-family: inherit; outline: none; box-sizing: border-box;"></textarea>
            </div>

            <!-- Date/Time & Staff Info -->
            <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 10px;">
              <div>
                <label style="display: block; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: #475569; margin-bottom: 4px;">Date &amp; Time</label>
                <input type="datetime-local" id="add-cash-date" value="${nowLocal}" style="width: 100%; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 12px; padding: 7px 10px; background: #f8fafc; font-family: inherit; outline: none; box-sizing: border-box;">
              </div>
              <div>
                <label style="display: block; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: #475569; margin-bottom: 4px;">Staff</label>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 10px; font-size: 12px; font-weight: 700; color: #334155; display: flex; align-items: center; gap: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; box-sizing: border-box;">
                  <span style="font-size: 13px;">👤</span>
                  <span style="overflow: hidden; text-overflow: ellipsis;">${H.esc(user?.name || 'Cashier')}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div style="padding: 14px 22px; background: #f8fafc; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; align-items: center; gap: 10px;">
            <button type="button" class="btn btn-secondary" id="btn-cancel-add-cash" style="padding: 8px 16px; font-size: 13px; font-weight: 600; border-radius: 8px; background: #ffffff; border: 1px solid #cbd5e1; color: #475569; cursor: pointer;">Cancel</button>
            <button type="button" id="btn-submit-add-cash" style="padding: 8px 20px; font-size: 13.5px; font-weight: 700; border-radius: 8px; border: none; color: #ffffff; background: linear-gradient(135deg, #10b981 0%, #059669 100%); box-shadow: 0 2px 8px rgba(16, 185, 129, 0.28); cursor: pointer; display: inline-flex; align-items: center; gap: 7px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
              <span>Confirm Add Cash</span>
            </button>
          </div>
        </div>
      `;

      modalOverlay.classList.add('active');

      const closeModal = () => {
        modalOverlay.classList.remove('active');
        modalOverlay.innerHTML = '';
      };

      document.getElementById('modal-close-add-cash').onclick = closeModal;
      document.getElementById('btn-cancel-add-cash').onclick = closeModal;

      const amtInput = document.getElementById('add-cash-amount');
      const amtCard = document.getElementById('add-amount-card');
      const clearBtn = document.getElementById('btn-clear-add-amt');
      const projectedEl = document.getElementById('add-projected-bal');
      const noteInput = document.getElementById('add-cash-note');

      // Amount card focus highlight
      amtInput.onfocus = () => {
        amtCard.style.borderColor = '#10b981';
        amtCard.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.15)';
      };
      amtInput.onblur = () => {
        amtCard.style.borderColor = '#cbd5e1';
        amtCard.style.boxShadow = 'none';
      };

      // Real-time projected balance calculation
      const updateProjected = () => {
        const val = parseFloat(amtInput.value) || 0;
        clearBtn.style.display = val > 0 ? 'inline-flex' : 'none';
        const projected = currentBal + val;
        projectedEl.textContent = H.formatCurrency(projected);
      };
      amtInput.oninput = updateProjected;

      clearBtn.onclick = () => {
        amtInput.value = '';
        updateProjected();
        amtInput.focus();
      };

      // Quick chips handler
      document.querySelectorAll('.quick-add-chip').forEach(chip => {
        chip.onclick = () => {
          const add = parseFloat(chip.getAttribute('data-amt')) || 0;
          const current = parseFloat(amtInput.value) || 0;
          amtInput.value = (current + add).toFixed(2);
          updateProjected();
          amtInput.focus();
        };
      });

      // Reason tags handler
      document.querySelectorAll('.add-reason-tag').forEach(tag => {
        tag.onclick = () => {
          noteInput.value = tag.getAttribute('data-text');
          noteInput.focus();
        };
      });

      // Submit handler
      document.getElementById('btn-submit-add-cash').onclick = async () => {
        const amt = parseFloat(amtInput.value);
        if (!amt || isNaN(amt) || amt <= 0) {
          H.showToast('Please enter a valid amount greater than zero.', 'warning');
          amtInput.focus();
          return;
        }

        const note = noteInput.value.trim();
        const dt = document.getElementById('add-cash-date').value;

        const btn = document.getElementById('btn-submit-add-cash');
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm" style="width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;display:inline-block;animation:spin 0.6s linear infinite;margin-right:6px;"></span> Saving...`;

        try {
          const res = await S.addCashDrawer({
            amount: amt,
            note: note || 'Manual Cash Added',
            date: dt ? dt.replace('T', ' ') + ':00' : null
          });

          closeModal();
          H.showToast(res.message || `Added ৳${amt.toFixed(2)} to drawer`, 'success');
          await this.loadData();
        } catch (err) {
          btn.disabled = false;
          btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg> Confirm Add Cash`;
          H.showToast(err.message || 'Failed to add cash', 'error');
        }
      };
    },

    showWithdrawCashModal() {
      const H = POS.Helpers;
      const S = POS.Store;
      const modalOverlay = document.getElementById('global-modal-overlay');
      if (!modalOverlay) return;

      const p = H.getBDDateParts(new Date());
      const pad = n => String(n).padStart(2, '0');
      const nowLocal = `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
      const currentBal = this.summary.currentBalance || 0;
      const user = S.getUser ? S.getUser() : null;

      modalOverlay.innerHTML = `
        <div class="modal animate" style="max-width: 500px; width: 95%; border-radius: 16px; overflow: hidden; background: #ffffff; box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05); border: none;">
          <!-- Modal Header -->
          <div style="padding: 18px 22px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; background: #ffffff;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 42px; height: 42px; border-radius: 12px; background: #fff1f2; border: 1px solid #fecdd3; color: #e11d48; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
              <div>
                <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #0f172a; line-height: 1.2;">Withdraw Cash from Drawer</h3>
                <div style="font-size: 12px; color: #64748b; font-weight: 500; margin-top: 2px;">Shift close, safe drop, bank deposit, or cash payout</div>
              </div>
            </div>
            <button class="modal-close" id="modal-close-withdraw-cash" style="width: 32px; height: 32px; border-radius: 50%; border: none; background: #f8fafc; color: #64748b; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s;">&times;</button>
          </div>

          <!-- Modal Body -->
          <div class="modal-body" style="padding: 20px 22px;">
            <!-- Current Balance Info & Withdraw All Banner -->
            <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px; margin-bottom: 18px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
              <div>
                <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #64748b;">Available in Drawer</div>
                <div style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 1px;">${H.formatCurrency(currentBal)}</div>
              </div>
              <button type="button" id="btn-withdraw-all" style="background: #fee2e2; color: #be123c; border: 1px solid #fecdd3; font-weight: 700; font-size: 11.5px; padding: 6px 12px; border-radius: 8px; cursor: pointer; transition: all 0.15s; display: inline-flex; align-items: center; gap: 5px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                Withdraw Full Balance
              </button>
            </div>

            <!-- Amount Hero Field -->
            <div style="margin-bottom: 8px;">
              <div id="withdraw-amount-card" style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 10px 14px; transition: border-color 0.2s, box-shadow 0.2s;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <label style="font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: #475569; margin: 0;">Withdrawal Amount *</label>
                  <span style="font-size: 10.5px; font-weight: 700; color: #e11d48; background: #fff1f2; padding: 1px 6px; border-radius: 6px;">BDT (৳)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 24px; font-weight: 800; color: #e11d48; line-height: 1;">৳</span>
                  <input type="number" id="withdraw-cash-amount" placeholder="0.00" step="any" min="1" max="${currentBal}" autofocus style="width: 100%; border: none; outline: none; background: transparent; font-size: 26px; font-weight: 800; color: #0f172a; padding: 0; font-family: inherit;">
                  <button type="button" id="btn-clear-withdraw-amt" style="display: none; background: #f1f5f9; border: none; border-radius: 50%; width: 22px; height: 22px; font-size: 12px; color: #64748b; cursor: pointer; align-items: center; justify-content: center;">&times;</button>
                </div>
              </div>
            </div>

            <!-- Remaining Balance Calculator Hint -->
            <div id="withdraw-balance-hint" style="font-size: 11.5px; font-weight: 600; color: #64748b; margin-bottom: 14px; display: flex; justify-content: space-between; padding: 0 4px;">
              <span>Remaining Drawer Cash:</span>
              <span id="withdraw-remaining-val" style="font-weight: 700; color: #0f172a;">${H.formatCurrency(currentBal)}</span>
            </div>

            <!-- Preset Withdrawal Chips -->
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 16px;">
              <span style="font-size: 11px; font-weight: 700; color: #64748b; margin-right: 2px;">Presets:</span>
              <button type="button" class="btn-cash-chip withdraw-pct-chip" data-pct="0.25">25%</button>
              <button type="button" class="btn-cash-chip withdraw-pct-chip" data-pct="0.50">50%</button>
              <button type="button" class="btn-cash-chip withdraw-pct-chip" data-pct="0.75">75%</button>
              <button type="button" class="btn-cash-chip withdraw-val-chip" data-amt="500">৳500</button>
              <button type="button" class="btn-cash-chip withdraw-val-chip" data-amt="1000">৳1,000</button>
              <button type="button" class="btn-cash-chip withdraw-val-chip" data-amt="2000">৳2,000</button>
            </div>

            <!-- Reason / Note with Quick Tags -->
            <div style="margin-bottom: 14px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <label style="font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: #475569; margin: 0;">Reason / Purpose *</label>
                <span style="font-size: 10.5px; color: #94a3b8;">Click tag or type</span>
              </div>
              <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px;">
                <button type="button" class="btn-reason-chip withdraw-reason-tag" data-text="End of Shift Safe Drop">Safe Drop</button>
                <button type="button" class="btn-reason-chip withdraw-reason-tag" data-text="Bank Cash Deposit">Bank Deposit</button>
                <button type="button" class="btn-reason-chip withdraw-reason-tag" data-text="Owner Cash Withdrawal">Owner Draw</button>
                <button type="button" class="btn-reason-chip withdraw-reason-tag" data-text="Supplier / Vendor Payment">Supplier Payout</button>
                <button type="button" class="btn-reason-chip withdraw-reason-tag" data-text="Petty Cash / Daily Expense">Daily Expense</button>
              </div>
              <textarea id="withdraw-cash-note" rows="2" placeholder="e.g., Bank deposit, owner payout, or safe drop..." style="width: 100%; border: 1.5px solid #cbd5e1; border-radius: 9px; font-size: 12.5px; padding: 8px 11px; resize: none; font-family: inherit; outline: none; box-sizing: border-box;"></textarea>
            </div>

            <!-- Date/Time & Staff Info -->
            <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 10px;">
              <div>
                <label style="display: block; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: #475569; margin-bottom: 4px;">Date &amp; Time</label>
                <input type="datetime-local" id="withdraw-cash-date" value="${nowLocal}" style="width: 100%; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 12px; padding: 7px 10px; background: #f8fafc; font-family: inherit; outline: none; box-sizing: border-box;">
              </div>
              <div>
                <label style="display: block; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: #475569; margin-bottom: 4px;">Staff</label>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 10px; font-size: 12px; font-weight: 700; color: #334155; display: flex; align-items: center; gap: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; box-sizing: border-box;">
                  <span style="font-size: 13px;">👤</span>
                  <span style="overflow: hidden; text-overflow: ellipsis;">${H.esc(user?.name || 'Cashier')}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div style="padding: 14px 22px; background: #f8fafc; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; align-items: center; gap: 10px;">
            <button type="button" class="btn btn-secondary" id="btn-cancel-withdraw-cash" style="padding: 8px 16px; font-size: 13px; font-weight: 600; border-radius: 8px; background: #ffffff; border: 1px solid #cbd5e1; color: #475569; cursor: pointer;">Cancel</button>
            <button type="button" id="btn-submit-withdraw-cash" style="padding: 8px 20px; font-size: 13.5px; font-weight: 700; border-radius: 8px; border: none; color: #ffffff; background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); box-shadow: 0 2px 8px rgba(225, 29, 72, 0.28); cursor: pointer; display: inline-flex; align-items: center; gap: 7px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              <span>Confirm Withdrawal</span>
            </button>
          </div>
        </div>
      `;

      modalOverlay.classList.add('active');

      const closeModal = () => {
        modalOverlay.classList.remove('active');
        modalOverlay.innerHTML = '';
      };

      document.getElementById('modal-close-withdraw-cash').onclick = closeModal;
      document.getElementById('btn-cancel-withdraw-cash').onclick = closeModal;

      const amtInput = document.getElementById('withdraw-cash-amount');
      const amtCard = document.getElementById('withdraw-amount-card');
      const clearBtn = document.getElementById('btn-clear-withdraw-amt');
      const noteInput = document.getElementById('withdraw-cash-note');
      const hintEl = document.getElementById('withdraw-balance-hint');
      const remValEl = document.getElementById('withdraw-remaining-val');

      // Amount card focus highlight
      amtInput.onfocus = () => {
        amtCard.style.borderColor = '#e11d48';
        amtCard.style.boxShadow = '0 0 0 3px rgba(225, 29, 72, 0.15)';
      };
      amtInput.onblur = () => {
        amtCard.style.borderColor = '#cbd5e1';
        amtCard.style.boxShadow = 'none';
      };

      // Real-time remaining calculation & overdraw warning
      const updateRemaining = () => {
        const val = parseFloat(amtInput.value) || 0;
        clearBtn.style.display = val > 0 ? 'inline-flex' : 'none';
        const rem = currentBal - val;

        if (val > currentBal) {
          hintEl.innerHTML = `
            <span style="color:#e11d48; font-weight:700;">⚠️ Exceeds Available Drawer Cash:</span>
            <span style="color:#e11d48; font-weight:800;">-৳${(val - currentBal).toFixed(2)}</span>
          `;
        } else {
          hintEl.innerHTML = `
            <span>Remaining Drawer Cash:</span>
            <span style="font-weight:700; color:#0f172a;">${H.formatCurrency(Math.max(0, rem))}</span>
          `;
        }
      };
      amtInput.oninput = updateRemaining;

      clearBtn.onclick = () => {
        amtInput.value = '';
        updateRemaining();
        amtInput.focus();
      };

      // Withdraw all button
      document.getElementById('btn-withdraw-all').onclick = () => {
        amtInput.value = currentBal.toFixed(2);
        if (!noteInput.value) {
          noteInput.value = 'Full Drawer Withdrawal / Shift Close';
        }
        updateRemaining();
        amtInput.focus();
      };

      // Percentage chips
      document.querySelectorAll('.withdraw-pct-chip').forEach(chip => {
        chip.onclick = () => {
          const pct = parseFloat(chip.getAttribute('data-pct')) || 0;
          amtInput.value = Math.max(0, Math.floor(currentBal * pct)).toFixed(2);
          updateRemaining();
          amtInput.focus();
        };
      });

      // Fixed value chips
      document.querySelectorAll('.withdraw-val-chip').forEach(chip => {
        chip.onclick = () => {
          const amt = parseFloat(chip.getAttribute('data-amt')) || 0;
          amtInput.value = amt.toFixed(2);
          updateRemaining();
          amtInput.focus();
        };
      });

      // Reason tags
      document.querySelectorAll('.withdraw-reason-tag').forEach(tag => {
        tag.onclick = () => {
          noteInput.value = tag.getAttribute('data-text');
          noteInput.focus();
        };
      });

      // Submit handler
      document.getElementById('btn-submit-withdraw-cash').onclick = async () => {
        const amt = parseFloat(amtInput.value);
        if (!amt || isNaN(amt) || amt <= 0) {
          H.showToast('Please enter a valid withdrawal amount.', 'warning');
          amtInput.focus();
          return;
        }

        if (currentBal <= 0) {
          H.showToast('Cash drawer balance is ৳0.00. Cannot withdraw.', 'error');
          return;
        }

        if (amt > currentBal) {
          H.showToast(`Cannot withdraw ৳${amt.toFixed(2)}. Max available balance is ৳${currentBal.toFixed(2)}.`, 'warning');
          amtInput.focus();
          return;
        }

        const note = noteInput.value.trim();
        if (!note) {
          H.showToast('Please enter or select a Reason/Note for this withdrawal.', 'warning');
          noteInput.focus();
          return;
        }

        const dt = document.getElementById('withdraw-cash-date').value;
        const btn = document.getElementById('btn-submit-withdraw-cash');
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm" style="width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;display:inline-block;animation:spin 0.6s linear infinite;margin-right:6px;"></span> Processing...`;

        try {
          const res = await S.withdrawCashDrawer({
            amount: amt,
            note: note || 'Cash Withdrawal',
            date: dt ? dt.replace('T', ' ') + ':00' : null,
            withdrawAll: amt >= currentBal
          });

          closeModal();
          H.showToast(res.message || `Withdrew ৳${amt.toFixed(2)} from drawer`, 'success');
          await this.loadData();
        } catch (err) {
          btn.disabled = false;
          btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg> Confirm Withdrawal`;
          H.showToast(err.message || 'Failed to withdraw cash', 'error');
        }
      };
    }
  };

  window.POS = window.POS || {};
  window.POS.CashDrawer = CashDrawer;
})();
