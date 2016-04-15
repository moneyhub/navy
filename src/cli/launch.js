/* @flow */

import {getNavy} from '../../'

export default async function (services: Array<string>, opts: Object): Promise<void> {
  const env = getNavy(opts.navy)

  if (!await env.isInitialised()) {
    await env.initialise({
      configProvider: 'filesystem',
      path: process.cwd(),
    })
  }

  await env.launch(services)
}
