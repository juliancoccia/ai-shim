const express = require("express");
const bodyParser = require("body-parser");
const config = require("./config.json");
const getProvider = require("./providers");
const { removeLinesContaining, getMatchType } = require("./utils");

const app = express();
app.use(bodyParser.json());

app.post("/api/generate", async (req, res) => {
  try {
    const provider = getProvider(config.activeProvider);
    const result = await provider.generate(config, req.headers, req.body);

    // Process the code
    let cleanCode = removeLinesContaining(result.extractedCode, "```");
    const matchType = await getMatchType(cleanCode);

    // Insert scan results as comment in the code
    const commentedCode = `/* STARTS autogenerated code for which\n   SCANOSS found ${matchType} */\n\n${cleanCode}\n/* END of autogenerated code */\n`;

    // Update the code in the original response format
    const response = result.raw;
    if (config.activeProvider === "claude") {
      response.content[0].text = commentedCode;
    } else if (config.activeProvider === "openai") {
      response.choices[0].message.content = commentedCode;
    }

    // Send back in original format
    res.json(response);
  } catch (error) {
    console.error("Shim API error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(config.server.port, config.server.host, () => {
  console.log(
    `AI shim API running on http://${config.server.host}:${config.server.port}`
  );
});

