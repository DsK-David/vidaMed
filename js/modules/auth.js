// ===== AUTH MODULE =====
// Autenticação e gerenciamento de sessão

import { store } from '../store.js';
import { router } from '../router.js';
import { sanitize } from '../utils.js';

async function loadTemplate(path) {
  const response = await fetch(path);
  return response.text();
}

export async function renderLogin() {
  const app = document.getElementById('app');
  const html = await loadTemplate('pages/login.html');
  app.innerHTML = html;
  _bindLoginEvents();
}

export async function renderRegister() {
  const app = document.getElementById('app');
  const html = await loadTemplate('pages/register.html');
  app.innerHTML = html;
  _bindRegisterEvents();
}

function _bindLoginEvents() {
  let selectedRole = 'doctor';

  // Tabs
  document.querySelectorAll('.login-card__tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.login-card__tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedRole = tab.dataset.role;
    });
  });

  // Form submit
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = sanitize(document.getElementById('email').value.trim());
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');

    try {
      const user = await store.login(email, password, selectedRole);
      
      if (user) {
        errorEl.classList.add('hidden');
        // Registrar push notifications após login
        _registerPush();
        if (user.role === 'doctor') {
          router.navigate('doctor');
        } else {
          router.navigate('patient');
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

  // Link to register
  document.getElementById('link-register')?.addEventListener('click', (e) => {
    e.preventDefault();
    router.navigate('register');
  });
}

function _bindRegisterEvents() {
  let selectedRole = 'doctor';

  // Tabs
  document.querySelectorAll('.login-card__tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.login-card__tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedRole = tab.dataset.role;
    });
  });

  // Form submit
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
      const user = await store.register(name, email, password, selectedRole);
      if (user) {
        _registerPush();
        router.navigate(user.role === 'doctor' ? 'doctor' : 'patient');
      }
    } catch (err) {
      errorEl.textContent = err.message || 'Erro ao criar conta.';
      errorEl.classList.remove('hidden');
    }
  });

  // Link to login
  document.getElementById('link-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    router.navigate('login');
  });
}

async function _registerPush() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    // Request notification permission first
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
    } else if (Notification.permission === 'denied') {
      return;
    }

    // Wait for service worker to be ready
    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription
    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
      await store.subscribePush(existingSub);
      return;
    }

    // Get VAPID key and create new subscription
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
