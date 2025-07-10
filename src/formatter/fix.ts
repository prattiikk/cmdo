import chalk from "chalk";

export function fixFormatter(response: string) {
    const entries = response
        .split('---')
        .map(entry => entry.split('|||').map(str => str.trim()))
        .filter(([command, explanation]) => command && explanation);

    const maxCommandLength = Math.max(...entries.map(([cmd]) => cmd.length));

    return entries
        .map(([cmd, explanation]) => {
            const paddedCmd = chalk.green(cmd.padEnd(maxCommandLength + 2));
            const formattedExplanation = chalk.gray(explanation);
            return `${paddedCmd}${formattedExplanation}`;
        })
        .join('\n');
}