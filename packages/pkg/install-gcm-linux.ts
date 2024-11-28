#!/usr/bin/env -S deno run --allow-all

/**
 * This file helps to install Github Credential Manager on Linux
 *
 * @module
 */

import $ from '@david/dax'
import fs from 'node:fs'
import process from 'node:process'

type Release = {
  /** @example "v2.6.0" */
  tag_name?: string
  assets: {
    name: string
    browser_download_url: string
  }[]
}

export async function installGcmLinux() {
  const result: Release = await fetch(
    'https://api.github.com/repos/git-ecosystem/git-credential-manager/releases/latest',
  ).then((r) => r.json())

  const latestVersion = getLatestVersion(result)
  const installedVersion = await getInstalledVersion()

  console.log(`Installed: ${installedVersion} Latest: ${latestVersion}`)

  if (installedVersion === latestVersion) {
    console.log('Already up to date')
    return
  }

  const asset = result.assets.find(
    (a) =>
      a.name.startsWith('gcm-linux_amd64') &&
      !a.name.endsWith('symbols.tar.gz') &&
      a.name.endsWith('.tar.gz'),
  )

  if (!asset) {
    console.log(
      `No asset found. All assets: ${
        JSON.stringify(
          result.assets.map((asset) => asset.name),
        )
      }`,
    )
    process.exit(1)
  }

  using _tempDir = new TempDir('.temp')

  await downloadFile(asset.browser_download_url, '.temp/gcm.tar.gz')

  const uid = process.getuid?.()
  console.log(`UID: ${uid}`)
  if (uid !== 0) {
    console.log('Requesting root privileges')
    await $`sudo tar -xvf gcm.tar.gz -C /usr/local/bin`
  } else {
    await $`tar -xvf gcm.tar.gz -C /usr/local/bin`
  }

  await $`git-credential-manager configure`

  //

  console.log('')
  console.log(`Note: Additional configuration required for Linux`)
  console.log(
    'https://github.com/git-ecosystem/git-credential-manager/blob/release/docs/credstores.md',
  )
  console.log(
    'For GUI Linux users, it is recommended to use freedesktop.org Secret Service API:',
  )
  console.log('')
  console.log(`git config --global credential.credentialStore secretservice`)
}

class TempDir implements Disposable {
  #path: string

  constructor(path: string) {
    this.#path = path
    // clear it in case it already exists
    fs.rmSync(this.#path, { recursive: true, force: true })
    fs.mkdirSync(path, { recursive: true })
  }

  get path() {
    return this.#path
  }

  [Symbol.dispose]() {
    // Remove the directory and its contents recursively
    fs.rmSync(this.#path, { recursive: true, force: true })
  }
}

async function downloadFile(url: string, filename: string) {
  console.log(`Downloading file from ${url} to ${filename}`)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`)
  }
  await Deno.writeFile(filename, response.body!)
  console.log(`Downloaded file to ${filename}`)
}

function getLatestVersion(release: Release) {
  return release.tag_name?.replace(/^v/, '')
}

async function getInstalledVersion() {
  const result = await $`git-credential-manager --version`.quiet()
  // May return something like:
  // 2.6.0+3c28096588f549cb46f36b552390514356830abe
  const [version] = result.stdout.trim().split('+')
  return version
}

if (import.meta.main) {
  await installGcmLinux()
}
