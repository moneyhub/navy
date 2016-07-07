import path from 'path'
import fs from 'fs'
import rimraf from 'rimraf'

export default function () {

  this.Given(/I have a local copy of the source code of the launched service$/, function () {
    // create dummy local copy in temp directory
    this.localCopyPath = path.join(__dirname, '../../', '.navytestdir/')

    rimraf.sync(this.localCopyPath)

    fs.mkdirSync(this.localCopyPath)
    fs.writeFileSync(path.join(this.localCopyPath, '.navy-develop.yml'), `
version: '2'

services:
  helloworld:
    volumes:
      - "./index.php:/www/index.php"
    `, 'utf8')
    fs.writeFileSync(path.join(this.localCopyPath, 'index.php'), `
      Hello from the local source code!
    `, 'utf8')
  })

}
