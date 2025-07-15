// lib/setup/setupMenu.ts
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import figlet from 'figlet';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import { updateConfig, CONFIG_PATH, setConfigValue, validateConfig, getConfigValue } from '../config/helper';
import { initiateDeviceAuth, pollForToken } from '../../auth/startAuth';
import axios from 'axios';

const execAsync = promisify(exec);

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
        value: 'anthropic',
        short: 'Anthropic'
    },
    {
        name: '🦙 Ollama - Local AI models',
        value: 'ollama',
        short: 'Ollama'
    }
];

// Helper functions
function getApiKeyInstructions(provider: string): string {
    const instructions = {
        openai: 'Get your API key from: https://platform.openai.com/account/api-keys',
        groq: 'Get your API key from: https://console.groq.com/keys',
        anthropic: 'Get your API key from: https://console.anthropic.com/account/keys'
    };

    return instructions[provider as keyof typeof instructions] || 'Please provide your API key:';
}

function validateApiKeyFormat(provider: string, apiKey: string): boolean {
    const patterns = {
        openai: /^sk-[a-zA-Z0-9]{48}$/,
        groq: /^gsk_[a-zA-Z0-9]{52}$/,
        anthropic: /^sk-ant-[a-zA-Z0-9\-_]{95}$/
    };

    const pattern = patterns[provider as keyof typeof patterns];
    return pattern ? pattern.test(apiKey) : apiKey.length > 10;
}

async function testApiKey(provider: string, apiKey: string): Promise<void> {
    // TODO: Implement actual API key testing
    return new Promise((resolve) => {
        setTimeout(resolve, 1000);
    });
}

async function checkOllamaInstalled(): Promise<boolean> {
    try {
        await execAsync('which ollama');
        return true;
    } catch {
        return false;
    }
}

async function checkOllamaRunning(): Promise<boolean> {
    try {
        await execAsync('curl -s http://localhost:11434/api/tags');
        return true;
    } catch {
        return false;
    }
}

async function getOllamaModels(): Promise<string[]> {
    try {
        const { stdout } = await execAsync('ollama list');
        return stdout.split('\n')
            .slice(1)
            .filter(line => line.trim())
            .map(line => line.split(/\s+/)[0]);
    } catch {
        return [];
    }
}

async function installOllamaModel(): Promise<void> {
    const spinner = ora('Installing model (this may take a few minutes)...').start();

    try {
        await execAsync('ollama pull llama3.1:8b');
        spinner.succeed('Model installed successfully!');
    } catch (error) {
        spinner.fail('Failed to install model');
        console.log(chalk.red('❌ Please run manually: ollama pull llama3.1:8b'));
        throw error;
    }
}

// Main setup functions
async function showWelcome(): Promise<void> {
    console.clear();

    const title = figlet.textSync('Senpai CLI', {
        font: 'Small',
        horizontalLayout: 'default'
    });

    const welcomeBox = boxen(
        chalk.cyan(title) + '\n\n' +
        chalk.white('Your AI-powered terminal command assistant') + '\n' +
        chalk.gray('Let\'s get you set up! This will only take a minute.'),
        {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'cyan',
            backgroundColor: 'black'
        }
    );

    console.log(welcomeBox);
}

async function selectProvider(): Promise<string> {
    const { provider } = await inquirer.prompt([
        {
            type: 'list',
            name: 'provider',
            message: '📡 Choose your AI provider:',
            choices: providerChoices,
            pageSize: 10
        }
    ]);

    return provider;
}

async function handleServerAuth(): Promise<{ jwt: string }> {
    const { authflow } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'authflow',
            message: '🔐 lets login to your Senpai Cloud account?',
            default: true
        }
    ]);

    // implemented the device based cli authentication
    try {
        if (authflow) {
            console.log("inside line 175");
        }
        const { deviceCode } = await initiateDeviceAuth();
        console.log("device code is : ", deviceCode)
        const token = await pollForToken(deviceCode);
        console.log('Received access token:', token);
        setConfigValue("jwt", token);
        return { jwt: token as string };
        // Optional: Verify token by making a request to /api/user
        // const user = await axios.get(`https://localhost:3000/api/device`, {
        //     headers: { Authorization: `Bearer ${token}` }
        // });

        // console.log('Authenticated as:', user.data.user);
    } catch (error) {
        console.error('Authentication failed:', error);
        process.exit(1);
    }
}

async function handleApiKeyInput(provider: string): Promise<string> {
    const instructions = getApiKeyInstructions(provider);

    console.log(chalk.gray('\n📋 ' + instructions));
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
                    return 'Invalid API key format';
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
        return apiKey;
    } catch (error) {
        spinner.fail('API key validation failed');

        const { retry } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'retry',
                message: '❌ API key validation failed. Try again?',
                default: true
            }
        ]);

        if (retry) {
            return handleApiKeyInput(provider);
        } else {
            throw new Error('Valid API key required to continue');
        }
    }
}

async function handleOllamaSetup(): Promise<{ ollamaUrl: string }> {
    const spinner = ora('Checking Ollama installation...').start();

    const isInstalled = await checkOllamaInstalled();

    if (!isInstalled) {
        spinner.fail('Ollama is not installed');
        console.log(chalk.yellow('⚠️  Please install Ollama from: https://ollama.com/download'));

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
        console.log(chalk.yellow('⚠️  Please start Ollama with: ollama serve'));

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
    } else {
        spinner.succeed('Ollama is running');
    }

    // Check models
    spinner.start('Checking available models...');
    const models = await getOllamaModels();

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
            await installOllamaModel();
        }
    } else {
        spinner.succeed(`Found ${models.length} model(s)`);
    }

    const { ollamaUrl } = await inquirer.prompt([
        {
            type: 'input',
            name: 'ollamaUrl',
            message: '🌐 Ollama URL:',
            default: 'http://localhost:11434',
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

    return { ollamaUrl };
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
    } else if (config.provider === 'ollama') {
        configDetails.push(`Ollama URL: ${config.ollamaUrl}`);
    }

    const summaryBox = boxen(
        chalk.bold('📋 Configuration Summary\n\n') +
        configDetails.map(detail => `• ${detail}`).join('\n') +
        '\n\n' +
        chalk.cyan('🚀 Try these commands:\n') +
        chalk.white('• senpai generate "list all files"\n') +
        chalk.white('• senpai explain "ls -la"\n') +
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
}













// Main setup flow
export async function runSetup(): Promise<void> {
    try {
        // Check if already configured
        if (fs.existsSync(CONFIG_PATH)) {
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

        await showWelcome();

        const provider = await selectProvider();
        let config: any = { provider };

        // Handle provider-specific setup
        switch (provider) {
            case 'server':
                // check if the config has both jwt and serverUrl and if not get one
                console.log("calling from line 413")
                if (!validateConfig()) {
                    const auth = await handleServerAuth();
                    config = { ...config, ...auth };
                }
                console.log("trying login from line 422")
                const auth = await handleServerAuth();
                config = { ...config, ...auth };
                break;

            case 'openai':
            case 'groq':
            case 'anthropic':
                config.apiKey = await handleApiKeyInput(provider);
                break;

            case 'ollama':
                const ollamaConfig = await handleOllamaSetup();
                config = { ...config, ...ollamaConfig };
                break;
        }

        // Save configuration
        const spinner = ora('Saving configuration...').start();
        updateConfig(config);
        spinner.succeed('Configuration saved!');

        await showSummary(config);

    } catch (error) {
        console.log(chalk.red(`\n❌ Setup failed: ${error instanceof Error ? error.message : error}`));
        console.log(chalk.yellow('💡 You can run setup again with: senpai config --setup'));
        process.exit(1);
    }
}

// Export utility function
export function needsSetup(): boolean {
    return !fs.existsSync(CONFIG_PATH);
}