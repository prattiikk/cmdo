#!/usr/bin/env node

import clipboard from "clipboardy";
import stripAnsi from "strip-ansi";
import { Command } from "commander";
import { getConfig } from "../lib/config/helper";
import { getUserInput } from "../lib/getUserInput";
import { AskAi } from "../lib/LLMCall";
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

const program = new Command();
const config = getConfig();

// Error handler wrapper
const asyncHandler = (fn: (...args: any[]) => Promise<void>) => {
  return (...args: any[]) =>
    Promise.resolve(fn(...args)).catch((err) => {
      console.error("Error:", err.message || err);
      process.exit(1);
    });
};

// Input utility: from args or prompt
const getInput = async (args: string[], promptMessage: string) => {
  let input = args.join(" ");
  if (!input) {
    input = await getUserInput({ message: promptMessage });
  }
  input = input.trim();
  if (!input) {
    console.error("Input cannot be empty.");
    process.exit(1);
  }
  return input;
};

// Output: display and copy
const handleOutput = (formatted: FormatterOutput) => {
  console.log(formatted.rendered);
  clipboard.writeSync(stripAnsi(formatted.raw));
  console.log("Output copied to clipboard.");
};

// Register CLI metadata
program
  .name("don")
  .description("A CLI tool to generate, explain, convert, and improve terminal commands using AI.")
  .version("1.0.0");

// Command: generate
program
  .command("generate [task...]")
  .description("Generate a terminal command based on a natural language task description.")
  .action(
    asyncHandler(async (args) => {
      const task = await getInput(args, "Enter the task:");
      const { response } = await AskAi({ systemPrompt: generatePromptSystem, userPrompt: task });
      const formatted = generateFormatter(response);
      handleOutput(formatted);
    })
  );

// Command: explain
program
  .command("explain [command...]")
  .description("Explain what a specific terminal command does.")
  .action(
    asyncHandler(async (args) => {
      const command = await getInput(args, "Enter the command to explain:");
      const { response } = await AskAi({ systemPrompt: explainPromptSystem, userPrompt: command });
      const formatted = explainFormatter(response);
      handleOutput(formatted);
    })
  );

// Command: teach
program
  .command("teach [command...]")
  .description("Provide a step-by-step guide on how to use a given command.")
  .action(
    asyncHandler(async (args) => {
      const command = await getInput(args, "Enter the command:");
      const { response } = await AskAi({ systemPrompt: teachPromptSystem, userPrompt: command });
      const formatted = teachFormatter(response);
      handleOutput(formatted);
    })
  );

// Command: example
program
  .command("example [command...]")
  .description("Show usage examples of the given terminal command.")
  .action(
    asyncHandler(async (args) => {
      const command = await getInput(args, "Enter the command:");
      const { response } = await AskAi({ systemPrompt: examplesPromptSystem, userPrompt: command });
      const formatted = examplesFormatter(response);
      handleOutput(formatted);
    })
  );

// Command: improve
program
  .command("improve [command...]")
  .description("Suggest improved or more efficient alternatives to the given command.")
  .action(
    asyncHandler(async (args) => {
      const command = await getInput(args, "Enter the command:");
      const { response } = await AskAi({ systemPrompt: improvePromptSystem, userPrompt: command });
      const formatted = improveFormatter(response);
      handleOutput(formatted);
    })
  );

// Command: convert
program
  .command("convert [command...]")
  .description("Convert the given command to equivalent syntax for different shells or operating systems.")
  .action(
    asyncHandler(async (args) => {
      const command = await getInput(args, "Enter the command:");
      const { response } = await AskAi({ systemPrompt: convertPromptSystem, userPrompt: command });
      const formatted = convertFormatter(response);
      handleOutput(formatted);
    })
  );

// Command: decode-err
program
  .command("decode-err [message...]")
  .description("Explain an error message and suggest possible fixes.")
  .action(
    asyncHandler(async (args) => {
      const message = await getInput(args, "Enter the error message:");
      const { response } = await AskAi({ systemPrompt: errorExplainPromptSystem, userPrompt: message });
      const formatted = errorExplainFormatter(response);
      handleOutput(formatted);
    })
  );

// Command: fix
program
  .command("fix [command...]")
  .description("Fix a broken or incorrect command and suggest possible intended variations.")
  .action(
    asyncHandler(async (args) => {
      const command = await getInput(args, "Enter the command to fix:");
      const { response } = await AskAi({ systemPrompt: fixPromptSystem, userPrompt: command });
      const formatted = fixFormatter(response);
      handleOutput(formatted);
    })
  );

// Parse CLI
program.parse(process.argv);