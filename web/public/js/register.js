if (isLoggedIn()) window.location.href = '/';

document.getElementById('togglePwd').addEventListener('click', () => {
  const pwd = document.getElementById('password');
  pwd.type = pwd.type === 'password' ? 'text' : 'password';
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('registerError');
  const btn = document.getElementById('submitBtn');

  errEl.hidden = true;

  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirm = document.getElementById('confirm').value;

  if (password !== confirm) {
    errEl.textContent = 'Les mots de passe ne correspondent pas.';
    errEl.hidden = false;
    return;
  }

  if (password.length < 6) {
    errEl.textContent = 'Le mot de passe doit contenir au moins 6 caractères.';
    errEl.hidden = false;
    return;
  }

  setLoading(btn, true);

  try {
    const data = await Api.register(username, email, password);
    setAuth(data.token, data.user);
    window.location.href = '/';
  } catch (err) {
    errEl.textContent = err.message;
    errEl.hidden = false;
    setLoading(btn, false);
  }
});
