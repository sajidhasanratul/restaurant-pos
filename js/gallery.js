(function () {
  'use strict';

  const Gallery = {
    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;
      const currentUser = S.getCurrentUser();
      const canDelete = currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager');

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <h2 class="page-title">🖼️ Product Image Gallery</h2>
            <p class="page-subtitle">Browse all uploaded product images and manage catalog photos from a single location.</p>
          </div>
        </div>

        <div class="card fade-in" style="margin-top:20px;">
          <div class="card-body" style="padding:24px;">
            <div id="gallery-container" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:20px;">
              <div style="grid-column: 1/-1; text-align:center; padding:40px; color:#64748b; font-style:italic;">
                Loading product gallery images...
              </div>
            </div>
          </div>
        </div>
      `;

      await this.updateList();
    },

    async updateList() {
      const S = POS.Store;
      const H = POS.Helpers;
      const currentUser = S.getCurrentUser();
      const canDelete = currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager');

      const container = document.getElementById('gallery-container');
      if (!container) return;

      try {
        const res = await fetch(`${window.location.origin}/api/products?includeTrashed=true`, {
          headers: S.getHeaders()
        });
        const products = await res.json();
        
        // Filter products that have valid images
        const galleryItems = products.filter(p => p.image && p.image.trim() !== '');

        if (galleryItems.length === 0) {
          container.innerHTML = `
            <div style="grid-column: 1/-1; text-align:center; padding:60px 20px; color:#94a3b8;">
              <span style="font-size:48px; display:block; margin-bottom:12px;">🖼️</span>
              <div style="font-size:16px; font-weight:600; color:#64748b;">Gallery is Empty</div>
              <p style="font-size:13px; color:#94a3b8; margin:6px 0 0 0;">Upload images by editing products inside the Products Catalog to see them here.</p>
            </div>
          `;
          return;
        }

        container.innerHTML = galleryItems.map(p => {
          return `
            <div class="card gallery-item" style="border: 1px solid #e2e8f0; border-radius:8px; overflow:hidden; display:flex; flex-direction:column; position:relative; transition:box-shadow 0.2s;" data-id="${p.id}">
              <div style="width:100%; height:180px; background:#f8fafc; display:flex; align-items:center; justify-content:center; overflow:hidden; border-bottom:1px solid #edf2f7;">
                <img src="${p.image}" style="width:100%; height:100%; object-fit:cover;" alt="${H.esc(p.name)}">
              </div>
              <div style="padding:12px; flex:1; display:flex; flex-direction:column; justify-content:space-between; gap:8px;">
                <div>
                  <div style="font-weight:700; font-size:13px; color:#1e293b; line-height:1.4;" class="text-ellipsis">${H.esc(p.name)}</div>
                  <div style="font-family:monospace; font-size:11px; color:#64748b; margin-top:2px;">SKU: ${H.esc(p.sku)}</div>
                </div>
                ${canDelete ? `
                  <button class="btn btn-secondary btn-sm btn-delete-gallery-image" data-id="${p.id}" style="width:100%; border-color:#fee2e2; color:#ef4444; background:#fff5f5; display:flex; align-items:center; justify-content:center; gap:6px; font-weight:600; font-size:12px; padding:6px;">
                    🗑️ Remove Photo
                  </button>
                ` : ''}
              </div>
            </div>
          `;
        }).join('');

        // Bind delete action
        if (canDelete) {
          container.querySelectorAll('.btn-delete-gallery-image').forEach(btn => {
            btn.onclick = async () => {
              const pid = btn.dataset.id;
              const item = galleryItems.find(p => p.id === pid);
              if (!item) return;

              if (await H.confirm(`Are you sure you want to permanently delete the image for "${item.name}"?`)) {
                btn.disabled = true;
                btn.innerText = 'Deleting...';

                try {
                  const delRes = await fetch(`${window.location.origin}/api/products/${pid}/image`, {
                    method: 'DELETE',
                    headers: S.getHeaders()
                  });
                  const delData = await delRes.json();
                  if (delData.success) {
                    H.showToast(`Image for "${item.name}" removed successfully.`);
                    await this.updateList();
                  } else {
                    H.showToast(delData.error || 'Failed to remove image', 'error');
                    btn.disabled = false;
                    btn.innerHTML = '🗑️ Remove Photo';
                  }
                } catch (err) {
                  console.error(err);
                  H.showToast('Network error removing image', 'error');
                  btn.disabled = false;
                  btn.innerHTML = '🗑️ Remove Photo';
                }
              }
            };
          });
        }
      } catch (err) {
        console.error(err);
        container.innerHTML = `
          <div style="grid-column: 1/-1; text-align:center; padding:40px; color:#ef4444; font-weight:600;">
            ⚠️ Network error loading product images.
          </div>
        `;
      }
    }
  };

  window.POS = window.POS || {};
  window.POS.Gallery = Gallery;
})();
