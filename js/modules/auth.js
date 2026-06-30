// ===== AUTH MODULE =====
// Autenticação via API + cookie

import { store } from '../store.js';
import { sanitize } from '../utils.js';

export function renderLogin() {
  _bindLoginEvents();
  _bindPasswordToggles();
}

export function renderRegister() {
  _bindRegisterEvents();
  _bindPasswordToggles();
}

function _bindLoginEvents() {
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = sanitize(document.getElementById('email').value.trim());
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');

    try {
      const user = await store.login(email, password);

      if (user) {
        errorEl.classList.add('hidden');
        await _registerPush();
        if (user.role === 'doctor') {
          window.location.href = '/doctor';
        } else {
          window.location.href = '/paciente';
        }
      } else {
        errorEl.textContent = 'E-mail ou senha incorretos.';
        errorEl.classList.remove('hidden');
      }
    } catch {
      errorEl.textContent = 'Erro ao conectar ao servidor.';
      errorEl.classList.remove('hidden');
    }
  });

  document.getElementById('link-register')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '/register';
  });
}

function _bindRegisterEvents() {
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = sanitize(document.getElementById('reg-name').value.trim());
    const email = sanitize(document.getElementById('reg-email').value.trim());
    const password = document.getElementById('reg-password').value;
    const passwordConfirm = document.getElementById('reg-password-confirm').value;
    const errorEl = document.getElementById('register-error');

    if (password !== passwordConfirm) {
      errorEl.textContent = 'As senhas não coincidem.';
      errorEl.classList.remove('hidden');
      return;
    }

    if (password.length < 6) {
      errorEl.textContent = 'A senha deve ter pelo menos 6 caracteres.';
      errorEl.classList.remove('hidden');
      return;
    }

    try {
      const user = await store.register(name, email, password, 'doctor');
      if (user) {
        _registerPush();
        window.location.href = '/doctor';
      }
    } catch (err) {
      errorEl.textContent = err.message || 'Erro ao criar conta.';
      errorEl.classList.remove('hidden');
    }
  });

  document.getElementById('link-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '/';
  });
}

async function _registerPush() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
    } else if (Notification.permission === 'denied') {
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
      await store.subscribePush(existingSub);
      return;
    }

    const vapidKey = await store.getVapidKey();
    if (!vapidKey) return;

    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: _urlBase64ToUint8Array(vapidKey)
    });

    await store.subscribePush(sub);
  } catch (err) {
    console.warn('[Push] Falha ao registrar push:', err.message);
  }
}

function _urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function _bindPasswordToggles() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-toggle-password]');
    if (!btn) return;

    const input = document.getElementById(btn.dataset.togglePassword);
    if (!input) return;

    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.setAttribute('aria-label', isPassword ? 'Ocultar senha' : 'Mostrar senha');
  });
}

export async function registerPush() {
  await _registerPush();
}

export function logout() {
  store.logout();
  window.location.href = '/';
}

export function requireAuth(role) {
  const user = store.getCurrentUser();
  if (!user || user.role !== role) {
    window.location.href = '/';
    return null;
  }
  return user;
}
