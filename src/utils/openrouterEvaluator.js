const axios = require('axios');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Free and low-cost models from OpenRouter
const MODELS = {
  'mistral': 'mistralai/mistral-7b-instruct:free',
  'llama': 'meta-llama/llama-2-7b-chat:free',
  'neural-chat': 'intel/neural-chat-7b:free'
};


 // Make a direct API call to OpenRouter
 
async function callOpenRouter(prompt, model = 'mistral') {
  if (!OPENROUTER_API_KEY) {
    console.warn('OPENROUTER_API_KEY not set - skipping OpenRouter evaluation');
    return null;
  }

  const modelId = MODELS[model] || model;

  try {
    const response = await axios.post(`${OPENROUTER_BASE_URL}/chat/completions`, {
      model: modelId,
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 1000
    }, {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://localhost',
        'X-Title': 'Chatbot QA Testing'
      }
    });

    if (!response.data.choices || !response.data.choices[0]) {
      throw new Error('Unexpected API response format');
    }

    return response.data.choices[0].message.content;
  } catch (error) {
    console.warn(`OpenRouter API failed: ${error.message}`);
    return null;
  }
}


 // Validate response relevancy using OpenRouter
 
async function validateRelevancy(prompt, response, expectedTopic, model) {
  const evalPrompt = `You are an expert QA evaluator. Determine if a chatbot response is relevant to the question.

Question: "${prompt}"
Expected Topic: "${expectedTopic}"
Response: "${response}"

Rate relevancy 0-10 where: 10=Perfect, 7-9=Highly relevant, 4-6=Somewhat relevant, 1-3=Mostly irrelevant, 0=Completely irrelevant

RESPOND ONLY WITH THIS JSON (no extra text):
{"score": <number 0-10>, "passed": <boolean true if score>=7>, "reason": "<one sentence>"}`;

  const result = await callOpenRouter(evalPrompt, model);
  if (!result) {
    return { available: false, score: 0, passed: false, reason: 'OpenRouter unavailable' };
  }

  try {
    const parsed = JSON.parse(result);
    return {
      available: true,
      score: parsed.score / 10,
      passed: parsed.passed,
      reason: parsed.reason
    };
  } catch {
    console.warn(`Failed to parse OpenRouter relevancy response: ${result}`);
    return { available: false, score: 0, passed: false, reason: 'Parse error' };
  }
}


 // Detect hallucinations in response
 
async function validateNoHallucinations(prompt, response, model) {
  const evalPrompt = `You are an expert at detecting hallucinations. A hallucination is made-up facts, fake authorities, or invented procedures.

Question: "${prompt}"
Response: "${response}"

Does this response contain hallucinations? Real UAE services: Golden Visa, RTA (driving), Emirates ID, ICP portal.

RESPOND ONLY WITH THIS JSON:
{"hallucinated": <boolean>, "score": <0-10 confidence it's NOT hallucinated>, "issues": "<list issues or 'none'>"}`;

  const result = await callOpenRouter(evalPrompt, model);
  if (!result) {
    return { available: false, passed: false, score: 0, issues: 'OpenRouter unavailable' };
  }

  try {
    const parsed = JSON.parse(result);
    return {
      available: true,
      passed: !parsed.hallucinated,
      score: parsed.score / 10,
      issues: parsed.issues
    };
  } catch {
    console.warn(`Failed to parse OpenRouter hallucination response: ${result}`);
    return { available: false, passed: false, score: 0, issues: 'Parse error' };
  }
}


 // Check if response is complete
 
async function validateCompleteness(prompt, response, model) {
  const evalPrompt = `Judge if this chatbot response fully answers the question.

Question: "${prompt}"
Response: "${response}"

Does it cover all key aspects needed to answer the question?

RESPOND ONLY WITH THIS JSON:
{"complete": <boolean>, "score": <0-10 how complete>, "missing": "<what's missing or 'nothing'>"}`;

  const result = await callOpenRouter(evalPrompt, model);
  if (!result) {
    return { available: false, passed: false, score: 0, missing: 'OpenRouter unavailable' };
  }

  try {
    const parsed = JSON.parse(result);
    return {
      available: true,
      passed: parsed.complete,
      score: parsed.score / 10,
      missing: parsed.missing
    };
  } catch {
    console.warn(`Failed to parse OpenRouter completeness response: ${result}`);
    return { available: false, passed: false, score: 0, missing: 'Parse error' };
  }
}


 // Run OpenRouter validation
 
async function evaluateWithOpenRouter(prompt, response, expectedIntent) {
  if (!OPENROUTER_API_KEY) {
    return {
      OpenRouterAvailable: false,
      error: 'OPENROUTER_API_KEY not set'
    };
  }

  // Choose model based on environment config or default to mistral free
  const model = process.env.OPENROUTER_MODEL || 'mistral';

  const [relevancy, hallucinations, completeness] = await Promise.all([
    validateRelevancy(prompt, response, expectedIntent, model),
    validateNoHallucinations(prompt, response, model),
    validateCompleteness(prompt, response, model)
  ]);

  const OpenRouterAvailable = Boolean(
    relevancy && relevancy.available &&
    hallucinations && hallucinations.available &&
    completeness && completeness.available
  );

  return {
    OpenRouterAvailable,
    RelevancyValidation: relevancy,
    HallucinationValidation: hallucinations,
    CompletenessValidation: completeness
  };
}

module.exports = {
  evaluateWithOpenRouter
};
