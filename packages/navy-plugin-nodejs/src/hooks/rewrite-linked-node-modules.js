import findit from 'findit'
import path from 'path'
import fs from 'fs'
import os from 'os'

import {name as pluginName} from '../../package.json'

export default () => {
  const finder = findit(path.join(process.cwd(), 'node_modules'))

  finder.on('error', err => {
    console.error(`${pluginName} failed to traverse your node_modules directory:`, os.EOL, err.toString())
  })

  finder.on('link', link => {
    if (link.indexOf('.bin') !== -1) return

    const absolutePath = fs.realpathSync(link)
    fs.unlinkSync(link)
    fs.symlinkSync(absolutePath, link)

    console.log('Linked', link, '->', absolutePath)
  })
}
