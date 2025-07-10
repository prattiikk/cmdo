import chalk from "chalk";

export function teachFormatter(response: string) {
    const sections = response
        .split('---')
        .map(section => section.split('|||').map(str => str.trim()))
        .filter(([label, content]) => label && content);

    const maxLabelLength = Math.max(...sections.map(([label]) => label.length));

    return sections
        .map(([label, content]) => {
            const paddedLabel = chalk.cyan(label.padEnd(maxLabelLength + 2));
            const formattedContent = chalk.white(content);
            return `${paddedLabel}${formattedContent}`;
        })
        .join('\n');
}