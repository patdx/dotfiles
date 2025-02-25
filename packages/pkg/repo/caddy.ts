import type { KnownPackage } from '../shared/types.ts'

export default {
  name: 'caddy',
  options: {
    binaryName: 'caddy',
    files: [
      {
        url: 'https://github.com/caddyserver/caddy',
        urlProvider: 'github',
      },
    ],
  },
} satisfies KnownPackage as KnownPackage
