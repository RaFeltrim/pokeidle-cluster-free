# 05 — Conformidade com Termos de Serviço (ToS) e Ecossistema de Extensões

Para garantir a total segurança da conta, evitando suspensões ou bloqueios em saques de Gemas USDT, toda a automação na Google Antigravity IDE é construída em conformidade com as regras públicas do Pokéidle.io.

---

## 5.1. Matriz de Conformidade Técnica (Permitido vs. Proibido)

> [!CAUTION]
> Os Termos de Serviço do Pokéidle.io proíbem estritamente bots externos baseados em sockets/pacotes de rede e a transferência artificial de valores entre contas do mesmo titular (*account funneling*).

| Categoria Técnica | Prática Proibida ❌ | Abordagem Sancionada no Antigravity IDE ✅ |
| :--- | :--- | :--- |
| **Execução e Combate** | Bots independentes que injetam pacotes diretamente no WebSocket sem renderizar o navegador (Modos Socket / Headless cru). | Automação no navegador através do subagente `/browser` operando via **Chrome DevTools MCP** com cliques e snapshots naturais. |
| **Telemetria de Dano** | Modificar a memória do cliente ou manipular taxas de resposta. | Leitura passiva da barra injetada pela extensão oficial comunitária `/hunt for PokeIdle`. |
| **Transferência de Ativos** | Listar itens sem valor no Mercado por preços exorbitantes para transferir Coins/Gemas entre contas secundárias (*funneling*). | Cada conta opera de forma independente, negociando apenas a preços justos de mercado. |
| **Prevenção de Inatividade** | Extensões maliciosas ou hacks de aceleração de tempo (*speedhacks*). | Uso do **Modo Economia** nativo do jogo e flags de proteção contra suspensão de abas no Google Chrome. |

---

## 5.2. Panorama do Ecossistema de Extensões da Comunidade

| Extensão / Ferramenta | Autor / Versão | Principais Funcionalidades | Avaliação de Segurança ToS |
| :--- | :--- | :--- | :--- |
| **/hunt for PokeIdle** | Por **Liang** (v1.0.17) | Injeta a barra `/hunt` sobre o monstro em campo. Ordena todas as 752 hunts por **XP/h** e **Ouro/h** reais. Calcula risco de mortes/hora e efeito de TM AoE. | **Segura / Leitura Pura (Recomendada):** Não pede credenciais, não envia dados externos e atua como overlay visual. |
| **yPokeUtils** | Por **yuurii** (v1.1.6) | Sniper de mercado com regras mín/máx de compra automática; planejamento de troca de hunt por nível; reposição de suprimentos. | **Média-Alta:** Regras vêm desativadas por padrão para supervisão do jogador. |
| **Idle Helper** | v0.22.7 | Painel lateral com abas Caçar, Resumo, Equipe (evita venda acidental no Depot), rastreador de Bronze Boss Token e auto-compra. | **Média-Alta:** Inicia desativada; funções ativas avançadas requerem assinatura após trial. |
| **IdleDeck** | Desktop (Win 10/11) | Contêiner isolado de janelas para multicontas (cookies separados); impede suspensão em segundo plano e alerta via Discord Webhook. | **Totalmente Segura:** Não possui bots ou macros embutidos; apenas container de abas. |
| **PokeIdle Labs / IdleHub** | Desktop (idlehub.app) | Painel multicontas (até 4 contas) com modo Socket (sem navegador) e auto-venda de Pokémon. | **Alto Risco de Banimento:** O modo Socket viola expressamente as regras e aciona detecção anti-cheat no servidor. |

---

## 5.3. Estratégia Adotada no Antigravity IDE

A combinação ideal adotada em nossa arquitetura consiste em:
1. **Google Chrome local (v144+)** com a extensão **/hunt for PokeIdle** instalada.
2. O subagente `/browser` da Antigravity IDE lê os valores calculados na barra `/hunt` via accessibility snapshots e toma decisões estratégicas de transição de rota com zero cálculo redundante no servidor.

