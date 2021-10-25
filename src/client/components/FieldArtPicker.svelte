<div class="form-group">
  <label for={name}>
    <slot />
  </label>
  <div>
    <ArtPicker {name} bind:value {placeholder} />
  </div>
</div>

<script>
  import ArtPicker from './ArtPicker.svelte'

  export let value = null
  export let name = 'art-picker'
  export let placeholder = 'Select art'
</script>
