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
  const p = 'C:\\Users\\Rafael Feltrim\\AppData\\Local\\Google\\Chrome\\User Data\\DevToolsActivePort';
  if (!fs.existsSync(p)) return null;
  const lines = fs.readFileSync(p, 'utf8').trim().split('\n').map(s => s.trim()).filter(Boolean);
  const browserWs = `ws://127.0.0.1:${lines[0]}${lines[1]}`;
  const cdp = await connectWs(browserWs);

  const targets = await cdp.send('Target.getTargets');
  const pokeTab = targets.targetInfos.find(t => t.type === 'page' && t.url && t.url.includes('pokeidle'));
  if (!pokeTab) { cdp.close(); return null; }

  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId: pokeTab.targetId, flatten: true });

  const raw = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const fullText = document.body.innerText;
      const hunt = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('nível'))?.innerText || 'Paras · nível 1';
      const isEco = localStorage.getItem('cfg-economia') === '1' || document.body.classList.contains('economia');
      return { fullText, hunt, isEco };
    })()`,
    returnByValue: true
  }, sessionId);

  cdp.close();

  const fullText = raw.result.value.fullText;
  const trainerMatch = fullText.match(/(Submarino)\s+Nv\s+(\d+)\s+([\d.]+)\s*\/\s*([\d.]+)\s*xp\s+([\d.]+)/i);
  const pokeMatch = fullText.match(/(Charmander|Charmeleon|Charizard)\s+Nv\s+(\d+)\s+(?:[A-Z\s\/]+)?poder\s+(\d+)\s+(P\d+)\s+IV\s+(\d+)\s+Q\s+([\d,.]+)\s+N\s+([\d,.]+)\s+(\d+)\s*\/\s*(\d+)\s+([\d.]+)\s*\/\s*([\d.]+)\s*xp/i);

  return {
    nick: 'Submarino',
    port: 9222,
    trainerLevel: trainerMatch ? parseInt(trainerMatch[2], 10) : 16,
    trainerXpCur: trainerMatch ? parseNumber(trainerMatch[3]) : 0,
    trainerXpMax: trainerMatch ? parseNumber(trainerMatch[4]) : 0,
    coins: trainerMatch ? parseNumber(trainerMatch[5]) : 0,
    species: pokeMatch ? pokeMatch[1] : 'Charmander',
    pokeLevel: pokeMatch ? parseInt(pokeMatch[2], 10) : 16,
    power: pokeMatch ? parseInt(pokeMatch[3], 10) : 47,
    hpCur: pokeMatch ? parseInt(pokeMatch[8], 10) : 288,
    hpMax: pokeMatch ? parseInt(pokeMatch[9], 10) : 288,
    pokeXpCur: pokeMatch ? parseNumber(pokeMatch[10]) : 0,
    pokeXpMax: pokeMatch ? parseNumber(pokeMatch[11]) : 0,
    hunt: raw.result.value.hunt,
    isEco: raw.result.value.isEco
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
  const trainerMatch = fullText.match(/(Submarino2)\s+Nv\s+(\d+)\s+([\d.]+)\s*\/\s*([\d.]+)\s*xp\s+([\d.]+)/i);
  const pokeMatch = fullText.match(/(Bulbasaur|Ivysaur|Venusaur)\s+Nv\s+(\d+)\s+(?:[A-Z\s\/]+)?poder\s+(\d+)\s+(P\d+)\s+IV\s+(\d+)\s+Q\s+([\d,.]+)\s+N\s+([\d,.]+)\s+(\d+)\s*\/\s*(\d+)\s+([\d.]+)\s*\/\s*([\d.]+)\s*xp/i);

  return {
    nick: 'Submarino2',
    port: 9223,
    trainerLevel: trainerMatch ? parseInt(trainerMatch[2], 10) : 12,
    trainerXpCur: trainerMatch ? parseNumber(trainerMatch[3]) : 0,
    trainerXpMax: trainerMatch ? parseNumber(trainerMatch[4]) : 0,
    coins: trainerMatch ? parseNumber(trainerMatch[5]) : 0,
    species: pokeMatch ? pokeMatch[1] : 'Bulbasaur',
    pokeLevel: pokeMatch ? parseInt(pokeMatch[2], 10) : 12,
    power: pokeMatch ? parseInt(pokeMatch[3], 10) : 36,
    hpCur: pokeMatch ? parseInt(pokeMatch[8], 10) : 228,
    hpMax: pokeMatch ? parseInt(pokeMatch[9], 10) : 228,
    pokeXpCur: pokeMatch ? parseNumber(pokeMatch[10]) : 0,
    pokeXpMax: pokeMatch ? parseNumber(pokeMatch[11]) : 0,
    hunt: raw.result.value.hunt,
    isEco: raw.result.value.isEco
  };
}

async function pollOnce() {
  const results = [];
  try {
    const a1 = await inspectAcc1();
    if (a1) results.push(a1);
  } catch (_) {}

  try {
    const a2 = await inspectAcc2();
    if (a2) results.push(a2);
  } catch (_) {}

  if (results.length > 0) {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    let history = [];
    try {
      if (fs.existsSync(HISTORY_FILE)) history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    } catch (_) {}
    history.push({ timestamp: Date.now(), accounts: results });
    if (history.length > 150) history.shift();
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
    return results;
  }
  return null;
}

if (require.main === module) {
  const isLoop = process.argv.includes('--daemon');
  if (isLoop) {
    console.log('[Poller Daemon] Iniciando sincronização contínua a cada 5s...');
    setInterval(async () => {
      try {
        await pollOnce();
      } catch (err) {
        // silent
      }
    }, 5000);
  } else {
    pollOnce().then(res => {
      console.log('Polled successfully:', res ? res.length + ' accounts' : 'None');
      process.exit(0);
    }).catch(err => {
      console.error(err);
      process.exit(1);
    });
  }
}

module.exports = { pollOnce };

