#!/usr/bin/env node
// NFT Marketplace CLI — entry point
// SPDX-License-Identifier: Apache-2.0

import { Command } from 'commander';
import chalk from 'chalk';

const program = new Command();

program
  .name('nftmarket')
  .description('NFT Marketplace CLI — test XRPL + Midnight contracts and integrations')
  .version('1.0.0');

async function launch(network: string): Promise<void> {
  process.env.NFTMARKET_NETWORK = network;
  const { startInteractiveMode } = await import('./interactive.js');
  await startInteractiveMode(network);
}

program
  .command('preview', { isDefault: true })
  .description('Run against Midnight Preview (default) + XRPL Testnet')
  .action(() => launch('preview'));

program
  .command('preprod')
  .description('Run against Midnight Preprod + XRPL Testnet')
  .action(() => launch('preprod'));

program
  .command('standalone')
  .description('Run against a local standalone Midnight stack + XRPL Testnet')
  .action(() => launch('standalone'));

program.parseAsync().catch((error) => {
  console.error(chalk.red('Fatal error:'), error instanceof Error ? error.message : error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error(chalk.red('Unhandled error:'), error);
});
