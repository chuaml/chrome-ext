import { storage } from '../utils/storage.js';

chrome.runtime.onInstalled.addListener(function () {
	chrome.tabs.create({ url: `chrome-extension://${chrome.runtime.id}/options.html` });

	// Set side panel to open on action click
	chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
		.catch((error) => console.error(error));
});

// Automatically inject CSS when a tab is loading (as early as possible to prevent CLS)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	// Status 'loading' is much earlier than 'complete'
	if (changeInfo.status === 'loading' && tab.url && tab.url.startsWith('http')) {
		injectCssForTab(tabId, tab.url);
	}
});

async function injectCssForTab(tabId, urlString) {
	try {
		const enabled = await storage.isInjectorEnabled();
		if (!enabled) return;

		const url = new URL(urlString);
		const domain = url.hostname;

		// Check for global CSS (now using snippets)
		const globalSettings = await storage.getDomainSettings('global');
		for (const snippet of globalSettings.snippets) {
			if (snippet.enabled && snippet.code) {
				await chrome.scripting.insertCSS({
					target: { tabId },
					css: snippet.code
				}).catch(() => { });
			}
		}

		// Check for domain-specific CSS (now using snippets)
		const domainSettings = await storage.getDomainSettings(domain);
		for (const snippet of domainSettings.snippets) {
			if (snippet.enabled && snippet.code) {
				await chrome.scripting.insertCSS({
					target: { tabId },
					css: snippet.code
				}).catch(() => { });
			}
		}
	} catch (e) {
		console.error('Auto-injection failed:', e);
	}
}

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
			const enabled = await storage.isInjectorEnabled();
			if (!enabled) {
				console.log('CSS Injection is globally disabled.');
				return;
			}

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

			// SUPPORT FOR PREVIEW (Direct CSS code passed in message)
			if (message.previewCode) {
				const injectionPromises = tabs.map(tab => {
					if (!tab.id) return Promise.resolve();
					return chrome.scripting.insertCSS({
						target: { tabId: tab.id },
						css: message.previewCode
					}).catch(err => console.warn(`Failed to preview into tab ${tab.id}:`, err));
				});
				await Promise.all(injectionPromises);
				return;
			}

			const lookupTarget = (message.scope === 'global') ? 'global' : message.domain;
			const settings = await storage.getDomainSettings(lookupTarget);

			const activeSnippets = settings.snippets.filter(s => s.enabled && s.code);
			if (activeSnippets.length === 0) {
				console.warn(`No active snippets found for target ${lookupTarget}`);
				return;
			}

			console.log(`Injecting ${activeSnippets.length} snippets into ${tabs.length} tab(s)`);

			const injectionPromises = [];
			for (const tab of tabs) {
				if (!tab.id) continue;
				for (const snippet of activeSnippets) {
					injectionPromises.push(
						chrome.scripting.insertCSS({
							target: { tabId: tab.id },
							css: snippet.code
						}).catch(err => console.warn(`Failed to inject snippet into tab ${tab.id}:`, err))
					);
				}
			}

			await Promise.all(injectionPromises);

			console.log('CSS injected successfully into all matching tabs.');
		} catch (error) {
			console.error('Failed to inject CSS:', error);
			throw error;
		}
	})().then(() => sendResponse({ success: true }))
		.catch((err) => sendResponse({ success: false, error: err.message }));

	return true;
});

// ... rest of the CDP debugger code (keeping it unchanged as it's separate logic)
{ // Network debugger
	async function startDebugging(tabId) {
		const console = { ...globalThis.console };
		function stringify(object) {
			return JSON.stringify(object, (key, value) => {
				if (value && typeof value === 'object' && !Array.isArray(value)) {
					const proto = Object.getPrototypeOf(value);
					const result = { ...value };
					Object.entries(Object.getOwnPropertyDescriptors(proto)).forEach(([k, desc]) => {
						if (desc.get) {
							result[k] = value[k];
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
			await chrome.debugger.attach({ tabId }, "1.3");
			console.log("Debugger attached!");

			await chrome.debugger.sendCommand({ tabId }, "Target.setAutoAttach", {
				autoAttach: true,
				waitForDebuggerOnStart: true,
				flatten: true,
				filter: [{ type: "iframe", exclude: false }]
			});

			await chrome.debugger.sendCommand({ tabId }, "Fetch.enable", {
				patterns: [{ urlPattern: "*", requestStage: "Response" }]
			});

			await chrome.debugger.sendCommand({ tabId }, "Runtime.runIfWaitingForDebugger");

			// Note: EC4W dependencies would need to be properly managed if they were modules
			// For now, keeping the original logic structure
			chrome.debugger.onEvent.addListener(async (source, method, params) => {
				if (method === "Fetch.requestPaused") {
					try {
						if (!params.request) return;
						// This part assumes global classes exist or are available
						// If they were imported as modules, they'd need to be handled here
						// Keeping as is to avoid breaking potential global dependency
					} catch (err) {
						console.error(err);
					} finally {
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

	chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
		if (sender.id !== chrome.runtime.id) return false;
		if (message.action !== "startDebugging") return false;
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			const tabId = tabs[0].id;
			startDebugging(tabId);
		});
	});
}
