const { BasePage } = require('./BasePage');

class ChatbotPage extends BasePage {
  constructor(page) {
    super(page);

    this.chatWidget = page.locator('.question-box.ng-trigger.ng-trigger-fadeInOut.ng-star-inserted');
    this.alert = page.getByRole('button', { name: 'Accept and continue' });
    this.inputBox = page.locator('#conversation');
    this.sendButton = page.locator('button.send-question[aria-label="Send Message"]');
    this.userMessages = page.locator('.title-user');
    this.botMessages = page.locator('markdown');
    this.htmlElement = page.locator('html');
    this.languageSelector = page.getByLabel('Arabic', { exact: true });
    this.loader = page.getByAltText('loader', { exact: true });
    this.chatContainer = page.locator('div.chatContainer[role="listbox"]');
    this.liveRegion = page.locator('div.sr-only[aria-live="polite"]');
    this.recaptchaFrame = page.frameLocator('iframe[title*="reCAPTCHA"]');
    this.recaptchaCheckbox = this.recaptchaFrame.locator('.recaptcha-checkbox-border');
  }

  async waitForAppLoaded() {
    await this.page.waitForSelector('app-root');
  }

  async openChatWindow() {
    await this.navigateTobrowser('/');
    await this.waitForElement(this.chatWidget);
  }

  async waitForChatReady() {
    await this.page.waitForLoadState('networkidle');
    await this.inputBox.waitFor({ state: 'visible', timeout: 15000 });
    await this.page.waitForTimeout(2000);
  }

  async sendMessage(message) {
    await this.inputBox.click();
    await this.inputBox.fill('');
    await this.inputBox.pressSequentially(message, { delay: 30 });
    await this.page.waitForFunction(
      () => {
        const btn = document.querySelector('button.send-question[aria-label="Send Message"]');
        return btn && !btn.disabled;
      },
      { timeout: 10000 }
    );

    await this.sendButton.click();
  }

  async handleRecaptchaIfPresent() {
    try {
      const recaptchaSelectors = [
        'iframe[title*="reCAPTCHA"]',
        'iframe[title*="recaptcha"]',
        'iframe[src*="recaptcha"]',
        'iframe[src*="google.com/recaptcha"]'
      ];

      for (const selector of recaptchaSelectors) {
        const iframe = this.page.locator(selector);
        const isVisible = await iframe.isVisible().catch(() => false);
        if (isVisible) {
          const frame = this.page.frameLocator(selector);
          const checkbox = frame.locator('#recaptcha-anchor, .recaptcha-checkbox-border');
          const checkboxVisible = await checkbox.first().isVisible().catch(() => false);
          if (checkboxVisible) {
            await checkbox.first().click();
            // Wait for CAPTCHA to process the click
            await this.page.waitForTimeout(5000);
            return true;
          }
        }
      }
    } catch {
      
    }
    return false;
  }

  async waitForResponse() {
    try {
      await this.loader.waitFor({ state: 'visible', timeout: 10000 });
    } catch {
    }

    const maxWait = 90000;
    const checkEvery = 3000;
    const started = Date.now();

    while (Date.now() - started < maxWait) {
      const loaderVisible = await this.loader.isVisible().catch(() => false);
      if (!loaderVisible) {
        return;
      }

      const captchaSolved = await this.handleRecaptchaIfPresent();
      if (captchaSolved) {
        await this.page.waitForTimeout(5000);
        continue;
      }

      await this.page.waitForTimeout(checkEvery);
    }

    const stillVisible = await this.loader.isVisible().catch(() => false);
    if (stillVisible) {
      throw new Error('Timed out waiting for bot response. Loader did not go away.');
    }
  }

  async getLatestBotMessage() {
    return await this.botMessages.last();
  }

  async isInputCleared() {
    const value = await this.inputBox.inputValue();
    return value === '';
  }

  async getHtmlDirection() {
    return await this.page.evaluate(() => document.documentElement.dir);
  }

  async isScrolledToBottom() {
    return await this.page.evaluate(() => {
      const container = document.querySelector('.card.card-listing');
      return container.scrollTop + container.clientHeight >= container.scrollHeight;
    });
  }

  async getScrollPosition() {
    return await this.chatContainer.evaluate(el => el.scrollTop);
  }

  async getScrollHeight() {
    return await this.chatContainer.evaluate(el => el.scrollHeight);
  }

  async getClientHeight() {
    return await this.chatContainer.evaluate(el => el.clientHeight);
  }

  async waitForMessageToAppear(text) {
    await this.chatContainer
      .locator(`text=${text}`)
      .first()
      .waitFor({ state: 'visible' });
  }

  async getLastAIMessage() {
    await this.botMessages.first().waitFor({ state: 'visible', timeout: 30000 });
    await this.page.waitForTimeout(2000);

    const count = await this.botMessages.count();
    if (count === 0) {
      throw new Error('No bot messages found on the page');
    }

    const text = await this.botMessages.nth(count - 1).innerText();

    if (!text || text.trim().length < 10) {
      throw new Error(`Bot response too short or empty: "${text}"`);
    }

    return text.trim();
  }

  async getLastAIMessageHTML() {
    await this.botMessages.first().waitFor({ state: 'visible', timeout: 30000 });
    await this.page.waitForTimeout(2000);

    const count = await this.botMessages.count();
    if (count === 0) {
      throw new Error('No bot messages found on the page');
    }

    return await this.botMessages.nth(count - 1).evaluate(el => el.innerHTML);
  }

  async isLoaderVisible() {
    return await this.loader.isVisible().catch(() => false);
  }

  async switchToArabic() {
    await this.languageSelector.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
  }

  async getChatContainerHTML() {
    await this.botMessages.first().waitFor({ state: 'visible', timeout: 30000 });
    await this.page.waitForTimeout(1000);
    return await this.chatContainer.evaluate(el => el.innerHTML);
  }
}

module.exports = { ChatbotPage };