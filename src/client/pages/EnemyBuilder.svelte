<ItemTypeBuilder id={params.id} itemType="enemies" store={enemies} {itemTemplate} bind:input {getItemGraphic}>
  <div class="p1">
    <FieldText name="name" bind:value={input.name} placeholder="Type a name...">Name</FieldText>
    <FieldNumber name="speed" bind:value={input.speed} placeholder="Speed (pixels per frame)">Speed (pixels per frame)</FieldNumber>
    <FieldArtPicker bind:value={input.graphics.still}>Still graphics</FieldArtPicker>
    <FieldArtPicker bind:value={input.graphics.moving}>Moving graphics</FieldArtPicker>
    <FieldNumber name="sight-radius" bind:value={input.sightRadius} placeholder="Sight radius (pixels)">Sight radius (pixels)</FieldNumber>
  </div>
</ItemTypeBuilder>

<script>
  import { enemies } from '../stores/project-stores'
  import FieldArtPicker from '../components/FieldArtPicker.svelte'
  import FieldNumber from '../components/FieldNumber.svelte'
  import FieldText from '../components/FieldText.svelte'
  import ItemTypeBuilder from '../components/ItemTypeBuilder.svelte'

  export let params = {}
  let input = null

  const itemTemplate = {
    name: '',
    speed: 5,
    graphics: {
      still: null,
      moving: null,
    },
    abilities: [],
    sightRadius: 150,
  }

  function getItemGraphic(item) {
    return item.graphics.still
  }
</script>
