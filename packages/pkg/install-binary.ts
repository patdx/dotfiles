/**
 * Install arbitrary zipped binaries on Linux
 * @module
 */

import { ensureDir, exists } from '@std/fs'
import { basename, join } from '@std/path'
import createDesktopShortcut from 'create-desktop-shortcuts'
import {
  DESKTOP_DIR,
  downloadToFile,
  ensureBinInPath,
  extractTarGz,
  extractZip,
  getProcessingDir,
  LOCAL_BIN_DIR,
  PKG_HOME,
  TempDir,
  tryMove,
} from './shared.ts'

interface InstallOptions {
  url: string
  binaryName: string
  version?: string
  shortcut?: {
    name?: string
    icon?: string
  }
}

function getFileTypeFromUrl(url: string): 'zip' | 'targz' {
  const lowercaseUrl = url.toLowerCase()
  return lowercaseUrl.endsWith('.tar.gz') || lowercaseUrl.endsWith('.tgz')
    ? 'targz'
    : 'zip'
}

export async function downloadAndInstall(options: InstallOptions) {
  const {
    url,
    binaryName,
    version = 'latest',
    shortcut,
  } = options

  const installDir = join(PKG_HOME, binaryName)
  const installVersionDir = join(installDir, version)
  const installCurrentDir = join(installDir, 'current')

  if (await exists(installVersionDir)) {
    console.log(`${binaryName} ${version} is already downloaded`)
  } else {
    using tempDir = new TempDir()
    const fileType = getFileTypeFromUrl(url)
    const downloadPath = join(
      tempDir.path,
      `download.${fileType === 'targz' ? 'tar.gz' : 'zip'}`,
    )

    await downloadToFile(url, downloadPath)

    const extractDir = join(tempDir.path, 'extracted')
    await Deno.mkdir(extractDir, { recursive: true })

    if (fileType === 'targz') {
      await extractTarGz(downloadPath, extractDir)
    } else {
      await extractZip(downloadPath, extractDir)
    }

    const processingDir = await getProcessingDir(extractDir)
    console.log(`Processing directory: ${processingDir}`)

    await Deno.mkdir(installDir, { recursive: true })
    await tryMove(processingDir, installVersionDir, { overwrite: true })
  }

  console.log(`Linking ${installCurrentDir} to ${installVersionDir}`)
  if (await exists(installCurrentDir)) {
    await Deno.remove(installCurrentDir, { recursive: true })
  }
  await Deno.symlink(installVersionDir, installCurrentDir)

  await ensureDir(LOCAL_BIN_DIR)
  const localBinPath = join(LOCAL_BIN_DIR, binaryName)
  const binaryPath = join(installCurrentDir, binaryName)

  console.log(`Linking ${localBinPath} to ${binaryPath}`)
  if (await exists(localBinPath)) {
    await Deno.remove(localBinPath)
  }
  await Deno.symlink(binaryPath, localBinPath)
  await Deno.chmod(binaryPath, 0o755)

  await ensureBinInPath()

  if (shortcut) {
    const success = createDesktopShortcut({
      linux: {
        filePath: localBinPath,
        outputPath: DESKTOP_DIR,
        name: shortcut.name || basename(binaryName),
        icon: shortcut.icon,
      },
    })

    console.log(`Shortcut created: ${success}`)
  }

  console.log(
    `${binaryName} version ${version} has been installed to ${installVersionDir}`,
  )
  console.log(`Binary available at: ${localBinPath}`)
}

if (import.meta.main) {
  const [url, binaryName, version] = Deno.args
  if (!url || !binaryName) {
    console.error(
      'Usage: deno run -A install-binary.ts <url> <binaryName> [version]',
    )
    Deno.exit(1)
  }
  await downloadAndInstall({ url, binaryName, version })
}
