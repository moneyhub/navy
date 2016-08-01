/* @flow */

import os from 'os'
import path from 'path'
import yaml from 'js-yaml'
import fs from './util/fs'
import {execAsync} from './util/exec-async'
import {log} from './driver-logging'
import {getLaunchedNavyNames} from './navy'

async function updateComposeConfig(navies: Array<string>) {
  const networkIds = (await execAsync('docker', ['network', 'ls', '-q']))
  .split('\n')
  .map(net => net.trim())
  .filter(net => !!net)

  // example networks from navies
  // dev_default
  // myothernavy_default

  const networks = JSON.parse(await execAsync('docker', ['network', 'inspect', ...networkIds]))
  .filter(net => net.Name.indexOf('_') !== -1) // is docker-compose network?
  .filter(net => {
    for (const navy of navies) {
      if (net.Name.indexOf(navy + '_') === 0) {
        return true
      }
    }

    return false
  })

  const networksConfig = {}

  networks.forEach(net => networksConfig[net.Name] = {
    external: true,
  })

  const config = {
    version: '2',

    services: {
      'nginx-proxy': {
        image: 'jwilder/nginx-proxy:0.4.0',
        ports: [
          '80:80',
        ],
        networks: networks.map(net => net.Name),
        volumes: [
          '/var/run/docker.sock:/tmp/docker.sock:ro',
        ],
        restart: 'always',
      },
    },

    networks: networksConfig,
  }

  await fs.writeFileAsync(path.join(os.tmpdir(), 'navyinternaldockercompose.yml'), yaml.dump(config))
}

export async function reconfigureHTTPProxy(opts: Object = {}) {
  if (!opts.navies) opts.navies = await getLaunchedNavyNames()

  await updateComposeConfig(opts.navies)

  log('Configuring HTTP proxy...')
  await execAsync('docker-compose', ['-f', path.join(os.tmpdir(), 'navyinternaldockercompose.yml'), '-p', 'navyinternal', 'up', '-d'])
}
