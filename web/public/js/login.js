if (isLoggedIn()) window.location.href = '/';

document.getElementById('togglePwd').addEventListener('click', () => {
  const pwd = document.getElementById('password');
  pwd.type = pwd.type === 'password' ? 'text' : 'password';
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('loginError');
  const btn = document.getElementById('submitBtn');

  errEl.hidden = true;
  setLoading(btn, true);

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const data = await Api.login(email, password);
    setAuth(data.token, data.user);
    window.location.href = '/';
  } catch (err) {
    errEl.textContent = err.message;
    errEl.hidden = false;
    setLoading(btn, false);
  }
});
