<AppLayout active="enemies">
  <div class="col1">
    <ItemListNav slug="enemies" type="enemy" collection={$enemies} active={paramId} let:item>
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
  import { project, enemies } from '../stores/project-stores'
  import validator from '../services/validator'
  import { push } from 'svelte-spa-router'

  export let params = {}
  let input = createDefaultInput()

  $: paramId = decodeURIComponent(params.id) || 'new'
  $: if (paramId == 'new' || paramId == null || $enemies != null) {
    paramId == 'new' || paramId == null ? create() : edit(paramId)
  }
  $: isAdding = input.id == null
  $: hasChanges =
    input != null &&
    !validator.equals(
      input,
      $enemies.find(e => e.id == input.id)
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
    const enemy = $enemies.find(e => e.id == id)
    if (enemy == null) return
    input = {
      ...createDefaultInput(),
      ...JSON.parse(JSON.stringify(enemy)),
    }
  }

  function save() {
    if (validator.empty(input.name)) {
      document.getElementById('name').focus()
      return
    }
    ;(isAdding
      ? enemies.apiInsert(input).then(item => {
          input = item
        })
      : enemies.apiUpdate(input)
    ).then(() => {
      push(`/enemies/${encodeURIComponent(input.id)}`)
    })
  }

  function del() {
    if (confirm(`Are you sure you want to delete "${input.name}"?`)) {
      enemies.apiDelete(input.projectId, input.id)
      push(`/enemies/new`)
    }
  }
</script>
