/**
 * Script to Intall Windsurf IDE on Linux x64 Fedora
 * @module
 */

import { exists } from '@std/fs'
import createDesktopShortcut from 'create-desktop-shortcuts'
import { homedir as getHomeDir } from 'node:os'
import path from 'node:path'
import { ofetch } from 'ofetch'
import {
  downloadToFile,
  extractTarGz,
  getProcessingDir,
  TempDir,
  tryMove,
} from './shared.ts'

const PKG_HOME = path.resolve(getHomeDir(), '.patdx', 'pkg')
const LOCAL_BIN_DIR = path.join(getHomeDir() || '', '.local', 'bin')

console.log(JSON.stringify({ PKG_HOME, LOCAL_BIN_DIR }, null, 2))

export async function installWindsurf() {
  //   {
  //     "url": "https://windsurf-stable.codeiumdata.com/linux-x64/stable/d33d40f6cd3a4d7e451b22e94359230a4aa8c161/Windsurf-linux-x64-1.0.5.tar.gz",
  //     "name": "1.94.0",
  //     "version": "d33d40f6cd3a4d7e451b22e94359230a4aa8c161",
  //     "productVersion": "1.94.0",
  //     "hash": "738f7c5f8caeae66310220f7851384f623ba9105",
  //     "timestamp": 1732747065,
  //     "sha256hash": "f8ff6f491f0ba80b43ab48aa92aa53b8e57c8c58e5b531ca0c89732ae3722b86",
  //     "supportsFastUpdate": true,
  //     "windsurfVersion": "1.0.5"
  // }

  const result = await ofetch<{
    url: string
    name: string
    version: string
    productVersion: string
    hash: string
    timestamp: number
    sha256hash: string
    supportsFastUpdate: boolean
    windsurfVersion: string
  }>('https://windsurf-stable.codeium.com/api/update/linux-x64/stable/latest')

  // ~/.patdx/pkg/windsurf
  const installDir = path.join(PKG_HOME, 'windsurf')

  // ~/.patdx/pkg/windsurf/1.0.5
  const installVersionDir = path.join(installDir, result.windsurfVersion)

  // ~/.patdx/pkg/windsurf/current, symlinked to actual version dir
  const installCurrentDir = path.join(installDir, 'current')

  if (await exists(installVersionDir)) {
    console.log(`Windsurf ${result.windsurfVersion} is already downloaded`)
  } else {
    // DO NOT CHANGE THE "using" it is correct!
    using tempDir = new TempDir()
    const downloadPath = path.join(tempDir.path, 'download.tar.gz')

    await downloadToFile(result.url, downloadPath)

    const extractDir = path.join(tempDir.path, 'extracted')
    await Deno.mkdir(extractDir, { recursive: true })

    await extractTarGz(downloadPath, extractDir)

    const processingDir = await getProcessingDir(extractDir)

    console.log(`Processing directory: ${processingDir}`)

    await Deno.mkdir(installDir, { recursive: true })

    await tryMove(processingDir, installVersionDir, {
      overwrite: true,
    })
  }

  console.log(`Linking ${installCurrentDir} to ${installVersionDir}`)
  await Deno.remove(installCurrentDir, {
    recursive: true,
  }) // in case symlink already exists

  await Deno.symlink(
    installVersionDir,
    installCurrentDir,
  )

  const localBin = path.join(LOCAL_BIN_DIR, 'windsurf')

  const linkOld = path.join(installDir, 'current', 'windsurf')
  const linkNew = localBin

  console.log(`Linking ${linkNew} to ${linkOld}`)

  await Deno.remove(linkNew) // in case symlink already exists
  await Deno.symlink(linkOld, linkNew)

  const desktopDir = path.join(
    getHomeDir(),
    '.local',
    'share',
    'applications',
  )

  console.log(`Creating desktop shortcut in ${desktopDir}`)

  const success = createDesktopShortcut({
    linux: {
      filePath: localBin,
      outputPath: desktopDir,
      name: 'Windsurf',
      icon: path.join(
        PKG_HOME,
        'windsurf',
        result.windsurfVersion,
        'resources',
        'app',
        'resources',
        'linux',
        'code.png',
      ),
    },
  })

  console.log(`Shortcut created: ${success}`)
}

if (import.meta.main) {
  await installWindsurf()
}
