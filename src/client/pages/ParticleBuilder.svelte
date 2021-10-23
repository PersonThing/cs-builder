<AppLayout active="particles">
  <div class="col1">
    <ItemListNav slug="particles" type="particles" collection={$particles} active={paramId} let:item>
      <ArtThumb id={item.graphic} />
      {item.name}
    </ItemListNav>
  </div>
  <div class="grow p1">Form fields</div>
  <div class="col2">Preview effect</div>
</AppLayout>

<script>
  import AppLayout from '../components/AppLayout.svelte'
  import ArtThumb from '../components/ArtThumb.svelte'
  import ItemListNav from '../components/ItemListNav.svelte'
  import { project, particles } from '../stores/project-stores'

  export let params = {}
  $: paramId = decodeURIComponent(params.id) || 'new'
</script>
