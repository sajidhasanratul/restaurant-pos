(function () {
  'use strict';

  const Products = {
    currentTab: 'all',
    searchQuery: '',
    categoryFilter: 'all',
    perPage: localStorage.getItem('products_per_page') || '50',
    customLimit: parseInt(localStorage.getItem('products_custom_limit')) || 25,
    currentPage: 1,

    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

      const categories = await S.getAll('categories');

      mc.innerHTML = `
        <div class="page-header fade-in" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div>
            <h2 class="page-title" style="display:flex; align-items:center; gap:8px;">
              <span>🍽️</span> Restaurant Items & Menu
            </h2>
            <p class="page-subtitle">Manage menu dishes, appetizers, drinks, and categories. Made to order with no stock or cost limits.</p>
          </div>
          <div class="page-actions" style="display:flex; gap:8px; align-items:center;">
            <button class="btn btn-secondary btn-sm" id="btn-manage-categories">📂 Categories</button>
            <button class="btn btn-primary btn-sm" id="btn-add-product" style="background:#10B981; border-color:#10B981;">+ Add New Item</button>
          </div>
        </div>

        <!-- Filter tabs: All, Published, Draft, Trash -->
        <div class="filter-bar fade-in" style="display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:16px; background:#fff; padding:12px 18px; border-radius:12px; border:1px solid #EAE4D9; flex-wrap:wrap;">
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm tab-filter-btn active" data-tab="all" id="tab-all">All Dishes (<span id="count-all">0</span>)</button>
            <button class="btn btn-secondary btn-sm tab-filter-btn" data-tab="Publish" id="tab-publish">Published (<span id="count-publish">0</span>)</button>
            <button class="btn btn-secondary btn-sm tab-filter-btn" data-tab="Draft" id="tab-draft">Drafts (<span id="count-draft">0</span>)</button>
            <button class="btn btn-secondary btn-sm tab-filter-btn" data-tab="Trash" id="tab-trash" style="color:#EF4444;">Trash (<span id="count-trash">0</span>)</button>
          </div>

          <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
            <div style="position:relative; width:180px;">
              <input type="text" class="form-input" id="search-product-input" placeholder="Search dish..." style="height:36px; font-size:13px; border-radius:20px; padding:0 12px;">
            </div>
            <select class="form-select" id="filter-category" style="height:36px; font-size:13px; border-radius:8px; width:160px;">
              <option value="all">All Categories</option>
              ${categories.map(c => `<option value="${c.id}">${H.escapeHtml(c.name)}</option>`).join('')}
            </select>

            <!-- Show per-page filter: 50, 100, 200, 500, custom, all -->
            <div style="display:flex; align-items:center; gap:6px; background:#F8FAFC; border:1px solid #CBD5E1; padding:2px 8px; border-radius:8px;">
              <span style="font-size:12px; font-weight:700; color:#64748B;">Show:</span>
              <select class="form-select" id="filter-per-page" style="height:32px; font-size:12.5px; border:none; background:transparent; font-weight:600; cursor:pointer; padding-right:18px;">
                <option value="50" ${this.perPage === '50' ? 'selected' : ''}>50 items</option>
                <option value="100" ${this.perPage === '100' ? 'selected' : ''}>100 items</option>
                <option value="200" ${this.perPage === '200' ? 'selected' : ''}>200 items</option>
                <option value="500" ${this.perPage === '500' ? 'selected' : ''}>500 items</option>
                <option value="custom" ${this.perPage === 'custom' ? 'selected' : ''}>Custom...</option>
                <option value="all" ${this.perPage === 'all' ? 'selected' : ''}>All items</option>
              </select>
              <div id="custom-limit-wrap" style="display:${this.perPage === 'custom' ? 'flex' : 'none'}; align-items:center; gap:4px;">
                <input type="number" class="form-input" id="custom-limit-input" min="1" max="10000" placeholder="Qty" value="${this.customLimit}" style="width:60px; height:28px; font-size:12px; text-align:center; padding:0 4px; border-radius:6px;">
                <button class="btn btn-primary btn-xs" id="btn-apply-custom-limit" style="height:28px; padding:0 8px; font-weight:700; border-radius:6px;">Go</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Products Card Grid Container -->
        <div class="fade-in" id="products-cards-container" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap:16px;">
          <!-- Dynamically populated cards -->
        </div>

        <!-- Pagination Bar -->
        <div class="fade-in" id="products-pagination-container" style="margin-top:20px; display:flex; justify-content:space-between; align-items:center; background:#fff; padding:12px 18px; border-radius:12px; border:1px solid #EAE4D9; flex-wrap:wrap; gap:10px;">
          <!-- Dynamically populated pagination info & buttons -->
        </div>

        <div class="modal-overlay" id="prod-modal-overlay"></div>
      `;

      this.bindEvents();
      await this.updateList();
    },

    bindEvents() {
      document.getElementById('btn-add-product').onclick = () => this.showAddEditModal(null);
      document.getElementById('btn-manage-categories').onclick = () => this.showCategoriesModal();

      document.querySelectorAll('.tab-filter-btn').forEach(btn => {
        btn.onclick = async () => {
          document.querySelectorAll('.tab-filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.currentTab = btn.dataset.tab;
          this.currentPage = 1;
          this.renderCardsLocally();
        };
      });

      document.getElementById('search-product-input').addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.currentPage = 1;
        this.renderCardsLocally();
      });

      document.getElementById('filter-category').addEventListener('change', (e) => {
        this.categoryFilter = e.target.value;
        this.currentPage = 1;
        this.renderCardsLocally();
      });

      // Show per-page selector binding
      const perPageSelect = document.getElementById('filter-per-page');
      const customWrap = document.getElementById('custom-limit-wrap');
      const customInput = document.getElementById('custom-limit-input');
      const customBtn = document.getElementById('btn-apply-custom-limit');

      if (perPageSelect) {
        perPageSelect.addEventListener('change', (e) => {
          this.perPage = e.target.value;
          localStorage.setItem('products_per_page', this.perPage);
          if (this.perPage === 'custom') {
            if (customWrap) customWrap.style.display = 'flex';
            if (customInput) customInput.focus();
          } else {
            if (customWrap) customWrap.style.display = 'none';
          }
          this.currentPage = 1;
          this.renderCardsLocally();
        });
      }

      if (customBtn && customInput) {
        const applyCustom = () => {
          const val = parseInt(customInput.value) || 25;
          this.customLimit = Math.max(1, val);
          localStorage.setItem('products_custom_limit', this.customLimit);
          this.currentPage = 1;
          this.renderCardsLocally();
        };
        customBtn.onclick = applyCustom;
        customInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            applyCustom();
          }
        });
      }
    },

    allProductsList: [],

    async updateList() {
      const container = document.getElementById('products-cards-container');
      if (!container) return;
      container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:40px; color:#94A3B8;">Loading dishes...</div>`;

      try {
        const res = await fetch(`/api/products?includeTrashed=true`);
        const all = res.ok ? await res.json() : [];
        this.allProductsList = all;

        // Update counts
        const allCount = all.filter(p => p.status !== 'Trash').length;
        const pubCount = all.filter(p => p.status === 'Publish' || !p.status).length;
        const draftCount = all.filter(p => p.status === 'Draft').length;
        const trashCount = all.filter(p => p.status === 'Trash').length;

        const elAll = document.getElementById('count-all');
        const elPub = document.getElementById('count-publish');
        const elDraft = document.getElementById('count-draft');
        const elTrash = document.getElementById('count-trash');

        if (elAll) elAll.textContent = allCount;
        if (elPub) elPub.textContent = pubCount;
        if (elDraft) elDraft.textContent = draftCount;
        if (elTrash) elTrash.textContent = trashCount;

        this.renderCardsLocally();
      } catch (err) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:40px; color:#EF4444;">Error loading menu: ${err.message}</div>`;
      }
    },

    renderCardsLocally() {
      const container = document.getElementById('products-cards-container');
      const paginContainer = document.getElementById('products-pagination-container');
      if (!container) return;
      const H = POS.Helpers;

      let list = this.allProductsList;

      // Filter by tab
      if (this.currentTab === 'Trash') {
        list = list.filter(p => p.status === 'Trash');
      } else if (this.currentTab === 'Publish') {
        list = list.filter(p => p.status === 'Publish' || (!p.status && p.status !== 'Trash'));
      } else if (this.currentTab === 'Draft') {
        list = list.filter(p => p.status === 'Draft');
      } else {
        list = list.filter(p => p.status !== 'Trash');
      }

      // Filter by category
      if (this.categoryFilter !== 'all') {
        list = list.filter(p => p.categoryId === this.categoryFilter);
      }

      // Filter by search
      if (this.searchQuery) {
        list = list.filter(p => 
          (p.name || '').toLowerCase().includes(this.searchQuery) ||
          (p.sku || '').toLowerCase().includes(this.searchQuery) ||
          (p.tag || '').toLowerCase().includes(this.searchQuery)
        );
      }

      const totalFiltered = list.length;

      if (totalFiltered === 0) {
        container.innerHTML = `
          <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: #94A3B8; background:#fff; border-radius:12px; border:1px solid #EAE4D9;">
            <div style="font-size: 36px; margin-bottom: 8px;">🍽️</div>
            <p style="font-size: 14px; font-weight:600;">No dishes found matching this filter.</p>
          </div>
        `;
        if (paginContainer) paginContainer.style.display = 'none';
        return;
      }

      // Calculate effective limit for pagination
      let effectiveLimit;
      if (this.perPage === 'all') {
        effectiveLimit = totalFiltered || 1;
      } else if (this.perPage === 'custom') {
        effectiveLimit = Math.max(1, parseInt(this.customLimit) || 25);
      } else {
        effectiveLimit = parseInt(this.perPage) || 50;
      }

      const totalPages = Math.ceil(totalFiltered / effectiveLimit) || 1;
      if (this.currentPage > totalPages) this.currentPage = totalPages;
      if (this.currentPage < 1) this.currentPage = 1;

      const startIndex = (this.currentPage - 1) * effectiveLimit;
      const endIndex = Math.min(startIndex + effectiveLimit, totalFiltered);
      const pagedList = this.perPage === 'all' ? list : list.slice(startIndex, endIndex);

      container.innerHTML = pagedList.map(item => {
        const price = parseFloat(item.sellingPrice || 0);
        const isTrash = item.status === 'Trash';

        return `
          <div class="card" style="border-radius:14px; border:1px solid #EAE4D9; overflow:hidden; background:#fff; display:flex; flex-direction:column; box-shadow:0 1px 3px rgba(35,25,20,0.04); transition:transform 0.2s, box-shadow 0.2s;">
            <div style="width:100%; height:130px; background:#F5EFE6; position:relative; overflow:hidden;">
              ${item.image ? `
                <img src="${item.image}" alt="${H.escapeHtml(item.name)}" style="width:100%; height:100%; object-fit:cover;">
              ` : `
                <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:42px;">🍔</div>
              `}
              <span class="badge" style="position:absolute; top:8px; right:8px; background:rgba(255,255,255,0.9); font-weight:700; font-size:10.5px; color:${item.status === 'Draft' ? '#64748B' : (isTrash ? '#EF4444' : '#059669')};">
                ${isTrash ? 'Trash' : (item.status === 'Draft' ? 'Draft' : 'Active')}
              </span>
            </div>

            <div style="padding:14px; display:flex; flex-direction:column; flex:1;">
              <h4 style="font-size:14px; font-weight:800; color:#1E293B; margin-bottom:4px; line-height:1.3; min-height:36px;">
                ${H.escapeHtml(item.name)}
              </h4>
              <p style="font-size:11.5px; color:#64748B; margin-bottom:10px; flex:1; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
                ${H.escapeHtml(item.tag || 'Fresh restaurant prepared dish')}
              </p>

              <div style="display:flex; justify-content:space-between; align-items:center; padding-top:8px; border-top:1px solid #F1ECE4; margin-top:auto;">
                <span style="font-size:16px; font-weight:900; color:#0F172A;">৳${price.toFixed(2)}</span>
                
                <div style="display:flex; gap:6px;">
                  ${!isTrash ? `
                    <button class="btn btn-secondary btn-xs btn-edit-prod" data-id="${item.id}" title="Edit Dish" style="font-weight:600;">✏️ Edit</button>
                    <button class="btn btn-secondary btn-xs btn-trash-prod" data-id="${item.id}" title="Move to Trash" style="color:#EF4444;">🗑️</button>
                  ` : `
                    <button class="btn btn-secondary btn-xs btn-restore-prod" data-id="${item.id}" title="Restore" style="color:#10B981; font-weight:700;">↺ Restore</button>
                    <button class="btn btn-secondary btn-xs btn-perm-del-prod" data-id="${item.id}" title="Permanent Delete" style="color:#EF4444;">Delete</button>
                  `}
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');

      // Render Pagination Bar
      if (paginContainer) {
        paginContainer.style.display = 'flex';
        const displayStart = startIndex + 1;
        const displayEnd = endIndex;
        const countText = `Showing <b>${displayStart}</b> - <b>${displayEnd}</b> of <b>${totalFiltered}</b> dishes`;

        let paginationButtonsHtml = '';
        if (totalPages > 1) {
          paginationButtonsHtml = `
            <div style="display:flex; gap:6px; align-items:center;">
              <button class="btn btn-secondary btn-xs" id="pagin-prev" ${this.currentPage <= 1 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} style="font-weight:700; border-radius:6px; padding:4px 10px;">&laquo; Prev</button>
              <div style="display:flex; gap:4px; align-items:center;">
                ${Array.from({ length: totalPages }, (_, i) => i + 1).map(page => `
                  <button class="btn btn-xs ${page === this.currentPage ? 'btn-primary' : 'btn-secondary'} pagin-page-btn" data-page="${page}" style="min-width:28px; height:28px; font-weight:700; border-radius:6px; padding:0 6px;">
                    ${page}
                  </button>
                `).slice(Math.max(0, this.currentPage - 3), Math.min(totalPages, this.currentPage + 2)).join('')}
              </div>
              <button class="btn btn-secondary btn-xs" id="pagin-next" ${this.currentPage >= totalPages ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} style="font-weight:700; border-radius:6px; padding:4px 10px;">Next &raquo;</button>
            </div>
          `;
        } else {
          paginationButtonsHtml = `
            <div style="font-size:12px; font-weight:700; color:#10B981; background:#ECFDF5; padding:4px 10px; border-radius:6px; border:1px solid #A7F3D0;">
              ✓ All items shown
            </div>
          `;
        }

        paginContainer.innerHTML = `
          <div style="font-size:13px; color:#64748B;">
            ${countText}
          </div>
          ${paginationButtonsHtml}
        `;

        // Bind pagination buttons
        const btnPrev = document.getElementById('pagin-prev');
        const btnNext = document.getElementById('pagin-next');
        if (btnPrev && this.currentPage > 1) {
          btnPrev.onclick = () => {
            this.currentPage--;
            this.renderCardsLocally();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          };
        }
        if (btnNext && this.currentPage < totalPages) {
          btnNext.onclick = () => {
            this.currentPage++;
            this.renderCardsLocally();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          };
        }
        paginContainer.querySelectorAll('.pagin-page-btn').forEach(btn => {
          btn.onclick = () => {
            const p = parseInt(btn.dataset.page);
            if (p && p !== this.currentPage) {
              this.currentPage = p;
              this.renderCardsLocally();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          };
        });
      }

      // Bind card buttons
      container.querySelectorAll('.btn-edit-prod').forEach(btn => {
        btn.onclick = () => {
          const p = this.allProductsList.find(i => i.id === btn.dataset.id);
          if (p) this.showAddEditModal(p);
        };
      });

      container.querySelectorAll('.btn-trash-prod').forEach(btn => {
        btn.onclick = async () => {
          const p = this.allProductsList.find(i => i.id === btn.dataset.id);
          const ok = await H.confirm(`Move "${p.name}" to Trash? It will be hidden from the active menu until restored.`, {
            title: 'Move Dish to Trash',
            confirmText: 'Move to Trash',
            danger: true
          });
          if (ok) {
            try {
              const res = await fetch(`/api/products/${p.id}`, { method: 'DELETE', headers: POS.Store.getHeaders() });
              if (res.ok) {
                POS.Helpers.showToast(`"${p.name}" moved to Trash`, 'success');
                await this.updateList();
              } else {
                const errData = await res.json().catch(() => ({}));
                POS.Helpers.showToast(errData.error || 'Failed to move to Trash', 'error');
              }
            } catch (err) {
              POS.Helpers.showToast('Error: ' + err.message, 'error');
            }
          }
        };
      });

      container.querySelectorAll('.btn-restore-prod').forEach(btn => {
        btn.onclick = async () => {
          const p = this.allProductsList.find(i => i.id === btn.dataset.id);
          try {
            const res = await fetch(`/api/products/${p.id}/restore`, { method: 'POST', headers: POS.Store.getHeaders() });
            if (res.ok) {
              POS.Helpers.showToast(`"${p.name}" restored to active menu`, 'success');
              await this.updateList();
            } else {
              const errData = await res.json().catch(() => ({}));
              POS.Helpers.showToast(errData.error || 'Failed to restore', 'error');
            }
          } catch (err) {
            POS.Helpers.showToast('Error: ' + err.message, 'error');
          }
        };
      });

      container.querySelectorAll('.btn-perm-del-prod').forEach(btn => {
        btn.onclick = async () => {
          const p = this.allProductsList.find(i => i.id === btn.dataset.id);
          const ok = await H.confirm(`Permanently delete "${p.name}"? This action cannot be undone.`, {
            title: 'Delete Permanently',
            confirmText: 'Delete Forever',
            danger: true
          });
          if (ok) {
            try {
              const res = await fetch(`/api/products/${p.id}?permanent=true`, { method: 'DELETE', headers: POS.Store.getHeaders() });
              if (res.ok) {
                POS.Helpers.showToast(`"${p.name}" deleted permanently`, 'success');
                await this.updateList();
              } else {
                const errData = await res.json().catch(() => ({}));
                POS.Helpers.showToast(errData.error || 'Failed to delete permanently', 'error');
              }
            } catch (err) {
              POS.Helpers.showToast('Error: ' + err.message, 'error');
            }
          }
        };
      });
    },

    async showAddEditModal(p) {
      const S = POS.Store;
      const H = POS.Helpers;
      const overlay = document.getElementById('prod-modal-overlay');

      const isEdit = !!p;
      const categories = await S.getAll('categories');

      overlay.innerHTML = `
        <div class="modal animate" style="max-width:560px;">
          <div class="modal-header">
            <h3>${isEdit ? '✏️ Edit Menu Item' : '🍔 Add New Menu Item'}</h3>
            <button class="modal-close" id="modal-close-prod">&times;</button>
          </div>
          <div class="modal-body" style="padding:20px 24px; max-height:480px; overflow-y:auto;">
            <div class="form-group mb-2">
              <label class="form-label" style="font-weight:700;">Dish / Item Name *</label>
              <input type="text" class="form-input" id="p-name" placeholder="e.g. Deluxe Crispy Chicken Burger" value="${isEdit ? H.escapeHtml(p.name) : ''}">
            </div>

            <div class="form-row mb-2" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
              <div class="form-group mb-0">
                <label class="form-label" style="font-weight:700;">Category *</label>
                <select class="form-select" id="p-category">
                  ${categories.map(c => `
                    <option value="${c.id}" ${isEdit && p.categoryId === c.id ? 'selected' : ''}>${H.escapeHtml(c.name)}</option>
                  `).join('')}
                </select>
              </div>
              <div class="form-group mb-0">
                <label class="form-label" style="font-weight:700;">Selling Price (৳) *</label>
                <input type="number" step="0.5" min="0" class="form-input" id="p-price" placeholder="250" value="${isEdit ? p.sellingPrice : ''}">
              </div>
            </div>

            <!-- Food Image -->
            <div class="form-group mb-2">
              <label class="form-label" style="font-weight:700;">Dish Image (Photo / Web Link)</label>
              <div style="display:flex; gap:12px; align-items:center; background:#f8fafc; padding:10px 14px; border-radius:10px; border:1px solid #E2E8F0;">
                <div id="p-img-preview" style="width:65px; height:65px; border-radius:10px; border:1px solid #E2E8F0; overflow:hidden; background:#FFFFFF; display:flex; align-items:center; justify-content:center; font-size:26px; flex-shrink:0;">
                  ${isEdit && p.image ? `<img src="${p.image}" style="width:100%; height:100%; object-fit:cover;">` : '🍽️'}
                </div>
                <div style="flex:1; display:flex; flex-direction:column; gap:6px;">
                  <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button type="button" class="btn btn-secondary btn-sm" id="btn-pick-dish-gallery" style="font-weight:600; font-size:12px; padding:4px 10px;">
                      🖼️ Choose from Gallery
                    </button>
                    <button type="button" class="btn btn-secondary btn-sm" id="btn-upload-dish-device" style="font-weight:600; font-size:12px; padding:4px 10px;">
                      📤 Upload from Device
                    </button>
                  </div>
                  <div style="display:flex; gap:6px;">
                    <input type="text" class="form-input" id="p-image-url" placeholder="Or paste image URL / Base64..." value="${isEdit ? H.escapeHtml(p.image || '') : ''}" style="height:30px; font-size:11px; flex:1;">
                    <button type="button" class="btn btn-secondary btn-xs" id="btn-clear-dish-img" style="color:#ef4444;" title="Remove Photo">✕</button>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-group mb-2">
              <label class="form-label" style="font-weight:700;">Description / Ingredients Preview</label>
              <textarea class="form-input" id="p-tag" rows="2" placeholder="e.g. Crispy chicken filet with melted cheddar, fresh lettuce & house sauce">${isEdit ? H.escapeHtml(p.tag || '') : ''}</textarea>
            </div>

            <div class="form-row mb-0" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
              <div class="form-group mb-0">
                <label class="form-label" style="font-weight:700;">Status</label>
                <select class="form-select" id="p-status">
                  <option value="Publish" ${isEdit && p.status === 'Publish' ? 'selected' : ''}>Published (Active)</option>
                  <option value="Draft" ${isEdit && p.status === 'Draft' ? 'selected' : ''}>Draft</option>
                  <option value="Trash" ${isEdit && p.status === 'Trash' ? 'selected' : ''}>Trash</option>
                </select>
              </div>
              <div class="form-group mb-0">
                <label class="form-label" style="font-weight:700;">Priority Order</label>
                <input type="number" min="0" class="form-input" id="p-priority" value="${isEdit ? (p.priority || 0) : 10}">
              </div>
            </div>
          </div>
          <div class="modal-footer" style="padding:14px 24px;">
            <button class="btn btn-secondary" id="modal-cancel-prod">Cancel</button>
            <button class="btn btn-primary" id="modal-save-prod" style="background:#10B981; border-color:#10B981;">
              ${isEdit ? 'Update Dish' : 'Save Dish'}
            </button>
          </div>
        </div>
      `;

      overlay.classList.add('active');

      const close = () => overlay.classList.remove('active');
      document.getElementById('modal-close-prod').onclick = close;
      document.getElementById('modal-cancel-prod').onclick = close;

      // Image picker handlers
      const dishImgPreview = document.getElementById('p-img-preview');
      const dishImgInput = document.getElementById('p-image-url');
      const updateDishImg = (url) => {
        dishImgInput.value = url;
        dishImgPreview.innerHTML = url 
          ? `<img src="${url}" style="width:100%; height:100%; object-fit:cover;">` 
          : '🍽️';
      };

      document.getElementById('btn-pick-dish-gallery').onclick = () => {
        H.openMediaPicker({
          title: 'Choose Dish Photo from Gallery',
          folderName: 'Items',
          folderId: 'folder_items',
          activeTab: 'gallery',
          onSelect: (url) => updateDishImg(url)
        });
      };

      document.getElementById('btn-upload-dish-device').onclick = () => {
        H.openMediaPicker({
          title: 'Upload Dish Photo from Device',
          folderName: 'Items',
          folderId: 'folder_items',
          activeTab: 'upload',
          onSelect: (url) => updateDishImg(url)
        });
      };

      document.getElementById('btn-clear-dish-img').onclick = () => updateDishImg('');
      dishImgInput.addEventListener('input', (e) => updateDishImg(e.target.value.trim()));

      document.getElementById('modal-save-prod').onclick = async () => {
        const name = document.getElementById('p-name').value.trim();
        const categoryId = document.getElementById('p-category').value;
        const sellingPrice = parseFloat(document.getElementById('p-price').value) || 0;
        const image = document.getElementById('p-image-url').value.trim();
        const tag = document.getElementById('p-tag').value.trim();
        const status = document.getElementById('p-status').value;
        const priority = parseInt(document.getElementById('p-priority').value) || 0;

        if (!name) {
          H.showToast('Please enter the dish name', 'warning');
          return;
        }
        if (sellingPrice <= 0) {
          H.showToast('Please enter a valid price', 'warning');
          return;
        }

        const id = isEdit ? p.id : ('prod_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5));
        const sku = isEdit ? p.sku : ('DISH-' + Math.floor(100 + Math.random() * 900));

        const payload = {
          id,
          name,
          sku,
          barcode: sku,
          categoryId,
          costPrice: 0, // No cost price rules
          sellingPrice,
          stock: 99999, // No stock constraints
          alertQty: 0,
          image,
          tag,
          status,
          priority
        };

        try {
          const url = isEdit ? `/api/products/${p.id}` : '/api/products';
          const method = isEdit ? 'PUT' : 'POST';
          const res = await fetch(url, {
            method,
            headers: S.getHeaders(),
            body: JSON.stringify(payload)
          });

          if (res.ok) {
            H.showToast(isEdit ? 'Dish updated successfully!' : 'New dish added to menu!', 'success');
            close();
            await this.updateList();
          } else {
            const err = await res.json();
            H.showToast(err.error || 'Failed to save dish', 'error');
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
        const res = await fetch('/api/categories');
        return res.ok ? await res.json() : [];
      };

      let pendingCatImage = '';

      const getFallbackCatEmoji = (name) => {
        const n = (name || '').toLowerCase();
        if (n.includes('burger')) return '🍔';
        if (n.includes('chicken') || n.includes('wing')) return '🍗';
        if (n.includes('drink') || n.includes('beverage')) return '🥤';
        if (n.includes('coffee') || n.includes('tea')) return '☕';
        if (n.includes('dessert') || n.includes('ice cream')) return '🍨';
        if (n.includes('sides') || n.includes('fries')) return '🍟';
        if (n.includes('combo')) return '🍱';
        return '📁';
      };

      const renderCatsList = async () => {
        const cats = await loadCats();
        const listEl = document.getElementById('modal-cats-list');
        if (!listEl) return;

        if (cats.length === 0) {
          listEl.innerHTML = `<div style="text-align:center; padding:20px; color:#94A3B8;">No categories found</div>`;
          return;
        }

        listEl.innerHTML = cats.map(c => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; margin-bottom:8px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="width:38px; height:38px; border-radius:8px; overflow:hidden; background:#FFFFFF; border:1px solid #CBD5E1; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0;">
                ${c.image ? `<img src="${c.image}" style="width:100%; height:100%; object-fit:cover;">` : (c.icon || getFallbackCatEmoji(c.name))}
              </div>
              <div>
                <div style="font-weight:700; font-size:13px; color:#1E293B;">${H.escapeHtml(c.name)}</div>
                <div style="font-size:11px; color:#64748B;">ID: ${H.escapeHtml(c.id)}</div>
              </div>
            </div>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-secondary btn-xs btn-edit-cat" data-id="${c.id}" data-name="${H.escapeHtml(c.name)}" data-image="${H.escapeHtml(c.image || '')}" title="Edit Category" style="font-weight:600;">✏️ Edit</button>
              <button class="btn btn-secondary btn-xs btn-del-cat" data-id="${c.id}" style="color:#EF4444;" title="Delete">🗑️</button>
            </div>
          </div>
        `).join('');

        listEl.querySelectorAll('.btn-edit-cat').forEach(b => {
          b.onclick = () => {
            const catId = b.dataset.id;
            const catName = b.dataset.name;
            const catImage = b.dataset.image;
            showEditCatDialog(catId, catName, catImage);
          };
        });

        listEl.querySelectorAll('.btn-del-cat').forEach(b => {
          b.onclick = async () => {
            if (confirm('Delete this category? Dishes linked to this category may need reassignment.')) {
              await fetch(`/api/categories/${b.dataset.id}`, { method: 'DELETE', headers: S.getHeaders() });
              H.showToast('Category deleted', 'success');
              renderCatsList();
            }
          };
        });
      };

      const showEditCatDialog = (id, name, currentImage) => {
        let editImg = currentImage || '';
        const editOverlay = document.createElement('div');
        editOverlay.className = 'modal-overlay active';
        editOverlay.style.zIndex = '10005';
        editOverlay.innerHTML = `
          <div class="modal animate" style="max-width:440px;">
            <div class="modal-header">
              <h3>✏️ Edit Category: ${H.escapeHtml(name)}</h3>
              <button class="modal-close" id="btn-close-edit-cat">&times;</button>
            </div>
            <div class="modal-body" style="padding:18px 24px;">
              <div class="form-group mb-2">
                <label class="form-label" style="font-weight:700;">Category Name</label>
                <input type="text" class="form-input" id="edit-cat-name" value="${H.escapeHtml(name)}">
              </div>
              <div class="form-group mb-0">
                <label class="form-label" style="font-weight:700;">Category Image (for New Order list)</label>
                <div style="display:flex; gap:12px; align-items:center; background:#F8FAFC; padding:10px; border-radius:8px; border:1px solid #E2E8F0;">
                  <div id="edit-cat-preview" style="width:50px; height:50px; border-radius:8px; border:1px solid #CBD5E1; overflow:hidden; background:#FFF; display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0;">
                    ${editImg ? `<img src="${editImg}" style="width:100%; height:100%; object-fit:cover;">` : getFallbackCatEmoji(name)}
                  </div>
                  <div style="flex:1; display:flex; flex-direction:column; gap:6px;">
                    <div style="display:flex; gap:6px;">
                      <button type="button" class="btn btn-secondary btn-xs" id="btn-edit-cat-gallery" style="font-weight:600;">🖼️ Gallery</button>
                      <button type="button" class="btn btn-secondary btn-xs" id="btn-edit-cat-device" style="font-weight:600;">📤 Upload</button>
                      <button type="button" class="btn btn-secondary btn-xs" id="btn-edit-cat-clear" style="color:#EF4444;">✕</button>
                    </div>
                    <input type="text" class="form-input" id="edit-cat-img-url" placeholder="Image URL..." value="${H.escapeHtml(editImg)}" style="height:28px; font-size:11px;">
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer" style="padding:12px 24px;">
              <button class="btn btn-secondary" id="btn-cancel-edit-cat">Cancel</button>
              <button class="btn btn-primary" id="btn-save-edit-cat" style="background:#10B981; border-color:#10B981;">Save Changes</button>
            </div>
          </div>
        `;
        document.body.appendChild(editOverlay);

        const closeEdit = () => editOverlay.remove();
        editOverlay.querySelector('#btn-close-edit-cat').onclick = closeEdit;
        editOverlay.querySelector('#btn-cancel-edit-cat').onclick = closeEdit;

        const previewEl = editOverlay.querySelector('#edit-cat-preview');
        const urlInput = editOverlay.querySelector('#edit-cat-img-url');
        const updateEditImg = (url) => {
          editImg = url;
          urlInput.value = url;
          previewEl.innerHTML = url 
            ? `<img src="${url}" style="width:100%; height:100%; object-fit:cover;">` 
            : getFallbackCatEmoji(editOverlay.querySelector('#edit-cat-name').value);
        };

        editOverlay.querySelector('#btn-edit-cat-gallery').onclick = () => {
          H.openMediaPicker({
            title: 'Choose Category Image from Gallery',
            folderName: 'Categories',
            folderId: 'folder_categories',
            activeTab: 'gallery',
            onSelect: (url) => updateEditImg(url)
          });
        };

        editOverlay.querySelector('#btn-edit-cat-device').onclick = () => {
          H.openMediaPicker({
            title: 'Upload Category Image from Device',
            folderName: 'Categories',
            folderId: 'folder_categories',
            activeTab: 'upload',
            onSelect: (url) => updateEditImg(url)
          });
        };

        editOverlay.querySelector('#btn-edit-cat-clear').onclick = () => updateEditImg('');
        urlInput.oninput = (e) => updateEditImg(e.target.value.trim());

        editOverlay.querySelector('#btn-save-edit-cat').onclick = async () => {
          const newName = editOverlay.querySelector('#edit-cat-name').value.trim();
          if (!newName) {
            H.showToast('Please enter category name', 'warning');
            return;
          }
          await fetch(`/api/categories/${id}`, {
            method: 'PUT',
            headers: S.getHeaders(),
            body: JSON.stringify({ name: newName, image: editImg })
          });
          H.showToast('Category updated successfully!', 'success');
          closeEdit();
          renderCatsList();
        };
      };

      const modalHtml = `
        <div class="modal" id="modal-menu-cats" style="max-width:520px;">
          <div class="modal-header">
            <h3>📂 Menu Categories & Display Images</h3>
            <button class="modal-close" id="btn-close-menu-cats">&times;</button>
          </div>
          <div class="modal-body" style="padding:18px 24px;">
            <p style="font-size:12px; color:#64748B; margin-top:0; margin-bottom:12px;">
              Categories appear on the New Order left category rail. You can set a custom photo or logo for each category.
            </p>

            <!-- Add Category Card -->
            <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:12px 14px; margin-bottom:16px;">
              <div style="font-weight:700; font-size:12px; text-transform:uppercase; color:#475569; margin-bottom:8px;">+ Add New Category</div>
              <div style="display:flex; gap:8px; margin-bottom:8px;">
                <input type="text" class="form-input" id="new-menu-cat-name" placeholder="Category Name (e.g. Pasta, Platters)..." style="flex:1;">
              </div>
              <div style="display:flex; gap:12px; align-items:center;">
                <div id="new-cat-preview" style="width:42px; height:42px; border-radius:8px; border:1px solid #CBD5E1; overflow:hidden; background:#FFF; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0;">
                  📁
                </div>
                <div style="flex:1; display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                  <button type="button" class="btn btn-secondary btn-xs" id="btn-new-cat-gallery" style="font-weight:600;">🖼️ Choose from Gallery</button>
                  <button type="button" class="btn btn-secondary btn-xs" id="btn-new-cat-device" style="font-weight:600;">📤 Upload from Device</button>
                  <button type="button" class="btn btn-secondary btn-xs" id="btn-new-cat-clear" style="color:#EF4444;" title="Clear Image">✕</button>
                  <button class="btn btn-primary btn-sm" id="btn-add-menu-cat" style="margin-left:auto; background:#10B981; border-color:#10B981; font-weight:700;">+ Add Category</button>
                </div>
              </div>
            </div>

            <!-- Existing Categories List -->
            <div style="font-weight:700; font-size:12px; text-transform:uppercase; color:#475569; margin-bottom:8px;">Existing Categories</div>
            <div id="modal-cats-list" style="max-height:260px; overflow-y:auto;">Loading...</div>
          </div>
          <div class="modal-footer" style="padding:12px 24px;">
            <button class="btn btn-secondary" id="btn-done-menu-cats">Done</button>
          </div>
        </div>
      `;

      H.showModal(modalHtml);
      renderCatsList();

      const previewEl = document.getElementById('new-cat-preview');
      const updateNewCatImg = (url) => {
        pendingCatImage = url;
        previewEl.innerHTML = url 
          ? `<img src="${url}" style="width:100%; height:100%; object-fit:cover;">` 
          : '📁';
      };

      document.getElementById('btn-new-cat-gallery').onclick = () => {
        H.openMediaPicker({
          title: 'Choose Category Image from Gallery',
          folderName: 'Categories',
          folderId: 'folder_categories',
          activeTab: 'gallery',
          onSelect: (url) => updateNewCatImg(url)
        });
      };

      document.getElementById('btn-new-cat-device').onclick = () => {
        H.openMediaPicker({
          title: 'Upload Category Image from Device',
          folderName: 'Categories',
          folderId: 'folder_categories',
          activeTab: 'upload',
          onSelect: (url) => updateNewCatImg(url)
        });
      };

      document.getElementById('btn-new-cat-clear').onclick = () => updateNewCatImg('');

      document.getElementById('btn-close-menu-cats').onclick = () => H.hideModal();
      document.getElementById('btn-done-menu-cats').onclick = () => {
        H.hideModal();
        this.render();
      };

      document.getElementById('btn-add-menu-cat').onclick = async () => {
        const input = document.getElementById('new-menu-cat-name');
        const name = input.value.trim();
        if (!name) {
          H.showToast('Please enter category name', 'warning');
          return;
        }
        const id = 'cat_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        await fetch('/api/categories', {
          method: 'POST',
          headers: S.getHeaders(),
          body: JSON.stringify({ id, name, image: pendingCatImage })
        });
        input.value = '';
        updateNewCatImg('');
        H.showToast('Category created!', 'success');
        renderCatsList();
      };
    }
  };

  window.POS = window.POS || {};
  window.POS.Products = Products;
})();
