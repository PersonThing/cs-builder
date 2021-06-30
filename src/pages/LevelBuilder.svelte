<AppLayout active="levels">
  <div class="col1">
    <ItemListNav slug="levels" type="level" collection={$project.levels} active={paramId} let:item>
      <div class="level-nav-item" style="background-image:url({item.thumbnail})">
        {item.name}
      </div>
    </ItemListNav>
  </div>
  <div class="col1">Name, background, other settings</div>
  <div class="grow">Editable level</div>
  <div class="col2">Properties of selected item, if any</div>
</AppLayout>

<script>
  import AppLayout from '../components/AppLayout.svelte'
  import ItemListNav from '../components/ItemListNav.svelte'
  import project from '../stores/active-project-store'

  export let params = {}
  $: paramId = decodeURIComponent(params.id) || 'new'
</script>

<style lang="scss">
  .level-nav-item {
    height: 60px;
    width: 100%;
    background-size: contain;
    background-position: 10px 20px;
    background-repeat: no-repeat;
  }
</style>
