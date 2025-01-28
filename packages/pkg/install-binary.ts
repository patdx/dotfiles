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
} from './shared/shared.ts'
import { checkUrl } from './shared/url-checker.ts'
import { guessBinaryName } from './shared/guess-binary-name.ts'
import type { InstallOptions, KnownPackage } from './shared/types.ts'

export async function downloadAndInstall(
  input: KnownPackage | InstallOptions,
) {
  let options: InstallOptions
  if ('name' in input) {
    const knownPackage = input as KnownPackage
    options = typeof knownPackage.options === 'function'
      ? await knownPackage.options()
      : knownPackage.options
  } else {
    options = input
  }

  const {
    url: inputUrl,
    binaryName: providedBinaryName,
    version = 'latest',
    shortcut,
    urlProvider,
  } = options

  const { binaryUrl, version: detectedVersion, type } = await checkUrl(
    inputUrl,
    urlProvider,
  )

  const binaryName = providedBinaryName ?? guessBinaryName(binaryUrl)
  const finalVersion = version === 'latest'
    ? (detectedVersion ?? 'latest')
    : version

  const installDir = join(PKG_HOME, binaryName)
  const installVersionDir = join(installDir, finalVersion)
  const installCurrentDir = join(installDir, 'current')

  // Check if current version matches the requested version
  if (await exists(installCurrentDir)) {
    try {
      const currentTarget = await Deno.readLink(installCurrentDir)
      const currentVersion = currentTarget.split('/').pop()
      if (currentVersion === finalVersion) {
        console.log(
          `${binaryName} ${finalVersion} is already installed and is the current version`,
        )
        return
      }
    } catch (error: unknown) {
      console.warn(
        `Could not read current version symlink: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      )
    }
  }

  if (await exists(installVersionDir)) {
    console.log(`${binaryName} ${finalVersion} is already downloaded`)
  } else {
    using tempDir = new TempDir()
    const downloadPath = join(
      tempDir.path,
      `download.${type === 'targz' ? 'tar.gz' : 'zip'}`,
    )

    await downloadToFile(binaryUrl, downloadPath)

    const extractDir = join(tempDir.path, 'extracted')
    await Deno.mkdir(extractDir, { recursive: true })

    if (type === 'targz') {
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

  if (options.doAfterInstall) {
    await options.doAfterInstall()
  }

  console.log(
    `${binaryName} version ${finalVersion} has been installed to ${installVersionDir}`,
  )
  console.log(`Binary available at: ${localBinPath}`)
}
