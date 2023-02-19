// docker v2 registry URL
export const DEFAULT_REGISTRY = 'registry-1.docker.io'
// the url which docker stores in .docker/config.json for auth
export const DEFAULT_REGISTRY_AUTH = 'https://index.docker.io/v1/'

// someregistry.com/some/image:latest -> someregistry.com/some/image
export function getImageFromImageWithTag(imageWithTag) {
  if (imageWithTag.lastIndexOf('/') !== -1) {
    const lastSlash = imageWithTag.lastIndexOf('/')

    if (imageWithTag.indexOf(':', lastSlash) !== -1) {
      return imageWithTag.substring(0, imageWithTag.indexOf(':', lastSlash))
    }

    return imageWithTag
  }

  if (imageWithTag.indexOf(':') !== -1) {
    return imageWithTag.substring(0, imageWithTag.indexOf(':'))
  }

  return imageWithTag
}

// someregistry.com/some/image:latest -> latest
export function getTagFromImageWithTag(imageWithTag) {
  if (imageWithTag.lastIndexOf('/') !== -1) {
    const lastSlash = imageWithTag.lastIndexOf('/')

    if (imageWithTag.indexOf(':', lastSlash) !== -1) {
      return imageWithTag.substring(imageWithTag.indexOf(':', lastSlash) + 1)
    }

    return 'latest'
  }

  if (imageWithTag.indexOf(':') !== -1) {
    return imageWithTag.substring(imageWithTag.indexOf(':') + 1)
  }

  return 'latest'
}

export function getRegistryFromImage(image: string) {
  const parsedRegistry = image.match(/([a-zA-Z0-9-.:]+)\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+/)
  const registry: string = parsedRegistry != null && parsedRegistry.length > 1 ? parsedRegistry[1] : DEFAULT_REGISTRY

  return registry
}

// someregistry.com/some/image -> some/image
export function getRepositoryFromImage(image) {
  if (image.lastIndexOf('/') === -1) {
    return 'library/' + image
  }

  if (image.split('/').length === 3) {
    return image.substring(image.indexOf('/') + 1)
  }

  return image
}
