import mountUserHomeMiddleware from './middleware/mount-user-home'
import rewriteLinkedNodeModules from './hooks/rewrite-linked-node-modules'

export default function (navy) {
  navy.registerMiddleware(mountUserHomeMiddleware)

  navy.on('cli.develop.beforeLaunch', rewriteLinkedNodeModules)
}
