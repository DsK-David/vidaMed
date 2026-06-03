// ===== NOTIFICATIONS =====
// Sistema de notificações e alertas de medicamento (client-side polling)

import { store } from './store.js';
import { isTimeInRange, getToday } from './utils.js';

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
    
    // Verificar a cada 30 segundos
    this.checkInterval = setInterval(() => this._checkDoses(), 30000);
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
      // Cache prescriptions to avoid repeated calls
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
