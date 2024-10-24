#!/usr/bin/env -S deno run --allow-all

/**
 * This file does some general updates for Mac or Linux computer
 *
 * @module
 */

import $ from '@david/dax';

export async function update() {
  if (await commandExists('bun')) {
    await $`bun upgrade`;
  }

  if (await commandExists('deno')) {
    await $`deno upgrade`;
  }

  if (await commandExists('fnm')) {
    await $`fnm install 20`;
    await $`fnm default 20`;
    await $`fnm use 20`;
  }

  if (await commandExists('npm')) {
    await $`npm update -g --latest`;
  }

  if (await commandExists('corepack')) {
    await $`corepack install --global pnpm`;
  }

  if (await commandExists('yt-dlp')) {
    await $`yt-dlp -U`;
  }

  if (await commandExists('brew')) {
    await $`brew upgrade`;
  }

  await import('./install-gcm-linux.ts').then((m) => m.installGcmLinux());

  console.log('Update completed successfully!');
}

async function commandExists(command: string): Promise<boolean> {
  const result = await $`command -v ${command}`.quiet().noThrow();
  return result.code === 0;
}

if (import.meta.main) {
  await update();
}
