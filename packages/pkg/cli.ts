import { parseArgs } from '@std/cli/parse-args'

async function main(inputArgs: string[]): Promise<void> {
  const args = parseArgs(inputArgs)

  // If help flag enabled, print help.
  if (args.help) {
    printHelp()
    Deno.exit(0)
  }

  const [args1, args2] = args._

  if (args1 === 'add') {
    if (args2 === 'windsurf') {
      await import('./install-windsurf.ts').then((mod) => {
        mod.installWindsurf()
      })
    }
  }
}

function printHelp(): void {
  console.log(`Usage: deno run --reload -A jsr:@patdx/pkg add windsurf`)
  // console.log(`Usage: greetme [OPTIONS...]`)
  // console.log('\nOptional flags:')
  // console.log('  -h, --help                Display this help and exit')
  // console.log('  -s, --save                Save settings for future greetings')
  // console.log('  -n, --name                Set your name for the greeting')
  // console.log('  -c, --color               Set the color of the greeting')
}

if (import.meta.main) {
  await main(Deno.args)
}
