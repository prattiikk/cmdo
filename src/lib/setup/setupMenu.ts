// lib/setup/setupMenu.ts
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import figlet from 'figlet';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import { updateConfig, CONFIG_PATH, setConfigValue, validateConfig, getConfigValue, getConfig } from '../config/helper';
import { initiateDeviceAuth, pollForToken } from '../../auth/startAuth';
import axios from 'axios';

const execAsync = promisify(exec);

// Enhanced logging utility
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
    disabled?: boolean | string;
}

const providerChoices: ProviderChoice[] = [
    {
        name: '☁️  Senpai Cloud (Recommended) - Managed service with auth',
        value: 'server',
        short: 'Senpai Cloud'
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

// Enhanced provider information
const providerInfo = {
    openai: {
        apiKeyUrl: 'https://platform.openai.com/account/api-keys',
        pattern: /^sk-[a-zA-Z0-9]{48}$/,
        models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        testEndpoint: 'https://api.openai.com/v1/models'
    },
    groq: {
        apiKeyUrl: 'https://console.groq.com/keys',
        pattern: /^gsk_[a-zA-Z0-9]{52}$/,
        models: ['llama3-8b-8192', 'llama3-70b-8192', 'mixtral-8x7b-32768'],
        testEndpoint: 'https://api.groq.com/openai/v1/models'
    },
    claude: {
        apiKeyUrl: 'https://console.anthropic.com/account/keys',
        pattern: /^sk-ant-[a-zA-Z0-9\-_]{95}$/,
        models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
        testEndpoint: 'https://api.anthropic.com/v1/messages'
    },
    openrouterai: {
        apiKeyUrl: 'https://openrouter.ai/keys',
        pattern: /^sk-or-[a-zA-Z0-9\-_]{43}$/,
        models: ['openai/gpt-4', 'anthropic/claude-3-opus', 'meta-llama/llama-3-8b-instruct'],
        testEndpoint: 'https://openrouter.ai/api/v1/models'
    },
    togetherai: {
        apiKeyUrl: 'https://api.together.xyz/settings/api-keys',
        pattern: /^[A-Za-z0-9\-_]{40,80}$/,
        models: ['meta-llama/Llama-2-7b-chat-hf', 'meta-llama/Llama-2-13b-chat-hf'],
        testEndpoint: 'https://api.together.xyz/v1/models'
    },
    huggingface: {
        apiKeyUrl: 'https://huggingface.co/settings/tokens',
        pattern: /^hf_[a-zA-Z0-9]{37}$/,
        models: ['microsoft/DialoGPT-medium', 'microsoft/DialoGPT-large'],
        testEndpoint: 'https://api-inference.huggingface.co/models'
    },
    replicate: {
        apiKeyUrl: 'https://replicate.com/account/api-tokens',
        pattern: /^r8_[a-zA-Z0-9]{32}$/,
        models: ['meta/llama-2-7b-chat', 'meta/llama-2-13b-chat'],
        testEndpoint: 'https://api.replicate.com/v1/models'
    },
    deepinfra: {
        apiKeyUrl: 'https://deepinfra.com/dash/api_keys',
        pattern: /^[a-zA-Z0-9]{32}$/,
        models: ['meta-llama/Llama-2-7b-chat-hf', 'meta-llama/Llama-2-13b-chat-hf'],
        testEndpoint: 'https://api.deepinfra.com/v1/openai/models'
    }
};

// Enhanced helper functions
function getApiKeyInstructions(provider: string): string {
    const info = providerInfo[provider as keyof typeof providerInfo];
    if (!info) {
        return 'Please provide your API key:';
    }

    return `Get your API key from: ${info.apiKeyUrl}`;
}

function validateApiKeyFormat(provider: string, apiKey: string): boolean {
    const info = providerInfo[provider as keyof typeof providerInfo];
    if (!info?.pattern) {
        return apiKey.length > 10; // Basic validation
    }

    return info.pattern.test(apiKey);
}

async function testApiKey(provider: string, apiKey: string): Promise<void> {

    const info = providerInfo[provider as keyof typeof providerInfo];
    if (!info?.testEndpoint) {
        // Skip testing for providers without test endpoints
        return;
    }

    try {
        let headers: Record<string, string> = {};
        let url = info.testEndpoint;

        switch (provider) {
            case 'openai':
            case 'groq':
            case 'openrouterai':
            case 'togetherai':
            case 'deepinfra':
                headers['Authorization'] = `Bearer ${apiKey}`;
                break;
            case 'claude':
                headers['x-api-key'] = apiKey;
                headers['anthropic-version'] = '2023-06-01';
                // For Claude, we need to test with a simple message
                url = 'https://api.anthropic.com/v1/messages';
                break;
            case 'huggingface':
                headers['Authorization'] = `Bearer ${apiKey}`;
                break;
            case 'replicate':
                headers['Authorization'] = `Token ${apiKey}`;
                break;
        }

        if (provider === 'claude') {
            // Special test for Claude API
            await axios.post(url, {
                model: 'claude-3-haiku-20240307',
                max_tokens: 1,
                messages: [{ role: 'user', content: 'test' }]
            }, { headers, timeout: 5000 });
        } else {
            await axios.get(url, { headers, timeout: 5000 });
        }

        logger.info(`API key test successful for ${provider}`);
    } catch (error: any) {
        logger.error(`API key test failed for ${provider}:`, error.message);

        if (error.response?.status === 401) {
            throw new Error('Invalid API key');
        } else if (error.response?.status === 403) {
            throw new Error('API key does not have required permissions');
        } else if (error.response?.status === 429) {
            throw new Error('API rate limit exceeded');
        } else if (error.code === 'ECONNABORTED') {
            throw new Error('Request timeout - API service may be unavailable');
        } else {
            throw new Error(`API test failed: ${error.message}`);
        }
    }
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
            .slice(1) // Skip header
            .filter(line => line.trim())
            .map(line => line.split(/\s+/)[0])
            .filter(model => model && !model.includes('NAME')); // Filter out header remnants

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
        await execAsync(`ollama pull ${modelName}`, { timeout: 600000 }); // 10 minute timeout
        spinner.succeed(`Model ${modelName} installed successfully!`);
        logger.info(`Successfully installed Ollama model: ${modelName}`);
    } catch (error: any) {
        spinner.fail(`Failed to install model ${modelName}`);
        logger.error(`Failed to install Ollama model ${modelName}:`, error);
        console.log(chalk.red(`❌ Please run manually: ollama pull ${modelName}`));
        throw error;
    }
}

// Enhanced main setup functions
async function showWelcome(): Promise<void> {
    console.clear();

    const title = figlet.textSync('Senpai CLI', {
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
        const { authflow } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'authflow',
                message: '🔐 Login to your Senpai Cloud account?',
                default: true
            }
        ]);

        if (!authflow) {
            throw new Error('Authentication cancelled by user');
        }

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

        const serverUrl = process.env.SENPAI_SERVER_URL || 'https://api.senpai.dev';

        // Store configuration
        setConfigValue("jwt", token);
        setConfigValue("serverUrl", serverUrl);

        // Optional: Verify token
        try {
            const verifySpinner = ora('Verifying authentication...').start();
            await axios.get(`${serverUrl}/api/user`, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 5000
            });
            verifySpinner.succeed('Authentication verified');
        } catch (error) {
            logger.warn('Could not verify authentication, but proceeding:', error);
        }

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

    // Test API key
    const spinner = ora('Testing API key...').start();

    try {
        await testApiKey(provider, apiKey);
        spinner.succeed('API key validated successfully!');
    } catch (error: any) {
        spinner.fail('API key validation failed');
        logger.error('API key validation error:', error);

        console.log(chalk.red(`❌ ${error.message}`));

        const { retry } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'retry',
                message: 'Try again with a different API key?',
                default: true
            }
        ]);

        if (retry) {
            return handleApiKeyInput(provider);
        } else {
            throw new Error('Valid API key required to continue');
        }
    }

    // Ask for model selection if available
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

        // Check if running
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

            // Check again
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

        // Check models
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
        chalk.white('• senpai generate "list all files"\n') +
        chalk.white('• senpai explain "ls -la"\n') +
        chalk.white('• senpai config --show\n') +
        chalk.white('• senpai help'),
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

// Enhanced main setup flow
export async function runSetup(): Promise<void> {
    try {
        // Check if already configured
        if (fs.existsSync(CONFIG_PATH)) {
            const currentConfig = validateConfig();
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

        // Handle provider-specific setup
        switch (provider) {
            case 'server':
                const existingJwt = getConfigValue("jwt");
                const existingServerUrl = getConfigValue("serverUrl");

                if (existingJwt && existingServerUrl) {
                    const { useExisting } = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'useExisting',
                            message: '🔐 Found existing authentication. Use it?',
                            default: true
                        }
                    ]);

                    if (useExisting) {
                        config = { ...config, jwt: existingJwt, serverUrl: existingServerUrl };
                        break;
                    }
                }

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

        // Save configuration
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
        console.log(chalk.yellow('💡 You can run setup again with: senpai config --setup'));

        // Show troubleshooting tips
        console.log(chalk.gray('\n🔍 Troubleshooting tips:'));
        console.log(chalk.gray('• Check your internet connection'));
        console.log(chalk.gray('• Verify API key format and permissions'));
        console.log(chalk.gray('• Ensure required services are running'));
        console.log(chalk.gray('• Check the logs for more details'));

        process.exit(1);
    }
}

// Enhanced utility functions
export function needsSetup(): boolean {
    try {
        return !fs.existsSync(CONFIG_PATH) || !validateConfig();
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