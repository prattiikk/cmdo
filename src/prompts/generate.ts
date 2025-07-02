import { prompt } from "enquirer";
import chalk from "chalk";

export default async function generatePrompt(config: any): Promise<string> {
  const question = chalk.cyanBright(
    "Enter the task for which you want to generate the commands for:"
  );

  const response = await prompt<{ prompt: string }>({
    type: "input",
    name: "prompt",
    message: question,
    validate: input => input.trim() !== '' || "Task cannot be empty"
  });

  if (!response.prompt.trim()) {
    throw new Error("Prompt cannot be empty");
  }

  return `Generated command: ${response.prompt}`;
}