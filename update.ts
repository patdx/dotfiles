#!/usr/bin/env bun

// How to run:
// 1. Install Bun at https://bun.sh/docs/installation
// 2. Run the following line in your terminal:
//    curl https://raw.githubusercontent.com/patdx/dotfiles/main/update.ts | bun run -

import type { OnLoadResult } from 'bun';
import { $ } from 'bun';

await init();

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

async function init() {
  const rx_any = /./;
  const rx_http = /^https?:\/\//;
  const rx_relative_path = /^\.\.?\//;

  Bun.plugin({
    name: 'http_imports',
    setup(build) {
      async function load_http_module(href: string): Promise<OnLoadResult> {
        const response = await fetch(href);
        const text = await response.text();
        if (response.ok) {
          return { contents: text, loader: 'tsx' };
        } else {
          throw new Error(`Failed to load module '${href}': ${text}`);
        }
      }

      build.onResolve({ filter: rx_relative_path }, function (args) {
        if (rx_http.test(args.importer)) {
          return { path: new URL(args.path, args.importer).href };
        }
      });
      build.onLoad({ filter: rx_any, namespace: 'http' }, function (args) {
        return load_http_module('http:' + args.path);
      });
      build.onLoad({ filter: rx_any, namespace: 'https' }, function (args) {
        return load_http_module('https:' + args.path);
      });
    },
  });
}

async function commandExists(command: string): Promise<boolean> {
  const result = await $`command -v ${command}`.quiet().nothrow();
  return result.exitCode === 0;
}
