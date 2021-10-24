<AppLayout active={itemType}>
  <div class="col1">
    <ItemListNav slug={itemType} type={itemType} collection={$store} active={paramId} let:item>
      <ArtThumb id={getItemGraphic(item)} />
      {item.name}
    </ItemListNav>
  </div>
  {#if input != null}
    <Form on:submit={save} {hasChanges}>
      <slot {hasChanges} {isAdding} />
      {#if showButtons}
        <div class="px1">
          <FormButtons {hasChanges} canDelete={!isAdding} on:delete={del} />
        </div>
      {/if}
    </Form>
  {/if}
</AppLayout>

<script>
  import { project } from '../stores/project-stores'
  import { push } from 'svelte-spa-router'
  import { tick } from 'svelte'
  import AppLayout from '../components/AppLayout.svelte'
  import ArtThumb from '../components/ArtThumb.svelte'
  import Form from '../components/Form.svelte'
  import ItemListNav from '../components/ItemListNav.svelte'
  import validator from '../services/validator'
  import FormButtons from './FormButtons.svelte'

  export let id
  export let input
  export let store
  export let itemTemplate
  export let itemType
  export let getItemGraphic
  export let showButtons = true

  $: paramId = decodeURIComponent(id) || 'new'
  $: if ($project?.id != null && (paramId == 'new' || $store != null)) {
    paramId == 'new' ? create() : edit(paramId)
  }
  $: isAdding = input?.id == null
  $: hasChanges =
    input != null &&
    !validator.equals(
      input,
      $store.find(c => c.id == input.id)
    )

  function createDefaultInput() {
    const item = JSON.parse(JSON.stringify(itemTemplate))
    item.name = ''
    item.projectId = $project.id
    return item
  }

  function create() {
    input = createDefaultInput()
  }

  async function edit(id) {
    const item = $store.find(c => c.id == id)
    if (item == null) return

    input = null
    await tick()
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

    const promise = isAdding
      ? store.apiInsert(input).then(item => {
          input = item
        })
      : store.apiUpdate(input)

    promise.then(() => push(`/${itemType}/${encodeURIComponent(input.id)}`))
  }

  export function del() {
    if (confirm(`Are you sure you want to delete "${input.name}"?`)) {
      store.apiDelete(input.projectId, input.id)
      push(`/${itemType}/new`)
    }
  }
</script>
