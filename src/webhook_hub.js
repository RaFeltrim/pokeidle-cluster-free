/**
 * Pokéidle Real-Time Webhook & Event Hub
 * Servidor local ultrarrápido na porta 4567 que recebe notificações
 * em tempo real (push) diretamente das páginas do navegador via fetch()
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4567;
const DATA_DIR = path.join(__dirname, '..', 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'live_events.json');
const HISTORY_FILE = path.join(DATA_DIR, 'game_history.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function getSpriteUrl(species) {
  if (!species) return 'https://play.pokemonshowdown.com/sprites/gen5/substitute.png';
  const clean = species.toLowerCase().replace(/[^a-z0-9-]/g, '');
  return `https://play.pokemonshowdown.com/sprites/gen5/${clean}.png`;
}

let eventsMemory = [];
try {
  if (fs.existsSync(EVENTS_FILE)) {
    eventsMemory = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
  }
} catch (_) {}

function saveEvents() {
  try {
    if (eventsMemory.length > 300) {
      eventsMemory = eventsMemory.slice(-300);
    }
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(eventsMemory, null, 2), 'utf8');
  } catch (_) {}
}

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/webhook' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const event = JSON.parse(body);
        event.timestamp = event.timestamp || Date.now();
        if (event.species && !event.spriteUrl) {
          event.spriteUrl = getSpriteUrl(event.species);
        }

        eventsMemory.push(event);
        saveEvents();

        // Se for atualização de stats, sincroniza no game_history.json
        if (event.type === 'STATS_UPDATE' && event.accounts) {
          let history = [];
          try {
            if (fs.existsSync(HISTORY_FILE)) history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
          } catch (_) {}
          history.push({ timestamp: event.timestamp, accounts: event.accounts });
          if (history.length > 150) history.shift();
          fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', eventId: eventsMemory.length }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.url === '/api/highlights' && req.method === 'GET') {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const lastHourEvents = eventsMemory.filter(e => e.timestamp >= oneHourAgo);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      count: lastHourEvents.length,
      highlights: lastHourEvents.reverse()
    }));
    return;
  }

  if (req.url === '/api/status' && req.method === 'GET') {
    let history = [];
    try {
      if (fs.existsSync(HISTORY_FILE)) history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    } catch (_) {}
    const latest = history[history.length - 1] || null;
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const lastHourEvents = eventsMemory.filter(e => e.timestamp >= oneHourAgo);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      latest,
      highlights: lastHourEvents.reverse()
    }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[Webhook Hub] Servidor de eventos em tempo real ouvindo em http://127.0.0.1:${PORT}`);
});

process.on('SIGINT', () => {
  saveEvents();
  process.exit(0);
});

module.exports = { server, getSpriteUrl };

