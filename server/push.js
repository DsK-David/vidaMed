// ===== PUSH NOTIFICATION SERVICE =====
const webpush = require('web-push');
const { getDb } = require('./db');

function init(vapidEmail, publicKey, privateKey) {
  webpush.setVapidDetails(vapidEmail, publicKey, privateKey);
}

async function subscribe(userId, subscription) {
  const db = getDb();
  // MySQL: use INSERT ... ON DUPLICATE KEY UPDATE via raw query for reliability
  await db.raw(`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), p256dh = VALUES(p256dh), auth = VALUES(auth)
  `, [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]);
}

async function unsubscribe(endpoint) {
  const db = getDb();
  await db('push_subscriptions').where('endpoint', endpoint).del();
}

async function sendToUser(userId, payload) {
  const db = getDb();
  const subs = await db('push_subscriptions').where('user_id', userId);

  if (subs.length === 0) {
    console.log(`[Push] Nenhuma subscription para user ${userId}`);
    return;
  }

  const message = JSON.stringify(payload);

  for (const sub of subs) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth }
    };

    try {
      await webpush.sendNotification(pushSub, message);
      console.log(`[Push] Enviado para ${sub.endpoint.slice(0, 50)}...`);
    } catch (err) {
      console.warn(`[Push] Erro ao enviar: ${err.statusCode || err.message}`);
      if (err.statusCode === 410 || err.statusCode === 404) {
        await db('push_subscriptions').where('id', sub.id).del();
        console.log('[Push] Subscription removida (expirada)');
      }
    }
  }
}

module.exports = { init, subscribe, unsubscribe, sendToUser };
