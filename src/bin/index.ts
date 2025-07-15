#!/usr/bin/env node

import clipboard from "clipboardy";
import stripAnsi from "strip-ansi";
import { Command } from "commander";
import { getConfig, getConfigValue, setConfigValue, validateConfig } from "../lib/config/helper";
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

interface ConfigOptions {
  set?: [string, string];
  get?: string;
  show?: boolean;
  setup?: boolean;
}

interface AskAiResponse {
  response: string;
}

interface GetUserInputOptions {
  message: string;
}

const program = new Command();

// Error handler wrapper with improved error handling
const asyncHandler = (fn: (...args: any[]) => Promise<void>): ((...args: any[]) => void) => {
  return (...args: any[]) =>
    Promise.resolve(fn(...args)).catch((err: Error) => {
      console.error("Error:", err.message || err);
      if (process.env.DEBUG) {
        console.error("Stack trace:", err.stack);
      }
      process.exit(1);
    });
};

// Setup check wrapper - runs setup if needed before executing command
const withSetupCheck = (fn: (...args: any[]) => Promise<void>): ((...args: any[]) => Promise<void>) => {
  return async (...args: any[]) => {
    if (needsSetup()) {
      console.log("🔧 First time setup required...\n");
      await runSetup();
      console.log(); // Add spacing
    }
    return fn(...args);
  };
};

// Input utility: from args or prompt with enhanced validation
const getInput = async (args: string[], promptMessage: string): Promise<string> => {
  let input = args.join(" ").trim();

  if (!input) {
    try {
      input = await getUserInput({ message: promptMessage } as GetUserInputOptions);
      input = input.trim();
    } catch (error) {
      console.error("Failed to get user input:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  if (!input) {
    console.error("Input cannot be empty.");
    process.exit(1);
  }

  return input;
};

// Output handler with error handling for clipboard operations
const handleOutput = (formatted: FormatterOutput): void => {
  try {
    console.log(formatted.rendered);

    // Attempt to copy to clipboard with fallback
    try {
      clipboard.writeSync(stripAnsi(formatted.raw));
      console.log("Output copied to clipboard.");
    } catch (clipboardError) {
      console.warn("Warning: Could not copy to clipboard:",
        clipboardError instanceof Error ? clipboardError.message : clipboardError);
    }
  } catch (error) {
    console.error("Error handling output:", error instanceof Error ? error.message : error);
  }
};

// Register CLI metadata
program
  .name("senpai")
  .description("A CLI tool to generate, explain, convert, and improve terminal commands using AI.")
  .version("1.0.0")
  .helpOption("-h, --help", "Display help for command")
  .addHelpText('after', `
Examples:
  $ senpai generate "list all files in current directory"
  $ senpai explain "ls -la"
  $ senpai teach "grep"
  $ senpai examples "find"
  $ senpai improve "ps aux | grep node"
  $ senpai convert "ls -la" 
  $ senpai decode-err "command not found: npm"
  $ senpai fix "ls -ll"
  $ senpai config --show
  $ senpai config --setup
  $ senpai config --set provider openai
  $ senpai config --get provider

Documentation:
  For detailed usage instructions and examples, please refer to the project documentation.
`);

// Command: generate
program
  .command("generate [task...]")
  .alias("gen")
  .description("Generate a terminal command based on a natural language task description.")
  .action(
    asyncHandler(withSetupCheck(async (args: string[]) => {
      const task = await getInput(args, "Enter the task:");
      console.log("Generating command...");
      const { response }: AskAiResponse = await AskAi({ systemPrompt: generatePromptSystem, userPrompt: task });
      const formatted = generateFormatter(response);
      handleOutput(formatted);
    }))
  );

// Command: explain
program
  .command("explain [command...]")
  .alias("exp")
  .description("Explain what a specific terminal command does.")
  .action(
    asyncHandler(withSetupCheck(async (args: string[]) => {
      const command = await getInput(args, "Enter the command to explain:");
      console.log("Explaining command...");
      const { response }: AskAiResponse = await AskAi({ systemPrompt: explainPromptSystem, userPrompt: command });
      const formatted = explainFormatter(response);
      handleOutput(formatted);
    }))
  );

// Command: teach
program
  .command("teach [command...]")
  .description("Provide a step-by-step guide on how to use a given command.")
  .action(
    asyncHandler(withSetupCheck(async (args: string[]) => {
      const command = await getInput(args, "Enter the command:");
      console.log("Creating tutorial...");
      const { response }: AskAiResponse = await AskAi({ systemPrompt: teachPromptSystem, userPrompt: command });
      const formatted = teachFormatter(response);
      handleOutput(formatted);
    }))
  );

// Command: examples
program
  .command("examples [command...]")
  .alias("ex")
  .description("Show usage examples of the given terminal command.")
  .action(
    asyncHandler(withSetupCheck(async (args: string[]) => {
      const command = await getInput(args, "Enter the command:");
      console.log("Finding examples...");
      const { response }: AskAiResponse = await AskAi({ systemPrompt: examplesPromptSystem, userPrompt: command });
      const formatted = examplesFormatter(response);
      handleOutput(formatted);
    }))
  );

// Command: improve
program
  .command("improve [command...]")
  .alias("imp")
  .description("Suggest improved or more efficient alternatives to the given command.")
  .action(
    asyncHandler(withSetupCheck(async (args: string[]) => {
      const command = await getInput(args, "Enter the command:");
      console.log("Analyzing for improvements...");
      const { response }: AskAiResponse = await AskAi({ systemPrompt: improvePromptSystem, userPrompt: command });
      const formatted = improveFormatter(response);
      handleOutput(formatted);
    }))
  );

// Command: convert
program
  .command("convert [command...]")
  .alias("conv")
  .description("Convert the given command to equivalent syntax for different shells or operating systems.")
  .action(
    asyncHandler(withSetupCheck(async (args: string[]) => {
      const command = await getInput(args, "Enter the command:");
      console.log("Converting command...");
      const { response }: AskAiResponse = await AskAi({ systemPrompt: convertPromptSystem, userPrompt: command });
      const formatted = convertFormatter(response);
      handleOutput(formatted);
    }))
  );

// Command: decode-err
program
  .command("decode-err [message...]")
  .alias("err")
  .description("Explain an error message and suggest possible fixes.")
  .action(
    asyncHandler(withSetupCheck(async (args: string[]) => {
      const message = await getInput(args, "Enter the error message:");
      console.log("Analyzing error...");
      const { response }: AskAiResponse = await AskAi({ systemPrompt: errorExplainPromptSystem, userPrompt: message });
      const formatted = errorExplainFormatter(response);
      handleOutput(formatted);
    }))
  );

// Command: fix
program
  .command("fix [command...]")
  .description("Fix a broken or incorrect command and suggest possible intended variations.")
  .action(
    asyncHandler(withSetupCheck(async (args: string[]) => {
      const command = await getInput(args, "Enter the command to fix:");
      console.log("Fixing command...");
      const { response }: AskAiResponse = await AskAi({ systemPrompt: fixPromptSystem, userPrompt: command });
      const formatted = fixFormatter(response);
      handleOutput(formatted);
    }))
  );

// Command: config
program
  .command("config")
  .description("Manage CLI configuration settings")
  .option("--set <key> <value>", "Set config key-value pair (e.g., --set provider ollama)")
  .option("--get <key>", "Get value of a config key")
  .option("--show", "Show entire config file")
  .option("--setup", "Run the interactive setup wizard")
  .option("--validate", "Validate current configuration")
  .action(asyncHandler(async (options: ConfigOptions & { validate?: boolean }) => {
    try {
      if (options.setup) {
        await runSetup();
      } else if (options.set) {
        const [key, value] = options.set;
        if (!key || value === undefined) {
          console.error("Invalid format. Use: senpai config --set <key> <value>");
          console.log("Example: senpai config --set provider openai");
          process.exit(1);
        }
        setConfigValue(key, value);
        console.log(`Configuration updated: ${key} = ${value}`);
      } else if (options.get) {
        const value = getConfigValue(options.get);
        if (value !== undefined) {
          console.log(`${options.get} = ${value}`);
        } else {
          console.log(`Configuration key '${options.get}' not found`);
        }
      } else if (options.show) {
        const config = getConfig();
        console.log("Current configuration:");
        console.log(JSON.stringify(config, null, 2));
      } else if (options.validate) {
        const isValid = validateConfig();
        if (isValid) {
          console.log("✅ Configuration is valid");
        } else {
          console.log("❌ Configuration is invalid");
          console.log("Run 'senpai config --setup' to reconfigure");
        }
      } else {
        console.log("Configuration Management");
        console.log("Use one of the following options:");
        console.log("  --setup              Run interactive setup wizard");
        console.log("  --set <key> <value>  Set a configuration value");
        console.log("  --get <key>          Get a configuration value");
        console.log("  --show               Show all configuration");
        console.log("  --validate           Validate current configuration");
        console.log("");
        console.log("Examples:");
        console.log("  senpai config --setup");
        console.log("  senpai config --show");
        console.log("  senpai config --set provider openai");
        console.log("  senpai config --get provider");
        console.log("  senpai config --validate");
      }
    } catch (error) {
      console.error("Configuration error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }));

// Add a help command for detailed information
program
  .command("help [command]")
  .description("Show detailed help for a specific command")
  .action((commandName?: string) => {
    if (commandName) {
      const command = program.commands.find(cmd => cmd.name() === commandName);
      if (command) {
        command.help();
      } else {
        console.log(`Command '${commandName}' not found.`);
        console.log("Available commands:");
        program.commands.forEach(cmd => {
          if (cmd.name() !== "help") {
            console.log(`  ${cmd.name()} - ${cmd.description()}`);
          }
        });
      }
    } else {
      program.help();
    }
  });

// Handle unknown commands
program.on('command:*', (operands: string[]) => {
  console.error(`Unknown command: ${operands[0]}`);
  console.log("Run 'senpai --help' to see available commands.");
  process.exit(1);
});

// Parse CLI arguments
program.parse(process.argv);

// Show help if no arguments provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}