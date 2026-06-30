// ===== PATIENT MODULE =====
// Interatividade do painel do paciente (SSR)

import { store } from '../store.js';
import { notifications, showToast } from '../notifications.js';
import { registerPush } from './auth.js';
import { sanitize, formatDateTime } from '../utils.js';

export async function initPatientDashboard(prescriptions, userId) {
  await registerPush();
  _showConfirmationToast();
  await _renderDoseButtons(prescriptions, userId);
  _bindDoseButtons();
  _startNotifications(prescriptions, userId);
}

function _showConfirmationToast() {
  const params = new URLSearchParams(window.location.search);
  const doseId = params.get('confirmado');
  if (doseId) {
    showToast('Dose confirmada via notificação! ✓', 'success', 4000);
    _scrollToPendingDose();
  } else if (params.has('abrir')) {
    _scrollToPendingDose();
  }
  if (doseId || params.has('abrir')) {
    history.replaceState(null, '', window.location.pathname);
  }
}

function _scrollToPendingDose() {
  const firstPending = document.querySelector('.btn-dose.pulse');
  if (firstPending) {
    setTimeout(() => {
      firstPending.closest('.prescription-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 500);
  }
}

async function _renderDoseButtons(prescriptions, userId) {
  const todayLogs = await store.getTodayLogs(userId);
  if (!todayLogs.length) return;

  for (const log of todayLogs) {
    if (log.status !== 'pending') continue;
    const presc = prescriptions.find(p => p.id === log.prescriptionId);
    if (!presc) continue;

    const container = document.getElementById(`doses-${log.prescriptionId}`);
    if (!container) continue;

    const btn = document.createElement('button');
    btn.className = 'btn-dose pulse';
    btn.dataset.confirmDose = log.id;
    btn.textContent = `✓ ${log.time}`;
    btn.title = `Confirmar dose das ${log.time}`;
    container.appendChild(btn);
  }
}

function _bindDoseButtons() {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-confirm-dose]');
    if (!btn) return;

    const logId = btn.dataset.confirmDose;
    try {
      await store.updateDoseLog(logId, { status: 'taken', takenAt: new Date().toISOString() });
      showToast('Dose confirmada! ✓', 'success');
      btn.classList.remove('pulse');
      btn.textContent = '✓ Tomado';
      btn.disabled = true;
      _updateStats('taken');
    } catch (err) {
      showToast(err.message || 'Erro ao confirmar dose', 'error');
    }
  });

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-skip-dose]');
    if (!btn) return;

    const logId = btn.dataset.skipDose;
    try {
      await store.updateDoseLog(logId, { status: 'missed' });
      showToast('Dose marcada como perdida.', 'warning');
      btn.closest('.dose-history__item')?.remove();
      _updateStats('missed');
    } catch (err) {
      showToast(err.message || 'Erro ao pular dose', 'error');
    }
  });
}

function _updateStats(newStatus) {
  const pendingEl = document.getElementById('doses-pending');
  const takenEl = document.getElementById('doses-taken');
  if (!pendingEl || !takenEl) return;

  const pending = parseInt(pendingEl.textContent) || 0;
  const taken = parseInt(takenEl.textContent) || 0;

  if (newStatus === 'taken') {
    pendingEl.textContent = Math.max(0, pending - 1);
    takenEl.textContent = taken + 1;
  } else if (newStatus === 'missed') {
    pendingEl.textContent = Math.max(0, pending - 1);
  }
}

function _startNotifications(prescriptions, userId) {
  if (!userId) return;

  notifications.stop();
  notifications.start(userId, (prescription, time) => {
    showToast(`💊 Hora de tomar ${prescription.medication}! (${time})`, 'alert', 10000);
  });

  // Escutar mensagens do Service Worker
  navigator.serviceWorker?.addEventListener('message', (event) => {
    if (event.data?.type === 'dose-taken') {
      const btn = document.querySelector(`[data-confirm-dose="${event.data.doseLogId}"]`);
      if (btn) {
        btn.classList.remove('pulse');
        btn.textContent = '✓ Tomado';
        btn.disabled = true;
      }
      _updateStats('taken');
      showToast('Dose confirmada via notificação! ✓', 'success');
    }
    if (event.data?.type === 'notification-open') {
      _scrollToPendingDose();
      showToast('Clique em ✓ para confirmar a dose', 'alert', 5000);
    }
  });
}

export function cleanupPatient() {
  notifications.stop();
}
