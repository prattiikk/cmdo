import chalk from "chalk";

export function examplesFormatter(response: string) {
    const examples = response
        .split('---')
        .map(pair => pair.split('|||').map(str => str.trim()))
        .filter(([command, explanation]) => command && explanation);

    const maxCommandLength = Math.max(...examples.map(([cmd]) => cmd.length));

    return examples
        .map(([cmd, explanation]) => {
            const paddedCmd = chalk.yellow(cmd.padEnd(maxCommandLength + 2));
            const formattedExplanation = chalk.gray(explanation);
            return `${paddedCmd}${formattedExplanation}`;
        })
        .join('\n');
}