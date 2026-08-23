// Service worker de Willay: solo existe para recibir notificaciones push del
// sistema operativo, incluso con la pestaña cerrada. No cachea nada — no es
// una PWA offline, así que no hace falta interceptar fetch().

self.addEventListener('push', event => {
  let datos = { titulo: 'Willay', cuerpo: 'Tienes una notificación nueva.' };
  try {
    if (event.data) datos = event.data.json();
  } catch {
    // si el payload no es JSON válido, se usa el texto por defecto de arriba
  }

  event.waitUntil(
    self.registration.showNotification(datos.titulo, {
      body: datos.cuerpo,
      icon: '/icono-notificacion.png',
      badge: '/icono-notificacion.png',
    })
  );
});

// Al hacer clic en la notificación: enfoca una pestaña de Willay ya abierta,
// o abre una nueva si no hay ninguna.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
      for (const cliente of lista) {
        if ('focus' in cliente) return cliente.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});
