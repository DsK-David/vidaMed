-- ===== MedControl - Schema MySQL =====

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('doctor', 'patient') NOT NULL,
  doctor_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (doctor_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id VARCHAR(36) PRIMARY KEY,
  doctor_id VARCHAR(36) NOT NULL,
  patient_id VARCHAR(36) NOT NULL,
  medication VARCHAR(255) NOT NULL,
  dosage VARCHAR(255) NOT NULL,
  times JSON NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  instructions TEXT,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (doctor_id) REFERENCES users(id),
  FOREIGN KEY (patient_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS dose_logs (
  id VARCHAR(36) PRIMARY KEY,
  prescription_id VARCHAR(36) NOT NULL,
  patient_id VARCHAR(36) NOT NULL,
  scheduled_time DATETIME NOT NULL,
  time VARCHAR(5) NOT NULL,
  taken_at DATETIME,
  status ENUM('pending', 'taken', 'missed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(id),
  FOREIGN KEY (patient_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  endpoint VARCHAR(500) NOT NULL UNIQUE,
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Índices para performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_doctor ON users(doctor_id);
CREATE INDEX idx_prescriptions_doctor ON prescriptions(doctor_id);
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_dose_logs_patient ON dose_logs(patient_id);
CREATE INDEX idx_dose_logs_prescription ON dose_logs(prescription_id);
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);
