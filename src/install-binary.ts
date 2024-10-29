/**
 * Install arbitrary zipped binaries on Linux
 *
 * @module
 */

import { join } from '@std/path';
import { copy, ensureDir, move } from '@std/fs';
import { homedir as getHomeDir } from 'node:os';

// Consider referring to https://github.com/denoland/deno_install/tree/master/shell-setup for further improvements

export async function downloadAndInstall(url: string, binaryName: string) {
  const tempDir = await Deno.makeTempDir();
  const zipPath = join(tempDir, 'download.zip');
  const response = await fetch(url);
  const zipFile = await Deno.open(zipPath, { create: true, write: true });
  await response.body?.pipeTo(zipFile.writable);

  await extract(zipPath, { dir: tempDir });

  const binaryPath = join(tempDir, binaryName);
  const localBinDir = join(getHomeDir() || '', '.local', 'bin');
  await ensureDir(localBinDir);
  const destPath = join(localBinDir, binaryName);

  await tryMove(binaryPath, destPath, {
    overwrite: true,
  });
  await Deno.chmod(destPath, 0o755);

  const path = Deno.env.get('PATH') || '';

  if (path.includes(localBinDir)) {
    console.log(`${localBinDir} is already in your PATH`);
  } else {
    const shell = Deno.env.get('SHELL') || '';
    const isZsh = shell.includes('zsh');
    const shellRcFile = isZsh
      ? join(getHomeDir() || '', '.zshrc')
      : join(getHomeDir() || '', '.bashrc');

    console.log(`Detected shell: ${isZsh ? 'zsh' : 'bash'}`);

    await Deno.writeTextFile(
      shellRcFile,
      `\nexport PATH="$PATH:${localBinDir}"\n`,
      { append: true },
    );

    console.log(`Added ${localBinDir} to PATH in ${shellRcFile}`);
    console.log(
      `Please restart your terminal or run 'source ${shellRcFile}' to apply the changes.`,
    );
  }
  await Deno.remove(tempDir, { recursive: true });

  console.log(`${binaryName} has been installed to ${destPath}`);
}

if (import.meta.main) {
  const [url, binaryName] = Deno.args;
  if (!url || !binaryName) {
    console.error('Usage: deno run -A install-binary.ts <url> <binaryName>');
    Deno.exit(1);
  }
  await downloadAndInstall(url, binaryName);
}

async function extract(
  zipPath: string,
  options: { dir: string },
): Promise<void> {
  const command = new Deno.Command('unzip', {
    args: ['-o', zipPath, '-d', options.dir],
  });
  const { success, stdout, stderr, signal } = await command.output();

  if (!success) {
    console.log(stdout);
    console.log(stderr);
    console.error(`Command failed: ${command.toString()}`);
    console.error(`Signal: ${signal}`);
    Deno.exit(1);
  }
}

async function tryMove(from: string, to: string, options?: {
  overwrite?: boolean;
}): Promise<void> {
  let err;
  err = await move(from, to, {
    overwrite: options?.overwrite,
  }).catch((err) => err);
  if (!err) {
    return;
  }
  err = await copyAndDelete(from, to, {
    overwrite: options?.overwrite,
  }).catch((err) => err);
  if (err) {
    throw err;
  }
}

async function copyAndDelete(from: string, to: string, options?: {
  overwrite?: boolean;
}) {
  await copy(from, to, {
    overwrite: options?.overwrite,
  });
  await Deno.remove(from);
}
