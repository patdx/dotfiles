import { parseArgs } from '@std/cli/parse-args'
import { CLIFlags, Model, Provider, supportedModelByProvider } from './types.ts'
import * as v from 'valibot'
import { llmCliConfigStore } from './llm-cli-config-store.ts'

export async function parseFlags(args: string[]): Promise<CLIFlags> {
  // Load stored config
  const storedConfig = await llmCliConfigStore.getConfig()

  const flags = parseArgs(args, {
    string: ['file', 'provider', 'model', 'format'],
    collect: ['file'],
    boolean: ['stdin', 'interactive', 'verbose', 'help', 'clear'],
    alias: {
      f: 'file',
      s: 'stdin',
      p: 'provider',
      m: 'model',
      fmt: 'format',
      c: 'context',
      i: 'interactive',
    },
    default: {
      stdin: false,
      provider: storedConfig.provider ?? 'openrouter',
      format: 'text',
      verbose: false,
    },
  }) as CLIFlags

  if (flags.help) {
    showHelp()
    Deno.exit(0)
  }

  // Handle context flag
  if (
    flags.context == null ||
    (typeof flags.context === 'string' && flags.context === 'true') ||
    (typeof flags.context === 'boolean' && flags.context === true)
  ) {
    console.log('Setting --context to default value: llm-cli-context.md')
    flags.context = 'llm-cli-context.md'
  }

  if (flags.context != null && typeof flags.context !== 'string') {
    console.error(
      'Error: Invalid value for --context flag. Please provide a valid file path.',
    )
    Deno.exit(1)
  }

  // Use model from stored config if not provided
  if (!flags.model && storedConfig.model) {
    flags.model = storedConfig.model
  }

  // Save the new configuration
  await llmCliConfigStore.updateConfig({
    files: flags.file?.reduce(
      (acc, pattern) => ({ ...acc, [pattern]: true }),
      {},
    ),
    provider: flags.provider,
    model: flags.model,
  })

  return flags
}

export function validateEnvVars(provider: Provider): void {
  if (provider === 'openrouter' && !Deno.env.get('OPENROUTER_API_KEY')) {
    console.error('Error: OPENROUTER_API_KEY environment variable is not set')
    Deno.exit(1)
  }
  if (provider === 'groq' && !Deno.env.get('GROQ_API_KEY')) {
    console.error('Error: GROQ_API_KEY environment variable is not set')
    Deno.exit(1)
  }
  if (provider === 'cerebras' && !Deno.env.get('CEREBRAS_API_KEY')) {
    console.error('Error: CEREBRAS_API_KEY environment variable is not set')
    Deno.exit(1)
  }
}

function showHelp(): void {
  console.log(`
Usage: llm-cli [options]

Options:
-f, --file <file>       Read input from a file
-s, --stdin             Read input from stdin
-p, --provider <name>    Choose provider (openrouter or groq)
-m, --model <name>       Choose model (default: deepseek/deepseek-chat)
--format <format>        Output format (text, json, markdown)
-i, --interactive       Enter interactive mode
--context <file>        Load/save conversation context
--verbose               Enable verbose logging
--clear                 Clear the llm-out.md and context files
--help                  Display this help message
  `)
}
