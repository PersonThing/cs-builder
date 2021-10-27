<div class="form-group">
  <label for={name}>
    <slot />
  </label>
  <div>
    <DamageTypePicker {name} bind:value {placeholder} />
  </div>
</div>

<script>
  import DamageTypePicker from './DamageTypePicker.svelte'

  export let value = null
  export let name = 'damage-type-picker'
  export let placeholder = 'Select damage type'
</script>
