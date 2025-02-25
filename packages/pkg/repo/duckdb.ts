import type { KnownPackage } from '../shared/types.ts'

export default {
  name: 'duckdb',
  options: {
    binaryName: 'duckdb',
    files: [
      {
        url: 'https://github.com/duckdb/duckdb',
        urlProvider: 'github',
      },
    ],
  },
} satisfies KnownPackage as KnownPackage
