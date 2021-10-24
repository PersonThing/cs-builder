<ItemTypeBuilder id={params.id} itemType="blocks" store={blocks} {itemTemplate} bind:input {getItemGraphic}>
  <div class="p1">
    <FieldText name="name" bind:value={input.name} placeholder="Type a name...">Name</FieldText>
    <FieldArtPicker bind:value={input.graphic}>Graphic</FieldArtPicker>
    <FieldCheckbox name="can-walk" bind:checked={input.canWalk}>
      Can walk on?
      <div class="help-text">Can players walk on or through this block?</div>
    </FieldCheckbox>
    <FieldCheckbox name="can-see" bind:checked={input.canSee}>
      Can see through / across?
      <div class="help-text">Can players and enemies see through / across this block?</div>
    </FieldCheckbox>
  </div>
</ItemTypeBuilder>

<script>
  import { blocks } from '../stores/project-stores'
  import FieldArtPicker from '../components/FieldArtPicker.svelte'
  import FieldCheckbox from '../components/FieldCheckbox.svelte'
  import FieldText from '../components/FieldText.svelte'
  import ItemTypeBuilder from '../components/ItemTypeBuilder.svelte'

  export let params = {}
  let input = null

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
