<AppLayout active="enemies">
  <div class="col1">
    <ItemListNav slug="enemies" type="enemy" collection={$project.enemies} active={paramId} let:item>
      <ArtThumb id={item.graphics.still} />
      {item.name}
    </ItemListNav>
  </div>
  <div class="grow p1">Form fields</div>
  <div class="col2">Preview maybe?</div>
</AppLayout>

<script>
  import AppLayout from '../components/AppLayout.svelte'
  import ArtThumb from '../components/ArtThumb.svelte'
  import ItemListNav from '../components/ItemListNav.svelte'
  import project from '../stores/active-project-store'

  export let params = {}
  $: paramId = decodeURIComponent(params.id) || 'new'
</script>
