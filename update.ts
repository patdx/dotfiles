#!/usr/bin/env -S deno run --allow-all

// deno run -A https://raw.githubusercontent.com/patdx/dotfiles/main/update.ts

import $ from '@david/dax';

await $`bun upgrade`;
await $`deno upgrade`;
await $`fnm install 20`;
await $`fnm default 20`;
await $`fnm use 20`;
await $`npm update -g --latest`;
await $`corepack install --global pnpm`;

if (await commandExists('yt-dlp')) {
  await $`yt-dlp -U`;
}

await import(
  'https://raw.githubusercontent.com/patdx/dotfiles/main/install-gcm-linux.ts'
).then((m) => m.installGcmLinux());

console.log('Update completed successfully!');

async function commandExists(command: string): Promise<boolean> {
  const result = await $`command -v ${command}`.quiet().noThrow();
  return result.code === 0;
}
