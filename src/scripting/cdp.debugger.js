'use strict';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type !== "CONSOLE_LOG") return;
    console.log(request.data);
});