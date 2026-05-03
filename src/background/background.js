import { EC4W_Request, EC4W_Result, EC4W_Validator, SentRequest } from "ec4w_validator";

chrome.runtime.onInstalled.addListener(function () {
	chrome.tabs.create({ url: `chrome-extension://${chrome.runtime.id}/popup.menu.html` });

	// Set side panel to open on action click
	chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
		.catch((error) => console.error(error));
});




// Automatically inject CSS when a tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
		injectCssForTab(tabId, tab.url);
	}
});

async function injectCssForTab(tabId, urlString) {
	try {
		const settings = await chrome.storage.local.get(['injector_enabled']);
		if (settings.injector_enabled === false) return;

		const url = new URL(urlString);
		const domain = url.hostname;

		// Check for global CSS
		const globalRes = await chrome.storage.local.get(['css_global']);
		if (globalRes.css_global) {
			await chrome.scripting.insertCSS({
				target: { tabId },
				css: globalRes.css_global
			}).catch(() => { });
		}

		// Check for domain-specific CSS
		const domainRes = await chrome.storage.local.get([`css_${domain}`]);
		if (domainRes[`css_${domain}`]) {
			await chrome.scripting.insertCSS({
				target: { tabId },
				css: domainRes[`css_${domain}`]
			}).catch(() => { });
		}
	} catch (e) {
		console.error('Auto-injection failed:', e);
	}
}

// action: 'insertCss'
// permissions: activeTab, scripting, storage
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (sender.id !== chrome.runtime.id) return;
	if (message.action !== 'insertCss') return;

	if (sender.tab && sender.tab.id) {
		// Request from content script
		injectCssForTab(sender.tab.id, sender.tab.url)
			.then(() => sendResponse({ success: true }))
			.catch((err) => sendResponse({ success: false, error: err.message }));
		return true;
	}

	(async function insertCss() {
		try {
			const settings = await chrome.storage.local.get(['injector_enabled']);
			if (settings.injector_enabled === false) {
				console.log('CSS Injection is globally disabled.');
				return;
			}

			// Find all relevant tabs to sync changes across the browser
			let tabs = [];
			if (message.scope === 'global') {
				tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
			} else {
				const domain = message.domain;
				if (!domain) throw new Error('No domain provided for scoped injection.');
				tabs = await chrome.tabs.query({ url: [`*://${domain}/*`, `*://*.${domain}/*`] });
			}

			if (tabs.length === 0) {
				console.log('No matching tabs found for injection.');
				return;
			}

			let storageKey;
			if (message.scope === 'global') {
				storageKey = 'css_global';
			} else {
				storageKey = `css_${message.domain}`;
			}

			const storage = await chrome.storage.local.get([storageKey]);
			const cssCode = storage[storageKey];

			if (!cssCode) {
				console.warn(`No CSS code found for scope ${message.scope} (${storageKey})`);
				return;
			}

			console.log(`Injecting CSS into ${tabs.length} tab(s) using scope ${message.scope}`);

			// Inject into all matching tabs
			const injectionPromises = tabs.map(tab => {
				if (!tab.id) return Promise.resolve();
				return chrome.scripting.insertCSS({
					target: { tabId: tab.id },
					css: cssCode
				}).catch(err => console.warn(`Failed to inject into tab ${tab.id}:`, err));
			});

			await Promise.all(injectionPromises);

			console.log('CSS injected successfully into all matching tabs.');
		} catch (error) {
			console.error('Failed to inject CSS:', error);
			throw error;
		}
	})().then(() => sendResponse({ success: true }))
		.catch((err) => sendResponse({ success: false, error: err.message }));

	return true; // Keep message channel open for async response
});






{ // Network debugger
	async function startDebugging(tabId) {
		const console = { ...globalThis.console };
		function stringify(object) {
			return JSON.stringify(object, (key, value) => {
				// 'value' is the object being stringified (only on the first pass)
				if (value && typeof value === 'object' && !Array.isArray(value)) {
					const proto = Object.getPrototypeOf(value);
					const result = { ...value };

					Object.entries(Object.getOwnPropertyDescriptors(proto)).forEach(([k, desc]) => {
						if (desc.get) {
							result[k] = value[k]; // Execute getter and add to result
						}
					});
					return result;
				}
				return value;
			});
		}
		console.log = function log(...args) {
			globalThis.console.log(args);
			const data = { ...args };
			for (const k in data) {
				if (typeof (data[k]) === 'object') {
					data[k] = stringify(data[k]);
					globalThis.console.log(data[k]);
				}
			}
			return chrome.tabs.sendMessage(tabId, {
				type: "CONSOLE_LOG",
				data: data
			});
		};
		console.warn({ tabId });

		try {
			// Protocol version "1.3" is widely used and stable
			await chrome.debugger.attach({ tabId }, "1.3");
			console.log("Debugger attached!");

			// 2. Enable Target auto-attach to catch Service Workers/Child Frames
			await chrome.debugger.sendCommand({ tabId }, "Target.setAutoAttach", {
				autoAttach: true,
				waitForDebuggerOnStart: true, // PAUSES the worker so you don't miss the first fetch
				flatten: true, // This puts all events into the same connection
				filter: [
					// { type: "service_worker", exclude: false },
					{ type: "iframe", exclude: false }
				]
			});

			// 2. Enable the Network domain
			// await chrome.debugger.sendCommand({ tabId }, "Network.enable");
			// 2. Enable Fetch domain (specifically for fetch/XHR)
			// This is often more reliable for catching gtag/gtm beacons
			await chrome.debugger.sendCommand({ tabId }, "Fetch.enable", {
				patterns: [
					// { urlPattern: "*", requestStage: "Request" },
					{ urlPattern: "*", requestStage: "Response" }
				]
			});

			// 3. Resume any paused targets
			await chrome.debugger.sendCommand({ tabId }, "Runtime.runIfWaitingForDebugger");

			// 3. Force a reload to catch GTM initialization
			// await chrome.debugger.sendCommand({ tabId }, "Page.reload");

			// 3. Set up a listener for CDP events
			// chrome.debugger.onEvent.addListener((source, method, params) => {
			// 	if (source.tabId !== tabId) return;
			// 	if (method === "Network.requestWillBeSent") {
			// 		console.log(params.request.url);
			// 	}
			// 	else if (method === "Network.responseReceived") {
			// 		console.log(params.request.url);
			// 	}
			// });

			/** @type {SentRequest[]} */
			const networkRequests = [];
			chrome.debugger.onEvent.addListener(async (source, method, params) => {
				if (method === "Fetch.requestPaused") {
					try {
						// console.warn(params.request?.url);
						if (!params.request) return;

						/** @type {string} */
						const url = params.request.url;
						/** @type {string} */
						const method = params.request.method;
						const sentRequest = new SentRequest(url, method);
						networkRequests.push(sentRequest);
						console.log('networkRequests', networkRequests);

						const ec4w_validator = new EC4W_Validator(networkRequests);
						const result = ec4w_validator.conclude();
						console.log('result', result);
						console.log('result', result.validRequest);

					} catch (err) {
						console.error(err);
						console.log('err', err.toString());
					} finally {
						// IMPORTANT: Always continue the request so the page doesn't break
						await chrome.debugger.sendCommand(source, "Fetch.continueRequest", {
							requestId: params.requestId
						}).catch(a => a);
					}
				}
			});

		} catch (err) {
			console.error("Failed to attach:", err);
		}
	}

	// chrome.action.onClicked.addListener((tab) => {
	// 	startDebugging(tab.id);
	// });

	chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
		if (sender.id !== chrome.runtime.id) return false;
		if (message.action !== "startDebugging") return false;

		console.log(message, sender, sendResponse);
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			const tabId = tabs[0].id;
			console.log({ tabId });
			startDebugging(tabId);
		});
	});

	// { // place in a content_script world: ISOLATED
	//     'use strict';
	//     chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	//         if (request.type !== "CONSOLE_LOG") return;
	//         console.log(request.data.args);
	//     });
	// }

}