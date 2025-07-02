import { prompt } from "enquirer";
import chalk, { Chalk, ChalkInstance } from "chalk";

interface PromptOptions {
    message: string;
    errorMessage?: string;
    validateMessage?: string;
    color?: ChalkInstance;
}

export async function getUserInput({
    message,
    errorMessage = "Input cannot be empty",
    validateMessage = "Input cannot be empty",
    color = chalk.cyanBright, // Default color
}: PromptOptions): Promise<string> {
    const formattedMessage = color(message);

    const response = await prompt<{ input: string }>({
        type: "input",
        name: "input",
        message: formattedMessage,
        validate: (input) => input.trim() !== "" || validateMessage,
    });

    const value = response.input;

    if (!value?.trim()) {
        throw new Error(errorMessage);
    }

    return value.trim();
}