<div class="container">
  <div class="header">
    <div>
      <h1>CSBuilder</h1>
      <div class="px1">
        {#if $user}
          <strong>{$user.username}</strong>
          <a href="/#/" title="Log out" on:click={() => user.logout()}>Log out</a>

          {#if $project}
            <strong>
              {$project.name}
            </strong>
          {/if}

          <a href="/#/" title="Change project" class:active={active == 'projects'}>
            {$project?.name ? 'Change' : 'Select'} project
          </a>
        {/if}
      </div>
    </div>
    <div class="nav">
      {#if $project?.name}
        <a href="/#/project" class:active={active == 'project'}>Project settings</a>
        <a href="/#/art" class:active={active == 'art'}>Art</a>
        <a href="/#/tiles" class:active={active == 'tiles'}>Tiles</a>
        <a href="/#/items" class:active={active == 'items'}>Items</a>
        <a href="/#/characters" class:active={active == 'characters'}>Characters</a>
        <!-- <a href="/#/particles" class:active={active == 'particles'}>Particles</a> -->
        <a href="/#/enemies" class:active={active == 'enemies'}>Enemies</a>
        <a href="/#/abilities" class:active={active == 'abilities'}>Abilities</a>
        <a href="/#/audio" class:active={active == 'audio'}>Audio</a>
        <a href="/#/levels" class:active={active == 'levels'}>Levels</a>
      {/if}
    </div>
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
  import { user, project } from '../stores/project-stores'

  export let active
</script>

<style lang="scss">
  @import '../scss/variables';

  .container {
    display: flex;
    flex-direction: column;
    height: 100%;

    .header {
      border-bottom: 1px solid $grey2;
      display: flex;
      flex-direction: row;
      align-items: center;

      background: linear-gradient(#fff, #ececec);

      h1 {
        font-weight: 400;
        margin: 5px 10px;
        padding: 0;
      }

      .nav {
        display: flex;
        flex-direction: row;
        align-items: center;
        height: 100%;

        a {
          display: block;
          padding: 22px;
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

    :global(.main) {
      flex: 1;
      display: flex;
      flex-direction: row;
      height: calc(100vh - 80px);

      :global(> div) {
        overflow: auto;
        max-height: 100%;
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

      :global(.rows) {
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      :global(form) {
        display: block;
      }

      :global(.columns) {
        display: flex;
        flex-direction: row;
        height: 100%;
      }
    }

    // .footer {
    //   height: 100px;
    //   background: $grey1;
    //   border-top: 1px solid $grey2;
    // }
  }
</style>
