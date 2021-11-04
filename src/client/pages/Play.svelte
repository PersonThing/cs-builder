<AppLayout active="play">
  <Router {routes} {prefix} />
</AppLayout>

<script>
  import { project } from '../stores/project-stores.js'
  import AppLayout from '../components/AppLayout.svelte'
  import PlayCreateCharacter from './Play.CreateCharacter.svelte'
  import PlayLevelRenderer from './Play.LevelRenderer.svelte'
  import PlaySelectCharacter from './Play.SelectCharacter.svelte'
  import PlaySelectLevel from './Play.SelectLevel.svelte'
  import Router from 'svelte-spa-router'

  export let params = {}
  const prefix = '/play'
  const routes = {
    '/create-character': PlayCreateCharacter,
    '/character/:characterId/select-level': PlaySelectLevel,
    '/character/:characterId/level/:levelId': PlayLevelRenderer,
    '*': PlaySelectCharacter,
  }
</script>
