const deepseek = require('./deepseek');
const claude = require('./claude');
const openai = require('./openai');

const providers = {
  deepseek,
  claude,
  openai
};

module.exports = function getProvider(name) {
  if (!providers[name]) {
    throw new Error(`Unknown provider: ${name}`);
  }
  return providers[name];
};
