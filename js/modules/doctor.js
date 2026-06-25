// ===== DOCTOR MODULE =====
// Painel do médico com sidebar e navegação por seções

import { store } from '../store.js';
import { showToast } from '../notifications.js';
import { requireAuth, logout } from './auth.js';
import { formatDate, sanitize, getToday, getInitials } from '../utils.js';

let currentSection = 'overview';

async function loadTemplate(path) {
  const response = await fetch(path);
  return response.text();
}

export async function renderDoctorDashboard() {
  const user = requireAuth('doctor');
  if (!user) return;

  const app = document.getElementById('app');
  const layout = await loadTemplate('pages/doctor/layout.html');
  app.innerHTML = layout;

  // Populate user info
  document.getElementById('doctor-name').textContent = user.name;
  document.getElementById('doctor-avatar').textContent = getInitials(user.name);

  _bindSidebarEvents(user);
  _navigateTo('overview', user);
}

function _bindSidebarEvents(user) {
  // Logout
  document.getElementById('btn-logout').addEventListener('click', logout);

  // Sidebar toggle
  const panel = document.querySelector('.panel');
  const toggleBtn = document.getElementById('btn-toggle-sidebar');
  const toggleIcon = toggleBtn.querySelector('i');
  toggleBtn.addEventListener('click', () => {
    const collapsed = panel.classList.toggle('sidebar-collapsed');
    toggleBtn.setAttribute('aria-expanded', String(!collapsed));
    toggleBtn.setAttribute('title', collapsed ? 'Abrir menu' : 'Recolher menu');
    if (collapsed) {
      toggleIcon.className = 'bx bx-menu';
      toggleIcon.style.transform = 'rotate(0deg)';
    } else {
      toggleIcon.className = 'bx bx-chevrons-left';
      toggleIcon.style.transform = 'rotate(0deg)';
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

  // Quick action cards
  document.getElementById('quick-new-prescription')?.addEventListener('click', () => _navigateTo('new-prescription', user));
  document.getElementById('quick-new-patient')?.addEventListener('click', () => _navigateTo('new-patient', user));
  document.getElementById('quick-schedule')?.addEventListener('click', () => showToast('Agenda', 'Funcionalidade de agendamento ainda não implementada'));
}

function _navigateTo(section, user) {
  currentSection = section;

  // Update active link
  document.querySelectorAll('.sidebar__link').forEach(l => l.classList.remove('active'));
  const activeLink = document.querySelector(`[data-section="${section}"]`);
  if (activeLink) activeLink.classList.add('active');

  // Update title
  const titles = {
    'overview': 'Visão Geral',
    'patients': 'Meus Pacientes',
    'prescriptions': 'Prescrições',
    'new-prescription': 'Nova Prescrição',
    'new-patient': 'Novo Paciente'
  };
  document.getElementById('panel-title').textContent = titles[section] || '';

  // Render section content
  const body = document.getElementById('panel-body');
  switch (section) {
    case 'overview':
      _renderOverview(body, user);
      break;
    case 'patients':
      _renderPatients(body, user);
      break;
    case 'prescriptions':
      _renderPrescriptions(body, user);
      break;
    case 'new-prescription':
      _renderNewPrescription(body, user);
      break;
    case 'new-patient':
      _renderNewPatient(body, user);
      break;
  }
}

// ===== OVERVIEW =====
async function _renderOverview(container, user) {
  const patients = await store.getPatients();
  const prescriptions = await store.getPrescriptionsByDoctor();
  const active = prescriptions.filter(p => p.active);
  const inactive = prescriptions.filter(p => !p.active);

  container.innerHTML = `
    <div class="overview__stats">
      <div class="overview__stat">
        <div class="overview__stat-icon"><i class="bx bx-user"></i></div>
        <div>
          <div class="overview__stat-value">${patients.length}</div>
          <div class="overview__stat-label">Pacientes</div>
        </div>
      </div>
      <div class="overview__stat">
        <div class="overview__stat-icon"><i class="bx bx-capsule"></i></div>
        <div>
          <div class="overview__stat-value">${active.length}</div>
          <div class="overview__stat-label">Prescrições Ativas</div>
        </div>
      </div>
      <div class="overview__stat">
        <div class="overview__stat-icon"><i class="bx bx-check-circle"></i></div>
        <div>
          <div class="overview__stat-value">${inactive.length}</div>
          <div class="overview__stat-label">Finalizadas</div>
        </div>
      </div>
      <div class="overview__stat">
        <div class="overview__stat-icon"><i class="bx bx-list-check"></i></div>
        <div>
          <div class="overview__stat-value">${prescriptions.length}</div>
          <div class="overview__stat-label">Total Prescrições</div>
        </div>
      </div>
    </div>

    <div class="overview__recent">
      <h3>Últimas Prescrições</h3>
      ${active.length === 0 ? `
        <p class="text-muted text-sm">Nenhuma prescrição ativa no momento.</p>
      ` : `
        <table class="data-table">
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Medicamento</th>
              <th>Dosagem</th>
              <th>Período</th>
            </tr>
          </thead>
          <tbody>
            ${active.slice(0, 5).map(p => {
              const pat = patients.find(pt => pt.id === p.patientId);
              return `<tr>
                <td>${pat ? sanitize(pat.name) : '—'}</td>
                <td><strong>${sanitize(p.medication)}</strong></td>
                <td>${sanitize(p.dosage)}</td>
                <td>${formatDate(p.startDate)} – ${formatDate(p.endDate)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      `}
    </div>
  `;
}

// ===== PATIENTS LIST =====
async function _renderPatients(container, user) {
  const patients = await store.getPatients();

  container.innerHTML = `
    <div class="actions-row">
      <p class="text-sm text-muted">${patients.length} paciente(s) cadastrado(s)</p>
      <div class="actions-row__right">
        <button class="btn btn--primary" id="btn-goto-new-patient">+ Novo Paciente</button>
      </div>
    </div>

    ${patients.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state__icon">👥</div>
        <div class="empty-state__text">Nenhum paciente cadastrado</div>
      </div>
    ` : `
      <table class="data-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>E-mail</th>
            <th>Prescrições Ativas</th>
            <th>Cadastro</th>
          </tr>
        </thead>
        <tbody>
          ${patients.map(p => `<tr>
              <td><strong>${sanitize(p.name)}</strong></td>
              <td>${sanitize(p.email)}</td>
              <td>—</td>
              <td>${formatDate(p.createdAt)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    `}
  `;

  document.getElementById('btn-goto-new-patient')?.addEventListener('click', () => {
    _navigateTo('new-patient', user);
  });
}

// ===== PRESCRIPTIONS LIST =====
async function _renderPrescriptions(container, user) {
  const patients = await store.getPatients();
  const prescriptions = await store.getPrescriptionsByDoctor();

  container.innerHTML = `
    <div class="actions-row">
      <p class="text-sm text-muted">${prescriptions.length} prescrição(ões) no total</p>
      <div class="actions-row__right">
        <button class="btn btn--primary" id="btn-goto-new-presc">+ Nova Prescrição</button>
      </div>
    </div>

    ${prescriptions.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state__icon">💊</div>
        <div class="empty-state__text">Nenhuma prescrição criada</div>
      </div>
    ` : `
      <table class="data-table">
        <thead>
          <tr>
            <th>Medicamento</th>
            <th>Paciente</th>
            <th>Dosagem</th>
            <th>Horários</th>
            <th>Período</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${prescriptions.map(p => {
            const pat = patients.find(pt => pt.id === p.patientId);
            return `<tr>
              <td><strong>${sanitize(p.medication)}</strong></td>
              <td>${pat ? sanitize(pat.name) : '—'}</td>
              <td>${sanitize(p.dosage)}</td>
              <td>${p.times.map(t => `<span class="time-badge">${t}</span>`).join(' ')}</td>
              <td>${formatDate(p.startDate)} – ${formatDate(p.endDate)}</td>
              <td>${p.active ? '<span class="badge badge--success">Ativa</span>' : '<span class="badge badge--danger">Inativa</span>'}</td>
              <td>${p.active ? `<button class="btn btn--ghost" data-deactivate="${p.id}" title="Desativar"><i class='bx bx-x'></i></button>` : '—'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    `}
  `;

  document.getElementById('btn-goto-new-presc')?.addEventListener('click', () => {
    _navigateTo('new-prescription', user);
  });

  container.querySelectorAll('[data-deactivate]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await store.updatePrescription(btn.dataset.deactivate, { active: false });
      showToast('Prescrição desativada.', 'success');
      _renderPrescriptions(container, user);
    });
  });
}

// ===== NEW PRESCRIPTION FORM =====
async function _renderNewPrescription(container, user) {
  const patients = await store.getPatients();

  container.innerHTML = `
    ${patients.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state__icon">⚠️</div>
        <div class="empty-state__text">Cadastre um paciente antes de criar prescrições</div>
        <button class="btn btn--primary mt-4" id="btn-goto-new-patient-2">Cadastrar Paciente</button>
      </div>
    ` : `
      <form id="form-prescription" class="form-full">
        <div class="form-full__grid">
          <div class="form-group form-full__span-2">
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
          <div class="form-group form-full__span-2">
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
          <div class="form-group form-full__span-2">
            <label class="form-label">Instruções</label>
            <textarea class="form-textarea" id="presc-instructions" placeholder="Ex: Tomar após as refeições"></textarea>
          </div>
        </div>
        <div class="form-full__actions">
          <button type="submit" class="btn btn--primary btn--lg">Salvar Prescrição</button>
        </div>
      </form>
    `}
  `;

  document.getElementById('presc-start')?.setAttribute('value', getToday());

  document.getElementById('btn-goto-new-patient-2')?.addEventListener('click', () => {
    _navigateTo('new-patient', user);
  });

  document.getElementById('form-prescription')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const timesRaw = document.getElementById('presc-times').value;
    const times = timesRaw.split(',').map(t => t.trim()).filter(t => /^\d{2}:\d{2}$/.test(t));

    if (times.length === 0) {
      showToast('Formato de horário inválido. Use HH:MM', 'error');
      return;
    }

    try {
      await store.addPrescription({
        patientId: document.getElementById('presc-patient').value,
        medication: sanitize(document.getElementById('presc-medication').value.trim()),
        dosage: sanitize(document.getElementById('presc-dosage').value.trim()),
        times,
        startDate: document.getElementById('presc-start').value,
        endDate: document.getElementById('presc-end').value,
        instructions: sanitize(document.getElementById('presc-instructions').value.trim())
      });
      showToast('Prescrição criada com sucesso!', 'success');
      _navigateTo('prescriptions', user);
    } catch (err) {
      showToast(err.message || 'Erro ao criar prescrição', 'error');
    }
  });
}

// ===== NEW PATIENT FORM =====
function _renderNewPatient(container, user) {
  container.innerHTML = `
    <form id="form-patient" class="form-full">
      <div class="form-full__grid">
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
          <input class="form-input" type="text" id="patient-password" placeholder="Senha para o paciente fazer login" required minlength="4">
        </div>
      </div>
      <div class="form-full__actions">
        <button type="submit" class="btn btn--primary btn--lg">Cadastrar Paciente</button>
      </div>
    </form>
  `;

  document.getElementById('form-patient').addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
      await store.addPatient({
        name: sanitize(document.getElementById('patient-name').value.trim()),
        email: sanitize(document.getElementById('patient-email').value.trim()),
        password: document.getElementById('patient-password').value
      });
      showToast('Paciente cadastrado com sucesso!', 'success');
      _navigateTo('patients', user);
    } catch (err) {
      showToast(err.message || 'Erro ao cadastrar paciente', 'error');
    }
  });
}
