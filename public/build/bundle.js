
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35730/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe$2(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe$2(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function set_store_value(store, ret, value = ret) {
        store.set(value);
        return ret;
    }

    // Track which nodes are claimed during hydration. Unclaimed nodes can then be removed from the DOM
    // at the end of hydration without touching the remaining nodes.
    let is_hydrating = false;
    function start_hydrating() {
        is_hydrating = true;
    }
    function end_hydrating() {
        is_hydrating = false;
    }
    function upper_bound(low, high, key, value) {
        // Return first index of value larger than input value in the range [low, high)
        while (low < high) {
            const mid = low + ((high - low) >> 1);
            if (key(mid) <= value) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        return low;
    }
    function init_hydrate(target) {
        if (target.hydrate_init)
            return;
        target.hydrate_init = true;
        // We know that all children have claim_order values since the unclaimed have been detached
        const children = target.childNodes;
        /*
        * Reorder claimed children optimally.
        * We can reorder claimed children optimally by finding the longest subsequence of
        * nodes that are already claimed in order and only moving the rest. The longest
        * subsequence subsequence of nodes that are claimed in order can be found by
        * computing the longest increasing subsequence of .claim_order values.
        *
        * This algorithm is optimal in generating the least amount of reorder operations
        * possible.
        *
        * Proof:
        * We know that, given a set of reordering operations, the nodes that do not move
        * always form an increasing subsequence, since they do not move among each other
        * meaning that they must be already ordered among each other. Thus, the maximal
        * set of nodes that do not move form a longest increasing subsequence.
        */
        // Compute longest increasing subsequence
        // m: subsequence length j => index k of smallest value that ends an increasing subsequence of length j
        const m = new Int32Array(children.length + 1);
        // Predecessor indices + 1
        const p = new Int32Array(children.length);
        m[0] = -1;
        let longest = 0;
        for (let i = 0; i < children.length; i++) {
            const current = children[i].claim_order;
            // Find the largest subsequence length such that it ends in a value less than our current value
            // upper_bound returns first greater value, so we subtract one
            const seqLen = upper_bound(1, longest + 1, idx => children[m[idx]].claim_order, current) - 1;
            p[i] = m[seqLen] + 1;
            const newLen = seqLen + 1;
            // We can guarantee that current is the smallest value. Otherwise, we would have generated a longer sequence.
            m[newLen] = i;
            longest = Math.max(newLen, longest);
        }
        // The longest increasing subsequence of nodes (initially reversed)
        const lis = [];
        // The rest of the nodes, nodes that will be moved
        const toMove = [];
        let last = children.length - 1;
        for (let cur = m[longest] + 1; cur != 0; cur = p[cur - 1]) {
            lis.push(children[cur - 1]);
            for (; last >= cur; last--) {
                toMove.push(children[last]);
            }
            last--;
        }
        for (; last >= 0; last--) {
            toMove.push(children[last]);
        }
        lis.reverse();
        // We sort the nodes being moved to guarantee that their insertion order matches the claim order
        toMove.sort((a, b) => a.claim_order - b.claim_order);
        // Finally, we move the nodes
        for (let i = 0, j = 0; i < toMove.length; i++) {
            while (j < lis.length && toMove[i].claim_order >= lis[j].claim_order) {
                j++;
            }
            const anchor = j < lis.length ? lis[j] : null;
            target.insertBefore(toMove[i], anchor);
        }
    }
    function append(target, node) {
        if (is_hydrating) {
            init_hydrate(target);
            if ((target.actual_end_child === undefined) || ((target.actual_end_child !== null) && (target.actual_end_child.parentElement !== target))) {
                target.actual_end_child = target.firstChild;
            }
            if (node !== target.actual_end_child) {
                target.insertBefore(node, target.actual_end_child);
            }
            else {
                target.actual_end_child = node.nextSibling;
            }
        }
        else if (node.parentNode !== target) {
            target.appendChild(node);
        }
    }
    function insert(target, node, anchor) {
        if (is_hydrating && !anchor) {
            append(target, node);
        }
        else if (node.parentNode !== target || (anchor && node.nextSibling !== anchor)) {
            target.insertBefore(node, anchor || null);
        }
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_svg_attributes(node, attributes) {
        for (const key in attributes) {
            attr(node, key, attributes[key]);
        }
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }
    class HtmlTag {
        constructor(claimed_nodes) {
            this.e = this.n = null;
            this.l = claimed_nodes;
        }
        m(html, target, anchor = null) {
            if (!this.e) {
                this.e = element(target.nodeName);
                this.t = target;
                if (this.l) {
                    this.n = this.l;
                }
                else {
                    this.h(html);
                }
            }
            this.i(anchor);
        }
        h(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.childNodes);
        }
        i(anchor) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(this.t, this.n[i], anchor);
            }
        }
        p(html) {
            this.d();
            this.h(html);
            this.i(this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                start_hydrating();
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            end_hydrating();
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.3' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /**
     * @typedef {Object} WrappedComponent Object returned by the `wrap` method
     * @property {SvelteComponent} component - Component to load (this is always asynchronous)
     * @property {RoutePrecondition[]} [conditions] - Route pre-conditions to validate
     * @property {Object} [props] - Optional dictionary of static props
     * @property {Object} [userData] - Optional user data dictionary
     * @property {bool} _sveltesparouter - Internal flag; always set to true
     */

    /**
     * @callback AsyncSvelteComponent
     * @returns {Promise<SvelteComponent>} Returns a Promise that resolves with a Svelte component
     */

    /**
     * @callback RoutePrecondition
     * @param {RouteDetail} detail - Route detail object
     * @returns {boolean|Promise<boolean>} If the callback returns a false-y value, it's interpreted as the precondition failed, so it aborts loading the component (and won't process other pre-condition callbacks)
     */

    /**
     * @typedef {Object} WrapOptions Options object for the call to `wrap`
     * @property {SvelteComponent} [component] - Svelte component to load (this is incompatible with `asyncComponent`)
     * @property {AsyncSvelteComponent} [asyncComponent] - Function that returns a Promise that fulfills with a Svelte component (e.g. `{asyncComponent: () => import('Foo.svelte')}`)
     * @property {SvelteComponent} [loadingComponent] - Svelte component to be displayed while the async route is loading (as a placeholder); when unset or false-y, no component is shown while component
     * @property {object} [loadingParams] - Optional dictionary passed to the `loadingComponent` component as params (for an exported prop called `params`)
     * @property {object} [userData] - Optional object that will be passed to events such as `routeLoading`, `routeLoaded`, `conditionsFailed`
     * @property {object} [props] - Optional key-value dictionary of static props that will be passed to the component. The props are expanded with {...props}, so the key in the dictionary becomes the name of the prop.
     * @property {RoutePrecondition[]|RoutePrecondition} [conditions] - Route pre-conditions to add, which will be executed in order
     */

    /**
     * Wraps a component to enable multiple capabilities:
     * 1. Using dynamically-imported component, with (e.g. `{asyncComponent: () => import('Foo.svelte')}`), which also allows bundlers to do code-splitting.
     * 2. Adding route pre-conditions (e.g. `{conditions: [...]}`)
     * 3. Adding static props that are passed to the component
     * 4. Adding custom userData, which is passed to route events (e.g. route loaded events) or to route pre-conditions (e.g. `{userData: {foo: 'bar}}`)
     * 
     * @param {WrapOptions} args - Arguments object
     * @returns {WrappedComponent} Wrapped component
     */
    function wrap$1(args) {
        if (!args) {
            throw Error('Parameter args is required')
        }

        // We need to have one and only one of component and asyncComponent
        // This does a "XNOR"
        if (!args.component == !args.asyncComponent) {
            throw Error('One and only one of component and asyncComponent is required')
        }

        // If the component is not async, wrap it into a function returning a Promise
        if (args.component) {
            args.asyncComponent = () => Promise.resolve(args.component);
        }

        // Parameter asyncComponent and each item of conditions must be functions
        if (typeof args.asyncComponent != 'function') {
            throw Error('Parameter asyncComponent must be a function')
        }
        if (args.conditions) {
            // Ensure it's an array
            if (!Array.isArray(args.conditions)) {
                args.conditions = [args.conditions];
            }
            for (let i = 0; i < args.conditions.length; i++) {
                if (!args.conditions[i] || typeof args.conditions[i] != 'function') {
                    throw Error('Invalid parameter conditions[' + i + ']')
                }
            }
        }

        // Check if we have a placeholder component
        if (args.loadingComponent) {
            args.asyncComponent.loading = args.loadingComponent;
            args.asyncComponent.loadingParams = args.loadingParams || undefined;
        }

        // Returns an object that contains all the functions to execute too
        // The _sveltesparouter flag is to confirm the object was created by this router
        const obj = {
            component: args.asyncComponent,
            userData: args.userData,
            conditions: (args.conditions && args.conditions.length) ? args.conditions : undefined,
            props: (args.props && Object.keys(args.props).length) ? args.props : {},
            _sveltesparouter: true
        };

        return obj
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe$2(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    function parse(str, loose) {
    	if (str instanceof RegExp) return { keys:false, pattern:str };
    	var c, o, tmp, ext, keys=[], pattern='', arr = str.split('/');
    	arr[0] || arr.shift();

    	while (tmp = arr.shift()) {
    		c = tmp[0];
    		if (c === '*') {
    			keys.push('wild');
    			pattern += '/(.*)';
    		} else if (c === ':') {
    			o = tmp.indexOf('?', 1);
    			ext = tmp.indexOf('.', 1);
    			keys.push( tmp.substring(1, !!~o ? o : !!~ext ? ext : tmp.length) );
    			pattern += !!~o && !~ext ? '(?:/([^/]+?))?' : '/([^/]+?)';
    			if (!!~ext) pattern += (!!~o ? '?' : '') + '\\' + tmp.substring(ext);
    		} else {
    			pattern += '/' + tmp;
    		}
    	}

    	return {
    		keys: keys,
    		pattern: new RegExp('^' + pattern + (loose ? '(?=$|\/)' : '\/?$'), 'i')
    	};
    }

    /* node_modules\svelte-spa-router\Router.svelte generated by Svelte v3.38.3 */

    const { Error: Error_1, Object: Object_1$7, console: console_1$2 } = globals;

    // (251:0) {:else}
    function create_else_block$5(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [/*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*props*/ 4)
    			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*props*/ ctx[2])])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$5.name,
    		type: "else",
    		source: "(251:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (244:0) {#if componentParams}
    function create_if_block$e(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [{ params: /*componentParams*/ ctx[1] }, /*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*componentParams, props*/ 6)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*componentParams*/ 2 && { params: /*componentParams*/ ctx[1] },
    					dirty & /*props*/ 4 && get_spread_object(/*props*/ ctx[2])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$e.name,
    		type: "if",
    		source: "(244:0) {#if componentParams}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$y(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$e, create_else_block$5];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*componentParams*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$y.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function wrap(component, userData, ...conditions) {
    	// Use the new wrap method and show a deprecation warning
    	// eslint-disable-next-line no-console
    	console.warn("Method `wrap` from `svelte-spa-router` is deprecated and will be removed in a future version. Please use `svelte-spa-router/wrap` instead. See http://bit.ly/svelte-spa-router-upgrading");

    	return wrap$1({ component, userData, conditions });
    }

    /**
     * @typedef {Object} Location
     * @property {string} location - Location (page/view), for example `/book`
     * @property {string} [querystring] - Querystring from the hash, as a string not parsed
     */
    /**
     * Returns the current location from the hash.
     *
     * @returns {Location} Location object
     * @private
     */
    function getLocation() {
    	const hashPosition = window.location.href.indexOf("#/");

    	let location = hashPosition > -1
    	? window.location.href.substr(hashPosition + 1)
    	: "/";

    	// Check if there's a querystring
    	const qsPosition = location.indexOf("?");

    	let querystring = "";

    	if (qsPosition > -1) {
    		querystring = location.substr(qsPosition + 1);
    		location = location.substr(0, qsPosition);
    	}

    	return { location, querystring };
    }

    const loc = readable(null, // eslint-disable-next-line prefer-arrow-callback
    function start(set) {
    	set(getLocation());

    	const update = () => {
    		set(getLocation());
    	};

    	window.addEventListener("hashchange", update, false);

    	return function stop() {
    		window.removeEventListener("hashchange", update, false);
    	};
    });

    const location = derived(loc, $loc => $loc.location);
    const querystring = derived(loc, $loc => $loc.querystring);
    const params = writable(undefined);

    async function push(location) {
    	if (!location || location.length < 1 || location.charAt(0) != "/" && location.indexOf("#/") !== 0) {
    		throw Error("Invalid parameter location");
    	}

    	// Execute this code when the current call stack is complete
    	await tick();

    	// Note: this will include scroll state in history even when restoreScrollState is false
    	history.replaceState(
    		{
    			...history.state,
    			__svelte_spa_router_scrollX: window.scrollX,
    			__svelte_spa_router_scrollY: window.scrollY
    		},
    		undefined,
    		undefined
    	);

    	window.location.hash = (location.charAt(0) == "#" ? "" : "#") + location;
    }

    async function pop() {
    	// Execute this code when the current call stack is complete
    	await tick();

    	window.history.back();
    }

    async function replace(location) {
    	if (!location || location.length < 1 || location.charAt(0) != "/" && location.indexOf("#/") !== 0) {
    		throw Error("Invalid parameter location");
    	}

    	// Execute this code when the current call stack is complete
    	await tick();

    	const dest = (location.charAt(0) == "#" ? "" : "#") + location;

    	try {
    		const newState = { ...history.state };
    		delete newState["__svelte_spa_router_scrollX"];
    		delete newState["__svelte_spa_router_scrollY"];
    		window.history.replaceState(newState, undefined, dest);
    	} catch(e) {
    		// eslint-disable-next-line no-console
    		console.warn("Caught exception while replacing the current page. If you're running this in the Svelte REPL, please note that the `replace` method might not work in this environment.");
    	}

    	// The method above doesn't trigger the hashchange event, so let's do that manually
    	window.dispatchEvent(new Event("hashchange"));
    }

    function link(node, opts) {
    	opts = linkOpts(opts);

    	// Only apply to <a> tags
    	if (!node || !node.tagName || node.tagName.toLowerCase() != "a") {
    		throw Error("Action \"link\" can only be used with <a> tags");
    	}

    	updateLink(node, opts);

    	return {
    		update(updated) {
    			updated = linkOpts(updated);
    			updateLink(node, updated);
    		}
    	};
    }

    // Internal function used by the link function
    function updateLink(node, opts) {
    	let href = opts.href || node.getAttribute("href");

    	// Destination must start with '/' or '#/'
    	if (href && href.charAt(0) == "/") {
    		// Add # to the href attribute
    		href = "#" + href;
    	} else if (!href || href.length < 2 || href.slice(0, 2) != "#/") {
    		throw Error("Invalid value for \"href\" attribute: " + href);
    	}

    	node.setAttribute("href", href);

    	node.addEventListener("click", event => {
    		// Prevent default anchor onclick behaviour
    		event.preventDefault();

    		if (!opts.disabled) {
    			scrollstateHistoryHandler(event.currentTarget.getAttribute("href"));
    		}
    	});
    }

    // Internal function that ensures the argument of the link action is always an object
    function linkOpts(val) {
    	if (val && typeof val == "string") {
    		return { href: val };
    	} else {
    		return val || {};
    	}
    }

    /**
     * The handler attached to an anchor tag responsible for updating the
     * current history state with the current scroll state
     *
     * @param {string} href - Destination
     */
    function scrollstateHistoryHandler(href) {
    	// Setting the url (3rd arg) to href will break clicking for reasons, so don't try to do that
    	history.replaceState(
    		{
    			...history.state,
    			__svelte_spa_router_scrollX: window.scrollX,
    			__svelte_spa_router_scrollY: window.scrollY
    		},
    		undefined,
    		undefined
    	);

    	// This will force an update as desired, but this time our scroll state will be attached
    	window.location.hash = href;
    }

    function instance$y($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Router", slots, []);
    	let { routes = {} } = $$props;
    	let { prefix = "" } = $$props;
    	let { restoreScrollState = false } = $$props;

    	/**
     * Container for a route: path, component
     */
    	class RouteItem {
    		/**
     * Initializes the object and creates a regular expression from the path, using regexparam.
     *
     * @param {string} path - Path to the route (must start with '/' or '*')
     * @param {SvelteComponent|WrappedComponent} component - Svelte component for the route, optionally wrapped
     */
    		constructor(path, component) {
    			if (!component || typeof component != "function" && (typeof component != "object" || component._sveltesparouter !== true)) {
    				throw Error("Invalid component object");
    			}

    			// Path must be a regular or expression, or a string starting with '/' or '*'
    			if (!path || typeof path == "string" && (path.length < 1 || path.charAt(0) != "/" && path.charAt(0) != "*") || typeof path == "object" && !(path instanceof RegExp)) {
    				throw Error("Invalid value for \"path\" argument - strings must start with / or *");
    			}

    			const { pattern, keys } = parse(path);
    			this.path = path;

    			// Check if the component is wrapped and we have conditions
    			if (typeof component == "object" && component._sveltesparouter === true) {
    				this.component = component.component;
    				this.conditions = component.conditions || [];
    				this.userData = component.userData;
    				this.props = component.props || {};
    			} else {
    				// Convert the component to a function that returns a Promise, to normalize it
    				this.component = () => Promise.resolve(component);

    				this.conditions = [];
    				this.props = {};
    			}

    			this._pattern = pattern;
    			this._keys = keys;
    		}

    		/**
     * Checks if `path` matches the current route.
     * If there's a match, will return the list of parameters from the URL (if any).
     * In case of no match, the method will return `null`.
     *
     * @param {string} path - Path to test
     * @returns {null|Object.<string, string>} List of paramters from the URL if there's a match, or `null` otherwise.
     */
    		match(path) {
    			// If there's a prefix, check if it matches the start of the path.
    			// If not, bail early, else remove it before we run the matching.
    			if (prefix) {
    				if (typeof prefix == "string") {
    					if (path.startsWith(prefix)) {
    						path = path.substr(prefix.length) || "/";
    					} else {
    						return null;
    					}
    				} else if (prefix instanceof RegExp) {
    					const match = path.match(prefix);

    					if (match && match[0]) {
    						path = path.substr(match[0].length) || "/";
    					} else {
    						return null;
    					}
    				}
    			}

    			// Check if the pattern matches
    			const matches = this._pattern.exec(path);

    			if (matches === null) {
    				return null;
    			}

    			// If the input was a regular expression, this._keys would be false, so return matches as is
    			if (this._keys === false) {
    				return matches;
    			}

    			const out = {};
    			let i = 0;

    			while (i < this._keys.length) {
    				// In the match parameters, URL-decode all values
    				try {
    					out[this._keys[i]] = decodeURIComponent(matches[i + 1] || "") || null;
    				} catch(e) {
    					out[this._keys[i]] = null;
    				}

    				i++;
    			}

    			return out;
    		}

    		/**
     * Dictionary with route details passed to the pre-conditions functions, as well as the `routeLoading`, `routeLoaded` and `conditionsFailed` events
     * @typedef {Object} RouteDetail
     * @property {string|RegExp} route - Route matched as defined in the route definition (could be a string or a reguar expression object)
     * @property {string} location - Location path
     * @property {string} querystring - Querystring from the hash
     * @property {object} [userData] - Custom data passed by the user
     * @property {SvelteComponent} [component] - Svelte component (only in `routeLoaded` events)
     * @property {string} [name] - Name of the Svelte component (only in `routeLoaded` events)
     */
    		/**
     * Executes all conditions (if any) to control whether the route can be shown. Conditions are executed in the order they are defined, and if a condition fails, the following ones aren't executed.
     * 
     * @param {RouteDetail} detail - Route detail
     * @returns {boolean} Returns true if all the conditions succeeded
     */
    		async checkConditions(detail) {
    			for (let i = 0; i < this.conditions.length; i++) {
    				if (!await this.conditions[i](detail)) {
    					return false;
    				}
    			}

    			return true;
    		}
    	}

    	// Set up all routes
    	const routesList = [];

    	if (routes instanceof Map) {
    		// If it's a map, iterate on it right away
    		routes.forEach((route, path) => {
    			routesList.push(new RouteItem(path, route));
    		});
    	} else {
    		// We have an object, so iterate on its own properties
    		Object.keys(routes).forEach(path => {
    			routesList.push(new RouteItem(path, routes[path]));
    		});
    	}

    	// Props for the component to render
    	let component = null;

    	let componentParams = null;
    	let props = {};

    	// Event dispatcher from Svelte
    	const dispatch = createEventDispatcher();

    	// Just like dispatch, but executes on the next iteration of the event loop
    	async function dispatchNextTick(name, detail) {
    		// Execute this code when the current call stack is complete
    		await tick();

    		dispatch(name, detail);
    	}

    	// If this is set, then that means we have popped into this var the state of our last scroll position
    	let previousScrollState = null;

    	let popStateChanged = null;

    	if (restoreScrollState) {
    		popStateChanged = event => {
    			// If this event was from our history.replaceState, event.state will contain
    			// our scroll history. Otherwise, event.state will be null (like on forward
    			// navigation)
    			if (event.state && event.state.__svelte_spa_router_scrollY) {
    				previousScrollState = event.state;
    			} else {
    				previousScrollState = null;
    			}
    		};

    		// This is removed in the destroy() invocation below
    		window.addEventListener("popstate", popStateChanged);

    		afterUpdate(() => {
    			// If this exists, then this is a back navigation: restore the scroll position
    			if (previousScrollState) {
    				window.scrollTo(previousScrollState.__svelte_spa_router_scrollX, previousScrollState.__svelte_spa_router_scrollY);
    			} else {
    				// Otherwise this is a forward navigation: scroll to top
    				window.scrollTo(0, 0);
    			}
    		});
    	}

    	// Always have the latest value of loc
    	let lastLoc = null;

    	// Current object of the component loaded
    	let componentObj = null;

    	// Handle hash change events
    	// Listen to changes in the $loc store and update the page
    	// Do not use the $: syntax because it gets triggered by too many things
    	const unsubscribeLoc = loc.subscribe(async newLoc => {
    		lastLoc = newLoc;

    		// Find a route matching the location
    		let i = 0;

    		while (i < routesList.length) {
    			const match = routesList[i].match(newLoc.location);

    			if (!match) {
    				i++;
    				continue;
    			}

    			const detail = {
    				route: routesList[i].path,
    				location: newLoc.location,
    				querystring: newLoc.querystring,
    				userData: routesList[i].userData,
    				params: match && typeof match == "object" && Object.keys(match).length
    				? match
    				: null
    			};

    			// Check if the route can be loaded - if all conditions succeed
    			if (!await routesList[i].checkConditions(detail)) {
    				// Don't display anything
    				$$invalidate(0, component = null);

    				componentObj = null;

    				// Trigger an event to notify the user, then exit
    				dispatchNextTick("conditionsFailed", detail);

    				return;
    			}

    			// Trigger an event to alert that we're loading the route
    			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
    			dispatchNextTick("routeLoading", Object.assign({}, detail));

    			// If there's a component to show while we're loading the route, display it
    			const obj = routesList[i].component;

    			// Do not replace the component if we're loading the same one as before, to avoid the route being unmounted and re-mounted
    			if (componentObj != obj) {
    				if (obj.loading) {
    					$$invalidate(0, component = obj.loading);
    					componentObj = obj;
    					$$invalidate(1, componentParams = obj.loadingParams);
    					$$invalidate(2, props = {});

    					// Trigger the routeLoaded event for the loading component
    					// Create a copy of detail so we don't modify the object for the dynamic route (and the dynamic route doesn't modify our object too)
    					dispatchNextTick("routeLoaded", Object.assign({}, detail, {
    						component,
    						name: component.name,
    						params: componentParams
    					}));
    				} else {
    					$$invalidate(0, component = null);
    					componentObj = null;
    				}

    				// Invoke the Promise
    				const loaded = await obj();

    				// Now that we're here, after the promise resolved, check if we still want this component, as the user might have navigated to another page in the meanwhile
    				if (newLoc != lastLoc) {
    					// Don't update the component, just exit
    					return;
    				}

    				// If there is a "default" property, which is used by async routes, then pick that
    				$$invalidate(0, component = loaded && loaded.default || loaded);

    				componentObj = obj;
    			}

    			// Set componentParams only if we have a match, to avoid a warning similar to `<Component> was created with unknown prop 'params'`
    			// Of course, this assumes that developers always add a "params" prop when they are expecting parameters
    			if (match && typeof match == "object" && Object.keys(match).length) {
    				$$invalidate(1, componentParams = match);
    			} else {
    				$$invalidate(1, componentParams = null);
    			}

    			// Set static props, if any
    			$$invalidate(2, props = routesList[i].props);

    			// Dispatch the routeLoaded event then exit
    			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
    			dispatchNextTick("routeLoaded", Object.assign({}, detail, {
    				component,
    				name: component.name,
    				params: componentParams
    			})).then(() => {
    				params.set(componentParams);
    			});

    			return;
    		}

    		// If we're still here, there was no match, so show the empty component
    		$$invalidate(0, component = null);

    		componentObj = null;
    		params.set(undefined);
    	});

    	onDestroy(() => {
    		unsubscribeLoc();
    		popStateChanged && window.removeEventListener("popstate", popStateChanged);
    	});

    	const writable_props = ["routes", "prefix", "restoreScrollState"];

    	Object_1$7.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$2.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	function routeEvent_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function routeEvent_handler_1(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("routes" in $$props) $$invalidate(3, routes = $$props.routes);
    		if ("prefix" in $$props) $$invalidate(4, prefix = $$props.prefix);
    		if ("restoreScrollState" in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
    	};

    	$$self.$capture_state = () => ({
    		readable,
    		writable,
    		derived,
    		tick,
    		_wrap: wrap$1,
    		wrap,
    		getLocation,
    		loc,
    		location,
    		querystring,
    		params,
    		push,
    		pop,
    		replace,
    		link,
    		updateLink,
    		linkOpts,
    		scrollstateHistoryHandler,
    		onDestroy,
    		createEventDispatcher,
    		afterUpdate,
    		parse,
    		routes,
    		prefix,
    		restoreScrollState,
    		RouteItem,
    		routesList,
    		component,
    		componentParams,
    		props,
    		dispatch,
    		dispatchNextTick,
    		previousScrollState,
    		popStateChanged,
    		lastLoc,
    		componentObj,
    		unsubscribeLoc
    	});

    	$$self.$inject_state = $$props => {
    		if ("routes" in $$props) $$invalidate(3, routes = $$props.routes);
    		if ("prefix" in $$props) $$invalidate(4, prefix = $$props.prefix);
    		if ("restoreScrollState" in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
    		if ("component" in $$props) $$invalidate(0, component = $$props.component);
    		if ("componentParams" in $$props) $$invalidate(1, componentParams = $$props.componentParams);
    		if ("props" in $$props) $$invalidate(2, props = $$props.props);
    		if ("previousScrollState" in $$props) previousScrollState = $$props.previousScrollState;
    		if ("popStateChanged" in $$props) popStateChanged = $$props.popStateChanged;
    		if ("lastLoc" in $$props) lastLoc = $$props.lastLoc;
    		if ("componentObj" in $$props) componentObj = $$props.componentObj;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*restoreScrollState*/ 32) {
    			// Update history.scrollRestoration depending on restoreScrollState
    			history.scrollRestoration = restoreScrollState ? "manual" : "auto";
    		}
    	};

    	return [
    		component,
    		componentParams,
    		props,
    		routes,
    		prefix,
    		restoreScrollState,
    		routeEvent_handler,
    		routeEvent_handler_1
    	];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$y, create_fragment$y, safe_not_equal, {
    			routes: 3,
    			prefix: 4,
    			restoreScrollState: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$y.name
    		});
    	}

    	get routes() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set routes(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get prefix() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set prefix(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get restoreScrollState() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set restoreScrollState(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var deleteIcon = { remove: { width: 1408, height: 1792, paths: [{ d: 'M1298 1322q0 40-28 68l-136 136q-28 28-68 28t-68-28l-294-294-294 294q-28 28-68 28t-68-28l-136-136q-28-28-28-68t28-68l294-294-294-294q-28-28-28-68t28-68l136-136q28-28 68-28t68 28l294 294 294-294q28-28 68-28t68 28l136 136q28 28 28 68t-28 68l-294 294 294 294q28 28 28 68z' }] } };

    var zoomIcon = { 'search-plus': { width: 1664, height: 1792, paths: [{ d: 'M1024 800v64q0 13-9.5 22.5t-22.5 9.5h-224v224q0 13-9.5 22.5t-22.5 9.5h-64q-13 0-22.5-9.5t-9.5-22.5v-224h-224q-13 0-22.5-9.5t-9.5-22.5v-64q0-13 9.5-22.5t22.5-9.5h224v-224q0-13 9.5-22.5t22.5-9.5h64q13 0 22.5 9.5t9.5 22.5v224h224q13 0 22.5 9.5t9.5 22.5zM1152 832q0-185-131.5-316.5t-316.5-131.5-316.5 131.5-131.5 316.5 131.5 316.5 316.5 131.5 316.5-131.5 131.5-316.5zM1664 1664q0 53-37.5 90.5t-90.5 37.5q-54 0-90-38l-343-342q-179 124-399 124-143 0-273.5-55.5t-225-150-150-225-55.5-273.5 55.5-273.5 150-225 225-150 273.5-55.5 273.5 55.5 225 150 150 225 55.5 273.5q0 220-124 399l343 343q37 37 37 90z' }] } };

    var arrowLeftIcon = { 'arrow-left': { width: 1536, height: 1792, paths: [{ d: 'M1536 896v128q0 53-32.5 90.5t-84.5 37.5h-704l293 294q38 36 38 90t-38 90l-75 76q-37 37-90 37-52 0-91-37l-651-652q-37-37-37-90 0-52 37-91l651-650q38-38 91-38 52 0 90 38l75 74q38 38 38 91t-38 91l-293 293h704q52 0 84.5 37.5t32.5 90.5z' }] } };

    var arrowRightIcon = { 'arrow-right': { width: 1536, height: 1792, paths: [{ d: 'M1472 960q0 54-37 91l-651 651q-39 37-91 37-51 0-90-37l-75-75q-38-38-38-91t38-91l293-293h-704q-52 0-84.5-37.5t-32.5-90.5v-128q0-53 32.5-90.5t84.5-37.5h704l-293-294q-38-36-38-90t38-90l75-75q38-38 90-38 53 0 91 38l651 651q37 35 37 90z' }] } };

    var arrowUpIcon = { 'arrow-up': { width: 1664, height: 1792, paths: [{ d: 'M1611 971q0 51-37 90l-75 75q-38 38-91 38-54 0-90-38l-294-293v704q0 52-37.5 84.5t-90.5 32.5h-128q-53 0-90.5-32.5t-37.5-84.5v-704l-294 293q-36 38-90 38t-90-38l-75-75q-38-38-38-90 0-53 38-91l651-651q35-37 90-37 54 0 91 37l651 651q37 39 37 91z' }] } };

    var arrowDownIcon = { 'arrow-down': { width: 1664, height: 1792, paths: [{ d: 'M1611 832q0 53-37 90l-651 652q-39 37-91 37-53 0-90-37l-651-652q-38-36-38-90 0-53 38-91l74-75q39-37 91-37 53 0 90 37l294 294v-704q0-52 38-90t90-38h128q52 0 90 38t38 90v704l294-294q37-37 90-37 52 0 91 37l75 75q37 39 37 91z' }] } };

    var plusIcon = { plus: { width: 1408, height: 1792, paths: [{ d: 'M1408 736v192q0 40-28 68t-68 28h-416v416q0 40-28 68t-68 28h-192q-40 0-68-28t-28-68v-416h-416q-40 0-68-28t-28-68v-192q0-40 28-68t68-28h416v-416q0-40 28-68t68-28h192q40 0 68 28t28 68v416h416q40 0 68 28t28 68z' }] } };

    var minusIcon = { minus: { width: 1408, height: 1792, paths: [{ d: 'M1408 736v192q0 40-28 68t-68 28h-1216q-40 0-68-28t-28-68v-192q0-40 28-68t68-28h1216q40 0 68 28t28 68z' }] } };

    var copyIcon = { copy: { width: 1792, height: 1792, paths: [{ d: 'M1696 384q40 0 68 28t28 68v1216q0 40-28 68t-68 28h-960q-40 0-68-28t-28-68v-288h-544q-40 0-68-28t-28-68v-672q0-40 20-88t48-76l408-408q28-28 76-48t88-20h416q40 0 68 28t28 68v328q68-40 128-40h416zM1152 597l-299 299h299v-299zM512 213l-299 299h299v-299zM708 860l316-316v-416h-384v416q0 40-28 68t-68 28h-416v640h512v-256q0-40 20-88t48-76zM1664 1664v-1152h-384v416q0 40-28 68t-68 28h-416v640h896z' }] } };

    var caretDownIcon = { 'caret-down': { width: 1024, height: 1792, paths: [{ d: 'M1024 704q0 26-19 45l-448 448q-19 19-45 19t-45-19l-448-448q-19-19-19-45t19-45 45-19h896q26 0 45 19t19 45z' }] } };

    var undoIcon = { undo: { width: 1536, height: 1792, paths: [{ d: 'M1536 896q0 156-61 298t-164 245-245 164-298 61q-172 0-327-72.5t-264-204.5q-7-10-6.5-22.5t8.5-20.5l137-138q10-9 25-9 16 2 23 12 73 95 179 147t225 52q104 0 198.5-40.5t163.5-109.5 109.5-163.5 40.5-198.5-40.5-198.5-109.5-163.5-163.5-109.5-198.5-40.5q-98 0-188 35.5t-160 101.5l137 138q31 30 14 69-17 40-59 40h-448q-26 0-45-19t-19-45v-448q0-42 40-59 39-17 69 14l130 129q107-101 244.5-156.5t284.5-55.5q156 0 298 61t245 164 164 245 61 298z' }] } };

    var eraseIcon = { eraser: { width: 1920, height: 1792, paths: [{ d: 'M896 1408l336-384h-768l-336 384h768zM1909 331q15 34 9.5 71.5t-30.5 65.5l-896 1024q-38 44-96 44h-768q-38 0-69.5-20.5t-47.5-54.5q-15-34-9.5-71.5t30.5-65.5l896-1024q38-44 96-44h768q38 0 69.5 20.5t47.5 54.5z' }] } };

    /*!
     * Font Awesome Free 5.15.3 by @fontawesome - https://fontawesome.com
     * License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License)
     */
    var faExchangeAlt = {
      prefix: 'fas',
      iconName: 'exchange-alt',
      icon: [512, 512, [], "f362", "M0 168v-16c0-13.255 10.745-24 24-24h360V80c0-21.367 25.899-32.042 40.971-16.971l80 80c9.372 9.373 9.372 24.569 0 33.941l-80 80C409.956 271.982 384 261.456 384 240v-48H24c-13.255 0-24-10.745-24-24zm488 152H128v-48c0-21.314-25.862-32.08-40.971-16.971l-80 80c-9.372 9.373-9.372 24.569 0 33.941l80 80C102.057 463.997 128 453.437 128 432v-48h360c13.255 0 24-10.745 24-24v-16c0-13.255-10.745-24-24-24z"]
    };
    var faFillDrip = {
      prefix: 'fas',
      iconName: 'fill-drip',
      icon: [576, 512, [], "f576", "M512 320s-64 92.65-64 128c0 35.35 28.66 64 64 64s64-28.65 64-64-64-128-64-128zm-9.37-102.94L294.94 9.37C288.69 3.12 280.5 0 272.31 0s-16.38 3.12-22.62 9.37l-81.58 81.58L81.93 4.76c-6.25-6.25-16.38-6.25-22.62 0L36.69 27.38c-6.24 6.25-6.24 16.38 0 22.62l86.19 86.18-94.76 94.76c-37.49 37.48-37.49 98.26 0 135.75l117.19 117.19c18.74 18.74 43.31 28.12 67.87 28.12 24.57 0 49.13-9.37 67.87-28.12l221.57-221.57c12.5-12.5 12.5-32.75.01-45.25zm-116.22 70.97H65.93c1.36-3.84 3.57-7.98 7.43-11.83l13.15-13.15 81.61-81.61 58.6 58.6c12.49 12.49 32.75 12.49 45.24 0s12.49-32.75 0-45.24l-58.6-58.6 58.95-58.95 162.44 162.44-48.34 48.34z"]
    };
    var faPaintBrush = {
      prefix: 'fas',
      iconName: 'paint-brush',
      icon: [512, 512, [], "f1fc", "M167.02 309.34c-40.12 2.58-76.53 17.86-97.19 72.3-2.35 6.21-8 9.98-14.59 9.98-11.11 0-45.46-27.67-55.25-34.35C0 439.62 37.93 512 128 512c75.86 0 128-43.77 128-120.19 0-3.11-.65-6.08-.97-9.13l-88.01-73.34zM457.89 0c-15.16 0-29.37 6.71-40.21 16.45C213.27 199.05 192 203.34 192 257.09c0 13.7 3.25 26.76 8.73 38.7l63.82 53.18c7.21 1.8 14.64 3.03 22.39 3.03 62.11 0 98.11-45.47 211.16-256.46 7.38-14.35 13.9-29.85 13.9-45.99C512 20.64 486 0 457.89 0z"]
    };

    // import LocalStorageStore from 'stores/local-storage-store'

    function LocalStorageStore(key, defaultValue) {
      const valueFromStorage = localStorage.getItem(key);
      const initialValue =
        valueFromStorage != null && valueFromStorage != 'null' && valueFromStorage != 'undefined' ? JSON.parse(valueFromStorage) : defaultValue;
      const { subscribe, set, update } = writable(initialValue);
      return {
        subscribe,
        update: function (updater) {
          const value = update(updater);
          set(value);
          return value
        },
        set: function (value) {
          set(value);
          localStorage.setItem(key, JSON.stringify(value));
        },
      }
    }

    var sampleProjects = [
    	{
    		name: "Mr Squiggles",
    		art: {
    			"1": {
    				name: "spike",
    				width: 40,
    				height: 40,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAA4klEQVRYR+2WMRKDMAwE4TcpKP0cCp5Gkee4pOA3ZKKJCnlIButMRiRHbWtOq9Phvgv+9cH1dRSITogESRAlgN6nB0kQJYDepwd/keD2akqmG3HEsEAtoNNr1eRuXU9xCkQ9SIIkWBnOYpn5Psu1aZxMOkTY4mYCpVDO2QBKKXnz0Cyb1l3WxZCsIfifAsuJhCPYQuDuaNV4qAdL72ld3eYjHryWQPXIcBukWQdBEyvvMtNNMJJAk1Oa9NpxBILXEFiSAwge8l7NFn8s6BgxBZpE+CbB8glf+Zw79/jzTxJa4AMeMqIZTWbVDQAAAABJRU5ErkJggg==",
    				animated: false,
    				frameWidth: 50,
    				frameRate: 10,
    				yoyo: false,
    				gridSize: 20,
    				showGrid: true,
    				selectedColor: null,
    				id: 1
    			},
    			"2": {
    				name: "lava",
    				width: 120,
    				height: 40,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAAAoCAYAAAA16j4lAAAEnUlEQVR4Xu1aPVobMRDdLUjDFeiSPi05A00a0phL5E64CU0azhDa9EnHFdKEwvmknTfMPu1YWnsNxhk3+NOupNF78+ZHpu9O7LNZd5t0pH7V9W/5aJtuOAd/+m7eud40CFMAnBrBidBEtv07x3GDYActOEq32g7nXEW1kgMFB8GE2FIKPhaC9w3ThYIXA0hySM3D5+5Xe1+JEWQ4F/NzAIj3NPetx9Di+Tc51xcnF9bsm6tgtc/sN8rPYqdXcwTB5AjHRjBCtEt0K8Ge57njtxe5ynv68DHvffb7fuScqgipau8kl3meX/NsT3lY15t/TUosFCv21fbneazkQ+M3VQvUomPuJmD4oQ0MgsftzWZhgVgB2HC9c4iGB0MhrNhaH1rLZawor+i5kxdZqazsa14QyqYqGarwIgaW8Ry2NQfvil9aP2Fr8cNYsg3f1Q4PyFaCgmBSZuNFyxyCpwhM8xl7Jjhx2CNUdP1j5rpGbC1X/X24yrn57NfPYb2bx8leu1XBnn0ohjwFI2fVFI6awPadGSjcJDk5HAq+vr0YINmCn1U1K0zxXOV82W/Dz87lCML2gscgWOqQQxBcOImQmMfXg5jwPRMt6eLp4aoQiCUXITopOK+xpVAsc7B4btokfd5d3h/FbVc1B0MKpDhVmjxnRRd9Mt0BeznZzcEOfgWRQo4tcpVwGcwtUiIPdUI6m/1uwqk9x8gZihwcBI8u+ZciWIkU9Y5wT6QJeaO+1zirVSocgXvkvCbNKdokbNxaFXOOfHo/KP/sUvpiyVGci7XIoBwGD1VgvVxI1S+UyTkVB4biPktkQt/O1Tbmu/YBINnfcwAPP/3hgMOqIXlE1MbkeBPiNRJZ/Iy64RBBMDnKIQkGuah2szMnxSUSU5FmczAEAlUKufCvmkBUqKrAm6GKLpQgDTkUiMIBORoLqWI55pOCtfCQ8TvZV/tUunpj+2wIyluJh2MdbA+lFvY5/S/OjfdRHfO6RVso+HQN+NmiK0U6vf3zfrEC+aYbmYvfcxXdYGDGk3J0EDxc2bYQrPituw6pbBI/W0ztKZBngmWnwmMR48UBVKAYxwA/x7g3H/vJXyi4yL20jyqe+1OnulR7PZU49rGisU6R4x37OBLAASbzq3EQFFsFzg6+motlAuMXBL8GwcirnM6mnHBPgQyN9sSHPQOvcI7GuPsDecXAjp+LMrl/ZRPDPkGkgl8QfOIOWBRZHPu5yq3F/FruKKrVqfBhxyo1QNi3HcAgmIqXU3NADdFFTqM+VatCro5r1bf3XMbRT3+Xxh7VNNsT9g33FMxDDb8g+MQdUP8zwL25cW6c+C7UzYVOv+z1mV5GCfsEGbqQqpUwQfCJO6ASXPOEVmWx0jzlaS7hCOHk/rBvnINb8QuCKw4112HnOmJt/X0FsjfBfCD9HyU8QBsyE8i5QLW+/7/ZFwSfuAMuTnCrkuK9l0EgCH4ZnF9tFyX4x/luNnz6s32et25tHq8a9o0RacUvCHYcuxVAwH6sDth/PZ/+PXg3PcesY0MgCD42Rha2ZzbBCF27hqSF7S+WC/vGkATBh/Y4Wv+lHfAfAS8LIP8BA4kAAAAASUVORK5CYII=",
    				animated: true,
    				frameWidth: 40,
    				frameRate: 5,
    				yoyo: false,
    				gridSize: 20,
    				showGrid: true,
    				id: 2
    			},
    			"3": {
    				name: "dirt",
    				width: 40,
    				height: 40,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAByklEQVRYR9VYMU7EQBBLaopD/ADRpovSXkfFK/IEXsQrqO4JER0t4gcIXgBiJa8UJ5YnOXQaromS2914vZ7xZNq+77+bpmmOVy+/l/o7fXSz+2EYZve4maZp9TnGq/9XJ608bNMDHMexMHj99lTwf96Ns304BhxT9zevIbL4vZjUpgfYdV1hMOuvTQ8QR+y0Bi1BK268OhGnWZ5XNehemA6g2ykAc77k52odNR8MYp5kMA3AvUGCDSB/snaYWaVJJZ3K4L8ByF4b9VgnBdaU83BmtObB9ACxMxeFrD3W2sPhvSz1/HVbrlGG1fsXTpIO4OOxKV4cjbqoZ29ljtcFUW16gFxuOSaVBlkazmmYMeXxi3owHUBO1Hu147zVVdaKmEUUpwfI2nDVCMZDQ/BmMOKYdR5tK+o0ABlI1PqiedGNU9/dCy9GkZAG4LmJWu1863c2r4P5ZzvJxQCqipjzl0vk0SzgNFk7CzjitADhJI4plW62dr0cc/yeGsVpAW6NYlelsIOorlX0m2dzFF8cINeD0TrNeSiY3Ft81ChODxBRzDt1R4kdqt4MV8iuqlHWKr04HcC/6udFOwmqt8N15e56MJpwVasjCvAH2NYWTQ4Y8xEAAAAASUVORK5CYII=",
    				animated: false,
    				frameWidth: 50,
    				frameRate: 10,
    				yoyo: false,
    				gridSize: 25,
    				showGrid: true,
    				id: 3
    			},
    			"4": {
    				name: "grass",
    				width: 40,
    				height: 40,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAABjElEQVRYR91Y2xHCMAxL/hmBSdiDATICkzACA7AHkzAAH/zDtcTtnVph53Fg6E/vaseRZCVpG8MlPMJw7UIc73gdcnyfA5gncRnH8iTO8s8w8fGFJ/4OwFX5Vh4iU1SO1Skdl/NnBd0CRI8hUMacERIPStyqHMmLwT1AWcWlSjHvaXVEYS0v1589aByw6Ky1pUjION/cYusiqZyotLzk/wHAa+ayrdWgbZyuoFuAvYFJPRQUOwPzcgXdAmTAUAHNkxpBjJP6SwXdAtQUssY1ZcWDzJMSz3VmBa0AoMDkea2luDiaAbLtSxTSPMSIMKCkLlfQDcB9/uawbvhs37ISss4zvc38HUBNAfQSOzm0RVKt4M8BJPteuqWRyul+0ii9jcdQ6kHtsM/xbgBTSuOfhVKmafNeIS3OZMNx0T3A5hZrR1+TA4d/M60e9Aaw1ltWIRceLFXQPUCrErV5zQrWTmwd9zWAtdbot4oVidwDtLZY8oTQxxSsBmg96liLej9HIuazuDcQfDmR+gjwCRzB4dFmpz23AAAAAElFTkSuQmCC",
    				animated: false,
    				frameWidth: 25,
    				frameRate: 10,
    				yoyo: false,
    				gridSize: 20,
    				showGrid: true,
    				frameSize: null,
    				id: 4
    			},
    			"5": {
    				name: "bouncer",
    				width: 40,
    				height: 40,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAABZUlEQVRYR+2XUQ7DIAxD18v2UL3sJj4yRVGCbZhKNbGfaYOSR0xMerwe/jkezvfagLMKfTN4XdfbFjvP82i//fdsoNHnJYkNugWLG7ANxs21ufafh2z/MdDUJGYhdU5UrHp+GaAH8spE0A2IpPdnN5u7NIMIrgEvAWTALJsQ0NuJt4zKK6PdRNlYe+kCshaQnZkMMPqgAplmkJHAb0I14J6tSDYzAzFbvfQZRIFmxplMwiKZAUDPbkCUITT+kwxmbZW3jdGekYGDNwm7iGWKaXLVNbtFwvhhT8bKtJH0fpyq4uiHUdas07au24Ipt4cMqOy4uv424EwW1cK4TeLZIoM2syprMIPVO65SvaNFQbVbI9JkJs0YN1IJGnXWDVfXHwo2snHKqFFgZVyFvB3Qbhj2jP4fYFXhyp2rGLeUQfb89KpXgZONWnlfzt4I2XMHjZqpygogyxCb+SyuJDEDXs1RpbV1PlNceDjfQ4VUAAAAAElFTkSuQmCC",
    				animated: false,
    				frameWidth: 50,
    				frameRate: 10,
    				yoyo: false,
    				id: 5
    			},
    			"6": {
    				name: "mr squiggles spin",
    				width: 50,
    				height: 60,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAA8CAYAAAAkNenBAAACPElEQVRoQ+2YL1bEMBDGU7ucAtQ60JyCI9Th0Uj0onEreRwDgQaHglPs2vJoM4VMMpkJmX3bhOBok+l+32/+pO1MJX9dJTpME7I0ko1II3IgB/5Pag0PZoiZ2F1PnY9bR8WA/bmgWCLcD1y8ECwAO0cJTHUY4nj7Nms3E27eo6aTN6sTQjnMCZXmPEkEAgCZXCLFCmEdsk5J13Fk2DjCWvFqhA28dCEJOR+dKxyBP9/frKetRK3MRKoTIpgDI5Hdx6tj7m1/Mf5/t3WvpxLAcU7OprgGiEBARMYjUryQBOccIlok8PMh7v3zfGcynZgr7FkrILBOISB0dXoehLr/fIvC5vbNNWLs9wVirmQTKVFIsFthIZ21ZrDTRkqE2ud1LehWqFZSiBQuBOXk7uoxmPNcrlOFwu3Tq5Hihfj9Oppa3Bz65ey4FJ8MqP0eEVgorpHihdBvZAclsrJnqj06w5FEEEK/axUvRPhu/P0JKyXHudoBErAuQgSWBEfGz8VqhBDdgDs04vs9vD8QKJ6I65gEXsbVSkqNQOxoalUjhKsJuA+Ct6hLJc8Tu0GdyHKE8LXifEWRTmipQD0i1QnpXybnt5fUUV91nghICOeI10drETK3F1LQcb44wrs7e9aSk6lECF9DuY3K3c88j39npwIUK4Tyl+5qOkTAMIhGPE9OpHgh8uKPExA6OwdJXM8TqVaITuYbgx3HcRNrL51IE6LlQDjO8Ygo62pClA3NDteIZFuoHKARUTY0O9wXeJm8TNgIPosAAAAASUVORK5CYII=",
    				animated: false,
    				frameWidth: 50,
    				frameRate: 10,
    				yoyo: false,
    				gridSize: 20,
    				showGrid: true,
    				selectedColor: null,
    				id: 6
    			},
    			"7": {
    				name: "fireball",
    				width: 102,
    				height: 18,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGYAAAASCAYAAACpbKu1AAACF0lEQVRYR+1Zy3HCMBCVqsjFXFJOcghVJCWQEkIJpApyCA3hS6pwxuy+Ba+1I9lIhjj2MMNg/d68tz8t3g18jnvXtEtWa+dDS49PNK6f6kBv/OkTfxoX3ie+Mm1GKo7YbqX4SCLpElwpIDECMJ5LsLsXpmnIMr0nS8bv+ouoqF7oG7/hKRCoWjNl7CeYByKx3n2qfQ5dzxmLQ4TaVHTAtia8+67UpXHk5sOPJSQ3kLE4ZiuMDiGWx4h9wzJjseeRLBdP/cAe+MNv3ujbCilX4/jg89lTBQif63YT4cDBA/no5ZirCRkJJLuBzEUYK6lDKE2c5KRNFazCnLIQ08GU5yTjeOecEvPckQIl4+DzC/BBO98BkJP3JuP4L8LA8MxQhgkWIbBMzEMVpnMLxl9hauFcY+LQ5+NcvJ8KR3k+urFgESZcxuvrg7BWylB1DkGsxMFSFvN9xqWGEKMI6KUEVEkqU2XDYeUYAMH5EjK6CLPhGMiH3GOw7lZAdAMmG465CBMrcqybfc/VYzlGW2y4tjPhzB1Hz2MWYWIMdMdLGUjvgqnLVclBOrdwT8pxJ8Bva+q16XuNdZ+J3Pyz4dChTOeUc3EY7parbvpUfCzC/BVhtCPHymerCy376F4VD6xUd9kKIOb/O9/nFfXzsPBzOTsVhxRt3I23yudcfET/j7mVMJYgji+m0sZvW/yWMO1cwzBA9L0K8wuXAychTgUiVAAAAABJRU5ErkJggg==",
    				animated: true,
    				frameWidth: 34,
    				frameRate: 10,
    				yoyo: false,
    				frameSize: null,
    				id: 7
    			},
    			"8": {
    				name: "mr squiggles moving",
    				width: 250,
    				height: 60,
    				png: "data:image/png;base64,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",
    				animated: true,
    				frameWidth: 50,
    				frameRate: 14,
    				yoyo: true,
    				id: 8
    			},
    			"9": {
    				name: "mr squiggles",
    				width: 150,
    				height: 60,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAAA8CAYAAACEhkNqAAAEE0lEQVR4Xu2dvXbUMBCF7RaeAqp0UPMUPMJ29KkpqUNNtyXPQUENXarwFKHdnOO1vN5ZSTMazcSyfVMm+rtzvxnJWu9J3+EHEXCIQO8wJoZEBDo3sE4/utM8vv0Xv7k8fYQOXXQBFhM3gNUYWHQ5waC1Vq6gBzpkoLlVLIAlM2CpVt4J8mpgIeOXQig/rxdgAEvpt5chyuWou3npmMCih9SwUuszkZcQWhFppKEjzp6XHwBLmetehmwlQdit0DqA1uNJubCe13q8rekAWFJHSTuAlQ8cwAJYwyck1mdQgAWwlgHL+v5pqS0EOhZ6KuQS1woIq3G49ab+bjW/1Thb1cFuhamPZmrvuVoxBjrOEbD2A2CNZGkPr9aGlFYwq7cvrHUUg2V1VrEKSKkRqQpcC1Zt5duaDoA1vpAIsGxfzFwMLKvKt3SmQ0fcAYBVWbEAFsCKRsDq0Go1jrYCW81vNQ4qFirWFctLgnX17Rtthin6qZMgMRd0KEyYdcn6oTELhjgaohi6ST/UYD0//VHEoLzL2/cfpyui8t7ZHoMhVMfXwzTf0Pnb0Ubn3nQALJIgACufvtIEMQOLGhKWx2V8ql/o//3XJFSz1lyUripWWAddb+r3dODWdUirvZUOjVmiLQRgXVu5dIKsFqw37z5E1/7/39+sJq6ftPRKAzdrF00Qbj2pebh+regI60/5YqXDrGJxC1q7IVtJkPbAerg7Z/jnn1FGAlj9iOppfAiWGpLqN2X6w9153vtHTTJc1lyoI3R8fpJV3tZ1cL5wPkr9kJtUaAgnIBhmJUS8FRbqAFjnCIQCYQfWaER3/zhMkLq/ct8KayvWTnWEChoShEt4zkeARUsYwBoisjqwuK1o9lSUrXx0HGmGcPN3QrC4cdaiI1V5gr6elDLpJylSP/gz1s4MAVj5CGwPrItePhlisWklQXaigzcJhlxhWr0VAqwxAhewAoTRG2tuC9H+nRrZaZ8OoUNrQTaxUn6UVCyAVWHN3hLEHKzD5f2pIhuOzPtd0kNjctLCigUd+ffQOD8AVgJogNUoWFwFCpUlGMi1v3k74LYC5SuksmJx64KO8T+OkPi6VSwYEud8LwmiBiuETXpjW3TgijT2MgQ6dM5wfgCsMa5IkDLA6sEK85GL0tfK9JvH9K7yv4hBRxlBpLXUD75iAawqI0JnqSHiyRpPEA1Y5z6H38t8UfL4Sb7mmEv06RA6xCxHGyb8kJsEQ+oMoL03niBysGhgQqbXBkhql9d8XuOmdHnN5zWuUgfAaswQaZ7dtGtMB8BqzBCABUN0DHjFzWtcbIU6n6enW5wVywLIgIytsLFML3N31roxHRqw6P2VZgxN/KzntR5Pqsl6XuvxTHRooGhSiDQas3bQoQiaNH4vWLv+eYla30YAAAAASUVORK5CYII=",
    				animated: true,
    				frameWidth: 50,
    				frameRate: 8,
    				yoyo: true,
    				frameSize: null,
    				id: 9
    			},
    			"10": {
    				name: "health globe",
    				width: 40,
    				height: 40,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAAk0lEQVRYR+3UsRWDQBADUSjNDbhYN+DSTAf+gZILhnTeHmJu0X0d/tyH57sKuN5QBjO4Gljn5x18f6/fvxCf19YUBcyglrwdlCHxDK6GNC+uv5w9qCtUAPECypB4BmVIPIMyJD4b1AtUQwqg89mDOqCAMiSeQRkSz6AMiR9vUB+w8rkH1wCaL6AMiWdQhsQzKEPiDyouSCmXQVhBAAAAAElFTkSuQmCC",
    				animated: false,
    				frameWidth: 40,
    				frameRate: 7,
    				yoyo: false,
    				id: 10
    			},
    			"11": {
    				name: "warlock",
    				width: 48,
    				height: 78,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAABOCAYAAABmKpU2AAACYklEQVRoQ+2awVHDMBBF8YEOaIOZpAcuFABHCqEACuEYCuBCD/EMbdABh3BaBn68+X8lWbEccYzXYf++v6tY1nCV+LfZbA6RW8dxHCLxamzylzYnwEv49Xp/slhP39uT13PJyASaE5CasOpdJJNKwiWwOgHM62rlMc7rEZWITKAZAWw8ziXEyER744hAswJY4ujdWiRYL/wSaFaAl7in3OJrETDyXj7D6gQwz9UigFNJJtCcgOgKipar1QsugYsTYIJr9QJbmeXnASR1MQLYE1nUwtgLsxNYvAC1gvuPZzV0Mm579zL5eTYBNavFCshNTC0AxhmRbALNCcCVuAtI9FCyhYzAuSpveruATiDR+9UshCtnlBi7f/YeYAkwAOz+LoBZglVw8QRYgrnXZ7dQboLs/i6A9QCrYO716gS8JypPCCtQF2CVY5XCpV+NZxbLJtCsANyZK1VRVvH+TIyVx4rUJlGsB6K9ELWKF58twN4L2NZhKoHo+oCCwvtCuCvdjADvzUypzVv2asuzkkxgNQLQ6+bh6LsytN5w8ygX8y8N+SZvQ2vxAtheaCkBR9NFJEIJrEaAN+c/7x+S1iZ1/LLekAk0J2Au6xgu7/3v4Ws3eSLYIyGfmSs1PqsLsPl++/72z+up0wcbxkjgSqySoASaF+A179wEjBSSwF6gBJoTwKaPzX3zbvQ3kNcD9nn0Vyk9N4oEugBn3famEVvmz04A14XiFmIVyO2BLoBV2Lte+shZsR5QBa1GgCo4Gqc2M30eYBaKJqbGFxcQPSSuJopx0f8jE4h+cRcAFcg+O71UAj+9o2ARuXznUwAAAABJRU5ErkJggg==",
    				animated: false,
    				frameWidth: 4,
    				frameRate: 6,
    				yoyo: false,
    				gridSize: 20,
    				showGrid: true,
    				selectedColor: "black",
    				id: 11
    			},
    			"12": {
    				name: "warlock firing",
    				width: 48,
    				height: 78,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAABOCAYAAABmKpU2AAACVUlEQVRoQ+2azVHEMAxGyYEOaIOZbA9cKACOFEIBFMJ1C+BCD5sZyuEAMwxiBmW1+iQ5juWEG+Ds+ulJ/ok9XDl/xnH8sjw6TdNgaY+2dX9oOgCpw6/Xp4vBevo8XPx/1AxsIB2At8No7nIzXhOige4AtFxHI8/bSTWCGoENpAHQhselQMiMtTZmBtICaB3nuVvLhFYLfwbSAkgdl8ipfS0DZF7qz9AdgJZztQzwUQk2kA7AOoPylKtVC6KBzQEQcK1a0GZmeD/ATW0GQNuRWVOY18LiBpoHQCN4en9Gm55td7h7Ofv3sAG0V80CRDuGBoC3IyNhA+kA+EwsAVCESgHyz3Mb6AYAjWzUhPR82MBmAGj0sJrQ2lczkBaAz5xoynFg+p0/v7iBHYCtfXYDfCdmzWnvmkd6bvEaKN3hYos5WkrsBoKKqqeQtKOSODTDO4A0Q2qjBhpZtJ15R4buB6RRA+0Y2s4M0Mp84K6B9ADSgYimPDhqzh53G+gGgM4F6NWh14B1fuAqzEXM30qnAZBOZkq9vNWOtqQagg10AyDl/sf9g2mgiabecPP4E3yzgXQAUurcvh3/RbxZA90A8PPgUga8ow/pV2tAOo1sHkA7kS8FQJH0mnDfmUsDIN2FiAJQ5Gk+WMxAtwDWmVSaJ1Yz0CyANvrw3EX3AZoB72ik3huVaqC0gdUASt3Y8tZC2EDzANoifwf4jVCxFNIizl9sNWdgcwAosLUdujZS9wPSF1tvu68OYL0kbu0wry3+fPjm7g4AKrEGCq4B6weD/Z01s37PNymLdhEkT01IAAAAAElFTkSuQmCC",
    				animated: false,
    				frameWidth: 4,
    				frameRate: 6,
    				yoyo: false,
    				gridSize: 20,
    				showGrid: true,
    				selectedColor: "black",
    				id: 12
    			},
    			"13": {
    				name: "ice ball",
    				width: 34,
    				height: 18,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAASCAYAAAA+PQxvAAABMklEQVRIS81VsQ4BQRC1LVo9v+ADdFqJgspXSM5PXMJ/uEKi0FAINb9AoVNoqFeYeZfs3I49xXHbzO3ezO6bN29nTeXLMbDWvkISY4w3dH1//8+MVY2WZv44/2YfwBUGxHKGhjPEfMhg5mwxBxMpoDE52ClZ+CEXxJvllZaqVbLdukOCKQ0QWQWNEcOZN0f5RHW+MAPsPug13l8JmNnSHJrJaOTvQDQRApjkAZpqHugWySEZUXlkZlJGSgMEiLXS4H/r6M/t1HbXcUsy2mA3y5qB9nJrpHAgUgOoPQ5GydAPNEY0DQS1Ao2UFkioS2idU3bikEbSczRG/gZEHiyvMUo32bue8YLmUZ9s3KFXNdq5fSW+uR1WMqF21tIAkQyF+or2SmOfZPPwV1u+viFN/ArIE1z774tx1Q78AAAAAElFTkSuQmCC",
    				animated: false,
    				frameWidth: 25,
    				frameRate: 10,
    				yoyo: false,
    				frameSize: null,
    				id: 13
    			},
    			"14": {
    				name: "mr squiggles firing",
    				width: 50,
    				height: 60,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAA8CAYAAAAkNenBAAAB80lEQVRoQ+2aoVrDMBDHW8ueAtQc0zwFElmHRyPR83OVSJ4CDQ4FTzFs97E27XJfb/9cuWvXNFPbl6TJ7365S7ZveRbJK4+EIzMDqXZZdRqk/NFurr95Eoh0SzpDVmbMjFDQaEAcmBXQaEZGA6FVxk2svafNjUQDwlUh7QhqP6/dOaiMak+s/bwEggyi9smMaJfNBAJUiw9ErVuttpnlgmjljJbZ4PJrdVBGA6JldnIjCYTZ6+KqpR1JrTI8BMT7dQRdSRTbz641gey/P7xgPxcb7/NL6bcjM9z41U37XBsj0YLQiLsIIzOo3+hGogG5ur7tTYPfn8+z6YHGjW4ELYijQeP0Qbbr4/mxv3/tXZNbUN7Ulqo5bUKNcONakO26nvfpq7d6hZ8jSwOhukKNcOMmMzJ7EAewens4vqW5dJK0dTu5GXDFABpptrxajswOBN2ZuKqmZoQuoKliYiPzB+kI6vOE2eNcjqAAwBzpOvjBF+fI0kCK7vuDSEIJqhi6qoTnSKCR6EBQhF1cHDjqP5kRtLCLAXELCT2hRQnT09nMSAIRqqE3Au6PQIOr1lhGLEFqhuJ9ml8cy7t/fkOkWyI6ECZCwlTA3V3gzIwkECzB65GMoICBCKHh4vZkhA8ZPT+GHKpiIVnm/4+YnvBDFnGRIAdhW4cgbcICJgAAAABJRU5ErkJggg==",
    				animated: true,
    				frameWidth: 50,
    				frameRate: 8,
    				yoyo: true,
    				frameSize: null,
    				id: 14
    			},
    			"15": {
    				name: "face",
    				width: 72,
    				height: 43,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAAArCAYAAADbjc6zAAABn0lEQVRoQ+2Z7W3DMAxE7Qk6SDbJRp2gG3WTDJIJXMCoUJsWeaRoS4Vx+RMgsazD49OXPU/8mARm8rEJWICWk+FlizEkDwEBCyCgr+WZEulz/tbaR41aDeqdh4D+yldlUfuxWinNhGhFK/dBJg3NQ0DHKWDHJAxoeb9WKeePx/odNagYHTDJNOjqPAT0WzGtYFtA5irROgehdpv/ZbFOzYNyVMxe8xCQ2MbIgrkBtW6GSofaXNFqUDQPypE2KBpIdkhACkE09nsbJGPKVXjYENOC3Q6QcbbaMfDuj7KArs4TnqSvDrSh7DqcXp3nAKgE9Bogh44MjO6DDEJ5Snutn2weAhIVtibpcqlL7dZl/6yzWLZ/ZH7ZRLvPYr0CVfoZWjAVEBr7rcACp/id0aPyEFDD86Bq5bIVbDBHSlp9q4FWSc10bx74TBptzb1DzRvIuN+/A+SqoBfQ5jr0DNp7y7Pek5l5ImG7BPLSmaapS54IoED2+1xKQKCWBERAueFOg2gQDcoRoEE5fpyDaBANyhGgQTl+nINoEA3KEQCtfwArQTY7cukYLQAAAABJRU5ErkJggg==",
    				animated: true,
    				frameWidth: 36,
    				frameRate: 10,
    				yoyo: false,
    				id: 15
    			},
    			"16": {
    				name: "pew",
    				width: 18,
    				height: 16,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAQCAYAAAAbBi9cAAAAVklEQVQ4T2NkoBJgpJI5DEPAoPb/Xv9xebeScRtOH2BI0MUgZJeiuw6viyoTt2H1Zft8Lwb6GoTuEpAL0AFRLsJnEK6YIynWQK4i2iBys8wQyCLkeg0AIn4sEfY342wAAAAASUVORK5CYII=",
    				animated: false,
    				frameWidth: 14,
    				frameRate: 10,
    				yoyo: false,
    				id: 16
    			},
    			"17": {
    				name: "pewpew",
    				width: 18,
    				height: 16,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAQCAYAAAAbBi9cAAAAXElEQVQ4T83SSwoAIAgEUGffyTpwJ2tvCEXfRahBruPlNIGcBk4OOUIxM6VgBkECjaNEd0hQBdYjrZvdtlAv7RDzHPEWknMAHkDmaCdA9diu9Ss2WLsw/+gG/gcVmNkeEUX/YsQAAAAASUVORK5CYII=",
    				animated: false,
    				frameWidth: 14,
    				frameRate: 10,
    				yoyo: false,
    				id: 17
    			},
    			"18": {
    				name: "smacker",
    				width: 48,
    				height: 58,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAA6CAYAAAD2mdrhAAAB7klEQVRoQ+2azU3EQAyFSQccKCRbAhItQOrgGAogR/qgBnrYSLTBgQ4WaYVX2rfrPNszyeZnuKEZZ+b5e/ZMAtVd5p+6rg85H9n3fTX0vMHByEZmK8C7sf3XW0T/KWb39H41HomYCaxGQGpmo1iESDKBxQlA6xQBQQ+FLSQEWOa1rpErrghgmQw6wxw2OgHzToITRxeANeAlxuKLAJZRlkHmHBZfCDACLMOp46MTSN0giy8CNmch7W6kWYUlaHILzU6AZI5lihVjdDyZwGIFyMat7wXRDLO4MIHVCbiVlbIRWKyAXFbytlesjfB3odUJYF2DjbOvzixexs3fRpGAdQFt3mQCDj+fZ9/7xcP3H3uXht/X3XG+nOTVw4s7edcWpA8pAv7ThgQwm1EiNyMwugC0jiz4+P3s8r5MZgROXQVqQ+5gWtGrBFYnINp9kID8LhnVEiXrNU0zSNxMYPMCkAR6WmvXsyEwmQDmSe8JjAaWbqR1FXzzk/Oh67qzG0Hbtkf7X9TA6gRIBiQzuQhgN8K/hiIhISCZV2+jSKAIULo41gI7cbXDgNZAbgJaN8omQFOaqwZYO/VetOhtFN/EUou4CABE2yPg9ah1fvQl303AuiHvvOwCtH8xiy7EuhuOW9dRCRQBRg+lJmrxBP4AU0wqqWUAFWAAAAAASUVORK5CYII=",
    				animated: false,
    				frameWidth: 48,
    				frameRate: 6,
    				yoyo: false,
    				gridSize: 20,
    				showGrid: true,
    				selectedColor: "black",
    				id: 18
    			},
    			"19": {
    				name: "smacker attack",
    				width: 144,
    				height: 58,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJAAAAA6CAYAAABfwdAwAAAESElEQVR4Xu1cwXEUQQzEGfAgEDsEqkgBHAdPEwDHjwCIwMRADnYVbzLgQQam6u5kWHFySyNpdn30fXdmtrfVamlmt+7iRfHv8vLyoXLJ+/v7i8r10FrEv2QI8V8eHAYgFgAk6Oj12fy7BRQFdvftQ/TZF+Ov3nw8OR9lhHVT4o+Fw8s/BWTwygTwJXBYQFliY3nwZ7RkRNaBiH8sAhb/FNAYn+FZ55oAUEC6d7AyWNfMaKaj+aMBIH6f1kf5p4CO/CICURjQ/HNNALeARh0FzRNiveOiPZA4EFpfCySKC62fFRBafy38FJBhLRTQkpjhJno0g+X2ViC8AdLrzHIg4qeA9gwwAQ7nOboEViVwWQlDTeTaTSjqIYh/eXBoCU5XAAromezCtpoAFBAFtGcAOXB7E40AsIQdSkTXJmAt/sscCAkke332OUoWr3Uu0yWgarxe/BRQN/OqRFJAkwj3ZgCCk93Go/W918/VQelAXgUkx1FAwS8MrS/arDh4t6mzSgDxr3wSzQD4AoCMbbQEz+LfXcLkQZFTyLjoUTkiMlsCiB8x/PT19DkQA9ATALSq94M4a9PhTXiEY1hAsvColSJg3uujDkT8XoabHIgB6A2Ad/WtJjDsgbSAoqXMSxAaV+VAxI+YPn29rIQxALUB8K422gt510fj0gKqKmXR7aV+sOg5kJ6fLQXEv/yvAncJo4AODFBARQJCloeui5M8/Py6+DcPHaCs41gOhPCh69W40P2sXtQ7r9rJZb1hBxoFLvMooDEGo38SYd2lKgGggCyHePn5LsTAr/dX+/Heg63srkvAdeO/ePUOchgiSg3eOn748N0PYJFLAR2Y6eY/mwCbEVD2QSwhdgfgsRdocqJu/FneKSBnfUElOBuItRIgi9sUkFa+PODr72+dlC+H6QBkgSMQ3fit++vnkqY32rTOwp+NAwWElHi8jhzIKmUU0JEZaWqjuy8hVgKgt/HO+IWHVfUOCL/lFMLX9fX1k9hvbm5OJnE3ftkNT3MgCuhwDKETgAIy8qM6A3QmR3uCqAXNxm/dbysOpPnX53GjTuTugbIORAGdToFZJWyagJAlj/ZAswS0Nn79tl8ye7fbLd75eYUjvFUnsJazOOXt7e3+krdC/ONAawcgWqr0+LXxU0Dq7bhkkBBT5UBduzEtoFn49UtOncHiQJbzCB+z8Usv9OnLj0UuIpyPxxYog2cFIOs8awVAhEIBHSPQnQHdvdBa+EcPDGcnsObf2iVu1oEooKe9dnYClAvIeryqHqhbQMTvawbkzQAF5OPr8d9as5uAc0sACogCcjKwHIYcSEajXgh+DyQLsYSdDoD3wG0oyn9N6uJ/9FWLuY1HPUSWCGt+dyCqPkYn/iUDYQeigE4z8L8mgCkgK2Orieq6T9e6Wj5d9+latxo/BZS01K5Ad61LATkD/lwCEO05t1YB6EBOQc4O9HNJgN9JD3KVCkaSuwAAAABJRU5ErkJggg==",
    				animated: true,
    				frameWidth: 48,
    				frameRate: 10,
    				yoyo: false,
    				gridSize: 20,
    				showGrid: true,
    				selectedColor: "black",
    				id: 19
    			},
    			"20": {
    				name: "mr squiggles punch",
    				width: 120,
    				height: 60,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAAA8CAYAAACtrX6oAAADlklEQVR4Xu2bLX7cMBDFvbQ5RYrCWtxTBBYuKw8uLE5x2cLCnCGguGVB7Skauv0la7m2bHk+9FYaeSc0o9G899dIVuzsOv/ZtAO7Tatzcd3ZAB+/dcexv7tP55vLAkereh0waHVcHODYt2DA1js56Lai92wd7IBPR1TtBV0MsLWVDdqZyTS1O9kBk4jyAswAjh8Sgiz0FlNbcLyTxPi2pnfoYAd8Qr1ZwKmNCN1x6Hx5G+h8NLo+dD6pXvIMRheIzicVTMWj60Pno+qfHTnUAHSB6HxU/dLfo+tD55Pq8Q6OHEMDQeeDA0bfX2sL5hqEqhOVh1u3eIt2wHkvSZoBnLo/aq8VtYVzOwL1EqGWXvIMjo1oXTAX7FYWtBgwastGLRQpMG18bgfW0uuAmcQdMNOo1JavPcuV04qH5QJG7XzSwqt1cC3BUoPQdaIWCleHA2Y6hQKDysMsW3/HQxWKysMVrI1D1YnKw9Wh6eDJ15LciQBxmloB006/DkUkZOaA6NUkccBMQplhGjazKTVJXgH//f0zs37e8Ku370OgplbeJOtRTevVmNa0YAXxpvXCAH/eD5028fDLYb3TU+NCkq+PQzpNrQqesyGLgFvRqzGtacEK4k3rhQF+c/1u0bvnP79WPaXGWT2DqbpToqlxaL0OmG7pxQ6mQLUH+P7mJPT2+2LtQfCuXzLH/jLF7eDUuGFF39/QKKiIuyf+grasV6BjG4IpsOH3AmO6iwHcC+3unl5tSt1/zW5Zof6X4jmAreqV6ugXNd3BVgVzu1ZqjFW9Uh0owFcPHydWp87o0dPh6k4Qc8t+qpQaQwCupleqwwEntgAHPP3LVMEVXeZv0nYAQ/Rmn8EOePnaCDiSCgNmPtSkzmDm8FlYbNTLf3hqc7HGjc86xgDremmzNiaYZLYxvTTguSOrr8/2/9/fkl6OAw7E++Xsp2lRNZPgpvU6YBq8Ax57FDqY6sgwhhtvvYOt6j1bB1sVTDfsLILVwVb1qgEHGy7g26zJR4at6XXAdEs7YNojfUTxe3Di1lBqx0LrNd/BaMGKpVa0g9F6NYBPHu1/1PkA/vBBX7OC7jCkUb16sxoVrGbcqN58wKU6Khhcar54JZSeHzSfA+a2NMhw7nTDEZi5oB0w13EHzHVKGVfaYN+i+6fozC2EjdsBs60aB/oWzbWt9AIDzacBHN9/NTm4to7jfF6Faxo4brTCaMUQiM//AIeB/FtVqs9SAAAAAElFTkSuQmCC",
    				animated: true,
    				frameWidth: 60,
    				frameRate: 5,
    				yoyo: false,
    				frameSize: null,
    				id: 20
    			},
    			"21": {
    				name: "win star",
    				width: 29,
    				height: 35,
    				png: "data:image/png;base64,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",
    				animated: false,
    				frameWidth: 37,
    				frameRate: 10,
    				yoyo: false,
    				id: 21
    			},
    			"22": {
    				name: "warlock hat",
    				width: 48,
    				height: 48,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAA7klEQVRoQ+2UMRLDIAwETZH/kA/lcflQ+I8LpyIFGYHMTsjIc27NCd2tRNqCfyl4/5sM/JugCIgATEAjBAPEchHAEcICIgADxHIRwBHCAiIAA8RyEcARwgIiAAPEchHAEcICIgADxHIRwBHCAiIAA8RyEcARwgIiAAPE8mkCOefjzO2llOm7evdMFw1nwGr4eXt1QTz2e/c/JeMmEM7AbMPevWjJzJIwCVzOwGjWvcm356wd8RJxEwhjYPQ8/spIJXN2N74IhDUwaryd3VUkRrvwIRDWgNW45byeX0Wgkrf6SZczMJq5VQTaV8nq6w3H+28x3TvzhAAAAABJRU5ErkJggg==",
    				animated: false,
    				frameWidth: 25,
    				frameRate: 10,
    				yoyo: false,
    				id: 22
    			},
    			"23": {
    				name: "lava particle",
    				width: 16,
    				height: 16,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAiElEQVQ4T92TMQ6AMAhFZe7co7l7NHeP1rlzDTQY/EpL4mY3Gv4LfIAWeK3lhn82Jip0i22g4rqXV0basvxbyEVDcTp6sr66dihCBDATjyAUFbsQBmjPWLZnpm1HKmBAVGwrYT/+BJAZw+zDJnJidBKPhfq8SFrmbKGGq+xB0IPhMSHEMxDP+QR9ioahgdZVagAAAABJRU5ErkJggg==",
    				animated: false,
    				frameWidth: 25,
    				frameRate: 10,
    				yoyo: false,
    				id: 23
    			},
    			"24": {
    				name: "blank",
    				width: 40,
    				height: 40,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAAX0lEQVRYR+3SwQkAIRAEwTUI8w/1LohCEGn/DVrOmsvPuvx+0wX1hxJMUAW0b4MJqoD2bTBBFdC+DSaoAtq3wQRVQPs2mKAKaN8GE1QB7dtggiqgfRt8X3DPfPrKk/0Pxn0BPVAUFhAAAAAASUVORK5CYII=",
    				animated: false,
    				frameWidth: 25,
    				frameRate: 10,
    				yoyo: false,
    				id: 24
    			},
    			"25": {
    				name: "background dirt",
    				width: 40,
    				height: 40,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAACTklEQVRYR82XvW3DQAyFrQ2CrJBWcGO4TZdBNEImyiAZwW3arBBkAwcMQIGi3+PPyYVV2dKJ993jr6bT6XQ9Ho8HdF0ul/X2+XxO19gFut7agAaSm1MEWDHIAO4GuCzLNQIRAKSegnkQpnTlsGjNlAFWXe+BR4H8e9M8zzcKehX2xpFsGikbHQ4C+lN03FZJrExda2N1sVepA5VtyJ5XPAMBu3AskSwYS6rscENJkhm95/PHB7RZ3HXtPZVitkpZvCeru4fwsboCPqJ6crjHj8GRVtd1m6yv1DzrRV2/UbBSz0bg/DsIloVY28Ud4wzMK8Xgnr4/xmOQ9dyoY9jRLBse3p6/Dr8vyzhgNkPKBnJ9/sybpd1qkbp4dDoR94gC2ZWtSwGzDbrPMyC1pwl700kq3xJooO26LstssSeQaatDwHKvqoSAyFqNxShRUDjtBkSg9p781mSJPl1VMVVW18JejAq2LR/2eVTcKwmWfWy1AL17PJwH92og4BRQezEzjjapJASLUXQo2YO2uvfXwxXVq5HTdktOJQR218EoHtkzve/7OlIRAmpZ8C90SgtTk8F5N6+FOpsHWZZmwe07gv+fTUUbQPmj0wOq8JWkqMRfdFjWnf5djCo9U8C62W444v5ykrCYQ6poZ5DMr7oZ2WFVwitJs3hEEQvi4VGdrYROCCgbshppeyfaiAF2VJe1N4DMQMewV98mIUsUNn7d9GIF0ZG9MhVXMpi5Pytjm3GrEhOyUUdNpozuxWJd74fzYDS/RZNK1Py9YrYqINg/piII7d4f18sAAAAASUVORK5CYII=",
    				animated: false,
    				frameWidth: 25,
    				frameRate: 10,
    				yoyo: false,
    				id: 25
    			},
    			"26": {
    				name: "orange block",
    				width: 10,
    				height: 10,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGElEQVQoU2P836n9n4EIwDiqEF8oUT94AIgkGv8LYav1AAAAAElFTkSuQmCC",
    				animated: false,
    				frameWidth: 25,
    				frameRate: 10,
    				yoyo: false,
    				id: 26
    			},
    			"27": {
    				name: "teleporter",
    				width: 40,
    				height: 40,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAABEUlEQVRYR+2Y2w3CMAxFyXeXYAPGYwbGYwOW6HdRKlIFE8c3D6dEcv+qOurRsfOyuwjPct82Kabm+/pwDhmXDdKCC2AIJAuoDYdCJgE5uPX2QrICxSzP6xGXM/kDmILrCRbTI5AioBZcAJUg5wbUtodY/DJI688APwpzdcgaHGXPM8aA/j1edv4CkEIaILSVkCCuDi3FqE0ziJri4sygGdxX8+iCNHKrs52ktf7MoBk87gYzzeL9ZNvxoi6VQfFWNxKw6sg/BeAoSNjgGZMlB+d5xO6W9kRpBtRMM4Wjd2LWID3Z9IZEwEK5FbeAW1KeAgsgXBOzGFBacGu+F3VY4x9o96mbmuipJafGDjcGgfNj39TbBjjo2KaxAAAAAElFTkSuQmCC",
    				animated: false,
    				frameWidth: 25,
    				frameRate: 10,
    				yoyo: false,
    				id: 27
    			},
    			"28": {
    				name: "gravity flipper",
    				width: 40,
    				height: 40,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAA00lEQVRYR+2WQQqFMAxE6w28mgtP+UHv4Wm8gdJFoYtqJp0I5TNdCSb19SUpTkfarjTwmgRIVkcGSYFJBmWQNcDmqwdl0GPgdy5pnXdPihkb1oMZrqxIyBDAApfB6mdTDxBAA7aAIiEpwDeQKMhuQAQAibGqTAEiw8BOdjegdfKo9/8LiJYOjXsy3m0QGQAkxmqFbsC88dDXTDn50Bd1CzKirHXZqRLXGw39s1CbRC5vazA+Mej5qCc2rMSej3piBeix1YqVQRlkDbD56kEZZA2w+Te65qrBZBa+MQAAAABJRU5ErkJggg==",
    				animated: false,
    				frameWidth: 25,
    				frameRate: 10,
    				yoyo: false,
    				id: 28
    			},
    			"29": {
    				name: "art testing",
    				width: 400,
    				height: 40,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAAAoCAYAAADQUaxgAAAECUlEQVR4Xu2a0W7lIAxE2///6K4iNWrEEjy2IRfI2ddgYx+8MyG331/8gwAEIAABCAQIfAdiCIEABCAAAQh8YSAMAQQgAAEIhAhgICFsBEEAAhCAAAbCDEAAAhCAQIgABhLCRhAEIAABCHgM5OcXlyfGIjwip7UnzyEAAQhAoAMB1QxOoT+2VGOU8jAQhRJrIAABCExIQDWDkQai1jAhvq1Kwsy3Ok6agcB4Aoj3eMYr7IB5rHBK1AiByQhgIJMdSMdyrrdGKy1zYBHiOQQg8B8BhGO/ofDeJkqjYSb2mwk6gsAQAm8Qi7e8iXuN4xioI+Y6A6N+6xoyvCSFAAQ+S2BnA/GKYUSAP3t6f7tna8/Gz8KBOiAAgQcJ7GgginHUbiUHi/KN/MGjCG2VEX6l17vb245zEzoAgiDwZgK7CYElqJa5KKI6y7xYvbbqVH73uMuf2XcWdtQBAQh0ILCTgVjCZv0WstINxOo1OxpWfut5dn/iIQCBBQjsYiCWoKnPjyNbgUn2pqTwsDhYORYYf0qEAAQyBCyRyOR+KtYSMs/nmmvNs7LJmsfRY4uZxfPKqEctT80J+0AAAp0JzCqSapuW2JXPa7+B1HJYedX6eq/rVded8HvzYyC9T5h8EFiIwA4G0urBEsrWJ6sZxXFETWdOr3mcN5nVZ2ih/66UCoG5CKz8n98SPOu5chIjBFvZt7amVy1lngynXjVFmRAHAQh8kMDqBhK5fXhwzyKQGZEv+732lM07Cx/PmbIWAhDoROBTBpIVLuvzyej8nfDLaSyh9vRb+x1ILuSy0LNnJD8xEIDA5ARqBvKEMFiCqGBr5cjmf4KB0uO5xurnagpHTOtc757XbipKLjWfp1/WQgACCxC4u4GMEtBeb7/KDSR6uxrVe2YcLAO5Gk1rnyiTa87yDGfklWFNLAQgIBKwDKTn22VP8zgNxHpD9ghm7/rEI5CWqQZSE/qSQSSXehOSmmERBCCwBwHFQM5OPWJ89zmkRy5FJC2DuXtjz/Q4ciKiot/rdhDdfyQTckMAAh8mYP0VU1leRGCV7/MZDC2RLPeu7RPpKVNvJDYj4DU+mXyR+omBAAQ2JOA1EO8NoibgIwS715v2rEec7a80DNVA1HWzcqMuCEBgIAFLzFtv8NZf+qz6tj8Qdyp11ESicednQGtGUk0RDAEIrEtAEQflM5BCQNlLyfPmNZ4f+pW1rRsGt483Txq9Q0Ag4BX1iJl49xDKfv0S9Rwy7DGQ148ZACDQJpARGNjuQ+A0i8znrn1o0AkEICARwEAkTCyCAAQgAIGSAAbCTEAAAhCAQIgABhLCRhAEIAABCGAgzAAEIAABCIQIYCAhbARBAAIQgAAGwgxAAAIQgECIwD950pwpTDmYMgAAAABJRU5ErkJggg==",
    				animated: false,
    				frameWidth: 40,
    				frameRate: 10,
    				yoyo: false,
    				id: 29
    			}
    		},
    		blocks: {
    			"1": {
    				name: "grass",
    				graphic: 4,
    				width: 30,
    				height: 30,
    				throwOnTouch: false,
    				id: 1,
    				particles: null,
    				followerOnConsume: [
    				],
    				enemyOnConsume: [
    				]
    			},
    			"2": {
    				name: "spikes",
    				graphic: 1,
    				width: 30,
    				height: 30,
    				throwOnTouch: true,
    				damage: 20,
    				id: 2,
    				particles: null,
    				followerOnConsume: [
    				],
    				enemyOnConsume: [
    				]
    			},
    			"3": {
    				name: "lava",
    				throwOnTouch: false,
    				winOnTouch: false,
    				damage: 10,
    				consumable: false,
    				healthOnConsume: 0,
    				scoreOnConsume: 0,
    				followerOnConsume: [
    				],
    				enemyOnConsume: [
    				],
    				particles: 5,
    				graphic: 2,
    				id: 3
    			},
    			"5": {
    				name: "bouncer",
    				throwOnTouch: true,
    				damage: 0,
    				graphic: 5,
    				id: 5,
    				particles: null,
    				followerOnConsume: [
    				],
    				enemyOnConsume: [
    				]
    			},
    			"6": {
    				name: "health globe",
    				throwOnTouch: false,
    				winOnTouch: false,
    				damage: 0,
    				consumable: true,
    				healthOnConsume: 50,
    				scoreOnConsume: 1,
    				followerOnConsume: [
    				],
    				enemyOnConsume: [
    				],
    				particles: 7,
    				graphic: 10,
    				id: 6
    			},
    			"7": {
    				name: "globber spawner",
    				throwOnTouch: false,
    				winOnTouch: false,
    				damage: 0,
    				consumable: true,
    				healthOnConsume: 0,
    				scoreOnConsume: 0,
    				followerOnConsume: [
    					2
    				],
    				enemyOnConsume: [
    				],
    				particles: null,
    				graphic: 15,
    				id: 7
    			},
    			"8": {
    				name: "win star",
    				throwOnTouch: false,
    				teleportOnTouch: false,
    				flipGravityOnTouch: false,
    				winOnTouch: true,
    				damage: 0,
    				consumable: false,
    				healthOnConsume: 0,
    				scoreOnConsume: 0,
    				followerOnConsume: [
    				],
    				enemyOnConsume: [
    				],
    				particles: 9,
    				graphic: 21,
    				id: 8
    			},
    			"9": {
    				name: "warlock spawner",
    				throwOnTouch: false,
    				winOnTouch: false,
    				damage: 0,
    				consumable: true,
    				healthOnConsume: 0,
    				scoreOnConsume: 0,
    				followerOnConsume: [
    				],
    				enemyOnConsume: [
    					1
    				],
    				particles: null,
    				graphic: 22,
    				id: 9
    			},
    			"10": {
    				name: "ice emitter",
    				throwOnTouch: false,
    				winOnTouch: false,
    				damage: 0,
    				consumable: false,
    				healthOnConsume: 0,
    				scoreOnConsume: 0,
    				followerOnConsume: [
    				],
    				enemyOnConsume: [
    				],
    				particles: 6,
    				graphic: 24,
    				id: 10
    			},
    			"11": {
    				name: "background dirt",
    				throwOnTouch: false,
    				winOnTouch: false,
    				damage: 0,
    				consumable: false,
    				healthOnConsume: 0,
    				scoreOnConsume: 0,
    				followerOnConsume: [
    				],
    				enemyOnConsume: [
    				],
    				particles: null,
    				graphic: 25,
    				id: 11
    			},
    			"12": {
    				name: "teleporter",
    				throwOnTouch: false,
    				teleportOnTouch: true,
    				winOnTouch: false,
    				damage: 0,
    				consumable: false,
    				healthOnConsume: 0,
    				scoreOnConsume: 0,
    				followerOnConsume: [
    				],
    				enemyOnConsume: [
    				],
    				particles: 8,
    				graphic: 27,
    				id: 12
    			},
    			"13": {
    				name: "gravity flipper",
    				throwOnTouch: false,
    				teleportOnTouch: false,
    				flipGravityOnTouch: true,
    				winOnTouch: false,
    				damage: 0,
    				consumable: false,
    				healthOnConsume: 0,
    				scoreOnConsume: 0,
    				followerOnConsume: [
    				],
    				enemyOnConsume: [
    				],
    				particles: 8,
    				graphic: 28,
    				id: 13
    			}
    		},
    		characters: {
    			"1": {
    				graphics: {
    					still: 9,
    					moving: 8
    				},
    				name: "mr squiggles",
    				maxHealth: 100,
    				maxVelocity: 350,
    				jumpVelocity: 750,
    				gravityMultiplier: 1,
    				canFly: false,
    				canDoubleJump: true,
    				canJumpThroughBlocks: false,
    				abilities: [
    					{
    						name: "iceball",
    						key: "E",
    						projectile: true,
    						range: 900,
    						damage: 30,
    						attackRateMs: 200,
    						projectileVelocity: 500,
    						projectileGravityMultiplier: 0.01,
    						graphics: {
    							character: 14,
    							projectile: 13
    						},
    						damageToBlocks: 100,
    						destroyBlocksOnHit: true,
    						damageBlocksOnHit: true,
    						particles: 2
    					},
    					{
    						name: "fireball",
    						key: "R",
    						projectile: true,
    						range: 900,
    						damage: 25,
    						attackRateMs: 200,
    						projectileVelocity: 600,
    						projectileGravityMultiplier: 0.01,
    						graphics: {
    							character: 14,
    							projectile: 7
    						},
    						projectilePassThroughBlocks: true,
    						destroyBlocksOnHit: false,
    						particles: 3
    					},
    					{
    						name: "punch",
    						key: "F",
    						range: 200,
    						damage: 50,
    						attackRateMs: 300,
    						projectile: false,
    						projectileVelocity: 500,
    						projectilePassThroughBlocks: false,
    						damageBlocksOnHit: true,
    						graphics: {
    							character: 20,
    							projectile: null
    						},
    						particles: null
    					},
    					{
    						name: "squiggleball",
    						key: "T",
    						range: 10000,
    						damage: 1000,
    						attackRateMs: 200,
    						projectile: true,
    						projectileVelocity: 400,
    						projectilePassThroughBlocks: true,
    						damageBlocksOnHit: false,
    						graphics: {
    							character: 14,
    							projectile: 6
    						},
    						particles: 1
    					}
    				],
    				followers: [
    				],
    				particles: null,
    				id: 1
    			},
    			"2": {
    				graphics: {
    					still: 15,
    					moving: 15
    				},
    				name: "globber",
    				maxHealth: 100,
    				maxVelocity: 500,
    				jumpVelocity: 700,
    				gravityMultiplier: 1,
    				canFly: true,
    				canDoubleJump: false,
    				canJumpThroughBlocks: false,
    				abilities: [
    					{
    						name: "pewpew",
    						key: "R",
    						projectile: true,
    						range: 300,
    						damage: 5,
    						attackRateMs: 100,
    						projectileVelocity: 500,
    						projectileGravityMultiplier: 0.1,
    						graphics: {
    							character: null,
    							projectile: 17
    						},
    						damageBlocksOnHit: true,
    						particles: null
    					}
    				],
    				followers: [
    				],
    				id: 2,
    				particles: null
    			}
    		},
    		enemies: {
    			"1": {
    				graphics: {
    					still: 11,
    					moving: null
    				},
    				name: "warlock",
    				maxHealth: 100,
    				maxVelocity: 150,
    				jumpVelocity: 500,
    				gravityMultiplier: 1,
    				score: 10,
    				abilities: [
    					{
    						name: "fireball",
    						key: "R",
    						projectile: true,
    						range: 400,
    						damage: 20,
    						attackRateMs: 1500,
    						projectileVelocityX: 500,
    						projectileVelocityY: 0,
    						projectileGravityMultiplier: 0.1,
    						graphics: {
    							character: 12,
    							projectile: 7
    						},
    						projectileVelocity: 200,
    						projectilePassThroughBlocks: true,
    						damageBlocksOnHit: false,
    						particles: 3
    					}
    				],
    				particles: 4,
    				canFly: null,
    				id: 1
    			},
    			"2": {
    				graphics: {
    					still: 18,
    					moving: null
    				},
    				name: "smacker",
    				maxHealth: 100,
    				maxVelocity: 200,
    				jumpVelocity: 500,
    				gravityMultiplier: 1,
    				score: 1,
    				abilities: [
    					{
    						name: "smack",
    						key: "R",
    						projectile: false,
    						range: 50,
    						damage: 10,
    						attackRateMs: 250,
    						projectileVelocity: 500,
    						projectileGravityMultiplier: 0.1,
    						graphics: {
    							character: 19,
    							projectile: null
    						},
    						particles: null
    					}
    				],
    				canFly: null,
    				id: 2,
    				particles: null
    			}
    		},
    		levels: {
    			"1": {
    				name: "level 3",
    				playableCharacters: [
    					1
    				],
    				background: "rgba(96, 96, 96, 255)",
    				blocks: [
    					[
    						1,
    						0,
    						1
    					],
    					[
    						4,
    						0,
    						0
    					],
    					[
    						6,
    						1,
    						4
    					],
    					[
    						1,
    						1,
    						1
    					],
    					[
    						4,
    						1,
    						0
    					],
    					[
    						5,
    						2,
    						2
    					],
    					[
    						1,
    						2,
    						1
    					],
    					[
    						4,
    						2,
    						0
    					],
    					[
    						5,
    						3,
    						2
    					],
    					[
    						1,
    						3,
    						1
    					],
    					[
    						4,
    						3,
    						0
    					],
    					[
    						6,
    						4,
    						4
    					],
    					[
    						1,
    						4,
    						1
    					],
    					[
    						4,
    						4,
    						0
    					],
    					[
    						6,
    						5,
    						2
    					],
    					[
    						1,
    						5,
    						1
    					],
    					[
    						4,
    						5,
    						0
    					],
    					[
    						6,
    						6,
    						7
    					],
    					[
    						6,
    						6,
    						4
    					],
    					[
    						6,
    						6,
    						2
    					],
    					[
    						1,
    						6,
    						1
    					],
    					[
    						4,
    						6,
    						0
    					],
    					[
    						1,
    						7,
    						7
    					],
    					[
    						4,
    						7,
    						6
    					],
    					[
    						4,
    						7,
    						5
    					],
    					[
    						4,
    						7,
    						4
    					],
    					[
    						6,
    						7,
    						2
    					],
    					[
    						1,
    						7,
    						1
    					],
    					[
    						4,
    						7,
    						0
    					],
    					[
    						1,
    						8,
    						5
    					],
    					[
    						4,
    						8,
    						4
    					],
    					[
    						6,
    						8,
    						2
    					],
    					[
    						1,
    						8,
    						1
    					],
    					[
    						4,
    						8,
    						0
    					],
    					[
    						6,
    						9,
    						6
    					],
    					[
    						1,
    						9,
    						5
    					],
    					[
    						4,
    						9,
    						4
    					],
    					[
    						1,
    						9,
    						1
    					],
    					[
    						4,
    						9,
    						0
    					],
    					[
    						6,
    						10,
    						6
    					],
    					[
    						1,
    						10,
    						5
    					],
    					[
    						4,
    						10,
    						4
    					],
    					[
    						1,
    						10,
    						1
    					],
    					[
    						4,
    						10,
    						0
    					],
    					[
    						6,
    						11,
    						6
    					],
    					[
    						1,
    						11,
    						5
    					],
    					[
    						4,
    						11,
    						4
    					],
    					[
    						1,
    						11,
    						1
    					],
    					[
    						4,
    						11,
    						0
    					],
    					[
    						1,
    						12,
    						5
    					],
    					[
    						4,
    						12,
    						4
    					],
    					[
    						1,
    						12,
    						1
    					],
    					[
    						4,
    						12,
    						0
    					],
    					[
    						1,
    						13,
    						7
    					],
    					[
    						4,
    						13,
    						6
    					],
    					[
    						4,
    						13,
    						5
    					],
    					[
    						4,
    						13,
    						4
    					],
    					[
    						1,
    						13,
    						1
    					],
    					[
    						4,
    						13,
    						0
    					],
    					[
    						6,
    						14,
    						6
    					],
    					[
    						1,
    						14,
    						1
    					],
    					[
    						4,
    						14,
    						0
    					],
    					[
    						1,
    						15,
    						1
    					],
    					[
    						4,
    						15,
    						0
    					],
    					[
    						1,
    						16,
    						1
    					],
    					[
    						4,
    						16,
    						0
    					],
    					[
    						1,
    						17,
    						1
    					],
    					[
    						4,
    						17,
    						0
    					],
    					[
    						5,
    						18,
    						3
    					],
    					[
    						1,
    						18,
    						2
    					],
    					[
    						4,
    						18,
    						1
    					],
    					[
    						4,
    						18,
    						0
    					],
    					[
    						1,
    						19,
    						3
    					],
    					[
    						1,
    						19,
    						2
    					],
    					[
    						4,
    						19,
    						1
    					],
    					[
    						4,
    						19,
    						0
    					],
    					[
    						5,
    						20,
    						2
    					],
    					[
    						1,
    						20,
    						1
    					],
    					[
    						4,
    						20,
    						0
    					],
    					[
    						5,
    						21,
    						2
    					],
    					[
    						1,
    						21,
    						1
    					],
    					[
    						4,
    						21,
    						0
    					],
    					[
    						1,
    						22,
    						12
    					],
    					[
    						4,
    						22,
    						11
    					],
    					[
    						4,
    						22,
    						10
    					],
    					[
    						4,
    						22,
    						9
    					],
    					[
    						1,
    						22,
    						1
    					],
    					[
    						4,
    						22,
    						0
    					],
    					[
    						1,
    						23,
    						10
    					],
    					[
    						4,
    						23,
    						9
    					],
    					[
    						1,
    						23,
    						1
    					],
    					[
    						4,
    						23,
    						0
    					],
    					[
    						1,
    						24,
    						10
    					],
    					[
    						4,
    						24,
    						9
    					],
    					[
    						1,
    						24,
    						1
    					],
    					[
    						4,
    						24,
    						0
    					],
    					[
    						1,
    						25,
    						10
    					],
    					[
    						4,
    						25,
    						9
    					],
    					[
    						6,
    						25,
    						3
    					],
    					[
    						4,
    						25,
    						2
    					],
    					[
    						4,
    						25,
    						1
    					],
    					[
    						4,
    						25,
    						0
    					],
    					[
    						1,
    						26,
    						10
    					],
    					[
    						4,
    						26,
    						9
    					],
    					[
    						1,
    						26,
    						4
    					],
    					[
    						4,
    						26,
    						3
    					],
    					[
    						4,
    						26,
    						2
    					],
    					[
    						4,
    						26,
    						1
    					],
    					[
    						4,
    						26,
    						0
    					],
    					[
    						1,
    						27,
    						10
    					],
    					[
    						4,
    						27,
    						9
    					],
    					[
    						1,
    						27,
    						4
    					],
    					[
    						4,
    						27,
    						3
    					],
    					[
    						4,
    						27,
    						2
    					],
    					[
    						4,
    						27,
    						1
    					],
    					[
    						4,
    						27,
    						0
    					],
    					[
    						1,
    						28,
    						12
    					],
    					[
    						4,
    						28,
    						11
    					],
    					[
    						4,
    						28,
    						10
    					],
    					[
    						4,
    						28,
    						9
    					],
    					[
    						1,
    						28,
    						4
    					],
    					[
    						4,
    						28,
    						3
    					],
    					[
    						4,
    						28,
    						2
    					],
    					[
    						4,
    						28,
    						1
    					],
    					[
    						4,
    						28,
    						0
    					],
    					[
    						1,
    						29,
    						4
    					],
    					[
    						4,
    						29,
    						3
    					],
    					[
    						4,
    						29,
    						2
    					],
    					[
    						4,
    						29,
    						1
    					],
    					[
    						4,
    						29,
    						0
    					],
    					[
    						3,
    						30,
    						2
    					],
    					[
    						4,
    						30,
    						1
    					],
    					[
    						4,
    						30,
    						0
    					],
    					[
    						3,
    						31,
    						2
    					],
    					[
    						4,
    						31,
    						1
    					],
    					[
    						4,
    						31,
    						0
    					],
    					[
    						3,
    						32,
    						2
    					],
    					[
    						4,
    						32,
    						1
    					],
    					[
    						4,
    						32,
    						0
    					],
    					[
    						1,
    						33,
    						5
    					],
    					[
    						4,
    						33,
    						4
    					],
    					[
    						4,
    						33,
    						3
    					],
    					[
    						4,
    						33,
    						2
    					],
    					[
    						4,
    						33,
    						1
    					],
    					[
    						4,
    						33,
    						0
    					],
    					[
    						1,
    						34,
    						6
    					],
    					[
    						4,
    						34,
    						5
    					],
    					[
    						4,
    						34,
    						4
    					],
    					[
    						4,
    						34,
    						3
    					],
    					[
    						4,
    						34,
    						2
    					],
    					[
    						4,
    						34,
    						1
    					],
    					[
    						4,
    						34,
    						0
    					],
    					[
    						1,
    						35,
    						7
    					],
    					[
    						4,
    						35,
    						6
    					],
    					[
    						4,
    						35,
    						5
    					],
    					[
    						4,
    						35,
    						4
    					],
    					[
    						4,
    						35,
    						3
    					],
    					[
    						4,
    						35,
    						2
    					],
    					[
    						4,
    						35,
    						1
    					],
    					[
    						4,
    						35,
    						0
    					],
    					[
    						1,
    						36,
    						8
    					],
    					[
    						4,
    						36,
    						7
    					],
    					[
    						4,
    						36,
    						6
    					],
    					[
    						1,
    						36,
    						4
    					],
    					[
    						4,
    						36,
    						3
    					],
    					[
    						4,
    						36,
    						2
    					],
    					[
    						4,
    						36,
    						1
    					],
    					[
    						4,
    						36,
    						0
    					],
    					[
    						1,
    						37,
    						9
    					],
    					[
    						4,
    						37,
    						8
    					],
    					[
    						4,
    						37,
    						7
    					],
    					[
    						1,
    						37,
    						4
    					],
    					[
    						4,
    						37,
    						3
    					],
    					[
    						4,
    						37,
    						2
    					],
    					[
    						4,
    						37,
    						1
    					],
    					[
    						4,
    						37,
    						0
    					],
    					[
    						1,
    						38,
    						9
    					],
    					[
    						4,
    						38,
    						8
    					],
    					[
    						1,
    						38,
    						4
    					],
    					[
    						4,
    						38,
    						3
    					],
    					[
    						4,
    						38,
    						2
    					],
    					[
    						4,
    						38,
    						1
    					],
    					[
    						4,
    						38,
    						0
    					],
    					[
    						1,
    						39,
    						9
    					],
    					[
    						4,
    						39,
    						8
    					],
    					[
    						1,
    						39,
    						4
    					],
    					[
    						4,
    						39,
    						3
    					],
    					[
    						4,
    						39,
    						2
    					],
    					[
    						4,
    						39,
    						1
    					],
    					[
    						4,
    						39,
    						0
    					],
    					[
    						1,
    						40,
    						9
    					],
    					[
    						4,
    						40,
    						8
    					],
    					[
    						4,
    						40,
    						2
    					],
    					[
    						4,
    						40,
    						1
    					],
    					[
    						4,
    						40,
    						0
    					],
    					[
    						1,
    						41,
    						1
    					],
    					[
    						4,
    						41,
    						0
    					],
    					[
    						1,
    						42,
    						1
    					],
    					[
    						4,
    						42,
    						0
    					],
    					[
    						1,
    						43,
    						1
    					],
    					[
    						4,
    						43,
    						0
    					],
    					[
    						3,
    						44,
    						0
    					],
    					[
    						3,
    						45,
    						0
    					],
    					[
    						3,
    						46,
    						0
    					],
    					[
    						1,
    						47,
    						1
    					],
    					[
    						4,
    						47,
    						0
    					],
    					[
    						1,
    						48,
    						1
    					],
    					[
    						4,
    						48,
    						0
    					],
    					[
    						1,
    						49,
    						3
    					],
    					[
    						4,
    						49,
    						2
    					],
    					[
    						4,
    						49,
    						1
    					],
    					[
    						4,
    						49,
    						0
    					],
    					[
    						1,
    						50,
    						3
    					],
    					[
    						4,
    						50,
    						2
    					],
    					[
    						4,
    						50,
    						1
    					],
    					[
    						4,
    						50,
    						0
    					],
    					[
    						1,
    						51,
    						4
    					],
    					[
    						4,
    						51,
    						3
    					],
    					[
    						4,
    						51,
    						2
    					],
    					[
    						4,
    						51,
    						1
    					],
    					[
    						4,
    						51,
    						0
    					],
    					[
    						1,
    						52,
    						4
    					],
    					[
    						4,
    						52,
    						3
    					],
    					[
    						4,
    						52,
    						2
    					],
    					[
    						4,
    						52,
    						1
    					],
    					[
    						4,
    						52,
    						0
    					],
    					[
    						1,
    						53,
    						4
    					],
    					[
    						4,
    						53,
    						3
    					],
    					[
    						4,
    						53,
    						2
    					],
    					[
    						4,
    						53,
    						1
    					],
    					[
    						4,
    						53,
    						0
    					],
    					[
    						1,
    						54,
    						4
    					],
    					[
    						4,
    						54,
    						3
    					],
    					[
    						4,
    						54,
    						2
    					],
    					[
    						4,
    						54,
    						1
    					],
    					[
    						4,
    						54,
    						0
    					],
    					[
    						1,
    						55,
    						4
    					],
    					[
    						4,
    						55,
    						3
    					],
    					[
    						4,
    						55,
    						2
    					],
    					[
    						4,
    						55,
    						1
    					],
    					[
    						4,
    						55,
    						0
    					],
    					[
    						1,
    						56,
    						4
    					],
    					[
    						4,
    						56,
    						3
    					],
    					[
    						4,
    						56,
    						2
    					],
    					[
    						4,
    						56,
    						1
    					],
    					[
    						4,
    						56,
    						0
    					],
    					[
    						1,
    						57,
    						4
    					],
    					[
    						4,
    						57,
    						3
    					],
    					[
    						4,
    						57,
    						2
    					],
    					[
    						4,
    						57,
    						1
    					],
    					[
    						4,
    						57,
    						0
    					],
    					[
    						1,
    						58,
    						4
    					],
    					[
    						4,
    						58,
    						3
    					],
    					[
    						4,
    						58,
    						2
    					],
    					[
    						4,
    						58,
    						1
    					],
    					[
    						4,
    						58,
    						0
    					],
    					[
    						1,
    						59,
    						3
    					],
    					[
    						4,
    						59,
    						2
    					],
    					[
    						4,
    						59,
    						1
    					],
    					[
    						4,
    						59,
    						0
    					],
    					[
    						1,
    						60,
    						3
    					],
    					[
    						4,
    						60,
    						2
    					],
    					[
    						4,
    						60,
    						1
    					],
    					[
    						4,
    						60,
    						0
    					],
    					[
    						1,
    						61,
    						2
    					],
    					[
    						4,
    						61,
    						1
    					],
    					[
    						4,
    						61,
    						0
    					],
    					[
    						1,
    						62,
    						2
    					],
    					[
    						4,
    						62,
    						1
    					],
    					[
    						4,
    						62,
    						0
    					],
    					[
    						1,
    						63,
    						2
    					],
    					[
    						4,
    						63,
    						1
    					],
    					[
    						4,
    						63,
    						0
    					],
    					[
    						4,
    						64,
    						0
    					],
    					[
    						4,
    						65,
    						0
    					],
    					[
    						8,
    						66,
    						1
    					],
    					[
    						4,
    						66,
    						0
    					]
    				],
    				enemies: [
    					[
    						1,
    						12,
    						6
    					],
    					[
    						2,
    						12,
    						2
    					],
    					[
    						2,
    						16,
    						2
    					],
    					[
    						2,
    						19,
    						4
    					],
    					[
    						1,
    						22,
    						3
    					],
    					[
    						1,
    						23,
    						11
    					],
    					[
    						2,
    						24,
    						2
    					],
    					[
    						1,
    						27,
    						11
    					],
    					[
    						1,
    						28,
    						5
    					],
    					[
    						1,
    						39,
    						5
    					],
    					[
    						1,
    						42,
    						2
    					],
    					[
    						1,
    						54,
    						5
    					]
    				],
    				thumbnail: "data:image/png;base64,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",
    				id: 1,
    				requiredLevels: [
    					6
    				]
    			},
    			"2": {
    				name: "level 4",
    				playableCharacters: [
    					1
    				],
    				background: "rgba(111, 111, 111, 255)",
    				blocks: [
    					[
    						1,
    						0,
    						2
    					],
    					[
    						4,
    						0,
    						1
    					],
    					[
    						4,
    						0,
    						0
    					],
    					[
    						4,
    						1,
    						14
    					],
    					[
    						4,
    						1,
    						13
    					],
    					[
    						4,
    						1,
    						12
    					],
    					[
    						4,
    						1,
    						11
    					],
    					[
    						1,
    						1,
    						2
    					],
    					[
    						4,
    						1,
    						1
    					],
    					[
    						4,
    						1,
    						0
    					],
    					[
    						1,
    						2,
    						12
    					],
    					[
    						4,
    						2,
    						11
    					],
    					[
    						4,
    						2,
    						10
    					],
    					[
    						1,
    						2,
    						2
    					],
    					[
    						4,
    						2,
    						1
    					],
    					[
    						4,
    						2,
    						0
    					],
    					[
    						6,
    						3,
    						12
    					],
    					[
    						1,
    						3,
    						11
    					],
    					[
    						4,
    						3,
    						10
    					],
    					[
    						1,
    						3,
    						2
    					],
    					[
    						4,
    						3,
    						1
    					],
    					[
    						4,
    						3,
    						0
    					],
    					[
    						1,
    						4,
    						11
    					],
    					[
    						4,
    						4,
    						10
    					],
    					[
    						4,
    						4,
    						9
    					],
    					[
    						1,
    						4,
    						2
    					],
    					[
    						4,
    						4,
    						1
    					],
    					[
    						4,
    						4,
    						0
    					],
    					[
    						6,
    						5,
    						11
    					],
    					[
    						1,
    						5,
    						10
    					],
    					[
    						4,
    						5,
    						9
    					],
    					[
    						1,
    						5,
    						2
    					],
    					[
    						4,
    						5,
    						1
    					],
    					[
    						4,
    						5,
    						0
    					],
    					[
    						1,
    						6,
    						10
    					],
    					[
    						4,
    						6,
    						9
    					],
    					[
    						4,
    						6,
    						8
    					],
    					[
    						4,
    						6,
    						7
    					],
    					[
    						1,
    						6,
    						2
    					],
    					[
    						4,
    						6,
    						1
    					],
    					[
    						4,
    						6,
    						0
    					],
    					[
    						1,
    						7,
    						8
    					],
    					[
    						4,
    						7,
    						7
    					],
    					[
    						1,
    						7,
    						2
    					],
    					[
    						4,
    						7,
    						1
    					],
    					[
    						4,
    						7,
    						0
    					],
    					[
    						1,
    						8,
    						8
    					],
    					[
    						4,
    						8,
    						7
    					],
    					[
    						4,
    						8,
    						6
    					],
    					[
    						1,
    						8,
    						2
    					],
    					[
    						4,
    						8,
    						1
    					],
    					[
    						4,
    						8,
    						0
    					],
    					[
    						4,
    						9,
    						6
    					],
    					[
    						1,
    						9,
    						2
    					],
    					[
    						4,
    						9,
    						1
    					],
    					[
    						4,
    						9,
    						0
    					],
    					[
    						7,
    						10,
    						7
    					],
    					[
    						4,
    						10,
    						6
    					],
    					[
    						1,
    						10,
    						2
    					],
    					[
    						4,
    						10,
    						1
    					],
    					[
    						4,
    						10,
    						0
    					],
    					[
    						7,
    						11,
    						12
    					],
    					[
    						1,
    						11,
    						11
    					],
    					[
    						4,
    						11,
    						10
    					],
    					[
    						6,
    						11,
    						7
    					],
    					[
    						4,
    						11,
    						6
    					],
    					[
    						6,
    						11,
    						3
    					],
    					[
    						1,
    						11,
    						2
    					],
    					[
    						4,
    						11,
    						1
    					],
    					[
    						4,
    						11,
    						0
    					],
    					[
    						6,
    						12,
    						12
    					],
    					[
    						1,
    						12,
    						11
    					],
    					[
    						4,
    						12,
    						10
    					],
    					[
    						4,
    						12,
    						6
    					],
    					[
    						9,
    						12,
    						3
    					],
    					[
    						1,
    						12,
    						2
    					],
    					[
    						4,
    						12,
    						1
    					],
    					[
    						4,
    						12,
    						0
    					],
    					[
    						1,
    						13,
    						11
    					],
    					[
    						4,
    						13,
    						10
    					],
    					[
    						4,
    						13,
    						6
    					],
    					[
    						1,
    						13,
    						1
    					],
    					[
    						4,
    						13,
    						0
    					],
    					[
    						1,
    						14,
    						11
    					],
    					[
    						4,
    						14,
    						10
    					],
    					[
    						6,
    						14,
    						7
    					],
    					[
    						4,
    						14,
    						6
    					],
    					[
    						1,
    						14,
    						1
    					],
    					[
    						4,
    						14,
    						0
    					],
    					[
    						1,
    						15,
    						11
    					],
    					[
    						4,
    						15,
    						10
    					],
    					[
    						4,
    						15,
    						6
    					],
    					[
    						1,
    						15,
    						1
    					],
    					[
    						4,
    						15,
    						0
    					],
    					[
    						6,
    						16,
    						12
    					],
    					[
    						1,
    						16,
    						11
    					],
    					[
    						4,
    						16,
    						10
    					],
    					[
    						6,
    						16,
    						7
    					],
    					[
    						4,
    						16,
    						6
    					],
    					[
    						4,
    						16,
    						0
    					],
    					[
    						1,
    						17,
    						11
    					],
    					[
    						4,
    						17,
    						10
    					],
    					[
    						4,
    						17,
    						6
    					],
    					[
    						4,
    						17,
    						5
    					],
    					[
    						4,
    						17,
    						0
    					],
    					[
    						6,
    						18,
    						12
    					],
    					[
    						1,
    						18,
    						11
    					],
    					[
    						4,
    						18,
    						10
    					],
    					[
    						6,
    						18,
    						7
    					],
    					[
    						1,
    						18,
    						6
    					],
    					[
    						4,
    						18,
    						5
    					],
    					[
    						4,
    						18,
    						0
    					],
    					[
    						7,
    						19,
    						12
    					],
    					[
    						1,
    						19,
    						11
    					],
    					[
    						4,
    						19,
    						10
    					],
    					[
    						4,
    						19,
    						5
    					],
    					[
    						4,
    						19,
    						4
    					],
    					[
    						4,
    						19,
    						0
    					],
    					[
    						1,
    						20,
    						11
    					],
    					[
    						4,
    						20,
    						10
    					],
    					[
    						4,
    						20,
    						4
    					],
    					[
    						4,
    						20,
    						0
    					],
    					[
    						1,
    						21,
    						12
    					],
    					[
    						4,
    						21,
    						11
    					],
    					[
    						4,
    						21,
    						10
    					],
    					[
    						4,
    						21,
    						4
    					],
    					[
    						4,
    						21,
    						0
    					],
    					[
    						1,
    						22,
    						12
    					],
    					[
    						4,
    						22,
    						11
    					],
    					[
    						4,
    						22,
    						10
    					],
    					[
    						6,
    						22,
    						5
    					],
    					[
    						4,
    						22,
    						4
    					],
    					[
    						6,
    						22,
    						1
    					],
    					[
    						4,
    						22,
    						0
    					],
    					[
    						3,
    						23,
    						12
    					],
    					[
    						4,
    						23,
    						11
    					],
    					[
    						4,
    						23,
    						10
    					],
    					[
    						4,
    						23,
    						0
    					],
    					[
    						3,
    						24,
    						12
    					],
    					[
    						4,
    						24,
    						11
    					],
    					[
    						4,
    						24,
    						10
    					],
    					[
    						4,
    						24,
    						0
    					],
    					[
    						3,
    						25,
    						12
    					],
    					[
    						4,
    						25,
    						11
    					],
    					[
    						4,
    						25,
    						10
    					],
    					[
    						4,
    						25,
    						9
    					],
    					[
    						4,
    						25,
    						1
    					],
    					[
    						4,
    						25,
    						0
    					],
    					[
    						3,
    						26,
    						12
    					],
    					[
    						4,
    						26,
    						11
    					],
    					[
    						4,
    						26,
    						10
    					],
    					[
    						4,
    						26,
    						9
    					],
    					[
    						4,
    						26,
    						8
    					],
    					[
    						4,
    						26,
    						2
    					],
    					[
    						4,
    						26,
    						1
    					],
    					[
    						4,
    						26,
    						0
    					],
    					[
    						1,
    						27,
    						12
    					],
    					[
    						4,
    						27,
    						11
    					],
    					[
    						4,
    						27,
    						10
    					],
    					[
    						4,
    						27,
    						9
    					],
    					[
    						4,
    						27,
    						8
    					],
    					[
    						4,
    						27,
    						4
    					],
    					[
    						4,
    						27,
    						3
    					],
    					[
    						4,
    						27,
    						2
    					],
    					[
    						4,
    						27,
    						1
    					],
    					[
    						4,
    						27,
    						0
    					],
    					[
    						1,
    						28,
    						11
    					],
    					[
    						4,
    						28,
    						10
    					],
    					[
    						4,
    						28,
    						9
    					],
    					[
    						4,
    						28,
    						8
    					],
    					[
    						6,
    						28,
    						5
    					],
    					[
    						4,
    						28,
    						4
    					],
    					[
    						4,
    						28,
    						3
    					],
    					[
    						4,
    						28,
    						2
    					],
    					[
    						4,
    						28,
    						1
    					],
    					[
    						4,
    						28,
    						0
    					],
    					[
    						6,
    						29,
    						12
    					],
    					[
    						1,
    						29,
    						11
    					],
    					[
    						4,
    						29,
    						10
    					],
    					[
    						4,
    						29,
    						9
    					],
    					[
    						4,
    						29,
    						8
    					],
    					[
    						4,
    						29,
    						4
    					],
    					[
    						4,
    						29,
    						3
    					],
    					[
    						4,
    						29,
    						2
    					],
    					[
    						4,
    						29,
    						1
    					],
    					[
    						4,
    						29,
    						0
    					],
    					[
    						1,
    						30,
    						11
    					],
    					[
    						4,
    						30,
    						10
    					],
    					[
    						4,
    						30,
    						9
    					],
    					[
    						4,
    						30,
    						8
    					],
    					[
    						4,
    						30,
    						7
    					],
    					[
    						4,
    						30,
    						6
    					],
    					[
    						4,
    						30,
    						5
    					],
    					[
    						4,
    						30,
    						4
    					],
    					[
    						4,
    						30,
    						3
    					],
    					[
    						4,
    						30,
    						2
    					],
    					[
    						4,
    						30,
    						1
    					],
    					[
    						4,
    						30,
    						0
    					],
    					[
    						1,
    						31,
    						11
    					],
    					[
    						4,
    						31,
    						10
    					],
    					[
    						4,
    						31,
    						9
    					],
    					[
    						4,
    						31,
    						8
    					],
    					[
    						4,
    						31,
    						7
    					],
    					[
    						4,
    						31,
    						6
    					],
    					[
    						4,
    						31,
    						5
    					],
    					[
    						4,
    						31,
    						4
    					],
    					[
    						4,
    						31,
    						3
    					],
    					[
    						4,
    						31,
    						2
    					],
    					[
    						4,
    						31,
    						1
    					],
    					[
    						4,
    						31,
    						0
    					],
    					[
    						3,
    						32,
    						0
    					],
    					[
    						3,
    						33,
    						0
    					],
    					[
    						3,
    						34,
    						0
    					],
    					[
    						1,
    						35,
    						10
    					],
    					[
    						4,
    						35,
    						9
    					],
    					[
    						4,
    						35,
    						8
    					],
    					[
    						4,
    						35,
    						7
    					],
    					[
    						4,
    						35,
    						6
    					],
    					[
    						4,
    						35,
    						5
    					],
    					[
    						4,
    						35,
    						4
    					],
    					[
    						4,
    						35,
    						3
    					],
    					[
    						4,
    						35,
    						2
    					],
    					[
    						4,
    						35,
    						1
    					],
    					[
    						4,
    						35,
    						0
    					],
    					[
    						1,
    						36,
    						10
    					],
    					[
    						4,
    						36,
    						9
    					],
    					[
    						4,
    						36,
    						8
    					],
    					[
    						4,
    						36,
    						7
    					],
    					[
    						4,
    						36,
    						6
    					],
    					[
    						4,
    						36,
    						5
    					],
    					[
    						4,
    						36,
    						4
    					],
    					[
    						4,
    						36,
    						3
    					],
    					[
    						4,
    						36,
    						2
    					],
    					[
    						4,
    						36,
    						1
    					],
    					[
    						4,
    						36,
    						0
    					],
    					[
    						6,
    						37,
    						9
    					],
    					[
    						4,
    						37,
    						8
    					],
    					[
    						1,
    						37,
    						3
    					],
    					[
    						4,
    						37,
    						2
    					],
    					[
    						4,
    						37,
    						1
    					],
    					[
    						4,
    						37,
    						0
    					],
    					[
    						4,
    						38,
    						8
    					],
    					[
    						1,
    						38,
    						2
    					],
    					[
    						4,
    						38,
    						1
    					],
    					[
    						4,
    						38,
    						0
    					],
    					[
    						1,
    						39,
    						0
    					],
    					[
    						6,
    						40,
    						2
    					],
    					[
    						1,
    						40,
    						0
    					],
    					[
    						1,
    						41,
    						5
    					],
    					[
    						4,
    						41,
    						4
    					],
    					[
    						6,
    						41,
    						2
    					],
    					[
    						1,
    						41,
    						0
    					],
    					[
    						1,
    						42,
    						5
    					],
    					[
    						4,
    						42,
    						4
    					],
    					[
    						6,
    						42,
    						2
    					],
    					[
    						1,
    						42,
    						0
    					],
    					[
    						1,
    						43,
    						5
    					],
    					[
    						4,
    						43,
    						4
    					],
    					[
    						6,
    						43,
    						2
    					],
    					[
    						1,
    						43,
    						0
    					],
    					[
    						6,
    						44,
    						6
    					],
    					[
    						1,
    						44,
    						5
    					],
    					[
    						4,
    						44,
    						4
    					],
    					[
    						6,
    						44,
    						2
    					],
    					[
    						1,
    						44,
    						0
    					],
    					[
    						1,
    						45,
    						5
    					],
    					[
    						4,
    						45,
    						4
    					],
    					[
    						1,
    						45,
    						0
    					],
    					[
    						4,
    						46,
    						14
    					],
    					[
    						4,
    						46,
    						13
    					],
    					[
    						4,
    						46,
    						12
    					],
    					[
    						4,
    						46,
    						11
    					],
    					[
    						4,
    						46,
    						10
    					],
    					[
    						4,
    						46,
    						9
    					],
    					[
    						4,
    						46,
    						8
    					],
    					[
    						4,
    						46,
    						7
    					],
    					[
    						4,
    						46,
    						6
    					],
    					[
    						4,
    						46,
    						5
    					],
    					[
    						4,
    						46,
    						4
    					],
    					[
    						6,
    						46,
    						2
    					],
    					[
    						1,
    						46,
    						0
    					],
    					[
    						4,
    						47,
    						12
    					],
    					[
    						4,
    						47,
    						11
    					],
    					[
    						4,
    						47,
    						10
    					],
    					[
    						4,
    						47,
    						5
    					],
    					[
    						4,
    						47,
    						4
    					],
    					[
    						1,
    						47,
    						0
    					],
    					[
    						4,
    						48,
    						12
    					],
    					[
    						4,
    						48,
    						11
    					],
    					[
    						4,
    						48,
    						10
    					],
    					[
    						4,
    						48,
    						4
    					],
    					[
    						1,
    						48,
    						0
    					],
    					[
    						1,
    						49,
    						12
    					],
    					[
    						4,
    						49,
    						11
    					],
    					[
    						4,
    						49,
    						10
    					],
    					[
    						4,
    						49,
    						4
    					],
    					[
    						1,
    						49,
    						0
    					],
    					[
    						1,
    						50,
    						12
    					],
    					[
    						4,
    						50,
    						11
    					],
    					[
    						4,
    						50,
    						10
    					],
    					[
    						4,
    						50,
    						4
    					],
    					[
    						1,
    						50,
    						0
    					],
    					[
    						1,
    						51,
    						11
    					],
    					[
    						4,
    						51,
    						10
    					],
    					[
    						4,
    						51,
    						4
    					],
    					[
    						1,
    						51,
    						0
    					],
    					[
    						1,
    						52,
    						11
    					],
    					[
    						4,
    						52,
    						10
    					],
    					[
    						4,
    						52,
    						4
    					],
    					[
    						1,
    						52,
    						0
    					],
    					[
    						1,
    						53,
    						11
    					],
    					[
    						4,
    						53,
    						10
    					],
    					[
    						4,
    						53,
    						4
    					],
    					[
    						1,
    						53,
    						0
    					],
    					[
    						1,
    						54,
    						11
    					],
    					[
    						4,
    						54,
    						10
    					],
    					[
    						1,
    						54,
    						0
    					],
    					[
    						1,
    						55,
    						11
    					],
    					[
    						4,
    						55,
    						10
    					],
    					[
    						1,
    						55,
    						0
    					],
    					[
    						1,
    						56,
    						11
    					],
    					[
    						4,
    						56,
    						10
    					],
    					[
    						1,
    						56,
    						1
    					],
    					[
    						4,
    						56,
    						0
    					],
    					[
    						1,
    						57,
    						11
    					],
    					[
    						4,
    						57,
    						10
    					],
    					[
    						1,
    						57,
    						1
    					],
    					[
    						4,
    						57,
    						0
    					],
    					[
    						1,
    						58,
    						11
    					],
    					[
    						4,
    						58,
    						10
    					],
    					[
    						1,
    						58,
    						3
    					],
    					[
    						4,
    						58,
    						2
    					],
    					[
    						4,
    						58,
    						1
    					],
    					[
    						4,
    						58,
    						0
    					],
    					[
    						1,
    						59,
    						11
    					],
    					[
    						4,
    						59,
    						10
    					],
    					[
    						1,
    						59,
    						4
    					],
    					[
    						4,
    						59,
    						3
    					],
    					[
    						4,
    						59,
    						2
    					],
    					[
    						4,
    						59,
    						1
    					],
    					[
    						4,
    						59,
    						0
    					],
    					[
    						1,
    						60,
    						11
    					],
    					[
    						4,
    						60,
    						10
    					],
    					[
    						1,
    						60,
    						4
    					],
    					[
    						4,
    						60,
    						3
    					],
    					[
    						1,
    						61,
    						11
    					],
    					[
    						4,
    						61,
    						10
    					],
    					[
    						1,
    						61,
    						4
    					],
    					[
    						4,
    						61,
    						3
    					],
    					[
    						6,
    						62,
    						12
    					],
    					[
    						1,
    						62,
    						11
    					],
    					[
    						4,
    						62,
    						10
    					],
    					[
    						1,
    						62,
    						4
    					],
    					[
    						4,
    						62,
    						3
    					],
    					[
    						1,
    						63,
    						11
    					],
    					[
    						4,
    						63,
    						10
    					],
    					[
    						6,
    						63,
    						5
    					],
    					[
    						1,
    						63,
    						4
    					],
    					[
    						4,
    						63,
    						3
    					],
    					[
    						1,
    						64,
    						11
    					],
    					[
    						4,
    						64,
    						10
    					],
    					[
    						1,
    						64,
    						4
    					],
    					[
    						4,
    						64,
    						3
    					],
    					[
    						1,
    						65,
    						11
    					],
    					[
    						4,
    						65,
    						10
    					],
    					[
    						1,
    						65,
    						4
    					],
    					[
    						4,
    						65,
    						3
    					],
    					[
    						1,
    						66,
    						11
    					],
    					[
    						4,
    						66,
    						10
    					],
    					[
    						1,
    						66,
    						4
    					],
    					[
    						4,
    						66,
    						3
    					],
    					[
    						1,
    						67,
    						11
    					],
    					[
    						4,
    						67,
    						10
    					],
    					[
    						1,
    						67,
    						4
    					],
    					[
    						4,
    						67,
    						3
    					],
    					[
    						1,
    						68,
    						11
    					],
    					[
    						4,
    						68,
    						10
    					],
    					[
    						1,
    						68,
    						4
    					],
    					[
    						4,
    						68,
    						3
    					],
    					[
    						1,
    						69,
    						11
    					],
    					[
    						4,
    						69,
    						10
    					],
    					[
    						1,
    						69,
    						4
    					],
    					[
    						4,
    						69,
    						3
    					],
    					[
    						6,
    						70,
    						12
    					],
    					[
    						1,
    						70,
    						11
    					],
    					[
    						4,
    						70,
    						10
    					],
    					[
    						1,
    						70,
    						4
    					],
    					[
    						4,
    						70,
    						3
    					],
    					[
    						1,
    						71,
    						11
    					],
    					[
    						4,
    						71,
    						10
    					],
    					[
    						6,
    						71,
    						5
    					],
    					[
    						1,
    						71,
    						4
    					],
    					[
    						4,
    						71,
    						3
    					],
    					[
    						1,
    						72,
    						11
    					],
    					[
    						4,
    						72,
    						10
    					],
    					[
    						1,
    						72,
    						4
    					],
    					[
    						4,
    						72,
    						3
    					],
    					[
    						1,
    						73,
    						11
    					],
    					[
    						4,
    						73,
    						10
    					],
    					[
    						1,
    						73,
    						4
    					],
    					[
    						4,
    						73,
    						3
    					],
    					[
    						4,
    						73,
    						2
    					],
    					[
    						1,
    						74,
    						11
    					],
    					[
    						4,
    						74,
    						10
    					],
    					[
    						1,
    						74,
    						3
    					],
    					[
    						4,
    						74,
    						2
    					],
    					[
    						1,
    						75,
    						11
    					],
    					[
    						4,
    						75,
    						10
    					],
    					[
    						1,
    						75,
    						3
    					],
    					[
    						4,
    						75,
    						2
    					],
    					[
    						1,
    						76,
    						11
    					],
    					[
    						4,
    						76,
    						10
    					],
    					[
    						1,
    						76,
    						3
    					],
    					[
    						4,
    						76,
    						2
    					],
    					[
    						1,
    						77,
    						11
    					],
    					[
    						4,
    						77,
    						10
    					],
    					[
    						4,
    						77,
    						9
    					],
    					[
    						1,
    						77,
    						3
    					],
    					[
    						4,
    						77,
    						2
    					],
    					[
    						4,
    						77,
    						1
    					],
    					[
    						4,
    						77,
    						0
    					],
    					[
    						4,
    						78,
    						9
    					],
    					[
    						1,
    						78,
    						3
    					],
    					[
    						4,
    						78,
    						2
    					],
    					[
    						4,
    						78,
    						1
    					],
    					[
    						4,
    						78,
    						0
    					],
    					[
    						4,
    						79,
    						9
    					],
    					[
    						1,
    						79,
    						4
    					],
    					[
    						4,
    						79,
    						3
    					],
    					[
    						4,
    						79,
    						2
    					],
    					[
    						4,
    						79,
    						1
    					],
    					[
    						4,
    						79,
    						0
    					],
    					[
    						4,
    						80,
    						9
    					],
    					[
    						1,
    						80,
    						4
    					],
    					[
    						4,
    						80,
    						3
    					],
    					[
    						4,
    						80,
    						2
    					],
    					[
    						4,
    						80,
    						1
    					],
    					[
    						4,
    						80,
    						0
    					],
    					[
    						4,
    						81,
    						13
    					],
    					[
    						4,
    						81,
    						9
    					],
    					[
    						4,
    						81,
    						8
    					],
    					[
    						1,
    						81,
    						4
    					],
    					[
    						4,
    						81,
    						3
    					],
    					[
    						4,
    						81,
    						2
    					],
    					[
    						4,
    						81,
    						1
    					],
    					[
    						4,
    						81,
    						0
    					],
    					[
    						4,
    						82,
    						14
    					],
    					[
    						4,
    						82,
    						13
    					],
    					[
    						4,
    						82,
    						8
    					],
    					[
    						1,
    						82,
    						4
    					],
    					[
    						4,
    						82,
    						3
    					],
    					[
    						4,
    						82,
    						2
    					],
    					[
    						4,
    						82,
    						1
    					],
    					[
    						4,
    						82,
    						0
    					],
    					[
    						4,
    						83,
    						14
    					],
    					[
    						6,
    						83,
    						9
    					],
    					[
    						4,
    						83,
    						8
    					],
    					[
    						1,
    						83,
    						4
    					],
    					[
    						4,
    						83,
    						3
    					],
    					[
    						4,
    						83,
    						2
    					],
    					[
    						4,
    						83,
    						1
    					],
    					[
    						4,
    						83,
    						0
    					],
    					[
    						4,
    						84,
    						14
    					],
    					[
    						4,
    						84,
    						4
    					],
    					[
    						4,
    						84,
    						3
    					],
    					[
    						3,
    						84,
    						0
    					],
    					[
    						4,
    						85,
    						14
    					],
    					[
    						4,
    						85,
    						4
    					],
    					[
    						3,
    						85,
    						0
    					],
    					[
    						4,
    						86,
    						14
    					],
    					[
    						3,
    						86,
    						0
    					],
    					[
    						4,
    						87,
    						14
    					],
    					[
    						6,
    						87,
    						7
    					],
    					[
    						4,
    						87,
    						6
    					],
    					[
    						3,
    						87,
    						0
    					],
    					[
    						4,
    						88,
    						14
    					],
    					[
    						1,
    						88,
    						7
    					],
    					[
    						4,
    						88,
    						6
    					],
    					[
    						3,
    						88,
    						0
    					],
    					[
    						4,
    						89,
    						14
    					],
    					[
    						1,
    						89,
    						7
    					],
    					[
    						4,
    						89,
    						6
    					],
    					[
    						6,
    						89,
    						4
    					],
    					[
    						1,
    						89,
    						3
    					],
    					[
    						4,
    						89,
    						2
    					],
    					[
    						4,
    						89,
    						1
    					],
    					[
    						4,
    						89,
    						0
    					],
    					[
    						4,
    						90,
    						14
    					],
    					[
    						4,
    						90,
    						13
    					],
    					[
    						4,
    						90,
    						12
    					],
    					[
    						4,
    						90,
    						11
    					],
    					[
    						4,
    						90,
    						10
    					],
    					[
    						4,
    						90,
    						9
    					],
    					[
    						4,
    						90,
    						8
    					],
    					[
    						4,
    						90,
    						7
    					],
    					[
    						4,
    						90,
    						6
    					],
    					[
    						4,
    						90,
    						5
    					],
    					[
    						4,
    						90,
    						4
    					],
    					[
    						4,
    						90,
    						3
    					],
    					[
    						4,
    						90,
    						2
    					],
    					[
    						4,
    						90,
    						1
    					],
    					[
    						4,
    						90,
    						0
    					],
    					[
    						4,
    						91,
    						13
    					],
    					[
    						6,
    						91,
    						8
    					],
    					[
    						4,
    						91,
    						0
    					],
    					[
    						6,
    						92,
    						14
    					],
    					[
    						4,
    						92,
    						13
    					],
    					[
    						4,
    						92,
    						0
    					],
    					[
    						4,
    						93,
    						13
    					],
    					[
    						1,
    						93,
    						4
    					],
    					[
    						4,
    						93,
    						3
    					],
    					[
    						4,
    						93,
    						0
    					],
    					[
    						4,
    						94,
    						13
    					],
    					[
    						1,
    						94,
    						8
    					],
    					[
    						4,
    						94,
    						7
    					],
    					[
    						4,
    						94,
    						6
    					],
    					[
    						4,
    						94,
    						5
    					],
    					[
    						4,
    						94,
    						4
    					],
    					[
    						4,
    						94,
    						3
    					],
    					[
    						4,
    						94,
    						0
    					],
    					[
    						4,
    						95,
    						13
    					],
    					[
    						1,
    						95,
    						9
    					],
    					[
    						4,
    						95,
    						8
    					],
    					[
    						4,
    						95,
    						7
    					],
    					[
    						6,
    						95,
    						6
    					],
    					[
    						4,
    						95,
    						4
    					],
    					[
    						4,
    						95,
    						0
    					],
    					[
    						4,
    						96,
    						13
    					],
    					[
    						6,
    						96,
    						11
    					],
    					[
    						1,
    						96,
    						9
    					],
    					[
    						4,
    						96,
    						8
    					],
    					[
    						4,
    						96,
    						4
    					],
    					[
    						4,
    						96,
    						0
    					],
    					[
    						6,
    						97,
    						14
    					],
    					[
    						4,
    						97,
    						13
    					],
    					[
    						1,
    						97,
    						9
    					],
    					[
    						4,
    						97,
    						8
    					],
    					[
    						6,
    						97,
    						5
    					],
    					[
    						4,
    						97,
    						4
    					],
    					[
    						4,
    						97,
    						0
    					],
    					[
    						4,
    						98,
    						13
    					],
    					[
    						1,
    						98,
    						9
    					],
    					[
    						4,
    						98,
    						8
    					],
    					[
    						6,
    						98,
    						1
    					],
    					[
    						4,
    						98,
    						0
    					],
    					[
    						1,
    						99,
    						9
    					],
    					[
    						4,
    						99,
    						8
    					],
    					[
    						1,
    						99,
    						1
    					],
    					[
    						4,
    						99,
    						0
    					],
    					[
    						1,
    						100,
    						9
    					],
    					[
    						4,
    						100,
    						8
    					],
    					[
    						1,
    						100,
    						2
    					],
    					[
    						4,
    						100,
    						1
    					],
    					[
    						4,
    						100,
    						0
    					],
    					[
    						1,
    						101,
    						9
    					],
    					[
    						4,
    						101,
    						8
    					],
    					[
    						6,
    						101,
    						3
    					],
    					[
    						1,
    						101,
    						2
    					],
    					[
    						4,
    						101,
    						1
    					],
    					[
    						4,
    						101,
    						0
    					],
    					[
    						1,
    						102,
    						9
    					],
    					[
    						4,
    						102,
    						8
    					],
    					[
    						4,
    						102,
    						7
    					],
    					[
    						6,
    						102,
    						5
    					],
    					[
    						6,
    						102,
    						4
    					],
    					[
    						1,
    						102,
    						2
    					],
    					[
    						4,
    						102,
    						1
    					],
    					[
    						4,
    						102,
    						0
    					],
    					[
    						4,
    						103,
    						14
    					],
    					[
    						1,
    						103,
    						10
    					],
    					[
    						4,
    						103,
    						9
    					],
    					[
    						4,
    						103,
    						8
    					],
    					[
    						4,
    						103,
    						7
    					],
    					[
    						1,
    						103,
    						2
    					],
    					[
    						4,
    						103,
    						1
    					],
    					[
    						4,
    						103,
    						0
    					],
    					[
    						4,
    						104,
    						14
    					],
    					[
    						4,
    						104,
    						13
    					],
    					[
    						4,
    						104,
    						12
    					],
    					[
    						4,
    						104,
    						11
    					],
    					[
    						4,
    						104,
    						10
    					],
    					[
    						4,
    						104,
    						9
    					],
    					[
    						1,
    						104,
    						2
    					],
    					[
    						4,
    						104,
    						1
    					],
    					[
    						4,
    						104,
    						0
    					],
    					[
    						4,
    						105,
    						9
    					],
    					[
    						1,
    						105,
    						2
    					],
    					[
    						4,
    						105,
    						1
    					],
    					[
    						4,
    						105,
    						0
    					],
    					[
    						1,
    						106,
    						2
    					],
    					[
    						4,
    						106,
    						1
    					],
    					[
    						4,
    						106,
    						0
    					],
    					[
    						1,
    						107,
    						2
    					],
    					[
    						4,
    						107,
    						1
    					],
    					[
    						4,
    						107,
    						0
    					],
    					[
    						4,
    						108,
    						12
    					],
    					[
    						1,
    						108,
    						6
    					],
    					[
    						4,
    						108,
    						5
    					],
    					[
    						1,
    						108,
    						2
    					],
    					[
    						4,
    						108,
    						1
    					],
    					[
    						4,
    						108,
    						0
    					],
    					[
    						4,
    						109,
    						12
    					],
    					[
    						1,
    						109,
    						6
    					],
    					[
    						4,
    						109,
    						5
    					],
    					[
    						1,
    						109,
    						2
    					],
    					[
    						4,
    						109,
    						1
    					],
    					[
    						4,
    						109,
    						0
    					],
    					[
    						4,
    						110,
    						12
    					],
    					[
    						1,
    						110,
    						6
    					],
    					[
    						4,
    						110,
    						5
    					],
    					[
    						1,
    						110,
    						2
    					],
    					[
    						4,
    						110,
    						1
    					],
    					[
    						4,
    						110,
    						0
    					],
    					[
    						1,
    						111,
    						2
    					],
    					[
    						4,
    						111,
    						1
    					],
    					[
    						4,
    						111,
    						0
    					],
    					[
    						1,
    						112,
    						2
    					],
    					[
    						4,
    						112,
    						1
    					],
    					[
    						4,
    						112,
    						0
    					],
    					[
    						4,
    						113,
    						9
    					],
    					[
    						4,
    						113,
    						8
    					],
    					[
    						4,
    						113,
    						7
    					],
    					[
    						4,
    						113,
    						6
    					],
    					[
    						4,
    						113,
    						5
    					],
    					[
    						4,
    						113,
    						4
    					],
    					[
    						4,
    						113,
    						3
    					],
    					[
    						4,
    						113,
    						2
    					],
    					[
    						4,
    						113,
    						1
    					],
    					[
    						4,
    						113,
    						0
    					],
    					[
    						4,
    						114,
    						9
    					],
    					[
    						4,
    						114,
    						6
    					],
    					[
    						4,
    						114,
    						3
    					],
    					[
    						4,
    						114,
    						0
    					],
    					[
    						4,
    						115,
    						9
    					],
    					[
    						4,
    						115,
    						6
    					],
    					[
    						4,
    						115,
    						3
    					],
    					[
    						4,
    						115,
    						0
    					],
    					[
    						4,
    						116,
    						9
    					],
    					[
    						4,
    						116,
    						6
    					],
    					[
    						4,
    						116,
    						3
    					],
    					[
    						4,
    						116,
    						0
    					],
    					[
    						4,
    						117,
    						9
    					],
    					[
    						4,
    						117,
    						6
    					],
    					[
    						4,
    						117,
    						3
    					],
    					[
    						4,
    						117,
    						0
    					],
    					[
    						4,
    						118,
    						9
    					],
    					[
    						4,
    						118,
    						6
    					],
    					[
    						4,
    						118,
    						3
    					],
    					[
    						4,
    						118,
    						0
    					],
    					[
    						4,
    						119,
    						9
    					],
    					[
    						4,
    						119,
    						6
    					],
    					[
    						4,
    						119,
    						3
    					],
    					[
    						4,
    						119,
    						0
    					],
    					[
    						4,
    						120,
    						9
    					],
    					[
    						4,
    						120,
    						6
    					],
    					[
    						4,
    						120,
    						3
    					],
    					[
    						4,
    						120,
    						0
    					],
    					[
    						4,
    						121,
    						9
    					],
    					[
    						4,
    						121,
    						6
    					],
    					[
    						4,
    						121,
    						3
    					],
    					[
    						4,
    						121,
    						0
    					],
    					[
    						4,
    						122,
    						9
    					],
    					[
    						4,
    						122,
    						6
    					],
    					[
    						4,
    						122,
    						3
    					],
    					[
    						4,
    						122,
    						0
    					],
    					[
    						4,
    						123,
    						9
    					],
    					[
    						4,
    						123,
    						6
    					],
    					[
    						4,
    						123,
    						3
    					],
    					[
    						4,
    						123,
    						0
    					],
    					[
    						4,
    						124,
    						9
    					],
    					[
    						4,
    						124,
    						6
    					],
    					[
    						4,
    						124,
    						3
    					],
    					[
    						4,
    						124,
    						0
    					],
    					[
    						8,
    						125,
    						10
    					],
    					[
    						4,
    						125,
    						9
    					],
    					[
    						4,
    						125,
    						8
    					],
    					[
    						4,
    						125,
    						7
    					],
    					[
    						4,
    						125,
    						6
    					],
    					[
    						4,
    						125,
    						5
    					],
    					[
    						4,
    						125,
    						4
    					],
    					[
    						4,
    						125,
    						3
    					],
    					[
    						4,
    						125,
    						2
    					],
    					[
    						4,
    						125,
    						1
    					],
    					[
    						4,
    						125,
    						0
    					]
    				],
    				enemies: [
    					[
    						1,
    						7,
    						4
    					],
    					[
    						2,
    						14,
    						13
    					],
    					[
    						2,
    						16,
    						13
    					],
    					[
    						1,
    						17,
    						7
    					],
    					[
    						2,
    						18,
    						14
    					],
    					[
    						2,
    						19,
    						2
    					],
    					[
    						2,
    						23,
    						2
    					],
    					[
    						2,
    						24,
    						2
    					],
    					[
    						2,
    						25,
    						4
    					],
    					[
    						1,
    						28,
    						14
    					],
    					[
    						1,
    						31,
    						12
    					],
    					[
    						1,
    						47,
    						13
    					],
    					[
    						1,
    						48,
    						13
    					],
    					[
    						1,
    						48,
    						5
    					],
    					[
    						2,
    						53,
    						12
    					],
    					[
    						1,
    						53,
    						5
    					],
    					[
    						2,
    						54,
    						12
    					],
    					[
    						1,
    						59,
    						12
    					],
    					[
    						2,
    						60,
    						5
    					],
    					[
    						2,
    						61,
    						5
    					],
    					[
    						2,
    						62,
    						5
    					],
    					[
    						2,
    						63,
    						12
    					],
    					[
    						2,
    						64,
    						12
    					],
    					[
    						2,
    						65,
    						13
    					],
    					[
    						2,
    						65,
    						12
    					],
    					[
    						2,
    						66,
    						13
    					],
    					[
    						2,
    						67,
    						5
    					],
    					[
    						2,
    						68,
    						5
    					],
    					[
    						1,
    						76,
    						12
    					],
    					[
    						1,
    						89,
    						8
    					],
    					[
    						1,
    						92,
    						2
    					],
    					[
    						1,
    						93,
    						5
    					],
    					[
    						1,
    						95,
    						10
    					],
    					[
    						1,
    						102,
    						10
    					],
    					[
    						1,
    						114,
    						7
    					],
    					[
    						1,
    						114,
    						4
    					],
    					[
    						1,
    						114,
    						1
    					],
    					[
    						1,
    						115,
    						7
    					],
    					[
    						1,
    						115,
    						4
    					],
    					[
    						1,
    						115,
    						1
    					],
    					[
    						1,
    						116,
    						7
    					],
    					[
    						1,
    						116,
    						4
    					],
    					[
    						1,
    						116,
    						1
    					],
    					[
    						1,
    						117,
    						7
    					],
    					[
    						1,
    						117,
    						4
    					],
    					[
    						1,
    						117,
    						1
    					],
    					[
    						1,
    						118,
    						7
    					],
    					[
    						1,
    						118,
    						4
    					],
    					[
    						1,
    						118,
    						1
    					],
    					[
    						1,
    						119,
    						7
    					],
    					[
    						1,
    						119,
    						4
    					],
    					[
    						1,
    						119,
    						1
    					],
    					[
    						1,
    						120,
    						7
    					],
    					[
    						1,
    						120,
    						4
    					],
    					[
    						1,
    						120,
    						1
    					],
    					[
    						1,
    						121,
    						7
    					],
    					[
    						1,
    						121,
    						4
    					],
    					[
    						1,
    						121,
    						1
    					],
    					[
    						1,
    						122,
    						7
    					],
    					[
    						1,
    						122,
    						4
    					],
    					[
    						1,
    						122,
    						1
    					],
    					[
    						1,
    						123,
    						7
    					],
    					[
    						1,
    						123,
    						4
    					],
    					[
    						1,
    						123,
    						1
    					],
    					[
    						1,
    						124,
    						7
    					],
    					[
    						1,
    						124,
    						4
    					],
    					[
    						1,
    						124,
    						1
    					]
    				],
    				thumbnail: "data:image/png;base64,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",
    				id: 2,
    				prerequisiteLevels: [
    					0
    				],
    				requiredLevels: [
    					1
    				]
    			},
    			"4": {
    				name: "level 6",
    				playableCharacters: [
    					1
    				],
    				background: "rgba(91, 91, 91, 255)",
    				blocks: [
    					[
    						1,
    						0,
    						108
    					],
    					[
    						4,
    						0,
    						107
    					],
    					[
    						4,
    						0,
    						106
    					],
    					[
    						4,
    						0,
    						105
    					],
    					[
    						4,
    						0,
    						104
    					],
    					[
    						4,
    						0,
    						103
    					],
    					[
    						4,
    						0,
    						102
    					],
    					[
    						4,
    						0,
    						100
    					],
    					[
    						4,
    						0,
    						99
    					],
    					[
    						4,
    						0,
    						98
    					],
    					[
    						4,
    						0,
    						97
    					],
    					[
    						4,
    						0,
    						96
    					],
    					[
    						4,
    						0,
    						95
    					],
    					[
    						8,
    						0,
    						2
    					],
    					[
    						1,
    						0,
    						1
    					],
    					[
    						4,
    						0,
    						0
    					],
    					[
    						4,
    						1,
    						126
    					],
    					[
    						1,
    						1,
    						108
    					],
    					[
    						4,
    						1,
    						107
    					],
    					[
    						4,
    						1,
    						106
    					],
    					[
    						4,
    						1,
    						104
    					],
    					[
    						4,
    						1,
    						101
    					],
    					[
    						4,
    						1,
    						99
    					],
    					[
    						4,
    						1,
    						98
    					],
    					[
    						4,
    						1,
    						96
    					],
    					[
    						4,
    						1,
    						95
    					],
    					[
    						4,
    						1,
    						94
    					],
    					[
    						4,
    						1,
    						55
    					],
    					[
    						1,
    						1,
    						1
    					],
    					[
    						4,
    						1,
    						0
    					],
    					[
    						4,
    						2,
    						126
    					],
    					[
    						1,
    						2,
    						108
    					],
    					[
    						4,
    						2,
    						107
    					],
    					[
    						4,
    						2,
    						106
    					],
    					[
    						4,
    						2,
    						104
    					],
    					[
    						4,
    						2,
    						103
    					],
    					[
    						4,
    						2,
    						102
    					],
    					[
    						4,
    						2,
    						96
    					],
    					[
    						4,
    						2,
    						94
    					],
    					[
    						4,
    						2,
    						93
    					],
    					[
    						4,
    						2,
    						55
    					],
    					[
    						1,
    						2,
    						1
    					],
    					[
    						4,
    						2,
    						0
    					],
    					[
    						4,
    						3,
    						126
    					],
    					[
    						1,
    						3,
    						108
    					],
    					[
    						4,
    						3,
    						107
    					],
    					[
    						4,
    						3,
    						105
    					],
    					[
    						4,
    						3,
    						104
    					],
    					[
    						4,
    						3,
    						103
    					],
    					[
    						4,
    						3,
    						102
    					],
    					[
    						4,
    						3,
    						101
    					],
    					[
    						4,
    						3,
    						100
    					],
    					[
    						4,
    						3,
    						99
    					],
    					[
    						4,
    						3,
    						98
    					],
    					[
    						4,
    						3,
    						97
    					],
    					[
    						4,
    						3,
    						96
    					],
    					[
    						4,
    						3,
    						95
    					],
    					[
    						4,
    						3,
    						94
    					],
    					[
    						4,
    						3,
    						93
    					],
    					[
    						4,
    						3,
    						55
    					],
    					[
    						4,
    						3,
    						54
    					],
    					[
    						4,
    						3,
    						39
    					],
    					[
    						1,
    						3,
    						1
    					],
    					[
    						4,
    						3,
    						0
    					],
    					[
    						4,
    						4,
    						126
    					],
    					[
    						1,
    						4,
    						108
    					],
    					[
    						4,
    						4,
    						107
    					],
    					[
    						4,
    						4,
    						104
    					],
    					[
    						4,
    						4,
    						100
    					],
    					[
    						4,
    						4,
    						99
    					],
    					[
    						4,
    						4,
    						98
    					],
    					[
    						4,
    						4,
    						97
    					],
    					[
    						4,
    						4,
    						54
    					],
    					[
    						4,
    						4,
    						39
    					],
    					[
    						4,
    						4,
    						38
    					],
    					[
    						4,
    						4,
    						37
    					],
    					[
    						4,
    						4,
    						36
    					],
    					[
    						4,
    						4,
    						35
    					],
    					[
    						4,
    						4,
    						34
    					],
    					[
    						4,
    						4,
    						33
    					],
    					[
    						1,
    						4,
    						1
    					],
    					[
    						4,
    						4,
    						0
    					],
    					[
    						4,
    						5,
    						126
    					],
    					[
    						7,
    						5,
    						111
    					],
    					[
    						7,
    						5,
    						110
    					],
    					[
    						7,
    						5,
    						109
    					],
    					[
    						1,
    						5,
    						108
    					],
    					[
    						4,
    						5,
    						107
    					],
    					[
    						4,
    						5,
    						106
    					],
    					[
    						4,
    						5,
    						105
    					],
    					[
    						4,
    						5,
    						104
    					],
    					[
    						4,
    						5,
    						103
    					],
    					[
    						4,
    						5,
    						101
    					],
    					[
    						4,
    						5,
    						98
    					],
    					[
    						4,
    						5,
    						97
    					],
    					[
    						4,
    						5,
    						54
    					],
    					[
    						1,
    						5,
    						34
    					],
    					[
    						4,
    						5,
    						33
    					],
    					[
    						1,
    						5,
    						1
    					],
    					[
    						4,
    						5,
    						0
    					],
    					[
    						4,
    						6,
    						126
    					],
    					[
    						7,
    						6,
    						111
    					],
    					[
    						7,
    						6,
    						110
    					],
    					[
    						7,
    						6,
    						109
    					],
    					[
    						1,
    						6,
    						108
    					],
    					[
    						4,
    						6,
    						107
    					],
    					[
    						4,
    						6,
    						106
    					],
    					[
    						4,
    						6,
    						104
    					],
    					[
    						4,
    						6,
    						103
    					],
    					[
    						4,
    						6,
    						102
    					],
    					[
    						4,
    						6,
    						101
    					],
    					[
    						4,
    						6,
    						98
    					],
    					[
    						4,
    						6,
    						96
    					],
    					[
    						4,
    						6,
    						95
    					],
    					[
    						4,
    						6,
    						93
    					],
    					[
    						4,
    						6,
    						58
    					],
    					[
    						4,
    						6,
    						57
    					],
    					[
    						4,
    						6,
    						54
    					],
    					[
    						1,
    						6,
    						34
    					],
    					[
    						4,
    						6,
    						33
    					],
    					[
    						1,
    						6,
    						2
    					],
    					[
    						4,
    						6,
    						1
    					],
    					[
    						4,
    						6,
    						0
    					],
    					[
    						4,
    						7,
    						126
    					],
    					[
    						7,
    						7,
    						111
    					],
    					[
    						7,
    						7,
    						110
    					],
    					[
    						7,
    						7,
    						109
    					],
    					[
    						1,
    						7,
    						108
    					],
    					[
    						4,
    						7,
    						107
    					],
    					[
    						4,
    						7,
    						106
    					],
    					[
    						4,
    						7,
    						104
    					],
    					[
    						4,
    						7,
    						102
    					],
    					[
    						4,
    						7,
    						101
    					],
    					[
    						4,
    						7,
    						98
    					],
    					[
    						4,
    						7,
    						96
    					],
    					[
    						4,
    						7,
    						58
    					],
    					[
    						4,
    						7,
    						53
    					],
    					[
    						1,
    						7,
    						34
    					],
    					[
    						4,
    						7,
    						33
    					],
    					[
    						1,
    						7,
    						2
    					],
    					[
    						4,
    						7,
    						1
    					],
    					[
    						4,
    						8,
    						126
    					],
    					[
    						1,
    						8,
    						108
    					],
    					[
    						4,
    						8,
    						107
    					],
    					[
    						4,
    						8,
    						106
    					],
    					[
    						4,
    						8,
    						104
    					],
    					[
    						4,
    						8,
    						103
    					],
    					[
    						4,
    						8,
    						101
    					],
    					[
    						4,
    						8,
    						100
    					],
    					[
    						4,
    						8,
    						99
    					],
    					[
    						4,
    						8,
    						98
    					],
    					[
    						4,
    						8,
    						96
    					],
    					[
    						4,
    						8,
    						95
    					],
    					[
    						4,
    						8,
    						93
    					],
    					[
    						4,
    						8,
    						59
    					],
    					[
    						4,
    						8,
    						58
    					],
    					[
    						4,
    						8,
    						53
    					],
    					[
    						4,
    						8,
    						52
    					],
    					[
    						1,
    						8,
    						34
    					],
    					[
    						4,
    						8,
    						33
    					],
    					[
    						1,
    						8,
    						2
    					],
    					[
    						4,
    						8,
    						1
    					],
    					[
    						4,
    						9,
    						126
    					],
    					[
    						1,
    						9,
    						108
    					],
    					[
    						4,
    						9,
    						107
    					],
    					[
    						4,
    						9,
    						106
    					],
    					[
    						4,
    						9,
    						104
    					],
    					[
    						4,
    						9,
    						103
    					],
    					[
    						4,
    						9,
    						102
    					],
    					[
    						4,
    						9,
    						101
    					],
    					[
    						4,
    						9,
    						100
    					],
    					[
    						4,
    						9,
    						99
    					],
    					[
    						4,
    						9,
    						95
    					],
    					[
    						4,
    						9,
    						92
    					],
    					[
    						4,
    						9,
    						91
    					],
    					[
    						4,
    						9,
    						90
    					],
    					[
    						4,
    						9,
    						89
    					],
    					[
    						4,
    						9,
    						59
    					],
    					[
    						4,
    						9,
    						52
    					],
    					[
    						1,
    						9,
    						34
    					],
    					[
    						4,
    						9,
    						33
    					],
    					[
    						1,
    						9,
    						2
    					],
    					[
    						4,
    						9,
    						1
    					],
    					[
    						4,
    						10,
    						126
    					],
    					[
    						13,
    						10,
    						109
    					],
    					[
    						1,
    						10,
    						108
    					],
    					[
    						4,
    						10,
    						107
    					],
    					[
    						4,
    						10,
    						106
    					],
    					[
    						4,
    						10,
    						105
    					],
    					[
    						4,
    						10,
    						104
    					],
    					[
    						4,
    						10,
    						101
    					],
    					[
    						4,
    						10,
    						100
    					],
    					[
    						4,
    						10,
    						99
    					],
    					[
    						4,
    						10,
    						98
    					],
    					[
    						4,
    						10,
    						96
    					],
    					[
    						4,
    						10,
    						95
    					],
    					[
    						4,
    						10,
    						94
    					],
    					[
    						4,
    						10,
    						92
    					],
    					[
    						4,
    						10,
    						91
    					],
    					[
    						4,
    						10,
    						89
    					],
    					[
    						4,
    						10,
    						74
    					],
    					[
    						4,
    						10,
    						73
    					],
    					[
    						4,
    						10,
    						59
    					],
    					[
    						4,
    						10,
    						52
    					],
    					[
    						1,
    						10,
    						34
    					],
    					[
    						4,
    						10,
    						33
    					],
    					[
    						4,
    						10,
    						32
    					],
    					[
    						1,
    						10,
    						2
    					],
    					[
    						4,
    						10,
    						1
    					],
    					[
    						4,
    						11,
    						126
    					],
    					[
    						1,
    						11,
    						108
    					],
    					[
    						4,
    						11,
    						107
    					],
    					[
    						4,
    						11,
    						106
    					],
    					[
    						4,
    						11,
    						105
    					],
    					[
    						4,
    						11,
    						104
    					],
    					[
    						4,
    						11,
    						101
    					],
    					[
    						4,
    						11,
    						100
    					],
    					[
    						4,
    						11,
    						98
    					],
    					[
    						4,
    						11,
    						97
    					],
    					[
    						4,
    						11,
    						95
    					],
    					[
    						4,
    						11,
    						94
    					],
    					[
    						4,
    						11,
    						93
    					],
    					[
    						4,
    						11,
    						92
    					],
    					[
    						4,
    						11,
    						91
    					],
    					[
    						4,
    						11,
    						90
    					],
    					[
    						4,
    						11,
    						89
    					],
    					[
    						4,
    						11,
    						74
    					],
    					[
    						4,
    						11,
    						73
    					],
    					[
    						4,
    						11,
    						72
    					],
    					[
    						4,
    						11,
    						60
    					],
    					[
    						4,
    						11,
    						51
    					],
    					[
    						1,
    						11,
    						33
    					],
    					[
    						4,
    						11,
    						32
    					],
    					[
    						4,
    						11,
    						31
    					],
    					[
    						1,
    						11,
    						3
    					],
    					[
    						4,
    						11,
    						2
    					],
    					[
    						4,
    						11,
    						1
    					],
    					[
    						4,
    						12,
    						126
    					],
    					[
    						7,
    						12,
    						109
    					],
    					[
    						1,
    						12,
    						108
    					],
    					[
    						4,
    						12,
    						107
    					],
    					[
    						4,
    						12,
    						106
    					],
    					[
    						4,
    						12,
    						104
    					],
    					[
    						4,
    						12,
    						102
    					],
    					[
    						4,
    						12,
    						98
    					],
    					[
    						4,
    						12,
    						97
    					],
    					[
    						4,
    						12,
    						95
    					],
    					[
    						4,
    						12,
    						94
    					],
    					[
    						4,
    						12,
    						92
    					],
    					[
    						4,
    						12,
    						90
    					],
    					[
    						4,
    						12,
    						74
    					],
    					[
    						4,
    						12,
    						72
    					],
    					[
    						4,
    						12,
    						60
    					],
    					[
    						4,
    						12,
    						51
    					],
    					[
    						1,
    						12,
    						32
    					],
    					[
    						4,
    						12,
    						31
    					],
    					[
    						4,
    						12,
    						30
    					],
    					[
    						1,
    						12,
    						6
    					],
    					[
    						4,
    						12,
    						5
    					],
    					[
    						4,
    						12,
    						4
    					],
    					[
    						4,
    						12,
    						3
    					],
    					[
    						4,
    						12,
    						2
    					],
    					[
    						4,
    						13,
    						126
    					],
    					[
    						13,
    						13,
    						125
    					],
    					[
    						1,
    						13,
    						108
    					],
    					[
    						4,
    						13,
    						107
    					],
    					[
    						4,
    						13,
    						105
    					],
    					[
    						4,
    						13,
    						104
    					],
    					[
    						4,
    						13,
    						102
    					],
    					[
    						4,
    						13,
    						101
    					],
    					[
    						4,
    						13,
    						100
    					],
    					[
    						4,
    						13,
    						98
    					],
    					[
    						4,
    						13,
    						96
    					],
    					[
    						4,
    						13,
    						95
    					],
    					[
    						4,
    						13,
    						75
    					],
    					[
    						4,
    						13,
    						74
    					],
    					[
    						4,
    						13,
    						72
    					],
    					[
    						4,
    						13,
    						71
    					],
    					[
    						4,
    						13,
    						62
    					],
    					[
    						4,
    						13,
    						61
    					],
    					[
    						4,
    						13,
    						51
    					],
    					[
    						1,
    						13,
    						38
    					],
    					[
    						4,
    						13,
    						37
    					],
    					[
    						1,
    						13,
    						31
    					],
    					[
    						4,
    						13,
    						30
    					],
    					[
    						4,
    						13,
    						29
    					],
    					[
    						1,
    						13,
    						10
    					],
    					[
    						4,
    						13,
    						9
    					],
    					[
    						4,
    						13,
    						8
    					],
    					[
    						4,
    						13,
    						7
    					],
    					[
    						4,
    						13,
    						6
    					],
    					[
    						4,
    						13,
    						5
    					],
    					[
    						4,
    						14,
    						126
    					],
    					[
    						1,
    						14,
    						108
    					],
    					[
    						4,
    						14,
    						107
    					],
    					[
    						4,
    						14,
    						106
    					],
    					[
    						4,
    						14,
    						105
    					],
    					[
    						4,
    						14,
    						104
    					],
    					[
    						4,
    						14,
    						102
    					],
    					[
    						4,
    						14,
    						101
    					],
    					[
    						4,
    						14,
    						100
    					],
    					[
    						4,
    						14,
    						98
    					],
    					[
    						4,
    						14,
    						97
    					],
    					[
    						4,
    						14,
    						96
    					],
    					[
    						4,
    						14,
    						95
    					],
    					[
    						4,
    						14,
    						94
    					],
    					[
    						4,
    						14,
    						93
    					],
    					[
    						4,
    						14,
    						92
    					],
    					[
    						4,
    						14,
    						91
    					],
    					[
    						4,
    						14,
    						89
    					],
    					[
    						4,
    						14,
    						86
    					],
    					[
    						4,
    						14,
    						83
    					],
    					[
    						4,
    						14,
    						81
    					],
    					[
    						4,
    						14,
    						79
    					],
    					[
    						4,
    						14,
    						78
    					],
    					[
    						4,
    						14,
    						77
    					],
    					[
    						4,
    						14,
    						76
    					],
    					[
    						4,
    						14,
    						75
    					],
    					[
    						4,
    						14,
    						74
    					],
    					[
    						4,
    						14,
    						71
    					],
    					[
    						4,
    						14,
    						62
    					],
    					[
    						4,
    						14,
    						51
    					],
    					[
    						4,
    						14,
    						50
    					],
    					[
    						1,
    						14,
    						38
    					],
    					[
    						4,
    						14,
    						37
    					],
    					[
    						1,
    						14,
    						30
    					],
    					[
    						4,
    						14,
    						29
    					],
    					[
    						1,
    						14,
    						11
    					],
    					[
    						4,
    						14,
    						10
    					],
    					[
    						4,
    						14,
    						9
    					],
    					[
    						4,
    						15,
    						126
    					],
    					[
    						13,
    						15,
    						125
    					],
    					[
    						1,
    						15,
    						108
    					],
    					[
    						4,
    						15,
    						107
    					],
    					[
    						4,
    						15,
    						104
    					],
    					[
    						4,
    						15,
    						102
    					],
    					[
    						4,
    						15,
    						99
    					],
    					[
    						4,
    						15,
    						95
    					],
    					[
    						4,
    						15,
    						94
    					],
    					[
    						4,
    						15,
    						93
    					],
    					[
    						4,
    						15,
    						71
    					],
    					[
    						4,
    						15,
    						63
    					],
    					[
    						4,
    						15,
    						62
    					],
    					[
    						4,
    						15,
    						50
    					],
    					[
    						1,
    						15,
    						39
    					],
    					[
    						4,
    						15,
    						38
    					],
    					[
    						4,
    						15,
    						37
    					],
    					[
    						1,
    						15,
    						30
    					],
    					[
    						4,
    						15,
    						29
    					],
    					[
    						4,
    						15,
    						28
    					],
    					[
    						4,
    						15,
    						27
    					],
    					[
    						1,
    						15,
    						11
    					],
    					[
    						4,
    						15,
    						10
    					],
    					[
    						4,
    						16,
    						126
    					],
    					[
    						1,
    						16,
    						108
    					],
    					[
    						4,
    						16,
    						107
    					],
    					[
    						4,
    						16,
    						106
    					],
    					[
    						4,
    						16,
    						105
    					],
    					[
    						4,
    						16,
    						104
    					],
    					[
    						4,
    						16,
    						101
    					],
    					[
    						4,
    						16,
    						100
    					],
    					[
    						4,
    						16,
    						99
    					],
    					[
    						4,
    						16,
    						98
    					],
    					[
    						4,
    						16,
    						97
    					],
    					[
    						4,
    						16,
    						95
    					],
    					[
    						4,
    						16,
    						94
    					],
    					[
    						4,
    						16,
    						91
    					],
    					[
    						4,
    						16,
    						71
    					],
    					[
    						4,
    						16,
    						63
    					],
    					[
    						4,
    						16,
    						50
    					],
    					[
    						4,
    						16,
    						49
    					],
    					[
    						1,
    						16,
    						39
    					],
    					[
    						4,
    						16,
    						38
    					],
    					[
    						1,
    						16,
    						28
    					],
    					[
    						4,
    						16,
    						27
    					],
    					[
    						1,
    						16,
    						11
    					],
    					[
    						4,
    						16,
    						10
    					],
    					[
    						4,
    						17,
    						126
    					],
    					[
    						13,
    						17,
    						125
    					],
    					[
    						1,
    						17,
    						108
    					],
    					[
    						4,
    						17,
    						107
    					],
    					[
    						4,
    						17,
    						106
    					],
    					[
    						4,
    						17,
    						105
    					],
    					[
    						4,
    						17,
    						104
    					],
    					[
    						4,
    						17,
    						101
    					],
    					[
    						4,
    						17,
    						98
    					],
    					[
    						4,
    						17,
    						97
    					],
    					[
    						4,
    						17,
    						95
    					],
    					[
    						4,
    						17,
    						94
    					],
    					[
    						4,
    						17,
    						92
    					],
    					[
    						4,
    						17,
    						71
    					],
    					[
    						4,
    						17,
    						70
    					],
    					[
    						4,
    						17,
    						64
    					],
    					[
    						4,
    						17,
    						63
    					],
    					[
    						4,
    						17,
    						49
    					],
    					[
    						1,
    						17,
    						40
    					],
    					[
    						4,
    						17,
    						39
    					],
    					[
    						4,
    						17,
    						38
    					],
    					[
    						1,
    						17,
    						28
    					],
    					[
    						4,
    						17,
    						27
    					],
    					[
    						1,
    						17,
    						11
    					],
    					[
    						4,
    						17,
    						10
    					],
    					[
    						4,
    						18,
    						126
    					],
    					[
    						1,
    						18,
    						108
    					],
    					[
    						4,
    						18,
    						107
    					],
    					[
    						4,
    						18,
    						106
    					],
    					[
    						4,
    						18,
    						105
    					],
    					[
    						4,
    						18,
    						102
    					],
    					[
    						4,
    						18,
    						101
    					],
    					[
    						4,
    						18,
    						98
    					],
    					[
    						4,
    						18,
    						96
    					],
    					[
    						4,
    						18,
    						95
    					],
    					[
    						4,
    						18,
    						91
    					],
    					[
    						4,
    						18,
    						70
    					],
    					[
    						12,
    						18,
    						65
    					],
    					[
    						4,
    						18,
    						64
    					],
    					[
    						4,
    						18,
    						49
    					],
    					[
    						4,
    						18,
    						48
    					],
    					[
    						1,
    						18,
    						40
    					],
    					[
    						4,
    						18,
    						39
    					],
    					[
    						1,
    						18,
    						28
    					],
    					[
    						4,
    						18,
    						27
    					],
    					[
    						1,
    						18,
    						11
    					],
    					[
    						4,
    						18,
    						10
    					],
    					[
    						4,
    						19,
    						126
    					],
    					[
    						1,
    						19,
    						108
    					],
    					[
    						4,
    						19,
    						107
    					],
    					[
    						4,
    						19,
    						106
    					],
    					[
    						4,
    						19,
    						105
    					],
    					[
    						4,
    						19,
    						104
    					],
    					[
    						4,
    						19,
    						102
    					],
    					[
    						4,
    						19,
    						101
    					],
    					[
    						4,
    						19,
    						100
    					],
    					[
    						4,
    						19,
    						97
    					],
    					[
    						4,
    						19,
    						96
    					],
    					[
    						4,
    						19,
    						94
    					],
    					[
    						4,
    						19,
    						93
    					],
    					[
    						4,
    						19,
    						92
    					],
    					[
    						4,
    						19,
    						70
    					],
    					[
    						4,
    						19,
    						66
    					],
    					[
    						4,
    						19,
    						65
    					],
    					[
    						4,
    						19,
    						64
    					],
    					[
    						4,
    						19,
    						48
    					],
    					[
    						1,
    						19,
    						41
    					],
    					[
    						4,
    						19,
    						40
    					],
    					[
    						4,
    						19,
    						39
    					],
    					[
    						1,
    						19,
    						28
    					],
    					[
    						4,
    						19,
    						27
    					],
    					[
    						4,
    						19,
    						26
    					],
    					[
    						4,
    						19,
    						25
    					],
    					[
    						1,
    						19,
    						11
    					],
    					[
    						4,
    						19,
    						10
    					],
    					[
    						4,
    						20,
    						126
    					],
    					[
    						1,
    						20,
    						108
    					],
    					[
    						4,
    						20,
    						107
    					],
    					[
    						4,
    						20,
    						106
    					],
    					[
    						4,
    						20,
    						104
    					],
    					[
    						4,
    						20,
    						103
    					],
    					[
    						4,
    						20,
    						102
    					],
    					[
    						4,
    						20,
    						100
    					],
    					[
    						4,
    						20,
    						98
    					],
    					[
    						4,
    						20,
    						96
    					],
    					[
    						4,
    						20,
    						94
    					],
    					[
    						4,
    						20,
    						92
    					],
    					[
    						4,
    						20,
    						91
    					],
    					[
    						4,
    						20,
    						68
    					],
    					[
    						4,
    						20,
    						67
    					],
    					[
    						4,
    						20,
    						48
    					],
    					[
    						4,
    						20,
    						47
    					],
    					[
    						1,
    						20,
    						41
    					],
    					[
    						4,
    						20,
    						40
    					],
    					[
    						1,
    						20,
    						26
    					],
    					[
    						4,
    						20,
    						25
    					],
    					[
    						1,
    						20,
    						11
    					],
    					[
    						4,
    						20,
    						10
    					],
    					[
    						4,
    						21,
    						126
    					],
    					[
    						1,
    						21,
    						108
    					],
    					[
    						4,
    						21,
    						107
    					],
    					[
    						4,
    						21,
    						103
    					],
    					[
    						4,
    						21,
    						99
    					],
    					[
    						4,
    						21,
    						98
    					],
    					[
    						4,
    						21,
    						94
    					],
    					[
    						4,
    						21,
    						93
    					],
    					[
    						4,
    						21,
    						92
    					],
    					[
    						4,
    						21,
    						91
    					],
    					[
    						4,
    						21,
    						47
    					],
    					[
    						1,
    						21,
    						42
    					],
    					[
    						4,
    						21,
    						41
    					],
    					[
    						4,
    						21,
    						40
    					],
    					[
    						1,
    						21,
    						26
    					],
    					[
    						4,
    						21,
    						25
    					],
    					[
    						4,
    						21,
    						24
    					],
    					[
    						4,
    						21,
    						23
    					],
    					[
    						1,
    						21,
    						11
    					],
    					[
    						4,
    						21,
    						10
    					],
    					[
    						4,
    						22,
    						126
    					],
    					[
    						1,
    						22,
    						108
    					],
    					[
    						4,
    						22,
    						107
    					],
    					[
    						4,
    						22,
    						106
    					],
    					[
    						4,
    						22,
    						105
    					],
    					[
    						4,
    						22,
    						104
    					],
    					[
    						4,
    						22,
    						101
    					],
    					[
    						4,
    						22,
    						98
    					],
    					[
    						4,
    						22,
    						97
    					],
    					[
    						4,
    						22,
    						96
    					],
    					[
    						4,
    						22,
    						95
    					],
    					[
    						4,
    						22,
    						94
    					],
    					[
    						4,
    						22,
    						93
    					],
    					[
    						4,
    						22,
    						92
    					],
    					[
    						4,
    						22,
    						91
    					],
    					[
    						4,
    						22,
    						47
    					],
    					[
    						1,
    						22,
    						43
    					],
    					[
    						4,
    						22,
    						42
    					],
    					[
    						4,
    						22,
    						41
    					],
    					[
    						1,
    						22,
    						24
    					],
    					[
    						4,
    						22,
    						23
    					],
    					[
    						1,
    						22,
    						11
    					],
    					[
    						4,
    						22,
    						10
    					],
    					[
    						4,
    						23,
    						126
    					],
    					[
    						1,
    						23,
    						108
    					],
    					[
    						4,
    						23,
    						107
    					],
    					[
    						4,
    						23,
    						106
    					],
    					[
    						4,
    						23,
    						105
    					],
    					[
    						4,
    						23,
    						104
    					],
    					[
    						4,
    						23,
    						101
    					],
    					[
    						4,
    						23,
    						99
    					],
    					[
    						4,
    						23,
    						98
    					],
    					[
    						4,
    						23,
    						97
    					],
    					[
    						4,
    						23,
    						96
    					],
    					[
    						4,
    						23,
    						94
    					],
    					[
    						4,
    						23,
    						93
    					],
    					[
    						4,
    						23,
    						47
    					],
    					[
    						1,
    						23,
    						43
    					],
    					[
    						4,
    						23,
    						42
    					],
    					[
    						1,
    						23,
    						24
    					],
    					[
    						4,
    						23,
    						23
    					],
    					[
    						1,
    						23,
    						12
    					],
    					[
    						4,
    						23,
    						11
    					],
    					[
    						4,
    						23,
    						10
    					],
    					[
    						4,
    						24,
    						126
    					],
    					[
    						1,
    						24,
    						108
    					],
    					[
    						4,
    						24,
    						107
    					],
    					[
    						4,
    						24,
    						101
    					],
    					[
    						4,
    						24,
    						100
    					],
    					[
    						4,
    						24,
    						99
    					],
    					[
    						4,
    						24,
    						96
    					],
    					[
    						4,
    						24,
    						47
    					],
    					[
    						1,
    						24,
    						43
    					],
    					[
    						4,
    						24,
    						42
    					],
    					[
    						1,
    						24,
    						24
    					],
    					[
    						4,
    						24,
    						23
    					],
    					[
    						1,
    						24,
    						13
    					],
    					[
    						4,
    						24,
    						12
    					],
    					[
    						4,
    						24,
    						11
    					],
    					[
    						4,
    						25,
    						126
    					],
    					[
    						13,
    						25,
    						109
    					],
    					[
    						1,
    						25,
    						108
    					],
    					[
    						4,
    						25,
    						107
    					],
    					[
    						4,
    						25,
    						103
    					],
    					[
    						4,
    						25,
    						102
    					],
    					[
    						4,
    						25,
    						100
    					],
    					[
    						4,
    						25,
    						97
    					],
    					[
    						4,
    						25,
    						96
    					],
    					[
    						4,
    						25,
    						47
    					],
    					[
    						1,
    						25,
    						43
    					],
    					[
    						4,
    						25,
    						42
    					],
    					[
    						1,
    						25,
    						24
    					],
    					[
    						4,
    						25,
    						23
    					],
    					[
    						1,
    						25,
    						13
    					],
    					[
    						4,
    						25,
    						12
    					],
    					[
    						4,
    						26,
    						126
    					],
    					[
    						1,
    						26,
    						108
    					],
    					[
    						4,
    						26,
    						107
    					],
    					[
    						4,
    						26,
    						106
    					],
    					[
    						4,
    						26,
    						104
    					],
    					[
    						4,
    						26,
    						103
    					],
    					[
    						4,
    						26,
    						100
    					],
    					[
    						4,
    						26,
    						99
    					],
    					[
    						4,
    						26,
    						98
    					],
    					[
    						4,
    						26,
    						97
    					],
    					[
    						1,
    						26,
    						43
    					],
    					[
    						4,
    						26,
    						42
    					],
    					[
    						1,
    						26,
    						24
    					],
    					[
    						4,
    						26,
    						23
    					],
    					[
    						4,
    						26,
    						22
    					],
    					[
    						4,
    						26,
    						21
    					],
    					[
    						4,
    						26,
    						20
    					],
    					[
    						1,
    						26,
    						14
    					],
    					[
    						4,
    						26,
    						13
    					],
    					[
    						4,
    						26,
    						12
    					],
    					[
    						4,
    						27,
    						126
    					],
    					[
    						1,
    						27,
    						108
    					],
    					[
    						4,
    						27,
    						107
    					],
    					[
    						4,
    						27,
    						106
    					],
    					[
    						4,
    						27,
    						101
    					],
    					[
    						4,
    						27,
    						100
    					],
    					[
    						4,
    						27,
    						99
    					],
    					[
    						4,
    						27,
    						98
    					],
    					[
    						1,
    						27,
    						43
    					],
    					[
    						4,
    						27,
    						42
    					],
    					[
    						1,
    						27,
    						21
    					],
    					[
    						4,
    						27,
    						20
    					],
    					[
    						1,
    						27,
    						14
    					],
    					[
    						4,
    						27,
    						13
    					],
    					[
    						4,
    						28,
    						126
    					],
    					[
    						1,
    						28,
    						108
    					],
    					[
    						4,
    						28,
    						107
    					],
    					[
    						4,
    						28,
    						106
    					],
    					[
    						1,
    						28,
    						43
    					],
    					[
    						4,
    						28,
    						42
    					],
    					[
    						1,
    						28,
    						21
    					],
    					[
    						4,
    						28,
    						20
    					],
    					[
    						1,
    						28,
    						15
    					],
    					[
    						4,
    						28,
    						14
    					],
    					[
    						4,
    						28,
    						13
    					],
    					[
    						4,
    						29,
    						126
    					],
    					[
    						1,
    						29,
    						108
    					],
    					[
    						4,
    						29,
    						107
    					],
    					[
    						1,
    						29,
    						45
    					],
    					[
    						4,
    						29,
    						44
    					],
    					[
    						4,
    						29,
    						43
    					],
    					[
    						4,
    						29,
    						42
    					],
    					[
    						1,
    						29,
    						21
    					],
    					[
    						4,
    						29,
    						20
    					],
    					[
    						1,
    						29,
    						15
    					],
    					[
    						4,
    						29,
    						14
    					],
    					[
    						4,
    						30,
    						126
    					],
    					[
    						1,
    						30,
    						108
    					],
    					[
    						4,
    						30,
    						107
    					],
    					[
    						4,
    						30,
    						106
    					],
    					[
    						1,
    						30,
    						45
    					],
    					[
    						4,
    						30,
    						44
    					],
    					[
    						4,
    						30,
    						43
    					],
    					[
    						4,
    						30,
    						42
    					],
    					[
    						1,
    						30,
    						16
    					],
    					[
    						4,
    						30,
    						15
    					],
    					[
    						4,
    						30,
    						14
    					],
    					[
    						4,
    						31,
    						126
    					],
    					[
    						1,
    						31,
    						108
    					],
    					[
    						4,
    						31,
    						107
    					],
    					[
    						4,
    						31,
    						106
    					],
    					[
    						4,
    						31,
    						50
    					],
    					[
    						4,
    						31,
    						49
    					],
    					[
    						4,
    						31,
    						48
    					],
    					[
    						4,
    						31,
    						47
    					],
    					[
    						4,
    						31,
    						46
    					],
    					[
    						4,
    						31,
    						45
    					],
    					[
    						4,
    						31,
    						44
    					],
    					[
    						1,
    						31,
    						17
    					],
    					[
    						4,
    						31,
    						16
    					],
    					[
    						4,
    						31,
    						15
    					],
    					[
    						4,
    						32,
    						126
    					],
    					[
    						1,
    						32,
    						108
    					],
    					[
    						4,
    						32,
    						107
    					],
    					[
    						4,
    						32,
    						106
    					],
    					[
    						1,
    						32,
    						19
    					],
    					[
    						4,
    						32,
    						18
    					],
    					[
    						4,
    						32,
    						17
    					],
    					[
    						4,
    						32,
    						16
    					],
    					[
    						4,
    						33,
    						126
    					],
    					[
    						1,
    						33,
    						108
    					],
    					[
    						4,
    						33,
    						107
    					],
    					[
    						4,
    						33,
    						106
    					],
    					[
    						1,
    						33,
    						19
    					],
    					[
    						4,
    						33,
    						18
    					],
    					[
    						1,
    						34,
    						108
    					],
    					[
    						4,
    						34,
    						107
    					],
    					[
    						4,
    						34,
    						106
    					],
    					[
    						1,
    						34,
    						19
    					],
    					[
    						4,
    						34,
    						18
    					],
    					[
    						1,
    						35,
    						108
    					],
    					[
    						4,
    						35,
    						107
    					],
    					[
    						4,
    						35,
    						106
    					],
    					[
    						1,
    						36,
    						107
    					],
    					[
    						4,
    						36,
    						106
    					],
    					[
    						1,
    						37,
    						107
    					],
    					[
    						4,
    						37,
    						106
    					],
    					[
    						1,
    						38,
    						107
    					],
    					[
    						4,
    						38,
    						106
    					],
    					[
    						1,
    						39,
    						107
    					],
    					[
    						4,
    						39,
    						106
    					],
    					[
    						1,
    						40,
    						107
    					],
    					[
    						4,
    						40,
    						106
    					],
    					[
    						1,
    						41,
    						107
    					],
    					[
    						4,
    						41,
    						106
    					],
    					[
    						4,
    						41,
    						105
    					],
    					[
    						1,
    						42,
    						107
    					],
    					[
    						4,
    						42,
    						106
    					],
    					[
    						4,
    						42,
    						105
    					],
    					[
    						1,
    						43,
    						107
    					],
    					[
    						4,
    						43,
    						106
    					],
    					[
    						4,
    						43,
    						105
    					],
    					[
    						4,
    						43,
    						104
    					],
    					[
    						4,
    						43,
    						103
    					],
    					[
    						4,
    						43,
    						102
    					],
    					[
    						1,
    						44,
    						107
    					],
    					[
    						4,
    						44,
    						106
    					],
    					[
    						4,
    						44,
    						105
    					],
    					[
    						4,
    						44,
    						104
    					],
    					[
    						4,
    						44,
    						103
    					],
    					[
    						4,
    						44,
    						102
    					],
    					[
    						4,
    						44,
    						101
    					],
    					[
    						1,
    						45,
    						107
    					],
    					[
    						4,
    						45,
    						106
    					],
    					[
    						4,
    						45,
    						101
    					],
    					[
    						1,
    						46,
    						107
    					],
    					[
    						4,
    						46,
    						106
    					],
    					[
    						4,
    						46,
    						101
    					],
    					[
    						1,
    						47,
    						107
    					],
    					[
    						4,
    						47,
    						106
    					],
    					[
    						4,
    						47,
    						101
    					],
    					[
    						1,
    						48,
    						107
    					],
    					[
    						4,
    						48,
    						106
    					],
    					[
    						4,
    						48,
    						101
    					],
    					[
    						1,
    						49,
    						107
    					],
    					[
    						4,
    						49,
    						106
    					],
    					[
    						4,
    						49,
    						105
    					],
    					[
    						4,
    						49,
    						101
    					],
    					[
    						1,
    						50,
    						106
    					],
    					[
    						4,
    						50,
    						105
    					],
    					[
    						4,
    						50,
    						104
    					],
    					[
    						4,
    						50,
    						101
    					],
    					[
    						1,
    						51,
    						105
    					],
    					[
    						4,
    						51,
    						104
    					],
    					[
    						4,
    						51,
    						101
    					],
    					[
    						1,
    						52,
    						104
    					],
    					[
    						4,
    						52,
    						103
    					],
    					[
    						4,
    						52,
    						101
    					],
    					[
    						1,
    						53,
    						104
    					],
    					[
    						4,
    						53,
    						103
    					],
    					[
    						4,
    						53,
    						102
    					],
    					[
    						4,
    						53,
    						101
    					],
    					[
    						1,
    						54,
    						103
    					],
    					[
    						4,
    						54,
    						102
    					],
    					[
    						4,
    						54,
    						101
    					],
    					[
    						12,
    						55,
    						104
    					],
    					[
    						1,
    						55,
    						103
    					],
    					[
    						4,
    						55,
    						102
    					],
    					[
    						4,
    						55,
    						101
    					]
    				],
    				enemies: [
    					[
    						1,
    						5,
    						35
    					],
    					[
    						1,
    						8,
    						36
    					],
    					[
    						2,
    						17,
    						113
    					],
    					[
    						1,
    						21,
    						112
    					],
    					[
    						1,
    						24,
    						113
    					],
    					[
    						1,
    						29,
    						111
    					]
    				],
    				thumbnail: "data:image/png;base64,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",
    				id: 4,
    				prerequisiteLevels: [
    					2
    				],
    				requiredLevels: [
    					4
    				]
    			},
    			"5": {
    				name: "level 1",
    				playableCharacters: [
    					1
    				],
    				background: "rgba(82, 82, 82, 255)",
    				blocks: [
    					[
    						1,
    						0,
    						2
    					],
    					[
    						4,
    						0,
    						1
    					],
    					[
    						4,
    						0,
    						0
    					],
    					[
    						1,
    						1,
    						2
    					],
    					[
    						4,
    						1,
    						1
    					],
    					[
    						4,
    						1,
    						0
    					],
    					[
    						1,
    						2,
    						2
    					],
    					[
    						4,
    						2,
    						1
    					],
    					[
    						4,
    						2,
    						0
    					],
    					[
    						1,
    						3,
    						2
    					],
    					[
    						4,
    						3,
    						1
    					],
    					[
    						4,
    						3,
    						0
    					],
    					[
    						11,
    						4,
    						4
    					],
    					[
    						11,
    						4,
    						3
    					],
    					[
    						1,
    						4,
    						2
    					],
    					[
    						4,
    						4,
    						1
    					],
    					[
    						4,
    						4,
    						0
    					],
    					[
    						11,
    						5,
    						5
    					],
    					[
    						11,
    						5,
    						4
    					],
    					[
    						11,
    						5,
    						3
    					],
    					[
    						1,
    						5,
    						2
    					],
    					[
    						4,
    						5,
    						1
    					],
    					[
    						4,
    						5,
    						0
    					],
    					[
    						11,
    						6,
    						5
    					],
    					[
    						11,
    						6,
    						4
    					],
    					[
    						11,
    						6,
    						3
    					],
    					[
    						1,
    						6,
    						2
    					],
    					[
    						4,
    						6,
    						1
    					],
    					[
    						4,
    						6,
    						0
    					],
    					[
    						11,
    						7,
    						6
    					],
    					[
    						11,
    						7,
    						5
    					],
    					[
    						11,
    						7,
    						4
    					],
    					[
    						11,
    						7,
    						3
    					],
    					[
    						3,
    						7,
    						2
    					],
    					[
    						4,
    						7,
    						1
    					],
    					[
    						4,
    						7,
    						0
    					],
    					[
    						11,
    						8,
    						6
    					],
    					[
    						11,
    						8,
    						5
    					],
    					[
    						11,
    						8,
    						4
    					],
    					[
    						11,
    						8,
    						3
    					],
    					[
    						3,
    						8,
    						2
    					],
    					[
    						4,
    						8,
    						1
    					],
    					[
    						4,
    						8,
    						0
    					],
    					[
    						11,
    						9,
    						6
    					],
    					[
    						11,
    						9,
    						5
    					],
    					[
    						11,
    						9,
    						4
    					],
    					[
    						11,
    						9,
    						3
    					],
    					[
    						3,
    						9,
    						2
    					],
    					[
    						4,
    						9,
    						1
    					],
    					[
    						4,
    						9,
    						0
    					],
    					[
    						11,
    						10,
    						6
    					],
    					[
    						11,
    						10,
    						5
    					],
    					[
    						11,
    						10,
    						4
    					],
    					[
    						11,
    						10,
    						3
    					],
    					[
    						1,
    						10,
    						2
    					],
    					[
    						4,
    						10,
    						1
    					],
    					[
    						4,
    						10,
    						0
    					],
    					[
    						11,
    						11,
    						6
    					],
    					[
    						11,
    						11,
    						5
    					],
    					[
    						11,
    						11,
    						4
    					],
    					[
    						1,
    						11,
    						2
    					],
    					[
    						4,
    						11,
    						1
    					],
    					[
    						4,
    						11,
    						0
    					],
    					[
    						11,
    						12,
    						6
    					],
    					[
    						11,
    						12,
    						5
    					],
    					[
    						11,
    						12,
    						4
    					],
    					[
    						1,
    						12,
    						2
    					],
    					[
    						4,
    						12,
    						1
    					],
    					[
    						4,
    						12,
    						0
    					],
    					[
    						11,
    						13,
    						5
    					],
    					[
    						11,
    						13,
    						4
    					],
    					[
    						11,
    						13,
    						3
    					],
    					[
    						1,
    						13,
    						2
    					],
    					[
    						4,
    						13,
    						1
    					],
    					[
    						4,
    						13,
    						0
    					],
    					[
    						11,
    						14,
    						2
    					],
    					[
    						1,
    						14,
    						1
    					],
    					[
    						4,
    						14,
    						0
    					],
    					[
    						11,
    						15,
    						2
    					],
    					[
    						1,
    						15,
    						1
    					],
    					[
    						4,
    						15,
    						0
    					],
    					[
    						1,
    						16,
    						1
    					],
    					[
    						4,
    						16,
    						0
    					],
    					[
    						11,
    						17,
    						2
    					],
    					[
    						1,
    						17,
    						1
    					],
    					[
    						4,
    						17,
    						0
    					],
    					[
    						1,
    						18,
    						1
    					],
    					[
    						4,
    						18,
    						0
    					],
    					[
    						1,
    						19,
    						1
    					],
    					[
    						4,
    						19,
    						0
    					],
    					[
    						3,
    						20,
    						2
    					],
    					[
    						1,
    						20,
    						1
    					],
    					[
    						4,
    						20,
    						0
    					],
    					[
    						3,
    						21,
    						2
    					],
    					[
    						1,
    						21,
    						1
    					],
    					[
    						4,
    						21,
    						0
    					],
    					[
    						3,
    						22,
    						2
    					],
    					[
    						1,
    						22,
    						1
    					],
    					[
    						4,
    						22,
    						0
    					],
    					[
    						3,
    						23,
    						2
    					],
    					[
    						1,
    						23,
    						1
    					],
    					[
    						4,
    						23,
    						0
    					],
    					[
    						10,
    						24,
    						5
    					],
    					[
    						3,
    						24,
    						2
    					],
    					[
    						1,
    						24,
    						1
    					],
    					[
    						4,
    						24,
    						0
    					],
    					[
    						1,
    						25,
    						1
    					],
    					[
    						4,
    						25,
    						0
    					],
    					[
    						1,
    						26,
    						2
    					],
    					[
    						4,
    						26,
    						1
    					],
    					[
    						4,
    						26,
    						0
    					],
    					[
    						1,
    						27,
    						3
    					],
    					[
    						4,
    						27,
    						2
    					],
    					[
    						4,
    						27,
    						1
    					],
    					[
    						1,
    						28,
    						3
    					],
    					[
    						4,
    						28,
    						2
    					],
    					[
    						1,
    						29,
    						3
    					],
    					[
    						4,
    						29,
    						2
    					],
    					[
    						1,
    						30,
    						4
    					],
    					[
    						4,
    						30,
    						3
    					],
    					[
    						4,
    						30,
    						2
    					],
    					[
    						1,
    						31,
    						4
    					],
    					[
    						4,
    						31,
    						3
    					],
    					[
    						8,
    						32,
    						5
    					],
    					[
    						1,
    						32,
    						4
    					],
    					[
    						4,
    						32,
    						3
    					]
    				],
    				enemies: [
    					[
    						2,
    						11,
    						3
    					],
    					[
    						2,
    						12,
    						3
    					],
    					[
    						2,
    						16,
    						2
    					],
    					[
    						2,
    						18,
    						2
    					],
    					[
    						1,
    						27,
    						4
    					]
    				],
    				thumbnail: "data:image/png;base64,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",
    				id: 5,
    				prerequisiteLevels: [
    					3
    				],
    				requiredLevels: [
    				]
    			},
    			"6": {
    				name: "level 2",
    				playableCharacters: [
    					1
    				],
    				background: "rgba(101, 101, 101, 255)",
    				blocks: [
    					[
    						1,
    						0,
    						1
    					],
    					[
    						4,
    						0,
    						0
    					],
    					[
    						1,
    						1,
    						1
    					],
    					[
    						4,
    						1,
    						0
    					],
    					[
    						1,
    						2,
    						1
    					],
    					[
    						4,
    						2,
    						0
    					],
    					[
    						1,
    						3,
    						1
    					],
    					[
    						4,
    						3,
    						0
    					],
    					[
    						1,
    						4,
    						1
    					],
    					[
    						4,
    						4,
    						0
    					],
    					[
    						1,
    						5,
    						1
    					],
    					[
    						4,
    						5,
    						0
    					],
    					[
    						1,
    						6,
    						1
    					],
    					[
    						4,
    						6,
    						0
    					],
    					[
    						1,
    						7,
    						1
    					],
    					[
    						4,
    						7,
    						0
    					],
    					[
    						1,
    						8,
    						1
    					],
    					[
    						4,
    						8,
    						0
    					],
    					[
    						1,
    						9,
    						1
    					],
    					[
    						4,
    						9,
    						0
    					],
    					[
    						1,
    						10,
    						1
    					],
    					[
    						4,
    						10,
    						0
    					],
    					[
    						1,
    						11,
    						1
    					],
    					[
    						4,
    						11,
    						0
    					],
    					[
    						1,
    						12,
    						2
    					],
    					[
    						4,
    						12,
    						1
    					],
    					[
    						4,
    						12,
    						0
    					],
    					[
    						1,
    						13,
    						2
    					],
    					[
    						4,
    						13,
    						1
    					],
    					[
    						4,
    						13,
    						0
    					],
    					[
    						1,
    						14,
    						2
    					],
    					[
    						4,
    						14,
    						1
    					],
    					[
    						4,
    						14,
    						0
    					],
    					[
    						1,
    						15,
    						5
    					],
    					[
    						4,
    						15,
    						4
    					],
    					[
    						4,
    						15,
    						3
    					],
    					[
    						4,
    						15,
    						2
    					],
    					[
    						4,
    						15,
    						1
    					],
    					[
    						4,
    						15,
    						0
    					],
    					[
    						1,
    						16,
    						5
    					],
    					[
    						1,
    						16,
    						1
    					],
    					[
    						4,
    						16,
    						0
    					],
    					[
    						1,
    						17,
    						5
    					],
    					[
    						8,
    						17,
    						2
    					],
    					[
    						1,
    						17,
    						1
    					],
    					[
    						4,
    						17,
    						0
    					],
    					[
    						1,
    						18,
    						5
    					],
    					[
    						1,
    						18,
    						1
    					],
    					[
    						4,
    						18,
    						0
    					],
    					[
    						1,
    						19,
    						5
    					],
    					[
    						1,
    						19,
    						1
    					],
    					[
    						4,
    						19,
    						0
    					],
    					[
    						1,
    						20,
    						5
    					],
    					[
    						1,
    						20,
    						1
    					],
    					[
    						4,
    						20,
    						0
    					],
    					[
    						1,
    						21,
    						5
    					],
    					[
    						12,
    						21,
    						2
    					],
    					[
    						1,
    						21,
    						1
    					],
    					[
    						4,
    						21,
    						0
    					],
    					[
    						1,
    						22,
    						5
    					],
    					[
    						1,
    						22,
    						1
    					],
    					[
    						4,
    						22,
    						0
    					],
    					[
    						1,
    						23,
    						5
    					],
    					[
    						4,
    						23,
    						4
    					],
    					[
    						4,
    						23,
    						3
    					],
    					[
    						4,
    						23,
    						2
    					],
    					[
    						4,
    						23,
    						1
    					],
    					[
    						4,
    						23,
    						0
    					],
    					[
    						4,
    						24,
    						1
    					],
    					[
    						4,
    						24,
    						0
    					],
    					[
    						4,
    						25,
    						1
    					],
    					[
    						4,
    						25,
    						0
    					],
    					[
    						4,
    						26,
    						1
    					],
    					[
    						4,
    						26,
    						0
    					],
    					[
    						4,
    						27,
    						1
    					],
    					[
    						4,
    						27,
    						0
    					],
    					[
    						4,
    						28,
    						1
    					],
    					[
    						4,
    						28,
    						0
    					],
    					[
    						4,
    						29,
    						1
    					],
    					[
    						4,
    						29,
    						0
    					],
    					[
    						4,
    						30,
    						1
    					],
    					[
    						4,
    						30,
    						0
    					],
    					[
    						4,
    						31,
    						1
    					],
    					[
    						4,
    						31,
    						0
    					],
    					[
    						4,
    						32,
    						1
    					],
    					[
    						4,
    						32,
    						0
    					],
    					[
    						4,
    						33,
    						1
    					],
    					[
    						4,
    						33,
    						0
    					],
    					[
    						4,
    						34,
    						1
    					],
    					[
    						4,
    						34,
    						0
    					],
    					[
    						4,
    						35,
    						1
    					],
    					[
    						4,
    						35,
    						0
    					],
    					[
    						4,
    						36,
    						1
    					],
    					[
    						4,
    						36,
    						0
    					],
    					[
    						4,
    						37,
    						1
    					],
    					[
    						4,
    						37,
    						0
    					],
    					[
    						4,
    						38,
    						1
    					],
    					[
    						4,
    						38,
    						0
    					],
    					[
    						4,
    						39,
    						1
    					],
    					[
    						4,
    						39,
    						0
    					],
    					[
    						4,
    						40,
    						1
    					],
    					[
    						4,
    						40,
    						0
    					],
    					[
    						4,
    						41,
    						1
    					],
    					[
    						4,
    						41,
    						0
    					],
    					[
    						4,
    						42,
    						1
    					],
    					[
    						4,
    						42,
    						0
    					],
    					[
    						4,
    						43,
    						1
    					],
    					[
    						4,
    						43,
    						0
    					],
    					[
    						4,
    						44,
    						1
    					],
    					[
    						4,
    						44,
    						0
    					],
    					[
    						4,
    						45,
    						1
    					],
    					[
    						4,
    						45,
    						0
    					],
    					[
    						4,
    						46,
    						1
    					],
    					[
    						4,
    						46,
    						0
    					],
    					[
    						4,
    						47,
    						1
    					],
    					[
    						4,
    						47,
    						0
    					],
    					[
    						4,
    						48,
    						1
    					],
    					[
    						4,
    						48,
    						0
    					],
    					[
    						4,
    						49,
    						1
    					],
    					[
    						4,
    						49,
    						0
    					],
    					[
    						4,
    						50,
    						1
    					],
    					[
    						4,
    						50,
    						0
    					],
    					[
    						4,
    						51,
    						1
    					],
    					[
    						4,
    						51,
    						0
    					],
    					[
    						12,
    						52,
    						2
    					],
    					[
    						4,
    						52,
    						1
    					],
    					[
    						4,
    						52,
    						0
    					]
    				],
    				enemies: [
    					[
    						1,
    						10,
    						3
    					],
    					[
    						1,
    						21,
    						7
    					],
    					[
    						1,
    						23,
    						7
    					],
    					[
    						1,
    						34,
    						2
    					],
    					[
    						2,
    						36,
    						2
    					],
    					[
    						2,
    						37,
    						3
    					],
    					[
    						2,
    						37,
    						2
    					],
    					[
    						2,
    						38,
    						3
    					],
    					[
    						2,
    						38,
    						2
    					],
    					[
    						2,
    						39,
    						2
    					],
    					[
    						1,
    						42,
    						2
    					],
    					[
    						2,
    						43,
    						4
    					],
    					[
    						2,
    						47,
    						2
    					]
    				],
    				requiredLevels: [
    					5
    				],
    				thumbnail: "data:image/png;base64,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",
    				id: 6
    			},
    			"7": {
    				name: "level 5",
    				playableCharacters: [
    					1
    				],
    				background: "rgba(91, 91, 91, 255)",
    				blocks: [
    					[
    						1,
    						0,
    						1
    					],
    					[
    						4,
    						0,
    						0
    					],
    					[
    						4,
    						1,
    						15
    					],
    					[
    						1,
    						1,
    						1
    					],
    					[
    						4,
    						1,
    						0
    					],
    					[
    						4,
    						2,
    						15
    					],
    					[
    						1,
    						2,
    						1
    					],
    					[
    						4,
    						2,
    						0
    					],
    					[
    						4,
    						3,
    						15
    					],
    					[
    						1,
    						3,
    						1
    					],
    					[
    						4,
    						3,
    						0
    					],
    					[
    						4,
    						4,
    						15
    					],
    					[
    						1,
    						4,
    						1
    					],
    					[
    						4,
    						4,
    						0
    					],
    					[
    						4,
    						5,
    						15
    					],
    					[
    						1,
    						5,
    						1
    					],
    					[
    						4,
    						5,
    						0
    					],
    					[
    						4,
    						6,
    						15
    					],
    					[
    						1,
    						6,
    						1
    					],
    					[
    						4,
    						6,
    						0
    					],
    					[
    						4,
    						7,
    						15
    					],
    					[
    						1,
    						7,
    						1
    					],
    					[
    						4,
    						7,
    						0
    					],
    					[
    						4,
    						8,
    						15
    					],
    					[
    						1,
    						8,
    						1
    					],
    					[
    						4,
    						8,
    						0
    					],
    					[
    						4,
    						9,
    						15
    					],
    					[
    						13,
    						9,
    						2
    					],
    					[
    						1,
    						9,
    						1
    					],
    					[
    						4,
    						9,
    						0
    					],
    					[
    						4,
    						10,
    						15
    					],
    					[
    						1,
    						10,
    						1
    					],
    					[
    						4,
    						10,
    						0
    					],
    					[
    						4,
    						11,
    						15
    					],
    					[
    						1,
    						11,
    						1
    					],
    					[
    						4,
    						11,
    						0
    					],
    					[
    						4,
    						12,
    						15
    					],
    					[
    						1,
    						12,
    						1
    					],
    					[
    						4,
    						12,
    						0
    					],
    					[
    						4,
    						13,
    						15
    					],
    					[
    						1,
    						13,
    						1
    					],
    					[
    						4,
    						13,
    						0
    					],
    					[
    						4,
    						14,
    						15
    					],
    					[
    						1,
    						14,
    						1
    					],
    					[
    						4,
    						14,
    						0
    					],
    					[
    						4,
    						15,
    						15
    					],
    					[
    						1,
    						15,
    						1
    					],
    					[
    						4,
    						15,
    						0
    					],
    					[
    						4,
    						16,
    						15
    					],
    					[
    						1,
    						16,
    						1
    					],
    					[
    						4,
    						16,
    						0
    					],
    					[
    						4,
    						17,
    						15
    					],
    					[
    						1,
    						17,
    						1
    					],
    					[
    						4,
    						17,
    						0
    					],
    					[
    						4,
    						18,
    						15
    					],
    					[
    						1,
    						18,
    						1
    					],
    					[
    						4,
    						18,
    						0
    					],
    					[
    						4,
    						19,
    						15
    					],
    					[
    						1,
    						19,
    						1
    					],
    					[
    						4,
    						19,
    						0
    					],
    					[
    						4,
    						20,
    						15
    					],
    					[
    						1,
    						20,
    						1
    					],
    					[
    						4,
    						20,
    						0
    					],
    					[
    						4,
    						21,
    						15
    					],
    					[
    						1,
    						21,
    						1
    					],
    					[
    						4,
    						21,
    						0
    					],
    					[
    						4,
    						22,
    						15
    					],
    					[
    						1,
    						22,
    						1
    					],
    					[
    						4,
    						22,
    						0
    					],
    					[
    						4,
    						23,
    						15
    					],
    					[
    						1,
    						23,
    						1
    					],
    					[
    						4,
    						23,
    						0
    					],
    					[
    						4,
    						24,
    						15
    					],
    					[
    						1,
    						24,
    						1
    					],
    					[
    						4,
    						24,
    						0
    					],
    					[
    						4,
    						25,
    						15
    					],
    					[
    						13,
    						25,
    						14
    					],
    					[
    						1,
    						25,
    						1
    					],
    					[
    						4,
    						25,
    						0
    					],
    					[
    						4,
    						26,
    						15
    					],
    					[
    						1,
    						26,
    						1
    					],
    					[
    						4,
    						26,
    						0
    					],
    					[
    						4,
    						27,
    						15
    					],
    					[
    						1,
    						27,
    						1
    					],
    					[
    						4,
    						27,
    						0
    					],
    					[
    						4,
    						28,
    						15
    					],
    					[
    						1,
    						28,
    						1
    					],
    					[
    						4,
    						28,
    						0
    					],
    					[
    						4,
    						29,
    						15
    					],
    					[
    						1,
    						29,
    						1
    					],
    					[
    						4,
    						29,
    						0
    					],
    					[
    						4,
    						30,
    						15
    					],
    					[
    						1,
    						30,
    						1
    					],
    					[
    						4,
    						30,
    						0
    					],
    					[
    						4,
    						31,
    						15
    					],
    					[
    						1,
    						31,
    						1
    					],
    					[
    						4,
    						31,
    						0
    					],
    					[
    						4,
    						32,
    						15
    					],
    					[
    						1,
    						32,
    						1
    					],
    					[
    						4,
    						32,
    						0
    					],
    					[
    						4,
    						33,
    						15
    					],
    					[
    						1,
    						33,
    						1
    					],
    					[
    						4,
    						33,
    						0
    					],
    					[
    						4,
    						34,
    						15
    					],
    					[
    						1,
    						34,
    						1
    					],
    					[
    						4,
    						34,
    						0
    					],
    					[
    						4,
    						35,
    						15
    					],
    					[
    						1,
    						35,
    						1
    					],
    					[
    						4,
    						35,
    						0
    					],
    					[
    						4,
    						36,
    						15
    					],
    					[
    						1,
    						36,
    						1
    					],
    					[
    						4,
    						36,
    						0
    					],
    					[
    						4,
    						37,
    						15
    					],
    					[
    						1,
    						37,
    						1
    					],
    					[
    						4,
    						37,
    						0
    					],
    					[
    						4,
    						38,
    						15
    					],
    					[
    						1,
    						38,
    						1
    					],
    					[
    						4,
    						38,
    						0
    					],
    					[
    						4,
    						39,
    						15
    					],
    					[
    						1,
    						39,
    						1
    					],
    					[
    						4,
    						39,
    						0
    					],
    					[
    						4,
    						40,
    						15
    					],
    					[
    						1,
    						40,
    						1
    					],
    					[
    						4,
    						40,
    						0
    					],
    					[
    						4,
    						41,
    						15
    					],
    					[
    						1,
    						41,
    						1
    					],
    					[
    						4,
    						41,
    						0
    					],
    					[
    						4,
    						42,
    						15
    					],
    					[
    						1,
    						42,
    						1
    					],
    					[
    						4,
    						42,
    						0
    					],
    					[
    						4,
    						43,
    						15
    					],
    					[
    						13,
    						43,
    						2
    					],
    					[
    						1,
    						43,
    						1
    					],
    					[
    						4,
    						43,
    						0
    					],
    					[
    						4,
    						44,
    						15
    					],
    					[
    						1,
    						44,
    						1
    					],
    					[
    						4,
    						44,
    						0
    					],
    					[
    						4,
    						45,
    						15
    					],
    					[
    						1,
    						45,
    						1
    					],
    					[
    						4,
    						45,
    						0
    					],
    					[
    						4,
    						46,
    						15
    					],
    					[
    						1,
    						46,
    						1
    					],
    					[
    						4,
    						46,
    						0
    					],
    					[
    						4,
    						47,
    						15
    					],
    					[
    						1,
    						47,
    						1
    					],
    					[
    						4,
    						47,
    						0
    					],
    					[
    						4,
    						48,
    						15
    					],
    					[
    						1,
    						48,
    						1
    					],
    					[
    						4,
    						48,
    						0
    					],
    					[
    						4,
    						49,
    						15
    					],
    					[
    						1,
    						49,
    						1
    					],
    					[
    						4,
    						49,
    						0
    					],
    					[
    						4,
    						50,
    						15
    					],
    					[
    						1,
    						50,
    						1
    					],
    					[
    						4,
    						50,
    						0
    					],
    					[
    						4,
    						51,
    						15
    					],
    					[
    						1,
    						51,
    						1
    					],
    					[
    						4,
    						51,
    						0
    					],
    					[
    						4,
    						52,
    						15
    					],
    					[
    						1,
    						52,
    						1
    					],
    					[
    						4,
    						52,
    						0
    					],
    					[
    						4,
    						53,
    						15
    					],
    					[
    						1,
    						53,
    						1
    					],
    					[
    						4,
    						53,
    						0
    					],
    					[
    						4,
    						54,
    						15
    					],
    					[
    						1,
    						54,
    						1
    					],
    					[
    						4,
    						54,
    						0
    					],
    					[
    						4,
    						55,
    						15
    					],
    					[
    						1,
    						55,
    						1
    					],
    					[
    						4,
    						55,
    						0
    					],
    					[
    						4,
    						56,
    						15
    					],
    					[
    						1,
    						56,
    						1
    					],
    					[
    						4,
    						56,
    						0
    					],
    					[
    						4,
    						57,
    						15
    					],
    					[
    						1,
    						57,
    						1
    					],
    					[
    						4,
    						57,
    						0
    					],
    					[
    						4,
    						58,
    						15
    					],
    					[
    						13,
    						58,
    						14
    					],
    					[
    						1,
    						58,
    						1
    					],
    					[
    						4,
    						58,
    						0
    					],
    					[
    						4,
    						59,
    						33
    					],
    					[
    						4,
    						59,
    						32
    					],
    					[
    						4,
    						59,
    						31
    					],
    					[
    						4,
    						59,
    						30
    					],
    					[
    						4,
    						59,
    						29
    					],
    					[
    						4,
    						59,
    						28
    					],
    					[
    						4,
    						59,
    						27
    					],
    					[
    						4,
    						59,
    						26
    					],
    					[
    						4,
    						59,
    						25
    					],
    					[
    						4,
    						59,
    						24
    					],
    					[
    						4,
    						59,
    						23
    					],
    					[
    						4,
    						59,
    						22
    					],
    					[
    						4,
    						59,
    						21
    					],
    					[
    						4,
    						59,
    						20
    					],
    					[
    						4,
    						59,
    						19
    					],
    					[
    						4,
    						59,
    						18
    					],
    					[
    						4,
    						59,
    						17
    					],
    					[
    						4,
    						59,
    						16
    					],
    					[
    						4,
    						59,
    						15
    					],
    					[
    						1,
    						59,
    						1
    					],
    					[
    						4,
    						59,
    						0
    					],
    					[
    						4,
    						60,
    						33
    					],
    					[
    						13,
    						60,
    						32
    					],
    					[
    						6,
    						60,
    						31
    					],
    					[
    						6,
    						60,
    						30
    					],
    					[
    						6,
    						60,
    						29
    					],
    					[
    						6,
    						60,
    						28
    					],
    					[
    						13,
    						60,
    						16
    					],
    					[
    						4,
    						60,
    						15
    					],
    					[
    						1,
    						60,
    						1
    					],
    					[
    						4,
    						60,
    						0
    					],
    					[
    						4,
    						61,
    						33
    					],
    					[
    						6,
    						61,
    						32
    					],
    					[
    						12,
    						61,
    						31
    					],
    					[
    						6,
    						61,
    						30
    					],
    					[
    						6,
    						61,
    						29
    					],
    					[
    						6,
    						61,
    						28
    					],
    					[
    						4,
    						61,
    						15
    					],
    					[
    						1,
    						61,
    						1
    					],
    					[
    						4,
    						61,
    						0
    					],
    					[
    						4,
    						62,
    						33
    					],
    					[
    						6,
    						62,
    						32
    					],
    					[
    						6,
    						62,
    						31
    					],
    					[
    						6,
    						62,
    						30
    					],
    					[
    						6,
    						62,
    						29
    					],
    					[
    						6,
    						62,
    						28
    					],
    					[
    						4,
    						62,
    						15
    					],
    					[
    						1,
    						62,
    						1
    					],
    					[
    						4,
    						62,
    						0
    					],
    					[
    						4,
    						63,
    						33
    					],
    					[
    						6,
    						63,
    						32
    					],
    					[
    						6,
    						63,
    						31
    					],
    					[
    						6,
    						63,
    						30
    					],
    					[
    						6,
    						63,
    						29
    					],
    					[
    						6,
    						63,
    						28
    					],
    					[
    						12,
    						63,
    						17
    					],
    					[
    						4,
    						63,
    						15
    					],
    					[
    						1,
    						63,
    						1
    					],
    					[
    						4,
    						63,
    						0
    					],
    					[
    						4,
    						64,
    						33
    					],
    					[
    						6,
    						64,
    						32
    					],
    					[
    						6,
    						64,
    						31
    					],
    					[
    						6,
    						64,
    						30
    					],
    					[
    						6,
    						64,
    						29
    					],
    					[
    						6,
    						64,
    						28
    					],
    					[
    						4,
    						64,
    						15
    					],
    					[
    						1,
    						64,
    						1
    					],
    					[
    						4,
    						64,
    						0
    					],
    					[
    						4,
    						65,
    						33
    					],
    					[
    						4,
    						65,
    						32
    					],
    					[
    						4,
    						65,
    						31
    					],
    					[
    						4,
    						65,
    						30
    					],
    					[
    						4,
    						65,
    						29
    					],
    					[
    						4,
    						65,
    						28
    					],
    					[
    						4,
    						65,
    						27
    					],
    					[
    						4,
    						65,
    						26
    					],
    					[
    						4,
    						65,
    						25
    					],
    					[
    						4,
    						65,
    						24
    					],
    					[
    						4,
    						65,
    						23
    					],
    					[
    						4,
    						65,
    						22
    					],
    					[
    						4,
    						65,
    						21
    					],
    					[
    						4,
    						65,
    						20
    					],
    					[
    						4,
    						65,
    						19
    					],
    					[
    						4,
    						65,
    						18
    					],
    					[
    						4,
    						65,
    						17
    					],
    					[
    						4,
    						65,
    						16
    					],
    					[
    						4,
    						65,
    						15
    					],
    					[
    						1,
    						65,
    						1
    					],
    					[
    						4,
    						65,
    						0
    					],
    					[
    						4,
    						66,
    						33
    					],
    					[
    						4,
    						66,
    						26
    					],
    					[
    						4,
    						66,
    						15
    					],
    					[
    						1,
    						66,
    						1
    					],
    					[
    						4,
    						66,
    						0
    					],
    					[
    						4,
    						67,
    						33
    					],
    					[
    						4,
    						67,
    						26
    					],
    					[
    						4,
    						67,
    						15
    					],
    					[
    						1,
    						67,
    						1
    					],
    					[
    						4,
    						67,
    						0
    					],
    					[
    						4,
    						68,
    						33
    					],
    					[
    						4,
    						68,
    						26
    					],
    					[
    						4,
    						68,
    						15
    					],
    					[
    						1,
    						68,
    						1
    					],
    					[
    						4,
    						68,
    						0
    					],
    					[
    						4,
    						69,
    						33
    					],
    					[
    						4,
    						69,
    						26
    					],
    					[
    						4,
    						69,
    						15
    					],
    					[
    						1,
    						69,
    						1
    					],
    					[
    						4,
    						69,
    						0
    					],
    					[
    						4,
    						70,
    						33
    					],
    					[
    						12,
    						70,
    						27
    					],
    					[
    						4,
    						70,
    						26
    					],
    					[
    						4,
    						70,
    						15
    					],
    					[
    						1,
    						70,
    						1
    					],
    					[
    						4,
    						70,
    						0
    					],
    					[
    						4,
    						71,
    						33
    					],
    					[
    						8,
    						71,
    						32
    					],
    					[
    						4,
    						71,
    						26
    					],
    					[
    						4,
    						71,
    						15
    					],
    					[
    						1,
    						71,
    						1
    					],
    					[
    						4,
    						71,
    						0
    					],
    					[
    						4,
    						72,
    						33
    					],
    					[
    						4,
    						72,
    						32
    					],
    					[
    						4,
    						72,
    						31
    					],
    					[
    						4,
    						72,
    						30
    					],
    					[
    						4,
    						72,
    						29
    					],
    					[
    						4,
    						72,
    						28
    					],
    					[
    						4,
    						72,
    						27
    					],
    					[
    						4,
    						72,
    						26
    					],
    					[
    						4,
    						72,
    						15
    					],
    					[
    						12,
    						72,
    						14
    					],
    					[
    						1,
    						72,
    						1
    					],
    					[
    						4,
    						72,
    						0
    					],
    					[
    						4,
    						73,
    						15
    					],
    					[
    						13,
    						73,
    						2
    					],
    					[
    						1,
    						73,
    						1
    					],
    					[
    						4,
    						73,
    						0
    					],
    					[
    						4,
    						74,
    						15
    					],
    					[
    						4,
    						74,
    						14
    					],
    					[
    						1,
    						74,
    						1
    					],
    					[
    						4,
    						74,
    						0
    					],
    					[
    						4,
    						75,
    						14
    					],
    					[
    						1,
    						75,
    						1
    					],
    					[
    						4,
    						75,
    						0
    					],
    					[
    						4,
    						76,
    						14
    					],
    					[
    						4,
    						76,
    						13
    					],
    					[
    						4,
    						76,
    						12
    					],
    					[
    						4,
    						76,
    						11
    					],
    					[
    						4,
    						76,
    						10
    					],
    					[
    						4,
    						76,
    						9
    					],
    					[
    						4,
    						76,
    						8
    					],
    					[
    						4,
    						76,
    						7
    					],
    					[
    						4,
    						76,
    						6
    					],
    					[
    						4,
    						76,
    						5
    					],
    					[
    						4,
    						76,
    						4
    					],
    					[
    						4,
    						76,
    						3
    					],
    					[
    						4,
    						76,
    						2
    					],
    					[
    						4,
    						76,
    						1
    					],
    					[
    						4,
    						76,
    						0
    					]
    				],
    				enemies: [
    					[
    						2,
    						31,
    						2
    					],
    					[
    						2,
    						36,
    						2
    					],
    					[
    						1,
    						58,
    						3
    					],
    					[
    						1,
    						62,
    						3
    					],
    					[
    						2,
    						65,
    						2
    					],
    					[
    						2,
    						66,
    						2
    					]
    				],
    				requiredLevels: [
    					2
    				],
    				thumbnail: "data:image/png;base64,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",
    				id: 7
    			}
    		},
    		version: 1,
    		particles: {
    			"1": {
    				name: "mr squiggles",
    				enabled: false,
    				graphic: 6,
    				speed: 100,
    				scale: {
    					start: 1,
    					end: 0.1
    				},
    				alpha: {
    					start: 0.7,
    					end: 0
    				},
    				angle: {
    					min: -180,
    					max: 180
    				},
    				rotate: {
    					min: -180,
    					max: 180
    				},
    				frequency: 25,
    				lifespan: 1500,
    				blendMode: "SCREEN",
    				rgbaColor: "rgba(255,0,0,1)",
    				colorRgba: "transparent",
    				id: 1,
    				bringToFront: true
    			},
    			"2": {
    				name: "iceball",
    				enabled: false,
    				graphic: 13,
    				speed: 25,
    				scale: {
    					start: 1.5,
    					end: 0
    				},
    				alpha: {
    					start: 1,
    					end: 0
    				},
    				angle: {
    					min: -180,
    					max: 180
    				},
    				rotate: {
    					min: -180,
    					max: 180
    				},
    				frequency: 25,
    				lifespan: 1500,
    				blendMode: "SCREEN",
    				rgbaColor: null,
    				colorRgba: "transparent",
    				id: 2,
    				bringToFront: true
    			},
    			"3": {
    				name: "fireball",
    				enabled: false,
    				graphic: 7,
    				speed: 50,
    				scale: {
    					start: 1.5,
    					end: 0
    				},
    				alpha: {
    					start: 1,
    					end: 0
    				},
    				angle: {
    					min: -180,
    					max: 180
    				},
    				rotate: {
    					min: -180,
    					max: 180
    				},
    				frequency: 25,
    				lifespan: 1500,
    				blendMode: "SCREEN",
    				rgbaColor: null,
    				colorRgba: "transparent",
    				id: 3,
    				bringToFront: true
    			},
    			"4": {
    				name: "warlock",
    				enabled: false,
    				graphic: 2,
    				speed: 50,
    				scale: {
    					start: 1,
    					end: 0
    				},
    				alpha: {
    					start: 0.1,
    					end: 0
    				},
    				angle: {
    					min: -180,
    					max: 0
    				},
    				rotate: {
    					min: -180,
    					max: 180
    				},
    				frequency: 10,
    				lifespan: 4000,
    				blendMode: null,
    				rgbaColor: null,
    				colorRgba: "transparent",
    				id: 4,
    				bringToFront: false
    			},
    			"5": {
    				graphic: 23,
    				speed: 100,
    				scale: {
    					start: 1,
    					end: 2
    				},
    				alpha: {
    					start: 1,
    					end: 0.3
    				},
    				lifespan: 500,
    				blendMode: "ADD",
    				rgbaColor: "rgba(255,0,0,1)",
    				colorRgba: "rgba(43, 43, 43, 255)",
    				name: "lava",
    				id: 5,
    				bringToFront: true
    			},
    			"6": {
    				graphic: 13,
    				speed: 100,
    				scale: {
    					start: 2,
    					end: 0.5
    				},
    				alpha: {
    					start: 1,
    					end: 0
    				},
    				lifespan: 2000,
    				blendMode: "SCREEN",
    				rgbaColor: "rgba(255,0,0,1)",
    				colorRgba: "transparent",
    				name: "ice emitter",
    				id: 6,
    				bringToFront: true
    			},
    			"7": {
    				name: "orange sparkle",
    				enabled: false,
    				graphic: 26,
    				speed: 50,
    				scale: {
    					start: 1,
    					end: 0.5
    				},
    				alpha: {
    					start: 1,
    					end: 0
    				},
    				angle: {
    					min: -70,
    					max: -45
    				},
    				rotate: {
    					min: -180,
    					max: 180
    				},
    				frequency: 200,
    				lifespan: 1000,
    				blendMode: null,
    				rgbaColor: null,
    				id: 7,
    				colorRgba: "transparent",
    				bringToFront: false
    			},
    			"8": {
    				name: "teleporter sparkle",
    				enabled: false,
    				graphic: 27,
    				speed: 25,
    				scale: {
    					start: 1,
    					end: 1
    				},
    				alpha: {
    					start: 0.1,
    					end: 0
    				},
    				angle: {
    					min: -180,
    					max: 180
    				},
    				rotate: {
    					min: -180,
    					max: 180
    				},
    				frequency: 25,
    				lifespan: 2000,
    				blendMode: "SCREEN",
    				rgbaColor: null,
    				colorRgba: "transparent",
    				bringToFront: true,
    				id: 8
    			},
    			"9": {
    				name: "win effect",
    				enabled: false,
    				graphic: 21,
    				speed: 100,
    				scale: {
    					start: 1,
    					end: 2
    				},
    				alpha: {
    					start: 0.4,
    					end: 0
    				},
    				angle: {
    					min: -180,
    					max: 180
    				},
    				rotate: {
    					min: -180,
    					max: 180
    				},
    				frequency: 50,
    				lifespan: 1000,
    				blendMode: "SCREEN",
    				rgbaColor: null,
    				colorRgba: "rgba(0, 117, 202, 255)",
    				bringToFront: true,
    				id: 9
    			}
    		},
    		gameType: "top",
    		pixelSize: 1
    	},
    	{
    		version: 1,
    		name: "Mr Squiggles RPG",
    		art: {
    			"0": {
    				name: "Grass",
    				width: 40,
    				height: 40,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAAAXNSR0IArs4c6QAAAxxJREFUWEelWeF5QiEMxBVcxhk6TP85hmN0hnYGl+kK9gMJHsclwdf+sb4H4UguyYGn8lkeBf5uH/jt+f/1d31W7uKZPbrAu3spbPP6E8wtr/F13KkCNAM2cXxHYBEgbz0CGsN6va3rVyz1swGUE814B4ZesMk2z/OILVQEUNcp4F0XYDP8X+9lXoWN44Z5s6fbd3mEnIDd386dkw6HhscInOQgerWOdyiUA2TiH+EiEL8lXefXoAhFC8Pvc1BkdhZ2JLfHTxyzRA54b+OaB9kYhioNj/AoJ1S174WfS1xzAtiUAL266O444JCXKyHg6skOcgDMimdYw4LCjHa5tJjNCSyVt5SDvFNcZAllN87ZzpRhZzDAOt/GnMqXKNRBpjJA9pBKJM9zS1TIe/X9EyAC4vq0259wXLVH9TOlkAA3AVx2+QZQDMnCq51+7IB7AVReojCn5YY9yDad3j4oQa3PprcQKw9sZ+0RCmw4ZAJ4aI3OM8tYa2GTLRVefgY1T+FYk0SMcgXnpZQIYCS3OIl4g6PVRSFO21MHGHYY2zBmtvHbSY5ZLHCZIQ8qYTkARZkOSTbZ2Jwjk0R6LCs3b8qvSQzDecWymSmjO4koGS74NwAqTk4VRLTKHOChFIdJvAHkHWTwAt7UTDs0URi9zmDLThzEMCXHybEOJokq0IBnVTMO2KMhHglisp77vtggetOVW7KGdWGK76IuFIKrtlSIUX1fnHNxKI82T2ODheKcMb1zenAbEwFU8ihUPEJcsBDAfBvl5gjA7cTFPqp6LFDC7dWJFt2S/NI4cWgJaQeXqiIStyaeLVrj8ihVvGolViJc4yKQG1yuIEOA0WHHONSy2LvH2WyTUVIuIY4ORYsTM70nWqZlZ/ukm7PlAGb3g5xdS8dgZJueGWBI2VSP76r4JcQoTlNeJmpYeWtpd0nJGCHOxOlbwDOPOwrIMCCWcf2WAeQ1EbBbhqhtmQ28eUBQZkcCrC8ZZKim+2pqjt3/TRRJlLSXydPlkQcQdxZ5Czc5UUIomSmc6leE6rBzKYdvt6IaOdEhuDXYaal/AlHUi85ADnEAAAAASUVORK5CYII=",
    				animated: false,
    				frameWidth: 25,
    				frameRate: 10,
    				yoyo: false,
    				id: 0
    			},
    			"2": {
    				name: "Water",
    				width: 40,
    				height: 40,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAAAXNSR0IArs4c6QAAAidJREFUWEfNWFFWwzAMS++yY8Hpdiy4S3mlTWtU2bKzwIOv0SaOYkuyt6Wt69reP9v593zsH+2z/rK/u1Zfn9h6ti56tsXvcY6zlvb2sco4EbC+eQZABPJ8tDtACwZuc+6PwLDL2DgYE2PZClKAMp3JBQgUQdpy2pAUIKn9jYNemWeXVgIkPKCCySSS0cUKTl3uLDEq11OyUji6gQLAkgEOsosE0upmzKNCBFxl2uPisY8D9HzQOywLUIBh4X2AEcgsIJU99h5iXz7Yb/ebh2e7iFm3nK2OAVQlGblMZo859wKIZplRoLrASIlhzw6wKgqPO+pSzM7EHp7BSK0Zr0O69AREAJ1q3EWyBfsrwaCvksvfbabCG28g8Jq/10aDRpGbB2f250oCWmuXSCxPKmTHgSAzGeHAwKzniHMHmLkhlqTvYcOn9yzin9HB3WZQTZ6xekrNWpDaf2ZQfSfJOL8aIpjPWoDMun4ADDjwfXaURQtOcTfjrwB8TMUZnmbXeOYtS5xpS6jgLKjCOp7BWUOAp1QW37Env9WNcKsCKOo2pnq81WELi6adV1SeKLUGWFGm10UiUxY8HvtOElmPbWOZOdMDKFWcGRBYy6tmnHGdcrASOMGdWUviEmdKFPXeV+yqXOJZKVFxwBV0BjHgRoWqtTCusrgEvO7F6IkMIJYy+r9Y9nGbUaWa9F5nUM167CddOzJZobEOJVrq2Mg/KTuZMP8ToMn0FyHR1Bm/BGaNAAAAAElFTkSuQmCC",
    				animated: false,
    				frameWidth: 25,
    				frameRate: 10,
    				yoyo: false,
    				id: 2
    			},
    			"3": {
    				name: "Player front",
    				width: 50,
    				height: 60,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAA8CAYAAAAkNenBAAAAAXNSR0IArs4c6QAAAiRJREFUaEPtma9+gzAQgMG2T7Gpuk3vKSYncfPVk9P1c8jJPUX15qq2p2ht+yvhKBwJd4FLgGO4/iB/vvtyl0DTJNJ1/kjO16HS1yQNMWSQTm0TVQMCcKGAohmJBgKRggFDreVQQJURNSA4QUOt5VDjOHNEDUiotRzdiDqQUEDSxYW9j0jnzOxBpAGqfY97gJMyog5E+uQQPUekzOKV5A3S6sDz/eIfhEhmthHpHVnazHJBpMrn6EbUgQzdByZjZM4gxXepES5WQWI9VE5eF8jx97sh5S17bPx+z5v3KYOu9uv7ql9WsFkP1Y2oBcERhwhTZqjnohtRA7K6e7CmwenvpzM9qHbRjVATctFQ7eRBdpui7B6fP61zggmlZdk4l0Waa8TVrgLZbcy420NnYaKr1tJAsC6uEVe70YxMF6RcUsn2UMwRb4TUjg33a0nr1Y9csi8FZP310pDiqmoCRmCcnlWLMDJHEBMJAEPJASay8rSao9MxN5fwc9jk9S/6rr7cN29GZgriiDxEw5ULYMTXAGWQW73aRtSAuENqzlxEDqxub3ZFT6eBOdPfyFJAqlxBkZY2YTkZ9KxabTONryh4ic0JBNBYueJbvcLtIwNzZfog2X6cD3X5k1iOmCDPAMREOtubCbsiACBEhIYurVZ7Yty6LmUgcMrEERjLBFbjmEfbiAIQ+7KeuAmYNP1dSw2IePnx7hDvW9bg00a8xxVvwAK5ADQdpEwBGotTAAAAAElFTkSuQmCC",
    				animated: false,
    				frameWidth: 25,
    				frameRate: 10,
    				yoyo: false,
    				id: 3
    			},
    			"4": {
    				name: "Player still",
    				width: 74,
    				height: 58,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEoAAAA6CAYAAAAX8s+wAAAAAXNSR0IArs4c6QAAAf1JREFUeF7tmr11wzAMhKkVnBkyQ5ZJmTqtW7XeIaV3yAxp02aGeAXlWRIV64cicCZF0rp0eYYg8MPhSPO5MvwTEahEUQwywUGdjWmuXF9N+Nwp+0VQQvr3gGqVYybKsYpyvb9UpRFUREVZJQlfkV0YJA7kIYJS9r4F1vz+KB9LE149PdsXI+K4awsnKGHPCYqg5gSgee3TUFFUFBV1S0A1TargCedSRw86JuwG1EAHPE8RlNCQCYqglgmgX2V2o6gbQDTztSnaHlTd3YmbuiuruNuDvm5T6y4E9KNHUA7hWjDTj0tX1Hw9q6LxK4qgWqR+UHPyOo/6eOkyvH0JTyxxwgYzz9ajdgvqv+GyL8WhQYH50IMmdOiCbg/AhTkHEMxHUEJLI6jiQdkRsQsJtes93OgR1KD19V0P7Lx3ksC8+XoUuKD9gIo1cpYg2ID8FEVQY2+y/zWnw/K0hNrlptnBRqRQ1Oj3UQTldtVFUNXx4vXhEAHN97lL8/muupXIRlEE5ZBBczqMlFUdL/q7LZ3EQikZqhN66Lo+gvJ0OQGg1YpsPbEVrVYUQQn9YqsOCsvZzAJgRcWWerGgchu5KcjYShcriqAK2+Vc5cZupFdRsQuQepEvLnadYlC5mHcqYATlI99/7gUlzJNdWOhRJChhix8WlHD94jCCEqL6A/6DQkpVH8InAAAAAElFTkSuQmCC",
    				animated: false,
    				frameWidth: 50,
    				frameRate: 10,
    				yoyo: false,
    				id: 4
    			},
    			"5": {
    				name: "Dirt",
    				width: 40,
    				height: 40,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAAAXNSR0IArs4c6QAAArBJREFUWEe1WEFSxDAM6z5vX8XwKr7Ar5ZJGQdFleSUAU5sm6ayLclOH5/P4/X+ccy/t+f3v3jt5+5x1P26xuu65+s5tQ73HvuO348CyC9WAMaaetDdd8BdkC45hefxPI6XQl5ZdMAZCGakAkFQnDmuknvPmUHcCDNU0XUg3fMKIK8dv12Cxr1LBrtN1f0KKpW/gLi1WDHc5wSoiKv4xuAYkMoO7o0VSdVZACoVpyh3uKmUfQccln2qmLmQSq2U57LHdoIC6oS12AxzxAF0vscculNaJczCM1WMZU3KSgD/QmDMTWkzd8p9B9SOMC4A0aiTq3OGd4Lg/Vh8qmoyg8wBR2xl2J2ZdyCc4merq06irCVFrIYGFRi2tKRoFpUFqNrWjvvf4eKdtbPVuVIpg0VL4i7kMrabPQa/2IwifuoAHJTicsdvBKQ4HgGm7NXGymRdH1dO0AIsm8EX4ctTOZWIsApOZGp/FfC4NqeZ3ah5XWpTruTJQzlRyzzo+MLEV96mxJEqkY4YKKgtgKrDONA4NHDZkqiU9Yz1l2FhJ+qd7sBjPHPT2RPbkZ0Hu2g5q13L48BZfO7EuIiEu4jzRR462Y4Sv9hWlHtgMBGgi8oBVBajMrebvWkzaQxn0jv+dYesRAklwnqP7STJchC0K1HHyeSfuP8iEsc5LIk66KjRC1XKQey00AK5nIt3AKYugN7oALrMKf6ePogHd5UpLqfyLyeElHlnO3j9PHYWQDfOd+RH23AZdGvcBL5wkL9u8WbKG12ZUY13Mp04fDl2JoD/cU+pHQOVH4+S97ku8ZvMJyuqe/br1o4KHShnK2q9K+881bnPb7hZanksDCe2HXBKZG0GE9k7q1Av5P26bF8AKiV2qlXDA1sIVwTBY4X4/Rcf/A1ADMCNXl0H4SGkAvoCeT+1D4LfZEkAAAAASUVORK5CYII=",
    				animated: false,
    				frameWidth: 25,
    				frameRate: 10,
    				yoyo: false,
    				id: 5
    			},
    			"6": {
    				name: "Wall",
    				width: 40,
    				height: 40,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAAAXNSR0IArs4c6QAAAFpJREFUWEft0sEJACAQBDFt7frvSYuYj0j8D0hu98yc9fDbPhivQzACLoIEq0DtbZBgFai9DRKsArW3QYJVoPY2SLAK1N4GCVaB2tsgwSpQexskWAVqb4PfC14CrkbxJZwucwAAAABJRU5ErkJggg==",
    				animated: false,
    				frameWidth: 25,
    				frameRate: 10,
    				yoyo: false,
    				id: 6
    			},
    			"8": {
    				name: "Player moving",
    				width: 148,
    				height: 58,
    				png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJQAAAA6CAYAAABWKnBKAAAAAXNSR0IArs4c6QAAA6lJREFUeF7tnL153DAQRMkW5Bpcg5tx6Nip0kvVg0P14BqcOnUNVgv0Z5IgRZxwO1j8EdxRokBLHvjwOFjw7jQO/CGBjATGjOfiqUhgyC7U6zBM/7l+HfKf+0rzdVVOFKqRpRTqHvycRIOXRA5UaJ4MJpcpTikJZQpUQpCZ4qQRygFKYNz0UM01awZskpMGrklQCqNMctII5djOwKa/fxSs6x8yfvrsXjTlmjUDN8UpBa4pUBqT1mNMcaJQCaaAh1IoggIJYGUUCuO0PBFnDyXSMsWJS57oQ3IBhQIR9gqq9m7PFCeLCUWhHiTGu8crKk5mhNroSM+jbktvONyET0ugdeunL3rpNWFOASkplA8GFQWto1BgB3U1UE4Qd/loQsn1XfVQTCjY/6Uw+BYMhTqQ1L5VZWbJCzabsSKFlshwUnWVUGzKwYSiUBio+kLtzeg8wl52LxuoWwCs1DNJ8+En3Z5YfXOK5BK/5FGoj9WiUEuPKt1429/vew1Td55ZTvIu9tjMmwUVGeVmOWUXKjXKf3xZhvTtFzwnJQq122D1WIy2BvKSR6F0TlEoj5v8fAZ7vpI7oZTnq55QO87HnJTXI1quPG/qg99wQlEocc7AAgo1g5Lf/GRCYUZdQ6i9OT9+Pczb3MgJFd4NUSgKdfcxH7kpD0PD7jx3fK5dXu7eAJMipQrjlIuPG2lpToEVjEKlqIIdS6EwTsK3XpR3iPjayvNylyeSnQtSOZVPqN6iHOMeU3XNhAoQyC+US5DcvVOt3iBGFayWQmGcAksehfLxUShBqMNziOnl6ePy3Eudn1CRCZjaG4A32fuyIyf/v9Qoe0F4HMrzp3LSLHkUCptVCoVxWr+3tha7hBqf38DD08qm36/LCX5+X36DSZh65ylG/fAfjpXmtq0cIB93famcsiUUhbpTjkLF3IXTy9MB2Pj8ppEz6iUPDcrauylELj1O6JocvwLclk2Ans8WVtCFeEVquBRKg3s/hkLtPVPtZHo4cwUnJs2YwNG1bsRWXKITqhYQdDZbgUPH59fV4teKi1qoAmu/ao5agYsdbC2R3LhacaFQsWYo6ymU0AMwoeLMqp0YtV9PvTVsNdDQ9J1tPGcZZysuXPLigkZdXWuCay+tPhAKpVYk7kAKxR4qzhihurZQrXpcJlRWbcIno1AnT6jWvUKsh6WFOguPbhPqLABRsShUJwnVqldARQq99ZJ73KWFRa+3+4TKPTEoOG1dqYkvdd7Y6/wHvbjaWYkfDF8AAAAASUVORK5CYII=",
    				animated: true,
    				frameWidth: 74,
    				frameRate: 10,
    				yoyo: false,
    				id: 8
    			}
    		},
    		particles: {
    		},
    		projectiles: {
    		},
    		blocks: {
    			"0": {
    				name: "Dirt",
    				canWalk: true,
    				canSee: true,
    				throwOnTouch: false,
    				teleportOnTouch: false,
    				flipGravityOnTouch: false,
    				winOnTouch: false,
    				damage: 0,
    				consumable: false,
    				healthOnConsume: 0,
    				scoreOnConsume: 0,
    				followerOnConsume: [
    				],
    				enemyOnConsume: [
    				],
    				particles: null,
    				graphic: 5,
    				id: 0
    			},
    			"1": {
    				name: "Water",
    				canWalk: false,
    				canSee: true,
    				throwOnTouch: false,
    				teleportOnTouch: false,
    				flipGravityOnTouch: false,
    				winOnTouch: false,
    				damage: 0,
    				consumable: false,
    				healthOnConsume: 0,
    				scoreOnConsume: 0,
    				followerOnConsume: [
    				],
    				enemyOnConsume: [
    				],
    				particles: null,
    				graphic: 2,
    				id: 1
    			},
    			"2": {
    				name: "Grass",
    				canWalk: true,
    				canSee: true,
    				throwOnTouch: false,
    				teleportOnTouch: false,
    				flipGravityOnTouch: false,
    				winOnTouch: false,
    				damage: 0,
    				consumable: false,
    				healthOnConsume: 0,
    				scoreOnConsume: 0,
    				followerOnConsume: [
    				],
    				enemyOnConsume: [
    				],
    				particles: null,
    				graphic: 0,
    				id: 2
    			},
    			"3": {
    				name: "Wall",
    				canWalk: false,
    				canSee: false,
    				throwOnTouch: false,
    				teleportOnTouch: false,
    				flipGravityOnTouch: false,
    				winOnTouch: false,
    				damage: 0,
    				consumable: false,
    				healthOnConsume: 0,
    				scoreOnConsume: 0,
    				followerOnConsume: [
    				],
    				enemyOnConsume: [
    				],
    				particles: null,
    				id: 3,
    				graphic: 6
    			}
    		},
    		characters: {
    			"0": {
    				name: "Good guy",
    				graphics: {
    					still: 4,
    					moving: 8
    				},
    				abilities: [
    				],
    				id: 0,
    				particles: null
    			}
    		},
    		enemies: {
    		},
    		levels: {
    			"1": {
    				name: "Level 1",
    				backgroundColor: "rgba(0,0,0,1)",
    				blocks: [
    					{
    						x: 0,
    						y: 1,
    						blockId: 3
    					},
    					{
    						x: 0,
    						y: 2,
    						blockId: 3
    					},
    					{
    						x: 0,
    						y: 3,
    						blockId: 3
    					},
    					{
    						x: 0,
    						y: 4,
    						blockId: 3
    					},
    					{
    						x: 0,
    						y: 10,
    						blockId: 3
    					},
    					{
    						x: 0,
    						y: 9,
    						blockId: 3
    					},
    					{
    						x: 0,
    						y: 8,
    						blockId: 3
    					},
    					{
    						x: 0,
    						y: 7,
    						blockId: 3
    					},
    					{
    						x: 0,
    						y: 6,
    						blockId: 3
    					},
    					{
    						x: 0,
    						y: 5,
    						blockId: 3
    					},
    					{
    						x: 0,
    						y: 0,
    						blockId: 3
    					},
    					{
    						x: 0,
    						y: 21,
    						blockId: 3
    					},
    					{
    						x: 0,
    						y: 20,
    						blockId: 3
    					},
    					{
    						x: 0,
    						y: 19,
    						blockId: 3
    					},
    					{
    						x: 0,
    						y: 18,
    						blockId: 3
    					},
    					{
    						x: 0,
    						y: 17,
    						blockId: 3
    					},
    					{
    						x: 0,
    						y: 11,
    						blockId: 3
    					},
    					{
    						x: 0,
    						y: 16,
    						blockId: 3
    					},
    					{
    						x: 0,
    						y: 15,
    						blockId: 3
    					},
    					{
    						x: 0,
    						y: 14,
    						blockId: 3
    					},
    					{
    						x: 0,
    						y: 13,
    						blockId: 3
    					},
    					{
    						x: 0,
    						y: 12,
    						blockId: 3
    					},
    					{
    						x: 1,
    						y: 0,
    						blockId: 3
    					},
    					{
    						x: 1,
    						y: 21,
    						blockId: 3
    					},
    					{
    						x: 1,
    						y: 19,
    						blockId: 2
    					},
    					{
    						x: 1,
    						y: 20,
    						blockId: 2
    					},
    					{
    						x: 1,
    						y: 12,
    						blockId: 2
    					},
    					{
    						x: 1,
    						y: 13,
    						blockId: 2
    					},
    					{
    						x: 1,
    						y: 14,
    						blockId: 2
    					},
    					{
    						x: 1,
    						y: 15,
    						blockId: 2
    					},
    					{
    						x: 1,
    						y: 16,
    						blockId: 2
    					},
    					{
    						x: 1,
    						y: 17,
    						blockId: 2
    					},
    					{
    						x: 1,
    						y: 18,
    						blockId: 2
    					},
    					{
    						x: 1,
    						y: 1,
    						blockId: 2
    					},
    					{
    						x: 1,
    						y: 2,
    						blockId: 2
    					},
    					{
    						x: 1,
    						y: 3,
    						blockId: 2
    					},
    					{
    						x: 1,
    						y: 4,
    						blockId: 2
    					},
    					{
    						x: 1,
    						y: 5,
    						blockId: 2
    					},
    					{
    						x: 1,
    						y: 6,
    						blockId: 2
    					},
    					{
    						x: 1,
    						y: 7,
    						blockId: 2
    					},
    					{
    						x: 1,
    						y: 8,
    						blockId: 2
    					},
    					{
    						x: 1,
    						y: 9,
    						blockId: 2
    					},
    					{
    						x: 1,
    						y: 10,
    						blockId: 2
    					},
    					{
    						x: 1,
    						y: 11,
    						blockId: 2
    					},
    					{
    						x: 2,
    						y: 13,
    						blockId: 2
    					},
    					{
    						x: 2,
    						y: 14,
    						blockId: 2
    					},
    					{
    						x: 2,
    						y: 15,
    						blockId: 2
    					},
    					{
    						x: 2,
    						y: 16,
    						blockId: 2
    					},
    					{
    						x: 2,
    						y: 0,
    						blockId: 3
    					},
    					{
    						x: 2,
    						y: 21,
    						blockId: 3
    					},
    					{
    						x: 2,
    						y: 17,
    						blockId: 2
    					},
    					{
    						x: 2,
    						y: 18,
    						blockId: 2
    					},
    					{
    						x: 2,
    						y: 19,
    						blockId: 2
    					},
    					{
    						x: 2,
    						y: 20,
    						blockId: 2
    					},
    					{
    						x: 2,
    						y: 1,
    						blockId: 2
    					},
    					{
    						x: 2,
    						y: 2,
    						blockId: 2
    					},
    					{
    						x: 2,
    						y: 3,
    						blockId: 2
    					},
    					{
    						x: 2,
    						y: 4,
    						blockId: 2
    					},
    					{
    						x: 2,
    						y: 5,
    						blockId: 2
    					},
    					{
    						x: 2,
    						y: 6,
    						blockId: 2
    					},
    					{
    						x: 2,
    						y: 7,
    						blockId: 2
    					},
    					{
    						x: 2,
    						y: 12,
    						blockId: 2
    					},
    					{
    						x: 2,
    						y: 11,
    						blockId: 2
    					},
    					{
    						x: 2,
    						y: 10,
    						blockId: 2
    					},
    					{
    						x: 2,
    						y: 9,
    						blockId: 2
    					},
    					{
    						x: 2,
    						y: 8,
    						blockId: 2
    					},
    					{
    						x: 3,
    						y: 12,
    						blockId: 2
    					},
    					{
    						x: 3,
    						y: 13,
    						blockId: 2
    					},
    					{
    						x: 3,
    						y: 14,
    						blockId: 2
    					},
    					{
    						x: 3,
    						y: 15,
    						blockId: 2
    					},
    					{
    						x: 3,
    						y: 16,
    						blockId: 2
    					},
    					{
    						x: 3,
    						y: 0,
    						blockId: 3
    					},
    					{
    						x: 3,
    						y: 21,
    						blockId: 3
    					},
    					{
    						x: 3,
    						y: 17,
    						blockId: 2
    					},
    					{
    						x: 3,
    						y: 18,
    						blockId: 2
    					},
    					{
    						x: 3,
    						y: 19,
    						blockId: 2
    					},
    					{
    						x: 3,
    						y: 20,
    						blockId: 2
    					},
    					{
    						x: 3,
    						y: 1,
    						blockId: 2
    					},
    					{
    						x: 3,
    						y: 2,
    						blockId: 2
    					},
    					{
    						x: 3,
    						y: 3,
    						blockId: 2
    					},
    					{
    						x: 3,
    						y: 9,
    						blockId: 2
    					},
    					{
    						x: 3,
    						y: 11,
    						blockId: 2
    					},
    					{
    						x: 3,
    						y: 10,
    						blockId: 2
    					},
    					{
    						x: 3,
    						y: 4,
    						blockId: 2
    					},
    					{
    						x: 3,
    						y: 5,
    						blockId: 2
    					},
    					{
    						x: 3,
    						y: 6,
    						blockId: 2
    					},
    					{
    						x: 3,
    						y: 7,
    						blockId: 2
    					},
    					{
    						x: 3,
    						y: 8,
    						blockId: 2
    					},
    					{
    						x: 4,
    						y: 4,
    						blockId: 0
    					},
    					{
    						x: 4,
    						y: 8,
    						blockId: 0
    					},
    					{
    						x: 4,
    						y: 13,
    						blockId: 2
    					},
    					{
    						x: 4,
    						y: 14,
    						blockId: 2
    					},
    					{
    						x: 4,
    						y: 15,
    						blockId: 2
    					},
    					{
    						x: 4,
    						y: 16,
    						blockId: 2
    					},
    					{
    						x: 4,
    						y: 0,
    						blockId: 3
    					},
    					{
    						x: 4,
    						y: 21,
    						blockId: 3
    					},
    					{
    						x: 4,
    						y: 17,
    						blockId: 2
    					},
    					{
    						x: 4,
    						y: 18,
    						blockId: 2
    					},
    					{
    						x: 4,
    						y: 19,
    						blockId: 2
    					},
    					{
    						x: 4,
    						y: 20,
    						blockId: 2
    					},
    					{
    						x: 4,
    						y: 3,
    						blockId: 2
    					},
    					{
    						x: 4,
    						y: 2,
    						blockId: 2
    					},
    					{
    						x: 4,
    						y: 1,
    						blockId: 2
    					},
    					{
    						x: 4,
    						y: 12,
    						blockId: 2
    					},
    					{
    						x: 4,
    						y: 11,
    						blockId: 2
    					},
    					{
    						x: 4,
    						y: 10,
    						blockId: 2
    					},
    					{
    						x: 4,
    						y: 9,
    						blockId: 2
    					},
    					{
    						x: 4,
    						y: 5,
    						blockId: 0
    					},
    					{
    						x: 4,
    						y: 6,
    						blockId: 0
    					},
    					{
    						x: 4,
    						y: 7,
    						blockId: 0
    					},
    					{
    						x: 5,
    						y: 8,
    						blockId: 0
    					},
    					{
    						x: 5,
    						y: 5,
    						blockId: 1
    					},
    					{
    						x: 5,
    						y: 6,
    						blockId: 1
    					},
    					{
    						x: 5,
    						y: 7,
    						blockId: 1
    					},
    					{
    						x: 5,
    						y: 9,
    						blockId: 0
    					},
    					{
    						x: 5,
    						y: 13,
    						blockId: 2
    					},
    					{
    						x: 5,
    						y: 14,
    						blockId: 2
    					},
    					{
    						x: 5,
    						y: 15,
    						blockId: 2
    					},
    					{
    						x: 5,
    						y: 16,
    						blockId: 2
    					},
    					{
    						x: 5,
    						y: 0,
    						blockId: 3
    					},
    					{
    						x: 5,
    						y: 21,
    						blockId: 3
    					},
    					{
    						x: 5,
    						y: 17,
    						blockId: 2
    					},
    					{
    						x: 5,
    						y: 18,
    						blockId: 2
    					},
    					{
    						x: 5,
    						y: 19,
    						blockId: 2
    					},
    					{
    						x: 5,
    						y: 20,
    						blockId: 2
    					},
    					{
    						x: 5,
    						y: 3,
    						blockId: 2
    					},
    					{
    						x: 5,
    						y: 4,
    						blockId: 0
    					},
    					{
    						x: 5,
    						y: 1,
    						blockId: 2
    					},
    					{
    						x: 5,
    						y: 2,
    						blockId: 2
    					},
    					{
    						x: 5,
    						y: 12,
    						blockId: 2
    					},
    					{
    						x: 5,
    						y: 10,
    						blockId: 2
    					},
    					{
    						x: 5,
    						y: 11,
    						blockId: 2
    					},
    					{
    						x: 6,
    						y: 7,
    						blockId: 1
    					},
    					{
    						x: 6,
    						y: 6,
    						blockId: 1
    					},
    					{
    						x: 6,
    						y: 5,
    						blockId: 1
    					},
    					{
    						x: 6,
    						y: 8,
    						blockId: 1
    					},
    					{
    						x: 6,
    						y: 9,
    						blockId: 0
    					},
    					{
    						x: 6,
    						y: 13,
    						blockId: 2
    					},
    					{
    						x: 6,
    						y: 14,
    						blockId: 2
    					},
    					{
    						x: 6,
    						y: 15,
    						blockId: 2
    					},
    					{
    						x: 6,
    						y: 16,
    						blockId: 2
    					},
    					{
    						x: 6,
    						y: 0,
    						blockId: 3
    					},
    					{
    						x: 6,
    						y: 21,
    						blockId: 3
    					},
    					{
    						x: 6,
    						y: 17,
    						blockId: 2
    					},
    					{
    						x: 6,
    						y: 18,
    						blockId: 2
    					},
    					{
    						x: 6,
    						y: 19,
    						blockId: 2
    					},
    					{
    						x: 6,
    						y: 20,
    						blockId: 2
    					},
    					{
    						x: 6,
    						y: 3,
    						blockId: 2
    					},
    					{
    						x: 6,
    						y: 4,
    						blockId: 0
    					},
    					{
    						x: 6,
    						y: 1,
    						blockId: 2
    					},
    					{
    						x: 6,
    						y: 2,
    						blockId: 2
    					},
    					{
    						x: 6,
    						y: 12,
    						blockId: 2
    					},
    					{
    						x: 6,
    						y: 11,
    						blockId: 2
    					},
    					{
    						x: 6,
    						y: 10,
    						blockId: 2
    					},
    					{
    						x: 7,
    						y: 9,
    						blockId: 0
    					},
    					{
    						x: 7,
    						y: 6,
    						blockId: 1
    					},
    					{
    						x: 7,
    						y: 7,
    						blockId: 1
    					},
    					{
    						x: 7,
    						y: 8,
    						blockId: 1
    					},
    					{
    						x: 7,
    						y: 10,
    						blockId: 0
    					},
    					{
    						x: 7,
    						y: 13,
    						blockId: 2
    					},
    					{
    						x: 7,
    						y: 0,
    						blockId: 3
    					},
    					{
    						x: 7,
    						y: 21,
    						blockId: 3
    					},
    					{
    						x: 7,
    						y: 18,
    						blockId: 2
    					},
    					{
    						x: 7,
    						y: 19,
    						blockId: 2
    					},
    					{
    						x: 7,
    						y: 20,
    						blockId: 2
    					},
    					{
    						x: 7,
    						y: 3,
    						blockId: 2
    					},
    					{
    						x: 7,
    						y: 5,
    						blockId: 0
    					},
    					{
    						x: 7,
    						y: 4,
    						blockId: 0
    					},
    					{
    						x: 7,
    						y: 1,
    						blockId: 2
    					},
    					{
    						x: 7,
    						y: 2,
    						blockId: 2
    					},
    					{
    						x: 7,
    						y: 12,
    						blockId: 2
    					},
    					{
    						x: 7,
    						y: 15,
    						blockId: 3
    					},
    					{
    						x: 7,
    						y: 16,
    						blockId: 3
    					},
    					{
    						x: 7,
    						y: 17,
    						blockId: 3
    					},
    					{
    						x: 7,
    						y: 14,
    						blockId: 3
    					},
    					{
    						x: 7,
    						y: 11,
    						blockId: 2
    					},
    					{
    						x: 8,
    						y: 6,
    						blockId: 1
    					},
    					{
    						x: 8,
    						y: 9,
    						blockId: 1
    					},
    					{
    						x: 8,
    						y: 13,
    						blockId: 2
    					},
    					{
    						x: 8,
    						y: 8,
    						blockId: 1
    					},
    					{
    						x: 8,
    						y: 7,
    						blockId: 1
    					},
    					{
    						x: 8,
    						y: 0,
    						blockId: 3
    					},
    					{
    						x: 8,
    						y: 21,
    						blockId: 3
    					},
    					{
    						x: 8,
    						y: 19,
    						blockId: 2
    					},
    					{
    						x: 8,
    						y: 18,
    						blockId: 2
    					},
    					{
    						x: 8,
    						y: 20,
    						blockId: 2
    					},
    					{
    						x: 8,
    						y: 4,
    						blockId: 2
    					},
    					{
    						x: 8,
    						y: 3,
    						blockId: 2
    					},
    					{
    						x: 8,
    						y: 5,
    						blockId: 0
    					},
    					{
    						x: 8,
    						y: 1,
    						blockId: 2
    					},
    					{
    						x: 8,
    						y: 2,
    						blockId: 2
    					},
    					{
    						x: 8,
    						y: 12,
    						blockId: 2
    					},
    					{
    						x: 8,
    						y: 17,
    						blockId: 3
    					},
    					{
    						x: 8,
    						y: 14,
    						blockId: 3
    					},
    					{
    						x: 8,
    						y: 11,
    						blockId: 2
    					},
    					{
    						x: 8,
    						y: 10,
    						blockId: 0
    					},
    					{
    						x: 9,
    						y: 6,
    						blockId: 1
    					},
    					{
    						x: 9,
    						y: 9,
    						blockId: 1
    					},
    					{
    						x: 9,
    						y: 13,
    						blockId: 2
    					},
    					{
    						x: 9,
    						y: 7,
    						blockId: 1
    					},
    					{
    						x: 9,
    						y: 8,
    						blockId: 1
    					},
    					{
    						x: 9,
    						y: 0,
    						blockId: 3
    					},
    					{
    						x: 9,
    						y: 21,
    						blockId: 3
    					},
    					{
    						x: 9,
    						y: 19,
    						blockId: 2
    					},
    					{
    						x: 9,
    						y: 18,
    						blockId: 2
    					},
    					{
    						x: 9,
    						y: 20,
    						blockId: 2
    					},
    					{
    						x: 9,
    						y: 4,
    						blockId: 2
    					},
    					{
    						x: 9,
    						y: 3,
    						blockId: 2
    					},
    					{
    						x: 9,
    						y: 5,
    						blockId: 0
    					},
    					{
    						x: 9,
    						y: 1,
    						blockId: 2
    					},
    					{
    						x: 9,
    						y: 2,
    						blockId: 2
    					},
    					{
    						x: 9,
    						y: 17,
    						blockId: 3
    					},
    					{
    						x: 9,
    						y: 14,
    						blockId: 3
    					},
    					{
    						x: 9,
    						y: 12,
    						blockId: 2
    					},
    					{
    						x: 9,
    						y: 11,
    						blockId: 2
    					},
    					{
    						x: 9,
    						y: 10,
    						blockId: 0
    					},
    					{
    						x: 10,
    						y: 6,
    						blockId: 1
    					},
    					{
    						x: 10,
    						y: 13,
    						blockId: 2
    					},
    					{
    						x: 10,
    						y: 9,
    						blockId: 1
    					},
    					{
    						x: 10,
    						y: 8,
    						blockId: 1
    					},
    					{
    						x: 10,
    						y: 7,
    						blockId: 1
    					},
    					{
    						x: 10,
    						y: 0,
    						blockId: 3
    					},
    					{
    						x: 10,
    						y: 1,
    						blockId: 3
    					},
    					{
    						x: 10,
    						y: 21,
    						blockId: 3
    					},
    					{
    						x: 10,
    						y: 19,
    						blockId: 2
    					},
    					{
    						x: 10,
    						y: 18,
    						blockId: 2
    					},
    					{
    						x: 10,
    						y: 20,
    						blockId: 2
    					},
    					{
    						x: 10,
    						y: 4,
    						blockId: 2
    					},
    					{
    						x: 10,
    						y: 5,
    						blockId: 0
    					},
    					{
    						x: 10,
    						y: 3,
    						blockId: 2
    					},
    					{
    						x: 10,
    						y: 2,
    						blockId: 2
    					},
    					{
    						x: 10,
    						y: 17,
    						blockId: 3
    					},
    					{
    						x: 10,
    						y: 14,
    						blockId: 3
    					},
    					{
    						x: 10,
    						y: 12,
    						blockId: 2
    					},
    					{
    						x: 10,
    						y: 11,
    						blockId: 2
    					},
    					{
    						x: 10,
    						y: 10,
    						blockId: 0
    					},
    					{
    						x: 11,
    						y: 8,
    						blockId: 1
    					},
    					{
    						x: 11,
    						y: 6,
    						blockId: 1
    					},
    					{
    						x: 11,
    						y: 7,
    						blockId: 1
    					},
    					{
    						x: 11,
    						y: 9,
    						blockId: 1
    					},
    					{
    						x: 11,
    						y: 21,
    						blockId: 3
    					},
    					{
    						x: 11,
    						y: 19,
    						blockId: 2
    					},
    					{
    						x: 11,
    						y: 18,
    						blockId: 2
    					},
    					{
    						x: 11,
    						y: 20,
    						blockId: 2
    					},
    					{
    						x: 11,
    						y: 4,
    						blockId: 2
    					},
    					{
    						x: 11,
    						y: 5,
    						blockId: 0
    					},
    					{
    						x: 11,
    						y: 3,
    						blockId: 2
    					},
    					{
    						x: 11,
    						y: 2,
    						blockId: 2
    					},
    					{
    						x: 11,
    						y: 1,
    						blockId: 3
    					},
    					{
    						x: 11,
    						y: 17,
    						blockId: 3
    					},
    					{
    						x: 11,
    						y: 16,
    						blockId: 3
    					},
    					{
    						x: 11,
    						y: 15,
    						blockId: 3
    					},
    					{
    						x: 11,
    						y: 14,
    						blockId: 3
    					},
    					{
    						x: 11,
    						y: 13,
    						blockId: 2
    					},
    					{
    						x: 11,
    						y: 12,
    						blockId: 2
    					},
    					{
    						x: 11,
    						y: 11,
    						blockId: 2
    					},
    					{
    						x: 11,
    						y: 10,
    						blockId: 0
    					},
    					{
    						x: 12,
    						y: 13,
    						blockId: 2
    					},
    					{
    						x: 12,
    						y: 14,
    						blockId: 2
    					},
    					{
    						x: 12,
    						y: 15,
    						blockId: 2
    					},
    					{
    						x: 12,
    						y: 16,
    						blockId: 2
    					},
    					{
    						x: 12,
    						y: 7,
    						blockId: 1
    					},
    					{
    						x: 12,
    						y: 21,
    						blockId: 3
    					},
    					{
    						x: 12,
    						y: 17,
    						blockId: 2
    					},
    					{
    						x: 12,
    						y: 19,
    						blockId: 2
    					},
    					{
    						x: 12,
    						y: 18,
    						blockId: 2
    					},
    					{
    						x: 12,
    						y: 20,
    						blockId: 2
    					},
    					{
    						x: 12,
    						y: 4,
    						blockId: 2
    					},
    					{
    						x: 12,
    						y: 6,
    						blockId: 0
    					},
    					{
    						x: 12,
    						y: 5,
    						blockId: 0
    					},
    					{
    						x: 12,
    						y: 9,
    						blockId: 1
    					},
    					{
    						x: 12,
    						y: 3,
    						blockId: 2
    					},
    					{
    						x: 12,
    						y: 2,
    						blockId: 2
    					},
    					{
    						x: 12,
    						y: 1,
    						blockId: 3
    					},
    					{
    						x: 12,
    						y: 11,
    						blockId: 2
    					},
    					{
    						x: 12,
    						y: 12,
    						blockId: 2
    					},
    					{
    						x: 12,
    						y: 10,
    						blockId: 0
    					},
    					{
    						x: 12,
    						y: 8,
    						blockId: 1
    					},
    					{
    						x: 13,
    						y: 13,
    						blockId: 2
    					},
    					{
    						x: 13,
    						y: 14,
    						blockId: 2
    					},
    					{
    						x: 13,
    						y: 15,
    						blockId: 2
    					},
    					{
    						x: 13,
    						y: 16,
    						blockId: 2
    					},
    					{
    						x: 13,
    						y: 21,
    						blockId: 3
    					},
    					{
    						x: 13,
    						y: 17,
    						blockId: 2
    					},
    					{
    						x: 13,
    						y: 19,
    						blockId: 2
    					},
    					{
    						x: 13,
    						y: 18,
    						blockId: 2
    					},
    					{
    						x: 13,
    						y: 20,
    						blockId: 2
    					},
    					{
    						x: 13,
    						y: 5,
    						blockId: 2
    					},
    					{
    						x: 13,
    						y: 4,
    						blockId: 2
    					},
    					{
    						x: 13,
    						y: 10,
    						blockId: 0
    					},
    					{
    						x: 13,
    						y: 9,
    						blockId: 0
    					},
    					{
    						x: 13,
    						y: 7,
    						blockId: 0
    					},
    					{
    						x: 13,
    						y: 6,
    						blockId: 0
    					},
    					{
    						x: 13,
    						y: 11,
    						blockId: 2
    					},
    					{
    						x: 13,
    						y: 12,
    						blockId: 2
    					},
    					{
    						x: 13,
    						y: 3,
    						blockId: 2
    					},
    					{
    						x: 13,
    						y: 2,
    						blockId: 2
    					},
    					{
    						x: 13,
    						y: 1,
    						blockId: 3
    					},
    					{
    						x: 13,
    						y: 8,
    						blockId: 1
    					},
    					{
    						x: 14,
    						y: 13,
    						blockId: 2
    					},
    					{
    						x: 14,
    						y: 14,
    						blockId: 2
    					},
    					{
    						x: 14,
    						y: 15,
    						blockId: 2
    					},
    					{
    						x: 14,
    						y: 16,
    						blockId: 2
    					},
    					{
    						x: 14,
    						y: 21,
    						blockId: 3
    					},
    					{
    						x: 14,
    						y: 17,
    						blockId: 2
    					},
    					{
    						x: 14,
    						y: 19,
    						blockId: 2
    					},
    					{
    						x: 14,
    						y: 18,
    						blockId: 2
    					},
    					{
    						x: 14,
    						y: 20,
    						blockId: 2
    					},
    					{
    						x: 14,
    						y: 6,
    						blockId: 2
    					},
    					{
    						x: 14,
    						y: 9,
    						blockId: 0
    					},
    					{
    						x: 14,
    						y: 7,
    						blockId: 0
    					},
    					{
    						x: 14,
    						y: 10,
    						blockId: 2
    					},
    					{
    						x: 14,
    						y: 11,
    						blockId: 2
    					},
    					{
    						x: 14,
    						y: 12,
    						blockId: 2
    					},
    					{
    						x: 14,
    						y: 4,
    						blockId: 2
    					},
    					{
    						x: 14,
    						y: 5,
    						blockId: 2
    					},
    					{
    						x: 14,
    						y: 3,
    						blockId: 2
    					},
    					{
    						x: 14,
    						y: 2,
    						blockId: 2
    					},
    					{
    						x: 14,
    						y: 1,
    						blockId: 3
    					},
    					{
    						x: 14,
    						y: 8,
    						blockId: 1
    					},
    					{
    						x: 15,
    						y: 13,
    						blockId: 2
    					},
    					{
    						x: 15,
    						y: 14,
    						blockId: 2
    					},
    					{
    						x: 15,
    						y: 15,
    						blockId: 2
    					},
    					{
    						x: 15,
    						y: 16,
    						blockId: 2
    					},
    					{
    						x: 15,
    						y: 21,
    						blockId: 3
    					},
    					{
    						x: 15,
    						y: 17,
    						blockId: 2
    					},
    					{
    						x: 15,
    						y: 18,
    						blockId: 2
    					},
    					{
    						x: 15,
    						y: 20,
    						blockId: 2
    					},
    					{
    						x: 15,
    						y: 6,
    						blockId: 2
    					},
    					{
    						x: 15,
    						y: 9,
    						blockId: 0
    					},
    					{
    						x: 15,
    						y: 8,
    						blockId: 0
    					},
    					{
    						x: 15,
    						y: 7,
    						blockId: 0
    					},
    					{
    						x: 15,
    						y: 12,
    						blockId: 2
    					},
    					{
    						x: 15,
    						y: 11,
    						blockId: 2
    					},
    					{
    						x: 15,
    						y: 10,
    						blockId: 2
    					},
    					{
    						x: 15,
    						y: 5,
    						blockId: 2
    					},
    					{
    						x: 15,
    						y: 3,
    						blockId: 2
    					},
    					{
    						x: 15,
    						y: 4,
    						blockId: 2
    					},
    					{
    						x: 15,
    						y: 2,
    						blockId: 2
    					},
    					{
    						x: 15,
    						y: 1,
    						blockId: 3
    					},
    					{
    						x: 15,
    						y: 19,
    						blockId: 2
    					},
    					{
    						x: 16,
    						y: 13,
    						blockId: 2
    					},
    					{
    						x: 16,
    						y: 14,
    						blockId: 2
    					},
    					{
    						x: 16,
    						y: 15,
    						blockId: 2
    					},
    					{
    						x: 16,
    						y: 9,
    						blockId: 2
    					},
    					{
    						x: 16,
    						y: 12,
    						blockId: 2
    					},
    					{
    						x: 16,
    						y: 11,
    						blockId: 2
    					},
    					{
    						x: 16,
    						y: 10,
    						blockId: 2
    					},
    					{
    						x: 16,
    						y: 21,
    						blockId: 3
    					},
    					{
    						x: 16,
    						y: 8,
    						blockId: 2
    					},
    					{
    						x: 16,
    						y: 7,
    						blockId: 2
    					},
    					{
    						x: 16,
    						y: 5,
    						blockId: 2
    					},
    					{
    						x: 16,
    						y: 6,
    						blockId: 2
    					},
    					{
    						x: 16,
    						y: 16,
    						blockId: 2
    					},
    					{
    						x: 16,
    						y: 2,
    						blockId: 2
    					},
    					{
    						x: 16,
    						y: 3,
    						blockId: 2
    					},
    					{
    						x: 16,
    						y: 4,
    						blockId: 2
    					},
    					{
    						x: 16,
    						y: 1,
    						blockId: 3
    					},
    					{
    						x: 16,
    						y: 18,
    						blockId: 2
    					},
    					{
    						x: 16,
    						y: 17,
    						blockId: 2
    					},
    					{
    						x: 16,
    						y: 19,
    						blockId: 2
    					},
    					{
    						x: 16,
    						y: 20,
    						blockId: 2
    					},
    					{
    						x: 17,
    						y: 14,
    						blockId: 2
    					},
    					{
    						x: 17,
    						y: 13,
    						blockId: 2
    					},
    					{
    						x: 17,
    						y: 12,
    						blockId: 2
    					},
    					{
    						x: 17,
    						y: 10,
    						blockId: 2
    					},
    					{
    						x: 17,
    						y: 11,
    						blockId: 2
    					},
    					{
    						x: 17,
    						y: 5,
    						blockId: 2
    					},
    					{
    						x: 17,
    						y: 6,
    						blockId: 2
    					},
    					{
    						x: 17,
    						y: 7,
    						blockId: 2
    					},
    					{
    						x: 17,
    						y: 8,
    						blockId: 2
    					},
    					{
    						x: 17,
    						y: 16,
    						blockId: 2
    					},
    					{
    						x: 17,
    						y: 15,
    						blockId: 2
    					},
    					{
    						x: 17,
    						y: 9,
    						blockId: 2
    					},
    					{
    						x: 17,
    						y: 4,
    						blockId: 2
    					},
    					{
    						x: 17,
    						y: 3,
    						blockId: 3
    					},
    					{
    						x: 17,
    						y: 2,
    						blockId: 3
    					},
    					{
    						x: 17,
    						y: 1,
    						blockId: 3
    					},
    					{
    						x: 17,
    						y: 21,
    						blockId: 3
    					},
    					{
    						x: 17,
    						y: 17,
    						blockId: 2
    					},
    					{
    						x: 17,
    						y: 18,
    						blockId: 2
    					},
    					{
    						x: 17,
    						y: 19,
    						blockId: 2
    					},
    					{
    						x: 17,
    						y: 20,
    						blockId: 2
    					},
    					{
    						x: 18,
    						y: 13,
    						blockId: 2
    					},
    					{
    						x: 18,
    						y: 14,
    						blockId: 2
    					},
    					{
    						x: 18,
    						y: 16,
    						blockId: 2
    					},
    					{
    						x: 18,
    						y: 15,
    						blockId: 2
    					},
    					{
    						x: 18,
    						y: 4,
    						blockId: 2
    					},
    					{
    						x: 18,
    						y: 5,
    						blockId: 2
    					},
    					{
    						x: 18,
    						y: 6,
    						blockId: 2
    					},
    					{
    						x: 18,
    						y: 7,
    						blockId: 2
    					},
    					{
    						x: 18,
    						y: 8,
    						blockId: 2
    					},
    					{
    						x: 18,
    						y: 9,
    						blockId: 2
    					},
    					{
    						x: 18,
    						y: 10,
    						blockId: 2
    					},
    					{
    						x: 18,
    						y: 11,
    						blockId: 2
    					},
    					{
    						x: 18,
    						y: 12,
    						blockId: 2
    					},
    					{
    						x: 18,
    						y: 3,
    						blockId: 3
    					},
    					{
    						x: 18,
    						y: 21,
    						blockId: 3
    					},
    					{
    						x: 18,
    						y: 17,
    						blockId: 2
    					},
    					{
    						x: 18,
    						y: 18,
    						blockId: 2
    					},
    					{
    						x: 18,
    						y: 19,
    						blockId: 2
    					},
    					{
    						x: 18,
    						y: 20,
    						blockId: 2
    					},
    					{
    						x: 19,
    						y: 12,
    						blockId: 2
    					},
    					{
    						x: 19,
    						y: 13,
    						blockId: 2
    					},
    					{
    						x: 19,
    						y: 14,
    						blockId: 2
    					},
    					{
    						x: 19,
    						y: 11,
    						blockId: 3
    					},
    					{
    						x: 19,
    						y: 16,
    						blockId: 2
    					},
    					{
    						x: 19,
    						y: 15,
    						blockId: 2
    					},
    					{
    						x: 19,
    						y: 10,
    						blockId: 3
    					},
    					{
    						x: 19,
    						y: 9,
    						blockId: 3
    					},
    					{
    						x: 19,
    						y: 8,
    						blockId: 3
    					},
    					{
    						x: 19,
    						y: 7,
    						blockId: 3
    					},
    					{
    						x: 19,
    						y: 6,
    						blockId: 3
    					},
    					{
    						x: 19,
    						y: 5,
    						blockId: 3
    					},
    					{
    						x: 19,
    						y: 4,
    						blockId: 3
    					},
    					{
    						x: 19,
    						y: 3,
    						blockId: 3
    					},
    					{
    						x: 19,
    						y: 21,
    						blockId: 3
    					},
    					{
    						x: 19,
    						y: 17,
    						blockId: 2
    					},
    					{
    						x: 19,
    						y: 18,
    						blockId: 2
    					},
    					{
    						x: 19,
    						y: 19,
    						blockId: 2
    					},
    					{
    						x: 19,
    						y: 20,
    						blockId: 2
    					},
    					{
    						x: 20,
    						y: 14,
    						blockId: 2
    					},
    					{
    						x: 20,
    						y: 13,
    						blockId: 2
    					},
    					{
    						x: 20,
    						y: 12,
    						blockId: 2
    					},
    					{
    						x: 20,
    						y: 11,
    						blockId: 3
    					},
    					{
    						x: 20,
    						y: 15,
    						blockId: 2
    					},
    					{
    						x: 20,
    						y: 16,
    						blockId: 2
    					},
    					{
    						x: 20,
    						y: 21,
    						blockId: 3
    					},
    					{
    						x: 20,
    						y: 17,
    						blockId: 2
    					},
    					{
    						x: 20,
    						y: 18,
    						blockId: 2
    					},
    					{
    						x: 20,
    						y: 19,
    						blockId: 2
    					},
    					{
    						x: 20,
    						y: 20,
    						blockId: 2
    					},
    					{
    						x: 21,
    						y: 17,
    						blockId: 3
    					},
    					{
    						x: 21,
    						y: 16,
    						blockId: 3
    					},
    					{
    						x: 21,
    						y: 15,
    						blockId: 3
    					},
    					{
    						x: 21,
    						y: 14,
    						blockId: 3
    					},
    					{
    						x: 21,
    						y: 13,
    						blockId: 3
    					},
    					{
    						x: 21,
    						y: 12,
    						blockId: 3
    					},
    					{
    						x: 21,
    						y: 11,
    						blockId: 3
    					},
    					{
    						x: 21,
    						y: 21,
    						blockId: 3
    					},
    					{
    						x: 21,
    						y: 20,
    						blockId: 3
    					},
    					{
    						x: 21,
    						y: 19,
    						blockId: 3
    					},
    					{
    						x: 21,
    						y: 18,
    						blockId: 3
    					}
    				],
    				enemies: [
    				],
    				id: 1
    			}
    		},
    		gameType: "top",
    		pixelSize: 1
    	}
    ];

    const PROJECT_VERSION = 1;

    const defaultValue = [...sampleProjects];

    // migrate any existing projects to fix keys / etc
    const oldProjectsValue = localStorage.getItem('projects');
    const projectsValue = (oldProjectsValue != null ? JSON.parse(oldProjectsValue) : defaultValue).map(p => migrateProject(p));
    localStorage.setItem('projects', JSON.stringify(projectsValue));

    function migrateProject(project) {
      if (project.version == null) project.version = 0;

      project = cleanup(project);
      return project
    }

    function cleanup(project) {
      if (project.blocks == null) project.blocks = {};
      if (project.particles == null) project.particles = {};
      if (project.art == null) project.art = {};
      if (project.enemies == null) project.enemies = {};
      if (project.characters == null) project.characters = {};
      if (project.blocks == null) project.blocks = {};
      if (project.levels == null) project.levels = {};

      return project
    }

    const { subscribe: subscribe$1, set: set$1 } = LocalStorageStore('projects', projectsValue);
    var projects = {
      subscribe: subscribe$1,

      // whenever they save projects, clean all projects up
      set: function (value) {
        return set$1(value.map(p => cleanup(p)))
      },
    };

    function getNextId(collection) {
      const maxId = Object.values(collection)
        .map(c => c.id)
        .sort((a, b) => a.id < b.id)
        .pop();
      return maxId == null ? 0 : maxId + 1
    }

    /* src\components\AnimationPreview.svelte generated by Svelte v3.38.3 */
    const file$v = "src\\components\\AnimationPreview.svelte";

    // (6:0) {#if png != null}
    function create_if_block$d(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (!/*simple*/ ctx[5]) return create_if_block_1$8;
    		return create_else_block$4;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$d.name,
    		type: "if",
    		source: "(6:0) {#if png != null}",
    		ctx
    	});

    	return block;
    }

    // (17:2) {:else}
    function create_else_block$4(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "animation-preview");
    			set_style(div, "background-repeat", "no-repeat");
    			set_style(div, "background-image", "url(" + /*png*/ ctx[0] + ")");
    			set_style(div, "background-position", /*frameIndex*/ ctx[6] * -/*frameWidth*/ ctx[3] * /*scale*/ ctx[4] + "px top");
    			set_style(div, "background-size", /*width*/ ctx[1] * /*scale*/ ctx[4] + "px " + /*height*/ ctx[2] * /*scale*/ ctx[4] + "px");
    			set_style(div, "width", /*frameWidth*/ ctx[3] * /*scale*/ ctx[4] + "px");
    			set_style(div, "height", /*height*/ ctx[2] * /*scale*/ ctx[4] + "px");
    			add_location(div, file$v, 17, 4, 909);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*png*/ 1) {
    				set_style(div, "background-image", "url(" + /*png*/ ctx[0] + ")");
    			}

    			if (dirty & /*frameIndex, frameWidth, scale*/ 88) {
    				set_style(div, "background-position", /*frameIndex*/ ctx[6] * -/*frameWidth*/ ctx[3] * /*scale*/ ctx[4] + "px top");
    			}

    			if (dirty & /*width, scale, height*/ 22) {
    				set_style(div, "background-size", /*width*/ ctx[1] * /*scale*/ ctx[4] + "px " + /*height*/ ctx[2] * /*scale*/ ctx[4] + "px");
    			}

    			if (dirty & /*frameWidth, scale*/ 24) {
    				set_style(div, "width", /*frameWidth*/ ctx[3] * /*scale*/ ctx[4] + "px");
    			}

    			if (dirty & /*height, scale*/ 20) {
    				set_style(div, "height", /*height*/ ctx[2] * /*scale*/ ctx[4] + "px");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$4.name,
    		type: "else",
    		source: "(17:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (7:2) {#if !simple}
    function create_if_block_1$8(ctx) {
    	let div3;
    	let div0;
    	let t0;
    	let div1;
    	let t1;
    	let div2;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			t1 = space();
    			div2 = element("div");
    			set_style(div0, "background-repeat", "no-repeat");
    			set_style(div0, "background-image", "url(" + /*png*/ ctx[0] + ")");
    			set_style(div0, "background-position", /*width*/ ctx[1] * /*scale*/ ctx[4] - /*frameWidth*/ ctx[3] * /*scale*/ ctx[4] * (/*frameIndex*/ ctx[6] + 1) + "px\r\n\t\t\t\ttop");
    			set_style(div0, "background-size", /*width*/ ctx[1] * /*scale*/ ctx[4] + "px " + /*height*/ ctx[2] * /*scale*/ ctx[4] + "px");
    			set_style(div0, "width", /*width*/ ctx[1] * /*scale*/ ctx[4] * 2 - /*frameWidth*/ ctx[3] * /*scale*/ ctx[4] + "px");
    			set_style(div0, "height", /*height*/ ctx[2] * /*scale*/ ctx[4] + "px");
    			add_location(div0, file$v, 8, 6, 317);
    			attr_dev(div1, "class", "animation-preview-cover svelte-zhpaz2");
    			set_style(div1, "left", "0");
    			set_style(div1, "width", /*width*/ ctx[1] * /*scale*/ ctx[4] - /*frameWidth*/ ctx[3] * /*scale*/ ctx[4] + "px");
    			add_location(div1, file$v, 13, 6, 650);
    			attr_dev(div2, "class", "animation-preview-cover svelte-zhpaz2");
    			set_style(div2, "left", /*width*/ ctx[1] * /*scale*/ ctx[4] + "px");
    			set_style(div2, "width", /*width*/ ctx[1] * /*scale*/ ctx[4] - /*frameWidth*/ ctx[3] * /*scale*/ ctx[4] + "px");
    			add_location(div2, file$v, 14, 6, 761);
    			attr_dev(div3, "class", "animation-preview-container svelte-zhpaz2");
    			add_location(div3, file$v, 7, 4, 268);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div3, t0);
    			append_dev(div3, div1);
    			append_dev(div3, t1);
    			append_dev(div3, div2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*png*/ 1) {
    				set_style(div0, "background-image", "url(" + /*png*/ ctx[0] + ")");
    			}

    			if (dirty & /*width, scale, frameWidth, frameIndex*/ 90) {
    				set_style(div0, "background-position", /*width*/ ctx[1] * /*scale*/ ctx[4] - /*frameWidth*/ ctx[3] * /*scale*/ ctx[4] * (/*frameIndex*/ ctx[6] + 1) + "px\r\n\t\t\t\ttop");
    			}

    			if (dirty & /*width, scale, height*/ 22) {
    				set_style(div0, "background-size", /*width*/ ctx[1] * /*scale*/ ctx[4] + "px " + /*height*/ ctx[2] * /*scale*/ ctx[4] + "px");
    			}

    			if (dirty & /*width, scale, frameWidth*/ 26) {
    				set_style(div0, "width", /*width*/ ctx[1] * /*scale*/ ctx[4] * 2 - /*frameWidth*/ ctx[3] * /*scale*/ ctx[4] + "px");
    			}

    			if (dirty & /*height, scale*/ 20) {
    				set_style(div0, "height", /*height*/ ctx[2] * /*scale*/ ctx[4] + "px");
    			}

    			if (dirty & /*width, scale, frameWidth*/ 26) {
    				set_style(div1, "width", /*width*/ ctx[1] * /*scale*/ ctx[4] - /*frameWidth*/ ctx[3] * /*scale*/ ctx[4] + "px");
    			}

    			if (dirty & /*width, scale*/ 18) {
    				set_style(div2, "left", /*width*/ ctx[1] * /*scale*/ ctx[4] + "px");
    			}

    			if (dirty & /*width, scale, frameWidth*/ 26) {
    				set_style(div2, "width", /*width*/ ctx[1] * /*scale*/ ctx[4] - /*frameWidth*/ ctx[3] * /*scale*/ ctx[4] + "px");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$8.name,
    		type: "if",
    		source: "(7:2) {#if !simple}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$x(ctx) {
    	let if_block_anchor;
    	let if_block = /*png*/ ctx[0] != null && create_if_block$d(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*png*/ ctx[0] != null) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$d(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$x.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$x($$self, $$props, $$invalidate) {
    	let numFrames;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("AnimationPreview", slots, []);
    	let { png } = $$props;
    	let { width } = $$props;
    	let { height } = $$props;
    	let { frameWidth } = $$props;
    	let { frameRate } = $$props;
    	let { scale = 1 } = $$props;
    	let { yoyo } = $$props;
    	let { simple = false } = $$props;
    	let frameIndex = 0;
    	let frameDelta = 1;
    	let frame = 0;
    	let lastRequestedFrame;
    	animate();

    	function animate() {
    		lastRequestedFrame = window.requestAnimationFrame(() => {
    			$$invalidate(10, frame++, frame);
    			animate();
    		});
    	}

    	onDestroy(() => {
    		window.cancelAnimationFrame(lastRequestedFrame);
    	});

    	const writable_props = ["png", "width", "height", "frameWidth", "frameRate", "scale", "yoyo", "simple"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<AnimationPreview> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("png" in $$props) $$invalidate(0, png = $$props.png);
    		if ("width" in $$props) $$invalidate(1, width = $$props.width);
    		if ("height" in $$props) $$invalidate(2, height = $$props.height);
    		if ("frameWidth" in $$props) $$invalidate(3, frameWidth = $$props.frameWidth);
    		if ("frameRate" in $$props) $$invalidate(7, frameRate = $$props.frameRate);
    		if ("scale" in $$props) $$invalidate(4, scale = $$props.scale);
    		if ("yoyo" in $$props) $$invalidate(8, yoyo = $$props.yoyo);
    		if ("simple" in $$props) $$invalidate(5, simple = $$props.simple);
    	};

    	$$self.$capture_state = () => ({
    		onDestroy,
    		png,
    		width,
    		height,
    		frameWidth,
    		frameRate,
    		scale,
    		yoyo,
    		simple,
    		frameIndex,
    		frameDelta,
    		frame,
    		lastRequestedFrame,
    		animate,
    		numFrames
    	});

    	$$self.$inject_state = $$props => {
    		if ("png" in $$props) $$invalidate(0, png = $$props.png);
    		if ("width" in $$props) $$invalidate(1, width = $$props.width);
    		if ("height" in $$props) $$invalidate(2, height = $$props.height);
    		if ("frameWidth" in $$props) $$invalidate(3, frameWidth = $$props.frameWidth);
    		if ("frameRate" in $$props) $$invalidate(7, frameRate = $$props.frameRate);
    		if ("scale" in $$props) $$invalidate(4, scale = $$props.scale);
    		if ("yoyo" in $$props) $$invalidate(8, yoyo = $$props.yoyo);
    		if ("simple" in $$props) $$invalidate(5, simple = $$props.simple);
    		if ("frameIndex" in $$props) $$invalidate(6, frameIndex = $$props.frameIndex);
    		if ("frameDelta" in $$props) $$invalidate(9, frameDelta = $$props.frameDelta);
    		if ("frame" in $$props) $$invalidate(10, frame = $$props.frame);
    		if ("lastRequestedFrame" in $$props) lastRequestedFrame = $$props.lastRequestedFrame;
    		if ("numFrames" in $$props) $$invalidate(11, numFrames = $$props.numFrames);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*width, frameWidth*/ 10) {
    			$$invalidate(11, numFrames = width != null ? Math.ceil(width / frameWidth) : 0);
    		}

    		if ($$self.$$.dirty & /*png*/ 1) {
    			if (png != null) {
    				$$invalidate(6, frameIndex = 0);
    				$$invalidate(9, frameDelta = 1);
    			}
    		}

    		if ($$self.$$.dirty & /*frame, frameRate, numFrames, yoyo, frameIndex, frameDelta*/ 4032) {
    			// change the graphic every 60 / frameRate frames
    			if (frame > 60 / frameRate) {
    				if (numFrames > 1) {
    					if (yoyo) {
    						if (frameIndex == 0 && frameDelta == -1 || frameIndex == numFrames - 1 && frameDelta == 1) $$invalidate(9, frameDelta *= -1);
    						$$invalidate(6, frameIndex += frameDelta);
    					} else {
    						$$invalidate(6, frameIndex = frameIndex >= numFrames - 1 ? 0 : frameIndex + 1);
    					}
    				} else {
    					$$invalidate(6, frameIndex = 0);
    				}

    				$$invalidate(10, frame = 0);
    			}
    		}
    	};

    	return [
    		png,
    		width,
    		height,
    		frameWidth,
    		scale,
    		simple,
    		frameIndex,
    		frameRate,
    		yoyo,
    		frameDelta,
    		frame,
    		numFrames
    	];
    }

    class AnimationPreview extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$x, create_fragment$x, safe_not_equal, {
    			png: 0,
    			width: 1,
    			height: 2,
    			frameWidth: 3,
    			frameRate: 7,
    			scale: 4,
    			yoyo: 8,
    			simple: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AnimationPreview",
    			options,
    			id: create_fragment$x.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*png*/ ctx[0] === undefined && !("png" in props)) {
    			console.warn("<AnimationPreview> was created without expected prop 'png'");
    		}

    		if (/*width*/ ctx[1] === undefined && !("width" in props)) {
    			console.warn("<AnimationPreview> was created without expected prop 'width'");
    		}

    		if (/*height*/ ctx[2] === undefined && !("height" in props)) {
    			console.warn("<AnimationPreview> was created without expected prop 'height'");
    		}

    		if (/*frameWidth*/ ctx[3] === undefined && !("frameWidth" in props)) {
    			console.warn("<AnimationPreview> was created without expected prop 'frameWidth'");
    		}

    		if (/*frameRate*/ ctx[7] === undefined && !("frameRate" in props)) {
    			console.warn("<AnimationPreview> was created without expected prop 'frameRate'");
    		}

    		if (/*yoyo*/ ctx[8] === undefined && !("yoyo" in props)) {
    			console.warn("<AnimationPreview> was created without expected prop 'yoyo'");
    		}
    	}

    	get png() {
    		throw new Error("<AnimationPreview>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set png(value) {
    		throw new Error("<AnimationPreview>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get width() {
    		throw new Error("<AnimationPreview>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set width(value) {
    		throw new Error("<AnimationPreview>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get height() {
    		throw new Error("<AnimationPreview>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set height(value) {
    		throw new Error("<AnimationPreview>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get frameWidth() {
    		throw new Error("<AnimationPreview>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set frameWidth(value) {
    		throw new Error("<AnimationPreview>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get frameRate() {
    		throw new Error("<AnimationPreview>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set frameRate(value) {
    		throw new Error("<AnimationPreview>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get scale() {
    		throw new Error("<AnimationPreview>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set scale(value) {
    		throw new Error("<AnimationPreview>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get yoyo() {
    		throw new Error("<AnimationPreview>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set yoyo(value) {
    		throw new Error("<AnimationPreview>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get simple() {
    		throw new Error("<AnimationPreview>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set simple(value) {
    		throw new Error("<AnimationPreview>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const lastSelectedKey = 'last-active-project-name';
    let selectedName = localStorage.getItem(lastSelectedKey);
    const { subscribe, set } = writable(null);

    let $projects;
    projects.subscribe(value => {
      $projects = value;
      if (selectedName != null) {
        const p = $projects.find(p => p.name === selectedName);
        set(p);
      }
    });

    var project = {
      subscribe,
      set: value => {
        set(value);
        selectedName = value?.name;
        localStorage.setItem(lastSelectedKey, value?.name);
        if (value != null) {
          projects.set($projects.map(p => (p.name == value.name ? value : p)));
        }
      },
    };

    /* src\components\AppLayout.svelte generated by Svelte v3.38.3 */
    const file$u = "src\\components\\AppLayout.svelte";

    // (5:4) {#if $project}
    function create_if_block$c(ctx) {
    	let div;
    	let a0;
    	let t0_value = /*$project*/ ctx[1].name + "";
    	let t0;
    	let t1;
    	let a1;
    	let t3;
    	let a2;
    	let t5;
    	let a3;
    	let t7;
    	let a4;
    	let t9;
    	let a5;
    	let t11;
    	let a6;
    	let t13;
    	let a7;

    	const block = {
    		c: function create() {
    			div = element("div");
    			a0 = element("a");
    			t0 = text(t0_value);
    			t1 = space();
    			a1 = element("a");
    			a1.textContent = "Project settings";
    			t3 = space();
    			a2 = element("a");
    			a2.textContent = "Art";
    			t5 = space();
    			a3 = element("a");
    			a3.textContent = "Particles";
    			t7 = space();
    			a4 = element("a");
    			a4.textContent = "Blocks";
    			t9 = space();
    			a5 = element("a");
    			a5.textContent = "Characters";
    			t11 = space();
    			a6 = element("a");
    			a6.textContent = "Enemies";
    			t13 = space();
    			a7 = element("a");
    			a7.textContent = "Levels";
    			attr_dev(a0, "href", "/#/projects");
    			attr_dev(a0, "class", "strong svelte-589f90");
    			attr_dev(a0, "title", "Change project");
    			toggle_class(a0, "active", /*active*/ ctx[0] == "projects");
    			add_location(a0, file$u, 6, 8, 122);
    			attr_dev(a1, "href", "/#/project");
    			attr_dev(a1, "class", "svelte-589f90");
    			toggle_class(a1, "active", /*active*/ ctx[0] == "project");
    			add_location(a1, file$u, 7, 8, 246);
    			attr_dev(a2, "href", "/#/art");
    			attr_dev(a2, "class", "svelte-589f90");
    			toggle_class(a2, "active", /*active*/ ctx[0] == "art");
    			add_location(a2, file$u, 8, 8, 331);
    			attr_dev(a3, "href", "/#/particles");
    			attr_dev(a3, "class", "svelte-589f90");
    			toggle_class(a3, "active", /*active*/ ctx[0] == "particles");
    			add_location(a3, file$u, 9, 8, 395);
    			attr_dev(a4, "href", "/#/blocks");
    			attr_dev(a4, "class", "svelte-589f90");
    			toggle_class(a4, "active", /*active*/ ctx[0] == "blocks");
    			add_location(a4, file$u, 10, 8, 477);
    			attr_dev(a5, "href", "/#/characters");
    			attr_dev(a5, "class", "svelte-589f90");
    			toggle_class(a5, "active", /*active*/ ctx[0] == "characters");
    			add_location(a5, file$u, 11, 8, 550);
    			attr_dev(a6, "href", "/#/enemies");
    			attr_dev(a6, "class", "svelte-589f90");
    			toggle_class(a6, "active", /*active*/ ctx[0] == "enemies");
    			add_location(a6, file$u, 12, 8, 635);
    			attr_dev(a7, "href", "/#/levels");
    			attr_dev(a7, "class", "svelte-589f90");
    			toggle_class(a7, "active", /*active*/ ctx[0] == "levels");
    			add_location(a7, file$u, 13, 8, 711);
    			attr_dev(div, "class", "nav svelte-589f90");
    			add_location(div, file$u, 5, 6, 96);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, a0);
    			append_dev(a0, t0);
    			append_dev(div, t1);
    			append_dev(div, a1);
    			append_dev(div, t3);
    			append_dev(div, a2);
    			append_dev(div, t5);
    			append_dev(div, a3);
    			append_dev(div, t7);
    			append_dev(div, a4);
    			append_dev(div, t9);
    			append_dev(div, a5);
    			append_dev(div, t11);
    			append_dev(div, a6);
    			append_dev(div, t13);
    			append_dev(div, a7);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$project*/ 2 && t0_value !== (t0_value = /*$project*/ ctx[1].name + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*active*/ 1) {
    				toggle_class(a0, "active", /*active*/ ctx[0] == "projects");
    			}

    			if (dirty & /*active*/ 1) {
    				toggle_class(a1, "active", /*active*/ ctx[0] == "project");
    			}

    			if (dirty & /*active*/ 1) {
    				toggle_class(a2, "active", /*active*/ ctx[0] == "art");
    			}

    			if (dirty & /*active*/ 1) {
    				toggle_class(a3, "active", /*active*/ ctx[0] == "particles");
    			}

    			if (dirty & /*active*/ 1) {
    				toggle_class(a4, "active", /*active*/ ctx[0] == "blocks");
    			}

    			if (dirty & /*active*/ 1) {
    				toggle_class(a5, "active", /*active*/ ctx[0] == "characters");
    			}

    			if (dirty & /*active*/ 1) {
    				toggle_class(a6, "active", /*active*/ ctx[0] == "enemies");
    			}

    			if (dirty & /*active*/ 1) {
    				toggle_class(a7, "active", /*active*/ ctx[0] == "levels");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$c.name,
    		type: "if",
    		source: "(5:4) {#if $project}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$w(ctx) {
    	let div2;
    	let div0;
    	let h1;
    	let t1;
    	let t2;
    	let div1;
    	let current;
    	let if_block = /*$project*/ ctx[1] && create_if_block$c(ctx);
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "CSBuilder";
    			t1 = space();
    			if (if_block) if_block.c();
    			t2 = space();
    			div1 = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(h1, "class", "svelte-589f90");
    			add_location(h1, file$u, 2, 4, 51);
    			attr_dev(div0, "class", "header svelte-589f90");
    			add_location(div0, file$u, 1, 2, 26);
    			attr_dev(div1, "class", "main svelte-589f90");
    			add_location(div1, file$u, 18, 2, 811);
    			attr_dev(div2, "class", "container svelte-589f90");
    			add_location(div2, file$u, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, h1);
    			append_dev(div0, t1);
    			if (if_block) if_block.m(div0, null);
    			append_dev(div2, t2);
    			append_dev(div2, div1);

    			if (default_slot) {
    				default_slot.m(div1, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*$project*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$c(ctx);
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], !current ? -1 : dirty, null, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (if_block) if_block.d();
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$w.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$w($$self, $$props, $$invalidate) {
    	let $project;
    	validate_store(project, "project");
    	component_subscribe($$self, project, $$value => $$invalidate(1, $project = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("AppLayout", slots, ['default']);
    	let { active } = $$props;
    	const writable_props = ["active"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<AppLayout> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("active" in $$props) $$invalidate(0, active = $$props.active);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ project, active, $project });

    	$$self.$inject_state = $$props => {
    		if ("active" in $$props) $$invalidate(0, active = $$props.active);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [active, $project, $$scope, slots];
    }

    class AppLayout extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$w, create_fragment$w, safe_not_equal, { active: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AppLayout",
    			options,
    			id: create_fragment$w.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*active*/ ctx[0] === undefined && !("active" in props)) {
    			console.warn("<AppLayout> was created without expected prop 'active'");
    		}
    	}

    	get active() {
    		throw new Error("<AppLayout>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set active(value) {
    		throw new Error("<AppLayout>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\ArtThumb.svelte generated by Svelte v3.38.3 */
    const file$t = "src\\components\\ArtThumb.svelte";

    // (1:0) {#if art}
    function create_if_block$b(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1$7, create_else_block$3];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*art*/ ctx[0].animated) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$b.name,
    		type: "if",
    		source: "(1:0) {#if art}",
    		ctx
    	});

    	return block;
    }

    // (6:2) {:else}
    function create_else_block$3(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "art-thumb");
    			set_style(div, "background-image", "url(" + /*art*/ ctx[0].png + ")");
    			add_location(div, file$t, 6, 4, 133);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*art*/ 1) {
    				set_style(div, "background-image", "url(" + /*art*/ ctx[0].png + ")");
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$3.name,
    		type: "else",
    		source: "(6:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (2:2) {#if art.animated}
    function create_if_block_1$7(ctx) {
    	let div;
    	let animationpreview;
    	let current;
    	const animationpreview_spread_levels = [/*art*/ ctx[0], { simple: true }];
    	let animationpreview_props = {};

    	for (let i = 0; i < animationpreview_spread_levels.length; i += 1) {
    		animationpreview_props = assign(animationpreview_props, animationpreview_spread_levels[i]);
    	}

    	animationpreview = new AnimationPreview({
    			props: animationpreview_props,
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(animationpreview.$$.fragment);
    			attr_dev(div, "class", "art-thumb");
    			add_location(div, file$t, 2, 4, 37);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(animationpreview, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const animationpreview_changes = (dirty & /*art*/ 1)
    			? get_spread_update(animationpreview_spread_levels, [get_spread_object(/*art*/ ctx[0]), animationpreview_spread_levels[1]])
    			: {};

    			animationpreview.$set(animationpreview_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(animationpreview.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(animationpreview.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(animationpreview);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$7.name,
    		type: "if",
    		source: "(2:2) {#if art.animated}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$v(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*art*/ ctx[0] && create_if_block$b(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*art*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*art*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$b(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$v.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$v($$self, $$props, $$invalidate) {
    	let art;
    	let $project;
    	validate_store(project, "project");
    	component_subscribe($$self, project, $$value => $$invalidate(2, $project = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ArtThumb", slots, []);
    	let { id } = $$props;
    	const writable_props = ["id"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ArtThumb> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("id" in $$props) $$invalidate(1, id = $$props.id);
    	};

    	$$self.$capture_state = () => ({
    		project,
    		AnimationPreview,
    		id,
    		art,
    		$project
    	});

    	$$self.$inject_state = $$props => {
    		if ("id" in $$props) $$invalidate(1, id = $$props.id);
    		if ("art" in $$props) $$invalidate(0, art = $$props.art);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*id, $project*/ 6) {
    			$$invalidate(0, art = id != null ? $project.art[id] : null);
    		}
    	};

    	return [art, id, $project];
    }

    class ArtThumb extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$v, create_fragment$v, safe_not_equal, { id: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ArtThumb",
    			options,
    			id: create_fragment$v.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*id*/ ctx[1] === undefined && !("id" in props)) {
    			console.warn("<ArtThumb> was created without expected prop 'id'");
    		}
    	}

    	get id() {
    		throw new Error("<ArtThumb>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<ArtThumb>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var autoSaveStore = LocalStorageStore('auto-saves', {});

    /* node_modules\svelte-awesome\components\svg\Path.svelte generated by Svelte v3.38.3 */

    const file$s = "node_modules\\svelte-awesome\\components\\svg\\Path.svelte";

    function create_fragment$u(ctx) {
    	let path;
    	let path_key_value;

    	let path_levels = [
    		{
    			key: path_key_value = "path-" + /*id*/ ctx[0]
    		},
    		/*data*/ ctx[1]
    	];

    	let path_data = {};

    	for (let i = 0; i < path_levels.length; i += 1) {
    		path_data = assign(path_data, path_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			path = svg_element("path");
    			set_svg_attributes(path, path_data);
    			add_location(path, file$s, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(path, path_data = get_spread_update(path_levels, [
    				dirty & /*id*/ 1 && path_key_value !== (path_key_value = "path-" + /*id*/ ctx[0]) && { key: path_key_value },
    				dirty & /*data*/ 2 && /*data*/ ctx[1]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$u.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$u($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Path", slots, []);
    	let { id = "" } = $$props;
    	let { data = {} } = $$props;
    	const writable_props = ["id", "data"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Path> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("data" in $$props) $$invalidate(1, data = $$props.data);
    	};

    	$$self.$capture_state = () => ({ id, data });

    	$$self.$inject_state = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("data" in $$props) $$invalidate(1, data = $$props.data);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [id, data];
    }

    class Path extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$u, create_fragment$u, safe_not_equal, { id: 0, data: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Path",
    			options,
    			id: create_fragment$u.name
    		});
    	}

    	get id() {
    		throw new Error("<Path>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Path>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get data() {
    		throw new Error("<Path>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<Path>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-awesome\components\svg\Polygon.svelte generated by Svelte v3.38.3 */

    const file$r = "node_modules\\svelte-awesome\\components\\svg\\Polygon.svelte";

    function create_fragment$t(ctx) {
    	let polygon;
    	let polygon_key_value;

    	let polygon_levels = [
    		{
    			key: polygon_key_value = "polygon-" + /*id*/ ctx[0]
    		},
    		/*data*/ ctx[1]
    	];

    	let polygon_data = {};

    	for (let i = 0; i < polygon_levels.length; i += 1) {
    		polygon_data = assign(polygon_data, polygon_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			polygon = svg_element("polygon");
    			set_svg_attributes(polygon, polygon_data);
    			add_location(polygon, file$r, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, polygon, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(polygon, polygon_data = get_spread_update(polygon_levels, [
    				dirty & /*id*/ 1 && polygon_key_value !== (polygon_key_value = "polygon-" + /*id*/ ctx[0]) && { key: polygon_key_value },
    				dirty & /*data*/ 2 && /*data*/ ctx[1]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(polygon);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$t.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$t($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Polygon", slots, []);
    	let { id = "" } = $$props;
    	let { data = {} } = $$props;
    	const writable_props = ["id", "data"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Polygon> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("data" in $$props) $$invalidate(1, data = $$props.data);
    	};

    	$$self.$capture_state = () => ({ id, data });

    	$$self.$inject_state = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("data" in $$props) $$invalidate(1, data = $$props.data);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [id, data];
    }

    class Polygon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$t, create_fragment$t, safe_not_equal, { id: 0, data: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Polygon",
    			options,
    			id: create_fragment$t.name
    		});
    	}

    	get id() {
    		throw new Error("<Polygon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Polygon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get data() {
    		throw new Error("<Polygon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<Polygon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-awesome\components\svg\Raw.svelte generated by Svelte v3.38.3 */

    const file$q = "node_modules\\svelte-awesome\\components\\svg\\Raw.svelte";

    function create_fragment$s(ctx) {
    	let g;

    	const block = {
    		c: function create() {
    			g = svg_element("g");
    			add_location(g, file$q, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, g, anchor);
    			g.innerHTML = /*raw*/ ctx[0];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*raw*/ 1) g.innerHTML = /*raw*/ ctx[0];		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$s.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$s($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Raw", slots, []);
    	let cursor = 870711;

    	function getId() {
    		cursor += 1;
    		return `fa-${cursor.toString(16)}`;
    	}

    	let raw;
    	let { data } = $$props;

    	function getRaw(data) {
    		if (!data || !data.raw) {
    			return null;
    		}

    		let rawData = data.raw;
    		const ids = {};

    		rawData = rawData.replace(/\s(?:xml:)?id=["']?([^"')\s]+)/g, (match, id) => {
    			const uniqueId = getId();
    			ids[id] = uniqueId;
    			return ` id="${uniqueId}"`;
    		});

    		rawData = rawData.replace(/#(?:([^'")\s]+)|xpointer\(id\((['"]?)([^')]+)\2\)\))/g, (match, rawId, _, pointerId) => {
    			const id = rawId || pointerId;

    			if (!id || !ids[id]) {
    				return match;
    			}

    			return `#${ids[id]}`;
    		});

    		return rawData;
    	}

    	const writable_props = ["data"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Raw> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("data" in $$props) $$invalidate(1, data = $$props.data);
    	};

    	$$self.$capture_state = () => ({ cursor, getId, raw, data, getRaw });

    	$$self.$inject_state = $$props => {
    		if ("cursor" in $$props) cursor = $$props.cursor;
    		if ("raw" in $$props) $$invalidate(0, raw = $$props.raw);
    		if ("data" in $$props) $$invalidate(1, data = $$props.data);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*data*/ 2) {
    			$$invalidate(0, raw = getRaw(data));
    		}
    	};

    	return [raw, data];
    }

    class Raw extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$s, create_fragment$s, safe_not_equal, { data: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Raw",
    			options,
    			id: create_fragment$s.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*data*/ ctx[1] === undefined && !("data" in props)) {
    			console.warn("<Raw> was created without expected prop 'data'");
    		}
    	}

    	get data() {
    		throw new Error("<Raw>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<Raw>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-awesome\components\svg\Svg.svelte generated by Svelte v3.38.3 */

    const file$p = "node_modules\\svelte-awesome\\components\\svg\\Svg.svelte";

    function create_fragment$r(ctx) {
    	let svg;
    	let svg_class_value;
    	let svg_role_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[13].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[12], null);

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			if (default_slot) default_slot.c();
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "class", svg_class_value = "fa-icon " + /*className*/ ctx[0] + " svelte-1dof0an");
    			attr_dev(svg, "x", /*x*/ ctx[8]);
    			attr_dev(svg, "y", /*y*/ ctx[9]);
    			attr_dev(svg, "width", /*width*/ ctx[1]);
    			attr_dev(svg, "height", /*height*/ ctx[2]);
    			attr_dev(svg, "aria-label", /*label*/ ctx[11]);
    			attr_dev(svg, "role", svg_role_value = /*label*/ ctx[11] ? "img" : "presentation");
    			attr_dev(svg, "viewBox", /*box*/ ctx[3]);
    			attr_dev(svg, "style", /*style*/ ctx[10]);
    			toggle_class(svg, "fa-spin", /*spin*/ ctx[4]);
    			toggle_class(svg, "fa-pulse", /*pulse*/ ctx[6]);
    			toggle_class(svg, "fa-inverse", /*inverse*/ ctx[5]);
    			toggle_class(svg, "fa-flip-horizontal", /*flip*/ ctx[7] === "horizontal");
    			toggle_class(svg, "fa-flip-vertical", /*flip*/ ctx[7] === "vertical");
    			add_location(svg, file$p, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);

    			if (default_slot) {
    				default_slot.m(svg, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4096)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[12], !current ? -1 : dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*className*/ 1 && svg_class_value !== (svg_class_value = "fa-icon " + /*className*/ ctx[0] + " svelte-1dof0an")) {
    				attr_dev(svg, "class", svg_class_value);
    			}

    			if (!current || dirty & /*x*/ 256) {
    				attr_dev(svg, "x", /*x*/ ctx[8]);
    			}

    			if (!current || dirty & /*y*/ 512) {
    				attr_dev(svg, "y", /*y*/ ctx[9]);
    			}

    			if (!current || dirty & /*width*/ 2) {
    				attr_dev(svg, "width", /*width*/ ctx[1]);
    			}

    			if (!current || dirty & /*height*/ 4) {
    				attr_dev(svg, "height", /*height*/ ctx[2]);
    			}

    			if (!current || dirty & /*label*/ 2048) {
    				attr_dev(svg, "aria-label", /*label*/ ctx[11]);
    			}

    			if (!current || dirty & /*label*/ 2048 && svg_role_value !== (svg_role_value = /*label*/ ctx[11] ? "img" : "presentation")) {
    				attr_dev(svg, "role", svg_role_value);
    			}

    			if (!current || dirty & /*box*/ 8) {
    				attr_dev(svg, "viewBox", /*box*/ ctx[3]);
    			}

    			if (!current || dirty & /*style*/ 1024) {
    				attr_dev(svg, "style", /*style*/ ctx[10]);
    			}

    			if (dirty & /*className, spin*/ 17) {
    				toggle_class(svg, "fa-spin", /*spin*/ ctx[4]);
    			}

    			if (dirty & /*className, pulse*/ 65) {
    				toggle_class(svg, "fa-pulse", /*pulse*/ ctx[6]);
    			}

    			if (dirty & /*className, inverse*/ 33) {
    				toggle_class(svg, "fa-inverse", /*inverse*/ ctx[5]);
    			}

    			if (dirty & /*className, flip*/ 129) {
    				toggle_class(svg, "fa-flip-horizontal", /*flip*/ ctx[7] === "horizontal");
    			}

    			if (dirty & /*className, flip*/ 129) {
    				toggle_class(svg, "fa-flip-vertical", /*flip*/ ctx[7] === "vertical");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$r.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$r($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Svg", slots, ['default']);
    	let { class: className } = $$props;
    	let { width } = $$props;
    	let { height } = $$props;
    	let { box } = $$props;
    	let { spin = false } = $$props;
    	let { inverse = false } = $$props;
    	let { pulse = false } = $$props;
    	let { flip = null } = $$props;
    	let { x = undefined } = $$props;
    	let { y = undefined } = $$props;
    	let { style = undefined } = $$props;
    	let { label = undefined } = $$props;

    	const writable_props = [
    		"class",
    		"width",
    		"height",
    		"box",
    		"spin",
    		"inverse",
    		"pulse",
    		"flip",
    		"x",
    		"y",
    		"style",
    		"label"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Svg> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("class" in $$props) $$invalidate(0, className = $$props.class);
    		if ("width" in $$props) $$invalidate(1, width = $$props.width);
    		if ("height" in $$props) $$invalidate(2, height = $$props.height);
    		if ("box" in $$props) $$invalidate(3, box = $$props.box);
    		if ("spin" in $$props) $$invalidate(4, spin = $$props.spin);
    		if ("inverse" in $$props) $$invalidate(5, inverse = $$props.inverse);
    		if ("pulse" in $$props) $$invalidate(6, pulse = $$props.pulse);
    		if ("flip" in $$props) $$invalidate(7, flip = $$props.flip);
    		if ("x" in $$props) $$invalidate(8, x = $$props.x);
    		if ("y" in $$props) $$invalidate(9, y = $$props.y);
    		if ("style" in $$props) $$invalidate(10, style = $$props.style);
    		if ("label" in $$props) $$invalidate(11, label = $$props.label);
    		if ("$$scope" in $$props) $$invalidate(12, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		className,
    		width,
    		height,
    		box,
    		spin,
    		inverse,
    		pulse,
    		flip,
    		x,
    		y,
    		style,
    		label
    	});

    	$$self.$inject_state = $$props => {
    		if ("className" in $$props) $$invalidate(0, className = $$props.className);
    		if ("width" in $$props) $$invalidate(1, width = $$props.width);
    		if ("height" in $$props) $$invalidate(2, height = $$props.height);
    		if ("box" in $$props) $$invalidate(3, box = $$props.box);
    		if ("spin" in $$props) $$invalidate(4, spin = $$props.spin);
    		if ("inverse" in $$props) $$invalidate(5, inverse = $$props.inverse);
    		if ("pulse" in $$props) $$invalidate(6, pulse = $$props.pulse);
    		if ("flip" in $$props) $$invalidate(7, flip = $$props.flip);
    		if ("x" in $$props) $$invalidate(8, x = $$props.x);
    		if ("y" in $$props) $$invalidate(9, y = $$props.y);
    		if ("style" in $$props) $$invalidate(10, style = $$props.style);
    		if ("label" in $$props) $$invalidate(11, label = $$props.label);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		className,
    		width,
    		height,
    		box,
    		spin,
    		inverse,
    		pulse,
    		flip,
    		x,
    		y,
    		style,
    		label,
    		$$scope,
    		slots
    	];
    }

    class Svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$r, create_fragment$r, safe_not_equal, {
    			class: 0,
    			width: 1,
    			height: 2,
    			box: 3,
    			spin: 4,
    			inverse: 5,
    			pulse: 6,
    			flip: 7,
    			x: 8,
    			y: 9,
    			style: 10,
    			label: 11
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Svg",
    			options,
    			id: create_fragment$r.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*className*/ ctx[0] === undefined && !("class" in props)) {
    			console.warn("<Svg> was created without expected prop 'class'");
    		}

    		if (/*width*/ ctx[1] === undefined && !("width" in props)) {
    			console.warn("<Svg> was created without expected prop 'width'");
    		}

    		if (/*height*/ ctx[2] === undefined && !("height" in props)) {
    			console.warn("<Svg> was created without expected prop 'height'");
    		}

    		if (/*box*/ ctx[3] === undefined && !("box" in props)) {
    			console.warn("<Svg> was created without expected prop 'box'");
    		}
    	}

    	get class() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get width() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set width(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get height() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set height(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get box() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set box(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get spin() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set spin(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get inverse() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set inverse(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pulse() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pulse(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get flip() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set flip(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get x() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set x(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get y() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set y(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get style() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get label() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-awesome\components\Icon.svelte generated by Svelte v3.38.3 */

    const { Object: Object_1$6, console: console_1$1 } = globals;

    function get_each_context$6(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[29] = list[i];
    	child_ctx[31] = i;
    	return child_ctx;
    }

    function get_each_context_1$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[32] = list[i];
    	child_ctx[31] = i;
    	return child_ctx;
    }

    // (4:4) {#if self}
    function create_if_block$a(ctx) {
    	let t0;
    	let t1;
    	let if_block2_anchor;
    	let current;
    	let if_block0 = /*self*/ ctx[0].paths && create_if_block_3$2(ctx);
    	let if_block1 = /*self*/ ctx[0].polygons && create_if_block_2$4(ctx);
    	let if_block2 = /*self*/ ctx[0].raw && create_if_block_1$6(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			if_block2_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert_dev(target, if_block2_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*self*/ ctx[0].paths) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty[0] & /*self*/ 1) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_3$2(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*self*/ ctx[0].polygons) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty[0] & /*self*/ 1) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_2$4(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(t1.parentNode, t1);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*self*/ ctx[0].raw) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty[0] & /*self*/ 1) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block_1$6(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(if_block2_anchor.parentNode, if_block2_anchor);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(if_block2);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(if_block2);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(t1);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach_dev(if_block2_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$a.name,
    		type: "if",
    		source: "(4:4) {#if self}",
    		ctx
    	});

    	return block;
    }

    // (5:6) {#if self.paths}
    function create_if_block_3$2(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value_1 = /*self*/ ctx[0].paths;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$3(get_each_context_1$3(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*self*/ 1) {
    				each_value_1 = /*self*/ ctx[0].paths;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$3(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1$3(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$2.name,
    		type: "if",
    		source: "(5:6) {#if self.paths}",
    		ctx
    	});

    	return block;
    }

    // (6:8) {#each self.paths as path, i}
    function create_each_block_1$3(ctx) {
    	let path;
    	let current;

    	path = new Path({
    			props: {
    				id: /*i*/ ctx[31],
    				data: /*path*/ ctx[32]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(path.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(path, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const path_changes = {};
    			if (dirty[0] & /*self*/ 1) path_changes.data = /*path*/ ctx[32];
    			path.$set(path_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(path.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(path.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(path, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$3.name,
    		type: "each",
    		source: "(6:8) {#each self.paths as path, i}",
    		ctx
    	});

    	return block;
    }

    // (10:6) {#if self.polygons}
    function create_if_block_2$4(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*self*/ ctx[0].polygons;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$6(get_each_context$6(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*self*/ 1) {
    				each_value = /*self*/ ctx[0].polygons;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$6(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$6(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$4.name,
    		type: "if",
    		source: "(10:6) {#if self.polygons}",
    		ctx
    	});

    	return block;
    }

    // (11:8) {#each self.polygons as polygon, i}
    function create_each_block$6(ctx) {
    	let polygon;
    	let current;

    	polygon = new Polygon({
    			props: {
    				id: /*i*/ ctx[31],
    				data: /*polygon*/ ctx[29]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(polygon.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(polygon, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const polygon_changes = {};
    			if (dirty[0] & /*self*/ 1) polygon_changes.data = /*polygon*/ ctx[29];
    			polygon.$set(polygon_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(polygon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(polygon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(polygon, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$6.name,
    		type: "each",
    		source: "(11:8) {#each self.polygons as polygon, i}",
    		ctx
    	});

    	return block;
    }

    // (15:6) {#if self.raw}
    function create_if_block_1$6(ctx) {
    	let raw;
    	let updating_data;
    	let current;

    	function raw_data_binding(value) {
    		/*raw_data_binding*/ ctx[15](value);
    	}

    	let raw_props = {};

    	if (/*self*/ ctx[0] !== void 0) {
    		raw_props.data = /*self*/ ctx[0];
    	}

    	raw = new Raw({ props: raw_props, $$inline: true });
    	binding_callbacks.push(() => bind(raw, "data", raw_data_binding));

    	const block = {
    		c: function create() {
    			create_component(raw.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(raw, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const raw_changes = {};

    			if (!updating_data && dirty[0] & /*self*/ 1) {
    				updating_data = true;
    				raw_changes.data = /*self*/ ctx[0];
    				add_flush_callback(() => updating_data = false);
    			}

    			raw.$set(raw_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(raw.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(raw.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(raw, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$6.name,
    		type: "if",
    		source: "(15:6) {#if self.raw}",
    		ctx
    	});

    	return block;
    }

    // (3:8)      
    function fallback_block$7(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*self*/ ctx[0] && create_if_block$a(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*self*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[0] & /*self*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$a(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block$7.name,
    		type: "fallback",
    		source: "(3:8)      ",
    		ctx
    	});

    	return block;
    }

    // (1:0) <Svg label={label} width={width} height={height} box={box} style={combinedStyle}   spin={spin} flip={flip} inverse={inverse} pulse={pulse} class={className}>
    function create_default_slot$e(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[14].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[16], null);
    	const default_slot_or_fallback = default_slot || fallback_block$7(ctx);

    	const block = {
    		c: function create() {
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    		},
    		m: function mount(target, anchor) {
    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty[0] & /*$$scope*/ 65536)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[16], !current ? [-1, -1] : dirty, null, null);
    				}
    			} else {
    				if (default_slot_or_fallback && default_slot_or_fallback.p && (!current || dirty[0] & /*self*/ 1)) {
    					default_slot_or_fallback.p(ctx, !current ? [-1, -1] : dirty);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$e.name,
    		type: "slot",
    		source: "(1:0) <Svg label={label} width={width} height={height} box={box} style={combinedStyle}   spin={spin} flip={flip} inverse={inverse} pulse={pulse} class={className}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$q(ctx) {
    	let svg;
    	let current;

    	svg = new Svg({
    			props: {
    				label: /*label*/ ctx[6],
    				width: /*width*/ ctx[7],
    				height: /*height*/ ctx[8],
    				box: /*box*/ ctx[10],
    				style: /*combinedStyle*/ ctx[9],
    				spin: /*spin*/ ctx[2],
    				flip: /*flip*/ ctx[5],
    				inverse: /*inverse*/ ctx[3],
    				pulse: /*pulse*/ ctx[4],
    				class: /*className*/ ctx[1],
    				$$slots: { default: [create_default_slot$e] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(svg.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(svg, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const svg_changes = {};
    			if (dirty[0] & /*label*/ 64) svg_changes.label = /*label*/ ctx[6];
    			if (dirty[0] & /*width*/ 128) svg_changes.width = /*width*/ ctx[7];
    			if (dirty[0] & /*height*/ 256) svg_changes.height = /*height*/ ctx[8];
    			if (dirty[0] & /*box*/ 1024) svg_changes.box = /*box*/ ctx[10];
    			if (dirty[0] & /*combinedStyle*/ 512) svg_changes.style = /*combinedStyle*/ ctx[9];
    			if (dirty[0] & /*spin*/ 4) svg_changes.spin = /*spin*/ ctx[2];
    			if (dirty[0] & /*flip*/ 32) svg_changes.flip = /*flip*/ ctx[5];
    			if (dirty[0] & /*inverse*/ 8) svg_changes.inverse = /*inverse*/ ctx[3];
    			if (dirty[0] & /*pulse*/ 16) svg_changes.pulse = /*pulse*/ ctx[4];
    			if (dirty[0] & /*className*/ 2) svg_changes.class = /*className*/ ctx[1];

    			if (dirty[0] & /*$$scope, self*/ 65537) {
    				svg_changes.$$scope = { dirty, ctx };
    			}

    			svg.$set(svg_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(svg.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(svg.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(svg, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$q.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function normaliseData(data) {
    	if ("iconName" in data && "icon" in data) {
    		let normalisedData = {};
    		let faIcon = data.icon;
    		let name = data.iconName;
    		let width = faIcon[0];
    		let height = faIcon[1];
    		let paths = faIcon[4];
    		let iconData = { width, height, paths: [{ d: paths }] };
    		normalisedData[name] = iconData;
    		return normalisedData;
    	}

    	return data;
    }

    function instance$q($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Icon", slots, ['default']);
    	let { class: className = "" } = $$props;
    	let { data } = $$props;
    	let { scale = 1 } = $$props;
    	let { spin = false } = $$props;
    	let { inverse = false } = $$props;
    	let { pulse = false } = $$props;
    	let { flip = null } = $$props;
    	let { label = null } = $$props;
    	let { self = null } = $$props;
    	let { style = null } = $$props;

    	// internal
    	let x = 0;

    	let y = 0;
    	let childrenHeight = 0;
    	let childrenWidth = 0;
    	let outerScale = 1;
    	let width;
    	let height;
    	let combinedStyle;
    	let box;

    	function init() {
    		if (typeof data === "undefined") {
    			return;
    		}

    		const normalisedData = normaliseData(data);
    		const [name] = Object.keys(normalisedData);
    		const icon = normalisedData[name];

    		if (!icon.paths) {
    			icon.paths = [];
    		}

    		if (icon.d) {
    			icon.paths.push({ d: icon.d });
    		}

    		if (!icon.polygons) {
    			icon.polygons = [];
    		}

    		if (icon.points) {
    			icon.polygons.push({ points: icon.points });
    		}

    		$$invalidate(0, self = icon);
    	}

    	function normalisedScale() {
    		let numScale = 1;

    		if (typeof scale !== "undefined") {
    			numScale = Number(scale);
    		}

    		if (isNaN(numScale) || numScale <= 0) {
    			// eslint-disable-line no-restricted-globals
    			console.warn("Invalid prop: prop \"scale\" should be a number over 0."); // eslint-disable-line no-console

    			return outerScale;
    		}

    		return numScale * outerScale;
    	}

    	function calculateBox() {
    		if (self) {
    			return `0 0 ${self.width} ${self.height}`;
    		}

    		return `0 0 ${width} ${height}`;
    	}

    	function calculateRatio() {
    		if (!self) {
    			return 1;
    		}

    		return Math.max(self.width, self.height) / 16;
    	}

    	function calculateWidth() {
    		if (childrenWidth) {
    			return childrenWidth;
    		}

    		if (self) {
    			return self.width / calculateRatio() * normalisedScale();
    		}

    		return 0;
    	}

    	function calculateHeight() {
    		if (childrenHeight) {
    			return childrenHeight;
    		}

    		if (self) {
    			return self.height / calculateRatio() * normalisedScale();
    		}

    		return 0;
    	}

    	function calculateStyle() {
    		let combined = "";

    		if (style !== null) {
    			combined += style;
    		}

    		let size = normalisedScale();

    		if (size === 1) {
    			if (combined.length === 0) {
    				return undefined;
    			}

    			return combined;
    		}

    		if (combined !== "" && !combined.endsWith(";")) {
    			combined += "; ";
    		}

    		return `${combined}font-size: ${size}em`;
    	}

    	const writable_props = [
    		"class",
    		"data",
    		"scale",
    		"spin",
    		"inverse",
    		"pulse",
    		"flip",
    		"label",
    		"self",
    		"style"
    	];

    	Object_1$6.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<Icon> was created with unknown prop '${key}'`);
    	});

    	function raw_data_binding(value) {
    		self = value;
    		$$invalidate(0, self);
    	}

    	$$self.$$set = $$props => {
    		if ("class" in $$props) $$invalidate(1, className = $$props.class);
    		if ("data" in $$props) $$invalidate(11, data = $$props.data);
    		if ("scale" in $$props) $$invalidate(12, scale = $$props.scale);
    		if ("spin" in $$props) $$invalidate(2, spin = $$props.spin);
    		if ("inverse" in $$props) $$invalidate(3, inverse = $$props.inverse);
    		if ("pulse" in $$props) $$invalidate(4, pulse = $$props.pulse);
    		if ("flip" in $$props) $$invalidate(5, flip = $$props.flip);
    		if ("label" in $$props) $$invalidate(6, label = $$props.label);
    		if ("self" in $$props) $$invalidate(0, self = $$props.self);
    		if ("style" in $$props) $$invalidate(13, style = $$props.style);
    		if ("$$scope" in $$props) $$invalidate(16, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		Path,
    		Polygon,
    		Raw,
    		Svg,
    		className,
    		data,
    		scale,
    		spin,
    		inverse,
    		pulse,
    		flip,
    		label,
    		self,
    		style,
    		x,
    		y,
    		childrenHeight,
    		childrenWidth,
    		outerScale,
    		width,
    		height,
    		combinedStyle,
    		box,
    		init,
    		normaliseData,
    		normalisedScale,
    		calculateBox,
    		calculateRatio,
    		calculateWidth,
    		calculateHeight,
    		calculateStyle
    	});

    	$$self.$inject_state = $$props => {
    		if ("className" in $$props) $$invalidate(1, className = $$props.className);
    		if ("data" in $$props) $$invalidate(11, data = $$props.data);
    		if ("scale" in $$props) $$invalidate(12, scale = $$props.scale);
    		if ("spin" in $$props) $$invalidate(2, spin = $$props.spin);
    		if ("inverse" in $$props) $$invalidate(3, inverse = $$props.inverse);
    		if ("pulse" in $$props) $$invalidate(4, pulse = $$props.pulse);
    		if ("flip" in $$props) $$invalidate(5, flip = $$props.flip);
    		if ("label" in $$props) $$invalidate(6, label = $$props.label);
    		if ("self" in $$props) $$invalidate(0, self = $$props.self);
    		if ("style" in $$props) $$invalidate(13, style = $$props.style);
    		if ("x" in $$props) x = $$props.x;
    		if ("y" in $$props) y = $$props.y;
    		if ("childrenHeight" in $$props) childrenHeight = $$props.childrenHeight;
    		if ("childrenWidth" in $$props) childrenWidth = $$props.childrenWidth;
    		if ("outerScale" in $$props) outerScale = $$props.outerScale;
    		if ("width" in $$props) $$invalidate(7, width = $$props.width);
    		if ("height" in $$props) $$invalidate(8, height = $$props.height);
    		if ("combinedStyle" in $$props) $$invalidate(9, combinedStyle = $$props.combinedStyle);
    		if ("box" in $$props) $$invalidate(10, box = $$props.box);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*data, style, scale*/ 14336) {
    			{
    				init();
    				$$invalidate(7, width = calculateWidth());
    				$$invalidate(8, height = calculateHeight());
    				$$invalidate(9, combinedStyle = calculateStyle());
    				$$invalidate(10, box = calculateBox());
    			}
    		}
    	};

    	return [
    		self,
    		className,
    		spin,
    		inverse,
    		pulse,
    		flip,
    		label,
    		width,
    		height,
    		combinedStyle,
    		box,
    		data,
    		scale,
    		style,
    		slots,
    		raw_data_binding,
    		$$scope
    	];
    }

    class Icon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$q,
    			create_fragment$q,
    			safe_not_equal,
    			{
    				class: 1,
    				data: 11,
    				scale: 12,
    				spin: 2,
    				inverse: 3,
    				pulse: 4,
    				flip: 5,
    				label: 6,
    				self: 0,
    				style: 13
    			},
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Icon",
    			options,
    			id: create_fragment$q.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*data*/ ctx[11] === undefined && !("data" in props)) {
    			console_1$1.warn("<Icon> was created without expected prop 'data'");
    		}
    	}

    	get class() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get data() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get scale() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set scale(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get spin() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set spin(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get inverse() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set inverse(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pulse() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pulse(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get flip() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set flip(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get label() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get self() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set self(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get style() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\QuickDropdown.svelte generated by Svelte v3.38.3 */
    const file$o = "src\\components\\QuickDropdown.svelte";
    const get_label_slot_changes = dirty => ({});
    const get_label_slot_context = ctx => ({});

    // (16:6) {#if label != null}
    function create_if_block_2$3(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			add_location(span, file$o, 16, 8, 445);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			span.innerHTML = /*label*/ ctx[6];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*label*/ 64) span.innerHTML = /*label*/ ctx[6];		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$3.name,
    		type: "if",
    		source: "(16:6) {#if label != null}",
    		ctx
    	});

    	return block;
    }

    // (15:23)         
    function fallback_block$6(ctx) {
    	let if_block_anchor;
    	let if_block = /*label*/ ctx[6] != null && create_if_block_2$3(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*label*/ ctx[6] != null) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_2$3(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block$6.name,
    		type: "fallback",
    		source: "(15:23)         ",
    		ctx
    	});

    	return block;
    }

    // (22:4) {#if !noCaret}
    function create_if_block_1$5(ctx) {
    	let icon;
    	let current;

    	icon = new Icon({
    			props: { data: caretDownIcon },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(icon.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$5.name,
    		type: "if",
    		source: "(22:4) {#if !noCaret}",
    		ctx
    	});

    	return block;
    }

    // (26:2) {#if isOpen}
    function create_if_block$9(ctx) {
    	let div;
    	let div_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[19].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[18], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", div_class_value = "quick-dropdown-menu " + /*dropdownClass*/ ctx[3] + " svelte-p48vlg");
    			add_location(div, file$o, 26, 4, 617);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			/*div_binding*/ ctx[21](div);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div, "click", /*closeIfAnyClickCloses*/ ctx[13], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 262144)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[18], !current ? -1 : dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*dropdownClass*/ 8 && div_class_value !== (div_class_value = "quick-dropdown-menu " + /*dropdownClass*/ ctx[3] + " svelte-p48vlg")) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    			/*div_binding*/ ctx[21](null);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$9.name,
    		type: "if",
    		source: "(26:2) {#if isOpen}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$p(ctx) {
    	let div;
    	let a;
    	let t0;
    	let a_class_value;
    	let t1;
    	let div_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	const label_slot_template = /*#slots*/ ctx[19].label;
    	const label_slot = create_slot(label_slot_template, ctx, /*$$scope*/ ctx[18], get_label_slot_context);
    	const label_slot_or_fallback = label_slot || fallback_block$6(ctx);
    	let if_block0 = !/*noCaret*/ ctx[4] && create_if_block_1$5(ctx);
    	let if_block1 = /*isOpen*/ ctx[0] && create_if_block$9(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			a = element("a");
    			if (label_slot_or_fallback) label_slot_or_fallback.c();
    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(a, "class", a_class_value = "" + (null_to_empty(/*btnClass*/ ctx[2]) + " svelte-p48vlg"));
    			attr_dev(a, "id", /*id*/ ctx[7]);
    			attr_dev(a, "href", "/");
    			attr_dev(a, "tabindex", tabindex$1);
    			toggle_class(a, "btn-default", !/*invalid*/ ctx[8]);
    			toggle_class(a, "btn-danger", /*invalid*/ ctx[8]);
    			toggle_class(a, "invalid", /*invalid*/ ctx[8] && !/*isOpen*/ ctx[0]);
    			toggle_class(a, "disabled", /*disabled*/ ctx[5]);
    			add_location(a, file$o, 1, 2, 93);
    			attr_dev(div, "class", div_class_value = "quick-dropdown " + /*className*/ ctx[9] + " svelte-p48vlg");
    			attr_dev(div, "data-test", /*dataTest*/ ctx[1]);
    			add_location(div, file$o, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, a);

    			if (label_slot_or_fallback) {
    				label_slot_or_fallback.m(a, null);
    			}

    			append_dev(a, t0);
    			if (if_block0) if_block0.m(a, null);
    			/*a_binding*/ ctx[20](a);
    			append_dev(div, t1);
    			if (if_block1) if_block1.m(div, null);
    			/*div_binding_1*/ ctx[22](div);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(a, "click", prevent_default(/*toggle*/ ctx[14]), false, true, false),
    					listen_dev(a, "keydown", /*keydown*/ ctx[15], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (label_slot) {
    				if (label_slot.p && (!current || dirty & /*$$scope*/ 262144)) {
    					update_slot(label_slot, label_slot_template, ctx, /*$$scope*/ ctx[18], !current ? -1 : dirty, get_label_slot_changes, get_label_slot_context);
    				}
    			} else {
    				if (label_slot_or_fallback && label_slot_or_fallback.p && (!current || dirty & /*label*/ 64)) {
    					label_slot_or_fallback.p(ctx, !current ? -1 : dirty);
    				}
    			}

    			if (!/*noCaret*/ ctx[4]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*noCaret*/ 16) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1$5(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(a, null);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*btnClass*/ 4 && a_class_value !== (a_class_value = "" + (null_to_empty(/*btnClass*/ ctx[2]) + " svelte-p48vlg"))) {
    				attr_dev(a, "class", a_class_value);
    			}

    			if (!current || dirty & /*id*/ 128) {
    				attr_dev(a, "id", /*id*/ ctx[7]);
    			}

    			if (dirty & /*btnClass, invalid*/ 260) {
    				toggle_class(a, "btn-default", !/*invalid*/ ctx[8]);
    			}

    			if (dirty & /*btnClass, invalid*/ 260) {
    				toggle_class(a, "btn-danger", /*invalid*/ ctx[8]);
    			}

    			if (dirty & /*btnClass, invalid, isOpen*/ 261) {
    				toggle_class(a, "invalid", /*invalid*/ ctx[8] && !/*isOpen*/ ctx[0]);
    			}

    			if (dirty & /*btnClass, disabled*/ 36) {
    				toggle_class(a, "disabled", /*disabled*/ ctx[5]);
    			}

    			if (/*isOpen*/ ctx[0]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*isOpen*/ 1) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block$9(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*className*/ 512 && div_class_value !== (div_class_value = "quick-dropdown " + /*className*/ ctx[9] + " svelte-p48vlg")) {
    				attr_dev(div, "class", div_class_value);
    			}

    			if (!current || dirty & /*dataTest*/ 2) {
    				attr_dev(div, "data-test", /*dataTest*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(label_slot_or_fallback, local);
    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(label_slot_or_fallback, local);
    			transition_out(if_block0);
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (label_slot_or_fallback) label_slot_or_fallback.d(detaching);
    			if (if_block0) if_block0.d();
    			/*a_binding*/ ctx[20](null);
    			if (if_block1) if_block1.d();
    			/*div_binding_1*/ ctx[22](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$p.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const tabindex$1 = 0;

    function instance$p($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("QuickDropdown", slots, ['label','default']);
    	let { isOpen = false } = $$props;
    	let { dataTest = null } = $$props;
    	let { btnClass = "btn btn-light btn-sm" } = $$props;
    	let { dropdownClass = "below left" } = $$props;
    	let { anyItemClickCloses = false } = $$props;
    	let { noCaret = false } = $$props;
    	let { autofocusFirstItem = false } = $$props;
    	let { disabled = false } = $$props;
    	let { label = null } = $$props;
    	let { id = null } = $$props;
    	let { invalid = false } = $$props;
    	const dispatch = createEventDispatcher();
    	let dropdownElement = null;
    	let buttonElement = null;
    	let dropdownMenuElement = null;
    	let { class: className = "" } = $$props;
    	let lastMouseDownTarget = null;
    	onDestroy(close);

    	function open() {
    		$$invalidate(0, isOpen = true);

    		// wait for next event loop (not just micro task as in tick()) so menu element is rendered
    		setTimeout(() => {
    			if (autofocusFirstItem && dropdownMenuElement != null) {
    				const item = dropdownMenuElement.querySelector("input, label, a");
    				if (item != null) item.focus();
    			}

    			dispatch("open");
    			document.addEventListener("mousedown", trackLastMouseDownTarget);
    			document.addEventListener("click", clickListener);
    		});
    	}

    	function close() {
    		dispatch("close");
    		$$invalidate(0, isOpen = false);
    		document.removeEventListener("mousedown", trackLastMouseDownTarget);
    		document.removeEventListener("click", clickListener);
    	}

    	function trackLastMouseDownTarget(e) {
    		lastMouseDownTarget = e.target;
    	}

    	function clickListener() {
    		// for click events, e.target is the last element the mouse was on, so use the element they initially put their mouse down on instead.
    		// wait til they finish the click to determine if we need to close it or not, so that click handlers can fire before we close
    		// e.g. if they select all text in a box with mouse and end their "click" outside the menu, don't close
    		if (dropdownMenuElement == null || lastMouseDownTarget == null) return;

    		// if the element has since been removed from DOM, assume don't close--e.g. open an date picker, select date, calendar goes away, should keep quickdropdown open
    		if (!document.body.contains(lastMouseDownTarget)) return;

    		const clickedMenu = dropdownMenuElement === lastMouseDownTarget || dropdownMenuElement.contains(lastMouseDownTarget);

    		if (!clickedMenu) {
    			// console.log('closing', clickedMenu, anyItemClickCloses, dropdownMenuElement, lastMouseDownTarget, e.target)
    			close();
    		}
    	}

    	function closeIfAnyClickCloses() {
    		if (anyItemClickCloses) setTimeout(close, 0); // wait a bit so click registers prior to closing
    	}

    	function toggle() {
    		isOpen ? close() : open();
    	}

    	function keydown(e) {
    		const key = e.which || e.keyCode;

    		switch (key) {
    			case 13:
    			case 32:
    			case 40:
    				// down
    				open();
    				e.preventDefault();
    				return;
    			case 27:
    			case 9:
    			case 38:
    				// up
    				close();
    				return;
    		}
    	}

    	const writable_props = [
    		"isOpen",
    		"dataTest",
    		"btnClass",
    		"dropdownClass",
    		"anyItemClickCloses",
    		"noCaret",
    		"autofocusFirstItem",
    		"disabled",
    		"label",
    		"id",
    		"invalid",
    		"class"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<QuickDropdown> was created with unknown prop '${key}'`);
    	});

    	function a_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			buttonElement = $$value;
    			$$invalidate(11, buttonElement);
    		});
    	}

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			dropdownMenuElement = $$value;
    			$$invalidate(12, dropdownMenuElement);
    		});
    	}

    	function div_binding_1($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			dropdownElement = $$value;
    			$$invalidate(10, dropdownElement);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("isOpen" in $$props) $$invalidate(0, isOpen = $$props.isOpen);
    		if ("dataTest" in $$props) $$invalidate(1, dataTest = $$props.dataTest);
    		if ("btnClass" in $$props) $$invalidate(2, btnClass = $$props.btnClass);
    		if ("dropdownClass" in $$props) $$invalidate(3, dropdownClass = $$props.dropdownClass);
    		if ("anyItemClickCloses" in $$props) $$invalidate(16, anyItemClickCloses = $$props.anyItemClickCloses);
    		if ("noCaret" in $$props) $$invalidate(4, noCaret = $$props.noCaret);
    		if ("autofocusFirstItem" in $$props) $$invalidate(17, autofocusFirstItem = $$props.autofocusFirstItem);
    		if ("disabled" in $$props) $$invalidate(5, disabled = $$props.disabled);
    		if ("label" in $$props) $$invalidate(6, label = $$props.label);
    		if ("id" in $$props) $$invalidate(7, id = $$props.id);
    		if ("invalid" in $$props) $$invalidate(8, invalid = $$props.invalid);
    		if ("class" in $$props) $$invalidate(9, className = $$props.class);
    		if ("$$scope" in $$props) $$invalidate(18, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		onDestroy,
    		Icon,
    		caretDownIcon,
    		isOpen,
    		dataTest,
    		btnClass,
    		dropdownClass,
    		anyItemClickCloses,
    		noCaret,
    		autofocusFirstItem,
    		disabled,
    		label,
    		id,
    		invalid,
    		dispatch,
    		tabindex: tabindex$1,
    		dropdownElement,
    		buttonElement,
    		dropdownMenuElement,
    		className,
    		lastMouseDownTarget,
    		open,
    		close,
    		trackLastMouseDownTarget,
    		clickListener,
    		closeIfAnyClickCloses,
    		toggle,
    		keydown
    	});

    	$$self.$inject_state = $$props => {
    		if ("isOpen" in $$props) $$invalidate(0, isOpen = $$props.isOpen);
    		if ("dataTest" in $$props) $$invalidate(1, dataTest = $$props.dataTest);
    		if ("btnClass" in $$props) $$invalidate(2, btnClass = $$props.btnClass);
    		if ("dropdownClass" in $$props) $$invalidate(3, dropdownClass = $$props.dropdownClass);
    		if ("anyItemClickCloses" in $$props) $$invalidate(16, anyItemClickCloses = $$props.anyItemClickCloses);
    		if ("noCaret" in $$props) $$invalidate(4, noCaret = $$props.noCaret);
    		if ("autofocusFirstItem" in $$props) $$invalidate(17, autofocusFirstItem = $$props.autofocusFirstItem);
    		if ("disabled" in $$props) $$invalidate(5, disabled = $$props.disabled);
    		if ("label" in $$props) $$invalidate(6, label = $$props.label);
    		if ("id" in $$props) $$invalidate(7, id = $$props.id);
    		if ("invalid" in $$props) $$invalidate(8, invalid = $$props.invalid);
    		if ("dropdownElement" in $$props) $$invalidate(10, dropdownElement = $$props.dropdownElement);
    		if ("buttonElement" in $$props) $$invalidate(11, buttonElement = $$props.buttonElement);
    		if ("dropdownMenuElement" in $$props) $$invalidate(12, dropdownMenuElement = $$props.dropdownMenuElement);
    		if ("className" in $$props) $$invalidate(9, className = $$props.className);
    		if ("lastMouseDownTarget" in $$props) lastMouseDownTarget = $$props.lastMouseDownTarget;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*isOpen*/ 1) {
    			if (isOpen) open(); else close();
    		}
    	};

    	return [
    		isOpen,
    		dataTest,
    		btnClass,
    		dropdownClass,
    		noCaret,
    		disabled,
    		label,
    		id,
    		invalid,
    		className,
    		dropdownElement,
    		buttonElement,
    		dropdownMenuElement,
    		closeIfAnyClickCloses,
    		toggle,
    		keydown,
    		anyItemClickCloses,
    		autofocusFirstItem,
    		$$scope,
    		slots,
    		a_binding,
    		div_binding,
    		div_binding_1
    	];
    }

    class QuickDropdown extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$p, create_fragment$p, safe_not_equal, {
    			isOpen: 0,
    			dataTest: 1,
    			btnClass: 2,
    			dropdownClass: 3,
    			anyItemClickCloses: 16,
    			noCaret: 4,
    			autofocusFirstItem: 17,
    			disabled: 5,
    			label: 6,
    			id: 7,
    			invalid: 8,
    			class: 9
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "QuickDropdown",
    			options,
    			id: create_fragment$p.name
    		});
    	}

    	get isOpen() {
    		throw new Error("<QuickDropdown>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isOpen(value) {
    		throw new Error("<QuickDropdown>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get dataTest() {
    		throw new Error("<QuickDropdown>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set dataTest(value) {
    		throw new Error("<QuickDropdown>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get btnClass() {
    		throw new Error("<QuickDropdown>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set btnClass(value) {
    		throw new Error("<QuickDropdown>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get dropdownClass() {
    		throw new Error("<QuickDropdown>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set dropdownClass(value) {
    		throw new Error("<QuickDropdown>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get anyItemClickCloses() {
    		throw new Error("<QuickDropdown>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set anyItemClickCloses(value) {
    		throw new Error("<QuickDropdown>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get noCaret() {
    		throw new Error("<QuickDropdown>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set noCaret(value) {
    		throw new Error("<QuickDropdown>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get autofocusFirstItem() {
    		throw new Error("<QuickDropdown>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set autofocusFirstItem(value) {
    		throw new Error("<QuickDropdown>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<QuickDropdown>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<QuickDropdown>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get label() {
    		throw new Error("<QuickDropdown>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<QuickDropdown>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<QuickDropdown>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<QuickDropdown>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get invalid() {
    		throw new Error("<QuickDropdown>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set invalid(value) {
    		throw new Error("<QuickDropdown>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get class() {
    		throw new Error("<QuickDropdown>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<QuickDropdown>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\FieldNumber.svelte generated by Svelte v3.38.3 */

    const file$n = "src\\components\\FieldNumber.svelte";

    function create_fragment$o(ctx) {
    	let div;
    	let label;
    	let t;
    	let input;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[6].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			label = element("label");
    			if (default_slot) default_slot.c();
    			t = space();
    			input = element("input");
    			attr_dev(label, "for", /*name*/ ctx[1]);
    			add_location(label, file$n, 1, 1, 27);
    			attr_dev(input, "name", /*name*/ ctx[1]);
    			attr_dev(input, "id", /*name*/ ctx[1]);
    			attr_dev(input, "type", "number");
    			attr_dev(input, "min", /*min*/ ctx[2]);
    			attr_dev(input, "max", /*max*/ ctx[3]);
    			attr_dev(input, "step", /*step*/ ctx[4]);
    			attr_dev(input, "class", "form-control");
    			add_location(input, file$n, 4, 1, 71);
    			attr_dev(div, "class", "form-group");
    			add_location(div, file$n, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, label);

    			if (default_slot) {
    				default_slot.m(label, null);
    			}

    			append_dev(div, t);
    			append_dev(div, input);
    			set_input_value(input, /*value*/ ctx[0]);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler*/ ctx[7]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 32)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[5], !current ? -1 : dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*name*/ 2) {
    				attr_dev(label, "for", /*name*/ ctx[1]);
    			}

    			if (!current || dirty & /*name*/ 2) {
    				attr_dev(input, "name", /*name*/ ctx[1]);
    			}

    			if (!current || dirty & /*name*/ 2) {
    				attr_dev(input, "id", /*name*/ ctx[1]);
    			}

    			if (!current || dirty & /*min*/ 4) {
    				attr_dev(input, "min", /*min*/ ctx[2]);
    			}

    			if (!current || dirty & /*max*/ 8) {
    				attr_dev(input, "max", /*max*/ ctx[3]);
    			}

    			if (!current || dirty & /*step*/ 16) {
    				attr_dev(input, "step", /*step*/ ctx[4]);
    			}

    			if (dirty & /*value*/ 1 && to_number(input.value) !== /*value*/ ctx[0]) {
    				set_input_value(input, /*value*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$o.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$o($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("FieldNumber", slots, ['default']);
    	let { value = null } = $$props;
    	let { name = "num" } = $$props;
    	let { min = null } = $$props;
    	let { max = null } = $$props;
    	let { step = 1 } = $$props;
    	const writable_props = ["value", "name", "min", "max", "step"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FieldNumber> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		value = to_number(this.value);
    		$$invalidate(0, value);
    	}

    	$$self.$$set = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    		if ("min" in $$props) $$invalidate(2, min = $$props.min);
    		if ("max" in $$props) $$invalidate(3, max = $$props.max);
    		if ("step" in $$props) $$invalidate(4, step = $$props.step);
    		if ("$$scope" in $$props) $$invalidate(5, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ value, name, min, max, step });

    	$$self.$inject_state = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    		if ("min" in $$props) $$invalidate(2, min = $$props.min);
    		if ("max" in $$props) $$invalidate(3, max = $$props.max);
    		if ("step" in $$props) $$invalidate(4, step = $$props.step);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [value, name, min, max, step, $$scope, slots, input_input_handler];
    }

    class FieldNumber extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$o, create_fragment$o, safe_not_equal, {
    			value: 0,
    			name: 1,
    			min: 2,
    			max: 3,
    			step: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FieldNumber",
    			options,
    			id: create_fragment$o.name
    		});
    	}

    	get value() {
    		throw new Error("<FieldNumber>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<FieldNumber>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get name() {
    		throw new Error("<FieldNumber>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<FieldNumber>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get min() {
    		throw new Error("<FieldNumber>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set min(value) {
    		throw new Error("<FieldNumber>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get max() {
    		throw new Error("<FieldNumber>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set max(value) {
    		throw new Error("<FieldNumber>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get step() {
    		throw new Error("<FieldNumber>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set step(value) {
    		throw new Error("<FieldNumber>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\ColorPicker.svelte generated by Svelte v3.38.3 */
    const file$m = "src\\components\\ColorPicker.svelte";

    function get_each_context$5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[17] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[20] = list[i];
    	return child_ctx;
    }

    function get_each_context_2$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[17] = list[i];
    	return child_ctx;
    }

    // (8:8) {#each colorGroup as color}
    function create_each_block_2$1(ctx) {
    	let div;
    	let div_title_value;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[8](/*color*/ ctx[17]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "title", div_title_value = /*color*/ ctx[17]);
    			attr_dev(div, "class", "color-choice svelte-1k8fjru");
    			set_style(div, "background", getBackground(/*color*/ ctx[17]));
    			set_style(div, "width", /*colorSize*/ ctx[7] + "px");
    			set_style(div, "height", /*colorSize*/ ctx[7] + "px");
    			toggle_class(div, "selected", /*value*/ ctx[0] == /*color*/ ctx[17]);
    			add_location(div, file$m, 8, 10, 378);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*colors*/ 8 && div_title_value !== (div_title_value = /*color*/ ctx[17])) {
    				attr_dev(div, "title", div_title_value);
    			}

    			if (dirty & /*colors*/ 8) {
    				set_style(div, "background", getBackground(/*color*/ ctx[17]));
    			}

    			if (dirty & /*value, colors*/ 9) {
    				toggle_class(div, "selected", /*value*/ ctx[0] == /*color*/ ctx[17]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2$1.name,
    		type: "each",
    		source: "(8:8) {#each colorGroup as color}",
    		ctx
    	});

    	return block;
    }

    // (6:4) {#each colors as colorGroup}
    function create_each_block_1$2(ctx) {
    	let div;
    	let each_value_2 = /*colorGroup*/ ctx[20];
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2$1(get_each_context_2$1(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "color-group svelte-1k8fjru");
    			add_location(div, file$m, 6, 6, 304);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*colors, getBackground, colorSize, value, select*/ 201) {
    				each_value_2 = /*colorGroup*/ ctx[20];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2$1(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$2.name,
    		type: "each",
    		source: "(6:4) {#each colors as colorGroup}",
    		ctx
    	});

    	return block;
    }

    // (20:4) {#if $recentColors.length}
    function create_if_block$8(ctx) {
    	let div1;
    	let label;
    	let t1;
    	let div0;
    	let each_value = /*$recentColors*/ ctx[4];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$5(get_each_context$5(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			label = element("label");
    			label.textContent = "Recent colors";
    			t1 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(label, "class", "text-left");
    			add_location(label, file$m, 21, 8, 768);
    			attr_dev(div0, "class", "color-group wrap svelte-1k8fjru");
    			add_location(div0, file$m, 22, 8, 824);
    			attr_dev(div1, "class", "form-group");
    			add_location(div1, file$m, 20, 6, 734);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, label);
    			append_dev(div1, t1);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$recentColors, getBackground, value, select*/ 81) {
    				each_value = /*$recentColors*/ ctx[4];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$5(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$5(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$8.name,
    		type: "if",
    		source: "(20:4) {#if $recentColors.length}",
    		ctx
    	});

    	return block;
    }

    // (24:10) {#each $recentColors as color}
    function create_each_block$5(ctx) {
    	let div;
    	let div_title_value;
    	let mounted;
    	let dispose;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[9](/*color*/ ctx[17]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "title", div_title_value = /*color*/ ctx[17]);
    			attr_dev(div, "class", "color-choice svelte-1k8fjru");
    			set_style(div, "background", getBackground(/*color*/ ctx[17]));
    			set_style(div, "width", "25px");
    			set_style(div, "height", "25px");
    			toggle_class(div, "selected", /*value*/ ctx[0] == /*color*/ ctx[17]);
    			add_location(div, file$m, 24, 12, 910);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", click_handler_1, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*$recentColors*/ 16 && div_title_value !== (div_title_value = /*color*/ ctx[17])) {
    				attr_dev(div, "title", div_title_value);
    			}

    			if (dirty & /*$recentColors*/ 16) {
    				set_style(div, "background", getBackground(/*color*/ ctx[17]));
    			}

    			if (dirty & /*value, $recentColors*/ 17) {
    				toggle_class(div, "selected", /*value*/ ctx[0] == /*color*/ ctx[17]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$5.name,
    		type: "each",
    		source: "(24:10) {#each $recentColors as color}",
    		ctx
    	});

    	return block;
    }

    // (1:0) <QuickDropdown btnClass="color-picker-toggle" {dropdownClass} noCaret bind:isOpen>
    function create_default_slot$d(ctx) {
    	let div;
    	let t;
    	let each_value_1 = /*colors*/ ctx[3];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$2(get_each_context_1$2(ctx, each_value_1, i));
    	}

    	let if_block = /*$recentColors*/ ctx[4].length && create_if_block$8(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			if (if_block) if_block.c();
    			attr_dev(div, "class", "color-picker-choices svelte-1k8fjru");
    			add_location(div, file$m, 4, 2, 228);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(div, t);
    			if (if_block) if_block.m(div, null);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*colors, getBackground, colorSize, value, select*/ 201) {
    				each_value_1 = /*colors*/ ctx[3];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$2(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, t);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}

    			if (/*$recentColors*/ ctx[4].length) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$8(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$d.name,
    		type: "slot",
    		source: "(1:0) <QuickDropdown btnClass=\\\"color-picker-toggle\\\" {dropdownClass} noCaret bind:isOpen>",
    		ctx
    	});

    	return block;
    }

    // (2:2) 
    function create_label_slot(ctx) {
    	let span;
    	let div;
    	let div_title_value;

    	const block = {
    		c: function create() {
    			span = element("span");
    			div = element("div");
    			attr_dev(div, "class", "color-choice svelte-1k8fjru");
    			set_style(div, "background", getBackground(/*value*/ ctx[0]));
    			attr_dev(div, "title", div_title_value = "Change color (" + /*value*/ ctx[0] + ")");
    			add_location(div, file$m, 2, 4, 111);
    			attr_dev(span, "slot", "label");
    			add_location(span, file$m, 1, 2, 86);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, div);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*value*/ 1) {
    				set_style(div, "background", getBackground(/*value*/ ctx[0]));
    			}

    			if (dirty & /*value*/ 1 && div_title_value !== (div_title_value = "Change color (" + /*value*/ ctx[0] + ")")) {
    				attr_dev(div, "title", div_title_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_label_slot.name,
    		type: "slot",
    		source: "(2:2) ",
    		ctx
    	});

    	return block;
    }

    function create_fragment$n(ctx) {
    	let quickdropdown;
    	let updating_isOpen;
    	let current;

    	function quickdropdown_isOpen_binding(value) {
    		/*quickdropdown_isOpen_binding*/ ctx[10](value);
    	}

    	let quickdropdown_props = {
    		btnClass: "color-picker-toggle",
    		dropdownClass: /*dropdownClass*/ ctx[1],
    		noCaret: true,
    		$$slots: {
    			label: [create_label_slot],
    			default: [create_default_slot$d]
    		},
    		$$scope: { ctx }
    	};

    	if (/*isOpen*/ ctx[2] !== void 0) {
    		quickdropdown_props.isOpen = /*isOpen*/ ctx[2];
    	}

    	quickdropdown = new QuickDropdown({
    			props: quickdropdown_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(quickdropdown, "isOpen", quickdropdown_isOpen_binding));

    	const block = {
    		c: function create() {
    			create_component(quickdropdown.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(quickdropdown, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const quickdropdown_changes = {};
    			if (dirty & /*dropdownClass*/ 2) quickdropdown_changes.dropdownClass = /*dropdownClass*/ ctx[1];

    			if (dirty & /*$$scope, value, $recentColors, colors*/ 33554457) {
    				quickdropdown_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_isOpen && dirty & /*isOpen*/ 4) {
    				updating_isOpen = true;
    				quickdropdown_changes.isOpen = /*isOpen*/ ctx[2];
    				add_flush_callback(() => updating_isOpen = false);
    			}

    			quickdropdown.$set(quickdropdown_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(quickdropdown.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(quickdropdown.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(quickdropdown, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$n.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const colorSteps = 7;
    const colorDarknessSteps = 15;

    function getBackground(color) {
    	return color != "transparent"
    	? color
    	: "repeating-linear-gradient(-45deg, transparent, #eee 10px)";
    }

    function rgb(r, g, b) {
    	return { r, g, b };
    }

    function lerpColorsBetween(color1, color2, steps) {
    	return [...Array(steps)].map((_, t) => lerpRGB(color1, color2, t / (steps - 1)));
    }

    function lerpRGB(color1, color2, t) {
    	return {
    		r: Math.round(color1.r + (color2.r - color1.r) * t),
    		g: Math.round(color1.g + (color2.g - color1.g) * t),
    		b: Math.round(color1.b + (color2.b - color1.b) * t)
    	};
    }

    function lighten(color, t) {
    	return {
    		r: Math.min(Math.round(color.r + (255 - color.r) * t), 255),
    		g: Math.min(Math.round(color.g + (255 - color.g) * t), 255),
    		b: Math.min(Math.round(color.b + (255 - color.b) * t), 255)
    	};
    }

    function darken(color, t) {
    	return {
    		r: Math.max(Math.round(color.r - 255 * (1 - t)), 0),
    		g: Math.max(Math.round(color.g - 255 * (1 - t)), 0),
    		b: Math.max(Math.round(color.b - 255 * (1 - t)), 0)
    	};
    }

    function instance$n($$self, $$props, $$invalidate) {
    	let $recentColors;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ColorPicker", slots, []);
    	const recentColors = LocalStorageStore("recent-colors", []);
    	validate_store(recentColors, "recentColors");
    	component_subscribe($$self, recentColors, value => $$invalidate(4, $recentColors = value));
    	const dispatch = createEventDispatcher();
    	let { value = "transparent" } = $$props;
    	let { dropdownClass = "below left" } = $$props;
    	let alpha = 255;
    	let isOpen = false;
    	let customRed = 0;
    	let customGreen = 0;
    	let customBlue = 0;

    	function select(color) {
    		$$invalidate(0, value = color);
    		set_store_value(recentColors, $recentColors = [color, ...$recentColors.filter(c => c != color).slice(0, 50)], $recentColors);
    		dispatch("change", color);
    		$$invalidate(2, isOpen = false);
    	}

    	const rainbowIntervals = [
    		rgb(255, 0, 0),
    		rgb(255, 255, 0),
    		rgb(0, 255, 0),
    		rgb(0, 255, 255),
    		rgb(0, 0, 255),
    		rgb(255, 0, 255)
    	];

    	const colorSize = 325 / colorSteps / rainbowIntervals.length;
    	let colors = [];
    	const writable_props = ["value", "dropdownClass"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ColorPicker> was created with unknown prop '${key}'`);
    	});

    	const click_handler = color => select(color);
    	const click_handler_1 = color => select(color);

    	function quickdropdown_isOpen_binding(value) {
    		isOpen = value;
    		$$invalidate(2, isOpen);
    	}

    	$$self.$$set = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("dropdownClass" in $$props) $$invalidate(1, dropdownClass = $$props.dropdownClass);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		QuickDropdown,
    		LocalStorageStore,
    		FieldNumber,
    		recentColors,
    		dispatch,
    		value,
    		dropdownClass,
    		alpha,
    		isOpen,
    		customRed,
    		customGreen,
    		customBlue,
    		select,
    		getBackground,
    		colorSteps,
    		colorDarknessSteps,
    		rainbowIntervals,
    		colorSize,
    		colors,
    		rgb,
    		lerpColorsBetween,
    		lerpRGB,
    		lighten,
    		darken,
    		$recentColors
    	});

    	$$self.$inject_state = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("dropdownClass" in $$props) $$invalidate(1, dropdownClass = $$props.dropdownClass);
    		if ("alpha" in $$props) $$invalidate(12, alpha = $$props.alpha);
    		if ("isOpen" in $$props) $$invalidate(2, isOpen = $$props.isOpen);
    		if ("customRed" in $$props) customRed = $$props.customRed;
    		if ("customGreen" in $$props) customGreen = $$props.customGreen;
    		if ("customBlue" in $$props) customBlue = $$props.customBlue;
    		if ("colors" in $$props) $$invalidate(3, colors = $$props.colors);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	if (alpha != null) $$invalidate(3, colors = (function () {
    		let result = [];
    		let rainbow = [];

    		for (let i = 0; i < rainbowIntervals.length; i++) {
    			rainbow = rainbow.concat(lerpColorsBetween(
    				rainbowIntervals[i],
    				i == rainbowIntervals.length - 1
    				? rainbowIntervals[0]
    				: rainbowIntervals[i + 1],
    				colorSteps
    			).slice(0, colorSteps - 1));
    		}

    		let blackToGreySteps = rainbowIntervals.length * (colorSteps - 1);
    		result.push(lerpColorsBetween(rgb(255, 255, 255), rgb(0, 0, 0), blackToGreySteps));
    		for (let i = 1; i < colorDarknessSteps; i++) result.push(rainbow.map(r => darken(r, i / (colorDarknessSteps - 1))));
    		for (let i = 1; i < colorDarknessSteps - 1; i++) result.push(rainbow.map(r => lighten(r, i / (colorDarknessSteps - 1))));

    		return [
    			["transparent", "rgba(255, 255, 255, 255", "rgba(0, 0, 0, 255)"],
    			...result.map(group => group.map(c => `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`))
    		];
    	})());

    	return [
    		value,
    		dropdownClass,
    		isOpen,
    		colors,
    		$recentColors,
    		recentColors,
    		select,
    		colorSize,
    		click_handler,
    		click_handler_1,
    		quickdropdown_isOpen_binding
    	];
    }

    class ColorPicker extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$n, create_fragment$n, safe_not_equal, { value: 0, dropdownClass: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ColorPicker",
    			options,
    			id: create_fragment$n.name
    		});
    	}

    	get value() {
    		throw new Error("<ColorPicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<ColorPicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get dropdownClass() {
    		throw new Error("<ColorPicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set dropdownClass(value) {
    		throw new Error("<ColorPicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function debounce(func, wait, immediate) {
      let timeout;
      return function () {
        const context = this,
          args = arguments;
        const later = function () {
          timeout = null;
          if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
      }
    }

    /* src\components\FieldCheckbox.svelte generated by Svelte v3.38.3 */

    const file$l = "src\\components\\FieldCheckbox.svelte";

    function create_fragment$m(ctx) {
    	let div1;
    	let div0;
    	let input;
    	let t;
    	let label;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			input = element("input");
    			t = space();
    			label = element("label");
    			if (default_slot) default_slot.c();
    			attr_dev(input, "name", /*name*/ ctx[1]);
    			attr_dev(input, "id", /*name*/ ctx[1]);
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "class", "form-check-input");
    			add_location(input, file$l, 2, 2, 55);
    			attr_dev(label, "class", "form-check-label");
    			attr_dev(label, "for", /*name*/ ctx[1]);
    			add_location(label, file$l, 3, 2, 139);
    			attr_dev(div0, "class", "form-check");
    			add_location(div0, file$l, 1, 1, 27);
    			attr_dev(div1, "class", "form-group");
    			add_location(div1, file$l, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, input);
    			input.checked = /*checked*/ ctx[0];
    			append_dev(div0, t);
    			append_dev(div0, label);

    			if (default_slot) {
    				default_slot.m(label, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*input_change_handler*/ ctx[4]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*name*/ 2) {
    				attr_dev(input, "name", /*name*/ ctx[1]);
    			}

    			if (!current || dirty & /*name*/ 2) {
    				attr_dev(input, "id", /*name*/ ctx[1]);
    			}

    			if (dirty & /*checked*/ 1) {
    				input.checked = /*checked*/ ctx[0];
    			}

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], !current ? -1 : dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*name*/ 2) {
    				attr_dev(label, "for", /*name*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$m.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$m($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("FieldCheckbox", slots, ['default']);
    	let { checked = null } = $$props;
    	let { name = "check" } = $$props;
    	const writable_props = ["checked", "name"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FieldCheckbox> was created with unknown prop '${key}'`);
    	});

    	function input_change_handler() {
    		checked = this.checked;
    		$$invalidate(0, checked);
    	}

    	$$self.$$set = $$props => {
    		if ("checked" in $$props) $$invalidate(0, checked = $$props.checked);
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ checked, name });

    	$$self.$inject_state = $$props => {
    		if ("checked" in $$props) $$invalidate(0, checked = $$props.checked);
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [checked, name, $$scope, slots, input_change_handler];
    }

    class FieldCheckbox extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$m, create_fragment$m, safe_not_equal, { checked: 0, name: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FieldCheckbox",
    			options,
    			id: create_fragment$m.name
    		});
    	}

    	get checked() {
    		throw new Error("<FieldCheckbox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set checked(value) {
    		throw new Error("<FieldCheckbox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get name() {
    		throw new Error("<FieldCheckbox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<FieldCheckbox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\SaveBtn.svelte generated by Svelte v3.38.3 */

    const file$k = "src\\components\\SaveBtn.svelte";

    // (2:7) Save
    function fallback_block$5(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Save");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block$5.name,
    		type: "fallback",
    		source: "(2:7) Save",
    		ctx
    	});

    	return block;
    }

    function create_fragment$l(ctx) {
    	let button;
    	let button_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);
    	const default_slot_or_fallback = default_slot || fallback_block$5(ctx);

    	const block = {
    		c: function create() {
    			button = element("button");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", button_class_value = "btn btn-" + (/*disabled*/ ctx[0] ? "disabled" : "success"));
    			toggle_class(button, "disabled", /*disabled*/ ctx[0]);
    			add_location(button, file$k, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(button, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[1], !current ? -1 : dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*disabled*/ 1 && button_class_value !== (button_class_value = "btn btn-" + (/*disabled*/ ctx[0] ? "disabled" : "success"))) {
    				attr_dev(button, "class", button_class_value);
    			}

    			if (dirty & /*disabled, disabled*/ 1) {
    				toggle_class(button, "disabled", /*disabled*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$l.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$l($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("SaveBtn", slots, ['default']);
    	let { disabled = false } = $$props;
    	const writable_props = ["disabled"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<SaveBtn> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("disabled" in $$props) $$invalidate(0, disabled = $$props.disabled);
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ disabled });

    	$$self.$inject_state = $$props => {
    		if ("disabled" in $$props) $$invalidate(0, disabled = $$props.disabled);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [disabled, $$scope, slots];
    }

    class SaveBtn extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$l, create_fragment$l, safe_not_equal, { disabled: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SaveBtn",
    			options,
    			id: create_fragment$l.name
    		});
    	}

    	get disabled() {
    		throw new Error("<SaveBtn>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<SaveBtn>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Form.svelte generated by Svelte v3.38.3 */
    const file$j = "src\\components\\Form.svelte";
    const get_buttons_slot_changes = dirty => ({});
    const get_buttons_slot_context = ctx => ({});

    function create_fragment$k(ctx) {
    	let form;
    	let div2;
    	let div0;
    	let t0;
    	let savebtn;
    	let t1;
    	let div1;
    	let current;
    	let mounted;
    	let dispose;
    	const buttons_slot_template = /*#slots*/ ctx[3].buttons;
    	const buttons_slot = create_slot(buttons_slot_template, ctx, /*$$scope*/ ctx[2], get_buttons_slot_context);

    	savebtn = new SaveBtn({
    			props: { disabled: !/*hasChanges*/ ctx[0] },
    			$$inline: true
    		});

    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	const block = {
    		c: function create() {
    			form = element("form");
    			div2 = element("div");
    			div0 = element("div");
    			if (buttons_slot) buttons_slot.c();
    			t0 = space();
    			create_component(savebtn.$$.fragment);
    			t1 = space();
    			div1 = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div0, "class", "form-buttons svelte-1yi5j3x");
    			add_location(div0, file$j, 2, 4, 59);
    			attr_dev(div1, "class", "form-content svelte-1yi5j3x");
    			add_location(div1, file$j, 7, 4, 178);
    			attr_dev(div2, "class", "form");
    			add_location(div2, file$j, 1, 2, 35);
    			add_location(form, file$j, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);
    			append_dev(form, div2);
    			append_dev(div2, div0);

    			if (buttons_slot) {
    				buttons_slot.m(div0, null);
    			}

    			append_dev(div0, t0);
    			mount_component(savebtn, div0, null);
    			append_dev(div2, t1);
    			append_dev(div2, div1);

    			if (default_slot) {
    				default_slot.m(div1, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(form, "submit", prevent_default(/*submit_handler*/ ctx[4]), false, true, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (buttons_slot) {
    				if (buttons_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot(buttons_slot, buttons_slot_template, ctx, /*$$scope*/ ctx[2], !current ? -1 : dirty, get_buttons_slot_changes, get_buttons_slot_context);
    				}
    			}

    			const savebtn_changes = {};
    			if (dirty & /*hasChanges*/ 1) savebtn_changes.disabled = !/*hasChanges*/ ctx[0];
    			savebtn.$set(savebtn_changes);

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], !current ? -1 : dirty, null, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(buttons_slot, local);
    			transition_in(savebtn.$$.fragment, local);
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(buttons_slot, local);
    			transition_out(savebtn.$$.fragment, local);
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			if (buttons_slot) buttons_slot.d(detaching);
    			destroy_component(savebtn);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$k.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$k($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Form", slots, ['buttons','default']);
    	let { hasChanges = true } = $$props;
    	let { class: className } = $$props;
    	const writable_props = ["hasChanges", "class"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Form> was created with unknown prop '${key}'`);
    	});

    	function submit_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("hasChanges" in $$props) $$invalidate(0, hasChanges = $$props.hasChanges);
    		if ("class" in $$props) $$invalidate(1, className = $$props.class);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ SaveBtn, hasChanges, className });

    	$$self.$inject_state = $$props => {
    		if ("hasChanges" in $$props) $$invalidate(0, hasChanges = $$props.hasChanges);
    		if ("className" in $$props) $$invalidate(1, className = $$props.className);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [hasChanges, className, $$scope, slots, submit_handler];
    }

    class Form extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$k, create_fragment$k, safe_not_equal, { hasChanges: 0, class: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Form",
    			options,
    			id: create_fragment$k.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*className*/ ctx[1] === undefined && !("class" in props)) {
    			console.warn("<Form> was created without expected prop 'class'");
    		}
    	}

    	get hasChanges() {
    		throw new Error("<Form>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hasChanges(value) {
    		throw new Error("<Form>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get class() {
    		throw new Error("<Form>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Form>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\FieldText.svelte generated by Svelte v3.38.3 */
    const file$i = "src\\components\\FieldText.svelte";

    function create_fragment$j(ctx) {
    	let div;
    	let label;
    	let t;
    	let input;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			label = element("label");
    			if (default_slot) default_slot.c();
    			t = space();
    			input = element("input");
    			attr_dev(label, "for", /*name*/ ctx[1]);
    			add_location(label, file$i, 1, 1, 27);
    			attr_dev(input, "name", /*name*/ ctx[1]);
    			attr_dev(input, "id", /*name*/ ctx[1]);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "form-control");
    			attr_dev(input, "placeholder", /*placeholder*/ ctx[2]);
    			add_location(input, file$i, 4, 1, 71);
    			attr_dev(div, "class", "form-group");
    			add_location(div, file$i, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, label);

    			if (default_slot) {
    				default_slot.m(label, null);
    			}

    			append_dev(div, t);
    			append_dev(div, input);
    			set_input_value(input, /*value*/ ctx[0]);
    			/*input_binding*/ ctx[7](input);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler*/ ctx[6]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 16)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[4], !current ? -1 : dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*name*/ 2) {
    				attr_dev(label, "for", /*name*/ ctx[1]);
    			}

    			if (!current || dirty & /*name*/ 2) {
    				attr_dev(input, "name", /*name*/ ctx[1]);
    			}

    			if (!current || dirty & /*name*/ 2) {
    				attr_dev(input, "id", /*name*/ ctx[1]);
    			}

    			if (!current || dirty & /*placeholder*/ 4) {
    				attr_dev(input, "placeholder", /*placeholder*/ ctx[2]);
    			}

    			if (dirty & /*value*/ 1 && input.value !== /*value*/ ctx[0]) {
    				set_input_value(input, /*value*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    			/*input_binding*/ ctx[7](null);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$j.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$j($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("FieldText", slots, ['default']);
    	let { value = null } = $$props;
    	let { name = "text" } = $$props;
    	let { placeholder = null } = $$props;
    	let field;
    	const writable_props = ["value", "name", "placeholder"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FieldText> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		value = this.value;
    		$$invalidate(0, value);
    	}

    	function input_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			field = $$value;
    			$$invalidate(3, field);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    		if ("placeholder" in $$props) $$invalidate(2, placeholder = $$props.placeholder);
    		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ onMount, value, name, placeholder, field });

    	$$self.$inject_state = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    		if ("placeholder" in $$props) $$invalidate(2, placeholder = $$props.placeholder);
    		if ("field" in $$props) $$invalidate(3, field = $$props.field);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		value,
    		name,
    		placeholder,
    		field,
    		$$scope,
    		slots,
    		input_input_handler,
    		input_binding
    	];
    }

    class FieldText extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$j, create_fragment$j, safe_not_equal, { value: 0, name: 1, placeholder: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FieldText",
    			options,
    			id: create_fragment$j.name
    		});
    	}

    	get value() {
    		throw new Error("<FieldText>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<FieldText>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get name() {
    		throw new Error("<FieldText>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<FieldText>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get placeholder() {
    		throw new Error("<FieldText>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set placeholder(value) {
    		throw new Error("<FieldText>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function _filter (list, search) {
      list = list || null;
      if (list == null) return null
      if (search == null || search === '') return list

      const tempSearch = search.trim().toLowerCase();

      // return only results that, when serialized to json, contain the text passed
      // omit profilePicture from the serialization to avoid false positives
      const results = list.filter(item => JSON.stringify(item).toLowerCase().indexOf(tempSearch) > -1);
      return results
    }

    window.logDiffs = false; // can set this in production to determine why confirm-nav-away is popping up, for instance

    function hasDifferences(a, b) {
      return JSON.stringify(a) !== JSON.stringify(b)
    }

    function isEmpty(obj) {
      return obj == null || obj.toString().trim().length === 0
    }

    function sortByName(a, b) {
      const a1 = a.name.toLowerCase();
      const b1 = b.name.toLowerCase();
      return a1 == b1 ? 0 : a1 > b1 ? 1 : -1
    }

    const defaultFormat = 'M/D/YYYY';

    class Validator {
      constructor() {
        this.emailRegex = /^[^.]([^@<>\s]+)?[^.]@[^@<>\s-][^@<>\s]+\.[a-zA-Z]{1,6}$/;
        this.doublePeriodRegex = /\.\./;
        this.nameWithSpaceRegex = /[^\s]+\s+[^\s]+/;
        this.phoneRegex = /^([+][0-9][-\s.])?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
      }

      date(s, format = defaultFormat) {
        return dayjs(s, format).format(format) === s
      }

      dateBefore(s1, s2, format = defaultFormat) {
        return dayjs(s1, format).isBefore(dayjs(s2, format))
      }

      dateSameOrBefore(s1, s2, format = defaultFormat) {
        return dayjs(s1, format).isSameOrBefore(dayjs(s2, format))
      }

      dateAfter(s1, s2, format = defaultFormat) {
        return dayjs(s1, format).isAfter(dayjs(s2, format))
      }

      inFuture(date, format = defaultFormat) {
        return this.dateAfter(dayjs(date, format), dayjs())
      }

      dateBetween(s1, start, end, format = defaultFormat) {
        if (!dayjs(s1, format).isValid() || !dayjs(start, format).isValid()) return false

        if (dayjs.utc(s1, format).isBefore(dayjs(start, format), 'days')) return false

        if (end != null && dayjs(end, format).isValid() && dayjs.utc(s1, format).isAfter(dayjs(end, format), 'days')) return false

        return true
      }

      email(s) {
        return !this.empty(s) && this.emailRegex.test(s) && !this.doublePeriodRegex.test(s)
      }

      /**
       * checks if any changes exist between a and b
       * @param {any} a
       * @param {any} b
       * @param {array<string>} ignoreKeys which object keys to ignore (foreign keys, primary keys, and other things the user won't be modding)
       */
      equals(a, b, ignoreKeys = null) {
        ignoreKeys = (ignoreKeys || []).concat('id');
        return !hasDifferences(a, b)
      }

      empty(s) {
        return isEmpty(s)
      }

      int(s) {
        return s != null && !isNaN(parseInt(s)) && isFinite(s) && parseInt(s).toString() == s.toString()
      }

      intRange(s, min, max) {
        const n = parseInt(s);
        return n >= min && n <= max
      }

      year(s) {
        return this.intRange(s, 1900, dayjs().add(100, 'year'))
      }

      length(s, min) {
        return !this.empty(s) && s.length >= min
      }

      name(s) {
        return this.required(s) && this.length(s, 3)
      }

      nameWithSpace(s) {
        return this.required(s) && this.nameWithSpaceRegex.test(s)
      }

      numeric(s) {
        return !isNaN(parseFloat(s)) && isFinite(s)
      }

      phone(s) {
        return this.phoneRegex.test(s)
      }

      regex(regex, s) {
        return new RegExp(regex).test(s)
      }

      required(s) {
        return s != null && !this.empty(s)
      }

      checked(b) {
        return b == true
      }
    }

    const validator = new Validator();

    /* src\components\InputSelect.svelte generated by Svelte v3.38.3 */
    const file$h = "src\\components\\InputSelect.svelte";

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[40] = list[i];
    	child_ctx[42] = i;
    	return child_ctx;
    }

    const get_default_slot_changes_1 = dirty => ({
    	option: dirty[0] & /*filteredOptions*/ 16384
    });

    const get_default_slot_context_1 = ctx => ({ option: /*option*/ ctx[40] });

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[40] = list[i];
    	child_ctx[42] = i;
    	return child_ctx;
    }

    const get_default_slot_changes$1 = dirty => ({
    	option: dirty[0] & /*selectedOptions*/ 131072
    });

    const get_default_slot_context$1 = ctx => ({ option: /*option*/ ctx[40] });

    // (14:6) {#if selectedOptions.length === 0 || (!multiple && selectedOptions[0].value)}
    function create_if_block_6(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text(/*prefixLabel*/ ctx[4]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*prefixLabel*/ 16) set_data_dev(t, /*prefixLabel*/ ctx[4]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(14:6) {#if selectedOptions.length === 0 || (!multiple && selectedOptions[0].value)}",
    		ctx
    	});

    	return block;
    }

    // (16:8) {#if multiple}
    function create_if_block_4$1(ctx) {
    	let if_block_anchor;
    	let if_block = /*index*/ ctx[42] > 0 && create_if_block_5(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*index*/ ctx[42] > 0) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_5(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4$1.name,
    		type: "if",
    		source: "(16:8) {#if multiple}",
    		ctx
    	});

    	return block;
    }

    // (17:10) {#if index > 0}
    function create_if_block_5(ctx) {
    	let t0;

    	let t1_value = (/*inline*/ ctx[9] && /*index*/ ctx[42] == /*selectedOptions*/ ctx[17].length - 1
    	? " and"
    	: "") + "";

    	let t1;

    	const block = {
    		c: function create() {
    			t0 = text(",");
    			t1 = text(t1_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*inline, selectedOptions*/ 131584 && t1_value !== (t1_value = (/*inline*/ ctx[9] && /*index*/ ctx[42] == /*selectedOptions*/ ctx[17].length - 1
    			? " and"
    			: "") + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(17:10) {#if index > 0}",
    		ctx
    	});

    	return block;
    }

    // (20:25)               
    function fallback_block_1(ctx) {
    	let html_tag;
    	let raw_value = /*option*/ ctx[40].label + "";
    	let html_anchor;

    	const block = {
    		c: function create() {
    			html_tag = new HtmlTag();
    			html_anchor = empty();
    			html_tag.a = html_anchor;
    		},
    		m: function mount(target, anchor) {
    			html_tag.m(raw_value, target, anchor);
    			insert_dev(target, html_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*selectedOptions*/ 131072 && raw_value !== (raw_value = /*option*/ ctx[40].label + "")) html_tag.p(raw_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block_1.name,
    		type: "fallback",
    		source: "(20:25)               ",
    		ctx
    	});

    	return block;
    }

    // (15:6) {#each selectedOptions as option, index (option)}
    function create_each_block_1$1(key_1, ctx) {
    	let first;
    	let t;
    	let span;
    	let current;
    	let if_block = /*multiple*/ ctx[3] && create_if_block_4$1(ctx);
    	const default_slot_template = /*#slots*/ ctx[26].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[25], get_default_slot_context$1);
    	const default_slot_or_fallback = default_slot || fallback_block_1(ctx);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			if (if_block) if_block.c();
    			t = space();
    			span = element("span");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			attr_dev(span, "class", "select-input-text svelte-1445dha");
    			add_location(span, file$h, 18, 8, 683);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, span, anchor);

    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(span, null);
    			}

    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (/*multiple*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_4$1(ctx);
    					if_block.c();
    					if_block.m(t.parentNode, t);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty[0] & /*$$scope, selectedOptions*/ 33685504)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[25], !current ? [-1, -1] : dirty, get_default_slot_changes$1, get_default_slot_context$1);
    				}
    			} else {
    				if (default_slot_or_fallback && default_slot_or_fallback.p && (!current || dirty[0] & /*selectedOptions*/ 131072)) {
    					default_slot_or_fallback.p(ctx, !current ? [-1, -1] : dirty);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(span);
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(15:6) {#each selectedOptions as option, index (option)}",
    		ctx
    	});

    	return block;
    }

    // (25:6) {#if selectedOptions == null || selectedOptions.length === 0}
    function create_if_block_3$1(ctx) {
    	let span;

    	let t_value = (/*placeholder*/ ctx[5] != null
    	? /*placeholder*/ ctx[5]
    	: "") + "";

    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			attr_dev(span, "class", "select-input-text svelte-1445dha");
    			add_location(span, file$h, 25, 8, 906);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*placeholder*/ 32 && t_value !== (t_value = (/*placeholder*/ ctx[5] != null
    			? /*placeholder*/ ctx[5]
    			: "") + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(25:6) {#if selectedOptions == null || selectedOptions.length === 0}",
    		ctx
    	});

    	return block;
    }

    // (34:2) {#if isOpen && !disabled}
    function create_if_block$7(ctx) {
    	let div;
    	let t;
    	let current;
    	let if_block = /*filterable*/ ctx[6] && create_if_block_2$2(ctx);
    	let each_value = /*filteredOptions*/ ctx[14];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	let each_1_else = null;

    	if (!each_value.length) {
    		each_1_else = create_else_block$2(ctx);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			t = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			if (each_1_else) {
    				each_1_else.c();
    			}

    			attr_dev(div, "class", "select-dropdown svelte-1445dha");
    			toggle_class(div, "right", /*right*/ ctx[11]);
    			add_location(div, file$h, 34, 4, 1152);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			append_dev(div, t);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			if (each_1_else) {
    				each_1_else.m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*filterable*/ ctx[6]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[0] & /*filterable*/ 64) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_2$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, t);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (dirty[0] & /*filteredOptions, viewIndex, toggle, $$scope, filter*/ 33841153) {
    				each_value = /*filteredOptions*/ ctx[14];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$4(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$4(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();

    				if (!each_value.length && each_1_else) {
    					each_1_else.p(ctx, dirty);
    				} else if (!each_value.length) {
    					each_1_else = create_else_block$2(ctx);
    					each_1_else.c();
    					each_1_else.m(div, null);
    				} else if (each_1_else) {
    					each_1_else.d(1);
    					each_1_else = null;
    				}
    			}

    			if (dirty[0] & /*right*/ 2048) {
    				toggle_class(div, "right", /*right*/ ctx[11]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			destroy_each(each_blocks, detaching);
    			if (each_1_else) each_1_else.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$7.name,
    		type: "if",
    		source: "(34:2) {#if isOpen && !disabled}",
    		ctx
    	});

    	return block;
    }

    // (36:6) {#if filterable}
    function create_if_block_2$2(ctx) {
    	let div1;
    	let div0;
    	let input;
    	let t;
    	let a;
    	let span;
    	let icon;
    	let current;
    	let mounted;
    	let dispose;

    	icon = new Icon({
    			props: { data: deleteIcon, class: "fw" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			input = element("input");
    			t = space();
    			a = element("a");
    			span = element("span");
    			create_component(icon.$$.fragment);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "form-control");
    			attr_dev(input, "placeholder", /*filterPlaceholder*/ ctx[12]);
    			add_location(input, file$h, 38, 12, 1298);
    			attr_dev(span, "class", "input-group-text");
    			add_location(span, file$h, 40, 14, 1546);
    			attr_dev(a, "class", "input-group-append");
    			attr_dev(a, "href", "/");
    			attr_dev(a, "tabindex", "-1");
    			add_location(a, file$h, 39, 12, 1431);
    			attr_dev(div0, "class", "input-group");
    			add_location(div0, file$h, 37, 10, 1259);
    			attr_dev(div1, "class", "filter svelte-1445dha");
    			add_location(div1, file$h, 36, 8, 1227);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, input);
    			set_input_value(input, /*filter*/ ctx[0]);
    			append_dev(div0, t);
    			append_dev(div0, a);
    			append_dev(a, span);
    			mount_component(icon, span, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[28]),
    					listen_dev(input, "keydown", /*keyListener*/ ctx[20], false, false, false),
    					listen_dev(a, "click", prevent_default(/*click_handler*/ ctx[29]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*filterPlaceholder*/ 4096) {
    				attr_dev(input, "placeholder", /*filterPlaceholder*/ ctx[12]);
    			}

    			if (dirty[0] & /*filter*/ 1 && input.value !== /*filter*/ ctx[0]) {
    				set_input_value(input, /*filter*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_component(icon);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$2.name,
    		type: "if",
    		source: "(36:6) {#if filterable}",
    		ctx
    	});

    	return block;
    }

    // (60:6) {:else}
    function create_else_block$2(ctx) {
    	let if_block_anchor;
    	let if_block = /*filter*/ ctx[0] != null && /*filter*/ ctx[0].length > 0 && create_if_block_1$4(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*filter*/ ctx[0] != null && /*filter*/ ctx[0].length > 0) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$4(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(60:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (61:8) {#if filter != null && filter.length > 0}
    function create_if_block_1$4(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("No options match \"");
    			t1 = text(/*filter*/ ctx[0]);
    			t2 = text("\"");
    			attr_dev(div, "class", "alert alert-warning");
    			add_location(div, file$h, 61, 10, 2202);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*filter*/ 1) set_data_dev(t1, /*filter*/ ctx[0]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$4.name,
    		type: "if",
    		source: "(61:8) {#if filter != null && filter.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (56:25)               
    function fallback_block$4(ctx) {
    	let html_tag;
    	let raw_value = /*option*/ ctx[40].label + "";
    	let html_anchor;

    	const block = {
    		c: function create() {
    			html_tag = new HtmlTag();
    			html_anchor = empty();
    			html_tag.a = html_anchor;
    		},
    		m: function mount(target, anchor) {
    			html_tag.m(raw_value, target, anchor);
    			insert_dev(target, html_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*filteredOptions*/ 16384 && raw_value !== (raw_value = /*option*/ ctx[40].label + "")) html_tag.p(raw_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block$4.name,
    		type: "fallback",
    		source: "(56:25)               ",
    		ctx
    	});

    	return block;
    }

    // (48:6) {#each filteredOptions as option, index}
    function create_each_block$4(ctx) {
    	let div;
    	let t;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[26].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[25], get_default_slot_context_1);
    	const default_slot_or_fallback = default_slot || fallback_block$4(ctx);

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[30](/*option*/ ctx[40], /*index*/ ctx[42]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			t = space();
    			attr_dev(div, "class", "item svelte-1445dha");
    			toggle_class(div, "selected", /*option*/ ctx[40].selected);
    			toggle_class(div, "viewing", /*viewIndex*/ ctx[13] == /*index*/ ctx[42]);
    			toggle_class(div, "disabled", /*option*/ ctx[40].disabled);
    			add_location(div, file$h, 48, 8, 1778);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(div, null);
    			}

    			append_dev(div, t);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div, "click", click_handler_1, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty[0] & /*$$scope, filteredOptions*/ 33570816)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[25], !current ? [-1, -1] : dirty, get_default_slot_changes_1, get_default_slot_context_1);
    				}
    			} else {
    				if (default_slot_or_fallback && default_slot_or_fallback.p && (!current || dirty[0] & /*filteredOptions*/ 16384)) {
    					default_slot_or_fallback.p(ctx, !current ? [-1, -1] : dirty);
    				}
    			}

    			if (dirty[0] & /*filteredOptions*/ 16384) {
    				toggle_class(div, "selected", /*option*/ ctx[40].selected);
    			}

    			if (dirty[0] & /*viewIndex*/ 8192) {
    				toggle_class(div, "viewing", /*viewIndex*/ ctx[13] == /*index*/ ctx[42]);
    			}

    			if (dirty[0] & /*filteredOptions*/ 16384) {
    				toggle_class(div, "disabled", /*option*/ ctx[40].disabled);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$4.name,
    		type: "each",
    		source: "(48:6) {#each filteredOptions as option, index}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$i(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let t0;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t1;
    	let t2;
    	let span;
    	let icon;
    	let div1_class_value;
    	let div1_data_test_value;
    	let t3;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = (/*selectedOptions*/ ctx[17].length === 0 || !/*multiple*/ ctx[3] && /*selectedOptions*/ ctx[17][0].value) && create_if_block_6(ctx);
    	let each_value_1 = /*selectedOptions*/ ctx[17];
    	validate_each_argument(each_value_1);
    	const get_key = ctx => /*option*/ ctx[40];
    	validate_each_keys(ctx, each_value_1, get_each_context_1$1, get_key);

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1$1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_1$1(key, child_ctx));
    	}

    	let if_block1 = (/*selectedOptions*/ ctx[17] == null || /*selectedOptions*/ ctx[17].length === 0) && create_if_block_3$1(ctx);

    	icon = new Icon({
    			props: { data: caretDownIcon, class: "fw" },
    			$$inline: true
    		});

    	let if_block2 = /*isOpen*/ ctx[1] && !/*disabled*/ ctx[7] && create_if_block$7(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t1 = space();
    			if (if_block1) if_block1.c();
    			t2 = space();
    			span = element("span");
    			create_component(icon.$$.fragment);
    			t3 = space();
    			if (if_block2) if_block2.c();
    			attr_dev(div0, "class", "input-select-content svelte-1445dha");
    			add_location(div0, file$h, 12, 4, 346);
    			attr_dev(span, "class", "dropdown-icon svelte-1445dha");
    			add_location(span, file$h, 28, 4, 1016);
    			attr_dev(div1, "class", div1_class_value = "btn btn-light " + /*className*/ ctx[8] + " svelte-1445dha");
    			attr_dev(div1, "data-test", div1_data_test_value = "" + (/*name*/ ctx[2] + "-btn"));
    			attr_dev(div1, "tabindex", tabindex);
    			toggle_class(div1, "btn-sm", /*sm*/ ctx[10]);
    			toggle_class(div1, "open", /*isOpen*/ ctx[1]);
    			add_location(div1, file$h, 1, 2, 101);
    			attr_dev(div2, "class", "select svelte-1445dha");
    			attr_dev(div2, "data-test", /*name*/ ctx[2]);
    			attr_dev(div2, "id", /*name*/ ctx[2]);
    			toggle_class(div2, "inline", /*inline*/ ctx[9]);
    			toggle_class(div2, "disabled", /*disabled*/ ctx[7]);
    			add_location(div2, file$h, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			if (if_block0) if_block0.m(div0, null);
    			append_dev(div0, t0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append_dev(div0, t1);
    			if (if_block1) if_block1.m(div0, null);
    			append_dev(div1, t2);
    			append_dev(div1, span);
    			mount_component(icon, span, null);
    			/*div1_binding*/ ctx[27](div1);
    			append_dev(div2, t3);
    			if (if_block2) if_block2.m(div2, null);
    			/*div2_binding*/ ctx[31](div2);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div1, "click", /*open*/ ctx[19], false, false, false),
    					listen_dev(div1, "focus", /*open*/ ctx[19], false, false, false),
    					listen_dev(div1, "keydown", /*keyListener*/ ctx[20], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*selectedOptions*/ ctx[17].length === 0 || !/*multiple*/ ctx[3] && /*selectedOptions*/ ctx[17][0].value) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_6(ctx);
    					if_block0.c();
    					if_block0.m(div0, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty[0] & /*selectedOptions, $$scope, inline, multiple*/ 33686024) {
    				each_value_1 = /*selectedOptions*/ ctx[17];
    				validate_each_argument(each_value_1);
    				group_outros();
    				validate_each_keys(ctx, each_value_1, get_each_context_1$1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_1, each_1_lookup, div0, outro_and_destroy_block, create_each_block_1$1, t1, get_each_context_1$1);
    				check_outros();
    			}

    			if (/*selectedOptions*/ ctx[17] == null || /*selectedOptions*/ ctx[17].length === 0) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_3$1(ctx);
    					if_block1.c();
    					if_block1.m(div0, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (!current || dirty[0] & /*className*/ 256 && div1_class_value !== (div1_class_value = "btn btn-light " + /*className*/ ctx[8] + " svelte-1445dha")) {
    				attr_dev(div1, "class", div1_class_value);
    			}

    			if (!current || dirty[0] & /*name*/ 4 && div1_data_test_value !== (div1_data_test_value = "" + (/*name*/ ctx[2] + "-btn"))) {
    				attr_dev(div1, "data-test", div1_data_test_value);
    			}

    			if (dirty[0] & /*className, sm*/ 1280) {
    				toggle_class(div1, "btn-sm", /*sm*/ ctx[10]);
    			}

    			if (dirty[0] & /*className, isOpen*/ 258) {
    				toggle_class(div1, "open", /*isOpen*/ ctx[1]);
    			}

    			if (/*isOpen*/ ctx[1] && !/*disabled*/ ctx[7]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty[0] & /*isOpen, disabled*/ 130) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block$7(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(div2, null);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty[0] & /*name*/ 4) {
    				attr_dev(div2, "data-test", /*name*/ ctx[2]);
    			}

    			if (!current || dirty[0] & /*name*/ 4) {
    				attr_dev(div2, "id", /*name*/ ctx[2]);
    			}

    			if (dirty[0] & /*inline*/ 512) {
    				toggle_class(div2, "inline", /*inline*/ ctx[9]);
    			}

    			if (dirty[0] & /*disabled*/ 128) {
    				toggle_class(div2, "disabled", /*disabled*/ ctx[7]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(icon.$$.fragment, local);
    			transition_in(if_block2);
    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(icon.$$.fragment, local);
    			transition_out(if_block2);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (if_block0) if_block0.d();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (if_block1) if_block1.d();
    			destroy_component(icon);
    			/*div1_binding*/ ctx[27](null);
    			if (if_block2) if_block2.d();
    			/*div2_binding*/ ctx[31](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$i.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const tabindex = 0;

    function instance$i($$self, $$props, $$invalidate) {
    	let filteredOptions;
    	let selectedOptions;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("InputSelect", slots, ['default']);
    	const dispatch = createEventDispatcher();
    	let { name = null } = $$props;
    	let { multiple = false } = $$props;
    	let { prefixLabel = "" } = $$props;
    	let { placeholder = "" } = $$props;
    	let { options = null } = $$props;
    	let { valueProp = null } = $$props;
    	let { labelProp = null } = $$props;
    	let { value = null } = $$props;
    	const initialValue = value;
    	const markDirty = getContext("markDirty");
    	let { filterable = false } = $$props;
    	let { isOpen = false } = $$props;
    	let { disabled = false } = $$props;

    	// class will get added to the form-control, for if you want to do form-control-lg, form-control-sm, etc to match the rest of your form
    	let { class: className = "" } = $$props;

    	let { inline = false } = $$props;
    	let { sm = false } = $$props;
    	let { right = false } = $$props; // lazy - make dropdown start from right of button instead of left, for when it's toward right edge of screen
    	let container = null;
    	let fakeField = null;
    	let { filter = "" } = $$props;
    	let { filterPlaceholder = "Filter" } = $$props;

    	// option we're currently viewing w/ keyboard navigation
    	let viewIndex = -1;

    	function makeValueArray() {
    		if (!Array.isArray(value)) $$invalidate(21, value = [value]); else $$invalidate(21, value = optionsToArray(options, value).filter(o => o.selected).map(option => option.value));
    	}

    	function optionsToArray(_options, v) {
    		const arr = _options == null
    		? []
    		: _options.map(o => {
    				const isString = typeof o === "string";

    				// in case they pass a custom object with other keys they need in a custom label, we destructure the original option object
    				const option = isString ? {} : { ...o };

    				option.value = isString
    				? o
    				: valueProp != null
    					? o[valueProp]
    					: o.value !== undefined ? o.value : o;

    				option.label = isString
    				? o
    				: o[labelProp] !== undefined
    					? o[labelProp]
    					: o.label !== undefined ? o.label : o;

    				option.selected = multiple
    				? v != null && v.indexOf(option.value) > -1
    				: v == option.value;

    				option.disabled = o.disabled === undefined ? false : o.disabled;
    				return option;
    			});

    		return arr;
    	}

    	function toggle(option, setViewIndex) {
    		if (multiple) {
    			$$invalidate(21, value = option.selected
    			? (value || []).filter(v => v != option.value)
    			: (value || []).concat(option.value));

    			// if user clicked an option in multi-select, refocus the fakeField
    			if (document.activeElement != fakeField) focusField();
    		} else {
    			$$invalidate(21, value = option.value);
    			close();
    		}

    		if (setViewIndex != null) $$invalidate(13, viewIndex = setViewIndex);
    		dispatch("change", value);
    	}

    	async function open() {
    		if (disabled) return;
    		$$invalidate(1, isOpen = true);

    		const selected = multiple
    		? value != null && value.length > 0 ? value[0] : null
    		: value;

    		$$invalidate(13, viewIndex = selected != null
    		? filteredOptions.findIndex(o => o.value === selected)
    		: -1);

    		document.addEventListener("mousedown", clickListener);
    		document.addEventListener("touchstart", clickListener);
    		await tick();
    		if (isOpen) focusField();
    	}

    	function close() {
    		// focus the non-field so tabbing/shift-tabbing works after close
    		focusField();

    		$$invalidate(1, isOpen = false);
    		document.removeEventListener("mousedown", clickListener);
    		document.removeEventListener("touchstart", clickListener);
    	}

    	function keyListener(e) {
    		// if tab, close and let them out
    		if (e.code == "Tab") {
    			close();
    			return;
    		}

    		// otherwise, if we're not open, any key should open
    		if (!isOpen) {
    			// except shift, so shift-tab doesn't open before closing immediately anyway
    			// and up, cuz it feels weird
    			if (e.code == "ShiftLeft" || e.code == "ShiftRight" || e.code == "ArrowUp") return;

    			open();
    			return;
    		}

    		// otherwise, handle a few keys for navigating options and toggling them
    		switch (e.code) {
    			case "Escape":
    				e.stopPropagation();
    				close();
    				break;
    			case "Space":
    			case "Enter":
    				if (viewIndex != null && filteredOptions[viewIndex] != null) {
    					toggle(filteredOptions[viewIndex]);
    					e.preventDefault();
    				}
    				break;
    			case "ArrowUp":
    				$$invalidate(13, viewIndex--, viewIndex);
    				if (filterable && viewIndex == -2 || !filterable && viewIndex <= -1) close();
    				e.preventDefault();
    				break;
    			case "ArrowDown":
    				if (!isOpen) open(); else if (viewIndex < filteredOptions.length - 1) $$invalidate(13, viewIndex++, viewIndex);
    				e.preventDefault();
    				break;
    		}
    	}

    	function clickListener(e) {
    		if (e.target.closest == null || e.target.closest(".select") !== container) close();
    	}

    	function focusField() {
    		if (fakeField && !filterable) fakeField.focus();
    	}

    	const writable_props = [
    		"name",
    		"multiple",
    		"prefixLabel",
    		"placeholder",
    		"options",
    		"valueProp",
    		"labelProp",
    		"value",
    		"filterable",
    		"isOpen",
    		"disabled",
    		"class",
    		"inline",
    		"sm",
    		"right",
    		"filter",
    		"filterPlaceholder"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<InputSelect> was created with unknown prop '${key}'`);
    	});

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			fakeField = $$value;
    			$$invalidate(16, fakeField);
    		});
    	}

    	function input_input_handler() {
    		filter = this.value;
    		$$invalidate(0, filter);
    	}

    	const click_handler = () => $$invalidate(0, filter = "");
    	const click_handler_1 = (option, index) => option.disabled ? null : toggle(option, index);

    	function div2_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			container = $$value;
    			$$invalidate(15, container);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("name" in $$props) $$invalidate(2, name = $$props.name);
    		if ("multiple" in $$props) $$invalidate(3, multiple = $$props.multiple);
    		if ("prefixLabel" in $$props) $$invalidate(4, prefixLabel = $$props.prefixLabel);
    		if ("placeholder" in $$props) $$invalidate(5, placeholder = $$props.placeholder);
    		if ("options" in $$props) $$invalidate(22, options = $$props.options);
    		if ("valueProp" in $$props) $$invalidate(23, valueProp = $$props.valueProp);
    		if ("labelProp" in $$props) $$invalidate(24, labelProp = $$props.labelProp);
    		if ("value" in $$props) $$invalidate(21, value = $$props.value);
    		if ("filterable" in $$props) $$invalidate(6, filterable = $$props.filterable);
    		if ("isOpen" in $$props) $$invalidate(1, isOpen = $$props.isOpen);
    		if ("disabled" in $$props) $$invalidate(7, disabled = $$props.disabled);
    		if ("class" in $$props) $$invalidate(8, className = $$props.class);
    		if ("inline" in $$props) $$invalidate(9, inline = $$props.inline);
    		if ("sm" in $$props) $$invalidate(10, sm = $$props.sm);
    		if ("right" in $$props) $$invalidate(11, right = $$props.right);
    		if ("filter" in $$props) $$invalidate(0, filter = $$props.filter);
    		if ("filterPlaceholder" in $$props) $$invalidate(12, filterPlaceholder = $$props.filterPlaceholder);
    		if ("$$scope" in $$props) $$invalidate(25, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		Icon,
    		removeIcon: deleteIcon,
    		caretDownIcon,
    		_filter,
    		validator,
    		tick,
    		getContext,
    		createEventDispatcher,
    		dispatch,
    		name,
    		multiple,
    		prefixLabel,
    		placeholder,
    		options,
    		valueProp,
    		labelProp,
    		value,
    		initialValue,
    		markDirty,
    		filterable,
    		isOpen,
    		disabled,
    		className,
    		inline,
    		sm,
    		right,
    		container,
    		fakeField,
    		tabindex,
    		filter,
    		filterPlaceholder,
    		viewIndex,
    		makeValueArray,
    		optionsToArray,
    		toggle,
    		open,
    		close,
    		keyListener,
    		clickListener,
    		focusField,
    		filteredOptions,
    		selectedOptions
    	});

    	$$self.$inject_state = $$props => {
    		if ("name" in $$props) $$invalidate(2, name = $$props.name);
    		if ("multiple" in $$props) $$invalidate(3, multiple = $$props.multiple);
    		if ("prefixLabel" in $$props) $$invalidate(4, prefixLabel = $$props.prefixLabel);
    		if ("placeholder" in $$props) $$invalidate(5, placeholder = $$props.placeholder);
    		if ("options" in $$props) $$invalidate(22, options = $$props.options);
    		if ("valueProp" in $$props) $$invalidate(23, valueProp = $$props.valueProp);
    		if ("labelProp" in $$props) $$invalidate(24, labelProp = $$props.labelProp);
    		if ("value" in $$props) $$invalidate(21, value = $$props.value);
    		if ("filterable" in $$props) $$invalidate(6, filterable = $$props.filterable);
    		if ("isOpen" in $$props) $$invalidate(1, isOpen = $$props.isOpen);
    		if ("disabled" in $$props) $$invalidate(7, disabled = $$props.disabled);
    		if ("className" in $$props) $$invalidate(8, className = $$props.className);
    		if ("inline" in $$props) $$invalidate(9, inline = $$props.inline);
    		if ("sm" in $$props) $$invalidate(10, sm = $$props.sm);
    		if ("right" in $$props) $$invalidate(11, right = $$props.right);
    		if ("container" in $$props) $$invalidate(15, container = $$props.container);
    		if ("fakeField" in $$props) $$invalidate(16, fakeField = $$props.fakeField);
    		if ("filter" in $$props) $$invalidate(0, filter = $$props.filter);
    		if ("filterPlaceholder" in $$props) $$invalidate(12, filterPlaceholder = $$props.filterPlaceholder);
    		if ("viewIndex" in $$props) $$invalidate(13, viewIndex = $$props.viewIndex);
    		if ("filteredOptions" in $$props) $$invalidate(14, filteredOptions = $$props.filteredOptions);
    		if ("selectedOptions" in $$props) $$invalidate(17, selectedOptions = $$props.selectedOptions);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*value*/ 2097152) {
    			if (markDirty != null && value != null && !validator.equals(value, initialValue)) markDirty();
    		}

    		if ($$self.$$.dirty[0] & /*options, value, filterable, filter*/ 6291521) {
    			// options to render, filtered if necessary
    			$$invalidate(14, filteredOptions = (() => {
    				const arr = optionsToArray(options, value);
    				return !filterable ? arr : _filter(arr, filter);
    			})());
    		}

    		if ($$self.$$.dirty[0] & /*viewIndex, filteredOptions, filterable*/ 24640) {
    			// keep viewIndex within filteredOptions length
    			{
    				if (viewIndex > filteredOptions.length - 1) $$invalidate(13, viewIndex = filteredOptions.length - 1);
    				if (viewIndex < -1) $$invalidate(13, viewIndex = filterable ? -1 : -1);
    			}
    		}

    		if ($$self.$$.dirty[0] & /*multiple, value*/ 2097160) {
    			// if multiple...
    			// make sure value is always array
    			// make sure value is always sorted to match option order - just nice to pass the same order around regardless of user click order
    			if (multiple && value) makeValueArray();
    		}

    		if ($$self.$$.dirty[0] & /*options, value, multiple*/ 6291464) {
    			// options to render in the selected box (so we can use the same slot logic)
    			$$invalidate(17, selectedOptions = optionsToArray(options, value).filter(option => multiple
    			? value && value.indexOf(option.value) > -1
    			: value == option.value));
    		}
    	};

    	return [
    		filter,
    		isOpen,
    		name,
    		multiple,
    		prefixLabel,
    		placeholder,
    		filterable,
    		disabled,
    		className,
    		inline,
    		sm,
    		right,
    		filterPlaceholder,
    		viewIndex,
    		filteredOptions,
    		container,
    		fakeField,
    		selectedOptions,
    		toggle,
    		open,
    		keyListener,
    		value,
    		options,
    		valueProp,
    		labelProp,
    		$$scope,
    		slots,
    		div1_binding,
    		input_input_handler,
    		click_handler,
    		click_handler_1,
    		div2_binding
    	];
    }

    class InputSelect extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$i,
    			create_fragment$i,
    			safe_not_equal,
    			{
    				name: 2,
    				multiple: 3,
    				prefixLabel: 4,
    				placeholder: 5,
    				options: 22,
    				valueProp: 23,
    				labelProp: 24,
    				value: 21,
    				filterable: 6,
    				isOpen: 1,
    				disabled: 7,
    				class: 8,
    				inline: 9,
    				sm: 10,
    				right: 11,
    				filter: 0,
    				filterPlaceholder: 12
    			},
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "InputSelect",
    			options,
    			id: create_fragment$i.name
    		});
    	}

    	get name() {
    		throw new Error("<InputSelect>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<InputSelect>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get multiple() {
    		throw new Error("<InputSelect>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set multiple(value) {
    		throw new Error("<InputSelect>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get prefixLabel() {
    		throw new Error("<InputSelect>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set prefixLabel(value) {
    		throw new Error("<InputSelect>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get placeholder() {
    		throw new Error("<InputSelect>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set placeholder(value) {
    		throw new Error("<InputSelect>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get options() {
    		throw new Error("<InputSelect>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set options(value) {
    		throw new Error("<InputSelect>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get valueProp() {
    		throw new Error("<InputSelect>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set valueProp(value) {
    		throw new Error("<InputSelect>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get labelProp() {
    		throw new Error("<InputSelect>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set labelProp(value) {
    		throw new Error("<InputSelect>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<InputSelect>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<InputSelect>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get filterable() {
    		throw new Error("<InputSelect>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set filterable(value) {
    		throw new Error("<InputSelect>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isOpen() {
    		throw new Error("<InputSelect>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isOpen(value) {
    		throw new Error("<InputSelect>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<InputSelect>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<InputSelect>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get class() {
    		throw new Error("<InputSelect>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<InputSelect>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get inline() {
    		throw new Error("<InputSelect>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set inline(value) {
    		throw new Error("<InputSelect>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sm() {
    		throw new Error("<InputSelect>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sm(value) {
    		throw new Error("<InputSelect>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get right() {
    		throw new Error("<InputSelect>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set right(value) {
    		throw new Error("<InputSelect>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get filter() {
    		throw new Error("<InputSelect>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set filter(value) {
    		throw new Error("<InputSelect>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get filterPlaceholder() {
    		throw new Error("<InputSelect>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set filterPlaceholder(value) {
    		throw new Error("<InputSelect>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\ItemListNav.svelte generated by Svelte v3.38.3 */

    const { Object: Object_1$5 } = globals;
    const file$g = "src\\components\\ItemListNav.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    const get_default_slot_changes = dirty => ({ item: dirty & /*collection*/ 1 });
    const get_default_slot_context = ctx => ({ item: /*item*/ ctx[6] });

    // (7:19) {item.name}
    function fallback_block$3(ctx) {
    	let t_value = /*item*/ ctx[6].name + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*collection*/ 1 && t_value !== (t_value = /*item*/ ctx[6].name + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block$3.name,
    		type: "fallback",
    		source: "(7:19) {item.name}",
    		ctx
    	});

    	return block;
    }

    // (5:2) {#each Object.values(collection) as item (item.id)}
    function create_each_block$3(key_1, ctx) {
    	let a;
    	let t;
    	let a_href_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], get_default_slot_context);
    	const default_slot_or_fallback = default_slot || fallback_block$3(ctx);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			a = element("a");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			t = space();
    			attr_dev(a, "href", a_href_value = "#/" + /*slug*/ ctx[1] + "/" + /*item*/ ctx[6].id);
    			attr_dev(a, "class", "svelte-10t9u79");
    			toggle_class(a, "active", /*item*/ ctx[6].id == /*active*/ ctx[3]);
    			add_location(a, file$g, 5, 4, 172);
    			this.first = a;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);

    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(a, null);
    			}

    			append_dev(a, t);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope, collection*/ 17)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[4], !current ? -1 : dirty, get_default_slot_changes, get_default_slot_context);
    				}
    			} else {
    				if (default_slot_or_fallback && default_slot_or_fallback.p && (!current || dirty & /*collection*/ 1)) {
    					default_slot_or_fallback.p(ctx, !current ? -1 : dirty);
    				}
    			}

    			if (!current || dirty & /*slug, collection*/ 3 && a_href_value !== (a_href_value = "#/" + /*slug*/ ctx[1] + "/" + /*item*/ ctx[6].id)) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty & /*Object, collection, active*/ 9) {
    				toggle_class(a, "active", /*item*/ ctx[6].id == /*active*/ ctx[3]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(5:2) {#each Object.values(collection) as item (item.id)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$h(ctx) {
    	let div;
    	let a;
    	let t0;
    	let t1;
    	let a_href_value;
    	let t2;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let current;
    	let each_value = Object.values(/*collection*/ ctx[0]);
    	validate_each_argument(each_value);
    	const get_key = ctx => /*item*/ ctx[6].id;
    	validate_each_keys(ctx, each_value, get_each_context$3, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$3(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$3(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			a = element("a");
    			t0 = text("+ New ");
    			t1 = text(/*type*/ ctx[2]);
    			t2 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(a, "href", a_href_value = "#/" + /*slug*/ ctx[1] + "/new");
    			attr_dev(a, "class", "svelte-10t9u79");
    			toggle_class(a, "active", /*active*/ ctx[3] == "new");
    			add_location(a, file$g, 1, 2, 31);
    			attr_dev(div, "class", "item-list-nav svelte-10t9u79");
    			add_location(div, file$g, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, a);
    			append_dev(a, t0);
    			append_dev(a, t1);
    			append_dev(div, t2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*type*/ 4) set_data_dev(t1, /*type*/ ctx[2]);

    			if (!current || dirty & /*slug*/ 2 && a_href_value !== (a_href_value = "#/" + /*slug*/ ctx[1] + "/new")) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty & /*active*/ 8) {
    				toggle_class(a, "active", /*active*/ ctx[3] == "new");
    			}

    			if (dirty & /*slug, Object, collection, active, $$scope*/ 27) {
    				each_value = Object.values(/*collection*/ ctx[0]);
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context$3, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div, outro_and_destroy_block, create_each_block$3, null, get_each_context$3);
    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$h.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$h($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ItemListNav", slots, ['default']);
    	let { collection } = $$props;
    	let { slug } = $$props;
    	let { type } = $$props;
    	let { active } = $$props;
    	const writable_props = ["collection", "slug", "type", "active"];

    	Object_1$5.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ItemListNav> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("collection" in $$props) $$invalidate(0, collection = $$props.collection);
    		if ("slug" in $$props) $$invalidate(1, slug = $$props.slug);
    		if ("type" in $$props) $$invalidate(2, type = $$props.type);
    		if ("active" in $$props) $$invalidate(3, active = $$props.active);
    		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ collection, slug, type, active });

    	$$self.$inject_state = $$props => {
    		if ("collection" in $$props) $$invalidate(0, collection = $$props.collection);
    		if ("slug" in $$props) $$invalidate(1, slug = $$props.slug);
    		if ("type" in $$props) $$invalidate(2, type = $$props.type);
    		if ("active" in $$props) $$invalidate(3, active = $$props.active);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [collection, slug, type, active, $$scope, slots];
    }

    class ItemListNav extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$h, create_fragment$h, safe_not_equal, {
    			collection: 0,
    			slug: 1,
    			type: 2,
    			active: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ItemListNav",
    			options,
    			id: create_fragment$h.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*collection*/ ctx[0] === undefined && !("collection" in props)) {
    			console.warn("<ItemListNav> was created without expected prop 'collection'");
    		}

    		if (/*slug*/ ctx[1] === undefined && !("slug" in props)) {
    			console.warn("<ItemListNav> was created without expected prop 'slug'");
    		}

    		if (/*type*/ ctx[2] === undefined && !("type" in props)) {
    			console.warn("<ItemListNav> was created without expected prop 'type'");
    		}

    		if (/*active*/ ctx[3] === undefined && !("active" in props)) {
    			console.warn("<ItemListNav> was created without expected prop 'active'");
    		}
    	}

    	get collection() {
    		throw new Error("<ItemListNav>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set collection(value) {
    		throw new Error("<ItemListNav>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get slug() {
    		throw new Error("<ItemListNav>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set slug(value) {
    		throw new Error("<ItemListNav>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get type() {
    		throw new Error("<ItemListNav>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<ItemListNav>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get active() {
    		throw new Error("<ItemListNav>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set active(value) {
    		throw new Error("<ItemListNav>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\pages\ArtBuilder.svelte generated by Svelte v3.38.3 */
    const file$f = "src\\pages\\ArtBuilder.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[86] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[89] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[92] = list[i];
    	child_ctx[94] = i;
    	return child_ctx;
    }

    // (5:4) <ItemListNav slug="art" type="art" collection={$project.art} active={paramId} let:item>
    function create_default_slot_10$1(ctx) {
    	let artthumb;
    	let t0;
    	let t1_value = /*item*/ ctx[96].name + "";
    	let t1;
    	let current;

    	artthumb = new ArtThumb({
    			props: { id: /*item*/ ctx[96].id },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(artthumb.$$.fragment);
    			t0 = space();
    			t1 = text(t1_value);
    		},
    		m: function mount(target, anchor) {
    			mount_component(artthumb, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const artthumb_changes = {};
    			if (dirty[3] & /*item*/ 8) artthumb_changes.id = /*item*/ ctx[96].id;
    			artthumb.$set(artthumb_changes);
    			if ((!current || dirty[3] & /*item*/ 8) && t1_value !== (t1_value = /*item*/ ctx[96].name + "")) set_data_dev(t1, t1_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(artthumb.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(artthumb.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(artthumb, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_10$1.name,
    		type: "slot",
    		source: "(5:4) <ItemListNav slug=\\\"art\\\" type=\\\"art\\\" collection={$project.art} active={paramId} let:item>",
    		ctx
    	});

    	return block;
    }

    // (69:10) <QuickDropdown label="{input.width}W x {input.height}H" on:open={startChangeSize} dropdownClass="below left">
    function create_default_slot_9$1(ctx) {
    	let form;
    	let div;
    	let t0;
    	let input0;
    	let t1;
    	let strong;
    	let t3;
    	let input1;
    	let t4;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			form = element("form");
    			div = element("div");
    			t0 = text("W\r\n                ");
    			input0 = element("input");
    			t1 = space();
    			strong = element("strong");
    			strong.textContent = "x";
    			t3 = text("\r\n                H\r\n                ");
    			input1 = element("input");
    			t4 = space();
    			button = element("button");
    			button.textContent = "Apply";
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "min", 1);
    			attr_dev(input0, "max", 1500);
    			attr_dev(input0, "class", "svelte-1gatncs");
    			add_location(input0, file$f, 72, 16, 3393);
    			add_location(strong, file$f, 73, 16, 3483);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "min", 1);
    			attr_dev(input1, "max", 1500);
    			attr_dev(input1, "class", "svelte-1gatncs");
    			add_location(input1, file$f, 75, 16, 3538);
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "btn btn-info btn-sm");
    			add_location(button, file$f, 76, 16, 3629);
    			attr_dev(div, "class", "p1");
    			add_location(div, file$f, 70, 14, 3340);
    			add_location(form, file$f, 69, 12, 3275);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);
    			append_dev(form, div);
    			append_dev(div, t0);
    			append_dev(div, input0);
    			set_input_value(input0, /*changeSize*/ ctx[13].width);
    			append_dev(div, t1);
    			append_dev(div, strong);
    			append_dev(div, t3);
    			append_dev(div, input1);
    			set_input_value(input1, /*changeSize*/ ctx[13].height);
    			append_dev(div, t4);
    			append_dev(div, button);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[52]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[53]),
    					listen_dev(form, "submit", prevent_default(/*applyChangeSize*/ ctx[42]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*changeSize*/ 8192 && to_number(input0.value) !== /*changeSize*/ ctx[13].width) {
    				set_input_value(input0, /*changeSize*/ ctx[13].width);
    			}

    			if (dirty[0] & /*changeSize*/ 8192 && to_number(input1.value) !== /*changeSize*/ ctx[13].height) {
    				set_input_value(input1, /*changeSize*/ ctx[13].height);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_9$1.name,
    		type: "slot",
    		source: "(69:10) <QuickDropdown label=\\\"{input.width}W x {input.height}H\\\" on:open={startChangeSize} dropdownClass=\\\"below left\\\">",
    		ctx
    	});

    	return block;
    }

    // (94:10) <InputSelect sm placeholder="Zoom" bind:value={zoom} let:option options={[...Array(11)].map((_, i) => i + 10)}>
    function create_default_slot_8$1(ctx) {
    	let icon;
    	let t0;
    	let t1_value = /*option*/ ctx[95].value + "";
    	let t1;
    	let current;

    	icon = new Icon({
    			props: { data: zoomIcon },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(icon.$$.fragment);
    			t0 = space();
    			t1 = text(t1_value);
    		},
    		m: function mount(target, anchor) {
    			mount_component(icon, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty[3] & /*option*/ 4) && t1_value !== (t1_value = /*option*/ ctx[95].value + "")) set_data_dev(t1, t1_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(icon, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_8$1.name,
    		type: "slot",
    		source: "(94:10) <InputSelect sm placeholder=\\\"Zoom\\\" bind:value={zoom} let:option options={[...Array(11)].map((_, i) => i + 10)}>",
    		ctx
    	});

    	return block;
    }

    // (105:10) <InputSelect              disabled={$autoSaveStore[input.name] == null}              options={$autoSaveStore[input.name]}              bind:value={selectedAutoSave}              on:change={e => loadAutoSave(e.detail)}              let:option              placeholder="Auto-saves"              inline              sm              right            >
    function create_default_slot_7$1(ctx) {
    	let t0_value = /*option*/ ctx[95].name + "";
    	let t0;
    	let t1;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			t0 = text(t0_value);
    			t1 = space();
    			img = element("img");
    			if (img.src !== (img_src_value = /*option*/ ctx[95].png)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "height", "40");
    			attr_dev(img, "alt", "");
    			add_location(img, file$f, 116, 12, 4975);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[3] & /*option*/ 4 && t0_value !== (t0_value = /*option*/ ctx[95].name + "")) set_data_dev(t0, t0_value);

    			if (dirty[3] & /*option*/ 4 && img.src !== (img_src_value = /*option*/ ctx[95].png)) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_7$1.name,
    		type: "slot",
    		source: "(105:10) <InputSelect              disabled={$autoSaveStore[input.name] == null}              options={$autoSaveStore[input.name]}              bind:value={selectedAutoSave}              on:change={e => loadAutoSave(e.detail)}              let:option              placeholder=\\\"Auto-saves\\\"              inline              sm              right            >",
    		ctx
    	});

    	return block;
    }

    // (143:10) <FieldText name="name" bind:value={input.name}>
    function create_default_slot_6$2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Name");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_6$2.name,
    		type: "slot",
    		source: "(143:10) <FieldText name=\\\"name\\\" bind:value={input.name}>",
    		ctx
    	});

    	return block;
    }

    // (137:8) <Form on:submit={save} {hasChanges}>
    function create_default_slot_5$2(ctx) {
    	let fieldtext;
    	let updating_value;
    	let current;

    	function fieldtext_value_binding(value) {
    		/*fieldtext_value_binding*/ ctx[60](value);
    	}

    	let fieldtext_props = {
    		name: "name",
    		$$slots: { default: [create_default_slot_6$2] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].name !== void 0) {
    		fieldtext_props.value = /*input*/ ctx[0].name;
    	}

    	fieldtext = new FieldText({ props: fieldtext_props, $$inline: true });
    	binding_callbacks.push(() => bind(fieldtext, "value", fieldtext_value_binding));

    	const block = {
    		c: function create() {
    			create_component(fieldtext.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(fieldtext, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const fieldtext_changes = {};

    			if (dirty[3] & /*$$scope*/ 16) {
    				fieldtext_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty[0] & /*input*/ 1) {
    				updating_value = true;
    				fieldtext_changes.value = /*input*/ ctx[0].name;
    				add_flush_callback(() => updating_value = false);
    			}

    			fieldtext.$set(fieldtext_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(fieldtext.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(fieldtext.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(fieldtext, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_5$2.name,
    		type: "slot",
    		source: "(137:8) <Form on:submit={save} {hasChanges}>",
    		ctx
    	});

    	return block;
    }

    // (139:12) {#if !isAdding}
    function create_if_block_4(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Delete";
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-danger");
    			add_location(button, file$f, 139, 14, 5801);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*del*/ ctx[21], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(139:12) {#if !isAdding}",
    		ctx
    	});

    	return block;
    }

    // (138:10) 
    function create_buttons_slot$3(ctx) {
    	let div;
    	let if_block = !/*isAdding*/ ctx[14] && create_if_block_4(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			attr_dev(div, "slot", "buttons");
    			add_location(div, file$f, 137, 10, 5736);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    		},
    		p: function update(ctx, dirty) {
    			if (!/*isAdding*/ ctx[14]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_4(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_buttons_slot$3.name,
    		type: "slot",
    		source: "(138:10) ",
    		ctx
    	});

    	return block;
    }

    // (147:10) <FieldCheckbox name="animated" bind:checked={input.animated} on:change={animatedChanged}>
    function create_default_slot_4$4(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Animated?");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_4$4.name,
    		type: "slot",
    		source: "(147:10) <FieldCheckbox name=\\\"animated\\\" bind:checked={input.animated} on:change={animatedChanged}>",
    		ctx
    	});

    	return block;
    }

    // (150:12) {#if input.animated}
    function create_if_block_3(ctx) {
    	let div2;
    	let fieldnumber0;
    	let updating_value;
    	let t0;
    	let fieldnumber1;
    	let updating_value_1;
    	let t1;
    	let fieldcheckbox;
    	let updating_checked;
    	let t2;
    	let div1;
    	let animationpreview;
    	let t3;
    	let div0;
    	let img;
    	let img_src_value;
    	let img_width_value;
    	let img_height_value;
    	let t4;
    	let current;

    	function fieldnumber0_value_binding(value) {
    		/*fieldnumber0_value_binding*/ ctx[62](value);
    	}

    	let fieldnumber0_props = {
    		name: "frameWidth",
    		max: 200,
    		step: 1,
    		$$slots: { default: [create_default_slot_3$4] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].frameWidth !== void 0) {
    		fieldnumber0_props.value = /*input*/ ctx[0].frameWidth;
    	}

    	fieldnumber0 = new FieldNumber({
    			props: fieldnumber0_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(fieldnumber0, "value", fieldnumber0_value_binding));

    	function fieldnumber1_value_binding(value) {
    		/*fieldnumber1_value_binding*/ ctx[63](value);
    	}

    	let fieldnumber1_props = {
    		name: "frameRate",
    		max: 60,
    		min: 1,
    		step: 1,
    		$$slots: { default: [create_default_slot_2$4] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].frameRate !== void 0) {
    		fieldnumber1_props.value = /*input*/ ctx[0].frameRate;
    	}

    	fieldnumber1 = new FieldNumber({
    			props: fieldnumber1_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(fieldnumber1, "value", fieldnumber1_value_binding));

    	function fieldcheckbox_checked_binding_1(value) {
    		/*fieldcheckbox_checked_binding_1*/ ctx[64](value);
    	}

    	let fieldcheckbox_props = {
    		name: "yoyo",
    		$$slots: { default: [create_default_slot_1$6] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].yoyo !== void 0) {
    		fieldcheckbox_props.checked = /*input*/ ctx[0].yoyo;
    	}

    	fieldcheckbox = new FieldCheckbox({
    			props: fieldcheckbox_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(fieldcheckbox, "checked", fieldcheckbox_checked_binding_1));

    	const animationpreview_spread_levels = [
    		/*input*/ ctx[0],
    		{ scale: artScale },
    		{ width: /*pngCanvas*/ ctx[10].width },
    		{ height: /*pngCanvas*/ ctx[10].height }
    	];

    	let animationpreview_props = {};

    	for (let i = 0; i < animationpreview_spread_levels.length; i += 1) {
    		animationpreview_props = assign(animationpreview_props, animationpreview_spread_levels[i]);
    	}

    	animationpreview = new AnimationPreview({
    			props: animationpreview_props,
    			$$inline: true
    		});

    	let each_value_2 = [...Array(/*numFrames*/ ctx[16])];
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			create_component(fieldnumber0.$$.fragment);
    			t0 = space();
    			create_component(fieldnumber1.$$.fragment);
    			t1 = space();
    			create_component(fieldcheckbox.$$.fragment);
    			t2 = space();
    			div1 = element("div");
    			create_component(animationpreview.$$.fragment);
    			t3 = space();
    			div0 = element("div");
    			img = element("img");
    			t4 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			if (img.src !== (img_src_value = /*input*/ ctx[0].png)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "width", img_width_value = /*pngCanvas*/ ctx[10].width * artScale);
    			attr_dev(img, "height", img_height_value = /*pngCanvas*/ ctx[10].height * artScale);
    			attr_dev(img, "alt", "preview frame splits");
    			add_location(img, file$f, 158, 20, 6832);
    			attr_dev(div0, "class", "frame-editor svelte-1gatncs");
    			add_location(div0, file$f, 157, 18, 6784);
    			attr_dev(div1, "class", "flex-column");
    			add_location(div1, file$f, 155, 16, 6621);
    			add_location(div2, file$f, 150, 14, 6249);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			mount_component(fieldnumber0, div2, null);
    			append_dev(div2, t0);
    			mount_component(fieldnumber1, div2, null);
    			append_dev(div2, t1);
    			mount_component(fieldcheckbox, div2, null);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			mount_component(animationpreview, div1, null);
    			append_dev(div1, t3);
    			append_dev(div1, div0);
    			append_dev(div0, img);
    			append_dev(div0, t4);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const fieldnumber0_changes = {};

    			if (dirty[3] & /*$$scope*/ 16) {
    				fieldnumber0_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty[0] & /*input*/ 1) {
    				updating_value = true;
    				fieldnumber0_changes.value = /*input*/ ctx[0].frameWidth;
    				add_flush_callback(() => updating_value = false);
    			}

    			fieldnumber0.$set(fieldnumber0_changes);
    			const fieldnumber1_changes = {};

    			if (dirty[3] & /*$$scope*/ 16) {
    				fieldnumber1_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_1 && dirty[0] & /*input*/ 1) {
    				updating_value_1 = true;
    				fieldnumber1_changes.value = /*input*/ ctx[0].frameRate;
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			fieldnumber1.$set(fieldnumber1_changes);
    			const fieldcheckbox_changes = {};

    			if (dirty[3] & /*$$scope*/ 16) {
    				fieldcheckbox_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_checked && dirty[0] & /*input*/ 1) {
    				updating_checked = true;
    				fieldcheckbox_changes.checked = /*input*/ ctx[0].yoyo;
    				add_flush_callback(() => updating_checked = false);
    			}

    			fieldcheckbox.$set(fieldcheckbox_changes);

    			const animationpreview_changes = (dirty[0] & /*input, pngCanvas*/ 1025)
    			? get_spread_update(animationpreview_spread_levels, [
    					dirty[0] & /*input*/ 1 && get_spread_object(/*input*/ ctx[0]),
    					dirty & /*artScale*/ 0 && { scale: artScale },
    					dirty[0] & /*pngCanvas*/ 1024 && { width: /*pngCanvas*/ ctx[10].width },
    					dirty[0] & /*pngCanvas*/ 1024 && { height: /*pngCanvas*/ ctx[10].height }
    				])
    			: {};

    			animationpreview.$set(animationpreview_changes);

    			if (!current || dirty[0] & /*input*/ 1 && img.src !== (img_src_value = /*input*/ ctx[0].png)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (!current || dirty[0] & /*pngCanvas*/ 1024 && img_width_value !== (img_width_value = /*pngCanvas*/ ctx[10].width * artScale)) {
    				attr_dev(img, "width", img_width_value);
    			}

    			if (!current || dirty[0] & /*pngCanvas*/ 1024 && img_height_value !== (img_height_value = /*pngCanvas*/ ctx[10].height * artScale)) {
    				attr_dev(img, "height", img_height_value);
    			}

    			if (dirty[0] & /*input, numFrames*/ 65537 | dirty[1] & /*copyFrame, removeFrame*/ 96) {
    				each_value_2 = [...Array(/*numFrames*/ ctx[16])];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div0, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_2.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(fieldnumber0.$$.fragment, local);
    			transition_in(fieldnumber1.$$.fragment, local);
    			transition_in(fieldcheckbox.$$.fragment, local);
    			transition_in(animationpreview.$$.fragment, local);

    			for (let i = 0; i < each_value_2.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(fieldnumber0.$$.fragment, local);
    			transition_out(fieldnumber1.$$.fragment, local);
    			transition_out(fieldcheckbox.$$.fragment, local);
    			transition_out(animationpreview.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_component(fieldnumber0);
    			destroy_component(fieldnumber1);
    			destroy_component(fieldcheckbox);
    			destroy_component(animationpreview);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(150:12) {#if input.animated}",
    		ctx
    	});

    	return block;
    }

    // (152:16) <FieldNumber name="frameWidth" bind:value={input.frameWidth} max={200} step={1}>
    function create_default_slot_3$4(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Frame width");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3$4.name,
    		type: "slot",
    		source: "(152:16) <FieldNumber name=\\\"frameWidth\\\" bind:value={input.frameWidth} max={200} step={1}>",
    		ctx
    	});

    	return block;
    }

    // (153:16) <FieldNumber name="frameRate" bind:value={input.frameRate} max={60} min={1} step={1}>
    function create_default_slot_2$4(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Frame rate");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2$4.name,
    		type: "slot",
    		source: "(153:16) <FieldNumber name=\\\"frameRate\\\" bind:value={input.frameRate} max={60} min={1} step={1}>",
    		ctx
    	});

    	return block;
    }

    // (154:16) <FieldCheckbox name="yoyo" bind:checked={input.yoyo}>
    function create_default_slot_1$6(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Loop back?");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$6.name,
    		type: "slot",
    		source: "(154:16) <FieldCheckbox name=\\\"yoyo\\\" bind:checked={input.yoyo}>",
    		ctx
    	});

    	return block;
    }

    // (160:20) {#each [...Array(numFrames)] as x, frameNumber}
    function create_each_block_2(ctx) {
    	let div;
    	let a0;
    	let icon0;
    	let t0;
    	let a1;
    	let icon1;
    	let t1;
    	let current;
    	let mounted;
    	let dispose;

    	icon0 = new Icon({
    			props: { data: deleteIcon },
    			$$inline: true
    		});

    	function click_handler_3() {
    		return /*click_handler_3*/ ctx[65](/*frameNumber*/ ctx[94]);
    	}

    	icon1 = new Icon({
    			props: { data: copyIcon },
    			$$inline: true
    		});

    	function click_handler_4() {
    		return /*click_handler_4*/ ctx[66](/*frameNumber*/ ctx[94]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			a0 = element("a");
    			create_component(icon0.$$.fragment);
    			t0 = space();
    			a1 = element("a");
    			create_component(icon1.$$.fragment);
    			t1 = space();
    			attr_dev(a0, "href", "#/");
    			attr_dev(a0, "class", "text-danger svelte-1gatncs");
    			add_location(a0, file$f, 161, 24, 7193);
    			attr_dev(a1, "href", "#/");
    			attr_dev(a1, "class", "text-info svelte-1gatncs");
    			add_location(a1, file$f, 164, 24, 7393);
    			attr_dev(div, "class", "frame svelte-1gatncs");
    			set_style(div, "left", /*frameNumber*/ ctx[94] * /*input*/ ctx[0].frameWidth * artScale + "px");
    			set_style(div, "width", /*input*/ ctx[0].frameWidth * artScale + "px");
    			add_location(div, file$f, 160, 22, 7047);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, a0);
    			mount_component(icon0, a0, null);
    			append_dev(div, t0);
    			append_dev(div, a1);
    			mount_component(icon1, a1, null);
    			append_dev(div, t1);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(a0, "click", prevent_default(click_handler_3), false, true, false),
    					listen_dev(a1, "click", prevent_default(click_handler_4), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (!current || dirty[0] & /*input*/ 1) {
    				set_style(div, "left", /*frameNumber*/ ctx[94] * /*input*/ ctx[0].frameWidth * artScale + "px");
    			}

    			if (!current || dirty[0] & /*input*/ 1) {
    				set_style(div, "width", /*input*/ ctx[0].frameWidth * artScale + "px");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon0.$$.fragment, local);
    			transition_in(icon1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon0.$$.fragment, local);
    			transition_out(icon1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(icon0);
    			destroy_component(icon1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(160:20) {#each [...Array(numFrames)] as x, frameNumber}",
    		ctx
    	});

    	return block;
    }

    // (192:36) 
    function create_if_block_2$1(ctx) {
    	let img;
    	let img_src_value;
    	let img_width_value;
    	let img_height_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			if (img.src !== (img_src_value = /*input*/ ctx[0].png)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "width", img_width_value = /*pngCanvas*/ ctx[10].width * artScale);
    			attr_dev(img, "height", img_height_value = /*pngCanvas*/ ctx[10].height * artScale);
    			attr_dev(img, "alt", "");
    			add_location(img, file$f, 192, 12, 8519);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*input*/ 1 && img.src !== (img_src_value = /*input*/ ctx[0].png)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty[0] & /*pngCanvas*/ 1024 && img_width_value !== (img_width_value = /*pngCanvas*/ ctx[10].width * artScale)) {
    				attr_dev(img, "width", img_width_value);
    			}

    			if (dirty[0] & /*pngCanvas*/ 1024 && img_height_value !== (img_height_value = /*pngCanvas*/ ctx[10].height * artScale)) {
    				attr_dev(img, "height", img_height_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(192:36) ",
    		ctx
    	});

    	return block;
    }

    // (177:10) {#if isBlockSize}
    function create_if_block$6(ctx) {
    	let div;
    	let t;
    	let current;
    	let each_value = [0, 0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < 2; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text("Block tiling preview\r\n              ");

    			for (let i = 0; i < 2; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "ml-2");
    			add_location(div, file$f, 177, 12, 7833);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);

    			for (let i = 0; i < 2; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*input, pngCanvas*/ 1025) {
    				each_value = [0, 0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < 2; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = 2; i < 2; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < 2; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < 2; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$6.name,
    		type: "if",
    		source: "(177:10) {#if isBlockSize}",
    		ctx
    	});

    	return block;
    }

    // (185:20) {:else}
    function create_else_block$1(ctx) {
    	let img;
    	let img_src_value;
    	let img_width_value;
    	let img_height_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			if (img.src !== (img_src_value = /*input*/ ctx[0].png)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "block repeating preview");
    			attr_dev(img, "width", img_width_value = /*input*/ ctx[0].width * artScale);
    			attr_dev(img, "height", img_height_value = /*input*/ ctx[0].height * artScale);
    			add_location(img, file$f, 185, 22, 8229);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*input*/ 1 && img.src !== (img_src_value = /*input*/ ctx[0].png)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty[0] & /*input*/ 1 && img_width_value !== (img_width_value = /*input*/ ctx[0].width * artScale)) {
    				attr_dev(img, "width", img_width_value);
    			}

    			if (dirty[0] & /*input*/ 1 && img_height_value !== (img_height_value = /*input*/ ctx[0].height * artScale)) {
    				attr_dev(img, "height", img_height_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(185:20) {:else}",
    		ctx
    	});

    	return block;
    }

    // (183:20) {#if input.animated}
    function create_if_block_1$3(ctx) {
    	let animationpreview;
    	let current;

    	const animationpreview_spread_levels = [
    		/*input*/ ctx[0],
    		{ scale: artScale },
    		{ width: /*pngCanvas*/ ctx[10].width },
    		{ height: /*pngCanvas*/ ctx[10].height },
    		{ simple: true }
    	];

    	let animationpreview_props = {};

    	for (let i = 0; i < animationpreview_spread_levels.length; i += 1) {
    		animationpreview_props = assign(animationpreview_props, animationpreview_spread_levels[i]);
    	}

    	animationpreview = new AnimationPreview({
    			props: animationpreview_props,
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(animationpreview.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(animationpreview, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const animationpreview_changes = (dirty[0] & /*input, pngCanvas*/ 1025)
    			? get_spread_update(animationpreview_spread_levels, [
    					dirty[0] & /*input*/ 1 && get_spread_object(/*input*/ ctx[0]),
    					dirty & /*artScale*/ 0 && { scale: artScale },
    					dirty[0] & /*pngCanvas*/ 1024 && { width: /*pngCanvas*/ ctx[10].width },
    					dirty[0] & /*pngCanvas*/ 1024 && { height: /*pngCanvas*/ ctx[10].height },
    					animationpreview_spread_levels[4]
    				])
    			: {};

    			animationpreview.$set(animationpreview_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(animationpreview.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(animationpreview.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(animationpreview, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$3.name,
    		type: "if",
    		source: "(183:20) {#if input.animated}",
    		ctx
    	});

    	return block;
    }

    // (182:18) {#each [0, 0, 0] as margin}
    function create_each_block_1(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1$3, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type_1(ctx, dirty) {
    		if (/*input*/ ctx[0].animated) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_1(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_1(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(182:18) {#each [0, 0, 0] as margin}",
    		ctx
    	});

    	return block;
    }

    // (180:14) {#each [0, 0] as r}
    function create_each_block$2(ctx) {
    	let div;
    	let t;
    	let current;
    	let each_value_1 = [0, 0, 0];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < 3; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < 3; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			attr_dev(div, "class", "flex");
    			add_location(div, file$f, 180, 16, 7940);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < 3; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(div, t);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*input, pngCanvas*/ 1025) {
    				each_value_1 = [0, 0, 0];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < 3; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, t);
    					}
    				}

    				group_outros();

    				for (i = 3; i < 3; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < 3; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < 3; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(180:14) {#each [0, 0] as r}",
    		ctx
    	});

    	return block;
    }

    // (3:0) <AppLayout active="art">
    function create_default_slot$c(ctx) {
    	let div0;
    	let itemlistnav;
    	let t0;
    	let div14;
    	let div13;
    	let div8;
    	let div7;
    	let button0;
    	let t2;
    	let colorpicker;
    	let updating_value;
    	let t3;
    	let div1;
    	let button1;
    	let icon0;
    	let button1_class_value;
    	let t4;
    	let button2;
    	let icon1;
    	let button2_class_value;
    	let t5;
    	let button3;
    	let icon2;
    	let button3_class_value;
    	let t6;
    	let div2;
    	let button4;
    	let icon3;
    	let t7;

    	let t8_value = (/*undos*/ ctx[6].length > 0
    	? /*undos*/ ctx[6].length
    	: "") + "";

    	let t8;
    	let button4_disabled_value;
    	let t9;
    	let button5;
    	let icon4;
    	let t10;

    	let t11_value = (/*redos*/ ctx[7].length > 0
    	? /*redos*/ ctx[7].length
    	: "") + "";

    	let t11;
    	let button5_disabled_value;
    	let t12;
    	let div3;
    	let button6;
    	let icon5;
    	let t13;
    	let button7;
    	let icon6;
    	let t14;
    	let div4;
    	let button8;
    	let icon7;
    	let t15;
    	let button9;
    	let icon8;
    	let t16;
    	let button10;
    	let icon9;
    	let t17;
    	let button11;
    	let icon10;
    	let t18;
    	let quickdropdown;
    	let t19;
    	let div5;
    	let button12;
    	let icon11;
    	let t20;
    	let t21;
    	let button13;
    	let icon12;
    	let t22;
    	let t23;
    	let inputselect0;
    	let updating_value_1;
    	let t24;
    	let div6;
    	let label;
    	let input_1;
    	let t25;
    	let t26;
    	let inputselect1;
    	let updating_value_2;
    	let t27;
    	let div9;
    	let canvas0;
    	let t28;
    	let canvas1;
    	let t29;
    	let div12;
    	let form;
    	let t30;
    	let div11;
    	let fieldcheckbox;
    	let updating_checked;
    	let t31;
    	let div10;
    	let t32;
    	let current_block_type_index;
    	let if_block1;
    	let current;
    	let mounted;
    	let dispose;

    	itemlistnav = new ItemListNav({
    			props: {
    				slug: "art",
    				type: "art",
    				collection: /*$project*/ ctx[4].art,
    				active: /*paramId*/ ctx[3],
    				$$slots: {
    					default: [
    						create_default_slot_10$1,
    						({ item }) => ({ 96: item }),
    						({ item }) => [0, 0, 0, item ? 8 : 0]
    					]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	function colorpicker_value_binding(value) {
    		/*colorpicker_value_binding*/ ctx[47](value);
    	}

    	let colorpicker_props = { dropdownClass: "below left" };

    	if (/*selectedColor*/ ctx[8] !== void 0) {
    		colorpicker_props.value = /*selectedColor*/ ctx[8];
    	}

    	colorpicker = new ColorPicker({ props: colorpicker_props, $$inline: true });
    	binding_callbacks.push(() => bind(colorpicker, "value", colorpicker_value_binding));
    	colorpicker.$on("change", /*change_handler*/ ctx[48]);

    	icon0 = new Icon({
    			props: { data: faPaintBrush },
    			$$inline: true
    		});

    	icon1 = new Icon({
    			props: { data: faFillDrip },
    			$$inline: true
    		});

    	icon2 = new Icon({
    			props: { data: eraseIcon },
    			$$inline: true
    		});

    	icon3 = new Icon({
    			props: { data: undoIcon },
    			$$inline: true
    		});

    	icon4 = new Icon({
    			props: { data: undoIcon, flip: "horizontal" },
    			$$inline: true
    		});

    	icon5 = new Icon({
    			props: { data: faExchangeAlt },
    			$$inline: true
    		});

    	icon6 = new Icon({
    			props: {
    				data: faExchangeAlt,
    				style: "transform: rotate(90deg);"
    			},
    			$$inline: true
    		});

    	icon7 = new Icon({
    			props: { data: arrowLeftIcon },
    			$$inline: true
    		});

    	icon8 = new Icon({
    			props: { data: arrowRightIcon },
    			$$inline: true
    		});

    	icon9 = new Icon({
    			props: { data: arrowUpIcon },
    			$$inline: true
    		});

    	icon10 = new Icon({
    			props: { data: arrowDownIcon },
    			$$inline: true
    		});

    	quickdropdown = new QuickDropdown({
    			props: {
    				label: "" + (/*input*/ ctx[0].width + "W x " + /*input*/ ctx[0].height + "H"),
    				dropdownClass: "below left",
    				$$slots: { default: [create_default_slot_9$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	quickdropdown.$on("open", /*startChangeSize*/ ctx[41]);

    	icon11 = new Icon({
    			props: { data: minusIcon },
    			$$inline: true
    		});

    	icon12 = new Icon({
    			props: { data: plusIcon },
    			$$inline: true
    		});

    	function inputselect0_value_binding(value) {
    		/*inputselect0_value_binding*/ ctx[54](value);
    	}

    	let inputselect0_props = {
    		sm: true,
    		placeholder: "Zoom",
    		options: [...Array(11)].map(func),
    		$$slots: {
    			default: [
    				create_default_slot_8$1,
    				({ option }) => ({ 95: option }),
    				({ option }) => [0, 0, 0, option ? 4 : 0]
    			]
    		},
    		$$scope: { ctx }
    	};

    	if (/*zoom*/ ctx[2] !== void 0) {
    		inputselect0_props.value = /*zoom*/ ctx[2];
    	}

    	inputselect0 = new InputSelect({
    			props: inputselect0_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(inputselect0, "value", inputselect0_value_binding));

    	function inputselect1_value_binding(value) {
    		/*inputselect1_value_binding*/ ctx[56](value);
    	}

    	let inputselect1_props = {
    		disabled: /*$autoSaveStore*/ ctx[18][/*input*/ ctx[0].name] == null,
    		options: /*$autoSaveStore*/ ctx[18][/*input*/ ctx[0].name],
    		placeholder: "Auto-saves",
    		inline: true,
    		sm: true,
    		right: true,
    		$$slots: {
    			default: [
    				create_default_slot_7$1,
    				({ option }) => ({ 95: option }),
    				({ option }) => [0, 0, 0, option ? 4 : 0]
    			]
    		},
    		$$scope: { ctx }
    	};

    	if (/*selectedAutoSave*/ ctx[9] !== void 0) {
    		inputselect1_props.value = /*selectedAutoSave*/ ctx[9];
    	}

    	inputselect1 = new InputSelect({
    			props: inputselect1_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(inputselect1, "value", inputselect1_value_binding));
    	inputselect1.$on("change", /*change_handler_1*/ ctx[57]);

    	form = new Form({
    			props: {
    				hasChanges: /*hasChanges*/ ctx[15],
    				$$slots: {
    					buttons: [create_buttons_slot$3],
    					default: [create_default_slot_5$2]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	form.$on("submit", /*save*/ ctx[20]);

    	function fieldcheckbox_checked_binding(value) {
    		/*fieldcheckbox_checked_binding*/ ctx[61](value);
    	}

    	let fieldcheckbox_props = {
    		name: "animated",
    		$$slots: { default: [create_default_slot_4$4] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].animated !== void 0) {
    		fieldcheckbox_props.checked = /*input*/ ctx[0].animated;
    	}

    	fieldcheckbox = new FieldCheckbox({
    			props: fieldcheckbox_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(fieldcheckbox, "checked", fieldcheckbox_checked_binding));
    	fieldcheckbox.$on("change", /*animatedChanged*/ ctx[40]);
    	let if_block0 = /*input*/ ctx[0].animated && create_if_block_3(ctx);
    	const if_block_creators = [create_if_block$6, create_if_block_2$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*isBlockSize*/ ctx[17]) return 0;
    		if (!/*input*/ ctx[0].animated) return 1;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			create_component(itemlistnav.$$.fragment);
    			t0 = space();
    			div14 = element("div");
    			div13 = element("div");
    			div8 = element("div");
    			div7 = element("div");
    			button0 = element("button");
    			button0.textContent = "Start over";
    			t2 = space();
    			create_component(colorpicker.$$.fragment);
    			t3 = space();
    			div1 = element("div");
    			button1 = element("button");
    			create_component(icon0.$$.fragment);
    			t4 = space();
    			button2 = element("button");
    			create_component(icon1.$$.fragment);
    			t5 = space();
    			button3 = element("button");
    			create_component(icon2.$$.fragment);
    			t6 = space();
    			div2 = element("div");
    			button4 = element("button");
    			create_component(icon3.$$.fragment);
    			t7 = space();
    			t8 = text(t8_value);
    			t9 = space();
    			button5 = element("button");
    			create_component(icon4.$$.fragment);
    			t10 = space();
    			t11 = text(t11_value);
    			t12 = space();
    			div3 = element("div");
    			button6 = element("button");
    			create_component(icon5.$$.fragment);
    			t13 = space();
    			button7 = element("button");
    			create_component(icon6.$$.fragment);
    			t14 = space();
    			div4 = element("div");
    			button8 = element("button");
    			create_component(icon7.$$.fragment);
    			t15 = space();
    			button9 = element("button");
    			create_component(icon8.$$.fragment);
    			t16 = space();
    			button10 = element("button");
    			create_component(icon9.$$.fragment);
    			t17 = space();
    			button11 = element("button");
    			create_component(icon10.$$.fragment);
    			t18 = space();
    			create_component(quickdropdown.$$.fragment);
    			t19 = space();
    			div5 = element("div");
    			button12 = element("button");
    			create_component(icon11.$$.fragment);
    			t20 = text("\r\n              Half size");
    			t21 = space();
    			button13 = element("button");
    			create_component(icon12.$$.fragment);
    			t22 = text("\r\n              Double size");
    			t23 = space();
    			create_component(inputselect0.$$.fragment);
    			t24 = space();
    			div6 = element("div");
    			label = element("label");
    			input_1 = element("input");
    			t25 = text("\r\n              Show grid");
    			t26 = space();
    			create_component(inputselect1.$$.fragment);
    			t27 = space();
    			div9 = element("div");
    			canvas0 = element("canvas");
    			t28 = space();
    			canvas1 = element("canvas");
    			t29 = space();
    			div12 = element("div");
    			create_component(form.$$.fragment);
    			t30 = space();
    			div11 = element("div");
    			create_component(fieldcheckbox.$$.fragment);
    			t31 = space();
    			div10 = element("div");
    			if (if_block0) if_block0.c();
    			t32 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(div0, "class", "col1");
    			add_location(div0, file$f, 3, 2, 116);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "btn btn-light btn-sm mr1");
    			add_location(button0, file$f, 13, 10, 441);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", button1_class_value = "btn btn-sm btn-" + (/*mode*/ ctx[5] == "paint" ? "primary" : "light"));
    			attr_dev(button1, "title", "Paint brush");
    			add_location(button1, file$f, 17, 12, 724);
    			attr_dev(button2, "type", "button");
    			attr_dev(button2, "class", button2_class_value = "btn btn-sm btn-" + (/*mode*/ ctx[5] == "fill" ? "primary" : "light"));
    			attr_dev(button2, "title", "Paint bucket");
    			add_location(button2, file$f, 25, 12, 1015);
    			attr_dev(button3, "type", "button");
    			attr_dev(button3, "class", button3_class_value = "btn btn-sm btn-" + (/*mode*/ ctx[5] == "erase" ? "primary" : "light"));
    			attr_dev(button3, "title", "Eraser");
    			add_location(button3, file$f, 28, 12, 1230);
    			attr_dev(div1, "class", "btn-group");
    			add_location(div1, file$f, 16, 10, 687);
    			attr_dev(button4, "type", "button");
    			button4.disabled = button4_disabled_value = /*undos*/ ctx[6].length == 0;
    			attr_dev(button4, "class", "btn btn-default btn-sm");
    			add_location(button4, file$f, 34, 12, 1497);
    			attr_dev(button5, "type", "button");
    			button5.disabled = button5_disabled_value = /*redos*/ ctx[7].length == 0;
    			attr_dev(button5, "class", "btn btn-default btn-sm");
    			add_location(button5, file$f, 38, 12, 1726);
    			attr_dev(div2, "class", "btn-group");
    			add_location(div2, file$f, 33, 10, 1460);
    			attr_dev(button6, "type", "button");
    			attr_dev(button6, "class", "btn btn-light btn-sm");
    			attr_dev(button6, "title", "Flip horizontal");
    			add_location(button6, file$f, 45, 12, 2028);
    			attr_dev(button7, "type", "button");
    			attr_dev(button7, "class", "btn btn-light btn-sm");
    			attr_dev(button7, "title", "Flip vertical");
    			add_location(button7, file$f, 48, 12, 2197);
    			attr_dev(div3, "class", "btn-group");
    			add_location(div3, file$f, 44, 10, 1991);
    			attr_dev(button8, "type", "button");
    			attr_dev(button8, "class", "btn btn-light btn-sm");
    			attr_dev(button8, "title", "Move left");
    			add_location(button8, file$f, 54, 12, 2453);
    			attr_dev(button9, "type", "button");
    			attr_dev(button9, "class", "btn btn-light btn-sm");
    			attr_dev(button9, "title", "Move right");
    			add_location(button9, file$f, 57, 12, 2624);
    			attr_dev(button10, "type", "button");
    			attr_dev(button10, "class", "btn btn-light btn-sm");
    			attr_dev(button10, "title", "Move up");
    			add_location(button10, file$f, 60, 12, 2798);
    			attr_dev(button11, "type", "button");
    			attr_dev(button11, "class", "btn btn-light btn-sm");
    			attr_dev(button11, "title", "Move down");
    			add_location(button11, file$f, 63, 12, 2963);
    			attr_dev(div4, "class", "btn-group");
    			add_location(div4, file$f, 53, 10, 2416);
    			attr_dev(button12, "type", "button");
    			attr_dev(button12, "class", "btn btn-light btn-sm");
    			attr_dev(button12, "title", "Scale down");
    			add_location(button12, file$f, 82, 12, 3797);
    			attr_dev(button13, "type", "button");
    			attr_dev(button13, "class", "btn btn-light btn-sm");
    			attr_dev(button13, "title", "Scale up");
    			add_location(button13, file$f, 87, 12, 3993);
    			add_location(div5, file$f, 81, 10, 3778);
    			attr_dev(input_1, "type", "checkbox");
    			add_location(input_1, file$f, 99, 14, 4459);
    			add_location(label, file$f, 98, 12, 4436);
    			add_location(div6, file$f, 97, 10, 4417);
    			attr_dev(div7, "class", "art-actions svelte-1gatncs");
    			add_location(div7, file$f, 12, 8, 404);
    			attr_dev(div8, "class", "col1");
    			add_location(div8, file$f, 11, 6, 376);
    			attr_dev(canvas0, "class", "draw-canvas svelte-1gatncs");
    			add_location(canvas0, file$f, 121, 8, 5127);
    			attr_dev(canvas1, "class", "grid-canvas svelte-1gatncs");
    			toggle_class(canvas1, "paint-cursor", /*mode*/ ctx[5] == "paint");
    			toggle_class(canvas1, "fill-cursor", /*mode*/ ctx[5] == "fill");
    			toggle_class(canvas1, "erase-cursor", /*mode*/ ctx[5] == "erase");
    			add_location(canvas1, file$f, 122, 8, 5190);
    			attr_dev(div9, "class", "grow canvas-container svelte-1gatncs");
    			add_location(div9, file$f, 120, 6, 5082);
    			attr_dev(div10, "class", "preview flex");
    			add_location(div10, file$f, 148, 10, 6173);
    			attr_dev(div11, "class", "p1");
    			add_location(div11, file$f, 145, 8, 6017);
    			attr_dev(div12, "class", "col2");
    			add_location(div12, file$f, 135, 6, 5660);
    			attr_dev(div13, "class", "grow columns");
    			add_location(div13, file$f, 10, 4, 342);
    			attr_dev(div14, "class", "grow rows");
    			add_location(div14, file$f, 9, 2, 313);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			mount_component(itemlistnav, div0, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div14, anchor);
    			append_dev(div14, div13);
    			append_dev(div13, div8);
    			append_dev(div8, div7);
    			append_dev(div7, button0);
    			append_dev(div7, t2);
    			mount_component(colorpicker, div7, null);
    			append_dev(div7, t3);
    			append_dev(div7, div1);
    			append_dev(div1, button1);
    			mount_component(icon0, button1, null);
    			append_dev(div1, t4);
    			append_dev(div1, button2);
    			mount_component(icon1, button2, null);
    			append_dev(div1, t5);
    			append_dev(div1, button3);
    			mount_component(icon2, button3, null);
    			append_dev(div7, t6);
    			append_dev(div7, div2);
    			append_dev(div2, button4);
    			mount_component(icon3, button4, null);
    			append_dev(button4, t7);
    			append_dev(button4, t8);
    			append_dev(div2, t9);
    			append_dev(div2, button5);
    			mount_component(icon4, button5, null);
    			append_dev(button5, t10);
    			append_dev(button5, t11);
    			append_dev(div7, t12);
    			append_dev(div7, div3);
    			append_dev(div3, button6);
    			mount_component(icon5, button6, null);
    			append_dev(div3, t13);
    			append_dev(div3, button7);
    			mount_component(icon6, button7, null);
    			append_dev(div7, t14);
    			append_dev(div7, div4);
    			append_dev(div4, button8);
    			mount_component(icon7, button8, null);
    			append_dev(div4, t15);
    			append_dev(div4, button9);
    			mount_component(icon8, button9, null);
    			append_dev(div4, t16);
    			append_dev(div4, button10);
    			mount_component(icon9, button10, null);
    			append_dev(div4, t17);
    			append_dev(div4, button11);
    			mount_component(icon10, button11, null);
    			append_dev(div7, t18);
    			mount_component(quickdropdown, div7, null);
    			append_dev(div7, t19);
    			append_dev(div7, div5);
    			append_dev(div5, button12);
    			mount_component(icon11, button12, null);
    			append_dev(button12, t20);
    			append_dev(div5, t21);
    			append_dev(div5, button13);
    			mount_component(icon12, button13, null);
    			append_dev(button13, t22);
    			append_dev(div7, t23);
    			mount_component(inputselect0, div7, null);
    			append_dev(div7, t24);
    			append_dev(div7, div6);
    			append_dev(div6, label);
    			append_dev(label, input_1);
    			input_1.checked = /*showGrid*/ ctx[1];
    			append_dev(label, t25);
    			append_dev(div7, t26);
    			mount_component(inputselect1, div7, null);
    			append_dev(div13, t27);
    			append_dev(div13, div9);
    			append_dev(div9, canvas0);
    			/*canvas0_binding*/ ctx[58](canvas0);
    			append_dev(div9, t28);
    			append_dev(div9, canvas1);
    			/*canvas1_binding*/ ctx[59](canvas1);
    			append_dev(div13, t29);
    			append_dev(div13, div12);
    			mount_component(form, div12, null);
    			append_dev(div12, t30);
    			append_dev(div12, div11);
    			mount_component(fieldcheckbox, div11, null);
    			append_dev(div11, t31);
    			append_dev(div11, div10);
    			if (if_block0) if_block0.m(div10, null);
    			append_dev(div11, t32);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(div11, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*reset*/ ctx[22], false, false, false),
    					listen_dev(button1, "click", /*click_handler*/ ctx[49], false, false, false),
    					listen_dev(button2, "click", /*click_handler_1*/ ctx[50], false, false, false),
    					listen_dev(button3, "click", /*click_handler_2*/ ctx[51], false, false, false),
    					listen_dev(button4, "click", /*undo*/ ctx[28], false, false, false),
    					listen_dev(button5, "click", /*redo*/ ctx[29], false, false, false),
    					listen_dev(button6, "click", /*flipX*/ ctx[31], false, false, false),
    					listen_dev(button7, "click", /*flipY*/ ctx[30], false, false, false),
    					listen_dev(button8, "click", /*moveLeft*/ ctx[32], false, false, false),
    					listen_dev(button9, "click", /*moveRight*/ ctx[33], false, false, false),
    					listen_dev(button10, "click", /*moveUp*/ ctx[34], false, false, false),
    					listen_dev(button11, "click", /*moveDown*/ ctx[35], false, false, false),
    					listen_dev(button12, "click", /*scaleDown*/ ctx[39], false, false, false),
    					listen_dev(button13, "click", /*scaleUp*/ ctx[38], false, false, false),
    					listen_dev(input_1, "change", /*input_1_change_handler*/ ctx[55]),
    					listen_dev(canvas1, "pointerdown", prevent_default(/*onDrawPointerDown*/ ctx[23]), false, true, false),
    					listen_dev(canvas1, "pointerup", prevent_default(/*onDrawPointerUp*/ ctx[24]), false, true, false),
    					listen_dev(canvas1, "pointermove", prevent_default(/*onDrawPointerMove*/ ctx[25]), false, true, false),
    					listen_dev(canvas1, "contextmenu", prevent_default(/*contextmenu_handler*/ ctx[46]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			const itemlistnav_changes = {};
    			if (dirty[0] & /*$project*/ 16) itemlistnav_changes.collection = /*$project*/ ctx[4].art;
    			if (dirty[0] & /*paramId*/ 8) itemlistnav_changes.active = /*paramId*/ ctx[3];

    			if (dirty[3] & /*$$scope, item*/ 24) {
    				itemlistnav_changes.$$scope = { dirty, ctx };
    			}

    			itemlistnav.$set(itemlistnav_changes);
    			const colorpicker_changes = {};

    			if (!updating_value && dirty[0] & /*selectedColor*/ 256) {
    				updating_value = true;
    				colorpicker_changes.value = /*selectedColor*/ ctx[8];
    				add_flush_callback(() => updating_value = false);
    			}

    			colorpicker.$set(colorpicker_changes);

    			if (!current || dirty[0] & /*mode*/ 32 && button1_class_value !== (button1_class_value = "btn btn-sm btn-" + (/*mode*/ ctx[5] == "paint" ? "primary" : "light"))) {
    				attr_dev(button1, "class", button1_class_value);
    			}

    			if (!current || dirty[0] & /*mode*/ 32 && button2_class_value !== (button2_class_value = "btn btn-sm btn-" + (/*mode*/ ctx[5] == "fill" ? "primary" : "light"))) {
    				attr_dev(button2, "class", button2_class_value);
    			}

    			if (!current || dirty[0] & /*mode*/ 32 && button3_class_value !== (button3_class_value = "btn btn-sm btn-" + (/*mode*/ ctx[5] == "erase" ? "primary" : "light"))) {
    				attr_dev(button3, "class", button3_class_value);
    			}

    			if ((!current || dirty[0] & /*undos*/ 64) && t8_value !== (t8_value = (/*undos*/ ctx[6].length > 0
    			? /*undos*/ ctx[6].length
    			: "") + "")) set_data_dev(t8, t8_value);

    			if (!current || dirty[0] & /*undos*/ 64 && button4_disabled_value !== (button4_disabled_value = /*undos*/ ctx[6].length == 0)) {
    				prop_dev(button4, "disabled", button4_disabled_value);
    			}

    			if ((!current || dirty[0] & /*redos*/ 128) && t11_value !== (t11_value = (/*redos*/ ctx[7].length > 0
    			? /*redos*/ ctx[7].length
    			: "") + "")) set_data_dev(t11, t11_value);

    			if (!current || dirty[0] & /*redos*/ 128 && button5_disabled_value !== (button5_disabled_value = /*redos*/ ctx[7].length == 0)) {
    				prop_dev(button5, "disabled", button5_disabled_value);
    			}

    			const quickdropdown_changes = {};
    			if (dirty[0] & /*input*/ 1) quickdropdown_changes.label = "" + (/*input*/ ctx[0].width + "W x " + /*input*/ ctx[0].height + "H");

    			if (dirty[0] & /*changeSize*/ 8192 | dirty[3] & /*$$scope*/ 16) {
    				quickdropdown_changes.$$scope = { dirty, ctx };
    			}

    			quickdropdown.$set(quickdropdown_changes);
    			const inputselect0_changes = {};

    			if (dirty[3] & /*$$scope, option*/ 20) {
    				inputselect0_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_1 && dirty[0] & /*zoom*/ 4) {
    				updating_value_1 = true;
    				inputselect0_changes.value = /*zoom*/ ctx[2];
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			inputselect0.$set(inputselect0_changes);

    			if (dirty[0] & /*showGrid*/ 2) {
    				input_1.checked = /*showGrid*/ ctx[1];
    			}

    			const inputselect1_changes = {};
    			if (dirty[0] & /*$autoSaveStore, input*/ 262145) inputselect1_changes.disabled = /*$autoSaveStore*/ ctx[18][/*input*/ ctx[0].name] == null;
    			if (dirty[0] & /*$autoSaveStore, input*/ 262145) inputselect1_changes.options = /*$autoSaveStore*/ ctx[18][/*input*/ ctx[0].name];

    			if (dirty[3] & /*$$scope, option*/ 20) {
    				inputselect1_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_2 && dirty[0] & /*selectedAutoSave*/ 512) {
    				updating_value_2 = true;
    				inputselect1_changes.value = /*selectedAutoSave*/ ctx[9];
    				add_flush_callback(() => updating_value_2 = false);
    			}

    			inputselect1.$set(inputselect1_changes);

    			if (dirty[0] & /*mode*/ 32) {
    				toggle_class(canvas1, "paint-cursor", /*mode*/ ctx[5] == "paint");
    			}

    			if (dirty[0] & /*mode*/ 32) {
    				toggle_class(canvas1, "fill-cursor", /*mode*/ ctx[5] == "fill");
    			}

    			if (dirty[0] & /*mode*/ 32) {
    				toggle_class(canvas1, "erase-cursor", /*mode*/ ctx[5] == "erase");
    			}

    			const form_changes = {};
    			if (dirty[0] & /*hasChanges*/ 32768) form_changes.hasChanges = /*hasChanges*/ ctx[15];

    			if (dirty[0] & /*isAdding, input*/ 16385 | dirty[3] & /*$$scope*/ 16) {
    				form_changes.$$scope = { dirty, ctx };
    			}

    			form.$set(form_changes);
    			const fieldcheckbox_changes = {};

    			if (dirty[3] & /*$$scope*/ 16) {
    				fieldcheckbox_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_checked && dirty[0] & /*input*/ 1) {
    				updating_checked = true;
    				fieldcheckbox_changes.checked = /*input*/ ctx[0].animated;
    				add_flush_callback(() => updating_checked = false);
    			}

    			fieldcheckbox.$set(fieldcheckbox_changes);

    			if (/*input*/ ctx[0].animated) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty[0] & /*input*/ 1) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div10, null);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) {
    					if_blocks[current_block_type_index].p(ctx, dirty);
    				}
    			} else {
    				if (if_block1) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block1 = if_blocks[current_block_type_index];

    					if (!if_block1) {
    						if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block1.c();
    					} else {
    						if_block1.p(ctx, dirty);
    					}

    					transition_in(if_block1, 1);
    					if_block1.m(div11, null);
    				} else {
    					if_block1 = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(itemlistnav.$$.fragment, local);
    			transition_in(colorpicker.$$.fragment, local);
    			transition_in(icon0.$$.fragment, local);
    			transition_in(icon1.$$.fragment, local);
    			transition_in(icon2.$$.fragment, local);
    			transition_in(icon3.$$.fragment, local);
    			transition_in(icon4.$$.fragment, local);
    			transition_in(icon5.$$.fragment, local);
    			transition_in(icon6.$$.fragment, local);
    			transition_in(icon7.$$.fragment, local);
    			transition_in(icon8.$$.fragment, local);
    			transition_in(icon9.$$.fragment, local);
    			transition_in(icon10.$$.fragment, local);
    			transition_in(quickdropdown.$$.fragment, local);
    			transition_in(icon11.$$.fragment, local);
    			transition_in(icon12.$$.fragment, local);
    			transition_in(inputselect0.$$.fragment, local);
    			transition_in(inputselect1.$$.fragment, local);
    			transition_in(form.$$.fragment, local);
    			transition_in(fieldcheckbox.$$.fragment, local);
    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(itemlistnav.$$.fragment, local);
    			transition_out(colorpicker.$$.fragment, local);
    			transition_out(icon0.$$.fragment, local);
    			transition_out(icon1.$$.fragment, local);
    			transition_out(icon2.$$.fragment, local);
    			transition_out(icon3.$$.fragment, local);
    			transition_out(icon4.$$.fragment, local);
    			transition_out(icon5.$$.fragment, local);
    			transition_out(icon6.$$.fragment, local);
    			transition_out(icon7.$$.fragment, local);
    			transition_out(icon8.$$.fragment, local);
    			transition_out(icon9.$$.fragment, local);
    			transition_out(icon10.$$.fragment, local);
    			transition_out(quickdropdown.$$.fragment, local);
    			transition_out(icon11.$$.fragment, local);
    			transition_out(icon12.$$.fragment, local);
    			transition_out(inputselect0.$$.fragment, local);
    			transition_out(inputselect1.$$.fragment, local);
    			transition_out(form.$$.fragment, local);
    			transition_out(fieldcheckbox.$$.fragment, local);
    			transition_out(if_block0);
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			destroy_component(itemlistnav);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div14);
    			destroy_component(colorpicker);
    			destroy_component(icon0);
    			destroy_component(icon1);
    			destroy_component(icon2);
    			destroy_component(icon3);
    			destroy_component(icon4);
    			destroy_component(icon5);
    			destroy_component(icon6);
    			destroy_component(icon7);
    			destroy_component(icon8);
    			destroy_component(icon9);
    			destroy_component(icon10);
    			destroy_component(quickdropdown);
    			destroy_component(icon11);
    			destroy_component(icon12);
    			destroy_component(inputselect0);
    			destroy_component(inputselect1);
    			/*canvas0_binding*/ ctx[58](null);
    			/*canvas1_binding*/ ctx[59](null);
    			destroy_component(form);
    			destroy_component(fieldcheckbox);
    			if (if_block0) if_block0.d();

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d();
    			}

    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$c.name,
    		type: "slot",
    		source: "(3:0) <AppLayout active=\\\"art\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$g(ctx) {
    	let applayout;
    	let current;
    	let mounted;
    	let dispose;

    	applayout = new AppLayout({
    			props: {
    				active: "art",
    				$$slots: { default: [create_default_slot$c] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(applayout.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(applayout, target, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window, "keyup", /*onKeyUp*/ ctx[26], false, false, false),
    					listen_dev(window, "paste", /*onPaste*/ ctx[27], false, false, false),
    					listen_dev(window, "mouseup", /*onDrawPointerUp*/ ctx[24], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			const applayout_changes = {};

    			if (dirty[0] & /*input, pngCanvas, isBlockSize, numFrames, hasChanges, isAdding, gridCanvas, mode, drawCanvas, $autoSaveStore, selectedAutoSave, showGrid, zoom, changeSize, redos, undos, selectedColor, $project, paramId*/ 524287 | dirty[3] & /*$$scope*/ 16) {
    				applayout_changes.$$scope = { dirty, ctx };
    			}

    			applayout.$set(applayout_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(applayout.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(applayout.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(applayout, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$g.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const artScale = 1;

    function createDefaultInput$4() {
    	return {
    		name: "",
    		width: 40,
    		height: 40,
    		png: null,
    		animated: false,
    		frameWidth: 25,
    		frameRate: 10,
    		yoyo: false
    	};
    }

    function toRGB(d) {
    	return d[3] === 0
    	? "transparent"
    	: `rgba(${d[0]}, ${d[1]}, ${d[2]}, ${d[3]})`;
    }

    function drawSquare(context, x, y, size, color) {
    	if (color == "transparent") {
    		context.clearRect(x, y, size, size);
    	} else {
    		context.beginPath();
    		context.rect(x, y, size, size);
    		context.fillStyle = color;
    		context.fill();
    	}
    }

    function rotateLeft() {
    	rotate(-90);
    }

    function rotateRight() {
    	rotate(90);
    }

    const func = (_, i) => i + 10;

    function instance$g($$self, $$props, $$invalidate) {
    	let paramId;
    	let isAdding;
    	let inputWidth;
    	let inputHeight;
    	let hasChanges;
    	let numFrames;
    	let isBlockSize;
    	let $project;
    	let $autoSaveStore;
    	validate_store(project, "project");
    	component_subscribe($$self, project, $$value => $$invalidate(4, $project = $$value));
    	validate_store(autoSaveStore, "autoSaveStore");
    	component_subscribe($$self, autoSaveStore, $$value => $$invalidate(18, $autoSaveStore = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ArtBuilder", slots, []);
    	let { params = {} } = $$props;
    	let input = createDefaultInput$4();
    	let mode = "paint";
    	let undos = [];
    	let redos = [];
    	let mouseDown = false;
    	let showGrid = true;
    	let selectedColor = "rgba(0, 0, 0, 255)";
    	let selectedAutoSave = null;

    	// we load the png into this canvas
    	// and when user draws on the big canvas, we actually make the change on the scaled down canvas, and then re-render the larger canvas from this one
    	// (if we make a change to the larger canvas, it gets blurry when scaling back down)
    	const pngCanvas = document.createElement("canvas");

    	const pngContext = pngCanvas.getContext("2d");

    	// we render a scaled up version to this canvas for user to interact with
    	let drawCanvas;

    	let drawContext;
    	let zoom = 15;

    	// we render grid lines to this canvas
    	let gridCanvas;

    	let gridContext;
    	let changeSize = { width: 0, height: 0 };
    	const debouncedRedraw = debounce(() => redraw(), 200);
    	onMount(() => redraw());

    	function create() {
    		$$invalidate(0, input = createDefaultInput$4());
    		redraw();
    	}

    	function edit(name) {
    		if (!$project.art.hasOwnProperty(name)) return;
    		$$invalidate(6, undos = []);
    		$$invalidate(7, redos = []);

    		$$invalidate(0, input = {
    			...createDefaultInput$4(),
    			...JSON.parse(JSON.stringify($project.art[name]))
    		});

    		redraw();
    	}

    	function loadAutoSave(saveData) {
    		$$invalidate(0, input = JSON.parse(JSON.stringify(saveData)));
    		$$invalidate(9, selectedAutoSave = null);
    		redraw();
    	}

    	function save() {
    		if (validator.empty(input.name)) {
    			document.getElementById("name").focus();
    			return;
    		}

    		if (isAdding) $$invalidate(0, input.id = getNextId($project.art), input);
    		set_store_value(project, $project.art[input.id] = JSON.parse(JSON.stringify(input)), $project);
    		push(`/art/${encodeURIComponent(input.id)}`);
    	}

    	function del() {
    		if (confirm(`Are you sure you want to delete "${input.name}"?`)) {
    			delete $project.art[input.id];
    			project.set($project);
    			push(`/art/new`);
    		}
    	}

    	function reset(undoable = true) {
    		if (undoable) addUndoState();
    		$$invalidate(0, input.png = null, input);
    		redraw();
    	}

    	function onDrawPointerDown(e) {
    		const { x, y } = getScaledEventCoordinates(e);
    		const color = getColorAt(x, y);

    		if (e.altKey || e.button !== 0) {
    			if (color == "transparent") {
    				$$invalidate(5, mode = "erase");
    				$$invalidate(8, selectedColor = "transparent");
    			} else {
    				$$invalidate(5, mode = "paint");
    				$$invalidate(8, selectedColor = color);
    			}
    		} else {
    			addUndoState();
    			mouseDown = true;
    			onDrawPointerMove(e);
    		}
    	}

    	function onDrawPointerUp(e) {
    		mouseDown = false;
    	} // lastDrawnCoordinates = null

    	let lastDrawnCoordinates = null;

    	function onDrawPointerMove(e) {
    		if (!mouseDown) return;
    		const { x, y } = getScaledEventCoordinates(e);

    		if (y != null && x != null) {
    			if (mode == "erase") setPixel(x, y, "transparent"); else setPixel(x, y, selectedColor);
    			// so we don't get spotty drawing if they're moving cursor too fast for an event to happen for every pixel

    			// connectPixels(lastDrawnCoordinates.x, lastDrawnCoordinates.y, x, y, selectedColor)
    			lastDrawnCoordinates = { x, y };
    		}
    	}

    	function onKeyUp(e) {
    		switch (e.code) {
    			case "KeyZ":
    				if (e.ctrlKey) undo();
    				break;
    			case "KeyY":
    				if (e.ctrlKey) redo();
    				break;
    		}
    	}

    	function onPaste(e) {
    		const items = (e.clipboardData || e.originalEvent.clipboardData).items;

    		for (let index in items) {
    			const item = items[index];

    			if (item.kind === "file") {
    				const blob = item.getAsFile();
    				const reader = new FileReader();

    				reader.onload = function (event) {
    					const image = new Image();
    					image.src = event.target.result;

    					image.onload = () => {
    						$$invalidate(0, input.width = image.width, input);
    						$$invalidate(0, input.height = image.height, input);
    						$$invalidate(0, input.png = event.target.result, input);
    						redraw();
    					};
    				};

    				// data url!
    				// callback(blob)
    				reader.readAsDataURL(blob);
    			}
    		}
    	}

    	function getColorAt(x, y) {
    		return toRGB(pngContext.getImageData(x, y, 1, 1).data);
    	}

    	function getScaledEventCoordinates(e) {
    		const x = e.offsetX + e.target.scrollLeft;
    		const y = e.offsetY + e.target.scrollTop;

    		// debugger
    		return {
    			x: Math.floor(x / zoom),
    			y: Math.floor(y / zoom)
    		};
    	}

    	function addUndoState() {
    		$$invalidate(6, undos = [...undos.slice(Math.max(undos.length - 20, 0)), JSON.stringify(input)]);

    		// if we're adding a new undo state, empty redos
    		$$invalidate(7, redos = []);

    		// auto save
    		// todo consider making undo/redo store local storaged?
    		set_store_value(
    			autoSaveStore,
    			$autoSaveStore[input.name] = [
    				JSON.parse(JSON.stringify(input)),
    				...($autoSaveStore[input.name] || []).slice(0, 10)
    			],
    			$autoSaveStore
    		);
    	}

    	function undo() {
    		if (undos.length == 0) return;
    		$$invalidate(7, redos = [...redos, JSON.stringify(input)]);
    		$$invalidate(0, input = { ...input, ...JSON.parse(undos.pop()) });
    		$$invalidate(6, undos);
    		redraw();
    	}

    	function redo() {
    		if (redos.length == 0) return;
    		$$invalidate(6, undos = [...undos, JSON.stringify(input)]);
    		$$invalidate(0, input = { ...input, ...JSON.parse(redos.pop()) });
    		$$invalidate(7, redos);
    		redraw();
    	}

    	function setPixel(x, y, color, recursing = false) {
    		const oldColor = getColorAt(x, y);
    		drawSquare(pngContext, x, y, 1, color);
    		drawSquare(drawContext, x * zoom, y * zoom, zoom, color);

    		if (mode == "fill") {
    			// recursively loop around this pixel setting pixels that were the same color this one used to be to the new color
    			// needs revision
    			// right now it works well for filling outlines, but overfills through outlines that only touch on corners
    			const coords = [{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }].map(c => ({ xn: x + c.x, yn: y + c.y }));

    			for (let c of coords) {
    				if (c.yn < 0 || c.yn > input.height - 1 || c.xn < 0 || c.xn > input.width - 1) continue;
    				const currentColor = getColorAt(c.xn, c.yn);
    				if (currentColor == oldColor) setPixel(c.xn, c.yn, color, true);
    			}
    		} // for (let xn = x - 1; xn <= x + 1; xn += 1) {
    		// 	for (let yn = y - 1; yn <= y + 1; yn += 1) {

    		// 		if (yn < 0 || yn > input.height - 1 || xn < 0 || xn > input.width * 1 - 1) continue
    		// 		const currentColor = getColorAt(xn, yn)
    		// 		if (currentColor == oldColor) setColor(xn, yn, color, true)
    		// 	}
    		// }
    		if (!recursing) setInputFromCanvas();
    	}

    	function connectPixels(x1, y1, x2, y2, color) {
    		const xDiff = Math.abs(x1 - x2);
    		const yDiff = Math.abs(y1 - y2);

    		if (xDiff > yDiff) {
    			if (x1 > x2) [x1, x2] = [x2, x1];

    			for (let x = x1; x < x2; x++) {
    				// const y = ((x - x1) / Math.abs(y2 - y1)) * (y2 - y1) + y1
    				setPixel(x, y1, color, true);
    			}
    		} else {
    			if (y1 > y2) [y1, y2] = [y2, y1];

    			for (let y = y1; y < y2; y++) {
    				// const x = ((y - y1) / Math.abs(x2 - x1)) * (x2 - x1) + x1
    				setPixel(x1, y, color, true);
    			}
    		}

    		setInputFromCanvas();
    	}

    	function redraw() {
    		if (drawCanvas == null || gridCanvas == null) return;
    		if (drawContext == null) drawContext = drawCanvas.getContext("2d");
    		if (gridContext == null) gridContext = gridCanvas.getContext("2d");

    		// put source png onto scale canvas
    		createMemoryImage(input.png).then(image => {
    			// draw png onto scale canvas
    			let scaleWidth = image.width;

    			let scaleHeight = image.height;

    			// if png size is exactly double input size... we're just importing old data, scale it down
    			let wasOutOfScale = scaleWidth == input.width * 2 && scaleHeight == input.height * 2;

    			if (wasOutOfScale) {
    				// should be fine...
    				// use input size instead
    				scaleWidth = image.width / 2;

    				scaleHeight = image.height / 2;
    			}

    			$$invalidate(10, pngCanvas.width = input.width, pngCanvas);
    			$$invalidate(10, pngCanvas.height = input.height, pngCanvas);
    			pngContext.clearRect(0, 0, input.width, input.height);
    			$$invalidate(11, drawCanvas.width = input.width * zoom, drawCanvas);
    			$$invalidate(11, drawCanvas.height = input.height * zoom, drawCanvas);
    			drawContext.clearRect(0, 0, input.width * zoom, input.height * zoom);
    			$$invalidate(12, gridCanvas.width = input.width * zoom, gridCanvas);
    			$$invalidate(12, gridCanvas.height = input.height * zoom, gridCanvas);
    			gridContext.clearRect(0, 0, input.width * zoom, input.height * zoom);

    			// draw the png full size, even if it gets cut off
    			if (input.png != null && image != null) {
    				pngContext.drawImage(image, 0, 0, scaleWidth, scaleHeight);

    				// draw image larger on big canvas
    				drawContext.save();

    				drawContext.scale(zoom, zoom);
    				drawContext.imageSmoothingEnabled = false;
    				drawContext.drawImage(image, 0, 0);
    				drawContext.restore();
    			}

    			setInputFromCanvas();

    			if (showGrid) {
    				gridContext.strokeStyle = "rgba(255,255,255,1)";

    				for (let x = 1; x < input.width; x++) {
    					gridContext.beginPath();
    					gridContext.moveTo(x * zoom, 0);
    					gridContext.lineTo(x * zoom, input.height * zoom);
    					gridContext.stroke();
    				}

    				for (let y = 1; y < input.height; y++) {
    					gridContext.beginPath();
    					gridContext.moveTo(0, y * zoom);
    					gridContext.lineTo(input.width * zoom, y * zoom);
    					gridContext.stroke();
    				}
    			}
    		});
    	}

    	function flipY() {
    		flip(false, true);
    	}

    	function flipX() {
    		flip(true, false);
    	}

    	function moveLeft() {
    		move(-1, 0);
    	}

    	function moveRight() {
    		move(1, 0);
    	}

    	function moveUp() {
    		move(0, -1);
    	}

    	function moveDown() {
    		move(0, 1);
    	}

    	function move(dx, dy) {
    		addUndoState();
    		const data = pngContext.getImageData(0, 0, input.width, input.height);
    		pngContext.putImageData(data, dx, dy);
    		if (dx != 0) pngContext.putImageData(data, dx - dx * input.width, 0); else if (dy != 0) pngContext.putImageData(data, 0, dy - dy * input.height);
    		setInputFromCanvas();
    		redraw();
    	}

    	function flip(flipX, flipY) {
    		addUndoState();
    		setInputFromCanvas();

    		createMemoryImage(input.png).then(image => {
    			pngContext.clearRect(0, 0, input.width, input.height);
    			pngContext.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    			pngContext.drawImage(image, flipX ? input.width * -1 : 0, flipY ? input.height * -1 : 0, input.width, input.height);
    			setInputFromCanvas();
    			redraw();
    		});
    	}

    	// can't seem to get this to work
    	// function rotate(deg) {
    	// 	addUndoState()
    	// 	setInputFromCanvas()
    	// 	createMemoryImage(input.png).then(image => {
    	// 	})
    	// }
    	function setInputFromCanvas() {
    		$$invalidate(0, input.png = pngCanvas.toDataURL("image/png"), input);
    	}

    	function createMemoryImage(png) {
    		if (png == null) return Promise.resolve({ width: input.width, height: input.height });

    		return new Promise((resolve, reject) => {
    				const image = new Image();
    				image.src = input.png;
    				image.onload = () => resolve(image);
    			});
    	}

    	function removeFrame(frameIndex) {
    		addUndoState();
    		const frameStartX = frameIndex * input.frameWidth;
    		const framesAfterData = pngContext.getImageData(frameStartX + input.frameWidth, 0, input.width, input.height);
    		pngContext.clearRect(frameStartX, 0, input.width, input.height);
    		pngContext.width = input.width - input.frameWidth;
    		pngContext.putImageData(framesAfterData, frameStartX, 0);
    		setInputFromCanvas();
    		redraw();
    		$$invalidate(0, input.width -= input.frameWidth, input);
    	}

    	function copyFrame(frameIndex) {
    		addUndoState();
    		const frameStartX = frameIndex * input.frameWidth;
    		const existingFramesData = pngContext.getImageData(0, 0, input.width, input.height);
    		const frameData = pngContext.getImageData(frameStartX, 0, input.frameWidth, input.height);
    		$$invalidate(10, pngCanvas.width = pngCanvas.width + input.frameWidth, pngCanvas);

    		// changing width clears old content, so we have to re-draw old frames too
    		pngContext.putImageData(existingFramesData, 0, 0);

    		pngContext.putImageData(frameData, input.width, 0);
    		setInputFromCanvas();
    		$$invalidate(0, input.width += input.frameWidth, input);
    	}

    	function scaleUp() {
    		scale(2);
    	}

    	function scaleDown() {
    		scale(0.5);
    	}

    	function scale(s) {
    		addUndoState();

    		createMemoryImage(input.png).then(image => {
    			$$invalidate(10, pngCanvas.width = input.width * s, pngCanvas);
    			$$invalidate(10, pngCanvas.height = input.height * s, pngCanvas);
    			pngContext.scale(s, s);
    			pngContext.imageSmoothingEnabled = false;
    			pngContext.drawImage(image, 0, 0);
    			pngContext.restore();
    			setInputFromCanvas();
    			$$invalidate(0, input.width = Math.ceil(input.width * s), input);
    			$$invalidate(0, input.height = Math.ceil(input.height * s), input);
    			$$invalidate(0, input.frameWidth = Math.ceil(input.frameWidth * s), input);
    		});
    	}

    	// set frame width to width if they're turning on animation for first time
    	function animatedChanged() {
    		if (input.animated) {
    			$$invalidate(0, input.frameWidth = input.width, input);
    		}
    	}

    	function startChangeSize() {
    		$$invalidate(13, changeSize.width = input.width, changeSize);
    		$$invalidate(13, changeSize.height = input.height, changeSize);
    		$$invalidate(13, changeSize.scale = 1, changeSize);
    	}

    	function applyChangeSize() {
    		$$invalidate(0, input.width = changeSize.width, input);
    		$$invalidate(0, input.height = changeSize.height, input);
    	}

    	const writable_props = ["params"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ArtBuilder> was created with unknown prop '${key}'`);
    	});

    	function contextmenu_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function colorpicker_value_binding(value) {
    		selectedColor = value;
    		$$invalidate(8, selectedColor);
    	}

    	const change_handler = () => $$invalidate(5, mode = mode == "erase" ? "paint" : mode);
    	const click_handler = () => $$invalidate(5, mode = "paint");
    	const click_handler_1 = () => $$invalidate(5, mode = "fill");
    	const click_handler_2 = () => $$invalidate(5, mode = "erase");

    	function input0_input_handler() {
    		changeSize.width = to_number(this.value);
    		$$invalidate(13, changeSize);
    	}

    	function input1_input_handler() {
    		changeSize.height = to_number(this.value);
    		$$invalidate(13, changeSize);
    	}

    	function inputselect0_value_binding(value) {
    		zoom = value;
    		$$invalidate(2, zoom);
    	}

    	function input_1_change_handler() {
    		showGrid = this.checked;
    		$$invalidate(1, showGrid);
    	}

    	function inputselect1_value_binding(value) {
    		selectedAutoSave = value;
    		$$invalidate(9, selectedAutoSave);
    	}

    	const change_handler_1 = e => loadAutoSave(e.detail);

    	function canvas0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			drawCanvas = $$value;
    			$$invalidate(11, drawCanvas);
    		});
    	}

    	function canvas1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			gridCanvas = $$value;
    			$$invalidate(12, gridCanvas);
    		});
    	}

    	function fieldtext_value_binding(value) {
    		if ($$self.$$.not_equal(input.name, value)) {
    			input.name = value;
    			$$invalidate(0, input);
    		}
    	}

    	function fieldcheckbox_checked_binding(value) {
    		if ($$self.$$.not_equal(input.animated, value)) {
    			input.animated = value;
    			$$invalidate(0, input);
    		}
    	}

    	function fieldnumber0_value_binding(value) {
    		if ($$self.$$.not_equal(input.frameWidth, value)) {
    			input.frameWidth = value;
    			$$invalidate(0, input);
    		}
    	}

    	function fieldnumber1_value_binding(value) {
    		if ($$self.$$.not_equal(input.frameRate, value)) {
    			input.frameRate = value;
    			$$invalidate(0, input);
    		}
    	}

    	function fieldcheckbox_checked_binding_1(value) {
    		if ($$self.$$.not_equal(input.yoyo, value)) {
    			input.yoyo = value;
    			$$invalidate(0, input);
    		}
    	}

    	const click_handler_3 = frameNumber => removeFrame(frameNumber);
    	const click_handler_4 = frameNumber => copyFrame(frameNumber);

    	$$self.$$set = $$props => {
    		if ("params" in $$props) $$invalidate(43, params = $$props.params);
    	};

    	$$self.$capture_state = () => ({
    		arrowLeftIcon,
    		arrowRightIcon,
    		arrowUpIcon,
    		arrowDownIcon,
    		undoIcon,
    		eraseIcon,
    		deleteIcon,
    		copyIcon,
    		zoomIcon,
    		minusIcon,
    		plusIcon,
    		fillIcon: faFillDrip,
    		paintIcon: faPaintBrush,
    		flipIcon: faExchangeAlt,
    		getNextId,
    		onMount,
    		push,
    		AnimationPreview,
    		AppLayout,
    		ArtThumb,
    		autoSaveStore,
    		ColorPicker,
    		debounce,
    		FieldCheckbox,
    		FieldNumber,
    		Form,
    		Icon,
    		FieldText,
    		InputSelect,
    		ItemListNav,
    		project,
    		QuickDropdown,
    		validator,
    		params,
    		input,
    		mode,
    		undos,
    		redos,
    		mouseDown,
    		showGrid,
    		selectedColor,
    		selectedAutoSave,
    		pngCanvas,
    		pngContext,
    		artScale,
    		drawCanvas,
    		drawContext,
    		zoom,
    		gridCanvas,
    		gridContext,
    		changeSize,
    		debouncedRedraw,
    		create,
    		createDefaultInput: createDefaultInput$4,
    		edit,
    		loadAutoSave,
    		save,
    		del,
    		reset,
    		onDrawPointerDown,
    		onDrawPointerUp,
    		lastDrawnCoordinates,
    		onDrawPointerMove,
    		onKeyUp,
    		onPaste,
    		getColorAt,
    		getScaledEventCoordinates,
    		toRGB,
    		addUndoState,
    		undo,
    		redo,
    		setPixel,
    		connectPixels,
    		drawSquare,
    		redraw,
    		flipY,
    		flipX,
    		moveLeft,
    		moveRight,
    		moveUp,
    		moveDown,
    		rotateLeft,
    		rotateRight,
    		move,
    		flip,
    		setInputFromCanvas,
    		createMemoryImage,
    		removeFrame,
    		copyFrame,
    		scaleUp,
    		scaleDown,
    		scale,
    		animatedChanged,
    		startChangeSize,
    		applyChangeSize,
    		paramId,
    		isAdding,
    		inputWidth,
    		inputHeight,
    		hasChanges,
    		$project,
    		numFrames,
    		isBlockSize,
    		$autoSaveStore
    	});

    	$$self.$inject_state = $$props => {
    		if ("params" in $$props) $$invalidate(43, params = $$props.params);
    		if ("input" in $$props) $$invalidate(0, input = $$props.input);
    		if ("mode" in $$props) $$invalidate(5, mode = $$props.mode);
    		if ("undos" in $$props) $$invalidate(6, undos = $$props.undos);
    		if ("redos" in $$props) $$invalidate(7, redos = $$props.redos);
    		if ("mouseDown" in $$props) mouseDown = $$props.mouseDown;
    		if ("showGrid" in $$props) $$invalidate(1, showGrid = $$props.showGrid);
    		if ("selectedColor" in $$props) $$invalidate(8, selectedColor = $$props.selectedColor);
    		if ("selectedAutoSave" in $$props) $$invalidate(9, selectedAutoSave = $$props.selectedAutoSave);
    		if ("drawCanvas" in $$props) $$invalidate(11, drawCanvas = $$props.drawCanvas);
    		if ("drawContext" in $$props) drawContext = $$props.drawContext;
    		if ("zoom" in $$props) $$invalidate(2, zoom = $$props.zoom);
    		if ("gridCanvas" in $$props) $$invalidate(12, gridCanvas = $$props.gridCanvas);
    		if ("gridContext" in $$props) gridContext = $$props.gridContext;
    		if ("changeSize" in $$props) $$invalidate(13, changeSize = $$props.changeSize);
    		if ("lastDrawnCoordinates" in $$props) lastDrawnCoordinates = $$props.lastDrawnCoordinates;
    		if ("paramId" in $$props) $$invalidate(3, paramId = $$props.paramId);
    		if ("isAdding" in $$props) $$invalidate(14, isAdding = $$props.isAdding);
    		if ("inputWidth" in $$props) $$invalidate(44, inputWidth = $$props.inputWidth);
    		if ("inputHeight" in $$props) $$invalidate(45, inputHeight = $$props.inputHeight);
    		if ("hasChanges" in $$props) $$invalidate(15, hasChanges = $$props.hasChanges);
    		if ("numFrames" in $$props) $$invalidate(16, numFrames = $$props.numFrames);
    		if ("isBlockSize" in $$props) $$invalidate(17, isBlockSize = $$props.isBlockSize);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[1] & /*params*/ 4096) {
    			$$invalidate(3, paramId = decodeURIComponent(params.id) || "new");
    		}

    		if ($$self.$$.dirty[0] & /*paramId*/ 8) {
    			paramId == "new" ? create() : edit(paramId);
    		}

    		if ($$self.$$.dirty[0] & /*input*/ 1) {
    			$$invalidate(14, isAdding = input.id == null);
    		}

    		if ($$self.$$.dirty[0] & /*input*/ 1) {
    			$$invalidate(44, inputWidth = input.width);
    		}

    		if ($$self.$$.dirty[0] & /*input*/ 1) {
    			$$invalidate(45, inputHeight = input.height);
    		}

    		if ($$self.$$.dirty[0] & /*input, $project*/ 17) {
    			$$invalidate(15, hasChanges = !validator.equals(input, $project.art[input.id]));
    		}

    		if ($$self.$$.dirty[0] & /*input*/ 1) {
    			$$invalidate(16, numFrames = input.width != null && input.frameWidth != null
    			? Math.ceil(input.width / input.frameWidth)
    			: 0);
    		}

    		if ($$self.$$.dirty[0] & /*showGrid, zoom*/ 6 | $$self.$$.dirty[1] & /*inputWidth, inputHeight*/ 24576) {
    			if (inputWidth != 0 && inputHeight != 0 && showGrid != null && zoom != null) debouncedRedraw();
    		}

    		if ($$self.$$.dirty[0] & /*input*/ 1) {
    			$$invalidate(17, isBlockSize = input.height == 40 && (input.width == 40 || input.animated && input.frameWidth == 40));
    		}
    	};

    	return [
    		input,
    		showGrid,
    		zoom,
    		paramId,
    		$project,
    		mode,
    		undos,
    		redos,
    		selectedColor,
    		selectedAutoSave,
    		pngCanvas,
    		drawCanvas,
    		gridCanvas,
    		changeSize,
    		isAdding,
    		hasChanges,
    		numFrames,
    		isBlockSize,
    		$autoSaveStore,
    		loadAutoSave,
    		save,
    		del,
    		reset,
    		onDrawPointerDown,
    		onDrawPointerUp,
    		onDrawPointerMove,
    		onKeyUp,
    		onPaste,
    		undo,
    		redo,
    		flipY,
    		flipX,
    		moveLeft,
    		moveRight,
    		moveUp,
    		moveDown,
    		removeFrame,
    		copyFrame,
    		scaleUp,
    		scaleDown,
    		animatedChanged,
    		startChangeSize,
    		applyChangeSize,
    		params,
    		inputWidth,
    		inputHeight,
    		contextmenu_handler,
    		colorpicker_value_binding,
    		change_handler,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		input0_input_handler,
    		input1_input_handler,
    		inputselect0_value_binding,
    		input_1_change_handler,
    		inputselect1_value_binding,
    		change_handler_1,
    		canvas0_binding,
    		canvas1_binding,
    		fieldtext_value_binding,
    		fieldcheckbox_checked_binding,
    		fieldnumber0_value_binding,
    		fieldnumber1_value_binding,
    		fieldcheckbox_checked_binding_1,
    		click_handler_3,
    		click_handler_4
    	];
    }

    class ArtBuilder extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$g, create_fragment$g, safe_not_equal, { params: 43 }, [-1, -1, -1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ArtBuilder",
    			options,
    			id: create_fragment$g.name
    		});
    	}

    	get params() {
    		throw new Error("<ArtBuilder>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set params(value) {
    		throw new Error("<ArtBuilder>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\pages\ParticleBuilder.svelte generated by Svelte v3.38.3 */
    const file$e = "src\\pages\\ParticleBuilder.svelte";

    // (3:4) <ItemListNav slug="particles" type="particles" collection={$project.particles} active={paramId} let:item>
    function create_default_slot_1$5(ctx) {
    	let artthumb;
    	let t0;
    	let t1_value = /*item*/ ctx[3].name + "";
    	let t1;
    	let current;

    	artthumb = new ArtThumb({
    			props: { id: /*item*/ ctx[3].graphic },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(artthumb.$$.fragment);
    			t0 = space();
    			t1 = text(t1_value);
    		},
    		m: function mount(target, anchor) {
    			mount_component(artthumb, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const artthumb_changes = {};
    			if (dirty & /*item*/ 8) artthumb_changes.id = /*item*/ ctx[3].graphic;
    			artthumb.$set(artthumb_changes);
    			if ((!current || dirty & /*item*/ 8) && t1_value !== (t1_value = /*item*/ ctx[3].name + "")) set_data_dev(t1, t1_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(artthumb.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(artthumb.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(artthumb, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$5.name,
    		type: "slot",
    		source: "(3:4) <ItemListNav slug=\\\"particles\\\" type=\\\"particles\\\" collection={$project.particles} active={paramId} let:item>",
    		ctx
    	});

    	return block;
    }

    // (1:0) <AppLayout active="particles">
    function create_default_slot$b(ctx) {
    	let div0;
    	let itemlistnav;
    	let t0;
    	let div1;
    	let t2;
    	let div2;
    	let current;

    	itemlistnav = new ItemListNav({
    			props: {
    				slug: "particles",
    				type: "particles",
    				collection: /*$project*/ ctx[1].particles,
    				active: /*paramId*/ ctx[0],
    				$$slots: {
    					default: [
    						create_default_slot_1$5,
    						({ item }) => ({ 3: item }),
    						({ item }) => item ? 8 : 0
    					]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			create_component(itemlistnav.$$.fragment);
    			t0 = space();
    			div1 = element("div");
    			div1.textContent = "Form fields";
    			t2 = space();
    			div2 = element("div");
    			div2.textContent = "Preview effect";
    			attr_dev(div0, "class", "col1");
    			add_location(div0, file$e, 1, 2, 34);
    			attr_dev(div1, "class", "grow p1");
    			add_location(div1, file$e, 7, 2, 254);
    			attr_dev(div2, "class", "col2");
    			add_location(div2, file$e, 8, 2, 296);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			mount_component(itemlistnav, div0, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div2, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const itemlistnav_changes = {};
    			if (dirty & /*$project*/ 2) itemlistnav_changes.collection = /*$project*/ ctx[1].particles;
    			if (dirty & /*paramId*/ 1) itemlistnav_changes.active = /*paramId*/ ctx[0];

    			if (dirty & /*$$scope, item*/ 24) {
    				itemlistnav_changes.$$scope = { dirty, ctx };
    			}

    			itemlistnav.$set(itemlistnav_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(itemlistnav.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(itemlistnav.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			destroy_component(itemlistnav);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$b.name,
    		type: "slot",
    		source: "(1:0) <AppLayout active=\\\"particles\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$f(ctx) {
    	let applayout;
    	let current;

    	applayout = new AppLayout({
    			props: {
    				active: "particles",
    				$$slots: { default: [create_default_slot$b] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(applayout.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(applayout, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const applayout_changes = {};

    			if (dirty & /*$$scope, $project, paramId*/ 19) {
    				applayout_changes.$$scope = { dirty, ctx };
    			}

    			applayout.$set(applayout_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(applayout.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(applayout.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(applayout, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$f($$self, $$props, $$invalidate) {
    	let paramId;
    	let $project;
    	validate_store(project, "project");
    	component_subscribe($$self, project, $$value => $$invalidate(1, $project = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ParticleBuilder", slots, []);
    	let { params = {} } = $$props;
    	const writable_props = ["params"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ParticleBuilder> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("params" in $$props) $$invalidate(2, params = $$props.params);
    	};

    	$$self.$capture_state = () => ({
    		AppLayout,
    		ArtThumb,
    		ItemListNav,
    		project,
    		params,
    		paramId,
    		$project
    	});

    	$$self.$inject_state = $$props => {
    		if ("params" in $$props) $$invalidate(2, params = $$props.params);
    		if ("paramId" in $$props) $$invalidate(0, paramId = $$props.paramId);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*params*/ 4) {
    			$$invalidate(0, paramId = decodeURIComponent(params.id) || "new");
    		}
    	};

    	return [paramId, $project, params];
    }

    class ParticleBuilder extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, { params: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ParticleBuilder",
    			options,
    			id: create_fragment$f.name
    		});
    	}

    	get params() {
    		throw new Error("<ParticleBuilder>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set params(value) {
    		throw new Error("<ParticleBuilder>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\FieldArtPicker.svelte generated by Svelte v3.38.3 */

    const { Object: Object_1$4 } = globals;
    const file$d = "src\\components\\FieldArtPicker.svelte";

    // (6:4) <InputSelect inline {name} bind:value let:option {options} filterable={options.length > 3} {placeholder}>
    function create_default_slot$a(ctx) {
    	let artthumb;
    	let t0;
    	let t1_value = /*option*/ ctx[8].name + "";
    	let t1;
    	let current;

    	artthumb = new ArtThumb({
    			props: { id: /*option*/ ctx[8].id },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(artthumb.$$.fragment);
    			t0 = space();
    			t1 = text(t1_value);
    		},
    		m: function mount(target, anchor) {
    			mount_component(artthumb, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const artthumb_changes = {};
    			if (dirty & /*option*/ 256) artthumb_changes.id = /*option*/ ctx[8].id;
    			artthumb.$set(artthumb_changes);
    			if ((!current || dirty & /*option*/ 256) && t1_value !== (t1_value = /*option*/ ctx[8].name + "")) set_data_dev(t1, t1_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(artthumb.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(artthumb.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(artthumb, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$a.name,
    		type: "slot",
    		source: "(6:4) <InputSelect inline {name} bind:value let:option {options} filterable={options.length > 3} {placeholder}>",
    		ctx
    	});

    	return block;
    }

    // (11:2) {#if value != null}
    function create_if_block$5(ctx) {
    	let a;
    	let t0;
    	let t1_value = /*$project*/ ctx[3].art[/*value*/ ctx[0]].name + "";
    	let t1;
    	let t2;
    	let a_href_value;

    	const block = {
    		c: function create() {
    			a = element("a");
    			t0 = text("Edit ");
    			t1 = text(t1_value);
    			t2 = text(" art");
    			attr_dev(a, "href", a_href_value = "#/art/" + /*value*/ ctx[0]);
    			attr_dev(a, "class", "ml-1");
    			add_location(a, file$d, 11, 4, 296);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t0);
    			append_dev(a, t1);
    			append_dev(a, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$project, value*/ 9 && t1_value !== (t1_value = /*$project*/ ctx[3].art[/*value*/ ctx[0]].name + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*value*/ 1 && a_href_value !== (a_href_value = "#/art/" + /*value*/ ctx[0])) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(11:2) {#if value != null}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$e(ctx) {
    	let div1;
    	let label;
    	let t0;
    	let div0;
    	let inputselect;
    	let updating_value;
    	let t1;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[7], null);

    	function inputselect_value_binding(value) {
    		/*inputselect_value_binding*/ ctx[6](value);
    	}

    	let inputselect_props = {
    		inline: true,
    		name: /*name*/ ctx[1],
    		options: /*options*/ ctx[4],
    		filterable: /*options*/ ctx[4].length > 3,
    		placeholder: /*placeholder*/ ctx[2],
    		$$slots: {
    			default: [
    				create_default_slot$a,
    				({ option }) => ({ 8: option }),
    				({ option }) => option ? 256 : 0
    			]
    		},
    		$$scope: { ctx }
    	};

    	if (/*value*/ ctx[0] !== void 0) {
    		inputselect_props.value = /*value*/ ctx[0];
    	}

    	inputselect = new InputSelect({ props: inputselect_props, $$inline: true });
    	binding_callbacks.push(() => bind(inputselect, "value", inputselect_value_binding));
    	let if_block = /*value*/ ctx[0] != null && create_if_block$5(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			label = element("label");
    			if (default_slot) default_slot.c();
    			t0 = space();
    			div0 = element("div");
    			create_component(inputselect.$$.fragment);
    			t1 = space();
    			if (if_block) if_block.c();
    			add_location(label, file$d, 1, 2, 28);
    			add_location(div0, file$d, 4, 2, 65);
    			attr_dev(div1, "class", "form-group");
    			add_location(div1, file$d, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, label);

    			if (default_slot) {
    				default_slot.m(label, null);
    			}

    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			mount_component(inputselect, div0, null);
    			append_dev(div1, t1);
    			if (if_block) if_block.m(div1, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 128)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[7], !current ? -1 : dirty, null, null);
    				}
    			}

    			const inputselect_changes = {};
    			if (dirty & /*name*/ 2) inputselect_changes.name = /*name*/ ctx[1];
    			if (dirty & /*options*/ 16) inputselect_changes.options = /*options*/ ctx[4];
    			if (dirty & /*options*/ 16) inputselect_changes.filterable = /*options*/ ctx[4].length > 3;
    			if (dirty & /*placeholder*/ 4) inputselect_changes.placeholder = /*placeholder*/ ctx[2];

    			if (dirty & /*$$scope, option*/ 384) {
    				inputselect_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*value*/ 1) {
    				updating_value = true;
    				inputselect_changes.value = /*value*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			inputselect.$set(inputselect_changes);

    			if (/*value*/ ctx[0] != null) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$5(ctx);
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			transition_in(inputselect.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			transition_out(inputselect.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (default_slot) default_slot.d(detaching);
    			destroy_component(inputselect);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let options;
    	let $project;
    	validate_store(project, "project");
    	component_subscribe($$self, project, $$value => $$invalidate(3, $project = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("FieldArtPicker", slots, ['default']);
    	let { value = null } = $$props;
    	let { name = "art-picker" } = $$props;
    	let { placeholder = "Select art" } = $$props;
    	const writable_props = ["value", "name", "placeholder"];

    	Object_1$4.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FieldArtPicker> was created with unknown prop '${key}'`);
    	});

    	function inputselect_value_binding(value$1) {
    		value = value$1;
    		$$invalidate(0, value);
    	}

    	$$self.$$set = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    		if ("placeholder" in $$props) $$invalidate(2, placeholder = $$props.placeholder);
    		if ("$$scope" in $$props) $$invalidate(7, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		sortByName,
    		project,
    		InputSelect,
    		ArtThumb,
    		value,
    		name,
    		placeholder,
    		options,
    		$project
    	});

    	$$self.$inject_state = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    		if ("placeholder" in $$props) $$invalidate(2, placeholder = $$props.placeholder);
    		if ("options" in $$props) $$invalidate(4, options = $$props.options);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$project*/ 8) {
    			$$invalidate(4, options = Object.values($project.art).map(a => ({ ...a, value: a.id })).sort(sortByName));
    		}
    	};

    	return [
    		value,
    		name,
    		placeholder,
    		$project,
    		options,
    		slots,
    		inputselect_value_binding,
    		$$scope
    	];
    }

    class FieldArtPicker extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, { value: 0, name: 1, placeholder: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FieldArtPicker",
    			options,
    			id: create_fragment$e.name
    		});
    	}

    	get value() {
    		throw new Error("<FieldArtPicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<FieldArtPicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get name() {
    		throw new Error("<FieldArtPicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<FieldArtPicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get placeholder() {
    		throw new Error("<FieldArtPicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set placeholder(value) {
    		throw new Error("<FieldArtPicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\ParticlesPicker.svelte generated by Svelte v3.38.3 */

    const { Object: Object_1$3 } = globals;
    const file$c = "src\\components\\ParticlesPicker.svelte";

    // (3:4) {#if option.graphic}
    function create_if_block_1$2(ctx) {
    	let artthumb;
    	let current;

    	artthumb = new ArtThumb({
    			props: { id: /*option*/ ctx[6].graphic },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(artthumb.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(artthumb, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const artthumb_changes = {};
    			if (dirty & /*option*/ 64) artthumb_changes.id = /*option*/ ctx[6].graphic;
    			artthumb.$set(artthumb_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(artthumb.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(artthumb.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(artthumb, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(3:4) {#if option.graphic}",
    		ctx
    	});

    	return block;
    }

    // (2:2) <InputSelect inline {name} bind:value let:option {options} filterable={options.length > 3} {placeholder}>
    function create_default_slot$9(ctx) {
    	let t0;
    	let t1_value = /*option*/ ctx[6].name + "";
    	let t1;
    	let current;
    	let if_block = /*option*/ ctx[6].graphic && create_if_block_1$2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			t0 = space();
    			t1 = text(t1_value);
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*option*/ ctx[6].graphic) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*option*/ 64) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_1$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t0.parentNode, t0);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if ((!current || dirty & /*option*/ 64) && t1_value !== (t1_value = /*option*/ ctx[6].name + "")) set_data_dev(t1, t1_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$9.name,
    		type: "slot",
    		source: "(2:2) <InputSelect inline {name} bind:value let:option {options} filterable={options.length > 3} {placeholder}>",
    		ctx
    	});

    	return block;
    }

    // (9:0) {#if value != null}
    function create_if_block$4(ctx) {
    	let a;
    	let t0;
    	let t1_value = /*$project*/ ctx[3].particles[/*value*/ ctx[0]].name + "";
    	let t1;
    	let t2;
    	let a_href_value;

    	const block = {
    		c: function create() {
    			a = element("a");
    			t0 = text("Edit ");
    			t1 = text(t1_value);
    			t2 = text(" particles");
    			attr_dev(a, "href", a_href_value = "#/particles/" + /*value*/ ctx[0]);
    			attr_dev(a, "class", "ml-1");
    			add_location(a, file$c, 9, 2, 261);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t0);
    			append_dev(a, t1);
    			append_dev(a, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$project, value*/ 9 && t1_value !== (t1_value = /*$project*/ ctx[3].particles[/*value*/ ctx[0]].name + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*value*/ 1 && a_href_value !== (a_href_value = "#/particles/" + /*value*/ ctx[0])) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(9:0) {#if value != null}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$d(ctx) {
    	let div;
    	let inputselect;
    	let updating_value;
    	let t;
    	let if_block_anchor;
    	let current;

    	function inputselect_value_binding(value) {
    		/*inputselect_value_binding*/ ctx[5](value);
    	}

    	let inputselect_props = {
    		inline: true,
    		name: /*name*/ ctx[1],
    		options: /*options*/ ctx[4],
    		filterable: /*options*/ ctx[4].length > 3,
    		placeholder: /*placeholder*/ ctx[2],
    		$$slots: {
    			default: [
    				create_default_slot$9,
    				({ option }) => ({ 6: option }),
    				({ option }) => option ? 64 : 0
    			]
    		},
    		$$scope: { ctx }
    	};

    	if (/*value*/ ctx[0] !== void 0) {
    		inputselect_props.value = /*value*/ ctx[0];
    	}

    	inputselect = new InputSelect({ props: inputselect_props, $$inline: true });
    	binding_callbacks.push(() => bind(inputselect, "value", inputselect_value_binding));
    	let if_block = /*value*/ ctx[0] != null && create_if_block$4(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(inputselect.$$.fragment);
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			add_location(div, file$c, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(inputselect, div, null);
    			insert_dev(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const inputselect_changes = {};
    			if (dirty & /*name*/ 2) inputselect_changes.name = /*name*/ ctx[1];
    			if (dirty & /*options*/ 16) inputselect_changes.options = /*options*/ ctx[4];
    			if (dirty & /*options*/ 16) inputselect_changes.filterable = /*options*/ ctx[4].length > 3;
    			if (dirty & /*placeholder*/ 4) inputselect_changes.placeholder = /*placeholder*/ ctx[2];

    			if (dirty & /*$$scope, option*/ 192) {
    				inputselect_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*value*/ 1) {
    				updating_value = true;
    				inputselect_changes.value = /*value*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			inputselect.$set(inputselect_changes);

    			if (/*value*/ ctx[0] != null) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$4(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(inputselect.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(inputselect.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(inputselect);
    			if (detaching) detach_dev(t);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let options;
    	let $project;
    	validate_store(project, "project");
    	component_subscribe($$self, project, $$value => $$invalidate(3, $project = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ParticlesPicker", slots, []);
    	let { value = null } = $$props;
    	let { name = "particles-picker" } = $$props;
    	let { placeholder = "Select particles" } = $$props;
    	const writable_props = ["value", "name", "placeholder"];

    	Object_1$3.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ParticlesPicker> was created with unknown prop '${key}'`);
    	});

    	function inputselect_value_binding(value$1) {
    		value = value$1;
    		$$invalidate(0, value);
    	}

    	$$self.$$set = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    		if ("placeholder" in $$props) $$invalidate(2, placeholder = $$props.placeholder);
    	};

    	$$self.$capture_state = () => ({
    		sortByName,
    		ArtThumb,
    		project,
    		InputSelect,
    		value,
    		name,
    		placeholder,
    		options,
    		$project
    	});

    	$$self.$inject_state = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    		if ("placeholder" in $$props) $$invalidate(2, placeholder = $$props.placeholder);
    		if ("options" in $$props) $$invalidate(4, options = $$props.options);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$project*/ 8) {
    			$$invalidate(4, options = [
    				{ value: null, name: "No particles" },
    				...Object.values($project.particles).map(p => ({ ...p, value: p.id })).sort(sortByName)
    			]);
    		}
    	};

    	return [value, name, placeholder, $project, options, inputselect_value_binding];
    }

    class ParticlesPicker extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, { value: 0, name: 1, placeholder: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ParticlesPicker",
    			options,
    			id: create_fragment$d.name
    		});
    	}

    	get value() {
    		throw new Error("<ParticlesPicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<ParticlesPicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get name() {
    		throw new Error("<ParticlesPicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<ParticlesPicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get placeholder() {
    		throw new Error("<ParticlesPicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set placeholder(value) {
    		throw new Error("<ParticlesPicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\FieldParticles.svelte generated by Svelte v3.38.3 */
    const file$b = "src\\components\\FieldParticles.svelte";

    // (3:10) Particles
    function fallback_block$2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Particles");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block$2.name,
    		type: "fallback",
    		source: "(3:10) Particles",
    		ctx
    	});

    	return block;
    }

    function create_fragment$c(ctx) {
    	let div;
    	let label;
    	let t;
    	let particlespicker;
    	let updating_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);
    	const default_slot_or_fallback = default_slot || fallback_block$2(ctx);

    	function particlespicker_value_binding(value) {
    		/*particlespicker_value_binding*/ ctx[4](value);
    	}

    	let particlespicker_props = { name: /*name*/ ctx[1] };

    	if (/*value*/ ctx[0] !== void 0) {
    		particlespicker_props.value = /*value*/ ctx[0];
    	}

    	particlespicker = new ParticlesPicker({
    			props: particlespicker_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(particlespicker, "value", particlespicker_value_binding));

    	const block = {
    		c: function create() {
    			div = element("div");
    			label = element("label");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			t = space();
    			create_component(particlespicker.$$.fragment);
    			add_location(label, file$b, 1, 2, 28);
    			attr_dev(div, "class", "form-group");
    			add_location(div, file$b, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, label);

    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(label, null);
    			}

    			append_dev(div, t);
    			mount_component(particlespicker, div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], !current ? -1 : dirty, null, null);
    				}
    			}

    			const particlespicker_changes = {};
    			if (dirty & /*name*/ 2) particlespicker_changes.name = /*name*/ ctx[1];

    			if (!updating_value && dirty & /*value*/ 1) {
    				updating_value = true;
    				particlespicker_changes.value = /*value*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			particlespicker.$set(particlespicker_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			transition_in(particlespicker.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot_or_fallback, local);
    			transition_out(particlespicker.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    			destroy_component(particlespicker);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("FieldParticles", slots, ['default']);
    	let { value = null } = $$props;
    	let { name = "particles-picker" } = $$props;
    	const writable_props = ["value", "name"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FieldParticles> was created with unknown prop '${key}'`);
    	});

    	function particlespicker_value_binding(value$1) {
    		value = value$1;
    		$$invalidate(0, value);
    	}

    	$$self.$$set = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ ParticlesPicker, value, name });

    	$$self.$inject_state = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [value, name, $$scope, slots, particlespicker_value_binding];
    }

    class FieldParticles extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, { value: 0, name: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FieldParticles",
    			options,
    			id: create_fragment$c.name
    		});
    	}

    	get value() {
    		throw new Error("<FieldParticles>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<FieldParticles>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get name() {
    		throw new Error("<FieldParticles>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<FieldParticles>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\FieldCharacterPicker.svelte generated by Svelte v3.38.3 */

    const { Object: Object_1$2 } = globals;
    const file$a = "src\\components\\FieldCharacterPicker.svelte";

    // (3:10) Characters
    function fallback_block$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Characters");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block$1.name,
    		type: "fallback",
    		source: "(3:10) Characters",
    		ctx
    	});

    	return block;
    }

    // (6:4) <InputSelect multiple {options} bind:value let:option inline filterable={options.length > 2}>
    function create_default_slot$8(ctx) {
    	let artthumb;
    	let t0;
    	let t1_value = /*option*/ ctx[6].name + "";
    	let t1;
    	let current;

    	artthumb = new ArtThumb({
    			props: { id: /*option*/ ctx[6].graphics.moving },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(artthumb.$$.fragment);
    			t0 = space();
    			t1 = text(t1_value);
    		},
    		m: function mount(target, anchor) {
    			mount_component(artthumb, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const artthumb_changes = {};
    			if (dirty & /*option*/ 64) artthumb_changes.id = /*option*/ ctx[6].graphics.moving;
    			artthumb.$set(artthumb_changes);
    			if ((!current || dirty & /*option*/ 64) && t1_value !== (t1_value = /*option*/ ctx[6].name + "")) set_data_dev(t1, t1_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(artthumb.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(artthumb.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(artthumb, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$8.name,
    		type: "slot",
    		source: "(6:4) <InputSelect multiple {options} bind:value let:option inline filterable={options.length > 2}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$b(ctx) {
    	let div1;
    	let label;
    	let t;
    	let div0;
    	let inputselect;
    	let updating_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);
    	const default_slot_or_fallback = default_slot || fallback_block$1(ctx);

    	function inputselect_value_binding(value) {
    		/*inputselect_value_binding*/ ctx[4](value);
    	}

    	let inputselect_props = {
    		multiple: true,
    		options: /*options*/ ctx[1],
    		inline: true,
    		filterable: /*options*/ ctx[1].length > 2,
    		$$slots: {
    			default: [
    				create_default_slot$8,
    				({ option }) => ({ 6: option }),
    				({ option }) => option ? 64 : 0
    			]
    		},
    		$$scope: { ctx }
    	};

    	if (/*value*/ ctx[0] !== void 0) {
    		inputselect_props.value = /*value*/ ctx[0];
    	}

    	inputselect = new InputSelect({ props: inputselect_props, $$inline: true });
    	binding_callbacks.push(() => bind(inputselect, "value", inputselect_value_binding));

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			label = element("label");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			t = space();
    			div0 = element("div");
    			create_component(inputselect.$$.fragment);
    			attr_dev(label, "for", "graphic");
    			add_location(label, file$a, 1, 2, 28);
    			add_location(div0, file$a, 4, 2, 94);
    			attr_dev(div1, "class", "form-group");
    			add_location(div1, file$a, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, label);

    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(label, null);
    			}

    			append_dev(div1, t);
    			append_dev(div1, div0);
    			mount_component(inputselect, div0, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 32)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[5], !current ? -1 : dirty, null, null);
    				}
    			}

    			const inputselect_changes = {};
    			if (dirty & /*options*/ 2) inputselect_changes.options = /*options*/ ctx[1];
    			if (dirty & /*options*/ 2) inputselect_changes.filterable = /*options*/ ctx[1].length > 2;

    			if (dirty & /*$$scope, option*/ 96) {
    				inputselect_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*value*/ 1) {
    				updating_value = true;
    				inputselect_changes.value = /*value*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			inputselect.$set(inputselect_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			transition_in(inputselect.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot_or_fallback, local);
    			transition_out(inputselect.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    			destroy_component(inputselect);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let options;
    	let $project;
    	validate_store(project, "project");
    	component_subscribe($$self, project, $$value => $$invalidate(2, $project = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("FieldCharacterPicker", slots, ['default']);
    	let { value = [] } = $$props;
    	const writable_props = ["value"];

    	Object_1$2.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FieldCharacterPicker> was created with unknown prop '${key}'`);
    	});

    	function inputselect_value_binding(value$1) {
    		value = value$1;
    		$$invalidate(0, value);
    	}

    	$$self.$$set = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("$$scope" in $$props) $$invalidate(5, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		sortByName,
    		project,
    		ArtThumb,
    		InputSelect,
    		value,
    		options,
    		$project
    	});

    	$$self.$inject_state = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("options" in $$props) $$invalidate(1, options = $$props.options);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$project*/ 4) {
    			$$invalidate(1, options = Object.values($project.characters).map(c => ({ ...c, value: c.id })).sort(sortByName));
    		}
    	};

    	return [value, options, $project, slots, inputselect_value_binding, $$scope];
    }

    class FieldCharacterPicker extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, { value: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FieldCharacterPicker",
    			options,
    			id: create_fragment$b.name
    		});
    	}

    	get value() {
    		throw new Error("<FieldCharacterPicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<FieldCharacterPicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\FieldEnemyPicker.svelte generated by Svelte v3.38.3 */

    const { Object: Object_1$1 } = globals;
    const file$9 = "src\\components\\FieldEnemyPicker.svelte";

    // (3:10) Enemies
    function fallback_block(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Enemies");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block.name,
    		type: "fallback",
    		source: "(3:10) Enemies",
    		ctx
    	});

    	return block;
    }

    // (6:4) <InputSelect multiple {options} bind:value let:option inline filterable={options.length > 2}>
    function create_default_slot$7(ctx) {
    	let artthumb;
    	let t0;
    	let t1_value = /*option*/ ctx[6].name + "";
    	let t1;
    	let current;

    	artthumb = new ArtThumb({
    			props: { id: /*option*/ ctx[6].graphics.still },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(artthumb.$$.fragment);
    			t0 = space();
    			t1 = text(t1_value);
    		},
    		m: function mount(target, anchor) {
    			mount_component(artthumb, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const artthumb_changes = {};
    			if (dirty & /*option*/ 64) artthumb_changes.id = /*option*/ ctx[6].graphics.still;
    			artthumb.$set(artthumb_changes);
    			if ((!current || dirty & /*option*/ 64) && t1_value !== (t1_value = /*option*/ ctx[6].name + "")) set_data_dev(t1, t1_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(artthumb.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(artthumb.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(artthumb, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$7.name,
    		type: "slot",
    		source: "(6:4) <InputSelect multiple {options} bind:value let:option inline filterable={options.length > 2}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
    	let div1;
    	let label;
    	let t;
    	let div0;
    	let inputselect;
    	let updating_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);
    	const default_slot_or_fallback = default_slot || fallback_block(ctx);

    	function inputselect_value_binding(value) {
    		/*inputselect_value_binding*/ ctx[4](value);
    	}

    	let inputselect_props = {
    		multiple: true,
    		options: /*options*/ ctx[1],
    		inline: true,
    		filterable: /*options*/ ctx[1].length > 2,
    		$$slots: {
    			default: [
    				create_default_slot$7,
    				({ option }) => ({ 6: option }),
    				({ option }) => option ? 64 : 0
    			]
    		},
    		$$scope: { ctx }
    	};

    	if (/*value*/ ctx[0] !== void 0) {
    		inputselect_props.value = /*value*/ ctx[0];
    	}

    	inputselect = new InputSelect({ props: inputselect_props, $$inline: true });
    	binding_callbacks.push(() => bind(inputselect, "value", inputselect_value_binding));

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			label = element("label");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			t = space();
    			div0 = element("div");
    			create_component(inputselect.$$.fragment);
    			attr_dev(label, "for", "graphic");
    			add_location(label, file$9, 1, 2, 28);
    			add_location(div0, file$9, 4, 2, 91);
    			attr_dev(div1, "class", "form-group");
    			add_location(div1, file$9, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, label);

    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(label, null);
    			}

    			append_dev(div1, t);
    			append_dev(div1, div0);
    			mount_component(inputselect, div0, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 32)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[5], !current ? -1 : dirty, null, null);
    				}
    			}

    			const inputselect_changes = {};
    			if (dirty & /*options*/ 2) inputselect_changes.options = /*options*/ ctx[1];
    			if (dirty & /*options*/ 2) inputselect_changes.filterable = /*options*/ ctx[1].length > 2;

    			if (dirty & /*$$scope, option*/ 96) {
    				inputselect_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*value*/ 1) {
    				updating_value = true;
    				inputselect_changes.value = /*value*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			inputselect.$set(inputselect_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			transition_in(inputselect.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot_or_fallback, local);
    			transition_out(inputselect.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    			destroy_component(inputselect);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let options;
    	let $project;
    	validate_store(project, "project");
    	component_subscribe($$self, project, $$value => $$invalidate(2, $project = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("FieldEnemyPicker", slots, ['default']);
    	let { value = [] } = $$props;
    	const writable_props = ["value"];

    	Object_1$1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FieldEnemyPicker> was created with unknown prop '${key}'`);
    	});

    	function inputselect_value_binding(value$1) {
    		value = value$1;
    		$$invalidate(0, value);
    	}

    	$$self.$$set = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("$$scope" in $$props) $$invalidate(5, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		sortByName,
    		project,
    		ArtThumb,
    		InputSelect,
    		value,
    		options,
    		$project
    	});

    	$$self.$inject_state = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("options" in $$props) $$invalidate(1, options = $$props.options);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$project*/ 4) {
    			$$invalidate(1, options = Object.values($project.enemies).map(e => ({ ...e, value: e.id })).sort(sortByName));
    		}
    	};

    	return [value, options, $project, slots, inputselect_value_binding, $$scope];
    }

    class FieldEnemyPicker extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, { value: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FieldEnemyPicker",
    			options,
    			id: create_fragment$a.name
    		});
    	}

    	get value() {
    		throw new Error("<FieldEnemyPicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<FieldEnemyPicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\pages\BlockBuilder.svelte generated by Svelte v3.38.3 */
    const file$8 = "src\\pages\\BlockBuilder.svelte";

    // (3:4) <ItemListNav slug="blocks" type="block" collection={$project.blocks} active={paramId} let:item>
    function create_default_slot_16(ctx) {
    	let artthumb;
    	let t0;
    	let t1_value = /*item*/ ctx[25].name + "";
    	let t1;
    	let current;

    	artthumb = new ArtThumb({
    			props: { id: /*item*/ ctx[25].graphic },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(artthumb.$$.fragment);
    			t0 = space();
    			t1 = text(t1_value);
    		},
    		m: function mount(target, anchor) {
    			mount_component(artthumb, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const artthumb_changes = {};
    			if (dirty & /*item*/ 33554432) artthumb_changes.id = /*item*/ ctx[25].graphic;
    			artthumb.$set(artthumb_changes);
    			if ((!current || dirty & /*item*/ 33554432) && t1_value !== (t1_value = /*item*/ ctx[25].name + "")) set_data_dev(t1, t1_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(artthumb.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(artthumb.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(artthumb, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_16.name,
    		type: "slot",
    		source: "(3:4) <ItemListNav slug=\\\"blocks\\\" type=\\\"block\\\" collection={$project.blocks} active={paramId} let:item>",
    		ctx
    	});

    	return block;
    }

    // (10:6) <FieldText name="name" bind:value={input.name} placeholder="Type a name...">
    function create_default_slot_15(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Name");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_15.name,
    		type: "slot",
    		source: "(10:6) <FieldText name=\\\"name\\\" bind:value={input.name} placeholder=\\\"Type a name...\\\">",
    		ctx
    	});

    	return block;
    }

    // (11:6) <FieldArtPicker bind:value={input.graphic}>
    function create_default_slot_14(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Graphic");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_14.name,
    		type: "slot",
    		source: "(11:6) <FieldArtPicker bind:value={input.graphic}>",
    		ctx
    	});

    	return block;
    }

    // (13:6) <FieldCheckbox name="can-walk" bind:checked={input.canWalk}>
    function create_default_slot_13(ctx) {
    	let t0;
    	let div;

    	const block = {
    		c: function create() {
    			t0 = text("Can walk on?\r\n        ");
    			div = element("div");
    			div.textContent = "Can players walk on or through this block?";
    			attr_dev(div, "class", "help-text");
    			add_location(div, file$8, 14, 8, 651);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_13.name,
    		type: "slot",
    		source: "(13:6) <FieldCheckbox name=\\\"can-walk\\\" bind:checked={input.canWalk}>",
    		ctx
    	});

    	return block;
    }

    // (17:6) <FieldCheckbox name="can-see" bind:checked={input.canSee}>
    function create_default_slot_12(ctx) {
    	let t0;
    	let div;

    	const block = {
    		c: function create() {
    			t0 = text("Can see through / across?\r\n        ");
    			div = element("div");
    			div.textContent = "Can players and enemies see through / across this block?";
    			attr_dev(div, "class", "help-text");
    			add_location(div, file$8, 18, 8, 857);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_12.name,
    		type: "slot",
    		source: "(17:6) <FieldCheckbox name=\\\"can-see\\\" bind:checked={input.canSee}>",
    		ctx
    	});

    	return block;
    }

    // (21:6) <FieldCheckbox name="consumable" bind:checked={input.consumable}>
    function create_default_slot_11(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Consumable by player?");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_11.name,
    		type: "slot",
    		source: "(21:6) <FieldCheckbox name=\\\"consumable\\\" bind:checked={input.consumable}>",
    		ctx
    	});

    	return block;
    }

    // (22:6) {#if input.consumable}
    function create_if_block_1$1(ctx) {
    	let div;
    	let fieldnumber0;
    	let updating_value;
    	let t0;
    	let fieldnumber1;
    	let updating_value_1;
    	let t1;
    	let fieldcharacterpicker;
    	let updating_value_2;
    	let t2;
    	let fieldenemypicker;
    	let updating_value_3;
    	let current;

    	function fieldnumber0_value_binding(value) {
    		/*fieldnumber0_value_binding*/ ctx[14](value);
    	}

    	let fieldnumber0_props = {
    		name: "healthOnConsume",
    		$$slots: { default: [create_default_slot_10] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].healthOnConsume !== void 0) {
    		fieldnumber0_props.value = /*input*/ ctx[0].healthOnConsume;
    	}

    	fieldnumber0 = new FieldNumber({
    			props: fieldnumber0_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(fieldnumber0, "value", fieldnumber0_value_binding));

    	function fieldnumber1_value_binding(value) {
    		/*fieldnumber1_value_binding*/ ctx[15](value);
    	}

    	let fieldnumber1_props = {
    		name: "scoreOnConsume",
    		$$slots: { default: [create_default_slot_9] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].scoreOnConsume !== void 0) {
    		fieldnumber1_props.value = /*input*/ ctx[0].scoreOnConsume;
    	}

    	fieldnumber1 = new FieldNumber({
    			props: fieldnumber1_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(fieldnumber1, "value", fieldnumber1_value_binding));

    	function fieldcharacterpicker_value_binding(value) {
    		/*fieldcharacterpicker_value_binding*/ ctx[16](value);
    	}

    	let fieldcharacterpicker_props = {
    		name: "followerOnConsume",
    		$$slots: { default: [create_default_slot_8] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].followerOnConsume !== void 0) {
    		fieldcharacterpicker_props.value = /*input*/ ctx[0].followerOnConsume;
    	}

    	fieldcharacterpicker = new FieldCharacterPicker({
    			props: fieldcharacterpicker_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(fieldcharacterpicker, "value", fieldcharacterpicker_value_binding));

    	function fieldenemypicker_value_binding(value) {
    		/*fieldenemypicker_value_binding*/ ctx[17](value);
    	}

    	let fieldenemypicker_props = {
    		name: "enemyOnConsume",
    		$$slots: { default: [create_default_slot_7] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].enemyOnConsume !== void 0) {
    		fieldenemypicker_props.value = /*input*/ ctx[0].enemyOnConsume;
    	}

    	fieldenemypicker = new FieldEnemyPicker({
    			props: fieldenemypicker_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(fieldenemypicker, "value", fieldenemypicker_value_binding));

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(fieldnumber0.$$.fragment);
    			t0 = space();
    			create_component(fieldnumber1.$$.fragment);
    			t1 = space();
    			create_component(fieldcharacterpicker.$$.fragment);
    			t2 = space();
    			create_component(fieldenemypicker.$$.fragment);
    			attr_dev(div, "class", "field-group");
    			add_location(div, file$8, 22, 8, 1116);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(fieldnumber0, div, null);
    			append_dev(div, t0);
    			mount_component(fieldnumber1, div, null);
    			append_dev(div, t1);
    			mount_component(fieldcharacterpicker, div, null);
    			append_dev(div, t2);
    			mount_component(fieldenemypicker, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const fieldnumber0_changes = {};

    			if (dirty & /*$$scope*/ 67108864) {
    				fieldnumber0_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*input*/ 1) {
    				updating_value = true;
    				fieldnumber0_changes.value = /*input*/ ctx[0].healthOnConsume;
    				add_flush_callback(() => updating_value = false);
    			}

    			fieldnumber0.$set(fieldnumber0_changes);
    			const fieldnumber1_changes = {};

    			if (dirty & /*$$scope*/ 67108864) {
    				fieldnumber1_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_1 && dirty & /*input*/ 1) {
    				updating_value_1 = true;
    				fieldnumber1_changes.value = /*input*/ ctx[0].scoreOnConsume;
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			fieldnumber1.$set(fieldnumber1_changes);
    			const fieldcharacterpicker_changes = {};

    			if (dirty & /*$$scope*/ 67108864) {
    				fieldcharacterpicker_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_2 && dirty & /*input*/ 1) {
    				updating_value_2 = true;
    				fieldcharacterpicker_changes.value = /*input*/ ctx[0].followerOnConsume;
    				add_flush_callback(() => updating_value_2 = false);
    			}

    			fieldcharacterpicker.$set(fieldcharacterpicker_changes);
    			const fieldenemypicker_changes = {};

    			if (dirty & /*$$scope*/ 67108864) {
    				fieldenemypicker_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_3 && dirty & /*input*/ 1) {
    				updating_value_3 = true;
    				fieldenemypicker_changes.value = /*input*/ ctx[0].enemyOnConsume;
    				add_flush_callback(() => updating_value_3 = false);
    			}

    			fieldenemypicker.$set(fieldenemypicker_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(fieldnumber0.$$.fragment, local);
    			transition_in(fieldnumber1.$$.fragment, local);
    			transition_in(fieldcharacterpicker.$$.fragment, local);
    			transition_in(fieldenemypicker.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(fieldnumber0.$$.fragment, local);
    			transition_out(fieldnumber1.$$.fragment, local);
    			transition_out(fieldcharacterpicker.$$.fragment, local);
    			transition_out(fieldenemypicker.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(fieldnumber0);
    			destroy_component(fieldnumber1);
    			destroy_component(fieldcharacterpicker);
    			destroy_component(fieldenemypicker);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(22:6) {#if input.consumable}",
    		ctx
    	});

    	return block;
    }

    // (24:10) <FieldNumber name="healthOnConsume" bind:value={input.healthOnConsume}>
    function create_default_slot_10(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Health on consume?");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_10.name,
    		type: "slot",
    		source: "(24:10) <FieldNumber name=\\\"healthOnConsume\\\" bind:value={input.healthOnConsume}>",
    		ctx
    	});

    	return block;
    }

    // (25:10) <FieldNumber name="scoreOnConsume" bind:value={input.scoreOnConsume}>
    function create_default_slot_9(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Score on consume?");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_9.name,
    		type: "slot",
    		source: "(25:10) <FieldNumber name=\\\"scoreOnConsume\\\" bind:value={input.scoreOnConsume}>",
    		ctx
    	});

    	return block;
    }

    // (26:10) <FieldCharacterPicker name="followerOnConsume" bind:value={input.followerOnConsume}>
    function create_default_slot_8(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Spawn follower on consume?");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_8.name,
    		type: "slot",
    		source: "(26:10) <FieldCharacterPicker name=\\\"followerOnConsume\\\" bind:value={input.followerOnConsume}>",
    		ctx
    	});

    	return block;
    }

    // (27:10) <FieldEnemyPicker name="enemyOnConsume" bind:value={input.enemyOnConsume}>
    function create_default_slot_7(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Spawn enemy on consume?");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_7.name,
    		type: "slot",
    		source: "(27:10) <FieldEnemyPicker name=\\\"enemyOnConsume\\\" bind:value={input.enemyOnConsume}>",
    		ctx
    	});

    	return block;
    }

    // (30:6) <FieldCheckbox name="throwOnTouch" bind:checked={input.throwOnTouch}>
    function create_default_slot_6$1(ctx) {
    	let t0;
    	let div;

    	const block = {
    		c: function create() {
    			t0 = text("Throw on touch?\r\n        ");
    			div = element("div");
    			div.textContent = "Throw anything that touches this block.";
    			attr_dev(div, "class", "help-text");
    			add_location(div, file$8, 31, 8, 1782);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_6$1.name,
    		type: "slot",
    		source: "(30:6) <FieldCheckbox name=\\\"throwOnTouch\\\" bind:checked={input.throwOnTouch}>",
    		ctx
    	});

    	return block;
    }

    // (34:6) <FieldCheckbox name="teleportOnTouch" bind:checked={input.teleportOnTouch}>
    function create_default_slot_5$1(ctx) {
    	let t0;
    	let div;

    	const block = {
    		c: function create() {
    			t0 = text("Teleport on touch?\r\n        ");
    			div = element("div");
    			div.textContent = "Teleport any players that touch this block to the nearest block of the same type.";
    			attr_dev(div, "class", "help-text");
    			add_location(div, file$8, 35, 8, 1995);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_5$1.name,
    		type: "slot",
    		source: "(34:6) <FieldCheckbox name=\\\"teleportOnTouch\\\" bind:checked={input.teleportOnTouch}>",
    		ctx
    	});

    	return block;
    }

    // (38:6) <FieldCheckbox name="flipGravityOnTouch" bind:checked={input.flipGravityOnTouch}>
    function create_default_slot_4$3(ctx) {
    	let t0;
    	let div;

    	const block = {
    		c: function create() {
    			t0 = text("Flip gravity on touch?\r\n        ");
    			div = element("div");
    			div.textContent = "Flips gravity for any character or enemy that touches this block.";
    			attr_dev(div, "class", "help-text");
    			add_location(div, file$8, 39, 8, 2260);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_4$3.name,
    		type: "slot",
    		source: "(38:6) <FieldCheckbox name=\\\"flipGravityOnTouch\\\" bind:checked={input.flipGravityOnTouch}>",
    		ctx
    	});

    	return block;
    }

    // (42:6) <FieldNumber name="damage" bind:value={input.damage}>
    function create_default_slot_3$3(ctx) {
    	let t0;
    	let div;

    	const block = {
    		c: function create() {
    			t0 = text("Damage\r\n        ");
    			div = element("div");
    			div.textContent = "When players or enemies touch this block, how much damage should they take (per frame in contact)?";
    			attr_dev(div, "class", "help-text");
    			add_location(div, file$8, 43, 8, 2465);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3$3.name,
    		type: "slot",
    		source: "(42:6) <FieldNumber name=\\\"damage\\\" bind:value={input.damage}>",
    		ctx
    	});

    	return block;
    }

    // (46:6) <FieldCheckbox name="winOnTouch" bind:checked={input.winOnTouch}>
    function create_default_slot_2$3(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Win level if you touch the block?");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2$3.name,
    		type: "slot",
    		source: "(46:6) <FieldCheckbox name=\\\"winOnTouch\\\" bind:checked={input.winOnTouch}>",
    		ctx
    	});

    	return block;
    }

    // (9:4) <Form on:submit={save} {hasChanges}>
    function create_default_slot_1$4(ctx) {
    	let fieldtext;
    	let updating_value;
    	let t0;
    	let fieldartpicker;
    	let updating_value_1;
    	let t1;
    	let fieldparticles;
    	let updating_value_2;
    	let t2;
    	let fieldcheckbox0;
    	let updating_checked;
    	let t3;
    	let fieldcheckbox1;
    	let updating_checked_1;
    	let t4;
    	let fieldcheckbox2;
    	let updating_checked_2;
    	let t5;
    	let t6;
    	let fieldcheckbox3;
    	let updating_checked_3;
    	let t7;
    	let fieldcheckbox4;
    	let updating_checked_4;
    	let t8;
    	let fieldcheckbox5;
    	let updating_checked_5;
    	let t9;
    	let fieldnumber;
    	let updating_value_3;
    	let t10;
    	let fieldcheckbox6;
    	let updating_checked_6;
    	let current;

    	function fieldtext_value_binding(value) {
    		/*fieldtext_value_binding*/ ctx[8](value);
    	}

    	let fieldtext_props = {
    		name: "name",
    		placeholder: "Type a name...",
    		$$slots: { default: [create_default_slot_15] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].name !== void 0) {
    		fieldtext_props.value = /*input*/ ctx[0].name;
    	}

    	fieldtext = new FieldText({ props: fieldtext_props, $$inline: true });
    	binding_callbacks.push(() => bind(fieldtext, "value", fieldtext_value_binding));

    	function fieldartpicker_value_binding(value) {
    		/*fieldartpicker_value_binding*/ ctx[9](value);
    	}

    	let fieldartpicker_props = {
    		$$slots: { default: [create_default_slot_14] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].graphic !== void 0) {
    		fieldartpicker_props.value = /*input*/ ctx[0].graphic;
    	}

    	fieldartpicker = new FieldArtPicker({
    			props: fieldartpicker_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(fieldartpicker, "value", fieldartpicker_value_binding));

    	function fieldparticles_value_binding(value) {
    		/*fieldparticles_value_binding*/ ctx[10](value);
    	}

    	let fieldparticles_props = { name: "particles" };

    	if (/*input*/ ctx[0].particles !== void 0) {
    		fieldparticles_props.value = /*input*/ ctx[0].particles;
    	}

    	fieldparticles = new FieldParticles({
    			props: fieldparticles_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(fieldparticles, "value", fieldparticles_value_binding));

    	function fieldcheckbox0_checked_binding(value) {
    		/*fieldcheckbox0_checked_binding*/ ctx[11](value);
    	}

    	let fieldcheckbox0_props = {
    		name: "can-walk",
    		$$slots: { default: [create_default_slot_13] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].canWalk !== void 0) {
    		fieldcheckbox0_props.checked = /*input*/ ctx[0].canWalk;
    	}

    	fieldcheckbox0 = new FieldCheckbox({
    			props: fieldcheckbox0_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(fieldcheckbox0, "checked", fieldcheckbox0_checked_binding));

    	function fieldcheckbox1_checked_binding(value) {
    		/*fieldcheckbox1_checked_binding*/ ctx[12](value);
    	}

    	let fieldcheckbox1_props = {
    		name: "can-see",
    		$$slots: { default: [create_default_slot_12] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].canSee !== void 0) {
    		fieldcheckbox1_props.checked = /*input*/ ctx[0].canSee;
    	}

    	fieldcheckbox1 = new FieldCheckbox({
    			props: fieldcheckbox1_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(fieldcheckbox1, "checked", fieldcheckbox1_checked_binding));

    	function fieldcheckbox2_checked_binding(value) {
    		/*fieldcheckbox2_checked_binding*/ ctx[13](value);
    	}

    	let fieldcheckbox2_props = {
    		name: "consumable",
    		$$slots: { default: [create_default_slot_11] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].consumable !== void 0) {
    		fieldcheckbox2_props.checked = /*input*/ ctx[0].consumable;
    	}

    	fieldcheckbox2 = new FieldCheckbox({
    			props: fieldcheckbox2_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(fieldcheckbox2, "checked", fieldcheckbox2_checked_binding));
    	let if_block = /*input*/ ctx[0].consumable && create_if_block_1$1(ctx);

    	function fieldcheckbox3_checked_binding(value) {
    		/*fieldcheckbox3_checked_binding*/ ctx[18](value);
    	}

    	let fieldcheckbox3_props = {
    		name: "throwOnTouch",
    		$$slots: { default: [create_default_slot_6$1] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].throwOnTouch !== void 0) {
    		fieldcheckbox3_props.checked = /*input*/ ctx[0].throwOnTouch;
    	}

    	fieldcheckbox3 = new FieldCheckbox({
    			props: fieldcheckbox3_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(fieldcheckbox3, "checked", fieldcheckbox3_checked_binding));

    	function fieldcheckbox4_checked_binding(value) {
    		/*fieldcheckbox4_checked_binding*/ ctx[19](value);
    	}

    	let fieldcheckbox4_props = {
    		name: "teleportOnTouch",
    		$$slots: { default: [create_default_slot_5$1] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].teleportOnTouch !== void 0) {
    		fieldcheckbox4_props.checked = /*input*/ ctx[0].teleportOnTouch;
    	}

    	fieldcheckbox4 = new FieldCheckbox({
    			props: fieldcheckbox4_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(fieldcheckbox4, "checked", fieldcheckbox4_checked_binding));

    	function fieldcheckbox5_checked_binding(value) {
    		/*fieldcheckbox5_checked_binding*/ ctx[20](value);
    	}

    	let fieldcheckbox5_props = {
    		name: "flipGravityOnTouch",
    		$$slots: { default: [create_default_slot_4$3] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].flipGravityOnTouch !== void 0) {
    		fieldcheckbox5_props.checked = /*input*/ ctx[0].flipGravityOnTouch;
    	}

    	fieldcheckbox5 = new FieldCheckbox({
    			props: fieldcheckbox5_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(fieldcheckbox5, "checked", fieldcheckbox5_checked_binding));

    	function fieldnumber_value_binding(value) {
    		/*fieldnumber_value_binding*/ ctx[21](value);
    	}

    	let fieldnumber_props = {
    		name: "damage",
    		$$slots: { default: [create_default_slot_3$3] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].damage !== void 0) {
    		fieldnumber_props.value = /*input*/ ctx[0].damage;
    	}

    	fieldnumber = new FieldNumber({ props: fieldnumber_props, $$inline: true });
    	binding_callbacks.push(() => bind(fieldnumber, "value", fieldnumber_value_binding));

    	function fieldcheckbox6_checked_binding(value) {
    		/*fieldcheckbox6_checked_binding*/ ctx[22](value);
    	}

    	let fieldcheckbox6_props = {
    		name: "winOnTouch",
    		$$slots: { default: [create_default_slot_2$3] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].winOnTouch !== void 0) {
    		fieldcheckbox6_props.checked = /*input*/ ctx[0].winOnTouch;
    	}

    	fieldcheckbox6 = new FieldCheckbox({
    			props: fieldcheckbox6_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(fieldcheckbox6, "checked", fieldcheckbox6_checked_binding));

    	const block = {
    		c: function create() {
    			create_component(fieldtext.$$.fragment);
    			t0 = space();
    			create_component(fieldartpicker.$$.fragment);
    			t1 = space();
    			create_component(fieldparticles.$$.fragment);
    			t2 = space();
    			create_component(fieldcheckbox0.$$.fragment);
    			t3 = space();
    			create_component(fieldcheckbox1.$$.fragment);
    			t4 = space();
    			create_component(fieldcheckbox2.$$.fragment);
    			t5 = space();
    			if (if_block) if_block.c();
    			t6 = space();
    			create_component(fieldcheckbox3.$$.fragment);
    			t7 = space();
    			create_component(fieldcheckbox4.$$.fragment);
    			t8 = space();
    			create_component(fieldcheckbox5.$$.fragment);
    			t9 = space();
    			create_component(fieldnumber.$$.fragment);
    			t10 = space();
    			create_component(fieldcheckbox6.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(fieldtext, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(fieldartpicker, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(fieldparticles, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(fieldcheckbox0, target, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(fieldcheckbox1, target, anchor);
    			insert_dev(target, t4, anchor);
    			mount_component(fieldcheckbox2, target, anchor);
    			insert_dev(target, t5, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t6, anchor);
    			mount_component(fieldcheckbox3, target, anchor);
    			insert_dev(target, t7, anchor);
    			mount_component(fieldcheckbox4, target, anchor);
    			insert_dev(target, t8, anchor);
    			mount_component(fieldcheckbox5, target, anchor);
    			insert_dev(target, t9, anchor);
    			mount_component(fieldnumber, target, anchor);
    			insert_dev(target, t10, anchor);
    			mount_component(fieldcheckbox6, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const fieldtext_changes = {};

    			if (dirty & /*$$scope*/ 67108864) {
    				fieldtext_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*input*/ 1) {
    				updating_value = true;
    				fieldtext_changes.value = /*input*/ ctx[0].name;
    				add_flush_callback(() => updating_value = false);
    			}

    			fieldtext.$set(fieldtext_changes);
    			const fieldartpicker_changes = {};

    			if (dirty & /*$$scope*/ 67108864) {
    				fieldartpicker_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_1 && dirty & /*input*/ 1) {
    				updating_value_1 = true;
    				fieldartpicker_changes.value = /*input*/ ctx[0].graphic;
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			fieldartpicker.$set(fieldartpicker_changes);
    			const fieldparticles_changes = {};

    			if (!updating_value_2 && dirty & /*input*/ 1) {
    				updating_value_2 = true;
    				fieldparticles_changes.value = /*input*/ ctx[0].particles;
    				add_flush_callback(() => updating_value_2 = false);
    			}

    			fieldparticles.$set(fieldparticles_changes);
    			const fieldcheckbox0_changes = {};

    			if (dirty & /*$$scope*/ 67108864) {
    				fieldcheckbox0_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_checked && dirty & /*input*/ 1) {
    				updating_checked = true;
    				fieldcheckbox0_changes.checked = /*input*/ ctx[0].canWalk;
    				add_flush_callback(() => updating_checked = false);
    			}

    			fieldcheckbox0.$set(fieldcheckbox0_changes);
    			const fieldcheckbox1_changes = {};

    			if (dirty & /*$$scope*/ 67108864) {
    				fieldcheckbox1_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_checked_1 && dirty & /*input*/ 1) {
    				updating_checked_1 = true;
    				fieldcheckbox1_changes.checked = /*input*/ ctx[0].canSee;
    				add_flush_callback(() => updating_checked_1 = false);
    			}

    			fieldcheckbox1.$set(fieldcheckbox1_changes);
    			const fieldcheckbox2_changes = {};

    			if (dirty & /*$$scope*/ 67108864) {
    				fieldcheckbox2_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_checked_2 && dirty & /*input*/ 1) {
    				updating_checked_2 = true;
    				fieldcheckbox2_changes.checked = /*input*/ ctx[0].consumable;
    				add_flush_callback(() => updating_checked_2 = false);
    			}

    			fieldcheckbox2.$set(fieldcheckbox2_changes);

    			if (/*input*/ ctx[0].consumable) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*input*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_1$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t6.parentNode, t6);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			const fieldcheckbox3_changes = {};

    			if (dirty & /*$$scope*/ 67108864) {
    				fieldcheckbox3_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_checked_3 && dirty & /*input*/ 1) {
    				updating_checked_3 = true;
    				fieldcheckbox3_changes.checked = /*input*/ ctx[0].throwOnTouch;
    				add_flush_callback(() => updating_checked_3 = false);
    			}

    			fieldcheckbox3.$set(fieldcheckbox3_changes);
    			const fieldcheckbox4_changes = {};

    			if (dirty & /*$$scope*/ 67108864) {
    				fieldcheckbox4_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_checked_4 && dirty & /*input*/ 1) {
    				updating_checked_4 = true;
    				fieldcheckbox4_changes.checked = /*input*/ ctx[0].teleportOnTouch;
    				add_flush_callback(() => updating_checked_4 = false);
    			}

    			fieldcheckbox4.$set(fieldcheckbox4_changes);
    			const fieldcheckbox5_changes = {};

    			if (dirty & /*$$scope*/ 67108864) {
    				fieldcheckbox5_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_checked_5 && dirty & /*input*/ 1) {
    				updating_checked_5 = true;
    				fieldcheckbox5_changes.checked = /*input*/ ctx[0].flipGravityOnTouch;
    				add_flush_callback(() => updating_checked_5 = false);
    			}

    			fieldcheckbox5.$set(fieldcheckbox5_changes);
    			const fieldnumber_changes = {};

    			if (dirty & /*$$scope*/ 67108864) {
    				fieldnumber_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_3 && dirty & /*input*/ 1) {
    				updating_value_3 = true;
    				fieldnumber_changes.value = /*input*/ ctx[0].damage;
    				add_flush_callback(() => updating_value_3 = false);
    			}

    			fieldnumber.$set(fieldnumber_changes);
    			const fieldcheckbox6_changes = {};

    			if (dirty & /*$$scope*/ 67108864) {
    				fieldcheckbox6_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_checked_6 && dirty & /*input*/ 1) {
    				updating_checked_6 = true;
    				fieldcheckbox6_changes.checked = /*input*/ ctx[0].winOnTouch;
    				add_flush_callback(() => updating_checked_6 = false);
    			}

    			fieldcheckbox6.$set(fieldcheckbox6_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(fieldtext.$$.fragment, local);
    			transition_in(fieldartpicker.$$.fragment, local);
    			transition_in(fieldparticles.$$.fragment, local);
    			transition_in(fieldcheckbox0.$$.fragment, local);
    			transition_in(fieldcheckbox1.$$.fragment, local);
    			transition_in(fieldcheckbox2.$$.fragment, local);
    			transition_in(if_block);
    			transition_in(fieldcheckbox3.$$.fragment, local);
    			transition_in(fieldcheckbox4.$$.fragment, local);
    			transition_in(fieldcheckbox5.$$.fragment, local);
    			transition_in(fieldnumber.$$.fragment, local);
    			transition_in(fieldcheckbox6.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(fieldtext.$$.fragment, local);
    			transition_out(fieldartpicker.$$.fragment, local);
    			transition_out(fieldparticles.$$.fragment, local);
    			transition_out(fieldcheckbox0.$$.fragment, local);
    			transition_out(fieldcheckbox1.$$.fragment, local);
    			transition_out(fieldcheckbox2.$$.fragment, local);
    			transition_out(if_block);
    			transition_out(fieldcheckbox3.$$.fragment, local);
    			transition_out(fieldcheckbox4.$$.fragment, local);
    			transition_out(fieldcheckbox5.$$.fragment, local);
    			transition_out(fieldnumber.$$.fragment, local);
    			transition_out(fieldcheckbox6.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(fieldtext, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(fieldartpicker, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(fieldparticles, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(fieldcheckbox0, detaching);
    			if (detaching) detach_dev(t3);
    			destroy_component(fieldcheckbox1, detaching);
    			if (detaching) detach_dev(t4);
    			destroy_component(fieldcheckbox2, detaching);
    			if (detaching) detach_dev(t5);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t6);
    			destroy_component(fieldcheckbox3, detaching);
    			if (detaching) detach_dev(t7);
    			destroy_component(fieldcheckbox4, detaching);
    			if (detaching) detach_dev(t8);
    			destroy_component(fieldcheckbox5, detaching);
    			if (detaching) detach_dev(t9);
    			destroy_component(fieldnumber, detaching);
    			if (detaching) detach_dev(t10);
    			destroy_component(fieldcheckbox6, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$4.name,
    		type: "slot",
    		source: "(9:4) <Form on:submit={save} {hasChanges}>",
    		ctx
    	});

    	return block;
    }

    // (49:8) {#if !isAdding}
    function create_if_block$3(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Delete";
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-danger");
    			add_location(button, file$8, 49, 10, 2804);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*del*/ ctx[6], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(49:8) {#if !isAdding}",
    		ctx
    	});

    	return block;
    }

    // (48:6) 
    function create_buttons_slot$2(ctx) {
    	let span;
    	let if_block = !/*isAdding*/ ctx[3] && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			span = element("span");
    			if (if_block) if_block.c();
    			attr_dev(span, "slot", "buttons");
    			add_location(span, file$8, 47, 6, 2746);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			if (if_block) if_block.m(span, null);
    		},
    		p: function update(ctx, dirty) {
    			if (!/*isAdding*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					if_block.m(span, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_buttons_slot$2.name,
    		type: "slot",
    		source: "(48:6) ",
    		ctx
    	});

    	return block;
    }

    // (1:0) <AppLayout active="blocks">
    function create_default_slot$6(ctx) {
    	let div0;
    	let itemlistnav;
    	let t0;
    	let div1;
    	let form;
    	let t1;
    	let div2;
    	let current;

    	itemlistnav = new ItemListNav({
    			props: {
    				slug: "blocks",
    				type: "block",
    				collection: /*$project*/ ctx[2].blocks,
    				active: /*paramId*/ ctx[1],
    				$$slots: {
    					default: [
    						create_default_slot_16,
    						({ item }) => ({ 25: item }),
    						({ item }) => item ? 33554432 : 0
    					]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	form = new Form({
    			props: {
    				hasChanges: /*hasChanges*/ ctx[4],
    				$$slots: {
    					buttons: [create_buttons_slot$2],
    					default: [create_default_slot_1$4]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	form.$on("submit", /*save*/ ctx[5]);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			create_component(itemlistnav.$$.fragment);
    			t0 = space();
    			div1 = element("div");
    			create_component(form.$$.fragment);
    			t1 = space();
    			div2 = element("div");
    			div2.textContent = "Preview maybe?";
    			attr_dev(div0, "class", "col1");
    			add_location(div0, file$8, 1, 2, 31);
    			attr_dev(div1, "class", "grow p1");
    			add_location(div1, file$8, 7, 2, 241);
    			attr_dev(div2, "class", "col2");
    			add_location(div2, file$8, 54, 2, 2936);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			mount_component(itemlistnav, div0, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			mount_component(form, div1, null);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div2, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const itemlistnav_changes = {};
    			if (dirty & /*$project*/ 4) itemlistnav_changes.collection = /*$project*/ ctx[2].blocks;
    			if (dirty & /*paramId*/ 2) itemlistnav_changes.active = /*paramId*/ ctx[1];

    			if (dirty & /*$$scope, item*/ 100663296) {
    				itemlistnav_changes.$$scope = { dirty, ctx };
    			}

    			itemlistnav.$set(itemlistnav_changes);
    			const form_changes = {};
    			if (dirty & /*hasChanges*/ 16) form_changes.hasChanges = /*hasChanges*/ ctx[4];

    			if (dirty & /*$$scope, isAdding, input*/ 67108873) {
    				form_changes.$$scope = { dirty, ctx };
    			}

    			form.$set(form_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(itemlistnav.$$.fragment, local);
    			transition_in(form.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(itemlistnav.$$.fragment, local);
    			transition_out(form.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			destroy_component(itemlistnav);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    			destroy_component(form);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$6.name,
    		type: "slot",
    		source: "(1:0) <AppLayout active=\\\"blocks\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let applayout;
    	let current;

    	applayout = new AppLayout({
    			props: {
    				active: "blocks",
    				$$slots: { default: [create_default_slot$6] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(applayout.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(applayout, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const applayout_changes = {};

    			if (dirty & /*$$scope, hasChanges, isAdding, input, $project, paramId*/ 67108895) {
    				applayout_changes.$$scope = { dirty, ctx };
    			}

    			applayout.$set(applayout_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(applayout.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(applayout.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(applayout, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function createDefaultInput$3() {
    	return {
    		name: "",
    		canWalk: true,
    		canSee: true,
    		throwOnTouch: false,
    		teleportOnTouch: false,
    		flipGravityOnTouch: false,
    		winOnTouch: false,
    		damage: 0,
    		consumable: false,
    		healthOnConsume: 0,
    		scoreOnConsume: 0,
    		followerOnConsume: [],
    		enemyOnConsume: [],
    		particles: null
    	};
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let paramId;
    	let isAdding;
    	let hasChanges;
    	let $project;
    	validate_store(project, "project");
    	component_subscribe($$self, project, $$value => $$invalidate(2, $project = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("BlockBuilder", slots, []);
    	let { params = {} } = $$props;
    	let input = createDefaultInput$3();

    	function create() {
    		$$invalidate(0, input = createDefaultInput$3());
    	}

    	function edit(name) {
    		if (!$project.blocks.hasOwnProperty(name)) return;

    		$$invalidate(0, input = {
    			...createDefaultInput$3(),
    			...JSON.parse(JSON.stringify($project.blocks[name]))
    		});
    	}

    	function save() {
    		if (validator.empty(input.name)) {
    			document.getElementById("name").focus();
    			return;
    		}

    		if (isAdding) $$invalidate(0, input.id = getNextId($project.blocks), input);
    		set_store_value(project, $project.blocks[input.id] = JSON.parse(JSON.stringify(input)), $project);
    		push(`/blocks/${encodeURIComponent(input.id)}`);
    	}

    	function del() {
    		if (confirm(`Are you sure you want to delete "${input.name}"?`)) {
    			delete $project.blocks[input.id];
    			project.set($project);
    			push(`/blocks/new`);
    		}
    	}

    	const writable_props = ["params"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<BlockBuilder> was created with unknown prop '${key}'`);
    	});

    	function fieldtext_value_binding(value) {
    		if ($$self.$$.not_equal(input.name, value)) {
    			input.name = value;
    			$$invalidate(0, input);
    		}
    	}

    	function fieldartpicker_value_binding(value) {
    		if ($$self.$$.not_equal(input.graphic, value)) {
    			input.graphic = value;
    			$$invalidate(0, input);
    		}
    	}

    	function fieldparticles_value_binding(value) {
    		if ($$self.$$.not_equal(input.particles, value)) {
    			input.particles = value;
    			$$invalidate(0, input);
    		}
    	}

    	function fieldcheckbox0_checked_binding(value) {
    		if ($$self.$$.not_equal(input.canWalk, value)) {
    			input.canWalk = value;
    			$$invalidate(0, input);
    		}
    	}

    	function fieldcheckbox1_checked_binding(value) {
    		if ($$self.$$.not_equal(input.canSee, value)) {
    			input.canSee = value;
    			$$invalidate(0, input);
    		}
    	}

    	function fieldcheckbox2_checked_binding(value) {
    		if ($$self.$$.not_equal(input.consumable, value)) {
    			input.consumable = value;
    			$$invalidate(0, input);
    		}
    	}

    	function fieldnumber0_value_binding(value) {
    		if ($$self.$$.not_equal(input.healthOnConsume, value)) {
    			input.healthOnConsume = value;
    			$$invalidate(0, input);
    		}
    	}

    	function fieldnumber1_value_binding(value) {
    		if ($$self.$$.not_equal(input.scoreOnConsume, value)) {
    			input.scoreOnConsume = value;
    			$$invalidate(0, input);
    		}
    	}

    	function fieldcharacterpicker_value_binding(value) {
    		if ($$self.$$.not_equal(input.followerOnConsume, value)) {
    			input.followerOnConsume = value;
    			$$invalidate(0, input);
    		}
    	}

    	function fieldenemypicker_value_binding(value) {
    		if ($$self.$$.not_equal(input.enemyOnConsume, value)) {
    			input.enemyOnConsume = value;
    			$$invalidate(0, input);
    		}
    	}

    	function fieldcheckbox3_checked_binding(value) {
    		if ($$self.$$.not_equal(input.throwOnTouch, value)) {
    			input.throwOnTouch = value;
    			$$invalidate(0, input);
    		}
    	}

    	function fieldcheckbox4_checked_binding(value) {
    		if ($$self.$$.not_equal(input.teleportOnTouch, value)) {
    			input.teleportOnTouch = value;
    			$$invalidate(0, input);
    		}
    	}

    	function fieldcheckbox5_checked_binding(value) {
    		if ($$self.$$.not_equal(input.flipGravityOnTouch, value)) {
    			input.flipGravityOnTouch = value;
    			$$invalidate(0, input);
    		}
    	}

    	function fieldnumber_value_binding(value) {
    		if ($$self.$$.not_equal(input.damage, value)) {
    			input.damage = value;
    			$$invalidate(0, input);
    		}
    	}

    	function fieldcheckbox6_checked_binding(value) {
    		if ($$self.$$.not_equal(input.winOnTouch, value)) {
    			input.winOnTouch = value;
    			$$invalidate(0, input);
    		}
    	}

    	$$self.$$set = $$props => {
    		if ("params" in $$props) $$invalidate(7, params = $$props.params);
    	};

    	$$self.$capture_state = () => ({
    		AppLayout,
    		ArtThumb,
    		Form,
    		ItemListNav,
    		project,
    		FieldArtPicker,
    		FieldCheckbox,
    		FieldParticles,
    		FieldText,
    		FieldNumber,
    		FieldCharacterPicker,
    		FieldEnemyPicker,
    		validator,
    		getNextId,
    		push,
    		params,
    		input,
    		createDefaultInput: createDefaultInput$3,
    		create,
    		edit,
    		save,
    		del,
    		paramId,
    		isAdding,
    		hasChanges,
    		$project
    	});

    	$$self.$inject_state = $$props => {
    		if ("params" in $$props) $$invalidate(7, params = $$props.params);
    		if ("input" in $$props) $$invalidate(0, input = $$props.input);
    		if ("paramId" in $$props) $$invalidate(1, paramId = $$props.paramId);
    		if ("isAdding" in $$props) $$invalidate(3, isAdding = $$props.isAdding);
    		if ("hasChanges" in $$props) $$invalidate(4, hasChanges = $$props.hasChanges);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*params*/ 128) {
    			$$invalidate(1, paramId = decodeURIComponent(params.id) || "new");
    		}

    		if ($$self.$$.dirty & /*paramId*/ 2) {
    			paramId == "new" ? create() : edit(paramId);
    		}

    		if ($$self.$$.dirty & /*input*/ 1) {
    			$$invalidate(3, isAdding = input.id == null);
    		}

    		if ($$self.$$.dirty & /*input, $project*/ 5) {
    			$$invalidate(4, hasChanges = input != null && !validator.equals(input, $project.blocks[input.id]));
    		}
    	};

    	return [
    		input,
    		paramId,
    		$project,
    		isAdding,
    		hasChanges,
    		save,
    		del,
    		params,
    		fieldtext_value_binding,
    		fieldartpicker_value_binding,
    		fieldparticles_value_binding,
    		fieldcheckbox0_checked_binding,
    		fieldcheckbox1_checked_binding,
    		fieldcheckbox2_checked_binding,
    		fieldnumber0_value_binding,
    		fieldnumber1_value_binding,
    		fieldcharacterpicker_value_binding,
    		fieldenemypicker_value_binding,
    		fieldcheckbox3_checked_binding,
    		fieldcheckbox4_checked_binding,
    		fieldcheckbox5_checked_binding,
    		fieldnumber_value_binding,
    		fieldcheckbox6_checked_binding
    	];
    }

    class BlockBuilder extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { params: 7 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "BlockBuilder",
    			options,
    			id: create_fragment$9.name
    		});
    	}

    	get params() {
    		throw new Error("<BlockBuilder>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set params(value) {
    		throw new Error("<BlockBuilder>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\pages\CharacterBuilder.svelte generated by Svelte v3.38.3 */
    const file$7 = "src\\pages\\CharacterBuilder.svelte";

    // (3:4) <ItemListNav slug="characters" type="character" collection={$project.characters} active={paramId} let:item>
    function create_default_slot_6(ctx) {
    	let artthumb;
    	let t0;
    	let t1_value = /*item*/ ctx[14].name + "";
    	let t1;
    	let current;

    	artthumb = new ArtThumb({
    			props: { id: /*item*/ ctx[14].graphics.still },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(artthumb.$$.fragment);
    			t0 = space();
    			t1 = text(t1_value);
    		},
    		m: function mount(target, anchor) {
    			mount_component(artthumb, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const artthumb_changes = {};
    			if (dirty & /*item*/ 16384) artthumb_changes.id = /*item*/ ctx[14].graphics.still;
    			artthumb.$set(artthumb_changes);
    			if ((!current || dirty & /*item*/ 16384) && t1_value !== (t1_value = /*item*/ ctx[14].name + "")) set_data_dev(t1, t1_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(artthumb.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(artthumb.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(artthumb, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_6.name,
    		type: "slot",
    		source: "(3:4) <ItemListNav slug=\\\"characters\\\" type=\\\"character\\\" collection={$project.characters} active={paramId} let:item>",
    		ctx
    	});

    	return block;
    }

    // (10:6) <FieldText name="name" bind:value={input.name} placeholder="Type a name...">
    function create_default_slot_5(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Name");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_5.name,
    		type: "slot",
    		source: "(10:6) <FieldText name=\\\"name\\\" bind:value={input.name} placeholder=\\\"Type a name...\\\">",
    		ctx
    	});

    	return block;
    }

    // (11:6) <FieldNumber name="speed" bind:value={input.speed} placeholder="Speed (pixels per frame)">
    function create_default_slot_4$2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Speed (pixels per frame)");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_4$2.name,
    		type: "slot",
    		source: "(11:6) <FieldNumber name=\\\"speed\\\" bind:value={input.speed} placeholder=\\\"Speed (pixels per frame)\\\">",
    		ctx
    	});

    	return block;
    }

    // (12:6) <FieldArtPicker bind:value={input.graphics.still}>
    function create_default_slot_3$2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Still graphics");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3$2.name,
    		type: "slot",
    		source: "(12:6) <FieldArtPicker bind:value={input.graphics.still}>",
    		ctx
    	});

    	return block;
    }

    // (13:6) <FieldArtPicker bind:value={input.graphics.moving}>
    function create_default_slot_2$2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Moving graphics");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2$2.name,
    		type: "slot",
    		source: "(13:6) <FieldArtPicker bind:value={input.graphics.moving}>",
    		ctx
    	});

    	return block;
    }

    // (9:4) <Form on:submit={save} {hasChanges}>
    function create_default_slot_1$3(ctx) {
    	let fieldtext;
    	let updating_value;
    	let t0;
    	let fieldnumber;
    	let updating_value_1;
    	let t1;
    	let fieldartpicker0;
    	let updating_value_2;
    	let t2;
    	let fieldartpicker1;
    	let updating_value_3;
    	let current;

    	function fieldtext_value_binding(value) {
    		/*fieldtext_value_binding*/ ctx[8](value);
    	}

    	let fieldtext_props = {
    		name: "name",
    		placeholder: "Type a name...",
    		$$slots: { default: [create_default_slot_5] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].name !== void 0) {
    		fieldtext_props.value = /*input*/ ctx[0].name;
    	}

    	fieldtext = new FieldText({ props: fieldtext_props, $$inline: true });
    	binding_callbacks.push(() => bind(fieldtext, "value", fieldtext_value_binding));

    	function fieldnumber_value_binding(value) {
    		/*fieldnumber_value_binding*/ ctx[9](value);
    	}

    	let fieldnumber_props = {
    		name: "speed",
    		placeholder: "Speed (pixels per frame)",
    		$$slots: { default: [create_default_slot_4$2] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].speed !== void 0) {
    		fieldnumber_props.value = /*input*/ ctx[0].speed;
    	}

    	fieldnumber = new FieldNumber({ props: fieldnumber_props, $$inline: true });
    	binding_callbacks.push(() => bind(fieldnumber, "value", fieldnumber_value_binding));

    	function fieldartpicker0_value_binding(value) {
    		/*fieldartpicker0_value_binding*/ ctx[10](value);
    	}

    	let fieldartpicker0_props = {
    		$$slots: { default: [create_default_slot_3$2] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].graphics.still !== void 0) {
    		fieldartpicker0_props.value = /*input*/ ctx[0].graphics.still;
    	}

    	fieldartpicker0 = new FieldArtPicker({
    			props: fieldartpicker0_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(fieldartpicker0, "value", fieldartpicker0_value_binding));

    	function fieldartpicker1_value_binding(value) {
    		/*fieldartpicker1_value_binding*/ ctx[11](value);
    	}

    	let fieldartpicker1_props = {
    		$$slots: { default: [create_default_slot_2$2] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].graphics.moving !== void 0) {
    		fieldartpicker1_props.value = /*input*/ ctx[0].graphics.moving;
    	}

    	fieldartpicker1 = new FieldArtPicker({
    			props: fieldartpicker1_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(fieldartpicker1, "value", fieldartpicker1_value_binding));

    	const block = {
    		c: function create() {
    			create_component(fieldtext.$$.fragment);
    			t0 = space();
    			create_component(fieldnumber.$$.fragment);
    			t1 = space();
    			create_component(fieldartpicker0.$$.fragment);
    			t2 = space();
    			create_component(fieldartpicker1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(fieldtext, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(fieldnumber, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(fieldartpicker0, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(fieldartpicker1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const fieldtext_changes = {};

    			if (dirty & /*$$scope*/ 32768) {
    				fieldtext_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*input*/ 1) {
    				updating_value = true;
    				fieldtext_changes.value = /*input*/ ctx[0].name;
    				add_flush_callback(() => updating_value = false);
    			}

    			fieldtext.$set(fieldtext_changes);
    			const fieldnumber_changes = {};

    			if (dirty & /*$$scope*/ 32768) {
    				fieldnumber_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_1 && dirty & /*input*/ 1) {
    				updating_value_1 = true;
    				fieldnumber_changes.value = /*input*/ ctx[0].speed;
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			fieldnumber.$set(fieldnumber_changes);
    			const fieldartpicker0_changes = {};

    			if (dirty & /*$$scope*/ 32768) {
    				fieldartpicker0_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_2 && dirty & /*input*/ 1) {
    				updating_value_2 = true;
    				fieldartpicker0_changes.value = /*input*/ ctx[0].graphics.still;
    				add_flush_callback(() => updating_value_2 = false);
    			}

    			fieldartpicker0.$set(fieldartpicker0_changes);
    			const fieldartpicker1_changes = {};

    			if (dirty & /*$$scope*/ 32768) {
    				fieldartpicker1_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_3 && dirty & /*input*/ 1) {
    				updating_value_3 = true;
    				fieldartpicker1_changes.value = /*input*/ ctx[0].graphics.moving;
    				add_flush_callback(() => updating_value_3 = false);
    			}

    			fieldartpicker1.$set(fieldartpicker1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(fieldtext.$$.fragment, local);
    			transition_in(fieldnumber.$$.fragment, local);
    			transition_in(fieldartpicker0.$$.fragment, local);
    			transition_in(fieldartpicker1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(fieldtext.$$.fragment, local);
    			transition_out(fieldnumber.$$.fragment, local);
    			transition_out(fieldartpicker0.$$.fragment, local);
    			transition_out(fieldartpicker1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(fieldtext, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(fieldnumber, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(fieldartpicker0, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(fieldartpicker1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$3.name,
    		type: "slot",
    		source: "(9:4) <Form on:submit={save} {hasChanges}>",
    		ctx
    	});

    	return block;
    }

    // (16:8) {#if !isAdding}
    function create_if_block$2(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Delete";
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-danger");
    			add_location(button, file$7, 16, 10, 811);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*del*/ ctx[6], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(16:8) {#if !isAdding}",
    		ctx
    	});

    	return block;
    }

    // (15:6) 
    function create_buttons_slot$1(ctx) {
    	let span;
    	let if_block = !/*isAdding*/ ctx[3] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			span = element("span");
    			if (if_block) if_block.c();
    			attr_dev(span, "slot", "buttons");
    			add_location(span, file$7, 14, 6, 753);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			if (if_block) if_block.m(span, null);
    		},
    		p: function update(ctx, dirty) {
    			if (!/*isAdding*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					if_block.m(span, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_buttons_slot$1.name,
    		type: "slot",
    		source: "(15:6) ",
    		ctx
    	});

    	return block;
    }

    // (1:0) <AppLayout active="characters">
    function create_default_slot$5(ctx) {
    	let div0;
    	let itemlistnav;
    	let t0;
    	let div1;
    	let form;
    	let t1;
    	let div2;
    	let current;

    	itemlistnav = new ItemListNav({
    			props: {
    				slug: "characters",
    				type: "character",
    				collection: /*$project*/ ctx[2].characters,
    				active: /*paramId*/ ctx[1],
    				$$slots: {
    					default: [
    						create_default_slot_6,
    						({ item }) => ({ 14: item }),
    						({ item }) => item ? 16384 : 0
    					]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	form = new Form({
    			props: {
    				hasChanges: /*hasChanges*/ ctx[4],
    				$$slots: {
    					buttons: [create_buttons_slot$1],
    					default: [create_default_slot_1$3]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	form.$on("submit", /*save*/ ctx[5]);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			create_component(itemlistnav.$$.fragment);
    			t0 = space();
    			div1 = element("div");
    			create_component(form.$$.fragment);
    			t1 = space();
    			div2 = element("div");
    			div2.textContent = "Preview maybe?";
    			attr_dev(div0, "class", "col1");
    			add_location(div0, file$7, 1, 2, 35);
    			attr_dev(div1, "class", "grow p1");
    			add_location(div1, file$7, 7, 2, 264);
    			attr_dev(div2, "class", "col2");
    			add_location(div2, file$7, 21, 2, 943);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			mount_component(itemlistnav, div0, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			mount_component(form, div1, null);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div2, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const itemlistnav_changes = {};
    			if (dirty & /*$project*/ 4) itemlistnav_changes.collection = /*$project*/ ctx[2].characters;
    			if (dirty & /*paramId*/ 2) itemlistnav_changes.active = /*paramId*/ ctx[1];

    			if (dirty & /*$$scope, item*/ 49152) {
    				itemlistnav_changes.$$scope = { dirty, ctx };
    			}

    			itemlistnav.$set(itemlistnav_changes);
    			const form_changes = {};
    			if (dirty & /*hasChanges*/ 16) form_changes.hasChanges = /*hasChanges*/ ctx[4];

    			if (dirty & /*$$scope, isAdding, input*/ 32777) {
    				form_changes.$$scope = { dirty, ctx };
    			}

    			form.$set(form_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(itemlistnav.$$.fragment, local);
    			transition_in(form.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(itemlistnav.$$.fragment, local);
    			transition_out(form.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			destroy_component(itemlistnav);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    			destroy_component(form);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$5.name,
    		type: "slot",
    		source: "(1:0) <AppLayout active=\\\"characters\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$8(ctx) {
    	let applayout;
    	let current;

    	applayout = new AppLayout({
    			props: {
    				active: "characters",
    				$$slots: { default: [create_default_slot$5] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(applayout.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(applayout, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const applayout_changes = {};

    			if (dirty & /*$$scope, hasChanges, isAdding, input, $project, paramId*/ 32799) {
    				applayout_changes.$$scope = { dirty, ctx };
    			}

    			applayout.$set(applayout_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(applayout.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(applayout.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(applayout, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function createDefaultInput$2() {
    	return {
    		name: "",
    		graphics: { still: null, moving: null },
    		abilities: []
    	};
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let paramId;
    	let isAdding;
    	let hasChanges;
    	let $project;
    	validate_store(project, "project");
    	component_subscribe($$self, project, $$value => $$invalidate(2, $project = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("CharacterBuilder", slots, []);
    	let { params = {} } = $$props;
    	let input = createDefaultInput$2();

    	function create() {
    		$$invalidate(0, input = createDefaultInput$2());
    	}

    	function edit(name) {
    		if (!$project.characters.hasOwnProperty(name)) return;

    		$$invalidate(0, input = {
    			...createDefaultInput$2(),
    			...JSON.parse(JSON.stringify($project.characters[name]))
    		});
    	}

    	function save() {
    		if (validator.empty(input.name)) {
    			document.getElementById("name").focus();
    			return;
    		}

    		if (isAdding) $$invalidate(0, input.id = getNextId($project.characters), input);
    		set_store_value(project, $project.characters[input.id] = JSON.parse(JSON.stringify(input)), $project);
    		push(`/characters/${encodeURIComponent(input.id)}`);
    	}

    	function del() {
    		if (confirm(`Are you sure you want to delete "${input.name}"?`)) {
    			delete $project.characters[input.id];
    			project.set($project);
    			push(`/characters/new`);
    		}
    	}

    	const writable_props = ["params"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<CharacterBuilder> was created with unknown prop '${key}'`);
    	});

    	function fieldtext_value_binding(value) {
    		if ($$self.$$.not_equal(input.name, value)) {
    			input.name = value;
    			$$invalidate(0, input);
    		}
    	}

    	function fieldnumber_value_binding(value) {
    		if ($$self.$$.not_equal(input.speed, value)) {
    			input.speed = value;
    			$$invalidate(0, input);
    		}
    	}

    	function fieldartpicker0_value_binding(value) {
    		if ($$self.$$.not_equal(input.graphics.still, value)) {
    			input.graphics.still = value;
    			$$invalidate(0, input);
    		}
    	}

    	function fieldartpicker1_value_binding(value) {
    		if ($$self.$$.not_equal(input.graphics.moving, value)) {
    			input.graphics.moving = value;
    			$$invalidate(0, input);
    		}
    	}

    	$$self.$$set = $$props => {
    		if ("params" in $$props) $$invalidate(7, params = $$props.params);
    	};

    	$$self.$capture_state = () => ({
    		AppLayout,
    		ArtThumb,
    		FieldArtPicker,
    		FieldText,
    		FieldNumber,
    		Form,
    		ItemListNav,
    		project,
    		validator,
    		push,
    		getNextId,
    		params,
    		input,
    		createDefaultInput: createDefaultInput$2,
    		create,
    		edit,
    		save,
    		del,
    		paramId,
    		isAdding,
    		hasChanges,
    		$project
    	});

    	$$self.$inject_state = $$props => {
    		if ("params" in $$props) $$invalidate(7, params = $$props.params);
    		if ("input" in $$props) $$invalidate(0, input = $$props.input);
    		if ("paramId" in $$props) $$invalidate(1, paramId = $$props.paramId);
    		if ("isAdding" in $$props) $$invalidate(3, isAdding = $$props.isAdding);
    		if ("hasChanges" in $$props) $$invalidate(4, hasChanges = $$props.hasChanges);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*params*/ 128) {
    			$$invalidate(1, paramId = decodeURIComponent(params.id) || "new");
    		}

    		if ($$self.$$.dirty & /*paramId*/ 2) {
    			paramId == "new" ? create() : edit(paramId);
    		}

    		if ($$self.$$.dirty & /*input*/ 1) {
    			$$invalidate(3, isAdding = input.id == null);
    		}

    		if ($$self.$$.dirty & /*input, $project*/ 5) {
    			$$invalidate(4, hasChanges = input != null && !validator.equals(input, $project.characters[input.id]));
    		}
    	};

    	return [
    		input,
    		paramId,
    		$project,
    		isAdding,
    		hasChanges,
    		save,
    		del,
    		params,
    		fieldtext_value_binding,
    		fieldnumber_value_binding,
    		fieldartpicker0_value_binding,
    		fieldartpicker1_value_binding
    	];
    }

    class CharacterBuilder extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, { params: 7 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CharacterBuilder",
    			options,
    			id: create_fragment$8.name
    		});
    	}

    	get params() {
    		throw new Error("<CharacterBuilder>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set params(value) {
    		throw new Error("<CharacterBuilder>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\pages\EnemyBuilder.svelte generated by Svelte v3.38.3 */
    const file$6 = "src\\pages\\EnemyBuilder.svelte";

    // (3:4) <ItemListNav slug="enemies" type="enemy" collection={$project.enemies} active={paramId} let:item>
    function create_default_slot_1$2(ctx) {
    	let artthumb;
    	let t0;
    	let t1_value = /*item*/ ctx[3].name + "";
    	let t1;
    	let current;

    	artthumb = new ArtThumb({
    			props: { id: /*item*/ ctx[3].graphics.still },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(artthumb.$$.fragment);
    			t0 = space();
    			t1 = text(t1_value);
    		},
    		m: function mount(target, anchor) {
    			mount_component(artthumb, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const artthumb_changes = {};
    			if (dirty & /*item*/ 8) artthumb_changes.id = /*item*/ ctx[3].graphics.still;
    			artthumb.$set(artthumb_changes);
    			if ((!current || dirty & /*item*/ 8) && t1_value !== (t1_value = /*item*/ ctx[3].name + "")) set_data_dev(t1, t1_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(artthumb.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(artthumb.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(artthumb, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$2.name,
    		type: "slot",
    		source: "(3:4) <ItemListNav slug=\\\"enemies\\\" type=\\\"enemy\\\" collection={$project.enemies} active={paramId} let:item>",
    		ctx
    	});

    	return block;
    }

    // (1:0) <AppLayout active="enemies">
    function create_default_slot$4(ctx) {
    	let div0;
    	let itemlistnav;
    	let t0;
    	let div1;
    	let t2;
    	let div2;
    	let current;

    	itemlistnav = new ItemListNav({
    			props: {
    				slug: "enemies",
    				type: "enemy",
    				collection: /*$project*/ ctx[1].enemies,
    				active: /*paramId*/ ctx[0],
    				$$slots: {
    					default: [
    						create_default_slot_1$2,
    						({ item }) => ({ 3: item }),
    						({ item }) => item ? 8 : 0
    					]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			create_component(itemlistnav.$$.fragment);
    			t0 = space();
    			div1 = element("div");
    			div1.textContent = "Form fields";
    			t2 = space();
    			div2 = element("div");
    			div2.textContent = "Preview maybe?";
    			attr_dev(div0, "class", "col1");
    			add_location(div0, file$6, 1, 2, 32);
    			attr_dev(div1, "class", "grow p1");
    			add_location(div1, file$6, 7, 2, 251);
    			attr_dev(div2, "class", "col2");
    			add_location(div2, file$6, 8, 2, 293);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			mount_component(itemlistnav, div0, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div2, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const itemlistnav_changes = {};
    			if (dirty & /*$project*/ 2) itemlistnav_changes.collection = /*$project*/ ctx[1].enemies;
    			if (dirty & /*paramId*/ 1) itemlistnav_changes.active = /*paramId*/ ctx[0];

    			if (dirty & /*$$scope, item*/ 24) {
    				itemlistnav_changes.$$scope = { dirty, ctx };
    			}

    			itemlistnav.$set(itemlistnav_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(itemlistnav.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(itemlistnav.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			destroy_component(itemlistnav);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$4.name,
    		type: "slot",
    		source: "(1:0) <AppLayout active=\\\"enemies\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let applayout;
    	let current;

    	applayout = new AppLayout({
    			props: {
    				active: "enemies",
    				$$slots: { default: [create_default_slot$4] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(applayout.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(applayout, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const applayout_changes = {};

    			if (dirty & /*$$scope, $project, paramId*/ 19) {
    				applayout_changes.$$scope = { dirty, ctx };
    			}

    			applayout.$set(applayout_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(applayout.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(applayout.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(applayout, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let paramId;
    	let $project;
    	validate_store(project, "project");
    	component_subscribe($$self, project, $$value => $$invalidate(1, $project = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("EnemyBuilder", slots, []);
    	let { params = {} } = $$props;
    	const writable_props = ["params"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<EnemyBuilder> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("params" in $$props) $$invalidate(2, params = $$props.params);
    	};

    	$$self.$capture_state = () => ({
    		AppLayout,
    		ArtThumb,
    		ItemListNav,
    		project,
    		params,
    		paramId,
    		$project
    	});

    	$$self.$inject_state = $$props => {
    		if ("params" in $$props) $$invalidate(2, params = $$props.params);
    		if ("paramId" in $$props) $$invalidate(0, paramId = $$props.paramId);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*params*/ 4) {
    			$$invalidate(0, paramId = decodeURIComponent(params.id) || "new");
    		}
    	};

    	return [paramId, $project, params];
    }

    class EnemyBuilder extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { params: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "EnemyBuilder",
    			options,
    			id: create_fragment$7.name
    		});
    	}

    	get params() {
    		throw new Error("<EnemyBuilder>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set params(value) {
    		throw new Error("<EnemyBuilder>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function componentToHex(c) {
      var hex = c.toString(16);
      return hex.length == 1 ? '0' + hex : hex
    }

    function rgbToHex(r, g, b) {
      return parseInt(componentToHex(r) + componentToHex(g) + componentToHex(b), 16)
    }

    function rgbaStringToHex(rgbaString) {
      const [r, g, b, a] = rgbaString
        .replace('rgba(', '')
        .replace('rgb(', '')
        .replace(')', '')
        .split(',')
        .map(s => parseInt(s.trim()));
      return rgbToHex(r, g, b)
    }

    function spriteFromArtId(project, id) {
      const art = project.art[id];
      const texture = PIXI.Texture.from(art.png);
      if (art.animated) {
        let frameX = 0;
        let textureFrames = [];
        while (frameX < art.width) {
          const textureFrame = texture.clone();
          textureFrame.frame = new PIXI.Rectangle(frameX, 0, art.frameWidth, art.height);
          textureFrame.updateUvs();
          textureFrames.push(textureFrame);
          frameX += art.frameWidth;
        }
        const animation = new PIXI.AnimatedSprite(textureFrames);
        animation.animationSpeed = art.frameRate / 60;
        animation.play();
        return animation
      } else {
        return new PIXI.Sprite(texture)
      }
    }

    class Player extends PIXI.Container {
      constructor(project, config, x, y) {
        super();
        this.x = x;
        this.y = y;

        this.config = config;

        this.stillSprite = spriteFromArtId(project, config.graphics.still);
        this.stillSprite.anchor.set(0.5);
        this.movingSprite = spriteFromArtId(project, config.graphics.moving);
        this.movingSprite.anchor.set(0.5);
        this.movingSprite.visible = false;
        this.addChild(this.stillSprite);
        this.addChild(this.movingSprite);

        this.isMoving = false;

        this.path = [];
        this.target = null;
      }

      bringToFront() {
        // todo: check if we're already at the front?
        if (!this.parent) return

        this.parent.removeChild(this);
        this.parent.addChild(this);
      }

      setMoving(isMoving) {
        if (this.isMoving == isMoving) return

        this.isMoving = isMoving;
        this.stillSprite.visible = !isMoving;
        this.movingSprite.visible = isMoving;
      }

      setTarget(target) {
        // make it compute a path around any blocks in the way
        // if no path available, get as close as possible to clicked point
        this.path = this.parent.levelGrid.findPath(this.position, target);
        this.targetNextPathPoint();
      }

      targetNextPathPoint() {
        this.target = this.path.shift();
        if (this.target != null) {
          // rotate to face the target
          this.rotation = Math.atan2(this.target.y - this.y, this.target.x - this.x) + (90 * Math.PI) / 180;
        }
      }

      onTick() {
        // move toward target/s
        if (this.target == null && this.path.length) {
          this.targetNextPathPoint();
        }

        if (this.target) {
          // change to moving texture
          this.setMoving(true);

          // move player toward target
          const run = this.target.x - this.x;
          const rise = this.target.y - this.y;
          const length = Math.sqrt(rise * rise + run * run);
          let xChange = (run / length) * this.config.speed;
          let yChange = (rise / length) * this.config.speed;
          if (isNaN(xChange)) xChange = 0;
          if (isNaN(yChange)) yChange = 0;

          // change player position
          const canHitTargetX = Math.abs(this.target.x - this.x) <= xChange;
          const canHitTargetY = Math.abs(this.target.y - this.y) <= yChange;
          this.x = canHitTargetX ? this.target.x : this.x + xChange;
          this.y = canHitTargetY ? this.target.y : this.y + yChange;

          // if we hit our target on this frame, start moving toward the next target
          if (canHitTargetX && canHitTargetY) {
            this.targetNextPathPoint();
          }
        } else {
          this.setMoving(false);
        }
      }
    }

    class Block extends PIXI.Sprite {
      constructor(project, { blockId, x, y }) {
        const blockConfig = project.blocks[blockId];
        const art = project.art[blockConfig.graphic];
        super(PIXI.Texture.from(art.png));

        this.x = x * art.width;
        this.y = y * art.height;
      }
    }

    function pathTo(node) {
      var curr = node;
      var path = [];
      while (curr.parent) {
        path.unshift(curr);
        curr = curr.parent;
      }
      return path
    }

    function getHeap() {
      return new BinaryHeap(function (node) {
        return node.f
      })
    }

    const astar = {
      /**
      * Perform an A* Search on a graph given a start and end node.
      * @param {Graph} graph
      * @param {GridNode} start
      * @param {GridNode} end
      * @param {Object} [options]
      * @param {bool} [options.closest] Specifies whether to return the
                 path to the closest node if the target is unreachable.
      * @param {Function} [options.heuristic] Heuristic function (see
      *          astar.heuristics).
      */
      search: function (graph, start, end, options) {
        graph.cleanDirty();
        options = options || {};
        var heuristic = options.heuristic || astar.heuristics.manhattan;
        var closest = options.closest || false;

        var openHeap = getHeap();
        var closestNode = start; // set the start node to be the closest if required

        start.h = heuristic(start, end);
        graph.markDirty(start);

        openHeap.push(start);

        while (openHeap.size() > 0) {
          // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
          var currentNode = openHeap.pop();

          // End case -- result has been found, return the traced path.
          if (currentNode === end) {
            return pathTo(currentNode)
          }

          // Normal case -- move currentNode from open to closed, process each of its neighbors.
          currentNode.closed = true;

          // Find all neighbors for the current node.
          var neighbors = graph.neighbors(currentNode);

          for (var i = 0, il = neighbors.length; i < il; ++i) {
            var neighbor = neighbors[i];

            if (neighbor.closed || neighbor.isWall()) {
              // Not a valid node to process, skip to next neighbor.
              continue
            }

            // The g score is the shortest distance from start to current node.
            // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.
            var gScore = currentNode.g + neighbor.getCost(currentNode);
            var beenVisited = neighbor.visited;

            if (!beenVisited || gScore < neighbor.g) {
              // Found an optimal (so far) path to this node.  Take score for node to see how good it is.
              neighbor.visited = true;
              neighbor.parent = currentNode;
              neighbor.h = neighbor.h || heuristic(neighbor, end);
              neighbor.g = gScore;
              neighbor.f = neighbor.g + neighbor.h;
              graph.markDirty(neighbor);
              if (closest) {
                // If the neighbour is closer than the current closestNode or if it's equally close but has
                // a cheaper path than the current closest node then it becomes the closest node
                if (neighbor.h < closestNode.h || (neighbor.h === closestNode.h && neighbor.g < closestNode.g)) {
                  closestNode = neighbor;
                }
              }

              if (!beenVisited) {
                // Pushing to heap will put it in proper place based on the 'f' value.
                openHeap.push(neighbor);
              } else {
                // Already seen the node, but since it has been rescored we need to reorder it in the heap
                openHeap.rescoreElement(neighbor);
              }
            }
          }
        }

        if (closest) {
          return pathTo(closestNode)
        }

        // No result was found - empty array signifies failure to find path.
        return []
      },
      // See list of heuristics: http://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html
      heuristics: {
        manhattan: function (pos0, pos1) {
          var d1 = Math.abs(pos1.x - pos0.x);
          var d2 = Math.abs(pos1.y - pos0.y);
          return d1 + d2
        },
        diagonal: function (pos0, pos1) {
          var D = 1;
          var D2 = Math.sqrt(2);
          var d1 = Math.abs(pos1.x - pos0.x);
          var d2 = Math.abs(pos1.y - pos0.y);
          return D * (d1 + d2) + (D2 - 2 * D) * Math.min(d1, d2)
        },
      },
      cleanNode: function (node) {
        node.f = 0;
        node.g = 0;
        node.h = 0;
        node.visited = false;
        node.closed = false;
        node.parent = null;
      },
    };

    /**
     * A graph memory structure
     * @param {Array} gridIn 2D array of input weights
     * @param {Object} [options]
     * @param {bool} [options.diagonal] Specifies whether diagonal moves are allowed
     */
    function Graph(gridIn, options) {
      options = options || {};
      this.nodes = [];
      this.diagonal = !!options.diagonal;
      this.grid = [];
      for (var x = 0; x < gridIn.length; x++) {
        this.grid[x] = [];

        for (var y = 0, row = gridIn[x]; y < row.length; y++) {
          var node = new GridNode(x, y, row[y]);
          this.grid[x][y] = node;
          this.nodes.push(node);
        }
      }
      this.init();
    }

    Graph.prototype.init = function () {
      this.dirtyNodes = [];
      for (var i = 0; i < this.nodes.length; i++) {
        astar.cleanNode(this.nodes[i]);
      }
    };

    Graph.prototype.cleanDirty = function () {
      for (var i = 0; i < this.dirtyNodes.length; i++) {
        astar.cleanNode(this.dirtyNodes[i]);
      }
      this.dirtyNodes = [];
    };

    Graph.prototype.markDirty = function (node) {
      this.dirtyNodes.push(node);
    };

    Graph.prototype.neighbors = function (node) {
      var ret = [];
      var x = node.x;
      var y = node.y;
      var grid = this.grid;

      // West
      if (grid[x - 1] && grid[x - 1][y]) {
        ret.push(grid[x - 1][y]);
      }

      // East
      if (grid[x + 1] && grid[x + 1][y]) {
        ret.push(grid[x + 1][y]);
      }

      // South
      if (grid[x] && grid[x][y - 1]) {
        ret.push(grid[x][y - 1]);
      }

      // North
      if (grid[x] && grid[x][y + 1]) {
        ret.push(grid[x][y + 1]);
      }

      if (this.diagonal) {
        // Southwest
        if (grid[x - 1] && grid[x - 1][y - 1]) {
          ret.push(grid[x - 1][y - 1]);
        }

        // Southeast
        if (grid[x + 1] && grid[x + 1][y - 1]) {
          ret.push(grid[x + 1][y - 1]);
        }

        // Northwest
        if (grid[x - 1] && grid[x - 1][y + 1]) {
          ret.push(grid[x - 1][y + 1]);
        }

        // Northeast
        if (grid[x + 1] && grid[x + 1][y + 1]) {
          ret.push(grid[x + 1][y + 1]);
        }
      }

      return ret
    };

    Graph.prototype.toString = function () {
      var graphString = [];
      var nodes = this.grid;
      for (var x = 0; x < nodes.length; x++) {
        var rowDebug = [];
        var row = nodes[x];
        for (var y = 0; y < row.length; y++) {
          rowDebug.push(row[y].weight);
        }
        graphString.push(rowDebug.join(' '));
      }
      return graphString.join('\n')
    };

    function GridNode(x, y, weight) {
      this.x = x;
      this.y = y;
      this.weight = weight;
    }

    GridNode.prototype.toString = function () {
      return '[' + this.x + ' ' + this.y + ']'
    };

    GridNode.prototype.getCost = function (fromNeighbor) {
      // Take diagonal weight into consideration.
      if (fromNeighbor && fromNeighbor.x != this.x && fromNeighbor.y != this.y) {
        return this.weight * 1.41421
      }
      return this.weight
    };

    GridNode.prototype.isWall = function () {
      return this.weight === 0
    };

    function BinaryHeap(scoreFunction) {
      this.content = [];
      this.scoreFunction = scoreFunction;
    }

    BinaryHeap.prototype = {
      push: function (element) {
        // Add the new element to the end of the array.
        this.content.push(element);

        // Allow it to sink down.
        this.sinkDown(this.content.length - 1);
      },
      pop: function () {
        // Store the first element so we can return it later.
        var result = this.content[0];
        // Get the element at the end of the array.
        var end = this.content.pop();
        // If there are any elements left, put the end element at the
        // start, and let it bubble up.
        if (this.content.length > 0) {
          this.content[0] = end;
          this.bubbleUp(0);
        }
        return result
      },
      remove: function (node) {
        var i = this.content.indexOf(node);

        // When it is found, the process seen in 'pop' is repeated
        // to fill up the hole.
        var end = this.content.pop();

        if (i !== this.content.length - 1) {
          this.content[i] = end;

          if (this.scoreFunction(end) < this.scoreFunction(node)) {
            this.sinkDown(i);
          } else {
            this.bubbleUp(i);
          }
        }
      },
      size: function () {
        return this.content.length
      },
      rescoreElement: function (node) {
        this.sinkDown(this.content.indexOf(node));
      },
      sinkDown: function (n) {
        // Fetch the element that has to be sunk.
        var element = this.content[n];

        // When at 0, an element can not sink any further.
        while (n > 0) {
          // Compute the parent element's index, and fetch it.
          var parentN = ((n + 1) >> 1) - 1;
          var parent = this.content[parentN];
          // Swap the elements if the parent is greater.
          if (this.scoreFunction(element) < this.scoreFunction(parent)) {
            this.content[parentN] = element;
            this.content[n] = parent;
            // Update 'n' to continue at the new position.
            n = parentN;
          }
          // Found a parent that is less, no need to sink any further.
          else {
            break
          }
        }
      },
      bubbleUp: function (n) {
        // Look up the target element and its score.
        var length = this.content.length;
        var element = this.content[n];
        var elemScore = this.scoreFunction(element);

        while (true) {
          // Compute the indices of the child elements.
          var child2N = (n + 1) << 1;
          var child1N = child2N - 1;
          // This is used to store the new position of the element, if any.
          var swap = null;
          var child1Score;
          // If the first child exists (is inside the array)...
          if (child1N < length) {
            // Look it up and compute its score.
            var child1 = this.content[child1N];
            child1Score = this.scoreFunction(child1);

            // If the score is less than our element's, we need to swap.
            if (child1Score < elemScore) {
              swap = child1N;
            }
          }

          // Do the same checks for the other child.
          if (child2N < length) {
            var child2 = this.content[child2N];
            var child2Score = this.scoreFunction(child2);
            if (child2Score < (swap === null ? elemScore : child1Score)) {
              swap = child2N;
            }
          }

          // If the element needs to be moved, swap it, and continue.
          if (swap !== null) {
            this.content[n] = this.content[swap];
            this.content[swap] = element;
            n = swap;
          }
          // Otherwise, we are done.
          else {
            break
          }
        }
      },
    };

    class LevelGrid {
      constructor(project, level, gridSize) {
        this.gridSize = gridSize;
        this.blocks = level.blocks
          .filter(b => project.blocks[b.blockId].canWalk)
          // sort by x, then y
          .sort((a, b) => (a.x == b.x ? a.y - b.y : a.x - b.x));

        // build a 2d array representing walkable space
        // [0,0,0,1]
        // [0,1,1,1]
        // [1,1,0,0]
        // 1 = walkable
        // 0/empty/null = not walkable

        this.grid = [];
        for (const b of this.blocks) {
          if (this.grid[b.x] == null) {
            this.grid[b.x] = [];
          }
          this.grid[b.x][b.y] = 1;
        }

        // fill in blanks
        const highestX = this.blocks.map(b => b.x).sort((a, b) => b - a)[0];
        const highestY = this.blocks.map(b => b.y).sort((a, b) => b - a)[0];
        for (let x = 0; x < highestX; x++) {
          // fill entire missing columns with 0
          if (this.grid[x] == null) {
            this.grid[x] = Array.from(Array(highestY)).map(n => 0);
          } else {
            // fill any missing y values in a row
            for (let y = 0; y < highestY; y++) {
              this.grid[x][y] = this.grid[x][y] == 1 ? 1 : 0;
            }
          }
        }
      }

      findPath(from, to) {
        const gridFrom = this.toGridCoordinates(from);
        // TODO: translate to into the nearest grid coordinate if they clicked off the grid
        // find closest walkable grid spot to [x,y] they clicked
        // if (this.grid[gridTo.x] == null || this.grid[gridTo.x][gridTo.y] == null || this.grid[gridTo.x][gridTo.y] == 0) {
        //   const gridWithDistance = this.grid
        //     .map(g => {
        //       return {
        //         ...g,
        //         distance: Math.sqrt(Math.pow(Math.abs(g.x - gridTo.x), 2) + Math.pow(Math.abs(g.y - gridTo.y), 2)),
        //       }
        //     })
        //     .sort((a, b) => a.distance - b.distance)
        //   gridTo = gridWithDistance[0]
        // }

        let gridTo = this.toGridCoordinates(to);
        const graph = new Graph(this.grid, { diagonal: true });
        const result = astar.search(graph, graph.grid[gridFrom.x][gridFrom.y], graph.grid[gridTo.x][gridTo.y]);

        // TODO: make the last node in the path the exact coordinates clicked if possible?  or just rely on everything always moving to center of grid spaces?
        return result.map(gridNode => this.toGameCoordinates(gridNode))
      }

      toGridCoordinates(coords) {
        return {
          x: Math.floor(coords.x / this.gridSize),
          y: Math.floor(coords.y / this.gridSize),
        }
      }

      /**
       * { x: 0, y: 0 } to { x: 0, y: 0}
       * { x: 2, y: 3 } to { x: 80, y: 120 }
       */
      toGameCoordinates(coords) {
        return {
          x: coords.x * this.gridSize + this.gridSize / 2,
          y: coords.y * this.gridSize + this.gridSize / 2,
        }
      }
    }

    /* src\pages\LevelBuilder.Renderer.svelte generated by Svelte v3.38.3 */

    const { console: console_1 } = globals;
    const file$5 = "src\\pages\\LevelBuilder.Renderer.svelte";

    function create_fragment$6(ctx) {
    	let div;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "pixi-container svelte-1fhmuas");
    			add_location(div, file$5, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			/*div_binding*/ ctx[8](div);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "pointerdown", prevent_default(/*pointerdown_handler*/ ctx[4]), false, true, false),
    					listen_dev(div, "pointerup", prevent_default(/*pointerup_handler*/ ctx[5]), false, true, false),
    					listen_dev(div, "pointermove", prevent_default(/*pointermove_handler*/ ctx[6]), false, true, false),
    					listen_dev(div, "contextmenu", prevent_default(/*contextmenu_handler*/ ctx[7]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*div_binding*/ ctx[8](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let $project;
    	validate_store(project, "project");
    	component_subscribe($$self, project, $$value => $$invalidate(13, $project = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("LevelBuilder_Renderer", slots, []);
    	let pixiContainer;
    	let pixiApp;
    	let world;
    	let player;
    	let { level } = $$props;
    	let { screenTarget } = $$props;
    	let mounted = false;

    	onMount(() => {
    		pixiApp = new PIXI.Application({ resizeTo: pixiContainer });
    		pixiContainer.appendChild(pixiApp.view);
    		pixiApp.ticker.add(onTick);
    		$$invalidate(3, mounted = true);
    	});

    	let levelGrid;

    	function renderLevel(level) {
    		console.log("render level");
    		pixiApp.renderer.backgroundColor = rgbaStringToHex(level.backgroundColor);
    		pixiApp.stage.children.forEach(c => pixiApp.stage.removeChild(c));

    		// set level grid on stage so sprites can access it via hierarchy?
    		pixiApp.stage.levelGrid = new LevelGrid($project, level, 40);

    		world = new PIXI.Container();

    		for (const blockConfig of level.blocks) {
    			const block = new Block($project, blockConfig);
    			world.addChild(block);
    		}

    		pixiApp.stage.addChild(world);

    		if (!player) {
    			player = new Player($project, $project.characters[0], 60, 60);
    			pixiApp.stage.addChild(player);
    		} else {
    			player.bringToFront();
    		}
    	}

    	const screenCenter = { x: 0, y: 0 };

    	function setPlayerTarget() {
    		const worldCoordinates = {
    			x: screenTarget.x - screenCenter.x + player?.x ?? 0,
    			y: screenTarget.y - screenCenter.y + player?.y ?? 0
    		};

    		player.setTarget(worldCoordinates);
    	}

    	function onTick() {
    		screenCenter.x = pixiApp.renderer.width / 2;
    		screenCenter.y = pixiApp.renderer.height / 2;
    		player.onTick();
    		pixiApp.stage.x = screenCenter.x;
    		pixiApp.stage.y = screenCenter.y;
    		pixiApp.stage.pivot.x = player.x;
    		pixiApp.stage.pivot.y = player.y;
    	}

    	const writable_props = ["level", "screenTarget"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<LevelBuilder_Renderer> was created with unknown prop '${key}'`);
    	});

    	function pointerdown_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function pointerup_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function pointermove_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function contextmenu_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			pixiContainer = $$value;
    			$$invalidate(0, pixiContainer);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("level" in $$props) $$invalidate(1, level = $$props.level);
    		if ("screenTarget" in $$props) $$invalidate(2, screenTarget = $$props.screenTarget);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		rgbaStringToHex,
    		project,
    		Player,
    		Block,
    		LevelGrid,
    		pixiContainer,
    		pixiApp,
    		world,
    		player,
    		level,
    		screenTarget,
    		mounted,
    		levelGrid,
    		renderLevel,
    		screenCenter,
    		setPlayerTarget,
    		onTick,
    		$project
    	});

    	$$self.$inject_state = $$props => {
    		if ("pixiContainer" in $$props) $$invalidate(0, pixiContainer = $$props.pixiContainer);
    		if ("pixiApp" in $$props) pixiApp = $$props.pixiApp;
    		if ("world" in $$props) world = $$props.world;
    		if ("player" in $$props) player = $$props.player;
    		if ("level" in $$props) $$invalidate(1, level = $$props.level);
    		if ("screenTarget" in $$props) $$invalidate(2, screenTarget = $$props.screenTarget);
    		if ("mounted" in $$props) $$invalidate(3, mounted = $$props.mounted);
    		if ("levelGrid" in $$props) levelGrid = $$props.levelGrid;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*mounted, level*/ 10) {
    			if (mounted && level != null) renderLevel(level);
    		}

    		if ($$self.$$.dirty & /*screenTarget*/ 4) {
    			if (screenTarget.x != 0 || screenTarget.y != 0) setPlayerTarget();
    		}
    	};

    	return [
    		pixiContainer,
    		level,
    		screenTarget,
    		mounted,
    		pointerdown_handler,
    		pointerup_handler,
    		pointermove_handler,
    		contextmenu_handler,
    		div_binding
    	];
    }

    class LevelBuilder_Renderer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { level: 1, screenTarget: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LevelBuilder_Renderer",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*level*/ ctx[1] === undefined && !("level" in props)) {
    			console_1.warn("<LevelBuilder_Renderer> was created without expected prop 'level'");
    		}

    		if (/*screenTarget*/ ctx[2] === undefined && !("screenTarget" in props)) {
    			console_1.warn("<LevelBuilder_Renderer> was created without expected prop 'screenTarget'");
    		}
    	}

    	get level() {
    		throw new Error("<LevelBuilder_Renderer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set level(value) {
    		throw new Error("<LevelBuilder_Renderer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get screenTarget() {
    		throw new Error("<LevelBuilder_Renderer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set screenTarget(value) {
    		throw new Error("<LevelBuilder_Renderer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\pages\LevelBuilder.svelte generated by Svelte v3.38.3 */

    const { Object: Object_1 } = globals;
    const file$4 = "src\\pages\\LevelBuilder.svelte";

    // (3:4) <ItemListNav slug="levels" type="level" collection={$project.levels} active={paramId} let:item>
    function create_default_slot_4$1(ctx) {
    	let div;
    	let t_value = /*item*/ ctx[26].name + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "class", "level-nav-item svelte-he9i7z");
    			set_style(div, "background-image", "url(" + /*item*/ ctx[26].thumbnail + ")");
    			add_location(div, file$4, 3, 6, 158);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*item*/ 67108864 && t_value !== (t_value = /*item*/ ctx[26].name + "")) set_data_dev(t, t_value);

    			if (dirty & /*item*/ 67108864) {
    				set_style(div, "background-image", "url(" + /*item*/ ctx[26].thumbnail + ")");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_4$1.name,
    		type: "slot",
    		source: "(3:4) <ItemListNav slug=\\\"levels\\\" type=\\\"level\\\" collection={$project.levels} active={paramId} let:item>",
    		ctx
    	});

    	return block;
    }

    // (10:2) {#if input}
    function create_if_block$1(ctx) {
    	let div0;
    	let levelrenderer;
    	let t0;
    	let div4;
    	let div1;
    	let button0;
    	let t1;
    	let button0_class_value;
    	let t2;
    	let button1;
    	let t3;
    	let button1_class_value;
    	let t4;
    	let div2;
    	let form;
    	let t5;
    	let div3;
    	let current;
    	let mounted;
    	let dispose;

    	levelrenderer = new LevelBuilder_Renderer({
    			props: {
    				level: /*input*/ ctx[0],
    				screenTarget: /*screenTarget*/ ctx[4]
    			},
    			$$inline: true
    		});

    	levelrenderer.$on("pointerdown", /*onPointerDown*/ ctx[11]);
    	levelrenderer.$on("pointerup", /*onPointerUp*/ ctx[12]);
    	levelrenderer.$on("pointermove", /*onPointerMove*/ ctx[13]);

    	form = new Form({
    			props: {
    				hasChanges: /*hasChanges*/ ctx[7],
    				$$slots: {
    					buttons: [create_buttons_slot],
    					default: [create_default_slot_1$1]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	form.$on("submit", /*save*/ ctx[9]);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			create_component(levelrenderer.$$.fragment);
    			t0 = space();
    			div4 = element("div");
    			div1 = element("div");
    			button0 = element("button");
    			t1 = text("Play");
    			t2 = space();
    			button1 = element("button");
    			t3 = text("Edit");
    			t4 = space();
    			div2 = element("div");
    			create_component(form.$$.fragment);
    			t5 = space();
    			div3 = element("div");
    			div3.textContent = "Properties of selected item, if any";
    			attr_dev(div0, "class", "grow");
    			add_location(div0, file$4, 10, 4, 321);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", button0_class_value = "btn " + (!/*isDrawing*/ ctx[3] ? "btn-success" : ""));
    			add_location(button0, file$4, 16, 8, 566);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", button1_class_value = "btn " + (/*isDrawing*/ ctx[3] ? "btn-success" : ""));
    			add_location(button1, file$4, 17, 8, 694);
    			attr_dev(div1, "class", "btn-group");
    			add_location(div1, file$4, 15, 6, 533);
    			attr_dev(div2, "class", "grow");
    			add_location(div2, file$4, 20, 6, 834);
    			attr_dev(div3, "class", "grow");
    			add_location(div3, file$4, 45, 6, 1785);
    			attr_dev(div4, "class", "col2 rows");
    			add_location(div4, file$4, 14, 4, 502);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			mount_component(levelrenderer, div0, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div1);
    			append_dev(div1, button0);
    			append_dev(button0, t1);
    			append_dev(div1, t2);
    			append_dev(div1, button1);
    			append_dev(button1, t3);
    			append_dev(div4, t4);
    			append_dev(div4, div2);
    			mount_component(form, div2, null);
    			append_dev(div4, t5);
    			append_dev(div4, div3);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[15], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[16], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			const levelrenderer_changes = {};
    			if (dirty & /*input*/ 1) levelrenderer_changes.level = /*input*/ ctx[0];
    			if (dirty & /*screenTarget*/ 16) levelrenderer_changes.screenTarget = /*screenTarget*/ ctx[4];
    			levelrenderer.$set(levelrenderer_changes);

    			if (!current || dirty & /*isDrawing*/ 8 && button0_class_value !== (button0_class_value = "btn " + (!/*isDrawing*/ ctx[3] ? "btn-success" : ""))) {
    				attr_dev(button0, "class", button0_class_value);
    			}

    			if (!current || dirty & /*isDrawing*/ 8 && button1_class_value !== (button1_class_value = "btn " + (/*isDrawing*/ ctx[3] ? "btn-success" : ""))) {
    				attr_dev(button1, "class", button1_class_value);
    			}

    			const form_changes = {};
    			if (dirty & /*hasChanges*/ 128) form_changes.hasChanges = /*hasChanges*/ ctx[7];

    			if (dirty & /*$$scope, isAdding, blockOptions, selectedBlockId, input*/ 134218081) {
    				form_changes.$$scope = { dirty, ctx };
    			}

    			form.$set(form_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(levelrenderer.$$.fragment, local);
    			transition_in(form.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(levelrenderer.$$.fragment, local);
    			transition_out(form.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			destroy_component(levelrenderer);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div4);
    			destroy_component(form);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(10:2) {#if input}",
    		ctx
    	});

    	return block;
    }

    // (29:10) <FieldText name="name" bind:value={input.name} placeholder="Type a name...">
    function create_default_slot_3$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Name");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3$1.name,
    		type: "slot",
    		source: "(29:10) <FieldText name=\\\"name\\\" bind:value={input.name} placeholder=\\\"Type a name...\\\">",
    		ctx
    	});

    	return block;
    }

    // (38:14) {#if option.graphic != null}
    function create_if_block_2(ctx) {
    	let artthumb;
    	let current;

    	artthumb = new ArtThumb({
    			props: { id: /*option*/ ctx[25].graphic },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(artthumb.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(artthumb, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const artthumb_changes = {};
    			if (dirty & /*option*/ 33554432) artthumb_changes.id = /*option*/ ctx[25].graphic;
    			artthumb.$set(artthumb_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(artthumb.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(artthumb.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(artthumb, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(38:14) {#if option.graphic != null}",
    		ctx
    	});

    	return block;
    }

    // (37:12) <InputSelect bind:value={selectedBlockId} options={blockOptions} let:option>
    function create_default_slot_2$1(ctx) {
    	let t0;
    	let t1_value = /*option*/ ctx[25].name + "";
    	let t1;
    	let current;
    	let if_block = /*option*/ ctx[25].graphic != null && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			t0 = space();
    			t1 = text(t1_value);
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*option*/ ctx[25].graphic != null) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*option*/ 33554432) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t0.parentNode, t0);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if ((!current || dirty & /*option*/ 33554432) && t1_value !== (t1_value = /*option*/ ctx[25].name + "")) set_data_dev(t1, t1_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2$1.name,
    		type: "slot",
    		source: "(37:12) <InputSelect bind:value={selectedBlockId} options={blockOptions} let:option>",
    		ctx
    	});

    	return block;
    }

    // (22:8) <Form on:submit={save} {hasChanges}>
    function create_default_slot_1$1(ctx) {
    	let fieldtext;
    	let updating_value;
    	let t0;
    	let div0;
    	let label0;
    	let t2;
    	let colorpicker;
    	let updating_value_1;
    	let t3;
    	let div1;
    	let label1;
    	let t5;
    	let inputselect;
    	let updating_value_2;
    	let current;

    	function fieldtext_value_binding(value) {
    		/*fieldtext_value_binding*/ ctx[17](value);
    	}

    	let fieldtext_props = {
    		name: "name",
    		placeholder: "Type a name...",
    		$$slots: { default: [create_default_slot_3$1] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].name !== void 0) {
    		fieldtext_props.value = /*input*/ ctx[0].name;
    	}

    	fieldtext = new FieldText({ props: fieldtext_props, $$inline: true });
    	binding_callbacks.push(() => bind(fieldtext, "value", fieldtext_value_binding));

    	function colorpicker_value_binding(value) {
    		/*colorpicker_value_binding*/ ctx[18](value);
    	}

    	let colorpicker_props = { dropdownClass: "below right" };

    	if (/*input*/ ctx[0].backgroundColor !== void 0) {
    		colorpicker_props.value = /*input*/ ctx[0].backgroundColor;
    	}

    	colorpicker = new ColorPicker({ props: colorpicker_props, $$inline: true });
    	binding_callbacks.push(() => bind(colorpicker, "value", colorpicker_value_binding));

    	function inputselect_value_binding(value) {
    		/*inputselect_value_binding*/ ctx[19](value);
    	}

    	let inputselect_props = {
    		options: /*blockOptions*/ ctx[8],
    		$$slots: {
    			default: [
    				create_default_slot_2$1,
    				({ option }) => ({ 25: option }),
    				({ option }) => option ? 33554432 : 0
    			]
    		},
    		$$scope: { ctx }
    	};

    	if (/*selectedBlockId*/ ctx[5] !== void 0) {
    		inputselect_props.value = /*selectedBlockId*/ ctx[5];
    	}

    	inputselect = new InputSelect({ props: inputselect_props, $$inline: true });
    	binding_callbacks.push(() => bind(inputselect, "value", inputselect_value_binding));

    	const block = {
    		c: function create() {
    			create_component(fieldtext.$$.fragment);
    			t0 = space();
    			div0 = element("div");
    			label0 = element("label");
    			label0.textContent = "Background color";
    			t2 = space();
    			create_component(colorpicker.$$.fragment);
    			t3 = space();
    			div1 = element("div");
    			label1 = element("label");
    			label1.textContent = "Block to draw";
    			t5 = space();
    			create_component(inputselect.$$.fragment);
    			add_location(label0, file$4, 30, 12, 1245);
    			attr_dev(div0, "class", "form-group");
    			add_location(div0, file$4, 29, 10, 1207);
    			add_location(label1, file$4, 35, 12, 1438);
    			attr_dev(div1, "class", "form-group");
    			add_location(div1, file$4, 34, 10, 1400);
    		},
    		m: function mount(target, anchor) {
    			mount_component(fieldtext, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div0, anchor);
    			append_dev(div0, label0);
    			append_dev(div0, t2);
    			mount_component(colorpicker, div0, null);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, label1);
    			append_dev(div1, t5);
    			mount_component(inputselect, div1, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const fieldtext_changes = {};

    			if (dirty & /*$$scope*/ 134217728) {
    				fieldtext_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*input*/ 1) {
    				updating_value = true;
    				fieldtext_changes.value = /*input*/ ctx[0].name;
    				add_flush_callback(() => updating_value = false);
    			}

    			fieldtext.$set(fieldtext_changes);
    			const colorpicker_changes = {};

    			if (!updating_value_1 && dirty & /*input*/ 1) {
    				updating_value_1 = true;
    				colorpicker_changes.value = /*input*/ ctx[0].backgroundColor;
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			colorpicker.$set(colorpicker_changes);
    			const inputselect_changes = {};
    			if (dirty & /*blockOptions*/ 256) inputselect_changes.options = /*blockOptions*/ ctx[8];

    			if (dirty & /*$$scope, option*/ 167772160) {
    				inputselect_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_2 && dirty & /*selectedBlockId*/ 32) {
    				updating_value_2 = true;
    				inputselect_changes.value = /*selectedBlockId*/ ctx[5];
    				add_flush_callback(() => updating_value_2 = false);
    			}

    			inputselect.$set(inputselect_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(fieldtext.$$.fragment, local);
    			transition_in(colorpicker.$$.fragment, local);
    			transition_in(inputselect.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(fieldtext.$$.fragment, local);
    			transition_out(colorpicker.$$.fragment, local);
    			transition_out(inputselect.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(fieldtext, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div0);
    			destroy_component(colorpicker);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div1);
    			destroy_component(inputselect);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$1.name,
    		type: "slot",
    		source: "(22:8) <Form on:submit={save} {hasChanges}>",
    		ctx
    	});

    	return block;
    }

    // (24:12) {#if !isAdding}
    function create_if_block_1(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Delete";
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-danger");
    			add_location(button, file$4, 24, 14, 976);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*del*/ ctx[10], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(24:12) {#if !isAdding}",
    		ctx
    	});

    	return block;
    }

    // (23:10) 
    function create_buttons_slot(ctx) {
    	let span;
    	let if_block = !/*isAdding*/ ctx[6] && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			span = element("span");
    			if (if_block) if_block.c();
    			attr_dev(span, "slot", "buttons");
    			add_location(span, file$4, 22, 10, 910);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			if (if_block) if_block.m(span, null);
    		},
    		p: function update(ctx, dirty) {
    			if (!/*isAdding*/ ctx[6]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(span, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_buttons_slot.name,
    		type: "slot",
    		source: "(23:10) ",
    		ctx
    	});

    	return block;
    }

    // (1:0) <AppLayout active="levels">
    function create_default_slot$3(ctx) {
    	let div;
    	let itemlistnav;
    	let t;
    	let if_block_anchor;
    	let current;

    	itemlistnav = new ItemListNav({
    			props: {
    				slug: "levels",
    				type: "level",
    				collection: /*$project*/ ctx[2].levels,
    				active: /*paramId*/ ctx[1],
    				$$slots: {
    					default: [
    						create_default_slot_4$1,
    						({ item }) => ({ 26: item }),
    						({ item }) => item ? 67108864 : 0
    					]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	let if_block = /*input*/ ctx[0] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(itemlistnav.$$.fragment);
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr_dev(div, "class", "col1");
    			add_location(div, file$4, 1, 2, 31);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(itemlistnav, div, null);
    			insert_dev(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const itemlistnav_changes = {};
    			if (dirty & /*$project*/ 4) itemlistnav_changes.collection = /*$project*/ ctx[2].levels;
    			if (dirty & /*paramId*/ 2) itemlistnav_changes.active = /*paramId*/ ctx[1];

    			if (dirty & /*$$scope, item*/ 201326592) {
    				itemlistnav_changes.$$scope = { dirty, ctx };
    			}

    			itemlistnav.$set(itemlistnav_changes);

    			if (/*input*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*input*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(itemlistnav.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(itemlistnav.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(itemlistnav);
    			if (detaching) detach_dev(t);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$3.name,
    		type: "slot",
    		source: "(1:0) <AppLayout active=\\\"levels\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let applayout;
    	let current;

    	applayout = new AppLayout({
    			props: {
    				active: "levels",
    				$$slots: { default: [create_default_slot$3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(applayout.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(applayout, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const applayout_changes = {};

    			if (dirty & /*$$scope, hasChanges, isAdding, blockOptions, selectedBlockId, input, isDrawing, screenTarget, $project, paramId*/ 134218239) {
    				applayout_changes.$$scope = { dirty, ctx };
    			}

    			applayout.$set(applayout_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(applayout.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(applayout.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(applayout, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function createDefaultInput$1() {
    	return {
    		name: "",
    		backgroundColor: "rgba(0,0,0,1)",
    		blocks: [],
    		enemies: []
    	};
    }

    function getBlockCoordsFromEvent(event) {
    	return {
    		x: Math.floor(event.offsetX / 40),
    		y: Math.floor(event.offsetY / 40)
    	};
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let paramId;
    	let isAdding;
    	let hasChanges;
    	let blockOptions;
    	let $project;
    	validate_store(project, "project");
    	component_subscribe($$self, project, $$value => $$invalidate(2, $project = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("LevelBuilder", slots, []);
    	let { params = {} } = $$props;
    	let input = createDefaultInput$1();
    	let isDrawing = false;
    	let screenTarget = { x: 0, y: 0 };
    	let selectedBlockId = 0;

    	function create() {
    		$$invalidate(0, input = createDefaultInput$1());
    	}

    	async function edit(name) {
    		if (!$project.levels.hasOwnProperty(name)) return;
    		$$invalidate(0, input = null);
    		await tick();

    		$$invalidate(0, input = {
    			...createDefaultInput$1(),
    			...JSON.parse(JSON.stringify($project.levels[name]))
    		});
    	}

    	function save() {
    		if (validator.empty(input.name)) {
    			document.getElementById("name").focus();
    			return;
    		}

    		if (isAdding) $$invalidate(0, input.id = getNextId($project.levels), input);
    		set_store_value(project, $project.levels[input.id] = JSON.parse(JSON.stringify(input)), $project);
    		push(`/levels/${encodeURIComponent(input.id)}`);
    	}

    	function del() {
    		if (confirm(`Are you sure you want to delete "${input.name}"?`)) {
    			delete $project.levels[input.id];
    			project.set($project);
    			push(`/levels/new`);
    		}
    	}

    	let pointerIsDown = false;

    	function onPointerDown(event) {
    		pointerIsDown = true;

    		if (isDrawing) {
    			// if they do anything but left click, select the block at the current position (or eraser if null)
    			if (event.button != 0) {
    				const { x, y } = getBlockCoordsFromEvent(event);
    				$$invalidate(5, selectedBlockId = input.blocks.find(b => b.x == x && b.y == y)?.blockId);
    			} else {
    				drawAtEvent(event);
    			}
    		} else {
    			movePlayerToEvent(event);
    		}
    	}

    	function onPointerUp(event) {
    		pointerIsDown = false;
    	}

    	function onPointerMove(event) {
    		if (!pointerIsDown) return;

    		if (isDrawing) {
    			drawAtEvent(event);
    		} else {
    			movePlayerToEvent(event);
    		}
    	}

    	function drawAtEvent(event) {
    		const { x, y } = getBlockCoordsFromEvent(event);
    		const blocksMinusAnyAtThisXY = input.blocks.filter(b => b.x != x || b.y != y);

    		if (selectedBlockId == null) {
    			$$invalidate(0, input.blocks = blocksMinusAnyAtThisXY, input);
    		} else {
    			const newBlock = { x, y, blockId: selectedBlockId };
    			$$invalidate(0, input.blocks = [...blocksMinusAnyAtThisXY, newBlock].sort((a, b) => a.x == b.x ? a.y - b.y : a.x - b.x), input);
    		}
    	}

    	function movePlayerToEvent(event) {
    		$$invalidate(4, screenTarget = { x: event.offsetX, y: event.offsetY });
    	}

    	const writable_props = ["params"];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<LevelBuilder> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(3, isDrawing = false);
    	const click_handler_1 = () => $$invalidate(3, isDrawing = true);

    	function fieldtext_value_binding(value) {
    		if ($$self.$$.not_equal(input.name, value)) {
    			input.name = value;
    			$$invalidate(0, input);
    		}
    	}

    	function colorpicker_value_binding(value) {
    		if ($$self.$$.not_equal(input.backgroundColor, value)) {
    			input.backgroundColor = value;
    			$$invalidate(0, input);
    		}
    	}

    	function inputselect_value_binding(value) {
    		selectedBlockId = value;
    		$$invalidate(5, selectedBlockId);
    	}

    	$$self.$$set = $$props => {
    		if ("params" in $$props) $$invalidate(14, params = $$props.params);
    	};

    	$$self.$capture_state = () => ({
    		getNextId,
    		push,
    		sortByName,
    		tick,
    		AppLayout,
    		ArtThumb,
    		ColorPicker,
    		FieldText,
    		Form,
    		InputSelect,
    		ItemListNav,
    		LevelRenderer: LevelBuilder_Renderer,
    		project,
    		validator,
    		params,
    		input,
    		isDrawing,
    		screenTarget,
    		createDefaultInput: createDefaultInput$1,
    		selectedBlockId,
    		create,
    		edit,
    		save,
    		del,
    		pointerIsDown,
    		onPointerDown,
    		onPointerUp,
    		onPointerMove,
    		getBlockCoordsFromEvent,
    		drawAtEvent,
    		movePlayerToEvent,
    		paramId,
    		isAdding,
    		hasChanges,
    		$project,
    		blockOptions
    	});

    	$$self.$inject_state = $$props => {
    		if ("params" in $$props) $$invalidate(14, params = $$props.params);
    		if ("input" in $$props) $$invalidate(0, input = $$props.input);
    		if ("isDrawing" in $$props) $$invalidate(3, isDrawing = $$props.isDrawing);
    		if ("screenTarget" in $$props) $$invalidate(4, screenTarget = $$props.screenTarget);
    		if ("selectedBlockId" in $$props) $$invalidate(5, selectedBlockId = $$props.selectedBlockId);
    		if ("pointerIsDown" in $$props) pointerIsDown = $$props.pointerIsDown;
    		if ("paramId" in $$props) $$invalidate(1, paramId = $$props.paramId);
    		if ("isAdding" in $$props) $$invalidate(6, isAdding = $$props.isAdding);
    		if ("hasChanges" in $$props) $$invalidate(7, hasChanges = $$props.hasChanges);
    		if ("blockOptions" in $$props) $$invalidate(8, blockOptions = $$props.blockOptions);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*params*/ 16384) {
    			$$invalidate(1, paramId = decodeURIComponent(params.id) || "new");
    		}

    		if ($$self.$$.dirty & /*paramId*/ 2) {
    			paramId == "new" ? create() : edit(paramId);
    		}

    		if ($$self.$$.dirty & /*input*/ 1) {
    			$$invalidate(6, isAdding = input?.id == null);
    		}

    		if ($$self.$$.dirty & /*input, $project*/ 5) {
    			$$invalidate(7, hasChanges = input != null && !validator.equals(input, $project.levels[input.id]));
    		}

    		if ($$self.$$.dirty & /*$project*/ 4) {
    			$$invalidate(8, blockOptions = [
    				{ value: null, name: "Eraser" },
    				...Object.values($project.blocks).map(b => ({ ...b, value: b.id })).sort(sortByName)
    			]);
    		}
    	};

    	return [
    		input,
    		paramId,
    		$project,
    		isDrawing,
    		screenTarget,
    		selectedBlockId,
    		isAdding,
    		hasChanges,
    		blockOptions,
    		save,
    		del,
    		onPointerDown,
    		onPointerUp,
    		onPointerMove,
    		params,
    		click_handler,
    		click_handler_1,
    		fieldtext_value_binding,
    		colorpicker_value_binding,
    		inputselect_value_binding
    	];
    }

    class LevelBuilder extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { params: 14 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LevelBuilder",
    			options,
    			id: create_fragment$5.name
    		});
    	}

    	get params() {
    		throw new Error("<LevelBuilder>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set params(value) {
    		throw new Error("<LevelBuilder>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\pages\NotFound.svelte generated by Svelte v3.38.3 */
    const file$3 = "src\\pages\\NotFound.svelte";

    // (1:0) <AppLayout>
    function create_default_slot$2(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Page not found";
    			attr_dev(div, "class", "grow p1");
    			add_location(div, file$3, 1, 2, 15);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$2.name,
    		type: "slot",
    		source: "(1:0) <AppLayout>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let applayout;
    	let current;

    	applayout = new AppLayout({
    			props: {
    				$$slots: { default: [create_default_slot$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(applayout.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(applayout, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const applayout_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				applayout_changes.$$scope = { dirty, ctx };
    			}

    			applayout.$set(applayout_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(applayout.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(applayout.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(applayout, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("NotFound", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<NotFound> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ AppLayout });
    	return [];
    }

    class NotFound extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NotFound",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\pages\SelectProject.svelte generated by Svelte v3.38.3 */
    const file$2 = "src\\pages\\SelectProject.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    // (3:4) {#each $projects as p}
    function create_each_block$1(ctx) {
    	let div;
    	let a0;
    	let t0_value = /*p*/ ctx[7].name + "";
    	let t0;
    	let t1;
    	let a1;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[4](/*p*/ ctx[7]);
    	}

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[5](/*p*/ ctx[7]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			a0 = element("a");
    			t0 = text(t0_value);
    			t1 = space();
    			a1 = element("a");
    			a1.textContent = "Delete";
    			attr_dev(a0, "href", "#/");
    			attr_dev(a0, "class", "svelte-14jovk9");
    			add_location(a0, file$2, 4, 8, 126);
    			attr_dev(a1, "href", "#/");
    			attr_dev(a1, "class", "delete-project svelte-14jovk9");
    			add_location(a1, file$2, 5, 8, 207);
    			attr_dev(div, "class", "project-item svelte-14jovk9");
    			add_location(div, file$2, 3, 6, 90);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, a0);
    			append_dev(a0, t0);
    			append_dev(div, t1);
    			append_dev(div, a1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(a0, "click", prevent_default(click_handler), false, true, false),
    					listen_dev(a1, "click", prevent_default(click_handler_1), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*$projects*/ 1 && t0_value !== (t0_value = /*p*/ ctx[7].name + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(3:4) {#each $projects as p}",
    		ctx
    	});

    	return block;
    }

    // (1:0) <AppLayout active="projects">
    function create_default_slot$1(ctx) {
    	let div1;
    	let t0;
    	let div0;
    	let a;
    	let mounted;
    	let dispose;
    	let each_value = /*$projects*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			div0 = element("div");
    			a = element("a");
    			a.textContent = "+ New project";
    			attr_dev(a, "href", "#/");
    			attr_dev(a, "class", "svelte-14jovk9");
    			add_location(a, file$2, 9, 6, 369);
    			attr_dev(div0, "class", "project-item svelte-14jovk9");
    			add_location(div0, file$2, 8, 4, 335);
    			attr_dev(div1, "class", "grow p2");
    			add_location(div1, file$2, 1, 2, 33);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div0, a);

    			if (!mounted) {
    				dispose = listen_dev(a, "click", prevent_default(/*createNewProject*/ ctx[2]), false, true, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*deleteProject, $projects, setProject*/ 11) {
    				each_value = /*$projects*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, t0);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(1:0) <AppLayout active=\\\"projects\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let applayout;
    	let current;

    	applayout = new AppLayout({
    			props: {
    				active: "projects",
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(applayout.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(applayout, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const applayout_changes = {};

    			if (dirty & /*$$scope, $projects*/ 1025) {
    				applayout_changes.$$scope = { dirty, ctx };
    			}

    			applayout.$set(applayout_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(applayout.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(applayout.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(applayout, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $project;
    	let $projects;
    	validate_store(project, "project");
    	component_subscribe($$self, project, $$value => $$invalidate(6, $project = $$value));
    	validate_store(projects, "projects");
    	component_subscribe($$self, projects, $$value => $$invalidate(0, $projects = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("SelectProject", slots, []);

    	function setProject(p) {
    		set_store_value(project, $project = p, $project);
    		push("/project");
    	}

    	function createNewProject() {
    		const name = prompt("Project name?", "");

    		if (name?.trim().length > 0) {
    			const p = {
    				version: PROJECT_VERSION,
    				name,
    				art: {},
    				particles: {},
    				projectiles: {},
    				blocks: {},
    				characters: {},
    				enemies: {},
    				levels: {}
    			};

    			set_store_value(projects, $projects = [...$projects, p], $projects);
    			setProject(p);
    		}
    	}

    	function deleteProject(p) {
    		let name = p.name;
    		if (prompt(`If you are sure you want to delete this project, type the project name:?`, "") !== name) return;
    		set_store_value(projects, $projects = $projects.filter(p => p.name != name), $projects);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<SelectProject> was created with unknown prop '${key}'`);
    	});

    	const click_handler = p => setProject(p);
    	const click_handler_1 = p => deleteProject(p);

    	$$self.$capture_state = () => ({
    		push,
    		AppLayout,
    		project,
    		projects,
    		PROJECT_VERSION,
    		setProject,
    		createNewProject,
    		deleteProject,
    		$project,
    		$projects
    	});

    	return [
    		$projects,
    		setProject,
    		createNewProject,
    		deleteProject,
    		click_handler,
    		click_handler_1
    	];
    }

    class SelectProject extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SelectProject",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\components\FieldRadioGroup.svelte generated by Svelte v3.38.3 */

    const file$1 = "src\\components\\FieldRadioGroup.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	child_ctx[9] = i;
    	return child_ctx;
    }

    // (3:2) {#each options as option, index}
    function create_each_block(ctx) {
    	let div;
    	let input;
    	let input_name_value;
    	let input_id_value;
    	let input_value_value;
    	let t0;
    	let label;
    	let t1_value = /*option*/ ctx[7].label + "";
    	let t1;
    	let label_for_value;
    	let t2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			input = element("input");
    			t0 = space();
    			label = element("label");
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(input, "name", input_name_value = "" + (/*name*/ ctx[1] + /*index*/ ctx[9]));
    			attr_dev(input, "id", input_id_value = "" + (/*name*/ ctx[1] + /*index*/ ctx[9]));
    			attr_dev(input, "type", "radio");
    			attr_dev(input, "class", "form-radio-input");
    			input.__value = input_value_value = /*option*/ ctx[7].value;
    			input.value = input.__value;
    			/*$$binding_groups*/ ctx[6][0].push(input);
    			add_location(input, file$1, 4, 6, 125);
    			attr_dev(label, "class", "form-radio-label");
    			attr_dev(label, "for", label_for_value = "" + (/*name*/ ctx[1] + /*index*/ ctx[9]));
    			add_location(label, file$1, 5, 6, 260);
    			attr_dev(div, "class", "form-radio");
    			add_location(div, file$1, 3, 4, 93);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input);
    			input.checked = input.__value === /*value*/ ctx[0];
    			append_dev(div, t0);
    			append_dev(div, label);
    			append_dev(label, t1);
    			append_dev(div, t2);

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*input_change_handler*/ ctx[5]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*name*/ 2 && input_name_value !== (input_name_value = "" + (/*name*/ ctx[1] + /*index*/ ctx[9]))) {
    				attr_dev(input, "name", input_name_value);
    			}

    			if (dirty & /*name*/ 2 && input_id_value !== (input_id_value = "" + (/*name*/ ctx[1] + /*index*/ ctx[9]))) {
    				attr_dev(input, "id", input_id_value);
    			}

    			if (dirty & /*options*/ 4 && input_value_value !== (input_value_value = /*option*/ ctx[7].value)) {
    				prop_dev(input, "__value", input_value_value);
    				input.value = input.__value;
    			}

    			if (dirty & /*value*/ 1) {
    				input.checked = input.__value === /*value*/ ctx[0];
    			}

    			if (dirty & /*options*/ 4 && t1_value !== (t1_value = /*option*/ ctx[7].label + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*name*/ 2 && label_for_value !== (label_for_value = "" + (/*name*/ ctx[1] + /*index*/ ctx[9]))) {
    				attr_dev(label, "for", label_for_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*$$binding_groups*/ ctx[6][0].splice(/*$$binding_groups*/ ctx[6][0].indexOf(input), 1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(3:2) {#each options as option, index}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div;
    	let label;
    	let t;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);
    	let each_value = /*options*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			label = element("label");
    			if (default_slot) default_slot.c();
    			t = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(label, file$1, 1, 2, 28);
    			attr_dev(div, "class", "form-group");
    			add_location(div, file$1, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, label);

    			if (default_slot) {
    				default_slot.m(label, null);
    			}

    			append_dev(div, t);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 8)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[3], !current ? -1 : dirty, null, null);
    				}
    			}

    			if (dirty & /*name, options, value*/ 7) {
    				each_value = /*options*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("FieldRadioGroup", slots, ['default']);
    	let { name = "check" } = $$props;
    	let { options } = $$props;
    	let { value } = $$props;
    	const writable_props = ["name", "options", "value"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FieldRadioGroup> was created with unknown prop '${key}'`);
    	});

    	const $$binding_groups = [[]];

    	function input_change_handler() {
    		value = this.__value;
    		$$invalidate(0, value);
    	}

    	$$self.$$set = $$props => {
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    		if ("options" in $$props) $$invalidate(2, options = $$props.options);
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("$$scope" in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ name, options, value });

    	$$self.$inject_state = $$props => {
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    		if ("options" in $$props) $$invalidate(2, options = $$props.options);
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [value, name, options, $$scope, slots, input_change_handler, $$binding_groups];
    }

    class FieldRadioGroup extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { name: 1, options: 2, value: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FieldRadioGroup",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*options*/ ctx[2] === undefined && !("options" in props)) {
    			console.warn("<FieldRadioGroup> was created without expected prop 'options'");
    		}

    		if (/*value*/ ctx[0] === undefined && !("value" in props)) {
    			console.warn("<FieldRadioGroup> was created without expected prop 'value'");
    		}
    	}

    	get name() {
    		throw new Error("<FieldRadioGroup>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<FieldRadioGroup>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get options() {
    		throw new Error("<FieldRadioGroup>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set options(value) {
    		throw new Error("<FieldRadioGroup>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<FieldRadioGroup>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<FieldRadioGroup>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\pages\ProjectSettings.svelte generated by Svelte v3.38.3 */
    const file = "src\\pages\\ProjectSettings.svelte";

    // (4:6) <FieldText name="name" bind:value={input.name}>
    function create_default_slot_4(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Name");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_4.name,
    		type: "slot",
    		source: "(4:6) <FieldText name=\\\"name\\\" bind:value={input.name}>",
    		ctx
    	});

    	return block;
    }

    // (5:6) <FieldRadioGroup name="game-type" bind:value={input.gameType} options={gameTypeOptions} let:option>
    function create_default_slot_3(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Game type");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(5:6) <FieldRadioGroup name=\\\"game-type\\\" bind:value={input.gameType} options={gameTypeOptions} let:option>",
    		ctx
    	});

    	return block;
    }

    // (6:6) <FieldNumber name="pixel-size" bind:value={input.pixelSize} min={1} max={10} step={1}>
    function create_default_slot_2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Pixel size");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(6:6) <FieldNumber name=\\\"pixel-size\\\" bind:value={input.pixelSize} min={1} max={10} step={1}>",
    		ctx
    	});

    	return block;
    }

    // (3:4) <Form on:submit={save} {hasChanges}>
    function create_default_slot_1(ctx) {
    	let fieldtext;
    	let updating_value;
    	let t0;
    	let fieldradiogroup;
    	let updating_value_1;
    	let t1;
    	let fieldnumber;
    	let updating_value_2;
    	let current;

    	function fieldtext_value_binding(value) {
    		/*fieldtext_value_binding*/ ctx[5](value);
    	}

    	let fieldtext_props = {
    		name: "name",
    		$$slots: { default: [create_default_slot_4] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].name !== void 0) {
    		fieldtext_props.value = /*input*/ ctx[0].name;
    	}

    	fieldtext = new FieldText({ props: fieldtext_props, $$inline: true });
    	binding_callbacks.push(() => bind(fieldtext, "value", fieldtext_value_binding));

    	function fieldradiogroup_value_binding(value) {
    		/*fieldradiogroup_value_binding*/ ctx[6](value);
    	}

    	let fieldradiogroup_props = {
    		name: "game-type",
    		options: /*gameTypeOptions*/ ctx[2],
    		$$slots: {
    			default: [
    				create_default_slot_3,
    				({ option }) => ({ 8: option }),
    				({ option }) => option ? 256 : 0
    			]
    		},
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].gameType !== void 0) {
    		fieldradiogroup_props.value = /*input*/ ctx[0].gameType;
    	}

    	fieldradiogroup = new FieldRadioGroup({
    			props: fieldradiogroup_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(fieldradiogroup, "value", fieldradiogroup_value_binding));

    	function fieldnumber_value_binding(value) {
    		/*fieldnumber_value_binding*/ ctx[7](value);
    	}

    	let fieldnumber_props = {
    		name: "pixel-size",
    		min: 1,
    		max: 10,
    		step: 1,
    		$$slots: { default: [create_default_slot_2] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].pixelSize !== void 0) {
    		fieldnumber_props.value = /*input*/ ctx[0].pixelSize;
    	}

    	fieldnumber = new FieldNumber({ props: fieldnumber_props, $$inline: true });
    	binding_callbacks.push(() => bind(fieldnumber, "value", fieldnumber_value_binding));

    	const block = {
    		c: function create() {
    			create_component(fieldtext.$$.fragment);
    			t0 = space();
    			create_component(fieldradiogroup.$$.fragment);
    			t1 = space();
    			create_component(fieldnumber.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(fieldtext, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(fieldradiogroup, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(fieldnumber, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const fieldtext_changes = {};

    			if (dirty & /*$$scope*/ 512) {
    				fieldtext_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*input*/ 1) {
    				updating_value = true;
    				fieldtext_changes.value = /*input*/ ctx[0].name;
    				add_flush_callback(() => updating_value = false);
    			}

    			fieldtext.$set(fieldtext_changes);
    			const fieldradiogroup_changes = {};

    			if (dirty & /*$$scope*/ 512) {
    				fieldradiogroup_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_1 && dirty & /*input*/ 1) {
    				updating_value_1 = true;
    				fieldradiogroup_changes.value = /*input*/ ctx[0].gameType;
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			fieldradiogroup.$set(fieldradiogroup_changes);
    			const fieldnumber_changes = {};

    			if (dirty & /*$$scope*/ 512) {
    				fieldnumber_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_2 && dirty & /*input*/ 1) {
    				updating_value_2 = true;
    				fieldnumber_changes.value = /*input*/ ctx[0].pixelSize;
    				add_flush_callback(() => updating_value_2 = false);
    			}

    			fieldnumber.$set(fieldnumber_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(fieldtext.$$.fragment, local);
    			transition_in(fieldradiogroup.$$.fragment, local);
    			transition_in(fieldnumber.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(fieldtext.$$.fragment, local);
    			transition_out(fieldradiogroup.$$.fragment, local);
    			transition_out(fieldnumber.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(fieldtext, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(fieldradiogroup, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(fieldnumber, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(3:4) <Form on:submit={save} {hasChanges}>",
    		ctx
    	});

    	return block;
    }

    // (1:0) <AppLayout active="project">
    function create_default_slot(ctx) {
    	let div;
    	let form;
    	let current;

    	form = new Form({
    			props: {
    				hasChanges: /*hasChanges*/ ctx[1],
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	form.$on("submit", /*save*/ ctx[3]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(form.$$.fragment);
    			attr_dev(div, "class", "grow p1");
    			add_location(div, file, 1, 2, 32);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(form, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const form_changes = {};
    			if (dirty & /*hasChanges*/ 2) form_changes.hasChanges = /*hasChanges*/ ctx[1];

    			if (dirty & /*$$scope, input*/ 513) {
    				form_changes.$$scope = { dirty, ctx };
    			}

    			form.$set(form_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(form.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(form.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(form);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(1:0) <AppLayout active=\\\"project\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let applayout;
    	let current;

    	applayout = new AppLayout({
    			props: {
    				active: "project",
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(applayout.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(applayout, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const applayout_changes = {};

    			if (dirty & /*$$scope, hasChanges, input*/ 515) {
    				applayout_changes.$$scope = { dirty, ctx };
    			}

    			applayout.$set(applayout_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(applayout.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(applayout.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(applayout, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function createDefaultInput() {
    	return { name: "", gameType: "side", pixelSize: 1 };
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let hasChanges;
    	let $project;
    	validate_store(project, "project");
    	component_subscribe($$self, project, $$value => $$invalidate(4, $project = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ProjectSettings", slots, []);

    	let gameTypeOptions = [
    		{ value: "side", label: "Side-scrolling" },
    		{ value: "top", label: "Top-down" }
    	];

    	let input = { ...createDefaultInput(), ...$project };

    	function save() {
    		set_store_value(project, $project.name = input.name, $project);
    		set_store_value(project, $project.gameType = input.gameType, $project);
    		set_store_value(project, $project.pixelSize = input.pixelSize, $project);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ProjectSettings> was created with unknown prop '${key}'`);
    	});

    	function fieldtext_value_binding(value) {
    		if ($$self.$$.not_equal(input.name, value)) {
    			input.name = value;
    			$$invalidate(0, input);
    		}
    	}

    	function fieldradiogroup_value_binding(value) {
    		if ($$self.$$.not_equal(input.gameType, value)) {
    			input.gameType = value;
    			$$invalidate(0, input);
    		}
    	}

    	function fieldnumber_value_binding(value) {
    		if ($$self.$$.not_equal(input.pixelSize, value)) {
    			input.pixelSize = value;
    			$$invalidate(0, input);
    		}
    	}

    	$$self.$capture_state = () => ({
    		AppLayout,
    		FieldRadioGroup,
    		FieldNumber,
    		Form,
    		validator,
    		project,
    		FieldText,
    		gameTypeOptions,
    		input,
    		createDefaultInput,
    		save,
    		$project,
    		hasChanges
    	});

    	$$self.$inject_state = $$props => {
    		if ("gameTypeOptions" in $$props) $$invalidate(2, gameTypeOptions = $$props.gameTypeOptions);
    		if ("input" in $$props) $$invalidate(0, input = $$props.input);
    		if ("hasChanges" in $$props) $$invalidate(1, hasChanges = $$props.hasChanges);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*input, $project*/ 17) {
    			$$invalidate(1, hasChanges = !validator.equals(input, $project));
    		}
    	};

    	return [
    		input,
    		hasChanges,
    		gameTypeOptions,
    		save,
    		$project,
    		fieldtext_value_binding,
    		fieldradiogroup_value_binding,
    		fieldnumber_value_binding
    	];
    }

    class ProjectSettings extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ProjectSettings",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.38.3 */

    // (3:0) {:else}
    function create_else_block(ctx) {
    	let router;
    	let current;

    	router = new Router({
    			props: { routes: /*routes*/ ctx[1] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(router.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(router, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(router, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(3:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1:0) {#if $project == null}
    function create_if_block(ctx) {
    	let selectproject;
    	let current;
    	selectproject = new SelectProject({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(selectproject.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(selectproject, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(selectproject.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(selectproject.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(selectproject, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(1:0) {#if $project == null}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let t;
    	let title_value;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*$project*/ ctx[0] == null) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	document.title = title_value = /*$project*/ ctx[0] != null
    	? /*$project*/ ctx[0].name
    	: "CSBuilder";

    	const block = {
    		c: function create() {
    			if_block.c();
    			t = space();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, t, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(t.parentNode, t);
    			}

    			if ((!current || dirty & /*$project*/ 1) && title_value !== (title_value = /*$project*/ ctx[0] != null
    			? /*$project*/ ctx[0].name
    			: "CSBuilder")) {
    				document.title = title_value;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $project;
    	validate_store(project, "project");
    	component_subscribe($$self, project, $$value => $$invalidate(0, $project = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);

    	const routes = {
    		"/projects": SelectProject,
    		"/project": ProjectSettings,
    		"/art/:id?": ArtBuilder,
    		"/particles/:id?": ParticleBuilder,
    		"/blocks/:id?": BlockBuilder,
    		"/characters/:id?": CharacterBuilder,
    		"/enemies/:id?": EnemyBuilder,
    		"/levels/:id?": LevelBuilder,
    		"*": NotFound
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Router,
    		ArtBuilder,
    		ParticleBuilder,
    		BlockBuilder,
    		CharacterBuilder,
    		EnemyBuilder,
    		LevelBuilder,
    		NotFound,
    		SelectProject,
    		ProjectSettings,
    		project,
    		routes,
    		$project
    	});

    	return [$project, routes];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
      target: document.body,
      props: {
        name: 'world',
      },
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
