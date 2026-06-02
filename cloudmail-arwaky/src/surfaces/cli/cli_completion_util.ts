import { Command } from 'commander';

export function completionCommand(program: Command) {
  program
    .command('completion')
    .description('Generate shell completion scripts')
    .argument('[shell]', 'Shell type (bash, zsh, fish)', 'bash')
    .action((shell: string) => {
      switch (shell) {
        case 'bash':
          console.log(generateBashCompletion(program));
          break;
        case 'zsh':
          console.log(generateZshCompletion(program));
          break;
        default:
          console.error(`Unsupported shell: ${shell}`);
          process.exit(1);
      }
    });
}

function generateBashCompletion(program: Command): string {
  const commands = program.commands.map(c => c.name()).join(' ');
  return `
# bash completion for cmf
_cmf_completion() {
    local cur prev opts
    COMPREPLY=()
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"
    opts="${commands} --help --version --json --quiet --verbose"

    if [[ \${COMP_CWORD} -eq 1 ]] ; then
        COMPREPLY=( $(compgen -W "\${opts}" -- \${cur}) )
        return 0
    fi
}
complete -F _cmf_completion cmf
`;
}

function generateZshCompletion(program: Command): string {
  const commands = program.commands.map(c => `${c.name()}:"${c.description()}"`).join('\n        ');
  return `
# zsh completion for cmf
_cmf_completion() {
    local line
    _arguments -C \\
        "1: :(( \\
        ${commands} \\
        ))" \\
        "*::arg:->args"
}
compdef _cmf_completion cmf
`;
}
