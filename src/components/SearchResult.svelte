<script>
  export let searchResult
  export let visibleFields = null
  import DownloadButton from './DownloadButton.svelte'

  const exclude = new Set(['_rid', '_self', '_etag', '_attachments', '_ts', 'Pages', 'full_text'])
  let displayFields = []
  $: {
    const base = visibleFields
      ? Object.entries(searchResult).filter(([k]) => visibleFields.has(k))
      : Object.entries(searchResult).filter(([k]) => !exclude.has(k))
    // Inject PageCount as a computed field when it's enabled for display.
    const showPageCount = visibleFields ? visibleFields.has('PageCount') : true
    displayFields = showPageCount && searchResult.Pages?.length
      ? [...base, ['PageCount', searchResult.Pages.length]]
      : base
  }

  // Strip T00:00:00 / time portion from ISO date strings for cleaner display.
  const fmt = (v) => typeof v === 'string' && /T\d{2}:\d{2}/.test(v) ? v.split('T')[0] : v
</script>

<style>
  .card {
    font-size: x-small;
    padding: 0.75rem;
    border-radius: 0.25rem;
    border: 1px solid var(--border);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    display: flex;
    flex-direction: column;
    height: 100%;
    box-sizing: border-box;
  }
  .card:hover {
    transform: scale(1.3);
    transform-origin: center center;
    z-index: 10;
    position: relative;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    background: var(--bg);
  }
  .foot {
    text-align: center;
    margin-top: auto;
    padding-top: 0.5rem;
    margin-bottom: 0;
  }
  .field-row {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .field-row .field-key {
    font-weight: bold;
    white-space: nowrap;
  }
  .field-row .field-val {
    text-align: right;
    word-break: break-word;
  }
</style>

<div class="card">
  {#each displayFields as [key, value]}
    <span class="field-row"><span class="field-key">{key}</span> <span class="field-val">{fmt(value)}</span></span>
  {/each}
  <p class="foot">
    <DownloadButton {searchResult} />
  </p>
</div>
