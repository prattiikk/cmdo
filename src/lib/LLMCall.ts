import dotenv from "dotenv";
dotenv.config();

import { getConfig, getConfigValue } from "../lib/config/helper";
import Groq from "groq-sdk";
import axios, { AxiosError } from "axios";

// Add logging utility
const logger = {
    info: (message: string, data?: any) => {
        console.info(`[AI-Provider] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    },
    error: (message: string, error?: any) => {
        console.error(`[AI-Provider] ${message}`, error);
    },
    warn: (message: string, data?: any) => {
        console.warn(`[AI-Provider] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    },
    debug: (message: string, data?: any) => {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[AI-Provider] ${message}`, data ? JSON.stringify(data, null, 2) : '');
        }
    }
};

export interface AskAIResponse {
    response: string;
    error?: string;
    provider?: string;
    model?: string;
    timestamp?: number;
}

interface AskAIOptions {
    systemPrompt: string;
    userPrompt: string;
    model?: string;
}

// Enhanced error handling utility
function createErrorResponse(provider: string, error: string, model?: string): AskAIResponse {
    logger.error(`${provider} API Error:`, error);
    return {
        response: "",
        error,
        provider,
        model,
        timestamp: Date.now()
    };
}

function createSuccessResponse(provider: string, response: string, model?: string): AskAIResponse {
    logger.info(`${provider} API Success`, { responseLength: response.length, model });
    return {
        response,
        provider,
        model,
        timestamp: Date.now()
    };
}

// Validation helpers
function validateApiKey(apiKey: string | undefined, provider: string): string | null {
    if (!apiKey || apiKey.trim() === '') {
        return `${provider} API key is missing. Set it using: senpai config --set apiKey <your-key>`;
    }
    return null;
}

function validateModel(model: string | undefined, provider: string): string | null {
    if (!model || model.trim() === '') {
        return `${provider} model name is missing. Set it using: senpai config --set model <model-name>`;
    }
    return null;
}

// Main function with enhanced error handling
export async function AskAi({
    systemPrompt,
    userPrompt,
}: AskAIOptions): Promise<AskAIResponse> {
    try {
        // Validate input prompts
        if (!systemPrompt || systemPrompt.trim() === '') {
            return createErrorResponse('System', 'System prompt is required and cannot be empty');
        }

        if (!userPrompt || userPrompt.trim() === '') {
            return createErrorResponse('System', 'User prompt is required and cannot be empty');
        }

        const config = getConfig();
        const provider = config.provider || "server";
        const apikey = config.apiKey;
        const model = config.model;

        logger.info(`Making AI request`, { provider, model: model || 'default' });

        switch (provider) {
            case "groq":
                return await callGroq(systemPrompt, userPrompt, model, apikey);
            case "ollama":
                return await callOllama(systemPrompt, userPrompt, model);
            case 'openai':
                return await callOpenAI(systemPrompt, userPrompt, model, apikey);
            case "claude":
                return await callClaude(systemPrompt, userPrompt, model, apikey);
            case "openrouterai":
                return await callOpenRouter(systemPrompt, userPrompt, model, apikey);
            case "togetherai":
                return await callTogether(systemPrompt, userPrompt, model, apikey);
            case "huggingface":
                return await callHuggingFace(systemPrompt, userPrompt, model, apikey);
            case "replicate":
                return await callReplicate(systemPrompt, userPrompt, model, apikey);
            case "deepinfra":
                return await callDeepInfra(systemPrompt, userPrompt, model, apikey);
            case "server":
                return await callCustomServer(systemPrompt, userPrompt);
            default:
                logger.warn(`Unknown provider: ${provider}, falling back to custom server`);
                return await callCustomServer(systemPrompt, userPrompt);
        }
    } catch (error: any) {
        logger.error('Unexpected error in AskAi function:', error);
        return createErrorResponse('System', `Unexpected error: ${error.message}`);
    }
}

async function callGroq(systemPrompt: string, userPrompt: string, model: string, apiKey: string): Promise<AskAIResponse> {
    const provider = 'Groq';

    // Validate inputs
    const apiKeyError = validateApiKey(apiKey, provider);
    if (apiKeyError) return createErrorResponse(provider, apiKeyError);

    const modelError = validateModel(model, provider);
    if (modelError) return createErrorResponse(provider, modelError);

    const groq = new Groq({ apiKey });

    try {
        const completion = await groq.chat.completions.create({
            model: model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 2048,
        });

        const result = completion.choices[0]?.message?.content?.trim() || "";

        if (!result) {
            return createErrorResponse(provider, 'No response content received from Groq API');
        }

        return createSuccessResponse(provider, result, model);
    } catch (err: any) {
        const errorMessage = err.response?.data?.error?.message || err.message || 'Unknown Groq API error';
        return createErrorResponse(provider, `Groq API error: ${errorMessage}`);
    }
}

async function callOllama(systemPrompt: string, userPrompt: string, model: string): Promise<AskAIResponse> {
    const provider = 'Ollama';
    const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

    const modelError = validateModel(model, provider);
    if (modelError) return createErrorResponse(provider, modelError);

    try {
        const response = await axios.post(`${baseUrl}/api/chat`, {
            model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            stream: false,
        }, {
            timeout: 30000, // 30 second timeout
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = response.data?.message?.content?.trim() || "";

        if (!result) {
            return createErrorResponse(provider, 'No response content received from Ollama API');
        }

        return createSuccessResponse(provider, result, model);
    } catch (err: any) {
        if (err.code === 'ECONNREFUSED') {
            return createErrorResponse(provider, `Cannot connect to Ollama server at ${baseUrl}. Make sure Ollama is running.`);
        }

        const errorMessage = err.response?.data?.error || err.message || 'Unknown Ollama error';
        return createErrorResponse(provider, `Ollama error: ${errorMessage}`);
    }
}

async function callCustomServer(systemPrompt: string, userPrompt: string): Promise<AskAIResponse> {
    const provider = 'CustomServer';
    const serverUrl = process.env.CUSTOM_SERVER_URL || "http://localhost:3000";
    const token = getConfigValue("jwt");

    if (!token) {
        return createErrorResponse(provider, 'JWT token is missing. Please authenticate first.');
    }

    try {
        const response = await axios.post(
            `${serverUrl}/api/askai`,
            {
                systemPrompt,
                userPrompt,
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000,
            }
        );

        const result = response.data?.response?.trim() || "";

        if (!result) {
            return createErrorResponse(provider, 'No response content received from custom server');
        }

        return createSuccessResponse(provider, result);
    } catch (err: any) {
        if (err.response?.status === 401) {
            return createErrorResponse(provider, 'Authentication failed. Please check your JWT token.');
        }

        if (err.response?.status === 403) {
            return createErrorResponse(provider, 'Access forbidden. Please check your permissions.');
        }

        const errorMessage = err.response?.data?.message || err.message || 'Unknown server error';
        return createErrorResponse(provider, `Server error: ${errorMessage}`);
    }
}

async function callOpenAI(
    systemPrompt: string,
    userPrompt: string,
    model: string,
    apiKey: string
): Promise<AskAIResponse> {
    const provider = 'OpenAI';

    const apiKeyError = validateApiKey(apiKey, provider);
    if (apiKeyError) return createErrorResponse(provider, apiKeyError);

    const modelError = validateModel(model, provider);
    if (modelError) return createErrorResponse(provider, modelError);

    try {
        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 2048,
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                timeout: 30000,
            }
        );

        const result = response.data.choices[0]?.message?.content?.trim() || "";

        if (!result) {
            return createErrorResponse(provider, 'No response content received from OpenAI API');
        }

        return createSuccessResponse(provider, result, model);
    } catch (err: any) {
        if (err.response?.status === 401) {
            return createErrorResponse(provider, 'Invalid OpenAI API key');
        }

        if (err.response?.status === 429) {
            return createErrorResponse(provider, 'OpenAI API rate limit exceeded. Please try again later.');
        }

        const errorMessage = err.response?.data?.error?.message || err.message || 'Unknown OpenAI error';
        return createErrorResponse(provider, `OpenAI API error: ${errorMessage}`);
    }
}

async function callClaude(
    systemPrompt: string,
    userPrompt: string,
    model: string,
    apiKey: string
): Promise<AskAIResponse> {
    const provider = 'Claude';

    const apiKeyError = validateApiKey(apiKey, provider);
    if (apiKeyError) return createErrorResponse(provider, apiKeyError);

    const modelError = validateModel(model, provider);
    if (modelError) return createErrorResponse(provider, modelError);

    try {
        const response = await axios.post(
            "https://api.anthropic.com/v1/messages",
            {
                model,
                max_tokens: 2048,
                system: systemPrompt,
                messages: [
                    {
                        role: "user",
                        content: userPrompt,
                    },
                ],
            },
            {
                headers: {
                    "x-api-key": apiKey,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                timeout: 30000,
            }
        );

        const result = response.data?.content?.[0]?.text?.trim() || "";

        if (!result) {
            return createErrorResponse(provider, 'No response content received from Claude API');
        }

        return createSuccessResponse(provider, result, model);
    } catch (err: any) {
        if (err.response?.status === 401) {
            return createErrorResponse(provider, 'Invalid Claude API key');
        }

        if (err.response?.status === 429) {
            return createErrorResponse(provider, 'Claude API rate limit exceeded. Please try again later.');
        }

        const errorMessage = err.response?.data?.error?.message || err.message || 'Unknown Claude error';
        return createErrorResponse(provider, `Claude API error: ${errorMessage}`);
    }
}

async function callOpenRouter(
    systemPrompt: string,
    userPrompt: string,
    model: string,
    apiKey: string
): Promise<AskAIResponse> {
    const provider = 'OpenRouter';

    const apiKeyError = validateApiKey(apiKey, provider);
    if (apiKeyError) return createErrorResponse(provider, apiKeyError);

    const payload: any = {
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2048,
    };

    // Add model if provided
    if (model && model.trim() !== '') {
        payload.model = model;
    }

    try {
        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            payload,
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
                    "X-Title": process.env.APP_NAME || "AI Assistant",
                },
                timeout: 30000,
            }
        );

        const result = response.data.choices?.[0]?.message?.content?.trim() || "";

        if (!result) {
            return createErrorResponse(provider, 'No response content received from OpenRouter API');
        }

        return createSuccessResponse(provider, result, model);
    } catch (err: any) {
        if (err.response?.status === 401) {
            return createErrorResponse(provider, 'Invalid OpenRouter API key');
        }

        if (err.response?.status === 429) {
            return createErrorResponse(provider, 'OpenRouter API rate limit exceeded. Please try again later.');
        }

        const errorMessage = err.response?.data?.error?.message || err.message || 'Unknown OpenRouter error';
        return createErrorResponse(provider, `OpenRouter API error: ${errorMessage}`);
    }
}

async function callTogether(
    systemPrompt: string,
    userPrompt: string,
    model: string,
    apiKey: string
): Promise<AskAIResponse> {
    const provider = 'Together';

    const apiKeyError = validateApiKey(apiKey, provider);
    if (apiKeyError) return createErrorResponse(provider, apiKeyError);

    const modelError = validateModel(model, provider);
    if (modelError) return createErrorResponse(provider, modelError);

    try {
        const response = await axios.post(
            "https://api.together.xyz/v1/chat/completions",
            {
                model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 2048,
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                timeout: 30000,
            }
        );

        const result = response.data.choices?.[0]?.message?.content?.trim() || "";

        if (!result) {
            return createErrorResponse(provider, 'No response content received from Together API');
        }

        return createSuccessResponse(provider, result, model);
    } catch (err: any) {
        if (err.response?.status === 401) {
            return createErrorResponse(provider, 'Invalid Together API key');
        }

        if (err.response?.status === 429) {
            return createErrorResponse(provider, 'Together API rate limit exceeded. Please try again later.');
        }

        const errorMessage = err.response?.data?.error?.message || err.message || 'Unknown Together error';
        return createErrorResponse(provider, `Together API error: ${errorMessage}`);
    }
}

async function callHuggingFace(
    systemPrompt: string,
    userPrompt: string,
    model: string,
    apiKey: string
): Promise<AskAIResponse> {
    const provider = 'HuggingFace';

    const apiKeyError = validateApiKey(apiKey, provider);
    if (apiKeyError) return createErrorResponse(provider, apiKeyError);

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
    ];

    const payload: any = { messages };

    // Add model if provided
    if (model && model.trim() !== '') {
        payload.model = model;
    }

    try {
        const response = await axios.post(
            "https://api-inference.huggingface.co/v1/chat/completions",
            payload,
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                timeout: 30000,
            }
        );

        const result = response.data.choices?.[0]?.message?.content?.trim() || "";

        if (!result) {
            return createErrorResponse(provider, 'No response content received from Hugging Face API');
        }

        return createSuccessResponse(provider, result, model);
    } catch (err: any) {
        if (err.response?.status === 401) {
            return createErrorResponse(provider, 'Invalid Hugging Face API token');
        }

        if (err.response?.status === 503) {
            return createErrorResponse(provider, 'Hugging Face model is currently loading. Please try again in a few minutes.');
        }

        const errorMessage = err.response?.data?.error?.message || err.message || 'Unknown Hugging Face error';
        return createErrorResponse(provider, `Hugging Face API error: ${errorMessage}`);
    }
}

async function callReplicate(
    systemPrompt: string,
    userPrompt: string,
    modelVersion: string,
    apiKey: string
): Promise<AskAIResponse> {
    const provider = 'Replicate';

    const apiKeyError = validateApiKey(apiKey, provider);
    if (apiKeyError) return createErrorResponse(provider, apiKeyError);

    const modelError = validateModel(modelVersion, provider);
    if (modelError) return createErrorResponse(provider, modelError);

    // Validate model version format
    if (!modelVersion.includes(':')) {
        return createErrorResponse(provider, 'Invalid model version format. Expected format: owner/model:version');
    }

    const [modelPath, version] = modelVersion.split(':');

    try {
        const response = await axios.post(
            `https://api.replicate.com/v1/models/${modelPath}/predictions`,
            {
                version: version,
                input: {
                    prompt: `${systemPrompt}\n\nUser: ${userPrompt}`,
                    max_tokens: 2048,
                    temperature: 0.7
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    Prefer: "wait",
                },
                timeout: 60000, // Replicate can be slower
            }
        );

        const output = Array.isArray(response.data.output)
            ? response.data.output.join("")
            : response.data.output || "";

        const result = output.trim();

        if (!result) {
            return createErrorResponse(provider, 'No response content received from Replicate API');
        }

        return createSuccessResponse(provider, result, modelVersion);
    } catch (err: any) {
        if (err.response?.status === 401) {
            return createErrorResponse(provider, 'Invalid Replicate API token');
        }

        if (err.response?.status === 404) {
            return createErrorResponse(provider, 'Model not found on Replicate. Please check the model version.');
        }

        const errorMessage = err.response?.data?.detail || err.message || 'Unknown Replicate error';
        return createErrorResponse(provider, `Replicate API error: ${errorMessage}`);
    }
}

async function callDeepInfra(
    systemPrompt: string,
    userPrompt: string,
    model: string,
    apiKey: string
): Promise<AskAIResponse> {
    const provider = 'DeepInfra';

    const apiKeyError = validateApiKey(apiKey, provider);
    if (apiKeyError) return createErrorResponse(provider, apiKeyError);

    const modelError = validateModel(model, provider);
    if (modelError) return createErrorResponse(provider, modelError);

    try {
        const response = await axios.post(
            "https://api.deepinfra.com/v1/openai/chat/completions",
            {
                model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 2048,
                stream: false
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                timeout: 30000,
            }
        );

        const result = response.data.choices?.[0]?.message?.content?.trim() || "";

        if (!result) {
            return createErrorResponse(provider, 'No response content received from DeepInfra API');
        }

        return createSuccessResponse(provider, result, model);
    } catch (err: any) {
        if (err.response?.status === 401) {
            return createErrorResponse(provider, 'Invalid DeepInfra API token');
        }

        if (err.response?.status === 429) {
            return createErrorResponse(provider, 'DeepInfra API rate limit exceeded. Please try again later.');
        }

        const errorMessage = err.response?.data?.error?.message || err.message || 'Unknown DeepInfra error';
        return createErrorResponse(provider, `DeepInfra API error: ${errorMessage}`);
    }
}