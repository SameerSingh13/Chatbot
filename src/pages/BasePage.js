class BasePage {
  constructor(page) {
    this.page = page;
  }

  async navigateTobrowser(path = '/') {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
  }

  async waitForElement(locator) {
    await locator.waitFor({ state: 'visible' });
  }

  async waitForHidden(locator) {
    await locator.waitFor({ state: 'hidden' });
  }
}

module.exports = { BasePage };
