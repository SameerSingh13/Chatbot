const { spawnSync } = require('child_process');
const path = require('path');

function evaluateWithDeepEval(prompt, response, expectedIntent) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in the environment. DeepEval requires an API key to run metrics.');
  }

  const scriptPath = path.resolve(__dirname, 'deepeval_runner.py');

  const resultObj = spawnSync('python', [
    scriptPath,
    prompt,
    response,
    expectedIntent
  ], {
    env: { ...process.env },
    maxBuffer: 1024 * 1024,
    encoding: 'utf-8'
  });

  if (resultObj.error) {
    throw new Error(`Failed to start DeepEval runner: ${resultObj.error.message}`);
  }

  if (resultObj.status !== 0) {
    const stderr = resultObj.stderr ? resultObj.stderr.toString() : 'Unknown error';
    throw new Error(`DeepEval runner failed with exit code ${resultObj.status}:\n${stderr}`);
  }

  const output = resultObj.stdout.toString();
  
  try {
    const result = JSON.parse(output);
    if (result.error) {
      throw new Error(`DeepEval error: ${result.error}`);
    }
    return result;
  } catch (parseErr) {
    throw new Error(`Failed to parse DeepEval output: ${output}\nError: ${parseErr.message}`);
  }
}

module.exports = { evaluateWithDeepEval };
