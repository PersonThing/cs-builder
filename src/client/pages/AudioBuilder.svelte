<ItemTypeBuilder
  id={params.id}
  bind:this={itemTypeBuilder}
  itemType="audio"
  singular="audio"
  itemTypeDescription="Record audio here to use when things happen in your game."
  store={audio}
  {itemTemplate}
  bind:input
  {getItemGraphic}
  let:hasChanges
  let:isAdding
>
  {#if input}
    <div class="grow p1">
      <Form on:submit={() => itemTypeBuilder.save()}>
        <FieldText name="name" bind:value={input.name} placeholder="Type a name...">Name</FieldText>
        <div class="form-group">
          <label>Audio</label>
          {#if !isRecording}
            <button class="btn btn-warning" type="button" on:click={startRecording}>{input.data ? 'Redo recording' : 'Start recording'}</button>
          {:else}
            <button class="btn btn-warning" type="button" on:click={stopRecording}>Stop recording</button>
          {/if}
        </div>
        {#if input.data}
          <div class="form-group">
            <label>Start {input.start} / {input.duration}</label>
            <input type="range" min="0" max={input.duration} step="0.1" bind:value={input.start} />
            <button class="btn btn-success" type="button" on:click={playRecording}>Play</button>
          </div>
        {/if}
        <FormButtons {hasChanges} canDelete={!isAdding} on:delete={() => itemTypeBuilder.del()} />
      </Form>
    </div>
  {/if}
</ItemTypeBuilder>

<script>
  import { audio } from '../stores/project-stores'
  import FieldText from '../components/FieldText.svelte'
  import Form from '../components/Form.svelte'
  import FormButtons from '../components/FormButtons.svelte'
  import ItemTypeBuilder from '../components/ItemTypeBuilder.svelte'
  import audioService from '../services/audio-service.js'
  import getBlobDuration from 'get-blob-duration'

  export let params = {}
  let input = null
  let itemTypeBuilder

  $: _base64 = input?.data?.base64

  $: if (_base64 != null) setDuration()

  function setDuration() {
    // get the duration of the audio.. gotta be a better way to do this, but this works for now
    audioService.parseAudio(_base64).then(au => {
      getBlobDuration(au.blob).then(dur => {
        input.duration = dur
        input.start = input.start < input.duration ? input.start : 0
      })
    })
  }

  const itemTemplate = {
    name: '',
    data: null,
    duration: null,
    start: 0,
  }

  function playRecording() {
    audioService.play(input.data.base64, input.start)
  }

  function getItemGraphic(item) {
    return null
  }

  let isRecording = false

  function startRecording() {
    isRecording = true
    audioService.startRecording().then(data => {
      isRecording = false
      input.data = data
    })
  }

  function stopRecording() {
    audioService.stopRecording()
  }
</script>
