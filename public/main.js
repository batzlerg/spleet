const publicVapidKey = 'BF70-gHYzghdf2fCLcpW2f1slA-0PSiqxd8ioeEr5iVqM8_sliW6FRq4x5mAXzHr8irt0W5GgnOMXDBFjIhz7_E';

document.addEventListener('DOMContentLoaded', () => {
  if ('serviceWorker' in navigator && Notification) {
    handlePermission(Notification.permission);
  } else {
    // no support
    const submit = document.getElementById('submit');
    submit.setAttribute('disabled', true);
    submit.setAttribute('title', 'Your browser doesn\'t support service workers, which are required for this app to run :/');
  }
});

function requestPermission() {
  if (Notification.permission === 'denied') {
    const link = document.getElementById('requestPermission');
    link.target = "_blank";
    // inform the user how to fix the "denied" permission
    link.href = "https://www.valuewalk.com/2019/03/remove-disable-push-notifications-chrome/"
  }
  Notification.requestPermission(function (permission) {
    if (permission === "granted") {
      var notification = new Notification("Hi there!", {
        body: "Select a file and a method to get started!"
      });
    }
    handlePermission(permission);
  });
}

function handlePermission(permission) {
  const permissStatement = document.getElementById('pushPermission');
  switch (permission) {
    case "granted":
      permissStatement.remove();
      console.log('Registering service worker');
      setupServiceWorker();
      break;
    case "denied":
      // fall-through case
    default:
      makeElVisible(permissStatement, "block");
      break;
  }
}

async function setupServiceWorker() {
  let subscription;
  try {
    const registration = await navigator.serviceWorker.register('worker.js', {scope: '/'});
    // ensure the SW is registered and active before subscribing
    await navigator.serviceWorker.ready;
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
    });
  } catch (err) {
    console.error(err);
  }
  // recieve message from service worker to trigger file download
  navigator.serviceWorker.addEventListener('message', e => {
    const downloadLink = document.getElementById('fileDownload');
    // multiple tabs -> single service worker means we have to validate
    // whether the returned download matches the upload from this tab

    console.log(e.data);
    const isUUIDMatch = downloadLink.dataset.fileId === e.data.fileId;

    if (isUUIDMatch) {
      switch (e.data.type) {
      case 'create-link':
        // create DOM download link
        const downloadLink = document.getElementById('fileDownload');
        downloadLink.setAttribute('href', e.data.download);
        makeElVisible(downloadLink);
        // update messages to reflect status
        const removable = [
          ...document.querySelectorAll('.extra'),
          document.getElementById('first')
        ];
        for (let e of removable) {
          e.remove();
        }
        makeElVisible(document.getElementById('second'));
        break;
      case 'trigger-download':
        window.location = e.data.download;
        break;
      default:
        console.log('msg from service worker: ', e.data);
      }
    }
  });

  // subscription is submitted via main form to web-push on backend
  const pushSubscription = document.getElementById('pushSubscription');
  pushSubscription.setAttribute('value', JSON.stringify(subscription));
}

///// HELPERS

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

// client-side validation
// also replicated server-side, so preventing this won't do much :)
function validateFile(file) {
  const chosenFile = file.files[0];
  const size = chosenFile.size / 1024 / 1024; // in MB
  if (size > 10) {
    alert('File size cannot exceed 10 MB!');
    file.value = null;
    return;
  }
  if (!/audio/g.test(chosenFile.type)) {
    alert('Please select an audio file and try again!');
    file.value = null;
    return;
  }
}

function makeElVisible(el, display = "inline-block") {
  el.style.display = display;
}
