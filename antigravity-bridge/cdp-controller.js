// Antigravity CDP Controller
// Direct Chrome DevTools Protocol automation for Antigravity IDE UI
// Eliminates laptop click requirements for mobile Telegram remote control

const fs = require('fs');

const DEVTOOLS_PORT_FILE = 'C:\\Users\\555\\AppData\\Roaming\\Antigravity\\DevToolsActivePort';

async function getCDPPage() {
  if (!fs.existsSync(DEVTOOLS_PORT_FILE)) {
    return null;
  }
  const [port] = fs.readFileSync(DEVTOOLS_PORT_FILE, 'utf8').trim().split('\n');
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json`);
    const targets = await res.json();
    const page = targets.find(t => 
      t.type === 'page' && 
      t.webSocketDebuggerUrl && 
      (t.url.includes('/c/') || t.title.includes('CRM') || t.title.includes('Antigravity') || t.title.includes('Разработка'))
    ) || targets.find(t => t.type === 'page' && t.webSocketDebuggerUrl);

    return page ? { port, page } : null;
  } catch (err) {
    return null;
  }
}

function sendCDPCommand(wsUrl, method, params = {}) {
  return new Promise((resolve, reject) => {
    let ws;
    let timer;
    try {
      ws = new WebSocket(wsUrl);
    } catch (e) {
      return reject(e);
    }

    const cleanup = () => {
      clearTimeout(timer);
      try { ws.close(); } catch (e) {}
    };

    timer = setTimeout(() => {
      cleanup();
      reject(new Error(`CDP command timeout [${method}]`));
    }, 4000);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: Math.floor(Math.random() * 100000),
        method,
        params
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        cleanup();
        resolve(msg.result);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    ws.onerror = (err) => {
      cleanup();
      reject(err);
    };
  });
}

// Evaluate JavaScript in Antigravity page
async function evaluateInPage(expression) {
  const cdp = await getCDPPage();
  if (!cdp) throw new Error('Antigravity DevTools not reachable');
  const result = await sendCDPCommand(cdp.page.webSocketDebuggerUrl, 'Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
    userGesture: true
  });
  return result?.result?.value;
}

// Find pending confirmation / proceed buttons
async function getPendingConfirmations() {
  const expr = `
    (() => {
      const candidates = Array.from(document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"], .monaco-button, a[role="button"], .cursor-pointer'));
      const pending = [];

      const CONFIRM_REGEX = /^(proceed|proceed with|продолжить|продовжити|allow|always allow|allow command|разрешить|всегда разрешать|дозволити|завжди дозволяти|run|run command|выполнить|виконати|запустить|запустити|approve|approve plan|утвердить|затвердити|accept|принять|прийняти|confirm|подтвердить|підтвердити|yes|да|так|apply|применить|застосувати)$/i;

      for (const el of candidates) {
        const text = (el.innerText || el.textContent || el.getAttribute('aria-label') || '').trim();
        const rect = el.getBoundingClientRect();
        const isVisible = (el.offsetParent !== null || rect.width > 0 || rect.height > 0) && rect.top >= 0;
        if (!isVisible || !text) continue;

        const lower = text.toLowerCase().replace(/\\s+/g, ' ');
        if (CONFIRM_REGEX.test(lower) || lower.startsWith('proceed') || lower.startsWith('run ') || lower.startsWith('allow ') || lower.startsWith('выполнить ') || lower.startsWith('разрешить ')) {
          pending.push({
            text,
            tag: el.tagName,
            className: el.className
          });
        }
      }
      return pending;
    })()
  `;

  try {
    return await evaluateInPage(expr) || [];
  } catch (e) {
    return [];
  }
}

// Click the active confirmation button on the laptop screen
async function clickPendingConfirmation() {
  const expr = `
    (() => {
      function triggerClick(el) {
        el.scrollIntoView({ block: 'center' });
        const events = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
        for (const evt of events) {
          const e = new MouseEvent(evt, { bubbles: true, cancelable: true, view: window });
          el.dispatchEvent(e);
        }
        if (typeof el.click === 'function') {
          el.click();
        }
      }

      const candidates = Array.from(document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"], .monaco-button, a[role="button"], .cursor-pointer'));
      
      const CONFIRM_REGEX = /^(proceed|proceed with|продолжить|продовжити|allow|always allow|allow command|разрешить|всегда разрешать|дозволити|завжди дозволяти|run|run command|выполнить|виконати|запустить|запустити|approve|approve plan|утвердить|затвердити|accept|принять|прийняти|confirm|подтвердить|підтвердити|yes|да|так|apply|применить|застосувати)$/i;

      // Priority 1: Exact confirmation match
      for (const el of candidates) {
        const text = (el.innerText || el.textContent || el.getAttribute('aria-label') || '').trim().toLowerCase().replace(/\\s+/g, ' ');
        const rect = el.getBoundingClientRect();
        const isVisible = (el.offsetParent !== null || rect.width > 0 || rect.height > 0) && rect.top >= 0;
        if (!isVisible) continue;

        if (CONFIRM_REGEX.test(text) || text.startsWith('proceed') || text.startsWith('run ') || text.startsWith('allow ') || text.startsWith('выполнить ') || text.startsWith('разрешить ')) {
          triggerClick(el);
          return { success: true, text: el.innerText || text, type: 'exact_confirm' };
        }
      }

      // Priority 2: Primary action buttons in dialogs or popups
      const dialogButtons = Array.from(document.querySelectorAll('[role="dialog"] button, .monaco-dialog-box button, .notification-toast button, .modal button'));
      for (const el of dialogButtons) {
        const rect = el.getBoundingClientRect();
        const isVisible = (el.offsetParent !== null || rect.width > 0 || rect.height > 0) && rect.top >= 0;
        if (!isVisible) continue;
        const text = (el.innerText || el.textContent || '').trim().toLowerCase();
        if (!text.includes('cancel') && !text.includes('отмена') && !text.includes('скасувати') && !text.includes('close')) {
          triggerClick(el);
          return { success: true, text: el.innerText || text, type: 'dialog_primary' };
        }
      }

      // Priority 3: Fuzzy matching
      for (const el of candidates) {
        const text = (el.innerText || el.textContent || '').trim().toLowerCase();
        const rect = el.getBoundingClientRect();
        const isVisible = (el.offsetParent !== null || rect.width > 0 || rect.height > 0) && rect.top >= 0;
        if (!isVisible) continue;

        if (text.includes('proceed') || text.includes('підтвердити') || text.includes('подтвердить') || text.includes('approve') || text.includes('разрешить') || text.includes('выполнить')) {
          triggerClick(el);
          return { success: true, text: el.innerText || text, type: 'fuzzy_confirm' };
        }
      }

      return { success: false, reason: 'No pending confirmation buttons found on screen' };
    })()
  `;

  try {
    return await evaluateInPage(expr);
  } catch (e) {
    return { success: false, reason: e.message };
  }
}

// Dispatch Enter key via CDP to press focused default action
async function sendEnterKey() {
  const cdp = await getCDPPage();
  if (!cdp) return false;
  try {
    const wsUrl = cdp.page.webSocketDebuggerUrl;
    await sendCDPCommand(wsUrl, 'Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      windowsVirtualKeyCode: 13,
      unmodifiedText: '\r',
      text: '\r',
      key: 'Enter',
      code: 'Enter'
    });
    await sendCDPCommand(wsUrl, 'Input.dispatchKeyEvent', {
      type: 'keyUp',
      windowsVirtualKeyCode: 13,
      key: 'Enter',
      code: 'Enter'
    });
    return true;
  } catch (e) {
    return false;
  }
}

// Get full status of IDE screen for Telegram report
async function getScreenStatus() {
  const cdp = await getCDPPage();
  if (!cdp) {
    return { connected: false, error: 'DevTools port not reachable' };
  }

  const expr = `
    (() => {
      const isWorking = !!document.querySelector('.animate-spin, [aria-label*="working"], [aria-label*="generating"]');
      const stopBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Stop'));
      const text = document.body ? document.body.innerText.substring(document.body.innerText.length - 800) : '';
      
      return {
        isWorking: isWorking || !!stopBtn,
        hasStopButton: !!stopBtn,
        recentTextSnippet: text.replace(/\\s+/g, ' ').slice(-300)
      };
    })()
  `;

  try {
    const pageState = await evaluateInPage(expr);
    const pendingButtons = await getPendingConfirmations();
    return {
      connected: true,
      title: cdp.page.title,
      isWorking: pageState?.isWorking || false,
      pendingButtons,
      recentTextSnippet: pageState?.recentTextSnippet || ''
    };
  } catch (e) {
    return { connected: false, error: e.message };
  }
}

module.exports = {
  getCDPPage,
  evaluateInPage,
  getPendingConfirmations,
  clickPendingConfirmation,
  sendEnterKey,
  getScreenStatus
};
