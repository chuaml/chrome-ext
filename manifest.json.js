export default {
    "name": "custom ext",
    "version": "2.0",
    "manifest_version": 3,
    "background": {
        "service_worker": "src/background/background.js",
        "type": "module"
    },
    "side_panel": {
        "default_path": "sidepanel.html"
    },
    "action": {
        "default_popup": "./popup.menu.html"
    },
    "permissions": [
        "storage",
        "scripting",
        "activeTab",
        "debugger",
        "tabs",
        "sidePanel"
    ],
    "host_permissions": [
        "<all_urls>"
    ],
    "web_accessible_resources": [
        {
            "matches": [
                "https://*/*",
                "http://*/*"
            ],
            "resources": [
                "/public/*",
                "/public/*.mjs",
                "/public/*.js",
                "/public/*.css",
                "/public/*.html"
            ]
        }
    ],
    "content_scripts": [
        {
            "matches": [
                "https://*/*",
                "http://*/*"
            ],
            "run_at": "document_start",
            "js": [
                "./src/main.js"
            ]
        },
        {
            "matches": [
                "https://*/*",
                "http://*/*"
            ],
            "run_at": "document_start",
            "js": [
                "./src/scripting/injectCss.js"
            ]
        },
        {
            "matches": [
                "https://idx.dev/*"
            ],
            "exclude_matches": [
                "https://*.google.com/*",
                "https://vscode.dev/*",
                "https://idx.dev/*",
                "https://idx.google.com/*",
                "https://github.dev/*",
                "https://github.com/*",
                "https://www.youtube.com/*"
            ],
            "run_at": "document_start",
            "js": [
                "./src/darkmode/_.js"
            ]
        },
        {
            "matches": [
                "http://x/*",
                "https://x/*"
            ],
            "exclude_matches": [
                "https://mail.google.com/*",
                "https://accounts.google.com/*",
                "https://myaccount.google.com/*",
                "https://drive.google.com/*",
                "https://docs.google.com/*",
                "https://vscode.dev/*",
                "https://idx.dev/*",
                "https://idx.google.com/*",
                "https://github.dev/*",
                "https://github.com/*",
                "https://chat.deepseek.com/*"
            ],
            "run_at": "document_start",
            "js": [
                "./src/anti-tracker/gtag-denied.js",
                "./src/anti-tracker/referrer-policy.js"
            ],
            "world": "MAIN"
        },
        {
            "matches": [
                "http://*/*",
                "https://*/*"
            ],
            "exclude_matches": [
                "https://xxxxxxxxxxxxxx.google.com/*"
            ],
            "run_at": "document_start",
            "js": [
                "./src/scripting/cdp.debugger.js"
            ],
            "world": "ISOLATED"
        }
    ]
}