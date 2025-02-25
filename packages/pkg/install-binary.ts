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

  // Support both new format (files array) and legacy format (url)
  const {
    files = [],
    binaryName: providedBinaryName,
    version = 'latest',
    shortcut,
    url: legacyUrl,
    urlProvider: legacyUrlProvider,
  } = options

  // Migrate legacy format to new format if needed
  if (legacyUrl && files.length === 0) {
    files.push({
      url: legacyUrl,
      urlProvider: legacyUrlProvider,
    })
  }

  if (files.length === 0) {
    throw new Error('No files specified for download')
  }

  // Process the first file to determine version and binary name (legacy behavior)
  const firstFile = files[0]
  const { binaryUrl, version: detectedVersion, type } = await checkUrl(
    firstFile.url,
    firstFile.urlProvider,
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
    await Deno.mkdir(installDir, { recursive: true })
    await Deno.mkdir(installVersionDir, { recursive: true })

    // Process each file in the files array
    for (const fileOptions of files) {
      using tempDir = new TempDir()

      // Process raw file downloads (no extraction)
      if (fileOptions.type === 'raw') {
        const filename = fileOptions.filename || basename(fileOptions.url)
        const targetPath = join(installVersionDir, filename)

        console.log(`Downloading ${fileOptions.url} to ${targetPath}`)
        await downloadToFile(fileOptions.url, targetPath)

        // Make file executable if specified
        if (fileOptions.executable) {
          console.log(`Making ${targetPath} executable`)
          await Deno.chmod(targetPath, 0o755)
        }
      } // Process archive downloads (zip/targz)
      else {
        // Determine file type (zip/targz)
        const fileType = fileOptions.type ||
          (fileOptions.url.includes('.tar.gz') ? 'targz' : 'zip')

        const downloadPath = join(
          tempDir.path,
          `download.${fileType === 'targz' ? 'tar.gz' : 'zip'}`,
        )

        // Check URL and download file
        const { binaryUrl } = await checkUrl(
          fileOptions.url,
          fileOptions.urlProvider,
        )
        await downloadToFile(binaryUrl, downloadPath)

        // Extract file
        const extractDir = join(tempDir.path, 'extracted')
        await Deno.mkdir(extractDir, { recursive: true })

        if (fileType === 'targz') {
          await extractTarGz(downloadPath, extractDir)
        } else {
          await extractZip(downloadPath, extractDir)
        }

        const processingDir = await getProcessingDir(extractDir)
        console.log(`Processing directory: ${processingDir}`)

        // Move extracted files to install directory
        await tryMove(processingDir, installVersionDir, { overwrite: true })
      }
    }
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

  // Link binary to ~/.local/bin if it exists
  if (await exists(binaryPath)) {
    await Deno.symlink(binaryPath, localBinPath)
  }

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
