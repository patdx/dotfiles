import { z } from 'zod'
import { tool } from 'ai'
import { Ask } from '@sallai/ask'

const ask = new Ask()

export const writeFileTool = tool({
  description: 'Write content to a file',
  parameters: z.object({
    path: z.string().describe('The path of the file to write to'),
    content: z.string().describe('The content to write to the file'),
    append: z.boolean().optional().describe(
      'If true, append to the file instead of overwriting',
    ),
  }),
  execute: async ({ path, content, append }) => {
    const tempPath = `temp-${path}` // we need to keep the same file extension for formatting to possibly work
    try {
      if (append) {
        let existingContent = ''
        try {
          existingContent = await Deno.readTextFile(path)
        } catch (error) {
          // File doesn't exist yet, that's fine for append mode
        }
        await Deno.writeTextFile(tempPath, existingContent + '\n\n' + content)
      } else {
        await Deno.writeTextFile(tempPath, content)
      }

      // Try to format the file with deno fmt
      try {
        const fmtProcess = new Deno.Command('deno', {
          args: ['fmt', tempPath],
          stdout: 'piped',
          stderr: 'piped',
        }).spawn()
        await fmtProcess.output()
      } catch (error) {
        // Continue gracefully if formatting fails
        console.warn('Failed to format file:', error)
      }
    } catch (error: unknown) {
      return {
        success: false,
        message: `Failed to write temporary file: ${
          error instanceof Error ? error.message : String(error)
        }`,
      }
    }

    try {
      const diffProcess = new Deno.Command('diff', {
        args: ['-u', '--color', path, tempPath],
        stdout: 'piped',
        stderr: 'piped',
      }).spawn()

      const { code, stdout, stderr } = await diffProcess.output()

      if (code === 0) {
        const diffOutput = new TextDecoder().decode(stdout)
        if (diffOutput) {
          console.log(diffOutput)
        } else {
          console.log('No changes')
        }
      } else if (code === 1) {
        const diffOutput = new TextDecoder().decode(stdout)
        console.log(diffOutput)
      } else {
        const errorOutput = new TextDecoder().decode(stderr)
        console.error(`Diff failed with code ${code}: ${errorOutput}`)
        Deno.remove(tempPath)
        return {
          success: false,
          message: `Diff failed with code ${code}: ${errorOutput}`,
        }
      }

      const { confirm } = await ask.confirm(
        {
          name: 'confirm',
          message:
            `Are you sure you want to write the above content to ${path}?`,
        } as const,
      )
      if (!confirm) {
        Deno.remove(tempPath)
        return { success: false, message: 'Cancelled' }
      }

      await Deno.copyFile(tempPath, path)
      Deno.remove(tempPath)
      return { success: true, message: `File written to ${path}` }
    } catch (error: unknown) {
      Deno.remove(tempPath)
      return {
        success: false,
        message: `Failed to write file: ${
          error instanceof Error ? error.message : String(error)
        }`,
      }
    }
  },
})

export const tools = {
  writeFile: writeFileTool, // Add the new tool here
}
