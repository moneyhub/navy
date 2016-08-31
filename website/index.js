import {glob} from './util/fs'
import {
  getContent,
  convertMarkdown,
  addLayout,
  write,
} from './util/pipeline'
import buildApiDocs from './api-docs'

export default async function run() {
  console.log('Building static content...')

  const siteContent = await getContent(await glob('content/**/*.md'), 'content')
  const gettingStartedContent = await getContent(await glob('../docs/getting-started/**/*.md'), '../docs/getting-started')
  const docsContent = await getContent(await glob('../docs/*.md'), '../docs')

  await Promise.resolve(siteContent)
  .then(convertMarkdown)
  .then(addLayout('layouts/main.html'))
  .then(write('build'))

  await Promise.resolve(gettingStartedContent)
  .then(convertMarkdown)
  .then(addLayout('layouts/getting-started.html'))
  .then(write('build/getting-started'))

  await Promise.resolve(docsContent)
  .then(convertMarkdown)
  .then(addLayout('layouts/main.html'))
  .then(write('build/docs'))

  console.log('Building API documentation')

  await Promise.resolve(buildApiDocs())
  .then(convertMarkdown)
  .then(addLayout('layouts/api.html'))
  .then(write('build/docs/api'))

  console.log('Done')
}

process.on('unhandledRejection', err => {
  console.log(err.stack)
  process.exit(1)
})
