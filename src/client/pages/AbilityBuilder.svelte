<ItemTypeBuilder
  id={params.id}
  bind:this={itemTypeBuilder}
  itemType="abilities"
  singular="ability"
  itemTypeDescription="Create the abilities that can be used by your characters or enemies."
  store={abilities}
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
        <FieldDamageTypePicker bind:value={input.damageType}>Damage type</FieldDamageTypePicker>
        <FieldArtPicker bind:value={input.graphic}>Graphic</FieldArtPicker>
        <FieldArtPicker bind:value={input.particleGraphic}>Particle graphic (temporary until full particle builder added)</FieldArtPicker>
        <FieldAudioPicker bind:value={input.audioOnUse}>Audio on use</FieldAudioPicker>
        <FieldAudioPicker bind:value={input.audioOnHit}>Audio on hit</FieldAudioPicker>
        <FieldNumber name="speed" bind:value={input.speed} placeholder="Type a number">
          Projectile speed (tip: 0 to drop bombs / traps at your feet)
        </FieldNumber>
        <FieldNumber name="range" bind:value={input.range} placeholder="Type a number">Max range (pixels)?</FieldNumber>
        <FieldNumber name="projectileLifetimeMs" bind:value={input.lifetimeMs} placeholder="Type a number">
          How long do projectiles last (ms)? (if they don't move, they should at least expire, 0 or empty = forever)
        </FieldNumber>
        <FieldNumber name="damage" bind:value={input.damage} placeholder="Type a number">Damage</FieldNumber>
        <FieldNumber name="area-damage" bind:value={input.areaDamage} placeholder="Type a number">Area damage</FieldNumber>
        <FieldNumber name="area-damage-radius" bind:value={input.areaDamageRadius} placeholder="Type a number"
          >Area damage radius (pixels)</FieldNumber
        >
        <FieldNumber name="attacks-per-second" bind:value={input.attacksPerSecond} placeholder="Type a number">Attacks per second</FieldNumber>
        <FormButtons {hasChanges} canDelete={!isAdding} on:delete={() => itemTypeBuilder.del()} />
      </Form>
    </div>
  {/if}
</ItemTypeBuilder>

<script>
  import { abilities } from '../stores/project-stores'
  import FieldArtPicker from '../components/FieldArtPicker.svelte'
  import FieldText from '../components/FieldText.svelte'
  import Form from '../components/Form.svelte'
  import FormButtons from '../components/FormButtons.svelte'
  import ItemTypeBuilder from '../components/ItemTypeBuilder.svelte'
  import FieldNumber from '../components/FieldNumber.svelte'
  import FieldAudioPicker from '../components/FieldAudioPicker.svelte'
  import FieldDamageTypePicker from '../components/FieldDamageTypePicker.svelte'

  export let params = {}
  let input = null
  let itemTypeBuilder

  const itemTemplate = {
    name: '',
    graphic: null,
    audioOnUse: null,
    audioOnHit: null,
    particleGraphic: null, // temporary
    range: 400,
    damage: 20,
    areaDamage: 0,
    areaDamageRadius: 40,
    attacksPerSecond: 2,
    speed: 10,
    lifetimeMs: 2000,
    damageType: null,
  }

  function getItemGraphic(item) {
    return item.graphic
  }
</script>
