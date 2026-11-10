/**
 * Pokéidle Multi-Account Telemetry & Farm Dashboard (Boilerplate Free Edition)
 * Monitora simultaneamente as contas configuradas no cluster.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const ROOT_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'game_history.json');
const CONFIG_FILE = path.join(DATA_DIR, 'cluster_config.json');
const CONFIG_TEMPLATE = path.join(DATA_DIR, 'cluster_config.template.json');

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
      { id: 'acc_1', port: 9222, nick: 'Conta 1' },
      { id: 'acc_2', port: 9223, nick: 'Conta 2' }
    ]
  };
}

const config = loadConfig();
const ACC1_CFG = config.accounts[0] || { port: 9222, nick: 'Conta 1' };
const ACC2_CFG = config.accounts[1] || { port: 9223, nick: 'Conta 2' };

function parseNumber(str) {
  if (!str) return 0;
  const cleaned = str.toString().replace(/\./g, '').replace(/,/g, '.').replace(/[^\d.]/g, '');
  return parseFloat(cleaned) || 0;
}

function connectWs(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let nextId = 1;
    const pending = new Map();

    ws.on('open', () => {
      resolve({
        send: (method, params = {}, sessionId) => {
          return new Promise((res, rej) => {
            const id = nextId++;
            pending.set(id, { res, rej });
            const payload = { id, method, params };
            if (sessionId) payload.sessionId = sessionId;
            ws.send(JSON.stringify(payload));
          });
        },
        close: () => {
          try { ws.terminate(); } catch (_) {}
        }
      });
    });

    ws.on('error', reject);
    ws.on('message', (data) => {
      const msg = JSON.parse(data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(msg.error.message || JSON.stringify(msg.error)));
        else res(msg.result);
      }
    });
  });
}

async function inspectAcc(port, defaultNick) {
  const pageWsUrl = await new Promise((resolve) => {
    http.get(`http://127.0.0.1:${port}/json`, { headers: { Host: `127.0.0.1:${port}` }, timeout: 1500 }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const list = JSON.parse(data);
          const page = list.find(t => t.type === 'page' && t.url && t.url.includes('pokeidle'));
          resolve(page ? page.webSocketDebuggerUrl : null);
        } catch (e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });

  if (!pageWsUrl) return null;
  const cdp = await connectWs(pageWsUrl);

  const raw = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const fullText = document.body.innerText;
      const hunt = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('nível'))?.innerText || 'Kanto · nível 1';
      const isEco = localStorage.getItem('cfg-economia') === '1' || document.body.classList.contains('economia');
      return { fullText, hunt, isEco };
    })()`,
    returnByValue: true
  });

  cdp.close();

  const fullText = raw.result.value.fullText;
  const trainerMatch = fullText.match(/([a-zA-Z0-9_]+)\s+Nv\s+(\d+)\s+([\d.]+)\s*\/\s*([\d.]+)\s*xp\s+([\d.]+)/i);
  const pokeMatch = fullText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+Nv\s+(\d+)\s+(?:[A-Z\s\/]+)?poder\s+(\d+)\s+(P\d+)\s+IV\s+(\d+)\s+Q\s+([\d,.]+)\s+N\s+([\d,.]+)\s+(\d+)\s*\/\s*(\d+)\s+([\d.]+)\s*\/\s*([\d.]+)\s*xp/i);
  const ballsMatch = fullText.match(/você tem\s*(\d+)/i);
  const ballsCount = ballsMatch ? parseInt(ballsMatch[1], 10) : 100;

  return {
    nick: trainerMatch ? trainerMatch[1] : defaultNick,
    port,
    trainerLevel: trainerMatch ? parseInt(trainerMatch[2], 10) : 1,
    trainerXpCur: trainerMatch ? parseNumber(trainerMatch[3]) : 0,
    trainerXpMax: trainerMatch ? parseNumber(trainerMatch[4]) : 1000,
    coins: trainerMatch ? parseNumber(trainerMatch[5]) : 0,
    species: pokeMatch ? pokeMatch[1] : 'Pokémon',
    pokeLevel: pokeMatch ? parseInt(pokeMatch[2], 10) : 1,
    power: pokeMatch ? parseInt(pokeMatch[3], 10) : 30,
    hpCur: pokeMatch ? parseInt(pokeMatch[8], 10) : 100,
    hpMax: pokeMatch ? parseInt(pokeMatch[9], 10) : 100,
    pokeXpCur: pokeMatch ? parseNumber(pokeMatch[10]) : 0,
    pokeXpMax: pokeMatch ? parseNumber(pokeMatch[11]) : 1000,
    hunt: raw.result.value.hunt,
    isEco: raw.result.value.isEco,
    ballsCount
  };
}

async function run() {
  const results = [];
  try {
    const a1 = await inspectAcc(ACC1_CFG.port, ACC1_CFG.nick);
    if (a1) results.push(a1);
  } catch (e) {
    console.error(`Erro inspecionando Conta 1 (${ACC1_CFG.port}):`, e.message);
  }

  try {
    const a2 = await inspectAcc(ACC2_CFG.port, ACC2_CFG.nick);
    if (a2) results.push(a2);
  } catch (e) {
    console.error(`Erro inspecionando Conta 2 (${ACC2_CFG.port}):`, e.message);
  }

  if (results.length === 0) {
    console.error('Nenhuma conta respondendo nas portas configuradas.');
    process.exit(1);
  }

  const now = Date.now();
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  let history = [];
  try {
    if (fs.existsSync(HISTORY_FILE)) history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  } catch (_) {}

  history.push({ timestamp: now, accounts: results });
  if (history.length > 150) history.shift();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');

  console.log(`\n### ⏱️ Painel de Operações Pokéidle — ${new Date().toLocaleTimeString('pt-BR')}`);
  console.log(`**Cluster:** ${results.length} Contas Ativas | Auto-Catcher Seletivo: 🎯 **Ativo em Todas**\n`);

  let totalCoins = 0;
  for (const acc of results) {
    totalCoins += acc.coins;
    console.log(`#### 👤 Conta [${acc.nick}] (Porta ${acc.port})`);
    console.log(`- **Treinador:** Nv. ${acc.trainerLevel} (${acc.trainerXpCur}/${acc.trainerXpMax} XP)`);
    console.log(`- **Pokémon:** ${acc.species} — Nv. ${acc.pokeLevel} (${acc.pokeXpCur}/${acc.pokeXpMax} XP) | HP: ${acc.hpCur}/${acc.hpMax} | Poder: ${acc.power}`);
    console.log(`- **Saldo:** **${acc.coins.toLocaleString('pt-BR')} Coins**`);
    console.log(`- **Área de Caça:** \`${acc.hunt}\``);
    console.log(`- **Pokébolas:** ${acc.ballsCount}`);
    console.log(`- **Economia:** ${acc.isEco ? '✅ Ativo' : '❌ Desligado'}`);
    console.log('');
  }

  console.log(`💰 **Saldo Total do Cluster:** **${totalCoins.toLocaleString('pt-BR')} Coins**`);

  process.exit(0);
}

run().catch(err => {
  console.error('Erro no analyzer:', err);
  process.exit(1);
});
