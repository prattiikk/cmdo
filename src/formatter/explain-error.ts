import chalk from "chalk";

export function errorExplainFormatter(response: string) {
    const sections = response
        .split('---')
        .map(entry => entry.split('|||').map(str => str.trim()))
        .filter(([label, content]) => label && content);

    const maxLabelLength = Math.max(...sections.map(([label]) => label.length));

    return sections
        .map(([label, content]) => {
            const paddedLabel = chalk.red.bold(label.padEnd(maxLabelLength + 2));
            const formattedContent = chalk.white(content);
            return `${paddedLabel}${formattedContent}`;
        })
        .join('\n');
}