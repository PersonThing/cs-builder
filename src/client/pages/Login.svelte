<AppLayout active="projects">
  <div class="grow p2">
    <h2>Login</h2>
    <Form on:submit={submit}>
      <FieldText name="username" bind:value={username}>Username</FieldText>
      <div class="form-group">
        <label>Password</label>
        <input type="password" class="form-control" bind:value={password} />
      </div>

      <button type="submit" class="btn btn-primary" class:disabled={loading} disabled={loading}>Login</button>
      {#if failedLogin}
        Invalid username or password
      {/if}
    </Form>
  </div>
</AppLayout>

<script>
  import AppLayout from '../components/AppLayout.svelte'
  import FieldText from '../components/FieldText.svelte'
  import Form from '../components/Form.svelte'
  import { user } from '../stores/project-stores.js'

  let username = ''
  let password = ''

  let loading = false
  let failedLogin = false

  function submit() {
    if (username == null || username.length == 0 || password == null || password.length == 0) {
      return
    }
    loading = true
    failedLogin = false
    user
      .login(username, password)
      .catch(() => {
        loading = false
        failedLogin = true
      })
      .then(() => {
        loading = false
        failedLogin = false
      })
  }
</script>
