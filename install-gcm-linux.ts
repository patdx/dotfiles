#!/usr/bin/env bun

// https://github.com/git-ecosystem/git-credential-manager/blob/release/docs/install.md

import { $ } from 'bun';

type Release = {
  assets: {
    name: string;
    browser_download_url: string;
  }[];
};

const result: Release = await fetch(
  'https://api.github.com/repos/git-ecosystem/git-credential-manager/releases/latest',
).then((r) => r.json());

const asset = result.assets.find(
  (a) =>
    a.name.startsWith('gcm-linux_amd64') &&
    !a.name.endsWith('symbols.tar.gz') &&
    a.name.endsWith('.tar.gz'),
);

if (!asset) {
  console.log(
    `No asset found. All assets: ${JSON.stringify(
      result.assets.map((asset) => asset.name),
    )}`,
  );
  process.exit(1);
}

console.log(`Downloading: ${asset.name}`);

await $`curl -L -o gcm.tar.gz ${asset.browser_download_url}`;

const uid = process.getuid?.();
console.log(`UID: ${uid}`);
if (uid !== 0) {
  console.log('Requesting root privileges');
  await $`sudo tar -xvf gcm.tar.gz -C /usr/local/bin`;
} else {
  await $`tar -xvf gcm.tar.gz -C /usr/local/bin`;
}

await $`git-credential-manager configure`;

//

console.log('');
console.log(`Note: Additional configuration required for Linux`);
console.log(
  'https://github.com/git-ecosystem/git-credential-manager/blob/release/docs/credstores.md',
);
console.log(
  'For GUI Linux users, it is recommended to use freedesktop.org Secret Service API:',
);
console.log('');
console.log(`git config --global credential.credentialStore secretservice`);
