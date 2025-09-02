#!/usr/bin/env -S deno run --allow-all

/**
 * This file does some general updates for Mac or Linux computer
 *
 * @module
 */

import $ from '@david/dax'
import process from 'node:process'
import { ParallelExecutor } from './parallel-executor.ts'

$.setPrintCommand(true)

if (import.meta.main) {
  await update()
}

export async function update() {
  // Get initial npm packages before any Node.js version changes
  const initialNpmPackages = await getGlobalNpmPackages()

  const executor = new ParallelExecutor()

  // Group 1: Independent language runtime updates
  executor.addCommand({
    id: 'bun-upgrade',
    command: async () => await $`bun upgrade`,
    condition: () => commandExists('bun'),
    dependencies: [],
  })

  executor.addCommand({
    id: 'deno-upgrade',
    command: async () => await $`deno upgrade`,
    condition: () => commandExists('deno'),
    dependencies: [],
  })

  // Group 2: Node.js ecosystem updates (sequential due to dependencies)
  executor.addCommand({
    id: 'fnm-setup',
    command: async () => {
      await $`fnm install 22`
      await $`fnm default 22`
      await $`fnm use 22`
    },
    condition: () => commandExists('fnm'),
    dependencies: [],
  })

  executor.addCommand({
    id: 'npm-global-restore',
    command: async () => {
      if (initialNpmPackages.length === 0) {
        console.log('No initial npm packages to restore')
        return
      }

      const currentPackages = await getGlobalNpmPackages()
      const missingPackages = initialNpmPackages.filter((pkg) =>
        !currentPackages.includes(pkg)
      )

      if (missingPackages.length > 0) {
        console.log(
          'Reinstalling missing global packages:',
          missingPackages.join(', '),
        )
        await $`npm install -g ${missingPackages}`
      } else {
        console.log('All global npm packages are already installed')
      }
    },
    condition: async () =>
      (await commandExists('npm')) && initialNpmPackages.length > 0,
    dependencies: ['fnm-setup'],
  })

  executor.addCommand({
    id: 'npm-global-update',
    command: async () => await $`npm update --global`,
    condition: () => commandExists('npm'),
    dependencies: ['npm-global-restore'],
  })

  executor.addCommand({
    id: 'corepack-pnpm',
    command: async () => await $`corepack install --global pnpm@latest`,
    condition: () => commandExists('corepack'),
    dependencies: ['fnm-setup'],
  })

  executor.addCommand({
    id: 'pnpm-global-update',
    command: async () => await $`pnpm update --global`,
    condition: () => commandExists('pnpm'),
    dependencies: ['corepack-pnpm'],
  })

  // Group 3: Independent tool updates
  executor.addCommand({
    id: 'yt-dlp-update',
    command: async () => await $`yt-dlp -U`,
    condition: () => commandExists('yt-dlp'),
    dependencies: [],
  })

  executor.addCommand({
    id: 'claude-update',
    command: async () => await $`claude update`,
    condition: () => commandExists('claude'),
    dependencies: ['npm-global-update', 'pnpm-global-update'],
  })

  executor.addCommand({
    id: 'opencode-update',
    command: async () => await $`opencode upgrade`,
    condition: () => commandExists('opencode'),
    dependencies: ['npm-global-update', 'pnpm-global-update'],
  })

  executor.addCommand({
    id: 'brew-upgrade',
    command: async () => await $`brew upgrade`,
    condition: () => commandExists('brew'),
    dependencies: [],
  })

  // Group 4: System updates (sudo required - run last)
  if (process.platform === 'linux') {
    executor.addCommand({
      id: 'gcm-update',
      command: async () => {
        const { default: gcm } = await import(
          '@patdx/pkg/repo/git-credential-manager'
        )
        const { downloadAndInstall } = await import('@patdx/pkg/install-binary')
        await downloadAndInstall(gcm)
      },
      condition: () => commandExists('git-credential-manager'),
      dependencies: [],
      requiresSudo: false,
    })

    executor.addCommand({
      id: 'snap-refresh',
      command: async () => await $`sudo snap refresh`,
      condition: () => commandExists('snap'),
      dependencies: [],
      requiresSudo: true,
    })

    executor.addCommand({
      id: 'dnf-upgrade',
      command: async () => await $`sudo dnf upgrade --refresh`,
      condition: () => commandExists('dnf'),
      dependencies: [],
      requiresSudo: true,
    })

    executor.addCommand({
      id: 'apt-upgrade',
      command: async () => {
        await $`sudo apt update`
        await $`sudo apt upgrade`
      },
      condition: () => commandExists('apt'),
      dependencies: [],
      requiresSudo: true,
    })
  }

  await executor.execute()
  console.log('Update completed successfully!')
}

async function commandExists(command: string): Promise<boolean> {
  const result = await $`command -v ${command}`
    .printCommand(false)
    .quiet()
    .noThrow()
  return result.code === 0
}

async function getGlobalNpmPackages(): Promise<string[]> {
  try {
    // Check if npm command exists first
    if (!(await commandExists('npm'))) {
      return []
    }

    const result = await $`npm ls -g --json`.quiet().noThrow()
    if (result.code !== 0) {
      console.log('Warning: npm ls command failed with code:', result.code)
      return []
    }

    const json = JSON.parse(result.stdout)
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
