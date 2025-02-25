import type { KnownPackage } from '../shared/types.ts'

export default {
  name: 'apktool',
  options: {
    binaryName: 'apktool',
    files: [
      {
        url:
          'https://raw.githubusercontent.com/iBotPeaches/Apktool/master/scripts/linux/apktool',
        filename: 'apktool',
        type: 'raw',
        executable: true,
      },
      {
        url:
          'https://bitbucket.org/iBotPeaches/apktool/downloads/apktool_2.8.1.jar', // Latest version
        filename: 'apktool.jar',
        type: 'raw',
      },
    ],
    async doAfterInstall() {
      console.log('apktool has been installed successfully!')
      console.log('Try running apktool via CLI.')
    },
  },
} satisfies KnownPackage as KnownPackage
