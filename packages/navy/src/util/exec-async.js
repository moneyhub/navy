/* @flow */

import {exec} from 'child_process'

const debug = require('debug')('navy:exec')

export function execAsync(command: string, args: Array<string> = [], callback: ?any, opts?: Object): Promise<string> {
  return new Promise((resolve, reject) => {
    const cmd = command + ' ' + args.join(' ')

    debug('Executing ' + cmd)

    const childProcess = exec(cmd, opts, (err, stdout, stderr) => {
      if (err) {
        reject(err)
      } else {
        resolve(stdout.toString())
      }
    })

    childProcess.stdout.on('data', line => debug('out: ' + line.toString()))
    childProcess.stderr.on('data', line => debug('err: ' + line.toString()))

    if (callback) {
      callback(childProcess)
    }
  })
}
