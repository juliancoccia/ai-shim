const { OpenAI } = require('openai'); // Import OpenAI SDK

async function generate(config, headers, body) {
  // Extract API key from headers
  const apiKey = headers?.authorization || headers?.Authorization;
  if (!apiKey || !apiKey.startsWith('Bearer ')) {
    throw new Error("Missing or malformed OpenAI API key in Authorization header");
  }

  // Initialize OpenAI client with extracted API key
  const openai = new OpenAI({ apiKey: apiKey.replace('Bearer ', '') });

  try {
    const response = await openai.chat.completions.create({
      model: body.model || config.providers.openai.model,
      messages: body.messages,
      temperature: body.temperature ?? 0.7,
      max_tokens: body.max_tokens ?? 2048,
    });

    // Extract code only from the response content
    const fullContent = response.choices[0]?.message?.content || "";
    const codeMatch = fullContent.match(/```(?:\w+\n)?([\s\S]*?)```/);
    const extractedCode = codeMatch ? codeMatch[1].trim() : fullContent.trim();

    return {
      raw: response,
      extractedCode: extractedCode
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error("OpenAI API request failed");
  }
}

module.exports = { generate };
