if (!requireAuth()) throw new Error('redirect');

initNavbar();

const currentUser = getUser();

async function loadProfile() {
  try {
    const user = await Api.getUser(currentUser.id);
    render(user);
  } catch (err) {
    document.getElementById('profileContent').innerHTML = `
      <div class="empty-state"><div class="empty-state-icon"></div><h3>${err.message}</h3></div>`;
  }
}

function render(user) {
  const addr = user.address || {};
  const purchases = user.real_states || [];
  const roleLabels = { admin: 'Administrateur', manager: 'Gestionnaire', client: 'Client' };

  const avatarInner = user.picture
    ? `<img src="${escHtml(user.picture)}" alt="${escHtml(user.username)}">`
    : escHtml(user.username[0].toUpperCase());

  document.getElementById('profileContent').innerHTML = `
    <div class="profile-layout">
      <div class="profile-sidebar">
        <div class="profile-card">
          <div class="profile-avatar-wrap" id="avatarWrap" title="Changer la photo">
            <div class="profile-avatar" id="profileAvatarEl">${avatarInner}</div>
            <div class="profile-avatar-overlay"></div>
            <input type="file" id="avatarInput" accept="image/*" style="display:none">
          </div>
          <h2 class="profile-name" id="profileNameDisplay">${escHtml(user.username)}</h2>
          <p class="profile-email">${escHtml(user.email)}</p>
          <span class="badge badge-${user.role}">${roleLabels[user.role] || user.role}</span>
          <p class="profile-joined">Membre depuis ${formatDate(user.created_at)}</p>
        </div>
        ${user.role === 'client' ? `
        <div class="profile-stats">
          <div class="profile-stat">
            <div class="profile-stat-value">${purchases.length}</div>
            <div class="profile-stat-label">Achat${purchases.length !== 1 ? 's' : ''}</div>
          </div>
        </div>` : ''}
      </div>

      <div class="profile-content">
        <div class="profile-section">
          <h2 class="profile-section-title">Modifier mon profil</h2>
          <form id="editForm" class="edit-form">
            <div class="form-group">
              <label for="editUsername">Nom d'utilisateur</label>
              <input type="text" id="editUsername" value="${escHtml(user.username)}" required>
            </div>
            <div class="profile-address-group">
              <p class="profile-address-title">Adresse personnelle</p>
              <div class="form-row" style="margin-bottom:12px">
                <div class="form-group">
                  <label for="addrNumber">Numéro</label>
                  <input type="text" id="addrNumber" value="${escHtml(addr.number || '')}" placeholder="12">
                </div>
                <div class="form-group">
                  <label for="addrPostal">Code postal</label>
                  <input type="text" id="addrPostal" value="${escHtml(addr.postalCode || '')}" placeholder="75001">
                </div>
              </div>
              <div class="form-group" style="margin-bottom:12px">
                <label for="addrStreet">Rue</label>
                <input type="text" id="addrStreet" value="${escHtml(addr.street || '')}" placeholder="Rue de la Paix">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="addrNeighborhood">Quartier</label>
                  <input type="text" id="addrNeighborhood" value="${escHtml(addr.neighborhood || '')}" placeholder="Centre">
                </div>
                <div class="form-group">
                  <label for="addrCity">Ville</label>
                  <input type="text" id="addrCity" value="${escHtml(addr.city || '')}" placeholder="Paris">
                </div>
              </div>
            </div>
            <div id="editError" class="form-error" hidden></div>
            <div style="display:flex;gap:12px;justify-content:flex-end">
              <button type="submit" class="btn btn-primary" id="editBtn">Enregistrer</button>
            </div>
          </form>
        </div>

        ${user.role === 'client' && purchases.length > 0 ? `
        <div class="profile-section">
          <h2 class="profile-section-title">Mes achats (${purchases.length})</h2>
          <div class="purchases-grid">
            ${purchases.map(p => renderPurchase(p)).join('')}
          </div>
        </div>` : ''}
      </div>
    </div>`;

  bindAvatarUpload(user.id);
  document.getElementById('editForm').addEventListener('submit', (e) => saveProfile(e, user.id));
}

function bindAvatarUpload(userId) {
  const wrap = document.getElementById('avatarWrap');
  const input = document.getElementById('avatarInput');

  wrap.addEventListener('click', () => input.click());

  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;

    wrap.classList.add('avatar-uploading');
    const overlay = wrap.querySelector('.profile-avatar-overlay');
    overlay.textContent = '';

    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await Api.uploadUserPicture(userId, fd);

      const avatarEl = document.getElementById('profileAvatarEl');
      avatarEl.innerHTML = `<img src="${escHtml(res.url)}" alt="">`;

      const navAvatar = document.getElementById('navAvatar');
      if (navAvatar) navAvatar.innerHTML = `<img src="${escHtml(res.url)}" alt="">`;

      const updatedUser = { ...getUser(), picture: res.url };
      setAuth(getToken(), updatedUser);

      showToast('Photo mise à jour.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      wrap.classList.remove('avatar-uploading');
      overlay.textContent = '';
      input.value = '';
    }
  });
}

function renderPurchase(p) {
  const addr = p.address || {};
  const img = p.pictures && p.pictures.length > 0
    ? `<img src="${escHtml(p.pictures[0].url)}" alt="">`
    : '';

  return `<a href="/property?id=${p.id}" class="purchase-card">
    <div class="purchase-card-img">${img}</div>
    <div class="purchase-card-body">
      <p class="purchase-card-price">${formatPrice(p.price)}</p>
      <p class="purchase-card-desc">${escHtml(p.description)}</p>
      ${addr.city ? `<p style="font-size:0.8rem;color:var(--text-muted)"> ${escHtml(addr.city)}</p>` : ''}
      <p class="purchase-card-date">Acheté le ${formatDate(p.bought_at)}</p>
    </div>
  </a>`;
}

async function saveProfile(e, userId) {
  e.preventDefault();
  const btn = document.getElementById('editBtn');
  const errEl = document.getElementById('editError');
  errEl.hidden = true;

  const data = {
    username: document.getElementById('editUsername').value.trim(),
  };

  const hasAddr = ['addrNumber', 'addrStreet', 'addrNeighborhood', 'addrCity', 'addrPostal']
    .some(id => document.getElementById(id).value.trim());

  if (hasAddr) {
    data.address = {
      number: document.getElementById('addrNumber').value.trim(),
      street: document.getElementById('addrStreet').value.trim(),
      neighborhood: document.getElementById('addrNeighborhood').value.trim(),
      city: document.getElementById('addrCity').value.trim(),
      postalCode: document.getElementById('addrPostal').value.trim(),
    };
  }

  setLoading(btn, true);

  try {
    await Api.updateUser(userId, data);
    const updatedUser = { ...getUser(), username: data.username };
    setAuth(getToken(), updatedUser);
    document.getElementById('profileNameDisplay').textContent = data.username;
    document.getElementById('navUsername').textContent = data.username;
    showToast('Profil mis à jour avec succès.', 'success');
    setLoading(btn, false);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.hidden = false;
    setLoading(btn, false);
  }
}

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

loadProfile();
