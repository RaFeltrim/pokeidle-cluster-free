/**
 * Pokéidle In-Game Minimizable Cluster Mini HUD
 * Injeta um overlay compacto, arrastável e minimizável diretamente no DOM do jogo
 * Atualiza métricas em tempo real das duas contas (Submarino & Submarino2)
 */
const { getConnectedSession } = require('./cdp_helper');

function getHudScript(currentPort) {
  return `(() => {
    if (document.querySelector('#agy-cluster-hud')) {
      document.querySelector('#agy-cluster-hud').remove();
    }

    const wrapper = document.createElement('div');
    wrapper.id = 'agy-cluster-hud';
    wrapper.innerHTML = \`
      <!-- Pill minimizada -->
      <div id="agy-hud-pill" style="
        display: none;
        background: rgba(15, 23, 42, 0.95);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(74, 222, 128, 0.5);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        color: #f8fafc;
        padding: 6px 14px;
        border-radius: 9999px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        align-items: center;
        gap: 8px;
        transition: transform 0.2s, box-shadow 0.2s;
      ">
        <span style="display:inline-block; width:8px; height:8px; background:#22c55e; border-radius:50%; box-shadow:0 0 8px #22c55e;"></span>
        <span>Cluster: <b id="agy-pill-coins" style="color:#facc15;">...</b> 🪙</span>
        <span style="color:#94a3b8; font-size:11px;">[Expandir +]</span>
      </div>

      <!-- Card Expandido -->
      <div id="agy-hud-card" style="
        width: 300px;
        background: rgba(15, 23, 42, 0.95);
        backdrop-filter: blur(14px);
        border: 1px solid rgba(148, 163, 184, 0.25);
        border-radius: 14px;
        box-shadow: 0 12px 30px -4px rgba(0, 0, 0, 0.6);
        color: #e2e8f0;
        overflow: hidden;
        transition: all 0.2s ease;
      ">
        <!-- Header / Draggable handle -->
        <div id="agy-hud-header" style="
          background: rgba(30, 41, 59, 0.9);
          padding: 8px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          cursor: move;
        ">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="display:inline-block; width:9px; height:9px; background:#22c55e; border-radius:50%; box-shadow:0 0 8px #22c55e;"></span>
            <span style="font-weight:700; font-size:12px; letter-spacing:0.5px; color:#f8fafc;">POKÉIDLE CLUSTER</span>
          </div>
          <button id="agy-btn-min" title="Minimizar HUD" style="
            background: rgba(255, 255, 255, 0.1);
            border: none;
            color: #cbd5e1;
            font-size: 15px;
            font-weight: 700;
            width: 24px;
            height: 24px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
          ">−</button>
        </div>

        <!-- Body -->
        <div style="padding: 10px 12px; font-size: 11px; display:flex; flex-direction:column; gap:8px;">
          <!-- Resumo Superior -->
          <div style="
            background: rgba(2, 6, 23, 0.6);
            padding: 6px 10px;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border: 1px solid rgba(250, 204, 21, 0.25);
          ">
            <span style="color:#94a3b8; font-size:10px; text-transform:uppercase; font-weight:700;">Saldo Total</span>
            <span style="color:#facc15; font-weight:700; font-size:13px;"><span id="agy-hud-total-coins">0</span> 🪙</span>
          </div>

          <!-- Conta 1 -->
          <div style="
            background: rgba(30, 41, 59, 0.6);
            padding: 8px;
            border-radius: 8px;
            border-left: 3px solid #ef4444;
          ">
            <div style="display:flex; justify-content:space-between; margin-bottom: 2px;">
              <b style="color:#f87171;">👤 Submarino (9222)</b>
              <span style="color:#cbd5e1; font-weight:600;" id="agy-acc1-trainer">Nv. 16</span>
            </div>
            <div style="display:flex; justify-content:space-between; color:#e2e8f0; font-size:11px;">
              <span>🔥 <span id="agy-acc1-poke">Charmander Nv. 16</span></span>
              <span style="color:#facc15; font-weight:600;"><span id="agy-acc1-coins">0</span> 🪙</span>
            </div>
            <div style="display:flex; justify-content:space-between; color:#94a3b8; font-size:10px; margin-top:2px;">
              <span>Área: <span id="agy-acc1-area" style="color:#38bdf8;">Paras Nv. 1</span></span>
              <span style="color:#4ade80;">Auto-Catcher 🎯</span>
            </div>
          </div>

          <!-- Conta 2 -->
          <div style="
            background: rgba(30, 41, 59, 0.6);
            padding: 8px;
            border-radius: 8px;
            border-left: 3px solid #22c55e;
          ">
            <div style="display:flex; justify-content:space-between; margin-bottom: 2px;">
              <b style="color:#4ade80;">👤 Submarino2 (9223)</b>
              <span style="color:#cbd5e1; font-weight:600;" id="agy-acc2-trainer">Nv. 11</span>
            </div>
            <div style="display:flex; justify-content:space-between; color:#e2e8f0; font-size:11px;">
              <span>🌿 <span id="agy-acc2-poke">Bulbasaur Nv. 11</span></span>
              <span style="color:#facc15; font-weight:600;"><span id="agy-acc2-coins">0</span> 🪙</span>
            </div>
            <div style="display:flex; justify-content:space-between; color:#94a3b8; font-size:10px; margin-top:2px;">
              <span>Área: <span id="agy-acc2-area" style="color:#38bdf8;">Geodude Nv. 1</span></span>
              <span style="color:#4ade80;">Auto-Catcher 🎯</span>
            </div>
          </div>
        </div>
      </div>
    \`;

    Object.assign(wrapper.style, {
      position: 'fixed',
      top: '15px',
      right: '15px',
      zIndex: '999999',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      userSelect: 'none'
    });

    document.body.appendChild(wrapper);

    // Minimize / Expand logic
    const card = document.querySelector('#agy-hud-card');
    const pill = document.querySelector('#agy-hud-pill');
    const btnMin = document.querySelector('#agy-btn-min');

    btnMin.addEventListener('click', (e) => {
      e.stopPropagation();
      card.style.display = 'none';
      pill.style.display = 'inline-flex';
    });

    pill.addEventListener('click', () => {
      pill.style.display = 'none';
      card.style.display = 'block';
    });

    // Drag and drop logic
    const header = document.querySelector('#agy-hud-header');
    let isDragging = false, startX, startY, initialLeft, initialTop;

    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = wrapper.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      wrapper.style.right = 'auto';
      wrapper.style.left = initialLeft + 'px';
      wrapper.style.top = initialTop + 'px';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      wrapper.style.left = (initialLeft + dx) + 'px';
      wrapper.style.top = (initialTop + dy) + 'px';
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    return { injected: true };
  })()`;
}

function getUpdateScript(clusterData) {
  return `(() => {
    const data = ${JSON.stringify(clusterData)};
    const acc1 = data.accounts.find(a => a.port === 9222) || {};
    const acc2 = data.accounts.find(a => a.port === 9223) || {};

    const formatCoins = n => (n || 0).toLocaleString('pt-BR');

    // Total coins
    const totalEl = document.querySelector('#agy-hud-total-coins');
    const pillEl = document.querySelector('#agy-pill-coins');
    if (totalEl) totalEl.innerText = formatCoins(data.totalCoins);
    if (pillEl) pillEl.innerText = formatCoins(data.totalCoins);

    // Acc 1
    if (acc1.nick) {
      const tr1 = document.querySelector('#agy-acc1-trainer');
      const pk1 = document.querySelector('#agy-acc1-poke');
      const cn1 = document.querySelector('#agy-acc1-coins');
      const ar1 = document.querySelector('#agy-acc1-area');

      if (tr1) tr1.innerText = 'Nv. ' + acc1.trainerLevel;
      if (pk1) pk1.innerText = acc1.species + ' Nv. ' + acc1.pokeLevel;
      if (cn1) cn1.innerText = formatCoins(acc1.coins);
      if (ar1) ar1.innerText = acc1.hunt.split('·')[0].trim();
    }

    // Acc 2
    if (acc2.nick) {
      const tr2 = document.querySelector('#agy-acc2-trainer');
      const pk2 = document.querySelector('#agy-acc2-poke');
      const cn2 = document.querySelector('#agy-acc2-coins');
      const ar2 = document.querySelector('#agy-acc2-area');

      if (tr2) tr2.innerText = 'Nv. ' + acc2.trainerLevel;
      if (pk2) pk2.innerText = acc2.species + ' Nv. ' + acc2.pokeLevel;
      if (cn2) cn2.innerText = formatCoins(acc2.coins);
      if (ar2) ar2.innerText = acc2.hunt.split('·')[0].trim();
    }
  })()`;
}

async function injectHudToBoth() {
  const ports = [9222, 9223];
  for (const port of ports) {
    try {
      const session = await getConnectedSession(port);
      await session.cdp.send('Runtime.evaluate', {
        expression: getHudScript(port)
      }, session.sessionId);
      session.cdp.close();
      console.log(`[HUD] Injetada com sucesso no navegador da Porta ${port}`);
    } catch (err) {
      console.error(`[HUD] Erro ao injetar na porta ${port}:`, err.message);
    }
  }
}

async function updateHudOnBoth(clusterData) {
  const ports = [9222, 9223];
  for (const port of ports) {
    try {
      const session = await getConnectedSession(port);
      await session.cdp.send('Runtime.evaluate', {
        expression: getUpdateScript(clusterData)
      }, session.sessionId);
      session.cdp.close();
    } catch (_) {}
  }
}

module.exports = {
  injectHudToBoth,
  updateHudOnBoth,
  getHudScript,
  getUpdateScript
};

if (require.main === module) {
  injectHudToBoth().then(() => {
    console.log('[HUD] Instalação concluída.');
    process.exit(0);
  });
}

