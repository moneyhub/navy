import {getConfig} from '../config'
import {getExternalIP} from '../util/external-ip'

export default async () => {
  const config = await getConfig()

  console.log(await getExternalIP(config.externalIP))
}
