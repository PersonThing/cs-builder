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
    <div class="grow p10">
      <Form on:submit={() => itemTypeBuilder.save()}>
        <FieldText name="name" bind:value={input.name} placeholder="Type a name...">Name</FieldText>
        <div class="form-group">
          <label for="ability-type">Ability type</label>
          <InputSelect name="ability-type" options={Object.keys(AbilityType)} bind:value={input.abilityType} />
        </div>
        <FieldNumber name="attacks-per-second" bind:value={input.cooldown} placeholder="Type a number">Cooldown (ms) between uses</FieldNumber>
        <FieldNumber name="range" bind:value={input.range} placeholder="Type a number">Max range (pixels)?</FieldNumber>
        <FieldAudioPicker bind:value={input.audioOnUse}>Audio on use</FieldAudioPicker>
        <FieldAudioPicker bind:value={input.audioOnHit}>Audio on hit</FieldAudioPicker>
        <FieldArtPicker bind:value={input.graphics.projectile}>Projectile graphic</FieldArtPicker>
        <FieldArtPicker bind:value={input.graphics.particle}>Particle graphic (temporary until full particle builder added)</FieldArtPicker>
        {#if input.abilityType === AbilityType.Basic}
          <FieldDamageTypePicker bind:value={input.damageType}>Damage type</FieldDamageTypePicker>
          <FieldNumber name="speed" bind:value={input.speed} placeholder="Type a number">
            Projectile speed (tip: 0 to drop bombs / traps at your feet)
          </FieldNumber>
          <FieldNumber name="projectileLifetimeMs" bind:value={input.lifetimeMs} placeholder="Type a number">
            How long do projectiles last (ms)? (if they don't move, they should at least expire, 0 or empty = forever)
          </FieldNumber>
          <FieldNumber name="damage" bind:value={input.damage} placeholder="Type a number">Damage</FieldNumber>
          <FieldNumber name="area-damage" bind:value={input.areaDamage} placeholder="Type a number">Area damage</FieldNumber>
          <FieldNumber name="area-damage-radius" bind:value={input.areaDamageRadius} placeholder="Type a number">
            Area damage radius (pixels)
          </FieldNumber>
        {:else}
          <FieldArtPicker bind:value={input.graphics.extra1}>Extra graphic 1 (ability.config.graphics.extra1)</FieldArtPicker>
          <FieldArtPicker bind:value={input.graphics.extra2}>Extra graphic 2 (ability.config.graphics.extra2)</FieldArtPicker>
          <FieldScriptEditor bind:value={input.onUse}>onUse(source, ability, target)</FieldScriptEditor>
          <FieldScriptEditor bind:value={input.onHit}>onHit(source, ability, target)</FieldScriptEditor>
        {/if}
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
  import FieldScriptEditor from '../components/FieldScriptEditor.svelte'
  import InputSelect from '../components/InputSelect.svelte'
  import AbilityType from '../config/ability-types.js'

  export let params = {}
  let input = null
  let itemTypeBuilder

  const itemTemplate = {
    // all abilities have these:
    name: '',
    abilityType: AbilityType.Basic,
    audioOnUse: null,
    audioOnHit: null,
    cooldown: 0,

    // basic abilities use these:
    graphics: {},
    range: 400,
    damage: 20,
    areaDamage: 0,
    areaDamageRadius: 40,
    speed: 10,
    lifetimeMs: 2000,
    damageType: null,

    // custom abilities just have this:
    onUse: null,
    onHit: null,
  }

  function getItemGraphic(item) {
    return item.graphic
  }
</script>
