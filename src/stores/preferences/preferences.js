import { writable } from 'svelte/store'
import defaultPrefs from './defaultPrefs'

const merge = (saved) => {
  const merged = { ...saved, containers: {} }
  for (const [container, defaultFields] of Object.entries(defaultPrefs.containers)) {
    const savedFields = saved.containers[container] ?? []
    const savedById = Object.fromEntries(savedFields.map(f => [f.id, f]))
    // Keep saved fields that still exist in config; add any new ones with their defaults.
    merged.containers[container] = defaultFields.map(f => savedById[f.id] ?? { ...f })
  }
  return merged
}

const load = () => {
  try {
    const saved = localStorage.preferences ? JSON.parse(localStorage.preferences) : null
    if (!saved?.containers) return defaultPrefs
    return merge(saved)
  } catch {
    return defaultPrefs
  }
}

export const preferences = writable(load())

preferences.subscribe(val => {
  localStorage.preferences = JSON.stringify(val)
})

export const resetPreferences = () => {
  preferences.set(defaultPrefs)
  // Defer import to avoid circular dependency
  import('../search/search.js').then(({ clearAllCaches }) => clearAllCaches())
}
