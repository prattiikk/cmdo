import chalk from "chalk";

export interface FormatterOutput {
    rendered: string;
    raw: string;
}

export function convertFormatter(response: string): FormatterOutput {
    const entries = response
        .split('---')
        .map(entry => entry.split('|||').map(str => str.trim()))
        .filter(([env, cmd]) => env && cmd);

    const maxEnvLength = Math.max(...entries.map(([env]) => env.length));

    const rendered = entries
        .map(([env, cmd]) => `${chalk.magenta(env.padEnd(maxEnvLength + 2))}${chalk.white(cmd)}`)
        .join('\n');

    const raw = entries.map(([_, cmd]) => cmd).join('\n');

    return { rendered, raw };
}

export function examplesFormatter(response: string): FormatterOutput {
    const examples = response
        .split('---')
        .map(pair => pair.split('|||').map(str => str.trim()))
        .filter(([cmd, explanation]) => cmd && explanation);

    const maxCmdLength = Math.max(...examples.map(([cmd]) => cmd.length));

    const rendered = examples
        .map(([cmd, explanation]) => `${chalk.yellow(cmd.padEnd(maxCmdLength + 2))}${chalk.gray(explanation)}`)
        .join('\n');

    const raw = examples.map(([cmd, explanation]) => `${cmd} - ${explanation}`).join('\n');

    return { rendered, raw };
}

export function errorExplainFormatter(response: string): FormatterOutput {
    const sections = response
        .split('---')
        .map(entry => entry.split('|||').map(str => str.trim()))
        .filter(([label, content]) => label && content);

    const maxLabelLength = Math.max(...sections.map(([label]) => label.length));

    const rendered = sections
        .map(([label, content]) => `${chalk.red.bold(label.padEnd(maxLabelLength + 2))}${chalk.white(content)}`)
        .join('\n');

    const raw = sections.map(([label, content]) => `${label}: ${content}`).join('\n');

    return { rendered, raw };
}

export function explainFormatter(response: string): FormatterOutput {
    const entries = response
        .split('---')
        .map(entry => entry.split('|||').map(str => str.trim()))
        .filter(([key, desc]) => key && desc);

    const maxKeyLength = Math.max(...entries.map(([key]) => key.length));

    const rendered = entries
        .map(([key, desc]) => `${chalk.green(key.padEnd(maxKeyLength + 2))}${chalk.gray(desc)}`)
        .join('\n');

    const raw = entries.map(([key, desc]) => `${key}: ${desc}`).join('\n');

    return { rendered, raw };
}

export function fixFormatter(response: string): FormatterOutput {
    const entries = response
        .split('---')
        .map(entry => entry.split('|||').map(str => str.trim()))
        .filter(([cmd, explanation]) => cmd && explanation);

    const maxCmdLength = Math.max(...entries.map(([cmd]) => cmd.length));

    const rendered = entries
        .map(([cmd, explanation]) => `${chalk.green(cmd.padEnd(maxCmdLength + 2))}${chalk.gray(explanation)}`)
        .join('\n');

    const raw = entries.map(([cmd, explanation]) => `${cmd} - ${explanation}`).join('\n');

    return { rendered, raw };
}

export function generateFormatter(input: string): FormatterOutput {
    const commands = input
        .split(",")
        .map(cmd => cmd.trim())
        .filter(Boolean);

    const rendered = commands
        .map((cmd, index) => `${chalk.green(`${index + 1}.`)} ${chalk.cyan(cmd)}`)
        .join("\n");

    const raw = commands.join("\n");

    return { rendered, raw };
}

export function improveFormatter(response: string): FormatterOutput {
    const entries = response
        .split('---')
        .map(entry => entry.split('|||').map(str => str.trim()))
        .filter(([cmd, explanation]) => cmd && explanation);

    const maxCmdLength = Math.max(...entries.map(([cmd]) => cmd.length));

    const rendered = entries
        .map(([cmd, explanation]) => `${chalk.blue(cmd.padEnd(maxCmdLength + 2))}${chalk.gray(explanation)}`)
        .join('\n');

    const raw = entries.map(([cmd, explanation]) => `${cmd} - ${explanation}`).join('\n');

    return { rendered, raw };
}

export function teachFormatter(response: string): FormatterOutput {
    const sections = response
        .split('---')
        .map(section => section.split('|||').map(str => str.trim()))
        .filter(([label, content]) => label && content);

    const maxLabelLength = Math.max(...sections.map(([label]) => label.length));

    const rendered = sections
        .map(([label, content]) => `${chalk.cyan(label.padEnd(maxLabelLength + 2))}${chalk.white(content)}`)
        .join('\n');

    const raw = sections.map(([label, content]) => `${label}: ${content}`).join('\n');

    return { rendered, raw };
}