/**
 * Install arbitrary zipped binaries on Linux
 *
 * @module
 */

import { ensureDir } from '@std/fs'
import { join } from '@std/path'
import { homedir as getHomeDir } from 'node:os'
import { downloadToFile, extractZip, tryMove } from './shared.ts'

// Consider referring to https://github.com/denoland/deno_install/tree/master/shell-setup for further improvements

export async function downloadAndInstall(url: string, binaryName: string) {
  const tempDir = await Deno.makeTempDir()
  const zipPath = join(tempDir, 'download.zip')
  await downloadToFile(url, zipPath)

  await extractZip(zipPath, tempDir)

  const binaryPath = join(tempDir, binaryName)
  const localBinDir = join(getHomeDir() || '', '.local', 'bin')
  await ensureDir(localBinDir)
  const destPath = join(localBinDir, binaryName)

  await tryMove(binaryPath, destPath, {
    overwrite: true,
  })
  await Deno.chmod(destPath, 0o755)

  const path = Deno.env.get('PATH') || ''

  if (path.includes(localBinDir)) {
    console.log(`${localBinDir} is already in your PATH`)
  } else {
    const shell = Deno.env.get('SHELL') || ''
    const isZsh = shell.includes('zsh')
    const shellRcFile = isZsh
      ? join(getHomeDir() || '', '.zshrc')
      : join(getHomeDir() || '', '.bashrc')

    console.log(`Detected shell: ${isZsh ? 'zsh' : 'bash'}`)

    await Deno.writeTextFile(
      shellRcFile,
      `\nexport PATH="$PATH:${localBinDir}"\n`,
      { append: true },
    )

    console.log(`Added ${localBinDir} to PATH in ${shellRcFile}`)
    console.log(
      `Please restart your terminal or run 'source ${shellRcFile}' to apply the changes.`,
    )
  }
  await Deno.remove(tempDir, { recursive: true })

  console.log(`${binaryName} has been installed to ${destPath}`)
}

if (import.meta.main) {
  const [url, binaryName] = Deno.args
  if (!url || !binaryName) {
    console.error('Usage: deno run -A install-binary.ts <url> <binaryName>')
    Deno.exit(1)
  }
  await downloadAndInstall(url, binaryName)
}
