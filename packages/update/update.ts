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
  const executor = new ParallelExecutor()
  
  // Group 1: Independent language runtime updates
  executor.addCommand({
    id: 'bun-upgrade',
    command: 'bun upgrade',
    condition: () => commandExists('bun'),
    dependencies: []
  })
  
  executor.addCommand({
    id: 'deno-upgrade',
    command: 'deno upgrade',
    condition: () => commandExists('deno'),
    dependencies: []
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
    dependencies: []
  })
  
  executor.addCommand({
    id: 'npm-global-restore',
    command: async () => {
      const initialPackages = await getGlobalNpmPackages()
      const newPackages = await getGlobalNpmPackages()
      const missingPackages = initialPackages.filter(pkg => !newPackages.includes(pkg))
      
      if (missingPackages.length > 0) {
        console.log('Reinstalling missing global packages:', missingPackages.join(', '))
        await $`npm install -g ${missingPackages}`
      }
    },
    condition: () => commandExists('fnm'),
    dependencies: ['fnm-setup']
  })
  
  executor.addCommand({
    id: 'npm-global-update',
    command: 'npm update --global',
    condition: () => commandExists('npm'),
    dependencies: []
  })
  
  executor.addCommand({
    id: 'corepack-pnpm',
    command: 'corepack install --global pnpm@latest',
    condition: () => commandExists('corepack'),
    dependencies: []
  })
  
  // Group 3: Independent tool updates
  executor.addCommand({
    id: 'yt-dlp-update',
    command: 'yt-dlp -U',
    condition: () => commandExists('yt-dlp'),
    dependencies: []
  })
  
  executor.addCommand({
    id: 'claude-update',
    command: 'claude update',
    condition: () => commandExists('claude'),
    dependencies: []
  })
  
  executor.addCommand({
    id: 'opencode-update',
    command: 'opencode upgrade',
    condition: () => commandExists('opencode'),
    dependencies: []
  })
  
  executor.addCommand({
    id: 'brew-upgrade',
    command: 'brew upgrade',
    condition: () => commandExists('brew'),
    dependencies: []
  })
  
  // Group 4: System updates (sudo required - run last)
  if (process.platform === 'linux') {
    executor.addCommand({
      id: 'gcm-update',
      command: async () => {
        const { default: gcm } = await import('@patdx/pkg/repo/git-credential-manager')
        const { downloadAndInstall } = await import('@patdx/pkg/install-binary')
        await downloadAndInstall(gcm)
      },
      condition: () => commandExists('git-credential-manager'),
      dependencies: [],
      requiresSudo: false
    })
    
    executor.addCommand({
      id: 'snap-refresh',
      command: 'sudo snap refresh',
      condition: () => commandExists('snap'),
      dependencies: [],
      requiresSudo: true
    })
    
    executor.addCommand({
      id: 'dnf-upgrade',
      command: 'sudo dnf upgrade --refresh',
      condition: () => commandExists('dnf'),
      dependencies: [],
      requiresSudo: true
    })
    
    executor.addCommand({
      id: 'apt-upgrade',
      command: 'sudo apt update && sudo apt upgrade',
      condition: () => commandExists('apt'),
      dependencies: [],
      requiresSudo: true
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
