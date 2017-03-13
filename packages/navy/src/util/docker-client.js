import Docker from 'dockerode'
import bluebird from 'bluebird'

const dockerClient = bluebird.promisifyAll(new Docker({
  Promise: bluebird,
}))

export default dockerClient
