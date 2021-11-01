<ItemTypeBuilder
  id={params.id}
  bind:this={itemTypeBuilder}
  itemType="characters"
  singular="character"
  itemTypeDescription="Create your playable characters or friendly NPCs here."
  store={characters}
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
        <FieldNumber name="health" bind:value={input.health} placeholder="Type a number...">Health</FieldNumber>
        <FieldNumber name="gcd" bind:value={input.gcd} placeholder="Type a number...">Global cooldown (ms) between ability uses</FieldNumber>
        <FieldAudioPicker bind:value={input.audioOnDeath}>Audio on death</FieldAudioPicker>
        <FieldAbilities bind:value={input.abilities} keyAssignable>Abilities</FieldAbilities>
        <FormButtons {hasChanges} canDelete={!isAdding} on:delete={() => itemTypeBuilder.del()} />
      </Form>
    </div>
  {/if}
</ItemTypeBuilder>

<script>
  import { characters } from '../stores/project-stores'
  import FieldAbilities from '../components/FieldAbilities.svelte'
  import FieldArtPicker from '../components/FieldArtPicker.svelte'
  import FieldNumber from '../components/FieldNumber.svelte'
  import FieldText from '../components/FieldText.svelte'
  import Form from '../components/Form.svelte'
  import FormButtons from '../components/FormButtons.svelte'
  import ItemTypeBuilder from '../components/ItemTypeBuilder.svelte'
  import FieldAudioPicker from '../components/FieldAudioPicker.svelte'

  export let params = {}
  let input = null
  let itemTypeBuilder

  const itemTemplate = {
    name: '',
    speed: 5,
    graphics: {
      still: null,
      moving: null,
    },
    abilities: [],
    gcd: 0,
    health: 100,
    audioOnDeath: null,
  }

  function getItemGraphic(item) {
    return item.graphics.still
  }
</script>
