# Pokéidle Cluster 24/7 (Free Edition) 🎮⚡

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![PowerShell](https://img.shields.io/badge/PowerShell-5.1%20%2F%207%2B-blue.svg)](https://microsoft.com/powershell)
[![WPF GUI](https://img.shields.io/badge/GUI-Native%20WPF%20Tray-purple.svg)]()
[![CDP Protocol](https://img.shields.io/badge/Automation-Chrome%20DevTools%20Protocol-orange.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Boilerplate Open-Source** de automação resiliente e monitoramento em tempo real para o MMO [Pokéidle.io](https://pokeidle.io/app), projetado com arquitetura **Browser-in-the-Loop** (CDP), isolamento multi-perfis de contas, HUD nativa em Windows WPF com bandeja do sistema (System Tray) e conformidade estrita aos Termos de Serviço do jogo.

---

## 🌟 Principais Recursos

- 🖥️ **HUD Nativa Windows WPF Flutuante & Minimizável**:
  - Design premium estilo *liquid glass / dark slate* com bordas arredondadas e sombras suaves.
  - Minimiza para a **Bandeja do Sistema (Ícones Ocultos / System Tray)** ao clicar no botão `_` ou no `X`.
  - **Duplo-clique no ícone da bandeja** para restaurar a HUD instantaneamente.
  - Navegação fluida **Master-Detail**: visão geral dos status das contas e tela de detalhes ao clicar no card da conta.
  - Alertas sonoros nativos via Windows Media Player para quedas de conexão ou eventos raros.

- 🔐 **Sistema Integrado de Gestão de Credenciais**:
  - **Assistente Interativo de Primeiro Acesso (Login Wizard)**: Se as contas ainda não estiverem configuradas, uma janela modal surge diretamente na HUD para preenchimento de login e senha com segurança.
  - **Armazenamento 100% Local**: As credenciais são salvas apenas na sua máquina local em `data/cluster_config.json` (arquivo protegido e ignorado pelo `.gitignore`).
  - **Painel de Gestão por Conta**:
    - 🚪 **Sair da Conta**: Limpa a sessão e dados salvos da conta selecionada.
    - 🔑 **Alterar Senha**: Permite atualizar a senha da conta.
    - ❓ **Alerta Crítico**: Tooltip e aviso visual explícito:  
      `"ALTERE SOMENTE SE SENHA DA CONTA FOI TROCADA"` (evita desincronização acidental).

- ⚡ **Supervisor Multi-Contas 24/7 (`cluster_manager.js`)**:
  - Inicia e monitora múltiplas instâncias isoladas do Google Chrome em portas CDP independentes (`9222`, `9223`).
  - Execução silenciosa com flags de bypass contra congelamento de abas em segundo plano:
    `--disable-background-timer-throttling`, `--disable-backgrounding-occluded-windows`, `--disable-renderer-backgrounding`.
  - Watchdog que reinicia automaticamente instâncias em caso de queda de conexão ou renderizador travado.

- 🎯 **Captura Seletiva & Avaliação Matemática de Roster**:
  - Algoritmo baseado nas mecânicas exatas do Pokéidle:
    - **Soma de IVs** (6 atributos de 1 a 32, denominador 192).
    - **Multiplicador de Qualidade** (escalonamento por nível, mínimo 1.3 no inicial).
    - **Speed Prioritária** (redução direta do cooldown das habilidades ativas).
    - **Potência (P1 a P5)** e multiplicador de Shiny (3x status; Shiny P5 = 6x).
  - **Regra Crítica da Outland**: Travamento automático de caça de Shinies na Outland (Shinies **não** nascem na Outland; área exclusiva para XP, fragmentos e tokens de Boss).

- 📡 **Telemetria em Tempo Real & Webhook Hub**:
  - Servidor leve de telemetria local (`src/webhook_hub.js`, porta `4567`).
  - Streamer persistente (`src/streamer.js`) transmitindo XP/h, Coins, mortes e estado atual do time diretamente para a HUD.

---

## 📁 Estrutura do Repositório

```text
pokeidle-cluster-free/
├── .agents/                      # Diretrizes e workflows para agentes IA (Google Antigravity / Claude)
│   ├── rules/
│   │   └── pokeidle-core-rules.md
│   └── workflows/
│       ├── ciclo-jornada-auto.md
│       └── setup-conta-zero.md
├── data/
│   └── cluster_config.template.json  # Modelo limpo para configuração das contas
├── docs/                         # Documentação técnica e matemática detalhada
│   ├── 01-ecossistema-e-rotas.md
│   ├── 02-matematica-e-pilares-de-forca.md
│   ├── 03-mecanicas-de-combate-e-captura.md
│   ├── 04-roteiro-de-progressao-e-marcos.md
│   ├── 05-conformidade-tos-e-extensoes.md
│   ├── 06-arquitetura-antigravity-e-automacao.md
│   └── 07-cluster-multi-contas-e-hud-windows.md
├── src/                          # Código-fonte do motor de automação e interface
│   ├── models/
│   │   └── schema.ts             # Schemas de dados e tipagem
│   ├── analyzer.js               # CLI de telemetria instantânea
│   ├── auto_catcher.js           # Mecanismo de captura seletiva
│   ├── cdp_helper.js             # Conexão e injeção Chrome DevTools Protocol
│   ├── cluster_manager.js        # Daemon e supervisor do cluster
│   ├── hud_windows.ps1           # HUD Nativa Windows (WPF + Tray + Modal de Login)
│   ├── orchestrator.py           # Orquestrador Python integrado ao supervisor
│   ├── roster_evaluator.js       # Avaliador de Pokémon e IVs
│   ├── streamer.js               # Streamer de telemetria contínua
│   └── webhook_hub.js            # Servidor HTTP local de eventos
├── iniciar_cluster.bat           # Launcher completo via terminal interativo
├── iniciar_hud.bat               # Launcher silencioso direto para a HUD e Daemon
├── iniciar_hud.vbs               # Launcher sem janela preta (100% invisível)
├── parar_cluster.bat             # Encerra com segurança todos os processos e o Chrome
├── mcp_config.json               # Configuração padrão do Chrome DevTools MCP
├── package.json
└── README.md
```

---

## 🚀 Como Usar (Passo a Passo)

### 1. Pré-requisitos
- **Google Chrome** (v120 ou superior).
- **Node.js** (v18 ou superior).
- **Windows 10 / 11** com PowerShell 5.1+ (já incluído nativamente no Windows).

### 2. Instalação
Clone este repositório ou faça o download como ZIP:
```bash
git clone https://github.com/RaFeltrim/pokeidle-cluster-free.git
cd pokeidle-cluster-free
npm install
```

### 3. Iniciar o Sistema
Você tem duas opções simples de inicialização:

- **Opção A (Recomendada - Silenciosa)**:
  - Dê um duplo-clique no arquivo `iniciar_hud.bat` (ou `iniciar_hud.vbs`).
  - O daemon do cluster iniciará em segundo plano e a **HUD Nativa** aparecerá na sua área de trabalho.

- **Opção B (Terminal com logs detalhados)**:
  - Dê um duplo-clique em `iniciar_cluster.bat`.
  - Uma janela de console exibirá o passo a passo de inicialização dos navegadores, portas CDP e o resumo inicial de telemetria.

---

## 🔑 Primeiro Acesso & Configuração de Contas

Ao abrir a HUD pela primeira vez:

1. Se nenhuma conta estiver configurada, a tela **Configurar Contas do Cluster** será exibida automaticamente na HUD.
2. Preencha o Nome do Treinador, E-mail/Login e Senha da **Conta 1** (e opcionalmente da **Conta 2**).
3. Clique em **Salvar e Iniciar Sessão**.
4. Os dados serão gravados com segurança localmente em `data/cluster_config.json`.
5. Se precisar gerenciar credenciais mais tarde:
   - Clique no card da conta para abrir a tela de **Detalhes**.
   - No rodapé do painel, utilize os botões:
     - 🚪 **Sair da Conta**: Para deslogar e resetar o perfil local.
     - 🔑 **Alterar Senha**: Para atualizar a senha.
     - ❓ **Dica de Segurança**: Posicione o mouse ou clique no ícone para visualizar o aviso:  
       `"ALTERE SOMENTE SE SENHA DA CONTA FOI TROCADA"`.

---

## 🛑 Como Parar o Cluster

Para encerrar todas as instâncias do Chrome em segundo plano, os servidores de telemetria e a HUD:
- Dê um duplo-clique em `parar_cluster.bat`  
  *OU*
- Clique com o botão direito no ícone da Pokébola na barra de tarefas (ícones ocultos) e selecione **Sair do Cluster**.

---

## 🛡️ Segurança e Conformidade (ToS)

Este projeto foi construído respeitando as diretrizes técnicas do jogo:
- **Zero Injeção de Pacotes Raw**: Toda interação é realizada emulando o comportamento do usuário através do Chrome DevTools Protocol no próprio navegador renderizado.
- **Isolamento de Perfis**: As contas utilizam diretórios de perfis do usuário separados (`C:\temp\pokeidle_profiles\acc_1` e `acc_2`), prevenindo vazamento de cookies ou colisões de sessão.
- **Reserva de Moedas e Trava de Segurança**: O bot respeita o saldo mínimo de Coins e possui travas rígidas impedindo a venda ou sacrifício de Pokémon Iniciais, Shinies, Lendários ou espécimes P4/P5.

---

## 📜 Licença

Distribuído sob a licença **MIT**. Consulte o arquivo `LICENSE` para mais informações.
