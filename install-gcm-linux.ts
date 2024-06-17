#!/usr/bin/env bun

// https://github.com/git-ecosystem/git-credential-manager/blob/release/docs/install.md

import { $ } from 'bun';

const uid = process.getuid?.();

console.log(`UID: ${uid}`);

if (uid !== 0) {
  console.log('This script must be run as root');
  await $`sudo ${process.argv[0]} ${process.argv[1]}`;
  process.exit(1);
}

type Release = {
  assets: {
    name: string;
    browser_download_url: string;
  }[];
};

const result: Release = await fetch(
  'https://api.github.com/repos/git-ecosystem/git-credential-manager/releases/latest'
).then((r) => r.json());

const asset = result.assets.find(
  (a) =>
    a.name.startsWith('gcm-linux_amd64') &&
    !a.name.endsWith('symbols.tar.gz') &&
    a.name.endsWith('.tar.gz')
);

if (!asset) {
  console.log(
    `No asset found. All assets: ${JSON.stringify(
      result.assets.map((asset) => asset.name)
    )}`
  );
  process.exit(1);
}

console.log(`Downloading: ${asset.name}`);

await $`curl -L -o gcm.tar.gz ${asset.browser_download_url}`;
await $`tar -xvf gcm.tar.gz -C /usr/local/bin`;
await $`git-credential-manager configure`;
