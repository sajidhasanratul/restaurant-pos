(function () {
  'use strict';

  const Expenses = {
    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;
      const user = S.getCurrentUser();

      const today = H.today();
      let fromDate = localStorage.getItem('exp_from') || today;
      let toDate = localStorage.getItem('exp_to') || today;

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <h2 class="page-title">💸 Expenses Management</h2>
            <p class="page-subtitle">Track operation fees, rent, payrolls, supplier bills, and payment records.</p>
          </div>
          <div class="page-actions">
            ${user && (user.role === 'admin' || user.role === 'manager') ? `
              <button class="btn btn-secondary btn-sm" id="btn-manage-categories" style="margin-right:8px;">📂 Manage Categories</button>
            ` : ''}
            <button class="btn btn-primary btn-sm" id="btn-add-expense">+ Add Expense</button>
          </div>
        </div>

        <div class="filter-bar fade-in">
          <div class="form-group" style="margin-bottom:0; flex: 1; min-width: 140px;">
            <label class="form-label">From Date</label>
            <input type="date" class="form-input" id="exp-from" value="${fromDate}">
          </div>
          <div class="form-group" style="margin-bottom:0; flex: 1; min-width: 140px;">
            <label class="form-label">To Date</label>
            <input type="date" class="form-input" id="exp-to" value="${toDate}">
          </div>
          <div class="form-group" style="margin-bottom:0; flex: 1.5; min-width: 160px;">
            <label class="form-label">Search</label>
            <input type="text" class="form-input" id="exp-search" placeholder="Supplier / Reason...">
          </div>
          <button class="btn btn-primary" id="btn-filter-expenses" style="margin-top: 18px;">Apply Filter</button>
        </div>

        <div class="stats-grid fade-in mb-2" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">
          <div class="stat-card red" style="padding: 18px;">
            <div class="stat-icon">💸</div>
            <div class="stat-info">
              <div class="stat-label">Total Expenses Amount</div>
              <div class="stat-value" id="stats-total-expenses">৳0.00</div>
              <div class="stat-sub" id="stats-expense-breakdown" style="font-size:12px; margin-top:4px;">
                Paid: <span style="font-weight:700; color:#10b981;" id="stats-paid-expenses">৳0.00</span> • 
                Unpaid: <span style="font-weight:700; color:#ef4444;" id="stats-unpaid-expenses">৳0.00</span>
              </div>
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
                    <th>Payment Status</th>
                    <th>Date & Time</th>
                    <th>Payment Date</th>
                    <th style="width: 140px; text-align: center;">Actions</th>
                  </tr>
                </thead>
                <tbody id="expenses-tbody">
                  <tr>
                    <td colspan="9" class="text-center text-muted">Loading expenses...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      document.getElementById('btn-add-expense').onclick = () => this.showExpenseModal(null);
      const manageBtn = document.getElementById('btn-manage-categories');
      if (manageBtn) {
        manageBtn.onclick = () => this.showCategoriesModal();
      }

      document.getElementById('btn-filter-expenses').onclick = async () => {
        fromDate = document.getElementById('exp-from').value;
        toDate = document.getElementById('exp-to').value;
        localStorage.setItem('exp_from', fromDate);
        localStorage.setItem('exp_to', toDate);
        await this.updateList(fromDate, toDate);
      };

      document.getElementById('exp-search').addEventListener('input', () => {
        this.filterTableLocally();
      });

      await this.updateList(fromDate, toDate);
    },

    currentExpensesList: [],

    async updateList(from, to) {
      const S = POS.Store;
      const H = POS.Helpers;
      const totalEl = document.getElementById('stats-total-expenses');
      const paidEl = document.getElementById('stats-paid-expenses');
      const unpaidEl = document.getElementById('stats-unpaid-expenses');

      const list = await S.query('expenses', e => H.isDateInRange(e.date, from, to));
      this.currentExpensesList = list;

      let sumAmount = 0;
      let sumPaid = 0;

      list.forEach(e => {
        const amt = parseFloat(e.amount) || 0;
        const paid = parseFloat(e.paid_amount) || (e.status === 'Paid' ? amt : 0);
        sumAmount += amt;
        sumPaid += paid;
      });

      const sumUnpaid = Math.max(0, sumAmount - sumPaid);
      if (totalEl) totalEl.textContent = H.formatCurrency(sumAmount);
      if (paidEl) paidEl.textContent = H.formatCurrency(sumPaid);
      if (unpaidEl) unpaidEl.textContent = H.formatCurrency(sumUnpaid);

      this.filterTableLocally();
    },

    filterTableLocally() {
      const S = POS.Store;
      const H = POS.Helpers;
      const tbody = document.getElementById('expenses-tbody');
      if (!tbody) return;
      const user = S.getCurrentUser();
      const searchVal = (document.getElementById('exp-search')?.value || '').toLowerCase().trim();

      const filtered = this.currentExpensesList.filter(e => {
        if (!searchVal) return true;
        const sup = (e.supplier_name || '').toLowerCase();
        const reason = (e.reason || e.name || '').toLowerCase();
        const note = (e.note || '').toLowerCase();
        return sup.includes(searchVal) || reason.includes(searchVal) || note.includes(searchVal);
      });

      tbody.innerHTML = '';

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">No expenses found.</td></tr>`;
        return;
      }

      filtered.forEach(e => {
        const amt = parseFloat(e.amount) || 0;
        const paid = parseFloat(e.paid_amount) || (e.status === 'Paid' ? amt : 0);
        const reasonText = e.reason || e.name || 'Expense';

        const imgHtml = e.image 
          ? `<img src="${e.image}" style="width:36px; height:36px; border-radius:6px; object-fit:cover; border: 1px solid var(--border); cursor:pointer;" onclick="POS.Helpers.previewImage('${H.esc(e.image)}', '${H.esc(reasonText)}')" alt="${H.esc(reasonText)}">`
          : `<div style="width:36px; height:36px; border-radius:6px; background:var(--bg); border: 1px dashed var(--border); display:flex; align-items:center; justify-content:center; font-size:16px;">💸</div>`;

        let statusBadge = `<span class="badge badge-success">Paid</span>`;
        if (e.status === 'Unpaid') {
          statusBadge = `<span class="badge badge-danger" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5;">Unpaid</span>`;
        } else if (e.status === 'Partial') {
          statusBadge = `<span class="badge badge-warning" style="background:#fef3c7; color:#d97706; border:1px solid #fcd34d;">Partial</span>`;
        }

        const paymentDateText = e.payment_date ? H.formatDate(e.payment_date) : '<span class="text-muted">—</span>';

        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="text-center">${imgHtml}</td>
          <td style="font-weight:600; color:var(--text-dark);">${H.esc(e.supplier_name || '—')}</td>
          <td style="font-weight:700; color:var(--text-dark);">${H.esc(reasonText)}</td>
          <td style="font-weight:700; color:var(--danger);">${H.formatCurrency(amt)}</td>
          <td style="font-weight:700; color:var(--success);">${H.formatCurrency(paid)}</td>
          <td>${statusBadge}</td>
          <td style="font-size:12px;">${H.formatDateTime(e.date)}</td>
          <td style="font-size:12px;">${paymentDateText}</td>
          <td class="text-center" style="white-space:nowrap;">
            ${user && (user.role === 'admin' || user.role === 'manager') ? `
              <button class="btn btn-secondary btn-xs btn-edit-expense" data-id="${H.esc(e.id)}" style="margin-right:4px;">✏️ Edit</button>
              <button class="btn btn-danger btn-xs btn-delete-expense" data-id="${H.esc(e.id)}">🗑️ Delete</button>
            ` : '<span class="text-muted" style="font-size:11px;">Restricted</span>'}
          </td>
        `;

        tbody.appendChild(row);

        const editBtn = row.querySelector('.btn-edit-expense');
        if (editBtn) {
          editBtn.onclick = () => this.showExpenseModal(e);
        }

        const delBtn = row.querySelector('.btn-delete-expense');
        if (delBtn) {
          delBtn.onclick = async () => {
            if (await H.confirm(`Are you sure you want to delete the expense "${reasonText}" of ${H.formatCurrency(amt)}?`)) {
              const ok = await S.delete('expenses', e.id);
              if (ok) {
                H.showToast('Expense record deleted');
                const from = document.getElementById('exp-from').value;
                const to = document.getElementById('exp-to').value;
                await this.updateList(from, to);
              }
            }
          };
        }
      });
    },

    async showExpenseModal(expenseToEdit = null) {
      const S = POS.Store;
      const H = POS.Helpers;
      const modalOverlay = document.getElementById('global-modal-overlay');
      if (!modalOverlay) return;

      const isEdit = !!expenseToEdit;

      const now = new Date();
      const offset = now.getTimezoneOffset();
      const localNow = new Date(now.getTime() - offset * 60 * 1000);
      const defaultDateTime = localNow.toISOString().slice(0, 16);

      let initialDateTime = defaultDateTime;
      let initialPaymentDate = '';
      let initialImage = '';

      if (isEdit) {
        if (expenseToEdit.date) {
          try {
            const edDate = new Date(expenseToEdit.date);
            const edLocal = new Date(edDate.getTime() - offset * 60 * 1000);
            initialDateTime = edLocal.toISOString().slice(0, 16);
          } catch(e) {}
        }
        if (expenseToEdit.payment_date) {
          initialPaymentDate = expenseToEdit.payment_date.slice(0, 10);
        }
        initialImage = expenseToEdit.image || '';
      }

      let imageBase64 = initialImage;

      // Fetch dynamic categories
      const categories = await S.getAll('expense-categories');
      const catOptions = categories.map(c => `
        <option value="${H.esc(c.name)}" ${expenseToEdit && expenseToEdit.category === c.name ? 'selected' : ''}>${H.esc(c.name)}</option>
      `).join('');

      const defaultAmount = isEdit ? (expenseToEdit.amount || '') : '';
      const defaultPaid = isEdit ? (expenseToEdit.paid_amount !== undefined ? expenseToEdit.paid_amount : (expenseToEdit.status === 'Paid' ? expenseToEdit.amount : 0)) : '';
      const defaultStatus = isEdit ? (expenseToEdit.status || 'Paid') : 'Paid';

      modalOverlay.innerHTML = `
        <div class="modal animate" style="max-width: 500px;">
          <div class="modal-header">
            <h3>${isEdit ? '✏️ Edit Expense' : '💸 Add New Expense'}</h3>
            <button class="modal-close" id="modal-close-expense">&times;</button>
          </div>
          <div class="modal-body" style="max-height: 520px; overflow-y: auto; padding-right: 6px;">
            <div class="form-group mb-2">
              <label class="form-label">Supplier Name</label>
              <input type="text" class="form-input" id="exp-supplier-name" placeholder="e.g. Acme Supplies, DESCO, Landlord" value="${H.esc(expenseToEdit?.supplier_name || '')}">
            </div>

            <div class="grid-2 gap-2 mb-2" style="grid-template-columns: 1.5fr 1fr;">
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Reason <span style="color:var(--danger);">*</span></label>
                <input type="text" class="form-input" id="exp-reason" placeholder="e.g. Electric Bill, Office Rent" value="${H.esc(expenseToEdit?.reason || expenseToEdit?.name || '')}" required>
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Category</label>
                <select class="form-select" id="exp-category">
                  ${catOptions || '<option value="Other">Other / Misc</option>'}
                </select>
              </div>
            </div>

            <div class="grid-3 gap-2 mb-2" style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Amount (৳) <span style="color:var(--danger);">*</span></label>
                <input type="number" class="form-input" id="exp-amount" placeholder="0.00" min="0.01" step="0.01" value="${defaultAmount}" required>
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Paid Amount (৳)</label>
                <input type="number" class="form-input" id="exp-paid-amount" placeholder="0.00" min="0" step="0.01" value="${defaultPaid}">
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Payment Status</label>
                <select class="form-select" id="exp-status">
                  <option value="Paid" ${defaultStatus === 'Paid' ? 'selected' : ''}>Paid</option>
                  <option value="Unpaid" ${defaultStatus === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
                  <option value="Partial" ${defaultStatus === 'Partial' ? 'selected' : ''}>Partial</option>
                </select>
              </div>
            </div>

            <div class="grid-2 gap-2 mb-2" style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Date & Time <span style="color:var(--danger);">*</span></label>
                <input type="datetime-local" class="form-input" id="exp-datetime" value="${initialDateTime}" required>
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Payment Date</label>
                <input type="date" class="form-input" id="exp-payment-date" value="${initialPaymentDate}">
              </div>
            </div>

            <div class="form-group mb-2">
              <label class="form-label">Receipt Image</label>
              <div style="display:flex; flex-direction:column; gap:8px;">
                <input type="file" class="form-input" id="exp-image-file" accept="image/*">
                <div id="exp-image-preview-wrapper" style="position:relative; display:${imageBase64 ? 'inline-block' : 'none'}; width:fit-content;">
                  <img id="exp-image-preview" src="${imageBase64}" style="max-width:100%; max-height:130px; border-radius:6px; object-fit:contain; border:1px solid var(--border); background:#fafafa; display:block;">
                  <button type="button" id="btn-remove-exp-image" style="position:absolute; top:4px; right:4px; background:rgba(220,38,38,0.85); color:#fff; border:none; border-radius:50%; width:22px; height:22px; cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:center;">&times;</button>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Note / Description</label>
              <textarea class="form-input" id="exp-note" placeholder="Optional details, invoice number, remarks..." rows="2" style="resize:vertical;">${H.esc(expenseToEdit?.note || '')}</textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="btn-expense-cancel">Cancel</button>
            <button class="btn btn-primary" id="btn-expense-save">${isEdit ? 'Update Expense' : 'Save Expense'}</button>
          </div>
        </div>
      `;

      modalOverlay.classList.add('active');

      const close = () => modalOverlay.classList.remove('active');
      modalOverlay.querySelector('#modal-close-expense').onclick = close;
      modalOverlay.querySelector('#btn-expense-cancel').onclick = close;

      const amtInput = modalOverlay.querySelector('#exp-amount');
      const paidInput = modalOverlay.querySelector('#exp-paid-amount');
      const statusSelect = modalOverlay.querySelector('#exp-status');
      const paymentDateInput = modalOverlay.querySelector('#exp-payment-date');

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
      const fileInput = modalOverlay.querySelector('#exp-image-file');
      const imgPreview = modalOverlay.querySelector('#exp-image-preview');
      const imgWrapper = modalOverlay.querySelector('#exp-image-preview-wrapper');
      const btnRemoveImg = modalOverlay.querySelector('#btn-remove-exp-image');

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

      modalOverlay.querySelector('#btn-expense-save').onclick = async () => {
        const supplierName = document.getElementById('exp-supplier-name').value.trim();
        const reason = document.getElementById('exp-reason').value.trim();
        const category = document.getElementById('exp-category').value;
        const amount = parseFloat(document.getElementById('exp-amount').value) || 0;
        let paidAmount = parseFloat(document.getElementById('exp-paid-amount').value);
        if (isNaN(paidAmount)) {
          paidAmount = statusSelect.value === 'Paid' ? amount : 0;
        }
        const status = document.getElementById('exp-status').value;
        const dateInput = document.getElementById('exp-datetime').value;
        const paymentDate = document.getElementById('exp-payment-date').value || null;
        const note = document.getElementById('exp-note').value.trim();

        if (!reason || amount <= 0) {
          H.showToast('Please enter a valid Reason and Amount greater than 0.', 'error');
          return;
        }

        let date = '';
        try {
          date = dateInput ? new Date(dateInput).toISOString() : new Date().toISOString();
        } catch (e) {
          date = new Date().toISOString();
        }

        const payload = {
          supplier_name: supplierName,
          reason,
          name: reason, // For backward compatibility
          category,
          amount,
          paid_amount: paidAmount,
          date,
          payment_date: paymentDate,
          status,
          image: imageBase64,
          note
        };

        if (isEdit) {
          const ok = await S.update('expenses', expenseToEdit.id, payload);
          if (ok) {
            H.showToast('Expense updated successfully!');
            close();
            const from = document.getElementById('exp-from').value;
            const to = document.getElementById('exp-to').value;
            await this.updateList(from, to);
          }
        } else {
          payload.id = 'exp_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
          const res = await S.add('expenses', payload);
          if (res) {
            H.showToast('Expense recorded successfully!');
            close();
            const from = document.getElementById('exp-from').value;
            const to = document.getElementById('exp-to').value;
            await this.updateList(from, to);
          }
        }
      };
    },

    async showCategoriesModal() {
      const S = POS.Store;
      const H = POS.Helpers;
      const modalOverlay = document.getElementById('global-modal-overlay');
      if (!modalOverlay) return;

      const renderModalContent = async () => {
        const categories = await S.getAll('expense-categories');

        modalOverlay.innerHTML = `
          <div class="modal animate" style="max-width: 420px;">
            <div class="modal-header">
              <h3>📂 Manage Expense Categories</h3>
              <button class="modal-close" id="modal-close-categories">&times;</button>
            </div>
            <div class="modal-body" style="max-height: 400px; overflow-y: auto;">
              <div style="display:flex; gap:8px; margin-bottom:16px;">
                <input type="text" class="form-input" id="new-exp-cat-name" placeholder="New Category Name..." style="flex:1;">
                <button class="btn btn-primary" id="btn-add-exp-cat" style="white-space:nowrap;">+ Add</button>
              </div>

              <div style="font-weight:700; margin-bottom:8px; font-size:12px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px;">Categories List</div>
              <div style="display:flex; flex-direction:column; gap:6px;" id="exp-cats-list">
                ${categories.map(c => `
                  <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--bg); border:1px solid var(--border-light); border-radius:6px;">
                    <span style="font-weight:600; color:var(--text-dark);">${H.esc(c.name)}</span>
                    <button class="btn btn-danger btn-xs btn-delete-exp-cat" data-id="${H.esc(c.id)}" data-name="${H.esc(c.name)}">🗑️ Delete</button>
                  </div>
                `).join('')}
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" id="btn-categories-close-footer">Close</button>
            </div>
          </div>
        `;

        const close = () => modalOverlay.classList.remove('active');
        modalOverlay.querySelector('#modal-close-categories').onclick = close;
        modalOverlay.querySelector('#btn-categories-close-footer').onclick = close;

        modalOverlay.querySelector('#btn-add-exp-cat').onclick = async () => {
          const name = document.getElementById('new-exp-cat-name').value.trim();
          if (!name) {
            H.showToast('Please enter a category name', 'warning');
            return;
          }

          const alreadyExists = categories.some(c => c.name.toLowerCase() === name.toLowerCase());
          if (alreadyExists) {
            H.showToast('Category already exists', 'error');
            return;
          }

          const res = await S.add('expense-categories', {
            id: 'exp_cat_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            name
          });

          if (res) {
            H.showToast('Category added successfully!');
            await renderModalContent();
          }
        };

        modalOverlay.querySelectorAll('.btn-delete-exp-cat').forEach(btn => {
          btn.onclick = async () => {
            const id = btn.dataset.id;
            const name = btn.dataset.name;

            if (categories.length <= 1) {
              H.showToast('You must keep at least one category.', 'warning');
              return;
            }

            if (await H.confirm(`Are you sure you want to delete the category "${name}"? Expenses under this category will display as "Other".`)) {
              const ok = await S.delete('expense-categories', id);
              if (ok) {
                H.showToast('Category removed successfully.');
                await renderModalContent();
              }
            }
          };
        });
      };

      await renderModalContent();
      modalOverlay.classList.add('active');
    }
  };

  window.POS = window.POS || {};
  window.POS.Expenses = Expenses;
})();
