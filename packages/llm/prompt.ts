import { readAll } from '@std/io/read-all'
import { CLIFlags, PromptResult } from './types.ts'
import { expandGlob } from '@std/fs/expand-glob'
import { relative } from '@std/path/relative'
import { Ask } from '@sallai/ask'
import { use } from 'hono/jsx'
import { llmCliConfigStore } from './llm-cli-config-store.ts'

const ask = new Ask()

export async function getPrompt(flags: CLIFlags): Promise<PromptResult> {
  const fullParts: string[] = []
  const loggedParts: string[] = []

  const config = await llmCliConfigStore.getConfig()

  const providerInfo = `[Using provider: ${config.provider}${
    config.model ? `, model: ${config.model}` : ''
  }]`

  // Add provider and model info to logged parts
  loggedParts.push(providerInfo)

  // Read context file if specified
  if (typeof flags.context === 'string') {
    try {
      const contextContent = await Deno.readTextFile(flags.context)
      fullParts.push(`[Context from ${flags.context}]\n${contextContent}`)
      loggedParts.push(`[Context from ${flags.context}]`)
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        // no context yet, gracefully ignore
      } else {
        console.error(
          `Error reading context file ${flags.context}: ${
            (error as Error).message
          }`,
        )
        Deno.exit(1)
      }
    }
  }

  // Get enabled file patterns from config
  const enabledPatterns = config.files
    ? Object.entries(config.files)
      .filter(([_, enabled]) => enabled)
      .map(([pattern]) => pattern)
    : flags.file || []

  if (enabledPatterns.length > 0) {
    const uniqueFiles = new Set<string>()

    // Expand each glob pattern
    for (const pattern of enabledPatterns) {
      try {
        for await (const file of expandGlob(pattern)) {
          if (file.isFile) {
            uniqueFiles.add(file.path)
          }
        }
      } catch (error) {
        throw new Error(
          `Failed to expand glob pattern ${pattern}: ${
            (error as Error).message
          }`,
        )
      }
    }

    // Sort files and read their content
    const sortedFiles = Array.from(uniqueFiles).sort()
    for (const file of sortedFiles) {
      try {
        const relativePath = relative(Deno.cwd(), file)
        console.log(`Reading file: ${relativePath}`)
        const fileContent = await Deno.readTextFile(file)
        fullParts.push(
          `[File input from ${relativePath}]\n${fileContent.trim()}`,
        )
        loggedParts.push(`[File input from ${relativePath}]`)
      } catch (error) {
        throw new Error(
          `Failed to read file ${file}: ${(error as Error).message}`,
        )
      }
    }
  }

  if (flags.stdin) {
    console.log('Reading stdin')
    try {
      const decoder = new TextDecoder()
      const stdinContent = await readAll(Deno.stdin)
      const stdinText = decoder.decode(stdinContent).trim()
      console.log('Done reading stdin')
      if (stdinText) {
        fullParts.push(`[Stdin input]\n${stdinText}`)
        loggedParts.push('[Stdin input]')
      }
    } catch (error) {
      console.error(`Error reading stdin: ${(error as Error).message}`)
      Deno.exit(1)
    }
  }

  if (flags._.length > 0) {
    const cmdPrompt = flags._[0] as string
    fullParts.push(`[Command-line prompt]\n${cmdPrompt}`)
    loggedParts.push('[Command-line prompt]')
  }

  if (flags.interactive) {
    while (true) {
      console.log(providerInfo)
      let { userPrompt } = await ask.input(
        {
          name: 'userPrompt',
          message: 'You:',
        } as const,
      )
      userPrompt = userPrompt?.trim()
      if (!userPrompt || userPrompt.toLowerCase() === 'exit') {
        console.log('Exiting interactive mode.')
        Deno.exit(0)
      } else if (userPrompt.toLowerCase() === 'clear') {
        try {
          if (flags.context) {
            await Deno.writeTextFile(flags.context, '')
          }
          console.log('Context files cleared. You can continue.')
        } catch (error) {
          console.error(
            `Error clearing context files: ${(error as Error).message}`,
          )
        }
      } else {
        fullParts.push(`[User input]\n${userPrompt}`)
        loggedParts.push(`[User input]\n${userPrompt}`)
        break
      }
    }
  }

  return {
    fullPrompt: fullParts.join('\n\n'),
    loggedPrompt: loggedParts.join('\n'),
  }
}

export async function clearContextFiles(context?: string): Promise<void> {
  try {
    if (context) {
      await Deno.writeTextFile(context, '')
    }
    console.log('Files cleared successfully')
  } catch (error) {
    console.error(`Error clearing files: ${(error as Error).message}`)
    Deno.exit(1)
  }
}
