import { ofetch } from 'ofetch'
import type { KnownPackage } from '../shared/types.ts'
import { PKG_HOME } from '../shared/shared.ts'
import path from 'node:path'

export default {
  name: 'windsurf',
  async options() {
    //   {
    //     "url": "https://windsurf-stable.codeiumdata.com/linux-x64/stable/d33d40f6cd3a4d7e451b22e94359230a4aa8c161/Windsurf-linux-x64-1.0.5.tar.gz",
    //     "name": "1.94.0",
    //     "version": "d33d40f6cd3a4d7e451b22e94359230a4aa8c161",
    //     "productVersion": "1.94.0",
    //     "hash": "738f7c5f8caeae66310220f7851384f623ba9105",
    //     "timestamp": 1732747065,
    //     "sha256hash": "f8ff6f491f0ba80b43ab48aa92aa53b8e57c8c58e5b531ca0c89732ae3722b86",
    //     "supportsFastUpdate": true,
    //     "windsurfVersion": "1.0.5"
    // }

    const result = await ofetch<{
      url: string
      name: string
      version: string
      productVersion: string
      hash: string
      timestamp: number
      sha256hash: string
      supportsFastUpdate: boolean
      windsurfVersion: string
    }>('https://windsurf-stable.codeium.com/api/update/linux-x64/stable/latest')

    return {
      binaryName: 'windsurf',
      version: result.windsurfVersion,
      files: [
        {
          url: result.url,
          type: 'targz',
        },
      ],
      shortcut: {
        name: 'Windsurf',
        icon: path.join(
          PKG_HOME,
          'windsurf',
          result.windsurfVersion,
          'resources',
          'app',
          'resources',
          'linux',
          'code.png',
        ),
      },
    }
  },
} satisfies KnownPackage as KnownPackage
