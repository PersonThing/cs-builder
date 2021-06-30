<AppLayout active="particles">
  <div class="col1">
    <ItemListNav slug="particles" type="particles" collection={$project.particles} active={paramId} let:item>
      <ArtThumb id={item.graphic} />
      {item.name}
    </ItemListNav>
  </div>
  <div class="grow">Form fields</div>
  <div class="col2">Preview effect</div>
</AppLayout>

<script>
  import AppLayout from '../components/AppLayout.svelte'
  import ArtThumb from '../components/ArtThumb.svelte'
  import ItemListNav from '../components/ItemListNav.svelte'
  import project from '../stores/active-project-store'

  export let params = {}
  $: paramId = decodeURIComponent(params.id) || 'new'
</script>
