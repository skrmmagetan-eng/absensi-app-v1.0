import { db } from '../lib/supabase.js';
import { renderNavbar, renderBottomNav } from '../components/navigation.js';
import { formatCurrency, showLoading, hideLoading } from '../utils/helpers.js';
import '../utils/product-detail.js';

export async function renderCatalogPage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    ${renderNavbar()}
    
    <div class="page pb-nav">
      <div class="container">
        <h1 class="mb-lg">🛍️ Katalog Produk</h1>
        
        <!-- Search/Filter (Future Improvement) -->
        <!-- <div class="form-group mb-lg">
          <input type="text" class="form-input" placeholder="Cari produk...">
        </div> -->

        <div id="catalog-grid" class="grid-2-col">
           <!-- Products loaded here -->
        </div>
      </div>
    </div>

    ${renderBottomNav('katalog')}
  `;

  await loadCatalog();
}

async function loadCatalog() {
  const grid = document.getElementById('catalog-grid');
  showLoading('Memuat katalog...');

  try {
    const { data: products, error } = await db.getProducts();
    hideLoading();

    if (error) throw error;

    if (!products || products.length === 0) {
      grid.innerHTML = `
        <div class="col-span-2 text-center py-xl">
          <div style="font-size: 3rem; margin-bottom: 1rem;">📦</div>
          <p style="color: var(--text-muted);">Belum ada produk di katalog.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = products.map(product => `
      <div class="card p-0 overflow-hidden h-full flex flex-col" style="cursor: pointer;" onclick="window.showProductDetail('${product.id}')">
        <div style="aspect-ratio: 1/1; background: #000; overflow: hidden; position: relative;">
          ${product.image_url
        ? `<img src="${product.image_url}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;">`
        : `<div class="flex items-center justify-center h-full text-muted">No Image</div>`
      }
          <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); padding: 20px 10px 10px;">
            <span style="color: #4ade80; font-weight: bold; font-size: 1.1rem; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
              ${formatCurrency(product.price)}
            </span>
          </div>
        </div>
        <div class="p-3 flex-grow">
          <h3 style="font-size: 1rem; margin-bottom: 0.5rem; line-height: 1.3;">${product.name}</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
            ${product.description || '-'}
          </p>
        </div>
      </div>
    `).join('');

    // Store products globally for detail view
    window.catalogProducts = products;

    // Add CSS for Grid
    if (!document.getElementById('catalog-style')) {
      const style = document.createElement('style');
      style.id = 'catalog-style';
      style.textContent = `
        .grid-2-col {
          display: grid;
          grid-template-columns: repeat(2, 1fr); /* Default 2 kolom di HP */
          gap: 1rem;
        }
        @media (min-width: 640px) {
          .grid-2-col {
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          }
        }
      `;
      document.head.appendChild(style);
    }

  } catch (error) {
    hideLoading();
    console.error('Catalog error:', error);
    grid.innerHTML = `<div class="col-span-2 text-danger text-center">Gagal memuat: ${error.message}</div>`;
  }
}
