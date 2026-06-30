// ===== MEDCONTROL SERVER (Local) =====
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[MedControl] Servidor rodando em http://localhost:${PORT}`);
});
