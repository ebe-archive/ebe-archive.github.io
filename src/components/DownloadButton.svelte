<script>
  export let searchResult
  import { BlobServiceClient } from '@azure/storage-blob'
  import { InteractiveBrowserCredential } from '@azure/identity'
  import JSZip from 'jszip'
  import { login, storage } from '../stores/config/config'
  import { preferences } from '../stores/preferences/preferences'
  import { dbg } from '../lib/debug'

  $: pages = searchResult?.Pages ?? []
  $: searchResult, dedupInfo = null // clear stale dedup info when result changes

  // Build the blob path from a page entry.
  // id 6650615 → 6/65/06/6650615.TIF
  // id 885346  → 0/88/53/885346.TIF  (top-level 0 implied by short id)
  // id 10      → 0/00/00/10.TIF
  const blobPath = (page) => {
    const id = String(page.id)
    const padded = id.padStart(7, '0')
    const top = padded.slice(0, -6)
    const mid = padded.slice(-6, -4)
    const bot = padded.slice(-4, -2)
    return `${top}/${mid}/${bot}/${id}.${page.ext.toUpperCase()}`
  }

  let status = null // null | 'Downloading N of M...' | 'Zipping...'
  let dedupInfo = null // null | { total, unique, skipped }

  const getContainer = () => {
    const credential = new InteractiveBrowserCredential(login)
    const client = new BlobServiceClient(storage.endpoint, credential)
    return client.getContainerClient(storage.containerId)
  }

  const fetchBlob = async (container, page) => {
    const path = blobPath(page)
    dbg('fetching blob:', path)
    const response = await container.getBlobClient(path).download()
    return response.blobBody
  }

  // Fast SHA-256 hash of an ArrayBuffer/Blob for dedup.
  const hashBlob = async (blob) => {
    const buf = blob instanceof Blob ? await blob.arrayBuffer() : blob
    const hash = await crypto.subtle.digest('SHA-256', buf)
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  const triggerSave = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const BIG_FILE_THRESHOLD = 25
  const PARALLEL_CONCURRENCY = 6

  // Download pages in parallel batches, reporting progress.
  const downloadParallel = async (container, pageList) => {
    const results = new Array(pageList.length)
    let completed = 0
    for (let start = 0; start < pageList.length; start += PARALLEL_CONCURRENCY) {
      const batch = pageList.slice(start, start + PARALLEL_CONCURRENCY)
      const batchResults = await Promise.all(
        batch.map(async (page, j) => {
          const data = await fetchBlob(container, page)
          completed++
          status = `Downloading ${completed} of ${pageList.length}…`
          return data
        })
      )
      for (let j = 0; j < batchResults.length; j++) {
        results[start + j] = batchResults[j]
      }
    }
    return results
  }

  // Download pages sequentially, reporting progress.
  const downloadSerial = async (container, pageList) => {
    const results = []
    for (let i = 0; i < pageList.length; i++) {
      status = `Downloading ${i + 1} of ${pageList.length}…`
      results.push(await fetchBlob(container, pageList[i]))
    }
    return results
  }

  // Dedup downloaded blobs, keeping the page with the highest numeric id per hash group.
  const dedupPages = async (pageList, blobs) => {
    const hashMap = new Map() // hash → index of page with max id
    for (let i = 0; i < blobs.length; i++) {
      const hash = await hashBlob(blobs[i])
      const existing = hashMap.get(hash)
      if (existing === undefined || Number(pageList[i].id) > Number(pageList[existing].id)) {
        hashMap.set(hash, i)
      }
    }
    const keepIndices = [...hashMap.values()].sort((a, b) => a - b)
    const skipped = blobs.length - keepIndices.length
    const kept = keepIndices.map(idx => ({ page: pageList[idx], data: blobs[idx] }))
    return { kept, skipped }
  }

  const download = async () => {
    if (!pages.length) return
    dedupInfo = null

    const isBigFile = pages.length >= BIG_FILE_THRESHOLD

    // Show at most one warning — big file warning takes priority
    if (isBigFile && !$preferences.suppressBigFileWarning) {
      if (!confirm(`This is a large document with ${pages.length} pages. This download may take significantly longer and duplicate scans will be automatically removed.\n\nYou can suppress this warning in Preferences.\n\nContinue?`)) return
    } else if (pages.length > 1 && !$preferences.suppressDownloadWarning) {
      if (!confirm(`This document has ${pages.length} pages. Duplicate scans will be automatically removed.\n\nYou can suppress this warning in Preferences.\n\nContinue?`)) return
    }

    try {
      const container = getContainer()

      if (pages.length === 1) {
        status = 'Downloading...'
        const data = await fetchBlob(container, pages[0])
        triggerSave(data, `${pages[0].id}.${pages[0].ext.toUpperCase()}`)
      } else {
        // Choose serial or parallel based on size and preference
        const useParallel = isBigFile ? $preferences.parallelBigFileDownloads : $preferences.parallelDownloads
        const blobs = useParallel
          ? await downloadParallel(container, pages)
          : await downloadSerial(container, pages)

        status = 'Checking for duplicates…'
        const { kept, skipped } = await dedupPages(pages, blobs)

        // If all dupes resolved to a single page, save directly instead of zipping
        if (kept.length === 1) {
          const { page, data } = kept[0]
          triggerSave(data, `${page.id}.${page.ext.toUpperCase()}`)
        } else {
          const zip = new JSZip()
          for (const { page, data } of kept) {
            zip.file(`${page.id}.${page.ext.toUpperCase()}`, data)
          }
          status = 'Zipping…'
          const zipBlob = await zip.generateAsync({ type: 'blob' })
          triggerSave(zipBlob, `${searchResult.id}.zip`)
        }

        if (skipped > 0) {
          dedupInfo = { total: pages.length, unique: kept.length, skipped }
        }
      }
    } catch (err) {
      console.error('[download] failed', {
        message: err?.message,
        statusCode: err?.statusCode,
        code: err?.code,
      })
      alert(`Download failed: ${err?.message ?? 'unknown error'}`)
    } finally {
      status = null
    }
  }
</script>

<button on:click={download} disabled={pages.length === 0 || status !== null}>
  {#if status}
    {status}
  {:else if pages.length > 1}
    Download ({pages.length} pages)
  {:else}
    Download
  {/if}
</button>
{#if dedupInfo}
  <small style="color: crimson; display: block; margin-top: 0.25rem;">
    {dedupInfo.skipped} duplicate{dedupInfo.skipped === 1 ? '' : 's'} removed — {dedupInfo.unique} unique page{dedupInfo.unique === 1 ? '' : 's'} saved
  </small>
{/if}
