<AppLayout active="play">
  <div class="grow">
    {#if selectedLevel}
      <LevelRenderer level={selectedLevel} playable {gridSize} bind:this={levelRenderer} />
    {:else}
      <div class="art-preview">
        {#each randomArtSample as art}
          <div class="art-preview-item" style="background-image: url('{art.png}');" />
        {/each}
      </div>
      <div class="level-picker">
        <h2>Choose a level</h2>
        {#each $levels as level}
          <a href="#/play/{level.id}" class="play-level-btn">Play {level.name}</a>
        {/each}
      </div>
    {/if}
  </div>
</AppLayout>

<script>
  import AppLayout from '../components/AppLayout.svelte'
  import ArtThumb from '../components/ArtThumb.svelte'
  import LevelRenderer from '../components/LevelRenderer.svelte'
  import { levels, art } from '../stores/project-stores'

  export let params = {}

  const gridSize = 40
  let levelRenderer

  $: selectedLevel = $levels.find(level => level.id == params.id)

  $: randomArtSample = $art.sort((a, b) => 0.5 - Math.random()).slice(0, 10)
</script>

<style lang="scss">
  .art-preview {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    margin: 20px;

    .art-preview-item {
      width: 40px;
      height: 40px;
      background-repeat: no-repeat;
      background-position: left top;
      opacity: 0.4;
    }
  }

  .level-picker {
    text-align: center;
  }

  .play-level-btn {
    margin-bottom: 20px;
    display: block;
  }
</style>
