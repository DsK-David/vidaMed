// ===== DOCTOR MODULE =====
// Painel do médico: gerenciamento de pacientes e prescrições

import { store } from '../store.js';
import { router } from '../router.js';
import { showToast } from '../notifications.js';
import { requireAuth, logout } from './auth.js';
import { generateId, formatDate, sanitize, getToday, getInitials } from '../utils.js';

export function renderDoctorDashboard() {
  const user = requireAuth('doctor');
  if (!user) return;

  const patients = store.getPatients(user.id);
  const prescriptions = store.getPrescriptionsByDoctor(user.id);
  const activePrescriptions = prescriptions.filter(p => p.active);

  const app = document.getElementById('app');
  app.innerHTML = `
    <nav class="navbar">
      <div class="container navbar__inner">
        <div class="navbar__brand">Vida<span>Med</span></div>
        <div class="navbar__actions">
          <span class="text-sm text-muted">Dr(a). ${sanitize(user.name)}</span>
          <button class="btn btn--ghost" id="btn-logout">Sair</button>
        </div>
      </div>
    </nav>

    <main class="container dashboard">
      <div class="dashboard__header">
        <h2>Painel do Médico</h2>
        <p>Gerencie seus pacientes e prescrições</p>
      </div>

      <div class="dashboard__stats">
        <div class="stat-card">
          <div class="stat-card__value">${patients.length}</div>
          <div class="stat-card__label">Pacientes</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__value">${activePrescriptions.length}</div>
          <div class="stat-card__label">Prescrições Ativas</div>
        </div>
      </div>

      <div style="display:flex;gap:var(--space-4);margin-bottom:var(--space-6);flex-wrap:wrap;">
        <button class="btn btn--primary" id="btn-new-prescription">+ Nova Prescrição</button>
        <button class="btn btn--outline" id="btn-add-patient">+ Novo Paciente</button>
      </div>

      <h3 class="mb-4">Prescrições Ativas</h3>
      <div class="dashboard__grid" id="prescriptions-grid">
        ${activePrescriptions.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state__icon">📋</div>
            <div class="empty-state__text">Nenhuma prescrição ativa</div>
          </div>
        ` : activePrescriptions.map(p => _renderPrescriptionCard(p, patients)).join('')}
      </div>
    </main>

    <!-- Modal Nova Prescrição -->
    <div class="modal-overlay" id="modal-prescription">
      <div class="modal">
        <div class="modal__header">
          <h3>Nova Prescrição</h3>
          <button class="modal__close" data-close-modal>&times;</button>
        </div>
        <form id="form-prescription">
          <div class="form-group">
            <label class="form-label">Paciente</label>
            <select class="form-select" id="presc-patient" required>
              <option value="">Selecione o paciente</option>
              ${patients.map(p => `<option value="${p.id}">${sanitize(p.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Medicamento</label>
            <input class="form-input" id="presc-medication" placeholder="Ex: Amoxicilina" required>
          </div>
          <div class="form-group">
            <label class="form-label">Dosagem</label>
            <input class="form-input" id="presc-dosage" placeholder="Ex: 500mg" required>
          </div>
          <div class="form-group">
            <label class="form-label">Horários (separados por vírgula)</label>
            <input class="form-input" id="presc-times" placeholder="Ex: 08:00, 14:00, 20:00" required>
          </div>
          <div class="form-group">
            <label class="form-label">Data Início</label>
            <input class="form-input" type="date" id="presc-start" required>
          </div>
          <div class="form-group">
            <label class="form-label">Data Fim</label>
            <input class="form-input" type="date" id="presc-end" required>
          </div>
          <div class="form-group">
            <label class="form-label">Instruções</label>
            <textarea class="form-textarea" id="presc-instructions" placeholder="Ex: Tomar após as refeições"></textarea>
          </div>
          <button type="submit" class="btn btn--primary btn--block">Salvar Prescrição</button>
        </form>
      </div>
    </div>

    <!-- Modal Novo Paciente -->
    <div class="modal-overlay" id="modal-patient">
      <div class="modal">
        <div class="modal__header">
          <h3>Novo Paciente</h3>
          <button class="modal__close" data-close-modal>&times;</button>
        </div>
        <form id="form-patient">
          <div class="form-group">
            <label class="form-label">Nome Completo</label>
            <input class="form-input" id="patient-name" placeholder="Nome do paciente" required>
          </div>
          <div class="form-group">
            <label class="form-label">E-mail</label>
            <input class="form-input" type="email" id="patient-email" placeholder="paciente@email.com" required>
          </div>
          <div class="form-group">
            <label class="form-label">Senha de Acesso</label>
            <input class="form-input" type="text" id="patient-password" placeholder="Senha para login" required>
          </div>
          <button type="submit" class="btn btn--primary btn--block">Cadastrar Paciente</button>
        </form>
      </div>
    </div>
  `;

  _bindDoctorEvents(user);
}

function _renderPrescriptionCard(prescription, patients) {
  const patient = patients.find(p => p.id === prescription.patientId);
  const patientName = patient ? sanitize(patient.name) : 'Paciente não encontrado';

  return `
    <div class="card prescription-card">
      <div class="card__header">
        <span class="badge badge--success">Ativa</span>
        <button class="btn btn--ghost btn--sm" data-delete-prescription="${prescription.id}" title="Desativar">✕</button>
      </div>
      <div class="prescription-card__medication">${sanitize(prescription.medication)}</div>
      <div class="prescription-card__dosage">${sanitize(prescription.dosage)}</div>
      <div class="prescription-card__info">
        <div class="prescription-card__info-item">👤 ${patientName}</div>
        <div class="prescription-card__info-item">📅 ${formatDate(prescription.startDate)} - ${formatDate(prescription.endDate)}</div>
        ${prescription.instructions ? `<div class="prescription-card__info-item">📝 ${sanitize(prescription.instructions)}</div>` : ''}
      </div>
      <div class="prescription-card__times">
        ${prescription.times.map(t => `<span class="time-badge">🕐 ${t}</span>`).join('')}
      </div>
    </div>
  `;
}

function _bindDoctorEvents(user) {
  // Logout
  document.getElementById('btn-logout').addEventListener('click', logout);

  // Abrir modal prescrição
  document.getElementById('btn-new-prescription').addEventListener('click', () => {
    document.getElementById('modal-prescription').classList.add('active');
    document.getElementById('presc-start').value = getToday();
  });

  // Abrir modal paciente
  document.getElementById('btn-add-patient').addEventListener('click', () => {
    document.getElementById('modal-patient').classList.add('active');
  });

  // Fechar modais
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal-overlay').classList.remove('active');
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });

  // Form prescrição
  document.getElementById('form-prescription').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const timesRaw = document.getElementById('presc-times').value;
    const times = timesRaw.split(',').map(t => t.trim()).filter(t => /^\d{2}:\d{2}$/.test(t));
    
    if (times.length === 0) {
      showToast('Formato de horário inválido. Use HH:MM', 'error');
      return;
    }

    const prescription = {
      id: generateId(),
      doctorId: user.id,
      patientId: document.getElementById('presc-patient').value,
      medication: sanitize(document.getElementById('presc-medication').value.trim()),
      dosage: sanitize(document.getElementById('presc-dosage').value.trim()),
      times,
      startDate: document.getElementById('presc-start').value,
      endDate: document.getElementById('presc-end').value,
      instructions: sanitize(document.getElementById('presc-instructions').value.trim()),
      active: true,
      createdAt: new Date().toISOString()
    };

    store.addPrescription(prescription);
    showToast('Prescrição criada com sucesso!', 'success');
    document.getElementById('modal-prescription').classList.remove('active');
    renderDoctorDashboard();
  });

  // Form paciente
  document.getElementById('form-patient').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const patient = {
      id: generateId(),
      name: sanitize(document.getElementById('patient-name').value.trim()),
      email: sanitize(document.getElementById('patient-email').value.trim()),
      password: document.getElementById('patient-password').value,
      role: 'patient',
      doctorId: user.id,
      createdAt: new Date().toISOString()
    };

    store.addPatient(patient);
    showToast('Paciente cadastrado com sucesso!', 'success');
    document.getElementById('modal-patient').classList.remove('active');
    renderDoctorDashboard();
  });

  // Deletar prescrição
  document.querySelectorAll('[data-delete-prescription]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.deletePrescription;
      store.updatePrescription(id, { active: false });
      showToast('Prescrição desativada.', 'info');
      renderDoctorDashboard();
    });
  });
}
