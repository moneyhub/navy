import path from 'path'
import fs from './fs'

export default async function getNavyRc(dir) {
  try {
    return JSON.parse(await fs.readFileAsync(path.join(dir, '.navyrc')))
  } catch (ex) {
    return null
  }
}
