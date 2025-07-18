// scripts/postinstall.js
const fs = require("fs");
const path = require("path");
const os = require("os");

const CONFIG_DIR = path.join(os.homedir(), ".config", "senpai");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

const defaultConfig = {
    provider: "server",
    serverUrl: "http://localhost:3000",

};

function createDefaultConfig() {
    try {
        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
        }

        if (!fs.existsSync(CONFIG_PATH)) {
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
            console.log("Senpai: Created default config at", CONFIG_PATH);
        }
    } catch (err) {
        if (err instanceof Error) {
            console.error("Senpai: Failed to create default config:", err.message);
        } else {
            console.error("Senpai: Failed to create default config:", err);
        }
    }
}

createDefaultConfig();