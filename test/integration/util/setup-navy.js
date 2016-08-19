import path from 'path'
import {getNavy, getLaunchedNavies} from '../../../packages/navy'

export async function setUpNavy(name = 'dev', testProjectName = 'basic') {
  const navy = getNavy(name)

  await navy.initialise({
    configProvider: 'filesystem',
    path: path.join(__dirname, '../', 'test-projects', testProjectName),
  })

  return navy
}

export async function cleanUpNavies() {
  const navies = await getLaunchedNavies()

  await Promise.all(navies.map(navy => navy.destroy()))
}
