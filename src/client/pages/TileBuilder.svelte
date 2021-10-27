<ItemTypeBuilder
  id={params.id}
  bind:this={itemTypeBuilder}
  itemType="tiles"
  singular="tile"
  itemTypeDescription="You build levels out of 40x40 tiles. Tiles give your levels their appearance, and determine where characters can walk or see."
  store={tiles}
  {itemTemplate}
  bind:input
  {getItemGraphic}
  let:hasChanges
  let:isAdding
>
  {#if input}
    <div class="grow p1">
      <Form on:submit={() => itemTypeBuilder.save()}>
        <FieldText name="name" bind:value={input.name} placeholder="Type a name...">Name</FieldText>
        <FieldArtPicker bind:value={input.graphic}>Graphic</FieldArtPicker>
        <FieldCheckbox name="can-walk" bind:checked={input.canWalk}>
          Can walk on?
          <div class="help-text">Can players and enemies walk on / through this tile?</div>
        </FieldCheckbox>
        <FieldCheckbox name="can-see" bind:checked={input.canSee}>
          Can see through / across?
          <div class="help-text">Can players and enemies see through / across this tile?</div>
        </FieldCheckbox>
        <FormButtons {hasChanges} canDelete={!isAdding} on:delete={() => itemTypeBuilder.del()} />
      </Form>
    </div>
  {/if}
</ItemTypeBuilder>

<script>
  import { tiles } from '../stores/project-stores'
  import FieldArtPicker from '../components/FieldArtPicker.svelte'
  import FieldCheckbox from '../components/FieldCheckbox.svelte'
  import FieldText from '../components/FieldText.svelte'
  import Form from '../components/Form.svelte'
  import FormButtons from '../components/FormButtons.svelte'
  import ItemTypeBuilder from '../components/ItemTypeBuilder.svelte'

  export let params = {}
  let input = null
  let itemTypeBuilder

  const itemTemplate = {
    name: '',
    graphic: null,
    canWalk: true,
    canSee: true,
  }

  function getItemGraphic(item) {
    return item.graphic
  }
</script>
