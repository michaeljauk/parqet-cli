#!/usr/bin/env bun
import { Command } from "commander";
import { registerAuthCommands } from "./commands/auth.ts";
import { registerPortfolioCommands } from "./commands/portfolio.ts";

const program = new Command();

program
  .name("parqet")
  .description("CLI for Parqet portfolio tracker")
  .version("0.1.0")
  .configureOutput({
    outputError: (str, write) => write(`\x1b[31merror:\x1b[0m ${str}`),
  });

registerAuthCommands(program);
registerPortfolioCommands(program);

program.parseAsync();
