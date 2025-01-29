import type { KnownPackage } from '../shared/types.ts'

export default {
  name: 'caddy',
  options: {
    urlProvider: 'github',
    url: 'https://github.com/caddyserver/caddy',
  },
} satisfies KnownPackage as KnownPackage
