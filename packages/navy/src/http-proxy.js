/* @flow */

import os from 'os'
import path from 'path'
import fs from './util/fs'
import {execAsync} from './util/exec-async'
import {log} from './driver-logging'

async function updateComposeConfig(excludeNavy: string) {
  const networkIds = (await execAsync('docker', ['network', 'ls', '-q']))
  .split('\n')
  .map(net => net.trim())
  .filter(net => !!net)

  const networks = JSON.parse(await execAsync('docker', ['network', 'inspect', ...networkIds]))
  .filter(net => net.Name.indexOf('_') !== -1) // is docker-compose network?
  .filter(net => !(excludeNavy && net.Name.indexOf(excludeNavy + '_') === 0))

  const config = `
version: '2'

services:
  nginx-proxy:
    image: jwilder/nginx-proxy
    ports:
      - "80:80"
    networks:
${networks.map(net => `      - ${net.Name}`).join('\n')}
    volumes:
      - /var/run/docker.sock:/tmp/docker.sock:ro

networks:
${networks.map(net => `  ${net.Name}:` + '\n' + '    external: true').join('\n')}
`

  await fs.writeFileAsync(path.join(os.tmpdir(), 'navyinternaldockercompose.yml'), config)
}

export async function reconfigureHTTPProxy(opts: Object = {}) {
  await updateComposeConfig(opts.excludeNavy)

  log('Configuring HTTP proxy...')
  await execAsync('docker-compose', ['-f', path.join(os.tmpdir(), 'navyinternaldockercompose.yml'), '-p', 'navyinternal', 'up', '-d'])
}
