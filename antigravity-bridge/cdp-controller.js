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
      const candidates = Array.from(document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]'));
      const pending = [];

      for (const el of candidates) {
        const text = (el.innerText || el.textContent || el.getAttribute('aria-label') || '').trim();
        const isVisible = el.offsetParent !== null || el.getClientRects().length > 0;
        if (!isVisible || !text) continue;

        const lower = text.toLowerCase();
        const isProceed = lower === 'proceed' || lower.startsWith('proceed with');
        const isRun = lower === 'run' || lower.startsWith('run ') && !lower.includes('finished') && !lower.includes('running');
        const isAllow = lower === 'allow' || lower === 'always allow' || lower.includes('allow command');
        const isApprove = lower === 'approve' || lower.includes('approve plan');
        const isAccept = lower === 'accept';
        const isConfirm = lower === 'confirm' || lower === 'підтвердити';

        if (isProceed || isRun || isAllow || isApprove || isAccept || isConfirm) {
          pending.push({
            text,
            tag: el.tagName,
            isProceed,
            isRun,
            isAllow,
            isApprove
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
      const candidates = Array.from(document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]'));
      
      // Priority 1: Exact "Proceed" / "Proceed with..."
      for (const el of candidates) {
        const text = (el.innerText || el.textContent || el.getAttribute('aria-label') || '').trim().toLowerCase();
        const isVisible = el.offsetParent !== null || el.getClientRects().length > 0;
        if (!isVisible) continue;

        if (text === 'proceed' || text.startsWith('proceed with') || text === 'approve' || text === 'always allow') {
          el.scrollIntoView({ block: 'center' });
          el.click();
          return { success: true, text: el.innerText || text, type: 'proceed' };
        }
      }

      // Priority 2: "Allow" / "Run"
      for (const el of candidates) {
        const text = (el.innerText || el.textContent || el.getAttribute('aria-label') || '').trim().toLowerCase();
        const isVisible = el.offsetParent !== null || el.getClientRects().length > 0;
        if (!isVisible) continue;

        if (text === 'allow' || text === 'run' || text.startsWith('run ') && !text.includes('finished') && !text.includes('running')) {
          el.scrollIntoView({ block: 'center' });
          el.click();
          return { success: true, text: el.innerText || text, type: 'run_or_allow' };
        }
      }

      // Priority 3: Any button containing "proceed" or "підтвердити"
      for (const el of candidates) {
        const text = (el.innerText || el.textContent || '').trim().toLowerCase();
        const isVisible = el.offsetParent !== null || el.getClientRects().length > 0;
        if (!isVisible) continue;

        if (text.includes('proceed') || text.includes('підтвердити') || text.includes('approve')) {
          el.scrollIntoView({ block: 'center' });
          el.click();
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
