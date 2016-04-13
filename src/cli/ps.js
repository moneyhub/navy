/* @flow */

import zygon from 'zygon'
import {getEnvironment} from '../../'

export default async function (opts: Object): Promise<void> {
  const env = getEnvironment(opts.environment)

  const ps = await env.ps()

  if (opts.json) {
    return console.log(JSON.stringify(ps, null, 2))
  }

  zygon([
    { name: 'ID' },
    { name: 'Name' },
    { name: 'Image' },
    { name: 'Status' },
  ], ps.map(service => [
    service.id,
    service.name,
    service.image,
    service.status,
  ]))
}
