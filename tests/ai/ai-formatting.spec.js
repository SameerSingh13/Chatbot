const { test, expect } = require('@playwright/test');
const { ChatbotPage } = require('../../src/pages/ChatbotPage');
const testData = require('../../test-data/test-data.json');

test.describe('Response Formatting', () => {

  test.setTimeout(180000);

  let chatbot;

  test.beforeEach(async ({ page }) => {
    chatbot = new ChatbotPage(page);
    await page.goto('/');
    await chatbot.waitForChatReady();
  });

  for (const scenario of testData.en) {

    test(`response should be well-formatted for ${scenario.id}`, async () => {

      await chatbot.sendMessage(scenario.prompt);
      await chatbot.waitForResponse();

      const replyText = await chatbot.getLastAIMessage();
      const replyHTML = await chatbot.getLastAIMessageHTML();

      // No broken HTML tags (e.g. <div without closing >)
      const brokenTagPattern = /<[a-z][^>]*$/i;
      expect(replyHTML).not.toMatch(brokenTagPattern);

      // No excessive nested closing tags — usually means broken structure
      const strayClosingTag = /<\/[a-z]+>\s*<\/[a-z]+>\s*<\/[a-z]+>\s*<\/[a-z]+>/i;
      expect(replyHTML,
        'Too many nested closing tags — looks like broken HTML'
      ).not.toMatch(strayClosingTag);

      // Check for cut-off replies
      const lastChar = replyText.trim().slice(-1);
      const trailingEllipsis = ['...', '…'];
      const endsWithEllipsis = trailingEllipsis.some(e => replyText.trim().endsWith(e));

      // If it ends with "..." 
      if (endsWithEllipsis) {
        expect(replyText.trim().length,
          'Reply seems cut off — ends with ellipsis and is very short'
        ).toBeGreaterThan(100);
      }

      // Should end with proper punctuation or a real word
      const validEndings = /[.!?:)}\]؟。]$/;
      const endsWithPunctuation = validEndings.test(replyText.trim());
      const endsWithWord = /\w$/.test(replyText.trim());
      expect(endsWithPunctuation || endsWithWord || endsWithEllipsis,
        `Reply ends abruptly with "${lastChar}" — might be incomplete`
      ).toBeTruthy();

      // No raw markdown artifacts leaking into the rendered text
      const markdownLeaks = [
        /^#{1,6}\s/m,           // # Header
        /```/,                   // code fences
        /\[.*?\]\(http/,         // [text](url) links
        /\*\*\*[^*]+\*\*\*/,    // ***bold-italic***
      ];

      for (const pattern of markdownLeaks) {
        expect(replyText,
          `Raw markdown found in rendered reply: ${pattern}`
        ).not.toMatch(pattern);
      }

      // Reply should have enough words to be meaningful
      expect(replyText.split(/\s+/).length,
        'Reply has too few words — might be an error or placeholder'
      ).toBeGreaterThan(5);
    });

  }

});
