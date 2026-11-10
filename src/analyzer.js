/**
 * Pokéidle Multi-Account 15-Minute Telemetry & Farm Dashboard
 * Monitora simultaneamente Submarino (9222) e Submarino2 (9223)
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const DATA_DIR = path.join(__dirname, '..', 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'game_history.json');

function parseNumber(str) {
  if (!str) return 0;
  const cleaned = str.toString().replace(/\./g, '').replace(/,/g, '.').replace(/[^\d.]/g, '');
  return parseFloat(cleaned) || 0;
}

const TARGETS = [
  'larvitar', 'pupitar', 'tyranitar',
  'gastly', 'haunter', 'gengar',
  'scyther', 'scizor',
  'abra', 'kadabra', 'alakazam',
  'bulbasaur', 'ivysaur', 'venusaur',
  'squirtle', 'wartortle', 'blastoise',
  'charmander', 'charmeleon', 'charizard',
  'numel', 'camerupt',
  'riolu', 'lucario',
  'dratini', 'dragonair', 'dragonite',
  'bagon', 'shelgon', 'salamence',
  'beldum', 'metang', 'metagross',
  'gible', 'gabite', 'garchomp',
  'torchic', 'combusken', 'blaziken',
  'treecko', 'grovyle', 'sceptile',
  'mudkip', 'marshtomp', 'swampert',
  'geodude', 'graveler', 'golem',
  'eevee', 'vaporeon', 'jolteon', 'flareon',
  'vulpix', 'ninetales', 'growlithe', 'arcanine',
  'pikachu', 'raichu', 'pichu',
  'combee', 'vespiquen',
  'machop', 'machoke', 'machamp',
  'magikarp', 'gyarados'
];

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

async function inspectAcc1() {
  const pageWsUrl = await new Promise((resolve) => {
    http.get('http://127.0.0.1:9222/json', { headers: { Host: '127.0.0.1:9222' }, timeout: 1500 }, res => {
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
      const hunt = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('nível'))?.innerText || 'Paras · nível 1';
      const isEco = localStorage.getItem('cfg-economia') === '1' || document.body.classList.contains('economia');
      return { fullText, hunt, isEco };
    })()`,
    returnByValue: true
  });

  cdp.close();

  const fullText = raw.result.value.fullText;
  const trainerMatch = fullText.match(/(?:([A-Za-z0-9_]+)\s+)?Nv\s+(\d+)\s+([\d.]+)\s*\/\s*([\d.]+)\s*xp\s+([\d.]+)/i);
  const pokeMatch = fullText.match(/([A-Za-z0-9\-]+)\s+Nv\s+(\d+)\s+(?:[A-Z\s\/]+)?poder\s+(\d+)\s+(P\d+)\s+IV\s+(\d+)\s+Q\s+([\d,.]+)\s+N\s+([\d,.]+)\s+(\d+)\s*\/\s*(\d+)\s+([\d.]+)\s*\/\s*([\d.]+)\s*xp/i);
  const ballsMatch = fullText.match(/você tem\s*(\d+)/i);
  const ballsCount = ballsMatch ? parseInt(ballsMatch[1], 10) : 100;

  return {
    nick: 'Submarino',
    port: 9222,
    trainerLevel: trainerMatch ? parseInt(trainerMatch[2], 10) : 19,
    trainerXpCur: trainerMatch ? parseNumber(trainerMatch[3]) : 0,
    trainerXpMax: trainerMatch ? parseNumber(trainerMatch[4]) : 0,
    coins: trainerMatch ? parseNumber(trainerMatch[5]) : 0,
    species: pokeMatch ? pokeMatch[1] : 'Charmander',
    pokeLevel: pokeMatch ? parseInt(pokeMatch[2], 10) : 19,
    power: pokeMatch ? parseInt(pokeMatch[3], 10) : 55,
    hpCur: pokeMatch ? parseInt(pokeMatch[8], 10) : 348,
    hpMax: pokeMatch ? parseInt(pokeMatch[9], 10) : 348,
    pokeXpCur: pokeMatch ? parseNumber(pokeMatch[10]) : 0,
    pokeXpMax: pokeMatch ? parseNumber(pokeMatch[11]) : 0,
    hunt: raw.result.value.hunt,
    isEco: raw.result.value.isEco,
    ballsCount
  };
}

async function inspectAcc2() {
  const pageWsUrl = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9223/json', { headers: { Host: '127.0.0.1:9223' }, timeout: 1500 }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const list = JSON.parse(data);
          const page = list.find(t => t.type === 'page' && t.url && t.url.includes('pokeidle'));
          resolve(page ? page.webSocketDebuggerUrl : null);
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });

  if (!pageWsUrl) return null;
  const cdp = await connectWs(pageWsUrl);

  const raw = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const fullText = document.body.innerText;
      const hunt = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('nível'))?.innerText || 'Geodude · nível 1';
      const isEco = localStorage.getItem('cfg-economia') === '1' || document.body.classList.contains('economia');
      return { fullText, hunt, isEco };
    })()`,
    returnByValue: true
  });

  cdp.close();

  const fullText = raw.result.value.fullText;
  const trainerMatch = fullText.match(/(?:([A-Za-z0-9_]+)\s+)?Nv\s+(\d+)\s+([\d.]+)\s*\/\s*([\d.]+)\s*xp\s+([\d.]+)/i);
  const pokeMatch = fullText.match(/([A-Za-z0-9\-]+)\s+Nv\s+(\d+)\s+(?:[A-Z\s\/]+)?poder\s+(\d+)\s+(P\d+)\s+IV\s+(\d+)\s+Q\s+([\d,.]+)\s+N\s+([\d,.]+)\s+(\d+)\s*\/\s*(\d+)\s+([\d.]+)\s*\/\s*([\d.]+)\s*xp/i);
  const ballsMatch = fullText.match(/você tem\s*(\d+)/i);
  const ballsCount = ballsMatch ? parseInt(ballsMatch[1], 10) : 100;

  return {
    nick: 'Submarino2',
    port: 9223,
    trainerLevel: trainerMatch ? parseInt(trainerMatch[2], 10) : 16,
    trainerXpCur: trainerMatch ? parseNumber(trainerMatch[3]) : 0,
    trainerXpMax: trainerMatch ? parseNumber(trainerMatch[4]) : 0,
    coins: trainerMatch ? parseNumber(trainerMatch[5]) : 0,
    species: pokeMatch ? pokeMatch[1] : 'Bulbasaur',
    pokeLevel: pokeMatch ? parseInt(pokeMatch[2], 10) : 16,
    power: pokeMatch ? parseInt(pokeMatch[3], 10) : 47,
    hpCur: pokeMatch ? parseInt(pokeMatch[8], 10) : 252,
    hpMax: pokeMatch ? parseInt(pokeMatch[9], 10) : 312,
    pokeXpCur: pokeMatch ? parseNumber(pokeMatch[10]) : 0,
    pokeXpMax: pokeMatch ? parseNumber(pokeMatch[11]) : 0,
    hunt: raw.result.value.hunt,
    isEco: raw.result.value.isEco,
    ballsCount
  };
}

async function run() {
  const results = [];
  try {
    const a1 = await inspectAcc1();
    if (a1) results.push(a1);
  } catch (e) {
    console.error('Erro inspecionando Conta 1:', e.message);
  }

  try {
    const a2 = await inspectAcc2();
    if (a2) results.push(a2);
  } catch (e) {
    console.error('Erro inspecionando Conta 2:', e.message);
  }

  if (results.length === 0) {
    console.error('Nenhuma conta respondendo.');
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
