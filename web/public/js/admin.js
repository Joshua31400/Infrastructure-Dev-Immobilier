if (!requireAuth()) throw new Error('redirect');

const currentUser = getUser();
if (currentUser.role === 'client') window.location.href = '/';

initNavbar();

// ── State ──────────────────────────────────────────────────
let allProperties = [];
let allUsers = [];
let allAgencies = [];
let editingPropertyId = null;
let editingUserId = null;
let editingAgencyId = null;
let selectedRole = 'client';
let managerAgency = null;
let charts = {};

// ── Init tabs ──────────────────────────────────────────────
if (currentUser.role === 'admin') {
  document.getElementById('tabUsers').style.display = '';
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'analytics') loadAnalytics();
  });
});

// ── Role option selection ──────────────────────────────────
document.querySelectorAll('.role-option').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.role-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    selectedRole = opt.dataset.role;
  });
});

// ── Properties search ──────────────────────────────────────
document.getElementById('propSearch').addEventListener('input', function () {
  filterPropertiesTable(this.value.toLowerCase());
});

document.getElementById('userSearch')?.addEventListener('input', function () {
  filterUsersTable(this.value.toLowerCase());
});

// ── Bootstrap ─────────────────────────────────────────────
async function init() {
  await loadAgencies();
  await loadProperties();
  if (currentUser.role === 'admin') await loadUsers();
}

// ── Properties ────────────────────────────────────────────
async function loadProperties() {
  try {
    const data = await Api.getAllRealStates();
    allProperties = currentUser.role === 'manager'
      ? data.filter(p => p.agency?.managers?.some(m => m.email === currentUser.email))
      : data;

    if (currentUser.role === 'manager' && allProperties.length > 0) {
      managerAgency = allAgencies.find(a => a.managers?.some(m => m.email === currentUser.email));
      document.getElementById('propertiesTitle').textContent =
        `Biens — ${managerAgency?.name || 'Mon agence'}`;
    }

    renderPropertiesTable(allProperties);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderPropertiesTable(props) {
  const tbody = document.getElementById('propertiesTableBody');
  if (props.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state" style="padding:40px">
      <div class="empty-state-icon"></div><h3>Aucun bien</h3></div></td></tr>`;
    return;
  }

  tbody.innerHTML = props.map(p => {
    const img = p.pictures?.[0]?.url
      ? `<img class="prop-thumb" src="${p.pictures[0].url}" alt="">`
      : `<div class="prop-thumb-placeholder"></div>`;

    return `<tr data-id="${p.id}">
      <td>${img}</td>
      <td style="max-width:200px">
        <div style="font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(p.description.substring(0, 50))}${p.description.length > 50 ? '…' : ''}</div>
        <div class="mono">${escHtml(p.address?.city || '')}</div>
      </td>
      <td><span class="badge badge-dark">${escHtml(p.category)}</span></td>
      <td class="price-cell">${formatPrice(p.price)}</td>
      <td class="mono">${formatArea(p.area)}</td>
      <td>${escHtml(p.agency?.name || '')}</td>
      <td>${p.sold ? '<span class="badge badge-error">Vendu</span>' : '<span class="badge badge-success">Disponible</span>'}</td>
      <td>
        <div class="table-actions">
          <button class="btn-icon-action btn-edit" title="Modifier" onclick="openEditPropertyModal(${p.id})"></button>
          <button class="btn-icon-action btn-delete" title="Supprimer" onclick="confirmDeleteProperty(${p.id})"></button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function filterPropertiesTable(q) {
  const filtered = q
    ? allProperties.filter(p =>
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.agency?.name || '').toLowerCase().includes(q) ||
        (p.address?.city || '').toLowerCase().includes(q))
    : allProperties;
  renderPropertiesTable(filtered);
}

// ── Add / Edit property ────────────────────────────────────
function openAddPropertyModal() {
  editingPropertyId = null;
  document.getElementById('propertyModalTitle').textContent = 'Ajouter un bien';
  document.getElementById('propSubmitBtn').textContent = 'Ajouter';
  clearPropertyForm();
  populateAgencySelect();
  document.getElementById('propPicturesSection').style.display = 'block';
  document.getElementById('existingPictures').innerHTML = '';
  openModal('propertyModal');
}

async function openEditPropertyModal(id) {
  editingPropertyId = id;
  const p = allProperties.find(x => x.id === id);
  if (!p) return;

  document.getElementById('propertyModalTitle').textContent = 'Modifier le bien';
  document.getElementById('propSubmitBtn').textContent = 'Enregistrer';

  document.getElementById('propCategory').value = p.category || '';
  document.getElementById('propPrice').value = p.price || '';
  document.getElementById('propArea').value = p.area || '';
  document.getElementById('propDesc').value = p.description || '';
  document.getElementById('propAddrNumber').value = p.address?.number || '';
  document.getElementById('propAddrStreet').value = p.address?.street || '';
  document.getElementById('propAddrNeighborhood').value = p.address?.neighborhood || '';
  document.getElementById('propAddrCity').value = p.address?.city || '';
  document.getElementById('propAddrPostal').value = p.address?.postalCode || '';

  populateAgencySelect(p.agency_id || p.agency?.id);
  renderExistingPictures(p.pictures || []);
  document.getElementById('propPicturesSection').style.display = 'block';
  document.getElementById('propError').hidden = true;
  openModal('propertyModal');
}

function clearPropertyForm() {
  ['propCategory', 'propPrice', 'propArea', 'propDesc',
   'propAddrNumber', 'propAddrStreet', 'propAddrNeighborhood', 'propAddrCity', 'propAddrPostal']
    .forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('propError').hidden = true;
  document.getElementById('existingPictures').innerHTML = '';
  document.getElementById('propPictures').value = '';
}

function populateAgencySelect(selectedId = null) {
  const sel = document.getElementById('propAgency');
  sel.innerHTML = '';

  const list = currentUser.role === 'manager' && managerAgency
    ? [managerAgency]
    : allAgencies;

  list.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.id;
    opt.textContent = a.name;
    if (a.id === selectedId) opt.selected = true;
    sel.appendChild(opt);
  });
}

function renderExistingPictures(pictures) {
  const container = document.getElementById('existingPictures');
  container.innerHTML = pictures.map(pic => `
    <div class="picture-item" id="pic-${pic.id}">
      <img src="${pic.url}" alt="">
      <button class="picture-delete" onclick="deletePicture(${editingPropertyId}, ${pic.id})" title="Supprimer">×</button>
    </div>`).join('');
}

async function deletePicture(propertyId, pictureId) {
  try {
    await Api.deletePicture(propertyId, pictureId);
    document.getElementById(`pic-${pictureId}`)?.remove();
    showToast('Photo supprimée.');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function submitProperty() {
  const btn = document.getElementById('propSubmitBtn');
  const errEl = document.getElementById('propError');
  errEl.hidden = true;

  const data = {
    description: document.getElementById('propDesc').value.trim(),
    price: parseFloat(document.getElementById('propPrice').value),
    area: parseFloat(document.getElementById('propArea').value),
    category: document.getElementById('propCategory').value.trim(),
    agency_id: parseInt(document.getElementById('propAgency').value),
    address: {
      number: document.getElementById('propAddrNumber').value.trim(),
      street: document.getElementById('propAddrStreet').value.trim(),
      neighborhood: document.getElementById('propAddrNeighborhood').value.trim(),
      city: document.getElementById('propAddrCity').value.trim(),
      postalCode: document.getElementById('propAddrPostal').value.trim(),
    }
  };

  if (!data.description || !data.price || !data.area || !data.category) {
    errEl.textContent = 'Veuillez remplir tous les champs obligatoires.';
    errEl.hidden = false;
    return;
  }

  setLoading(btn, true);

  try {
    let propertyId = editingPropertyId;

    if (editingPropertyId) {
      await Api.updateRealState(editingPropertyId, data);
      showToast('Bien mis à jour.', 'success');
    } else {
      const res = await Api.createRealState(data);
      propertyId = res.id;
      showToast('Bien créé avec succès.', 'success');
    }

    const files = document.getElementById('propPictures').files;
    for (const file of files) {
      const fd = new FormData();
      fd.append('image', file);
      await Api.addPicture(propertyId, fd);
    }

    closeModal('propertyModal');
    await loadProperties();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.hidden = false;
    setLoading(btn, false);
  }
}

function confirmDeleteProperty(id) {
  const p = allProperties.find(x => x.id === id);
  document.getElementById('confirmTitle').textContent = 'Supprimer ce bien';
  document.getElementById('confirmText').textContent =
    `Êtes-vous sûr de vouloir supprimer "${p?.description?.substring(0, 60) || 'ce bien'}" ? Cette action est irréversible.`;
  const okBtn = document.getElementById('confirmOkBtn');
  okBtn.onclick = async () => {
    try {
      await Api.deleteRealState(id);
      closeModal('confirmModal');
      showToast('Bien supprimé.', 'success');
      await loadProperties();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
  openModal('confirmModal');
}

// ── Users ──────────────────────────────────────────────────
async function loadUsers() {
  try {
    const data = await Api.getUsers();
    allUsers = data.filter(u => u.role !== 'admin' || u.id === currentUser.id);
    renderUsersTable(allUsers);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state" style="padding:40px">
      <div class="empty-state-icon"></div><h3>Aucun utilisateur</h3></div></td></tr>`;
    return;
  }

  const roleLabels = { admin: 'Admin', manager: 'Gestionnaire', client: 'Client' };

  tbody.innerHTML = users.map(u => {
    const avatarHtml = u.picture
      ? `<img src="${escHtml(u.picture)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover">`
      : `<div class="avatar">${escHtml(u.username[0].toUpperCase())}</div>`;

    const canEdit = u.id !== currentUser.id || currentUser.role === 'admin';

    return `<tr data-id="${u.id}">
      <td>${avatarHtml}</td>
      <td style="font-weight:500">${escHtml(u.username)}</td>
      <td class="mono">${escHtml(u.email)}</td>
      <td><span class="badge badge-${u.role}">${roleLabels[u.role] || u.role}</span></td>
      <td class="mono">${formatDate(u.created_at)}</td>
      <td>
        <div class="table-actions">
          <button class="btn-icon-action btn-edit" title="Modifier" onclick="openEditUserModal(${u.id})"></button>
          <button class="btn-icon-action btn-promote" title="Changer le rôle" onclick="openPromoteModal(${u.id})"></button>
          ${u.id !== currentUser.id ? `<button class="btn-icon-action btn-delete" title="Supprimer" onclick="confirmDeleteUser(${u.id})"></button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');
}

function filterUsersTable(q) {
  const filtered = q
    ? allUsers.filter(u =>
        u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    : allUsers;
  renderUsersTable(filtered);
}

function openAddUserModal() {
  editingUserId = null;
  selectedRole = 'client';
  document.getElementById('userModalTitle').textContent = 'Ajouter un utilisateur';
  document.getElementById('userSubmitBtn').textContent = 'Créer';
  document.getElementById('userPasswordGroup').style.display = '';
  document.getElementById('userUsername').value = '';
  document.getElementById('userEmail').value = '';
  document.getElementById('userPassword').value = '';
  document.querySelectorAll('.role-option').forEach(o => {
    o.classList.toggle('selected', o.dataset.role === 'client');
  });
  document.getElementById('userError').hidden = true;
  openModal('userModal');
}

function openEditUserModal(id) {
  editingUserId = id;
  const u = allUsers.find(x => x.id === id);
  if (!u) return;

  selectedRole = u.role;
  document.getElementById('userModalTitle').textContent = 'Modifier l\'utilisateur';
  document.getElementById('userSubmitBtn').textContent = 'Enregistrer';
  document.getElementById('userPasswordGroup').style.display = 'none';
  document.getElementById('userUsername').value = u.username;
  document.getElementById('userEmail').value = u.email;
  document.querySelectorAll('.role-option').forEach(o => {
    o.classList.toggle('selected', o.dataset.role === u.role);
  });
  document.getElementById('userError').hidden = true;
  openModal('userModal');
}

async function submitUser() {
  const btn = document.getElementById('userSubmitBtn');
  const errEl = document.getElementById('userError');
  errEl.hidden = true;

  const username = document.getElementById('userUsername').value.trim();
  const email = document.getElementById('userEmail').value.trim();
  const password = document.getElementById('userPassword').value;

  if (!username || !email) {
    errEl.textContent = 'Nom d\'utilisateur et email requis.';
    errEl.hidden = false;
    return;
  }

  setLoading(btn, true);

  try {
    if (editingUserId) {
      await Api.updateUser(editingUserId, { username, email });
      const u = allUsers.find(x => x.id === editingUserId);
      if (u && selectedRole !== u.role) {
        await Api.promoteUser(editingUserId, selectedRole);
      }
      showToast('Utilisateur mis à jour.', 'success');
    } else {
      if (!password) throw new Error('Le mot de passe est requis.');
      const res = await Api.register(username, email, password);
      if (selectedRole !== 'client') {
        await Api.promoteUser(res.user.id, selectedRole);
      }
      showToast('Utilisateur créé.', 'success');
    }

    closeModal('userModal');
    await loadUsers();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.hidden = false;
    setLoading(btn, false);
  }
}

function openPromoteModal(id) {
  editingUserId = id;
  const u = allUsers.find(x => x.id === id);
  if (!u) return;

  selectedRole = u.role;
  document.getElementById('userModalTitle').textContent = `Rôle de ${u.username}`;
  document.getElementById('userSubmitBtn').textContent = 'Appliquer';
  document.getElementById('userPasswordGroup').style.display = 'none';
  document.getElementById('userUsername').value = u.username;
  document.getElementById('userEmail').value = u.email;
  document.querySelectorAll('.role-option').forEach(o => {
    o.classList.toggle('selected', o.dataset.role === u.role);
  });
  document.getElementById('userError').hidden = true;
  openModal('userModal');
}

function confirmDeleteUser(id) {
  const u = allUsers.find(x => x.id === id);
  document.getElementById('confirmTitle').textContent = 'Supprimer cet utilisateur';
  document.getElementById('confirmText').textContent =
    `Êtes-vous sûr de vouloir supprimer "${u?.username || 'cet utilisateur'}" ? Cette action est irréversible.`;
  const okBtn = document.getElementById('confirmOkBtn');
  okBtn.onclick = async () => {
    try {
      await Api.deleteUser(id);
      closeModal('confirmModal');
      showToast('Utilisateur supprimé.', 'success');
      await loadUsers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
  openModal('confirmModal');
}

// ── Agencies ───────────────────────────────────────────────
async function loadAgencies() {
  try {
    allAgencies = await Api.getAgencies();
    renderAgenciesTable(allAgencies);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderAgenciesTable(agencies) {
  const tbody = document.getElementById('agenciesTableBody');
  if (!tbody) return;

  if (agencies.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state" style="padding:40px">
      <div class="empty-state-icon"></div><h3>Aucune agence</h3></div></td></tr>`;
    return;
  }

  tbody.innerHTML = agencies.map(a => {
    const addr = a.address
      ? `${a.address.number} ${a.address.street}, ${a.address.city}`
      : '—';

    const managerTags = (a.managers || []).map(m =>
      `<span style="display:inline-flex;align-items:center;gap:4px;background:var(--primary-light);color:var(--primary);padding:2px 8px;border-radius:999px;font-size:0.78rem;font-weight:600;margin:2px">
        ${escHtml(m.username)}
        <button onclick="confirmRemoveManager(${a.id},'${escHtml(m.email)}')" title="Retirer" style="color:var(--primary);font-size:0.9rem;line-height:1;margin-left:2px">×</button>
      </span>`
    ).join('') || '<span style="color:var(--text-muted);font-size:0.85rem">Aucun gestionnaire</span>';

    return `<tr>
      <td style="font-weight:600">${escHtml(a.name)}</td>
      <td class="mono" style="font-size:0.82rem">${escHtml(addr)}</td>
      <td>${managerTags}</td>
      <td>
        <div class="table-actions">
          <button class="btn-icon-action btn-promote" title="Assigner un gestionnaire" onclick="openAssignManagerModal(${a.id})"></button>
          <button class="btn-icon-action btn-delete" title="Supprimer" onclick="confirmDeleteAgency(${a.id})"></button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

let assigningAgencyId = null;

async function openAssignManagerModal(agencyId) {
  assigningAgencyId = agencyId;
  const agency = allAgencies.find(a => a.id === agencyId);
  document.getElementById('assignAgencyName').textContent = agency?.name || '';
  document.getElementById('assignManagerError').hidden = true;

  const sel = document.getElementById('assignManagerSelect');
  sel.innerHTML = '<option value="">— Sélectionner —</option>';

  try {
    const users = allUsers.length ? allUsers : await Api.getUsers();
    const managers = users.filter(u => u.role === 'manager');
    const alreadyAssigned = new Set((agency?.managers || []).map(m => m.email));

    managers.forEach(u => {
      if (alreadyAssigned.has(u.email)) return;
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = `${u.username} (${u.email})`;
      sel.appendChild(opt);
    });

    if (sel.options.length === 1) {
      sel.innerHTML = '<option value="">Aucun gestionnaire disponible</option>';
    }
  } catch (err) {
    showToast(err.message, 'error');
    return;
  }

  openModal('assignManagerModal');
}

async function submitAssignManager() {
  const btn = document.getElementById('assignManagerBtn');
  const errEl = document.getElementById('assignManagerError');
  const userId = document.getElementById('assignManagerSelect').value;

  if (!userId) {
    errEl.textContent = 'Veuillez sélectionner un gestionnaire.';
    errEl.hidden = false;
    return;
  }

  errEl.hidden = true;
  setLoading(btn, true);

  try {
    await Api.addManager(assigningAgencyId, parseInt(userId));
    closeModal('assignManagerModal');
    showToast('Gestionnaire assigné avec succès.', 'success');
    await loadAgencies();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.hidden = false;
    setLoading(btn, false);
  }
}

function confirmRemoveManager(agencyId, managerEmail) {
  const agency = allAgencies.find(a => a.id === agencyId);
  const manager = (agency?.managers || []).find(m => m.email === managerEmail);
  const user = allUsers.find(u => u.email === managerEmail);

  document.getElementById('confirmTitle').textContent = 'Retirer ce gestionnaire';
  document.getElementById('confirmText').textContent =
    `Retirer "${manager?.username || managerEmail}" de l'agence "${agency?.name}" ?`;

  const okBtn = document.getElementById('confirmOkBtn');
  okBtn.textContent = 'Retirer';
  okBtn.onclick = async () => {
    try {
      if (!user) throw new Error('Utilisateur introuvable.');
      await Api.removeManager(agencyId, user.id);
      closeModal('confirmModal');
      showToast('Gestionnaire retiré.', 'success');
      await loadAgencies();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      okBtn.textContent = 'Supprimer';
    }
  };
  openModal('confirmModal');
}

function openAddAgencyModal() {
  editingAgencyId = null;
  document.getElementById('agencyModalTitle').textContent = 'Nouvelle agence';
  document.getElementById('agencySubmitBtn').textContent = 'Créer';
  ['agencyName','agencyAddrNumber','agencyAddrStreet','agencyAddrNeighborhood','agencyAddrCity','agencyAddrPostal']
    .forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('agencyError').hidden = true;
  openModal('agencyModal');
}

async function submitAgency() {
  const btn = document.getElementById('agencySubmitBtn');
  const errEl = document.getElementById('agencyError');
  errEl.hidden = true;

  const name = document.getElementById('agencyName').value.trim();
  if (!name) {
    errEl.textContent = 'Le nom de l\'agence est requis.';
    errEl.hidden = false;
    return;
  }

  const data = {
    name,
    address: {
      number: document.getElementById('agencyAddrNumber').value.trim(),
      street: document.getElementById('agencyAddrStreet').value.trim(),
      neighborhood: document.getElementById('agencyAddrNeighborhood').value.trim(),
      city: document.getElementById('agencyAddrCity').value.trim(),
      postalCode: document.getElementById('agencyAddrPostal').value.trim(),
    }
  };

  setLoading(btn, true);

  try {
    await Api.createAgency(data);
    closeModal('agencyModal');
    showToast('Agence créée.', 'success');
    await loadAgencies();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.hidden = false;
    setLoading(btn, false);
  }
}

function confirmDeleteAgency(id) {
  const a = allAgencies.find(x => x.id === id);
  document.getElementById('confirmTitle').textContent = 'Supprimer cette agence';
  document.getElementById('confirmText').textContent =
    `Êtes-vous sûr de vouloir supprimer "${a?.name}" ? Tous les biens associés seront également supprimés.`;
  const okBtn = document.getElementById('confirmOkBtn');
  okBtn.onclick = async () => {
    try {
      await Api.deleteAgency(id);
      closeModal('confirmModal');
      showToast('Agence supprimée.', 'success');
      await loadAgencies();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
  openModal('confirmModal');
}

// ── Analytics ──────────────────────────────────────────────
let analyticsLoaded = false;

async function loadAnalytics() {
  if (analyticsLoaded) return;

  const grid = document.getElementById('analyticsGrid');
  const statsRow = document.getElementById('analyticsStats');

  try {
    const [sold, all] = await Promise.all([
      Api.getSoldRealStates(),
      Api.getAllRealStates()
    ]);

    analyticsLoaded = true;

    const available = all.filter(p => !p.sold);
    const totalRevenue = sold.reduce((sum, p) => sum + parseFloat(p.price), 0);

    statsRow.innerHTML = `
      <div class="stat-card stat-card-accent">
        <span class="stat-card-label">Biens vendus</span>
        <span class="stat-card-value">${sold.length}</span>
        <span class="stat-card-sub">sur ${all.length} au total</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-label">Biens disponibles</span>
        <span class="stat-card-value">${available.length}</span>
        <span class="stat-card-sub">en attente d'acheteur</span>
      </div>
      <div class="stat-card stat-card-accent">
        <span class="stat-card-label">Chiffre d'affaires</span>
        <span class="stat-card-value" style="font-size:1.5rem">${formatPrice(totalRevenue)}</span>
        <span class="stat-card-sub">ventes réalisées</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-label">Agences actives</span>
        <span class="stat-card-value">${allAgencies.length}</span>
        <span class="stat-card-sub">sur le territoire</span>
      </div>`;

    grid.innerHTML = `
      <div class="chart-card">
        <p class="chart-card-title">Ventes par agence</p>
        <div class="chart-container"><canvas id="chartAgencySales"></canvas></div>
      </div>
      <div class="chart-card">
        <p class="chart-card-title">Répartition par catégorie</p>
        <div class="chart-container"><canvas id="chartCategories"></canvas></div>
      </div>
      <div class="chart-card">
        <p class="chart-card-title">Top 8 villes — ventes</p>
        <div class="chart-container"><canvas id="chartCities"></canvas></div>
      </div>
      <div class="chart-card">
        <p class="chart-card-title">Biens disponibles vs vendus</p>
        <div class="chart-container"><canvas id="chartStatus"></canvas></div>
      </div>
      <div class="chart-card chart-card-full">
        <p class="chart-card-title">Chiffre d'affaires par agence</p>
        <div class="chart-container"><canvas id="chartRevenue"></canvas></div>
      </div>`;

    buildCharts(sold, all, available);
  } catch (err) {
    grid.innerHTML = `<div class="empty-state chart-card-full" style="padding:60px">
      <div class="empty-state-icon"></div><h3>${err.message}</h3></div>`;
  }
}

function buildCharts(sold, all, available) {
  const orange = '#fc6736';
  const dark = '#1c1c1c';
  const palette = [
    '#fc6736','#ff9a6c','#1c1c1c','#555','#888',
    '#ffcba4','#ffa07a','#e5571f','#2a2a2a','#444'
  ];

  Chart.defaults.font.family = "'Poppins', sans-serif";
  Chart.defaults.color = '#777';

  // Sales by agency
  const agencyMap = {};
  sold.forEach(p => {
    const name = p.agency?.name || 'Inconnue';
    agencyMap[name] = (agencyMap[name] || 0) + 1;
  });
  const agencyEntries = Object.entries(agencyMap).sort((a, b) => b[1] - a[1]);

  new Chart(document.getElementById('chartAgencySales'), {
    type: 'bar',
    data: {
      labels: agencyEntries.map(e => e[0]),
      datasets: [{ label: 'Ventes', data: agencyEntries.map(e => e[1]),
        backgroundColor: orange, borderRadius: 6 }]
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
  });

  // Category donut (all properties)
  const catMap = {};
  all.forEach(p => { catMap[p.category] = (catMap[p.category] || 0) + 1; });
  const catEntries = Object.entries(catMap);

  new Chart(document.getElementById('chartCategories'), {
    type: 'doughnut',
    data: {
      labels: catEntries.map(e => e[0]),
      datasets: [{ data: catEntries.map(e => e[1]),
        backgroundColor: palette.slice(0, catEntries.length), borderWidth: 0 }]
    },
    options: { plugins: { legend: { position: 'bottom' } }, cutout: '60%' }
  });

  // Top 8 cities by sales
  const cityMap = {};
  sold.forEach(p => {
    const city = p.address?.city || 'Inconnue';
    cityMap[city] = (cityMap[city] || 0) + 1;
  });
  const cityEntries = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

  new Chart(document.getElementById('chartCities'), {
    type: 'bar',
    data: {
      labels: cityEntries.map(e => e[0]),
      datasets: [{ label: 'Ventes', data: cityEntries.map(e => e[1]),
        backgroundColor: dark, borderRadius: 6 }]
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }
    }
  });

  // Available vs sold doughnut
  new Chart(document.getElementById('chartStatus'), {
    type: 'doughnut',
    data: {
      labels: ['Disponibles', 'Vendus'],
      datasets: [{ data: [available.length, sold.length],
        backgroundColor: ['#22c55e', orange], borderWidth: 0 }]
    },
    options: { plugins: { legend: { position: 'bottom' } }, cutout: '60%' }
  });

  // Revenue by agency
  const revMap = {};
  sold.forEach(p => {
    const name = p.agency?.name || 'Inconnue';
    revMap[name] = (revMap[name] || 0) + parseFloat(p.price);
  });
  const revEntries = Object.entries(revMap).sort((a, b) => b[1] - a[1]);

  new Chart(document.getElementById('chartRevenue'), {
    type: 'bar',
    data: {
      labels: revEntries.map(e => e[0]),
      datasets: [{ label: 'CA (€)', data: revEntries.map(e => e[1]),
        backgroundColor: orange, borderRadius: 6 }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: v => new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(v) + ' €' }
        }
      }
    }
  });
}

// ── Utils ──────────────────────────────────────────────────
function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// ── New pictures preview ───────────────────────────────────
document.getElementById('propPictures').addEventListener('change', function () {
  const preview = document.getElementById('newPicturesPreview');
  if (!preview) return;
  preview.innerHTML = '';
  Array.from(this.files).forEach(file => {
    const url = URL.createObjectURL(file);
    preview.innerHTML += `<div class="picture-item"><img src="${url}" alt=""></div>`;
  });
});

// ── Close modals on backdrop click ────────────────────────
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

init();
