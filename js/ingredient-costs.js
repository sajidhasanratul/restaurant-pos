(function () {
  'use strict';

  const IngredientCosts = {
    currentIngredientsList: [],

    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;
      const user = S.getCurrentUser();

      const today = H.today();
      let fromDate = localStorage.getItem('ing_from') || today;
      let toDate = localStorage.getItem('ing_to') || today;

      mc.innerHTML = `
        <!-- Top Bar: Date Range Filter + Action Buttons (Name Card Removed) -->
        <div class="filter-bar fade-in" style="display:flex; flex-direction:column; gap:12px; background:#fff; padding:14px 18px; border-radius:12px; border:1px solid #EAE4D9; margin-bottom:16px;">
          <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span style="font-size:12px; font-weight:800; color:#64748B; text-transform:uppercase; letter-spacing:0.5px;">Filter:</span>
              <div class="btn-group" style="display:flex; gap:6px; background:#F8FAFC; padding:4px; border-radius:10px; border:1px solid #E2E8F0;">
                <button type="button" class="btn btn-sm ing-period-btn active" data-period="today" style="border-radius:7px; font-weight:700; padding:5px 12px; font-size:12px;">Today</button>
                <button type="button" class="btn btn-sm ing-period-btn" data-period="yesterday" style="border-radius:7px; font-weight:700; padding:5px 12px; font-size:12px;">Yesterday</button>
                <button type="button" class="btn btn-sm ing-period-btn" data-period="this_week" style="border-radius:7px; font-weight:700; padding:5px 12px; font-size:12px;">This Week</button>
                <button type="button" class="btn btn-sm ing-period-btn" data-period="this_month" style="border-radius:7px; font-weight:700; padding:5px 12px; font-size:12px;">This Month</button>
                <button type="button" class="btn btn-sm ing-period-btn" data-period="custom" style="border-radius:7px; font-weight:700; padding:5px 12px; font-size:12px;">Custom</button>
              </div>
            </div>

            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; flex:1; justify-content:flex-end;">
              <div style="flex:1; min-width:180px; max-width:280px;">
                <input type="text" class="form-input" id="ing-search" placeholder="Supplier / Ingredient / Note..." style="height:36px; font-size:12.5px;">
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                ${user && (user.role === 'admin' || user.role === 'manager') ? `
                  <button class="btn btn-secondary btn-sm" id="btn-manage-ing-categories" style="height:36px; padding:0 12px; font-weight:600;">📂 Categories</button>
                ` : ''}
                <button class="btn btn-primary btn-sm" id="btn-add-ingredient-cost" style="background:#10B981; border-color:#10B981; height:36px; padding:0 14px; font-weight:700;">+ Add Ingredient Cost</button>
              </div>
            </div>
          </div>

          <!-- Date inputs row for Custom -->
          <div id="ing-custom-date-box" style="display:none; align-items:center; gap:10px; flex-wrap:wrap; border-top:1px dashed #E2E8F0; padding-top:10px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <label class="form-label" style="margin:0; font-size:12px; font-weight:700; color:#64748B;">From:</label>
              <input type="date" class="form-input" id="ing-from" value="${fromDate}" style="height:32px; font-size:12px; width:135px;">
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <label class="form-label" style="margin:0; font-size:12px; font-weight:700; color:#64748B;">To:</label>
              <input type="date" class="form-input" id="ing-to" value="${toDate}" style="height:32px; font-size:12px; width:135px;">
            </div>
            <button type="button" class="btn btn-primary btn-sm" id="btn-filter-ingredient" style="height:32px; padding:0 14px; font-size:12px; font-weight:700;">Apply Range</button>
          </div>
        </div>

        <div class="stats-grid fade-in mb-2" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">
          <div class="stat-card" style="padding: 18px; border-left: 4px solid #E05A2B;">
            <div class="stat-icon" style="background:#FFF3ED; color:#E05A2B;">🥬</div>
            <div class="stat-info">
              <div class="stat-label">Total Ingredient Purchases</div>
              <div class="stat-value" id="stats-total-ingredient">৳0.00</div>
              <div class="stat-sub" style="font-size:12px; margin-top:4px;">
                Paid: <span style="font-weight:700; color:#10b981;" id="stats-paid-ingredient">৳0.00</span> • 
                Due: <span style="font-weight:700; color:#ef4444;" id="stats-unpaid-ingredient">৳0.00</span>
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
                    <th style="width: 50px; text-align: center;">Invoice</th>
                    <th>Supplier / Market</th>
                    <th>Ingredient / Items</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Paid Amount</th>
                    <th>Payment Status</th>
                    <th>Purchase Date</th>
                    <th>Payment Date</th>
                    <th style="width: 130px; text-align: center;">Actions</th>
                  </tr>
                </thead>
                <tbody id="ingredient-tbody">
                  <tr>
                    <td colspan="10" class="text-center text-muted">Loading ingredient costs...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      document.getElementById('btn-add-ingredient-cost').onclick = () => this.showIngredientModal(null);
      const manageBtn = document.getElementById('btn-manage-ing-categories');
      if (manageBtn) {
        manageBtn.onclick = () => this.showCategoriesModal();
      }

      const customBox = document.getElementById('ing-custom-date-box');
      const fromInput = document.getElementById('ing-from');
      const toInput = document.getElementById('ing-to');

      const getIngPeriodRange = (period) => {
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

      document.querySelectorAll('.ing-period-btn').forEach(btn => {
        btn.onclick = async () => {
          document.querySelectorAll('.ing-period-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const p = btn.dataset.period;
          if (p === 'custom') {
            customBox.style.display = 'flex';
          } else {
            customBox.style.display = 'none';
            const range = getIngPeriodRange(p);
            fromDate = range.from;
            toDate = range.to;
            fromInput.value = fromDate;
            toInput.value = toDate;
            localStorage.setItem('ing_from', fromDate);
            localStorage.setItem('ing_to', toDate);
            await this.updateList(fromDate, toDate);
          }
        };
      });

      document.getElementById('btn-filter-ingredient').onclick = async () => {
        fromDate = fromInput.value;
        toDate = toInput.value;
        localStorage.setItem('ing_from', fromDate);
        localStorage.setItem('ing_to', toDate);
        await this.updateList(fromDate, toDate);
      };

      document.getElementById('ing-search').addEventListener('input', () => {
        this.filterTableLocally();
      });

      await this.updateList(fromDate, toDate);
    },

    async updateList(from, to) {
      const H = POS.Helpers;
      const totalEl = document.getElementById('stats-total-ingredient');
      const paidEl = document.getElementById('stats-paid-ingredient');
      const unpaidEl = document.getElementById('stats-unpaid-ingredient');

      try {
        const res = await fetch('/api/ingredient-costs');
        const allList = res.ok ? await res.json() : [];
        const list = allList.filter(e => H.isDateInRange(e.date, from, to));
        this.currentIngredientsList = list;

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
      } catch (err) {
        console.error('Error fetching ingredient costs:', err);
      }
    },

    filterTableLocally() {
      const H = POS.Helpers;
      const S = POS.Store;
      const tbody = document.getElementById('ingredient-tbody');
      if (!tbody) return;
      const user = S.getCurrentUser();
      const searchVal = (document.getElementById('ing-search')?.value || '').toLowerCase().trim();

      const filtered = this.currentIngredientsList.filter(e => {
        if (!searchVal) return true;
        const sup = (e.supplier_name || '').toLowerCase();
        const reason = (e.reason || e.name || '').toLowerCase();
        const cat = (e.category || '').toLowerCase();
        const note = (e.note || '').toLowerCase();
        return sup.includes(searchVal) || reason.includes(searchVal) || cat.includes(searchVal) || note.includes(searchVal);
      });

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted" style="padding: 24px;">No ingredient expense records found for this period.</td></tr>`;
        return;
      }

      tbody.innerHTML = filtered.map(item => {
        const isPaid = (item.status === 'Paid') || (parseFloat(item.paid_amount) >= parseFloat(item.amount));
        const isPartial = (item.status === 'Partial') || (parseFloat(item.paid_amount) > 0 && !isPaid);
        const statusClass = isPaid ? 'paid' : (isPartial ? 'partial' : 'unpaid');
        const statusText = isPaid ? 'Paid' : (isPartial ? 'Partial' : 'Unpaid');

        return `
          <tr>
            <td style="text-align:center;">
              ${item.image ? `
                <img src="${item.image}" alt="Receipt" style="width:34px; height:34px; object-fit:cover; border-radius:6px; cursor:pointer; border:1px solid #E2E8F0;" onclick="POS.Helpers.showImageLightbox('${item.image}')">
              ` : `<span style="color:#CBD5E1; font-size:16px;">📄</span>`}
            </td>
            <td><strong>${H.escapeHtml(item.supplier_name || 'Market / Store')}</strong></td>
            <td>${H.escapeHtml(item.reason || item.name || '')}</td>
            <td><span class="badge" style="background:#F1ECE4; color:#70625B; font-weight:600;">${H.escapeHtml(item.category || 'General')}</span></td>
            <td><strong>${H.formatCurrency(item.amount)}</strong></td>
            <td style="color:#10B981; font-weight:700;">${H.formatCurrency(item.paid_amount || 0)}</td>
            <td><span class="ingredient-status-pill ${statusClass}">${statusText}</span></td>
            <td>${item.date ? item.date.replace('T', ' ').substring(0, 16) : ''}</td>
            <td>${item.payment_date || '<span class="text-muted">—</span>'}</td>
            <td style="text-align:center;">
              <div style="display:inline-flex; gap:6px;">
                <button class="btn btn-secondary btn-xs btn-edit-ing" data-id="${item.id}" title="Edit">✏️</button>
                ${user && (user.role === 'admin' || user.role === 'manager') ? `
                  <button class="btn btn-secondary btn-xs btn-del-ing" data-id="${item.id}" style="color:#EF4444;" title="Delete">🗑️</button>
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      }).join('');

      tbody.querySelectorAll('.btn-edit-ing').forEach(btn => {
        btn.onclick = () => {
          const item = this.currentIngredientsList.find(i => i.id === btn.dataset.id);
          if (item) this.showIngredientModal(item);
        };
      });

      tbody.querySelectorAll('.btn-del-ing').forEach(btn => {
        btn.onclick = async () => {
          if (confirm('Are you sure you want to delete this ingredient record?')) {
            try {
              const res = await fetch(`/api/ingredient-costs/${btn.dataset.id}`, {
                method: 'DELETE',
                headers: S.getHeaders()
              });
              if (res.ok) {
                H.showToast('Ingredient record deleted successfully', 'success');
                const from = document.getElementById('ing-from').value;
                const to = document.getElementById('ing-to').value;
                await this.updateList(from, to);
              } else {
                H.showToast('Failed to delete record', 'error');
              }
            } catch (err) {
              H.showToast(err.message, 'error');
            }
          }
        };
      });
    },

    async showIngredientModal(item) {
      const H = POS.Helpers;
      const S = POS.Store;
      const isEdit = !!item;

      // Fetch ingredient categories
      let categories = [];
      try {
        const res = await fetch('/api/ingredient-categories');
        if (res.ok) categories = await res.json();
      } catch (e) { categories = []; }

      if (categories.length === 0) {
        categories = [
          { id: '1', name: 'Fresh Produce & Vegetables' },
          { id: '2', name: 'Meat, Beef & Poultry' },
          { id: '3', name: 'Seafood & Fish' },
          { id: '4', name: 'Dairy, Cheese & Milk' },
          { id: '5', name: 'Bakery & Burger Buns' },
          { id: '6', name: 'Spices, Herbs & Seasoning' },
          { id: '7', name: 'Oils, Mayo & Sauces' },
          { id: '8', name: 'Takeaway Packaging & Boxes' },
          { id: '9', name: 'Beverage Syrups & Coffee Beans' }
        ];
      }

      const modalHtml = `
        <div class="modal" id="modal-ingredient-form" style="max-width:540px;">
          <div class="modal-header">
            <h3>${isEdit ? '✏️ Edit Ingredient Record' : '🥬 Add Ingredient Purchase'}</h3>
            <button class="modal-close" id="btn-close-ing-modal">&times;</button>
          </div>
          <div class="modal-body" style="padding:18px 24px;">
            <div class="form-group mb-2">
              <label class="form-label" style="font-weight:700;">Supplier / Vendor / Market *</label>
              <input type="text" class="form-input" id="modal-ing-supplier" placeholder="e.g. Prime Choice Meats, Green Valley Produce" value="${isEdit ? H.escapeHtml(item.supplier_name || '') : ''}">
            </div>
            <div class="form-group mb-2">
              <label class="form-label" style="font-weight:700;">Ingredient / Item Description *</label>
              <input type="text" class="form-input" id="modal-ing-reason" placeholder="e.g. Ground Beef Patties (15kg), Brioche Buns (200 pcs)" value="${isEdit ? H.escapeHtml(item.reason || item.name || '') : ''}">
            </div>
            <div class="form-row mb-2" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
              <div class="form-group mb-0">
                <label class="form-label" style="font-weight:700;">Category</label>
                <select class="form-select" id="modal-ing-category">
                  ${categories.map(c => `
                    <option value="${H.escapeHtml(c.name)}" ${item && item.category === c.name ? 'selected' : ''}>${H.escapeHtml(c.name)}</option>
                  `).join('')}
                </select>
              </div>
              <div class="form-group mb-0">
                <label class="form-label" style="font-weight:700;">Total Amount (৳) *</label>
                <input type="number" step="0.01" min="0" class="form-input" id="modal-ing-amount" placeholder="0.00" value="${isEdit ? item.amount : ''}">
              </div>
            </div>
            <div class="form-row mb-2" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
              <div class="form-group mb-0">
                <label class="form-label" style="font-weight:700;">Paid Amount (৳)</label>
                <input type="number" step="0.01" min="0" class="form-input" id="modal-ing-paid" placeholder="0.00" value="${isEdit ? (item.paid_amount || item.amount) : ''}">
              </div>
              <div class="form-group mb-0">
                <label class="form-label" style="font-weight:700;">Payment Status</label>
                <select class="form-select" id="modal-ing-status">
                  <option value="Paid" ${item && item.status === 'Paid' ? 'selected' : ''}>Paid</option>
                  <option value="Partial" ${item && item.status === 'Partial' ? 'selected' : ''}>Partial</option>
                  <option value="Unpaid" ${item && item.status === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
                </select>
              </div>
            </div>
            <div class="form-row mb-2" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
              <div class="form-group mb-0">
                <label class="form-label" style="font-weight:700;">Purchase Date *</label>
                <input type="date" class="form-input" id="modal-ing-date" value="${isEdit && item.date ? item.date.substring(0, 10) : H.today()}">
              </div>
              <div class="form-group mb-0">
                <label class="form-label" style="font-weight:700;">Payment Due / Paid Date</label>
                <input type="date" class="form-input" id="modal-ing-payment-date" value="${isEdit && item.payment_date ? item.payment_date : H.today()}">
              </div>
            </div>
            <div class="form-group mb-2">
              <label class="form-label" style="font-weight:700;">Receipt / Bill Image (Optional)</label>
              <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:10px 14px;">
                <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:8px;">
                  <button type="button" class="btn btn-secondary btn-sm" id="btn-pick-ing-gallery" style="font-weight:600;">
                    🖼️ Choose from Gallery
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm" id="btn-upload-ing-device" style="font-weight:600;">
                    📤 Upload from Device
                  </button>
                  <button type="button" class="btn btn-secondary btn-xs" id="btn-clear-ing-img" style="color:#ef4444;" title="Clear Image">✕ Clear</button>
                </div>
                <div id="ing-img-preview-box" style="display:${isEdit && item.image ? 'flex' : 'none'}; align-items:center; gap:10px;">
                  <img id="ing-img-preview-tag" src="${isEdit ? (item.image || '') : ''}" style="width:50px; height:50px; object-fit:cover; border-radius:6px; border:1px solid #CBD5E1;">
                  <span style="font-size:12px; color:#64748B;">Image attached</span>
                </div>
                <input type="hidden" id="modal-ing-image-data" value="${isEdit ? (item.image || '') : ''}">
              </div>
            </div>
            <div class="form-group mb-0">
              <label class="form-label" style="font-weight:700;">Additional Notes</label>
              <textarea class="form-input" id="modal-ing-note" rows="2" placeholder="Quality checks, batch number, vendor contact...">${isEdit ? H.escapeHtml(item.note || '') : ''}</textarea>
            </div>
          </div>
          <div class="modal-footer" style="padding:12px 24px;">
            <button class="btn btn-secondary" id="btn-cancel-ing-modal">Cancel</button>
            <button class="btn btn-primary" id="btn-save-ing-modal" style="background:#10B981; border-color:#10B981;">${isEdit ? 'Update Record' : 'Save Record'}</button>
          </div>
        </div>
      `;

      H.showModal(modalHtml);

      // Auto update status based on amount vs paid
      const amtInput = document.getElementById('modal-ing-amount');
      const paidInput = document.getElementById('modal-ing-paid');
      const statusSelect = document.getElementById('modal-ing-status');

      amtInput.addEventListener('input', () => {
        if (!isEdit && !paidInput.value) {
          paidInput.value = amtInput.value;
        }
      });

      // Handle media picker
      const ingImgData = document.getElementById('modal-ing-image-data');
      const ingImgPreviewBox = document.getElementById('ing-img-preview-box');
      const ingImgPreviewTag = document.getElementById('ing-img-preview-tag');

      const setIngImg = (url) => {
        ingImgData.value = url;
        if (url) {
          ingImgPreviewTag.src = url;
          ingImgPreviewBox.style.display = 'flex';
        } else {
          ingImgPreviewTag.src = '';
          ingImgPreviewBox.style.display = 'none';
        }
      };

      document.getElementById('btn-pick-ing-gallery').onclick = () => {
        H.openMediaPicker({
          title: 'Choose Receipt Image from Gallery',
          folderName: 'Ingredient Costs',
          folderId: 'folder_ingredient_costs',
          activeTab: 'gallery',
          onSelect: (url) => setIngImg(url)
        });
      };

      document.getElementById('btn-upload-ing-device').onclick = () => {
        H.openMediaPicker({
          title: 'Upload Receipt from Device',
          folderName: 'Ingredient Costs',
          folderId: 'folder_ingredient_costs',
          activeTab: 'upload',
          onSelect: (url) => setIngImg(url)
        });
      };

      document.getElementById('btn-clear-ing-img').onclick = () => setIngImg('');

      document.getElementById('btn-close-ing-modal').onclick = () => H.hideModal();
      document.getElementById('btn-cancel-ing-modal').onclick = () => H.hideModal();

      document.getElementById('btn-save-ing-modal').onclick = async () => {
        const supplier = document.getElementById('modal-ing-supplier').value.trim();
        const reason = document.getElementById('modal-ing-reason').value.trim();
        const category = document.getElementById('modal-ing-category').value;
        const amount = parseFloat(document.getElementById('modal-ing-amount').value) || 0;
        const paid = parseFloat(document.getElementById('modal-ing-paid').value) || 0;
        const status = document.getElementById('modal-ing-status').value;
        const date = document.getElementById('modal-ing-date').value;
        const payment_date = document.getElementById('modal-ing-payment-date').value;
        const image = document.getElementById('modal-ing-image-data').value;
        const note = document.getElementById('modal-ing-note').value.trim();

        if (!supplier) {
          H.showToast('Please enter the supplier / market name', 'warning');
          return;
        }
        if (!reason) {
          H.showToast('Please enter the ingredient description', 'warning');
          return;
        }
        if (amount <= 0) {
          H.showToast('Please enter a valid purchase amount', 'warning');
          return;
        }

        const payload = {
          supplier_name: supplier,
          reason,
          name: reason,
          category,
          amount,
          paid_amount: paid,
          status,
          date,
          payment_date,
          image,
          note
        };

        try {
          const url = isEdit ? `/api/ingredient-costs/${item.id}` : '/api/ingredient-costs';
          const method = isEdit ? 'PUT' : 'POST';
          const res = await fetch(url, {
            method,
            headers: S.getHeaders(),
            body: JSON.stringify(payload)
          });

          if (res.ok) {
            H.showToast(isEdit ? 'Ingredient record updated!' : 'Ingredient record added successfully!', 'success');
            H.hideModal();
            const from = document.getElementById('ing-from').value;
            const to = document.getElementById('ing-to').value;
            await this.updateList(from, to);
          } else {
            const err = await res.json();
            H.showToast(err.error || 'Failed to save record', 'error');
          }
        } catch (err) {
          H.showToast(err.message, 'error');
        }
      };
    },

    async showCategoriesModal() {
      const H = POS.Helpers;
      const S = POS.Store;

      const loadCats = async () => {
        const res = await fetch('/api/ingredient-categories');
        return res.ok ? await res.json() : [];
      };

      const renderCatsList = async () => {
        const cats = await loadCats();
        const listEl = document.getElementById('modal-ing-cats-list');
        if (!listEl) return;
        if (cats.length === 0) {
          listEl.innerHTML = `<p class="text-muted text-center" style="padding:14px;">No categories found.</p>`;
          return;
        }
        listEl.innerHTML = cats.map(c => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; margin-bottom:6px;">
            <span style="font-weight:600; font-size:13px;">${H.escapeHtml(c.name)}</span>
            <button class="btn btn-secondary btn-xs btn-del-cat" data-id="${c.id}" style="color:#EF4444;" title="Delete">🗑️</button>
          </div>
        `).join('');

        listEl.querySelectorAll('.btn-del-cat').forEach(b => {
          b.onclick = async () => {
            if (confirm('Delete this category?')) {
              await fetch(`/api/ingredient-categories/${b.dataset.id}`, { method: 'DELETE', headers: S.getHeaders() });
              renderCatsList();
            }
          };
        });
      };

      const modalHtml = `
        <div class="modal" id="modal-ing-cats" style="max-width:440px;">
          <div class="modal-header">
            <h3>📂 Manage Ingredient Categories</h3>
            <button class="modal-close" id="btn-close-ing-cats">&times;</button>
          </div>
          <div class="modal-body" style="padding:18px 24px;">
            <div style="display:flex; gap:8px; margin-bottom:14px;">
              <input type="text" class="form-input" id="new-ing-cat-name" placeholder="New Category Name..." style="flex:1;">
              <button class="btn btn-primary" id="btn-add-ing-cat">+ Add</button>
            </div>
            <div id="modal-ing-cats-list" style="max-height:280px; overflow-y:auto;">
              Loading...
            </div>
          </div>
          <div class="modal-footer" style="padding:12px 24px;">
            <button class="btn btn-secondary" id="btn-done-ing-cats">Done</button>
          </div>
        </div>
      `;

      H.showModal(modalHtml);
      renderCatsList();

      document.getElementById('btn-close-ing-cats').onclick = () => H.hideModal();
      document.getElementById('btn-done-ing-cats').onclick = () => H.hideModal();

      document.getElementById('btn-add-ing-cat').onclick = async () => {
        const input = document.getElementById('new-ing-cat-name');
        const name = input.value.trim();
        if (!name) return;
        try {
          const res = await fetch('/api/ingredient-categories', {
            method: 'POST',
            headers: S.getHeaders(),
            body: JSON.stringify({ name })
          });
          if (res.ok) {
            input.value = '';
            renderCatsList();
          } else {
            const err = await res.json();
            H.showToast(err.error || 'Failed to add category', 'error');
          }
        } catch (e) {
          H.showToast(e.message, 'error');
        }
      };
    }
  };

  window.POS = window.POS || {};
  window.POS.IngredientCosts = IngredientCosts;
})();
