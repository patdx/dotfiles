#!/usr/bin/env -S deno run --allow-all

/**
 * This file does some general updates for Mac or Linux computer
 *
 * @module
 */

import $ from '@david/dax'
import process from 'node:process'

async function getGlobalNpmPackages(): Promise<string[]> {
  try {
    const output = (await $`npm ls -g --json`.quiet()).stdout
    const json = JSON.parse(output)
    // Handle potential changes in npm's JSON output format
    if (json && typeof json === 'object' && 'dependencies' in json) {
      return Object.keys(json.dependencies)
    }
    console.log(
      'Warning: Unexpected npm ls output format. Continuing without package tracking.',
    )
    return []
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.log('Warning: Failed to get global npm packages:', message)
    console.log('Continuing node update without package tracking.')
    return []
  }
}

$.setPrintCommand(true)

export async function update() {
  if (await commandExists('bun')) {
    await $`bun upgrade`
  }

  if (await commandExists('deno')) {
    await $`deno upgrade`
  }

  if (await commandExists('fnm')) {
    // Get initial global packages
    const initialPackages = await getGlobalNpmPackages()

    await $`fnm install 22`
    await $`fnm default 22`
    await $`fnm use 22`

    // Get new global packages
    const newPackages = await getGlobalNpmPackages()

    // Find and install missing packages
    const missingPackages = initialPackages.filter((pkg) =>
      !newPackages.includes(pkg)
    )
    if (missingPackages.length > 0) {
      console.log(
        'Reinstalling missing global packages:',
        missingPackages.join(', '),
      )
      await $`npm install -g ${missingPackages.join(' ')}`
    }
  }

  if (await commandExists('npm')) {
    await $`npm update --global --latest`
  }

  if (await commandExists('corepack')) {
    await $`corepack install --global pnpm@latest`
  }

  if (await commandExists('yt-dlp')) {
    await $`yt-dlp -U`
  }

  if (await commandExists('brew')) {
    await $`brew upgrade`
  }

  if (
    process.platform === 'linux' &&
    await commandExists('git-credential-manager')
  ) {
    const { default: gcm } = await import(
      '@patdx/pkg/repo/git-credential-manager'
    )
    const { downloadAndInstall } = await import('@patdx/pkg/install-binary')
    await downloadAndInstall(gcm)
  }

  console.log('Update completed successfully!')
}

async function commandExists(command: string): Promise<boolean> {
  const result = await $`command -v ${command}`
    .printCommand(false)
    .quiet()
    .noThrow()
  return result.code === 0
}

if (import.meta.main) {
  await update()
}
