/* @flow */

import chalk from 'chalk'
import readline from 'readline'
import {dots} from 'cli-spinners'
import {getNavy} from '../../'
import table from '../../util/table'
import hasUpdate from '../../util/has-update'
import {runCLI} from '../util/helper'

const debug = require('debug')('navy:updates')

const definition = `
usage: navy service [-n NAVY] updates [-h]

Options:
  -n, --navy NAVY      Specifies the navy to use [env: NAVY_NAME] [default: dev]
  -h, --help           Shows usage
`

let spinnerIndex = 0
let spinnerFrame = dots.frames[0]

function renderStatus(status) {
  if (status == null) {
    return chalk.yellow(spinnerFrame) + ' ' + chalk.dim('Checking...')
  } else if (status === true) {
    return chalk.yellow('• Update available')
  } else if (status === 'UNKNOWN_REMOTE') {
    return chalk.red('• Not found')
  } else if (status === 'UNKNOWN_ERROR') {
    return chalk.red('• Internal error')
  } else if (status === 'NO_IMAGE') {
    return chalk.red('• No image for service')
  } else {
    return chalk.green('✔ Up to date')
  }
}

export default async function (): Promise<void> {
  const args = runCLI(definition)
  const navy = getNavy(args['--navy'])

  const navyFile = await navy.getNavyFile()
  const ps = await navy.ps()

  const updateStatus = {}

  let drawnLines = 0

  function draw() {
    drawnLines = 0

    const buffer = table([
      ['NAME', 'IMAGE', 'UPDATES'],
      ...ps.map(service => [
        service.name,
        service.image,
        renderStatus(updateStatus[service.id]),
      ]),
    ])

    drawnLines = buffer.split('\n').length
    console.log(buffer)
  }

  function redraw() {
    readline.clearLine(process.stdout, 0)
    readline.cursorTo(process.stdout, 0)

    for (let i = 0; i < drawnLines; i++) {
      readline.moveCursor(process.stdout, 0, -1)
      readline.clearLine(process.stdout, 0)
    }

    draw()
  }

  const spinner = setInterval(() => {
    spinnerIndex++

    if (spinnerIndex >= dots.frames.length) {
      spinnerIndex = 0
    }

    spinnerFrame = dots.frames[spinnerIndex]

    redraw()
  }, dots.interval)

  draw()

  await Promise.all(ps.map(async service => {
    try {
      if (!service || !service.raw || !service.raw.Image) {
        return updateStatus[service.id] = 'NO_IMAGE'
      }

      updateStatus[service.id] = await hasUpdate(service.image, service.raw.Image, navyFile)
    } catch (ex) {
      debug('Error checking update for', service.name, ex.stack || ex.message)
      updateStatus[service.id] = 'UNKNOWN_ERROR'
    }
  }))

  redraw()

  clearInterval(spinner)
}
