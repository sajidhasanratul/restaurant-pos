(function () {
  'use strict';

  const BulkScan = {
    scanMode: 'add', // 'add' or 'remove'
    scannedItems: [],
    allProductsCache: [],

    playBeepSound(success = true) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = success ? 'sine' : 'square';
        osc.frequency.setValueAtTime(success ? 880 : 300, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (success ? 0.12 : 0.25));

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + (success ? 0.12 : 0.25));
      } catch (e) {
        // audio context not allowed without interaction
      }
    },

    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

      this.scanMode = 'add';
      this.scannedItems = [];

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
              <h2 class="page-title" style="margin:0;">Bulk Stock Update</h2>
              <span class="badge" style="background:#f0fdf4; color:#16a34a; font-weight:700; border:1px solid #bbf7d0; font-size:11px; padding:3px 10px; border-radius:20px; display:inline-flex; align-items:center; gap:6px;">
                <span style="width:7px; height:7px; background:#16a34a; border-radius:50%; display:inline-block;"></span>
                Inventory intake & deduction
              </span>
            </div>
            <p class="page-subtitle" style="margin-top:4px;">Scan barcodes or search products by name, tag, and SKU to quickly update inventory stock levels.</p>
          </div>
          <div class="page-actions" style="display:flex; gap:10px; align-items:center;">
            <div style="display:inline-flex; background:#f1f5f9; padding:4px; border-radius:8px; gap:4px; border:1px solid #e2e8f0;">
              <button type="button" class="btn btn-sm" id="btn-mode-add" style="background:#16a34a; color:#fff; font-weight:700; border:none; padding:7px 16px; border-radius:6px; cursor:pointer; font-size:13px; display:inline-flex; align-items:center; gap:6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                + Add Stock
              </button>
              <button type="button" class="btn btn-sm" id="btn-mode-remove" style="background:transparent; color:#64748b; font-weight:600; border:none; padding:7px 16px; border-radius:6px; cursor:pointer; font-size:13px; display:inline-flex; align-items:center; gap:6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                - Remove Stock
              </button>
            </div>
          </div>
        </div>

        <!-- Mode Indicator Banner -->
        <div id="bulk-scan-mode-banner" class="fade-in" style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:12px 18px; margin-bottom:20px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; align-items:center; gap:10px; color:#166534; font-size:13px; font-weight:600;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <span id="bulk-scan-mode-desc">Mode: <strong>Adding Stock</strong>. Each scanned item will increase inventory count.</span>
          </div>
          <span style="font-size:12px; color:#15803d; font-weight:600;">Hardware barcode scanners & manual search ready</span>
        </div>

        <!-- Input Row -->
        <div class="card fade-in" style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:20px; margin-bottom:20px; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:18px; align-items:flex-start;">
            <!-- Field 1: Scan Barcode / SKU -->
            <div>
              <label class="form-label" style="font-weight:700; display:flex; align-items:center; gap:6px; color:#1e293b; font-size:13px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 5v14M21 5v14M7 5v14M17 5v14M11 5v14M14 5v14"/></svg>
                Scan Barcode / Enter SKU
              </label>
              <div style="display:flex; gap:8px;">
                <input type="text" class="form-input" id="bulk-scan-input" placeholder="Scan barcode or type SKU / Barcode and press Enter..." autocomplete="off" style="font-size:13px; padding:10px 14px; flex:1;">
                <button class="btn btn-primary" id="btn-bulk-scan-trigger" style="white-space:nowrap; padding:0 20px; font-weight:600;">Search</button>
              </div>
              <p style="margin:4px 0 0; font-size:11px; color:#94a3b8;">Scanner automatically hits Enter after barcode scan</p>
            </div>

            <!-- Field 2: Live Search Suggestions -->
            <div style="position:relative;">
              <label class="form-label" style="font-weight:700; display:flex; align-items:center; justify-content:space-between; color:#1e293b; font-size:13px;">
                <span style="display:flex; align-items:center; gap:6px;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                  Search Product by Name, Tag, SKU
                </span>
                <span style="font-size:11px; color:#64748b; font-weight:normal;">Live suggestions</span>
              </label>
              <div style="position:relative;">
                <input type="text" class="form-input" id="bulk-suggest-input" placeholder="Type product name, tag (e.g. summer), or SKU..." autocomplete="off" style="font-size:13px; padding:10px 34px 10px 14px;">
                <button type="button" id="bulk-suggest-clear" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; color:#94a3b8; cursor:pointer; font-size:16px; display:none; padding:4px; line-height:1;">&times;</button>
              </div>
              <p style="margin:4px 0 0; font-size:11px; color:#94a3b8;">Use Arrow keys & Enter to quickly select and add items</p>
              
              <!-- Suggestions Dropdown Menu -->
              <div id="bulk-suggest-dropdown" style="display:none; position:absolute; left:0; right:0; top:calc(100% + 4px); background:#fff; border:1px solid #cbd5e1; border-radius:10px; box-shadow:0 14px 30px -4px rgba(0,0,0,0.18); max-height:300px; overflow-y:auto; z-index:1200;"></div>
            </div>
          </div>
        </div>

        <!-- Scanned Items Table Card -->
        <div class="card fade-in" style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.03); margin-bottom:24px;">
          <div class="card-header" style="background:#f8fafc; border-bottom:1px solid #edf2f7; padding:14px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div style="font-weight:700; font-size:14px; color:#0f172a; display:flex; align-items:center; gap:8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Scanned Stock Batch
            </div>
            <div id="bulk-scan-summary" style="font-size:13px; font-weight:700; color:#475569;">
              Total Scanned Items: 0 (0 unique)
            </div>
          </div>

          <div style="overflow-x:auto;">
            <table class="data-table" style="margin:0; font-size:13px;">
              <thead>
                <tr style="background:#f8fafc;">
                  <th style="padding:12px 16px; font-weight:700; color:#475569; width:45%;">Product / Variation</th>
                  <th style="padding:12px 16px; font-weight:700; color:#475569; width:20%;">SKU / Barcode</th>
                  <th style="padding:12px 16px; font-weight:700; color:#475569; width:15%; text-align:center;">Current Stock</th>
                  <th id="th-bulk-qty-label" style="padding:12px 16px; font-weight:700; color:#475569; width:15%; text-align:center;">Qty to Add</th>
                  <th style="padding:12px 16px; font-weight:700; color:#475569; width:80px; text-align:center;">Action</th>
                </tr>
              </thead>
              <tbody id="bulk-scan-tbody">
                <tr>
                  <td colspan="5" style="padding:50px 20px; text-align:center; color:#94a3b8; font-style:italic;">
                    No items scanned yet. Start scanning barcodes or search above to update stock!
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Bottom Action Footer -->
          <div style="padding:16px 20px; border-top:1px solid #edf2f7; background:#f8fafc; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <button class="btn btn-secondary" id="btn-bulk-scan-clear" style="color:#ef4444; border-color:#fca5a5;" disabled>
              Clear List
            </button>
            <div style="display:flex; gap:10px;">
              <button class="btn btn-primary" id="btn-bulk-scan-confirm" style="background:#16a34a; border-color:#16a34a; font-weight:700; padding:10px 24px;" disabled>
                Confirm & Add to Stock
              </button>
            </div>
          </div>
        </div>
      `;

      const input = document.getElementById('bulk-scan-input');
      const tbody = document.getElementById('bulk-scan-tbody');
      const confirmBtn = document.getElementById('btn-bulk-scan-confirm');
      const clearBtn = document.getElementById('btn-bulk-scan-clear');
      const summaryText = document.getElementById('bulk-scan-summary');
      const searchBtn = document.getElementById('btn-bulk-scan-trigger');
      const btnModeAdd = document.getElementById('btn-mode-add');
      const btnModeRemove = document.getElementById('btn-mode-remove');
      const modeDesc = document.getElementById('bulk-scan-mode-desc');
      const modeBanner = document.getElementById('bulk-scan-mode-banner');
      const thQtyLabel = document.getElementById('th-bulk-qty-label');

      // Live search elements
      const suggestInput = document.getElementById('bulk-suggest-input');
      const suggestDropdown = document.getElementById('bulk-suggest-dropdown');
      const suggestClear = document.getElementById('bulk-suggest-clear');
      let activeSuggestionIndex = -1;
      let currentSuggestions = [];

      // Products search is handled server-side on demand with debounce & AbortController

      const updateModeUI = () => {
        if (this.scanMode === 'add') {
          btnModeAdd.style.background = '#16a34a';
          btnModeAdd.style.color = '#fff';
          btnModeAdd.style.fontWeight = '700';
          btnModeRemove.style.background = 'transparent';
          btnModeRemove.style.color = '#64748b';
          btnModeRemove.style.fontWeight = '600';
          modeBanner.style.background = '#f0fdf4';
          modeBanner.style.borderColor = '#bbf7d0';
          modeDesc.innerHTML = 'Mode: <strong>Adding Stock</strong>. Each scanned item will increase inventory count.';
          modeDesc.parentElement.style.color = '#166534';
          thQtyLabel.textContent = 'Qty to Add';
          confirmBtn.style.background = '#16a34a';
          confirmBtn.style.borderColor = '#16a34a';
          confirmBtn.textContent = 'Confirm & Add to Stock';
        } else {
          btnModeRemove.style.background = '#dc2626';
          btnModeRemove.style.color = '#fff';
          btnModeRemove.style.fontWeight = '700';
          btnModeAdd.style.background = 'transparent';
          btnModeAdd.style.color = '#64748b';
          btnModeAdd.style.fontWeight = '600';
          modeBanner.style.background = '#fef2f2';
          modeBanner.style.borderColor = '#fecaca';
          modeDesc.innerHTML = 'Mode: <strong>Deducting Stock</strong>. Each scanned item will reduce inventory count.';
          modeDesc.parentElement.style.color = '#991b1b';
          thQtyLabel.textContent = 'Qty to Deduct';
          confirmBtn.style.background = '#dc2626';
          confirmBtn.style.borderColor = '#dc2626';
          confirmBtn.textContent = 'Confirm & Deduct Stock';
        }
      };

      btnModeAdd.onclick = () => {
        this.scanMode = 'add';
        updateModeUI();
        input.focus();
      };

      btnModeRemove.onclick = () => {
        this.scanMode = 'remove';
        updateModeUI();
        input.focus();
      };

      setTimeout(() => input && input.focus(), 150);

      // Close suggestions on outside click
      document.addEventListener('click', (e) => {
        if (suggestDropdown && !e.target.closest('#bulk-suggest-dropdown') && !e.target.closest('#bulk-suggest-input')) {
          suggestDropdown.style.display = 'none';
        }
      });

      const renderScannedList = () => {
        if (this.scannedItems.length === 0) {
          tbody.innerHTML = `
            <tr>
              <td colspan="5" style="padding:50px 20px; text-align:center; color:#94a3b8; font-style:italic;">
                No items scanned yet. Start scanning barcodes or search above to update stock!
              </td>
            </tr>
          `;
          confirmBtn.disabled = true;
          clearBtn.disabled = true;
          summaryText.textContent = `Total Scanned Items: 0 (0 unique)`;
          return;
        }

        tbody.innerHTML = this.scannedItems.map((item, idx) => {
          return `
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="padding: 12px 16px; font-weight: 600; color: #1e293b;">${H.esc(item.name)}</td>
              <td style="padding: 12px 16px; font-family: monospace; color: #475569;">${H.esc(item.sku || item.barcode || 'N/A')}</td>
              <td style="padding: 12px 16px; text-align: center; color: #64748b; font-weight:600;">${item.currentStock}</td>
              <td style="padding: 12px 16px; text-align: center;">
                <div style="display: inline-flex; align-items: center; gap: 8px;">
                  <button class="btn-qty-minus" data-idx="${idx}" style="width:26px; height:26px; border-radius:50%; border:1px solid #cbd5e1; background:#f8fafc; color:#0f172a; font-weight:700; cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:center;">-</button>
                  <span style="font-weight:700; font-size:14px; width:34px; text-align:center;">${item.qty}</span>
                  <button class="btn-qty-plus" data-idx="${idx}" style="width:26px; height:26px; border-radius:50%; border:1px solid #cbd5e1; background:#f8fafc; color:#0f172a; font-weight:700; cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:center;">+</button>
                </div>
              </td>
              <td style="padding: 12px 16px; text-align: center;">
                <button class="btn-remove-scan" data-idx="${idx}" style="background:none; border:none; color:#ef4444; font-size:18px; cursor:pointer; padding:4px;" title="Remove">&times;</button>
              </td>
            </tr>
          `;
        }).join('');

        confirmBtn.disabled = false;
        clearBtn.disabled = false;
        const totalItems = this.scannedItems.reduce((sum, i) => sum + i.qty, 0);
        summaryText.textContent = `Total Scanned Items: ${totalItems} (${this.scannedItems.length} unique)`;

        tbody.querySelectorAll('.btn-qty-minus').forEach(btn => {
          btn.onclick = () => {
            const idx = parseInt(btn.dataset.idx);
            if (this.scannedItems[idx].qty > 1) {
              this.scannedItems[idx].qty--;
              renderScannedList();
            }
          };
        });

        tbody.querySelectorAll('.btn-qty-plus').forEach(btn => {
          btn.onclick = () => {
            const idx = parseInt(btn.dataset.idx);
            this.scannedItems[idx].qty++;
            renderScannedList();
          };
        });

        tbody.querySelectorAll('.btn-remove-scan').forEach(btn => {
          btn.onclick = () => {
            const idx = parseInt(btn.dataset.idx);
            this.scannedItems.splice(idx, 1);
            renderScannedList();
            input.focus();
          };
        });
      };

      clearBtn.onclick = () => {
        this.scannedItems = [];
        renderScannedList();
        input.focus();
      };

      const handleScanQuery = async () => {
        const query = input.value.trim();
        if (!query) return;

        input.value = '';
        input.disabled = true;

        try {
          const res = await fetch(`${window.location.origin}/api/products/resolve-scan?query=${encodeURIComponent(query)}`, {
            headers: S.getHeaders()
          });
          if (!res.ok) {
            throw new Error(`Server returned HTTP ${res.status}`);
          }
          const data = await res.json();
          if (data.success) {
            const item = data.item;
            const existing = this.scannedItems.find(i => i.id === item.id && i.type === item.type);
            if (existing) {
              existing.qty++;
            } else {
              this.scannedItems.push({
                type: item.type,
                id: item.id,
                name: item.name,
                sku: item.sku,
                barcode: item.barcode,
                currentStock: item.currentStock,
                qty: 1
              });
            }
            renderScannedList();
            this.playBeepSound(true);
          } else {
            H.showToast(data.error || 'Product not found', 'warning');
            this.playBeepSound(false);
          }
        } catch (err) {
          console.error(err);
          H.showToast('Network error scanning code', 'error');
          this.playBeepSound(false);
        } finally {
          input.disabled = false;
          input.focus();
        }
      };

      input.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleScanQuery();
        }
      };

      searchBtn.onclick = (e) => {
        e.preventDefault();
        handleScanQuery();
      };

      // Live Suggestion Search Logic
      const selectSuggestion = (idx) => {
        if (idx < 0 || idx >= currentSuggestions.length) return;
        const item = currentSuggestions[idx];

        const existing = this.scannedItems.find(i => i.id === item.id && i.type === item.type);
        if (existing) {
          existing.qty++;
        } else {
          this.scannedItems.push({
            type: item.type,
            id: item.id,
            name: item.name,
            sku: item.sku,
            barcode: item.barcode,
            currentStock: item.currentStock,
            qty: 1
          });
        }
        renderScannedList();
        this.playBeepSound(true);

        suggestInput.value = '';
        suggestDropdown.style.display = 'none';
        suggestDropdown.innerHTML = '';
        suggestClear.style.display = 'none';
        currentSuggestions = [];
        activeSuggestionIndex = -1;
        suggestInput.focus();
      };

      let bulkSearchAbortController = null;
      const searchAndRenderSuggestions = H.debounce(async () => {
        const query = suggestInput.value.trim().toLowerCase();
        if (query.length === 0) {
          if (bulkSearchAbortController) bulkSearchAbortController.abort();
          suggestDropdown.style.display = 'none';
          suggestDropdown.innerHTML = '';
          suggestClear.style.display = 'none';
          currentSuggestions = [];
          activeSuggestionIndex = -1;
          return;
        }
        suggestClear.style.display = 'block';

        if (bulkSearchAbortController) {
          bulkSearchAbortController.abort();
        }
        bulkSearchAbortController = new AbortController();

        try {
          const res = await fetch(`${window.location.origin}/api/products/search?q=${encodeURIComponent(query)}&limit=25`, {
            headers: S.getHeaders(),
            signal: bulkSearchAbortController.signal
          });
          if (!res.ok) return;
          const prods = await res.json();
          const matches = [];

          prods.forEach(p => {
            if (p.variations && p.variations.length > 0) {
              p.variations.forEach(v => {
                matches.push({
                  type: 'variation',
                  id: v.id,
                  productId: p.id,
                  name: `${p.name} (${v.name})`,
                  sku: v.sku || '',
                  barcode: v.barcode || '',
                  tag: p.tag || '',
                  currentStock: v.stock !== null && v.stock !== undefined ? parseInt(v.stock) : 0,
                  image: p.image || ''
                });
              });
            } else {
              matches.push({
                type: 'product',
                id: p.id,
                productId: p.id,
                name: p.name,
                sku: p.sku || '',
                barcode: p.barcode || '',
                tag: p.tag || '',
                currentStock: parseInt(p.stock || 0),
                image: p.image || ''
              });
            }
          });

          currentSuggestions = matches;
          activeSuggestionIndex = -1;

          if (matches.length === 0) {
            suggestDropdown.innerHTML = `
              <div style="padding:14px 16px; color:#64748b; font-size:13px; text-align:center;">
                No products found matching "<strong>${H.esc(query)}</strong>"
              </div>
            `;
            suggestDropdown.style.display = 'block';
            return;
          }

          suggestDropdown.innerHTML = matches.map((item, idx) => {
            const tagBadge = item.tag ? `<span style="display:inline-block; font-size:11px; background:#e0e7ff; color:#3730a3; padding:1px 6px; border-radius:4px; font-weight:600; margin-left:6px;">Tag: ${H.esc(item.tag)}</span>` : '';
            const stockColor = item.currentStock > 0 ? '#16a34a' : '#dc2626';
            const imgHtml = item.image
              ? `<img src="${H.esc(item.image)}" style="width:34px; height:34px; object-fit:cover; border-radius:4px; border:1px solid #e2e8f0; flex-shrink:0;">`
              : `<div style="width:34px; height:34px; background:#f1f5f9; border-radius:4px; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:16px; flex-shrink:0;">📦</div>`;

            return `
              <div class="bulk-suggest-item" data-idx="${idx}" style="padding:10px 14px; display:flex; align-items:center; justify-content:space-between; gap:10px; cursor:pointer; border-bottom:1px solid #f1f5f9; transition:background 0.15s ease;">
                <div style="display:flex; align-items:center; gap:10px; min-width:0; flex:1;">
                  ${imgHtml}
                  <div style="min-width:0; flex:1;">
                    <div style="font-weight:600; font-size:13px; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                      ${H.esc(item.name)} ${tagBadge}
                    </div>
                    <div style="font-size:11px; color:#64748b; font-family:monospace; margin-top:2px;">
                      SKU: ${H.esc(item.sku || 'N/A')} ${item.barcode ? ` | Barcode: ${H.esc(item.barcode)}` : ''}
                    </div>
                  </div>
                </div>
                <div style="text-align:right; flex-shrink:0;">
                  <div style="font-size:11px; font-weight:700; color:${stockColor};">
                    Stock: ${item.currentStock}
                  </div>
                  <button type="button" class="btn btn-sm" style="font-size:11px; padding:2px 8px; margin-top:2px; background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0; border-radius:4px; pointer-events:none;">
                    + Add
                  </button>
                </div>
              </div>
            `;
          }).join('');

          suggestDropdown.style.display = 'block';

          suggestDropdown.querySelectorAll('.bulk-suggest-item').forEach(el => {
            el.onmouseenter = () => {
              suggestDropdown.querySelectorAll('.bulk-suggest-item').forEach(i => i.style.background = '#fff');
              el.style.background = '#f8fafc';
            };
            el.onmouseleave = () => {
              el.style.background = '#fff';
            };
            el.onclick = (e) => {
              e.stopPropagation();
              const idx = parseInt(el.dataset.idx);
              selectSuggestion(idx);
            };
          });
        } catch (err) {
          if (err.name === 'AbortError') return;
          console.error('Bulk suggest search error:', err);
        }
      }, 300);

      suggestInput.oninput = () => {
        searchAndRenderSuggestions();
      };

      suggestInput.onkeydown = (e) => {
        if (currentSuggestions.length > 0 && suggestDropdown.style.display !== 'none') {
          const items = suggestDropdown.querySelectorAll('.bulk-suggest-item');
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeSuggestionIndex = (activeSuggestionIndex + 1) % currentSuggestions.length;
            items.forEach((it, i) => it.style.background = (i === activeSuggestionIndex ? '#f1f5f9' : '#fff'));
            if (items[activeSuggestionIndex]) items[activeSuggestionIndex].scrollIntoView({ block: 'nearest' });
            return;
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeSuggestionIndex = (activeSuggestionIndex - 1 + currentSuggestions.length) % currentSuggestions.length;
            items.forEach((it, i) => it.style.background = (i === activeSuggestionIndex ? '#f1f5f9' : '#fff'));
            if (items[activeSuggestionIndex]) items[activeSuggestionIndex].scrollIntoView({ block: 'nearest' });
            return;
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeSuggestionIndex >= 0 && activeSuggestionIndex < currentSuggestions.length) {
              selectSuggestion(activeSuggestionIndex);
            } else if (currentSuggestions.length === 1) {
              selectSuggestion(0);
            }
            return;
          } else if (e.key === 'Escape') {
            suggestDropdown.style.display = 'none';
            return;
          }
        }
      };

      suggestClear.onclick = (e) => {
        e.stopPropagation();
        suggestInput.value = '';
        suggestDropdown.style.display = 'none';
        suggestClear.style.display = 'none';
        currentSuggestions = [];
        suggestInput.focus();
      };

      confirmBtn.onclick = async () => {
        if (this.scannedItems.length === 0) return;

        confirmBtn.disabled = true;
        confirmBtn.innerText = 'Updating Stock...';

        try {
          const updates = this.scannedItems.map(i => ({
            type: i.type,
            id: i.id,
            qty: i.qty,
            action: this.scanMode
          }));

          const res = await fetch(`${window.location.origin}/api/products/bulk-stock-update`, {
            method: 'POST',
            headers: S.getHeaders(),
            body: JSON.stringify(updates)
          });

          const data = await res.json();
          if (data.success) {
            H.showToast(this.scanMode === 'add' 
              ? `Successfully added stock for ${this.scannedItems.length} items!` 
              : `Successfully deducted stock for ${this.scannedItems.length} items!`);
            this.scannedItems = [];
            renderScannedList();
            this.playBeepSound(true);

            // Refresh cache
            try {
              const r = await fetch(`${window.location.origin}/api/products?includeTrashed=false`, {
                headers: S.getHeaders()
              });
              if (r.ok) {
                const list = await r.json();
                this.allProductsCache = Array.isArray(list) ? list.filter(p => !p.deletedAt || p.deletedAt === '0000-00-00 00:00:00') : [];
              }
            } catch (e) {}

            input.focus();
          } else {
            H.showToast(data.error || 'Failed to update stock', 'error');
            confirmBtn.disabled = false;
            updateModeUI();
          }
        } catch (err) {
          console.error(err);
          H.showToast('Network error updating stock', 'error');
          confirmBtn.disabled = false;
          updateModeUI();
        }
      };
    }
  };

  window.POS = window.POS || {};
  BulkScan.reader = BulkScan.render;
  window.POS.BulkScan = BulkScan;
  window.BulkScan = BulkScan;
})();
