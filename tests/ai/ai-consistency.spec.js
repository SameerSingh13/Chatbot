const { test, expect } = require('@playwright/test');
const { ChatbotPage } = require('../../src/pages/ChatbotPage');
const testData = require('../../test-data/test-data.json');
const { evaluateWithDeepEval } = require('../../src/utils/aiEvaluator');

test.describe('Cross-Language Consistency', () => {

  test.setTimeout(240000);

  for (const pair of testData.consistency_pairs) {

    test(`EN and AR should cover the same topic - ${pair.id} @deep-eval`, async ({ page }) => {
      if (process.env.ENABLE_DEEPEVAL === 'false') {
        test.skip();
      }

      const chatbot = new ChatbotPage(page);

      await page.goto('/');
      await chatbot.waitForChatReady();

      await chatbot.sendMessage(pair.en_prompt);
      await chatbot.waitForResponse();
      const englishReply = await chatbot.getLastAIMessage();

      expect(englishReply.length, 'English reply should be non-trivial').toBeGreaterThan(30);

      await page.goto('/');
      await chatbot.waitForChatReady();
      await chatbot.switchToArabic();

      await chatbot.sendMessage(pair.ar_prompt);
      await chatbot.waitForResponse();
      const arabicReply = await chatbot.getLastAIMessage();

      expect(arabicReply.length, 'Arabic reply should be non-trivial').toBeGreaterThan(20);

      const englishScores = evaluateWithDeepEval(
        pair.en_prompt,
        englishReply,
        pair.topic
      );

      expect(englishScores.AnswerRelevancyMetric.passed,
        `English reply not relevant to "${pair.topic}" — score: ${englishScores.AnswerRelevancyMetric.score}`
      ).toBeTruthy();

      const arabicScores = evaluateWithDeepEval(
        pair.ar_prompt,
        arabicReply,
        pair.topic
      );

      expect(arabicScores.AnswerRelevancyMetric.passed,
        `Arabic reply not relevant to "${pair.topic}" — score: ${arabicScores.AnswerRelevancyMetric.score}`
      ).toBeTruthy();

      const scoreDiff = Math.abs(
        englishScores.AnswerRelevancyMetric.score - arabicScores.AnswerRelevancyMetric.score
      );
      expect(scoreDiff,
        `EN relevancy (${englishScores.AnswerRelevancyMetric.score}) and AR relevancy (${arabicScores.AnswerRelevancyMetric.score}) differ too much`
      ).toBeLessThan(0.3);
    });

  }

});
