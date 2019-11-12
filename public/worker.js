console.log('Loaded service worker!');

self.addEventListener('push', evt => {
  const data = evt.data.json();
  console.log('Got push', data);
  self.registration.showNotification(data.title, {
    body: data.download ? 'Click here to download' : 'You will recieve a notification when your stems are ready for download'
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
  self.addEventListener('notificationclick', evt => {
    if (data.download) {
      // tell the client to immediately trigger the file download
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({
          type: 'trigger-download',
          download: data.download
        }));
      });
    } else {
      evt.notification.close();
    }
  });
});
