<AppLayout active="items">
  <div class="col1">
    <ItemListNav slug="items" type="item" collection={$project.items} active={paramId} let:item>
      <ArtThumb id={item.graphics.still} />
      {item.name}
    </ItemListNav>
  </div>
  <div class="grow p1">
    <Form on:submit={save} {hasChanges}>
      <FieldText name="name" bind:value={input.name} placeholder="Type a name...">Name</FieldText>
      <FieldArtPicker bind:value={input.graphics.still}>Still graphics</FieldArtPicker>

      <FieldScriptEditor bind:value={input.onCollision}>onCollision(item, sprite)</FieldScriptEditor>
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
  import project from '../stores/active-project-store'
  import validator from '../services/validator'
  import { push } from 'svelte-spa-router'
  import { getNextId } from '../stores/project-store'
  import FieldScriptEditor from '../components/FieldScriptEditor.svelte'

  export let params = {}
  let input = createDefaultInput()

  $: paramId = decodeURIComponent(params.id) || 'new'
  $: paramId == 'new' ? create() : edit(paramId)
  $: isAdding = input.id == null
  $: hasChanges = input != null && !validator.equals(input, $project.items[input.id])

  function createDefaultInput() {
    return {
      name: '',
      graphics: {
        still: null,
      },
      onCollision: null,
    }
  }

  function create() {
    input = createDefaultInput()
  }

  function edit(name) {
    if (!$project.items.hasOwnProperty(name)) return
    input = {
      ...createDefaultInput(),
      ...JSON.parse(JSON.stringify($project.items[name])),
    }
  }

  function save() {
    if (validator.empty(input.name)) {
      document.getElementById('name').focus()
      return
    }
    if (isAdding) input.id = getNextId($project.items)
    $project.items[input.id] = JSON.parse(JSON.stringify(input))
    push(`/items/${encodeURIComponent(input.id)}`)
  }

  function del() {
    if (confirm(`Are you sure you want to delete "${input.name}"?`)) {
      delete $project.items[input.id]
      $project.items = $project.items
      push(`/items/new`)
    }
  }
</script>
