import { writable } from 'svelte/store'
import { CosmosClient } from '@azure/cosmos'
import { login, cosmos } from '../config/config'
import { InteractiveBrowserCredential as ibc } from '@azure/identity'
import { dbg, expose } from '../../lib/debug'

export const searchResults = writable(null)

// Per-container result cache — in-memory for fast access, backed by localStorage for persistence
// across page refreshes and browser restarts.
const cache = {}

const cacheKey = (containerId) => `results_${containerId}`

export const restoreOrClear = (containerId) => {
  if (cache[containerId]) {
    searchResults.set(cache[containerId])
    return
  }
  try {
    const stored = localStorage.getItem(cacheKey(containerId))
    if (stored) {
      cache[containerId] = JSON.parse(stored)
      searchResults.set(cache[containerId])
      return
    }
  } catch { /* ignore malformed stored data */ }
  searchResults.set(null)
}

const fe = (p) => p.expr || `c["${p.id}"]`

const buildCondition = (p) => {
  const f = fe(p)
  switch (p.match) {
    case '=%':  return `STARTSWITH(${f}, @p_${p.id})`
    case '%=':  return `ENDSWITH(${f}, @p_${p.id})`
    case '%=%': return `CONTAINS(${f}, @p_${p.id})`
    case 'i=':  return `${f} = @p_${p.id}`
    case 'i>=': return `${f} >= @p_${p.id}`
    case 'i<=': return `${f} <= @p_${p.id}`
    case 'i>':  return `${f} > @p_${p.id}`
    case 'i<':  return `${f} < @p_${p.id}`
    case 'i!=': return `${f} != @p_${p.id}`
    default:    return `${f} = @p_${p.id}`
  }
}

export const getSearchResults = async (props, upperCase, containerId) => {
  const searchable = props.filter(p => p.search && p.value.trim() !== '')
  if (!searchable.length) {
    searchResults.set(null)
    return
  }

  // Build WHERE clause — first condition has no connector, subsequent ones use each field's logic.
  const whereParts = searchable.map((p, i) => {
    const condition = buildCondition(p)
    return i === 0 ? condition : `${p.logic.toUpperCase()} ${condition}`
  })

  // Build SELECT — visible non-computed fields, always include Pages for count + download.
  const selectFields = props
    .filter(p => p.show && !p.expr)
    .map(p => `c["${p.id}"]`)
  if (!selectFields.includes('c["Pages"]')) selectFields.push('c["Pages"]')
  if (!selectFields.includes('c["id"]')) selectFields.push('c["id"]')

  const queryText = `SELECT TOP 15 ${selectFields.join(', ')} FROM c WHERE ${whereParts.join(' ')}`

  const query = {
    query: queryText,
    parameters: searchable.map(p => ({
      name: `@p_${p.id}`,
      value: p.match.startsWith('i')
        ? parseInt(p.value.trim(), 10)
        : upperCase ? p.value.trim().toUpperCase() : p.value.trim(),
    })),
  }

  const { endpoint, databaseId } = cosmos
  const aadCredentials = new ibc(login)
  const client = new CosmosClient({
    endpoint,
    aadCredentials,
    retryOptions: { maxRetryAttemptCount: 0 },
  })

  // NOTE: The SDK makes a query-plan preflight POST before executing cross-partition queries.
  // In a browser SPA, Cosmos DB CORS only allows origins — not the internal SDK headers that
  // the query plan request requires — so that preflight always returns 400. The SDK catches it
  // internally, falls back to standard execution, and proceeds normally. The 400 in the browser
  // console is expected and harmless; there is no way to suppress it from the client side.
  let items
  try {
    const result = await client
      .database(databaseId)
      .container(containerId)
      .items
      .query(query, { enableCrossPartitionQuery: true })
      .fetchAll()
    items = result.resources
  } catch (err) {
    console.error('[search] fetch failed', {
      message: err?.message,
      code: err?.code,
      statusCode: err?.statusCode,
      body: err?.body,
      substatus: err?.substatus,
    })
    throw err
  }

  dbg('container:', containerId)
  dbg('query:', queryText)
  dbg('params:', query.parameters)
  dbg('results:', items)
  expose('lastQuery', { sql: queryText, parameters: query.parameters, containerId })
  expose('lastResults', items)
  cache[containerId] = items
  try { localStorage.setItem(cacheKey(containerId), JSON.stringify(items)) } catch { /* quota exceeded */ }
  searchResults.set(items)
}
