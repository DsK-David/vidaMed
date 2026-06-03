// ===== GENERATE VAPID KEYS =====
const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

const vapidKeys = webpush.generateVAPIDKeys();

const envContent = `# VAPID Keys para Web Push
VAPID_PUBLIC_KEY=${vapidKeys.publicKey}
VAPID_PRIVATE_KEY=${vapidKeys.privateKey}
VAPID_EMAIL=mailto:admin@medcontrol.com

# JWT
JWT_SECRET=${require('crypto').randomBytes(32).toString('hex')}

# Server
PORT=3000
`;

const envPath = path.join(__dirname, '.env');
fs.writeFileSync(envPath, envContent);

console.log('Arquivo .env gerado com sucesso!');
console.log('');
console.log('VAPID Public Key (usar no frontend):');
console.log(vapidKeys.publicKey);
