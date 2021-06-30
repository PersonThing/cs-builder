{#if art}
  {#if art.animated}
    <div class="art-thumb">
      <AnimationPreview {...art} simple />
    </div>
  {:else}
    <div class="art-thumb" style="background-image: url({art.png})" />
  {/if}
{/if}

<script>
  import project from '../stores/active-project-store'
  import AnimationPreview from './AnimationPreview.svelte'

  export let id
  $: art = id != null ? $project.art[id] : null
</script>
