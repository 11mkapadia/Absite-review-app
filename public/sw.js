// Shows ABSITE agent pushes and opens the attached Claude artifact on tap.
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'ABSITE review', {
      body: data.body || 'Tap to open',
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: data.tag,
      renotify: Boolean(data.tag),
      data: { url: data.url },
      actions: [{ action: 'open', title: 'Open artifact' }],
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url;
  if (!url) return;
  event.waitUntil(
    (async () => {
      const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = windows.find((w) => w.url === url);
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })(),
  );
});
