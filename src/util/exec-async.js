/* @flow */

import {exec} from 'child_process'

const debug = require('debug')('navy:exec')

export function execAsync(command: string, args: Array<string> = []): Promise<string> {
  return new Promise((resolve, reject) => {
    const childProcess = exec(command + ' ' + args.join(' '), (err, stdout, stderr) => {
      if (err) {
        reject(err)
      } else {
        resolve(stdout.toString())
      }
    })

    childProcess.stdout.on('data', line => debug('out: ' + line.toString()))
    childProcess.stderr.on('data', line => debug('err: ' + line.toString()))
  })
}
