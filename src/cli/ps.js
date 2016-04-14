/* @flow */

import {printPS} from './status'
import {getEnvironment} from '../../'

export default async function (opts: Object): Promise<void> {
  await printPS(getEnvironment(opts.environment), opts.json)
}
