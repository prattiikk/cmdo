import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

export interface AskAIResponse {
    response: string;
    error?: string;
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

interface AskAIOptions {
    systemPrompt: string;
    userPrompt: string;
    model?: string;
}

export async function AskAi({
    systemPrompt,
    userPrompt,
    model = "llama-3.3-70b-versatile",
}: AskAIOptions): Promise<AskAIResponse> {
    try {
        const completion = await groq.chat.completions.create({
            model,
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                {
                    role: "user",
                    content: userPrompt,
                },
            ],
        });

        const raw = completion.choices[0]?.message?.content?.trim() || "";
        return { response: raw };
    } catch (error: any) {
        console.error("❌ Error:", error.message);
        return { response: "", error: error.message };
    }
}