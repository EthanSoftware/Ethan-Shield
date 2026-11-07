// Ethan Shield — Background Service Worker
// Ethan Software © 2024

const DEFAULT_STATS = {
  adsBlocked: 0,
  trackersBlocked: 0,
  cookiesCleared: 0,
  fingerprintAttempts: 0,
  totalRequests: 0,
  byDomain: {}
};

const DEFAULT_SETTINGS = {
  blockAds: true,
  blockTrackers: true,
  blockCookies: true,
  blockFingerprint: true,
  blockWebRTC: true,
  blockCanvasFingerprint: true,
  blockFontFingerprint: true,
  enabledSites: {},  // domain -> true/false override
  cookieWhitelist: [],
  sessionStart: Date.now()
};

// Known ad/tracker domains for dynamic blocking
const AD_DOMAINS = [
  "doubleclick.net","googlesyndication.com","googleadservices.com",
  "adnxs.com","rubiconproject.com","openx.net","pubmatic.com",
  "criteo.com","criteo.net","taboola.com","outbrain.com",
  "revcontent.com","mgid.com","adroll.com","adsafeprotected.com",
  "moatads.com","amazon-adsystem.com","media.net","advertising.com",
  "lijit.com","sovrn.com","contextweb.com","casalemedia.com",
  "yieldmo.com","appnexus.com","adtechus.com","ad.gt",
  "adobedtm.com","bluekai.com","lotame.com","quantcast.com",
  "scorecardresearch.com","comscore.com","nielsen.com",
  "adsystem.com","adform.net","smartadserver.com","33across.com",
  "triplelift.com","sharethrough.com","spotxchange.com","spotx.tv"
];

const TRACKER_DOMAINS = [
  "google-analytics.com","googletagmanager.com","facebook.com/tr",
  "connect.facebook.net","analytics.twitter.com","static.ads-twitter.com",
  "snap.licdn.com","platform.linkedin.com","bat.bing.com",
  "analytics.yahoo.com","pixel.quantserve.com","clicktale.net",
  "hotjar.com","fullstory.com","logrocket.com","mouseflow.com",
  "crazyegg.com","luckyorange.com","segment.com","segment.io",
  "mixpanel.com","amplitude.com","heap.io","kissmetrics.com",
  "intercom.io","intercom.com","drip.com","klaviyo.com",
  "chartbeat.com","parsely.com","newrelic.com","datadog-browser-agent.com",
  "sentry.io","bugsnag.com","raygun.io","rollbar.com",
  "optimizely.com","vwo.com","abtasty.com","convert.com",
  "tealium.com","ensighten.com","signal.co","branch.io",
  "appsflyer.com","adjust.com","kochava.com","singular.net",
  "trustarc.com","onetrust.com","evidon.com","cookiebot.com"
];

const FINGERPRINT_DOMAINS = [
  "fingerprintjs.com","fp.js.org","fraudscore.info","deviceprint.net",
  "threatmetrix.com","iovation.com","neustar.biz","sift.com",
  "maxmind.com","ipqualityscore.com","ipinfo.io","ipapi.com"
];

// Initialize storage on install
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(['stats', 'settings']);
  if (!existing.stats) {
    await chrome.storage.local.set({ stats: DEFAULT_STATS });
  }
  if (!existing.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
  console.log('[Ethan Shield] Installed and initialized.');
});

// Track blocked requests via declarativeNetRequest feedback
chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener(async (info) => {
  const { stats } = await chrome.storage.local.get('stats');
  const s = stats || DEFAULT_STATS;

  const url = info.request.url;
  const domain = new URL(url).hostname.replace(/^www\./, '');

  s.totalRequests = (s.totalRequests || 0) + 1;
  s.byDomain[domain] = (s.byDomain[domain] || 0) + 1;

  const ruleId = info.rule.ruleId;
  if (ruleId >= 1000 && ruleId < 2000) {
    s.adsBlocked = (s.adsBlocked || 0) + 1;
  } else if (ruleId >= 2000 && ruleId < 3000) {
    s.trackersBlocked = (s.trackersBlocked || 0) + 1;
  } else if (ruleId >= 3000) {
    s.fingerprintAttempts = (s.fingerprintAttempts || 0) + 1;
  }

  await chrome.storage.local.set({ stats: s });
});

// Cookie clearing on navigation
chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId !== 0) return;

  const { settings, stats } = await chrome.storage.local.get(['settings', 'stats']);
  if (!settings?.blockCookies) return;

  const url = new URL(details.url);
  const domain = url.hostname;

  if (settings.cookieWhitelist?.includes(domain)) return;

  try {
    const cookies = await chrome.cookies.getAll({ domain });
    let cleared = 0;

    for (const cookie of cookies) {
      if (isTrackingCookie(cookie)) {
        const protocol = cookie.secure ? 'https:' : 'http:';
        await chrome.cookies.remove({
          url: `${protocol}//${cookie.domain.replace(/^\./, '')}${cookie.path}`,
          name: cookie.name
        });
        cleared++;
      }
    }

    if (cleared > 0 && stats) {
      stats.cookiesCleared = (stats.cookiesCleared || 0) + cleared;
      await chrome.storage.local.set({ stats });
    }
  } catch (e) {
    // Cookie access denied — skip
  }
});

function isTrackingCookie(cookie) {
  const name = cookie.name.toLowerCase();
  const trackingPatterns = [
    /^_ga/,/^_gid/,/^_fbp/,/^_fbc/,/^__utm/,
    /^_pk_/,/^_hjid/,/^_hj/,/^intercom/,
    /^amplitude/,/^mp_/,/^mixpanel/,/^ajs_/,
    /^segid/,/^__gads/,/^IDE$/,/^DSID$/,
    /^FLC$/,/^AID$/,/^TAID$/,/^exchange_uid$/,
    /^khaos$/,/^C$/,/^GUC$/,/^A3$/,
    /^YSC$/,/^VISITOR_INFO/,/^PREF$/
  ];
  return trackingPatterns.some(p => p.test(name));
}

// Message handler for popup communication
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_STATS') {
    chrome.storage.local.get(['stats', 'settings']).then(data => {
      sendResponse({ stats: data.stats, settings: data.settings });
    });
    return true;
  }

  if (msg.type === 'GET_TAB_INFO') {
    chrome.tabs.query({ active: true, currentWindow: true }).then(async tabs => {
      if (!tabs[0]) return sendResponse({});
      const tab = tabs[0];
      const url = new URL(tab.url);
      const domain = url.hostname;

      // Get matched rules count for this tab
      let tabStats = { domain, adsBlocked: 0, trackersBlocked: 0 };
      sendResponse({ tabStats, tab });
    });
    return true;
  }

  if (msg.type === 'UPDATE_SETTING') {
    chrome.storage.local.get('settings').then(async ({ settings }) => {
      const s = settings || DEFAULT_SETTINGS;
      s[msg.key] = msg.value;
      await chrome.storage.local.set({ settings: s });
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === 'CLEAR_COOKIES_NOW') {
    chrome.tabs.query({ active: true, currentWindow: true }).then(async tabs => {
      if (!tabs[0]) return sendResponse({ cleared: 0 });
      const url = new URL(tabs[0].url);
      const domain = url.hostname;
      const cookies = await chrome.cookies.getAll({ domain });
      let cleared = 0;
      for (const cookie of cookies) {
        const protocol = cookie.secure ? 'https:' : 'http:';
        try {
          await chrome.cookies.remove({
            url: `${protocol}//${cookie.domain.replace(/^\./, '')}${cookie.path}`,
            name: cookie.name
          });
          cleared++;
        } catch (e) {}
      }
      const { stats } = await chrome.storage.local.get('stats');
      if (stats) {
        stats.cookiesCleared = (stats.cookiesCleared || 0) + cleared;
        await chrome.storage.local.set({ stats });
      }
      sendResponse({ cleared });
    });
    return true;
  }

  if (msg.type === 'RESET_STATS') {
    chrome.storage.local.set({ stats: { ...DEFAULT_STATS, sessionStart: Date.now() } }).then(() => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === 'CLEAR_ALL_BROWSING') {
    chrome.browsingData.remove({
      since: 0
    }, {
      cookies: true,
      localStorage: true,
      indexedDB: true,
      cacheStorage: true,
      serviceWorkers: true
    }).then(() => {
      sendResponse({ ok: true });
    });
    return true;
  }
});
