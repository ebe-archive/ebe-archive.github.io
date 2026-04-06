<script>
  import Content from './Content.svelte'
  import Spinner from './components/Spinner.svelte'
  import { InteractiveBrowserCredential as ibc } from '@azure/identity'
  import { login } from './stores/config/config'
  import { loadContainers } from './stores/containers/containers'

  const init = async () => {
    await new ibc(login).getToken('')
    await loadContainers()
  }
</script>

{#await init()}
  <Spinner message={'Loading...'} />
{:then _}
  <Content />
{/await}
