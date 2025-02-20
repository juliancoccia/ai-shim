const { Scanner, ScannerCfg } = require("scanoss");
const config = require("./config.json");

function removeLinesContaining(str, target) {
  return str
    .split("\n")
    .filter((line) => !line.includes(target))
    .join("\n");
}

async function getMatchType(cleanCode) {
  const scanossConfig = new ScannerCfg();
  scanossConfig.API_KEY = config.scanoss.apiKey ?? "";
  scanossConfig.API_URL =
    config.scanoss.url ?? "https://osskb.org/api/scan/direct";
  const scanner = new Scanner(scanossConfig);
  const scanResult = await scanner.scanContents({
    content: cleanCode,
    key: "ai_generated_code",
  });

  const matches = scanResult["/ai_generated_code"];
  const match = matches.length > 0 ? matches[0] : null;

  if (!match) {
    return "no Open Source matches";
  }

  const matchType = match.id;

  if (matchType === "none") {
    return "no Open Source matches";
  }

  return `an Open Source match type: ${matchType}`;
}

module.exports = {
  removeLinesContaining,
  getMatchType,
};

