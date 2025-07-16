import dotenv from "dotenv";
dotenv.config();

import { getConfig, getConfigValue } from "../lib/config/helper";
import Groq from "groq-sdk";
import axios from "axios";

export interface AskAIResponse {
    response: string;
    error?: string;
}

interface AskAIOptions {
    systemPrompt: string;
    userPrompt: string;
    model?: string;
}

// Main function
export async function AskAi({
    systemPrompt,
    userPrompt,
    model = "llama3",
}: AskAIOptions): Promise<AskAIResponse> {
    const config = getConfig();
    const provider = config.provider || "server";

    switch (provider) {
        case "groq":
            return callGroq(systemPrompt, userPrompt, config.apiKey); // ✅ match CLI config
        case "ollama":
            return callOllama(systemPrompt, userPrompt, model, config.ollamaUrl);
        case "server":
            return callCustomServer(systemPrompt, userPrompt);
        default:
            return callCustomServer(systemPrompt, userPrompt);
    }
}

async function callGroq(systemPrompt: string, userPrompt: string, apiKey: string): Promise<AskAIResponse> {
    if (!apiKey) return { response: "", error: "Groq API key is missing. Set it using: don config --set apiKey <your-key>" };

    const groq = new Groq({ apiKey });

    try {
        const completion = await groq.chat.completions.create({
            model: "llama3-70b-8192",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
        });

        const result = completion.choices[0]?.message?.content?.trim() || "";
        return { response: result };
    } catch (err: any) {
        return { response: "", error: `Groq API error: ${err.message}` };
    }
}







async function callOllama(systemPrompt: string, userPrompt: string, model: string, baseUrl = "http://localhost:11434"): Promise<AskAIResponse> {
    if (!baseUrl) return { response: "", error: "Ollama base URL is missing. Set it using: don config --set ollamaUrl <url>" };

    try {
        const res = await axios.post(`${baseUrl}/api/chat`, {
            model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            stream: false,
        });

        const result = res.data.message.content?.trim() || "";
        return { response: result };
    } catch (err: any) {
        return { response: "", error: `Ollama error: ${err.message}` };
    }
}







async function callCustomServer(systemPrompt: string, userPrompt: string): Promise<AskAIResponse> {
    const serverUrl = "http://localhost:3000";
    const token = getConfigValue("jwt");

    console.log("Calling custom server at:", serverUrl);
    console.log("JWT token present?", !!token);

    try {
        const res = await axios.post(
            `${serverUrl}/api/askai`,
            {
                systemPrompt,
                userPrompt,
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        const result = res.data?.response?.trim() || "";
        return { response: result };
    } catch (err: any) {
        console.error("Axios error:", err?.response?.data || err.message);
        return { response: "", error: `Server error: ${err.message}` };
    }
}