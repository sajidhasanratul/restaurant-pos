(function () {
  'use strict';

  const Gallery = {
    currentFolderId: 'all',
    folders: [],
    images: [],
    searchQuery: '',

    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <h2 class="page-title">🖼️ Media & Photo Gallery</h2>
            <p class="page-subtitle">Organize, upload, move and manage product photos and expense receipt documents by folders.</p>
          </div>
          <div class="page-actions" style="display:flex; gap:8px;">
            <button class="btn btn-secondary btn-sm" id="btn-create-folder">📁 + New Folder</button>
            <button class="btn btn-primary btn-sm" id="btn-upload-photos">📤 + Upload Photos</button>
            <input type="file" id="gallery-multi-upload-input" accept="image/*" multiple style="display:none;">
          </div>
        </div>

        <div class="fade-in" style="display:flex; gap:20px; margin-top:16px; flex-wrap:wrap;">
          <!-- Folders Sidebar -->
          <div style="width:260px; min-width:240px; display:flex; flex-direction:column; gap:8px;">
            <div class="card" style="padding:12px;">
              <div style="font-weight:700; font-size:13px; color:#475569; text-transform:uppercase; letter-spacing:0.5px; padding-bottom:8px; border-bottom:1px solid var(--border); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                <span>Folders</span>
                <span id="gallery-total-badge" class="badge badge-secondary" style="font-size:10px;">0 Files</span>
              </div>
              <div id="gallery-folders-list" style="display:flex; flex-direction:column; gap:4px; max-height:420px; overflow-y:auto;">
                <div style="padding:12px; text-align:center; color:#94a3b8; font-size:12px;">Loading folders...</div>
              </div>
            </div>
          </div>

          <!-- Main Photos View -->
          <div style="flex:1; min-width:320px; display:flex; flex-direction:column; gap:12px;">
            <!-- Filter & Search Bar -->
            <div class="card" style="padding:12px 16px;">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span id="current-folder-title" style="font-weight:700; font-size:16px; color:#1e293b;">All Photos</span>
                  <span id="current-folder-count" class="badge" style="background:#e0e7ff; color:#4338ca; font-weight:600;">0 Photos</span>
                  <button id="btn-delete-current-folder" class="btn btn-secondary btn-sm" style="display:none; color:var(--danger); border-color:#fecaca; padding:2px 8px; font-size:11px;" title="Delete this folder">🗑️ Delete Folder</button>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="text" id="gallery-search-input" class="form-input" placeholder="Search photos..." style="width:200px; height:32px; font-size:12px;">
                </div>
              </div>
            </div>

            <!-- Photos Grid -->
            <div id="gallery-images-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap:14px; min-height:280px;">
              <div style="grid-column: 1/-1; text-align:center; padding:50px; color:#94a3b8; font-style:italic;">
                Loading photos...
              </div>
            </div>
          </div>
        </div>

        <!-- Global Move Modal Container -->
        <div class="modal-overlay" id="gallery-move-modal-overlay"></div>
      `;

      // Bind events
      document.getElementById('btn-create-folder').onclick = () => this.promptCreateFolder();
      
      const fileInput = document.getElementById('gallery-multi-upload-input');
      document.getElementById('btn-upload-photos').onclick = () => fileInput.click();

      fileInput.onchange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.handleMultiUpload(Array.from(e.target.files));
        }
      };

      document.getElementById('gallery-search-input').oninput = (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderImagesGrid();
      };

      document.getElementById('btn-delete-current-folder').onclick = () => this.deleteCurrentFolder();

      // Load data
      await this.loadAll();
    },

    async loadAll() {
      await this.loadFolders();
      await this.loadImages();
    },

    async loadFolders() {
      try {
        const res = await fetch('/api/gallery/folders');
        this.folders = await res.json();
        this.renderFoldersList();
      } catch (err) {
        console.error('Failed to load gallery folders:', err);
      }
    },

    async loadImages() {
      try {
        const query = this.currentFolderId && this.currentFolderId !== 'all' ? `?folderId=${this.currentFolderId}` : '';
        const res = await fetch(`/api/gallery/images${query}`);
        this.images = await res.json();
        this.renderImagesGrid();
      } catch (err) {
        console.error('Failed to load gallery images:', err);
      }
    },

    renderFoldersList() {
      const container = document.getElementById('gallery-folders-list');
      const badge = document.getElementById('gallery-total-badge');
      if (!container) return;

      const totalPhotos = this.folders.reduce((s, f) => s + (parseInt(f.imageCount, 10) || 0), 0);
      if (badge) badge.textContent = `${totalPhotos} Photos`;

      let html = `
        <div class="gallery-folder-item ${this.currentFolderId === 'all' ? 'active' : ''}" data-id="all" style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; border-radius:6px; cursor:pointer; background:${this.currentFolderId === 'all' ? '#ede9fe' : 'transparent'}; color:${this.currentFolderId === 'all' ? '#5b21b6' : '#334155'}; font-weight:${this.currentFolderId === 'all' ? '700' : '500'}; font-size:13px; transition:all 0.15s;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span>📁</span> <span>All Photos</span>
          </div>
          <span style="font-size:11px; background:${this.currentFolderId === 'all' ? '#ddd6fe' : '#f1f5f9'}; padding:2px 6px; border-radius:10px; font-weight:600;">${totalPhotos}</span>
        </div>
      `;

      this.folders.forEach(f => {
        const isActive = this.currentFolderId === f.id;
        html += `
          <div class="gallery-folder-item ${isActive ? 'active' : ''}" data-id="${f.id}" style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; border-radius:6px; cursor:pointer; background:${isActive ? '#ede9fe' : 'transparent'}; color:${isActive ? '#5b21b6' : '#334155'}; font-weight:${isActive ? '700' : '500'}; font-size:13px; transition:all 0.15s;">
            <div style="display:flex; align-items:center; gap:8px; overflow:hidden;">
              <span>📁</span> <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${POS.Helpers.esc(f.name)}</span>
            </div>
            <span style="font-size:11px; background:${isActive ? '#ddd6fe' : '#f1f5f9'}; padding:2px 6px; border-radius:10px; font-weight:600;">${f.imageCount || 0}</span>
          </div>
        `;
      });

      container.innerHTML = html;

      // Bind folder selection
      container.querySelectorAll('.gallery-folder-item').forEach(item => {
        item.onclick = async () => {
          this.currentFolderId = item.dataset.id;
          this.updateFolderHeader();
          this.renderFoldersList();
          await this.loadImages();
        };
      });

      this.updateFolderHeader();
    },

    updateFolderHeader() {
      const titleEl = document.getElementById('current-folder-title');
      const countEl = document.getElementById('current-folder-count');
      const delBtn = document.getElementById('btn-delete-current-folder');

      if (!titleEl || !countEl) return;

      if (this.currentFolderId === 'all') {
        titleEl.textContent = 'All Photos';
        countEl.textContent = `${this.images.length} Photos`;
        if (delBtn) delBtn.style.display = 'none';
      } else {
        const f = this.folders.find(fold => fold.id === this.currentFolderId);
        titleEl.textContent = f ? f.name : 'Folder Photos';
        countEl.textContent = `${this.images.length} Photos`;
        if (delBtn) {
          delBtn.style.display = (this.currentFolderId !== 'default') ? 'inline-block' : 'none';
        }
      }
    },

    renderImagesGrid() {
      const container = document.getElementById('gallery-images-grid');
      const H = POS.Helpers;
      if (!container) return;

      let filtered = this.images;
      if (this.searchQuery) {
        filtered = filtered.filter(i => (i.name || '').toLowerCase().includes(this.searchQuery));
      }

      this.updateFolderHeader();

      if (filtered.length === 0) {
        container.innerHTML = `
          <div style="grid-column: 1/-1; text-align:center; padding:60px 20px; background:#fff; border:1px dashed #cbd5e1; border-radius:8px;">
            <div style="font-size:36px; margin-bottom:8px;">🖼️</div>
            <div style="font-weight:700; font-size:15px; color:#475569;">No Photos Found</div>
            <p style="font-size:13px; color:#94a3b8; margin:6px 0 16px 0;">
              ${this.searchQuery ? 'No images matched your search keywords.' : 'This folder is currently empty. Upload photos from your device above.'}
            </p>
            <button class="btn btn-primary btn-sm" onclick="document.getElementById('gallery-multi-upload-input').click()">+ Upload Photos</button>
          </div>
        `;
        return;
      }

      container.innerHTML = filtered.map(img => {
        const folderObj = this.folders.find(f => f.id === img.folder_id);
        const folderName = folderObj ? folderObj.name : 'Default';

        return `
          <div class="card gallery-photo-card" data-id="${img.id}" style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; display:flex; flex-direction:column; background:#fff; transition:box-shadow 0.15s; position:relative;">
            <div class="photo-thumb-wrap" style="width:100%; height:130px; background:#f8fafc; overflow:hidden; position:relative; display:flex; align-items:center; justify-content:center; cursor:pointer;" title="Click to view full image">
              <img src="${img.data}" alt="${H.esc(img.name)}" style="width:100%; height:100%; object-fit:cover;">
              <div style="position:absolute; bottom:4px; right:4px; background:rgba(15,23,42,0.7); color:#fff; font-size:10px; padding:1px 5px; border-radius:4px;">
                ${img.size || ''}
              </div>
            </div>
            <div style="padding:8px 10px; display:flex; flex-direction:column; gap:6px; flex:1; justify-content:space-between;">
              <div>
                <div style="font-weight:600; font-size:12px; color:#1e293b; line-height:1.3; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${H.esc(img.name)}">${H.esc(img.name)}</div>
                <div style="font-size:11px; color:#64748b; margin-top:2px;">📁 ${H.esc(folderName)}</div>
              </div>
              <div style="display:flex; gap:4px; border-top:1px solid #f1f5f9; padding-top:6px; margin-top:2px;">
                <button type="button" class="btn btn-secondary btn-sm btn-move-image" data-id="${img.id}" style="flex:1; padding:3px 4px; font-size:11px;" title="Move photo to another folder">
                  ↔ Move
                </button>
                <button type="button" class="btn btn-secondary btn-sm btn-delete-image" data-id="${img.id}" style="color:var(--danger); border-color:#fee2e2; padding:3px 8px; font-size:11px;" title="Delete this photo">
                  🗑️
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      // Bind actions on photo cards
      container.querySelectorAll('.gallery-photo-card').forEach(card => {
        const id = card.dataset.id;
        const img = filtered.find(i => i.id === id);
        if (!img) return;

        // Click on thumbnail opens full image
        card.querySelector('.photo-thumb-wrap').onclick = () => {
          H.previewImage(img.data, img.name);
        };

        // Move button
        card.querySelector('.btn-move-image').onclick = (e) => {
          e.stopPropagation();
          this.showMoveModal(img);
        };

        // Delete button
        card.querySelector('.btn-delete-image').onclick = async (e) => {
          e.stopPropagation();
          if (await H.confirm(`Permanently delete photo "${img.name}"?`)) {
            try {
              const res = await fetch(`/api/gallery/images/${img.id}`, { method: 'DELETE' });
              const data = await res.json();
              if (data.success) {
                H.showToast('Photo deleted.');
                await this.loadAll();
              } else {
                H.showToast(data.error || 'Could not delete photo', 'error');
              }
            } catch (err) {
              H.showToast('Error deleting photo: ' + err.message, 'error');
            }
          }
        };
      });
    },

    async promptCreateFolder() {
      const H = POS.Helpers;
      const name = await H.prompt('Enter new gallery folder name:');
      if (!name || !name.trim()) return;

      try {
        const res = await fetch('/api/gallery/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() })
        });
        const data = await res.json();
        if (data.success) {
          H.showToast(`Folder "${name.trim()}" created.`);
          this.currentFolderId = data.folder.id;
          await this.loadAll();
        } else {
          H.showToast(data.error || 'Could not create folder', 'error');
        }
      } catch (err) {
        H.showToast('Error creating folder: ' + err.message, 'error');
      }
    },

    async deleteCurrentFolder() {
      const H = POS.Helpers;
      if (this.currentFolderId === 'all' || this.currentFolderId === 'default') {
        H.showToast('Cannot delete default system folders.', 'error');
        return;
      }

      const folderObj = this.folders.find(f => f.id === this.currentFolderId);
      const name = folderObj ? folderObj.name : 'Folder';

      if (await H.confirm(`Are you sure you want to delete folder "${name}"? All photos inside will be moved to the Default Folder.`)) {
        try {
          const res = await fetch(`/api/gallery/folders/${this.currentFolderId}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            H.showToast(`Folder "${name}" deleted.`);
            this.currentFolderId = 'all';
            await this.loadAll();
          } else {
            H.showToast(data.error || 'Could not delete folder', 'error');
          }
        } catch (err) {
          H.showToast('Error deleting folder: ' + err.message, 'error');
        }
      }
    },

    showMoveModal(img) {
      const H = POS.Helpers;
      const overlay = document.getElementById('gallery-move-modal-overlay');
      if (!overlay) return;

      overlay.innerHTML = `
        <div class="modal animate" style="max-width:400px; width:90%; padding:0; overflow:hidden;">
          <div class="modal-header" style="padding:12px 16px; border-bottom:1px solid var(--border);">
            <h3 style="margin:0; font-size:15px;">↔ Move Photo to Folder</h3>
            <button class="modal-close" id="modal-close-move">&times;</button>
          </div>
          <div class="modal-body" style="padding:16px;">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px; background:#f8fafc; padding:8px; border-radius:6px; border:1px solid #e2e8f0;">
              <img src="${img.data}" style="width:45px; height:45px; object-fit:cover; border-radius:4px;">
              <div style="overflow:hidden;">
                <div style="font-size:13px; font-weight:600; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${H.esc(img.name)}</div>
                <div style="font-size:11px; color:#64748b;">${img.size || ''}</div>
              </div>
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label">Select Destination Folder:</label>
              <select id="move-dest-folder" class="form-select">
                ${this.folders.map(f => `
                  <option value="${f.id}" ${f.id === img.folder_id ? 'selected' : ''}>
                    ${H.esc(f.name)} ${f.id === img.folder_id ? '(Current)' : ''}
                  </option>
                `).join('')}
              </select>
            </div>
          </div>
          <div class="modal-footer" style="padding:10px 16px; border-top:1px solid var(--border);">
            <button class="btn btn-secondary btn-sm" id="btn-cancel-move">Cancel</button>
            <button class="btn btn-primary btn-sm" id="btn-confirm-move">Confirm Move</button>
          </div>
        </div>
      `;

      overlay.classList.add('active');

      const close = () => overlay.classList.remove('active');
      overlay.querySelector('#modal-close-move').onclick = close;
      overlay.querySelector('#btn-cancel-move').onclick = close;

      overlay.querySelector('#btn-confirm-move').onclick = async () => {
        const destFolderId = overlay.querySelector('#move-dest-folder').value;
        if (!destFolderId || destFolderId === img.folder_id) {
          close();
          return;
        }

        try {
          const res = await fetch(`/api/gallery/images/${img.id}/move`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder_id: destFolderId })
          });
          const data = await res.json();
          if (data.success) {
            H.showToast('Photo moved successfully.');
            close();
            await this.loadAll();
          } else {
            H.showToast(data.error || 'Failed to move photo', 'error');
          }
        } catch (err) {
          H.showToast('Error moving photo: ' + err.message, 'error');
        }
      };
    },

    async handleMultiUpload(files) {
      const H = POS.Helpers;
      const targetFolder = (this.currentFolderId && this.currentFolderId !== 'all') ? this.currentFolderId : 'default';

      let successCount = 0;
      H.showToast(`Uploading ${files.length} photo(s)...`);

      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        const base64 = await this.readFileAsBase64(file);
        const sizeStr = (file.size / 1024).toFixed(1) + ' KB';

        try {
          const res = await fetch('/api/gallery/images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              folder_id: targetFolder,
              name: file.name,
              data: base64,
              size: sizeStr
            })
          });
          const data = await res.json();
          if (data.success) successCount++;
        } catch (err) {
          console.error('Error uploading file:', file.name, err);
        }
      }

      H.showToast(`${successCount} photo(s) uploaded successfully.`);
      await this.loadAll();
    },

    readFileAsBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  };

  window.POS = window.POS || {};
  window.POS.Gallery = Gallery;
})();
