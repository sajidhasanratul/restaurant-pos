(function () {
  'use strict';

  const InventoryDetails = {
    currentPage: 1,
    perPage: 25,
    searchQuery: '',
    categoryFilter: 'all',
    statusFilter: 'all',

    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

      this.currentPage = 1;
      this.searchQuery = '';
      this.categoryFilter = 'all';
      this.statusFilter = 'all';

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <h2 class="page-title">Inventory Details</h2>
            <p class="page-subtitle">Track real-time stock levels, view valuation metrics, filter low-stock alerts, and perform searches.</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-success btn-sm" id="btn-export-inventory" style="display:inline-flex; align-items:center;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export CSV
            </button>
          </div>
        </div>

        <!-- Inventory Stats -->
        <div class="stats-grid fade-in" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:20px; margin-bottom:20px;">
          <div class="stat-card blue" style="padding: 15px;">
            <div class="stat-icon" style="display:flex; align-items:center; justify-content:center;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21 16-9 5-9-5V8l9-5 9 5v8Z"/><path d="m3.27 6.96 8.73 4.86 8.73-4.86"/><path d="M12 22.08V12"/></svg>
            </div>
            <div class="stat-info">
              <div class="stat-label">Total Unique Products</div>
              <div class="stat-value" id="inv-total-items">0</div>
            </div>
          </div>
          <div class="stat-card green" style="padding: 15px;">
            <div class="stat-icon" style="display:flex; align-items:center; justify-content:center;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
            </div>
            <div class="stat-info">
              <div class="stat-label">Total Stock Valuation</div>
              <div class="stat-value" id="inv-total-valuation">৳0.00</div>
            </div>
          </div>
          <div class="stat-card orange" style="padding: 15px;">
            <div class="stat-icon" style="display:flex; align-items:center; justify-content:center;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div class="stat-info">
              <div class="stat-label">Low Stock Alerts</div>
              <div class="stat-value" id="inv-low-alerts">0</div>
            </div>
          </div>
          <div class="stat-card red" style="padding: 15px;">
            <div class="stat-icon" style="display:flex; align-items:center; justify-content:center;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/></svg>
            </div>
            <div class="stat-info">
              <div class="stat-label">Out of Stock Items</div>
              <div class="stat-value" id="inv-out-alerts">0</div>
            </div>
          </div>
        </div>

        <!-- Filters Bar -->
        <div class="filter-bar fade-in" style="display:flex; flex-wrap:wrap; gap:16px; align-items:flex-end;">
          <div class="search-box" style="flex:2; min-width:240px;">
            <input type="text" id="inv-search" placeholder="Search by name, SKU or barcode...">
          </div>
          <div class="form-group" style="margin-bottom:0; flex:1; min-width:140px;">
            <label class="form-label" style="font-size:12px; font-weight:600;">Category</label>
            <select class="form-select" id="inv-category-filter">
              <option value="all">All Categories</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0; flex:1; min-width:140px;">
            <label class="form-label" style="font-size:12px; font-weight:600;">Stock Status</label>
            <select class="form-select" id="inv-status-filter">
              <option value="all">All Statuses</option>
              <option value="low">Low Stock Alert</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0; width:130px;">
            <label class="form-label" style="font-size:12px; font-weight:600;">Items Per Page</label>
            <select class="form-select" id="inv-per-page">
              <option value="10">10</option>
              <option value="25" selected>25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="500">500</option>
              <option value="1000">1000</option>
              <option value="all">All</option>
            </select>
          </div>
        </div>

        <!-- Inventory List Card -->
        <div class="card fade-in" style="margin-top:20px;">
          <div class="card-body" style="padding:0;">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr style="background:#f8fafc; border-bottom:1px solid #edf2f7;">
                    <th style="padding:12px 16px; text-align:left;">Item Name</th>
                    <th style="padding:12px 16px; text-align:left;">SKU Code</th>
                    <th style="padding:12px 16px; text-align:left;">Barcode</th>
                    <th style="padding:12px 16px; text-align:right;">Cost Price</th>
                    <th style="padding:12px 16px; text-align:right;">Selling Price</th>
                    <th style="padding:12px 16px; text-align:center;">Current Stock</th>
                    <th style="padding:12px 16px; text-align:center;">Alert Qty</th>
                    <th style="padding:12px 16px; text-align:right;">Stock Valuation</th>
                  </tr>
                </thead>
                <tbody id="inventory-tbody">
                  <tr>
                    <td colspan="8" style="padding:30px; text-align:center; color:#64748b; font-style:italic;">
                      Loading inventory records...
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="pagination-bar fade-in" id="inventory-pagination" style="margin-top:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <!-- Rendered via updateList -->
        </div>
      `;

      // Load Categories filter list
      const categories = await S.getAll('categories');
      const catSelect = document.getElementById('inv-category-filter');
      categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.name;
        catSelect.appendChild(opt);
      });

      // Bind Filter Handlers
      document.getElementById('inv-search').oninput = H.debounce(async (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.currentPage = 1;
        await this.updateList();
      }, 200);

      document.getElementById('inv-category-filter').onchange = async (e) => {
        this.categoryFilter = e.target.value;
        this.currentPage = 1;
        await this.updateList();
      };

      document.getElementById('inv-status-filter').onchange = async (e) => {
        this.statusFilter = e.target.value;
        this.currentPage = 1;
        await this.updateList();
      };

      document.getElementById('inv-per-page').onchange = async (e) => {
        const val = e.target.value;
        this.perPage = val === 'all' ? 'all' : (parseInt(val) || 25);
        this.currentPage = 1;
        await this.updateList();
      };

      document.getElementById('btn-export-inventory').onclick = async () => {
        const list = await this.getFilteredInventory();
        const csvData = list.map(item => ({
          'Item Name': item.fullName,
          'SKU': item.sku || 'N/A',
          'Barcode': item.barcode || 'N/A',
          'Cost Price': item.costPrice,
          'Selling Price': item.sellingPrice,
          'Current Stock': item.stock,
          'Alert Qty': item.alertQty || 0,
          'Valuation (Cost)': item.stock * item.costPrice,
          'Valuation (Selling)': item.stock * item.sellingPrice
        }));
        H.exportCSV(csvData, 'inventory_details');
      };

      // Load items
      await this.updateList();
    },

    async getFilteredInventory() {
      const S = POS.Store;
      const products = await S.getAll('products');

      // Expand main products and variations into a single row representation
      const inventoryList = [];

      products.forEach(p => {
        if (p.variations && p.variations.length > 0) {
          p.variations.forEach(v => {
            inventoryList.push({
              id: v.id,
              type: 'variation',
              productId: p.id,
              name: p.name,
              fullName: `${p.name} (${v.name})`,
              sku: v.sku,
              barcode: v.barcode,
              costPrice: parseFloat(v.costPrice) || 0,
              sellingPrice: parseFloat(v.price) || 0,
              stock: parseInt(v.stock) || 0,
              alertQty: parseInt(p.alertQty) || 0,
              categoryId: p.categoryId
            });
          });
        } else {
          inventoryList.push({
            id: p.id,
            type: 'product',
            productId: p.id,
            name: p.name,
            fullName: p.name,
            sku: p.sku,
            barcode: p.barcode,
            costPrice: parseFloat(p.costPrice) || 0,
            sellingPrice: parseFloat(p.sellingPrice) || 0,
            stock: parseInt(p.stock) || 0,
            alertQty: parseInt(p.alertQty) || 0,
            categoryId: p.categoryId
          });
        }
      });

      return inventoryList.filter(item => {
        // Search filter
        if (this.searchQuery) {
          const nameMatch = item.fullName.toLowerCase().includes(this.searchQuery);
          const skuMatch = item.sku ? item.sku.toLowerCase().includes(this.searchQuery) : false;
          const barcodeMatch = item.barcode ? item.barcode.toLowerCase().includes(this.searchQuery) : false;
          if (!nameMatch && !skuMatch && !barcodeMatch) return false;
        }

        // Category filter
        if (this.categoryFilter !== 'all' && item.categoryId !== this.categoryFilter) return false;

        // Status filter
        if (this.statusFilter === 'low' && item.stock > item.alertQty) return false;
        if (this.statusFilter === 'out' && item.stock > 0) return false;

        return true;
      });
    },

    async updateList() {
      const H = POS.Helpers;
      const list = await this.getFilteredInventory();

      // valuation based on selling price
      const totalValuation = list.reduce((sum, item) => sum + (item.stock * item.sellingPrice), 0);
      const lowStockCount = list.filter(item => item.stock <= item.alertQty && item.stock > 0).length;
      const outOfStockCount = list.filter(item => item.stock === 0).length;

      document.getElementById('inv-total-items').textContent = list.length;
      document.getElementById('inv-total-valuation').textContent = H.formatCurrency(totalValuation);
      document.getElementById('inv-low-alerts').textContent = lowStockCount;
      document.getElementById('inv-out-alerts').textContent = outOfStockCount;

      const tbody = document.getElementById('inventory-tbody');
      const paginationEl = document.getElementById('inventory-pagination');
      tbody.innerHTML = '';

      if (list.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" style="padding:40px 20px; text-align:center; color:#94a3b8;">
              <div style="font-size:15px; font-weight:600; margin-bottom:6px; color:#475569;">No matching inventory items found.</div>
              <div style="font-size:13px; color:#94a3b8; margin-bottom:16px;">
                If your database contains products that are not displaying here, click below to run a self-healing repair.
              </div>
              <button class="btn btn-primary btn-sm" id="btn-fix-inv-db" style="display:inline-flex; align-items:center; gap:6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                Auto-Repair Products Database
              </button>
            </td>
          </tr>
        `;
        const btnFix = document.getElementById('btn-fix-inv-db');
        if (btnFix) {
          btnFix.onclick = async () => {
            btnFix.disabled = true;
            btnFix.textContent = 'Repairing...';
            try {
              const res = await fetch(`${window.location.origin}/api/system/fix-products`);
              const data = await res.json();
              if (data.success) {
                alert(`✅ Database Repair Successful!\n\nTotal products found: ${data.counts.totalProducts}\nActive products visible: ${data.counts.activeProducts}\n\nThe inventory will now reload.`);
                this.currentPage = 1;
                await this.updateList();
              } else {
                alert(`❌ Repair failed: ${data.error || 'Unknown error'}`);
              }
            } catch (err) {
              alert(`❌ Network error calling self-repair: ${err.message}`);
            }
          };
        }
        if (paginationEl) paginationEl.innerHTML = '';
        return;
      }

      // Pagination calculation
      const totalItems = list.length;
      let pageItems = list;
      let totalPages = 1;
      let startIndex = 0;

      if (this.perPage !== 'all') {
        const perPageNum = parseInt(this.perPage) || 25;
        totalPages = Math.ceil(totalItems / perPageNum) || 1;
        if (this.currentPage > totalPages) this.currentPage = totalPages;
        if (this.currentPage < 1) this.currentPage = 1;

        startIndex = (this.currentPage - 1) * perPageNum;
        pageItems = list.slice(startIndex, startIndex + perPageNum);
      }

      pageItems.forEach(item => {
        let stockStyle = 'color:#16a34a; font-weight:700;'; // green
        let rowStyle = '';
        if (item.stock === 0) {
          stockStyle = 'color:#ef4444; font-weight:700; background:#fef2f2; padding:2px 8px; border-radius:4px;'; // red box
          rowStyle = 'background:#fcfcfc;';
        } else if (item.stock <= item.alertQty) {
          stockStyle = 'color:#ea580c; font-weight:700; background:#fff7ed; padding:2px 8px; border-radius:4px;'; // orange box
        }

        tbody.innerHTML += `
          <tr style="border-bottom:1px solid #edf2f7; ${rowStyle}">
            <td style="padding:12px 16px; font-weight:600; color:#1e293b;">${H.esc(item.fullName)}</td>
            <td style="padding:12px 16px; font-family:monospace; color:#475569;">${H.esc(item.sku || 'N/A')}</td>
            <td style="padding:12px 16px; font-family:monospace; color:#475569;">${H.esc(item.barcode || 'N/A')}</td>
            <td style="padding:12px 16px; text-align:right; color:#64748b;">${H.formatCurrency(item.costPrice)}</td>
            <td style="padding:12px 16px; text-align:right; color:#1e293b; font-weight:500;">${H.formatCurrency(item.sellingPrice)}</td>
            <td style="padding:12px 16px; text-align:center;">
              <span style="${stockStyle}">${item.stock}</span>
            </td>
            <td style="padding:12px 16px; text-align:center; color:#94a3b8;">${item.alertQty}</td>
            <td style="padding:12px 16px; text-align:right; font-weight:600; color:#0f172a;">${H.formatCurrency(item.stock * item.sellingPrice)}</td>
          </tr>
        `;
      });

      // Render Pagination Bar
      if (paginationEl) {
        if (this.perPage === 'all' || totalPages <= 1) {
          paginationEl.innerHTML = `
            <div style="font-size:12px; color:#718096; font-weight:600;">
              Showing all ${totalItems} items
            </div>
          `;
        } else {
          const endIndex = Math.min(startIndex + (parseInt(this.perPage) || 25), totalItems);
          let pagHtml = `
            <div style="font-size:12px; color:#718096; font-weight:600;">
              Showing ${startIndex + 1} - ${endIndex} of ${totalItems} items
            </div>
            <div style="display:flex; gap:6px; align-items:center;">
          `;

          if (this.currentPage > 1) {
            pagHtml += `<button class="btn btn-secondary btn-sm" id="btn-inv-prev" style="padding:4px 10px;">◀ Prev</button>`;
          }
          pagHtml += `<span style="font-size:13px; font-weight:700; color:#4a5568; margin:0 8px;">Page ${this.currentPage} of ${totalPages}</span>`;
          if (this.currentPage < totalPages) {
            pagHtml += `<button class="btn btn-secondary btn-sm" id="btn-inv-next" style="padding:4px 10px;">Next ▶</button>`;
          }
          pagHtml += `</div>`;
          paginationEl.innerHTML = pagHtml;

          const prevBtn = document.getElementById('btn-inv-prev');
          if (prevBtn) {
            prevBtn.onclick = async () => {
              this.currentPage--;
              await this.updateList();
            };
          }
          const nextBtn = document.getElementById('btn-inv-next');
          if (nextBtn) {
            nextBtn.onclick = async () => {
              this.currentPage++;
              await this.updateList();
            };
          }
        }
      }
    }
  };

  // Attach both to window.POS and global window, plus reader alias to prevent typo/caching crashes
  window.POS = window.POS || {};
  InventoryDetails.reader = InventoryDetails.render;
  window.POS.InventoryDetails = InventoryDetails;
  window.InventoryDetails = InventoryDetails;
})();
