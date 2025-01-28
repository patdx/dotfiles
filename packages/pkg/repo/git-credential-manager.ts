import type { KnownPackage } from '../types.ts'
import $ from '@david/dax'

export default {
  name: 'git-credential-manager',
  options: {
    url:
      'https://github.com/git-ecosystem/git-credential-manager/releases/latest',
    binaryName: 'git-credential-manager',
    urlProvider: 'github',
    async doAfterInstall() {
      await $`git-credential-manager configure`

      console.log('')
      console.log(`Note: Additional configuration required for Linux`)
      console.log(
        'https://github.com/git-ecosystem/git-credential-manager/blob/release/docs/credstores.md',
      )
      console.log(
        'For GUI Linux users, it is recommended to use freedesktop.org Secret Service API:',
      )
      console.log('')
      console.log(
        `git config --global credential.credentialStore secretservice`,
      )
    },
  },
} satisfies KnownPackage

// function getLatestVersion(release: Release) {
//   return release.tag_name?.replace(/^v/, '')
// }

// async function getInstalledVersion() {
//   const result = await $`git-credential-manager --version`.quiet()
//   // May return something like:
//   // 2.6.0+3c28096588f549cb46f36b552390514356830abe
//   const [version] = result.stdout.trim().split('+')
//   return version
// }
