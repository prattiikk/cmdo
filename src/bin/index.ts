#!/usr/bin/env node

console.log("welcome");

import { Command } from "commander";
import { getConfig } from "../lib/config/helper";
import { generateFormatter } from "../formatter/generate";
import { explainFormatter } from "../formatter/explain";
import { getUserInput } from "../lib/getUserInput";
import { AskAi } from "../lib/LLMCall";
import { explainPromptSystem, generatePromptSystem } from "../prompts/commandPrompts";
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

    // get user input
    const task = await getUserInput({
      message: "enter the task for which you want to generate a command : ",
    });

    // call LLM with user input
    const response = await AskAi({
      systemPrompt: generatePromptSystem, // promt to the LLM 
      userPrompt: task // users input passed along with the prompt
    });

    // format LLM response
    const formattedResponse = await generateFormatter(response.response);

    // print 
    console.log(formattedResponse);
  });




// explain command
program
  .command("explain")
  .description("Generate a command using a large language model.")
  .action(async () => {

    // get user input
    const command = await getUserInput({
      message: "enter the command you want to get explaination about : ",
    });

    // call LLM with users input
    const response = await AskAi({
      systemPrompt: explainPromptSystem, // LLM prompt for generating explanations
      userPrompt: command // users input passed aling with the prompt
    });

    // format LLM response
    const formattedResponse = await explainFormatter(response.response);

    // print
    console.log(formattedResponse);
  });

program.parse(process.argv);
