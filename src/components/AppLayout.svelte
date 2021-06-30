<div class="container">
  <div class="header">
    <h1>CSBuilder</h1>

    {#if $project}
      <div class="nav">
        <a href="/#/projects" class="strong" title="Change project" class:active={active == 'projects'}>{$project.name}</a>
        <a href="/#/project" class:active={active == 'project'}>Project settings</a>
        <a href="/#/art" class:active={active == 'art'}>Art</a>
        <a href="/#/particles" class:active={active == 'particles'}>Particles</a>
        <a href="/#/blocks" class:active={active == 'blocks'}>Blocks</a>
        <a href="/#/characters" class:active={active == 'characters'}>Characters</a>
        <a href="/#/enemies" class:active={active == 'enemies'}>Enemies</a>
        <a href="/#/levels" class:active={active == 'levels'}>Levels</a>
      </div>
    {/if}
  </div>

  <div class="main">
    <slot />
  </div>

  <!--
    no need for a footer anywhere yet...
    <div class="footer" />
  -->
</div>

<script>
  import project from '../stores/active-project-store'

  export let active
</script>

<style lang="scss">
  @import '../scss/variables';

  .container {
    display: flex;
    flex-direction: column;
    height: 100%;

    .header {
      height: 60px;
      border-bottom: 1px solid $grey2;
      display: flex;
      flex-direction: row;
      align-items: center;

      background: linear-gradient(#fff, #ececec);

      h1 {
        font-weight: 400;
        margin: 0 10px;
        padding: 0;
      }

      .nav {
        display: flex;
        flex-direction: row;
        align-items: center;
        height: 100%;

        a {
          display: block;
          height: 100%;
          line-height: 60px;
          padding: 0 20px;
          text-decoration: none;

          color: #666;

          &:hover {
            color: rgb(16, 147, 253);
          }

          &.active {
            background: $grey2;
          }
        }
      }
    }

    .main {
      flex: 1;
      display: flex;
      flex-direction: row;
      height: calc(100vh - 80px);

      :global(> div) {
        overflow: auto;
        height: 100%;
      }

      :global(.col1),
      :global(.col2),
      :global(.grow) {
        border-right: 1px solid $grey2;
      }

      :global(.col1) {
        width: 200px;
        background: $grey1;
        z-index: 100;
        position: relative;
      }

      :global(.col2) {
        width: 325px;
        background: $grey1;
        z-index: 100;
        position: relative;
      }

      :global(.grow) {
        flex: 1;
        z-index: 0;
        position: relative;
      }
    }

    .footer {
      height: 100px;
      background: $grey1;
      border-top: 1px solid $grey2;
    }
  }
</style>
