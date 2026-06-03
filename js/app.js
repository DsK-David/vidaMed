// ===== APP.JS =====
// Inicialização da aplicação e registro de rotas

import { router } from './router.js';
import { store } from './store.js';
import { renderLogin, renderRegister } from './modules/auth.js';
import { renderDoctorDashboard } from './modules/doctor.js';
import { renderPatientDashboard, cleanupPatient } from './modules/patient.js';

function init() {
  // Registrar rotas
  router.register('login', () => {
    cleanupPatient();
    renderLogin();
  });

  router.register('register', () => {
    cleanupPatient();
    renderRegister();
  });

  router.register('doctor', () => {
    cleanupPatient();
    renderDoctorDashboard();
  });

  router.register('patient', () => {
    renderPatientDashboard();
  });

  // Verificar se há usuário logado
  const user = store.getCurrentUser();
  if (user) {
    router.start(user.role === 'doctor' ? 'doctor' : 'patient');
  } else {
    router.start('login');
  }
}

// Aguardar DOM
document.addEventListener('DOMContentLoaded', init);
