/* @flow */

import {getEnvironment} from '../../'

export default async function (services: Array<string>, opts: Object): Promise<void> {
  const env = getEnvironment(opts.environment)

  if (!await env.isInitialised()) {
    await env.initialise('cwd', { path: process.cwd() })
  }

  await env.launch(services)
}
