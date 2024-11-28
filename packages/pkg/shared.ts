import path from 'node:path'
import { copy, ensureDir, move } from '@std/fs'

export async function downloadToFile(url: string, filePath: string) {
  console.log(`Downloading file from ${url} to ${filePath}`)
  const response = await fetch(url)
  const file = await Deno.open(filePath, { create: true, write: true })
  await response.body?.pipeTo(file.writable)
  console.log(`Downloaded file to ${filePath}`)
}

export async function extractZip(
  zipPath: string,
  dir: string,
): Promise<void> {
  const command = new Deno.Command('unzip', {
    args: ['-o', zipPath, '-d', dir],
  })
  const { success, stdout, stderr, signal } = await command.output()

  if (!success) {
    console.log(stdout)
    console.log(stderr)
    console.error(`Command failed: ${command.toString()}`)
    console.error(`Signal: ${signal}`)
    Deno.exit(1)
  }
}

export async function extractTarGz(
  tarPath: string,
  dir: string,
): Promise<void> {
  const command = new Deno.Command('tar', {
    args: ['-xzvf', tarPath, '-C', dir],
  })
  const { success, stdout, stderr, signal } = await command.output()

  if (!success) {
    console.log(stdout)
    console.log(stderr)
    console.error(`Command failed: ${command.toString()}`)
    console.error(`Signal: ${signal}`)
    Deno.exit(1)
  }
}

export async function printNestedFiles(
  dir: string,
  depth: number = 3,
  currentDepth: number = 0,
): Promise<void> {
  if (currentDepth > depth) return

  for await (const entry of Deno.readDir(dir)) {
    console.log(`${'  '.repeat(currentDepth)}- ${entry.name}`)
    if (entry.isDirectory) {
      await printNestedFiles(
        path.join(dir, entry.name),
        depth,
        currentDepth + 1,
      )
    }
  }
}

export async function getProcessingDir(extractedDir: string): Promise<string> {
  const entries = []
  for await (const entry of Deno.readDir(extractedDir)) {
    entries.push(entry)
  }

  // If there's only one directory, return its path
  if (entries.length === 1 && entries[0].isDirectory) {
    return path.join(extractedDir, entries[0].name)
  }

  // Otherwise, return the original extracted directory
  return extractedDir
}

export class TempDir implements Disposable {
  constructor() {
    this.path = Deno.makeTempDirSync()
  }

  path: string;

  // other methods
  [Symbol.dispose]() {
    console.log(`Removing temporary path ${this.path}`)
    Deno.removeSync(this.path, { recursive: true })
  }
}

export async function tryMove(
  from: string,
  to: string,
  options?: {
    overwrite?: boolean
  },
): Promise<void> {
  console.log(`Moving ${from} to ${to}`)

  let err
  err = await move(from, to, {
    overwrite: options?.overwrite,
  }).catch((err) => err)
  if (!err) {
    return
  }
  console.log(
    `Failed to move ${from} to ${to} due to err ${err}. Trying to copy and delete`,
  )
  err = await copyAndDelete(from, to, {
    overwrite: options?.overwrite,
  }).catch((err) => err)
  if (err) {
    throw err
  }
}

async function copyAndDelete(
  from: string,
  to: string,
  options?: {
    overwrite?: boolean
  },
) {
  await copy(from, to, {
    overwrite: options?.overwrite,
  })
  await Deno.remove(from, {
    recursive: true,
  })
}
