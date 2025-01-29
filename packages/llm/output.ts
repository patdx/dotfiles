import { smoothStream, streamText } from 'ai'
import { Model, Provider } from './types.ts'
import { createWrappedModel } from './models.ts'
import { tools } from './tools.ts'

export function formatOutput(text: string, format: string): string {
  switch (format) {
    case 'json':
      return JSON.stringify({ response: text })
    case 'markdown':
      return `# Response\n\n${text}`
    default:
      return text
  }
}

export async function streamResponse(
  prompt: string,
  loggedPrompt: string,
  provider: Provider,
  model: Model,
  format: string,
  contextFile?: string,
): Promise<void> {
  const wrappedModel = createWrappedModel(provider, model)
  const encoder = new TextEncoder()

  let contextFileHandle: Deno.FsFile | null = null
  if (contextFile) {
    contextFileHandle = await Deno.open(contextFile, {
      append: true,
      create: true,
    })
  }

  try {
    const result = streamText({
      model: wrappedModel,
      prompt,
      experimental_transform: smoothStream(),
      tools,
      toolChoice: 'auto',
      maxSteps: 5,
    })

    const separator = '\n---\n'
    await contextFileHandle?.write(encoder.encode(separator))
    await contextFileHandle?.write(encoder.encode(`${loggedPrompt}\n\n`))

    for await (const textPart of result.textStream) {
      const formattedOutput = formatOutput(textPart, format)
      await Deno.stdout.write(encoder.encode(formattedOutput))
      await contextFileHandle?.write(encoder.encode(formattedOutput))
    }
  } catch (error) {
    console.error('\nError during streaming:', (error as Error).message)

    //   name: "AI_APICallError",
    // responseBody: '{"error":{"message":"No endpoints found that support tool use. To learn more about provider routing, visit: https://openrouter.ai/docs/provider-routing","code":404}}',
    // console.log(error)
    throw error
  } finally {
    contextFileHandle?.close()
  }
}
