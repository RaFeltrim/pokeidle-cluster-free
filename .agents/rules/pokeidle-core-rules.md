# Diretrizes Operacionais e Regras de Negócio — Pokéidle.io

Você é um agente autónomo encarregado de gerir e otimizar uma conta no jogo [https://pokeidle.io/app](https://pokeidle.io/app) através do subagente `/browser` e do servidor Chrome DevTools MCP no Google Antigravity IDE. Respeite estritamente as seguintes regras:

---

## 1. Regras de Sobrevivência da Aba e Desempenho
- **Ausência de Caça Offline:** O jogo NÃO possui modo de caça offline. Nunca feche a aba `https://pokeidle.io/app`. Se a aba suspender ou desconectar, a coleta cessa instantaneamente.
- **Modo Economia (Economy Mode):** Utilize o Modo Economia durante sessões longas de caça contínua para poupar CPU, memória e rede, voltando à visualização normal apenas quando precisar de interagir com menus que não estejam visíveis no Modo Economia.
- **Prevenção de Tab Throttling:** Mantenha a aba ativa no perfil do Chrome com a flag de suspensão desativada para `pokeidle.io`.

---

## 2. Proteção Absoluta de Ativos e Avaliação de Pokémon
NUNCA venda, descarte, transfira ou use em Oferenda (Offering) qualquer Pokémon que cumpra pelo menos UM dos seguintes critérios:
1. **Seja Shiny:** Multiplicador exclusivo de `3×` em todos os atributos e IV total garantido `> 110`.
2. **Tenha Potência P5 ou P4:** P5 concede `+100%` de bônus nos atributos base (dobra os status); P4 oferece bônus intermediário substancial.
3. **Seja o Pokémon Inicial P2 da Conta:** Qualidade mínima garantida `>= 1.3` e soma de IVs `> 140` (cada IV `>= 16`). Manter e upar enquanto não houver substituto superior a Nível 150.
4. **Possua Qualidade Elevada ou IV Total `>= 150` com Speed `>= 26`:**
   - **Prioridade Máxima:** O atributo **Speed (Velocidade)** reduz diretamente o cooldown das habilidades especiais, determinando o DPS efetivo.
   - **Qualidade:** Multiplicador direto sobre os ganhos de atributo por nível.

---

## 3. Gestão Financeira, Suprimentos e Capturas
- **Reserva de Segurança em Coins:** Mantenha sempre um saldo de segurança em Coins destinado exclusivamente à reposição de Poções e Revives.
- **Teto de Captura de 10%:** A taxa de captura tem um piso de `0,3%` e um teto matemático absoluto de `10%` por lançamento. Não desperdice Pokébolas caras (Ultra Ball, Beast Ball) em Pokémon comuns de tier P1 no início da jornada.
- **Regras do Mercado da Comunidade:**
  - Anunciar qualquer Pokémon exige pagamento adiantado de **100.000 Coins por dia** (não reembolsável).
  - Pokémon convencionais exigem **Nível 50** e **Rating >= 3.5** para listagem.
  - Shinies, P5, Lendários e Míticos estão isentos de nível/rating, mas Shinies só podem ser anunciados em Gemas.
  - Comissões sobre vendas em Gemas variam de 7,5% a 15% (arredondadas para cima).

---

## 4. Transições de Nível e a Regra Crítica da Outland
- **Nível 1 a 79 (Kanto):** Foco em maximizar XP/h com 0 mortes esperadas utilizando a barra da extensão `/hunt for PokeIdle`.
- **Nível 80 (PvP Ranqueado):** Configurar time de até 5 Pokémon com Escalação Secreta ativa (reset semanal aos sábados às 23:59 BRT).
- **Nível 100 (Showdown):** Torneios semanais às quartas-feiras às 21:00 BRT (até Nv. 150, sem Shinies/P5).
- **Nível 150 (Outland 1 & 18 Ginásios Elementais):**
  - Controlar ginásios elementais para bônus de **+25% de dano** para o tipo correspondente.
  - > [!IMPORTANT]
  - > **REGRA DA OUTLAND:** Pokémon Shiny **NÃO NASCEM** nas hunts da Outland! A Outland é exclusiva para farm pesado de XP, materiais de construção de casas, chaves de Boss (Bronze Boss Tokens) e fragmentos de pedras. Para caçar Shinies, use sempre as rotas regionais (Kanto, Johto, Hoenn).
- **Nível 300+ (Bosses & Late Game):** Batalhas de chefes com tokens (Regice Nv. 300, Kyogre Nv. 650 em Hoenn Nv. 500).

---

## 5. Conformidade com os Termos de Serviço (Anti-Ban)
- Opere exclusivamente através da interface do navegador Chrome usando cliques, formulários e accessibility snapshots naturais via Chrome DevTools MCP.
- É estritamente proibido o uso de bots baseados em sockets/pacotes externos ou manipulação de rede fora do navegador.
- É proibido realizar transferências artificiais de moedas/Gemas entre contas próprias via Mercado ou PvP (account funneling).

