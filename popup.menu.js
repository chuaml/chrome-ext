(async function setup() {
    /** @type {HTMLElement} */
    const txtCssCode = document.getElementById('txtCssCode');
    const storage = await chrome.storage.local.get(['cssCode']);

    console.log({ storage });

    txtCssCode.textContent = storage['cssCode'];

    txtCssCode.addEventListener('input', async function (e) {
        if (e.isTrusted === false) return;
        await chrome.storage.local.set({ cssCode: e.target.textContent });
    });

    document.getElementById('open-settings').addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
    });

    chrome.runtime.sendMessage({
        action: "insertCss",
        // cssCode: storage['cssCode']
    });

})();














// function init_toggleOptions(inputElement) {
//     // const inputElement = document.getElementById('chkDarkMode');
//     if (!inputElement.id) throw new Error("inputElement.id is required to set key, no id found: ", inputElement);
//     const prefix = 'popup.menu#';
//     const key = prefix + inputElement.id;
//     chrome.storage.local.get([key], function (r) {
//         inputElement.checked = r[key] || false;
//     });

//     inputElement.addEventListener('change', async function (e) {
//         chrome.storage.local.set({ key: inputElement.checked });
//     });

//     chrome.storage.onChanged.addListener(async (changes, namespace) => {
//         if (namespace === 'local' && changes[key]) {
//             if (changes[key].newValue === true) {
//                 const result = await registerContentScript('darkmode');
//                 console.log({ result });
//             } else {
//                 const result = await unregisterContentScript('darkmode');
//                 console.log({ result });
//             }
//         }
//     });
// }


// { // dynamic content_script options

//     (async _ => { // init dynamic content_script options
//         const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
//         const currentOrigin = new URL(tabs[0].url).origin;

//         // restore element state
//         chrome.scripting.getRegisteredContentScripts((content_scripts) => {
//             const len = content_scripts.length;
//             console.log(`Registered Content Scripts (n = ${len}): `, content_scripts);
//             for (let i = 0; i < len; i++) {
//                 const row = content_scripts[i].id.split("\t");
//                 if (row[0] !== currentOrigin) continue;

//                 const inputElement = document.getElementById(row[1]);
//                 if (inputElement === null) continue;
//                 inputElement.checked = true;
//             }
//         });

//         const chkDarkMode = document.getElementById('chkDarkMode');
//         chkDarkMode.addEventListener('change', async function (e) {
//             const id = currentOrigin + "\t" + e.target.id;
//             if (e.target.checked === true) {
//                 registerContentScript(id, [currentOrigin + '/*']);
//             }
//             else {
//                 unregisterContentScript(id, [currentOrigin + '/*']);
//             }
//         });

//     })();

//     async function registerContentScript(id, url_patterns) {
//         await chrome.scripting.registerContentScripts([
//             {
//                 id: id, // Unique ID for the content script
//                 matches: url_patterns,
//                 js: undefined,
//                 css: ["/darkmode/darkmode.css"],
//                 runAt: 'document_start',
//                 persistAcrossSessions: true
//             }
//         ]);

//         logallRegisteredConentScript();
//     }


//     function logallRegisteredConentScript() {
//         chrome.scripting.getRegisteredContentScripts((content_scripts) => {
//             const len = content_scripts.length;
//             console.log(`Registered Content Scripts (n = ${len}): `, content_scripts);

//             for (let i = 0; i < len; i++) {
//                 const x = content_scripts[i];
//                 const inputElement = document.getElementById(x.id);
//                 if (inputElement === null) continue;
//                 inputElement.checked = true;
//                 console.group(i, x.id);
//                 try {
//                     console.log(x);
//                     console.log("id: ", x.id);
//                     console.log("matches: ", x.matches);

//                     console.log("js: ", x.js);
//                     console.log("css: ", x.css);
//                     console.log("runAt:", x.runAt);
//                     console.log("world: ", x.world);

//                     console.log("persistAcrossSessions: ", x.persistAcrossSessions);
//                     console.log("matchOriginAsFallback: ", x.matchOriginAsFallback);
//                     console.log("allFrames: ", x.allFrames);

//                     console.log("------------");

//                 } finally {
//                     console.groupEnd();
//                 }
//             }
//         });
//     }

//     async function unregisterContentScript(id) {
//         await chrome.scripting.unregisterContentScripts({
//             ids: [id]
//         });

//         logallRegisteredConentScript();
//     }

// }

