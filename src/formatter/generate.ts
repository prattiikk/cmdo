import chalk from "chalk";

export function generateFormatter(input: string): string {
    const commands = input
        .split(",")
        .map((cmd) => cmd.trim())
        .filter(Boolean);

    const formatted = commands
        .map((cmd, index) => `${chalk.green(`${index + 1}.`)} ${chalk.cyan(cmd)}`)
        .join("\n");

    return formatted;
}