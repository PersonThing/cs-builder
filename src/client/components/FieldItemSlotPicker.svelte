<div class="form-group">
  <label for={name}>
    <slot />
  </label>
  <div>
    <InputSelect {name} bind:value let:option options={Object.keys(ItemSlotType)} {placeholder} {multiple} />
  </div>
</div>

<script>
  import InputSelect from './InputSelect.svelte'
  import ItemSlotType from '../config/item-slot-types.js'

  export let value = null
  export let name = 'art-picker'
  export let placeholder = 'Select item slot'
  export let multiple = false
</script>
