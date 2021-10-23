<div class="form-group">
  <label>
    <slot>Particles</slot>
  </label>
  <ParticlesPicker {name} bind:value />
</div>

<script>
  import ParticlesPicker from './ParticlesPicker.svelte'
  export let value = null
  export let name = 'particles-picker'
</script>
