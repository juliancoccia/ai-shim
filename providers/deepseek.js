const fetch = require('node-fetch');

async function processResponse(responseText) {
  const lines = responseText.split('\n');
  let fullResponse = '';
  let isThinking = false;

  for (const line of lines) {
    if (!line) continue;
    try {
      const json = JSON.parse(line);
      if (json.response?.includes('<think>')) {
        isThinking = true;
        continue;
      }
      if (json.response?.includes('</think>')) {
        isThinking = false;
        continue;
      }
      if (!isThinking && json.response) {
        fullResponse += json.response;
      }
    } catch (e) {
      /* Ignore parse errors */
    }
  }
  return fullResponse;
}

async function generate(config, headers, body) {
  const response = await fetch(config.providers.deepseek.url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  
  const responseText = await response.text();
  const fullResponse = await processResponse(responseText);

  if (!fullResponse) {
    throw new Error('Empty response from DeepSeek API');
  }

  function extractCodeBlock(text) {
    const codeBlockMatch = text.match(/```(?:python|javascript|[^\n]*)\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    const lines = text.split('\n');
    let codeLines = [];
    let inCode = false;

    for (const line of lines) {
      if (line.match(/^(def |function |class |import |from |const |let |var )/)) {
        inCode = true;
      }
      if (inCode && line.trim() === '') {
        inCode = false;
        break;
      }
      if (inCode) {
        codeLines.push(line);
      }
    }

    if (codeLines.length > 0) {
      return codeLines.join('\n');
    }

    return text; // Return full text if no code block found
  }

  const codeOnly = extractCodeBlock(fullResponse);

  return {
    raw: {
      model: config.providers.deepseek.model,
      created_at: new Date().toISOString(),
      response: codeOnly,
      done: true,
      context: []
    },
    extractedCode: codeOnly
  };
}

module.exports = { generate };