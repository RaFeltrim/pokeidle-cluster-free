# 02 — Matemática de Atributos e os 4 Pilares de Força

No Pokéidle.io, o nível numérico reflete apenas a experiência acumulada do monstro. O verdadeiro potencial de combate e escalamento até o *late game* é governado pela interação multiplicativa entre **quatro pilares matemáticos**:

$$\text{Poder Efetivo} = \text{Base da Espécie} \times (1 + \text{Bônus Potência}) \times \text{Multiplicador Shiny} \times \text{Fator Qualidade} + f(\text{IVs})$$

---

## 2.1. Pilar 1: Qualidade (Multiplicador de Nível)

A **Qualidade** atua como um multiplicador direto sobre todos os pontos brutos de atributo que o Pokémon recebe a cada subida de nível:
- Um Pokémon com Qualidade `1.0` ganha o ganho base por nível.
- Um exemplar com Qualidade `1.4` recebe **+40% de atributos adicionais em cada nível**.
- **Regra do Pokémon Inicial:** Todo jogador recém-criado recebe um Pokémon inicial gerado com **Qualidade mínima garantida de 1.3**.

---

## 2.2. Pilar 2: IVs (Individual Values) e o Valor Supremo de Speed

Cada espécie possui 6 IVs sorteados aleatoriamente entre **1 e 32** com distribuição uniforme:
1. **HP (Vida)**
2. **Attack (Ataque Físico)**
3. **Defense (Defesa Física)**
4. **Sp. Atk (Ataque Especial)**
5. **Sp. Def (Defesa Especial)**
6. **Speed (Velocidade) — O Atributo Mais Crítico do Jogo**

### Por que Speed é o Rei do DPS?
No Pokéidle.io, a Velocidade **reduz diretamente o tempo de recarga (cooldown) da rotação de habilidades especiais**. Um Pokémon com Speed elevado dispara seus golpes devastadores e habilidades AoE com cadência muito superior, multiplicando o dano sustentado por hora.

### Pisos Garantidos de IVs:
- **Pokémon Inicial P2:** Cada um dos 6 IVs é garantido como **>= 16**, e a **soma total é sempre > 140**.
- **Pokémon Shiny:** O sistema re-sorteia os 6 atributos continuamente até que a **soma de IVs ultrapasse 110**.

---

## 2.3. Pilar 3: Níveis de Potência (P1 a P5)

A Potência aplica um bônus percentual permanente sobre os atributos base da espécie:

| Nível de Potência | Bônus sobre Atributos Base | Observações e Aplicação |
| :---: | :---: | :--- |
| **P1** | `+0%` (Base comum) | Pokémon selvagem comum. Não investir pedras nobres. |
| **P2** | **`+5%`** | **Patamar padrão de nascimento do Pokémon Inicial da conta!** |
| **P3** | `+15%` a `+25%` | Tier intermediário de caçada. |
| **P4** | `+50%` | Exemplar raro de alto desempenho. Proibido vender. |
| **P5** | **`+100%` (2× Status)** | **Dobra os atributos base.** Tier supremo de mercado em Gemas. |

> [!NOTE]
> As probabilidades de Potência e os sorteios de IVs não são alterados por nenhuma compra na loja. Ovos Misteriosos possuem potência fixa determinada pelo tipo do ovo.

---

## 2.4. Pilar 4: Multiplicador Shiny e Evolução Especial

O status **Shiny** é o maior multiplicador individual de combate no ecossistema:
- **Multiplicador Shiny:** Concede **`3×` (triplo)** em todos os status comparado à versão convencional da espécie.
- **O Combo Shiny P5:** Um exemplar que seja Shiny e Potência P5 combina o bônus P5 ($2\times$) com o Shiny ($3\times$), resultando em uma criatura **6 vezes mais forte ($6\times$)** que um exemplar P1 comum no mesmo nível!

### Probabilidades de Aparição de Shiny:

| Condição de Caça | Multiplicador | Probabilidade por Pokébola Lançada |
| :--- | :---: | :---: |
| **Probabilidade Base** | $1,0\times$ | **1 em 24.000** |
| **Com Shiny Secret Lure** | $2,0\times$ | **1 em 12.000** |
| **Lure + Bônus Plataforma Kick (+15%)** | $2,3\times$ | **~1 em 10.435** |
| **Ovo Shiny** | — | **100% garantido** |

### Regra de Ouro da Evolução de Shinies:
Para evoluir um Pokémon Shiny preservando o seu multiplicador $3\times$ e paleta visual, é **obrigatório** utilizar uma **Shiny Stone** (fabricada através de fragmentos combinados na Outland) junto ao NPC Professor Carvalho. Tentar evoluir de maneira convencional pode corromper a condição Shiny.

