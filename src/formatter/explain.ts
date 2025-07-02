import chalk from "chalk";

export function explainFormatter(response: string) {
  const entries = response
    .split('---')
    .map(entry => entry.split('|||').map(str => str.trim()))
    .filter(([key, desc]) => key && desc);

  // Find the longest key to align all descriptions
  const maxKeyLength = Math.max(...entries.map(([key]) => key.length));

  return entries
    .map(([key, desc]) => {
      const paddedKey = chalk.green(key.padEnd(maxKeyLength + 2)); // +2 for spacing
      const formattedDesc = chalk.gray(desc);
      return `${paddedKey}${formattedDesc}`;
    })
    .join('\n');
}