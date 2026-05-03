{
    const hostname = window.location.hostname;
    chrome.storage.local.get([`gtag_${hostname}`, 'gtag_global'], (res) => {
        const isEnabled = res[`gtag_${hostname}`] !== undefined ? res[`gtag_${hostname}`] : !!res.gtag_global;
        if (!isEnabled) return;

        window.dataLayer = [];
        const GTAG = function () { window.dataLayer.push(arguments); };
        const option = {
            analytics_storage: 'denied',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
        };

        GTAG('consent', 'default', option);
        GTAG('consent', 'update', option);

        const updateConsent = () => {
            if (window.gtag && typeof (window.gtag) === 'function') {
                window.gtag('consent', 'default', option);
                window.gtag('consent', 'update', option);
            }
        };

        document.addEventListener('readystatechange', () => {
            setTimeout(updateConsent, 0);
        });
        document.addEventListener('load', () => {
            setTimeout(updateConsent, 100);
        });
    });
};