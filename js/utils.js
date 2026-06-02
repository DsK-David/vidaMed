// ===== UTILS =====
// Funções utilitárias compartilhadas

export function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : 
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

export function formatTime(timeStr) {
  return timeStr.slice(0, 5);
}

export function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

export function getToday() {
  return new Date().toISOString().split('T')[0];
}

export function getCurrentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function isTimeInRange(time, minutesBefore = 5, minutesAfter = 30) {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  
  const scheduledTime = new Date();
  scheduledTime.setHours(hours, minutes, 0, 0);
  
  const windowStart = new Date(scheduledTime.getTime() - minutesBefore * 60000);
  const windowEnd = new Date(scheduledTime.getTime() + minutesAfter * 60000);
  
  return now >= windowStart && now <= windowEnd;
}

export function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function sanitize(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
