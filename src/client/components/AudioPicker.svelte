<InputSelect {name} bind:value let:option {options} filterable={options.length > 3} {placeholder}>
  {option.name}
</InputSelect>
{#if selected}
  <button class="btn btn-default" type="button" on:click={() => preview(selected)}>Play</button>
  <a href="#/audio/{value}" class="ml-1">Edit {selected.name} audio</a>
{/if}

<script>
  import { sortByName } from '../services/object-utils'
  import { audio } from '../stores/project-stores'
  import InputSelect from './InputSelect.svelte'
  import audioService from '../services/audio-service.js'

  export let value = null
  export let name = 'audio-picker'
  export let placeholder = 'Select audio'

  $: options = $audio
    // only show those that actually have data recorded
    .filter(a => a.data?.base64 != null)
    .map(a => ({
      ...a,
      value: a.id,
    }))
    .sort(sortByName)

  $: selected = options?.find(o => o.value == value)

  function preview(audio) {
    audioService.play(audio.data.base64, audio.start)
  }
</script>
