#!/usr/bin/env -S deno run --allow-all

/**
 * This file helps to install Github Credential Manager on Linux
 *
 * @module
 */

import $ from '@david/dax'
import process from 'node:process'
import { downloadAndInstall } from './install-binary.ts'

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

  await downloadAndInstall({
    url: asset.browser_download_url,
    binaryName: 'git-credential-manager',
    version: latestVersion,
  })

  await $`git-credential-manager configure`

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
