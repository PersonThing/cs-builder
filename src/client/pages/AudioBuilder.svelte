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
          <div class="flex-row flex-align-center">
            {#if !isRecording}
              <button class="btn btn-warning" type="button" on:click={startRecording}>{input.data ? 'Redo recording' : 'Start recording'}</button>
            {:else}
              <button class="btn btn-warning" type="button" on:click={stopRecording}>Stop recording</button>
            {/if}

            {#if input.data}
              <button class="btn btn-success" type="button" on:click={playRecording}>Play</button>
              <!-- <audio> tag works too, but doesn't let you quickly play / preview like play button does ^
              might be nice for recording dialog / longer stuff though
              <audio src={computedAudioUrl} controls /> -->
            {/if}
          </div>
        </div>
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

  export let params = {}
  let input = null
  let itemTypeBuilder

  const itemTemplate = {
    name: '',
    data: null,
  }

  function playRecording() {
    audioService.play(input.data.base64)
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
