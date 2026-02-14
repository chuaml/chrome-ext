{
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

    document.addEventListener('readystatechange', ev => {
        setTimeout(_ => {
            if (window.gtag && typeof (window.gtag) === 'function') {
                setTimeout(_ => {
                    window.gtag('consent', 'update', option);
                }, 500);
                window.gtag('consent', 'default', option);
                window.gtag('consent', 'update', option);
            }
        }, 0);
    });
    document.addEventListener('load', ev => {
        setTimeout(_ => {
            if (window.gtag && typeof (window.gtag) === 'function') {
                setTimeout(_ => {
                    window.gtag('consent', 'update', option);
                }, 500);
                window.gtag('consent', 'default', option);
                window.gtag('consent', 'update', option);
            }
        }, 100);
    });
};