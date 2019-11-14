console.log('Loaded service worker!');

self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting()); // Activate worker immediately
});
self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim()); // Become available to all pages
});

self.addEventListener('push', e => {
  const data = e.data.json();
  self.console.log('Got push', data);
  self.registration.showNotification(data.title, {
    body: data.download ? 'Click here to download' : 'You will recieve a notification when your stems are ready for download',
    data: data
  });
  if (data.download) {
    // tell the client to create an in-page DOM link to the file in case the
    // notification isn't seen or expires
    self.clients.matchAll().then(clients => {
      clients.forEach(client => client.postMessage({
        type: 'create-link',
        download: data.download
      }));
    });
  }
});

self.addEventListener('notificationclick', e => {
  self.console.log('clicked');
  const data = e.notification.data;
  self.console.log(data);
  if (data.download) {
    // tell the client to immediately trigger the file download
    self.clients.matchAll().then(clients => {
      clients.forEach(client => client.postMessage({
        type: 'trigger-download',
        download: data.download,
        fileId: data.fileId
      }));
    });
  }
});
