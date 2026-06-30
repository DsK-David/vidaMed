// ===== API STORE =====
// Gerenciamento de estado via API REST

const API = '/api';

class Store {
  constructor() {
    this._token = localStorage.getItem('medcontrol_token');
    this._user = JSON.parse(localStorage.getItem('medcontrol_user') || 'null');
  }

  _headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this._token) h['Authorization'] = `Bearer ${this._token}`;
    return h;
  }

  async _fetch(url, options = {}) {
    options.headers = this._headers();
    const res = await fetch(`${API}${url}`, options);
    if (res.status === 401) {
      this.logout();
      window.location.href = '/';
      throw new Error('Sessão expirada');
    }
    return res;
  }

  // === Auth ===
  async login(email, password) {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) return null;

    const data = await res.json();
    this._token = data.token;
    this._user = data.user;
    localStorage.setItem('medcontrol_token', data.token);
    localStorage.setItem('medcontrol_user', JSON.stringify(data.user));
    return data.user;
  }

  async register(name, email, password, role) {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }

    const data = await res.json();
    this._token = data.token;
    this._user = data.user;
    localStorage.setItem('medcontrol_token', data.token);
    localStorage.setItem('medcontrol_user', JSON.stringify(data.user));
    return data.user;
  }

  logout() {
    this._token = null;
    this._user = null;
    localStorage.removeItem('medcontrol_token');
    localStorage.removeItem('medcontrol_user');
  }

  getCurrentUser() {
    return this._user;
  }

  // === Patients ===
  async getPatients() {
    const res = await this._fetch('/patients');
    return res.json();
  }

  async addPatient(patient) {
    const res = await this._fetch('/patients', {
      method: 'POST',
      body: JSON.stringify(patient)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
    return res.json();
  }

  // === Prescriptions ===
  async getPrescriptionsByDoctor() {
    const res = await this._fetch('/prescriptions');
    return res.json();
  }

  async getPrescriptionsByPatient(patientId) {
    const res = await this._fetch(`/prescriptions?patientId=${patientId}`);
    return res.json();
  }

  async addPrescription(prescription) {
    const res = await this._fetch('/prescriptions', {
      method: 'POST',
      body: JSON.stringify(prescription)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
    return res.json();
  }

  async updatePrescription(id, updates) {
    await this._fetch(`/prescriptions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  // === Dose Logs ===
  async getTodayLogs(patientId) {
    const today = new Date().toISOString().split('T')[0];
    const res = await this._fetch(`/doses?patientId=${patientId}&date=${today}`);
    return res.json();
  }

  async addDoseLog(log) {
    const res = await this._fetch('/doses', {
      method: 'POST',
      body: JSON.stringify(log)
    });
    return res.json();
  }

  async updateDoseLog(id, updates) {
    await this._fetch(`/doses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  // === Medications ===
  async getMedications() {
    const prescriptions = await this.getPrescriptionsByDoctor();
    const meds = [...new Set(prescriptions.map(p => p.medication).filter(Boolean))];
    return meds.sort();
  }

  // === Push ===
  async getVapidKey() {
    const res = await fetch(`${API}/push/vapid-key`);
    const data = await res.json();
    return data.publicKey;
  }

  async subscribePush(subscription) {
    await this._fetch('/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription })
    });
  }
}

export const store = new Store();
