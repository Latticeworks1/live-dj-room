const overlayEl = document.getElementById('preflight-overlay');
const overlayCardEl = overlayEl?.querySelector('.preflight-card');
const issuesListEl = overlayEl?.querySelector('[data-preflight-list]');
const retryBtn = document.getElementById('retry-preflight');
let lastFocusedElement = null;

/**
 * Feature detection logic follows the MDN examples that guard media APIs before invoking them:
 * - MediaDevices.getUserMedia: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#checking_media_device_support
 * - MediaRecorder: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder#checking_for_support
 * - AudioContext: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext
 */

const DOM_REQUIREMENTS = [
  {
    id: 'login-button',
    category: 'dom',
    selector: '.login-btn',
    label: 'Puter sign-in button (.login-btn)',
    message: 'The Puter sign-in button is missing from the DOM.',
    hint: 'Ensure the login markup is rendered before app.js runs.',
    blocking: true,
    retryable: false,
  },
  {
    id: 'room-page',
    category: 'dom',
    selector: '.room-page',
    label: 'Room container (.room-page)',
    message: 'The room layout container is missing.',
    hint: 'Check client/src/index.html for the .room-page markup.',
    blocking: true,
    retryable: false,
  },
  {
    id: 'whiteboard-canvas',
    category: 'dom',
    selector: '.whiteboard',
    label: 'Whiteboard canvas (.whiteboard)',
    message: 'The collaborative whiteboard canvas cannot be found.',
    hint: 'Ensure the canvas element keeps the .whiteboard class.',
    blocking: true,
    retryable: false,
  },
  {
    id: 'voice-button',
    category: 'dom',
    selector: '#btn-talk',
    label: 'Push-to-talk button (#btn-talk)',
    message: 'The push-to-talk button is missing.',
    hint: 'Keep the #btn-talk element so voice chat can bind events.',
    blocking: true,
    retryable: false,
  },
  {
    id: 'audio-player',
    category: 'dom',
    selector: '#main-audio',
    label: 'Audio player (#main-audio)',
    message: 'The shared audio player element is missing.',
    hint: 'The audio tag must have id="main-audio" for playback sync.',
    blocking: true,
    retryable: false,
  },
];

const API_REQUIREMENTS = [
  {
    id: 'media-devices',
    category: 'api',
    check: () =>
      typeof navigator !== 'undefined' &&
      !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    message: 'Your browser does not expose navigator.mediaDevices.getUserMedia.',
    hint: 'Use a modern browser and allow microphone permissions over HTTPS.',
    blocking: true,
    retryable: false,
    doc: 'https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#checking_media_device_support',
  },
  {
    id: 'media-recorder',
    category: 'api',
    check: () => typeof window !== 'undefined' && 'MediaRecorder' in window,
    message: 'The MediaRecorder API is unavailable.',
    hint: 'Upgrade to a browser that implements MediaRecorder (Chrome 49+, Firefox 30+).',
    blocking: true,
    retryable: false,
    doc: 'https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder#checking_for_support',
  },
  {
    id: 'audio-context',
    category: 'api',
    check: () =>
      typeof window !== 'undefined' &&
      ('AudioContext' in window || 'webkitAudioContext' in window),
    message: 'The Web Audio API (AudioContext) is missing.',
    hint: 'Use a browser with Web Audio support to sync playback.',
    blocking: true,
    retryable: false,
    doc: 'https://developer.mozilla.org/en-US/docs/Web/API/AudioContext',
  },
  {
    id: 'puter-sdk',
    category: 'api',
    // Pattern mirrors the MDN feature detection example using the `in` operator:
    // https://developer.mozilla.org/en-US/docs/Learn/Tools_and_testing/Cross_browser_testing/Feature_detection#feature_detection
    check: () =>
      typeof window !== 'undefined' &&
      'puter' in window &&
      !!window.puter?.auth,
    message: 'The Puter SDK has not finished loading.',
    hint: 'Keep https://js.puter.com/v2/ on the page so authentication can initialize.',
    blocking: true,
    retryable: false,
    doc: 'https://developer.mozilla.org/en-US/docs/Learn/Tools_and_testing/Cross_browser_testing/Feature_detection#feature_detection',
  },
  {
    id: 'file-reader',
    category: 'api',
    check: () => typeof window !== 'undefined' && 'FileReader' in window,
    message: 'File uploads need the FileReader API.',
    hint: 'Use an evergreen browser that includes FileReader.',
    blocking: true,
    retryable: false,
  },
];

const ENV_REQUIREMENTS = [
  {
    id: 'secure-context',
    category: 'env',
    check: () =>
      typeof window !== 'undefined' &&
      (window.isSecureContext || ['localhost', '127.0.0.1'].includes(window.location.hostname)),
    message: 'Live DJ Room must run in a secure context for microphone access.',
    hint: 'Serve the app over HTTPS or use localhost/127.0.0.1 for development.',
    blocking: true,
    retryable: false,
    doc: 'https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts',
  },
  {
    id: 'network',
    category: 'env',
    check: () => typeof navigator === 'undefined' || navigator.onLine !== false,
    message: 'You appear to be offline.',
    hint: 'Reconnect to the internet to reach the Live DJ Room server.',
    blocking: true,
    retryable: true,
  },
];

const CATEGORY_DETAILS = {
  dom: {
    title: 'Interface Hooks',
    helper: 'Required DOM anchors that wire up controls and layouts.',
  },
  api: {
    title: 'Browser Capabilities',
    helper: 'Platform APIs needed for voice, audio, and canvas features.',
  },
  env: {
    title: 'Runtime Environment',
    helper: 'Network and security prerequisites for real-time access.',
  },
};

function describeDomIssues() {
  return DOM_REQUIREMENTS.filter((req) => !document.querySelector(req.selector)).map((req) => ({
    id: req.id,
    category: req.category,
    message: req.message,
    hint: req.hint,
    blocking: req.blocking,
    retryable: req.retryable,
  }));
}

function describeApiIssues() {
  return API_REQUIREMENTS.filter((req) => !req.check()).map((req) => ({
    id: req.id,
    category: req.category,
    message: req.message,
    hint: req.hint,
    blocking: req.blocking,
    retryable: req.retryable,
    doc: req.doc,
  }));
}

function describeEnvIssues() {
  return ENV_REQUIREMENTS.filter((req) => !req.check()).map((req) => ({
    id: req.id,
    category: req.category,
    message: req.message,
    hint: req.hint,
    blocking: req.blocking,
    retryable: req.retryable,
    doc: req.doc,
  }));
}

function renderOverlay(issues) {
  if (!overlayEl || !issuesListEl) {
    console.error('[Preflight] Overlay container missing. Issues:', issues);
    return;
  }

  const grouped = issues.reduce(
    (acc, issue) => {
      // Grouping mirrors MDN's Array.reduce example for categorizing objects:
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce#grouping_objects_by_a_property
      const key = issue.category || 'general';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(issue);
      return acc;
    },
    {}
  );

  const fragment = document.createDocumentFragment();
  // Batched DOM writes follow the MDN DocumentFragment append example:
  // https://developer.mozilla.org/en-US/docs/Web/API/DocumentFragment#examples

  Object.entries(grouped).forEach(([category, categoryIssues]) => {
    const groupWrapper = document.createElement('section');
    groupWrapper.className = 'preflight-group';

    const header = document.createElement('header');
    header.className = 'preflight-group-header';

    const heading = document.createElement('h3');
    heading.textContent = CATEGORY_DETAILS[category]?.title || 'Checks';
    header.appendChild(heading);

    const helper = document.createElement('p');
    helper.textContent = CATEGORY_DETAILS[category]?.helper || 'Resolve the blockers below.';
    header.appendChild(helper);

    groupWrapper.appendChild(header);

    const list = document.createElement('ul');
    list.className = 'preflight-issue-list';

    categoryIssues.forEach((issue) => {
      const item = document.createElement('li');

      const title = document.createElement('strong');
      title.textContent = issue.message;
      item.appendChild(title);

      if (issue.hint) {
        const hint = document.createElement('span');
        hint.textContent = issue.hint;
        item.appendChild(hint);
      }

      if (issue.doc) {
        const docLink = document.createElement('a');
        docLink.href = issue.doc;
        docLink.target = '_blank';
        docLink.rel = 'noreferrer noopener';
        docLink.textContent = 'View documentation';
        item.appendChild(docLink);
      }

      list.appendChild(item);
    });

    groupWrapper.appendChild(list);
    fragment.appendChild(groupWrapper);
  });

  issuesListEl.innerHTML = '';
  issuesListEl.appendChild(fragment);

  if (document.activeElement instanceof HTMLElement) {
    lastFocusedElement = document.activeElement;
  }

  overlayEl.removeAttribute('hidden');
  // Focus management follows the WAI-ARIA alert dialog example to announce blockers:
  // https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/examples/alertdialog/
  overlayCardEl?.focus();
}

function hideOverlay() {
  if (overlayEl) {
    overlayEl.setAttribute('hidden', '');
  }

  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  }
  lastFocusedElement = null;
}

export function runPreflightChecks() {
  const issues = [...describeDomIssues(), ...describeApiIssues(), ...describeEnvIssues()];
  const blockingIssues = issues.filter((issue) => issue.blocking);
  const fatal = blockingIssues.some((issue) => !issue.retryable);

  if (blockingIssues.length) {
    renderOverlay(blockingIssues);
    return {
      ok: false,
      issues: blockingIssues,
      fatal,
    };
  }

  hideOverlay();
  return { ok: true, issues: [] };
}

export function waitForPreflightReady() {
  return new Promise((resolve) => {
    const evaluate = () => {
      const result = runPreflightChecks();
      if (result.ok || result.fatal) {
        cleanup();
        resolve(result);
      }
    };

    const cleanup = () => {
      window.removeEventListener('online', evaluate);
      window.removeEventListener('offline', evaluate);
      retryBtn?.removeEventListener('click', evaluate);
    };

    window.addEventListener('online', evaluate);
    window.addEventListener('offline', evaluate);
    retryBtn?.addEventListener('click', evaluate);

    evaluate();
  });
}
