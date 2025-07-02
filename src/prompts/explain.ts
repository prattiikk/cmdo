import { prompt } from "enquirer";
import chalk from "chalk";

export default async function explainCommand(config: any): Promise<string> {
    const question = chalk.cyanBright("command:");

    const response = await prompt<{ command: string }>({
        type: "input",
        name: "command",
        message: question,
        validate: input => input.trim() !== '' || "command cannot be empty",
    });

    if (!response.command.trim()) {
        throw new Error("command cannot be empty");
    }

    return `command : ${response.command}`;
}