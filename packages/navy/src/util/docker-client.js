import Docker from 'dockerode'
import Container from 'dockerode/lib/container'
import Image from 'dockerode/lib/image'
import bluebird from 'bluebird'

bluebird.promisifyAll(Container.prototype)
bluebird.promisifyAll(Image.prototype)

const dockerClient = bluebird.promisifyAll(new Docker())

export default dockerClient
