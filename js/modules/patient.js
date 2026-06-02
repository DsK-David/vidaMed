// ===== PATIENT MODULE =====
// Painel do paciente: visualização de prescrições e alertas

import { store } from '../store.js';
import { notifications, showToast } from '../notifications.js';
import { requireAuth, logout } from './auth.js';
import { sanitize, formatDate, formatDateTime, generateId, getToday } from '../utils.js';

let alertInterval = null;

export function renderPatientDashboard() {
  const user = requireAuth('patient');
  if (!user) return;

  const prescriptions = store.getPrescriptionsByPatient(user.id);
  const todayLogs = store.getTodayLogs(user.id);
  const pendingDoses = todayLogs.filter(l => l.status === 'pending');
  const takenDoses = todayLogs.filter(l => l.status === 'taken');

  const app = document.getElementById('app');
  app.innerHTML = `
    <nav class="navbar">
      <div class="container navbar__inner">
        <div class="navbar__brand">Vida<span>Med</span></div>
        <div class="navbar__actions">
          <span class="text-sm text-muted">${sanitize(user.name)}</span>
          ${pendingDoses.length > 0 ? `<span class="badge badge--warning">${pendingDoses.length} pendente(s)</span>` : ''}
          <button class="btn btn--ghost" id="btn-logout">Sair</button>
        </div>
      </div>
    </nav>

    <main class="container dashboard">
      <div class="dashboard__header">
        <h2>Meus Medicamentos</h2>
        <p>Acompanhe suas prescrições e horários</p>
      </div>

      <!-- Alerta ativo -->
      <div id="active-alerts"></div>

      <div class="dashboard__stats">
        <div class="stat-card">
          <div class="stat-card__value">${prescriptions.length}</div>
          <div class="stat-card__label">Prescrições Ativas</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__value">${takenDoses.length}</div>
          <div class="stat-card__label">Doses Hoje</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__value">${pendingDoses.length}</div>
          <div class="stat-card__label">Pendentes</div>
        </div>
      </div>

      <!-- Prescrições -->
      <h3 class="mb-4">Prescrições Ativas</h3>
      <div class="dashboard__grid" id="patient-prescriptions">
        ${prescriptions.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state__icon">💊</div>
            <div class="empty-state__text">Nenhuma prescrição ativa</div>
          </div>
        ` : prescriptions.map(p => _renderPatientPrescriptionCard(p)).join('')}
      </div>

      <!-- Histórico do dia -->
      <h3 class="mt-6 mb-4">Histórico de Hoje</h3>
      <div class="card">
        <div class="dose-history" id="dose-history">
          ${todayLogs.length === 0 ? `
            <p class="text-muted text-center" style="padding:var(--space-4)">Nenhum registro hoje ainda.</p>
          ` : todayLogs.map(log => _renderDoseHistoryItem(log)).join('')}
        </div>
      </div>
    </main>
  `;

  _bindPatientEvents(user);
  _startNotifications(user);
  _renderPendingAlerts(pendingDoses, prescriptions);
}

function _renderPatientPrescriptionCard(prescription) {
  return `
    <div class="card prescription-card">
      <div class="card__header">
        <span class="badge badge--info">Em tratamento</span>
      </div>
      <div class="prescription-card__medication">${sanitize(prescription.medication)}</div>
      <div class="prescription-card__dosage">${sanitize(prescription.dosage)}</div>
      <div class="prescription-card__info">
        <div class="prescription-card__info-item">📅 ${formatDate(prescription.startDate)} até ${formatDate(prescription.endDate)}</div>
        ${prescription.instructions ? `<div class="prescription-card__info-item">📝 ${sanitize(prescription.instructions)}</div>` : ''}
      </div>
      <div class="prescription-card__times">
        ${prescription.times.map(t => `<span class="time-badge">🕐 ${t}</span>`).join('')}
      </div>
    </div>
  `;
}

function _renderDoseHistoryItem(log) {
  const prescription = store.getPrescriptions().find(p => p.id === log.prescriptionId);
  const medName = prescription ? sanitize(prescription.medication) : 'Medicamento';
  
  const statusMap = {
    taken: { icon: '✓', class: 'taken', label: 'Tomado' },
    missed: { icon: '✕', class: 'missed', label: 'Perdido' },
    pending: { icon: '•', class: 'pending', label: 'Pendente' }
  };
  
  const status = statusMap[log.status] || statusMap.pending;

  return `
    <div class="dose-history__item">
      <div class="dose-history__status dose-history__status--${status.class}">${status.icon}</div>
      <div style="flex:1">
        <div style="font-weight:500">${medName}</div>
        <div class="text-sm text-muted">Horário: ${log.time}${log.takenAt ? ` • Tomado: ${formatDateTime(log.takenAt)}` : ''}</div>
      </div>
      <span class="badge badge--${log.status === 'taken' ? 'success' : log.status === 'missed' ? 'danger' : 'warning'}">${status.label}</span>
    </div>
  `;
}

function _renderPendingAlerts(pendingDoses, prescriptions) {
  const container = document.getElementById('active-alerts');
  if (!container || pendingDoses.length === 0) return;

  const alerts = pendingDoses.map(dose => {
    const presc = prescriptions.find(p => p.id === dose.prescriptionId);
    if (!presc) return '';
    return `
      <div class="medication-alert pulse">
        <div class="medication-alert__icon">💊</div>
        <div class="medication-alert__title">Hora do Medicamento!</div>
        <div class="medication-alert__medication">${sanitize(presc.medication)} - ${sanitize(presc.dosage)}</div>
        <p style="margin-bottom:var(--space-4);opacity:0.9">Horário: ${dose.time}</p>
        <div class="medication-alert__actions">
          <button class="btn" data-confirm-dose="${dose.id}">✓ Já Tomei</button>
          <button class="btn" data-skip-dose="${dose.id}" style="opacity:0.7">Pular</button>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = alerts;

  // Bind botões de confirmação
  container.querySelectorAll('[data-confirm-dose]').forEach(btn => {
    btn.addEventListener('click', () => {
      const logId = btn.dataset.confirmDose;
      store.updateDoseLog(logId, { status: 'taken', takenAt: new Date().toISOString() });
      showToast('Dose confirmada! ✓', 'success');
      renderPatientDashboard();
    });
  });

  container.querySelectorAll('[data-skip-dose]').forEach(btn => {
    btn.addEventListener('click', () => {
      const logId = btn.dataset.skipDose;
      store.updateDoseLog(logId, { status: 'missed' });
      showToast('Dose marcada como perdida.', 'warning');
      renderPatientDashboard();
    });
  });
}

function _startNotifications(user) {
  notifications.stop();
  notifications.start(user.id, (prescription, time) => {
    showToast(`💊 Hora de tomar ${prescription.medication}! (${time})`, 'alert', 10000);
    renderPatientDashboard();
  });
}

function _bindPatientEvents(user) {
  document.getElementById('btn-logout').addEventListener('click', () => {
    notifications.stop();
    logout();
  });
}

export function cleanupPatient() {
  notifications.stop();
}
