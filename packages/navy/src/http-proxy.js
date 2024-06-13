/* @flow */

import os from 'os'
import path from 'path'
import yaml from 'js-yaml'
import docker from './util/docker-client'
import fs from 'fs'
import {getCertsPath} from './util/https'
import {execAsync} from './util/exec-async'
import {log} from './driver-logging'
import {getLaunchedNavyNames} from './navy'

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

  // Enable HTTPS for services that
  // match crt file names in tlsRootCaDir
  const certsPath = await getCertsPath(true)
  if (certsPath) {
    ports.push('443:443')
    volumes.push(`${certsPath}:/etc/nginx/certs`)
    volumes.push(`${certsPath}:/etc/nginx/dhparam`) // to persist DH params
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

  fs.writeFileSync(path.join(os.tmpdir(), 'navyinternaldockercompose.yml'), yaml.dump(config))
}

export async function reconfigureHTTPProxy(opts: Object = {}) {
  const navyInternalYamlFile = path.join(os.tmpdir(), 'navyinternaldockercompose.yml')

  if (opts.restart) { // proxy needs to be recreated to detect changes (deletes) in /etc/nginx/certs
    if (fs.existsSync(navyInternalYamlFile)) {
      log('Restarting HTTP proxy...')
      await execAsync('docker compose',
        [
          '-f', navyInternalYamlFile,
          '-p', 'navyinternal', 'rm', '-s', '-f', 'nginx-proxy',
        ])
    }
  }

  if (!opts.navies) opts.navies = await getLaunchedNavyNames()
  await updateComposeConfig(opts.navies)
  log('Configuring HTTP proxy...')
  await execAsync('docker compose',
    [
      '-f', navyInternalYamlFile,
      '-p', 'navyinternal',
      'up', '-d',
    ])

}
