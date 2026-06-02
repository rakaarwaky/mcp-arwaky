import os from 'os';
import path from 'path';
import fs from 'fs';

export interface CliConfig {
  api?: {
    baseUrl?: string;
    timeout?: number;
    token?: string;
  };
  output?: {
    format?: 'table' | 'json' | 'yaml';
    color?: 'auto' | 'always' | 'never';
  };
  logging?: {
    level?: 'debug' | 'info' | 'warn' | 'error';
  };
}

export const CONFIG_HOME = path.join(os.homedir(), '.cmf');
export const CONFIG_FILE = path.join(CONFIG_HOME, 'config.json');

export function getConfigPath(profile?: string): string {
  const configHome = CONFIG_HOME;
  const configFileName = profile ? `config.${profile}.json` : 'config.json';
  return path.join(configHome, configFileName);
}

export const DEFAULT_CONFIG: CliConfig = {
  api: {
    baseUrl: '',
    timeout: 30000,
  },
  output: {
    format: 'table',
    color: 'auto',
  },
  logging: {
    level: 'info',
  },
};

export function loadConfig(profile?: string): CliConfig {
  const configHome = CONFIG_HOME;
  const configFileName = profile ? `config.${profile}.json` : 'config.json';
  const configFile = path.join(configHome, configFileName);

  let fileConfig: CliConfig = {};
  if (fs.existsSync(configFile)) {
    try {
      const content = fs.readFileSync(configFile, 'utf-8');
      fileConfig = JSON.parse(content);
    } catch (e) {
      // Silently fail or warn based on implementation preference
    }
  }

  // Precedence: env > file > default
  // Note: CLI flags are handled in cli_main_entry and override these
  return {
    api: {
      baseUrl: process.env.CLOUD_MAIL_FLARE_URL || fileConfig.api?.baseUrl || DEFAULT_CONFIG.api?.baseUrl,
      timeout: Number(process.env.CLOUD_MAIL_FLARE_TIMEOUT) || fileConfig.api?.timeout || DEFAULT_CONFIG.api?.timeout,
      token: process.env.CLOUD_MAIL_FLARE_TOKEN || fileConfig.api?.token,
    },
    output: {
      format: (process.env.CLOUD_MAIL_FLARE_OUTPUT_FORMAT as any) || fileConfig.output?.format || DEFAULT_CONFIG.output!.format,
      color: (process.env.CLOUD_MAIL_FLARE_COLOR as any) || fileConfig.output?.color || DEFAULT_CONFIG.output!.color,
    },
    logging: {
      level: (process.env.CLOUD_MAIL_FLARE_LOG_LEVEL as any) || fileConfig.logging?.level || DEFAULT_CONFIG.logging!.level,
    },
  };
}
