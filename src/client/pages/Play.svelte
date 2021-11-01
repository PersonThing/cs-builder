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
      <div class="flex-row">
        <!-- todo: allow creating/deleting/picking existing character
        <div class="character-picker">
          <h2>My characters</h2>

            character {
              class: character class from $characters
              name: string
              equipped: {
                mainhand
                offhand
                helm
                chest
                belt
                gloves
                boots
                neck
                ring1
                ring2
              }
              inventory: items they've picked up
              gold: amount of gold they've picked up
              level: 1 for now, figure out leveling/exp gain later
              skills: later, for now just hard-coded by class
            }

            potential item mods:
              damage reduction for all damage types
              damage reduction for individual damage type
              damage bonus for all damage types
              damage bonus for individual damage type
              health
              health regeneration
              mana/energy/whatever
              mana/energy/whatever regeneration
              global cooldown reduction
              skill cooldown reduction
              individual skill damage bonus
              add projectiles
              add max turret
              add ability
              speed %
              range %
              size %

            whenever equipped items change, sum up stats and update the character
            <a href="#/play/create-character">Create character</a>
          </div>
        -->
        <div class="level-picker">
          <h2>Choose a level</h2>
          {#each $levels as level}
            <a href="#/play/{level.id}" class="play-level-btn">{level.name}</a>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</AppLayout>

<script>
  import AppLayout from '../components/AppLayout.svelte'
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
    flex-direction: row;
    padding: 20px;

    .art-preview-item {
      width: 40px;
      height: 40px;
      background-repeat: no-repeat;
      background-position: left top;
      opacity: 0.4;
    }
  }

  .character-picker {
    padding: 20px;
  }

  .level-picker {
    padding: 20px;
  }

  .play-level-btn {
    margin-bottom: 20px;
    display: block;
  }
</style>
