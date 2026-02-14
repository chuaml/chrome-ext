setTimeout(_=> { // set entire document to no-referrer policy when clicking a hyperlink <a> tag
    const referrerPolicy = document.createElement('meta');
    referrerPolicy.setAttribute('name', 'referrer');
    referrerPolicy.setAttribute('content', 'no-referrer');
    document.head.appendChild(referrerPolicy);
}, 0);