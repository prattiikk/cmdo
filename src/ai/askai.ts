import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

export interface AskAIResponse {
    response: string;
    error?: string;
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

export async function askai(prompt: string): Promise<AskAIResponse> {
    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content:
                        "You are a Linux command-line expert. Given a task, respond with a single line containing one or more shell commands separated by commas. Do not include any explanations, markdown, or extra formatting.",
                },
                {
                    role: "user",
                    content: prompt,
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