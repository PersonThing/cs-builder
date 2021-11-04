<div class="grow">
  {#if level && character}
    <LevelRenderer {level} {character} playable {gridSize} />
  {/if}
</div>

<script>
  import LevelRenderer from '../components/LevelRenderer.svelte'
  import { characters, levels } from '../stores/project-stores.js'

  export let params = {}

  characters.refresh()

  $: character = $characters.find(ch => ch.id == params.characterId)
  $: level = $levels.find(l => l.id == params.levelId)

  const gridSize = 40
</script>
