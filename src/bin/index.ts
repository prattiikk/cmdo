#!/usr/bin/env node
//@ts-nocheck
import clipboard from "clipboardy";
import chalk from "chalk";
import ora from "ora";
import stripAnsi from "strip-ansi";
import { Command } from "commander";
import { confirm, select, input } from "@inquirer/prompts";
import figlet from "figlet";
import boxen from "boxen";
import gradient from "gradient-string";

// Import your existing modules
import {
  getConfig, getConfigValue, setConfigValue, validateConfig, deleteConfig,
  CONFIG_PATH,
} from "../lib/config/helper";
import { getUserInput } from "../lib/getUserInput";
import { AskAi } from "../lib/LLMCall";
import { needsSetup, runSetup } from "../lib/setup/setupMenu";
import {
  convertPromptSystem,
  errorExplainPromptSystem,
  examplesPromptSystem,
  explainPromptSystem,
  fixPromptSystem,
  generatePromptSystem,
  improvePromptSystem,
  teachPromptSystem,
} from "../prompts/commandPrompts";

import {
  generateFormatter,
  explainFormatter,
  examplesFormatter,
  fixFormatter,
  convertFormatter,
  improveFormatter,
  teachFormatter,
  errorExplainFormatter,
  FormatterOutput,
} from "../formatter/formatter";

// Types
interface ConfigOptions {
  set?: [string, string];
  get?: string;
  show?: boolean;
  setup?: boolean;
  validate?: boolean;
  delete?: boolean;
}

interface AskAiResponse {
  response: string;
}

// UI Helper Functions
const showBanner = (): void => {
  if (!process.stdout.isTTY) return;

  // console.clear();
  // const banner = figlet.textSync('SENPAI', {
  //   font: 'ANSI Shadow',
  //   horizontalLayout: 'default',
  //   verticalLayout: 'default'
  // });

  // console.log(gradient.rainbow(banner));
  console.log(chalk.dim('hey boss!\n'));
};

const showSuccess = (message: string): void => {
  console.log(chalk.green(`✅ ${message}`));
};

const showError = (message: string): void => {
  console.log(chalk.red(`❌ ${message}`));
};

const showWarning = (message: string): void => {
  console.log(chalk.yellow(`⚠️  ${message}`));
};

const showInfo = (message: string): void => {
  console.log(chalk.blue(`ℹ️  ${message}`));
};

const showOutput = (content: string, title: string = 'Output'): void => {
  const box = boxen(content, {
    title: `📋 ${title}`,
    titleAlignment: 'center',
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'blue'
  });
  console.log(box);
};

const createSpinner = (message: string) => {
  return ora({
    text: message,
    spinner: 'dots',
    color: 'cyan'
  });
};

// Core Utility Functions
const getInput = async (args: string[], promptMessage: string): Promise<string> => {
  let inputText = args.join(" ").trim();

  if (!inputText) {
    try {
      inputText = await input({
        message: promptMessage,
        validate: (value) => value.trim() !== '' || 'Input cannot be empty'
      });
    } catch (error) {
      showError(`Failed to get input: ${error.message}`);
      process.exit(1);
    }
  }

  return inputText.trim();
};

const handleOutput = (formatted: FormatterOutput, title: string = "Output"): void => {
  try {
    showOutput(formatted.rendered, title);

    // Copy to clipboard
    try {
      clipboard.writeSync(stripAnsi(formatted.raw));
      showSuccess("Output copied to clipboard!");
    } catch (clipboardError) {
      showWarning("Could not copy to clipboard");
    }
  } catch (error) {
    showError(`Error handling output: ${error.message}`);
  }
};

const asyncHandler = (fn: (...args: any[]) => Promise<void>) => {
  return (...args: any[]) =>
    Promise.resolve(fn(...args)).catch((err: Error) => {
      showError(err.message || "An unexpected error occurred");
      if (process.env.DEBUG) {
        console.error("Stack trace:", err.stack);
      }
      process.exit(1);
    });
};

const withSetupCheck = (fn: (...args: any[]) => Promise<void>) => {
  return async (...args: any[]) => {
    if (needsSetup()) {
      showInfo("First time setup required...");
      await runSetup();
      console.log();
    }
    return fn(...args);
  };
};

// AI Command Functions
const executeAICommand = async (
  args: string[],
  promptMessage: string,
  systemPrompt: string,
  formatter: (response: string) => FormatterOutput,
  loadingMessage: string,
  title: string
): Promise<void> => {
  const userInput = await getInput(args, promptMessage);
  const spinner = createSpinner(loadingMessage).start();

  try {
    const { response } = await AskAi({
      systemPrompt,
      userPrompt: userInput
    });
    spinner.stop();

    const formatted = formatter(response);
    handleOutput(formatted, title);
  } catch (error) {
    spinner.stop();
    showError(`Failed: ${error.message}`);
  }
};

// Command Implementations
const generateCommand = async (args: string[]): Promise<void> => {
  await executeAICommand(
    args,
    "What do you want to do?",
    generatePromptSystem,
    generateFormatter,
    "🤖 Generating command...",
    "Generated Command"
  );
};

const explainCommand = async (args: string[]): Promise<void> => {
  await executeAICommand(
    args,
    "Which command would you like explained?",
    explainPromptSystem,
    explainFormatter,
    "📚 Analyzing command...",
    "Command Explanation"
  );
};

const teachCommand = async (args: string[]): Promise<void> => {
  await executeAICommand(
    args,
    "Which command would you like to learn?",
    teachPromptSystem,
    teachFormatter,
    "👨‍🏫 Creating tutorial...",
    "Tutorial"
  );
};

const examplesCommand = async (args: string[]): Promise<void> => {
  await executeAICommand(
    args,
    "Show examples for which command?",
    examplesPromptSystem,
    examplesFormatter,
    "💡 Finding examples...",
    "Examples"
  );
};

const improveCommand = async (args: string[]): Promise<void> => {
  await executeAICommand(
    args,
    "Which command would you like to improve?",
    improvePromptSystem,
    improveFormatter,
    "⚡ Analyzing for improvements...",
    "Improvements"
  );
};

const convertCommand = async (args: string[]): Promise<void> => {
  await executeAICommand(
    args,
    "Which command would you like to convert?",
    convertPromptSystem,
    convertFormatter,
    "🔄 Converting command...",
    "Converted Commands"
  );
};

const debugCommand = async (args: string[]): Promise<void> => {
  await executeAICommand(
    args,
    "What error message would you like to debug?",
    errorExplainPromptSystem,
    errorExplainFormatter,
    "🐛 Analyzing error...",
    "Error Analysis"
  );
};

const fixCommand = async (args: string[]): Promise<void> => {
  await executeAICommand(
    args,
    "Which command would you like to fix?",
    fixPromptSystem,
    fixFormatter,
    "🔧 Fixing command...",
    "Fixed Command"
  );
};

// Config Functions
const handleConfigSet = (key: string, value: string): void => {
  if (!key || value === undefined) {
    showError("Invalid format. Use: --set <key> <value>");
    return;
  }
  setConfigValue(key, value);
  showSuccess(`Configuration updated: ${key} = ${value}`);
};

const handleConfigGet = (key: string): void => {
  const value = getConfigValue(key);
  if (value !== undefined) {
    console.log(chalk.cyan(`${key} = ${value}`));
  } else {
    showWarning(`Configuration key '${key}' not found`);
  }
};

const handleConfigShow = (): void => {
  const config = getConfig();
  showOutput(JSON.stringify(config, null, 2), "Configuration");
};

const handleConfigValidate = (): void => {
  const spinner = createSpinner("Validating configuration...").start();
  const isValid = validateConfig();
  spinner.stop();

  if (isValid) {
    showSuccess("Configuration is valid");
  } else {
    showError("Configuration is invalid. Run 'senpai config --setup' to fix it.");
  }
};

const handleConfigDelete = async (): Promise<void> => {
  const shouldDelete = await confirm({
    message: "Are you sure you want to delete the configuration?",
    default: false
  });

  if (shouldDelete) {
    deleteConfig();
    showSuccess(`Configuration deleted at ${CONFIG_PATH}`);
  }
};

const showConfigMenu = async (): Promise<void> => {
  const choice = await select({
    message: "What would you like to do?",
    choices: [
      { name: "🔧 Run setup wizard", value: "setup" },
      { name: "👀 Show configuration", value: "show" },
      { name: "✅ Validate configuration", value: "validate" },
      { name: "🗑️  Delete configuration", value: "delete" },
      { name: "❌ Exit", value: "exit" }
    ]
  });

  switch (choice) {
    case "setup":
      await runSetup();
      showSuccess("Setup completed!");
      break;
    case "show":
      handleConfigShow();
      break;
    case "validate":
      handleConfigValidate();
      break;
    case "delete":
      await handleConfigDelete();
      break;
    case "exit":
      break;
  }
};

const configCommand = async (options: ConfigOptions): Promise<void> => {
  try {
    if (options.setup) {
      await runSetup();
      showSuccess("Setup completed successfully!");
      return;
    }

    if (options.set) {
      const [key, value] = options.set;
      handleConfigSet(key, value);
      return;
    }

    if (options.get) {
      handleConfigGet(options.get);
      return;
    }

    if (options.show) {
      handleConfigShow();
      return;
    }

    if (options.validate) {
      handleConfigValidate();
      return;
    }

    if (options.delete) {
      await handleConfigDelete();
      return;
    }

    // Interactive config menu
    await showConfigMenu();
  } catch (error) {
    showError(`Configuration error: ${error.message}`);
    process.exit(1);
  }
};

// Program Setup
const createProgram = (): Command => {
  const program = new Command();

  program
    .name("senpai")
    .description("🧠 AI-powered terminal command assistant")
    .version("1.0.0")
    .helpOption("-h, --help", "Display help")
    .hook('preAction', showBanner);

  // Register commands
  program
    .command("generate [task...]")
    .alias("gen")
    .description("🎯 Generate a terminal command from natural language")
    .action(asyncHandler(withSetupCheck(generateCommand)));

  program
    .command("explain [command...]")
    .alias("exp")
    .description("📖 Explain what a command does")
    .action(asyncHandler(withSetupCheck(explainCommand)));

  program
    .command("teach [command...]")
    .description("🎓 Get a tutorial on how to use a command")
    .action(asyncHandler(withSetupCheck(teachCommand)));

  program
    .command("examples [command...]")
    .alias("ex")
    .description("💡 Show usage examples")
    .action(asyncHandler(withSetupCheck(examplesCommand)));

  program
    .command("improve [command...]")
    .alias("imp")
    .description("⚡ Suggest improvements for a command")
    .action(asyncHandler(withSetupCheck(improveCommand)));

  program
    .command("convert [command...]")
    .alias("conv")
    .description("🔄 Convert command for different shells/OS")
    .action(asyncHandler(withSetupCheck(convertCommand)));

  program
    .command("debug [message...]")
    .alias("err")
    .description("🐛 Debug error messages")
    .action(asyncHandler(withSetupCheck(debugCommand)));

  program
    .command("fix [command...]")
    .description("🔧 Fix a broken command")
    .action(asyncHandler(withSetupCheck(fixCommand)));

  program
    .command("config")
    .description("⚙️  Manage configuration")
    .option("--set <key> <value>", "Set config value")
    .option("--get <key>", "Get config value")
    .option("--show", "Show config")
    .option("--setup", "Run setup")
    .option("--validate", "Validate config")
    .option("--delete", "Delete config")
    .action(configCommand);

  return program;
};

// Main execution
const main = (): void => {
  const program = createProgram();

  // Handle unknown commands
  program.on('command:*', (operands: string[]) => {
    showError(`Unknown command: ${operands[0]}`);
    showInfo("Run 'senpai --help' to see available commands");
    process.exit(1);
  });

  // Parse arguments
  program.parse(process.argv);

  // Show help if no arguments
  if (!process.argv.slice(2).length) {
    program.outputHelp();
  }
};

// Run the program
main();