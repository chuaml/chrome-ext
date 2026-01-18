chrome.runtime.onInstalled.addListener(function () {
    chrome.tabs.create({ url: `chrome-extension://${chrome.runtime.id}/popup.menu.html` });
});




// action: 'insertCss'
// permissions: activeTab
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id) return;
    if (message.action !== 'insertCss') return;
    (async function insertCss() {
        const storage = await chrome.storage.local.get(['cssCode']);

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;
        if (!tab.url) return; // not in webpage, e.g. in chrome://ext page
        if (tab.url.startsWith('http') === false) return;
        console.log({ tab }, tab.url);
        await chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            css: storage['cssCode']
        });
    })().finally(sendResponse);

    // Return true if you want to use sendResponse asynchronously
    return true;
});