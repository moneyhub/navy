import path from 'path'
import pty from 'pty.js'
import stripAnsi from 'strip-ansi'
import {ENV_NAME} from '../environment'

// from http://stackoverflow.com/questions/17470554/how-to-capture-the-arrow-keys-in-node-js
const keyCodes = {
  'up': '\u001b[A',
  'down': '\u001b[B',
  'right': '\u001b[C',
  'left': '\u001b[D',
  'enter': '\n',
  'space': ' ',
}

const SYNTHETIC_DELAY_MS = 150

export const NAVY_BIN = path.join(__dirname, '../../../packages/navy/bin/navy.js')

export default class Automator {

  static spawn(args, opts = {}) {
    const automator = new this(args, opts)
    automator.spawn()
    return automator
  }

  constructor(args, opts) {
    this.args = args
    this.opts = opts
  }

  spawn() {
    console.log()
    console.log(' >', NAVY_BIN, this.args.join(' '))
    console.log()

    this.output = ''

    this.term = pty.spawn(NAVY_BIN, this.args, {
      name: 'xterm-color',
      cols: 130,
      rows: 30,
      cwd: this.opts.cwd || path.join(__dirname, '../dummy-navy'),
      env: {
        NAVY_NAME: ENV_NAME,
        ...(this.opts.env || process.env)
      },
    })

    this.term.pipe(process.stdout)

    this.term.on('data', data => this.output += data.toString())

    this.term.on('exit', () => {
      console.log()
      console.log(' - Exited')
      console.log()
    })
  }

  send(keyCode) {
    // synthetic delay
    return new Promise(resolve =>
      setTimeout(() => {
        this.term.write(keyCodes[keyCode] || keyCode)
        resolve()
      }, SYNTHETIC_DELAY_MS)
    )
  }

  waitForDone() {
    return new Promise(resolve =>
      this.term.once('exit', () => resolve(stripAnsi(this.output)))
    )
  }

  waitForLaunch() {
    return new Promise((resolve, reject) => {
      this.term.once('data', resolve)
    })
  }

  getOutput() {
    return stripAnsi(this.output)
  }

  getRawOutput() {
    return this.output
  }

}
