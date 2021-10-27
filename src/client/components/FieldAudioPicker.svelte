<div class="form-group">
  <label for={name}>
    <slot />
  </label>
  <div>
    <AudioPicker {name} bind:value {placeholder} />
  </div>
</div>

<script>
  import AudioPicker from './AudioPicker.svelte'

  export let value = null
  export let name = 'audio-picker'
  export let placeholder = 'Select audio'
</script>
