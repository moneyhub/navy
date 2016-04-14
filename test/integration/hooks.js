export default function () {
  this.setDefaultTimeout(5 * 60 * 1000)

  this.After(async function () {
    if (this.navy) {
      await this.navy.destroy()
    }
  })
}
