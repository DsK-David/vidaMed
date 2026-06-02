// ===== AUTH MODULE =====
// Autenticação e gerenciamento de sessão

import { store } from '../store.js';
import { router } from '../router.js';
import { sanitize } from '../utils.js';

export function renderLogin() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="login-page">
      <div class="card login-card">
        <div class="login-card__logo">
          <h1>Vida<span>Med</span></h1>
          <p>Gestão inteligente de medicamentos</p>
        </div>
        
        <div class="login-card__tabs">
          <button class="login-card__tab active" data-role="doctor">Médico</button>
          <button class="login-card__tab" data-role="patient">Paciente</button>
        </div>

        <form id="login-form">
          <div class="form-group">
            <label class="form-label" for="email">E-mail</label>
            <input class="form-input" type="email" id="email" placeholder="seu@email.com" required>
          </div>
          
          <div class="form-group">
            <label class="form-label" for="password">Senha</label>
            <input class="form-input" type="password" id="password" placeholder="••••••" required>
          </div>

          <button type="submit" class="btn btn--primary btn--block btn--lg">Entrar</button>
          
          <p class="text-center text-sm text-muted mt-4" id="login-hint">
            Demo: carlos@vidamed.com / med123
          </p>

          <p id="login-error" class="form-error text-center mt-2 hidden"></p>
        </form>
      </div>
    </div>
  `;

  _bindLoginEvents();
}

function _bindLoginEvents() {
  let selectedRole = 'doctor';

  // Tabs
  document.querySelectorAll('.login-card__tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.login-card__tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedRole = tab.dataset.role;
      
      const hint = document.getElementById('login-hint');
      if (selectedRole === 'doctor') {
        hint.textContent = 'Demo: carlos@vidamed.com / med123';
      } else {
        hint.textContent = 'Demo: maria@email.com / pac123';
      }
    });
  });

  // Form submit
  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = sanitize(document.getElementById('email').value.trim());
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');

    const user = store.login(email, password, selectedRole);
    
    if (user) {
      errorEl.classList.add('hidden');
      if (user.role === 'doctor') {
        router.navigate('doctor');
      } else {
        router.navigate('patient');
      }
    } else {
      errorEl.textContent = 'E-mail ou senha incorretos.';
      errorEl.classList.remove('hidden');
    }
  });
}

export function logout() {
  store.logout();
  router.navigate('login');
}

export function requireAuth(role) {
  const user = store.getCurrentUser();
  if (!user || user.role !== role) {
    router.navigate('login');
    return null;
  }
  return user;
}
