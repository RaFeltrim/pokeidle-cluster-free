/**
 * Pokéidle Real-Time Persistent Telemetry Streamer
 * Mantém conexões WebSocket PERSISTENTES (sem fechar e reabrir) com as portas 9222 e 9223.
 * Atualiza métricas em tempo real a cada 3s com zero overhead e zero pedidos de permissão do Chrome.
 */
const http = require('http');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');

const HUB_URL = 'http://127.0.0.1:4567/webhook';
const DATA_DIR = path.join(__dirname, '..', 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'game_history.json');

function parseNumber(str) {
  if (!str) return 0;
  const cleaned = str.toString().replace(/\./g, '').replace(/,/g, '.').replace(/[^\d.]/g, '');
  return parseFloat(cleaned) || 0;
}

function postToHub(payload) {
  const data = JSON.stringify(payload);
  const req = http.request(HUB_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  }, () => {});
  req.on('error', () => {});
  req.write(data);
  req.end();
}

function connectWs(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let nextId = 1;
    const pending = new Map();

    ws.on('open', () => {
      resolve({
        ws,
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

let session1 = null;
let session2 = null;

async function getAcc1Session() {
  if (session1 && session1.ws.readyState === WebSocket.OPEN) return session1;
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
  session1 = { cdp, sessionId: null, ws: cdp.ws };
  return session1;
}

async function getAcc2Session() {
  if (session2 && session2.ws.readyState === WebSocket.OPEN) return session2;
  const pageWsUrl = await new Promise((resolve) => {
    http.get('http://127.0.0.1:9223/json', { headers: { Host: '127.0.0.1:9223' }, timeout: 1500 }, res => {
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
  session2 = { cdp, sessionId: null, ws: cdp.ws };
  return session2;
}

const lastState = {
  9222: { pokeLevel: null, trainerLevel: null, lastLog: '' },
  9223: { pokeLevel: null, trainerLevel: null, lastLog: '' }
};

async function queryAcc(session, isAcc1) {
  const raw = await session.cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const fullText = document.body.innerText;
      const hunt = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('nível'))?.innerText || '';
      const hudLog = document.querySelector('#hud-log')?.innerText || '';
      const isPaused = fullText.includes('esta sessão foi pausada') || fullText.includes('conta aberta em outro');

      // Estoque de pokebolas
      let ballsCount = null;
      const chip = document.querySelector('.auto-chip');
      if (chip) ballsCount = parseInt(chip.innerText.trim(), 10);
      if (ballsCount == null || isNaN(ballsCount)) {
        const ballBtn = Array.from(document.querySelectorAll('.caidos-bola')).find(b => (b.getAttribute('title') || '').includes('você tem'));
        if (ballBtn) {
          const m = ballBtn.getAttribute('title').match(/você tem\\s*(\\d+)/i);
          if (m) ballsCount = parseInt(m[1], 10);
        }
      }

      return { fullText, hunt, hudLog, isPaused, ballsCount };
    })()`,
    returnByValue: true
  }, session.sessionId);

  const val = raw.result.value;
  const fullText = val.fullText;
  const isPaused = val.isPaused;
  const ballsCount = val.ballsCount != null ? val.ballsCount : 100;
  const nick = isAcc1 ? 'Submarino' : 'Submarino2';
  const port = isAcc1 ? 9222 : 9223;

  const trainerMatch = fullText.match(new RegExp('(' + nick + ')\\s+Nv\\s+(\\d+)\\s+([\\d.]+)\\s*\\/\\s*([\\d.]+)\\s*xp\\s+([\\d.]+)', 'i'));
  const pokeMatch = fullText.match(/(Charmander|Charmeleon|Charizard|Bulbasaur|Ivysaur|Venusaur)\s+Nv\s+(\d+)\s+(?:[A-Z\s\/]+)?poder\s+(\d+)\s+(P\d+)\s+IV\s+(\d+)\s+Q\s+([\d,.]+)\s+N\s+([\d,.]+)\s+(\d+)\s*\/\s*(\d+)\s+([\d.]+)\s*\/\s*([\d.]+)\s*xp/i);

  const species = pokeMatch ? pokeMatch[1] : (isAcc1 ? 'Charmander' : 'Bulbasaur');
  const pokeLevel = pokeMatch ? parseInt(pokeMatch[2], 10) : (isAcc1 ? 19 : 16);
  const trainerLevel = trainerMatch ? parseInt(trainerMatch[2], 10) : (isAcc1 ? 19 : 16);
  const coins = trainerMatch ? parseNumber(trainerMatch[5]) : 0;
  const power = pokeMatch ? parseInt(pokeMatch[3], 10) : (isAcc1 ? 55 : 47);
  const hpCur = pokeMatch ? parseInt(pokeMatch[8], 10) : (isAcc1 ? 348 : 252);
  const hpMax = pokeMatch ? parseInt(pokeMatch[9], 10) : (isAcc1 ? 348 : 312);
  const pokeXpCur = pokeMatch ? parseNumber(pokeMatch[10]) : 0;
  const pokeXpMax = pokeMatch ? parseNumber(pokeMatch[11]) : 0;
  const trainerXpCur = trainerMatch ? parseNumber(trainerMatch[3]) : 0;
  const trainerXpMax = trainerMatch ? parseNumber(trainerMatch[4]) : 0;
  const hunt = val.hunt || (isAcc1 ? 'Paras · nível 1' : 'Geodude · nível 1');
  const hudLog = val.hudLog;

  return {
    nick,
    port,
    trainerLevel,
    trainerXpCur,
    trainerXpMax,
    coins,
    species,
    pokeLevel,
    power,
    hpCur,
    hpMax,
    pokeXpCur,
    pokeXpMax,
    hunt,
    hudLog,
    isPaused,
    ballsCount
  };
}

async function startStreamer() {
  console.log('[Streamer] Iniciando streamer persistente em tempo real (3s)...');

  while (true) {
    try {
      const accounts = [];

      try {
        const s1 = await getAcc1Session();
        if (s1) accounts.push(await queryAcc(s1, true));
      } catch (e1) {
        session1 = null; // Reset on disconnect
      }

      try {
        const s2 = await getAcc2Session();
        if (s2) accounts.push(await queryAcc(s2, false));
      } catch (e2) {
        session2 = null; // Reset on disconnect
      }

      if (accounts.length > 0) {
        const now = Date.now();

        // 1. Check Level Ups & Capture Events
        for (const acc of accounts) {
          const prev = lastState[acc.port] || {};

          if (prev.pokeLevel && acc.pokeLevel > prev.pokeLevel) {
            postToHub({
              type: 'POKE_LEVEL_UP',
              port: acc.port,
              nick: acc.nick,
              species: acc.species,
              level: acc.pokeLevel,
              oldLevel: prev.pokeLevel,
              message: `🔥 ${acc.species} subiu para o Nível ${acc.pokeLevel}!`,
              timestamp: now
            });
          }

          if (prev.trainerLevel && acc.trainerLevel > prev.trainerLevel) {
            postToHub({
              type: 'TRAINER_LEVEL_UP',
              port: acc.port,
              nick: acc.nick,
              level: acc.trainerLevel,
              oldLevel: prev.trainerLevel,
              message: `👑 Treinador ${acc.nick} subiu para o Nível ${acc.trainerLevel}!`,
              timestamp: now
            });
          }

          if (acc.hudLog && acc.hudLog !== prev.lastLog && (acc.hudLog.includes('capturado') || acc.hudLog.includes('pegou'))) {
            postToHub({
              type: 'POKEMON_CAPTURED',
              port: acc.port,
              nick: acc.nick,
              species: acc.species,
              message: `🎯 ${acc.hudLog.slice(0, 50)}`,
              timestamp: now
            });
          }

          // Auto-Resume Watchdog se a sessão for pausada
          if (acc.isPaused && !prev.wasPaused) {
            console.log(`[Watchdog] Conta ${acc.nick} (Porta ${acc.port}) pausada. Enviando recarregamento automático...`);
            const targetSession = acc.port === 9222 ? session1 : session2;
            if (targetSession) {
              targetSession.cdp.send('Page.reload').catch(() => {});
            }
          }

          lastState[acc.port] = {
            pokeLevel: acc.pokeLevel,
            trainerLevel: acc.trainerLevel,
            lastLog: acc.hudLog,
            wasPaused: acc.isPaused
          };
        }

        // 2. Post STATS_UPDATE to Hub
        postToHub({
          type: 'STATS_UPDATE',
          accounts,
          timestamp: now
        });

        // 3. Update game_history.json
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        let history = [];
        try {
          if (fs.existsSync(HISTORY_FILE)) history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
        } catch (_) {}
        history.push({ timestamp: now, accounts });
        if (history.length > 150) history.shift();
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
      }
    } catch (_) {}

    await new Promise(r => setTimeout(r, 3000));
  }
}

startStreamer();
