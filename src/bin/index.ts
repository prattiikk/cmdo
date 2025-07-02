#!/usr/bin/env node

console.log("welcome");

import { Command } from "commander";
import { getConfig } from "../lib/config/helper";
import generatePrompt from "../prompts/generate";
import { askai } from "../lib/askai";
import { generateFormatter } from "../formatter/generate";
const program = new Command();

program
  .name("don")
  .description(
    "A cli tool that helps you manage terminal commands using a large language model.",
  )
  .version("1.0.0");

const config = getConfig();

// generate command

program
  .command("generate")
  .description("Generate a command using a large language model.")
  .action(async () => {
    console.log("Generating command...");
    // Here you would typically call the LLM API to generate a command
    const prompt = await generatePrompt(config);
    const response = await askai(prompt);
    const formattedResponse = await generateFormatter(response.response);
    console.log(formattedResponse);
    // For now, we will just log the config
  });

program.parse(process.argv);
