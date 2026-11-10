/**
 * Pokéidle Roster & Inventory Evaluator
 * Avalia os Pokémon capturados com base em Potência, Qualidade e IVs:
 * - Mantém os melhores espécimes na Equipe / Depot.
 * - Tranca (Auto-Lock) espécimes Tier S, Shinies e Potências P3+.
 * - Sinaliza duplicatas inferiores para venda ao NPC ou sacrifício no Altar.
 */

// Pesos de atributos e patamares de excelência
const EVAL_THRESHOLDS = {
  MIN_QUALITY_EXCELLENT: 1.500,
  MIN_IV_TOP_STAT: 25,
  TIER_P5_BONUS: 2.0, // +100%
  TIER_P4_BONUS: 1.25, // +25%
  TIER_P3_BONUS: 1.10, // +10%
  TIER_P2_BONUS: 1.05  // +5%
};

function parseQuality(qStr) {
  if (typeof qStr === 'number') return qStr;
  if (!qStr) return 1.0;
  return parseFloat(qStr.toString().replace(',', '.')) || 1.0;
}

/**
 * Calcula o Score Competitivo do espécime
 * @param {Object} poke - Objeto com { potency, quality, ivTotal, speedIV }
 */
function computeCompetitiveScore(poke) {
  const quality = parseQuality(poke.quality);
  let potencyMult = 1.0;
  if (poke.potency === 'P5') potencyMult = 2.0;
  else if (poke.potency === 'P4') potencyMult = 1.25;
  else if (poke.potency === 'P3') potencyMult = 1.10;
  else if (poke.potency === 'P2') potencyMult = 1.05;

  const ivTotal = Math.min(192, Math.max(0, poke.ivTotal || 100)); // 6 atributos × 32 = 192 max
  const speedIV = Math.min(32, Math.max(0, poke.speedIV || Math.round(ivTotal / 6)));
  const isShiny = !!poke.isShiny;

  // Score composto ponderado:
  // - IVs gerais: 30%
  // - Speed prioritária (CDR supremo): 20%
  // - Qualidade escalonamento: 25%
  // - Potência multiplicadora: 25%
  const ivScore = (ivTotal / 192) * 30;
  const speedScore = (speedIV / 32) * 20;
  const qualityScore = (quality / 1.8) * 25;
  const potencyScore = (potencyMult / 2.0) * 25;

  const baseScore = ivScore + speedScore + qualityScore + potencyScore;
  const shinyMultiplier = isShiny ? 3.0 : 1.0;

  return Math.round(baseScore * shinyMultiplier * 10) / 10;
}

/**
 * Avalia se o Pokémon deve ser retido ou marcado para descarte
 * @param {Object} candidate - Novo Pokémon capturado
 * @param {Array} currentRoster - Lista de Pokémon já guardados da mesma espécie
 */
function evaluateRetention(candidate, currentRoster = []) {
  const score = computeCompetitiveScore(candidate);

  // Regra 1: Qualquer Shiny ou P4/P5 é RETIDO E TRANCADO AUTOMATICAMENTE
  if (candidate.isShiny || candidate.potency === 'P5' || candidate.potency === 'P4') {
    return {
      action: 'KEEP_AND_LOCK',
      reason: candidate.isShiny ? '✨ Espécime Shiny Raro' : `Potência Lendária (${candidate.potency})`,
      score
    };
  }

  // Regra 2: Verifica se é melhor do que o atual guardado da mesma espécie
  const sameSpecies = currentRoster.filter(p => p.species === candidate.species);
  if (sameSpecies.length === 0) {
    return {
      action: 'KEEP_NEW_SPECIES',
      reason: 'Primeiro espécime da espécie no acervo',
      score
    };
  }

  const bestCurrent = sameSpecies.reduce((prev, curr) => 
    computeCompetitiveScore(curr) > computeCompetitiveScore(prev) ? curr : prev
  );

  const bestScore = computeCompetitiveScore(bestCurrent);

  if (score > bestScore) {
    return {
      action: 'UPGRADE_ROSTER',
      reason: `Supera o atual em qualidade/IVs (${score} vs ${bestScore})`,
      score,
      replaceTargetId: bestCurrent.id
    };
  }

  // Regra 3: Inferior ao atual
  return {
    action: 'FLAG_FOR_SALE_OR_ALTAR',
    reason: `Inferior ao espécime já guardado (${score} vs ${bestScore})`,
    score
  };
}

function evaluateTest(sample) {
  const score = computeCompetitiveScore(sample);
  console.log('[Roster Evaluator Test] Sample:', sample, 'Score:', score);
  return score;
}

module.exports = {
  computeCompetitiveScore,
  evaluateRetention,
  evaluateTest
};

