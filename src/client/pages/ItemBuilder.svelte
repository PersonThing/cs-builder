<AppLayout active="items">
  <div class="col1">
    <ItemListNav slug="items" type="item" collection={$items} active={paramId} let:item>
      <ArtThumb id={item.graphics.still} />
      {item.name}
    </ItemListNav>
  </div>
  {#if input}
    <div class="grow p1">
      <Form on:submit={save} {hasChanges}>
        <FieldText name="name" bind:value={input.name} placeholder="Type a name...">Name</FieldText>
        <FieldArtPicker bind:value={input.graphics.still}>Still graphics</FieldArtPicker>

        <FieldScriptEditor bind:value={input.onCollision}>onCollision(item, sprite)</FieldScriptEditor>
        <FieldCheckbox bind:checked={input.removeOnCollision} name="remove-on-collision">Remove on collision</FieldCheckbox>
        <FieldCheckbox bind:checked={input.playersCanUse} name="players-can-use">Players can use</FieldCheckbox>
        <FieldCheckbox bind:checked={input.enemiesCanUse} name="enemies-can-use">Enemies can use</FieldCheckbox>
        <span slot="buttons">
          {#if !isAdding}
            <button type="button" class="btn btn-danger" on:click={del}>Delete</button>
          {/if}
        </span>
      </Form>
    </div>
    <div class="col2">Preview maybe?</div>
  {/if}
</AppLayout>

<script>
  import AppLayout from '../components/AppLayout.svelte'
  import ArtThumb from '../components/ArtThumb.svelte'
  import FieldArtPicker from '../components/FieldArtPicker.svelte'
  import FieldText from '../components/FieldText.svelte'
  import Form from '../components/Form.svelte'
  import ItemListNav from '../components/ItemListNav.svelte'
  import { project, items } from '../stores/project-stores.js'
  import validator from '../services/validator'
  import { push } from 'svelte-spa-router'
  import FieldScriptEditor from '../components/FieldScriptEditor.svelte'
  import FieldCheckbox from '../components/FieldCheckbox.svelte'

  export let params = {}
  let input = null

  $: paramId = decodeURIComponent(params.id) || 'new'
  $: if (paramId == 'new' || $items != null) {
    paramId == 'new' ? create() : edit(paramId)
  }
  $: isAdding = input?.id == null
  $: hasChanges =
    input != null &&
    !validator.equals(
      input,
      $items.find(i => i.id == input.id)
    )

  function createDefaultInput() {
    return {
      projectId: $project.id,
      name: '',
      graphics: {
        still: null,
      },
      onCollision: null,
      removeOnCollision: true,
      playersCanUse: true,
      enemiesCanUse: false,
    }
  }

  function create() {
    input = createDefaultInput()
  }

  function edit(id) {
    const item = $items.find(i => i.id == id)
    if (item == null) return
    input = {
      ...createDefaultInput(),
      ...JSON.parse(JSON.stringify(item)),
    }
  }

  function save() {
    if (validator.empty(input.name)) {
      document.getElementById('name').focus()
      return
    }

    ;(isAdding
      ? items.apiInsert(input).then(item => {
          input = item
        })
      : items.apiUpdate(input)
    ).then(() => {
      push(`/items/${encodeURIComponent(input.id)}`)
    })
  }

  function del() {
    if (confirm(`Are you sure you want to delete "${input.name}"?`)) {
      items.apiDelete(input.projectId, input.id)
      push(`/items/new`)
    }
  }
</script>
