// ===== SERVICE WORKER - MedControl =====

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  let data = { title: 'MedControl', body: 'Nova notificação' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const notifType = data.data?.type;
  let actions;
  if (notifType === 'new-prescription') {
    actions = [
      { action: 'view', title: 'Ver Prescrição' }
    ];
  } else {
    actions = [
      { action: 'taken', title: '✓ Já Tomei' },
      { action: 'open', title: 'Abrir' }
    ];
  }

  const options = {
    body: data.body,
    vibrate: [200, 100, 200, 100, 200],
    data: data.data || {},
    actions
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

function focusOrOpenPatient(url) {
  return clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    for (const client of clientList) {
      if (client.url.includes('/paciente') && 'focus' in client) {
        return client.focus();
      }
    }
    for (const client of clientList) {
      if (client.url.includes(self.location.origin) && 'focus' in client) {
        return client.focus();
      }
    }
    if (clientList.length === 0) {
      console.log('[SW] Nenhuma janela encontrada, abrindo', url);
    }
    return clients.openWindow(url);
  }).catch(err => {
    console.warn('[SW] Erro em focusOrOpenPatient:', err.message);
    return clients.openWindow(url);
  });
}

function focusOrOpenPrescriptions() {
  const url = '/paciente/prescricoes';
  return clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    for (const client of clientList) {
      if (client.url.includes('/paciente/prescricoes') && 'focus' in client) {
        return client.focus();
      }
    }
    for (const client of clientList) {
      if (client.url.includes('/paciente') && 'focus' in client) {
        return client.focus();
      }
    }
    for (const client of clientList) {
      if (client.url.includes(self.location.origin) && 'focus' in client) {
        return client.focus();
      }
    }
    return clients.openWindow(url);
  }).catch(err => {
    console.warn('[SW] Erro em focusOrOpenPrescriptions:', err.message);
    return clients.openWindow(url);
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notifType = event.notification.data?.type;
  const doseLogId = event.notification.data?.doseLogId;
  const signature = event.notification.data?.signature;

  if (notifType === 'new-prescription') {
    event.waitUntil(focusOrOpenPrescriptions());
    return;
  }

  if (event.action === 'taken' && doseLogId && signature) {
    event.waitUntil(
      fetch('/api/doses/mark-taken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doseLogId, signature })
      })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
            clients.forEach(client => {
              client.postMessage({ type: 'dose-taken', doseLogId });
            });
          });
        }
      })
      .catch(err => console.warn('[SW] Erro ao marcar dose:', err))
      .then(() => focusOrOpenPatient(`/paciente?confirmado=${doseLogId}`))
    );
    return;
  }

  event.waitUntil(
    focusOrOpenPatient('/paciente?abrir=').then(() => {
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'notification-open' });
        });
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'push-subscribed') {
    console.log('[SW] Push subscription updated');
  }
});
