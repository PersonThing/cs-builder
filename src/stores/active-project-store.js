import { writable } from 'svelte/store'
import projects from './project-store'

const lastSelectedKey = 'last-active-project-name'
let selectedName = localStorage.getItem(lastSelectedKey)
const { subscribe, set } = writable(null)

let $projects
projects.subscribe(value => {
  $projects = value
  if (selectedName != null) {
    const p = $projects.find(p => p.name === selectedName)
    set(p)
  }
})

export default {
  subscribe,
  set: value => {
    set(value)
    selectedName = value?.name
    localStorage.setItem(lastSelectedKey, value?.name)
    if (value != null) {
      projects.set($projects.map(p => (p.name == value.name ? value : p)))
    }
  },
}
