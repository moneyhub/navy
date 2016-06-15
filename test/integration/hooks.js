import rimraf from 'rimraf'

export default function () {
  this.setDefaultTimeout(2 * 60 * 1000)

  this.After(async function () {
    if (this.navy) {
      await this.navy.destroy()
    }

    if (this.localCopyPath) {
      rimraf.sync(this.localCopyPath)
    }
  })
}
