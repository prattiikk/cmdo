import chalk from "chalk";

export function convertFormatter(response: string) {
    const entries = response
        .split('---')
        .map(entry => entry.split('|||').map(str => str.trim()))
        .filter(([env, cmd]) => env && cmd);

    const maxEnvLength = Math.max(...entries.map(([env]) => env.length));

    return entries
        .map(([env, cmd]) => {
            const paddedEnv = chalk.magenta(env.padEnd(maxEnvLength + 2));
            const formattedCommand = chalk.white(cmd);
            return `${paddedEnv}${formattedCommand}`;
        })
        .join('\n');
}