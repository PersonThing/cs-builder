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
  import ItemBuilder from './pages/ItemBuilder.svelte'
  import CharacterBuilder from './pages/CharacterBuilder.svelte'
  import EnemyBuilder from './pages/EnemyBuilder.svelte'
  import LevelBuilder from './pages/LevelBuilder.svelte'
  import NotFound from './pages/NotFound.svelte'
  import SelectProject from './pages/SelectProject.svelte'
  import ProjectSettings from './pages/ProjectSettings.svelte'

  import { project } from './stores/project-stores'

  const routes = {
    '/': SelectProject,
    '/project': ProjectSettings,
    '/art/:id?': ArtBuilder,
    '/particles/:id?': ParticleBuilder,
    '/blocks/:id?': BlockBuilder,
    '/items/:id?': ItemBuilder,
    '/characters/:id?': CharacterBuilder,
    '/enemies/:id?': EnemyBuilder,
    '/levels/:id?': LevelBuilder,
    '*': NotFound,
  }
</script>

<style lang="scss" global>
  @import './scss/variables';

  @font-face {
    font-family: 'SilkScreen';
    src: url('/SilkScreen.ttf') format('truetype');
    font-weight: normal;
  }

  @font-face {
    font-family: 'SilkScreen';
    src: url('/SilkScreenBold.ttf') format('truetype');
    font-weight: bold;
  }

  @font-face {
    font-family: 'pixelsc';
    src: url('/pixelsc.ttf') format('truetype');
  }

  @font-face {
    font-family: 'pixels';
    src: url('/pixels.ttf') format('truetype');
  }

  html,
  body {
    position: relative;
    width: 100%;
    height: 100%;
  }

  h1 {
    font-family: 'pixelsc';
  }

  body {
    color: #333;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: monospace; //'pixels', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
    // letter-spacing: -0.15em;

    textarea,
    input,
    pre {
      // font-family: monospace;
      // letter-spacing: -0.05rem;
    }
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

  .px1 {
    padding-left: 10px;
    padding-right: 10px;
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
    font-weight: bold; //500;
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

  .btn-danger {
    background-color: $danger;
  }

  .btn-group {
    display: flex;
    flex-direction: row;
    gap: 3px;
    margin-bottom: 10px;

    .btn {
      margin: 0;
    }
  }

  .flex {
    display: flex;
    flex-direction: row;
  }

  .flex-row {
    display: flex;
    flex-direction: row;
  }

  .flex-column {
    display: flex;
    flex-direction: column;
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

  .absolute {
    position: absolute;
  }
  .relative {
    position: relative;
  }
  .top {
    top: 0;
  }
  .left {
    left: 0;
  }
  .bottom {
    bottom: 0;
  }
  .right {
    right: 0;
  }
</style>
