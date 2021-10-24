<ItemTypeBuilder id={params.id} itemType="items" store={items} {itemTemplate} bind:input {getItemGraphic}>
  <div class="p1">
    <FieldText name="name" bind:value={input.name} placeholder="Type a name...">Name</FieldText>
    <FieldArtPicker bind:value={input.graphics.still}>Still graphics</FieldArtPicker>
    <FieldScriptEditor bind:value={input.onCollision}>onCollision(item, sprite, world)</FieldScriptEditor>
    <FieldCheckbox bind:checked={input.removeOnCollision} name="remove-on-collision">Remove on collision</FieldCheckbox>
    <FieldCheckbox bind:checked={input.playersCanUse} name="players-can-use">Players can use</FieldCheckbox>
    <FieldCheckbox bind:checked={input.enemiesCanUse} name="enemies-can-use">Enemies can use</FieldCheckbox>
  </div>
</ItemTypeBuilder>

<script>
  import { items } from '../stores/project-stores.js'
  import FieldArtPicker from '../components/FieldArtPicker.svelte'
  import FieldCheckbox from '../components/FieldCheckbox.svelte'
  import FieldScriptEditor from '../components/FieldScriptEditor.svelte'
  import FieldText from '../components/FieldText.svelte'
  import ItemTypeBuilder from '../components/ItemTypeBuilder.svelte'

  export let params = {}
  let input = null

  const itemTemplate = {
    name: '',
    graphics: {
      still: null,
    },
    onCollision: null,
    removeOnCollision: true,
    playersCanUse: true,
    enemiesCanUse: false,
  }

  function getItemGraphic(item) {
    return item.graphics.still
  }
</script>
