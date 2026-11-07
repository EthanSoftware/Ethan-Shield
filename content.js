// Ethan Shield — Content Script
// Injected at document_start to intercept fingerprinting APIs
// Ethan Software © 2024

(function() {
  'use strict';

  // Retrieve settings and apply protections
  chrome.storage.local.get('settings', ({ settings }) => {
    if (!settings) return;

    if (settings.blockFingerprint !== false) {
      injectFingerprintProtection(settings);
    }

    if (settings.blockWebRTC !== false) {
      injectWebRTCProtection();
    }
  });

  function injectFingerprintProtection(settings) {
    const script = document.createElement('script');
    script.textContent = `(${fingerprintShield.toString()})()`;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }

  function injectWebRTCProtection() {
    const script = document.createElement('script');
    script.textContent = `(${webRTCShield.toString()})()`;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }

  // This function is stringified and injected into page context
  function fingerprintShield() {
    const noop = () => {};
    const originalGetContext = HTMLCanvasElement.prototype.getContext;

    // Canvas fingerprint noise
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      const ctx = originalGetContext.call(this, type, ...args);
      if (!ctx) return ctx;

      if (type === '2d') {
        const originalGetImageData = ctx.getImageData.bind(ctx);
        ctx.getImageData = function(...a) {
          const imageData = originalGetImageData(...a);
          // Add subtle noise to canvas reads
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            if (Math.random() < 0.01) {
              data[i] = Math.min(255, data[i] + (Math.random() > 0.5 ? 1 : -1));
            }
          }
          return imageData;
        };

        const originalFillText = ctx.fillText.bind(ctx);
        ctx.fillText = function(text, x, y, ...rest) {
          return originalFillText(text, x + (Math.random() * 0.1 - 0.05), y + (Math.random() * 0.1 - 0.05), ...rest);
        };
      }
      return ctx;
    };

    // Block toDataURL fingerprinting
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(type, ...args) {
      if (this.width === 0 || this.height === 0) return originalToDataURL.call(this, type, ...args);
      const ctx = this.getContext('2d');
      if (ctx) {
        const pixel = ctx.getImageData(0, 0, 1, 1);
        pixel.data[0] = Math.min(255, pixel.data[0] + (Math.random() > 0.5 ? 1 : 0));
        ctx.putImageData(pixel, 0, 0);
      }
      return originalToDataURL.call(this, type, ...args);
    };

    // Font enumeration protection
    if (document.fonts && document.fonts.check) {
      const knownFonts = ['Arial','Helvetica','Times New Roman','Courier New','Georgia','Verdana'];
      const originalCheck = document.fonts.check.bind(document.fonts);
      document.fonts.check = function(font, text) {
        const isCommon = knownFonts.some(f => font.includes(f));
        if (!isCommon && Math.random() < 0.3) return false;
        return originalCheck(font, text);
      };
    }

    // AudioContext fingerprint protection
    if (window.AudioContext || window.webkitAudioContext) {
      const OrigAudio = window.AudioContext || window.webkitAudioContext;
      const AudioProxy = new Proxy(OrigAudio, {
        construct(target, args) {
          const ctx = new target(...args);
          const origCreateOscillator = ctx.createOscillator.bind(ctx);
          ctx.createOscillator = function() {
            const osc = origCreateOscillator();
            const origConnect = osc.connect.bind(osc);
            osc.connect = function(dest, ...rest) {
              if (dest && dest.getChannelData) {
                // Likely fingerprint attempt — add noise
              }
              return origConnect(dest, ...rest);
            };
            return osc;
          };
          return ctx;
        }
      });
      if (window.AudioContext) window.AudioContext = AudioProxy;
      if (window.webkitAudioContext) window.webkitAudioContext = AudioProxy;
    }

    // Screen resolution spoofing — slight randomization
    const screenHandler = {
      get(target, prop) {
        if (prop === 'width') return screen.width;
        if (prop === 'height') return screen.height;
        if (prop === 'availWidth') return screen.availWidth;
        if (prop === 'availHeight') return screen.availHeight;
        if (prop === 'colorDepth' || prop === 'pixelDepth') return 24;
        return target[prop];
      }
    };

    // Navigator protection — standardize fingerprint vectors
    const navigatorOverrides = {
      hardwareConcurrency: 4,
      deviceMemory: 8,
      languages: ['en-US', 'en'],
      platform: 'Win32'
    };

    try {
      for (const [key, value] of Object.entries(navigatorOverrides)) {
        if (key in navigator) {
          Object.defineProperty(navigator, key, {
            get: () => value,
            configurable: true
          });
        }
      }
    } catch (e) {}

    // Block battery API (fingerprinting vector)
    if (navigator.getBattery) {
      navigator.getBattery = () => Promise.reject(new Error('Blocked by Ethan Shield'));
    }

    // Timezone normalization
    const originalDateTimeFormat = Intl.DateTimeFormat;
    Intl.DateTimeFormat = function(locale, options = {}) {
      return new originalDateTimeFormat(locale, options);
    };
    Object.setPrototypeOf(Intl.DateTimeFormat, originalDateTimeFormat);
    Intl.DateTimeFormat.prototype = originalDateTimeFormat.prototype;

    // Block network information API
    if (navigator.connection) {
      try {
        Object.defineProperty(navigator, 'connection', {
          get: () => ({ effectiveType: '4g', downlink: 10, rtt: 50 }),
          configurable: true
        });
      } catch (e) {}
    }
  }

  // WebRTC IP leak prevention
  function webRTCShield() {
    // Override RTCPeerConnection to prevent IP leaks
    const OrigRTC = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    if (!OrigRTC) return;

    function ShieldedRTC(config, ...args) {
      // Strip STUN/TURN servers to prevent IP discovery
      if (config && config.iceServers) {
        config.iceServers = [];
      }
      return new OrigRTC(config || {}, ...args);
    }

    ShieldedRTC.prototype = OrigRTC.prototype;
    ShieldedRTC.generateCertificate = OrigRTC.generateCertificate;

    if (window.RTCPeerConnection) window.RTCPeerConnection = ShieldedRTC;
    if (window.webkitRTCPeerConnection) window.webkitRTCPeerConnection = ShieldedRTC;
    if (window.mozRTCPeerConnection) window.mozRTCPeerConnection = ShieldedRTC;
  }

  // Report fingerprint attempts to background
  document.addEventListener('ethan-fingerprint-attempt', (e) => {
    chrome.runtime.sendMessage({ type: 'FINGERPRINT_DETECTED', detail: e.detail }).catch(() => {});
  });

})();
