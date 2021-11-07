<div class="container">
  <div class="header">
    <div>
      <h1>
        <a href="/#/">CSBuilder</a>
      </h1>
    </div>
    <div class="px10">
      {#if $project}
        <div class="strong">{$project.name}</div>
      {/if}
      <a href="/#/" title="Change project" class:active={active == 'projects'}>
        {$project?.name ? 'Change' : 'Select'} game
      </a>
    </div>
    <div class="nav">
      {#if $project?.name}
        <a href="/#/play" class:active={active == 'play'}>Play</a>
        {#if $user && $project.owners.includes($user.username)}
          <a href="/#/art" class:active={active == 'art'}>Art</a>
          <a href="/#/tiles" class:active={active == 'tiles'}>Tiles</a>
          <a href="/#/interactables" class:active={active == 'interactables'}>Interactables</a>
          <a href="/#/audio" class:active={active == 'audio'}>Audio</a>
          <a href="/#/abilities" class:active={active == 'abilities'}>Abilities</a>
          <a href="/#/characterclasses" class:active={active == 'characterclasses'}>Character classes</a>
          <!-- <a href="/#/particles" class:active={active == 'particles'}>Particles</a> -->
          <a href="/#/enemies" class:active={active == 'enemies'}>Enemies</a>
          <a href="/#/items" class:active={active == 'items'}>Items</a>
          <a href="/#/levels" class:active={active == 'levels'}>Levels</a>
          <a href="/#/project" class:active={active == 'project'}>Game settings</a>
        {/if}
      {/if}
    </div>
    <div class="text-right px10">
      {#if $user}
        <!-- todo: link to a user settings page to change username/password -->
        <div class="strong">{$user.username}</div>
        <a href="/#/" title="Log out" on:click={() => user.logout()}>Log out</a>
      {:else}
        <a href="/#/login" title="Sign up">Log in or sign up</a>
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
      font-size: 13px;

      background: linear-gradient(#fff, #ececec);

      h1 {
        font-weight: 400;
        margin: 5px 10px;
        padding: 0;
        font-size: 20px;

        a {
          text-decoration: none;
        }
      }

      .nav {
        display: flex;
        flex-direction: row;
        align-items: center;
        height: 100%;
        flex: 1;

        a {
          display: block;
          padding: 13px;
          text-decoration: none;

          &:hover,
          &.active {
            color: #666;
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
