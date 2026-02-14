'use strict';

// static import is not working in content script
// import { haha } from 'code.js';
// haha();
// console.log('main');
// alert('main');


// only dynamic import
// (async () => {
//     const src = chrome.runtime.getURL('/public/code.mjs');
//     console.log({ src });

//     const { haha } = await import(src);
//     console.log({ haha });
//     haha(); // Use the imported function
// })();

/** 
 * `import()` wrapper, for dynamically importing modules in extension `/public/` dir
 * @param {string} filename - relative to the `/public/` dir
 * @param {object} options - import attributes
 * @returns {Promise<Module>}
 * */
async function importModule(filename, options) {
    // `chrome-extension://${chrome.runtime.id}/public`
    const src = `chrome-extension://${chrome.runtime.id}/public/${filename}`;
    console.log({ src });

    const module = await import(src, options);
    console.log({ module });
    return module;
}


// main entry point
(async function init() {
    // const module = await importModule('code.mjs');
    // console.log({ module });
    // module.haha();


    // module to load and run in MAIN world...


})();




