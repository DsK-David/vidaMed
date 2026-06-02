// ===== NOTIFICATIONS =====
// Sistema de notificações e alertas de medicamento

import { store } from './store.js';
import { isTimeInRange, getToday, generateId } from './utils.js';

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
    this.requestPermission();
    
    // Verificar a cada 30 segundos
    this.checkInterval = setInterval(() => this._checkDoses(), 30000);
    // Verificar imediatamente
    this._checkDoses();
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.alertedDoses.clear();
  }

  _checkDoses() {
    if (!this.patientId) return;

    const prescriptions = store.getPrescriptionsByPatient(this.patientId);
    const today = getToday();
    const todayLogs = store.getTodayLogs(this.patientId);

    prescriptions.forEach(prescription => {
      // Verificar se prescrição está dentro do período
      if (prescription.startDate > today || prescription.endDate < today) return;

      prescription.times.forEach(time => {
        const doseKey = `${prescription.id}-${today}-${time}`;
        
        // Já alertou ou já tomou?
        if (this.alertedDoses.has(doseKey)) return;
        
        const alreadyLogged = todayLogs.find(
          log => log.prescriptionId === prescription.id && log.time === time
        );
        if (alreadyLogged) return;

        // Está na janela de tempo?
        if (isTimeInRange(time)) {
          this.alertedDoses.add(doseKey);
          this._triggerAlert(prescription, time);
        }
      });
    });
  }

  _triggerAlert(prescription, time) {
    // Notificação do browser
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('💊 Hora do Medicamento!', {
        body: `${prescription.medication} - ${prescription.dosage}\nHorário: ${time}`,
        icon: '💊',
        tag: `dose-${prescription.id}-${time}`
      });
    }

    // Alerta sonoro
    this._playSound();

    // Callback para UI
    if (this.onAlert) {
      this.onAlert(prescription, time);
    }

    // Criar log pendente
    const doseLog = {
      id: generateId(),
      prescriptionId: prescription.id,
      patientId: this.patientId,
      scheduledTime: `${getToday()}T${time}:00`,
      time: time,
      takenAt: null,
      status: 'pending'
    };
    store.addDoseLog(doseLog);
  }

  _playSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, 500);
    } catch (e) {
      // Audio não disponível
    }
  }

  getPendingDoses() {
    const today = getToday();
    const logs = store.getTodayLogs(this.patientId);
    return logs.filter(l => l.status === 'pending');
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
    <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;font-size:1.2rem;color:inherit;">×</button>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, duration);
}
