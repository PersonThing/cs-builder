<ItemTypeBuilder
  id={params.id}
  bind:this={itemTypeBuilder}
  itemType="interactables"
  singular="interactable"
  itemTypeDescription="Interactables are things you can plaace in a level that detect collisions and can modify whatever touched them or do anything programmatically."
  store={interactables}
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
        <FieldArtPicker bind:value={input.graphics.still}>Still graphics</FieldArtPicker>
        <FieldAudioPicker bind:value={input.audioOnCollision}>Audio on collision</FieldAudioPicker>
        <FieldCheckbox bind:checked={input.removeOnCollision} name="remove-on-collision">Remove on collision</FieldCheckbox>
        <FieldCheckbox bind:checked={input.playersCanUse} name="players-can-use">Players can use</FieldCheckbox>
        <FieldCheckbox bind:checked={input.enemiesCanUse} name="enemies-can-use">Enemies can use</FieldCheckbox>
        <FieldScriptEditor bind:value={input.onCollision} {examples}>onCollision(interactable, sprite, world, PIXI)</FieldScriptEditor>
        <FormButtons {hasChanges} canDelete={!isAdding} on:delete={() => itemTypeBuilder.del()} />
      </Form>
    </div>
  {/if}
</ItemTypeBuilder>

<script>
  import { interactables } from '../stores/project-stores.js'
  import FieldArtPicker from '../components/FieldArtPicker.svelte'
  import FieldAudioPicker from '../components/FieldAudioPicker.svelte'
  import FieldCheckbox from '../components/FieldCheckbox.svelte'
  import FieldScriptEditor from '../components/FieldScriptEditor.svelte'
  import FieldText from '../components/FieldText.svelte'
  import Form from '../components/Form.svelte'
  import FormButtons from '../components/FormButtons.svelte'
  import ItemTypeBuilder from '../components/ItemTypeBuilder.svelte'

  export let params = {}
  let input = null
  let itemTypeBuilder

  let examples = `// change speed
sprite.speed += 1

// change size
sprite.setScale(2)

// turn off an effect after 5 seconds
wait(5000)
sprite.speed -= 1`

  const itemTemplate = {
    name: '',
    graphics: {
      still: null,
    },
    onCollision: '',
    audioOnCollision: null,
    removeOnCollision: true,
    playersCanUse: true,
    enemiesCanUse: false,
  }

  function getItemGraphic(item) {
    return item.graphics.still
  }
</script>
