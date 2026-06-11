  if (document.getElementById('fb-root')) return
  if (location.protocol === 'chrome-extension:' || location.protocol === 'devtools:') return

  try {
    window.postMessage({ type: 'FB_EXTENSION_INSTALLED', version: chrome.runtime.getManifest().version }, '*');
    window.__FB_EXTENSION_INSTALLED = true;
  } catch (e) {}

  // Safety wrapper to prevent "Extension context invalidated" errors when developer reloads extension
  function isContextValid() {
    try {
      return !!(window.chrome && window.chrome.runtime && window.chrome.runtime.id);
    } catch (e) {
      return false;
    }
  }

  // Shadow global chrome object inside IIFE to automatically catch invalidation on all calls
  const chrome = {
    get storage() {
      if (!isContextValid()) {
        return {
          local: {
            set: (data, cb) => { if (cb) cb(); },
            get: (keys, cb) => { if (cb) cb({}); },
            remove: (keys, cb) => { if (cb) cb(); }
          }
        };
      }
      return window.chrome.storage;
    },
    get runtime() {
      if (!isContextValid()) {
        return {
          sendMessage: (msg, cb) => { if (cb) cb(); },
          getURL: (path) => "",
          onMessage: {
            addListener: () => {},
            removeListener: () => {}
          }
        };
      }
      return window.chrome.runtime;
    }
  };

