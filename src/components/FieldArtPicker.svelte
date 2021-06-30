<div class="form-group">
  <label>
    <slot />
  </label>
  <div>
    <InputSelect inline {name} bind:value let:option {options} filterable={options.length > 3} {placeholder}>
      <ArtThumb id={option.id} />
      {option.name}
    </InputSelect>
  </div>
  {#if value != null}
    <a href="#/{$project.name}/build/art/{value}" class="ml-1">Edit {$project.art[value].name} art</a>
  {/if}
</div>

<script>
  import { sortByName } from '../services/object-utils'
  import project from '../stores/active-project-store'
  import InputSelect from './InputSelect.svelte'
  import ArtThumb from './ArtThumb.svelte'

  export let value = null
  export let name = 'art-picker'
  export let placeholder = 'Select art'

  $: options = Object.values($project.art)
    .map(a => ({
      ...a,
      value: a.id,
    }))
    .sort(sortByName)
</script>
