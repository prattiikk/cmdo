// lib/setup/setupMenu.ts
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import figlet from 'figlet';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import { updateConfig, CONFIG_PATH, setConfigValue, getConfig } from '../config/helper';
import { initiateDeviceAuth, pollForToken } from '../../auth/startAuth';
import axios from 'axios';
import { CONFIG } from '../../config';

const execAsync = promisify(exec);

const logger = {
    info: (message: string, data?: any) => {
        console.info(`[Setup] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    },
    error: (message: string, error?: any) => {
        console.error(`[Setup] ${message}`, error);
    },
    warn: (message: string, data?: any) => {
        console.warn(`[Setup] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    },
    debug: (message: string, data?: any) => {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[Setup] ${message}`, data ? JSON.stringify(data, null, 2) : '');
        }
    }
};

interface ProviderChoice {
    name: string;
    value: string;
    short?: string;
}

const providerChoices: ProviderChoice[] = [
    {
        name: '☁️  cmdo Cloud (Recommended) - Managed service with auth',
        value: 'server',
        short: 'cmdo Cloud'
    },
    {
        name: '🤖 OpenAI - GPT-4 and GPT-3.5 models',
        value: 'openai',
        short: 'OpenAI'
    },
    {
        name: '⚡ Groq - Lightning-fast inference',
        value: 'groq',
        short: 'Groq'
    },
    {
        name: '🧠 Anthropic Claude - Claude 3 models',
        value: 'claude',
        short: 'Anthropic'
    },
    {
        name: '🌐 OpenRouter - Access to multiple models',
        value: 'openrouterai',
        short: 'OpenRouter'
    },
    {
        name: '🤝 Together AI - Collaborative AI platform',
        value: 'togetherai',
        short: 'Together'
    },
    {
        name: '🤗 Hugging Face - Open source models',
        value: 'huggingface',
        short: 'HuggingFace'
    },
    {
        name: '🔄 Replicate - Cloud AI models',
        value: 'replicate',
        short: 'Replicate'
    },
    {
        name: '🚀 DeepInfra - Fast AI inference',
        value: 'deepinfra',
        short: 'DeepInfra'
    },
    {
        name: '🦙 Ollama - Local AI models',
        value: 'ollama',
        short: 'Ollama'
    }
];

const providerInfo = {
    openai: {
        apiKeyUrl: 'https://platform.openai.com/account/api-keys',
        pattern: /^sk-[a-zA-Z0-9]{48}$/,
        models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo']
    },
    groq: {
        apiKeyUrl: 'https://console.groq.com/keys',
        pattern: /^gsk_[a-zA-Z0-9]{52}$/,
        models: ['llama3-8b-8192', 'llama3-70b-8192', 'mixtral-8x7b-32768']
    },
    claude: {
        apiKeyUrl: 'https://console.anthropic.com/account/keys',
        pattern: /^sk-ant-[a-zA-Z0-9\-_]{95}$/,
        models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
    },
    openrouterai: {
        apiKeyUrl: 'https://openrouter.ai/keys',
        pattern: /^sk-or-[a-zA-Z0-9\-_]{43}$/,
        models: ['openai/gpt-4', 'anthropic/claude-3-opus', 'meta-llama/llama-3-8b-instruct']
    },
    togetherai: {
        apiKeyUrl: 'https://api.together.xyz/settings/api-keys',
        pattern: /^[A-Za-z0-9\-_]{40,80}$/,
        models: ['meta-llama/Llama-2-7b-chat-hf', 'meta-llama/Llama-2-13b-chat-hf']
    },
    huggingface: {
        apiKeyUrl: 'https://huggingface.co/settings/tokens',
        pattern: /^hf_[a-zA-Z0-9]{37}$/,
        models: ['microsoft/DialoGPT-medium', 'microsoft/DialoGPT-large']
    },
    replicate: {
        apiKeyUrl: 'https://replicate.com/account/api-tokens',
        pattern: /^r8_[a-zA-Z0-9]{32}$/,
        models: ['meta/llama-2-7b-chat', 'meta/llama-2-13b-chat']
    },
    deepinfra: {
        apiKeyUrl: 'https://deepinfra.com/dash/api_keys',
        pattern: /^[a-zA-Z0-9]{32}$/,
        models: ['meta-llama/Llama-2-7b-chat-hf', 'meta-llama/Llama-2-13b-chat-hf']
    }
};

function getApiKeyInstructions(provider: string): string {
    const info = providerInfo[provider as keyof typeof providerInfo];
    return info ? `Get your API key from: ${info.apiKeyUrl}` : 'Please provide your API key:';
}

function validateApiKeyFormat(provider: string, apiKey: string): boolean {
    const info = providerInfo[provider as keyof typeof providerInfo];
    return info?.pattern ? info.pattern.test(apiKey) : apiKey.length > 10;
}

async function checkOllamaInstalled(): Promise<boolean> {
    try {
        await execAsync('which ollama || where ollama', { timeout: 5000 });
        return true;
    } catch (error) {
        logger.debug('Ollama not found in PATH', error);
        return false;
    }
}

async function checkOllamaRunning(): Promise<boolean> {
    try {
        const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        await axios.get(`${ollamaUrl}/api/tags`, { timeout: 3000 });
        return true;
    } catch (error) {
        logger.debug('Ollama not running or not accessible', error);
        return false;
    }
}

async function getOllamaModels(): Promise<string[]> {
    try {
        const { stdout } = await execAsync('ollama list', { timeout: 10000 });
        const models = stdout.split('\n')
            .slice(1)
            .filter(line => line.trim())
            .map(line => line.split(/\s+/)[0])
            .filter(model => model && !model.includes('NAME'));

        logger.debug('Found Ollama models:', models);
        return models;
    } catch (error) {
        logger.error('Failed to get Ollama models:', error);
        return [];
    }
}

async function installOllamaModel(modelName: string = 'llama3.1:8b'): Promise<void> {
    const spinner = ora(`Installing model ${modelName} (this may take a few minutes)...`).start();

    try {
        await execAsync(`ollama pull ${modelName}`, { timeout: 600000 });
        spinner.succeed(`Model ${modelName} installed successfully!`);
        logger.info(`Successfully installed Ollama model: ${modelName}`);
    } catch (error: any) {
        spinner.fail(`Failed to install model ${modelName}`);
        logger.error(`Failed to install Ollama model ${modelName}:`, error);
        console.log(chalk.red(`❌ Please run manually: ollama pull ${modelName}`));
        throw error;
    }
}

async function showWelcome(): Promise<void> {
    console.clear();

    const title = figlet.textSync('cmdo CLI', {
        font: 'Small',
        horizontalLayout: 'default'
    });

    const welcomeBox = boxen(
        chalk.cyan(title) + '\n\n' +
        chalk.white('Your AI-powered terminal command assistant') + '\n' +
        chalk.gray('Let\'s get you set up! This will only take a minute.') + '\n\n' +
        chalk.dim('📋 This setup will configure your AI provider and credentials'),
        {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'cyan',
            backgroundColor: 'black'
        }
    );

    console.log(welcomeBox);
    logger.info('Starting setup process');
}

async function selectProvider(): Promise<string> {
    const { provider } = await inquirer.prompt([
        {
            type: 'list',
            name: 'provider',
            message: '📡 Choose your AI provider:',
            choices: providerChoices,
            pageSize: 12
        }
    ]);

    logger.info('Selected provider:', provider);
    return provider;
}

async function handleServerAuth(): Promise<{ jwt: string; serverUrl: string }> {
    try {
        const serverUrl = getConfig().serverUrl || CONFIG.BACKEND_URL;
        logger.info('Starting device authentication flow');
        const spinner = ora('Initiating authentication...').start();

        const { deviceCode } = await initiateDeviceAuth();
        spinner.succeed('Authentication initiated');

        logger.debug('Device code received:', deviceCode);

        const token = await pollForToken(deviceCode);

        if (!token) {
            throw new Error('Failed to receive authentication token');
        }

        logger.info('Authentication successful');

        setConfigValue("jwt", token);
        setConfigValue("serverUrl", serverUrl);

        return { jwt: token as string, serverUrl };

    } catch (error: any) {
        logger.error('Authentication failed:', error);
        throw new Error(`Authentication failed: ${error.message}`);
    }
}

async function handleApiKeyInput(provider: string): Promise<{ apiKey: string; model?: string }> {
    const instructions = getApiKeyInstructions(provider);
    const info = providerInfo[provider as keyof typeof providerInfo];

    console.log(chalk.gray('\n📋 ' + instructions));
    if (info?.models) {
        console.log(chalk.gray('   Popular models: ' + info.models.slice(0, 3).join(', ')));
    }
    console.log(chalk.gray('   Copy your API key from the link above\n'));

    const { apiKey } = await inquirer.prompt([
        {
            type: 'password',
            name: 'apiKey',
            message: '🔑 Enter your API key:',
            mask: '*',
            validate: (input: string) => {
                if (!input || input.trim().length === 0) {
                    return 'API key cannot be empty';
                }

                if (!validateApiKeyFormat(provider, input)) {
                    return 'Invalid API key format. Please check your API key.';
                }

                return true;
            }
        }
    ]);

    let model: string | undefined;
    if (info?.models && info.models.length > 0) {
        const { selectedModel } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedModel',
                message: '🤖 Choose a model:',
                choices: [
                    ...info.models.map(m => ({ name: m, value: m })),
                    { name: 'Custom model name', value: 'custom' }
                ],
                default: info.models[0]
            }
        ]);

        if (selectedModel === 'custom') {
            const { customModel } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'customModel',
                    message: 'Enter model name:',
                    validate: (input: string) => {
                        if (!input || input.trim().length === 0) {
                            return 'Model name cannot be empty';
                        }
                        return true;
                    }
                }
            ]);
            model = customModel;
        } else {
            model = selectedModel;
        }
    }

    return { apiKey, model };
}

async function handleOllamaSetup(): Promise<{ ollamaUrl: string; model?: string }> {
    const spinner = ora('Checking Ollama installation...').start();

    try {
        const isInstalled = await checkOllamaInstalled();

        if (!isInstalled) {
            spinner.fail('Ollama is not installed');
            console.log(chalk.yellow('⚠️  Please install Ollama from: https://ollama.com/download'));
            console.log(chalk.gray('   Installation instructions:'));
            console.log(chalk.gray('   • macOS: brew install ollama'));
            console.log(chalk.gray('   • Linux: curl -fsSL https://ollama.com/install.sh | sh'));
            console.log(chalk.gray('   • Windows: Download from https://ollama.com/download'));

            const { continueSetup } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'continueSetup',
                    message: 'Continue with Ollama setup after installation?',
                    default: false
                }
            ]);

            if (!continueSetup) {
                throw new Error('Ollama installation required');
            }
        } else {
            spinner.succeed('Ollama is installed');
        }

        spinner.start('Checking if Ollama is running...');
        const isRunning = await checkOllamaRunning();

        if (!isRunning) {
            spinner.fail('Ollama is not running');
            console.log(chalk.yellow('⚠️  Please start Ollama:'));
            console.log(chalk.gray('   • Run: ollama serve'));
            console.log(chalk.gray('   • Or start Ollama app if installed via GUI'));

            const { continueSetup } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'continueSetup',
                    message: 'Continue after starting Ollama?',
                    default: false
                }
            ]);

            if (!continueSetup) {
                throw new Error('Ollama needs to be running');
            }

            spinner.start('Rechecking Ollama status...');
            const isRunningNow = await checkOllamaRunning();
            if (!isRunningNow) {
                spinner.fail('Ollama is still not running');
                throw new Error('Please start Ollama and try again');
            }
            spinner.succeed('Ollama is now running');
        } else {
            spinner.succeed('Ollama is running');
        }

        spinner.start('Checking available models...');
        const models = await getOllamaModels();

        let selectedModel: string | undefined;

        if (models.length === 0) {
            spinner.warn('No models found');

            const { installModel } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'installModel',
                    message: '📦 Install recommended model (llama3.1:8b)?',
                    default: true
                }
            ]);

            if (installModel) {
                await installOllamaModel('llama3.1:8b');
                selectedModel = 'llama3.1:8b';
            }
        } else {
            spinner.succeed(`Found ${models.length} model(s)`);

            const { model } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'model',
                    message: '🤖 Choose a model:',
                    choices: [
                        ...models.map(m => ({ name: m, value: m })),
                        { name: 'Install a new model', value: 'install' }
                    ],
                    default: models[0]
                }
            ]);

            if (model === 'install') {
                const { newModel } = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'newModel',
                        message: 'Enter model name to install:',
                        default: 'llama3.1:8b',
                        validate: (input: string) => {
                            if (!input || input.trim().length === 0) {
                                return 'Model name cannot be empty';
                            }
                            return true;
                        }
                    }
                ]);

                await installOllamaModel(newModel);
                selectedModel = newModel;
            } else {
                selectedModel = model;
            }
        }

        const { ollamaUrl } = await inquirer.prompt([
            {
                type: 'input',
                name: 'ollamaUrl',
                message: '🌐 Ollama URL:',
                default: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
                validate: (input: string) => {
                    try {
                        new URL(input);
                        return true;
                    } catch {
                        return 'Please enter a valid URL';
                    }
                }
            }
        ]);

        return { ollamaUrl, model: selectedModel };
    } catch (error: any) {
        spinner.fail('Ollama setup failed');
        logger.error('Ollama setup error:', error);
        throw error;
    }
}

async function showSummary(config: any): Promise<void> {
    const providerInfo = providerChoices.find(p => p.value === config.provider);

    let configDetails = [
        `Provider: ${providerInfo?.short || config.provider}`
    ];

    if (config.provider === 'server') {
        configDetails.push(`Server: ${config.serverUrl}`);
        configDetails.push('Authentication: ✅ Configured');
    } else if (config.apiKey) {
        configDetails.push('API Key: ✅ Configured');
        if (config.model) {
            configDetails.push(`Model: ${config.model}`);
        }
    } else if (config.provider === 'ollama') {
        configDetails.push(`Ollama URL: ${config.ollamaUrl}`);
        if (config.model) {
            configDetails.push(`Model: ${config.model}`);
        }
    }

    const summaryBox = boxen(
        chalk.bold('📋 Configuration Summary\n\n') +
        configDetails.map(detail => `• ${detail}`).join('\n') +
        '\n\n' +
        chalk.cyan('🚀 Try these commands:\n') +
        chalk.white('• cmdo generate "list all files"\n') +
        chalk.white('• cmdo explain "ls -la"\n') +
        chalk.white('• cmdo config --show\n') +
        chalk.white('• cmdo help'),
        {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'green',
            title: '🎉 Setup Complete!'
        }
    );

    console.log(summaryBox);
    logger.info('Setup completed successfully', config);
}

export async function runSetup(): Promise<void> {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const currentConfig = getConfig();
            if (currentConfig) {
                const { reconfigure } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'reconfigure',
                        message: '⚠️  Configuration already exists. Reconfigure?',
                        default: false
                    }
                ]);

                if (!reconfigure) {
                    console.log(chalk.green('✅ Using existing configuration.'));
                    return;
                }
            }
        }

        await showWelcome();

        const provider = await selectProvider();
        let config: any = { provider };

        switch (provider) {
            case 'server':
                const auth = await handleServerAuth();
                config = { ...config, ...auth };
                break;

            case 'openai':
            case 'groq':
            case 'claude':
            case 'openrouterai':
            case 'togetherai':
            case 'huggingface':
            case 'replicate':
            case 'deepinfra':
                const apiConfig = await handleApiKeyInput(provider);
                config = { ...config, ...apiConfig };
                break;

            case 'ollama':
                const ollamaConfig = await handleOllamaSetup();
                config = { ...config, ...ollamaConfig };
                break;

            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }

        const spinner = ora('Saving configuration...').start();
        try {
            updateConfig(config);
            spinner.succeed('Configuration saved!');
        } catch (error: any) {
            spinner.fail('Failed to save configuration');
            throw new Error(`Configuration save failed: ${error.message}`);
        }

        await showSummary(config);

    } catch (error: any) {
        logger.error('Setup failed:', error);
        console.log(chalk.red(`\n❌ Setup failed: ${error.message}`));
        console.log(chalk.yellow('💡 You can run setup again with: cmdo config --setup'));

        console.log(chalk.gray('\n🔍 Troubleshooting tips:'));
        console.log(chalk.gray('• Check your internet connection'));
        console.log(chalk.gray('• Verify API key format and permissions'));
        console.log(chalk.gray('• Ensure required services are running'));
        console.log(chalk.gray('• Check the logs for more details'));

        process.exit(1);
    }
}

export function needsSetup(): boolean {
    try {
        return !fs.existsSync(CONFIG_PATH) || !getConfig();
    } catch (error) {
        logger.error('Error checking setup status:', error);
        return true;
    }
}

export function getSetupStatus(): { needsSetup: boolean; provider?: string; configured: boolean } {
    try {
        if (!fs.existsSync(CONFIG_PATH)) {
            return { needsSetup: true, configured: false };
        }

        const config = getConfig();
        if (!config) {
            return { needsSetup: true, configured: false };
        }

        return {
            needsSetup: false,
            provider: config.provider,
            configured: true
        };
    } catch (error) {
        logger.error('Error getting setup status:', error);
        return { needsSetup: true, configured: false };
    }
}