#!/usr/bin/env node

console.log("welcome");

import { Command } from "commander";
import { getConfig } from "../lib/config/helper";
import { generateFormatter } from "../formatter/generate";
import { explainFormatter } from "../formatter/explain";
import { getUserInput } from "../lib/getUserInput";
import { AskAi } from "../lib/LLMCall";
import { convertPromptSystem, errorExplainPromptSystem, examplesPromptSystem, explainPromptSystem, generatePromptSystem, improvePromptSystem, teachPromptSystem } from "../prompts/commandPrompts";
import { teachFormatter } from "../formatter/teach";
import { examplesFormatter } from "../formatter/example";
import { improveFormatter } from "../formatter/improve";
import { convertFormatter } from "../formatter/convert";
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

program
  .command('teach')
  .description("teaches the usage of the given command")
  .action(async () => {

    const command = await getUserInput({ message: "command : " });

    const response = await AskAi({ systemPrompt: teachPromptSystem, userPrompt: command });

    const formattedResponse = await teachFormatter(response.response);

    console.log(formattedResponse);
  })

program
  .command('example')
  .description("gives some examples which uses this command")
  .action(async () => {

    const command = await getUserInput({ message: "command" });

    const response = await AskAi({ systemPrompt: examplesPromptSystem, userPrompt: command });

    const formattedResponse = await examplesFormatter(response.response);

    console.log(formattedResponse);
  })


program
  .command('improve')
  .description("gives better alternative of the given command")
  .action(async () => {

    const command = await getUserInput({ message: "command" });

    const response = await AskAi({ systemPrompt: improvePromptSystem, userPrompt: command });

    const formattedResponse = await improveFormatter(response.response);

    console.log(formattedResponse);
  })



program
  .command('convert')
  .description("converst the given command for different shells and os")
  .action(async () => {

    const command = await getUserInput({ message: "command" });

    const response = await AskAi({ systemPrompt: convertPromptSystem, userPrompt: command });

    const formattedResponse = await convertFormatter(response.response);

    console.log(formattedResponse);
  })


program
  .command('decode-err')
  .description("explains the given error and suggest solutions")
  .action(async () => {

    const command = await getUserInput({ message: "command" });

    const response = await AskAi({ systemPrompt: errorExplainPromptSystem, userPrompt: command });

    const formattedResponse = await explainFormatter(response.response);

    console.log(formattedResponse);
  })






/* 
decode-error -> explains the error

fix -> fixes the given command (optional)
give command - for the given task what are some options or commands that we could use (optional)
*/




program.parse(process.argv);
