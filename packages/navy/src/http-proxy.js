/* @flow */

import os from 'os'
import path from 'path'
import yaml from 'js-yaml'
import docker from './util/docker-client'
import fs from './util/fs'
import {getTlsConfigPath} from './util/tls'
import {execAsync} from './util/exec-async'
import {log} from './driver-logging'
import {getLaunchedNavyNames} from './navy'
const debug = require('debug')('navy:httpproxy')

async function updateComposeConfig(navies: Array<string>) {
  const networks = await docker.listNetworks()
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
  const ports = ['80:80']
  const volumes = [
    '/var/run/docker.sock:/tmp/docker.sock:ro',
  ]

  // Enable TLS for services that
  // match crt file names in tlsCaDir
  const tlsConfigPath = await getTlsConfigPath()
  if (tlsConfigPath) {
    debug('TLS dir detected - enabling https')
    ports.push('443:443')
    volumes.push(`${tlsConfigPath}:/etc/nginx/certs`)
  }

  const config = {
    version: '2',

    services: {
      'nginx-proxy': {
        image: 'navycloud/navy-proxy',
        ports,
        networks: networks.map(net => net.Name),
        volumes,
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
  if (opts.restart) { // restart is needed to pick up changes in /etc/nginx/certs
    log('Restarting HTTP proxy...')
    await execAsync('docker-compose', ['-f', path.join(os.tmpdir(), 'navyinternaldockercompose.yml'), '-p', 'navyinternal', 'restart', 'nginx-proxy'])
  }
}
