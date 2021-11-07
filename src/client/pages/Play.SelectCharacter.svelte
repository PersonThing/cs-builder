<div class="grow p20">
  <h2>Select character</h2>
  {#if availableCharacters?.length}
    {#each availableCharacters as character}
      <div class="character-option">
        <ArtThumb id={character.class.graphics.still} />
        <a href="#/play/character/{character.id}/select-level">
          {character.name}: level {character.level}
          {character.class.name}
        </a>
        <button type="button" href={null} on:click={() => deleteCharacter(character.id)}>
          <Icon data={removeIcon} class="fw text-danger" />
        </button>
      </div>
    {/each}
  {/if}
  <a href="#/play/create-character">Create new character</a>

  <!--
    Character
      classId,
      name,
      username (who created it)
      level
      xp
      currency
      inventory
      equipped:
        helm
        chest
        legs
        feet
        hands
        mainHand
        offHand
        extra1
        extra2
        extra3

      inventory: [
        item: itemId, quantity
        ... up to 40 slots? 100? 500?
      ]

    whenever equipped items or level change, sum up stats from character class, level, and items, and update character -->
</div>

<script>
  import { characterclasses, characters, project } from '../stores/project-stores.js'
  import { remove as removeIcon } from 'svelte-awesome/icons'
  import ArtThumb from '../components/ArtThumb.svelte'
  import Icon from 'svelte-awesome'

  $: if ($project != null && $characterclasses != null) {
    characters.refresh()
  }

  $: availableCharacters = $characters.map(c => {
    const cls = $characterclasses.find(cc => cc.id == c.classId)
    return {
      ...c,
      class: cls,
    }
  })

  function deleteCharacter(id) {
    const character = $characters.find(ch => ch.id == id)
    if (confirm(`Are you sure you want to delete "${character.name}"?`)) {
      characters.apiDelete(id)
    }
  }
</script>

<style lang="scss">
  .character-option {
    margin-bottom: 20px;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 5px;
  }
</style>
