<script>
  export let searchResult
  // Download logic will be updated once the full Pages-based blob path is confirmed.
  // searchResult.Pages is an array of { page, id, ext } entries.
  $: pages = searchResult?.Pages ?? []
</script>

<style>
  div {
    width: 12rem;
  }
</style>

<div>
  <button disabled={true}>Download (coming soon)</button>
</div>
