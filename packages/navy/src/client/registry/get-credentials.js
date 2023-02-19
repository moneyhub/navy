import {always as noop} from 'ramda'
import {execAsync} from '../../util/exec-async'
import {DEFAULT_REGISTRY, DEFAULT_REGISTRY_AUTH} from '../../domain/container-image'

const getAuthenticationForRegistry = async (registry) => {
  try {
    const credentialStore = registry === DEFAULT_REGISTRY
      ? DEFAULT_REGISTRY_AUTH
      : registry

    const options = [credentialStore, '|', 'docker-credential-desktop', 'get']
    const stdout = await execAsync('echo', options, noop, {
      cwd: process.cwd(),
    })

    const credentials = JSON.parse(stdout)

    return {
      username: credentials['Username'],
      password: credentials['Secret'],
    }
  } catch (exception) {
    return {
      username: '',
      password: '',
    }
  }
}

export default getAuthenticationForRegistry
