/**
 * Pokéidle Cluster Master Supervisor & Daemon (Boilerplate Free Edition)
 * Gerencia a execução contínua de todo o ecossistema em segundo plano:
 * - Webhook Hub (porta 4567)
 * - Chrome Conta 1 (porta 9222, invisível/offscreen)
 * - Chrome Conta 2 (porta 9223, invisível/offscreen)
 * - Auto-Catcher Seletivo em ambas as contas
 * - Streamer Persistente de Telemetria (src/streamer.js)
 * - HUD Nativa Windows (src/hud_windows.ps1)
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const ROOT_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const LOG_FILE = path.join(DATA_DIR, 'cluster_manager.log');
const CONFIG_FILE = path.join(DATA_DIR, 'cluster_config.json');
const CONFIG_TEMPLATE = path.join(DATA_DIR, 'cluster_config.template.json');

function getChromeBin() {
  const candidates = [
    process.env['CHROME_PATH'],
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env['LOCALAPPDATA'] ? path.join(process.env['LOCALAPPDATA'], 'Google\\Chrome\\Application\\chrome.exe') : null
  ].filter(Boolean);
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return 'chrome.exe';
}

const CHROME_BIN = getChromeBin();

function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch (_) {}
  }
  if (fs.existsSync(CONFIG_TEMPLATE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_TEMPLATE, 'utf8'));
    } catch (_) {}
  }
  return {
    accounts: [
      { id: 'acc_1', port: 9222, nick: 'Conta 1', profileDir: 'C:\\temp\\pokeidle_profiles\\acc_1' },
      { id: 'acc_2', port: 9223, nick: 'Conta 2', profileDir: 'C:\\temp\\pokeidle_profiles\\acc_2' }
    ],
    hubPort: 4567
  };
}

const config = loadConfig();
const ACC1 = config.accounts[0] || { port: 9222, profileDir: 'C:\\temp\\pokeidle_profiles\\acc_1' };
const ACC2 = config.accounts[1] || { port: 9223, profileDir: 'C:\\temp\\pokeidle_profiles\\acc_2' };

function log(msg) {
  const line = `[${new Date().toLocaleTimeString('pt-BR')}] ${msg}\n`;
  console.log(msg);
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, line, 'utf8');
  } catch (_) {}
}

function checkPort(port) {
  return new Promise((resolve) => {
    http.get(`http://127.0.0.1:${port}/json`, { timeout: 1500 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const list = JSON.parse(data);
          const hasPoke = list.some(t => t.type === 'page' && t.url && t.url.includes('pokeidle'));
          resolve({ open: true, hasPoke });
        } catch (_) {
          resolve({ open: true, hasPoke: false });
        }
      });
    }).on('error', () => resolve({ open: false, hasPoke: false }));
  });
}

function checkHub() {
  return new Promise((resolve) => {
    http.get('http://127.0.0.1:4567/api/status', { timeout: 1500 }, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => resolve(false));
  });
}

let hubProcess = null;
let chrome1Process = null;
let chrome2Process = null;
let streamerProcess = null;
let hudProcess = null;

let catcher1Installed = false;
let catcher2Installed = false;

async function ensureWebhookHub() {
  const running = await checkHub();
  if (!running) {
    log('Iniciando Webhook Hub (porta 4567)...');
    hubProcess = spawn(process.execPath, [path.join(ROOT_DIR, 'src', 'webhook_hub.js')], {
      stdio: 'pipe'
    });
    hubProcess.on('exit', (code) => {
      log(`Webhook Hub finalizado com código ${code}.`);
      hubProcess = null;
    });
    await new Promise(r => setTimeout(r, 1000));
  }
}

async function ensureChrome1() {
  const status = await checkPort(ACC1.port);
  if (!status.open) {
    catcher1Installed = false;
    log(`Iniciando Chrome Conta 1 em segundo plano invisível (Porta ${ACC1.port})...`);
    if (!fs.existsSync(ACC1.profileDir)) fs.mkdirSync(ACC1.profileDir, { recursive: true });

    chrome1Process = spawn(CHROME_BIN, [
      `--remote-debugging-port=${ACC1.port}`,
      '--remote-allow-origins=*',
      `--user-data-dir=${ACC1.profileDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--window-position=-32000,-32000',
      '--window-size=1024,768',
      'https://pokeidle.io/app'
    ], { stdio: 'pipe' });

    chrome1Process.on('exit', (code) => {
      log(`Chrome ${ACC1.port} finalizado com código ${code}.`);
      chrome1Process = null;
      catcher1Installed = false;
    });
  }
}

async function ensureChrome2() {
  const status = await checkPort(ACC2.port);
  if (!status.open) {
    catcher2Installed = false;
    log(`Iniciando Chrome Conta 2 em segundo plano invisível (Porta ${ACC2.port})...`);
    if (!fs.existsSync(ACC2.profileDir)) fs.mkdirSync(ACC2.profileDir, { recursive: true });

    chrome2Process = spawn(CHROME_BIN, [
      `--remote-debugging-port=${ACC2.port}`,
      '--remote-allow-origins=*',
      `--user-data-dir=${ACC2.profileDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--window-position=-32000,-32000',
      '--window-size=1024,768',
      'https://pokeidle.io/app'
    ], { stdio: 'pipe' });

    chrome2Process.on('exit', (code) => {
      log(`Chrome ${ACC2.port} finalizado com código ${code}.`);
      chrome2Process = null;
      catcher2Installed = false;
    });
  }
}

function ensureAutoCatchers() {
  if (!catcher1Installed) {
    checkPort(ACC1.port).then(st => {
      if (st.open && st.hasPoke) {
        log(`Aba do Pokéidle pronta na porta ${ACC1.port}. Instalando Auto-Catcher...`);
        const p = spawn(process.execPath, [path.join(ROOT_DIR, 'src', 'auto_catcher.js'), String(ACC1.port)], { stdio: 'pipe' });
        p.on('exit', (code) => {
          if (code === 0) {
            catcher1Installed = true;
            log(`Auto-Catcher instalado com sucesso na Conta 1 (${ACC1.port}).`);
          }
        });
      }
    });
  }

  if (!catcher2Installed) {
    checkPort(ACC2.port).then(st => {
      if (st.open && st.hasPoke) {
        log(`Aba do Pokéidle pronta na porta ${ACC2.port}. Instalando Auto-Catcher...`);
        const p = spawn(process.execPath, [path.join(ROOT_DIR, 'src', 'auto_catcher.js'), String(ACC2.port)], { stdio: 'pipe' });
        p.on('exit', (code) => {
          if (code === 0) {
            catcher2Installed = true;
            log(`Auto-Catcher instalado com sucesso na Conta 2 (${ACC2.port}).`);
          }
        });
      }
    });
  }
}

function ensureStreamer() {
  if (!streamerProcess) {
    log('Iniciando Streamer de Telemetria Persistente...');
    streamerProcess = spawn(process.execPath, [path.join(ROOT_DIR, 'src', 'streamer.js')], { stdio: 'pipe' });
    streamerProcess.on('exit', (code) => {
      log(`Streamer de telemetria finalizado com código ${code}.`);
      streamerProcess = null;
    });
  }
}

function ensureHud() {
  if (!hudProcess) {
    log('Iniciando Pokéidle Cluster HUD (WPF + System Tray)...');
    const hudScript = path.join(ROOT_DIR, 'src', 'hud_windows.ps1');
    hudProcess = spawn('powershell.exe', [
      '-ExecutionPolicy', 'Bypass',
      '-NoProfile',
      '-WindowStyle', 'Hidden',
      '-STA',
      '-Command', `& '${hudScript}'`
    ], { stdio: 'ignore' });

    hudProcess.on('exit', (code) => {
      log(`HUD Windows encerrada com código ${code}.`);
      hudProcess = null;
    });
  }
}

async function supervisionCycle() {
  try {
    await ensureWebhookHub();
    await ensureChrome1();
    await ensureChrome2();
    ensureAutoCatchers();
    ensureStreamer();
    ensureHud();
  } catch (err) {
    log(`Erro no ciclo de supervisão: ${err.message}`);
  }
}

async function main() {
  log('=====================================================');
  log('   INICIANDO SUPERVISOR MESTRE POKÉIDLE CLUSTER     ');
  log('=====================================================');

  await supervisionCycle();

  setInterval(() => {
    supervisionCycle();
  }, 6000);

  log('Supervisor Mestre operando em segundo plano.');
}

if (require.main === module) {
  main().catch(err => log(`Erro fatal no supervisor: ${err.message}`));
}

module.exports = { main };
