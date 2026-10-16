(function () {
  'use strict';

  const Suppliers = {
    currentList: [],

    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;
      const user = S.getCurrentUser();

      const today = H.today();
      let fromDate = localStorage.getItem('sp_from') || today;
      let toDate = localStorage.getItem('sp_to') || today;

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <div style="display:flex; align-items:center; gap:10px;">
              <h2 class="page-title" style="margin:0;">🏢 Suppliers Payment Records</h2>
              <span class="badge" style="background:#ecfdf5; color:#059669; border:1px solid #a7f3d0; font-weight:700;">Suppliers Ledger</span>
            </div>
            <p class="page-subtitle" style="margin-top:4px;">Record supplier vouchers, reconcile procurement dues, and track payment receipts.</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary btn-sm" id="btn-add-supplier-payment">+ Add Supplier Payment</button>
          </div>
        </div>

        <div class="filter-bar fade-in">
          <div class="form-group" style="margin-bottom:0; flex: 1; min-width: 140px;">
            <label class="form-label">From Date</label>
            <input type="date" class="form-input" id="sp-from" value="${fromDate}">
          </div>
          <div class="form-group" style="margin-bottom:0; flex: 1; min-width: 140px;">
            <label class="form-label">To Date</label>
            <input type="date" class="form-input" id="sp-to" value="${toDate}">
          </div>
          <div class="form-group" style="margin-bottom:0; flex: 1; min-width: 130px;">
            <label class="form-label">Status</label>
            <select class="form-select" id="sp-filter-status">
              <option value="">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
              <option value="Unpaid">Unpaid</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0; flex: 1.5; min-width: 160px;">
            <label class="form-label">Search</label>
            <input type="text" class="form-input" id="sp-search" placeholder="Supplier / Reason...">
          </div>
          <button class="btn btn-primary" id="btn-filter-sp" style="margin-top: 18px;">Apply Filter</button>
        </div>

        <div class="stats-grid fade-in mb-2" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">
          <div class="stat-card purple" style="padding: 16px; border-left: 4px solid #7c3aed;">
            <div class="stat-icon">🏢</div>
            <div class="stat-info">
              <div class="stat-label">Total Supplier Records</div>
              <div class="stat-value" id="stats-sp-total">৳0.00</div>
              <div class="stat-sub" id="stats-sp-count">0 record(s)</div>
            </div>
          </div>
          <div class="stat-card green" style="padding: 16px; border-left: 4px solid #10b981;">
            <div class="stat-icon">✅</div>
            <div class="stat-info">
              <div class="stat-label">Total Paid Amount</div>
              <div class="stat-value" style="color:#059669;" id="stats-sp-paid">৳0.00</div>
              <div class="stat-sub">Settled payments</div>
            </div>
          </div>
          <div class="stat-card orange" style="padding: 16px; border-left: 4px solid #ef4444;">
            <div class="stat-icon">⚠️</div>
            <div class="stat-info">
              <div class="stat-label">Total Unpaid / Due</div>
              <div class="stat-value" style="color:#dc2626;" id="stats-sp-due">৳0.00</div>
              <div class="stat-sub">Outstanding balance</div>
            </div>
          </div>
        </div>

        <div class="card fade-in">
          <div class="card-body">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width: 50px; text-align: center;">Image</th>
                    <th>Supplier Name</th>
                    <th>Reason</th>
                    <th>Amount</th>
                    <th>Paid Amount</th>
                    <th>Due Amount</th>
                    <th>Payment Status</th>
                    <th>Date & Time</th>
                    <th>Payment Date</th>
                    <th style="width: 140px; text-align: center;">Actions</th>
                  </tr>
                </thead>
                <tbody id="sp-tbody">
                  <tr>
                    <td colspan="10" class="text-center text-muted">Loading supplier payment records...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      document.getElementById('btn-add-supplier-payment').onclick = () => this.showSupplierModal(null);

      document.getElementById('btn-filter-sp').onclick = async () => {
        fromDate = document.getElementById('sp-from').value;
        toDate = document.getElementById('sp-to').value;
        localStorage.setItem('sp_from', fromDate);
        localStorage.setItem('sp_to', toDate);
        await this.updateList(fromDate, toDate);
      };

      document.getElementById('sp-search').addEventListener('input', () => this.filterTableLocally());
      document.getElementById('sp-filter-status').addEventListener('change', () => this.filterTableLocally());

      await this.updateList(fromDate, toDate);
    },

    async updateList(from, to) {
      const S = POS.Store;
      const H = POS.Helpers;

      const list = await S.query('supplier-payments', r => H.isDateInRange(r.date, from, to));
      this.currentList = list;

      let sumTotal = 0;
      let sumPaid = 0;

      list.forEach(r => {
        const amt = parseFloat(r.amount) || 0;
        const paid = parseFloat(r.paid_amount) || (r.status === 'Paid' ? amt : 0);
        sumTotal += amt;
        sumPaid += paid;
      });

      const sumDue = Math.max(0, sumTotal - sumPaid);

      const totalEl = document.getElementById('stats-sp-total');
      const paidEl = document.getElementById('stats-sp-paid');
      const dueEl = document.getElementById('stats-sp-due');
      const countEl = document.getElementById('stats-sp-count');

      if (totalEl) totalEl.textContent = H.formatCurrency(sumTotal);
      if (paidEl) paidEl.textContent = H.formatCurrency(sumPaid);
      if (dueEl) dueEl.textContent = H.formatCurrency(sumDue);
      if (countEl) countEl.textContent = `${list.length} record(s)`;

      this.filterTableLocally();
    },

    filterTableLocally() {
      const S = POS.Store;
      const H = POS.Helpers;
      const tbody = document.getElementById('sp-tbody');
      if (!tbody) return;
      const user = S.getCurrentUser();

      const searchVal = (document.getElementById('sp-search')?.value || '').toLowerCase().trim();
      const statusFilter = document.getElementById('sp-filter-status')?.value || '';

      const filtered = this.currentList.filter(r => {
        if (statusFilter && r.status !== statusFilter) return false;
        if (!searchVal) return true;
        const sup = (r.supplier_name || '').toLowerCase();
        const reason = (r.reason || '').toLowerCase();
        const note = (r.note || '').toLowerCase();
        return sup.includes(searchVal) || reason.includes(searchVal) || note.includes(searchVal);
      });

      tbody.innerHTML = '';

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted">No supplier payment records found.</td></tr>`;
        return;
      }

      filtered.forEach(r => {
        const amt = parseFloat(r.amount) || 0;
        const paid = parseFloat(r.paid_amount) || (r.status === 'Paid' ? amt : 0);
        const due = Math.max(0, amt - paid);

        const imgHtml = r.image
          ? `<img src="${r.image}" style="width:36px; height:36px; border-radius:6px; object-fit:cover; border: 1px solid var(--border); cursor:pointer;" onclick="POS.Helpers.previewImage('${H.esc(r.image)}', '${H.esc(r.supplier_name)} - ${H.esc(r.reason)}')" alt="${H.esc(r.supplier_name)}">`
          : `<div style="width:36px; height:36px; border-radius:6px; background:var(--bg); border: 1px dashed var(--border); display:flex; align-items:center; justify-content:center; font-size:16px;">🏢</div>`;

        let statusBadge = `<span class="badge badge-success">Paid</span>`;
        if (r.status === 'Unpaid') {
          statusBadge = `<span class="badge badge-danger" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5;">Unpaid</span>`;
        } else if (r.status === 'Partial') {
          statusBadge = `<span class="badge badge-warning" style="background:#fef3c7; color:#d97706; border:1px solid #fcd34d;">Partial</span>`;
        }

        const paymentDateText = r.payment_date ? H.formatDate(r.payment_date) : '<span class="text-muted">—</span>';

        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="text-center">${imgHtml}</td>
          <td style="font-weight:700; color:var(--text-dark);">${H.esc(r.supplier_name)}</td>
          <td style="font-weight:600; color:var(--text-dark);">${H.esc(r.reason)}</td>
          <td style="font-weight:700; color:#1e293b;">${H.formatCurrency(amt)}</td>
          <td style="font-weight:700; color:var(--success);">${H.formatCurrency(paid)}</td>
          <td style="font-weight:700; color:${due > 0 ? 'var(--danger)' : 'var(--text-muted)'};">${H.formatCurrency(due)}</td>
          <td>${statusBadge}</td>
          <td style="font-size:12px;">${H.formatDateTime(r.date)}</td>
          <td style="font-size:12px;">${paymentDateText}</td>
          <td class="text-center" style="white-space:nowrap;">
            ${user && (user.role === 'admin' || user.role === 'manager') ? `
              <button class="btn btn-secondary btn-xs btn-edit-sp" data-id="${H.esc(r.id)}" style="margin-right:4px;">✏️ Edit</button>
              <button class="btn btn-danger btn-xs btn-delete-sp" data-id="${H.esc(r.id)}">🗑️ Delete</button>
            ` : '<span class="text-muted" style="font-size:11px;">Restricted</span>'}
          </td>
        `;

        tbody.appendChild(row);

        const editBtn = row.querySelector('.btn-edit-sp');
        if (editBtn) {
          editBtn.onclick = () => this.showSupplierModal(r);
        }

        const delBtn = row.querySelector('.btn-delete-sp');
        if (delBtn) {
          delBtn.onclick = async () => {
            if (await H.confirm(`Are you sure you want to delete payment record for "${r.supplier_name}" (${r.reason}) of ${H.formatCurrency(amt)}?`)) {
              const ok = await S.delete('supplier-payments', r.id);
              if (ok) {
                H.showToast('Supplier payment record deleted');
                const from = document.getElementById('sp-from').value;
                const to = document.getElementById('sp-to').value;
                await this.updateList(from, to);
              }
            }
          };
        }
      });
    },

    async showSupplierModal(paymentToEdit = null) {
      const S = POS.Store;
      const H = POS.Helpers;
      const modalOverlay = document.getElementById('global-modal-overlay');
      if (!modalOverlay) return;

      const isEdit = !!paymentToEdit;

      const defaultDateTime = H.nowBDDateTimeLocalInput();

      let initialDateTime = defaultDateTime;
      let initialPaymentDate = '';
      let initialImage = '';

      if (isEdit) {
        if (paymentToEdit.date) {
          const p = H.getBDDateParts(paymentToEdit.date);
          const pad = n => String(n).padStart(2, '0');
          initialDateTime = `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
        }
        if (paymentToEdit.payment_date) {
          initialPaymentDate = paymentToEdit.payment_date.slice(0, 10);
        }
        initialImage = paymentToEdit.image || '';
      }

      let imageBase64 = initialImage;

      const defaultAmount = isEdit ? (paymentToEdit.amount || '') : '';
      const defaultPaid = isEdit ? (paymentToEdit.paid_amount !== undefined ? paymentToEdit.paid_amount : (paymentToEdit.status === 'Paid' ? paymentToEdit.amount : 0)) : '';
      const defaultStatus = isEdit ? (paymentToEdit.status || 'Paid') : 'Paid';

      modalOverlay.innerHTML = `
        <div class="modal animate" style="max-width: 500px;">
          <div class="modal-header">
            <h3>${isEdit ? '✏️ Edit Supplier Payment' : '🏢 Add Supplier Payment'}</h3>
            <button class="modal-close" id="modal-close-sp">&times;</button>
          </div>
          <div class="modal-body" style="max-height: 520px; overflow-y: auto; padding-right: 6px;">
            <div class="form-group mb-2">
              <label class="form-label">Supplier Name <span style="color:var(--danger);">*</span></label>
              <input type="text" class="form-input" id="modal-sp-name" placeholder="e.g. Apex Footwear, Beximco, Dhaka Distribution" value="${H.esc(paymentToEdit?.supplier_name || '')}" required>
            </div>

            <div class="form-group mb-2">
              <label class="form-label">Reason <span style="color:var(--danger);">*</span></label>
              <input type="text" class="form-input" id="modal-sp-reason" placeholder="e.g. Summer Batch Delivery, Leather Material Invoice #882" value="${H.esc(paymentToEdit?.reason || '')}" required>
            </div>

            <div class="grid-3 gap-2 mb-2" style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Amount (৳) <span style="color:var(--danger);">*</span></label>
                <input type="number" class="form-input" id="modal-sp-amount" placeholder="0.00" min="0.01" step="0.01" value="${defaultAmount}" required>
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Paid Amount (৳)</label>
                <input type="number" class="form-input" id="modal-sp-paid" placeholder="0.00" min="0" step="0.01" value="${defaultPaid}">
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Payment Status</label>
                <select class="form-select" id="modal-sp-status">
                  <option value="Paid" ${defaultStatus === 'Paid' ? 'selected' : ''}>Paid</option>
                  <option value="Unpaid" ${defaultStatus === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
                  <option value="Partial" ${defaultStatus === 'Partial' ? 'selected' : ''}>Partial</option>
                </select>
              </div>
            </div>

            <div class="grid-2 gap-2 mb-2" style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Date & Time <span style="color:var(--danger);">*</span></label>
                <input type="datetime-local" class="form-input" id="modal-sp-datetime" value="${initialDateTime}" required>
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Payment Date</label>
                <input type="date" class="form-input" id="modal-sp-payment-date" value="${initialPaymentDate}">
              </div>
            </div>

            <div class="form-group mb-2">
              <label class="form-label">Receipt Image</label>
              <div style="display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                  <button type="button" class="btn btn-secondary btn-sm" id="btn-pick-gallery-sp" style="font-weight:600; display:flex; align-items:center; gap:6px;">
                    🖼️ Choose from Gallery
                  </button>
                  <span style="font-size:12px; color:#64748b;">or</span>
                  <label class="btn btn-secondary btn-sm" style="margin:0; cursor:pointer; font-weight:600; display:flex; align-items:center; gap:6px;">
                    💻 Upload from Device
                    <input type="file" id="modal-sp-file" accept="image/*" style="display:none;">
                  </label>
                </div>
                <div id="modal-sp-preview-wrapper" style="position:relative; display:${imageBase64 ? 'inline-block' : 'none'}; width:fit-content;">
                  <img id="modal-sp-preview" src="${imageBase64}" style="max-width:100%; max-height:130px; border-radius:6px; object-fit:contain; border:1px solid var(--border); background:#fafafa; display:block;">
                  <button type="button" id="btn-remove-sp-img" style="position:absolute; top:4px; right:4px; background:rgba(220,38,38,0.85); color:#fff; border:none; border-radius:50%; width:22px; height:22px; cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:center;">&times;</button>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Note / Description</label>
              <textarea class="form-input" id="modal-sp-note" placeholder="Optional notes, PO number, cheque details..." rows="2" style="resize:vertical;">${H.esc(paymentToEdit?.note || '')}</textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="btn-sp-cancel">Cancel</button>
            <button class="btn btn-primary" id="btn-sp-save">${isEdit ? 'Update Record' : 'Save Record'}</button>
          </div>
        </div>
      `;

      modalOverlay.classList.add('active');

      const close = () => modalOverlay.classList.remove('active');
      modalOverlay.querySelector('#modal-close-sp').onclick = close;
      modalOverlay.querySelector('#btn-sp-cancel').onclick = close;

      const amtInput = modalOverlay.querySelector('#modal-sp-amount');
      const paidInput = modalOverlay.querySelector('#modal-sp-paid');
      const statusSelect = modalOverlay.querySelector('#modal-sp-status');
      const paymentDateInput = modalOverlay.querySelector('#modal-sp-payment-date');

      // Status change logic
      statusSelect.onchange = () => {
        const st = statusSelect.value;
        const total = parseFloat(amtInput.value) || 0;
        if (st === 'Paid') {
          paidInput.value = total > 0 ? total : '';
          if (!paymentDateInput.value) paymentDateInput.value = H.today();
        } else if (st === 'Unpaid') {
          paidInput.value = 0;
        }
      };

      // Paid Amount change logic
      paidInput.oninput = () => {
        const total = parseFloat(amtInput.value) || 0;
        const paid = parseFloat(paidInput.value) || 0;
        if (paid >= total && total > 0) {
          statusSelect.value = 'Paid';
        } else if (paid <= 0) {
          statusSelect.value = 'Unpaid';
        } else {
          statusSelect.value = 'Partial';
        }
      };

      amtInput.oninput = () => {
        if (statusSelect.value === 'Paid') {
          paidInput.value = amtInput.value;
        }
      };

      // Image upload handling
      const fileInput = modalOverlay.querySelector('#modal-sp-file');
      const imgPreview = modalOverlay.querySelector('#modal-sp-preview');
      const imgWrapper = modalOverlay.querySelector('#modal-sp-preview-wrapper');
      const btnRemoveImg = modalOverlay.querySelector('#btn-remove-sp-img');
      const btnPickGallery = modalOverlay.querySelector('#btn-pick-gallery-sp');

      if (btnPickGallery) {
        btnPickGallery.onclick = () => {
          H.openMediaPicker({
            title: 'Choose Receipt Image from Gallery',
            onSelect: (url) => {
              imageBase64 = url;
              imgPreview.src = url;
              imgWrapper.style.display = 'inline-block';
            }
          });
        };
      }

      if (btnRemoveImg) {
        btnRemoveImg.onclick = () => {
          imageBase64 = '';
          imgPreview.src = '';
          imgWrapper.style.display = 'none';
          fileInput.value = '';
        };
      }

      fileInput.onchange = (ev) => {
        const file = ev.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (re) => {
            imageBase64 = re.target.result;
            imgPreview.src = imageBase64;
            imgWrapper.style.display = 'inline-block';
          };
          reader.readAsDataURL(file);
        }
      };

      modalOverlay.querySelector('#btn-sp-save').onclick = async () => {
        const supplierName = document.getElementById('modal-sp-name').value.trim();
        const reason = document.getElementById('modal-sp-reason').value.trim();
        const amount = parseFloat(document.getElementById('modal-sp-amount').value) || 0;
        let paidAmount = parseFloat(document.getElementById('modal-sp-paid').value);
        if (isNaN(paidAmount)) {
          paidAmount = statusSelect.value === 'Paid' ? amount : 0;
        }
        const status = document.getElementById('modal-sp-status').value;
        const dateInput = document.getElementById('modal-sp-datetime').value;
        const paymentDate = document.getElementById('modal-sp-payment-date').value || null;
        const note = document.getElementById('modal-sp-note').value.trim();

        if (!supplierName || !reason || amount <= 0) {
          H.showToast('Please enter Supplier Name, Reason, and Amount greater than 0.', 'error');
          return;
        }

        let date = '';
        if (dateInput) {
          date = dateInput.replace('T', ' ');
          if (date.length === 16) date += ':00';
        } else {
          date = H.nowBDDateTime();
        }

        const payload = {
          supplier_name: supplierName,
          reason,
          amount,
          paid_amount: paidAmount,
          date,
          payment_date: paymentDate,
          status,
          image: imageBase64,
          note
        };

        if (isEdit) {
          const ok = await S.update('supplier-payments', paymentToEdit.id, payload);
          if (ok) {
            H.showToast('Supplier payment record updated!');
            close();
            const from = document.getElementById('sp-from').value;
            const to = document.getElementById('sp-to').value;
            await this.updateList(from, to);
          }
        } else {
          payload.id = 'sp_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
          const res = await S.add('supplier-payments', payload);
          if (res) {
            H.showToast('Supplier payment recorded successfully!');
            close();
            const from = document.getElementById('sp-from').value;
            const to = document.getElementById('sp-to').value;
            await this.updateList(from, to);
          }
        }
      };
    }
  };

  window.POS = window.POS || {};
  window.POS.Suppliers = Suppliers;
})();
