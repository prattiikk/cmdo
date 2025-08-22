#!/usr/bin/env node
//@ts-nocheck
import clipboard from "clipboardy";
import chalk from "chalk";
import ora from "ora";
import stripAnsi from "strip-ansi";
import { Command, program } from "commander";
import { confirm, select, input } from "@inquirer/prompts";
import boxen from "boxen";

// Import your existing modules
import {
  getConfig, getConfigValue, setConfigValue, validateConfig, deleteConfig,
  CONFIG_PATH,
} from "../lib/config/helper.js";
import { AskAi } from "../lib/LLMCall.js";
import { needsSetup, runSetup } from "../lib/setup/setupMenu.js";
import {
  convertPromptSystem,
  errorExplainPromptSystem,
  examplesPromptSystem,
  explainPromptSystem,
  fixPromptSystem,
  generatePromptSystem,
  improvePromptSystem,
  teachPromptSystem,
} from "../prompts/commandPrompts.js";

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
} from "../formatter/formatter.js";

// Types
interface ConfigOptions {
  set?: [string, string];
  get?: string;
  show?: boolean;
  setup?: boolean;
  validate?: boolean;
  delete?: boolean;
}

// UI Helper Functions
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

const showErrorBox = (content: string, title: string = 'Error'): void => {
  const box = boxen(content, {
    title: `🚨 ${title}`,
    titleAlignment: 'center',
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'red'
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
    } catch {
      showWarning("Could not copy to clipboard");
    }
  } catch (error) {
    showError(`Error handling output: ${error.message}`);
  }
};

const handleError = (errorMessage: string, provider?: string, model?: string): void => {
  try {
    let errorContent = errorMessage;

    if (provider || model) {
      errorContent += '\n\n';
      if (provider) errorContent += `Provider: ${provider}\n`;
      if (model) errorContent += `Model: ${model}`;
    }

    showErrorBox(errorContent, 'LLM Error');

    // Copy error to clipboard for debugging
    try {
      clipboard.writeSync(stripAnsi(errorMessage));
      showInfo("Error details copied to clipboard for debugging");
    } catch {
      // Silently fail clipboard copy for errors
    }
  } catch (error) {
    showError(`Error handling error display: ${error.message}`);
  }
};

const asyncHandler = (fn: (...args: any[]) => Promise<void>) => {
  return (...args: any[]) =>
    Promise.resolve(fn(...args)).catch((err: Error) => {
      showError(err.message || "An unexpected error occurred");
      process.exit(1);
    });
};

const withSetupCheck = (fn: (...args: any[]) => Promise<void>) => {
  return async (...args: any[]) => {
    try {
      if (needsSetup()) {
        showInfo("First time setup required...");
        await runSetup();
        console.log();
      }
      return await fn(...args);
    } catch (error) {
      showError(`Setup check failed: ${error.message}`);
      throw error;
    }
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
  const spinner = createSpinner(loadingMessage);

  try {
    spinner.start();
    const response = await AskAi({
      systemPrompt,
      userPrompt: userInput
    });
    spinner.stop();

    if (response.error) {
      handleError(response.error, response.provider, response.model);
      return;
    }

    const responseText = typeof response === 'string' ? response : response.response;

    if (!responseText || responseText.trim() === '') {
      handleError(
        'No response content received from the AI provider',
        response.provider,
        response.model
      );
      return;
    }

    const formatted = formatter(responseText);
    handleOutput(formatted, title);
  } catch (error: any) {
    spinner.stop();

    const message = error?.message || error?.toString() || 'Unknown error';

    if (error?.response?.error || error?.error) {
      handleError(
        error.response?.error || error.error,
        error.response?.provider || error.provider,
        error.response?.model || error.model
      );
    } else {
      handleError(`Execution Failed: ${message}`);
    }

    return;
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
  try {
    if (!key || value === undefined) {
      showError("Invalid format. Use: --set <key> <value>");
      return;
    }
    setConfigValue(key, value);
    showSuccess(`Configuration updated: ${key} = ${value}`);
  } catch (error) {
    showError(`Failed to set config: ${error.message}`);
  }
};

const handleConfigGet = (key: string): void => {
  try {
    const value = getConfigValue(key);
    if (value !== undefined) {
      console.log(chalk.cyan(`${key} = ${value}`));
    } else {
      showWarning(`Configuration key '${key}' not found`);
    }
  } catch (error) {
    showError(`Failed to get config: ${error.message}`);
  }
};

const handleConfigShow = (): void => {
  try {
    const config = getConfig();
    showOutput(JSON.stringify(config, null, 2), "Configuration");
  } catch (error) {
    showError(`Failed to show config: ${error.message}`);
  }
};

const handleConfigValidate = (): void => {
  const spinner = createSpinner("Validating configuration...");

  try {
    spinner.start();
    const isValid = validateConfig();
    spinner.stop();

    if (isValid) {
      showSuccess("Configuration is valid");
    } else {
      showError("Configuration is invalid. Run 'cmdo config --setup' to fix it.");
    }
  } catch (error) {
    spinner.stop();
    showError(`Validation failed: ${error.message}`);
  }
};

const handleConfigDelete = async (): Promise<void> => {
  try {
    const shouldDelete = await confirm({
      message: "Are you sure you want to delete the configuration?",
      default: false
    });

    if (shouldDelete) {
      deleteConfig();
      showSuccess(`Configuration deleted at ${CONFIG_PATH}`);
    }
  } catch (error) {
    showError(`Failed to delete config: ${error.message}`);
  }
};

const menuCommand = async (): Promise<void> => {
  try {
    const choice = await select({
      message: "What would you like to do?",
      choices: [
        { name: "🎯 Generate Command", value: "generate" },
        { name: "📖 Explain Command", value: "explain" },
        { name: "🎓 Learn Command (Tutorial)", value: "teach" },
        { name: "💡 Usage Examples", value: "examples" },
        { name: "⚡ Optimize Command", value: "improve" },
        { name: "🔄 Convert Command (Shell/OS)", value: "convert" },
        { name: "🐛 Debug Errors", value: "debug" },
        { name: "🔧 Fix Broken Command", value: "fix" },
        { name: "⚙️ Configure Settings", value: "config" },
        { name: "🚪 Exit", value: "exit" }
      ]
    });

    if (choice === "exit") {
      showInfo("Goodbye!");
      return;
    }
    if (choice === "config") {
      showConfigMenu();
      return;
    }

    const userInput = await input({
      message: "What is your input?",
      validate: (val) => val.trim() !== "" || "Input cannot be empty"
    });

    const args = userInput.trim().split(/\s+/);

    const commandMap: Record<string, (args: string[]) => Promise<void>> = {
      generate: generateCommand,
      explain: explainCommand,
      teach: teachCommand,
      examples: examplesCommand,
      improve: improveCommand,
      convert: convertCommand,
      debug: debugCommand,
      fix: fixCommand,
    };

    const handler = commandMap[choice];
    if (handler) {
      await handler(args);
    } else {
      showError(`Unknown command: ${choice}`);
    }
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      showInfo("Operation cancelled");
      return;
    }
    showError(`Menu command failed: ${error.message}`);
    throw error;
  }
};



const showConfigMenu = async (): Promise<void> => {
  try {
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
        showInfo("Goodbye!");
        break;
    }
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      showInfo("Operation cancelled");
      return;
    }
    showError(`Config menu failed: ${error.message}`);
    throw error;
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
    .name("cmdo")
    .description("🧠 AI-powered terminal command assistant")
    .version("1.0.0")
    .action(asyncHandler(withSetupCheck(menuCommand)));
  // .helpOption("-h, --help", "Display help");

  // program
  //   .command("help", { isDefault: false })
  //   .description("shows help options")
  //   .action(() => {
  //     program.help();  // instead of program.outputHelp()
  //   });

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

  // program
  //   .command("menu")
  //   .description("🧠 Open interactive AI command menu")
  //   .action(asyncHandler(withSetupCheck(menuCommand)));

  program
    .command("config")
    .description("⚙️  Manage configuration")
    .option("--set <key> <value>", "Set config value")
    .option("--get <key>", "Get config value")
    .option("--show", "Show config")
    .option("--setup", "Run setup")
    .option("--validate", "Validate config")
    .option("--delete", "Delete config")
    .action(asyncHandler(configCommand));

  return program;
};






// Main execution
const main = (): void => {
  try {
    const program = createProgram();

    // Handle unknown commands
    program.on('command:*', (operands: string[]) => {
      showError(`Unknown command: ${operands[0]}`);
      showInfo("Run 'cmdo --help' to see available commands");
      process.exit(1);
    });

    // Parse arguments
    program.parse(process.argv);

    // // Show help if no arguments
    // if (!process.argv.slice(2).length) {
    //   program.outputHelp();
    // }
  } catch (error) {
    showError(`Application failed to start: ${error.message}`);
    process.exit(1);
  }
};





// Handle uncaught exceptions
process.on('uncaught Exception', (error) => {
  showError(`Uncaught Exception: ${error.message}`);

  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  showError(`Unhandled Promise Rejection: ${reason}`);
  process.exit(1);
});


main();