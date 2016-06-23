import findit from 'findit'
import path from 'path'
import fs from 'fs'

export default () => {
  const finder = findit(path.join(process.cwd(), 'node_modules'))

  finder.on('link', link => {
    if (link.indexOf('.bin') !== -1) return

    const absolutePath = fs.realpathSync(link)
    fs.unlinkSync(link)
    fs.symlinkSync(absolutePath, link)

    console.log('Linked', link, '->', absolutePath)
  })
}
