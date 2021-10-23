<AppLayout active="items">
  <div class="col1">
    <ItemListNav slug="items" type="item" collection={$items} active={paramId} let:item>
      <ArtThumb id={item.graphics.still} />
      {item.name}
    </ItemListNav>
  </div>
  <div class="grow p1">
    <Form on:submit={save} {hasChanges}>
      <FieldText name="name" bind:value={input.name} placeholder="Type a name...">Name</FieldText>
      <FieldArtPicker bind:value={input.graphics.still}>Still graphics</FieldArtPicker>

      <FieldScriptEditor bind:value={input.onCollision}>onCollision(item, sprite)</FieldScriptEditor>
      <FieldCheckbox bind:checked={input.removeOnCollision}>Remove on collision</FieldCheckbox>
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
  import Form from '../components/Form.svelte'
  import ItemListNav from '../components/ItemListNav.svelte'
  import { project, items } from '../stores/project-stores.js'
  import validator from '../services/validator'
  import { push } from 'svelte-spa-router'
  import FieldScriptEditor from '../components/FieldScriptEditor.svelte'
  import FieldCheckbox from '../components/FieldCheckbox.svelte'

  export let params = {}
  let input = createDefaultInput()

  $: paramId = decodeURIComponent(params.id) || 'new'
  $: if (paramId == 'new' || paramId == null || $items != null) {
    paramId == 'new' || paramId == null ? create() : edit(paramId)
  }
  $: isAdding = input.id == null
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
    if (isAdding) {
      items.insert(input).then(item => {
        input = item
      })
    } else {
      items.update(input)
    }
    push(`/items/${encodeURIComponent(input.id)}`)
  }

  function del() {
    if (confirm(`Are you sure you want to delete "${input.name}"?`)) {
      items.delete(input.projectId, input.id)
      push(`/items/new`)
    }
  }
</script>
