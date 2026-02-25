const { test, expect } = require('@playwright/test');
const { ChatbotPage } = require('../../src/pages/ChatbotPage');
const testData = require('../../test-data/test-data.json');
const { evaluateWithDeepEval } = require('../../src/utils/aiEvaluator');
const { evaluateWithOpenRouter } = require('../../src/utils/openrouterEvaluator');
const { evaluateWithGroundTruth } = require('../../src/utils/groundTruthEvaluator');

test.describe('English Chatbot Responses', () => {

  test.setTimeout(180000);

  let chatbot;

  test.beforeEach(async ({ page }) => {
    chatbot = new ChatbotPage(page);
    await page.goto('/');
    await chatbot.waitForChatReady();
  });

  for (const scenario of testData.en) {

    test(`should return a relevant and accurate answer for ${scenario.id} @deep-eval`, async () => {
      if (process.env.ENABLE_DEEPEVAL === 'false') {
        test.skip();
      }

      await chatbot.sendMessage(scenario.prompt);
      await chatbot.waitForResponse();
      const botReply = await chatbot.getLastAIMessage();

      expect(botReply.length).toBeGreaterThan(30);

      const scores = evaluateWithDeepEval(
        scenario.prompt,
        botReply,
        scenario.expected_intent
      );

      expect(scores.AnswerRelevancyMetric.passed,
        `Relevancy score: ${scores.AnswerRelevancyMetric.score}`
      ).toBeTruthy();

      expect(scores.FaithfulnessMetric.passed,
        `Faithfulness score: ${scores.FaithfulnessMetric.score}`
      ).toBeTruthy();

      expect(scores.ContextualRelevancyMetric.passed,
        `Contextual Relevancy score: ${scores.ContextualRelevancyMetric.score}`
      ).toBeTruthy();

      expect(scores.HallucinationMetric.passed,
        `Hallucination score: ${scores.HallucinationMetric.score}`
      ).toBeTruthy();

      expect(scores.CompletenessMetric.passed,
        `Completeness score: ${scores.CompletenessMetric.score}`
      ).toBeTruthy();

      expect(scores.ConcisenessMetric.passed,
        `Conciseness score: ${scores.ConcisenessMetric.score}`
      ).toBeTruthy();
    });

    test(`answer should include expected keywords for ${scenario.id} @sanity`, async () => {

      await chatbot.sendMessage(scenario.prompt);
      await chatbot.waitForResponse();
      const botReply = await chatbot.getLastAIMessage();
      const replyLower = botReply.toLowerCase();

      for (const keyword of scenario.required_keywords) {
        expect(replyLower,
          `Missing expected keyword "${keyword}" in the reply`
        ).toContain(keyword.toLowerCase());
      }

      for (const forbidden of scenario.forbidden_keywords) {
        expect(replyLower,
          `Found forbidden keyword "${forbidden}" — possible hallucination`
        ).not.toContain(forbidden.toLowerCase());
      }
    });

    test(`should match ground truth facts for ${scenario.id} @ground-truth`, async () => {
      if (process.env.ENABLE_GROUND_TRUTH_VALIDATION === 'false') {
        test.skip();
      }

      if (!scenario.ground_truth) {
        test.skip(`No ground truth configured for ${scenario.id}`);
      }

      await chatbot.sendMessage(scenario.prompt);
      await chatbot.waitForResponse();

      const botReply = await chatbot.getLastAIMessage();
      const result = evaluateWithGroundTruth(botReply, scenario.ground_truth);

      expect(result.passed,
        `Ground Truth failed. Missing: [${result.missingMust.join(', ')}], Forbidden: [${result.violatedForbidden.join(', ')}], Score: ${result.score}, Min: ${result.minScore}`
      ).toBeTruthy();
    });

  }

});

// ─────────────────────────────────────────────────────────────────────
// OpenRouter AI Response Evaluation (English)
// ─────────────────────────────────────────────────────────────────────

test.describe('OpenRouter AI Response Evaluation (English)', () => {

  test.setTimeout(240000);

  let chatbot;

  test.beforeEach(async ({ page }) => {
    chatbot = new ChatbotPage(page);
    await page.goto('/');
    await chatbot.waitForChatReady();
  });

  for (const scenario of testData.en) {

    test(`[OpenRouter] validate relevancy and hallucinations for ${scenario.id} @open-router`, async () => {
      if (process.env.ENABLE_OPENROUTER_VALIDATION === 'false') {
        test.skip();
      }

      await chatbot.sendMessage(scenario.prompt);
      await chatbot.waitForResponse();
      const botReply = await chatbot.getLastAIMessage();

      // Get evaluation results from OpenRouter
      const openrouterResults = await evaluateWithOpenRouter(
        scenario.prompt,
        botReply,
        scenario.expected_intent
      );

      if (!openrouterResults.OpenRouterAvailable) {
        test.skip('OpenRouter API key not configured');
      }

      const relevancy = openrouterResults.RelevancyValidation;
      const hallucination = openrouterResults.HallucinationValidation;
      const completeness = openrouterResults.CompletenessValidation;

      expect(relevancy.passed, 
        `OpenRouter Relevancy Failed: ${relevancy.reason} (Score: ${relevancy.score})`
      ).toBeTruthy();

      expect(hallucination.passed, 
        `OpenRouter Hallucination Detected: ${hallucination.issues} (Score: ${hallucination.score})`
      ).toBeTruthy();

      expect(completeness.passed, 
        `OpenRouter Incomplete Response: ${completeness.missing} (Score: ${completeness.score})`
      ).toBeTruthy();
    });

  }

});
