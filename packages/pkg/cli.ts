import { parseArgs } from '@std/cli/parse-args'
import { downloadAndInstall } from './install-binary.ts'
import { availableProviders } from './shared/url-checker.ts'
import { listInstalledPackages, removePackage } from './shared/shared.ts'
import type { KnownPackage } from './shared/types.ts'

async function checkForKnownPackage(
  name: string,
): Promise<KnownPackage | null> {
  try {
    const result = await import(`./repo/${name}.ts`).then((mod) => mod.default)
    return result
  } catch (_error) {
    return null
  }
}

async function main(inputArgs: string[]): Promise<void> {
  const args = parseArgs(inputArgs, {
    string: ['url', 'url-provider', 'version', 'name'],
    boolean: ['help'],
    alias: {
      h: 'help',
      n: 'name',
    },
  })

  // If help flag enabled, print help.
  if (args.help) {
    printHelp()
    Deno.exit(0)
  }

  const [command, subcommand] = args._

  if (command === 'list') {
    const [packages, availablePackages] = await Promise.all([
      listInstalledPackages(),
      (async () => {
        const packages = []
        try {
          for await (const entry of Deno.readDir('./repo')) {
            if (entry.isFile && entry.name.endsWith('.ts')) {
              const pkgName = entry.name.replace('.ts', '')
              const pkg = await checkForKnownPackage(pkgName)
              if (pkg) packages.push({ pkgName, ...pkg })
            }
          }
        } catch (error) {
          console.error('Error reading available packages:', error)
        }
        return packages
      })(),
    ])

    console.log('Installed packages:')
    if (packages.length === 0) {
      console.log('  No packages installed')
    } else {
      for (const pkg of packages) {
        console.log(`  ${pkg.name} (${pkg.version})`)
      }
    }

    console.log('\nAvailable packages:')
    if (availablePackages.length === 0) {
      console.log('  No packages available')
    } else {
      for (const pkg of availablePackages) {
        console.log(`  ${pkg.pkgName}`)
      }
    }
    return
  }

  if (command === 'remove') {
    if (!subcommand || typeof subcommand !== 'string') {
      console.error('Error: Package name is required')
      printHelp()
      Deno.exit(1)
    }

    const result = await removePackage(subcommand)
    if (!result.success) {
      console.error(result.error)
      Deno.exit(1)
    }

    console.log(`Successfully removed package '${subcommand}'`)
    return
  }

  if (command === 'add') {
    // Generic binary installation

    const specifier = args.url || subcommand

    if (!specifier || typeof specifier !== 'string') {
      console.error(
        'Error: URL is required. Provide it as --url flag or first argument',
      )
      printHelp()
      Deno.exit(1)
    }

    const isURL = URL.canParse(specifier)

    if (isURL) {
      await downloadAndInstall({
        url: specifier,
        binaryName: args.name,
        version: args.version,
        urlProvider: args['url-provider'],
      })
    } else {
      const knownPackage = await checkForKnownPackage(specifier)
      if (!knownPackage) {
        console.error(`Unknown package '${subcommand}'`)
        printHelp()
        Deno.exit(1)
      }

      await downloadAndInstall(knownPackage)
    }
  }
}

function printHelp(): void {
  console.log(`Usage: pkg <command> [options]

Commands:
  add <url>           Install a binary from URL
  add windsurf        Install Windsurf
  list               List installed packages
  remove <pkg>       Remove an installed package

Options:
  --url <url>         URL to download the binary from (can also be provided as first argument)
  --name <name>       Name for the binary (default: extracted from URL)
  --version <ver>     Specific version to install (default: latest)
  --url-provider      Specify URL provider (${availableProviders.join(', ')})
  -h, --help         Show this help message

Examples:
  pkg list
  pkg remove mycli
  pkg add windsurf
  pkg add https://github.com/org/repo
  pkg add --url https://github.com/org/repo --name mycli
  pkg add --url https://github.com/org/repo --url-provider github
`)
}

if (import.meta.main) {
  await main(Deno.args)
}
