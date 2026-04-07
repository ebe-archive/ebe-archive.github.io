<script>
  import { preferences, resetPreferences } from '../stores/preferences/preferences'
  import { selectedContainer } from '../stores/containers/containers'
  import matchTypes from '../stores/preferences/matchTypes'

  $: fields = $preferences.containers[$selectedContainer] ?? []
  $: searchCount = fields.filter(f => f.search).length

  const notify = () => preferences.update(p => p)
</script>

<section>
  <p>Settings are saved in your browser. Use the button below to reset everything to defaults.</p>
  <button on:click={resetPreferences}>Reset Preferences</button>
</section>

<details open>
  <summary>Search Fields</summary>
  <p>Configure which fields appear in search, how they match, and which show in results. The selected index below stays in sync with the home page.</p>

  <label for="pref-container"><b>Index</b></label><br />
  <select id="pref-container" bind:value={$selectedContainer}>
    {#each Object.keys($preferences.containers) as c}
      <option value={c}>{c}</option>
    {/each}
  </select>

  <table>
    <thead>
      <tr>
        <th>Field</th>
        <th>Search</th>
        <th>Match</th>
        <th>Show</th>
      </tr>
    </thead>
    <tbody>
      {#each fields as f}
        <tr>
          <td>{f.id}</td>
          <td style="text-align:center;">
            <input type="checkbox" bind:checked={f.search} on:change={notify}
            disabled={f.search && searchCount === 1} />
          </td>
          <td>
            <select bind:value={f.match} on:change={notify}>
              {#each matchTypes as m}
                <option value={m.value}>{m.text}</option>
              {/each}
            </select>
          </td>
          <td style="text-align:center;">
            <input type="checkbox" bind:checked={f.show} on:change={notify} />
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</details>

<details>
  <summary>Downloads</summary>
  <p>Multi-page documents may take longer to download. Duplicate scans are automatically removed from the final zip file.</p>
  <label><input type="checkbox" bind:checked={$preferences.suppressDownloadWarning} /> Skip multi-page download warning</label><br />
  <label><input type="checkbox" bind:checked={$preferences.parallelDownloads} /> Use parallel downloads</label>

  <details style="margin-top: 0.75rem;">
    <summary>Large files (25+ pages)</summary>
    <p>Documents with 25 or more pages are more likely to contain duplicate scans and may take significantly longer to download.</p>
    <label><input type="checkbox" bind:checked={$preferences.suppressBigFileWarning} /> Skip large file download warning</label><br />
    <label><input type="checkbox" bind:checked={$preferences.parallelBigFileDownloads} /> Use parallel downloads</label>
  </details>
</details>

<details>
  <summary>Case Sensitivity</summary>
  <p>Text entered in search boxes will be converted to upper case before querying, since most data in this system is stored in upper case. Uncheck to disable.</p>
  <input type="checkbox" bind:checked={$preferences.upperCase} /> Convert search terms to upper case
</details>
