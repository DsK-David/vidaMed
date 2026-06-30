// ===== NOTIFICATIONS =====
// Sistema de notificações e alertas de medicamento

import { store } from './store.js';
import { isTimeInRange, getToday } from './utils.js';

// Cache de áudio para tocar alarme
let audioCtx = null;

function playAlarm() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.setValueAtTime(660, audioCtx.currentTime + 0.3);
    osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.6);

    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 1);
  } catch {
    // Áudio não disponível
  }
}

class NotificationSystem {
  constructor() {
    this.checkInterval = null;
    this.alertedDoses = new Set();
    this.onAlert = null;
  }

  async requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }

  start(patientId, onAlertCallback) {
    this.patientId = patientId;
    this.onAlert = onAlertCallback;
    this.prescriptionsCache = null;
    this.requestPermission();

    // Verificar a cada 15 segundos
    this.checkInterval = setInterval(() => this._checkDoses(), 15000);
    this._checkDoses();
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.alertedDoses.clear();
    this.prescriptionsCache = null;
  }

  async _checkDoses() {
    if (!this.patientId) return;

    try {
      if (!this.prescriptionsCache) {
        this.prescriptionsCache = await store.getPrescriptionsByPatient(this.patientId);
      }

      const todayLogs = await store.getTodayLogs(this.patientId);
      const pendingDoses = todayLogs.filter(l => l.status === 'pending');

      for (const dose of pendingDoses) {
        const doseKey = `${dose.prescriptionId}-${dose.time}`;
        if (this.alertedDoses.has(doseKey)) continue;

        if (isTimeInRange(dose.time)) {
          this.alertedDoses.add(doseKey);
          // Tocar alarme sonoro
          playAlarm();
          // Disparar notificação do navegador
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('💊 Hora do Medicamento!', {
              body: dose.time,
              vibrate: [200, 100, 200]
            });
          }
          if (this.onAlert) {
            const prescription = this.prescriptionsCache.find(p => p.id === dose.prescriptionId);
            this.onAlert(
              prescription || { medication: 'Medicamento', dosage: '' },
              dose.time
            );
          }
        }
      }
    } catch {
      // API indisponível
    }
  }
}

export const notifications = new NotificationSystem();

// Toast system
export function showToast(message, type = 'info', duration = 5000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;font-size:1.2rem;color:inherit;display:flex;align-items:center;"><i class='bx bx-x'></i></button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, duration);
}
