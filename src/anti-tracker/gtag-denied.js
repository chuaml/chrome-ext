{
    chrome.storage.local.get(['gtag_enabled'], (res) => {
        if (res.gtag_enabled === false) return;

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