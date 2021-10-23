<AppLayout active="characters">
  <div class="col1">
    <ItemListNav slug="characters" type="character" collection={$characters} active={paramId} let:item>
      <ArtThumb id={item.graphics.still} />
      {item.name}
    </ItemListNav>
  </div>
  <div class="grow p1">
    <Form on:submit={save} {hasChanges}>
      <FieldText name="name" bind:value={input.name} placeholder="Type a name...">Name</FieldText>
      <FieldNumber name="speed" bind:value={input.speed} placeholder="Speed (pixels per frame)">Speed (pixels per frame)</FieldNumber>
      <FieldArtPicker bind:value={input.graphics.still}>Still graphics</FieldArtPicker>
      <FieldArtPicker bind:value={input.graphics.moving}>Moving graphics</FieldArtPicker>

      <span slot="buttons">
        {#if !isAdding}
          <button type="button" class="btn btn-danger" on:click={del}>Delete</button>
        {/if}
      </span>
    </Form>
  </div>
  <div class="col2">Preview maybe?</div>
</AppLayout>

<script>
  import AppLayout from '../components/AppLayout.svelte'
  import ArtThumb from '../components/ArtThumb.svelte'
  import FieldArtPicker from '../components/FieldArtPicker.svelte'
  import FieldText from '../components/FieldText.svelte'
  import FieldNumber from '../components/FieldNumber.svelte'
  import Form from '../components/Form.svelte'
  import ItemListNav from '../components/ItemListNav.svelte'
  import { project, characters } from '../stores/project-stores'
  import validator from '../services/validator'
  import { push } from 'svelte-spa-router'

  export let params = {}
  let input = createDefaultInput()

  $: paramId = decodeURIComponent(params.id) || 'new'
  $: if (paramId == 'new' || paramId == null || $characters != null) {
    paramId == 'new' || paramId == null ? create() : edit(paramId)
  }
  $: isAdding = input.id == null
  $: hasChanges =
    input != null &&
    !validator.equals(
      input,
      $characters.find(c => c.id == input.id)
    )

  function createDefaultInput() {
    return {
      projectId: $project.id,
      name: '',
      graphics: {
        still: null,
        moving: null,
      },
      abilities: [],
    }
  }

  function create() {
    input = createDefaultInput()
  }

  function edit(id) {
    const character = $characters.find(c => c.id == id)
    if (character == null) return
    input = {
      ...createDefaultInput(),
      ...JSON.parse(JSON.stringify(character)),
    }
  }

  function save() {
    if (validator.empty(input.name)) {
      document.getElementById('name').focus()
      return
    }

    ;(isAdding
      ? characters.apiInsert(input).then(item => {
          input = item
        })
      : characters.apiUpdate(input)
    ).then(() => {
      push(`/characters/${encodeURIComponent(input.id)}`)
    })
  }

  function del() {
    if (confirm(`Are you sure you want to delete "${input.name}"?`)) {
      characters.apiDelete(input.projectId, input.id)
      push(`/characters/new`)
    }
  }
</script>
