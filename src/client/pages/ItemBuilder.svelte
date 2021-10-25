<ItemTypeBuilder
  id={params.id}
  bind:this={itemTypeBuilder}
  itemType="items"
  singular="item"
  itemTypeDescription="For now, items are things you can place in a level that detect collisions with players or enemies, and run a script when those collisions happen."
  store={items}
  {itemTemplate}
  bind:input
  {getItemGraphic}
  let:hasChanges
  let:isAdding
>
  <div class="grow p1">
    <Form on:submit={() => itemTypeBuilder.save()}>
      <FieldText name="name" bind:value={input.name} placeholder="Type a name...">Name</FieldText>
      <FieldArtPicker bind:value={input.graphics.still}>Still graphics</FieldArtPicker>
      <FieldCheckbox bind:checked={input.removeOnCollision} name="remove-on-collision">Remove on collision</FieldCheckbox>
      <FieldCheckbox bind:checked={input.playersCanUse} name="players-can-use">Players can use</FieldCheckbox>
      <FieldCheckbox bind:checked={input.enemiesCanUse} name="enemies-can-use">Enemies can use</FieldCheckbox>
      <FieldScriptEditor bind:value={input.onCollision} {examples}>onCollision(item, sprite, world)</FieldScriptEditor>
      <FormButtons {hasChanges} canDelete={!isAdding} on:delete={() => itemTypeBuilder.del()} />
    </Form>
  </div>
</ItemTypeBuilder>

<script>
  import { items } from '../stores/project-stores.js'
  import FieldArtPicker from '../components/FieldArtPicker.svelte'
  import FieldCheckbox from '../components/FieldCheckbox.svelte'
  import FieldScriptEditor from '../components/FieldScriptEditor.svelte'
  import FieldText from '../components/FieldText.svelte'
  import Form from '../components/Form.svelte'
  import FormButtons from '../components/FormButtons.svelte'
  import ItemTypeBuilder from '../components/ItemTypeBuilder.svelte'

  export let params = {}
  let input = null
  let itemTypeBuilder

  let examples = `// Examples:
// change speed
sprite.speed += 1

sprite.speed = sprite.speed * sprite.speed

// change size
sprite.scale.x *= 2
sprite.scale.y *= 2

// create text
const text = new PIXI.Text('Your text here', { fontFamily: 'Arial', fontSize: 18, fill : 0xffffff })
text.x = -100
text.y = -50
sprite.addChild(text)

// turn off an effect after 5 seconds
setTimeout(() => {
  sprite.speed -= 1
}, 5000)`

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
