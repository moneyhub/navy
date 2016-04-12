export default function () {
  this.setDefaultTimeout(5 * 60 * 1000)

  this.After(function () {
    if (this.env) {
      this.env.destroy()
    }
  })
}
