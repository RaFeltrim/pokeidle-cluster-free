# Pokéidle.io — Antigravity IDE Copilot, Multi-Account Cluster & Native Windows HUD

> **Portal Oficial:** [https://pokeidle.io/](https://pokeidle.io/) | **Cliente Web:** [https://pokeidle.io/app](https://pokeidle.io/app)  
> **Lançamento Oficial:** `07/09/2026` (Operado por: *Fasi Sistemas e Tecnologias / Pedro Henrique Reis Rodrigues*)  
> **Escala:** 1.277 Espécies (Gerações 1 a 9), 752 Hunts, 796 Shinies, 18 Ginásios Elementais e Outlands 1 a 8.  
> **Alvo Operacional:** Farm automatizado multi-contas 24/7 em segundo plano off-screen, com auto-catcher seletivo para 66 espécies e shinies, supervisão contínua e monitoramento via HUD Nativa Windows integrada à bandeja do sistema.

---

## 📑 Índice da Documentação Técnica

| Documento | Escopo e Conteúdo Técnico |
| :--- | :--- |
| [01 — Ecossistema, Rotas e Economia](docs/01-ecossistema-e-rotas.md) | Arquitetura web de `pokeidle.io/app`, economia tripartida (Coins, Diamantes 💎, Gemas 💠 RMT Solana USDT), regras de custódia (*escrow*), taxa diária de 100k Coins e comissões de mercado. |
| [02 — Matemática e Pilares de Força](docs/02-matematica-e-pilares-de-forca.md) | Os 4 pilares: Qualidade (>=1.3 no inicial), IVs (1 a 32 — Speed como atributo supremo do CDR), Potência (P1 a P5 — P5 dobra atributos) e Shinies (multiplicador $3\times$, taxa base 1/24.000 e Shiny Stones). |
| [03 — Mecânicas de Combate e Captura](docs/03-mecanicas-de-combate-e-captura.md) | Combate automático, conversão instantânea de loot em ouro, janela de captura de 30s, piso/teto de 0,3% a 10%, Auto-Poção, Auto-Revive e os dois aceleradores de farm: **Bicicleta** e **TM AoE**. |
| [04 — Roteiro de Progressão e Marcos](docs/04-roteiro-de-progressao-e-marcos.md) | Máquina de estados por nível: Kanto Rush Nv. 1-150, PvP Ranqueado Nv. 80, Torneios Showdown Nv. 100, Nv. 150 (Outland 1 + 18 Ginásios Elementais — **Regra de Ouro: Shinies NÃO nascem na Outland!**), Bosses Nv. 300+ e Endgame. |
| [05 — Conformidade ToS e Extensões](docs/05-conformidade-tos-e-extensoes.md) | Diretrizes estritas dos Termos de Serviço, prevenção de suspensão de abas (*Tab Throttling*), proibição de bots de socket e panorama de extensões (`/hunt for PokeIdle` v1.0.17, `yPokeUtils`, `Idle Helper`, `IdleDeck`). |
| [06 — Arquitetura Antigravity e Automação](docs/06-arquitetura-antigravity-e-automacao.md) | Integração com subagente `/browser`, Chrome DevTools MCP (`timeoutSeconds: -1`), regras permanentes (`.agents/rules/`), workflows sob demanda (`.agents/workflows/`) e orquestração contínua via `/schedule` e Python SDK. |
| [07 — Cluster Multi-Contas & HUD Windows](docs/07-cluster-multi-contas-e-hud-windows.md) | Arquitetura Dual-Account (`Submarino` & `Submarino2`), execução off-screen (`--window-position=-32000,-32000`), Auto-Catcher seletivo, supervisor mestre, streamer persistente e HUD nativa com ícone na bandeja. |

---

## 🏗️ Estrutura do Projeto

```text
PokeIdle/
├── .agents/
│   ├── rules/
│   │   └── pokeidle-core-rules.md     # Regras permanentes de proteção (P5, Shinies, Inicial P2, Regra da Outland)
│   └── workflows/
│       ├── setup-conta-zero.md        # /setup-conta-zero (Auditoria inicial, Charmander, Auto-Poção/Revive)
│       └── ciclo-jornada-auto.md      # /ciclo-jornada-auto (Anti-idle, leitura /hunt, troca de área)
├── docs/                              # 7 Relatórios Técnicos Aprofundados
├── src/
│   ├── cluster_manager.js             # Supervisor Mestre assíncrono (auto-cura, portas 9222, 9223, 4567)
│   ├── webhook_hub.js                 # Servidor local de telemetria e eventos em tempo real (porta 4567)
│   ├── streamer.js                    # Streamer com conexões WebSocket persistentes (sem permissões extras)
│   ├── auto_catcher.js                # Auto-Catcher Seletivo DOM (66 espécies-alvo + Shinies automáticos)
│   ├── analyzer.js                    # Painel de métricas consolidado do cluster via terminal
│   ├── cdp_helper.js                  # Conector Chrome DevTools Protocol assíncrono
│   └── hud_windows.ps1                # HUD Nativa Windows (WPF Master-Detail + Pokébola nos Ícones Ocultos)
├── iniciar_hud.bat                    # Lançador de 1 clique do cluster (fecha o prompt em 0.2s)
├── iniciar_hud.vbs                    # Lançador 100% silencioso (zero janelas de prompt)
├── parar_cluster.bat                  # Script de encerramento total do cluster em 1 clique
├── iniciar_cluster.bat                # Lançador legado de console
├── package.json                       # Dependências Node.js (ws)
└── README.md                          # Este documento
```

---

## 🚀 Como Operar o Cluster

### 1. Iniciar o Cluster com a HUD Flutuante
Dê um duplo clique em **`iniciar_hud.bat`** (ou **`iniciar_hud.vbs`** para inicialização silenciosa).
- O supervisor mestre levantará automaticamente:
  - O Webhook Hub na porta 4567.
  - A Conta 1 (`Submarino`) na porta 9222 (em segundo plano invisível).
  - A Conta 2 (`Submarino2`) na porta 9223 (em segundo plano invisível).
  - A injeção automática do Auto-Catcher seletivo nas duas contas.
  - O streamer persistente de telemetria em tempo real.
  - A **HUD Nativa Flutuante** no canto superior esquerdo e o ícone da **Pokébola (🔴⚪)** na bandeja do sistema (**Ícones Ocultos**).

### 2. Controle da HUD na Bandeja do Windows
- **Minimizar / Fechar (`—` ou `✕`):** A HUD se recolhe para os **Ícones Ocultos** (seta `^` ao lado do relógio do Windows) sem interromper o farm.
- **Restaurar:** Dê um **duplo clique** (ou clique simples) no ícone da Pokébola na bandeja para reabrir a HUD.
- **Menu de Contexto:** Clique com o botão direito na Pokébola para abrir opções rápidas (*Exibir HUD*, *Ocultar*, *Sair do Cluster HUD*).

### 3. Verificar Telemetria no Console
Para ver um resumo instantâneo no terminal a qualquer momento:
```bash
node src/analyzer.js
```

### 4. Encerrar Todo o Cluster
Dê um duplo clique em **`parar_cluster.bat`**. Todos os navegadores, servidores Node e a HUD serão fechados com segurança.
