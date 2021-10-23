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
  import { project, projects } from '../stores/project-stores.js'
  const PROJECT_VERSION = 1

  // refresh projects whenever this page is hit - at least until sockets handle that for us
  projects.refresh()

  function setProject(p) {
    project.loadFromApi(p.id).then(() => push('/project'))
  }

  function createNewProject() {
    const name = prompt('Project name?', '')
    if (name?.trim().length > 0) {
      const p = {
        version: PROJECT_VERSION,
        name,
        pixelSize: 1,
      }
      projects.insert(p)
    }
  }

  function deleteProject(p) {
    if (prompt(`If you are sure you want to delete this project, type the project name:`, '') !== p.name.trim()) return
    projects.apiDelete(p.id).then(() => {
      if ($project.id == p.id) $project = {}
    })
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
