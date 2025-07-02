import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

export interface AskAIResponse {
    response: string;
    error?: string;
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

export async function askExplain(command: string): Promise<AskAIResponse> {

    const explainPrompt = `
You're a Linux command expert. Given a Linux command, break it down into its individual components (command, flags, arguments, paths, etc.) and give a brief explanation for each.

🔧 Format the output like this:

<item> ||| <explanation>
---
<item> ||| <explanation>
---
... and so on

📌 Use:
- \`|||\` (triple pipe) to separate the item and its explanation.
- \`---\` (triple dash) to separate each entry.

❌ Do not include any extra comments, markdown, or surrounding text. Only return the list.

Example Input:
Command: rsync -avzh . /backup

Example Output:
rsync ||| command to sync files and directories  
---  
-a ||| archive mode (recursive + preserve metadata)  
---  
-v ||| verbose output  
---  
-z ||| compress file data during transfer  
---  
-h ||| human-readable numbers  
---  
. ||| current directory  
---  
/backup ||| destination directory  
`;


    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content:
                        explainPrompt,
                },
                {
                    role: "user",
                    content: command,
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