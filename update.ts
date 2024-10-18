#!/usr/bin/env bun

// How to run:
// 1. Install Bun at https://bun.sh/docs/installation
// 2. Run the following line in your terminal:
//    curl https://raw.githubusercontent.com/patdx/dotfiles/main/update.ts | bun run -

import { $ } from 'bun';

await $`bun upgrade`;
await $`deno upgrade`;
await $`fnm install 20`;
await $`fnm default 20`;
await $`fnm use 20`;
await $`npm update -g --latest`;
await $`corepack install --global pnpm`;
await $`yt-dlp -U`;
await $`curl https://raw.githubusercontent.com/patdx/dotfiles/main/install-gcm-linux.ts | bun run -`;

console.log('Update completed successfully!');
