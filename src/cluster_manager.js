/**
 * Pokéidle Cluster Master Supervisor & Daemon
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
const LOG_FILE = path.join(ROOT_DIR, 'data', 'cluster_manager.log');
const NODE_BIN = process.execPath;
const CHROME_BIN = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PROFILE_ACC1 = 'C:\\temp\\pokeidle_profiles\\acc_1';
const PROFILE_ACC2 = 'C:\\temp\\pokeidle_profiles\\acc_2';
const enableHud = !process.argv.includes('--no-hud');

function log(msg) {
  const line = `[${new Date().toLocaleTimeString('pt-BR')}] ${msg}\n`;
  console.log(msg);
  try {
    if (!fs.existsSync(path.dirname(LOG_FILE))) fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
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
let healerProcess = null;
let hudProcess = null;

let catcher1Installed = false;
let catcher2Installed = false;

async function ensureWebhookHub() {
  const running = await checkHub();
  if (!running) {
    log('Iniciando Webhook Hub (porta 4567)...');
    hubProcess = spawn(NODE_BIN, [path.join(ROOT_DIR, 'src', 'webhook_hub.js')], {
      stdio: 'ignore'
    });
    hubProcess.on('exit', (code) => {
      log(`Webhook Hub finalizado com código ${code}.`);
      hubProcess = null;
    });
    await new Promise(r => setTimeout(r, 1000));
  }
}

async function ensureChrome1() {
  const status = await checkPort(9222);
  if (!status.open) {
    catcher1Installed = false;
    log('Iniciando Chrome Conta 1 em segundo plano invisível (Porta 9222)...');
    if (!fs.existsSync(PROFILE_ACC1)) fs.mkdirSync(PROFILE_ACC1, { recursive: true });

    chrome1Process = spawn(CHROME_BIN, [
      '--remote-debugging-port=9222',
      '--remote-allow-origins=*',
      `--user-data-dir=${PROFILE_ACC1}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--window-position=-32000,-32000',
      '--window-size=1024,768',
      'https://pokeidle.io/app'
    ], { stdio: 'ignore' });

    chrome1Process.on('exit', (code) => {
      log(`Chrome 9222 finalizado com código ${code}.`);
      chrome1Process = null;
      catcher1Installed = false;
    });
  }
}

async function ensureChrome2() {
  const status = await checkPort(9223);
  if (!status.open) {
    catcher2Installed = false;
    log('Iniciando Chrome Conta 2 em segundo plano invisível (Porta 9223)...');
    if (!fs.existsSync(PROFILE_ACC2)) fs.mkdirSync(PROFILE_ACC2, { recursive: true });

    chrome2Process = spawn(CHROME_BIN, [
      '--remote-debugging-port=9223',
      '--remote-allow-origins=*',
      `--user-data-dir=${PROFILE_ACC2}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--window-position=-32000,-32000',
      '--window-size=1024,768',
      'https://pokeidle.io/app'
    ], { stdio: 'ignore' });

    chrome2Process.on('exit', (code) => {
      log(`Chrome 9223 finalizado com código ${code}.`);
      chrome2Process = null;
      catcher2Installed = false;
    });
  }
}

function ensureAutoCatchers() {
  if (!catcher1Installed) {
    checkPort(9222).then(st => {
      if (st.open && st.hasPoke) {
        log('Aba do Pokéidle pronta na porta 9222. Instalando Auto-Catcher...');
        const p = spawn(NODE_BIN, [path.join(ROOT_DIR, 'src', 'auto_catcher.js'), '9222'], { stdio: 'pipe' });
        p.on('exit', (code) => {
          if (code === 0) {
            catcher1Installed = true;
            log('Auto-Catcher instalado com sucesso na Conta 1 (9222).');
          }
        });
      }
    });
  }

  if (!catcher2Installed) {
    checkPort(9223).then(st => {
      if (st.open && st.hasPoke) {
        log('Aba do Pokéidle pronta na porta 9223. Instalando Auto-Catcher...');
        const p = spawn(NODE_BIN, [path.join(ROOT_DIR, 'src', 'auto_catcher.js'), '9223'], { stdio: 'pipe' });
        p.on('exit', (code) => {
          if (code === 0) {
            catcher2Installed = true;
            log('Auto-Catcher instalado com sucesso na Conta 2 (9223).');
          }
        });
      }
    });
  }
}

function ensureStreamer() {
  if (!streamerProcess) {
    log('Iniciando Streamer de Telemetria Persistente...');
    streamerProcess = spawn(NODE_BIN, [path.join(ROOT_DIR, 'src', 'streamer.js')], { stdio: 'ignore' });
    streamerProcess.on('exit', (code) => {
      log(`Streamer de telemetria finalizado com código ${code}.`);
      streamerProcess = null;
    });
  }
}

function ensureAutoHealer() {
  if (!healerProcess) {
    const healerScript = path.join(ROOT_DIR, 'src', 'auto_heal_and_progression.js');
    if (fs.existsSync(healerScript)) {
      log('Iniciando Auto-Heal & Progression Engine...');
      healerProcess = spawn(NODE_BIN, [healerScript], { stdio: 'ignore' });
      healerProcess.on('exit', (code) => {
        log(`Auto-Healer finalizado com código ${code}.`);
        healerProcess = null;
      });
    }
  }
}

function ensureHud() {
  if (!enableHud) return;
  if (!hudProcess) {
    log('Iniciando Pokéidle Cluster HUD (WPF + System Tray)...');
    const hudScript = path.join(ROOT_DIR, 'src', 'hud_windows.ps1');
    hudProcess = spawn('powershell.exe', [
      '-ExecutionPolicy', 'Bypass',
      '-NoProfile',
      '-STA',
      '-File', hudScript
    ], { stdio: 'ignore' });

    hudProcess.on('exit', (code) => {
      log(`HUD Windows encerrada com código ${code}.`);
      hudProcess = null;
    });
  }
}

let cyclesCount = 0;
async function supervisionCycle() {
  try {
    cyclesCount++;
    if (cyclesCount % 10 === 0) {
      // Revalida a injeção do auto-catcher periodicamente caso a página tenha recarregado
      catcher1Installed = false;
      catcher2Installed = false;
    }
    await ensureWebhookHub();
    await ensureChrome1();
    await ensureChrome2();
    ensureAutoCatchers();
    ensureStreamer();
    ensureAutoHealer();
    ensureHud();
  } catch (err) {
    log(`Erro no ciclo de supervisão: ${err.message}`);
  }
}

async function main() {
  log('=====================================================');
  log('   INICIANDO SUPERVISOR MESTRE POKÉIDLE CLUSTER     ');
  log('=====================================================');

  // Primeiro ciclo imediato
  await supervisionCycle();

  // Ciclo de supervisão contínua a cada 6 segundos
  setInterval(() => {
    supervisionCycle();
  }, 6000);

  log('Supervisor Mestre operando em segundo plano.');
}

if (require.main === module) {
  main().catch(err => log(`Erro fatal no supervisor: ${err.message}`));
}

module.exports = { main };
