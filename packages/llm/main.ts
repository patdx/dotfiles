import { parseFlags, validateEnvVars } from './config.ts'
import { streamResponse } from './output.ts'
import { clearContextFiles, getPrompt } from './prompt.ts'
import { CLIFlags, Model, Provider, supportedModelByProvider } from './types.ts'
import { app } from './server.tsx'
import * as v from 'valibot'
import { llmCliConfigStore } from './llm-cli-config-store.ts'

async function main() {
  const flags = await parseFlags(Deno.args)

  // Start the web server in the background
  const port = 3000
  const controller = new AbortController()
  // const serverPromise =
  Deno.serve(
    {
      port,
      signal: controller.signal,
      onListen({ hostname, port }) {
        console.log(`Web dashboard running at http://${hostname}:${port}`)
      },
    },
    app.fetch,
  )

  // Clear files if requested
  if (flags.clear) {
    await clearContextFiles(flags.context)
    if (!flags.interactive) {
      controller.abort() // Clean up server before exit
      Deno.exit(0)
    }
  }

  if (flags.verbose) {
    console.log(`Using provider: ${flags.provider}`)
    if (flags.model) {
      console.log(`Using model: ${flags.model}`)
    }
  }

  // Main execution
  if (flags.interactive) {
    console.log(
      'Entering interactive mode. Press Ctrl+C or submit empty prompt to exit.',
    )
    while (await runConversation(flags)) {
      // just keep going
    }
  } else {
    await runConversation(flags)
  }

  // Clean up server before exit
  controller.abort()
  if (flags.verbose) {
    console.log('\nProgram completed successfully')
  }
}

if (import.meta.main) {
  main().catch((error) => {
    if (error instanceof Error) {
      console.error('Fatal error:', error.message)
    } else {
      console.error('Fatal error:', error)
    }
    Deno.exit(1)
  })
}

function validateProviderAndModel(provider: string, model?: string): {
  provider: Provider
  model: Model
} {
  try {
    const validProvider = v.parse(Provider, provider)
    const supportedModels = supportedModelByProvider[validProvider]

    // If no model specified, use the first supported model for the provider
    const selectedModel = model || supportedModels[0]

    if (!supportedModels.includes(selectedModel as Model)) {
      throw new Error(
        `Model "${selectedModel}" is not supported by provider "${provider}". Supported models: ${
          supportedModels.join(', ')
        }`,
      )
    }

    v.parse(Model, selectedModel)

    return { provider: validProvider, model: selectedModel as Model }
  } catch (error) {
    if (error instanceof v.ValiError) {
      if (error.issues[0].path?.[0] === 'provider') {
        throw new Error(
          `Invalid provider. Supported providers: openrouter, groq`,
        )
      } else {
        throw new Error(
          `Invalid model. Supported models: ${
            Object.values(supportedModelByProvider).flat().join(', ')
          }`,
        )
      }
    }
    throw error
  }
}

async function runConversation(flags: CLIFlags): Promise<boolean> {
  try {
    const { fullPrompt, loggedPrompt } = await getPrompt(flags)

    if (fullPrompt.trim() === '') {
      return false
    }

    const config = await llmCliConfigStore.getConfig()
    // Validate provider and model at runtime since they can be changed via web interface
    const { provider, model } = validateProviderAndModel(
      config.provider!,
      config.model ?? undefined,
    )
    validateEnvVars(provider)

    await streamResponse(
      fullPrompt,
      loggedPrompt,
      provider,
      model,
      flags.format,
      flags.context,
    )
    console.log('\n---')
  } catch (error) {
    if (error instanceof Error) {
      console.error('\nError:', error.message)
    }
    console.log(
      '\nYou can try again with a shorter prompt or different model.',
    )
  }

  return true
}
