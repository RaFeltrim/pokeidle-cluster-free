const http = require('http');
const WebSocket = require('ws');

function createCdpConnection(wsUrl) {
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
          try { ws.terminate(); } catch (_) { try { ws.close(); } catch (__) {} }
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

async function getConnectedSession(port = 9222) {
  const pageWsUrl = await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}/json`, {
      headers: { Host: `127.0.0.1:${port}` }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const list = JSON.parse(data);
          const page = list.find(t => t.type === 'page' && t.url && t.url.includes('pokeidle'));
          if (!page) reject(new Error(`Aba do Pokéidle não encontrada na porta ${port}`));
          else resolve(page.webSocketDebuggerUrl);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });

  const cdp = await createCdpConnection(pageWsUrl);
  return { cdp, sessionId: null };
}

module.exports = {
  getConnectedSession
};
