{#if _art}
  {#if _art.animated}
    <div class="art-thumb">
      <AnimationPreview {..._art} simple />
    </div>
  {:else}
    <div class="art-thumb" style="background-image: url({_art.png})" />
  {/if}
{/if}

<script>
  import { art } from '../stores/project-stores'
  import AnimationPreview from './AnimationPreview.svelte'

  export let id
  $: _art = id != null ? $art.find(a => a.id == id) : null
</script>
