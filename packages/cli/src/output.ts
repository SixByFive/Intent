import chalk from "chalk";
import { type IntentError } from "@dev-sixbyfive/intent-core";

export function printError(error: IntentError): void {
  console.error(chalk.red(`✗ ${error.message}`));
  if (process.env["INTENT_DEBUG"] && error.cause) {
    console.error(chalk.gray(String(error.cause)));
  }
}

export function printSuccess(message: string): void {
  console.log(chalk.green(`✓ ${message}`));
}

export function printInfo(message: string): void {
  console.log(chalk.cyan(`ℹ ${message}`));
}

export function printWarning(message: string): void {
  console.warn(chalk.yellow(`⚠ ${message}`));
}

export function printDim(message: string): void {
  console.log(chalk.dim(message));
}

export function printHeader(title: string): void {
  console.log(chalk.bold(`\n${title}`));
  console.log(chalk.dim("─".repeat(title.length)));
}
