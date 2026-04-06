<script>
  import { searchResults } from '../stores/search/search'
  import { preferences } from '../stores/preferences/preferences'
  import { selectedContainer } from '../stores/containers/containers'
  import SearchResult from './SearchResult.svelte'

  $: visibleFields = new Set(
    ($preferences.containers[$selectedContainer] ?? [])
      .filter(p => p.show)
      .map(p => p.id)
  )
</script>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 0.75rem;
    margin-top: 0.75rem;
  }
</style>

<h5>Results:</h5>

{#if $searchResults}
  {#if $searchResults.length === 0}
    <h5><code>No search results</code></h5>
  {:else}
    {#if $searchResults.length === 15}
      <p><i>Showing the first 15 results — narrow your search to see more.</i></p>
    {/if}
    <div class="grid">
      {#each $searchResults as searchResult}
        <SearchResult {searchResult} {visibleFields} />
      {/each}
    </div>
  {/if}
{:else}
  <p><i>No results yet — search for some files!</i></p>
{/if}
