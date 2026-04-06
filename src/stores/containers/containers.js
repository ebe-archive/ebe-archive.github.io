import { writable } from 'svelte/store'
import { CosmosClient } from '@azure/cosmos'
import { login, cosmos } from '../config/config'
import { InteractiveBrowserCredential as ibc } from '@azure/identity'

export const containers = writable(null)
export const selectedContainer = writable(null)

selectedContainer.subscribe(val => {
  if (val) localStorage.selectedContainer = val
})

export const loadContainers = async () => {
  const { endpoint, databaseId } = cosmos
  const aadCredentials = new ibc(login)
  const client = new CosmosClient({ endpoint, aadCredentials })
  const database = client.database(databaseId)

  const { resources } = await database.containers.readAll().fetchAll()
  const ids = resources.map(c => c.id).sort()
  containers.set(ids)

  const saved = localStorage.selectedContainer
  selectedContainer.set(saved && ids.includes(saved) ? saved : ids[0] ?? null)

  return ids
}
