if (!requireAuth()) throw new Error('redirect');

initNavbar();

let allProperties = [];

async function loadProperties(params = {}) {
  const grid = document.getElementById('propertyGrid');
  const countEl = document.getElementById('resultsCount');
  grid.innerHTML = renderSkeletons(6);

  try {
    const data = await Api.getRealStates(params);
    allProperties = data;

    populateCategoryFilter(data);
    renderGrid(data);

    countEl.innerHTML = `<strong>${data.length}</strong> bien${data.length !== 1 ? 's' : ''} trouvé${data.length !== 1 ? 's' : ''}`;
  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-state-icon"></div>
      <h3>Erreur de chargement</h3>
      <p>${err.message}</p>
    </div>`;
  }
}

function populateCategoryFilter(properties) {
  const sel = document.getElementById('filterCategory');
  const current = sel.value;
  const categories = [...new Set(properties.map(p => p.category).filter(Boolean))].sort();

  sel.innerHTML = '<option value="">Toutes catégories</option>';
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    if (cat === current) opt.selected = true;
    sel.appendChild(opt);
  });
}

function renderGrid(properties) {
  const grid = document.getElementById('propertyGrid');

  if (properties.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-state-icon"></div>
      <h3>Aucun bien disponible</h3>
      <p>Essayez d'élargir vos critères de recherche.</p>
    </div>`;
    return;
  }

  grid.innerHTML = properties.map(p => renderCard(p)).join('');
}

function renderCard(p) {
  const img = p.pictures && p.pictures.length > 0
    ? `<img src="${p.pictures[0].url}" alt="${p.category}" loading="lazy">`
    : `<div class="property-card-img-placeholder"></div>`;

  const soldOverlay = p.sold
    ? `<div class="property-sold-overlay"><span class="property-sold-label">Vendu</span></div>`
    : '';

  const city = p.address ? `${p.address.city}` : '';
  const agencyName = p.agency ? p.agency.name : '';

  return `
    <div class="property-card">
      <div class="property-card-img">
        ${img}
        <span class="property-category-badge">${escHtml(p.category)}</span>
        ${soldOverlay}
      </div>
      <div class="property-card-body">
        <p class="property-price">${formatPrice(p.price)}</p>
        <p class="property-description">${escHtml(p.description)}</p>
        <div class="property-meta">
          <span class="property-meta-item"> ${formatArea(p.area)}</span>
          ${city ? `<span class="property-meta-item"> ${escHtml(city)}</span>` : ''}
        </div>
        ${agencyName ? `<p class="property-agency">${escHtml(agencyName)}</p>` : ''}
      </div>
      <div class="property-card-footer">
        <a href="/property?id=${p.id}" class="btn btn-${p.sold ? 'secondary' : 'primary'} btn-full btn-sm">
          ${p.sold ? 'Voir les détails' : 'Voir les détails'}
        </a>
      </div>
    </div>`;
}

function renderSkeletons(n) {
  return Array(n).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton skeleton-line" style="width:50%;margin-top:16px"></div>
      <div class="skeleton skeleton-line"></div>
      <div class="skeleton skeleton-line skeleton-line-short"></div>
      <div class="skeleton skeleton-space"></div>
    </div>`).join('');
}

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function getFilters() {
  const params = {};
  const search = document.getElementById('filterSearch').value.trim();
  const category = document.getElementById('filterCategory').value;
  const minPrice = document.getElementById('filterMinPrice').value;
  const maxPrice = document.getElementById('filterMaxPrice').value;
  const minArea = document.getElementById('filterMinArea').value;
  const maxArea = document.getElementById('filterMaxArea').value;

  if (search) params.search = search;
  if (category) params.category = category;
  if (minPrice) params.min_price = minPrice;
  if (maxPrice) params.max_price = maxPrice;
  if (minArea) params.min_area = minArea;
  if (maxArea) params.max_area = maxArea;

  return params;
}

document.getElementById('filterBtn').addEventListener('click', () => {
  loadProperties(getFilters());
});

document.getElementById('filterSearch').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loadProperties(getFilters());
});

document.getElementById('resetBtn').addEventListener('click', () => {
  document.getElementById('filterSearch').value = '';
  document.getElementById('filterCategory').value = '';
  document.getElementById('filterMinPrice').value = '';
  document.getElementById('filterMaxPrice').value = '';
  document.getElementById('filterMinArea').value = '';
  document.getElementById('filterMaxArea').value = '';
  loadProperties();
});

loadProperties();
