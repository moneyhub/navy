import path from 'path'

export function pathToModule(nodeModulesPath, pkgName) {
  const pkgNameWithNoTags = pkgName.lastIndexOf('@') !== 0 && pkgName.lastIndexOf('@') !== -1
    ? pkgName.substring(0, pkgName.lastIndexOf('@'))
    : pkgName

  return path.join(nodeModulesPath, pkgNameWithNoTags)
}
