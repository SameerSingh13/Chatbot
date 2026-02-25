function normalizeText(value) {
  return (value || '')
    .toLowerCase()
    .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value) {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  return normalized.split(' ').filter(Boolean);
}

function splitSentences(value) {
  if (!value) return [];
  return value
    .split(/[.!?؟。\n]+/)
    .map(part => part.trim())
    .filter(Boolean);
}

function calculateTokenOverlapRatio(reference, candidate) {
  const refTokens = tokenize(reference);
  const candidateTokens = new Set(tokenize(candidate));

  if (refTokens.length === 0) return 0;

  let overlapCount = 0;
  for (const token of refTokens) {
    if (candidateTokens.has(token)) {
      overlapCount += 1;
    }
  }

  return overlapCount / refTokens.length;
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function evaluateTerm(normalizedReply, term) {
  if (typeof term === 'string') {
    const normalizedTerm = normalizeText(term);
    return {
      passed: normalizedTerm.length > 0 && normalizedReply.includes(normalizedTerm),
      label: term,
    };
  }

  if (term && Array.isArray(term.anyOf)) {
    const options = term.anyOf.filter(Boolean);
    const passed = options.some(option => normalizedReply.includes(normalizeText(option)));
    return {
      passed,
      label: `anyOf(${options.join(' | ')})`,
    };
  }

  if (term && Array.isArray(term.allOf)) {
    const options = term.allOf.filter(Boolean);
    const passed = options.every(option => normalizedReply.includes(normalizeText(option)));
    return {
      passed,
      label: `allOf(${options.join(' & ')})`,
    };
  }

  return {
    passed: false,
    label: JSON.stringify(term),
  };
}

function evaluateWithGroundTruth(response, groundTruth = {}, options = {}) {
  const normalizedReply = normalizeText(response);
  const replySentences = splitSentences(response);
  const mustInclude = toArray(groundTruth.must_include);
  const mustNotInclude = toArray(groundTruth.must_not_include);
  const optionalInclude = toArray(groundTruth.optional_include);
  const referenceSentences = toArray(groundTruth.reference_sentences);
  const minScore = Number.isFinite(options.minScore)
    ? options.minScore
    : Number.parseFloat(process.env.GROUND_TRUTH_MIN_SCORE || '0.75');
  const minSentenceSimilarity = Number.isFinite(options.minSentenceSimilarity)
    ? options.minSentenceSimilarity
    : Number.parseFloat(process.env.GROUND_TRUTH_MIN_SENTENCE_SIMILARITY || '0.6');

  const mustChecks = mustInclude.map(term => evaluateTerm(normalizedReply, term));
  const optionalChecks = optionalInclude.map(term => evaluateTerm(normalizedReply, term));
  const forbiddenChecks = mustNotInclude.map(term => evaluateTerm(normalizedReply, term));

  const sentenceChecks = referenceSentences.map(reference => {
    const bestAgainstReply = calculateTokenOverlapRatio(reference, response);
    const bestAgainstSentence = replySentences.reduce((best, candidateSentence) => {
      const ratio = calculateTokenOverlapRatio(reference, candidateSentence);
      return Math.max(best, ratio);
    }, 0);

    const similarity = Math.max(bestAgainstReply, bestAgainstSentence);
    return {
      reference,
      similarity: Number(similarity.toFixed(3)),
      passed: similarity >= minSentenceSimilarity,
    };
  });

  const missingMust = mustChecks.filter(check => !check.passed).map(check => check.label);
  const violatedForbidden = forbiddenChecks.filter(check => check.passed).map(check => check.label);

  const matchedMust = mustChecks.filter(check => check.passed).length;
  const matchedOptional = optionalChecks.filter(check => check.passed).length;
  const matchedReference = sentenceChecks.filter(check => check.passed).length;
  const totalScorable = mustChecks.length + optionalChecks.length + sentenceChecks.length;
  const rawScore = totalScorable === 0
    ? 1
    : (matchedMust + matchedOptional + matchedReference) / totalScorable;

  const passed =
    missingMust.length === 0 &&
    violatedForbidden.length === 0 &&
    rawScore >= minScore;

  return {
    passed,
    score: Number(rawScore.toFixed(3)),
    minScore,
    summary: {
      mustMatched: matchedMust,
      mustTotal: mustChecks.length,
      optionalMatched: matchedOptional,
      optionalTotal: optionalChecks.length,
      referenceMatched: matchedReference,
      referenceTotal: sentenceChecks.length,
      forbiddenViolations: violatedForbidden.length,
    },
    sentenceChecks,
    minSentenceSimilarity,
    missingMust,
    violatedForbidden,
  };
}

module.exports = {
  evaluateWithGroundTruth,
};
