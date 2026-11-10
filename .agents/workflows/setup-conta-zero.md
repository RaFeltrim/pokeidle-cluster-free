# Workflow: Preparos Iniciais na Conta do Zero (`/setup-conta-zero`)

Execute sequencialmente os seguintes passos através do comando `/browser` para auditar e preparar uma conta recém-criada em `https://pokeidle.io/app`:

---

### Passo 1: Verificação de Sessão, Vínculo e Inicial
1. Navegue via `/browser` até `https://pokeidle.io/app` e aguarde a renderização completa da interface.
2. Gere um accessibility snapshot da página.
3. Se a conta estiver na tela de seleção de Pokémon inicial:
   - Selecione **Charmander** (ótimo dano de abertura e transição rápida para Charizard com alto DPS em área).
4. Acesse as configurações de conta e verifique se o login está vinculado a um e-mail, conta Google ou Discord.
5. Resgate qualquer recompensa de **Login Diário** ou bônus de boas-vindas disponível.

---

### Passo 2: Auditoria Matemática do Pokémon Inicial (P2)
1. Abra a ficha detalhada do Pokémon inicial em campo.
2. Extraia e registre no relatório da conversa:
   - **Espécie:** Charmander
   - **Nível:** Inicial (Nv. 1 a 5)
   - **Potência:** Confirmar **P2** (+5% nos status base)
   - **Qualidade:** Confirmar **>= 1.3**
   - **IVs (6 Atributos):** HP, Attack, Defense, Sp. Atk, Sp. Def e **Speed**. Confirmar soma **> 140** e cada IV individual **>= 16**.
3. Se o IV de **Speed** for >= 26, destacar como exemplar excelente de redução de cooldown para skills.

---

### Passo 3: Configuração de Sobrevivência e Combate Automático
1. No painel de controle de caça e recuperação:
   - Ativar **Auto-Poção (Auto-Potion)**.
   - Ativar **Auto-Revive** (Revive padrão 10% / Max Revive 100%).
   - Ativar **Retornar à Hunt automaticamente (Return to Hunt)** caso o Pokémon desmaie.
2. Caso a conta possua dias de VIP ativos e o objetivo seja captura rápida:
   - Ativar a opção **"Lançar até Capturar" (Throw until Caught)**.

---

### Passo 4: Otimização de Interface e Início de Farm
1. Acesse o menu de **Guildas/Clãs** e solicite entrada em uma guilda pública aberta para garantir bônus passivos de XP/Ouro.
2. Posicione o Pokémon na primeira hunt recomendada pela barra da extensão `/hunt` (ex: *Pallet Town* ou *Route 1*) com **0 mortes esperadas por hora**.
3. Ative o **Modo Economia (Economy Mode)** para reduzir consumo de CPU/GPU.
4. Capture um snapshot/screenshot final confirmando o status ativo do combate como critério de conclusão.

