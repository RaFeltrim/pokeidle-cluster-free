/**
 * Multi-Profile Launcher for Pokéidle
 * Cria e gerencia os diretórios de perfis isolados do Chrome para as 4 contas oficiais.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE_PROFILES_DIR = 'C:\\temp\\pokeidle_profiles';

// Configuração das 4 contas oficiais (limite legal do servidor)
const ACCOUNTS_CONFIG = [
  { id: 1, name: 'Submarino', role: 'Main (Charmander)', port: 9222, dir: path.join(BASE_PROFILES_DIR, 'acc_1') },
  { id: 2, name: 'Submarino2', role: 'Alt 1 (Bulbasaur)', port: 9223, dir: path.join(BASE_PROFILES_DIR, 'acc_2') },
  { id: 3, name: 'Submarino3', role: 'Alt 2 (Squirtle)', port: 9224, dir: path.join(BASE_PROFILES_DIR, 'acc_3') },
  { id: 4, name: 'Submarino4', role: 'Alt 3 (Pikachu/Torchic)', port: 9225, dir: path.join(BASE_PROFILES_DIR, 'acc_4') }
];

function initProfileDirs() {
  if (!fs.existsSync(BASE_PROFILES_DIR)) {
    fs.mkdirSync(BASE_PROFILES_DIR, { recursive: true });
  }
  for (const acc of ACCOUNTS_CONFIG) {
    if (acc.dir && !fs.existsSync(acc.dir)) {
      fs.mkdirSync(acc.dir, { recursive: true });
      console.log(`[Multi-Profiles] Criado diretório de dados isolado para Conta ${acc.id} (${acc.name}): ${acc.dir}`);
    }
  }
}

/**
 * Retorna o comando para iniciar uma conta específica no Chrome
 */
function getLaunchCommand(accountId) {
  const acc = ACCOUNTS_CONFIG.find(a => a.id === accountId);
  if (!acc) throw new Error(`Conta ID ${accountId} não encontrada na configuração.`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const args = [
    `--remote-debugging-port=${acc.port}`,
    '--remote-allow-origins=*',
    `--user-data-dir=${acc.dir}`,
    '--no-first-run',
    '--no-default-browser-check',
    'https://pokeidle.io/app'
  ];

  return { chromePath, args, acc };
}

function printStatus() {
  initProfileDirs();
  console.log('\n=== STATUS DAS 4 CONTAS OFICIAIS DO POKÉIDLE ===');
  for (const acc of ACCOUNTS_CONFIG) {
    console.log(`Conta #${acc.id} [${acc.name}] - Função: ${acc.role} | Porta CDP: ${acc.port} | Perfil: ${acc.defaultProfile ? 'Principal' : acc.dir}`);
  }
}

if (require.main === module) {
  printStatus();
}

module.exports = {
  ACCOUNTS_CONFIG,
  initProfileDirs,
  getLaunchCommand
};

