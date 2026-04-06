// Append ?debug to the URL to enable debug mode.
// e.g. http://localhost:5174/?debug
//
// When active:
//   - console.log calls via dbg() are printed
//   - window.__debug is exposed in the browser console for live inspection

export const isDebug = new URLSearchParams(window.location.search).has('debug')

export const dbg = (...args) => {
  if (isDebug) console.log('[debug]', ...args)
}

// Expose a global object for live inspection in the browser console.
if (isDebug) {
  window.__debug = {}
  console.log('[debug] mode enabled — inspect window.__debug for live state')
}

export const expose = (key, value) => {
  if (isDebug) window.__debug[key] = value
}
