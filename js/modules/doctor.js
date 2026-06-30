// ===== DOCTOR MODULE =====
// Interatividade do painel do médico (SSR — templates estão no servidor)

import { store } from '../store.js';
import { showToast } from '../notifications.js';
import { sanitize } from '../utils.js';

// Sidebar toggle
document.addEventListener('click', (e) => {
  const btn = e.target.closest('#btn-toggle-sidebar');
  if (!btn) return;

  const panel = document.querySelector('.panel');
  const collapsed = panel.classList.toggle('sidebar-collapsed');
  btn.setAttribute('aria-expanded', String(!collapsed));
  btn.setAttribute('title', collapsed ? 'Abrir menu' : 'Recolher menu');
  const icon = btn.querySelector('i');
  if (icon) {
    icon.className = collapsed ? 'bx bx-menu' : 'bx bx-chevrons-left';
    icon.style.transform = 'rotate(0deg)';
  }
});

// Quick schedule (overview)
document.addEventListener('click', (e) => {
  const el = e.target.closest('#quick-schedule');
  if (el) showToast('Agenda', 'Funcionalidade de agendamento ainda não implementada');
});

// Deactivate prescription
export function initPrescriptions() {
  document.querySelectorAll('.btn-deactivate').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      try {
        await store.updatePrescription(id, { active: false });
        showToast('Prescrição desativada.', 'success');
        const row = btn.closest('tr');
        if (row) {
          const badge = row.querySelector('.badge--success');
          if (badge) {
            badge.textContent = 'Inativa';
            badge.className = 'badge badge--danger';
          }
          btn.remove();
        }
      } catch (err) {
        showToast(err.message || 'Erro ao desativar', 'error');
      }
    });
  });
}

// ===== Combobox =====

function initCombobox(el) {
  const input = el.querySelector('.combobox__input');
  const dropdown = el.querySelector('.combobox__dropdown');
  const options = [...el.querySelectorAll('.combobox__option')];
  const hiddenInput = document.getElementById(el.dataset.combobox === 'patient' ? 'presc-patient' : null);
  const creatable = el.dataset.creatable !== undefined;
  let highlightedIndex = -1;
  let selectedValue = null;
  let selectedText = '';

  function filterOptions(query) {
    const lower = query.toLowerCase();
    let matchCount = 0;
    options.forEach(opt => {
      const text = opt.textContent;
      const match = text.toLowerCase().includes(lower);
      opt.style.display = match ? '' : 'none';
      if (match) matchCount++;
    });

    // Remove old empty message
    const oldEmpty = el.querySelector('.combobox__empty');
    if (oldEmpty) oldEmpty.remove();

    if (matchCount === 0 && !creatable) {
      const empty = document.createElement('div');
      empty.className = 'combobox__empty';
      empty.textContent = 'Nenhum resultado encontrado';
      dropdown.appendChild(empty);
    }
  }

  function highlight(index) {
    options.forEach((opt, i) => {
      opt.classList.toggle('combobox__option--highlighted', i === index);
    });
    highlightedIndex = index;
    const highlighted = options[index];
    if (highlighted && highlighted.style.display !== 'none') {
      highlighted.scrollIntoView({ block: 'nearest' });
    }
  }

  function selectOption(opt) {
    const text = opt.textContent;
    const value = opt.dataset.value || text;
    selectedValue = value;
    selectedText = text;
    input.value = text;
    input.dataset.selected = 'true';
    input.setCustomValidity('');

    options.forEach(o => o.classList.remove('combobox__option--selected'));
    opt.classList.add('combobox__option--selected');

    if (hiddenInput) hiddenInput.value = value;
    close();
  }

  function open() {
    el.classList.add('combobox--open');
    filterOptions(input.value);
    // Scroll to selected
    const selected = options.find(o => o.classList.contains('combobox__option--selected'));
    if (selected) {
      const idx = options.indexOf(selected);
      highlight(idx);
    }
    input.setAttribute('aria-expanded', 'true');
  }

  function close() {
    el.classList.remove('combobox--open');
    highlightedIndex = -1;
    input.setAttribute('aria-expanded', 'false');
  }

  function toggle() {
    if (el.classList.contains('combobox--open')) {
      close();
    } else {
      open();
    }
  }

  function handleInput() {
    input.dataset.selected = '';
    if (hiddenInput) hiddenInput.value = '';
    selectedValue = null;
    open();
  }

  // --- Events ---

  input.addEventListener('focus', () => {
    // Open on focus only if not already open and has value
    if (!el.classList.contains('combobox--open')) {
      open();
    }
  });

  input.addEventListener('input', handleInput);

  input.addEventListener('keydown', (e) => {
    const visibleOptions = options.filter(o => o.style.display !== 'none');

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        open();
        const next = highlightedIndex === -1 ? 0 : Math.min(highlightedIndex + 1, visibleOptions.length - 1);
        highlight(Math.min(next, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (highlightedIndex > 0) {
          highlight(highlightedIndex - 1);
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (el.classList.contains('combobox--open') && highlightedIndex >= 0) {
          const opt = options[highlightedIndex];
          if (opt && opt.style.display !== 'none') {
            selectOption(opt);
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Tab':
        close();
        break;
    }
  });

  input.addEventListener('blur', () => {
    // Close on blur but with delay to allow option click
    setTimeout(() => {
      if (!el.contains(document.activeElement)) {
        close();
        // If nothing selected and not creatable, offer first match
        if (!selectedValue && !creatable && options.length > 0) {
          const visible = options.find(o => o.style.display !== 'none');
          if (visible) selectOption(visible);
        }
      }
    }, 180);
  });

  // Click on option
  dropdown.addEventListener('mousedown', (e) => {
    const opt = e.target.closest('.combobox__option');
    if (opt && opt.style.display !== 'none' && !opt.classList.contains('combobox__empty')) {
      selectOption(opt);
    }
  });

  // Toggle button
  const toggleBtn = el.querySelector('.combobox__toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggle();
      if (el.classList.contains('combobox--open')) input.focus();
    });
  }

  // Click outside
  document.addEventListener('click', (e) => {
    if (!el.contains(e.target)) {
      close();
    }
  });
}

// ===== Time Chips =====

function initTimeChips() {
  const input = document.getElementById('presc-time-input');
  const addBtn = document.getElementById('btn-add-time');
  const container = document.getElementById('presc-chips');
  const hidden = document.getElementById('presc-times');
  const errorEl = document.getElementById('presc-time-error');
  const times = [];

  function render() {
    container.innerHTML = '';
    times.forEach((t, i) => {
      const chip = document.createElement('div');
      chip.className = 'presc-chip';
      chip.innerHTML = `
        ${t}
        <button type="button" class="presc-chip__remove" data-index="${i}" aria-label="Remover ${t}">
          <i class='bx bx-x'></i>
        </button>
      `;
      container.appendChild(chip);
    });
    hidden.value = JSON.stringify(times);
    errorEl.classList.add('hidden');
    times.length > 0 ? input.setCustomValidity('') : input.setCustomValidity('Adicione ao menos um horário');
  }

  function addTime() {
    const val = input.value;
    if (!/^\d{2}:\d{2}$/.test(val)) {
      errorEl.textContent = 'Formato inválido. Use HH:MM';
      errorEl.classList.remove('hidden');
      return;
    }
    if (times.includes(val)) {
      errorEl.textContent = 'Horário já adicionado';
      errorEl.classList.remove('hidden');
      return;
    }
    times.push(val);
    times.sort();
    errorEl.classList.add('hidden');
    render();
  }

  function removeTime(index) {
    times.splice(index, 1);
    render();
  }

  addBtn.addEventListener('click', addTime);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTime();
    }
  });

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.presc-chip__remove');
    if (btn) removeTime(parseInt(btn.dataset.index));
  });

  // Set default time
  input.value = '08:00';
}

// ===== Init =====

export function initNewPrescription() {
  const form = document.getElementById('form-prescription');
  if (!form) return;

  document.querySelectorAll('.combobox').forEach(initCombobox);
  initTimeChips();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const patientId = document.getElementById('presc-patient').value;
    const medication = document.querySelector('[data-combobox="medication"] .combobox__input').value.trim();
    const dosage = sanitize(document.getElementById('presc-dosage').value.trim());
    const timesRaw = document.getElementById('presc-times').value;
    const times = JSON.parse(timesRaw || '[]');
    const startDate = document.getElementById('presc-start').value;
    const endDate = document.getElementById('presc-end').value;
    const instructions = sanitize(document.getElementById('presc-instructions').value.trim());

    if (!patientId) {
      showToast('Selecione um paciente', 'error');
      return;
    }
    if (!medication) {
      showToast('Informe o medicamento', 'error');
      return;
    }
    if (times.length === 0) {
      showToast('Adicione ao menos um horário', 'error');
      return;
    }

    try {
      await store.addPrescription({
        patientId,
        medication: sanitize(medication),
        dosage,
        times,
        startDate,
        endDate,
        instructions
      });
      showToast('Prescrição criada com sucesso!', 'success');
      window.location.href = '/doctor/prescricoes';
    } catch (err) {
      showToast(err.message || 'Erro ao criar prescrição', 'error');
    }
  });
}

// New patient form
export function initNewPatient() {
  const form = document.getElementById('form-patient');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
      await store.addPatient({
        name: sanitize(document.getElementById('patient-name').value.trim()),
        email: sanitize(document.getElementById('patient-email').value.trim()),
        password: document.getElementById('patient-password').value
      });
      showToast('Paciente cadastrado com sucesso!', 'success');
      window.location.href = '/doctor/pacientes';
    } catch (err) {
      showToast(err.message || 'Erro ao cadastrar paciente', 'error');
    }
  });
}
