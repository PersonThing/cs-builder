<div class="form-group">
  <<div class="strong">
    <slot>Particles</slot>
  </div>
  <ParticlesPicker {name} bind:value />
</div>

<script>
  import ParticlesPicker from './ParticlesPicker.svelte'
  export let value = null
  export let name = 'particles-picker'
</script>
