/* @flow */

import {getNavy} from '../'

export default async function (services: Array<string>, opts: Object): Promise<void> {
  const env = getNavy(opts.navy)

  await env.spawnLogStream(services)
}
