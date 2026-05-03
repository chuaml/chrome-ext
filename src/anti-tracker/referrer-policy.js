const hostname = window.location.hostname;
chrome.storage.local.get([`referrer_${hostname}`, 'referrer_global'], (res) => {
    const isEnabled = res[`referrer_${hostname}`] !== undefined ? res[`referrer_${hostname}`] : !!res.referrer_global;
    if (!isEnabled) return;

    setTimeout(_=> { // set entire document to no-referrer policy when clicking a hyperlink <a> tag
        const referrerPolicy = document.createElement('meta');
        referrerPolicy.setAttribute('name', 'referrer');
        referrerPolicy.setAttribute('content', 'no-referrer');
        document.head.appendChild(referrerPolicy);
    }, 0);
});