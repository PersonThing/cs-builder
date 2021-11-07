<div class="form-group">
  <label for={name}>
    <slot />
  </label>
  <div>
    <InputSelect {name} bind:value let:option options={equipmentSlots} {placeholder} {multiple} />
  </div>
</div>

<script>
  import InputSelect from './InputSelect.svelte'

  export let value = null
  export let name = 'art-picker'
  export let placeholder = 'Select item slot'
  export let multiple = false

  const equipmentSlots = ['Head', 'Chest', 'Legs', 'Feet', 'Gloves', 'Mainhand', 'Offhand', 'Accessory']
</script>
