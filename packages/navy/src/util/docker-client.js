import Docker from 'dockerode'
import bluebird from 'bluebird'

const dockerClient = new Docker({
  Promise: bluebird,
})

export default dockerClient
