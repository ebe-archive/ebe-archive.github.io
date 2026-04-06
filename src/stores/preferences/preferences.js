import { writable } from 'svelte/store'
import defaultPrefs from './defaultPrefs'

const load = () => {
  try {
    const saved = localStorage.preferences ? JSON.parse(localStorage.preferences) : null
    // If saved prefs are from the old format (no containers key), discard them.
    return saved?.containers ? saved : defaultPrefs
  } catch {
    return defaultPrefs
  }
}

export const preferences = writable(load())

preferences.subscribe(val => {
  localStorage.preferences = JSON.stringify(val)
})

export const resetPreferences = () => preferences.set(defaultPrefs)
