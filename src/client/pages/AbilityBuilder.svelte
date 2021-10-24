<ItemTypeBuilder
  id={params.id}
  bind:this={itemTypeBuilder}
  itemType="abilities"
  singular="ability"
  store={abilities}
  {itemTemplate}
  bind:input
  {getItemGraphic}
  let:hasChanges
  let:isAdding
>
  <div class="grow p1">
    <Form on:submit={() => itemTypeBuilder.save()}>
      <FieldText name="name" bind:value={input.name} placeholder="Type a name...">Name</FieldText>
      <FieldArtPicker bind:value={input.graphic}>Graphic</FieldArtPicker>
      <FieldNumber name="range" bind:value={input.range} placeholder="Type a number">Range (pixels)</FieldNumber>
      <FieldNumber name="damage" bind:value={input.damage} placeholder="Type a number">Damage</FieldNumber>
      <FieldNumber name="area-damage" bind:value={input.areaDamage} placeholder="Type a number">Area damage</FieldNumber>
      <FieldNumber name="area-damage-radius" bind:value={input.areaDamageRadius} placeholder="Type a number">Area damage radius (pixels)</FieldNumber>
      <FieldNumber name="attacks-per-second" bind:value={input.attacksPerSecond} placeholder="Type a number">Attacks per second</FieldNumber>
      <FieldNumber name="speed" bind:value={input.speed} placeholder="Type a number">Projectile speed</FieldNumber>
      <FormButtons {hasChanges} canDelete={!isAdding} on:delete={() => itemTypeBuilder.del()} />
    </Form>
  </div>
</ItemTypeBuilder>

<script>
  import { abilities } from '../stores/project-stores'
  import FieldArtPicker from '../components/FieldArtPicker.svelte'
  import FieldText from '../components/FieldText.svelte'
  import Form from '../components/Form.svelte'
  import FormButtons from '../components/FormButtons.svelte'
  import ItemTypeBuilder from '../components/ItemTypeBuilder.svelte'
  import FieldNumber from '../components/FieldNumber.svelte'

  export let params = {}
  let input = null
  let itemTypeBuilder

  const itemTemplate = {
    name: '',
    graphic: null,
    range: 400,
    damage: 20,
    areaDamage: 0,
    areaDamageRadius: 40,
    attacksPerSecond: 2,
    speed: 10,
  }

  function getItemGraphic(item) {
    return item.graphic
  }
</script>
