import { db } from '../lib/supabase.js';
import { renderNavbar } from '../components/navigation.js';
import { formatCurrency, showNotification, showLoading, hideLoading, createModal } from '../utils/helpers.js';

export async function renderAdminCatalogPage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    ${renderNavbar()}
    
    <div class="page">
      <div class="container">
        <div class="flex justify-between items-center mb-lg">
          <div>
            <h1>📦 Manajemen Katalog</h1>
            <p style="color: var(--text-muted);">Kelola produk yang tampil di aplikasi karyawan</p>
          </div>
          <button class="btn btn-primary" id="add-product-btn">
            <span>➕ Tambah Produk</span>
          </button>
        </div>

        <div class="card">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th style="width: 80px;">Gambar</th>
                  <th>Produk</th>
                  <th>Harga</th>
                  <th style="width: 100px;">Aksi</th>
                </tr>
              </thead>
              <tbody id="products-table">
                <tr><td colspan="4" class="text-center p-3">Memuat...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  await loadAdminProducts();

  document.getElementById('add-product-btn').addEventListener('click', () => openProductModal());
}

async function loadAdminProducts() {
  const tbody = document.getElementById('products-table');

  try {
    const { data: products, error } = await db.getProducts();
    if (error) throw error;

    if (products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center p-3 text-muted">Belum ada produk.</td></tr>`;
      return;
    }

    tbody.innerHTML = products.map(p => `
      <tr>
        <td>
          <img src="${p.image_url || 'https://via.placeholder.com/50'}" 
               style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px; background: #333;">
        </td>
        <td>
          <strong>${p.name}</strong>
          <div class="text-small text-muted truncate" style="max-width: 200px;">${p.description || '-'}</div>
        </td>
        <td>${formatCurrency(p.price)}</td>
        <td>
          <div class="flex gap-2">
            <button class="btn btn-outline btn-small btn-edit" data-id="${p.id}">✏️</button>
            <button class="btn btn-danger btn-small btn-delete" data-id="${p.id}">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');

    // Attach event listeners dynamically
    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const product = products.find(p => p.id === btn.dataset.id);
        openProductModal(product);
      });
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
    });

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="4" class="text-danger p-3">Gagal memuat.</td></tr>`;
  }
}

async function openProductModal(product = null) {
  const isEdit = !!product;
  const modalId = 'product-modal-' + Date.now();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = modalId;

  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">${isEdit ? '✏️ Edit Produk' : '➕ Tambah Produk Baru'}</h3>
        <button class="modal-close" onclick="document.getElementById('${modalId}').remove()">&times;</button>
      </div>
      <div class="modal-body">
        <form id="product-form-custom">
            <div class="form-group">
            <label class="form-label">Nama Produk</label>
            <input type="text" id="p-name" class="form-input" required value="${product ? product.name : ''}">
            </div>
            
            <div class="form-group">
            <label class="form-label">Harga (Rp)</label>
            <input type="number" id="p-price" class="form-input" required value="${product ? product.price : ''}">
            </div>
            
            <div class="form-group">
            <label class="form-label">Deskripsi</label>
            <textarea id="p-desc" class="form-textarea" rows="3">${product ? product.description || '' : ''}</textarea>
            </div>

            <div class="form-group">
            <label class="form-label">Gambar Produk</label>
            ${isEdit && product.image_url ? `<div class="mb-sm"><img src="${product.image_url}" style="height: 60px; border-radius: 4px;"></div>` : ''}
            <input type="file" id="p-image" class="form-input" accept="image/*">
            <small class="text-muted">Biarkan kosong jika tidak ingin mengubah gambar (mode edit).</small>
            </div>

            <div class="flex gap-2 justify-end mt-lg">
                <button type="button" class="btn btn-outline" onclick="document.getElementById('${modalId}').remove()">Batal</button>
                <button type="submit" class="btn btn-primary" id="btn-save-product">Simpan</button>
            </div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Directly attach event listener to the form element we just created
  const form = overlay.querySelector('#product-form-custom');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSaveProduct(isEdit ? product.id : null, modalId);
  });
}

async function handleSaveProduct(id, modalId) {
  // Scope DOM selection to the specific modal
  const modal = document.getElementById(modalId);
  if (!modal) return; // Safety check

  const name = modal.querySelector('#p-name').value;
  const price = modal.querySelector('#p-price').value;
  const description = modal.querySelector('#p-desc').value;
  const imageInput = modal.querySelector('#p-image');
  const imageFile = imageInput?.files[0];
  const btnSave = modal.querySelector('#btn-save-product');

  if (!name || !price) {
    showNotification('Nama dan Harga wajib diisi', 'warning');
    return;
  }

  // Interactive Loading State
  const originalText = btnSave.innerHTML;
  if (btnSave) {
    btnSave.disabled = true;
    btnSave.innerHTML = `⏳ Menyimpan...`;
  }

  showLoading('Menyimpan produk...');

  try {
    let imageUrl = null;

    // Upload image if selected
    if (imageFile) {
      // Validation removed to allow auto-compression
      // if (imageFile.size > 2 * 1024 * 1024) throw new Error('Maksimal ukuran gambar 2MB');

      const { data, error } = await db.uploadProductImage(imageFile);
      if (error) throw error;
      imageUrl = data;
    }

    const payload = {
      name,
      price: parseFloat(price),
      description
    };

    if (imageUrl) payload.image_url = imageUrl;

    console.log('Sending Payload:', payload);

    let res;
    if (id) {
      // Update
      res = await db.updateProduct(id, payload);
    } else {
      // Create
      res = await db.createProduct(payload);
    }

    console.log('DB Response:', res);

    if (res.error) throw res.error;

    hideLoading();
    showNotification('Produk berhasil disimpan!', 'success');

    // Close specific modal
    modal.remove();

    loadAdminProducts(); // Refresh list

  } catch (err) {
    // Reset Button State on Error
    if (btnSave) {
      btnSave.disabled = false;
      btnSave.innerHTML = originalText;
    }

    hideLoading();
    showNotification('Gagal menyimpan: ' + err.message, 'danger');
  }
}

async function deleteProduct(id) {
  if (!confirm('Yakin ingin menghapus produk ini?')) return;

  showLoading('Menghapus...');
  const { error } = await db.deleteProduct(id);
  hideLoading();

  if (error) {
    showNotification('Gagal hapus: ' + error.message, 'danger');
  } else {
    showNotification('Produk dihapus', 'success');
    loadAdminProducts();
  }
}
