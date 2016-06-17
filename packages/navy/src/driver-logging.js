import {dots} from 'cli-spinners'
import chalk from 'chalk'

let _isDriverLogging = false
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

  if (!process.stdout.isTTY) {
    if (opts.success) {
      console.log()
      console.log(symbol, 'SUCCESS')
    } else if (opts.success === false) {
      console.log()
      console.log(symbol, 'FAILURE')
    }
    return
  }

  process.stdout.write('                                                                        \n')
  process.stdout.write(` ${symbol} ${opts.success === false ? chalk.red(_message, 'FAILED') : _message}\n`)
  process.stdout.cursorTo(0)
  process.stdout.moveCursor(0, -2)
}

export function startDriverLogging(message: string) {
  _isDriverLogging = true
  _message = message

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

  if (process.stdout.isTTY) console.log('\n\n')
}

export function isDriverLogging(): boolean {
  return _isDriverLogging
}

export function log(message: string) {
  if (!isDriverLogging()) return

  process.stdout.write(chalk.dim(message))
}
