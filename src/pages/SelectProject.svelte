<AppLayout active="projects">
  <div class="grow p2">
    {#each $projects as p}
      <div class="project-item">
        <a href="#/" on:click|preventDefault={() => setProject(p)}>{p.name}</a>
        <a href="#/" on:click|preventDefault={() => deleteProject(p)} class="delete-project">Delete</a>
      </div>
    {/each}
    <div class="project-item">
      <a href="#/" on:click|preventDefault={createNewProject}>+ New project</a>
    </div>
  </div>
</AppLayout>

<script>
  import { push } from 'svelte-spa-router'
  import AppLayout from '../components/AppLayout.svelte'
  import project from '../stores/active-project-store'
  import projects, { PROJECT_VERSION } from '../stores/project-store'

  function setProject(p) {
    $project = p
    push('/project')
  }

  function createNewProject() {
    const name = prompt('Project name?', '')
    if (name?.trim().length > 0) {
      const p = {
        version: PROJECT_VERSION,
        name,
        art: {},
        blocks: {},
        characters: {},
        levels: {},
        items: {},
        particles: {},
        projectiles: {},
        enemies: {},
      }
      $projects = [...$projects, p]
      setProject(p)
    }
  }

  function deleteProject(p) {
    let name = p.name
    if (prompt(`If you are sure you want to delete this project, type the project name:?`, '') !== name) return
    $projects = $projects.filter(p => p.name != name)
  }
</script>

<style lang="scss">
  .project-item {
    padding: 10px;

    a {
      display: block;
      padding: 5px;
    }

    a:first-child {
      flex: 1;
    }

    a.delete-project {
      color: red;
      font-size: 10px;
      display: inline;
    }
  }
</style>
