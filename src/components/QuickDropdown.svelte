<div bind:this={dropdownElement} class="quick-dropdown {className}" data-test={dataTest}>
  <a
    class={btnClass}
    class:btn-default={!invalid}
    class:btn-danger={invalid}
    class:invalid={invalid && !isOpen}
    class:disabled
    {id}
    on:click|preventDefault={toggle}
    href="/"
    on:keydown={keydown}
    {tabindex}
    bind:this={buttonElement}
  >
    <slot name="label">
      {#if label != null}
        <span>
          {@html label}
        </span>
      {/if}
    </slot>
    {#if !noCaret}
      <Icon data={caretDownIcon} />
    {/if}
  </a>
  {#if isOpen}
    <div class="quick-dropdown-menu {dropdownClass}" bind:this={dropdownMenuElement} on:click={closeIfAnyClickCloses}>
      <slot />
    </div>
  {/if}
</div>

<script>
  import { createEventDispatcher, onDestroy } from 'svelte'
  import Icon from 'svelte-awesome'
  import { caretDown as caretDownIcon } from 'svelte-awesome/icons'

  export let isOpen = false
  export let dataTest = null
  export { className as class }
  export let btnClass = 'btn btn-light btn-sm'
  export let dropdownClass = 'below left'
  export let anyItemClickCloses = false
  export let noCaret = false
  export let autofocusFirstItem = false
  export let disabled = false
  export let label = null
  export let id = null
  export let invalid = false

  const dispatch = createEventDispatcher()
  const tabindex = 0
  let dropdownElement = null
  let buttonElement = null
  let dropdownMenuElement = null
  let className = ''
  let lastMouseDownTarget = null

  onDestroy(close)

  $: if (isOpen) open()
  else close()

  function open() {
    isOpen = true
    // wait for next event loop (not just micro task as in tick()) so menu element is rendered
    setTimeout(() => {
      if (autofocusFirstItem && dropdownMenuElement != null) {
        const item = dropdownMenuElement.querySelector('input, label, a')
        if (item != null) item.focus()
      }
      dispatch('open')
      document.addEventListener('mousedown', trackLastMouseDownTarget)
      document.addEventListener('click', clickListener)
    })
  }

  function close() {
    dispatch('close')
    isOpen = false
    document.removeEventListener('mousedown', trackLastMouseDownTarget)
    document.removeEventListener('click', clickListener)
  }

  function trackLastMouseDownTarget(e) {
    lastMouseDownTarget = e.target
  }

  function clickListener() {
    // for click events, e.target is the last element the mouse was on, so use the element they initially put their mouse down on instead.
    // wait til they finish the click to determine if we need to close it or not, so that click handlers can fire before we close
    // e.g. if they select all text in a box with mouse and end their "click" outside the menu, don't close
    if (dropdownMenuElement == null || lastMouseDownTarget == null) return

    // if the element has since been removed from DOM, assume don't close--e.g. open an date picker, select date, calendar goes away, should keep quickdropdown open
    if (!document.body.contains(lastMouseDownTarget)) return

    const clickedMenu = dropdownMenuElement === lastMouseDownTarget || dropdownMenuElement.contains(lastMouseDownTarget)
    if (!clickedMenu) {
      // console.log('closing', clickedMenu, anyItemClickCloses, dropdownMenuElement, lastMouseDownTarget, e.target)
      close()
    }
  }

  function closeIfAnyClickCloses() {
    if (anyItemClickCloses) setTimeout(close, 0) // wait a bit so click registers prior to closing
  }

  function toggle() {
    isOpen ? close() : open()
  }

  function keydown(e) {
    const key = e.which || e.keyCode
    switch (key) {
      case 13: // enter
      case 32: // space
      case 40: // down
        open()
        e.preventDefault()
        return
      case 27: // esc
      case 9: // tab
      case 38: // up
        close()
        return
    }
  }
</script>

<style lang="scss">
  @import '../scss/variables';

  .quick-dropdown {
    position: relative;

    .quick-dropdown-menu {
      border: none;
      padding: 0;
      border-radius: 4px;

      position: absolute;
      z-index: 10;
      white-space: nowrap;

      background: #fff;
      @include big-box-shadow();

      .list-group {
        margin-bottom: 0;
      }

      .list-group-item.active {
        background-color: $primary;
      }
    }
  }
  .below {
    top: 100%;
  }
  .left {
    left: 0;
  }
  .right {
    right: 0;
  }
</style>
