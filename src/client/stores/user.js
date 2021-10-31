import api from '../services/api.js'
import io from 'socket.io-client'
import { writable } from 'svelte/store'

const { subscribe, set, update } = writable(null)

export default {
  subscribe,
  tryLogin(username, password) {
    api.login(username, password).then(user => {
      set(user)
      api.setToken(user.token)
      const socket = io('http://localhost:3000')
      socket.on('connect', () => {
        socket.emit('authenticate', { token: user.token })
      })
      socket.on('authenticated', () => {
        socket.on('newMessage', message => {
          update(messages => [...messages, message])
        })
      })
    })
  },
}
