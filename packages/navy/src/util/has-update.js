import * as R from 'ramda'
import docker from './docker-client'
import getFatManifest from '../client/registry/get-fat-manifest'
import {getImageFromImageWithTag, getRepositoryFromImage, getTagFromImageWithTag, getRegistryFromImage}
  from '../domain/container-image'

const hasUpdate = async (
  imageWithTag,
  currentImageId,
  navyFile
) => {
  const tag = getTagFromImageWithTag(imageWithTag)
  const image = getImageFromImageWithTag(imageWithTag)
  const registry = getRegistryFromImage(image)
  const repository = getRepositoryFromImage(image)

  const allowUnauthorizedRequest = R.includes(registry,
    R.path(['ignoreUnauthorizedRequestsForRegistries'], navyFile)
  )

  try {
    const {RepoDigests} = await docker.getImage(currentImageId).inspect()

    const manifest = await getFatManifest({
      allowUnauthorizedRequest,
      repository,
      registry,
      tag,
    })

    const remoteRepoDigest = `${image}@${manifest.tag}`
    return !R.includes(remoteRepoDigest, RepoDigests)
  } catch {
    return 'INVALID_REMOTE'
  }
}

export default hasUpdate
