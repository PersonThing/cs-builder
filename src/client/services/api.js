import projectItemTypes from '../../server/project-item-types'

function status(response) {
  return new Promise((resolve, reject) => {
    if (response.status >= 200 && response.status < 300) {
      resolve(response)
    } else {
      json(response).then(res => reject(res))
    }
  })
}

function json(response) {
  return response.json()
}

function _fetch(url, options = {}) {
  options.headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  // if ($user?.token) {
  //   options.headers.Authorization = `Bearer ${$user.token}`
  // }
  if (options.body != null) options.body = JSON.stringify(options.body)
  return fetch(url, options).then(status).then(json)
  // .catch(res => {
  //   res.json().then(json => {
  //     if (json?.message) alert(json.message)
  //   })
  // })
}

function stripProjectOfItems(project) {
  const body = JSON.parse(JSON.stringify(project))
  projectItemTypes.forEach(it => {
    if (body.hasOwnProperty(it)) delete body[it]
  })
  return body
}

const Api = {
  users: {
    login(username, password) {
      return _fetch('/api/login', {
        method: 'POST',
        body: {
          username,
          password,
        },
      })
    },

    signup(username, password, confirmPassword) {
      return _fetch('/api/signup', {
        method: 'POST',
        body: {
          username,
          password,
          confirmPassword,
        },
      })
    },

    logout() {
      return _fetch('/api/logout')
    },
  },

  // return list of all projects on server
  // add search param here when list gets big
  // add ability to only show my projects vs other people's
  projects: {
    find() {
      console.log('api.projects.find')
      return _fetch('/api/projects')
    },

    get(id) {
      console.log('api.projects.get')
      return _fetch(`/api/projects/${id}`)
    },

    insert(project) {
      console.log('api.projects.insert')
      return _fetch(`/api/projects`, {
        method: 'POST',
        body: stripProjectOfItems(project),
      })
    },

    update(project) {
      console.log('api.projects.update')
      return _fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        body: stripProjectOfItems(project),
      })
    },

    delete(id) {
      console.log('api.projects.delete')
      return _fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      })
    },
  },

  characters: {
    find(projectId) {
      console.log('api.characters.find')
      return _fetch(`/api/characters/${projectId}`)
    },

    insert(item) {
      console.log('api.characters.insert')
      return _fetch(`/api/characters`, {
        method: 'POST',
        body: item,
      })
    },

    update(item) {
      console.log('api.characters.update')
      return _fetch(`/api/characters/${item.id}`, {
        method: 'PUT',
        body: item,
      })
    },

    delete(id) {
      console.log('api.characters.delete')
      return _fetch(`/api/characters/${id}`, {
        method: 'DELETE',
      })
    },
  },
}

projectItemTypes.forEach(c => {
  Api[c] = {
    find: projectId => {
      console.log(`api.${c}.find`)
      return _fetch(`/api/projects/${projectId}/${c}`)
    },
    get: (projectId, id) => {
      console.log(`api.${c}.get`)
      return _fetch(`/api/projects/${projectId}/${c}/${id}`)
    },
    insert: item => {
      console.log(`api.${c}.insert`)
      return _fetch(`/api/projects/${item.projectId}/${c}`, {
        method: 'POST',
        body: item,
      })
    },
    update: item => {
      console.log(`api.${c}.update`)
      return _fetch(`/api/projects/${item.projectId}/${c}/${item.id}`, {
        method: 'PUT',
        body: item,
      })
    },
    delete: (projectId, id) => {
      console.log(`api.${c}.delete`)
      return _fetch(`/api/projects/${projectId}/${c}/${id}`, {
        method: 'DELETE',
      })
    },
  }
})

export default Api
