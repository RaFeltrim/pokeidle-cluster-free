/**
 * Pokéidle Intelligent Auto-Heal & Roadmap Progression Engine
 * 
 * Monitora continuamente o status de combate de cada conta:
 * 1. Ao detectar derrota (ida ao Centro Pokémon / "fora da caça" / HP zerado / botão Curar):
 *    - Clica imediatamente em "Curar equipe", restaurando 100% de HP.
 * 2. Determina a área de caça ideal de acordo com a estratégia:
 *    - Mode 'PROGRESSION' (Padrão): Avança de nível de mapa conforme os marcos
 *      do roadmap baseados no tipo do Pokémon ativo (vantagens de fraqueza 2x/4x).
 *    - Mode 'STAY_CURRENT': Retorna para a mesma área em que estava caçando.
 *    - Proteção Anti-Loop: Se sofrer derrota consecutiva em área avançada,
 *      recua preventivamente uma rota para garantir farm contínuo e estável.
 * 3. Re-engaja o combate abrindo o seletor de mapas e despachando eventos de ponteiro/clique.
 * 4. Transmite eventos em tempo real para o Webhook Hub (porta 4567).
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const { getConnectedSession } = require('./cdp_helper');

const HUB_URL = 'http://127.0.0.1:4567/webhook';

// Roadmaps Oficiais de Progressão por Tipo / Inicial
const ROADMAPS = {
  // Charmander / Charmeleon / Charizard (Tipo FOGO)
  // Alvos com fraqueza a Fogo (Bug, Grass, Ice, Steel) para dano amplificado (2x e 4x)
  FIRE: [
    { levelReq: 1,   slug: 'paras',       name: 'Paras (Nv 1)',       types: 'BUG / GRASS',    multiplier: '2x', note: 'Clear ultra-rápido & alto drop de moedas inicial' },
    { levelReq: 20,  slug: 'bulbasaur',   name: 'Bulbasaur (Nv 20)',  types: 'GRASS / POISON', multiplier: '2x', note: 'Farm estável de XP em Kanto médio' },
    { levelReq: 30,  slug: 'beedrill',    name: 'Beedrill (Nv 30)',   types: 'BUG / FLYING',   multiplier: '2x', note: 'Transição veloz pós-evolução Charmeleon' },
    { levelReq: 50,  slug: 'parasect',    name: 'Parasect (Nv 50)',   types: 'BUG / GRASS',    multiplier: '4x', note: 'Fraqueza QUÁDRUPLA! Dano massivo e alta XP' },
    { levelReq: 60,  slug: 'victreebel',  name: 'Victreebel (Nv 60)', types: 'GRASS / POISON', multiplier: '2x', note: 'Farm avançado pré-Charizard' },
    { levelReq: 80,  slug: 'venusaur',    name: 'Venusaur (Nv 80)',   types: 'GRASS / POISON', multiplier: '2x', note: 'Rush final de Kanto' },
    { levelReq: 100, slug: 'scyther',     name: 'Scyther (Nv 100)',   types: 'BUG / FLYING',   multiplier: '2x', note: 'Endgame Kanto até Nv. 150 (Outland 1)' }
  ],

  // Bulbasaur / Ivysaur / Venusaur (Tipo PLANTA / VENENO)
  // Alvos com fraqueza a Planta (Rock, Ground, Water) com dano amplificado (2x e QUÁDRUPLO 4x)
  GRASS: [
    { levelReq: 1,   slug: 'geodude',     name: 'Geodude (Nv 1)',     types: 'ROCK / GROUND',  multiplier: '4x', note: 'Fraqueza QUÁDRUPLA! One-shot constante' },
    { levelReq: 10,  slug: 'diglett',     name: 'Diglett (Nv 10)',    types: 'GROUND',         multiplier: '2x', note: 'HP baixo e abates instantâneos' },
    { levelReq: 30,  slug: 'rhyhorn',     name: 'Rhyhorn (Nv 30)',    types: 'GROUND / ROCK',  multiplier: '4x', note: 'Fraqueza QUÁDRUPLA! Excelente farm de XP' },
    { levelReq: 40,  slug: 'graveler',    name: 'Graveler (Nv 40)',   types: 'ROCK / GROUND',  multiplier: '4x', note: 'Fraqueza QUÁDRUPLA intermediária' },
    { levelReq: 60,  slug: 'onix',        name: 'Onix (Nv 60)',       types: 'ROCK / GROUND',  multiplier: '4x', note: 'Fraqueza QUÁDRUPLA avançada' },
    { levelReq: 80,  slug: 'golem',       name: 'Golem (Nv 80)',      types: 'ROCK / GROUND',  multiplier: '4x', note: 'Preparação para Venusaur Nv. 80' },
    { levelReq: 100, slug: 'rhydon',     name: 'Rhydon (Nv 100)',    types: 'GROUND / ROCK',  multiplier: '4x', note: 'Endgame Kanto até Nv. 150 (Outland 1)' }
  ],

  // Squirtle / Wartortle / Blastoise (Tipo ÁGUA)
  WATER: [
    { levelReq: 1,   slug: 'geodude',     name: 'Geodude (Nv 1)',     types: 'ROCK / GROUND',  multiplier: '4x', note: 'Fraqueza QUÁDRUPLA à Água' },
    { levelReq: 10,  slug: 'diglett',     name: 'Diglett (Nv 10)',    types: 'GROUND',         multiplier: '2x', note: 'Farm rápido' },
    { levelReq: 20,  slug: 'charmander',  name: 'Charmander (Nv 20)', types: 'FIRE',           multiplier: '2x', note: 'Vantagem elemental' },
    { levelReq: 30,  slug: 'rhyhorn',     name: 'Rhyhorn (Nv 30)',    types: 'GROUND / ROCK',  multiplier: '4x', note: 'Fraqueza QUÁDRUPLA' },
    { levelReq: 40,  slug: 'graveler',    name: 'Graveler (Nv 40)',   types: 'ROCK / GROUND',  multiplier: '4x', note: 'Fraqueza QUÁDRUPLA' },
    { levelReq: 60,  slug: 'onix',        name: 'Onix (Nv 60)',       types: 'ROCK / GROUND',  multiplier: '4x', note: 'Fraqueza QUÁDRUPLA' },
    { levelReq: 80,  slug: 'charizard',   name: 'Charizard (Nv 80)',  types: 'FIRE / FLYING',  multiplier: '2x', note: 'Batalha icônica' },
    { levelReq: 100, slug: 'arcanine',   name: 'Arcanine (Nv 100)',  types: 'FIRE',           multiplier: '2x', note: 'Endgame Kanto' }
  ],

  // Rota Geral de Fallback por Nível (para qualquer outra espécie)
  DEFAULT: [
    { levelReq: 1,   slug: 'paras',       name: 'Paras (Nv 1)' },
    { levelReq: 10,  slug: 'diglett',     name: 'Diglett (Nv 10)' },
    { levelReq: 20,  slug: 'cubone',      name: 'Cubone (Nv 20)' },
    { levelReq: 30,  slug: 'beedrill',    name: 'Beedrill (Nv 30)' },
    { levelReq: 50,  slug: 'tangela',     name: 'Tangela (Nv 50)' },
    { levelReq: 60,  slug: 'victreebel',  name: 'Victreebel (Nv 60)' },
    { levelReq: 80,  slug: 'golem',       name: 'Golem (Nv 80)' },
    { levelReq: 100, slug: 'scyther',     name: 'Scyther (Nv 100)' }
  ]
};

// Histórico em memória de falhas consecutivas para prevenção de death loop
const deathHistory = {
  9222: { consecutiveDeaths: 0, lastSlug: null, timestamp: 0 },
  9223: { consecutiveDeaths: 0, lastSlug: null, timestamp: 0 }
};

/**
 * Notifica o Webhook Hub sobre eventos de auto-cura e progressão
 */
function notifyHub(event) {
  try {
    const data = JSON.stringify(event);
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
  } catch (_) {}
}

/**
 * Identifica o tipo elemental básico do Pokémon pelo nome ou tipagem
 */
function detectPokemonType(speciesName) {
  const s = (speciesName || '').toLowerCase();
  if (s.includes('charmander') || s.includes('charmeleon') || s.includes('charizard') || s.includes('vulpix') || s.includes('growlithe') || s.includes('ponyta')) {
    return 'FIRE';
  }
  if (s.includes('bulbasaur') || s.includes('ivysaur') || s.includes('venusaur') || s.includes('oddish') || s.includes('bellsprout') || s.includes('tangela')) {
    return 'GRASS';
  }
  if (s.includes('squirtle') || s.includes('wartortle') || s.includes('blastoise') || s.includes('poliwag') || s.includes('magikarp') || s.includes('psyduck')) {
    return 'WATER';
  }
  return 'DEFAULT';
}

/**
 * Extrai o slug a partir do texto do campo eco-onde (ex: "Bulbasaur · nível 20" -> "bulbasaur")
 */
function extractSlugFromOnde(ecoOnde) {
  if (!ecoOnde) return null;
  const match = ecoOnde.match(/^([A-Za-z0-9\-]+)/);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Calcula o alvo de caça ótimo com base no nível, espécie e modo operacional
 */
function getTargetHunt(port, pokeSpecies, pokeLevel, currentHunt, mode = 'PROGRESSION') {
  const pType = (port === 9222) ? 'FIRE' : (port === 9223 ? 'GRASS' : detectPokemonType(pokeSpecies));
  const roadmap = ROADMAPS[pType] || ROADMAPS.DEFAULT;

  // Modo STAY_CURRENT: preserva a rota anterior se ela for conhecida
  if (mode === 'STAY_CURRENT') {
    const prevSlug = extractSlugFromOnde(currentHunt);
    if (prevSlug && prevSlug !== 'centro') {
      const matchInRoadmap = roadmap.find(r => r.slug === prevSlug);
      return matchInRoadmap || { slug: prevSlug, name: currentHunt };
    }
  }

  // Filtra as etapas que o nível atual já destravou
  const unlockedSteps = roadmap.filter(step => pokeLevel >= step.levelReq);
  if (unlockedSteps.length === 0) {
    return roadmap[0];
  }

  const currentStep = unlockedSteps[unlockedSteps.length - 1];

  // Proteção contra Death Loop: se morreu 2 vezes seguidas na mesma rota em < 60s, recua um nível
  const tracker = deathHistory[port] || { consecutiveDeaths: 0, lastSlug: null };
  if (tracker.consecutiveDeaths >= 2 && unlockedSteps.length > 1) {
    console.log(`[Progression Watchdog] Alerta de Death Loop na porta ${port}! Recuando preventivamente para rota segura.`);
    return unlockedSteps[unlockedSteps.length - 2];
  }

  return currentStep;
}

/**
 * Executa a rotina de auto-cura e retomada de caça / progressão via CDP
 * Pode ser chamado passando um número de porta (conecta e fecha) ou um objeto session (reutiliza CDP)
 */
async function healAndProgressAccount(portOrSession, options = {}) {
  const mode = options.mode || 'PROGRESSION';
  const force = !!options.force;

  let session;
  let shouldClose = false;
  let port = options.port;

  if (typeof portOrSession === 'number') {
    port = portOrSession;
    try {
      session = await getConnectedSession(port);
      shouldClose = true;
    } catch (err) {
      return { success: false, error: `Não foi possível conectar na porta ${port}: ${err.message}` };
    }
  } else if (portOrSession && portOrSession.cdp) {
    session = portOrSession;
    port = port || (session.port) || 9222;
  } else {
    return { success: false, error: 'Sessão CDP ou porta inválida' };
  }

  const { cdp } = session;

  try {
    // 1. Inspeciona estado atual da página
    const stateRes = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const fullText = document.body.innerText;
        const ecoOnde = document.querySelector('#eco-onde')?.innerText || '';
        const curarBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Curar'));
        const isFora = fullText.includes('fora da caça') || ecoOnde.includes('Centro Pokemon') || fullText.includes('desmaiou') || !!curarBtn;
        
        // Extrai espécie e nível do Pokémon ativo
        const pokeMatch = fullText.match(/([A-Za-z0-9\\-]+)\\s+Nv\\s+(\\d+)/i);
        const pokeSpecies = pokeMatch ? pokeMatch[1] : (${port === 9222} ? 'Charmander' : 'Bulbasaur');
        const pokeLevel = pokeMatch ? parseInt(pokeMatch[2], 10) : 28;

        return {
          isFora,
          ecoOnde,
          hasCurarBtn: !!curarBtn,
          pokeSpecies,
          pokeLevel
        };
      })()`,
      returnByValue: true
    }, session.sessionId);

    const state = stateRes.result?.value || {};

    // Se a conta não estiver derrotada/fora da caça e não for forçada, nada a fazer
    if (!state.isFora && !force) {
      if (shouldClose) {
        try { cdp.close(); } catch (_) {}
      }
      return { success: true, action: 'ALREADY_FARMING', state };
    }

    console.log(`\n[Auto-Heal & Progression] Conta na Porta ${port} executando recuperação.`);
    console.log(`- Pokémon: ${state.pokeSpecies} (Nv. ${state.pokeLevel}) | Status: ${state.ecoOnde || 'Fora da caça'}`);

    // 2. Se o botão "Curar" estiver visível, clica para recuperar o time no Centro Pokémon
    let healed = false;
    if (state.hasCurarBtn) {
      const healRes = await cdp.send('Runtime.evaluate', {
        expression: `(async () => {
          const curarBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Curar'));
          if (curarBtn) {
            curarBtn.click();
            await new Promise(r => setTimeout(r, 400));
            return true;
          }
          return false;
        })()`,
        awaitPromise: true,
        returnByValue: true
      }, session.sessionId);
      healed = !!healRes.result?.value;
      if (healed) {
        console.log(`[Auto-Heal] Equipe curada com sucesso no Centro Pokémon (HP 100%).`);
      }
    }

    // 3. Determina o próximo alvo de mapa de acordo com o roadmap e tipo elemental
    const target = getTargetHunt(port, state.pokeSpecies, state.pokeLevel, state.ecoOnde, mode);
    const chosenSlug = target ? target.slug : (port === 9222 ? 'paras' : 'geodude');
    const targetName = target ? target.name : chosenSlug;

    console.log(`[Roadmap] Alvo selecionado (${mode}): ${targetName} [data-slug="${chosenSlug}"]`);

    // Atualiza rastreador de mortes consecutivas
    const now = Date.now();
    const tracker = deathHistory[port] || { consecutiveDeaths: 0, lastSlug: null, timestamp: 0 };
    if (tracker.lastSlug === chosenSlug && (now - tracker.timestamp) < 60000) {
      tracker.consecutiveDeaths++;
    } else {
      tracker.consecutiveDeaths = 1;
    }
    tracker.lastSlug = chosenSlug;
    tracker.timestamp = now;
    deathHistory[port] = tracker;

    // 4. Abre o modal do Mapa e seleciona a área de caça via Pointer/Mouse Events
    const enterHuntRes = await cdp.send('Runtime.evaluate', {
      expression: `(async () => {
        let btns = Array.from(document.querySelectorAll('button.ml-linha'));
        if (btns.length === 0) {
          const mapaBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Mapa');
          if (mapaBtn) mapaBtn.click();
          else {
            const ecoOnde = document.querySelector('#eco-onde');
            if (ecoOnde) ecoOnde.click();
          }
          await new Promise(r => setTimeout(r, 500));
          btns = Array.from(document.querySelectorAll('button.ml-linha'));
        }

        let targetBtn = document.querySelector('button.ml-linha[data-slug="${chosenSlug}"]');
        if (!targetBtn) {
          targetBtn = btns.find(b => (b.getAttribute('data-slug') || '').toLowerCase() === '${chosenSlug}' || (b.innerText || '').toLowerCase().includes('${chosenSlug}'));
        }

        if (!targetBtn) {
          return { success: false, reason: 'Linha de hunt "${chosenSlug}" não encontrada no modal de mapas' };
        }

        // Dispara sequência completa de interação de ponteiro e clique
        targetBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        targetBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        targetBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
        targetBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        targetBtn.click();

        const acao = targetBtn.querySelector('.ml-ir, .ml-acao');
        if (acao) {
          acao.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
          acao.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          acao.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
          acao.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          acao.click();
        }

        await new Promise(r => setTimeout(r, 500));

        return {
          success: true,
          slug: '${chosenSlug}',
          text: targetBtn.innerText.replace(/\\s+/g, ' ').trim(),
          newOnde: document.querySelector('#eco-onde')?.innerText || ''
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    }, session.sessionId);

    const huntResult = enterHuntRes.result?.value || { success: false, reason: 'Sem resposta do CDP' };

    // 5. Notifica o Webhook Hub para atualização imediata na HUD
    notifyHub({
      type: 'AUTO_HEAL_AND_ADVANCE',
      port,
      species: state.pokeSpecies,
      level: state.pokeLevel,
      healed: true,
      targetSlug: chosenSlug,
      targetName,
      message: `🏥 ${state.pokeSpecies} curado! Entrando na hunt: ${targetName}`,
      timestamp: Date.now()
    });

    if (shouldClose) {
      try { cdp.close(); } catch (_) {}
    }

    return {
      success: huntResult.success,
      port,
      healed,
      targetSlug: chosenSlug,
      targetName,
      details: huntResult
    };
  } catch (err) {
    if (shouldClose) {
      try { cdp.close(); } catch (_) {}
    }
    return { success: false, error: err.message };
  }
}

/**
 * Loop contínuo de supervisão de auto-cura e progressão
 */
async function runProgressionDaemon(intervalMs = 3000, mode = 'PROGRESSION') {
  console.log('=====================================================');
  console.log('   POKÉIDLE AUTO-HEAL & ROADMAP PROGRESSION ENGINE   ');
  console.log(`   Modo: ${mode} | Intervalo: ${intervalMs}ms         `);
  console.log('=====================================================');

  while (true) {
    try {
      await healAndProgressAccount(9222, { mode });
      await healAndProgressAccount(9223, { mode });
    } catch (_) {}
    await new Promise(r => setTimeout(r, intervalMs));
  }
}

// Execução via linha de comando
if (require.main === module) {
  const arg = (process.argv[2] || '').toLowerCase();
  const isDaemon = process.argv.includes('--daemon') || process.argv.includes('-d');
  const stayMode = process.argv.includes('--stay');
  const mode = stayMode ? 'STAY_CURRENT' : 'PROGRESSION';

  if (isDaemon) {
    runProgressionDaemon(3000, mode);
  } else {
    const ports = (arg === '9222') ? [9222] : (arg === '9223' ? [9223] : [9222, 9223]);
    (async () => {
      for (const p of ports) {
        const res = await healAndProgressAccount(p, { mode, force: true });
        console.log(`Resultado Porta ${p}:`, JSON.stringify(res, null, 2));
      }
      process.exit(0);
    })();
  }
}

module.exports = {
  ROADMAPS,
  getTargetHunt,
  extractSlugFromOnde,
  healAndProgressAccount,
  runProgressionDaemon
};
