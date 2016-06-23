import chalk from 'chalk'
import zygon from 'zygon'
import {dots} from 'cli-spinners'
import {getNavy} from '../'
import hasUpdate from '../util/has-update'

let spinnerIndex = 0
let spinnerFrame = dots.frames[0]

function renderStatus(status) {
  if (status == null) {
    return chalk.yellow(spinnerFrame) + ' ' + chalk.dim('Checking...')
  } else if (status === true) {
    return chalk.yellow('• Update available')
  } else {
    return chalk.green('✔ Up to date')
  }
}

export default async function (opts: Object): Promise<void> {
  const navy = getNavy(opts.navy)

  const ps = await navy.ps()

  const updateStatus = {}

  let drawnLines = 0

  function draw() {
    drawnLines = 0
    let buffer = ''

    zygon([
      { name: 'Name', size: 15 },
      { name: 'Image', size: 35 },
      { name: 'Updates', size: 25 },
    ], ps.map(service => [
      service.name,
      service.image,
      renderStatus(updateStatus[service.id]),
    ]), {
      output: {
        write(out) {
          buffer += out
        },
      },
    })

    drawnLines = buffer.split('\n').length
    console.log(buffer)
  }

  function redraw() {
    process.stdout.clearLine()
    process.stdout.cursorTo(0)

    for (let i = 0; i < drawnLines; i++) {
      process.stdout.moveCursor(0, -1)
      process.stdout.clearLine()
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
    updateStatus[service.id] = await hasUpdate(service.image)
  }))

  redraw()

  clearInterval(spinner)
}
