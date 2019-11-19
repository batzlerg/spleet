console.log('Loaded service worker!');

self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting()); // Activate worker immediately
});
self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim()); // Become available to all pages
});

self.addEventListener('push', e => {
  const data = e.data.json();
  self.registration.showNotification(data.title, {
    body: data.download ? 'Click here to download' : 'You will recieve a notification when your stems are ready for download',
    data: data
  });
  if (data.download) {
    // tell the client to create an in-page DOM link to the file in case the
    // notification isn't seen or expires
    const urlToMatch = new URL('', self.location.origin).href;
    const onMatch = client => client.postMessage({
      type: 'create-link',
      download: data.download,
      fileId: data.fileId
    });
    const clientMatchPromise = getMatchingClient(urlToMatch, onMatch);
    e.waitUntil(clientMatchPromise);
  }
});

self.addEventListener('notificationclick', e => {
  const data = e.notification.data;
  const urlToMatch = new URL('', self.location.origin).href;
  const onMatch = client => {
    client.focus();
    // tell the client to immediately trigger the file download
    if (data.download) {
      client.postMessage({
        type: 'trigger-download',
        download: data.download,
        fileId: data.fileId
      });
    }
  };
  const clientMatchPromise = getMatchingClient(urlToMatch, onMatch);
  e.waitUntil(clientMatchPromise);
});

function getMatchingClient(url, onMatch) {
  return clients.matchAll({ type: 'window', includeUncontrolled: true })
  .then((windowClients) => {
    for (let client of windowClients) {
      if (client.url === url) {
        return onMatch(client);
      }
    }
    // failure handling is a no-op for now since opening a new tab and resuming
    // state is complicated and requires a *lot* of extra boilerplate JS for a
    // single edge case
  });
}
