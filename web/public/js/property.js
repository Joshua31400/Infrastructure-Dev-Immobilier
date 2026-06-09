if (!requireAuth()) throw new Error('redirect');

initNavbar();

const params = new URLSearchParams(location.search);
const propertyId = params.get('id');

if (!propertyId) window.location.href = '/';

let currentImg = 0;
let pictures = [];

async function loadProperty() {
  const container = document.getElementById('propertyContent');

  try {
    const p = await Api.getRealState(propertyId);
    pictures = p.pictures || [];
    render(p);
  } catch (err) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon"></div>
      <h3>Bien introuvable</h3>
      <p>${err.message}</p>
    </div>`;
  }
}

function render(p) {
  const user = getUser();
  const canBuy = user.role === 'client' && !p.sold;
  const addr = p.address || {};
  const agency = p.agency || {};

  const galleryHtml = renderGallery(pictures);
  const actionHtml = renderAction(p, user, canBuy);

  document.getElementById('propertyContent').innerHTML = `
    <div class="property-detail">
      <div class="property-main">
        ${galleryHtml}
        <div class="info-card">
          <span class="badge badge-dark">${escHtml(p.category)}</span>
          ${p.sold ? '<span class="badge badge-error" style="margin-left:8px">Vendu</span>' : '<span class="badge badge-success" style="margin-left:8px">Disponible</span>'}
          <h1 class="property-main-title" style="margin-top:14px">${escHtml(p.description.substring(0, 60))}${p.description.length > 60 ? '...' : ''}</h1>
          <p class="property-main-price">${formatPrice(p.price)}</p>
          <div class="property-specs">
            <div class="property-spec">
              <span class="property-spec-label">Surface</span>
              <span class="property-spec-value">${formatArea(p.area)}</span>
            </div>
            <div class="property-spec">
              <span class="property-spec-label">Catégorie</span>
              <span class="property-spec-value">${escHtml(p.category)}</span>
            </div>
            ${addr.city ? `<div class="property-spec">
              <span class="property-spec-label">Ville</span>
              <span class="property-spec-value">${escHtml(addr.city)}</span>
            </div>` : ''}
          </div>
          <p class="property-description-full">${escHtml(p.description)}</p>
          ${addr.street ? `
          <div class="property-address-section">
            <h3>Adresse</h3>
            <div class="property-address-grid">
              <div>Numéro<br><span>${escHtml(addr.number || '')}</span></div>
              <div>Rue<br><span>${escHtml(addr.street || '')}</span></div>
              <div>Quartier<br><span>${escHtml(addr.neighborhood || '')}</span></div>
              <div>Code postal<br><span>${escHtml(addr.postalCode || '')}</span></div>
            </div>
          </div>` : ''}
        </div>
      </div>
      ${actionHtml}
    </div>`;

  if (pictures.length > 1) bindGalleryNav();
  if (canBuy) bindBuyBtn(p.id);
}

function renderGallery(pics) {
  if (pics.length === 0) {
    return `<div class="gallery"><div class="gallery-main">
      <div class="gallery-main-placeholder"></div>
    </div></div>`;
  }

  const thumbs = pics.map((pic, i) =>
    `<img class="gallery-thumb ${i === 0 ? 'active' : ''}" src="${pic.url}" data-index="${i}" alt="Photo ${i + 1}">`
  ).join('');

  const nav = pics.length > 1
    ? `<button class="gallery-nav gallery-nav-prev" id="galleryPrev">‹</button>
       <button class="gallery-nav gallery-nav-next" id="galleryNext">›</button>`
    : '';

  return `<div class="gallery">
    <div class="gallery-main">
      <img id="galleryMainImg" src="${pics[0].url}" alt="Photo principale">
      ${nav}
    </div>
    ${pics.length > 1 ? `<div class="gallery-thumbnails">${thumbs}</div>` : ''}
  </div>`;
}

function renderAction(p, user, canBuy) {
  const agency = p.agency || {};
  const agencyAddr = agency.address || {};
  const managers = agency.managers || [];

  const buySection = p.sold
    ? `<div class="action-sold-badge"> Ce bien a été vendu</div>`
    : canBuy
    ? `<button class="btn btn-primary btn-full" id="buyBtn" style="padding:14px">Acheter ce bien</button>
       <p style="font-size:0.78rem;color:var(--text-muted);text-align:center">En cliquant, vous confirmez votre achat</p>`
    : user.role !== 'client'
    ? `<div class="action-sold-badge"> Mode consultation</div>`
    : `<div class="action-sold-badge"> Disponible</div>`;

  const managersHtml = managers.length > 0
    ? `<div class="agency-card-managers">
        <strong>Gestionnaires</strong>
        ${managers.map(m => `<div>${escHtml(m.username)}</div>`).join('')}
      </div>` : '';

  return `<div class="action-panel">
    <div class="action-card">
      <div>
        <p style="font-size:0.78rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;font-weight:600;margin-bottom:4px">Prix</p>
        <p class="action-price">${formatPrice(p.price)}</p>
      </div>
      ${buySection}
      ${agency.name ? `<div class="agency-card">
        <p class="agency-card-name">${escHtml(agency.name)}</p>
        ${agencyAddr.street ? `<p class="agency-card-address">${escHtml(agencyAddr.number || '')} ${escHtml(agencyAddr.street || '')}<br>${escHtml(agencyAddr.city || '')}</p>` : ''}
        ${managersHtml}
      </div>` : ''}
    </div>
  </div>`;
}

function bindGalleryNav() {
  document.getElementById('galleryPrev')?.addEventListener('click', () => changeImg(-1));
  document.getElementById('galleryNext')?.addEventListener('click', () => changeImg(1));
  document.querySelectorAll('.gallery-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => changeImg(parseInt(thumb.dataset.index) - currentImg));
  });
}

function changeImg(delta) {
  currentImg = (currentImg + delta + pictures.length) % pictures.length;
  document.getElementById('galleryMainImg').src = pictures[currentImg].url;
  document.querySelectorAll('.gallery-thumb').forEach((t, i) => {
    t.classList.toggle('active', i === currentImg);
  });
}

function bindBuyBtn(id) {
  document.getElementById('buyBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('buyBtn');
    if (!confirm('Confirmer l\'achat de ce bien ?')) return;

    setLoading(btn, true);
    try {
      await Api.buyRealState(id);
      showToast('Félicitations ! Vous avez acheté ce bien.', 'success');
      setTimeout(() => loadProperty(), 1500);
    } catch (err) {
      showToast(err.message, 'error');
      setLoading(btn, false);
    }
  });
}

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

loadProperty();
