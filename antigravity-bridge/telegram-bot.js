// Antigravity Telegram Remote Controller Bridge
// Direct mobile interface for Google Antigravity on Windows (Text + Voice + Media + Buttons + Auto-Approve)

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const BOT_TOKEN = '8863163939:AAGRB92FQDqNaL7igxqkuYlehA8Jkpu-oLk';
const CONVERSATION_ID = 'c28f09b5-bb5c-4e7b-9a50-da47a6331a0a';
const LANGUAGE_SERVER_PATH = 'C:\\Users\\555\\AppData\\Local\\Programs\\antigravity\\resources\\bin\\language_server.exe';
const AGENT_API_PATH = 'C:\\Users\\555\\.gemini\\antigravity\\bin\\agentapi.bat';
const TRANSCRIPT_PATH = `C:\\Users\\555\\.gemini\\antigravity\\brain\\${CONVERSATION_ID}\\.system_generated\\logs\\transcript.jsonl`;
const CONFIG_FILE = path.join(__dirname, 'config.json');
const UPLOADS_DIR = path.join(__dirname, 'temp_media');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const TELEGRAM_API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Load or initialize config
let config = { authorizedChatId: 380376275, geminiApiKey: null, autoApprove: true };
if (fs.existsSync(CONFIG_FILE)) {
  try {
    config = { ...config, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
  } catch (e) {}
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save config:', e.message);
  }
}

// Persistent quick action keyboard for mobile
function getQuickKeyboard() {
  const autoLabel = config.autoApprove ? '⚡ Авто-режим: УВІМКНЕНО' : '⏸️ Авто-режим: ВИМКНЕНО';
  return {
    keyboard: [
      [{ text: '✅ Підтвердити дію' }, { text: '📊 Статус' }],
      [{ text: '🤖 Запустити тест robot' }, { text: autoLabel }]
    ],
    resize_keyboard: true,
    persistent: true
  };
}

// Check server/.env for GEMINI_API_KEY
try {
  const envPath = path.join(__dirname, '..', 'server', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const m = envContent.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)["']?/);
    if (m && m[1] && !config.geminiApiKey) {
      config.geminiApiKey = m[1].trim();
      saveConfig();
    }
  }
} catch (e) {}

// Telegram API Helper Functions
async function tgRequest(endpoint, body = {}) {
  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch (err) {
    console.error(`Telegram API request error [${endpoint}]:`, err.message);
    return null;
  }
}

async function sendTelegramMessage(chatId, text, replyToMessageId = null, inlineButtons = null) {
  if (!chatId || !text) return;

  const MAX_CHUNK = 3900;
  if (text.length <= MAX_CHUNK) {
    const params = {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      reply_markup: inlineButtons ? { inline_keyboard: inlineButtons } : getQuickKeyboard()
    };
    if (replyToMessageId) params.reply_to_message_id = replyToMessageId;

    const res = await tgRequest('sendMessage', params);
    if (!res || !res.ok) {
      delete params.parse_mode;
      await tgRequest('sendMessage', params);
    }
    return;
  }

  for (let i = 0; i < text.length; i += MAX_CHUNK) {
    const isLast = (i + MAX_CHUNK) >= text.length;
    const chunk = text.substring(i, i + MAX_CHUNK);
    await tgRequest('sendMessage', {
      chat_id: chatId,
      text: chunk,
      reply_markup: isLast ? (inlineButtons ? { inline_keyboard: inlineButtons } : getQuickKeyboard()) : undefined
    });
    await new Promise(r => setTimeout(r, 200));
  }
}

async function sendChatAction(chatId, action = 'typing') {
  if (!chatId) return;
  return await tgRequest('sendChatAction', { chat_id: chatId, action });
}

// Download file from Telegram
async function downloadTelegramFile(fileId, targetPath) {
  const info = await tgRequest(`getFile?file_id=${fileId}`);
  if (!info || !info.ok || !info.result?.file_path) {
    throw new Error('Failed to retrieve file path from Telegram');
  }

  const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${info.result.file_path}`;
  const res = await fetch(fileUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading file from Telegram`);

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(targetPath, buffer);
  return { buffer, filePath: targetPath };
}

// Transcribe Voice Message with UTF-8
async function transcribeAudio(audioFilePath, audioBuffer) {
  // Method 1: Gemini 2.5 Flash if API key configured
  const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      console.log('[STT] Transcribing via Google Gemini 2.5 Flash...');
      const base64Audio = audioBuffer.toString('base64');
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Transcribe the spoken audio verbatim in its original language (Ukrainian/Russian/English). Output ONLY the raw transcription text, without any introductory text, quotes or formatting." },
              {
                inlineData: {
                  mimeType: "audio/ogg",
                  data: base64Audio
                }
              }
            ]
          }]
        })
      });

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text) {
        console.log(`[STT Gemini] Success: "${text}"`);
        return text;
      }
    } catch (gErr) {
      console.error('[STT Gemini Error, falling back to local STT]:', gErr.message);
    }
  }

  // Method 2: Python SpeechRecognition with UTF-8 file transport
  const outTxtFile = audioFilePath + '.txt';
  try {
    console.log('[STT] Transcribing via Python SpeechRecognition (Google Web STT)...');
    const pythonScript = path.join(__dirname, 'transcribe.py');
    
    execSync(`python "${pythonScript}" "${audioFilePath}" "${outTxtFile}"`, {
      timeout: 35000,
      windowsHide: true
    });

    if (fs.existsSync(outTxtFile)) {
      const result = fs.readFileSync(outTxtFile, 'utf8').trim();
      try { fs.unlinkSync(outTxtFile); } catch (e) {}
      if (result) {
        console.log(`[STT Python UTF-8] Success: "${result}"`);
        return result;
      }
    }
  } catch (pyErr) {
    console.error('[STT Python Error]:', pyErr.message);
    if (fs.existsSync(outTxtFile)) {
      try { fs.unlinkSync(outTxtFile); } catch (e) {}
    }
  }

  return null;
}

// Antigravity Bridge: Native Unicode invocation
function forwardToAntigravity(messageText, isAutoApprove = false) {
  return new Promise((resolve) => {
    let payload = messageText;
    if (config.autoApprove || isAutoApprove) {
      payload += '\n\n[РЕЖИМ КЕРУВАННЯ З ТЕЛЕФОНУ: АВТО-ПІДТВЕРДЖЕННЯ УВІМКНЕНО. Користувач керує віддалено з Telegram. Усі плани, дії та зміни у коді затверджено наперед. Виконуй усі кроки одразу без блокування та без очікування натискання кнопок в IDE!]';
    }

    const executable = fs.existsSync(LANGUAGE_SERVER_PATH) ? LANGUAGE_SERVER_PATH : AGENT_API_PATH;
    const args = fs.existsSync(LANGUAGE_SERVER_PATH)
      ? ['agentapi', 'send-message', CONVERSATION_ID, payload]
      : ['send-message', CONVERSATION_ID, payload];

    const child = spawn(executable, args, {
      shell: false,
      windowsHide: true
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString('utf8');
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString('utf8');
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`[Antigravity ➔ OK] Forwarded: "${messageText.substring(0, 60)}..."`);
        resolve({ success: true, output });
      } else {
        console.error(`[Antigravity ➔ ERR code ${code}]:`, errorOutput);
        resolve({ success: false, error: errorOutput });
      }
    });
  });
}

// Transcript Monitor: Track Antigravity responses
let lastKnownLineCount = 0;

function initTranscriptMonitor() {
  if (fs.existsSync(TRANSCRIPT_PATH)) {
    try {
      const content = fs.readFileSync(TRANSCRIPT_PATH, 'utf8');
      const lines = content.trim().split('\n').filter(Boolean);
      lastKnownLineCount = lines.length;
      console.log(`[Transcript] Initialized at line ${lastKnownLineCount}`);
    } catch (e) {
      console.error('[Transcript] Failed to read initial transcript:', e.message);
    }
  }

  let isReading = false;
  let lastReportedAction = '';

  setInterval(async () => {
    if (isReading || !fs.existsSync(TRANSCRIPT_PATH) || !config.authorizedChatId) return;
    isReading = true;

    try {
      const content = fs.readFileSync(TRANSCRIPT_PATH, 'utf8');
      const lines = content.trim().split('\n').filter(Boolean);

      if (lines.length > lastKnownLineCount) {
        const newLines = lines.slice(lastKnownLineCount);
        lastKnownLineCount = lines.length;

        for (const rawLine of newLines) {
          try {
            const entry = JSON.parse(rawLine);

            if (entry.source === 'MODEL' && entry.type === 'PLANNER_RESPONSE') {
              if (entry.content) {
                console.log(`[Antigravity ➔ Telegram] Sending answer (${entry.content.length} chars)`);
                
                // If the message is asking for approval or presenting a plan, show inline confirmation buttons
                let inlineButtons = null;
                const lower = entry.content.toLowerCase();
                if (lower.includes('підтверд') || lower.includes('подтверд') || lower.includes('затверд') || lower.includes('план') || lower.includes('proceed')) {
                  inlineButtons = [
                    [
                      { text: '✅ Підтвердити та виконувати', callback_data: 'approve' },
                      { text: '🛑 Скасувати', callback_data: 'cancel' }
                    ]
                  ];
                }

                await sendTelegramMessage(config.authorizedChatId, entry.content, null, inlineButtons);
                lastReportedAction = '';
              } else if (entry.tool_calls && entry.tool_calls.length > 0) {
                const call = entry.tool_calls[0];
                const actionDesc = call.args?.toolAction?.replace(/^"/, '').replace(/"$/, '') || 
                                   call.args?.toolSummary?.replace(/^"/, '').replace(/"$/, '') || 
                                   call.name;

                if (actionDesc && actionDesc !== lastReportedAction) {
                  lastReportedAction = actionDesc;
                  console.log(`[Antigravity Action] ${actionDesc}`);
                  await sendChatAction(config.authorizedChatId, 'typing');
                  await tgRequest('sendMessage', {
                    chat_id: config.authorizedChatId,
                    text: `⚙️ _Виконую:_ *${actionDesc}*...`,
                    parse_mode: 'Markdown'
                  });
                }
              }
            }
          } catch (jsonErr) {}
        }
      }
    } catch (err) {
      console.error('[Transcript Monitor Error]:', err.message);
    } finally {
      isReading = false;
    }
  }, 1200);
}

// Telegram Updates Long-Polling
let pollOffset = 0;

async function pollUpdates() {
  while (true) {
    try {
      const res = await tgRequest(`getUpdates?offset=${pollOffset}&timeout=25`);
      if (res && res.ok && Array.isArray(res.result)) {
        for (const update of res.result) {
          pollOffset = update.update_id + 1;

          // 1. Handle Inline Keyboard Callbacks (One-tap action approval)
          if (update.callback_query) {
            const cb = update.callback_query;
            const data = cb.data;
            const chatId = cb.message.chat.id;

            await tgRequest('answerCallbackQuery', {
              callback_query_id: cb.id,
              text: 'Команду прийнято! 🚀'
            });

            if (data === 'approve') {
              await sendTelegramMessage(chatId, '✅ *Дію підтверджено з телефона!* Antigravity негайно продовжує виконання.');
              await forwardToAntigravity('Утверждаю и подтверждаю! Приступай к выполнению прямо сейчас без остановок.', true);
            } else if (data === 'cancel') {
              await sendTelegramMessage(chatId, '🛑 *Дію скасовано.*');
              await forwardToAntigravity('Остановись, отменяем это действие. Жду новых указаний.');
            }
            continue;
          }

          const msg = update.message;
          if (!msg) continue;

          const chatId = msg.chat.id;
          const text = msg.text?.trim() || '';

          // Authorization Check
          if (!config.authorizedChatId) {
            config.authorizedChatId = chatId;
            saveConfig();
            console.log(`[Auth] Registered admin chat ID: ${chatId}`);

            await sendTelegramMessage(chatId, 
              `🚀 *Вітаю! Antigravity успішно підключено до вашого смартфона.*\n\n` +
              `Тепер ви можете керувати розробкою телефоном:\n` +
              `• 💬 Пишіть завдання текстом\n` +
              `• 🎙️ Записуйте *голосові повідомлення* — вони миттєво розпізнаються\n` +
              `• ⚡ *Авто-підтвердження увімкнено:* вам більше не потрібно сидіти біля комп'ютера і тиснути кнопки в IDE!\n` +
              `• 🔘 Кнопка *«✅ Підтвердити дію»* завжди доступна внизу екрана.\n\n` +
              `Спробуйте надіслати голосове повідомлення прямо зараз!`
            );
            continue;
          }

          if (chatId !== config.authorizedChatId) {
            await sendTelegramMessage(chatId, '⛔ Доступ обмежено. Бот прив\'язаний до іншого адміністратора.');
            continue;
          }

          // Handle Reply Keyboard Buttons & Commands
          if (text === '✅ Підтвердити дію' || text === '/approve' || text.toLowerCase() === 'подтверждаю' || text.toLowerCase() === 'утверждаю') {
            await sendChatAction(chatId, 'typing');
            await sendTelegramMessage(chatId, '✅ *Підтверджено!* Передаю команду виконувати...');
            await forwardToAntigravity('Утверждаю! Приступай к реализации прямо сейчас без остановок.', true);
            continue;
          }

          if (text === '⚡ Авто-режим: УВІМКНЕНО' || text === '⏸️ Авто-режим: ВИМКНЕНО' || text.startsWith('/auto')) {
            if (text === '/auto off' || text === '⚡ Авто-режим: УВІМКНЕНО') {
              config.autoApprove = false;
            } else {
              config.autoApprove = true;
            }
            saveConfig();

            const statusText = config.autoApprove
              ? '⚡ *Режим Авто-підтвердження УВІМКНЕНО!*\nТепер будь-яке ваше завдання виконується автоматично без очікування натискання кнопок в IDE.'
              : '⏸️ *Режим Авто-підтвердження ВИМКНЕНО.*\nТепер агент запитуватиме підтвердження кнопками в чаті.';

            await sendTelegramMessage(chatId, statusText);
            continue;
          }

          if (text === '📊 Статус' || text === '/status') {
            await sendChatAction(chatId, 'typing');
            let branch = 'main';
            let lastCommit = '';
            try {
              branch = execSync('git branch --show-current', { cwd: path.join(__dirname, '..') }).toString().trim();
              lastCommit = execSync('git log -1 --oneline', { cwd: path.join(__dirname, '..') }).toString().trim();
            } catch (e) {}

            const apiKeyStatus = config.geminiApiKey ? '✅ Gemini 2.5 Flash' : '🔄 Google Web STT (Free)';
            const autoStatus = config.autoApprove ? '⚡ Увімкнено (Hands-Free)' : '⏸️ Ручний (Кнопки)';

            await sendTelegramMessage(chatId,
              `📊 *Статус Antigravity Remote:*\n\n` +
              `• 🌿 Гілка: \`${branch}\`\n` +
              `• 📝 Останній коміт: \`${lastCommit}\`\n` +
              `• 🎙️ Розпізнавач голосу: ${apiKeyStatus}\n` +
              `• ⚡ Авто-підтвердження: ${autoStatus}\n` +
              `• 💻 Сесія: \`${CONVERSATION_ID.substring(0, 8)}...\`\n` +
              `• 🟢 Агент активний та очікує на завдання.`
            );
            continue;
          }

          if (text === '🤖 Запустити тест robot' || text === '/test') {
            await sendTelegramMessage(chatId, '🤖 Запускаю повний тест CRM роботом Playwright...');
            await forwardToAntigravity('Запусти тест робота (node test-crm-robot.js) та надай повний звіт.', true);
            continue;
          }

          if (text === '/start' || text === '/help') {
            await sendTelegramMessage(chatId, 
              `👋 *Antigravity Мобільний Пульт*\n\n` +
              `Ви можете повністю керувати розробкою телефоном:\n` +
              `• 🎙️ Записуйте голосові — агент розпізнає та напише код\n` +
              `• ⚡ *Авто-підтвердження:* завдання виконуються одразу без зупинок\n` +
              `• 🔘 Внизу екрана закріплені кнопки для швидких дій\n\n` +
              `*Команди:*\n` +
              `• /status — стан системи\n` +
              `• /auto on | off — увімкнути/вимкнути авто-підтвердження\n` +
              `• /setkey <KEY> — підключити ключ Gemini API\n` +
              `• /test — запустити робота тестувальника CRM`
            );
            continue;
          }

          // API Key configuration
          if (text.startsWith('/setkey ') || (/^AIza[0-9A-Za-z-_]{35}$/.test(text))) {
            const key = text.startsWith('/setkey ') ? text.replace('/setkey ', '').trim() : text;
            config.geminiApiKey = key;
            saveConfig();

            try {
              const envPath = path.join(__dirname, '..', 'server', '.env');
              let envText = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
              if (envText.includes('GEMINI_API_KEY=')) {
                envText = envText.replace(/GEMINI_API_KEY=.*/, `GEMINI_API_KEY="${key}"`);
              } else {
                envText += `\nGEMINI_API_KEY="${key}"\n`;
              }
              fs.writeFileSync(envPath, envText, 'utf8');
            } catch (envE) {}

            await sendTelegramMessage(chatId, 
              `🔑 *Google Gemini API ключ збережено!*\n\n` +
              `Увімкнено розпізнавання на базі моделі Gemini 2.5 Flash.`
            );
            continue;
          }

          // Handle Voice / Audio Messages
          if (msg.voice || msg.audio) {
            const audioObj = msg.voice || msg.audio;
            const duration = audioObj.duration || 0;
            console.log(`[Telegram Voice] Received audio (${duration}s) from user`);

            await sendChatAction(chatId, 'record_voice');
            await sendTelegramMessage(chatId, `🎙️ *Голосове повідомлення отримано* (${duration} сек).\n_Розпізнаю аудіозапис..._`, msg.message_id);

            const tempFilePath = path.join(UPLOADS_DIR, `voice_${Date.now()}.ogg`);
            try {
              const { buffer, filePath } = await downloadTelegramFile(audioObj.file_id, tempFilePath);
              const transcription = await transcribeAudio(filePath, buffer);

              if (transcription) {
                console.log(`[Voice Recognized] "${transcription}"`);
                
                // Check if user voice said "подтверждаю" / "делай" / "продолжай"
                const lowerVoice = transcription.toLowerCase();
                if (lowerVoice.includes('подтвержд') || lowerVoice.includes('утвержд') || lowerVoice.includes('делай') || lowerVoice.includes('продолж')) {
                  await sendTelegramMessage(chatId, `🗣️ *Розпізнано:* "${transcription}"\n\n✅ *Дію підтверджено! Передаю виконання в Antigravity...*`, msg.message_id);
                  await forwardToAntigravity('Утверждаю и подтверждаю! Приступай к выполнению прямо сейчас без остановок.', true);
                } else {
                  await sendTelegramMessage(chatId, `🗣️ *Розпізнано:* "${transcription}"\n\n⚡ *Передаю завдання в Antigravity...*`, msg.message_id);
                  await forwardToAntigravity(transcription);
                }
              } else {
                await sendTelegramMessage(chatId, 
                  `⚠️ *Не вдалося чітко розібрати слова в аудіо.* \n\n` +
                  `Спробуйте сказати ще раз чіткіше або напишіть текстом.`
                );
              }
            } catch (err) {
              console.error('[Voice Processing Error]:', err);
              await sendTelegramMessage(chatId, `❌ Помилка при обробці голосового повідомлення: ${err.message}`);
            } finally {
              try {
                if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
              } catch (e) {}
            }
            continue;
          }

          // Handle Text Prompt
          if (text) {
            console.log(`[Telegram ➔ Antigravity] Prompt: "${text}"`);
            await sendChatAction(chatId, 'typing');
            await sendTelegramMessage(chatId, `⏳ *Прийнято в роботу:* "${text}"\n_Передаю в Antigravity..._`, msg.message_id);

            await forwardToAntigravity(text);
          }
        }
      }
    } catch (err) {
      console.error('[Polling error]:', err.message);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

console.log('====================================================');
console.log(' 🤖 Antigravity Telegram Remote Controller Bridge');
console.log(` 🎯 Conversation: ${CONVERSATION_ID}`);
console.log(' 🎙️ Voice messages support: ENABLED (Native UTF-8)');
console.log(' ⚡ Hands-Free Auto-Approve: ENABLED');
console.log(' 🔘 Mobile Quick Keyboard: ACTIVE');
console.log(' 🟢 Initializing watcher & polling...');
console.log('====================================================');

initTranscriptMonitor();
pollUpdates();
