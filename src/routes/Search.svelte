<script>
  import { getSearchResults, searchResults, restoreOrClear } from '../stores/search/search'
  import { selectedContainer } from '../stores/containers/containers'
  import { preferences } from '../stores/preferences/preferences'
  import { showPrefs } from '../stores/ui/ui'
  import matchTypes from '../stores/preferences/matchTypes'
  import Preferences from './Preferences.svelte'
  import SearchResults from '../components/SearchResults.svelte'
  import Spinner from '../components/Spinner.svelte'

  export let params = {}

  let searching = false
  let errorMsg = null

  $: containerPrefs = $preferences.containers[$selectedContainer] ?? []
  $: searchableProps = containerPrefs.filter(p => p.search)
  $: if ($selectedContainer) restoreOrClear($selectedContainer)

  const runSearch = async () => {
    if (!searchableProps.some(p => p.value.trim())) {
      searchResults.set(null)
      return
    }
    searching = true
    errorMsg = null
    await getSearchResults(containerPrefs, $preferences.upperCase, $selectedContainer)
      .then(() => (searching = false))
      .catch((err) => {
        searching = false
        errorMsg = err?.code === 429 || err?.statusCode === 429
          ? 'Too many requests — please wait a moment and try again.'
          : 'An error occurred while searching.'
        console.error(err)
      })
  }

  const handleKeydown = (e) => {
    if (e.key === 'Enter') runSearch()
  }

  const toggleLogic = (prop) => {
    prop.logic = prop.logic === 'or' ? 'and' : 'or'
    preferences.update(p => p)
  }
</script>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 100;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 2rem;
  }
  .pref-panel {
    background: var(--bg);
    border-radius: 0.5rem;
    max-width: 700px;
    width: 90%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .pref-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .pref-body {
    overflow-y: auto;
    padding: 1rem 1.5rem 1.5rem;
  }
  .search-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  .search-row .logic-btn {
    min-width: 3rem;
    padding: 0.25rem 0.5rem;
    font-size: small;
    margin: 0;
  }
  .search-row .field-name {
    font-weight: bold;
    white-space: nowrap;
  }
  .search-row code {
    white-space: nowrap;
  }
  .search-row input {
    flex: 1;
    margin: 0;
    padding: 0.35rem 0.5rem;
  }
</style>

{#if $showPrefs}
  <div class="overlay" on:click|self={() => $showPrefs = false}>
    <div class="pref-panel">
      <div class="pref-header">
        <b>Preferences</b>
        <button on:click={() => $showPrefs = false}>✕</button>
      </div>
      <div class="pref-body">
        <Preferences />
      </div>
    </div>
  </div>
{/if}

{#if searchableProps.length === 0}
  <p><i>No search fields enabled. Open Preferences to configure.</i></p>
{:else}
  {#each searchableProps as prop, i}
    <div class="search-row">
      {#if i > 0}
        <button class="logic-btn" on:click={() => toggleLogic(prop)}>{prop.logic.toUpperCase()}</button>
      {/if}
      <label class="field-name" for={prop.id}>{prop.id}</label>
      <code>{matchTypes.find(m => m.value === prop.match)?.text ?? prop.match}</code>
      <input
        id={prop.id}
        placeholder="Type a value..."
        bind:value={prop.value}
        on:keydown={handleKeydown}
        on:input={() => preferences.update(p => p)}
      />
    </div>
  {/each}
  <p style="text-align: center;"><button on:click={runSearch}>Search</button></p>
{/if}

{#if searching}
  <Spinner message={'Searching...'} />
{/if}

{#if errorMsg}
  <code>{errorMsg}</code>
{/if}

<SearchResults />
