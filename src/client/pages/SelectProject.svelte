<AppLayout active="projects">
  <div class="grow p20">
    {#if $user}
      <h2>My games</h2>
      {#if myProjects}
        {#each myProjects as p}
          <div class="project-item">
            <a href="#/" on:click|preventDefault={() => setProject(p)}>{p.name}</a>
            <a href="#/" on:click|preventDefault={() => deleteProject(p)} class="delete-project">Delete</a>
          </div>
        {/each}
      {:else}
        <p>You have no projects yet.</p>
      {/if}
    {/if}

    {#if publicProjects}
      <h2>Available games</h2>
      {#each publicProjects as p}
        <div class="project-item">
          <a href="#/" on:click|preventDefault={() => setProject(p)}>{p.name}</a>
        </div>
      {/each}
    {/if}

    {#if $user}
      <h2>New game</h2>
      <Form on:submit={createNewProject}>
        <FieldText name="name" bind:value={input.name}>Name</FieldText>
        <FieldTextarea name="importJson" bind:value={input.importJson}>Import JSON (if you want to copy from an existing game)</FieldTextarea>
        <button type="submit" class="btn btn-primary">Create</button>
      </Form>
    {/if}
  </div>
</AppLayout>

<script>
  import { push } from 'svelte-spa-router'
  import AppLayout from '../components/AppLayout.svelte'
  import FieldText from '../components/FieldText.svelte'
  import FieldTextarea from '../components/FieldTextarea.svelte'
  import Form from '../components/Form.svelte'
  import { user, project, projects } from '../stores/project-stores.js'
  const PROJECT_VERSION = 1

  $: publicProjects = $projects?.filter(p => !p.owners.includes($user?.username))
  $: myProjects = $projects?.filter(p => p.owners.includes($user?.username))

  // refresh projects whenever this page is hit - at least until sockets handle that for us
  projects.refresh()

  function setProject(p) {
    project.loadFromApi(p.id).then(() => push('/play'))
  }

  const input = {
    name: '',
    importJson: '',
  }

  function createNewProject() {
    input.name = input.name.trim()
    if (input.name.length == 0) {
      alert('Please enter a name')
      return
    }

    const json = input.importJson != null ? JSON.parse(input.importJson) : {}
    const p = {
      ...json,
      version: PROJECT_VERSION,
      name: input.name,
      pixelSize: 1,
    }
    projects.apiInsert(p)
  }

  function deleteProject(p) {
    if (prompt(`If you are sure you want to delete this project, type the project name:`, '') !== p.name.trim()) return
    projects.apiDelete(p.id).then(() => {
      if ($project?.id == p.id) $project = {}
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
