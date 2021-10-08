{#if $project == null}
  <SelectProject />
{:else}
  <Router {routes} />
{/if}

<svelte:head>
  <title>{$project != null ? $project.name : 'CSBuilder'}</title>
</svelte:head>

<script>
  import Router from 'svelte-spa-router'
  import ArtBuilder from './pages/ArtBuilder.svelte'
  import ParticleBuilder from './pages/ParticleBuilder.svelte'
  import BlockBuilder from './pages/BlockBuilder.svelte'
  import CharacterBuilder from './pages/CharacterBuilder.svelte'
  import EnemyBuilder from './pages/EnemyBuilder.svelte'
  import LevelBuilder from './pages/LevelBuilder.svelte'
  import NotFound from './pages/NotFound.svelte'
  import SelectProject from './pages/SelectProject.svelte'
  import ProjectSettings from './pages/ProjectSettings.svelte'

  import project from './stores/active-project-store'

  const routes = {
    '/projects': SelectProject,
    '/project': ProjectSettings,
    '/art/:id?': ArtBuilder,
    '/particles/:id?': ParticleBuilder,
    '/blocks/:id?': BlockBuilder,
    '/characters/:id?': CharacterBuilder,
    '/enemies/:id?': EnemyBuilder,
    '/levels/:id?': LevelBuilder,
    '*': NotFound,
  }
</script>

<style lang="scss" global>
  @import './scss/variables';

  html,
  body {
    position: relative;
    width: 100%;
    height: 100%;
  }

  body {
    color: #333;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    // font-family: Wingdings;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
  }

  a {
    color: rgb(0, 100, 200);
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  a:visited {
    color: rgb(0, 80, 160);
  }

  label {
    display: block;
  }

  input,
  button,
  select,
  textarea {
    font-family: inherit;
    font-size: inherit;
    -webkit-padding: 0.4em 0;
    padding: 0.4em;
    margin: 0;
    box-sizing: border-box;
    border: 1px solid #ccc;
    border-radius: 2px;
  }

  input:disabled {
    color: #ccc;
  }

  button {
    color: #333;
    background-color: #f4f4f4;
    outline: none;
  }

  button:disabled {
    color: #999;
  }

  button:not(:disabled):active {
    background-color: #ddd;
  }

  button:focus {
    border-color: #666;
  }

  .p1 {
    padding: 10px;
  }

  .p2 {
    padding: 20px;
  }

  .p3 {
    padding: 30px;
  }

  .g05 {
    gap: 5px;
  }

  .g1 {
    gap: 10px;
  }

  .g2 {
    gap: 20px;
  }

  .g3 {
    gap: 30px;
  }

  .strong {
    font-weight: bold;
  }

  .art-thumb {
    width: 40px;
    height: 40px;
    overflow: hidden;
    text-align: center;
    position: relative;
    background-position: center center;
    background-repeat: no-repeat;
    background-color: #ccc;
    border-radius: 5px;
    position: relative;

    .animation-preview {
      position: relative;
      top: 50%;
      left: 50%;
      transform: translateY(-50%) translateX(-50%);
    }
  }

  .form-group {
    margin-bottom: 15px;
  }

  .form-check,
  .form-radio {
    display: flex;
    flex-direction: row;
    gap: 5px;
    align-items: center;
    margin: 5px;
  }

  .form-group label {
    font-weight: 500;
  }

  .help-text {
    font-weight: normal;
    font-size: 12px;
  }

  .field-group {
    padding: 15px;
    background: #ededed;
  }

  .btn {
    cursor: pointer;
    display: inline-flex;
    flex-direction: row;
    gap: 3px;
    align-items: center;
    white-space: nowrap;
  }

  .btn-success {
    background-color: $success;
  }

  .btn-primary {
    background-color: $primary;
  }

  .btn-group {
    display: flex;
    flex-direction: row;

    .btn {
      margin: 0;
    }
  }

  .flex {
    display: flex;
    flex-direction: row;
  }

  .grow {
    flex: 1;
  }

  .wrap {
    flex-wrap: wrap;
  }

  .text-left {
    text-align: left;
  }

  .text-right {
    text-align: right;
  }
</style>
