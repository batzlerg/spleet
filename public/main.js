const publicVapidKey = 'BF70-gHYzghdf2fCLcpW2f1slA-0PSiqxd8ioeEr5iVqM8_sliW6FRq4x5mAXzHr8irt0W5GgnOMXDBFjIhz7_E';

document.addEventListener('DOMContentLoaded', () => {
  console.log(navigator);
  if ('serviceWorker' in navigator) {
    console.log('Registering service worker');
    run().catch(error => console.error(error));
  } else {
    const submit = document.getElementById('submit');
    submit.setAttribute('disabled', true);
    submit.setAttribute('title', 'Your browser doesn\'t support service workers, which are required for this app to run :/');
  }
});

async function run() {
  const registration = await navigator.serviceWorker.register('worker.js', {scope: '/'});
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
  });
  // recieve message from service worker to trigger file download
  navigator.serviceWorker.onmessage = function (e) {
    console.log(e);
    switch (e.data.type) {
      case 'create-link':
        // create DOM download link
        const downloadLink = document.getElementById('fileDownload');
        downloadLink.setAttribute('href', e.data.download);
        downloadLink.style.display = "inline-block";
        // update messages to reflect status
        const removable = [
          ...document.querySelectorAll('.extra'),
          document.getElementById('first')
        ];
        for (let e of removable) {
          e.remove();
        }
        document.getElementById('second').style.display = 'inline-block'
        break;
      case 'trigger-download':
        window.location = e.data.download;
        break;
      default:
        console.log('msg from service worker: ', e.data);
    }
  };

  // subscription is submitted via main form to web-push on backend
  const pushSubscription = document.getElementById('pushSubscription');
  pushSubscription.setAttribute('value', JSON.stringify(subscription));
}

// https://www.npmjs.com/package/web-push#using-vapid-key-for-applicationserverkey
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
