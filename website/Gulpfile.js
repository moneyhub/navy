const gulp = require('gulp')
const {execSync} = require('child_process')

const exec = (cmd) => execSync(cmd, { stdio: 'inherit' })

const paths = {
  styles: 'styles/**/*',
  html: ['../docs/**/*', '../packages/navy/src/**/*', 'layouts/**/*', 'content/**/*'],
  resources: ['../docs/**/resources/*', 'public/**/*'],
  clientJs: 'client-js/**/*',
}

gulp.task('styles', () => {
  exec('./node_modules/.bin/lessc --clean-css="--s1 --advanced --compatibility=ie8" styles/main.less build/styles.css')
})

gulp.task('resources', () => {
  gulp.src('public/**/*')
    .pipe(gulp.dest('build/'))

  gulp.src('../docs/**/resources/*')
    .pipe(gulp.dest('build/docs'))
})

gulp.task('client-js', () => {
  exec('../node_modules/.bin/babel --minified -d build/js client-js')
})

gulp.task('html', () => {
  exec('../node_modules/.bin/babel-node .')
})

gulp.task('build', ['styles', 'resources', 'client-js', 'html'])

gulp.task('watch', ['build'], () => {
  gulp.watch(paths.styles, ['styles'])
  gulp.watch(paths.resources, ['resources'])
  gulp.watch(paths.clientJs, ['client-js'])
  gulp.watch(paths.html, ['html'])
})
