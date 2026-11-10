/**
 * Pokéidle Advanced Selective Auto-Catcher ("A Todo Custo")
 * Monitora #caidos-lista em tempo real (MutationObserver + 200ms poller)
 * e arremessa pokébolas continuamente até a captura de qualquer espécie alvo ou Shiny.
 */
const fs = require('fs');
const path = require('path');
const { getConnectedSession } = require('./cdp_helper');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CAPTURES_LOG_FILE = path.join(DATA_DIR, 'capture_history.json');

const TARGET_SPECIES = [
  // Tier S (Whales / Megas / Alta Renda)
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

  // Tier A (Fáceis de encontrar / Alto Giro / Meta Inicial)
  'geodude', 'graveler', 'golem',
  'eevee', 'vaporeon', 'jolteon', 'flareon',
  'vulpix', 'ninetales', 'growlithe', 'arcanine',
  'pikachu', 'raichu', 'pichu',
  'combee', 'vespiquen',
  'machop', 'machoke', 'machamp',
  'magikarp', 'gyarados'
];

async function installAutoCatcher(port = 9222) {
  const { cdp, sessionId } = await getConnectedSession(port);

  console.log(`Injetando Auto-Catcher Seletivo no DOM do Pokéidle (Porta ${port})...`);

  const injectionResult = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      window.__AGY_TARGET_SPECIES__ = ${JSON.stringify(TARGET_SPECIES)};
      window.__AGY_CAPTURE_LOGS__ = window.__AGY_CAPTURE_LOGS__ || [];

      // Desativa observador anterior se houver
      if (window.__AGY_AUTO_CATCHER_OBSERVER__) {
        window.__AGY_AUTO_CATCHER_OBSERVER__.disconnect();
      }
      if (window.__AGY_AUTO_CATCHER_INTERVAL__) {
        clearInterval(window.__AGY_AUTO_CATCHER_INTERVAL__);
      }

      function evaluateAndCatch() {
        const list = document.querySelector('#caidos-lista, .caidos-lista');
        if (!list) return;

        const caidos = Array.from(list.querySelectorAll('.caido, [class*="caido"], button[title*="arremessar"]'));

        for (const el of caidos) {
          const text = (el.innerText || '').toLowerCase();
          const title = (el.getAttribute('title') || '').toLowerCase();
          const fullContent = text + ' ' + title + ' ' + (el.className || '').toLowerCase();

          // 1. Verifica se é Shiny
          const isShiny = fullContent.includes('✨') || fullContent.includes('shiny');

          // 2. Verifica se é espécie da nossa lista de alvos
          let isTarget = false;
          let matchedSpecies = null;
          for (const sp of window.__AGY_TARGET_SPECIES__) {
            if (fullContent.includes(sp)) {
              isTarget = true;
              matchedSpecies = sp;
              break;
            }
          }

          // Se for Shiny ou Alvo, captura a todo custo
          if (isShiny || isTarget) {
            const attemptCount = parseInt(el.dataset.agyAttempts || '0', 10);
            
            // Arremessa repetidamente enquanto o corpo estiver no chão (até 15 arremessos por corpo)
            if (attemptCount < 15) {
              el.dataset.agyAttempts = (attemptCount + 1).toString();
              el.dataset.agyPriorityTarget = isShiny ? 'SHINY' : matchedSpecies.toUpperCase();
              
              // Clica para arremessar pokébola
              el.click();

              // Registra log na primeira tentativa
              if (attemptCount === 0) {
                const logEntry = {
                  timestamp: new Date().toISOString(),
                  species: isShiny ? '✨ SHINY (' + fullContent.slice(0, 30).trim() + ')' : matchedSpecies,
                  priority: isShiny ? 'SHINY_ULTRA' : 'TARGET_HIGH',
                  action: 'THROW_POKEBALL_STARTED'
                };
                window.__AGY_CAPTURE_LOGS__.push(logEntry);
                console.log('[AGY AUTO-CATCHER]', logEntry);
              }
            }
          }
        }
      }

      const observer = new MutationObserver(evaluateAndCatch);
      const targetNode = document.querySelector('#caidos-lista') || document.body;
      observer.observe(targetNode, { childList: true, subtree: true });
      window.__AGY_AUTO_CATCHER_OBSERVER__ = observer;

      window.__AGY_AUTO_CATCHER_INTERVAL__ = setInterval(evaluateAndCatch, 200);
      window.__AGY_AUTO_CATCHER_ACTIVE__ = true;

      evaluateAndCatch();

      return {
        installed: true,
        targetsCount: window.__AGY_TARGET_SPECIES__.length,
        activeLogs: window.__AGY_CAPTURE_LOGS__.length
      };
    })()`,
    returnByValue: true
  }, sessionId);

  console.log('Auto-Catcher instalado com sucesso:', injectionResult.result.value);

  const logsRes = await cdp.send('Runtime.evaluate', {
    expression: `window.__AGY_CAPTURE_LOGS__ || []`,
    returnByValue: true
  }, sessionId);

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, `capture_history_port_${port}.json`), JSON.stringify(logsRes.result.value || [], null, 2), 'utf8');

  cdp.close();
  return injectionResult.result.value;
}

if (require.main === module) {
  const targetPort = parseInt(process.argv[2] || '9222', 10);
  installAutoCatcher(targetPort)
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Erro ao instalar Auto-Catcher:', err);
      process.exit(1);
    });
}

module.exports = { installAutoCatcher, TARGET_SPECIES };
