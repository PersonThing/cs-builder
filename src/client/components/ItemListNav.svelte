<div class="item-list-nav">
  <a href="#/{slug}/new" class:active={active == 'new'}>
    + New {type}
  </a>
  {#each collection as item (item.id)}
    <a href="#/{slug}/{item.id}" class:active={item.id == active}>
      <slot {item}>{item.name}</slot>
    </a>
  {/each}
</div>

<script>
  export let collection
  export let slug
  export let type
  export let active
</script>

<style lang="scss">
  @import '../scss/variables';

  .item-list-nav {
    display: flex;
    flex-direction: column;
    width: 100%;
    overflow: hidden;

    a {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 5px;
      padding: 3px;
      min-height: 40px;

      &.active {
        background: $grey2;
      }
    }
  }
</style>
