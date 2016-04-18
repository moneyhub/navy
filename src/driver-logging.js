import {dots} from 'cli-spinners'
import chalk from 'chalk'

let _isDriverLogging = false
let _lineCount = 0
let _spinnerInterval = null
let _spinnerIndex = 0
let _message = null

function _redraw(opts = {}) {
  let symbol = chalk.cyan(dots.frames[_spinnerIndex])

  if (opts.success === true) {
    symbol = chalk.green('✔')
  } else if (opts.success === false) {
    symbol = chalk.red('•')
  }

  process.stdout.clearLine()
  process.stdout.cursorTo(0)
  process.stdout.moveCursor(0, -_lineCount - 1)
  console.log(symbol, opts.success === false ? chalk.red(_message, 'FAILED') : _message)
  process.stdout.cursorTo(0)
  process.stdout.moveCursor(0, _lineCount)
}

export function startDriverLogging(message: string) {
  _isDriverLogging = true
  _message = message
  _lineCount = 0

  console.log()
  _redraw()

  _spinnerInterval = setInterval(() => {
    _spinnerIndex++

    if (_spinnerIndex >= dots.frames.length) {
      _spinnerIndex = 0
    }

    _redraw()
  }, dots.interval)
}

export function stopDriverLogging(opts = {}) {
  if (!isDriverLogging()) return

  _isDriverLogging = false
  clearInterval(_spinnerInterval)

  _redraw({ success: opts.success != null ? opts.success : true })
}

export function isDriverLogging(): boolean {
  return _isDriverLogging
}

export function log(message: string) {
  if (!isDriverLogging()) return

  _lineCount += message.split('\n').length - 1
  process.stdout.write(chalk.dim(message))
}
