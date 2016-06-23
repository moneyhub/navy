/* @flow */

import {spawn} from 'child_process'

export default function hasUpdate(image: string): Promise<boolean> {
  return new Promise(resolve => {
    const pullPs = spawn('docker', ['pull', image])

    pullPs.stdout.on('data', dataBuf => {
      const data = dataBuf.toString()

      if (data.indexOf('Download') !== -1 || data.indexOf('Waiting') !== -1 || data.indexOf('Pulling fs layer') !== -1) {
        pullPs.kill()
        resolve(true)
      }
    })

    pullPs.on('close', () => resolve(false))
  })
}
