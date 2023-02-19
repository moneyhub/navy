
export const restSpecification = {
  operation: (registry, endpoint) => `https://${registry}/v2/${endpoint}`,
  getManifest: (repository, tag) => `${repository}/manifests/${tag}`
}

export const MEDIA_TYPES = {
  FAT_MANIFEST: 'application/vnd.docker.distribution.manifest.list.v2+json'
}
