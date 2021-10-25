<!-- ctrl+s to save -->
<svelte:window on:keyup={onKeyUp} />

<AppLayout active={itemType}>
  <div class="col1">
    <ItemListNav slug={itemType} type={singular} collection={$store} active={paramId} let:item>
      <ArtThumb id={getItemGraphic(item)} />
      {item.name}
    </ItemListNav>
  </div>
  {#if input != null}
    <slot {hasChanges} {isAdding} />
  {:else}
    <div class="grow p1">
      <h2>{itemType}</h2>
      <p>{itemTypeDescription}</p>
    </div>
  {/if}
</AppLayout>

<script>
  import { createEventDispatcher } from 'svelte'
  import { project } from '../stores/project-stores'
  import { push } from 'svelte-spa-router'
  import AppLayout from '../components/AppLayout.svelte'
  import ArtThumb from '../components/ArtThumb.svelte'
  import ItemListNav from '../components/ItemListNav.svelte'
  import validator from '../services/validator'
  const dispatch = createEventDispatcher()

  export let id
  export let input
  export let store
  export let itemTemplate
  export let itemType
  export let itemTypeDescription
  export let singular
  export let getItemGraphic

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
    dispatch('create')
  }

  function edit(id) {
    const item = $store.find(c => c.id == id)
    if (item == null) return

    input = {
      ...createDefaultInput(),
      ...JSON.parse(JSON.stringify(item)),
    }

    dispatch('edit')
  }

  export function save() {
    if (validator.empty(input.name)) {
      document.getElementById('name').focus()
      return
    }

    if (isAdding) {
      store.apiInsert(input).then(item => {
        input = item
        push(`/${itemType}/${encodeURIComponent(item.id)}`)
      })
    } else {
      store.apiUpdate(input)
    }
  }

  export function del() {
    if (confirm(`Are you sure you want to delete "${input.name}"?`)) {
      store.apiDelete(input.projectId, input.id)
      push(`/${itemType}/new`)
    }
  }

  // TODO: this isn't preventing the save page dialog popping up - why?
  function onKeyUp(e) {
    if (e.code == 'KeyS' && e.ctrlKey) {
      e.preventDefault()
      e.stopPropagation()
      save()
      return false
    }
  }
</script>
