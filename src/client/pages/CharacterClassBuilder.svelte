<ItemTypeBuilder
  id={params.id}
  bind:this={itemTypeBuilder}
  itemType="characterclasses"
  singular="character class"
  itemTypeDescription="Create your playable characters or friendly NPCs here."
  store={characterclasses}
  {itemTemplate}
  bind:input
  {getItemGraphic}
  let:hasChanges
  let:isAdding
>
  {#if input}
    <div class="grow p10">
      <Form on:submit={() => itemTypeBuilder.save()}>
        <FieldText name="name" bind:value={input.name} placeholder="Type a name...">Name</FieldText>
        <FieldNumber name="speed" bind:value={input.speed} placeholder="Speed (pixels per frame)">Speed (pixels per frame)</FieldNumber>
        <FieldArtPicker bind:value={input.graphics.still}>Still graphics</FieldArtPicker>
        <FieldArtPicker bind:value={input.graphics.moving}>Moving graphics</FieldArtPicker>
        <FieldArtPicker bind:value={input.graphics.death}>Death graphics</FieldArtPicker>
        <FieldCheckbox name="rotate-toward-target" bind:checked={input.rotateTowardTarget}>
          Rotate toward their target
          <div class="help-text">When moving, should character rotate toward their target?</div>
        </FieldCheckbox>
        <FieldNumber name="health" bind:value={input.health} placeholder="Type a number...">Health</FieldNumber>
        <FieldNumber name="gcd" bind:value={input.gcd} placeholder="Type a number...">Global cooldown (ms) between ability uses</FieldNumber>
        <FieldAudioPicker bind:value={input.audioOnDeath}>Audio on death</FieldAudioPicker>

        <FieldCheckbox name="layer-ability-art" bind:checked={input.layerAbilityArt}>Layer ability art on top of moving art?</FieldCheckbox>
        <FieldAbilities bind:value={input.abilities} keyAssignable>Abilities</FieldAbilities>
        <FormButtons {hasChanges} canDelete={!isAdding} on:delete={() => itemTypeBuilder.del()} />
      </Form>
    </div>
  {/if}
</ItemTypeBuilder>

<script>
  import { characterclasses } from '../stores/project-stores'
  import FieldAbilities from '../components/FieldAbilities.svelte'
  import FieldArtPicker from '../components/FieldArtPicker.svelte'
  import FieldNumber from '../components/FieldNumber.svelte'
  import FieldText from '../components/FieldText.svelte'
  import Form from '../components/Form.svelte'
  import FormButtons from '../components/FormButtons.svelte'
  import ItemTypeBuilder from '../components/ItemTypeBuilder.svelte'
  import FieldAudioPicker from '../components/FieldAudioPicker.svelte'
  import FieldCheckbox from '../components/FieldCheckbox.svelte'

  export let params = {}
  let input = null
  let itemTypeBuilder

  const itemTemplate = {
    name: '',
    speed: 5,
    graphics: {
      still: null,
      moving: null,
      death: null,
    },
    abilities: [],
    gcd: 300,
    health: 100,
    audioOnDeath: null,
    rotateTowardTarget: true,
    layerAbilityArt: false,
  }

  function getItemGraphic(item) {
    return item.graphics.still
  }
</script>
