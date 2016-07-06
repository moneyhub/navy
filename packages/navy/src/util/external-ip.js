/* @flow */

export function getExternalIP(): string {
  const dockerHost = process.env.DOCKER_HOST

  // DEPRECATED use NAVY_EXTERNAL_IP instead
  if (process.env.NAVY_HOST) {
    return process.env.NAVY_HOST
  }

  if (process.env.NAVY_EXTERNAL_IP) {
    // Custom external IP
    return process.env.NAVY_EXTERNAL_IP
  }

  if (dockerHost && dockerHost.indexOf('tcp://') !== -1) {
    // OSX with docker-machine, or a remote docker
    // dockerHost will be formatted like:
    // tcp://_._._._:_
    // We only care about the IP address

    let ip = dockerHost.substring('tcp://'.length)
    ip = ip.substring(0, ip.lastIndexOf(':')).trim()

    return ip
  }

  // No custom docker host, assume localhost
  return '127.0.0.1'
}
