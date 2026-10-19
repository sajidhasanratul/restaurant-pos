(function () {
  'use strict';

  const Tables = {
    tablesList: [],

    async render() {
      const mc = document.getElementById('main-content');
      const H = POS.Helpers;
      const S = POS.Store;
      const user = S.getCurrentUser();

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <h2 class="page-title" style="display:flex; align-items:center; gap:10px;">
              <span>🍽️</span> Available Tables Management
            </h2>
            <p class="page-subtitle">Configure restaurant dining tables, floor zones, seating capacity, and real-time availability for POS ordering.</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary" id="btn-add-table" style="background:#10B981; border-color:#10B981; font-weight:700;">
              + Add New Table
            </button>
          </div>
        </div>

        <!-- Stats Bar -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap:14px; margin-bottom:18px;" class="fade-in">
          <div class="card" style="padding:16px 20px; border-left:4px solid var(--primary);">
            <div style="font-size:11px; font-weight:800; color:#64748B; text-transform:uppercase; letter-spacing:0.5px;">Total Tables</div>
            <div id="stat-total-tables" style="font-size:26px; font-weight:900; color:#0F172A; margin-top:4px;">--</div>
          </div>
          <div class="card" style="padding:16px 20px; border-left:4px solid #10B981;">
            <div style="font-size:11px; font-weight:800; color:#64748B; text-transform:uppercase; letter-spacing:0.5px;">Active Tables</div>
            <div id="stat-active-tables" style="font-size:26px; font-weight:900; color:#10B981; margin-top:4px;">--</div>
          </div>
          <div class="card" style="padding:16px 20px; border-left:4px solid #F59E0B;">
            <div style="font-size:11px; font-weight:800; color:#64748B; text-transform:uppercase; letter-spacing:0.5px;">Total Seating Capacity</div>
            <div id="stat-total-seats" style="font-size:26px; font-weight:900; color:#F59E0B; margin-top:4px;">--</div>
          </div>
          <div class="card" style="padding:16px 20px; border-left:4px solid #6366F1;">
            <div style="font-size:11px; font-weight:800; color:#64748B; text-transform:uppercase; letter-spacing:0.5px;">Dining Zones</div>
            <div id="stat-total-zones" style="font-size:26px; font-weight:900; color:#6366F1; margin-top:4px;">--</div>
          </div>
        </div>

        <!-- Tables View Area -->
        <div id="tables-container" class="fade-in">
          <div style="text-align:center; padding:40px; color:#94A3B8;">Loading restaurant tables...</div>
        </div>
      `;

      document.getElementById('btn-add-table').onclick = () => this.showAddEditModal();
      await this.updateList();
    },

    async updateList() {
      const H = POS.Helpers;
      const S = POS.Store;
      const container = document.getElementById('tables-container');
      if (!container) return;

      try {
        const res = await fetch('/api/tables');
        this.tablesList = res.ok ? await res.json() : [];
      } catch (err) {
        console.error('Failed to load tables:', err);
        this.tablesList = [];
      }

      const list = this.tablesList;

      // Update KPIs
      const statTotal = document.getElementById('stat-total-tables');
      const statActive = document.getElementById('stat-active-tables');
      const statSeats = document.getElementById('stat-total-seats');
      const statZones = document.getElementById('stat-total-zones');

      const activeCount = list.filter(t => t.status === 'active').length;
      let totalSeatsCount = 0;
      const uniqueZones = new Set();

      list.forEach(t => {
        if (t.status === 'active') totalSeatsCount += (parseInt(t.seats) || 0);
        uniqueZones.add(t.zone || 'Main Dining');
      });

      if (statTotal) statTotal.textContent = `${list.length} Tables`;
      if (statActive) statActive.textContent = `${activeCount} Available`;
      if (statSeats) statSeats.textContent = `${totalSeatsCount} Guests`;
      if (statZones) statZones.textContent = `${uniqueZones.size} Zones`;

      if (list.length === 0) {
        container.innerHTML = `
          <div class="card" style="text-align:center; padding:60px 20px; color:#64748B;">
            <div style="font-size:44px; margin-bottom:12px;">🍽️</div>
            <h3 style="color:#1E293B; font-weight:800; font-size:18px;">No Dining Tables Configured</h3>
            <p style="font-size:13px; margin:6px 0 16px 0;">Add your restaurant tables so cashiers and servers can select them in New Order.</p>
            <button class="btn btn-primary" id="btn-empty-add-table" style="background:#10B981; border-color:#10B981;">+ Add First Table</button>
          </div>
        `;
        const emptyBtn = document.getElementById('btn-empty-add-table');
        if (emptyBtn) emptyBtn.onclick = () => this.showAddEditModal();
        return;
      }

      // Group by Zone
      const zones = {};
      list.forEach(t => {
        const z = t.zone || 'Main Dining';
        if (!zones[z]) zones[z] = [];
        zones[z].push(t);
      });

      let html = '';
      for (const [zoneName, tableGroup] of Object.entries(zones)) {
        html += `
          <div class="card mb-3" style="padding:18px 20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:1px solid #F1F5F9; padding-bottom:10px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:20px;">📍</span>
                <h3 style="font-size:16px; font-weight:800; color:#1E293B; margin:0;">${H.esc(zoneName)}</h3>
                <span class="badge" style="background:#F1F5F9; color:#475569; border:1px solid #E2E8F0; font-weight:700;">${tableGroup.length} tables</span>
              </div>
              <button class="btn btn-secondary btn-xs btn-add-to-zone" data-zone="${H.esc(zoneName)}">+ Add Table to ${H.esc(zoneName)}</button>
            </div>
            
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:12px;">
              ${tableGroup.map(t => {
                const isActive = t.status === 'active';
                return `
                  <div class="table-manage-card" data-id="${t.id}" style="border:1.5px solid ${isActive ? '#E2E8F0' : '#E2E8F0'}; border-radius:12px; padding:14px; background:${isActive ? '#fff' : '#F8FAFC'}; opacity:${isActive ? '1' : '0.65'}; display:flex; flex-direction:column; justify-content:space-between; gap:10px; transition:all 0.15s; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
                    <div>
                      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <span style="font-size:24px;">🪑</span>
                        <span class="badge" style="${isActive ? 'background:#ECFDF5; color:#059669; border:1px solid #A7F3D0;' : 'background:#F1F5F9; color:#94A3B8; border:1px solid #E2E8F0;'} font-size:10px; font-weight:800;">
                          ${isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div style="font-weight:900; font-size:15px; color:#1E293B; margin-top:6px;">${H.esc(t.name)}</div>
                      <div style="font-size:12px; font-weight:700; color:#64748B; margin-top:2px;">
                        👥 ${t.seats || 4} Seats
                      </div>
                    </div>

                    <div style="display:flex; gap:6px; border-top:1px dashed #E2E8F0; padding-top:8px; margin-top:4px;">
                      <button class="btn btn-secondary btn-xs btn-edit-table" data-id="${t.id}" style="flex:1; font-weight:700;">✏️ Edit</button>
                      <button class="btn btn-secondary btn-xs btn-del-table" data-id="${t.id}" style="color:#EF4444; border-color:#FEE2E2; background:#FEF2F2;" title="Delete">🗑️</button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }

      container.innerHTML = html;

      // Bind actions
      container.querySelectorAll('.btn-add-to-zone').forEach(btn => {
        btn.onclick = () => this.showAddEditModal(null, btn.dataset.zone);
      });

      container.querySelectorAll('.btn-edit-table').forEach(btn => {
        btn.onclick = () => {
          const t = list.find(it => it.id === btn.dataset.id);
          if (t) this.showAddEditModal(t);
        };
      });

      container.querySelectorAll('.btn-del-table').forEach(btn => {
        btn.onclick = async () => {
          const t = list.find(it => it.id === btn.dataset.id);
          if (t && await H.confirm(`Delete table "${t.name}"?`)) {
            const res = await fetch(`/api/tables/${t.id}`, { method: 'DELETE', headers: S.getHeaders() });
            if (res.ok) {
              H.showToast(`Deleted ${t.name}`);
              await this.updateList();
            } else {
              H.showToast('Failed to delete table', 'error');
            }
          }
        };
      });
    },

    showAddEditModal(tableToEdit = null, defaultZone = 'Main Dining') {
      const H = POS.Helpers;
      const S = POS.Store;
      const isEdit = !!tableToEdit;

      const modalHtml = `
        <div class="modal" id="modal-manage-table" style="max-width:440px;">
          <div class="modal-header">
            <h3>${isEdit ? '✏️ Edit Dining Table' : '🍽️ Add New Dining Table'}</h3>
            <button class="modal-close" id="btn-close-tbl-modal">&times;</button>
          </div>
          <div class="modal-body" style="padding:20px 24px; display:flex; flex-direction:column; gap:14px;">
            <div class="form-group mb-0">
              <label class="form-label" style="font-weight:700;">Table Name / Number <span class="text-danger">*</span></label>
              <input type="text" class="form-input" id="tbl-input-name" placeholder="e.g. Table 09, Patio 03, VIP Booth 1" value="${isEdit ? H.esc(tableToEdit.name) : ''}" required style="font-weight:700;">
            </div>

            <div class="form-group mb-0">
              <label class="form-label" style="font-weight:700;">Dining Zone / Floor Area</label>
              <input type="text" class="form-input" id="tbl-input-zone" list="dining-zones-list" placeholder="e.g. Main Dining, Outdoor Patio, VIP Lounge" value="${isEdit ? H.esc(tableToEdit.zone) : H.esc(defaultZone)}" style="font-weight:600;">
              <datalist id="dining-zones-list">
                <option value="Main Dining">
                <option value="Outdoor Patio">
                <option value="VIP Lounge">
                <option value="First Floor">
                <option value="Rooftop">
                <option value="Bar & High Tables">
              </datalist>
            </div>

            <div class="grid-2 gap-2 mb-0" style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
              <div class="form-group mb-0">
                <label class="form-label" style="font-weight:700;">Seating Capacity</label>
                <input type="number" min="1" max="50" class="form-input" id="tbl-input-seats" value="${isEdit ? (tableToEdit.seats || 4) : 4}" style="font-weight:700;">
              </div>
              <div class="form-group mb-0">
                <label class="form-label" style="font-weight:700;">Display Sort Order</label>
                <input type="number" min="1" max="999" class="form-input" id="tbl-input-sort" value="${isEdit ? (tableToEdit.sort_order || 1) : (this.tablesList.length + 1)}" style="font-weight:700;">
              </div>
            </div>

            <div class="form-group mb-0">
              <label class="form-label" style="font-weight:700;">Availability Status</label>
              <select class="form-select" id="tbl-input-status" style="font-weight:700;">
                <option value="active" ${(!isEdit || tableToEdit.status === 'active') ? 'selected' : ''}>Active / Available for POS</option>
                <option value="inactive" ${(isEdit && tableToEdit.status === 'inactive') ? 'selected' : ''}>Inactive / Out of Service</option>
              </select>
            </div>
          </div>
          <div class="modal-footer" style="padding:14px 24px;">
            <button class="btn btn-secondary" id="btn-cancel-tbl-modal">Cancel</button>
            <button class="btn btn-primary" id="btn-save-tbl-modal" style="background:#10B981; border-color:#10B981; font-weight:700;">
              ${isEdit ? 'Update Table' : 'Create Table'}
            </button>
          </div>
        </div>
      `;

      H.showModal(modalHtml);

      document.getElementById('btn-close-tbl-modal').onclick = () => H.hideModal();
      document.getElementById('btn-cancel-tbl-modal').onclick = () => H.hideModal();

      document.getElementById('btn-save-tbl-modal').onclick = async () => {
        const name = document.getElementById('tbl-input-name').value.trim();
        const zone = document.getElementById('tbl-input-zone').value.trim() || 'Main Dining';
        const seats = parseInt(document.getElementById('tbl-input-seats').value) || 4;
        const sort_order = parseInt(document.getElementById('tbl-input-sort').value) || 1;
        const status = document.getElementById('tbl-input-status').value;

        if (!name) {
          H.showToast('Please enter a table name', 'warning');
          return;
        }

        const payload = {
          name,
          zone,
          seats,
          sort_order,
          status
        };

        try {
          const url = isEdit ? `/api/tables/${tableToEdit.id}` : '/api/tables';
          const method = isEdit ? 'PUT' : 'POST';
          const res = await fetch(url, {
            method,
            headers: S.getHeaders(),
            body: JSON.stringify(payload)
          });

          if (res.ok) {
            H.showToast(isEdit ? `Updated ${name}` : `Created ${name}`, 'success');
            H.hideModal();
            await this.updateList();
          } else {
            const err = await res.json();
            H.showToast(err.error || 'Failed to save table', 'error');
          }
        } catch (err) {
          H.showToast(err.message, 'error');
        }
      };
    }
  };

  window.POS = window.POS || {};
  window.POS.Tables = Tables;
})();
