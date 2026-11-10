/**
 * Pokéidle Real-Time In-Browser Observer & Webhook Pusher
 * Injeta observers de DOM em ambas as contas (9222 e 9223)
 * Dispara requisições Webhook (HTTP POST) imediatas para o Webhook Hub (127.0.0.1:4567)
 */
const { getConnectedSession } = require('./cdp_helper');

const OBSERVER_SCRIPT = (port, nick) => `(() => {
  window.__PORT__ = ${port};
  window.__NICK__ = "${nick}";

  if (window.__AGY_OBSERVER_INSTALLED__) {
    console.log('[AGY OBSERVER] Já instalado anteriormente.');
    return { alreadyInstalled: true };
  }
  window.__AGY_OBSERVER_INSTALLED__ = true;

  function sendWebhook(type, data = {}) {
    try {
      fetch('http://127.0.0.1:4567/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          port: window.__PORT__,
          nick: window.__NICK__,
          timestamp: Date.now(),
          ...data
        })
      }).catch(() => {});
    } catch (_) {}
  }

  function parseNumber(str) {
    if (!str) return 0;
    const cleaned = str.toString().replace(/\\./g, '').replace(/,/g, '.').replace(/[^\\d.]/g, '');
    return parseFloat(cleaned) || 0;
  }

  let lastPokeLevel = null;
  let lastTrainerLevel = null;
  let lastCoins = 0;

  function extractCurrentStats() {
    const fullText = document.body.innerText;
    const trainerMatch = fullText.match(new RegExp('(' + window.__NICK__ + ')\\\\s+Nv\\\\s+(\\\\d+)\\\\s+([\\\\d.]+)\\\\s*\\\\/\\\\s*([\\\\d.]+)\\\\s*xp\\\\s+([\\\\d.]+)', 'i'));
    const pokeMatch = fullText.match(/(Charmander|Charmeleon|Charizard|Bulbasaur|Ivysaur|Venusaur|Squirtle|Wartortle|Blastoise|Pikachu)\\\\s+Nv\\\\s*(\\\\d+)\\\\s+(?:[A-Z\\\\s\\\\/]+)?poder\\\\s+(\\\\d+)\\\\s+(P\\\\d+)\\\\s+IV\\\\s+(\\\\d+)\\\\s+Q\\\\s+([\\\\d,.]+)\\\\s+N\\\\s+([\\\\d,.]+)\\\\s+(\\\\d+)\\\\s*\\\\/\\\\s*(\\\\d+)\\\\s+([\\\\d.]+)\\\\s*\\\\/\\\\s*([\\\\d.]+)\\\\s*xp/i);
    const hunt = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('nível'))?.innerText || 'Área 1';
    
    const species = pokeMatch ? pokeMatch[1] : (window.__PORT__ === 9222 ? 'Charmander' : 'Bulbasaur');
    const pokeLevel = pokeMatch ? parseInt(pokeMatch[2], 10) : (window.__PORT__ === 9222 ? 17 : 13);
    const trainerLevel = trainerMatch ? parseInt(trainerMatch[2], 10) : (window.__PORT__ === 9222 ? 16 : 12);
    const coins = trainerMatch ? parseNumber(trainerMatch[5]) : 0;
    const power = pokeMatch ? parseInt(pokeMatch[3], 10) : 40;
    const hpCur = pokeMatch ? parseInt(pokeMatch[8], 10) : 250;
    const hpMax = pokeMatch ? parseInt(pokeMatch[9], 10) : 250;

    return {
      nick: window.__NICK__,
      port: window.__PORT__,
      species,
      pokeLevel,
      trainerLevel,
      coins,
      power,
      hpCur,
      hpMax,
      hunt,
      spriteUrl: 'https://play.pokemonshowdown.com/sprites/gen5/' + species.toLowerCase() + '.png'
    };
  }

  function checkLevelUps() {
    const stats = extractCurrentStats();

    // Check Pokemon Level Up
    if (lastPokeLevel !== null && stats.pokeLevel > lastPokeLevel) {
      sendWebhook('POKE_LEVEL_UP', {
        species: stats.species,
        level: stats.pokeLevel,
        oldLevel: lastPokeLevel,
        message: stats.species + ' subiu para o Nv. ' + stats.pokeLevel + '!'
      });
    }
    lastPokeLevel = stats.pokeLevel;

    // Check Trainer Level Up
    if (lastTrainerLevel !== null && stats.trainerLevel > lastTrainerLevel) {
      sendWebhook('TRAINER_LEVEL_UP', {
        level: stats.trainerLevel,
        oldLevel: lastTrainerLevel,
        message: 'Treinador ' + window.__NICK__ + ' subiu para o Nv. ' + stats.trainerLevel + '!'
      });
    }
    lastTrainerLevel = stats.trainerLevel;

    return stats;
  }

  // Periodic push every 3 seconds to guarantee real-time telemetry
  setInterval(() => {
    const stats = checkLevelUps();
    sendWebhook('STATS_HEARTBEAT', { account: stats });
  }, 3000);

  // Monitor combat and capture logs in #hud-log
  const hudLog = document.querySelector('#hud-log');
  if (hudLog) {
    const logObserver = new MutationObserver(() => {
      const text = hudLog.innerText || '';
      if (text.includes('capturado') || text.includes('pegou')) {
        sendWebhook('POKEMON_CAPTURED', {
          logText: text,
          message: text.slice(0, 60)
        });
      }
    });
    logObserver.observe(hudLog, { childList: true, characterData: true, subtree: true });
  }

  // Initial push
  const initialStats = checkLevelUps();
  sendWebhook('CONNECTED', { account: initialStats });

  return { installed: true, initialStats };
})()`;

async function injectObserver(port, nick) {
  try {
    const { cdp, sessionId } = await getConnectedSession(port);
    const res = await cdp.send('Runtime.evaluate', {
      expression: OBSERVER_SCRIPT(port, nick),
      returnByValue: true
    }, sessionId);
    cdp.close();
    console.log(`[Observer] Injetado com sucesso na Porta ${port} (${nick})`);
    return res.result.value;
  } catch (err) {
    console.error(`[Observer] Erro ao injetar na Porta ${port}:`, err.message);
    return null;
  }
}

async function injectBothObservers() {
  await injectObserver(9222, 'Submarino');
  await injectObserver(9223, 'Submarino2');
}

module.exports = {
  injectObserver,
  injectBothObservers
};

if (require.main === module) {
  injectBothObservers().then(() => {
    console.log('[Observer] Injeção concluída.');
    process.exit(0);
  });
}

