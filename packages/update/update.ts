#!/usr/bin/env -S deno run --allow-all

/**
 * This file does some general updates for Mac or Linux computer
 *
 * @module
 */

import $ from '@david/dax'
import process from 'node:process'

$.setPrintCommand(true)

export async function update() {
  if (await commandExists('bun')) {
    await $`bun upgrade`
  }

  if (await commandExists('deno')) {
    await $`deno upgrade`
  }

  if (await commandExists('fnm')) {
    await $`fnm install 22`
    await $`fnm default 22`
    await $`fnm use 22`
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

  if (process.platform === 'linux') {
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
