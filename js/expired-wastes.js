(function () {
  'use strict';

  const ExpiredWastes = {
    currentList: [],

    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;
      const user = S.getCurrentUser();

      const today = H.today();
      let fromDate = localStorage.getItem('ew_from') || '';
      let toDate = localStorage.getItem('ew_to') || '';

      mc.innerHTML = `
        <!-- Top Bar: Date Range Filter + Action Buttons (Name Card Removed) -->
        <div class="filter-bar fade-in" style="display:flex; flex-direction:column; gap:12px; background:#fff; padding:14px 18px; border-radius:12px; border:1px solid #EAE4D9; margin-bottom:16px;">
          <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span style="font-size:12px; font-weight:800; color:#64748B; text-transform:uppercase; letter-spacing:0.5px;">Filter:</span>
              <div class="btn-group" style="display:flex; gap:6px; background:#F8FAFC; padding:4px; border-radius:10px; border:1px solid #E2E8F0;">
                <button type="button" class="btn btn-sm ew-period-btn active" data-period="today" style="border-radius:7px; font-weight:700; padding:5px 12px; font-size:12px;">Today</button>
                <button type="button" class="btn btn-sm ew-period-btn" data-period="yesterday" style="border-radius:7px; font-weight:700; padding:5px 12px; font-size:12px;">Yesterday</button>
                <button type="button" class="btn btn-sm ew-period-btn" data-period="this_week" style="border-radius:7px; font-weight:700; padding:5px 12px; font-size:12px;">This Week</button>
                <button type="button" class="btn btn-sm ew-period-btn" data-period="this_month" style="border-radius:7px; font-weight:700; padding:5px 12px; font-size:12px;">This Month</button>
                <button type="button" class="btn btn-sm ew-period-btn" data-period="custom" style="border-radius:7px; font-weight:700; padding:5px 12px; font-size:12px;">Custom</button>
              </div>
              <div id="ew-date-indicator" style="display:inline-flex; align-items:center; gap:6px; background:#FEF2F2; border:1px solid #FECACA; border-radius:8px; padding:4px 10px; font-size:12px; font-weight:700; color:#B91C1C;">
                <span>📅 Filtered:</span>
                <span id="ew-active-date-text">Today (${H.formatDate(today)})</span>
              </div>
            </div>

            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; flex:1; justify-content:flex-end;">
              <div style="width:130px;">
                <select class="form-select" id="ew-filter-status" style="height:36px; font-size:12.5px;">
                  <option value="">All Statuses</option>
                  <option value="Paid">Paid (Recovered)</option>
                  <option value="Partial">Partial</option>
                  <option value="Unpaid">Unpaid (Loss)</option>
                </select>
              </div>
              <div style="flex:1; min-width:160px; max-width:240px;">
                <input type="text" class="form-input" id="ew-search" placeholder="Search item, supplier, reason..." style="height:36px; font-size:12.5px;">
              </div>
              <button class="btn btn-primary btn-sm" id="btn-add-expired-waste" style="background:#EF4444; border-color:#EF4444; height:36px; padding:0 14px; font-weight:700; white-space:nowrap;">
                + Record Expired / Waste
              </button>
            </div>
          </div>

          <!-- Date inputs row for Custom -->
          <div id="ew-custom-date-box" style="display:none; align-items:center; gap:10px; flex-wrap:wrap; border-top:1px dashed #E2E8F0; padding-top:10px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <label class="form-label" style="margin:0; font-size:12px; font-weight:700; color:#64748B;">From:</label>
              <input type="date" class="form-input" id="ew-filter-from" value="${fromDate}" style="height:32px; font-size:12px; width:135px;">
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <label class="form-label" style="margin:0; font-size:12px; font-weight:700; color:#64748B;">To:</label>
              <input type="date" class="form-input" id="ew-filter-to" value="${toDate}" style="height:32px; font-size:12px; width:135px;">
            </div>
            <button type="button" class="btn btn-primary btn-sm" id="btn-filter-ew" style="height:32px; padding:0 14px; font-size:12px; font-weight:700;">Apply Range</button>
          </div>
        </div>

        <div class="stats-grid fade-in mb-2" style="grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; margin-bottom: 20px;">
          <div class="stat-card" style="padding: 16px; border-left: 4px solid #EF4444;">
            <div class="stat-icon" style="background:#FEE2E2; color:#EF4444;">💸</div>
            <div class="stat-info">
              <div class="stat-label">Total Expired Cost</div>
              <div class="stat-value" id="stats-ew-total-cost" style="color:#EF4444;">৳0.00</div>
              <div class="stat-sub" style="font-size:11.5px; color:#64748b; margin-top:2px;">Gross value of discarded stock</div>
            </div>
          </div>
          <div class="stat-card" style="padding: 16px; border-left: 4px solid #10B981;">
            <div class="stat-icon" style="background:#ECFDF5; color:#10B981;">🛡️</div>
            <div class="stat-info">
              <div class="stat-label">Supplier Compensation</div>
              <div class="stat-value" id="stats-ew-comp" style="color:#10B981;">৳0.00</div>
              <div class="stat-sub" style="font-size:11.5px; color:#64748b; margin-top:2px;">Credits / refunds recovered</div>
            </div>
          </div>
          <div class="stat-card" style="padding: 16px; border-left: 4px solid #F59E0B;">
            <div class="stat-icon" style="background:#FEF3C7; color:#F59E0B;">📉</div>
            <div class="stat-info">
              <div class="stat-label">Net Financial Loss</div>
              <div class="stat-value" id="stats-ew-net-loss" style="color:#B45309;">৳0.00</div>
              <div class="stat-sub" style="font-size:11.5px; color:#64748b; margin-top:2px;">Cost minus compensation</div>
            </div>
          </div>
          <div class="stat-card" style="padding: 16px; border-left: 4px solid #6366F1;">
            <div class="stat-icon" style="background:#EEF2FF; color:#6366F1;">📦</div>
            <div class="stat-info">
              <div class="stat-label">Total Incidents</div>
              <div class="stat-value" id="stats-ew-count" style="color:#4F46E5;">0</div>
              <div class="stat-sub" style="font-size:11.5px; color:#64748b; margin-top:2px;">Logged waste occurrences</div>
            </div>
          </div>
        </div>

        <div class="card fade-in">
          <div class="card-body" style="padding:0;">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width: 110px;">Date</th>
                    <th>Item Name</th>
                    <th class="text-center" style="width: 80px;">Quantity</th>
                    <th class="text-right" style="width: 100px;">Cost Price</th>
                    <th class="text-right" style="width: 120px;">Total Cost</th>
                    <th>Supplier Name</th>
                    <th class="text-right" style="width: 120px;">Compensation</th>
                    <th class="text-right" style="width: 120px;">Net Loss</th>
                    <th>Payment Status</th>
                    <th>Note / Reason</th>
                    <th style="width: 110px; text-align: center;">Actions</th>
                  </tr>
                </thead>
                <tbody id="ew-tbody">
                  <tr>
                    <td colspan="10" class="text-center text-muted" style="padding:24px;">Loading expired & waste records...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      document.getElementById('btn-add-expired-waste').onclick = () => this.showModal(null);

      const customBox = document.getElementById('ew-custom-date-box');
      const fromInput = document.getElementById('ew-filter-from');
      const toInput = document.getElementById('ew-filter-to');

      const getEwPeriodRange = (period) => {
        const today = H.today();
        if (period === 'today') return { from: today, to: today };
        if (period === 'yesterday') {
          const y = H.yesterday();
          return { from: y, to: y };
        }
        if (period === 'this_week') {
          const p = H.getBDDateParts();
          const d = new Date(Date.UTC(p.year, p.month - 1, p.day));
          const dayOfWeek = d.getUTCDay();
          return { from: H.addDays(today, -dayOfWeek), to: today };
        }
        if (period === 'this_month') {
          const p = H.getBDDateParts();
          const pad = n => String(n).padStart(2, '0');
          return { from: `${p.year}-${pad(p.month)}-01`, to: today };
        }
        return { from: today, to: today };
      };

      const updateEwDateIndicator = (from, to, period) => {
        const dateEl = document.getElementById('ew-active-date-text');
        if (!dateEl) return;
        if (period === 'today') dateEl.textContent = `Today (${H.formatDate(from)})`;
        else if (period === 'yesterday') dateEl.textContent = `Yesterday (${H.formatDate(from)})`;
        else if (period === 'this_week') dateEl.textContent = `This Week (${H.formatDate(from)} to ${H.formatDate(to)})`;
        else if (period === 'this_month') dateEl.textContent = `This Month (${H.formatDate(from)} to ${H.formatDate(to)})`;
        else dateEl.textContent = `${H.formatDate(from)} to ${H.formatDate(to)}`;
      };

      document.querySelectorAll('.ew-period-btn').forEach(btn => {
        btn.onclick = async () => {
          document.querySelectorAll('.ew-period-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const p = btn.dataset.period;
          if (p === 'custom') {
            customBox.style.display = 'flex';
          } else {
            customBox.style.display = 'none';
            const range = getEwPeriodRange(p);
            fromDate = range.from;
            toDate = range.to;
            fromInput.value = fromDate;
            toInput.value = toDate;
            localStorage.setItem('ew_from', fromDate);
            localStorage.setItem('ew_to', toDate);
            updateEwDateIndicator(fromDate, toDate, p);
            await this.updateList(fromDate, toDate);
          }
        };
      });

      document.getElementById('btn-filter-ew').onclick = async () => {
        fromDate = fromInput.value;
        toDate = toInput.value;
        localStorage.setItem('ew_from', fromDate);
        localStorage.setItem('ew_to', toDate);
        updateEwDateIndicator(fromDate, toDate, 'custom');
        await this.updateList(fromDate, toDate);
      };

      document.getElementById('ew-search').addEventListener('input', () => {
        this.filterTableLocally();
      });

      const ewStatusSelect = document.getElementById('ew-filter-status');
      if (ewStatusSelect) {
        ewStatusSelect.addEventListener('change', () => {
          this.filterTableLocally();
        });
      }

      await this.updateList(fromDate, toDate);
    },

    async updateList(from, to) {
      const H = POS.Helpers;
      const totalCostEl = document.getElementById('stats-ew-total-cost');
      const compEl = document.getElementById('stats-ew-comp');
      const netLossEl = document.getElementById('stats-ew-net-loss');
      const countEl = document.getElementById('stats-ew-count');

      try {
        const res = await fetch('/api/expired-wastes');
        const allList = res.ok ? await res.json() : [];
        const list = (from || to) ? allList.filter(e => H.isDateInRange(e.date, from, to)) : allList;
        this.currentList = list;

        let sumCost = 0;
        let sumComp = 0;

        list.forEach(e => {
          const cost = parseFloat(e.totalCost) || 0;
          const comp = parseFloat(e.compensationAmount) || 0;
          sumCost += cost;
          sumComp += comp;
        });

        const netLoss = Math.max(0, sumCost - sumComp);
        if (totalCostEl) totalCostEl.textContent = H.formatCurrency(sumCost);
        if (compEl) compEl.textContent = H.formatCurrency(sumComp);
        if (netLossEl) netLossEl.textContent = H.formatCurrency(netLoss);
        if (countEl) countEl.textContent = list.length;

        this.filterTableLocally();
      } catch (err) {
        console.error('Error fetching expired & waste records:', err);
      }
    },

    filterTableLocally() {
      const H = POS.Helpers;
      const tbody = document.getElementById('ew-tbody');
      if (!tbody) return;

      const q = (document.getElementById('ew-search')?.value || '').toLowerCase().trim();
      const statusVal = document.getElementById('ew-filter-status')?.value || '';

      const list = this.currentList.filter(e => {
        const qty = parseFloat(e.quantity) || 0;
        const costPrice = parseFloat(e.costPrice) || 0;
        const totalCost = parseFloat(e.totalCost) || (qty * costPrice);
        const comp = parseFloat(e.compensationAmount) || 0;
        const isPaid = (e.status === 'Paid') || (comp >= totalCost && totalCost > 0);
        const isPartial = (e.status === 'Partial') || (comp > 0 && !isPaid);
        const isUnpaid = (e.status === 'Unpaid') || (!isPaid && !isPartial);

        if (statusVal === 'Paid' && !isPaid) return false;
        if (statusVal === 'Partial' && !isPartial) return false;
        if (statusVal === 'Unpaid' && !isUnpaid) return false;

        if (!q) return true;
        const iMatch = (e.itemName || '').toLowerCase().includes(q);
        const sMatch = (e.supplierName || '').toLowerCase().includes(q);
        const nMatch = (e.note || '').toLowerCase().includes(q);
        return iMatch || sMatch || nMatch;
      });

      if (list.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="11" class="text-center text-muted" style="padding:28px;">
              No expired or waste records found matching the criteria.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = list.map(item => {
        const qty = parseFloat(item.quantity) || 0;
        const costPrice = parseFloat(item.costPrice) || 0;
        const totalCost = parseFloat(item.totalCost) || (qty * costPrice);
        const comp = parseFloat(item.compensationAmount) || 0;
        const netLoss = Math.max(0, totalCost - comp);
        const dateStr = item.date ? item.date.slice(0, 10) : '';

        const isPaid = (item.status === 'Paid') || (comp >= totalCost && totalCost > 0);
        const isPartial = (item.status === 'Partial') || (comp > 0 && !isPaid);
        let statusBadge = `<span class="badge" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; font-size:10.5px;">Unpaid</span>`;
        if (isPaid) {
          statusBadge = `<span class="badge" style="background:#ecfdf5; color:#059669; border:1px solid #a7f3d0; font-size:10.5px;">Paid</span>`;
        } else if (isPartial) {
          statusBadge = `<span class="badge" style="background:#fef3c7; color:#d97706; border:1px solid #fcd34d; font-size:10.5px;">Partial</span>`;
        }

        return `
          <tr>
            <td>
              <strong>${dateStr}</strong>
              <div style="font-size:10px; color:#64748b;">${item.date ? item.date.slice(11, 16) : ''}</div>
            </td>
            <td>
              <strong style="color:#0f172a; font-size:13.5px;">${H.escapeHtml(item.itemName)}</strong>
            </td>
            <td class="text-center">
              <span class="badge" style="background:#f1f5f9; color:#0f172a; font-weight:700;">${qty}</span>
            </td>
            <td class="text-right">${H.formatCurrency(costPrice)}</td>
            <td class="text-right" style="font-weight:700; color:#ef4444;">${H.formatCurrency(totalCost)}</td>
            <td>${item.supplierName ? H.escapeHtml(item.supplierName) : '<span style="color:#94a3b8;">—</span>'}</td>
            <td class="text-right" style="color:#10b981; font-weight:600;">
              ${comp > 0 ? '+' + H.formatCurrency(comp) : '৳0.00'}
            </td>
            <td class="text-right" style="font-weight:800; color:#b45309;">
              ${H.formatCurrency(netLoss)}
            </td>
            <td>${statusBadge}</td>
            <td style="max-width:200px; font-size:12px; color:#475569;">
              ${item.note ? H.escapeHtml(item.note) : '<span style="color:#cbd5e1;">None</span>'}
            </td>
            <td style="text-align:center;">
              <button class="btn btn-secondary btn-xs btn-edit-ew" data-id="${item.id}" title="Edit Record">✏️</button>
              <button class="btn btn-secondary btn-xs btn-del-ew" data-id="${item.id}" style="color:#ef4444;" title="Delete Record">🗑️</button>
            </td>
          </tr>
        `;
      }).join('');

      // Wire action buttons
      tbody.querySelectorAll('.btn-edit-ew').forEach(btn => {
        btn.onclick = () => {
          const item = this.currentList.find(e => e.id === btn.dataset.id);
          if (item) this.showModal(item);
        };
      });

      tbody.querySelectorAll('.btn-del-ew').forEach(btn => {
        btn.onclick = async () => {
          if (!confirm('Are you sure you want to delete this expired/waste record?')) return;
          try {
            const res = await fetch(`/api/expired-wastes/${btn.dataset.id}`, { 
              method: 'DELETE',
              headers: S.getHeaders()
            });
            if (res.ok) {
              H.showToast('Expired/waste record deleted');
              const from = document.getElementById('ew-filter-from').value;
              const to = document.getElementById('ew-filter-to').value;
              await this.updateList(from, to);
            } else {
              H.showToast('Failed to delete record', 'error');
            }
          } catch (err) {
            H.showToast('Error: ' + err.message, 'error');
          }
        };
      });
    },

    async showModal(item = null) {
      const H = POS.Helpers;
      const S = POS.Store;
      const isEdit = !!item;

      // Fetch existing suppliers for autocomplete
      let supplierOptions = '';
      try {
        const suppliers = await S.getAll('suppliers');
        supplierOptions = (suppliers || []).map(s => `<option value="${H.escapeHtml(s.name || s.supplier_name || '')}">`).join('');
      } catch (e) {}

      // Fetch products/items
      let products = [];
      try {
        products = (await S.getAll('products')) || [];
      } catch (e) {}

      // Fetch ingredient costs for raw material autocomplete suggestions
      let rawMaterialOptions = '';
      try {
        const ingRes = await fetch('/api/ingredient-costs', { headers: S.getHeaders() });
        if (ingRes.ok) {
          const ings = await ingRes.json();
          const uniqueNames = [...new Set((ings || []).map(i => i.name || i.reason).filter(Boolean))];
          rawMaterialOptions = uniqueNames.map(r => `<option value="${H.escapeHtml(r)}">`).join('');
        }
      } catch (e) {}

      const initQty = item ? item.quantity : 1;
      const initCost = item ? item.costPrice : 0;
      const initTotal = item ? item.totalCost : 0;
      const initComp = item ? item.compensationAmount : 0;
      const initDate = item && item.date ? item.date.slice(0, 10) : H.today();

      // Determine initial values for Food Item vs Raw Material
      let initFoodItem = '';
      let initRawMaterial = '';
      if (item && item.itemName) {
        const cleanName = item.itemName.trim();
        const matchedProduct = products.find(p => p.name && p.name.trim().toLowerCase() === cleanName.toLowerCase());
        if (matchedProduct) {
          initFoodItem = matchedProduct.name;
        } else {
          initRawMaterial = cleanName;
        }
      }

      const modalHtml = `
        <div class="modal" id="modal-expired-waste" style="max-width:540px;">
          <div class="modal-header" style="background:#FEF2F2; border-bottom:1px solid #FEE2E2;">
            <h3 class="modal-title" style="color:#991B1B;">
              ${isEdit ? '✏️ Edit Expired / Waste Item' : '🗑️ Record Expired or Waste Item'}
            </h3>
            <button class="modal-close" id="btn-close-ew-modal">&times;</button>
          </div>
          <form id="form-expired-waste" style="display:flex; flex-direction:column; gap:14px; padding:20px;">
            
            <!-- Food Item Option -->
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label" style="font-weight:700; display:flex; justify-content:space-between; align-items:center;">
                <span>🍽️ Food Item (Menu Product)</span>
                <span style="font-size:11px; font-weight:600; color:#64748B;">Option 1</span>
              </label>
              <select class="form-select" id="ew-modal-food-item">
                <option value="">-- Select Food Item from Menu --</option>
                ${products.map(p => {
                  const pCost = parseFloat(p.costPrice) || parseFloat(p.sellingPrice) || 0;
                  const isSel = initFoodItem && initFoodItem.toLowerCase() === (p.name || '').trim().toLowerCase();
                  return `<option value="${H.escapeHtml(p.name)}" data-cost="${pCost}" ${isSel ? 'selected' : ''}>${H.escapeHtml(p.name)} (৳${pCost.toFixed(2)})</option>`;
                }).join('')}
              </select>
            </div>

            <div style="display:flex; align-items:center; gap:10px; margin: -2px 0;">
              <div style="flex:1; border-top:1px dashed #CBD5E1;"></div>
              <span style="font-size:11px; font-weight:800; color:#94A3B8; text-transform:uppercase; letter-spacing:0.5px;">OR</span>
              <div style="flex:1; border-top:1px dashed #CBD5E1;"></div>
            </div>

            <!-- Raw Material / Ingredient Option -->
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label" style="font-weight:700; display:flex; justify-content:space-between; align-items:center;">
                <span>🥩 Raw Material / Ingredient (Type Manually)</span>
                <span style="font-size:11px; font-weight:600; color:#64748B;">Option 2</span>
              </label>
              <input type="text" class="form-input" id="ew-modal-raw-material" list="ew-raw-material-suggestions" placeholder="e.g. Cooking Oil, Raw Chicken, Beef Patty, Milk, Flour..." value="${H.escapeHtml(initRawMaterial)}">
              <datalist id="ew-raw-material-suggestions">
                ${rawMaterialOptions}
                <option value="Cooking Oil">
                <option value="Raw Chicken Breast">
                <option value="Minced Beef">
                <option value="Flour Dough">
                <option value="Mozzarella Cheese">
                <option value="Fresh Milk">
                <option value="Burger Buns">
                <option value="Lettuce / Tomato">
                <option value="Mayonnaise / Sauce">
                <option value="Coffee Beans">
                <option value="Spices / Seasoning">
              </datalist>
              <div style="font-size:11px; color:#64748B; margin-top:3px;">
                💡 You can select a food item <strong>or</strong> type any raw material name manually. Either one is accepted!
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label" style="font-weight:700;">Quantity <span style="color:#ef4444;">*</span></label>
                <input type="number" step="0.01" min="0.01" class="form-input" id="ew-modal-qty" value="${initQty}" required>
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label" style="font-weight:700;">Cost Price (৳) <span style="color:#ef4444;">*</span></label>
                <input type="number" step="0.01" min="0" class="form-input" id="ew-modal-cost-price" value="${initCost}" placeholder="0.00" required>
              </div>
            </div>

            <!-- Auto Calculated Total Expired Cost -->
            <div style="background:#FFF5F5; border:1px solid #FED7D7; border-radius:var(--radius-sm); padding:12px 14px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div style="font-size:11px; font-weight:800; color:#C53030; text-transform:uppercase; letter-spacing:0.5px;">Auto-Calculated Total Expired Cost</div>
                <div style="font-size:12px; color:#742A2A;">Quantity &times; Unit Cost Price</div>
              </div>
              <div id="ew-modal-total-display" style="font-size:22px; font-weight:900; color:#E53E3E;">
                ৳${parseFloat(initTotal).toFixed(2)}
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1.2fr 0.8fr; gap:12px;">
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Supplier Name</label>
                <input type="text" class="form-input" id="ew-modal-supplier" list="ew-supplier-suggestions" placeholder="e.g. Agrani Dairy Supply" value="${item ? H.escapeHtml(item.supplierName || '') : ''}">
                <datalist id="ew-supplier-suggestions">${supplierOptions}</datalist>
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Compensation (৳)</label>
                <input type="number" step="0.01" min="0" class="form-input" id="ew-modal-comp" placeholder="0.00" value="${initComp}">
              </div>
            </div>

            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label">Incident / Log Date</label>
              <input type="date" class="form-input" id="ew-modal-date" value="${initDate}">
            </div>

            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label">Note / Waste Reason</label>
              <textarea class="form-input" id="ew-modal-note" rows="2" placeholder="e.g. Expired past shelf date, packaging damaged upon delivery, burned during kitchen prep">${item && item.note ? H.escapeHtml(item.note) : ''}</textarea>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:8px;">
              <button type="button" class="btn btn-secondary" id="btn-cancel-ew-modal">Cancel</button>
              <button type="submit" class="btn btn-primary" id="btn-save-ew" style="background:#EF4444; border-color:#EF4444; font-weight:700;">
                ${isEdit ? 'Update Record' : 'Save Record'}
              </button>
            </div>

          </form>
        </div>
      `;

      H.showModal(modalHtml);

      const foodSelect = document.getElementById('ew-modal-food-item');
      const rawInput = document.getElementById('ew-modal-raw-material');
      const qtyInput = document.getElementById('ew-modal-qty');
      const costInput = document.getElementById('ew-modal-cost-price');
      const totalDisplay = document.getElementById('ew-modal-total-display');

      const recalcTotal = () => {
        const q = parseFloat(qtyInput.value) || 0;
        const c = parseFloat(costInput.value) || 0;
        const tot = q * c;
        if (totalDisplay) totalDisplay.textContent = '৳' + tot.toFixed(2);
      };

      qtyInput.oninput = recalcTotal;
      costInput.oninput = recalcTotal;

      foodSelect.onchange = () => {
        if (foodSelect.value) {
          rawInput.value = '';
          const opt = foodSelect.selectedOptions[0];
          const cost = opt ? parseFloat(opt.dataset.cost) : 0;
          if (cost > 0 && (!parseFloat(costInput.value) || parseFloat(costInput.value) === 0)) {
            costInput.value = cost;
            recalcTotal();
          }
        }
      };

      rawInput.oninput = () => {
        if (rawInput.value.trim()) {
          foodSelect.value = '';
        }
      };

      document.getElementById('btn-close-ew-modal').onclick = () => H.hideModal();
      document.getElementById('btn-cancel-ew-modal').onclick = () => H.hideModal();

      document.getElementById('form-expired-waste').onsubmit = async (e) => {
        e.preventDefault();
        const foodItem = foodSelect.value.trim();
        const rawMaterial = rawInput.value.trim();
        const itemName = rawMaterial || foodItem;
        const quantity = parseFloat(qtyInput.value) || 0;
        const costPrice = parseFloat(costInput.value) || 0;
        const totalCost = quantity * costPrice;
        const supplierName = document.getElementById('ew-modal-supplier').value.trim();
        const compensationAmount = parseFloat(document.getElementById('ew-modal-comp').value) || 0;
        const date = document.getElementById('ew-modal-date').value || H.today();
        const note = document.getElementById('ew-modal-note').value.trim();

        if (!itemName) {
          H.showToast('Please select a food item or type a raw material name', 'error');
          return;
        }

        const saveBtn = document.getElementById('btn-save-ew');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const payload = {
          itemName,
          quantity,
          costPrice,
          totalCost,
          supplierName,
          compensationAmount,
          note,
          date
        };

        try {
          const url = isEdit ? `/api/expired-wastes/${item.id}` : '/api/expired-wastes';
          const method = isEdit ? 'PUT' : 'POST';
          const res = await fetch(url, {
            method,
            headers: S.getHeaders(),
            body: JSON.stringify(payload)
          });

          if (res.ok) {
            H.showToast(isEdit ? 'Expired/waste record updated' : 'Expired/waste record added successfully');
            H.hideModal();
            const from = document.getElementById('ew-filter-from').value;
            const to = document.getElementById('ew-filter-to').value;
            await this.updateList(from, to);
          } else {
            const errData = await res.json();
            H.showToast(errData.error || 'Failed to save record', 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = isEdit ? 'Update Record' : 'Save Record';
          }
        } catch (err) {
          H.showToast('Error: ' + err.message, 'error');
          saveBtn.disabled = false;
          saveBtn.textContent = isEdit ? 'Update Record' : 'Save Record';
        }
      };
    }
  };

  window.POS = window.POS || {};
  window.POS.ExpiredWastes = ExpiredWastes;
})();
