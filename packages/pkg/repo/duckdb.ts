import type { KnownPackage } from '../shared/types.ts'

export default {
  name: 'duckdb',
  options: {
    urlProvider: 'github',
    url: 'https://github.com/duckdb/duckdb',
  },
} satisfies KnownPackage as KnownPackage
