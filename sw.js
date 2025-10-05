chrome.runtime.onInstalled.addListener(function () {
    chrome.tabs.create({ url: `chrome-extension://${chrome.runtime.id}/popup.menu.html` });
});

