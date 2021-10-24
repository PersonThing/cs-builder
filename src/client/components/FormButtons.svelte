<div class="btn-group">
  <SaveBtn disabled={!hasChanges} />
  <slot />
  {#if canDelete}
    <button type="button" class="btn btn-danger" on:click={() => dispatch('delete')}>Delete</button>
  {/if}
</div>

<script>
  import SaveBtn from './SaveBtn.svelte'
  import { createEventDispatcher } from 'svelte'
  const dispatch = createEventDispatcher()
  export let hasChanges = true
  export let canDelete = false
</script>
