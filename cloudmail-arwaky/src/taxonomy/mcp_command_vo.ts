// taxonomy/mcp_command_vo.ts
// Value objects specific to MCP and CLI commands execution

export type CommandName = string & { readonly __brand: 'CommandName' };
export type CommandArg = string & { readonly __brand: 'CommandArg' };

export function asCommandName(s: string): CommandName { return s as CommandName; }
export function asCommandArg(s: string): CommandArg { return s as CommandArg; }

export const MCP_COMMAND_DOMAIN = 'mcp_command';
