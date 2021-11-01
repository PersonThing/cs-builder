<AppLayout active="projects">
  <div class="grow p20">
    <div class="flex-row">
      <div class="flex-grow" />
      <div class="text-center mr10">
        <h2>Log in</h2>
        <Form on:submit={login}>
          <FieldText name="username" bind:value={loginInput.username}>Username</FieldText>
          <FieldPassword name="password" bind:value={loginInput.password}>Password</FieldPassword>
          <button type="submit" class="btn btn-primary" class:disabled={loading} disabled={loading}>Log in</button>
        </Form>
      </div>
      <div class="text-center ml10">
        <h2>Or sign up</h2>
        <Form on:submit={signup}>
          <FieldText name="username" bind:value={signupInput.username}>Username</FieldText>
          <FieldPassword name="password" bind:value={signupInput.password}>Password</FieldPassword>
          <FieldPassword name="password" bind:value={signupInput.confirmPassword}>Confirm password</FieldPassword>
          <button type="submit" class="btn btn-primary" class:disabled={loading} disabled={loading}>Sign up</button>
        </Form>
      </div>
      <div class="flex-grow" />
    </div>

    {#if validationMessage}
      <div class="text-danger text-center">{validationMessage}</div>
    {/if}
  </div>
</AppLayout>

<script>
  import { push } from 'svelte-spa-router'
  import { user } from '../stores/project-stores.js'
  import AppLayout from '../components/AppLayout.svelte'
  import FieldPassword from '../components/FieldPassword.svelte'
  import FieldText from '../components/FieldText.svelte'
  import Form from '../components/Form.svelte'

  let loginInput = {
    username: '',
    password: '',
    confirmPassword: '',
  }
  let signupInput = {
    username: '',
    password: '',
    confirmPassword: '',
  }

  let loading = false
  let validationMessage = false

  function login() {
    const { username, password } = loginInput
    if (username?.length == 0 || password?.length == 0) {
      validationMessage = 'Please enter a valid username and password'
      return
    }
    loading = true
    validationMessage = null
    user
      .login(username, password)
      .then(() => {
        loading = false
        validationMessage = null
        push('/')
      })
      .catch(res => {
        loading = false
        validationMessage = res.message
      })
  }

  function signup() {
    const { username, password, confirmPassword } = signupInput
    if (username?.length < 3 || password?.length < 6) {
      validationMessage = 'Please enter username at least 3 characters long and a password at least 6 characters long'
      return
    }
    if (password != confirmPassword) {
      validationMessage = 'Passwords do not match'
      return
    }
    loading = true
    validationMessage = null
    user
      .signup(username, password, confirmPassword)
      .then(() => {
        loading = false
        validationMessage = null
        push('/')
      })
      .catch(res => {
        loading = false
        validationMessage = res.message
      })
  }
</script>
