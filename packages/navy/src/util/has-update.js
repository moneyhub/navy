/* @flow */

import {imageFromImageWithTag, localImageFromImage, tagFromImageWithTag} from 'simple-docker-registry-client'
import {getRegistryClient} from './registry-client'
import docker from './docker-client'

export default async function hasUpdate(imageWithTag: string, currentImageId: string, navyFile: ?Object): Promise<boolean|string> {
  const imageConfig = await docker.getImage(currentImageId).inspectAsync()
  const currentImageContainerId = imageConfig.ContainerConfig.Image

  const image = imageFromImageWithTag(imageWithTag)

  const client = await getRegistryClient(image, navyFile)

  let manifest

  try {
    manifest = await client.request(localImageFromImage(image) + '/manifests/' + tagFromImageWithTag(imageWithTag))
  } catch (ex) {
    if (ex.body && ex.body.errors[0].code === 'MANIFEST_UNKNOWN') {
      return 'UNKNOWN_REMOTE'
    }

    return 'UNKNOWN_ERROR'
  }

  const lastLayer = JSON.parse(manifest.history[0].v1Compatibility)

  return lastLayer.container_config.Image !== currentImageContainerId
}
