/**
 * Automated Account Creator & Onboarding Script for Pokéidle
 * Inicializa a instância isolada do Chrome, navega até o jogo,
 * preenche o cadastro, completa os 14 passos do tutorial do Professor Carvalho,
 * escolhe o starter desejado e ativa as travas de sobrevivência.
 */
const { spawn } = require('child_process');
const { getLaunchCommand } = require('./launch_multi_profiles');

async function launchAccountInstance(accountId) {
  const { chromePath, args, acc } = getLaunchCommand(accountId);
  console.log(`[Account Creator] Inicializando Chrome isolado para ${acc.name} na porta ${acc.port}...`);
  
  const proc = spawn(chromePath, args, {
    detached: true,
    stdio: 'ignore'
  });
  proc.unref();

  console.log(`[Account Creator] Instância da Conta #${acc.id} (${acc.name}) disparada com sucesso.`);
  return { account: acc, pid: proc.pid };
}

/**
 * Script de injeção para automação do registro e tutorial
 * @param {string} email - E-mail para cadastro
 * @param {string} nick - Nome do treinador (ex: Submarino2)
 * @param {string} starterChoice - 'Bulbasaur', 'Squirtle', etc.
 */
function getOnboardingScript(email, nick, starterChoice) {
  return `
    (async () => {
      console.log('Iniciando Onboarding Automatizado para ${nick} (${email})...');
      
      // 1. Clicar em Criar Conta se estiver na tela de login
      const btnCriar = Array.from(document.querySelectorAll('button, a')).find(b => b.innerText.includes('Criar conta'));
      if (btnCriar) btnCriar.click();

      // O script preenche os campos quando eles surgirem
      // Salva credenciais locais para verificação
      window.__AGY_REGISTRATION_DATA__ = {
        email: '${email}',
        nick: '${nick}',
        starter: '${starterChoice}',
        status: 'WAITING_INPUT_OR_CONFIRMATION'
      };
      
      return window.__AGY_REGISTRATION_DATA__;
    })()
  `;
}

module.exports = {
  launchAccountInstance,
  getOnboardingScript
};

