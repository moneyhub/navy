/* @flow */

import chalk from 'chalk'
import readline from 'readline'
import {dots} from 'cli-spinners'
import {getNavy} from '../'

let spinnerIndex = 0
let spinnerFrame = dots.frames[0]

export default async function (services: Array<string>, opts: Object): Promise<void> {
  const navy = getNavy(opts.navy)
  const servicesToCheck = services.length === 0 ? undefined : services

  if (!process.stdout.isTTY) {
    await navy.waitForHealthy(servicesToCheck)
    console.log('Now available')
    return
  }

  let healthyStatus = []

  let drawnLines = 0

  function draw() {
    drawnLines = 0

    if (healthyStatus.length === 0) {
      console.log('Waiting')
      drawnLines = 1
      return
    }

    const lines = healthyStatus.map(service =>
      `${service.health !== 'healthy'
        ? chalk.yellow(spinnerFrame)
        : chalk.green('✔')} ${service.service}`,
    )

    drawnLines = lines.length
    console.log(lines.join('\n'))
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

  await navy.waitForHealthy(servicesToCheck, servicesHealth => healthyStatus = servicesHealth)

  redraw()

  clearInterval(spinner)
}
