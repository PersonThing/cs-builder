// import LocalStorageStore from 'stores/local-storage-store'
// const myStore = LocalStorageStore('some unique key', 'default value')
// todo test this
// then you should be able to bind to it and set to it just like any other store, only it'll be saved in local storage too...

import { writable } from 'svelte/store'

function LocalStorageStore(key, defaultValue) {
  const valueFromStorage = localStorage.getItem(key)
  const initialValue =
    valueFromStorage != null && valueFromStorage != 'null' && valueFromStorage != 'undefined' ? JSON.parse(valueFromStorage) : defaultValue
  const { subscribe, set, update } = writable(initialValue)
  return {
    subscribe,
    update: function (updater) {
      const value = update(updater)
      set(value)
      return value
    },
    set: function (value) {
      set(value)
      localStorage.setItem(key, JSON.stringify(value))
    },
  }
}

export default LocalStorageStore
