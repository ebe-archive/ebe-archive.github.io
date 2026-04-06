<script>
  import { showPrefs } from '../stores/ui/ui'
</script>

<style>
  a.prefs-link {
    font-size: 0.8rem;
    font-weight: normal;
  }
</style>

<h1>Document Search</h1>
<a href="#" class="prefs-link" on:click|preventDefault={() => $showPrefs = true}>Preferences</a>
