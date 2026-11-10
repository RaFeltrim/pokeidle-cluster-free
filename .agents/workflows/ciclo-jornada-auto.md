# Workflow: Ciclo Autónomo de Progressão (`/ciclo-jornada-auto`)

Execute este ciclo de verificação e otimização utilizando o subagente `/browser` e retorne um relatório conciso de telemetria como condição de conclusão:

---

### Passo 1: Verificação de Conectividade e Anti-Idle
1. Inspecione via `/browser` a aba `https://pokeidle.io/app`.
2. Se houver algum modal de desconexão, erro de rede, reload pendente ou combate parado:
   - Recarregue a página (`reload`), aguarde a reconexão automática e confirme que o Pokémon voltou a caçar.
3. Verifique se o Modo Economia está ativo.

---

### Passo 2: Leitura da Barra `/hunt` e Troca Dinâmica de Mapa
1. Clique na barra `/hunt` (injetada pela extensão `/hunt for PokeIdle`) acima do Pokémon em campo.
2. Analise a tabela de hunts desbloqueadas para o nível atual do Pokémon via accessibility snapshot ou `evaluate_script`.
3. Filtre exclusivamente as hunts com **0 mortes/hora estimadas** considerando a Auto-Poção ativa.
4. Se a melhor hunt segura disponível oferecer ganho de **XP/h** superior à hunt atual (ou **Ouro/h** caso a conta esteja poupando para a Bicicleta ou TM AoE):
   - Transfira o Pokémon para essa nova área de caça.
   - Ajuste o golpe ativo para o ataque com maior rendimento na nova área.

---

### Passo 3: Gestão de Suprimentos, Mochila e Evoluções
1. Verifique o estoque atual de **Poções**, **Revives** e **Pokébolas**.
2. Se o estoque de poções ou revives estiver baixo:
   - Abra a Loja e reponha o estoque, preservando sempre uma reserva de segurança em Coins.
3. Verifique se o Pokémon ativo atingiu o nível necessário e preenche os requisitos para evoluir:
   - Exemplo: *Charmander* ➔ *Charmeleon* (Nv. 40 + 1x Fire Stone) ➔ *Charizard* (Nv. 80 + 1x Fire Stone).
   - Acione a evolução para desbloquear saltos imediatos de atributos base.

---

### Passo 4: Verificação de Marcos de Desbloqueio (State Machine)
1. **Nível >= 80:** Se o PvP Ranqueado não estiver configurado, monte a equipe de até 5 Pokémon, marque a **Escalação Secreta** e dispute as partidas semanais.
2. **Nível >= 150:** Inspecione os **18 Ginásios Elementais** para ativar o bônus de +25% de dano e avalie a entrada na **Outland 1** (para farm acelerado de XP, materiais de casa, Bronze Boss Tokens e fragmentos).
3. **Nível >= 300:** Verifique o estoque de tokens de Boss e se a equipe tem poder suficiente para desafiar chefes como *Regice* (Nv. 300).
4. Retorne o resumo de telemetria da sessão (Nível atual, Hunt atual, XP/h, Ouro/h, mortes e estoque de suprimentos).

