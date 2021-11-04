<div class="grow p20">
  <h2>Choose a level</h2>
  {#each $levels as level}
    <a href="#/play/character/{params.characterId}/level/{level.id}" class="level-option">{level.name}</a>
  {/each}
</div>

<script>
  import { levels } from '../stores/project-stores.js'

  export let params = {}
</script>

<style lang="scss">
  .level-option {
    margin-bottom: 20px;
    display: block;
  }
</style>
