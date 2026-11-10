# 06 — Arquitetura de Automação no Google Antigravity IDE

A Google Antigravity IDE (v2.6.0 standalone / plataforma v2.29.1) opera sob um paradigma *agent-first*, orquestrando tarefas entre o Editor, o Terminal e o Navegador em instâncias isoladas de contexto.

---

## 6.1. O Subagente `/browser` e o Isolamento de Contexto

Quando acionamos o comando `/browser` ou executamos um workflow de navegação:
1. **Isolamento de Contexto (Context Isolation):**
   - O subagente `browser` roda em uma conversa dedicada com sua própria janela de contexto limpa.
   - Isso impede que a árvore de acessibilidade da página (com 752 hunts e centenas de nós DOM) polua a conversa principal de orquestração do Antigravity IDE.
2. **Atuação via Chrome DevTools MCP:**
   - A IDE conecta-se à instância local do Chrome através do servidor MCP Chrome DevTools lançado com `npx`.
   - Dispõe das ferramentas `list_pages`, `click`, `fill`, `evaluate_script`, `take_snapshot` e gravação de vídeo `.webm` para auditoria visual nos *Artifacts*.

---

## 6.2. Configurações Críticas de Ambiente

### 1. `mcp_config.json` (Timeout Ilimitado):
Por padrão, o servidor Chrome DevTools encerra chamadas após 180 segundos. Para operação contínua 24/7 sem interrupções, configuramos `timeoutSeconds: -1`:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "timeoutSeconds": -1,
      "tools": {
        "evaluate_script": {
          "eager": true,
          "background": "off"
        }
      }
    }
  }
}
```

### 2. Prevenção de Descarte de Abas no Google Chrome:
- Acessar `chrome://inspect/#remote-debugging` e habilitar *"Allow remote debugging for this browser instance"*.
- Em `chrome://settings/performance`, desativar a economia de memória para o domínio `pokeidle.io` para garantir que o ciclo de combate nunca cesse.

---

## 6.3. Orquestração Contínua: Comandos Nativos vs. Python SDK

### Opção 1: Slash Commands Nativos no Chat do Agente
1. **Preparação Única:**
   ```text
   /setup-conta-zero
   ```
   Audita o Charmander inicial, confirma IVs > 140 e Potência P2, ativa Auto-Poção e entra em guilda pública.
2. **Rush Inicial (Nível 1 ao 50):**
   ```text
   /goal Monitore https://pokeidle.io/app e execute /ciclo-jornada-auto trocando para a melhor hunt sem mortes na barra /hunt até o Charmander atingir Nível 50.
   ```
3. **Agendamento Contínuo 24/7:**
   ```text
   /schedule Execute a cada 20 minutos o workflow /ciclo-jornada-auto para verificar a aba pokeidle.io/app, atualizar hunt, repor poções e verificar desbloqueios.
   ```

### Opção 2: Script em Python via Antigravity SDK (`src/orchestrator.py`)
Para rodar em segundo plano direto no terminal integrado da IDE, utilizamos a pipeline assíncrona do Antigravity Python SDK (`v0.1.23`):

```python
import asyncio
import logging
from antigravity_sdk import Agent, BuiltinTools

# Configuração e loop assíncrono com delay de 15 minutos entre ciclos
```
*(Consulte a implementação completa em [`src/orchestrator.py`](../src/orchestrator.py))*

