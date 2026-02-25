const { test, expect } = require('@playwright/test');
const { ChatbotPage } = require('../../src/pages/ChatbotPage');

test.describe('Chatbot UI Tests', () => {

  test.setTimeout(90000);

  let chatbot;

  test.beforeEach(async ({ page }) => {
    chatbot = new ChatbotPage(page);
    await page.goto('/');
    await chatbot.waitForChatReady();
  });

  // --- Widget loading ---

  test('chat widget loads on the page', async () => {
    await expect(chatbot.chatWidget).toBeVisible();
  });

  // --- Sending messages ---

  test('user can type and send a message', async () => {
    await chatbot.sendMessage('Hello');
    await chatbot.waitForElement(chatbot.userMessages.last());
    await expect(chatbot.userMessages.last()).toContainText('Hello');
  });

  test('input box is cleared after sending', async () => {
    await chatbot.sendMessage('How do I get a golden visa?');

    // Input should be empty now and send button disabled
    await expect(chatbot.inputBox).toHaveValue('');
    await expect(chatbot.sendButton).toBeDisabled();
  });

  // --- AI response rendering ---

  test('bot response appears in the conversation area', async () => {
    await chatbot.sendMessage('What is the golden visa?');
    await chatbot.waitForResponse();

    // There should be at least one bot message visible
    const count = await chatbot.botMessages.count();
    expect(count).toBeGreaterThan(0);

    // The reply should have some actual text in it
    const reply = await chatbot.botMessages.last().innerText();
    expect(reply.trim().length).toBeGreaterThan(10);
  });

  // --- Multilingual support ---

  test('English page renders left-to-right', async () => {
    await expect(chatbot.htmlElement).toHaveAttribute('dir', 'ltr');
  });

  test('Arabic page renders right-to-left', async () => {
    await chatbot.switchToArabic();
    await expect(chatbot.htmlElement).toHaveAttribute('dir', 'rtl');
  });

  // --- Scroll behavior ---

  test('chat container is scrollable when content overflows', async () => {
    await chatbot.sendMessage('Tell me everything about getting a UAE driving license');
    await chatbot.waitForResponse();

    const scrollHeight = await chatbot.getScrollHeight();
    const clientHeight = await chatbot.getClientHeight();
    expect(scrollHeight).toBeGreaterThan(clientHeight);
  });

  test('chat auto-scrolls to the latest message', async () => {
    await chatbot.sendMessage('Tell me about renewing a driving license in the UAE');
    await chatbot.waitForResponse();

    const scrollTop = await chatbot.getScrollPosition();
    const scrollHeight = await chatbot.getScrollHeight();
    const clientHeight = await chatbot.getClientHeight();

    // Should be scrolled near the bottom
    expect(scrollTop + clientHeight).toBeCloseTo(scrollHeight, -5);
  });

  // --- Accessibility ---

  test('chat container has correct ARIA role', async () => {
    await expect(chatbot.chatContainer).toHaveAttribute('role', 'listbox');
    await expect(chatbot.chatContainer).toHaveAttribute('aria-live', 'polite');
  });

  test('input box has proper accessibility attributes', async () => {
    await expect(chatbot.inputBox).toHaveAttribute('role', 'textbox');
    await expect(chatbot.inputBox).toHaveAttribute('aria-label', 'Please ask me a question');
  });

  test('send button has an accessible label', async () => {
    await expect(chatbot.sendButton).toHaveAttribute('aria-label', 'Send Message');
  });

});
