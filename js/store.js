// ===== STORE =====
// Gerenciamento de estado com localStorage

const STORAGE_KEYS = {
  USERS: 'vidamed_users',
  PRESCRIPTIONS: 'vidamed_prescriptions',
  DOSE_LOGS: 'vidamed_dose_logs',
  CURRENT_USER: 'vidamed_current_user'
};

class Store {
  constructor() {
    this._initDefaults();
  }

  _initDefaults() {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      const defaultUsers = [
        {
          id: 'doctor-001',
          name: 'Dr. Carlos Silva',
          email: 'carlos@vidamed.com',
          password: 'med123',
          role: 'doctor',
          createdAt: new Date().toISOString()
        },
        {
          id: 'patient-001',
          name: 'Maria Souza',
          email: 'maria@email.com',
          password: 'pac123',
          role: 'patient',
          doctorId: 'doctor-001',
          createdAt: new Date().toISOString()
        },
        {
          id: 'patient-002',
          name: 'João Oliveira',
          email: 'joao@email.com',
          password: 'pac123',
          role: 'patient',
          doctorId: 'doctor-001',
          createdAt: new Date().toISOString()
        }
      ];
      this._save(STORAGE_KEYS.USERS, defaultUsers);
    }

    if (!localStorage.getItem(STORAGE_KEYS.PRESCRIPTIONS)) {
      this._save(STORAGE_KEYS.PRESCRIPTIONS, []);
    }

    if (!localStorage.getItem(STORAGE_KEYS.DOSE_LOGS)) {
      this._save(STORAGE_KEYS.DOSE_LOGS, []);
    }
  }

  _get(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  _save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // === Auth ===
  login(email, password, role) {
    const users = this._get(STORAGE_KEYS.USERS) || [];
    const user = users.find(u => u.email === email && u.password === password && u.role === role);
    if (user) {
      const { password: _, ...safeUser } = user;
      this._save(STORAGE_KEYS.CURRENT_USER, safeUser);
      return safeUser;
    }
    return null;
  }

  logout() {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }

  getCurrentUser() {
    return this._get(STORAGE_KEYS.CURRENT_USER);
  }

  // === Users ===
  getUsers() {
    return this._get(STORAGE_KEYS.USERS) || [];
  }

  getPatients(doctorId) {
    return this.getUsers().filter(u => u.role === 'patient' && u.doctorId === doctorId);
  }

  addPatient(patient) {
    const users = this.getUsers();
    users.push(patient);
    this._save(STORAGE_KEYS.USERS, users);
  }

  // === Prescriptions ===
  getPrescriptions() {
    return this._get(STORAGE_KEYS.PRESCRIPTIONS) || [];
  }

  getPrescriptionsByDoctor(doctorId) {
    return this.getPrescriptions().filter(p => p.doctorId === doctorId);
  }

  getPrescriptionsByPatient(patientId) {
    return this.getPrescriptions().filter(p => p.patientId === patientId && p.active);
  }

  addPrescription(prescription) {
    const prescriptions = this.getPrescriptions();
    prescriptions.push(prescription);
    this._save(STORAGE_KEYS.PRESCRIPTIONS, prescriptions);
  }

  updatePrescription(id, updates) {
    const prescriptions = this.getPrescriptions();
    const index = prescriptions.findIndex(p => p.id === id);
    if (index !== -1) {
      prescriptions[index] = { ...prescriptions[index], ...updates };
      this._save(STORAGE_KEYS.PRESCRIPTIONS, prescriptions);
    }
  }

  deletePrescription(id) {
    const prescriptions = this.getPrescriptions().filter(p => p.id !== id);
    this._save(STORAGE_KEYS.PRESCRIPTIONS, prescriptions);
  }

  // === Dose Logs ===
  getDoseLogs() {
    return this._get(STORAGE_KEYS.DOSE_LOGS) || [];
  }

  getDoseLogsByPatient(patientId) {
    return this.getDoseLogs().filter(d => d.patientId === patientId);
  }

  getTodayLogs(patientId) {
    const today = new Date().toISOString().split('T')[0];
    return this.getDoseLogsByPatient(patientId).filter(d => d.scheduledTime.startsWith(today));
  }

  addDoseLog(log) {
    const logs = this.getDoseLogs();
    logs.push(log);
    this._save(STORAGE_KEYS.DOSE_LOGS, logs);
  }

  updateDoseLog(id, updates) {
    const logs = this.getDoseLogs();
    const index = logs.findIndex(l => l.id === id);
    if (index !== -1) {
      logs[index] = { ...logs[index], ...updates };
      this._save(STORAGE_KEYS.DOSE_LOGS, logs);
    }
  }
}

export const store = new Store();
