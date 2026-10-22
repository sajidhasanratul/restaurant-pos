(function () {
  'use strict';

  const DamagedProducts = {
    currentList: [],

    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;
      const user = S.getCurrentUser();

      const today = H.today();
      let fromDate = localStorage.getItem('dp_from') || '';
      let toDate = localStorage.getItem('dp_to') || '';

      mc.innerHTML = `
        <!-- Top Bar: Date Range Filter + Action Buttons -->
        <div class="filter-bar fade-in" style="display:flex; flex-direction:column; gap:12px; background:#fff; padding:14px 18px; border-radius:12px; border:1px solid #EAE4D9; margin-bottom:16px;">
          <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span style="font-size:12px; font-weight:800; color:#64748B; text-transform:uppercase; letter-spacing:0.5px;">Filter:</span>
              <div class="btn-group" style="display:flex; gap:6px; background:#F8FAFC; padding:4px; border-radius:10px; border:1px solid #E2E8F0;">
                <button type="button" class="btn btn-sm dp-period-btn active" data-period="today" style="border-radius:7px; font-weight:700; padding:5px 12px; font-size:12px;">Today</button>
                <button type="button" class="btn btn-sm dp-period-btn" data-period="yesterday" style="border-radius:7px; font-weight:700; padding:5px 12px; font-size:12px;">Yesterday</button>
                <button type="button" class="btn btn-sm dp-period-btn" data-period="this_week" style="border-radius:7px; font-weight:700; padding:5px 12px; font-size:12px;">This Week</button>
                <button type="button" class="btn btn-sm dp-period-btn" data-period="this_month" style="border-radius:7px; font-weight:700; padding:5px 12px; font-size:12px;">This Month</button>
                <button type="button" class="btn btn-sm dp-period-btn" data-period="custom" style="border-radius:7px; font-weight:700; padding:5px 12px; font-size:12px;">Custom</button>
              </div>
              <div id="dp-date-indicator" style="display:inline-flex; align-items:center; gap:6px; background:#FEF2F2; border:1px solid #FECACA; border-radius:8px; padding:4px 10px; font-size:12px; font-weight:700; color:#B91C1C;">
                <span>📅 Filtered:</span>
                <span id="dp-active-date-text">Today (${H.formatDate(today)})</span>
              </div>
            </div>

            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; flex:1; justify-content:flex-end;">
              <div style="width:160px;">
                <select class="form-select" id="dp-filter-type" style="height:36px; font-size:12.5px;">
                  <option value="">All Damage Types</option>
                  <option value="Kitchen Mishap">Kitchen Mishap</option>
                  <option value="Dropped / Broken">Dropped / Broken</option>
                  <option value="Transit Defect">Transit Defect</option>
                  <option value="Packaging Damaged">Packaging Damaged</option>
                  <option value="Spoiled on Counter">Spoiled on Counter</option>
                  <option value="Quality Rejection">Quality Rejection</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div style="flex:1; min-width:160px; max-width:240px;">
                <input type="text" class="form-input" id="dp-search" placeholder="Search product, staff, note..." style="height:36px; font-size:12.5px;">
              </div>
              <button class="btn btn-primary btn-sm" id="btn-add-damaged-product" style="background:#DC2626; border-color:#DC2626; height:36px; padding:0 14px; font-weight:700; white-space:nowrap; display:inline-flex; align-items:center; gap:6px;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <span>Record Damaged Product</span>
              </button>
            </div>
          </div>

          <!-- Date inputs row for Custom -->
          <div id="dp-custom-date-box" style="display:none; align-items:center; gap:10px; flex-wrap:wrap; border-top:1px dashed #E2E8F0; padding-top:10px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <label class="form-label" style="margin:0; font-size:12px; font-weight:700; color:#64748B;">From:</label>
              <input type="date" class="form-input" id="dp-filter-from" value="${fromDate}" style="height:32px; font-size:12px; width:135px;">
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <label class="form-label" style="margin:0; font-size:12px; font-weight:700; color:#64748B;">To:</label>
              <input type="date" class="form-input" id="dp-filter-to" value="${toDate}" style="height:32px; font-size:12px; width:135px;">
            </div>
            <button type="button" class="btn btn-primary btn-sm" id="btn-filter-dp" style="height:32px; padding:0 14px; font-size:12px; font-weight:700;">Apply Range</button>
          </div>
        </div>

        <!-- KPI Metrics Grid -->
        <div class="stats-grid fade-in mb-2" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 20px;">
          <!-- 1. Total Financial Loss -->
          <div class="stat-card" style="padding: 16px; border-left: 4px solid #DC2626; background:#fff; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
            <div class="stat-icon" style="background:#FEE2E2; color:#DC2626; width:44px; height:44px; border-radius:10px; display:flex; align-items:center; justify-content:center;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div class="stat-info">
              <div class="stat-label" style="font-size:11px; font-weight:700; text-transform:uppercase; color:#64748B;">Total Damaged Cost</div>
              <div class="stat-value" id="stats-dp-total-cost" style="color:#DC2626; font-size:22px; font-weight:800; margin-top:2px;">৳0.00</div>
              <div class="stat-sub" style="font-size:11.5px; color:#64748B; margin-top:2px;">Total write-off loss in range</div>
            </div>
          </div>

          <!-- 2. Total Damaged Units -->
          <div class="stat-card" style="padding: 16px; border-left: 4px solid #EA580C; background:#fff; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
            <div class="stat-icon" style="background:#FFEDD5; color:#EA580C; width:44px; height:44px; border-radius:10px; display:flex; align-items:center; justify-content:center;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
            </div>
            <div class="stat-info">
              <div class="stat-label" style="font-size:11px; font-weight:700; text-transform:uppercase; color:#64748B;">Damaged Quantity</div>
              <div class="stat-value" id="stats-dp-quantity" style="color:#C2410C; font-size:22px; font-weight:800; margin-top:2px;">0 <span style="font-size:13px; font-weight:600;">pcs</span></div>
              <div class="stat-sub" style="font-size:11.5px; color:#64748B; margin-top:2px;">Units discarded / wasted</div>
            </div>
          </div>

          <!-- 3. Incident Occurrences -->
          <div class="stat-card" style="padding: 16px; border-left: 4px solid #4F46E5; background:#fff; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
            <div class="stat-icon" style="background:#EEF2FF; color:#4F46E5; width:44px; height:44px; border-radius:10px; display:flex; align-items:center; justify-content:center;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </div>
            <div class="stat-info">
              <div class="stat-label" style="font-size:11px; font-weight:700; text-transform:uppercase; color:#64748B;">Total Incidents</div>
              <div class="stat-value" id="stats-dp-count" style="color:#4338CA; font-size:22px; font-weight:800; margin-top:2px;">0</div>
              <div class="stat-sub" style="font-size:11.5px; color:#64748B; margin-top:2px;">Logged damaged entries</div>
            </div>
          </div>
        </div>

        <!-- Records Table -->
        <div class="card fade-in" style="background:#fff; border:1px solid #E2E8F0; border-radius:12px; overflow:hidden;">
          <div class="card-body" style="padding:0;">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width: 120px;">Date</th>
                    <th>Product Name</th>
                    <th>Variation</th>
                    <th style="width: 130px;">Damage Type</th>
                    <th class="text-center" style="width: 90px;">Quantity</th>
                    <th class="text-right" style="width: 110px;">Unit Cost</th>
                    <th class="text-right" style="width: 120px;">Total Loss</th>
                    <th>Logged By</th>
                    <th>Reason / Note</th>
                    <th style="width: 100px; text-align: center;">Actions</th>
                  </tr>
                </thead>
                <tbody id="dp-tbody">
                  <tr>
                    <td colspan="10" class="text-center text-muted" style="padding:28px;">Loading damaged product records...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      document.getElementById('btn-add-damaged-product').onclick = () => this.showModal(null);

      const customBox = document.getElementById('dp-custom-date-box');
      const fromInput = document.getElementById('dp-filter-from');
      const toInput = document.getElementById('dp-filter-to');

      const getDpPeriodRange = (period) => {
        const t = H.today();
        if (period === 'today') return { from: t, to: t, label: `Today (${H.formatDate(t)})` };
        if (period === 'yesterday') {
          const y = H.yesterday();
          return { from: y, to: y, label: `Yesterday (${H.formatDate(y)})` };
        }
        if (period === 'this_week') {
          const now = new Date();
          const day = now.getDay();
          const start = H.addDays(t, -day);
          return { from: start, to: t, label: `This Week (${H.formatDate(start)} - ${H.formatDate(t)})` };
        }
        if (period === 'this_month') {
          const p = H.getBDDateParts(new Date());
          const pad = n => String(n).padStart(2, '0');
          const start = `${p.year}-${pad(p.month)}-01`;
          return { from: start, to: t, label: `This Month (${H.formatDate(start)} - ${H.formatDate(t)})` };
        }
        return { from: fromInput.value || t, to: toInput.value || t, label: `Custom (${fromInput.value || t} to ${toInput.value || t})` };
      };

      const setPeriod = async (period) => {
        document.querySelectorAll('.dp-period-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.period === period);
        });

        if (period === 'custom') {
          customBox.style.display = 'flex';
          const r = getDpPeriodRange('custom');
          document.getElementById('dp-active-date-text').textContent = r.label;
          localStorage.setItem('dp_period', 'custom');
        } else {
          customBox.style.display = 'none';
          const r = getDpPeriodRange(period);
          fromInput.value = r.from;
          toInput.value = r.to;
          localStorage.setItem('dp_from', r.from);
          localStorage.setItem('dp_to', r.to);
          localStorage.setItem('dp_period', period);
          document.getElementById('dp-active-date-text').textContent = r.label;
          await this.loadData(r.from, r.to);
        }
      };

      document.querySelectorAll('.dp-period-btn').forEach(btn => {
        btn.onclick = () => setPeriod(btn.dataset.period);
      });

      document.getElementById('btn-filter-dp').onclick = async () => {
        const from = fromInput.value;
        const to = toInput.value;
        if (!from || !to) {
          H.showToast('Please select both From and To dates', 'warning');
          return;
        }
        localStorage.setItem('dp_from', from);
        localStorage.setItem('dp_to', to);
        document.getElementById('dp-active-date-text').textContent = `Custom (${H.formatDate(from)} to ${H.formatDate(to)})`;
        await this.loadData(from, to);
      };

      document.getElementById('dp-filter-type').onchange = () => this.filterTable();
      document.getElementById('dp-search').oninput = () => this.filterTable();

      const savedPeriod = localStorage.getItem('dp_period') || 'today';
      if (savedPeriod === 'custom' && fromDate && toDate) {
        setPeriod('custom');
        this.loadData(fromDate, toDate);
      } else {
        setPeriod(savedPeriod);
      }
    },

    async loadData(from, to) {
      const H = POS.Helpers;
      try {
        let url = '/api/damaged-products';
        if (from && to) {
          url += `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to load damaged products');
        this.currentList = await res.json();
        this.updateStats();
        this.filterTable();
      } catch (err) {
        console.error('Error fetching damaged products:', err);
        const tbody = document.getElementById('dp-tbody');
        if (tbody) {
          tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger" style="padding:24px;">Failed to load records. ${err.message}</td></tr>`;
        }
      }
    },

    updateStats() {
      const H = POS.Helpers;
      const list = this.currentList || [];
      let totalCost = 0;
      let totalQty = 0;

      list.forEach(item => {
        totalCost += (parseFloat(item.totalCost) || 0);
        totalQty += (parseFloat(item.quantity) || 0);
      });

      const costEl = document.getElementById('stats-dp-total-cost');
      const qtyEl = document.getElementById('stats-dp-quantity');
      const countEl = document.getElementById('stats-dp-count');

      if (costEl) costEl.textContent = H.formatCurrency(totalCost);
      if (qtyEl) qtyEl.innerHTML = `${totalQty} <span style="font-size:13px; font-weight:600;">pcs</span>`;
      if (countEl) countEl.textContent = list.length;
    },

    filterTable() {
      const H = POS.Helpers;
      const typeFilter = (document.getElementById('dp-filter-type')?.value || '').toLowerCase();
      const search = (document.getElementById('dp-search')?.value || '').toLowerCase().trim();

      const filtered = (this.currentList || []).filter(item => {
        if (typeFilter && (item.damageType || '').toLowerCase() !== typeFilter) return false;
        if (search) {
          const matchP = (item.productName || '').toLowerCase().includes(search);
          const matchV = (item.variationName || '').toLowerCase().includes(search);
          const matchS = (item.staffName || '').toLowerCase().includes(search);
          const matchN = (item.note || '').toLowerCase().includes(search);
          const matchT = (item.damageType || '').toLowerCase().includes(search);
          if (!matchP && !matchV && !matchS && !matchN && !matchT) return false;
        }
        return true;
      });

      this.renderTable(filtered);
    },

    renderTable(list) {
      const H = POS.Helpers;
      const tbody = document.getElementById('dp-tbody');
      if (!tbody) return;

      if (!list || list.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="10" class="text-center text-muted" style="padding:36px 20px;">
              <div style="font-size:32px; margin-bottom:8px;">📦</div>
              <div style="font-weight:700; color:#475569; font-size:14px;">No Damaged Product Records</div>
              <div style="font-size:12px; color:#94A3B8; margin-top:4px;">No damaged items found for the selected period.</div>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = list.map(item => {
        const qty = parseFloat(item.quantity) || 0;
        const unitCost = parseFloat(item.unitCost) || 0;
        const totalCost = parseFloat(item.totalCost) || (qty * unitCost);

        const typeColorMap = {
          'Kitchen Mishap': { bg: '#FEE2E2', text: '#991B1B' },
          'Dropped / Broken': { bg: '#FFEDD5', text: '#9A3412' },
          'Transit Defect': { bg: '#FEF3C7', text: '#92400E' },
          'Packaging Damaged': { bg: '#F3E8FF', text: '#6B21A8' },
          'Spoiled on Counter': { bg: '#FCE7F3', text: '#9D174D' },
          'Quality Rejection': { bg: '#E0F2FE', text: '#075985' }
        };

        const badgeStyle = typeColorMap[item.damageType] || { bg: '#F1F5F9', text: '#475569' };

        return `
          <tr>
            <td style="font-weight:600; font-size:12.5px; color:#334155; white-space:nowrap;">
              ${H.formatDateTime ? H.formatDateTime(item.date) : H.formatDate(item.date)}
            </td>
            <td style="font-weight:700; color:#0F172A;">
              ${H.esc(item.productName)}
            </td>
            <td style="color:#64748B; font-size:12.5px;">
              ${item.variationName ? `<span style="background:#F1F5F9; padding:2px 8px; border-radius:6px; font-weight:600;">${H.esc(item.variationName)}</span>` : '<span style="color:#94A3B8;">—</span>'}
            </td>
            <td>
              <span style="background:${badgeStyle.bg}; color:${badgeStyle.text}; font-size:11.5px; font-weight:700; padding:3px 9px; border-radius:12px; white-space:nowrap;">
                ${H.esc(item.damageType || 'Defect')}
              </span>
            </td>
            <td class="text-center" style="font-weight:700; color:#1E293B;">
              ${qty} <span style="font-size:11px; font-weight:600; color:#64748B;">pcs</span>
            </td>
            <td class="text-right" style="color:#475569; font-size:12.5px;">
              ${H.formatCurrency(unitCost)}
            </td>
            <td class="text-right" style="font-weight:800; color:#DC2626;">
              ${H.formatCurrency(totalCost)}
            </td>
            <td style="color:#475569; font-size:12.5px;">
              ${item.staffName ? `<span style="display:inline-flex; align-items:center; gap:4px;">👤 ${H.esc(item.staffName)}</span>` : '<span style="color:#94A3B8;">—</span>'}
            </td>
            <td style="max-width:200px; font-size:12px; color:#64748B; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${H.esc(item.note || '')}">
              ${H.esc(item.note || '—')}
            </td>
            <td style="text-align: center; white-space:nowrap;">
              <div style="display:inline-flex; align-items:center; gap:6px;">
                <button class="btn btn-sm btn-edit-dp" data-id="${item.id}" title="Edit" style="padding:4px 8px; background:#F8FAFC; border:1px solid #CBD5E1; border-radius:6px; color:#475569; cursor:pointer;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="btn btn-sm btn-del-dp" data-id="${item.id}" title="Delete" style="padding:4px 8px; background:#FEF2F2; border:1px solid #FECACA; border-radius:6px; color:#DC2626; cursor:pointer;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      tbody.querySelectorAll('.btn-edit-dp').forEach(btn => {
        btn.onclick = () => {
          const item = (this.currentList || []).find(i => String(i.id) === String(btn.dataset.id));
          if (item) this.showModal(item);
        };
      });

      tbody.querySelectorAll('.btn-del-dp').forEach(btn => {
        btn.onclick = async () => {
          if (!confirm('Are you sure you want to delete this damaged product record?')) return;
          try {
            const res = await fetch(`/api/damaged-products/${btn.dataset.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            H.showToast('Damaged record removed successfully', 'success');
            const from = localStorage.getItem('dp_from') || H.today();
            const to = localStorage.getItem('dp_to') || H.today();
            await this.loadData(from, to);
          } catch (err) {
            H.showToast(err.message, 'error');
          }
        };
      });
    },

    async showModal(item = null) {
      const S = POS.Store;
      const H = POS.Helpers;
      const user = S.getCurrentUser();
      const isEdit = !!item;

      // Fetch products for dropdown
      let products = [];
      try {
        products = await S.getAll('products');
      } catch (e) {
        console.warn('Could not load products for damaged modal:', e);
      }

      let overlay = document.getElementById('global-modal-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'global-modal-overlay';
        overlay.className = 'modal-overlay';
        document.body.appendChild(overlay);
      }

      const now = new Date();
      const defaultDate = isEdit && item.date ? item.date.slice(0, 10) : H.today();
      const staffVal = isEdit ? (item.staffName || '') : (user ? user.name : '');

      overlay.innerHTML = `
        <div class="modal" id="modal-damaged-product" style="max-width:540px; background:#fff; border-radius:14px; box-shadow:0 20px 45px rgba(0,0,0,0.2); overflow:hidden;">
          <div class="modal-header" style="background:linear-gradient(135deg, #1E293B 0%, #334155 100%); color:#fff; padding:16px 20px; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="width:34px; height:34px; border-radius:8px; background:rgba(239,68,68,0.25); color:#FCA5A5; display:flex; align-items:center; justify-content:center;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
              </div>
              <div>
                <h3 style="margin:0; font-size:16px; font-weight:800; color:#fff;">${isEdit ? 'Edit Damaged Record' : 'Record Damaged Product'}</h3>
                <div style="font-size:11.5px; color:#94A3B8; margin-top:2px;">Track inventory write-offs, cooking defects, and breakages</div>
              </div>
            </div>
            <button type="button" class="modal-close" id="btn-close-dp-modal" style="background:transparent; border:none; color:#94A3B8; font-size:20px; cursor:pointer;">&times;</button>
          </div>

          <form id="form-damaged-product" style="display:flex; flex-direction:column; gap:14px; padding:20px;">
            <!-- Product Selection -->
            <div>
              <label class="form-label" style="font-size:12px; font-weight:700; color:#334155; margin-bottom:4px; display:flex; justify-content:space-between;">
                <span>Select Product <span style="color:#DC2626;">*</span></span>
                <span id="dp-prod-cost-hint" style="font-weight:600; color:#64748B; font-size:11px;"></span>
              </label>
              <select class="form-select" id="dp-select-product" required style="height:38px; font-size:13px;">
                <option value="">-- Choose Menu Item / Dish --</option>
                ${products.map(p => {
                  const isSel = isEdit && (String(p.id) === String(item.productId) || p.name === item.productName);
                  return `<option value="${p.id}" data-name="${H.esc(p.name)}" data-cost="${p.costPrice || 0}" ${isSel ? 'selected' : ''}>${H.esc(p.name)} (${H.formatCurrency(p.costPrice || 0)})</option>`;
                }).join('')}
              </select>
            </div>

            <!-- Variation (if applicable) -->
            <div id="dp-variation-group" style="display:${isEdit && item.variationName ? 'block' : 'none'};">
              <label class="form-label" style="font-size:12px; font-weight:700; color:#334155; margin-bottom:4px;">Product Variation / Portion</label>
              <select class="form-select" id="dp-select-variation" style="height:38px; font-size:13px;">
                <option value="">Default Portion / Regular</option>
              </select>
            </div>

            <!-- Quantity & Unit Cost Row -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div>
                <label class="form-label" style="font-size:12px; font-weight:700; color:#334155; margin-bottom:4px;">Damaged Quantity (Pcs) <span style="color:#DC2626;">*</span></label>
                <input type="number" step="0.01" min="0.01" class="form-input" id="dp-input-qty" value="${isEdit ? item.quantity : '1'}" required style="height:38px; font-size:13.5px; font-weight:700;">
              </div>
              <div>
                <label class="form-label" style="font-size:12px; font-weight:700; color:#334155; margin-bottom:4px;">Unit Cost Price (৳) <span style="color:#DC2626;">*</span></label>
                <input type="number" step="0.01" min="0" class="form-input" id="dp-input-cost" value="${isEdit ? item.unitCost : '0'}" required style="height:38px; font-size:13.5px; font-weight:700;">
              </div>
            </div>

            <!-- Total Loss Preview Banner -->
            <div style="background:#FEF2F2; border:1px solid #FECACA; border-radius:10px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:12.5px; font-weight:700; color:#991B1B;">Estimated Write-Off Loss:</span>
              <span id="dp-total-loss-preview" style="font-size:16px; font-weight:800; color:#DC2626;">৳0.00</span>
            </div>

            <!-- Damage Reason / Type -->
            <div>
              <label class="form-label" style="font-size:12px; font-weight:700; color:#334155; margin-bottom:4px;">Damage Type / Cause <span style="color:#DC2626;">*</span></label>
              <select class="form-select" id="dp-select-type" required style="height:38px; font-size:13px;">
                <option value="Kitchen Mishap" ${isEdit && item.damageType === 'Kitchen Mishap' ? 'selected' : ''}>Kitchen Mishap (Burned / Cooking Error)</option>
                <option value="Dropped / Broken" ${isEdit && item.damageType === 'Dropped / Broken' ? 'selected' : ''}>Dropped / Broken Plate or Glass</option>
                <option value="Transit Defect" ${isEdit && item.damageType === 'Transit Defect' ? 'selected' : ''}>Transit / Supplier Delivery Defect</option>
                <option value="Packaging Damaged" ${isEdit && item.damageType === 'Packaging Damaged' ? 'selected' : ''}>Packaging Damaged / Crushed</option>
                <option value="Spoiled on Counter" ${isEdit && item.damageType === 'Spoiled on Counter' ? 'selected' : ''}>Spoiled on Counter / Expired</option>
                <option value="Quality Rejection" ${isEdit && item.damageType === 'Quality Rejection' ? 'selected' : ''}>Quality Rejection by Customer / Chef</option>
                <option value="Other" ${isEdit && item.damageType === 'Other' ? 'selected' : ''}>Other Reason</option>
              </select>
            </div>

            <!-- Date & Logged By Row -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div>
                <label class="form-label" style="font-size:12px; font-weight:700; color:#334155; margin-bottom:4px;">Incident Date</label>
                <input type="date" class="form-input" id="dp-input-date" value="${defaultDate}" required style="height:38px; font-size:12.5px;">
              </div>
              <div>
                <label class="form-label" style="font-size:12px; font-weight:700; color:#334155; margin-bottom:4px;">Logged By (Staff)</label>
                <input type="text" class="form-input" id="dp-input-staff" value="${H.esc(staffVal)}" placeholder="Staff Name" style="height:38px; font-size:12.5px;">
              </div>
            </div>

            <!-- Notes -->
            <div>
              <label class="form-label" style="font-size:12px; font-weight:700; color:#334155; margin-bottom:4px;">Reason & Context (Optional)</label>
              <textarea class="form-textarea" id="dp-input-note" rows="2" placeholder="Briefly describe what happened..." style="font-size:12.5px; resize:vertical;">${isEdit ? H.esc(item.note || '') : ''}</textarea>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:8px; padding-top:12px; border-top:1px solid #E2E8F0;">
              <button type="button" class="btn btn-secondary" id="btn-cancel-dp" style="padding:0 16px; height:38px; font-weight:700;">Cancel</button>
              <button type="submit" class="btn btn-primary" id="btn-save-dp" style="background:#DC2626; border-color:#DC2626; padding:0 22px; height:38px; font-weight:700; display:inline-flex; align-items:center; gap:6px;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>${isEdit ? 'Update Record' : 'Save Damaged Record'}</span>
              </button>
            </div>
          </form>
        </div>
      `;

      overlay.classList.add('active');

      const prodSelect = document.getElementById('dp-select-product');
      const varGroup = document.getElementById('dp-variation-group');
      const varSelect = document.getElementById('dp-select-variation');
      const qtyInput = document.getElementById('dp-input-qty');
      const costInput = document.getElementById('dp-input-cost');
      const previewEl = document.getElementById('dp-total-loss-preview');

      const updateLossPreview = () => {
        const q = parseFloat(qtyInput.value) || 0;
        const c = parseFloat(costInput.value) || 0;
        previewEl.textContent = H.formatCurrency(q * c);
      };

      const populateVariations = (product, selectedVar = '') => {
        if (!product || !product.variations || product.variations.length === 0) {
          varGroup.style.display = 'none';
          varSelect.innerHTML = '<option value="">Default Portion / Regular</option>';
          return;
        }
        varGroup.style.display = 'block';
        varSelect.innerHTML = product.variations.map(v => {
          const isSel = selectedVar && (v.name === selectedVar || (product.name + ' ' + v.name) === selectedVar);
          return `<option value="${H.esc(v.name)}" data-cost="${v.costPrice || product.costPrice || 0}" ${isSel ? 'selected' : ''}>${H.esc(v.name)} (${H.formatCurrency(v.costPrice || product.costPrice || 0)})</option>`;
        }).join('');
      };

      prodSelect.onchange = () => {
        const selectedOpt = prodSelect.options[prodSelect.selectedIndex];
        if (!selectedOpt || !selectedOpt.value) {
          varGroup.style.display = 'none';
          costInput.value = '0';
          updateLossPreview();
          return;
        }
        const prod = products.find(p => String(p.id) === String(selectedOpt.value));
        if (prod) {
          populateVariations(prod);
          if (prod.variations && prod.variations.length > 0) {
            costInput.value = prod.variations[0].costPrice || prod.costPrice || 0;
          } else {
            costInput.value = prod.costPrice || 0;
          }
        } else {
          costInput.value = selectedOpt.dataset.cost || 0;
        }
        updateLossPreview();
      };

      varSelect.onchange = () => {
        const opt = varSelect.options[varSelect.selectedIndex];
        if (opt && opt.dataset.cost) {
          costInput.value = opt.dataset.cost;
        }
        updateLossPreview();
      };

      qtyInput.oninput = updateLossPreview;
      costInput.oninput = updateLossPreview;

      // If editing, initialize variations
      if (isEdit && item.productId) {
        const currentProd = products.find(p => String(p.id) === String(item.productId));
        if (currentProd) {
          populateVariations(currentProd, item.variationName);
        }
      }
      updateLossPreview();

      const closeModal = () => {
        overlay.classList.remove('active');
        overlay.innerHTML = '';
      };

      document.getElementById('btn-close-dp-modal').onclick = closeModal;
      document.getElementById('btn-cancel-dp').onclick = closeModal;

      document.getElementById('form-damaged-product').onsubmit = async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('btn-save-dp');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span>Saving...</span>';

        try {
          const selectedOpt = prodSelect.options[prodSelect.selectedIndex];
          const prodId = prodSelect.value;
          const prodName = selectedOpt ? selectedOpt.dataset.name : '';
          const varName = varGroup.style.display !== 'none' ? varSelect.value : '';
          const quantity = parseFloat(qtyInput.value) || 0;
          const unitCost = parseFloat(costInput.value) || 0;
          const damageType = document.getElementById('dp-select-type').value;
          const date = document.getElementById('dp-input-date').value;
          const staffName = document.getElementById('dp-input-staff').value.trim();
          const note = document.getElementById('dp-input-note').value.trim();

          if (!prodName) {
            throw new Error('Please select a product');
          }
          if (quantity <= 0) {
            throw new Error('Quantity must be greater than 0');
          }

          const payload = {
            productId: prodId,
            productName: prodName,
            variationName: varName,
            quantity,
            unitCost,
            damageType,
            date,
            staffName,
            note
          };

          const url = isEdit ? `/api/damaged-products/${item.id}` : '/api/damaged-products';
          const method = isEdit ? 'PUT' : 'POST';

          const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Failed to save damaged product');
          }

          H.showToast(isEdit ? 'Damaged record updated successfully' : 'Damaged product recorded successfully', 'success');
          closeModal();

          const from = localStorage.getItem('dp_from') || H.today();
          const to = localStorage.getItem('dp_to') || H.today();
          await this.loadData(from, to);
        } catch (err) {
          H.showToast(err.message, 'error');
          saveBtn.disabled = false;
          saveBtn.innerHTML = `<span>${isEdit ? 'Update Record' : 'Save Damaged Record'}</span>`;
        }
      };
    }
  };

  window.POS = window.POS || {};
  window.POS.DamagedProducts = DamagedProducts;
})();
