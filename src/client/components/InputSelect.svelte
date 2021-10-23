<div class="select" class:inline class:disabled bind:this={container} data-test={name} id={name}>
  <div
    class="btn btn-light {className}"
    class:btn-sm={sm}
    data-test="{name}-btn"
    class:open={isOpen}
    {tabindex}
    on:click={open}
    on:focus={open}
    on:keydown={keyListener}
    bind:this={fakeField}
  >
    <div class="input-select-content">
      {#if selectedOptions.length === 0 || (!multiple && selectedOptions[0].value)}{prefixLabel}{/if}
      {#each selectedOptions as option, index (option)}
        {#if multiple}
          {#if index > 0},{inline && index == selectedOptions.length - 1 ? ' and' : ''}{/if}
        {/if}
        <span class="select-input-text">
          <slot {option}>
            {@html option.label}
          </slot>
        </span>
      {/each}
      {#if selectedOptions == null || selectedOptions.length === 0}
        <span class="select-input-text">{placeholder != null ? placeholder : ''}</span>
      {/if}
    </div>
    <span class="dropdown-icon">
      <Icon data={caretDownIcon} class="fw" />
    </span>
  </div>

  {#if isOpen && !disabled}
    <div class="select-dropdown" class:right>
      {#if filterable}
        <div class="filter">
          <input
            type="text"
            class="form-control"
            bind:value={filter}
            placeholder={filterPlaceholder}
            on:keydown={keyListener}
            bind:this={filterField}
          />
          <a on:click|preventDefault={() => (filter = '')} href="/" tabindex="-1">
            <span class="input-group-text">
              <Icon data={removeIcon} class="fw" />
            </span>
          </a>
        </div>
      {/if}
      {#each filteredOptions as option, index}
        <div
          class="item"
          class:selected={option.selected}
          class:viewing={viewIndex == index}
          class:disabled={option.disabled}
          on:click={() => (option.disabled ? null : toggle(option, index))}
        >
          <slot {option}>
            {@html option.label}
          </slot>
        </div>
      {:else}
        {#if filter != null && filter.length > 0}
          <div class="no-results">No options match "{filter}"</div>
        {/if}
      {/each}
    </div>
  {/if}
</div>

<script>
  import Icon from 'svelte-awesome'
  import { remove as removeIcon, caretDown as caretDownIcon } from 'svelte-awesome/icons'

  import _filter from '../services/filter'
  import validator from '../services/validator'
  import { tick, getContext, createEventDispatcher } from 'svelte'

  const dispatch = createEventDispatcher()

  export let name = null
  export let multiple = false
  export let prefixLabel = ''

  // placeholder for the main input
  export let placeholder = ''

  // pass an array of options
  // can be either simple values, or { value, label } objects
  export let options = null

  // optionally set what prop to use for an option's value.
  // by default we use 'option.value' if it's defined, else we use the option itself (assuming it to be a simple value type)
  export let valueProp = null

  // optionally set what prop to use for an option's label if you don't want to define a custom renderer.
  // by default we use 'option.label' if it's defined, else we use the option itself (assuming it to be a simple value type)
  export let labelProp = null

  // pass either a simple value, or an array of values if multiple
  export let value = null
  const initialValue = value

  const markDirty = getContext('markDirty')
  $: if (markDirty != null && value != null && !validator.equals(value, initialValue)) markDirty()

  // set filterable to true to allow filtering
  export let filterable = false

  // programmatically open if you want
  export let isOpen = false

  // prevents user from interacting
  export let disabled = false

  // class will get added to the form-control, for if you want to do form-control-lg, form-control-sm, etc to match the rest of your form
  let className = ''
  export { className as class }

  // whether to display it inline
  export let inline = false

  export let sm = false

  export let right = false // lazy - make dropdown start from right of button instead of left, for when it's toward right edge of screen

  let container = null
  let fakeField = null
  let filterField = null

  const tabindex = 0

  // you can also pass filter to preemptively filter options
  export let filter = ''

  // placeholder for the filter input
  export let filterPlaceholder = 'Filter'

  // option we're currently viewing w/ keyboard navigation
  let viewIndex = -1

  // options to render, filtered if necessary
  $: filteredOptions = (() => {
    const arr = optionsToArray(options, value)
    return !filterable ? arr : _filter(arr, filter)
  })()

  // keep viewIndex within filteredOptions length
  $: {
    if (viewIndex > filteredOptions.length - 1) viewIndex = filteredOptions.length - 1
    if (viewIndex < -1) viewIndex = filterable ? -1 : -1
  }

  // if multiple...
  // make sure value is always array
  // make sure value is always sorted to match option order - just nice to pass the same order around regardless of user click order
  $: if (multiple && value) makeValueArray()

  // options to render in the selected box (so we can use the same slot logic)
  $: selectedOptions = optionsToArray(options, value).filter(option => (multiple ? value && value.indexOf(option.value) > -1 : value == option.value))

  function makeValueArray() {
    if (!Array.isArray(value)) value = [value]
    else
      value = optionsToArray(options, value)
        .filter(o => o.selected)
        .map(option => option.value)
  }

  function optionsToArray(_options, v) {
    const arr =
      _options == null
        ? []
        : _options.map(o => {
            const isString = typeof o === 'string'
            // in case they pass a custom object with other keys they need in a custom label, we destructure the original option object
            const option = isString ? {} : { ...o }
            option.value = isString ? o : valueProp != null ? o[valueProp] : o.value !== undefined ? o.value : o
            option.label = isString ? o : o[labelProp] !== undefined ? o[labelProp] : o.label !== undefined ? o.label : o
            option.selected = multiple ? v != null && v.indexOf(option.value) > -1 : v == option.value
            option.disabled = o.disabled === undefined ? false : o.disabled
            return option
          })
    return arr
  }

  function toggle(option, setViewIndex) {
    if (multiple) {
      value = option.selected ? (value || []).filter(v => v != option.value) : (value || []).concat(option.value)
      // if user clicked an option in multi-select, refocus the fakeField
      if (document.activeElement != fakeField) focusField()
    } else {
      value = option.value
      close()
    }
    if (setViewIndex != null) viewIndex = setViewIndex
    dispatch('change', value)
  }

  async function open() {
    if (disabled) return
    isOpen = true
    const selected = multiple ? (value != null && value.length > 0 ? value[0] : null) : value
    viewIndex = selected != null ? filteredOptions.findIndex(o => o.value === selected) : -1
    document.addEventListener('mousedown', clickListener)
    document.addEventListener('touchstart', clickListener)
    await tick()
    if (isOpen) focusField()
  }

  function close() {
    // focus the non-field so tabbing/shift-tabbing works after close
    focusField()
    isOpen = false
    document.removeEventListener('mousedown', clickListener)
    document.removeEventListener('touchstart', clickListener)
  }

  function keyListener(e) {
    // if tab, close and let them out
    if (e.code == 'Tab') {
      close()
      return
    }

    // otherwise, if we're not open, any key should open
    if (!isOpen) {
      // except shift, so shift-tab doesn't open before closing immediately anyway
      // and up, cuz it feels weird
      if (e.code == 'ShiftLeft' || e.code == 'ShiftRight' || e.code == 'ArrowUp') return

      open()
      return
    }

    // otherwise, handle a few keys for navigating options and toggling them
    switch (e.code) {
      case 'Escape':
        e.stopPropagation()
        close()
        break

      case 'Space':
      case 'Enter':
        if (viewIndex != null && filteredOptions[viewIndex] != null) {
          toggle(filteredOptions[viewIndex])
          e.preventDefault()
        }
        break

      case 'ArrowUp':
        viewIndex--
        if ((filterable && viewIndex == -2) || (!filterable && viewIndex <= -1)) close()

        e.preventDefault()
        break

      case 'ArrowDown':
        if (!isOpen) open()
        else if (viewIndex < filteredOptions.length - 1) viewIndex++
        e.preventDefault()
        break
    }
  }

  function clickListener(e) {
    if (e.target.closest == null || e.target.closest('.select') !== container) close()
  }

  function focusField() {
    if (fakeField && !filterable) fakeField.focus()
    else if (filterField) filterField.focus()
  }
</script>

<style lang="scss">
  @import '../scss/variables';

  .select {
    position: relative;
    cursor: pointer;

    .item,
    .select-input-text {
      display: flex;
      align-items: center;
      gap: 3px;
    }

    &.inline {
      display: inline-block;
      vertical-align: top;

      .select-dropdown {
        .item {
          white-space: nowrap;
        }
      }
    }

    .btn {
      display: flex;
      flex-direction: row;
      align-items: center;

      .dropdown-icon {
        margin-left: 0.6rem;
      }

      .input-select-content {
        text-align: left;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 1;
      }
    }

    &.disabled {
      cursor: not-allowed;

      & .input-select {
        background-color: rgb(240, 240, 240);
        color: #aaa;
      }
    }
  }

  .select-dropdown {
    min-width: 100%;
    position: absolute;
    border-bottom: none;
    border-top: none;
    z-index: 1055;
    top: 100%;
    left: 0;
    max-height: 35vh;
    overflow-y: auto;
    -webkit-box-shadow: 0 6px 12px rgba(0, 0, 0, 0.175);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.175);
    background-color: #fff;

    &.right {
      left: auto;
      right: 0;
    }

    & > .filter {
      padding: 2px;

      display: flex;
      flex-direction: row;
      gap: 3px;
      align-items: center;
    }

    .no-results {
      padding: 5px;
    }

    & > .item {
      cursor: pointer;
      border-bottom: 1px solid #efefef;
      padding: 8px 16px;
      min-width: 150px;

      &:hover,
      &.viewing {
        /*when hovering an item or when navigating through the items using the arrow keys*/
        background-color: #eee;
      }

      &.selected {
        background-color: $primary;
        color: #0b59a1;

        &.viewing {
          background-color: darken($primary, 5%);
        }
      }

      &.disabled {
        background-color: rgb(240, 240, 240);
        color: #aaa;
        cursor: not-allowed;
      }
    }
  }

  :global(.fw) {
    width: 1.5em;
  }
</style>
