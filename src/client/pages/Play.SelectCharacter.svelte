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
      gold
      spellDice
      spellSlots
      spellList
      inventory
      equipment:
        helm
        chest
        legs
        feet
        hands
        mainHand
        offHand

      inventory: [
        item: itemId, quantity
        ... up to 40 slots? 100? 500?
      ]

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
      ability cooldown reduction
      individual ability damage bonus
      add projectiles
      add max turret
      add ability
      speed %
      range %
      size %

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
