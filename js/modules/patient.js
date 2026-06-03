// ===== PATIENT MODULE =====
// Painel do paciente com sidebar e navegação por seções

import { store } from '../store.js';
import { notifications, showToast } from '../notifications.js';
import { requireAuth, logout } from './auth.js';
import { sanitize, formatDate, formatDateTime, getToday, getInitials } from '../utils.js';

let currentSection = 'overview';

async function loadTemplate(path) {
  const response = await fetch(path);
  return response.text();
}

export async function renderPatientDashboard() {
  const user = requireAuth('patient');
  if (!user) return;

  const app = document.getElementById('app');
  const layout = await loadTemplate('pages/patient/layout.html');
  app.innerHTML = layout;

  // Populate user info
  document.getElementById('patient-name').textContent = user.name;
  document.getElementById('patient-avatar').textContent = getInitials(user.name);

  _bindSidebarEvents(user);
  _navigateTo('overview', user);
  _startNotifications(user);
}

function _bindSidebarEvents(user) {
  // Logout
  document.getElementById('btn-logout').addEventListener('click', () => {
    notifications.stop();
    logout();
  });

  // Sidebar toggle
  const panel = document.querySelector('.panel');
  const toggleBtn = document.getElementById('btn-toggle-sidebar');
  const toggleIcon = toggleBtn.querySelector('i');
  toggleBtn.addEventListener('click', () => {
    panel.classList.toggle('sidebar-collapsed');
    if (panel.classList.contains('sidebar-collapsed')) {
      toggleIcon.className = 'bx bx-menu';
    } else {
      toggleIcon.className = 'bx bx-chevrons-left';
    }
  });

  // Sidebar navigation
  document.querySelectorAll('.sidebar__link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      _navigateTo(section, user);
    });
  });
}

function _navigateTo(section, user) {
  currentSection = section;

  // Update active link
  document.querySelectorAll('.sidebar__link').forEach(l => l.classList.remove('active'));
  const activeLink = document.querySelector(`[data-section="${section}"]`);
  if (activeLink) activeLink.classList.add('active');

  // Update title
  const titles = {
    'overview': 'Início',
    'prescriptions': 'Minhas Prescrições',
    'history': 'Histórico'
  };
  document.getElementById('panel-title').textContent = titles[section] || '';

  // Render section content
  const body = document.getElementById('panel-body');
  switch (section) {
    case 'overview':
      _renderOverview(body, user);
      break;
    case 'prescriptions':
      _renderPrescriptions(body, user);
      break;
    case 'history':
      _renderHistory(body, user);
      break;
  }
}

// ===== OVERVIEW =====
async function _renderOverview(container, user) {
  const prescriptions = await store.getPrescriptionsByPatient(user.id);
  const todayLogs = await store.getTodayLogs(user.id);
  const pendingDoses = todayLogs.filter(l => l.status === 'pending');
  const takenDoses = todayLogs.filter(l => l.status === 'taken');

  container.innerHTML = `
    <!-- Alertas ativos -->
    <div class="patient-overview__alerts" id="active-alerts">
      ${pendingDoses.map(dose => {
        const presc = prescriptions.find(p => p.id === dose.prescriptionId);
        if (!presc) return '';
        return `
          <div class="dose-alert-card">
            <div class="dose-alert-card__icon">💊</div>
            <div class="dose-alert-card__info">
              <div class="dose-alert-card__title">Hora do Medicamento!</div>
              <div class="dose-alert-card__medication">${sanitize(presc.medication)} - ${sanitize(presc.dosage)} (${dose.time})</div>
            </div>
            <div class="dose-alert-card__actions">
              <button class="btn btn--confirm" data-confirm-dose="${dose.id}">✓ Tomei</button>
              <button class="btn" data-skip-dose="${dose.id}">Pular</button>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <!-- Stats -->
    <div class="patient-overview__stats">
      <div class="patient-overview__stat">
        <div class="patient-overview__stat-value">${prescriptions.length}</div>
        <div class="patient-overview__stat-label">Prescrições Ativas</div>
      </div>
      <div class="patient-overview__stat patient-overview__stat--success">
        <div class="patient-overview__stat-value">${takenDoses.length}</div>
        <div class="patient-overview__stat-label">Tomadas Hoje</div>
      </div>
      <div class="patient-overview__stat patient-overview__stat--warning">
        <div class="patient-overview__stat-value">${pendingDoses.length}</div>
        <div class="patient-overview__stat-label">Pendentes</div>
      </div>
    </div>

    <!-- Histórico do dia -->
    <div class="dose-history-panel">
      <div class="dose-history-panel__header">
        <h3>Hoje</h3>
        <span class="text-sm text-muted">${formatDate(getToday())}</span>
      </div>
      <div class="dose-history-panel__body">
        ${todayLogs.length === 0 ? `
          <div class="dose-history-panel__empty">Nenhum registro hoje ainda.</div>
        ` : `<div class="dose-history">${todayLogs.map(log => _renderDoseHistoryItem(log, prescriptions)).join('')}</div>`}
      </div>
    </div>
  `;

  _bindDoseButtons(container, user);
}

// ===== PRESCRIPTIONS =====
async function _renderPrescriptions(container, user) {
  const prescriptions = await store.getPrescriptionsByPatient(user.id);

  container.innerHTML = `
    <div class="patient-prescriptions">
      ${prescriptions.length === 0 ? `
        <div class="overview__recent" style="grid-column:1/-1;text-align:center;padding:var(--space-8)">
          <p class="text-muted">Nenhuma prescrição ativa no momento.</p>
        </div>
      ` : prescriptions.map(p => _renderPrescriptionCard(p)).join('')}
    </div>
  `;
}

function _renderPrescriptionCard(prescription) {
  return `
    <div class="card prescription-card">
      <div class="card__header">
        <span class="badge badge--info">Em tratamento</span>
      </div>
      <div class="prescription-card__medication">${sanitize(prescription.medication)}</div>
      <div class="prescription-card__dosage">${sanitize(prescription.dosage)}</div>
      <div class="prescription-card__info">
        <div class="prescription-card__info-item">
          <i class='bx bx-calendar'></i> ${formatDate(prescription.startDate)} até ${formatDate(prescription.endDate)}
        </div>
        ${prescription.instructions ? `
          <div class="prescription-card__info-item">
            <i class='bx bx-note'></i> ${sanitize(prescription.instructions)}
          </div>
        ` : ''}
      </div>
      <div class="prescription-card__times">
        ${prescription.times.map(t => `<span class="time-badge"><i class='bx bx-time'></i> ${t}</span>`).join('')}
      </div>
    </div>
  `;
}

// ===== HISTORY =====
async function _renderHistory(container, user) {
  const prescriptions = await store.getPrescriptionsByPatient(user.id);
  const todayLogs = await store.getTodayLogs(user.id);

  container.innerHTML = `
    <div class="dose-history-panel">
      <div class="dose-history-panel__header">
        <h3>Histórico de Doses</h3>
        <span class="text-sm text-muted">${formatDate(getToday())}</span>
      </div>
      <div class="dose-history-panel__body">
        ${todayLogs.length === 0 ? `
          <div class="dose-history-panel__empty">Nenhum registro encontrado para hoje.</div>
        ` : `<div class="dose-history">${todayLogs.map(log => _renderDoseHistoryItem(log, prescriptions)).join('')}</div>`}
      </div>
    </div>
  `;

  _bindDoseButtons(container, user);
}

// ===== SHARED HELPERS =====
function _renderDoseHistoryItem(log, prescriptions) {
  const prescription = prescriptions.find(p => p.id === log.prescriptionId);
  const medName = prescription ? sanitize(prescription.medication) : 'Medicamento';

  const statusMap = {
    taken: { icon: '<i class="bx bx-check"></i>', class: 'taken', label: 'Tomado' },
    missed: { icon: '<i class="bx bx-x"></i>', class: 'missed', label: 'Perdido' },
    pending: { icon: '<i class="bx bx-time-five"></i>', class: 'pending', label: 'Pendente' }
  };

  const status = statusMap[log.status] || statusMap.pending;

  return `
    <div class="dose-history__item">
      <div class="dose-history__status dose-history__status--${status.class}">${status.icon}</div>
      <div style="flex:1">
        <div style="font-weight:500">${medName}</div>
        <div class="text-sm text-muted">Horário: ${log.time}${log.takenAt ? ` • Tomado: ${formatDateTime(log.takenAt)}` : ''}</div>
      </div>
      ${log.status === 'pending' ? `
        <div style="display:flex;gap:var(--space-2)">
          <button class="btn btn--sm btn--primary" data-confirm-dose="${log.id}">✓ Tomei</button>
          <button class="btn btn--sm btn--ghost" data-skip-dose="${log.id}">Pular</button>
        </div>
      ` : `
        <span class="badge badge--${log.status === 'taken' ? 'success' : 'danger'}">${status.label}</span>
      `}
    </div>
  `;
}

function _bindDoseButtons(container, user) {
  container.querySelectorAll('[data-confirm-dose]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const logId = btn.dataset.confirmDose;
      await store.updateDoseLog(logId, { status: 'taken', takenAt: new Date().toISOString() });
      showToast('Dose confirmada! ✓', 'success');
      _navigateTo(currentSection, user);
    });
  });

  container.querySelectorAll('[data-skip-dose]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const logId = btn.dataset.skipDose;
      await store.updateDoseLog(logId, { status: 'missed' });
      showToast('Dose marcada como perdida.', 'warning');
      _navigateTo(currentSection, user);
    });
  });
}

function _startNotifications(user) {
  notifications.stop();
  notifications.start(user.id, (prescription, time) => {
    showToast(`💊 Hora de tomar ${prescription.medication}! (${time})`, 'alert', 10000);
    _navigateTo(currentSection, user);
  });
}

export function cleanupPatient() {
  notifications.stop();
}
