# UAE Chatbot Test Automation Framework

A comprehensive end-to-end testing solution for the UAE Government Chatbot (beta-ask.u.ae), built using **Playwright** and **DeepEval** (AI testing framework).

---

## Beginner's Guide (Getting Started)

This guide is designed for anyone to get this project running, even with zero prior experience in automation.

### 1. Prerequisites
Before you start, you need to have the following installed on your computer:

*   **Node.js (LTS Version):** The engine that runs our JavaScript tests.
    *   [Download Node.js](https://nodejs.org/) (Choose the "LTS" version).
*   **Python (3.10 or higher):** Required for the AI evaluation metrics.
    *   [Download Python](https://www.python.org/downloads/) (Check "Add Python to PATH" during installation).
*   **Google Chrome:** The browser where tests will run.

### 2. Installation
Follow these 4 simple steps in your terminal (Command Prompt, PowerShell, or VS Code Terminal):

**Step A: Install Node.js dependencies**
```bash
npm install
```

**Step B: Install Playwright Browsers**
```bash
npx playwright install chromium
```

**Step C: Create a Python Virtual Environment (Optional but Recommended)**
```bash
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate
```

**Step D: Install Python AI testing packages**
```bash
pip install -r requirements.txt
```

---

## ⚙️ Configuration

To enable the AI evaluation features, you need an API key from OpenAI or OpenRouter.

1.  Create a file named `.env.local` in the root folder.
2.  Add your keys like this:

```env
# Required for DeepEval (AI Scoring)
OPENAI_API_KEY=your_openai_key_here

# Required for OpenRouter (Alternative AI Scoring)
OPENROUTER_API_KEY=your_openrouter_key_here

# Feature Toggles (true/false)
ENABLE_DEEPEVAL=true
ENABLE_OPENROUTER_VALIDATION=true
ENABLE_GROUND_TRUTH_VALIDATION=true

# Optional minimum score for Ground Truth checks (0.0 - 1.0)
GROUND_TRUTH_MIN_SCORE=0.75

# Optional minimum similarity for reference_sentences (0.0 - 1.0)
GROUND_TRUTH_MIN_SENTENCE_SIMILARITY=0.6

# Environment to test (dev, qa, or prod)
TEST_ENV=qa
```

---

## 🧪 Running Tests

We use a **tagging system** to differentiate between quick checks and deep AI analysis:

### **Sanity Checks (`@sanity`)**
These are fast tests that check for keywords and basic UI behavior. They do **not** cost any API credits.
```bash
npx playwright test --grep "@sanity"
```

### **Deep AI Evaluation (`@deep-eval`)**
These tests use LLMs to score response accuracy, relevancy, and hallucinations.
```bash
npx playwright test --grep "@deep-eval"
```

### **Ground Truth Verification (`@ground-truth`)**
These tests validate replies against deterministic expected facts from `test-data/test-data.json`.
```bash
npx playwright test --grep "@ground-truth"
```

Ground Truth supports:
- `must_include`: required concepts/phrases.
- `optional_include`: extra concepts that improve score.
- `must_not_include`: forbidden hallucinated terms.
- `reference_sentences` (optional): complete expected sentences matched with token-overlap similarity.

### **General Test Commands**
| Command | Description |
|---------|-------------|
| `npm run test:qa` | Run all tests in the QA environment |
| `npm run test:ui` | Run only UI/Behavior tests |
| `npm run test:security` | Run security/injection tests |

---

## 🛠️ Troubleshooting

**"python" or "pip" command not found**
*   Make sure Python is installed and you checked "Add Python to PATH" during installation.
*   Try using `python3` instead of `python`.

**DeepEval errors in tests**
*   Ensure your `OPENAI_API_KEY` is valid and has credits.
*   Ensure you have run `pip install deepeval`.

**Tests failing due to Timeout**
*   AI evaluation can take 60-90 seconds per test. This is normal.
*   If you have a slow internet connection, try increasing the `timeout` in `playwright.config.js`.

---

## 📂 Project Structure

*   `tests/ui/` - Checks buttons, loading spinners, and mobile responsiveness.
*   `tests/ai/` - Checks if the bot answers correctly using AI metrics.
*   `src/utils/groundTruthEvaluator.js` - Deterministic rule-based fact verification.
*   `tests/security/` - Checks for hacking attempts (XSS/Injection).
*   `src/pages/` - Contains the logic for interacting with the website.
*   `test-data/` - Change the questions and Ground Truth expectations here.

---

## 📊 Reports
After running tests, you can view a beautiful visual report:
```bash
npx playwright show-report
```
*Look in the `reports` folder for historical results.* 

