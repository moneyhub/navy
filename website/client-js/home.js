const theater = theaterJS() // eslint-disable-line

theater
  .on('type:start, erase:start', function () {
    // add a class to actor's dom element when he starts typing/erasing
    const actor = theater.getCurrentActor()
    actor.$element.classList.add('is-typing')
  })
  .on('type:end, erase:end', function () {
    // and then remove it when he's done
    const actor = theater.getCurrentActor()
    actor.$element.classList.remove('is-typing')
  })

theater
  .addActor('cli', { accuracy: 1, speed: 0.3 }, '#cli-typer-value')

theater
  .addScene(1000)
  .addScene('cli:navy launch<br>')
