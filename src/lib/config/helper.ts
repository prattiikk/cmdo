// lib/config/helper.ts
// has all functions related to configuration management
import path from "path";
import fs from "fs";
import os from "os";

const CONFIG_DIR = path.join(os.homedir(), ".config", "senpai");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

const DEFAULT_CONFIG = {
  provider: "server", // or "ollama", "openai", etc.
  serverUrl: "http://localhost:3000",
  apiKey: "", // optional if user uses OpenAI, Groq etc.
  jwt: ""     // optional if server uses JWT
};

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function ensureConfigFile(): void {
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
  }
}

function getConfig(): Record<string, any> {
  ensureConfigDir();
  ensureConfigFile();

  const configContent = fs.readFileSync(CONFIG_PATH, "utf-8");
  return JSON.parse(configContent);
}

function updateConfig(newConfig: Record<string, any>): void {
  ensureConfigDir();
  ensureConfigFile();

  const config = getConfig();

  // Prevent nested defaultConfig key
  if ('defaultConfig' in newConfig) {
    delete newConfig.defaultConfig;
  }

  const updatedConfig = { ...config, ...newConfig };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(updatedConfig, null, 2));
}

function getConfigValue(key: string): any {
  const config = getConfig();
  return config[key];
}

function setConfigValue(key: string, value: any): void {
  const config = getConfig();
  config[key] = value;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function resetConfig(): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
}

function configExists(): boolean {
  return fs.existsSync(CONFIG_PATH);
}

function deleteConfig(): void {
  if (fs.existsSync(CONFIG_PATH)) {
    fs.unlinkSync(CONFIG_PATH);
  }
}

function validateConfig(): boolean {
  try {
    const config = getConfig();
    console.log(config);

    // Check if required fields exist
    if (!config.provider) {
      return false;
    }

    // Provider-specific validation
    switch (config.provider) {
      case 'server':
        return !!(config.serverUrl && config.jwt);
      case 'openai':
      case 'groq':
      case 'anthropic':
        return !!config.apiKey;
      case 'ollama':
        return !!config.ollamaUrl;
      default:
        return false;
    }
  } catch (error) {
    return false;
  }
}

export {
  ensureConfigDir,
  ensureConfigFile,
  getConfig,
  updateConfig,
  getConfigValue,
  setConfigValue,
  resetConfig,
  configExists,
  deleteConfig,
  validateConfig,
  CONFIG_PATH,
  CONFIG_DIR,
  DEFAULT_CONFIG,
};