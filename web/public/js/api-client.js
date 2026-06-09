const Api = (() => {
  function headers(isForm = false) {
    const token = getToken();
    const h = {};
    if (!isForm) h['Content-Type'] = 'application/json';
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }

  async function req(method, path, body = null, isForm = false) {
    const opts = { method, headers: headers(isForm) };
    if (body) opts.body = isForm ? body : JSON.stringify(body);
    const res = await fetch(`${CONFIG.API_URL}${path}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
    return data;
  }

  return {
    login: (email, password) =>
      req('POST', '/api/auth/login', { email, password }),

    register: (username, email, password) =>
      req('POST', '/api/auth/register', { username, email, password }),

    getRealStates: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return req('GET', `/api/real-states${q ? '?' + q : ''}`);
    },
    getRealState: (id) => req('GET', `/api/real-states/${id}`),
    getAllRealStates: () => req('GET', '/api/real-states/all'),
    getSoldRealStates: () => req('GET', '/api/real-states/sold'),
    createRealState: (data) => req('POST', '/api/real-states', data),
    updateRealState: (id, data) => req('PUT', `/api/real-states/${id}`, data),
    deleteRealState: (id) => req('DELETE', `/api/real-states/${id}`),
    buyRealState: (id) => req('POST', `/api/real-states/${id}/sell`),
    addPicture: (id, formData) =>
      req('POST', `/api/real-states/${id}/pictures`, formData, true),
    deletePicture: (id, pictureId) =>
      req('DELETE', `/api/real-states/${id}/pictures/${pictureId}`),

    uploadUserPicture: (id, formData) =>
      req('POST', `/api/users/${id}/picture`, formData, true),

    getUsers: () => req('GET', '/api/users'),
    getUser: (id) => req('GET', `/api/users/${id}`),
    updateUser: (id, data) => req('PUT', `/api/users/${id}`, data),
    promoteUser: (id, role) => req('PUT', `/api/users/${id}/promote`, { role }),
    deleteUser: (id) => req('DELETE', `/api/users/${id}`),

    getAgencies: () => req('GET', '/api/agencies'),
    getAgency: (id) => req('GET', `/api/agencies/${id}`),
    createAgency: (data) => req('POST', '/api/agencies', data),
    updateAgency: (id, data) => req('PUT', `/api/agencies/${id}`, data),
    deleteAgency: (id) => req('DELETE', `/api/agencies/${id}`),
    addManager: (agencyId, userId) =>
      req('POST', `/api/agencies/${agencyId}/managers`, { user_id: userId }),
    removeManager: (agencyId, userId) =>
      req('DELETE', `/api/agencies/${agencyId}/managers/${userId}`),
  };
})();
