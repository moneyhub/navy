const sidebar = document.querySelector('#sidebar')

let isFixed = false
const breakpoint = 125 // distance from top of page where sidebar is
const footerHeight = 320

function onScroll() {
  const scrollPosition = (document.documentElement.scrollTop || document.body.scrollTop)

  if (document.body.scrollHeight < (window.innerHeight + footerHeight + 100)) {
    return
  }

  if (scrollPosition > (document.body.scrollHeight - window.innerHeight - footerHeight)) {
    sidebar.setAttribute('class', 'fixed-footer')
    isFixed = false
  } else if (scrollPosition > breakpoint && !isFixed) {
    sidebar.setAttribute('class', 'fixed')
    isFixed = true
  } else if (scrollPosition <= breakpoint) {
    sidebar.setAttribute('class', '')
    isFixed = false
  }
}

window.onscroll = onScroll
