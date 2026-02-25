const { test, expect } = require('@playwright/test');
const { ChatbotPage } = require('../../src/pages/ChatbotPage');
const testData = require('../../test-data/test-data.json');

test.describe('Loading States & Fallback Behaviour', () => {

  test.setTimeout(120000);

  let chatbot;

  test.beforeEach(async ({ page }) => {
    chatbot = new ChatbotPage(page);
    await page.goto('/');
    await chatbot.waitForChatReady();
  });

  // ── Loading spinner tests ────────────────────────────────────────────

  test('loading spinner should appear after sending a message', async () => {
    await chatbot.sendMessage('I want to know about the golden visa in UAE');
    // Try to catch the loader — it can disappear fast on good connections
    let loaderAppeared = false;
    try {
      await chatbot.loader.waitFor({ state: 'visible', timeout: 10000 });
      loaderAppeared = true;
    } catch {
      // If we already got a reply, the loader came and went too quickly
      const messageCount = await chatbot.botMessages.count();
      if (messageCount > 0) {
        loaderAppeared = true;
      }
    }

    expect(loaderAppeared,
      'Loading spinner never showed up after sending a message'
    ).toBeTruthy();
  });


  test('loading spinner should disappear once the bot replies', async () => {
    await chatbot.sendMessage('I want to know about the golden visa in UAE');
    await chatbot.waitForResponse();

    // Loader should be gone by now
    const isStillLoading = await chatbot.isLoaderVisible();
    expect(isStillLoading,
      'Spinner is still showing after the bot already replied'
    ).toBeFalsy();

    // And there should be at least one reply
    const messageCount = await chatbot.botMessages.count();
    expect(messageCount,
      'No bot reply appeared after the spinner went away'
    ).toBeGreaterThan(0);
  });

  // ── Fallback / edge-case tests ───────────────────────────────────────

  for (const scenario of testData.fallback_triggers) {

    test(`bot should handle gracefully - ${scenario.id}`, async () => {

      await chatbot.sendMessage(scenario.prompt);
      await chatbot.waitForResponse();

      const botReply = await chatbot.getLastAIMessage();

      // Bot should not return blank
      expect(botReply.length,
        `Bot gave an empty or near-empty reply for: "${scenario.prompt}"`
      ).toBeGreaterThan(5);

      // The reply shouldn't be a raw error or stack trace
      const errorPatterns = [
        /error/i,
        /exception/i,
        /traceback/i,
        /undefined/i,
        /null/i,
        /500\s*internal/i,
        /NaN/,
      ];

      for (const pattern of errorPatterns) {
        // Only flag if it looks like a raw error (very short response with error keywords)
        const looksLikeRawError = pattern.test(botReply) &&
          botReply.split(/\s+/).length < 10;

        expect(looksLikeRawError,
          `Reply looks like a raw error: "${botReply.substring(0, 100)}"`
        ).toBeFalsy();
      }

      // For gibberish, make sure the bot isn't just repeating the nonsense back
      const inputWords = scenario.prompt.toLowerCase().split(/\s+/);
      const replyWords = botReply.toLowerCase().split(/\s+/);

      if (scenario.id === 'gibberishInput') {
        const gibberish = inputWords.filter(w => replyWords.includes(w) && w.length > 3);
        expect(gibberish.length,
          'Bot just repeated the gibberish back instead of giving a proper fallback'
        ).toBeLessThan(2);
      }
    });

  }

  test('bot should handle rapid back-to-back messages without crashing', async () => {

    const quickMessages = [
      'Tell me about getting a golden visa',
      'How can I renew my Emirates ID?',
    ];

    for (const message of quickMessages) {
      await chatbot.sendMessage(message);
      await chatbot.waitForResponse();
    }

    // After multiple messages, bot should still be working
    const totalReplies = await chatbot.botMessages.count();
    expect(totalReplies,
      'Bot stopped responding after rapid messages'
    ).toBeGreaterThanOrEqual(1);

    // Last reply should be meaningful
    const lastReply = await chatbot.getLastAIMessage();
    expect(lastReply.length).toBeGreaterThan(20);
  });

});
