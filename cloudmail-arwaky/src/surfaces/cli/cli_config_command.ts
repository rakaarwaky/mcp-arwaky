// surfaces/cli/cli_config_command.ts
// Configuration management commands — init, validate, show

import { Command } from 'commander';
import { CONFIG_HOME, DEFAULT_CONFIG, loadConfig, getConfigPath } from './cli_config_loader';
import { printResult, printError, debug } from './cli_format_util';
import { output } from './cli_main_entry';
import fs from 'fs';
import path from 'path';

export function configCommands(program: Command) {
  const configCmd = program.command('config').description('Manage CLI configuration');

  configCmd
    .command('init')
    .description('Initialize a new configuration file')
    .option('-f, --force', 'Overwrite existing config', false)
    .action((options) => {
      try {
        const configFile = getConfigPath(output.profile);
        if (!fs.existsSync(CONFIG_HOME)) {
          fs.mkdirSync(CONFIG_HOME, { recursive: true });
        }

        if (fs.existsSync(configFile) && !options.force) {
          throw new Error(`Configuration file already exists at ${configFile}. Use --force to overwrite or --profile <name> to create a new one.`);
        }

        fs.writeFileSync(configFile, JSON.stringify(DEFAULT_CONFIG, null, 2));
        printResult({
          message: 'Success',
          path: configFile,
          suggestion: 'You can now edit this file to set your API token and base URL.'
        });
      } catch (err) {
        printError(err);
      }
    });

  configCmd
    .command('validate')
    .description('Validate the current configuration')
    .action(() => {
      try {
        const configFile = getConfigPath(output.profile);
        if (!fs.existsSync(configFile)) {
          throw new Error(`No configuration file found at ${configFile}`);
        }

        const content = fs.readFileSync(configFile, 'utf-8');
        const config = JSON.parse(content);

        // Basic validation
        if (config.api?.baseUrl && !config.api.baseUrl.startsWith('http')) {
          throw new Error('api.baseUrl must start with http:// or https://');
        }

        printResult({ message: 'Configuration is valid', path: configFile });
      } catch (err) {
        printError(err, 'Check your config.json file for syntax errors or invalid values.');
      }
    });

  configCmd
    .command('show')
    .description('Show the current configuration')
    .action(() => {
      const configFile = getConfigPath(output.profile);
      const config = loadConfig(output.profile);
      printResult({
        config,
        path: fs.existsSync(configFile) ? configFile : `Not found (Profile: ${output.profile || 'default'})`
      });
    });
}
