(function () {
  'use strict';

  const CustomItemPrice = {
    customItems: [],
    selectedIds: new Set(),
    filterStatus: 'all', // 'all', 'pending', 'completed'
    searchQuery: '',

    async render() {
      const mc = document.getElementById('main-content');
      const H = POS.Helpers;

      this.selectedIds.clear();
      this.searchQuery = '';
      this.filterStatus = 'all';

      mc.innerHTML = `
        <div class="page-header fade-in" style="margin-bottom: 20px;">
          <div>
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
              <h2 class="page-title" style="margin:0; font-size:22px; font-weight:800; color:#0f172a;">Custom Item Cost Price</h2>
              <span class="badge" style="background:#ede9fe; color:#5b21b6; font-weight:700; border:1px solid #c4b5fd; font-size:11px; padding:3px 10px; border-radius:20px; display:inline-flex; align-items:center; gap:6px;">
                <span style="width:7px; height:7px; background:#7c3aed; border-radius:50%; display:inline-block;"></span>
                Order-Specific Cost Allocation
              </span>
            </div>
            <p class="page-subtitle" style="margin-top:4px; font-size:13px; color:#64748b;">
              Set and update cost prices for custom products per order to accurately calculate gross profit and margins in reports.
            </p>
          </div>
          <div class="page-actions" style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm" id="btn-refresh-custom-items" title="Reload list" style="display:inline-flex; align-items:center; gap:6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              <span>Refresh</span>
            </button>
            <button class="btn btn-primary btn-sm" id="btn-bulk-save-all" style="display:inline-flex; align-items:center; gap:6px; font-weight:700;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              <span>Bulk Save All Cost Prices</span>
            </button>
          </div>
        </div>

        <!-- Filter & Search Bar -->
        <div class="filter-bar fade-in" style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:12px 16px; margin-bottom:20px; display:flex; gap:12px; align-items:center; justify-content:space-between; flex-wrap:wrap; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
          <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:280px; flex-wrap:wrap;">
            <div style="position:relative; flex:1; min-width:220px; max-width:400px;">
              <input type="text" id="custom-items-search" class="form-input" placeholder="Search Invoice ID, Product Name, Customer..." style="padding-left:34px; font-size:13px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" style="position:absolute; left:11px; top:50%; transform:translateY(-50%); pointer-events:none;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <div style="display:flex; gap:6px; align-items:center;">
              <button class="btn btn-secondary btn-sm filter-status-btn active" data-status="all" style="font-size:12px; font-weight:600;">All Items</button>
              <button class="btn btn-secondary btn-sm filter-status-btn" data-status="pending" style="font-size:12px; font-weight:600; color:#d97706;">Pending Cost (Blank)</button>
              <button class="btn btn-secondary btn-sm filter-status-btn" data-status="completed" style="font-size:12px; font-weight:600; color:#059669;">Cost Set</button>
            </div>
          </div>
          <div id="custom-items-count-badge" style="font-size:12px; color:#64748b; font-weight:600;">
            Loading custom items...
          </div>
        </div>

        <!-- Table Container -->
        <div class="card fade-in" style="border:1px solid #e2e8f0; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,0.04); background:#fff; overflow:hidden;">
          <div class="table-wrapper" style="border:none;">
            <table class="data-table" style="margin:0; font-size:13px;">
              <thead>
                <tr style="background:#f8fafc; border-bottom:1px solid #e2e8f0;">
                  <th style="width:40px; text-align:center;">
                    <input type="checkbox" id="chk-select-all-custom" style="cursor:pointer; width:15px; height:15px;">
                  </th>
                  <th style="font-weight:700; color:#334155; width:130px;">Invoice ID</th>
                  <th style="font-weight:700; color:#334155; width:135px;">Order Date</th>
                  <th style="font-weight:700; color:#334155; width:160px;">Customer</th>
                  <th style="font-weight:700; color:#334155;">Product Name</th>
                  <th style="font-weight:700; color:#334155; text-align:center; width:55px;">Qty</th>
                  <th style="font-weight:700; color:#334155; text-align:right; width:105px;">Unit Price</th>
                  <th style="font-weight:700; color:#334155; text-align:right; width:110px;">Total Sales</th>
                  <th style="font-weight:700; color:#4338ca; text-align:center; width:140px;">Cost Price (৳)</th>
                  <th style="font-weight:700; color:#334155; text-align:center; width:130px;">Est. Profit</th>
                  <th style="font-weight:700; color:#334155; text-align:center; width:110px;">Action</th>
                </tr>
              </thead>
              <tbody id="custom-items-tbody">
                <tr>
                  <td colspan="11" style="text-align:center; padding:40px; color:#64748b;">
                    <div class="spinner" style="margin:0 auto 10px;"></div>
                    Loading custom items...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Floating Bulk Action Bar -->
        <div id="bulk-custom-action-bar" style="display:none; position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:#0f172a; color:#fff; padding:12px 22px; border-radius:30px; box-shadow:0 12px 30px rgba(0,0,0,0.3); z-index:1000; align-items:center; gap:16px; flex-wrap:wrap; font-size:13px; border:1px solid #334155;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span id="bulk-selected-count" style="font-weight:800; color:#38bdf8; font-size:15px;">0</span>
            <span style="color:#e2e8f0;">items selected</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <label style="font-size:12px; color:#cbd5e1; font-weight:600;">Set Cost Price (৳):</label>
            <input type="number" id="bulk-apply-cost-val" placeholder="0.00" step="0.01" min="0" style="width:105px; padding:6px 10px; font-size:13px; font-weight:700; background:#1e293b; color:#fff; border:1px solid #475569; border-radius:6px; text-align:right;">
            <button class="btn btn-primary btn-sm" id="btn-apply-bulk-cost" style="padding:6px 14px; font-weight:700; background:#6366f1; border:none;">Apply to Selected</button>
          </div>
          <button id="btn-cancel-bulk-selection" style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:12px; text-decoration:underline;">Cancel</button>
        </div>
      `;

      this.bindEvents();
      await this.loadItems();
    },

    bindEvents() {
      const H = POS.Helpers;

      document.getElementById('btn-refresh-custom-items').onclick = () => this.loadItems();

      document.getElementById('custom-items-search').oninput = (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderTable();
      };

      document.querySelectorAll('.filter-status-btn').forEach(btn => {
        btn.onclick = (e) => {
          document.querySelectorAll('.filter-status-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.filterStatus = btn.dataset.status;
          this.renderTable();
        };
      });

      const selectAll = document.getElementById('chk-select-all-custom');
      selectAll.onchange = (e) => {
        const checked = e.target.checked;
        const visibleItems = this.getFilteredItems();
        if (checked) {
          visibleItems.forEach(item => this.selectedIds.add(item.id));
        } else {
          this.selectedIds.clear();
        }
        this.updateSelectionUI();
      };

      document.getElementById('btn-bulk-save-all').onclick = () => this.bulkSaveAll();

      document.getElementById('btn-apply-bulk-cost').onclick = () => this.applyBulkToSelected();
      document.getElementById('btn-cancel-bulk-selection').onclick = () => {
        this.selectedIds.clear();
        const selectAll = document.getElementById('chk-select-all-custom');
        if (selectAll) selectAll.checked = false;
        this.updateSelectionUI();
      };
    },

    async loadItems() {
      const H = POS.Helpers;
      try {
        const res = await fetch('/api/custom-order-items', {
          headers: POS.Store.getHeaders()
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.customItems = await res.json();
        this.renderTable();
      } catch (err) {
        console.error('Error fetching custom items:', err);
        const tbody = document.getElementById('custom-items-tbody');
        if (tbody) {
          tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:30px; color:#dc2626;">Failed to load custom items: ${H.esc(err.message)}</td></tr>`;
        }
      }
    },

    getFilteredItems() {
      return this.customItems.filter(item => {
        // Status filter
        const cost = parseFloat(item.costPrice) || 0;
        if (this.filterStatus === 'pending' && cost > 0.001) return false;
        if (this.filterStatus === 'completed' && cost <= 0.001) return false;

        // Search query
        if (this.searchQuery) {
          const q = this.searchQuery;
          const inv = (item.invoiceId || '').toLowerCase();
          const prod = (item.productName || '').toLowerCase();
          const cust = (item.customerName || '').toLowerCase();
          const phone = (item.customerPhone || '').toLowerCase();
          if (!inv.includes(q) && !prod.includes(q) && !cust.includes(q) && !phone.includes(q)) {
            return false;
          }
        }
        return true;
      });
    },

    renderTable() {
      const H = POS.Helpers;
      const tbody = document.getElementById('custom-items-tbody');
      const countBadge = document.getElementById('custom-items-count-badge');
      if (!tbody) return;

      const filtered = this.getFilteredItems();

      if (countBadge) {
        const unsetCount = this.customItems.filter(i => (parseFloat(i.costPrice) || 0) <= 0.001).length;
        countBadge.innerHTML = `Showing <strong>${filtered.length}</strong> of <strong>${this.customItems.length}</strong> custom line items ${unsetCount > 0 ? `• <span style="color:#d97706;">${unsetCount} pending cost</span>` : '• <span style="color:#059669;">All costs set</span>'}`;
      }

      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="11" style="text-align:center; padding:50px 20px; color:#64748b;">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" style="margin:0 auto 10px; display:block;"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              <div style="font-size:15px; font-weight:700; color:#334155; margin-bottom:4px;">No custom products found</div>
              <p style="font-size:12px; color:#94a3b8; max-width:380px; margin:0 auto;">
                ${this.customItems.length === 0 ? 'When custom products are added to an order, they will appear in this list so you can record their cost price.' : 'No items match your active search or filter criteria.'}
              </p>
            </td>
          </tr>
        `;
        this.updateSelectionUI();
        return;
      }

      tbody.innerHTML = filtered.map(item => {
        const isChecked = this.selectedIds.has(item.id);
        const costVal = parseFloat(item.costPrice) || 0;
        const displayCost = costVal > 0.001 ? costVal.toFixed(2) : '';
        const unitPrice = parseFloat(item.unitPrice) || 0;
        const totalSales = parseFloat(item.total) || (unitPrice * (item.qty || 1));
        const dateStr = item.orderDate ? POS.Helpers.formatDate(item.orderDate) : '-';

        return `
          <tr data-item-id="${item.id}" style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s;" class="custom-item-row ${isChecked ? 'selected-row' : ''}">
            <td style="text-align:center;">
              <input type="checkbox" class="chk-item-custom" data-id="${item.id}" ${isChecked ? 'checked' : ''} style="cursor:pointer; width:15px; height:15px;">
            </td>
            <td>
              <span style="font-family:monospace; font-weight:700; font-size:12px; color:#4338ca; background:#e0e7ff; padding:3px 7px; border-radius:4px;">
                ${H.esc(item.invoiceId || '#' + (item.orderId ? item.orderId.slice(0, 6) : ''))}
              </span>
            </td>
            <td style="color:#64748b; font-size:12px;">${dateStr}</td>
            <td>
              <div style="font-weight:600; color:#1e293b;">${H.esc(item.customerName || 'Walk-in Customer')}</div>
              ${item.customerPhone ? `<div style="font-size:11px; color:#94a3b8;">${H.esc(item.customerPhone)}</div>` : ''}
            </td>
            <td>
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-weight:600; color:#0f172a;">${H.esc(item.productName || 'Custom Item')}</span>
                <span class="badge" style="background:#f1f5f9; color:#475569; font-size:9px; padding:1px 5px; border-radius:4px; font-weight:700;">CUSTOM</span>
              </div>
            </td>
            <td style="text-align:center; font-weight:700; color:#334155;">${item.qty}</td>
            <td style="text-align:right; font-weight:600; color:#0f172a;">${H.formatCurrency(unitPrice)}</td>
            <td style="text-align:right; font-weight:700; color:#059669;">${H.formatCurrency(totalSales)}</td>
            <td style="text-align:center;">
              <div style="display:inline-flex; align-items:center; gap:6px;">
                <input 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  class="form-input custom-cost-input" 
                  data-item-id="${item.id}" 
                  value="${displayCost}" 
                  placeholder="0.00" 
                  style="width:105px; padding:5px 8px; font-size:13px; font-weight:700; text-align:right; border:1.5px solid ${costVal > 0 ? '#10b981' : '#cbd5e1'}; border-radius:6px; background:${costVal > 0 ? '#f0fdf4' : '#fff'};">
              </div>
            </td>
            <td style="text-align:center;" class="profit-calc-cell" data-item-id="${item.id}">
              ${this.renderProfitSnippet(unitPrice, costVal, item.qty)}
            </td>
            <td style="text-align:center;">
              <button class="btn btn-primary btn-sm btn-update-cost" data-item-id="${item.id}" style="padding:5px 12px; font-size:11px; font-weight:700; min-width:64px;">
                Update
              </button>
            </td>
          </tr>
        `;
      }).join('');

      this.bindRowEvents();
      this.updateSelectionUI();
    },

    renderProfitSnippet(unitPrice, costPrice, qty = 1) {
      const H = POS.Helpers;
      if (!costPrice || costPrice <= 0) {
        return `<span style="font-size:11px; color:#94a3b8; font-style:italic;">Pending cost</span>`;
      }
      const unitProfit = unitPrice - costPrice;
      const totalProfit = unitProfit * qty;
      const margin = unitPrice > 0 ? ((unitProfit / unitPrice) * 100).toFixed(1) : 0;
      const isPositive = unitProfit >= 0;

      return `
        <div style="font-size:12px; font-weight:700; color:${isPositive ? '#059669' : '#dc2626'};">
          ${H.formatCurrency(totalProfit)}
        </div>
        <div style="font-size:10px; font-weight:600; color:${isPositive ? '#16a34a' : '#ef4444'};">
          Margin: ${margin}%
        </div>
      `;
    },

    bindRowEvents() {
      const H = POS.Helpers;

      // Checkbox toggles
      document.querySelectorAll('.chk-item-custom').forEach(chk => {
        chk.onchange = (e) => {
          const id = chk.dataset.id;
          if (chk.checked) {
            this.selectedIds.add(id);
          } else {
            this.selectedIds.delete(id);
          }
          this.updateSelectionUI();
        };
      });

      // Live profit calculation as user types in cost input
      document.querySelectorAll('.custom-cost-input').forEach(input => {
        input.oninput = () => {
          const id = input.dataset.itemId;
          const item = this.customItems.find(i => i.id === id);
          if (!item) return;

          const numCost = parseFloat(input.value) || 0;
          const profitCell = document.querySelector(`.profit-calc-cell[data-item-id="${id}"]`);
          if (profitCell) {
            profitCell.innerHTML = this.renderProfitSnippet(parseFloat(item.unitPrice) || 0, numCost, item.qty);
          }

          if (numCost > 0) {
            input.style.border = '1.5px solid #10b981';
            input.style.background = '#f0fdf4';
          } else {
            input.style.border = '1.5px solid #cbd5e1';
            input.style.background = '#fff';
          }
        };

        input.onkeydown = (e) => {
          if (e.key === 'Enter') {
            const btn = document.querySelector(`.btn-update-cost[data-item-id="${input.dataset.itemId}"]`);
            if (btn) btn.click();
          }
        };
      });

      // Single Update button clicks
      document.querySelectorAll('.btn-update-cost').forEach(btn => {
        btn.onclick = async () => {
          const id = btn.dataset.itemId;
          const input = document.querySelector(`.custom-cost-input[data-item-id="${id}"]`);
          if (!input) return;

          const costPrice = parseFloat(input.value) || 0;
          btn.classList.add('disabled');
          btn.textContent = 'Saving...';

          try {
            const res = await fetch(`/api/order-items/${id}/cost-price`, {
              method: 'PUT',
              headers: POS.Store.getHeaders(),
              body: JSON.stringify({ costPrice })
            });

            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || 'Update failed');
            }

            // Update in local array
            const target = this.customItems.find(i => i.id === id);
            if (target) target.costPrice = costPrice;

            btn.textContent = '✓ Saved';
            btn.style.background = '#10b981';
            H.showToast(`Cost price updated to ${H.formatCurrency(costPrice)}`, 'success');

            setTimeout(() => {
              btn.textContent = 'Update';
              btn.style.background = '';
              btn.classList.remove('disabled');
            }, 2000);
          } catch (err) {
            btn.textContent = 'Update';
            btn.classList.remove('disabled');
            H.showToast('Failed to update cost price: ' + err.message, 'error');
          }
        };
      });
    },

    updateSelectionUI() {
      const bar = document.getElementById('bulk-custom-action-bar');
      const counter = document.getElementById('bulk-selected-count');
      const count = this.selectedIds.size;

      if (counter) counter.textContent = count;
      if (bar) {
        bar.style.display = count > 0 ? 'flex' : 'none';
      }

      // Highlight rows
      document.querySelectorAll('.custom-item-row').forEach(row => {
        const id = row.dataset.itemId;
        if (this.selectedIds.has(id)) {
          row.style.background = '#f5f3ff';
        } else {
          row.style.background = '';
        }
      });
    },

    async bulkSaveAll() {
      const H = POS.Helpers;
      const inputs = document.querySelectorAll('.custom-cost-input');
      const itemsToUpdate = [];

      inputs.forEach(inp => {
        const id = inp.dataset.itemId;
        const val = inp.value.trim();
        const costPrice = parseFloat(val) || 0;
        itemsToUpdate.push({ id, costPrice });
      });

      if (itemsToUpdate.length === 0) {
        H.showToast('No items to save.', 'info');
        return;
      }

      const btn = document.getElementById('btn-bulk-save-all');
      btn.classList.add('disabled');
      btn.style.opacity = '0.7';

      try {
        const res = await fetch('/api/order-items/bulk-cost-price', {
          method: 'POST',
          headers: POS.Store.getHeaders(),
          body: JSON.stringify({ items: itemsToUpdate })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Bulk update failed');
        }

        const data = await res.json();
        H.showToast(`Successfully saved cost prices for ${data.updatedCount || itemsToUpdate.length} custom products!`, 'success');

        // Reload data to show updated state
        await this.loadItems();
      } catch (err) {
        H.showToast('Bulk update failed: ' + err.message, 'error');
      } finally {
        btn.classList.remove('disabled');
        btn.style.opacity = '1';
      }
    },

    async applyBulkToSelected() {
      const H = POS.Helpers;
      const input = document.getElementById('bulk-apply-cost-val');
      const costPrice = parseFloat(input ? input.value : 0) || 0;

      if (this.selectedIds.size === 0) {
        H.showToast('No items selected.', 'warning');
        return;
      }

      const itemsToUpdate = Array.from(this.selectedIds).map(id => ({
        id,
        costPrice
      }));

      const btn = document.getElementById('btn-apply-bulk-cost');
      btn.classList.add('disabled');

      try {
        const res = await fetch('/api/order-items/bulk-cost-price', {
          method: 'POST',
          headers: POS.Store.getHeaders(),
          body: JSON.stringify({ items: itemsToUpdate })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Bulk update failed');
        }

        H.showToast(`Applied ${H.formatCurrency(costPrice)} cost price to ${itemsToUpdate.length} selected items!`, 'success');
        this.selectedIds.clear();
        if (input) input.value = '';
        await this.loadItems();
      } catch (err) {
        H.showToast('Failed to apply bulk cost price: ' + err.message, 'error');
      } finally {
        btn.classList.remove('disabled');
      }
    }
  };

  window.POS = window.POS || {};
  window.POS.CustomItemPrice = CustomItemPrice;
})();