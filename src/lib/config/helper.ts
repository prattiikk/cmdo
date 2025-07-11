// has all functions related to configuration managementt
import path from "path";
import fs from "fs";
import os from "os";

const CONFIG_DIR = path.join(os.homedir(), ".config", "senpai");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function ensureConfigFile() {
  if (!fs.existsSync(CONFIG_PATH)) {
    const defaultConfig = {
      provider: "server", // or "ollama", "openai", etc.
      serverUrl: "http://localhost:3000",
      apiKey: "", // optional if user uses OpenAI, Groq etc.
      jwt: ""     // optional if server uses JWT
    };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
  }
}

function getConfig() {
  ensureConfigDir();
  // if there is no config file, create it with default values
  ensureConfigFile();
  // read the config file
  const configContent = fs.readFileSync(CONFIG_PATH, "utf-8");
  // parse the config file content and return it
  return JSON.parse(configContent);
}

function updateConfig(newConfig: Record<string, any>) {
  ensureConfigDir();
  ensureConfigFile();
  const config = getConfig();
  const updatedConfig = { ...config, ...newConfig };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(updatedConfig, null, 2));
}

// get config value by key
function getConfigValue(key: string) {
  ensureConfigDir();
  ensureConfigFile();
  const config = getConfig();
  return config[key];
}
// set config value by key
function setConfigValue(key: string, value: any) {
  ensureConfigDir();
  ensureConfigFile();
  const config = getConfig();
  config[key] = value;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export {
  ensureConfigDir,
  ensureConfigFile,
  getConfig,
  updateConfig,
  getConfigValue,
  setConfigValue,
  CONFIG_PATH,
  CONFIG_DIR,
};
