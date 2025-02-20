const Anthropic = require('@anthropic-ai/sdk');

function extractCodeBlock(text) {
  // If the text contains markdown code blocks, extract them
  const codeBlockMatch = text.match(/```(?:python|javascript|[^\n]*)\n([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // If no code blocks, try to find the first code-like section
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

  // If no code found, return the original text
  return text;
}

async function generate(config, headers, body) {
  const anthropic = new Anthropic({
    apiKey: headers['x-api-key']
  });

  try {
    // Modify the messages to ask for code only
    const modifiedMessages = body.messages.map(msg => ({
      ...msg,
      content: `Please provide only code without any explanation or commentary:\n\n${msg.content}`
    }));

    const response = await anthropic.messages.create({
      model: body.model,  // Use the model from the request
      messages: modifiedMessages,
      max_tokens: 4096
    });

    const codeOnly = extractCodeBlock(response.content[0].text);
    
    if (!codeOnly) {
      throw new Error('No code found in response');
    }

    // Create modified response with code only
    const modifiedResponse = {
      ...response,
      content: [{
        ...response.content[0],
        text: codeOnly
      }]
    };

    return {
      raw: modifiedResponse,
      extractedCode: codeOnly
    };
  } catch (error) {
    console.error('Claude API Error:', {
      message: error.message,
      type: error.type,
      status: error.status,
      details: error.error
    });
    throw error;
  }
}

module.exports = { generate };