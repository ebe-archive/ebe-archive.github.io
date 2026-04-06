<script>
  export let searchResult
  export let visibleFields = null
  import DownloadButton from './DownloadButton.svelte'

  const exclude = new Set(['_rid', '_self', '_etag', '_attachments', '_ts', 'Pages', 'full_text'])
  $: displayFields = visibleFields
    ? Object.entries(searchResult).filter(([k]) => visibleFields.has(k))
    : Object.entries(searchResult).filter(([k]) => !exclude.has(k))

  // Strip T00:00:00 / time portion from ISO date strings for cleaner display.
  const fmt = (v) => typeof v === 'string' && /T\d{2}:\d{2}/.test(v) ? v.split('T')[0] : v
</script>

<style>
  div {
    font-size: x-small;
    padding: 1rem;
    border-radius: 0.25rem;
    border: 1px solid lightslategray;
    transition: box-shadow 0.15s, border-color 0.15s;
  }
  div:hover {
    border-color: steelblue;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    background-color: #f5f7ff;
  }
  p.head, p.foot {
    text-align: center;
  }
  p.body {
    border-top: 1px solid lightgray;
    border-bottom: 1px solid lightgray;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }
</style>

<div>
  <p class="head">
    <b>{searchResult.Doc_Type ?? searchResult.id}</b>
  </p>
  <p class="body">
    {#each displayFields as [key, value]}
      <b>{key}</b>: {fmt(value)}<br />
    {/each}
  </p>
  <p class="foot">
    {#if searchResult.Pages?.length}
      <small>{searchResult.Pages.length} page{searchResult.Pages.length === 1 ? '' : 's'}</small><br />
    {/if}
    <DownloadButton {searchResult} />
  </p>
</div>
