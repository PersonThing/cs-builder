<ItemTypeBuilder
  id={params.id}
  bind:this={itemTypeBuilder}
  itemType="items"
  singular="item"
  itemTypeDescription="Items that can be found by players."
  store={items}
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
        <FieldItemSlotPicker bind:value={input.slot}>Slot</FieldItemSlotPicker>

        {#each numberStats as statName}
          <FieldNumber name={statName} bind:value={input.stats[statName]}>{statName}</FieldNumber>
        {/each}

        <!-- todo: item type, stats, etc -->
        <FormButtons {hasChanges} canDelete={!isAdding} on:delete={() => itemTypeBuilder.del()} />
      </Form>
    </div>
  {/if}
</ItemTypeBuilder>

<script>
  import { items } from '../stores/project-stores.js'
  import FieldArtPicker from '../components/FieldArtPicker.svelte'
  import FieldText from '../components/FieldText.svelte'
  import FieldNumber from '../components/FieldNumber.svelte'
  import FieldItemSlotPicker from '../components/FieldItemSlotPicker.svelte'
  import Form from '../components/Form.svelte'
  import FormButtons from '../components/FormButtons.svelte'
  import ItemTypeBuilder from '../components/ItemTypeBuilder.svelte'

  export let params = {}
  let input = null
  let itemTypeBuilder

  const numberStats = [
    'health',
    'health_regen_per_second',
    'power',
    'power_regen',
    'cooldown_reduction',
    'max_projectiles',
    'max_turrets',
    'speed_percent',
    'damage_bonus_percent',
    'damage_bonus_percent_fire',
    'damage_bonus_percent_cold',
    'damage_bonus_percent_poison',
    'damage_bonus_percent_physical',
    'damage_bonus_percent_lightning',
    'damage_reduction_percent',
    'damage_reduction_percent_fire',
    'damage_reduction_percent_cold',
    'damage_reduction_percent_poison',
    'damage_reduction_percent_physical',
    'damage_reduction_percent_lightning',
  ]

  const itemTemplate = {
    name: '',
    graphics: {
      still: null,
    },
    stats: {},

    // todo: consider how these could/should work
    // abilities: null,
    // on_hit_abilities: null,
    // on_struck_abilities: null,
  }

  function getItemGraphic(item) {
    return item.graphics.still
  }
</script>
