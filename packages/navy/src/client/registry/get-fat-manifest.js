import getEndpoint from './get-endpoint'
import {restSpecification, MEDIA_TYPES} from '../../domain/oci-api-specification'

const getFatManifest = async ({
  allowUnauthorizedRequest = false,
  repository,
  registry,
  tag,
}) => {
  const endpoint = restSpecification.getManifest(repository, tag)
  const options = {
    headers: {
      'Accept': MEDIA_TYPES.FAT_MANIFEST,
    }
  }

  const response = await getEndpoint({
    allowUnauthorizedRequest,
    endpoint,
    registry,
    options,
  })

  return {
    tag: response.headers.get('docker-content-digest'),
    data: await response.json(),
  }
}

export default getFatManifest
