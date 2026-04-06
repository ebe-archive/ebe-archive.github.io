<script>
  export let searchResult
  import { BlobServiceClient } from '@azure/storage-blob'
  import { InteractiveBrowserCredential } from '@azure/identity'
  import { login, storage } from '../stores/config/config'

  $: pages = searchResult?.Pages ?? []

  // Build the blob path from a page entry.
  // id 6650615 → 6/65/06/6650615.tif
  // Folders are read from the id right-to-left in groups of 2 (skipping the last 2 digits).
  const blobPath = (page) => {
    const id = String(page.id)
    const top = id.slice(0, -6)
    const mid = id.slice(-6, -4)
    const bot = id.slice(-4, -2)
    return `${top}/${mid}/${bot}/${id}.${page.ext}`
  }

  let downloading = false

  const download = async () => {
    const page = pages[0]
    if (!page) return
    downloading = true
    try {
      const credential = new InteractiveBrowserCredential(login)
      const client = new BlobServiceClient(storage.endpoint, credential)
      const container = client.getContainerClient(storage.containerId)
      const path = blobPath(page)
      const blob = container.getBlobClient(path)
      const response = await blob.download()
      const data = await response.blobBody
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = `${page.id}.${page.ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[download] failed', err)
      alert('Download failed. See console for details.')
    } finally {
      downloading = false
    }
  }
</script>

<button on:click={download} disabled={pages.length === 0 || downloading}>
  {downloading ? 'Downloading...' : 'Download'}
</button>
