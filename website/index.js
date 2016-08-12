import {glob} from './util/fs'
import {
  getContent,
  convertMarkdown,
  addLayout,
  write,
} from './util/pipeline'
import buildApiDocs from './api-docs'

function buildNav(docs) {
  const items = []

  for (const doc of docs) {
    if (doc.attributes && doc.attributes.title) {
      items.push({
        name: doc.attributes.title,
        path: '/docs/' + doc.pathWithoutExtension + '.html',
      })
    }
  }

  return items
}

async function run() {
  console.log('Building static content...')

  const sitePaths = await glob('content/**/*.md')
  const docsPaths = await glob('../docs/**/*.md')

  const siteContent = await getContent(sitePaths, 'content')
  const docsContent = await getContent(docsPaths, '../docs')

  const nav = buildNav([
    ...siteContent,
    ...docsContent,
  ])

  await Promise.resolve(siteContent)
  .then(convertMarkdown)
  .then(addLayout('layouts/main.html', { nav }))
  .then(write('build'))

  await Promise.resolve(docsContent)
  .then(convertMarkdown)
  .then(addLayout('layouts/main.html', { nav }))
  .then(write('build/docs'))

  console.log('Building API documentation')

  await Promise.resolve(buildApiDocs())
  .then(convertMarkdown)
  .then(addLayout('layouts/api.html', { nav }))
  .then(write('build/docs/api'))

  console.log('Done')
}

process.on('unhandledRejection', err => {
  console.log(err.stack)
  process.exit(1)
})

run()
