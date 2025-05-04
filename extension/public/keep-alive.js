// Keep service worker active
chrome.alarms.create('keepAlive', { periodInMinutes: 0.5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    chrome.alarms.get('keepAlive', (existing) => {
      if (!existing) {
        chrome.alarms.create('keepAlive', { periodInMinutes: 0.5 });
      }
    });
  }
});

// Initialization check
chrome.runtime.onInstalled.addListener(() => {
  console.log('Service worker installed');
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Service worker starting');
});