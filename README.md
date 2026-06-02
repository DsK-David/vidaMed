# VidaMed - Plataforma de Gestão de Medicamentos

## Visão Geral

VidaMed é uma plataforma web de gestão de medicamentos que conecta médicos e pacientes. O médico cadastra prescrições com horários e dosagens, e o paciente recebe alertas automáticos para tomar seus remédios no horário correto.

---

## Arquitetura do MVP

```
vidaMed/
├── index.html              # Página inicial (login/seleção de perfil)
├── README.md               # Documentação do projeto
├── css/
│   ├── global.css          # Reset, variáveis CSS, tipografia
│   ├── components.css      # Botões, cards, modais, formulários
│   └── pages.css           # Estilos específicos por página/view
├── js/
│   ├── app.js              # Inicialização, roteamento SPA
│   ├── store.js            # Gerenciamento de estado (localStorage)
│   ├── router.js           # Navegação entre views
│   ├── utils.js            # Funções utilitárias (formatação, validação)
│   ├── notifications.js    # Sistema de alertas/notificações
│   └── modules/
│       ├── auth.js         # Autenticação (simulada com localStorage)
│       ├── doctor.js       # Módulo do médico (cadastro de prescrições)
│       └── patient.js      # Módulo do paciente (visualização + alertas)
└── pages/
    ├── doctor-dashboard.html    # Painel do médico
    ├── patient-dashboard.html   # Painel do paciente
    └── prescription-form.html   # Formulário de prescrição
```

---

## Funcionalidades do MVP

### Módulo Médico
- [ ] Login como médico
- [ ] Cadastrar pacientes
- [ ] Criar prescrições (medicamento, dosagem, frequência, horários, duração)
- [ ] Visualizar lista de pacientes e suas prescrições ativas
- [ ] Editar/cancelar prescrições

### Módulo Paciente
- [ ] Login como paciente
- [ ] Visualizar prescrições ativas
- [ ] Receber alertas no horário de cada dose (notificação do browser + alerta visual)
- [ ] Confirmar que tomou o medicamento
- [ ] Histórico de doses tomadas/perdidas

### Sistema de Notificações
- [ ] Notificações do navegador (Notification API)
- [ ] Alerta sonoro
- [ ] Badge visual com contagem de doses pendentes
- [ ] Verificação periódica de horários (setInterval)

---

## Modelo de Dados (localStorage)

### Usuários
```json
{
  "id": "uuid",
  "name": "Nome Completo",
  "email": "email@exemplo.com",
  "password": "hash_simulado",
  "role": "doctor | patient",
  "createdAt": "2026-06-02T00:00:00Z"
}
```

### Prescrições
```json
{
  "id": "uuid",
  "doctorId": "uuid",
  "patientId": "uuid",
  "medication": "Nome do medicamento",
  "dosage": "500mg",
  "frequency": "8h",
  "times": ["08:00", "16:00", "00:00"],
  "startDate": "2026-06-02",
  "endDate": "2026-06-16",
  "instructions": "Tomar após refeição",
  "active": true,
  "createdAt": "2026-06-02T00:00:00Z"
}
```

### Registro de Doses
```json
{
  "id": "uuid",
  "prescriptionId": "uuid",
  "patientId": "uuid",
  "scheduledTime": "2026-06-02T08:00:00Z",
  "takenAt": "2026-06-02T08:05:00Z",
  "status": "taken | missed | pending"
}
```

---

## Stack Técnica

| Camada        | Tecnologia                          |
|---------------|-------------------------------------|
| Marcação      | HTML5 semântico                     |
| Estilo        | CSS3 (custom properties, flexbox, grid) |
| Lógica        | JavaScript ES6+ (módulos nativos)   |
| Persistência  | localStorage / sessionStorage       |
| Notificações  | Notification API + Web Audio API    |
| Roteamento    | Hash-based SPA router               |

---

## Princípios de Design

1. **Modularidade** — Cada funcionalidade é um módulo independente com responsabilidade única
2. **Sem dependências externas** — Zero frameworks, tudo em vanilla HTML/CSS/JS
3. **Mobile-first** — Interface responsiva com foco em uso mobile
4. **Acessibilidade** — Labels, ARIA attributes, contraste adequado
5. **Offline-capable** — Funciona sem servidor (dados em localStorage)

---

## Fluxo Principal

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Login     │────▶│  Médico cadastra │────▶│ Prescrição salva│
│  (médico)   │     │   prescrição     │     │  no localStorage│
└─────────────┘     └──────────────────┘     └────────┬────────┘
                                                       │
                                                       ▼
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Login     │────▶│ Paciente vê suas │◀────│ Sistema verifica│
│ (paciente)  │     │  prescrições     │     │    horários     │
└─────────────┘     └──────────────────┘     └────────┬────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │  ALERTA! Hora   │
                                              │ de tomar remédio│
                                              └─────────────────┘
```

---

## Como Rodar

1. Abra o arquivo `index.html` no navegador
2. Ou use um servidor local:
   ```bash
   npx serve .
   ```
3. Permita notificações quando solicitado

---

## Roadmap Futuro (pós-MVP)

- Backend real com Node.js + banco de dados
- Push notifications (Service Worker)
- PWA completa (instalável no celular)
- Relatórios para o médico (adesão ao tratamento)
- Integração com farmácias
- Suporte a múltiplos idiomas


carlos@vidamed.com med123
maria@email.com pac123