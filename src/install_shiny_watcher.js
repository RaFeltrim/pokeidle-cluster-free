/**
 * In-Page Shiny Catcher & Watcher for Pokéidle
 * Injeta um MutationObserver e poller de alta velocidade diretamente na página web do jogo.
 * Monitora #caidos-lista e arremessa a pokebola IMEDIATAMENTE ao detectar ✨ Shiny.
 */
const fs = require('fs');
const path = require('path');

async function getBrowserWsUrl() {
  const devtoolsPortPath = 'C:\\Users\\Rafael Feltrim\\AppData\\Local\\Google\\Chrome\\User Data\\DevToolsActivePort';
  const lines = fs.readFileSync(devtoolsPortPath, 'utf8').trim().split('\n').map(s => s.trim()).filter(Boolean);
  return `ws://127.0.0.1:${lines[0]}${lines[1]}`;
}

function createCdpClient(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let nextId = 1;
    const pending = new Map();

    ws.onopen = () => {
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
        close: () => ws.close()
      });
    };

    ws.onerror = (err) => reject(err);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(msg.error.message || JSON.stringify(msg.error)));
        else res(msg.result);
      }
    };
  });
}

async function install() {
  const wsUrl = await getBrowserWsUrl();
  const cdp = await createCdpClient(wsUrl);

  const targets = await cdp.send('Target.getTargets');
  const pokeTab = targets.targetInfos.find(t => t.type === 'page' && t.url.includes('pokeidle.io'));
  if (!pokeTab) {
    console.error('Pokeidle tab not found.');
    cdp.close();
    process.exit(1);
  }

  const { sessionId } = await cdp.send('Target.attachToTarget', {
    targetId: pokeTab.targetId,
    flatten: true
  });

  // Inject the watcher script into the page
  const injectionScript = `
    (() => {
      if (window.__AGY_SHINY_WATCHER_INSTALLED__) {
        return { alreadyInstalled: true, logs: window.__AGY_SHINY_LOGS__ || [] };
      }

      window.__AGY_SHINY_WATCHER_INSTALLED__ = true;
      window.__AGY_SHINY_LOGS__ = window.__AGY_SHINY_LOGS__ || [];

      function checkAndCatchShinies() {
        const caidosList = document.querySelector('#caidos-lista, .caidos-lista');
        if (!caidosList) return;

        const caidos = Array.from(caidosList.querySelectorAll('.caido, button[title*="arremessar"]'));
        for (const btn of caidos) {
          const text = btn.innerText || '';
          const className = btn.className || '';
          const html = btn.innerHTML || '';
          
          // Check shiny indicators
          const isShiny = text.includes('✨') || 
                          className.includes('shiny') || 
                          className.includes('sh-') ||
                          html.includes('shiny') || 
                          html.includes('✨') ||
                          btn.getAttribute('data-shiny') === '1';

          if (isShiny && !btn.dataset.agyCatchAttempted) {
            btn.dataset.agyCatchAttempted = 'true';
            btn.click();
            
            const logEntry = {
              timestamp: new Date().toISOString(),
              text: text.trim().replace(/\\n/g, ' '),
              status: 'POKEBALL_THROWN'
            };
            window.__AGY_SHINY_LOGS__.push(logEntry);
            console.warn('%c[AGY AUTO-CATCHER] ✨ SHINY DETECTADO! ARREMESSANDO POKEBOLA:', 'color: #ffd700; font-weight: bold; font-size: 14px;', text);
          }
        }
      }

      // Fast interval poller (runs every 250ms for instant reaction)
      window.__AGY_SHINY_INTERVAL__ = setInterval(checkAndCatchShinies, 250);

      // Mutation Observer for 0ms DOM reaction
      const observer = new MutationObserver(() => {
        checkAndCatchShinies();
      });

      const caidosContainer = document.querySelector('#caidos-lista, #caidos, .caidos');
      if (caidosContainer) {
        observer.observe(caidosContainer, { childList: true, subtree: true });
      } else {
        observer.observe(document.body, { childList: true, subtree: true });
      }

      window.__AGY_SHINY_OBSERVER__ = observer;

      return {
        success: true,
        message: 'Auto-Catcher de Shinies instalado e ativo com sucesso!'
      };
    })()
  `;

  const res = await cdp.send('Runtime.evaluate', {
    expression: injectionScript,
    returnByValue: true
  }, sessionId);

  console.log('Installation Result:', JSON.stringify(res.result?.value, null, 2));

  cdp.close();
  process.exit(0);
}

install().catch(err => {
  console.error(err);
  process.exit(1);
});

