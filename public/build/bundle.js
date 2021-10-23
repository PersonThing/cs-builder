
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
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
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
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
    function empty$1() {
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
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
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

    const { Error: Error_1, Object: Object_1$2, console: console_1$2 } = globals;

    // (251:0) {:else}
    function create_else_block$6(ctx) {
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
    			switch_instance_anchor = empty$1();
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
    		id: create_else_block$6.name,
    		type: "else",
    		source: "(251:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (244:0) {#if componentParams}
    function create_if_block$f(ctx) {
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
    			switch_instance_anchor = empty$1();
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
    		id: create_if_block$f.name,
    		type: "if",
    		source: "(244:0) {#if componentParams}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$v(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$f, create_else_block$6];
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
    			if_block_anchor = empty$1();
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
    		id: create_fragment$v.name,
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

    const location$1 = derived(loc, $loc => $loc.location);
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

    function instance$v($$self, $$props, $$invalidate) {
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

    	Object_1$2.keys($$props).forEach(key => {
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
    		location: location$1,
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

    		init(this, options, instance$v, create_fragment$v, safe_not_equal, {
    			routes: 3,
    			prefix: 4,
    			restoreScrollState: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$v.name
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

    const itemTypeNames$1 = ['art', 'blocks', 'characters', 'enemies', 'items', 'levels', 'particles'];

    function status(response) {
      if (response.status >= 200 && response.status < 300) {
        return Promise.resolve(response)
      } else {
        return Promise.reject(new Error(response.statusText))
      }
    }

    function json(response) {
      return response.json()
    }

    function _fetch(url, options = {}) {
      options.headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };
      if (options.body != null) options.body = JSON.stringify(options.body);
      return fetch(url, options).then(status).then(json)
    }

    function stripProjectOfItems(project) {
      const body = JSON.parse(JSON.stringify(project));
      itemTypeNames$1.forEach(it => {
        if (body.hasOwnProperty(it)) delete body[it];
      });
      return body
    }

    const Api = {
      // login(name, password) {
      //   return _fetch('/api/login', {
      //     method: 'POST',
      //     body: {
      //       name,
      //       password,
      //     },
      //   })
      // },

      // return list of all projects on server
      // add search param here when list gets big
      // add ability to only show my projects vs other people's
      projects: {
        find() {
          console.log('api.projects.find');
          return _fetch('/api/projects')
        },

        get(id) {
          console.log('api.projects.get');
          return _fetch(`/api/projects/${id}`)
        },

        insert(project) {
          console.log('api.projects.insert');
          return _fetch(`/api/projects`, {
            method: 'POST',
            body: stripProjectOfItems(project),
          })
        },

        update(project) {
          console.log('api.projects.update');
          return _fetch(`/api/projects/${project.id}`, {
            method: 'PUT',
            body: stripProjectOfItems(project),
          })
        },

        delete(id) {
          console.log('api.projects.delete');
          return _fetch(`/api/projects/${id}`, {
            method: 'DELETE',
          })
        },
      },
    };

    itemTypeNames$1.forEach(c => {
      Api[c] = {
        find: projectId => {
          console.log(`api.${c}.find`);
          return _fetch(`/api/projects/${projectId}/${c}`)
        },
        get: (projectId, id) => {
          console.log(`api.${c}.get`);
          return _fetch(`/api/projects/${projectId}/${c}/${id}`)
        },
        insert: item => {
          console.log(`api.${c}.insert`);
          return _fetch(`/api/projects/${item.projectId}/${c}`, {
            method: 'POST',
            body: item,
          })
        },
        update: item => {
          console.log(`api.${c}.update`);
          return _fetch(`/api/projects/${item.projectId}/${c}/${item.id}`, {
            method: 'PUT',
            body: item,
          })
        },
        delete: (projectId, id) => {
          console.log(`api.${c}.delete`);
          return _fetch(`/api/projects/${projectId}/${c}/${id}`, {
            method: 'DELETE',
          })
        },
      };
    });

    /**
     * Parses an URI
     *
     * @author Steven Levithan <stevenlevithan.com> (MIT license)
     * @api private
     */
    var re = /^(?:(?![^:@]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;

    var parts = [
        'source', 'protocol', 'authority', 'userInfo', 'user', 'password', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'anchor'
    ];

    var parseuri = function parseuri(str) {
        var src = str,
            b = str.indexOf('['),
            e = str.indexOf(']');

        if (b != -1 && e != -1) {
            str = str.substring(0, b) + str.substring(b, e).replace(/:/g, ';') + str.substring(e, str.length);
        }

        var m = re.exec(str || ''),
            uri = {},
            i = 14;

        while (i--) {
            uri[parts[i]] = m[i] || '';
        }

        if (b != -1 && e != -1) {
            uri.source = src;
            uri.host = uri.host.substring(1, uri.host.length - 1).replace(/;/g, ':');
            uri.authority = uri.authority.replace('[', '').replace(']', '').replace(/;/g, ':');
            uri.ipv6uri = true;
        }

        uri.pathNames = pathNames(uri, uri['path']);
        uri.queryKey = queryKey(uri, uri['query']);

        return uri;
    };

    function pathNames(obj, path) {
        var regx = /\/{2,9}/g,
            names = path.replace(regx, "/").split("/");

        if (path.substr(0, 1) == '/' || path.length === 0) {
            names.splice(0, 1);
        }
        if (path.substr(path.length - 1, 1) == '/') {
            names.splice(names.length - 1, 1);
        }

        return names;
    }

    function queryKey(uri, query) {
        var data = {};

        query.replace(/(?:^|&)([^&=]*)=?([^&]*)/g, function ($0, $1, $2) {
            if ($1) {
                data[$1] = $2;
            }
        });

        return data;
    }

    /**
     * URL parser.
     *
     * @param uri - url
     * @param path - the request path of the connection
     * @param loc - An object meant to mimic window.location.
     *        Defaults to window.location.
     * @public
     */
    function url(uri, path = "", loc) {
        let obj = uri;
        // default to window.location
        loc = loc || (typeof location !== "undefined" && location);
        if (null == uri)
            uri = loc.protocol + "//" + loc.host;
        // relative path support
        if (typeof uri === "string") {
            if ("/" === uri.charAt(0)) {
                if ("/" === uri.charAt(1)) {
                    uri = loc.protocol + uri;
                }
                else {
                    uri = loc.host + uri;
                }
            }
            if (!/^(https?|wss?):\/\//.test(uri)) {
                if ("undefined" !== typeof loc) {
                    uri = loc.protocol + "//" + uri;
                }
                else {
                    uri = "https://" + uri;
                }
            }
            // parse
            obj = parseuri(uri);
        }
        // make sure we treat `localhost:80` and `localhost` equally
        if (!obj.port) {
            if (/^(http|ws)$/.test(obj.protocol)) {
                obj.port = "80";
            }
            else if (/^(http|ws)s$/.test(obj.protocol)) {
                obj.port = "443";
            }
        }
        obj.path = obj.path || "/";
        const ipv6 = obj.host.indexOf(":") !== -1;
        const host = ipv6 ? "[" + obj.host + "]" : obj.host;
        // define unique id
        obj.id = obj.protocol + "://" + host + ":" + obj.port + path;
        // define href
        obj.href =
            obj.protocol +
                "://" +
                host +
                (loc && loc.port === obj.port ? "" : ":" + obj.port);
        return obj;
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    var hasCors = createCommonjsModule(function (module) {
    /**
     * Module exports.
     *
     * Logic borrowed from Modernizr:
     *
     *   - https://github.com/Modernizr/Modernizr/blob/master/feature-detects/cors.js
     */

    try {
      module.exports = typeof XMLHttpRequest !== 'undefined' &&
        'withCredentials' in new XMLHttpRequest();
    } catch (err) {
      // if XMLHttp support is disabled in IE then it will throw
      // when trying to create
      module.exports = false;
    }
    });

    var globalThis$1 = (() => {
        if (typeof self !== "undefined") {
            return self;
        }
        else if (typeof window !== "undefined") {
            return window;
        }
        else {
            return Function("return this")();
        }
    })();

    // browser shim for xmlhttprequest module
    function XMLHttpRequest$1 (opts) {
        const xdomain = opts.xdomain;
        // XMLHttpRequest can be disabled on IE
        try {
            if ("undefined" !== typeof XMLHttpRequest && (!xdomain || hasCors)) {
                return new XMLHttpRequest();
            }
        }
        catch (e) { }
        if (!xdomain) {
            try {
                return new globalThis$1[["Active"].concat("Object").join("X")]("Microsoft.XMLHTTP");
            }
            catch (e) { }
        }
    }

    function pick(obj, ...attr) {
        return attr.reduce((acc, k) => {
            if (obj.hasOwnProperty(k)) {
                acc[k] = obj[k];
            }
            return acc;
        }, {});
    }
    // Keep a reference to the real timeout functions so they can be used when overridden
    const NATIVE_SET_TIMEOUT = setTimeout;
    const NATIVE_CLEAR_TIMEOUT = clearTimeout;
    function installTimerFunctions(obj, opts) {
        if (opts.useNativeTimers) {
            obj.setTimeoutFn = NATIVE_SET_TIMEOUT.bind(globalThis$1);
            obj.clearTimeoutFn = NATIVE_CLEAR_TIMEOUT.bind(globalThis$1);
        }
        else {
            obj.setTimeoutFn = setTimeout.bind(globalThis$1);
            obj.clearTimeoutFn = clearTimeout.bind(globalThis$1);
        }
    }

    /**
     * Expose `Emitter`.
     */

    var Emitter_1 = Emitter;

    /**
     * Initialize a new `Emitter`.
     *
     * @api public
     */

    function Emitter(obj) {
      if (obj) return mixin(obj);
    }

    /**
     * Mixin the emitter properties.
     *
     * @param {Object} obj
     * @return {Object}
     * @api private
     */

    function mixin(obj) {
      for (var key in Emitter.prototype) {
        obj[key] = Emitter.prototype[key];
      }
      return obj;
    }

    /**
     * Listen on the given `event` with `fn`.
     *
     * @param {String} event
     * @param {Function} fn
     * @return {Emitter}
     * @api public
     */

    Emitter.prototype.on =
    Emitter.prototype.addEventListener = function(event, fn){
      this._callbacks = this._callbacks || {};
      (this._callbacks['$' + event] = this._callbacks['$' + event] || [])
        .push(fn);
      return this;
    };

    /**
     * Adds an `event` listener that will be invoked a single
     * time then automatically removed.
     *
     * @param {String} event
     * @param {Function} fn
     * @return {Emitter}
     * @api public
     */

    Emitter.prototype.once = function(event, fn){
      function on() {
        this.off(event, on);
        fn.apply(this, arguments);
      }

      on.fn = fn;
      this.on(event, on);
      return this;
    };

    /**
     * Remove the given callback for `event` or all
     * registered callbacks.
     *
     * @param {String} event
     * @param {Function} fn
     * @return {Emitter}
     * @api public
     */

    Emitter.prototype.off =
    Emitter.prototype.removeListener =
    Emitter.prototype.removeAllListeners =
    Emitter.prototype.removeEventListener = function(event, fn){
      this._callbacks = this._callbacks || {};

      // all
      if (0 == arguments.length) {
        this._callbacks = {};
        return this;
      }

      // specific event
      var callbacks = this._callbacks['$' + event];
      if (!callbacks) return this;

      // remove all handlers
      if (1 == arguments.length) {
        delete this._callbacks['$' + event];
        return this;
      }

      // remove specific handler
      var cb;
      for (var i = 0; i < callbacks.length; i++) {
        cb = callbacks[i];
        if (cb === fn || cb.fn === fn) {
          callbacks.splice(i, 1);
          break;
        }
      }

      // Remove event specific arrays for event types that no
      // one is subscribed for to avoid memory leak.
      if (callbacks.length === 0) {
        delete this._callbacks['$' + event];
      }

      return this;
    };

    /**
     * Emit `event` with the given args.
     *
     * @param {String} event
     * @param {Mixed} ...
     * @return {Emitter}
     */

    Emitter.prototype.emit = function(event){
      this._callbacks = this._callbacks || {};

      var args = new Array(arguments.length - 1)
        , callbacks = this._callbacks['$' + event];

      for (var i = 1; i < arguments.length; i++) {
        args[i - 1] = arguments[i];
      }

      if (callbacks) {
        callbacks = callbacks.slice(0);
        for (var i = 0, len = callbacks.length; i < len; ++i) {
          callbacks[i].apply(this, args);
        }
      }

      return this;
    };

    // alias used for reserved events (protected method)
    Emitter.prototype.emitReserved = Emitter.prototype.emit;

    /**
     * Return array of callbacks for `event`.
     *
     * @param {String} event
     * @return {Array}
     * @api public
     */

    Emitter.prototype.listeners = function(event){
      this._callbacks = this._callbacks || {};
      return this._callbacks['$' + event] || [];
    };

    /**
     * Check if this emitter has `event` handlers.
     *
     * @param {String} event
     * @return {Boolean}
     * @api public
     */

    Emitter.prototype.hasListeners = function(event){
      return !! this.listeners(event).length;
    };

    const PACKET_TYPES = Object.create(null); // no Map = no polyfill
    PACKET_TYPES["open"] = "0";
    PACKET_TYPES["close"] = "1";
    PACKET_TYPES["ping"] = "2";
    PACKET_TYPES["pong"] = "3";
    PACKET_TYPES["message"] = "4";
    PACKET_TYPES["upgrade"] = "5";
    PACKET_TYPES["noop"] = "6";
    const PACKET_TYPES_REVERSE = Object.create(null);
    Object.keys(PACKET_TYPES).forEach(key => {
        PACKET_TYPES_REVERSE[PACKET_TYPES[key]] = key;
    });
    const ERROR_PACKET = { type: "error", data: "parser error" };

    const withNativeBlob$1 = typeof Blob === "function" ||
        (typeof Blob !== "undefined" &&
            Object.prototype.toString.call(Blob) === "[object BlobConstructor]");
    const withNativeArrayBuffer$2 = typeof ArrayBuffer === "function";
    // ArrayBuffer.isView method is not defined in IE10
    const isView$1 = obj => {
        return typeof ArrayBuffer.isView === "function"
            ? ArrayBuffer.isView(obj)
            : obj && obj.buffer instanceof ArrayBuffer;
    };
    const encodePacket = ({ type, data }, supportsBinary, callback) => {
        if (withNativeBlob$1 && data instanceof Blob) {
            if (supportsBinary) {
                return callback(data);
            }
            else {
                return encodeBlobAsBase64(data, callback);
            }
        }
        else if (withNativeArrayBuffer$2 &&
            (data instanceof ArrayBuffer || isView$1(data))) {
            if (supportsBinary) {
                return callback(data);
            }
            else {
                return encodeBlobAsBase64(new Blob([data]), callback);
            }
        }
        // plain string
        return callback(PACKET_TYPES[type] + (data || ""));
    };
    const encodeBlobAsBase64 = (data, callback) => {
        const fileReader = new FileReader();
        fileReader.onload = function () {
            const content = fileReader.result.split(",")[1];
            callback("b" + content);
        };
        return fileReader.readAsDataURL(data);
    };

    /*
     * base64-arraybuffer 1.0.1 <https://github.com/niklasvh/base64-arraybuffer>
     * Copyright (c) 2021 Niklas von Hertzen <https://hertzen.com>
     * Released under MIT License
     */
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    // Use a lookup table to find the index.
    var lookup$1 = typeof Uint8Array === 'undefined' ? [] : new Uint8Array(256);
    for (var i$1 = 0; i$1 < chars.length; i$1++) {
        lookup$1[chars.charCodeAt(i$1)] = i$1;
    }
    var decode$2 = function (base64) {
        var bufferLength = base64.length * 0.75, len = base64.length, i, p = 0, encoded1, encoded2, encoded3, encoded4;
        if (base64[base64.length - 1] === '=') {
            bufferLength--;
            if (base64[base64.length - 2] === '=') {
                bufferLength--;
            }
        }
        var arraybuffer = new ArrayBuffer(bufferLength), bytes = new Uint8Array(arraybuffer);
        for (i = 0; i < len; i += 4) {
            encoded1 = lookup$1[base64.charCodeAt(i)];
            encoded2 = lookup$1[base64.charCodeAt(i + 1)];
            encoded3 = lookup$1[base64.charCodeAt(i + 2)];
            encoded4 = lookup$1[base64.charCodeAt(i + 3)];
            bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
            bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
            bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
        }
        return arraybuffer;
    };

    const withNativeArrayBuffer$1 = typeof ArrayBuffer === "function";
    const decodePacket = (encodedPacket, binaryType) => {
        if (typeof encodedPacket !== "string") {
            return {
                type: "message",
                data: mapBinary(encodedPacket, binaryType)
            };
        }
        const type = encodedPacket.charAt(0);
        if (type === "b") {
            return {
                type: "message",
                data: decodeBase64Packet(encodedPacket.substring(1), binaryType)
            };
        }
        const packetType = PACKET_TYPES_REVERSE[type];
        if (!packetType) {
            return ERROR_PACKET;
        }
        return encodedPacket.length > 1
            ? {
                type: PACKET_TYPES_REVERSE[type],
                data: encodedPacket.substring(1)
            }
            : {
                type: PACKET_TYPES_REVERSE[type]
            };
    };
    const decodeBase64Packet = (data, binaryType) => {
        if (withNativeArrayBuffer$1) {
            const decoded = decode$2(data);
            return mapBinary(decoded, binaryType);
        }
        else {
            return { base64: true, data }; // fallback for old browsers
        }
    };
    const mapBinary = (data, binaryType) => {
        switch (binaryType) {
            case "blob":
                return data instanceof ArrayBuffer ? new Blob([data]) : data;
            case "arraybuffer":
            default:
                return data; // assuming the data is already an ArrayBuffer
        }
    };

    const SEPARATOR = String.fromCharCode(30); // see https://en.wikipedia.org/wiki/Delimiter#ASCII_delimited_text
    const encodePayload = (packets, callback) => {
        // some packets may be added to the array while encoding, so the initial length must be saved
        const length = packets.length;
        const encodedPackets = new Array(length);
        let count = 0;
        packets.forEach((packet, i) => {
            // force base64 encoding for binary packets
            encodePacket(packet, false, encodedPacket => {
                encodedPackets[i] = encodedPacket;
                if (++count === length) {
                    callback(encodedPackets.join(SEPARATOR));
                }
            });
        });
    };
    const decodePayload = (encodedPayload, binaryType) => {
        const encodedPackets = encodedPayload.split(SEPARATOR);
        const packets = [];
        for (let i = 0; i < encodedPackets.length; i++) {
            const decodedPacket = decodePacket(encodedPackets[i], binaryType);
            packets.push(decodedPacket);
            if (decodedPacket.type === "error") {
                break;
            }
        }
        return packets;
    };
    const protocol$1 = 4;

    class Transport extends Emitter_1 {
        /**
         * Transport abstract constructor.
         *
         * @param {Object} options.
         * @api private
         */
        constructor(opts) {
            super();
            this.writable = false;
            installTimerFunctions(this, opts);
            this.opts = opts;
            this.query = opts.query;
            this.readyState = "";
            this.socket = opts.socket;
        }
        /**
         * Emits an error.
         *
         * @param {String} str
         * @return {Transport} for chaining
         * @api protected
         */
        onError(msg, desc) {
            const err = new Error(msg);
            // @ts-ignore
            err.type = "TransportError";
            // @ts-ignore
            err.description = desc;
            super.emit("error", err);
            return this;
        }
        /**
         * Opens the transport.
         *
         * @api public
         */
        open() {
            if ("closed" === this.readyState || "" === this.readyState) {
                this.readyState = "opening";
                this.doOpen();
            }
            return this;
        }
        /**
         * Closes the transport.
         *
         * @api public
         */
        close() {
            if ("opening" === this.readyState || "open" === this.readyState) {
                this.doClose();
                this.onClose();
            }
            return this;
        }
        /**
         * Sends multiple packets.
         *
         * @param {Array} packets
         * @api public
         */
        send(packets) {
            if ("open" === this.readyState) {
                this.write(packets);
            }
        }
        /**
         * Called upon open
         *
         * @api protected
         */
        onOpen() {
            this.readyState = "open";
            this.writable = true;
            super.emit("open");
        }
        /**
         * Called with data.
         *
         * @param {String} data
         * @api protected
         */
        onData(data) {
            const packet = decodePacket(data, this.socket.binaryType);
            this.onPacket(packet);
        }
        /**
         * Called with a decoded packet.
         *
         * @api protected
         */
        onPacket(packet) {
            super.emit("packet", packet);
        }
        /**
         * Called upon close.
         *
         * @api protected
         */
        onClose() {
            this.readyState = "closed";
            super.emit("close");
        }
    }

    var alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'.split('')
      , length = 64
      , map = {}
      , seed = 0
      , i = 0
      , prev;

    /**
     * Return a string representing the specified number.
     *
     * @param {Number} num The number to convert.
     * @returns {String} The string representation of the number.
     * @api public
     */
    function encode$1(num) {
      var encoded = '';

      do {
        encoded = alphabet[num % length] + encoded;
        num = Math.floor(num / length);
      } while (num > 0);

      return encoded;
    }

    /**
     * Return the integer value specified by the given string.
     *
     * @param {String} str The string to convert.
     * @returns {Number} The integer value represented by the string.
     * @api public
     */
    function decode$1(str) {
      var decoded = 0;

      for (i = 0; i < str.length; i++) {
        decoded = decoded * length + map[str.charAt(i)];
      }

      return decoded;
    }

    /**
     * Yeast: A tiny growing id generator.
     *
     * @returns {String} A unique id.
     * @api public
     */
    function yeast() {
      var now = encode$1(+new Date());

      if (now !== prev) return seed = 0, prev = now;
      return now +'.'+ encode$1(seed++);
    }

    //
    // Map each character to its index.
    //
    for (; i < length; i++) map[alphabet[i]] = i;

    //
    // Expose the `yeast`, `encode` and `decode` functions.
    //
    yeast.encode = encode$1;
    yeast.decode = decode$1;
    var yeast_1 = yeast;

    /**
     * Compiles a querystring
     * Returns string representation of the object
     *
     * @param {Object}
     * @api private
     */
    var encode = function (obj) {
      var str = '';

      for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
          if (str.length) str += '&';
          str += encodeURIComponent(i) + '=' + encodeURIComponent(obj[i]);
        }
      }

      return str;
    };

    /**
     * Parses a simple querystring into an object
     *
     * @param {String} qs
     * @api private
     */

    var decode = function(qs){
      var qry = {};
      var pairs = qs.split('&');
      for (var i = 0, l = pairs.length; i < l; i++) {
        var pair = pairs[i].split('=');
        qry[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
      }
      return qry;
    };

    var parseqs = {
    	encode: encode,
    	decode: decode
    };

    class Polling extends Transport {
        constructor() {
            super(...arguments);
            this.polling = false;
        }
        /**
         * Transport name.
         */
        get name() {
            return "polling";
        }
        /**
         * Opens the socket (triggers polling). We write a PING message to determine
         * when the transport is open.
         *
         * @api private
         */
        doOpen() {
            this.poll();
        }
        /**
         * Pauses polling.
         *
         * @param {Function} callback upon buffers are flushed and transport is paused
         * @api private
         */
        pause(onPause) {
            this.readyState = "pausing";
            const pause = () => {
                this.readyState = "paused";
                onPause();
            };
            if (this.polling || !this.writable) {
                let total = 0;
                if (this.polling) {
                    total++;
                    this.once("pollComplete", function () {
                        --total || pause();
                    });
                }
                if (!this.writable) {
                    total++;
                    this.once("drain", function () {
                        --total || pause();
                    });
                }
            }
            else {
                pause();
            }
        }
        /**
         * Starts polling cycle.
         *
         * @api public
         */
        poll() {
            this.polling = true;
            this.doPoll();
            this.emit("poll");
        }
        /**
         * Overloads onData to detect payloads.
         *
         * @api private
         */
        onData(data) {
            const callback = packet => {
                // if its the first message we consider the transport open
                if ("opening" === this.readyState && packet.type === "open") {
                    this.onOpen();
                }
                // if its a close packet, we close the ongoing requests
                if ("close" === packet.type) {
                    this.onClose();
                    return false;
                }
                // otherwise bypass onData and handle the message
                this.onPacket(packet);
            };
            // decode payload
            decodePayload(data, this.socket.binaryType).forEach(callback);
            // if an event did not trigger closing
            if ("closed" !== this.readyState) {
                // if we got data we're not polling
                this.polling = false;
                this.emit("pollComplete");
                if ("open" === this.readyState) {
                    this.poll();
                }
            }
        }
        /**
         * For polling, send a close packet.
         *
         * @api private
         */
        doClose() {
            const close = () => {
                this.write([{ type: "close" }]);
            };
            if ("open" === this.readyState) {
                close();
            }
            else {
                // in case we're trying to close while
                // handshaking is in progress (GH-164)
                this.once("open", close);
            }
        }
        /**
         * Writes a packets payload.
         *
         * @param {Array} data packets
         * @param {Function} drain callback
         * @api private
         */
        write(packets) {
            this.writable = false;
            encodePayload(packets, data => {
                this.doWrite(data, () => {
                    this.writable = true;
                    this.emit("drain");
                });
            });
        }
        /**
         * Generates uri for connection.
         *
         * @api private
         */
        uri() {
            let query = this.query || {};
            const schema = this.opts.secure ? "https" : "http";
            let port = "";
            // cache busting is forced
            if (false !== this.opts.timestampRequests) {
                query[this.opts.timestampParam] = yeast_1();
            }
            if (!this.supportsBinary && !query.sid) {
                query.b64 = 1;
            }
            // avoid port if default for schema
            if (this.opts.port &&
                (("https" === schema && Number(this.opts.port) !== 443) ||
                    ("http" === schema && Number(this.opts.port) !== 80))) {
                port = ":" + this.opts.port;
            }
            const encodedQuery = parseqs.encode(query);
            const ipv6 = this.opts.hostname.indexOf(":") !== -1;
            return (schema +
                "://" +
                (ipv6 ? "[" + this.opts.hostname + "]" : this.opts.hostname) +
                port +
                this.opts.path +
                (encodedQuery.length ? "?" + encodedQuery : ""));
        }
    }

    /* global attachEvent */
    /**
     * Empty function
     */
    function empty() { }
    const hasXHR2 = (function () {
        const xhr = new XMLHttpRequest$1({
            xdomain: false
        });
        return null != xhr.responseType;
    })();
    class XHR extends Polling {
        /**
         * XHR Polling constructor.
         *
         * @param {Object} opts
         * @api public
         */
        constructor(opts) {
            super(opts);
            if (typeof location !== "undefined") {
                const isSSL = "https:" === location.protocol;
                let port = location.port;
                // some user agents have empty `location.port`
                if (!port) {
                    port = isSSL ? "443" : "80";
                }
                this.xd =
                    (typeof location !== "undefined" &&
                        opts.hostname !== location.hostname) ||
                        port !== opts.port;
                this.xs = opts.secure !== isSSL;
            }
            /**
             * XHR supports binary
             */
            const forceBase64 = opts && opts.forceBase64;
            this.supportsBinary = hasXHR2 && !forceBase64;
        }
        /**
         * Creates a request.
         *
         * @param {String} method
         * @api private
         */
        request(opts = {}) {
            Object.assign(opts, { xd: this.xd, xs: this.xs }, this.opts);
            return new Request(this.uri(), opts);
        }
        /**
         * Sends data.
         *
         * @param {String} data to send.
         * @param {Function} called upon flush.
         * @api private
         */
        doWrite(data, fn) {
            const req = this.request({
                method: "POST",
                data: data
            });
            req.on("success", fn);
            req.on("error", err => {
                this.onError("xhr post error", err);
            });
        }
        /**
         * Starts a poll cycle.
         *
         * @api private
         */
        doPoll() {
            const req = this.request();
            req.on("data", this.onData.bind(this));
            req.on("error", err => {
                this.onError("xhr poll error", err);
            });
            this.pollXhr = req;
        }
    }
    class Request extends Emitter_1 {
        /**
         * Request constructor
         *
         * @param {Object} options
         * @api public
         */
        constructor(uri, opts) {
            super();
            installTimerFunctions(this, opts);
            this.opts = opts;
            this.method = opts.method || "GET";
            this.uri = uri;
            this.async = false !== opts.async;
            this.data = undefined !== opts.data ? opts.data : null;
            this.create();
        }
        /**
         * Creates the XHR object and sends the request.
         *
         * @api private
         */
        create() {
            const opts = pick(this.opts, "agent", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "autoUnref");
            opts.xdomain = !!this.opts.xd;
            opts.xscheme = !!this.opts.xs;
            const xhr = (this.xhr = new XMLHttpRequest$1(opts));
            try {
                xhr.open(this.method, this.uri, this.async);
                try {
                    if (this.opts.extraHeaders) {
                        xhr.setDisableHeaderCheck && xhr.setDisableHeaderCheck(true);
                        for (let i in this.opts.extraHeaders) {
                            if (this.opts.extraHeaders.hasOwnProperty(i)) {
                                xhr.setRequestHeader(i, this.opts.extraHeaders[i]);
                            }
                        }
                    }
                }
                catch (e) { }
                if ("POST" === this.method) {
                    try {
                        xhr.setRequestHeader("Content-type", "text/plain;charset=UTF-8");
                    }
                    catch (e) { }
                }
                try {
                    xhr.setRequestHeader("Accept", "*/*");
                }
                catch (e) { }
                // ie6 check
                if ("withCredentials" in xhr) {
                    xhr.withCredentials = this.opts.withCredentials;
                }
                if (this.opts.requestTimeout) {
                    xhr.timeout = this.opts.requestTimeout;
                }
                xhr.onreadystatechange = () => {
                    if (4 !== xhr.readyState)
                        return;
                    if (200 === xhr.status || 1223 === xhr.status) {
                        this.onLoad();
                    }
                    else {
                        // make sure the `error` event handler that's user-set
                        // does not throw in the same tick and gets caught here
                        this.setTimeoutFn(() => {
                            this.onError(typeof xhr.status === "number" ? xhr.status : 0);
                        }, 0);
                    }
                };
                xhr.send(this.data);
            }
            catch (e) {
                // Need to defer since .create() is called directly from the constructor
                // and thus the 'error' event can only be only bound *after* this exception
                // occurs.  Therefore, also, we cannot throw here at all.
                this.setTimeoutFn(() => {
                    this.onError(e);
                }, 0);
                return;
            }
            if (typeof document !== "undefined") {
                this.index = Request.requestsCount++;
                Request.requests[this.index] = this;
            }
        }
        /**
         * Called upon successful response.
         *
         * @api private
         */
        onSuccess() {
            this.emit("success");
            this.cleanup();
        }
        /**
         * Called if we have data.
         *
         * @api private
         */
        onData(data) {
            this.emit("data", data);
            this.onSuccess();
        }
        /**
         * Called upon error.
         *
         * @api private
         */
        onError(err) {
            this.emit("error", err);
            this.cleanup(true);
        }
        /**
         * Cleans up house.
         *
         * @api private
         */
        cleanup(fromError) {
            if ("undefined" === typeof this.xhr || null === this.xhr) {
                return;
            }
            this.xhr.onreadystatechange = empty;
            if (fromError) {
                try {
                    this.xhr.abort();
                }
                catch (e) { }
            }
            if (typeof document !== "undefined") {
                delete Request.requests[this.index];
            }
            this.xhr = null;
        }
        /**
         * Called upon load.
         *
         * @api private
         */
        onLoad() {
            const data = this.xhr.responseText;
            if (data !== null) {
                this.onData(data);
            }
        }
        /**
         * Aborts the request.
         *
         * @api public
         */
        abort() {
            this.cleanup();
        }
    }
    Request.requestsCount = 0;
    Request.requests = {};
    /**
     * Aborts pending requests when unloading the window. This is needed to prevent
     * memory leaks (e.g. when using IE) and to ensure that no spurious error is
     * emitted.
     */
    if (typeof document !== "undefined") {
        // @ts-ignore
        if (typeof attachEvent === "function") {
            // @ts-ignore
            attachEvent("onunload", unloadHandler);
        }
        else if (typeof addEventListener === "function") {
            const terminationEvent = "onpagehide" in globalThis$1 ? "pagehide" : "unload";
            addEventListener(terminationEvent, unloadHandler, false);
        }
    }
    function unloadHandler() {
        for (let i in Request.requests) {
            if (Request.requests.hasOwnProperty(i)) {
                Request.requests[i].abort();
            }
        }
    }

    const nextTick = (() => {
        const isPromiseAvailable = typeof Promise === "function" && typeof Promise.resolve === "function";
        if (isPromiseAvailable) {
            return cb => Promise.resolve().then(cb);
        }
        else {
            return (cb, setTimeoutFn) => setTimeoutFn(cb, 0);
        }
    })();
    const WebSocket = globalThis$1.WebSocket || globalThis$1.MozWebSocket;
    const usingBrowserWebSocket = true;
    const defaultBinaryType = "arraybuffer";

    // detect ReactNative environment
    const isReactNative = typeof navigator !== "undefined" &&
        typeof navigator.product === "string" &&
        navigator.product.toLowerCase() === "reactnative";
    class WS extends Transport {
        /**
         * WebSocket transport constructor.
         *
         * @api {Object} connection options
         * @api public
         */
        constructor(opts) {
            super(opts);
            this.supportsBinary = !opts.forceBase64;
        }
        /**
         * Transport name.
         *
         * @api public
         */
        get name() {
            return "websocket";
        }
        /**
         * Opens socket.
         *
         * @api private
         */
        doOpen() {
            if (!this.check()) {
                // let probe timeout
                return;
            }
            const uri = this.uri();
            const protocols = this.opts.protocols;
            // React Native only supports the 'headers' option, and will print a warning if anything else is passed
            const opts = isReactNative
                ? {}
                : pick(this.opts, "agent", "perMessageDeflate", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "localAddress", "protocolVersion", "origin", "maxPayload", "family", "checkServerIdentity");
            if (this.opts.extraHeaders) {
                opts.headers = this.opts.extraHeaders;
            }
            try {
                this.ws =
                    usingBrowserWebSocket && !isReactNative
                        ? protocols
                            ? new WebSocket(uri, protocols)
                            : new WebSocket(uri)
                        : new WebSocket(uri, protocols, opts);
            }
            catch (err) {
                return this.emit("error", err);
            }
            this.ws.binaryType = this.socket.binaryType || defaultBinaryType;
            this.addEventListeners();
        }
        /**
         * Adds event listeners to the socket
         *
         * @api private
         */
        addEventListeners() {
            this.ws.onopen = () => {
                if (this.opts.autoUnref) {
                    this.ws._socket.unref();
                }
                this.onOpen();
            };
            this.ws.onclose = this.onClose.bind(this);
            this.ws.onmessage = ev => this.onData(ev.data);
            this.ws.onerror = e => this.onError("websocket error", e);
        }
        /**
         * Writes data to socket.
         *
         * @param {Array} array of packets.
         * @api private
         */
        write(packets) {
            this.writable = false;
            // encodePacket efficient as it uses WS framing
            // no need for encodePayload
            for (let i = 0; i < packets.length; i++) {
                const packet = packets[i];
                const lastPacket = i === packets.length - 1;
                encodePacket(packet, this.supportsBinary, data => {
                    // always create a new object (GH-437)
                    const opts = {};
                    // Sometimes the websocket has already been closed but the browser didn't
                    // have a chance of informing us about it yet, in that case send will
                    // throw an error
                    try {
                        if (usingBrowserWebSocket) {
                            // TypeError is thrown when passing the second argument on Safari
                            this.ws.send(data);
                        }
                    }
                    catch (e) {
                    }
                    if (lastPacket) {
                        // fake drain
                        // defer to next tick to allow Socket to clear writeBuffer
                        nextTick(() => {
                            this.writable = true;
                            this.emit("drain");
                        }, this.setTimeoutFn);
                    }
                });
            }
        }
        /**
         * Closes socket.
         *
         * @api private
         */
        doClose() {
            if (typeof this.ws !== "undefined") {
                this.ws.close();
                this.ws = null;
            }
        }
        /**
         * Generates uri for connection.
         *
         * @api private
         */
        uri() {
            let query = this.query || {};
            const schema = this.opts.secure ? "wss" : "ws";
            let port = "";
            // avoid port if default for schema
            if (this.opts.port &&
                (("wss" === schema && Number(this.opts.port) !== 443) ||
                    ("ws" === schema && Number(this.opts.port) !== 80))) {
                port = ":" + this.opts.port;
            }
            // append timestamp to URI
            if (this.opts.timestampRequests) {
                query[this.opts.timestampParam] = yeast_1();
            }
            // communicate binary support capabilities
            if (!this.supportsBinary) {
                query.b64 = 1;
            }
            const encodedQuery = parseqs.encode(query);
            const ipv6 = this.opts.hostname.indexOf(":") !== -1;
            return (schema +
                "://" +
                (ipv6 ? "[" + this.opts.hostname + "]" : this.opts.hostname) +
                port +
                this.opts.path +
                (encodedQuery.length ? "?" + encodedQuery : ""));
        }
        /**
         * Feature detection for WebSocket.
         *
         * @return {Boolean} whether this transport is available.
         * @api public
         */
        check() {
            return (!!WebSocket &&
                !("__initialize" in WebSocket && this.name === WS.prototype.name));
        }
    }

    const transports = {
        websocket: WS,
        polling: XHR
    };

    class Socket$1 extends Emitter_1 {
        /**
         * Socket constructor.
         *
         * @param {String|Object} uri or options
         * @param {Object} opts - options
         * @api public
         */
        constructor(uri, opts = {}) {
            super();
            if (uri && "object" === typeof uri) {
                opts = uri;
                uri = null;
            }
            if (uri) {
                uri = parseuri(uri);
                opts.hostname = uri.host;
                opts.secure = uri.protocol === "https" || uri.protocol === "wss";
                opts.port = uri.port;
                if (uri.query)
                    opts.query = uri.query;
            }
            else if (opts.host) {
                opts.hostname = parseuri(opts.host).host;
            }
            installTimerFunctions(this, opts);
            this.secure =
                null != opts.secure
                    ? opts.secure
                    : typeof location !== "undefined" && "https:" === location.protocol;
            if (opts.hostname && !opts.port) {
                // if no port is specified manually, use the protocol default
                opts.port = this.secure ? "443" : "80";
            }
            this.hostname =
                opts.hostname ||
                    (typeof location !== "undefined" ? location.hostname : "localhost");
            this.port =
                opts.port ||
                    (typeof location !== "undefined" && location.port
                        ? location.port
                        : this.secure
                            ? "443"
                            : "80");
            this.transports = opts.transports || ["polling", "websocket"];
            this.readyState = "";
            this.writeBuffer = [];
            this.prevBufferLen = 0;
            this.opts = Object.assign({
                path: "/engine.io",
                agent: false,
                withCredentials: false,
                upgrade: true,
                timestampParam: "t",
                rememberUpgrade: false,
                rejectUnauthorized: true,
                perMessageDeflate: {
                    threshold: 1024
                },
                transportOptions: {},
                closeOnBeforeunload: true
            }, opts);
            this.opts.path = this.opts.path.replace(/\/$/, "") + "/";
            if (typeof this.opts.query === "string") {
                this.opts.query = parseqs.decode(this.opts.query);
            }
            // set on handshake
            this.id = null;
            this.upgrades = null;
            this.pingInterval = null;
            this.pingTimeout = null;
            // set on heartbeat
            this.pingTimeoutTimer = null;
            if (typeof addEventListener === "function") {
                if (this.opts.closeOnBeforeunload) {
                    // Firefox closes the connection when the "beforeunload" event is emitted but not Chrome. This event listener
                    // ensures every browser behaves the same (no "disconnect" event at the Socket.IO level when the page is
                    // closed/reloaded)
                    addEventListener("beforeunload", () => {
                        if (this.transport) {
                            // silently close the transport
                            this.transport.removeAllListeners();
                            this.transport.close();
                        }
                    }, false);
                }
                if (this.hostname !== "localhost") {
                    this.offlineEventListener = () => {
                        this.onClose("transport close");
                    };
                    addEventListener("offline", this.offlineEventListener, false);
                }
            }
            this.open();
        }
        /**
         * Creates transport of the given type.
         *
         * @param {String} transport name
         * @return {Transport}
         * @api private
         */
        createTransport(name) {
            const query = clone(this.opts.query);
            // append engine.io protocol identifier
            query.EIO = protocol$1;
            // transport name
            query.transport = name;
            // session id if we already have one
            if (this.id)
                query.sid = this.id;
            const opts = Object.assign({}, this.opts.transportOptions[name], this.opts, {
                query,
                socket: this,
                hostname: this.hostname,
                secure: this.secure,
                port: this.port
            });
            return new transports[name](opts);
        }
        /**
         * Initializes transport to use and starts probe.
         *
         * @api private
         */
        open() {
            let transport;
            if (this.opts.rememberUpgrade &&
                Socket$1.priorWebsocketSuccess &&
                this.transports.indexOf("websocket") !== -1) {
                transport = "websocket";
            }
            else if (0 === this.transports.length) {
                // Emit error on next tick so it can be listened to
                this.setTimeoutFn(() => {
                    this.emitReserved("error", "No transports available");
                }, 0);
                return;
            }
            else {
                transport = this.transports[0];
            }
            this.readyState = "opening";
            // Retry with the next transport if the transport is disabled (jsonp: false)
            try {
                transport = this.createTransport(transport);
            }
            catch (e) {
                this.transports.shift();
                this.open();
                return;
            }
            transport.open();
            this.setTransport(transport);
        }
        /**
         * Sets the current transport. Disables the existing one (if any).
         *
         * @api private
         */
        setTransport(transport) {
            if (this.transport) {
                this.transport.removeAllListeners();
            }
            // set up transport
            this.transport = transport;
            // set up transport listeners
            transport
                .on("drain", this.onDrain.bind(this))
                .on("packet", this.onPacket.bind(this))
                .on("error", this.onError.bind(this))
                .on("close", () => {
                this.onClose("transport close");
            });
        }
        /**
         * Probes a transport.
         *
         * @param {String} transport name
         * @api private
         */
        probe(name) {
            let transport = this.createTransport(name);
            let failed = false;
            Socket$1.priorWebsocketSuccess = false;
            const onTransportOpen = () => {
                if (failed)
                    return;
                transport.send([{ type: "ping", data: "probe" }]);
                transport.once("packet", msg => {
                    if (failed)
                        return;
                    if ("pong" === msg.type && "probe" === msg.data) {
                        this.upgrading = true;
                        this.emitReserved("upgrading", transport);
                        if (!transport)
                            return;
                        Socket$1.priorWebsocketSuccess = "websocket" === transport.name;
                        this.transport.pause(() => {
                            if (failed)
                                return;
                            if ("closed" === this.readyState)
                                return;
                            cleanup();
                            this.setTransport(transport);
                            transport.send([{ type: "upgrade" }]);
                            this.emitReserved("upgrade", transport);
                            transport = null;
                            this.upgrading = false;
                            this.flush();
                        });
                    }
                    else {
                        const err = new Error("probe error");
                        // @ts-ignore
                        err.transport = transport.name;
                        this.emitReserved("upgradeError", err);
                    }
                });
            };
            function freezeTransport() {
                if (failed)
                    return;
                // Any callback called by transport should be ignored since now
                failed = true;
                cleanup();
                transport.close();
                transport = null;
            }
            // Handle any error that happens while probing
            const onerror = err => {
                const error = new Error("probe error: " + err);
                // @ts-ignore
                error.transport = transport.name;
                freezeTransport();
                this.emitReserved("upgradeError", error);
            };
            function onTransportClose() {
                onerror("transport closed");
            }
            // When the socket is closed while we're probing
            function onclose() {
                onerror("socket closed");
            }
            // When the socket is upgraded while we're probing
            function onupgrade(to) {
                if (transport && to.name !== transport.name) {
                    freezeTransport();
                }
            }
            // Remove all listeners on the transport and on self
            const cleanup = () => {
                transport.removeListener("open", onTransportOpen);
                transport.removeListener("error", onerror);
                transport.removeListener("close", onTransportClose);
                this.off("close", onclose);
                this.off("upgrading", onupgrade);
            };
            transport.once("open", onTransportOpen);
            transport.once("error", onerror);
            transport.once("close", onTransportClose);
            this.once("close", onclose);
            this.once("upgrading", onupgrade);
            transport.open();
        }
        /**
         * Called when connection is deemed open.
         *
         * @api private
         */
        onOpen() {
            this.readyState = "open";
            Socket$1.priorWebsocketSuccess = "websocket" === this.transport.name;
            this.emitReserved("open");
            this.flush();
            // we check for `readyState` in case an `open`
            // listener already closed the socket
            if ("open" === this.readyState &&
                this.opts.upgrade &&
                this.transport.pause) {
                let i = 0;
                const l = this.upgrades.length;
                for (; i < l; i++) {
                    this.probe(this.upgrades[i]);
                }
            }
        }
        /**
         * Handles a packet.
         *
         * @api private
         */
        onPacket(packet) {
            if ("opening" === this.readyState ||
                "open" === this.readyState ||
                "closing" === this.readyState) {
                this.emitReserved("packet", packet);
                // Socket is live - any packet counts
                this.emitReserved("heartbeat");
                switch (packet.type) {
                    case "open":
                        this.onHandshake(JSON.parse(packet.data));
                        break;
                    case "ping":
                        this.resetPingTimeout();
                        this.sendPacket("pong");
                        this.emitReserved("ping");
                        this.emitReserved("pong");
                        break;
                    case "error":
                        const err = new Error("server error");
                        // @ts-ignore
                        err.code = packet.data;
                        this.onError(err);
                        break;
                    case "message":
                        this.emitReserved("data", packet.data);
                        this.emitReserved("message", packet.data);
                        break;
                }
            }
        }
        /**
         * Called upon handshake completion.
         *
         * @param {Object} data - handshake obj
         * @api private
         */
        onHandshake(data) {
            this.emitReserved("handshake", data);
            this.id = data.sid;
            this.transport.query.sid = data.sid;
            this.upgrades = this.filterUpgrades(data.upgrades);
            this.pingInterval = data.pingInterval;
            this.pingTimeout = data.pingTimeout;
            this.onOpen();
            // In case open handler closes socket
            if ("closed" === this.readyState)
                return;
            this.resetPingTimeout();
        }
        /**
         * Sets and resets ping timeout timer based on server pings.
         *
         * @api private
         */
        resetPingTimeout() {
            this.clearTimeoutFn(this.pingTimeoutTimer);
            this.pingTimeoutTimer = this.setTimeoutFn(() => {
                this.onClose("ping timeout");
            }, this.pingInterval + this.pingTimeout);
            if (this.opts.autoUnref) {
                this.pingTimeoutTimer.unref();
            }
        }
        /**
         * Called on `drain` event
         *
         * @api private
         */
        onDrain() {
            this.writeBuffer.splice(0, this.prevBufferLen);
            // setting prevBufferLen = 0 is very important
            // for example, when upgrading, upgrade packet is sent over,
            // and a nonzero prevBufferLen could cause problems on `drain`
            this.prevBufferLen = 0;
            if (0 === this.writeBuffer.length) {
                this.emitReserved("drain");
            }
            else {
                this.flush();
            }
        }
        /**
         * Flush write buffers.
         *
         * @api private
         */
        flush() {
            if ("closed" !== this.readyState &&
                this.transport.writable &&
                !this.upgrading &&
                this.writeBuffer.length) {
                this.transport.send(this.writeBuffer);
                // keep track of current length of writeBuffer
                // splice writeBuffer and callbackBuffer on `drain`
                this.prevBufferLen = this.writeBuffer.length;
                this.emitReserved("flush");
            }
        }
        /**
         * Sends a message.
         *
         * @param {String} message.
         * @param {Function} callback function.
         * @param {Object} options.
         * @return {Socket} for chaining.
         * @api public
         */
        write(msg, options, fn) {
            this.sendPacket("message", msg, options, fn);
            return this;
        }
        send(msg, options, fn) {
            this.sendPacket("message", msg, options, fn);
            return this;
        }
        /**
         * Sends a packet.
         *
         * @param {String} packet type.
         * @param {String} data.
         * @param {Object} options.
         * @param {Function} callback function.
         * @api private
         */
        sendPacket(type, data, options, fn) {
            if ("function" === typeof data) {
                fn = data;
                data = undefined;
            }
            if ("function" === typeof options) {
                fn = options;
                options = null;
            }
            if ("closing" === this.readyState || "closed" === this.readyState) {
                return;
            }
            options = options || {};
            options.compress = false !== options.compress;
            const packet = {
                type: type,
                data: data,
                options: options
            };
            this.emitReserved("packetCreate", packet);
            this.writeBuffer.push(packet);
            if (fn)
                this.once("flush", fn);
            this.flush();
        }
        /**
         * Closes the connection.
         *
         * @api public
         */
        close() {
            const close = () => {
                this.onClose("forced close");
                this.transport.close();
            };
            const cleanupAndClose = () => {
                this.off("upgrade", cleanupAndClose);
                this.off("upgradeError", cleanupAndClose);
                close();
            };
            const waitForUpgrade = () => {
                // wait for upgrade to finish since we can't send packets while pausing a transport
                this.once("upgrade", cleanupAndClose);
                this.once("upgradeError", cleanupAndClose);
            };
            if ("opening" === this.readyState || "open" === this.readyState) {
                this.readyState = "closing";
                if (this.writeBuffer.length) {
                    this.once("drain", () => {
                        if (this.upgrading) {
                            waitForUpgrade();
                        }
                        else {
                            close();
                        }
                    });
                }
                else if (this.upgrading) {
                    waitForUpgrade();
                }
                else {
                    close();
                }
            }
            return this;
        }
        /**
         * Called upon transport error
         *
         * @api private
         */
        onError(err) {
            Socket$1.priorWebsocketSuccess = false;
            this.emitReserved("error", err);
            this.onClose("transport error", err);
        }
        /**
         * Called upon transport close.
         *
         * @api private
         */
        onClose(reason, desc) {
            if ("opening" === this.readyState ||
                "open" === this.readyState ||
                "closing" === this.readyState) {
                // clear timers
                this.clearTimeoutFn(this.pingTimeoutTimer);
                // stop event from firing again for transport
                this.transport.removeAllListeners("close");
                // ensure transport won't stay open
                this.transport.close();
                // ignore further transport communication
                this.transport.removeAllListeners();
                if (typeof removeEventListener === "function") {
                    removeEventListener("offline", this.offlineEventListener, false);
                }
                // set ready state
                this.readyState = "closed";
                // clear session id
                this.id = null;
                // emit close event
                this.emitReserved("close", reason, desc);
                // clean buffers after, so users can still
                // grab the buffers on `close` event
                this.writeBuffer = [];
                this.prevBufferLen = 0;
            }
        }
        /**
         * Filters upgrades, returning only those matching client transports.
         *
         * @param {Array} server upgrades
         * @api private
         *
         */
        filterUpgrades(upgrades) {
            const filteredUpgrades = [];
            let i = 0;
            const j = upgrades.length;
            for (; i < j; i++) {
                if (~this.transports.indexOf(upgrades[i]))
                    filteredUpgrades.push(upgrades[i]);
            }
            return filteredUpgrades;
        }
    }
    Socket$1.protocol = protocol$1;
    function clone(obj) {
        const o = {};
        for (let i in obj) {
            if (obj.hasOwnProperty(i)) {
                o[i] = obj[i];
            }
        }
        return o;
    }

    const withNativeArrayBuffer = typeof ArrayBuffer === "function";
    const isView = (obj) => {
        return typeof ArrayBuffer.isView === "function"
            ? ArrayBuffer.isView(obj)
            : obj.buffer instanceof ArrayBuffer;
    };
    const toString = Object.prototype.toString;
    const withNativeBlob = typeof Blob === "function" ||
        (typeof Blob !== "undefined" &&
            toString.call(Blob) === "[object BlobConstructor]");
    const withNativeFile = typeof File === "function" ||
        (typeof File !== "undefined" &&
            toString.call(File) === "[object FileConstructor]");
    /**
     * Returns true if obj is a Buffer, an ArrayBuffer, a Blob or a File.
     *
     * @private
     */
    function isBinary(obj) {
        return ((withNativeArrayBuffer && (obj instanceof ArrayBuffer || isView(obj))) ||
            (withNativeBlob && obj instanceof Blob) ||
            (withNativeFile && obj instanceof File));
    }
    function hasBinary(obj, toJSON) {
        if (!obj || typeof obj !== "object") {
            return false;
        }
        if (Array.isArray(obj)) {
            for (let i = 0, l = obj.length; i < l; i++) {
                if (hasBinary(obj[i])) {
                    return true;
                }
            }
            return false;
        }
        if (isBinary(obj)) {
            return true;
        }
        if (obj.toJSON &&
            typeof obj.toJSON === "function" &&
            arguments.length === 1) {
            return hasBinary(obj.toJSON(), true);
        }
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key) && hasBinary(obj[key])) {
                return true;
            }
        }
        return false;
    }

    /**
     * Replaces every Buffer | ArrayBuffer | Blob | File in packet with a numbered placeholder.
     *
     * @param {Object} packet - socket.io event packet
     * @return {Object} with deconstructed packet and list of buffers
     * @public
     */
    function deconstructPacket(packet) {
        const buffers = [];
        const packetData = packet.data;
        const pack = packet;
        pack.data = _deconstructPacket(packetData, buffers);
        pack.attachments = buffers.length; // number of binary 'attachments'
        return { packet: pack, buffers: buffers };
    }
    function _deconstructPacket(data, buffers) {
        if (!data)
            return data;
        if (isBinary(data)) {
            const placeholder = { _placeholder: true, num: buffers.length };
            buffers.push(data);
            return placeholder;
        }
        else if (Array.isArray(data)) {
            const newData = new Array(data.length);
            for (let i = 0; i < data.length; i++) {
                newData[i] = _deconstructPacket(data[i], buffers);
            }
            return newData;
        }
        else if (typeof data === "object" && !(data instanceof Date)) {
            const newData = {};
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    newData[key] = _deconstructPacket(data[key], buffers);
                }
            }
            return newData;
        }
        return data;
    }
    /**
     * Reconstructs a binary packet from its placeholder packet and buffers
     *
     * @param {Object} packet - event packet with placeholders
     * @param {Array} buffers - binary buffers to put in placeholder positions
     * @return {Object} reconstructed packet
     * @public
     */
    function reconstructPacket(packet, buffers) {
        packet.data = _reconstructPacket(packet.data, buffers);
        packet.attachments = undefined; // no longer useful
        return packet;
    }
    function _reconstructPacket(data, buffers) {
        if (!data)
            return data;
        if (data && data._placeholder) {
            return buffers[data.num]; // appropriate buffer (should be natural order anyway)
        }
        else if (Array.isArray(data)) {
            for (let i = 0; i < data.length; i++) {
                data[i] = _reconstructPacket(data[i], buffers);
            }
        }
        else if (typeof data === "object") {
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    data[key] = _reconstructPacket(data[key], buffers);
                }
            }
        }
        return data;
    }

    /**
     * Protocol version.
     *
     * @public
     */
    const protocol = 5;
    var PacketType;
    (function (PacketType) {
        PacketType[PacketType["CONNECT"] = 0] = "CONNECT";
        PacketType[PacketType["DISCONNECT"] = 1] = "DISCONNECT";
        PacketType[PacketType["EVENT"] = 2] = "EVENT";
        PacketType[PacketType["ACK"] = 3] = "ACK";
        PacketType[PacketType["CONNECT_ERROR"] = 4] = "CONNECT_ERROR";
        PacketType[PacketType["BINARY_EVENT"] = 5] = "BINARY_EVENT";
        PacketType[PacketType["BINARY_ACK"] = 6] = "BINARY_ACK";
    })(PacketType || (PacketType = {}));
    /**
     * A socket.io Encoder instance
     */
    class Encoder {
        /**
         * Encode a packet as a single string if non-binary, or as a
         * buffer sequence, depending on packet type.
         *
         * @param {Object} obj - packet object
         */
        encode(obj) {
            if (obj.type === PacketType.EVENT || obj.type === PacketType.ACK) {
                if (hasBinary(obj)) {
                    obj.type =
                        obj.type === PacketType.EVENT
                            ? PacketType.BINARY_EVENT
                            : PacketType.BINARY_ACK;
                    return this.encodeAsBinary(obj);
                }
            }
            return [this.encodeAsString(obj)];
        }
        /**
         * Encode packet as string.
         */
        encodeAsString(obj) {
            // first is type
            let str = "" + obj.type;
            // attachments if we have them
            if (obj.type === PacketType.BINARY_EVENT ||
                obj.type === PacketType.BINARY_ACK) {
                str += obj.attachments + "-";
            }
            // if we have a namespace other than `/`
            // we append it followed by a comma `,`
            if (obj.nsp && "/" !== obj.nsp) {
                str += obj.nsp + ",";
            }
            // immediately followed by the id
            if (null != obj.id) {
                str += obj.id;
            }
            // json data
            if (null != obj.data) {
                str += JSON.stringify(obj.data);
            }
            return str;
        }
        /**
         * Encode packet as 'buffer sequence' by removing blobs, and
         * deconstructing packet into object with placeholders and
         * a list of buffers.
         */
        encodeAsBinary(obj) {
            const deconstruction = deconstructPacket(obj);
            const pack = this.encodeAsString(deconstruction.packet);
            const buffers = deconstruction.buffers;
            buffers.unshift(pack); // add packet info to beginning of data list
            return buffers; // write all the buffers
        }
    }
    /**
     * A socket.io Decoder instance
     *
     * @return {Object} decoder
     */
    class Decoder extends Emitter_1 {
        constructor() {
            super();
        }
        /**
         * Decodes an encoded packet string into packet JSON.
         *
         * @param {String} obj - encoded packet
         */
        add(obj) {
            let packet;
            if (typeof obj === "string") {
                packet = this.decodeString(obj);
                if (packet.type === PacketType.BINARY_EVENT ||
                    packet.type === PacketType.BINARY_ACK) {
                    // binary packet's json
                    this.reconstructor = new BinaryReconstructor(packet);
                    // no attachments, labeled binary but no binary data to follow
                    if (packet.attachments === 0) {
                        super.emitReserved("decoded", packet);
                    }
                }
                else {
                    // non-binary full packet
                    super.emitReserved("decoded", packet);
                }
            }
            else if (isBinary(obj) || obj.base64) {
                // raw binary data
                if (!this.reconstructor) {
                    throw new Error("got binary data when not reconstructing a packet");
                }
                else {
                    packet = this.reconstructor.takeBinaryData(obj);
                    if (packet) {
                        // received final buffer
                        this.reconstructor = null;
                        super.emitReserved("decoded", packet);
                    }
                }
            }
            else {
                throw new Error("Unknown type: " + obj);
            }
        }
        /**
         * Decode a packet String (JSON data)
         *
         * @param {String} str
         * @return {Object} packet
         */
        decodeString(str) {
            let i = 0;
            // look up type
            const p = {
                type: Number(str.charAt(0)),
            };
            if (PacketType[p.type] === undefined) {
                throw new Error("unknown packet type " + p.type);
            }
            // look up attachments if type binary
            if (p.type === PacketType.BINARY_EVENT ||
                p.type === PacketType.BINARY_ACK) {
                const start = i + 1;
                while (str.charAt(++i) !== "-" && i != str.length) { }
                const buf = str.substring(start, i);
                if (buf != Number(buf) || str.charAt(i) !== "-") {
                    throw new Error("Illegal attachments");
                }
                p.attachments = Number(buf);
            }
            // look up namespace (if any)
            if ("/" === str.charAt(i + 1)) {
                const start = i + 1;
                while (++i) {
                    const c = str.charAt(i);
                    if ("," === c)
                        break;
                    if (i === str.length)
                        break;
                }
                p.nsp = str.substring(start, i);
            }
            else {
                p.nsp = "/";
            }
            // look up id
            const next = str.charAt(i + 1);
            if ("" !== next && Number(next) == next) {
                const start = i + 1;
                while (++i) {
                    const c = str.charAt(i);
                    if (null == c || Number(c) != c) {
                        --i;
                        break;
                    }
                    if (i === str.length)
                        break;
                }
                p.id = Number(str.substring(start, i + 1));
            }
            // look up json data
            if (str.charAt(++i)) {
                const payload = tryParse(str.substr(i));
                if (Decoder.isPayloadValid(p.type, payload)) {
                    p.data = payload;
                }
                else {
                    throw new Error("invalid payload");
                }
            }
            return p;
        }
        static isPayloadValid(type, payload) {
            switch (type) {
                case PacketType.CONNECT:
                    return typeof payload === "object";
                case PacketType.DISCONNECT:
                    return payload === undefined;
                case PacketType.CONNECT_ERROR:
                    return typeof payload === "string" || typeof payload === "object";
                case PacketType.EVENT:
                case PacketType.BINARY_EVENT:
                    return Array.isArray(payload) && payload.length > 0;
                case PacketType.ACK:
                case PacketType.BINARY_ACK:
                    return Array.isArray(payload);
            }
        }
        /**
         * Deallocates a parser's resources
         */
        destroy() {
            if (this.reconstructor) {
                this.reconstructor.finishedReconstruction();
            }
        }
    }
    function tryParse(str) {
        try {
            return JSON.parse(str);
        }
        catch (e) {
            return false;
        }
    }
    /**
     * A manager of a binary event's 'buffer sequence'. Should
     * be constructed whenever a packet of type BINARY_EVENT is
     * decoded.
     *
     * @param {Object} packet
     * @return {BinaryReconstructor} initialized reconstructor
     */
    class BinaryReconstructor {
        constructor(packet) {
            this.packet = packet;
            this.buffers = [];
            this.reconPack = packet;
        }
        /**
         * Method to be called when binary data received from connection
         * after a BINARY_EVENT packet.
         *
         * @param {Buffer | ArrayBuffer} binData - the raw binary data received
         * @return {null | Object} returns null if more binary data is expected or
         *   a reconstructed packet object if all buffers have been received.
         */
        takeBinaryData(binData) {
            this.buffers.push(binData);
            if (this.buffers.length === this.reconPack.attachments) {
                // done with buffer list
                const packet = reconstructPacket(this.reconPack, this.buffers);
                this.finishedReconstruction();
                return packet;
            }
            return null;
        }
        /**
         * Cleans up binary packet reconstruction variables.
         */
        finishedReconstruction() {
            this.reconPack = null;
            this.buffers = [];
        }
    }

    var parser = /*#__PURE__*/Object.freeze({
        __proto__: null,
        protocol: protocol,
        get PacketType () { return PacketType; },
        Encoder: Encoder,
        Decoder: Decoder
    });

    function on(obj, ev, fn) {
        obj.on(ev, fn);
        return function subDestroy() {
            obj.off(ev, fn);
        };
    }

    /**
     * Internal events.
     * These events can't be emitted by the user.
     */
    const RESERVED_EVENTS = Object.freeze({
        connect: 1,
        connect_error: 1,
        disconnect: 1,
        disconnecting: 1,
        // EventEmitter reserved events: https://nodejs.org/api/events.html#events_event_newlistener
        newListener: 1,
        removeListener: 1,
    });
    class Socket extends Emitter_1 {
        /**
         * `Socket` constructor.
         *
         * @public
         */
        constructor(io, nsp, opts) {
            super();
            this.connected = false;
            this.disconnected = true;
            this.receiveBuffer = [];
            this.sendBuffer = [];
            this.ids = 0;
            this.acks = {};
            this.flags = {};
            this.io = io;
            this.nsp = nsp;
            if (opts && opts.auth) {
                this.auth = opts.auth;
            }
            if (this.io._autoConnect)
                this.open();
        }
        /**
         * Subscribe to open, close and packet events
         *
         * @private
         */
        subEvents() {
            if (this.subs)
                return;
            const io = this.io;
            this.subs = [
                on(io, "open", this.onopen.bind(this)),
                on(io, "packet", this.onpacket.bind(this)),
                on(io, "error", this.onerror.bind(this)),
                on(io, "close", this.onclose.bind(this)),
            ];
        }
        /**
         * Whether the Socket will try to reconnect when its Manager connects or reconnects
         */
        get active() {
            return !!this.subs;
        }
        /**
         * "Opens" the socket.
         *
         * @public
         */
        connect() {
            if (this.connected)
                return this;
            this.subEvents();
            if (!this.io["_reconnecting"])
                this.io.open(); // ensure open
            if ("open" === this.io._readyState)
                this.onopen();
            return this;
        }
        /**
         * Alias for connect()
         */
        open() {
            return this.connect();
        }
        /**
         * Sends a `message` event.
         *
         * @return self
         * @public
         */
        send(...args) {
            args.unshift("message");
            this.emit.apply(this, args);
            return this;
        }
        /**
         * Override `emit`.
         * If the event is in `events`, it's emitted normally.
         *
         * @return self
         * @public
         */
        emit(ev, ...args) {
            if (RESERVED_EVENTS.hasOwnProperty(ev)) {
                throw new Error('"' + ev + '" is a reserved event name');
            }
            args.unshift(ev);
            const packet = {
                type: PacketType.EVENT,
                data: args,
            };
            packet.options = {};
            packet.options.compress = this.flags.compress !== false;
            // event ack callback
            if ("function" === typeof args[args.length - 1]) {
                this.acks[this.ids] = args.pop();
                packet.id = this.ids++;
            }
            const isTransportWritable = this.io.engine &&
                this.io.engine.transport &&
                this.io.engine.transport.writable;
            const discardPacket = this.flags.volatile && (!isTransportWritable || !this.connected);
            if (discardPacket) ;
            else if (this.connected) {
                this.packet(packet);
            }
            else {
                this.sendBuffer.push(packet);
            }
            this.flags = {};
            return this;
        }
        /**
         * Sends a packet.
         *
         * @param packet
         * @private
         */
        packet(packet) {
            packet.nsp = this.nsp;
            this.io._packet(packet);
        }
        /**
         * Called upon engine `open`.
         *
         * @private
         */
        onopen() {
            if (typeof this.auth == "function") {
                this.auth((data) => {
                    this.packet({ type: PacketType.CONNECT, data });
                });
            }
            else {
                this.packet({ type: PacketType.CONNECT, data: this.auth });
            }
        }
        /**
         * Called upon engine or manager `error`.
         *
         * @param err
         * @private
         */
        onerror(err) {
            if (!this.connected) {
                this.emitReserved("connect_error", err);
            }
        }
        /**
         * Called upon engine `close`.
         *
         * @param reason
         * @private
         */
        onclose(reason) {
            this.connected = false;
            this.disconnected = true;
            delete this.id;
            this.emitReserved("disconnect", reason);
        }
        /**
         * Called with socket packet.
         *
         * @param packet
         * @private
         */
        onpacket(packet) {
            const sameNamespace = packet.nsp === this.nsp;
            if (!sameNamespace)
                return;
            switch (packet.type) {
                case PacketType.CONNECT:
                    if (packet.data && packet.data.sid) {
                        const id = packet.data.sid;
                        this.onconnect(id);
                    }
                    else {
                        this.emitReserved("connect_error", new Error("It seems you are trying to reach a Socket.IO server in v2.x with a v3.x client, but they are not compatible (more information here: https://socket.io/docs/v3/migrating-from-2-x-to-3-0/)"));
                    }
                    break;
                case PacketType.EVENT:
                    this.onevent(packet);
                    break;
                case PacketType.BINARY_EVENT:
                    this.onevent(packet);
                    break;
                case PacketType.ACK:
                    this.onack(packet);
                    break;
                case PacketType.BINARY_ACK:
                    this.onack(packet);
                    break;
                case PacketType.DISCONNECT:
                    this.ondisconnect();
                    break;
                case PacketType.CONNECT_ERROR:
                    const err = new Error(packet.data.message);
                    // @ts-ignore
                    err.data = packet.data.data;
                    this.emitReserved("connect_error", err);
                    break;
            }
        }
        /**
         * Called upon a server event.
         *
         * @param packet
         * @private
         */
        onevent(packet) {
            const args = packet.data || [];
            if (null != packet.id) {
                args.push(this.ack(packet.id));
            }
            if (this.connected) {
                this.emitEvent(args);
            }
            else {
                this.receiveBuffer.push(Object.freeze(args));
            }
        }
        emitEvent(args) {
            if (this._anyListeners && this._anyListeners.length) {
                const listeners = this._anyListeners.slice();
                for (const listener of listeners) {
                    listener.apply(this, args);
                }
            }
            super.emit.apply(this, args);
        }
        /**
         * Produces an ack callback to emit with an event.
         *
         * @private
         */
        ack(id) {
            const self = this;
            let sent = false;
            return function (...args) {
                // prevent double callbacks
                if (sent)
                    return;
                sent = true;
                self.packet({
                    type: PacketType.ACK,
                    id: id,
                    data: args,
                });
            };
        }
        /**
         * Called upon a server acknowlegement.
         *
         * @param packet
         * @private
         */
        onack(packet) {
            const ack = this.acks[packet.id];
            if ("function" === typeof ack) {
                ack.apply(this, packet.data);
                delete this.acks[packet.id];
            }
        }
        /**
         * Called upon server connect.
         *
         * @private
         */
        onconnect(id) {
            this.id = id;
            this.connected = true;
            this.disconnected = false;
            this.emitBuffered();
            this.emitReserved("connect");
        }
        /**
         * Emit buffered events (received and emitted).
         *
         * @private
         */
        emitBuffered() {
            this.receiveBuffer.forEach((args) => this.emitEvent(args));
            this.receiveBuffer = [];
            this.sendBuffer.forEach((packet) => this.packet(packet));
            this.sendBuffer = [];
        }
        /**
         * Called upon server disconnect.
         *
         * @private
         */
        ondisconnect() {
            this.destroy();
            this.onclose("io server disconnect");
        }
        /**
         * Called upon forced client/server side disconnections,
         * this method ensures the manager stops tracking us and
         * that reconnections don't get triggered for this.
         *
         * @private
         */
        destroy() {
            if (this.subs) {
                // clean subscriptions to avoid reconnections
                this.subs.forEach((subDestroy) => subDestroy());
                this.subs = undefined;
            }
            this.io["_destroy"](this);
        }
        /**
         * Disconnects the socket manually.
         *
         * @return self
         * @public
         */
        disconnect() {
            if (this.connected) {
                this.packet({ type: PacketType.DISCONNECT });
            }
            // remove socket from pool
            this.destroy();
            if (this.connected) {
                // fire events
                this.onclose("io client disconnect");
            }
            return this;
        }
        /**
         * Alias for disconnect()
         *
         * @return self
         * @public
         */
        close() {
            return this.disconnect();
        }
        /**
         * Sets the compress flag.
         *
         * @param compress - if `true`, compresses the sending data
         * @return self
         * @public
         */
        compress(compress) {
            this.flags.compress = compress;
            return this;
        }
        /**
         * Sets a modifier for a subsequent event emission that the event message will be dropped when this socket is not
         * ready to send messages.
         *
         * @returns self
         * @public
         */
        get volatile() {
            this.flags.volatile = true;
            return this;
        }
        /**
         * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
         * callback.
         *
         * @param listener
         * @public
         */
        onAny(listener) {
            this._anyListeners = this._anyListeners || [];
            this._anyListeners.push(listener);
            return this;
        }
        /**
         * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
         * callback. The listener is added to the beginning of the listeners array.
         *
         * @param listener
         * @public
         */
        prependAny(listener) {
            this._anyListeners = this._anyListeners || [];
            this._anyListeners.unshift(listener);
            return this;
        }
        /**
         * Removes the listener that will be fired when any event is emitted.
         *
         * @param listener
         * @public
         */
        offAny(listener) {
            if (!this._anyListeners) {
                return this;
            }
            if (listener) {
                const listeners = this._anyListeners;
                for (let i = 0; i < listeners.length; i++) {
                    if (listener === listeners[i]) {
                        listeners.splice(i, 1);
                        return this;
                    }
                }
            }
            else {
                this._anyListeners = [];
            }
            return this;
        }
        /**
         * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
         * e.g. to remove listeners.
         *
         * @public
         */
        listenersAny() {
            return this._anyListeners || [];
        }
    }

    /**
     * Expose `Backoff`.
     */

    var backo2 = Backoff;

    /**
     * Initialize backoff timer with `opts`.
     *
     * - `min` initial timeout in milliseconds [100]
     * - `max` max timeout [10000]
     * - `jitter` [0]
     * - `factor` [2]
     *
     * @param {Object} opts
     * @api public
     */

    function Backoff(opts) {
      opts = opts || {};
      this.ms = opts.min || 100;
      this.max = opts.max || 10000;
      this.factor = opts.factor || 2;
      this.jitter = opts.jitter > 0 && opts.jitter <= 1 ? opts.jitter : 0;
      this.attempts = 0;
    }

    /**
     * Return the backoff duration.
     *
     * @return {Number}
     * @api public
     */

    Backoff.prototype.duration = function(){
      var ms = this.ms * Math.pow(this.factor, this.attempts++);
      if (this.jitter) {
        var rand =  Math.random();
        var deviation = Math.floor(rand * this.jitter * ms);
        ms = (Math.floor(rand * 10) & 1) == 0  ? ms - deviation : ms + deviation;
      }
      return Math.min(ms, this.max) | 0;
    };

    /**
     * Reset the number of attempts.
     *
     * @api public
     */

    Backoff.prototype.reset = function(){
      this.attempts = 0;
    };

    /**
     * Set the minimum duration
     *
     * @api public
     */

    Backoff.prototype.setMin = function(min){
      this.ms = min;
    };

    /**
     * Set the maximum duration
     *
     * @api public
     */

    Backoff.prototype.setMax = function(max){
      this.max = max;
    };

    /**
     * Set the jitter
     *
     * @api public
     */

    Backoff.prototype.setJitter = function(jitter){
      this.jitter = jitter;
    };

    class Manager extends Emitter_1 {
        constructor(uri, opts) {
            var _a;
            super();
            this.nsps = {};
            this.subs = [];
            if (uri && "object" === typeof uri) {
                opts = uri;
                uri = undefined;
            }
            opts = opts || {};
            opts.path = opts.path || "/socket.io";
            this.opts = opts;
            installTimerFunctions(this, opts);
            this.reconnection(opts.reconnection !== false);
            this.reconnectionAttempts(opts.reconnectionAttempts || Infinity);
            this.reconnectionDelay(opts.reconnectionDelay || 1000);
            this.reconnectionDelayMax(opts.reconnectionDelayMax || 5000);
            this.randomizationFactor((_a = opts.randomizationFactor) !== null && _a !== void 0 ? _a : 0.5);
            this.backoff = new backo2({
                min: this.reconnectionDelay(),
                max: this.reconnectionDelayMax(),
                jitter: this.randomizationFactor(),
            });
            this.timeout(null == opts.timeout ? 20000 : opts.timeout);
            this._readyState = "closed";
            this.uri = uri;
            const _parser = opts.parser || parser;
            this.encoder = new _parser.Encoder();
            this.decoder = new _parser.Decoder();
            this._autoConnect = opts.autoConnect !== false;
            if (this._autoConnect)
                this.open();
        }
        reconnection(v) {
            if (!arguments.length)
                return this._reconnection;
            this._reconnection = !!v;
            return this;
        }
        reconnectionAttempts(v) {
            if (v === undefined)
                return this._reconnectionAttempts;
            this._reconnectionAttempts = v;
            return this;
        }
        reconnectionDelay(v) {
            var _a;
            if (v === undefined)
                return this._reconnectionDelay;
            this._reconnectionDelay = v;
            (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setMin(v);
            return this;
        }
        randomizationFactor(v) {
            var _a;
            if (v === undefined)
                return this._randomizationFactor;
            this._randomizationFactor = v;
            (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setJitter(v);
            return this;
        }
        reconnectionDelayMax(v) {
            var _a;
            if (v === undefined)
                return this._reconnectionDelayMax;
            this._reconnectionDelayMax = v;
            (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setMax(v);
            return this;
        }
        timeout(v) {
            if (!arguments.length)
                return this._timeout;
            this._timeout = v;
            return this;
        }
        /**
         * Starts trying to reconnect if reconnection is enabled and we have not
         * started reconnecting yet
         *
         * @private
         */
        maybeReconnectOnOpen() {
            // Only try to reconnect if it's the first time we're connecting
            if (!this._reconnecting &&
                this._reconnection &&
                this.backoff.attempts === 0) {
                // keeps reconnection from firing twice for the same reconnection loop
                this.reconnect();
            }
        }
        /**
         * Sets the current transport `socket`.
         *
         * @param {Function} fn - optional, callback
         * @return self
         * @public
         */
        open(fn) {
            if (~this._readyState.indexOf("open"))
                return this;
            this.engine = new Socket$1(this.uri, this.opts);
            const socket = this.engine;
            const self = this;
            this._readyState = "opening";
            this.skipReconnect = false;
            // emit `open`
            const openSubDestroy = on(socket, "open", function () {
                self.onopen();
                fn && fn();
            });
            // emit `error`
            const errorSub = on(socket, "error", (err) => {
                self.cleanup();
                self._readyState = "closed";
                this.emitReserved("error", err);
                if (fn) {
                    fn(err);
                }
                else {
                    // Only do this if there is no fn to handle the error
                    self.maybeReconnectOnOpen();
                }
            });
            if (false !== this._timeout) {
                const timeout = this._timeout;
                if (timeout === 0) {
                    openSubDestroy(); // prevents a race condition with the 'open' event
                }
                // set timer
                const timer = this.setTimeoutFn(() => {
                    openSubDestroy();
                    socket.close();
                    // @ts-ignore
                    socket.emit("error", new Error("timeout"));
                }, timeout);
                if (this.opts.autoUnref) {
                    timer.unref();
                }
                this.subs.push(function subDestroy() {
                    clearTimeout(timer);
                });
            }
            this.subs.push(openSubDestroy);
            this.subs.push(errorSub);
            return this;
        }
        /**
         * Alias for open()
         *
         * @return self
         * @public
         */
        connect(fn) {
            return this.open(fn);
        }
        /**
         * Called upon transport open.
         *
         * @private
         */
        onopen() {
            // clear old subs
            this.cleanup();
            // mark as open
            this._readyState = "open";
            this.emitReserved("open");
            // add new subs
            const socket = this.engine;
            this.subs.push(on(socket, "ping", this.onping.bind(this)), on(socket, "data", this.ondata.bind(this)), on(socket, "error", this.onerror.bind(this)), on(socket, "close", this.onclose.bind(this)), on(this.decoder, "decoded", this.ondecoded.bind(this)));
        }
        /**
         * Called upon a ping.
         *
         * @private
         */
        onping() {
            this.emitReserved("ping");
        }
        /**
         * Called with data.
         *
         * @private
         */
        ondata(data) {
            this.decoder.add(data);
        }
        /**
         * Called when parser fully decodes a packet.
         *
         * @private
         */
        ondecoded(packet) {
            this.emitReserved("packet", packet);
        }
        /**
         * Called upon socket error.
         *
         * @private
         */
        onerror(err) {
            this.emitReserved("error", err);
        }
        /**
         * Creates a new socket for the given `nsp`.
         *
         * @return {Socket}
         * @public
         */
        socket(nsp, opts) {
            let socket = this.nsps[nsp];
            if (!socket) {
                socket = new Socket(this, nsp, opts);
                this.nsps[nsp] = socket;
            }
            return socket;
        }
        /**
         * Called upon a socket close.
         *
         * @param socket
         * @private
         */
        _destroy(socket) {
            const nsps = Object.keys(this.nsps);
            for (const nsp of nsps) {
                const socket = this.nsps[nsp];
                if (socket.active) {
                    return;
                }
            }
            this._close();
        }
        /**
         * Writes a packet.
         *
         * @param packet
         * @private
         */
        _packet(packet) {
            const encodedPackets = this.encoder.encode(packet);
            for (let i = 0; i < encodedPackets.length; i++) {
                this.engine.write(encodedPackets[i], packet.options);
            }
        }
        /**
         * Clean up transport subscriptions and packet buffer.
         *
         * @private
         */
        cleanup() {
            this.subs.forEach((subDestroy) => subDestroy());
            this.subs.length = 0;
            this.decoder.destroy();
        }
        /**
         * Close the current socket.
         *
         * @private
         */
        _close() {
            this.skipReconnect = true;
            this._reconnecting = false;
            if ("opening" === this._readyState) {
                // `onclose` will not fire because
                // an open event never happened
                this.cleanup();
            }
            this.backoff.reset();
            this._readyState = "closed";
            if (this.engine)
                this.engine.close();
        }
        /**
         * Alias for close()
         *
         * @private
         */
        disconnect() {
            return this._close();
        }
        /**
         * Called upon engine close.
         *
         * @private
         */
        onclose(reason) {
            this.cleanup();
            this.backoff.reset();
            this._readyState = "closed";
            this.emitReserved("close", reason);
            if (this._reconnection && !this.skipReconnect) {
                this.reconnect();
            }
        }
        /**
         * Attempt a reconnection.
         *
         * @private
         */
        reconnect() {
            if (this._reconnecting || this.skipReconnect)
                return this;
            const self = this;
            if (this.backoff.attempts >= this._reconnectionAttempts) {
                this.backoff.reset();
                this.emitReserved("reconnect_failed");
                this._reconnecting = false;
            }
            else {
                const delay = this.backoff.duration();
                this._reconnecting = true;
                const timer = this.setTimeoutFn(() => {
                    if (self.skipReconnect)
                        return;
                    this.emitReserved("reconnect_attempt", self.backoff.attempts);
                    // check again for the case socket closed in above events
                    if (self.skipReconnect)
                        return;
                    self.open((err) => {
                        if (err) {
                            self._reconnecting = false;
                            self.reconnect();
                            this.emitReserved("reconnect_error", err);
                        }
                        else {
                            self.onreconnect();
                        }
                    });
                }, delay);
                if (this.opts.autoUnref) {
                    timer.unref();
                }
                this.subs.push(function subDestroy() {
                    clearTimeout(timer);
                });
            }
        }
        /**
         * Called upon successful reconnect.
         *
         * @private
         */
        onreconnect() {
            const attempt = this.backoff.attempts;
            this._reconnecting = false;
            this.backoff.reset();
            this.emitReserved("reconnect", attempt);
        }
    }

    /**
     * Managers cache.
     */
    const cache = {};
    function lookup(uri, opts) {
        if (typeof uri === "object") {
            opts = uri;
            uri = undefined;
        }
        opts = opts || {};
        const parsed = url(uri, opts.path || "/socket.io");
        const source = parsed.source;
        const id = parsed.id;
        const path = parsed.path;
        const sameNamespace = cache[id] && path in cache[id]["nsps"];
        const newConnection = opts.forceNew ||
            opts["force new connection"] ||
            false === opts.multiplex ||
            sameNamespace;
        let io;
        if (newConnection) {
            io = new Manager(source, opts);
        }
        else {
            if (!cache[id]) {
                cache[id] = new Manager(source, opts);
            }
            io = cache[id];
        }
        if (parsed.query && !opts.query) {
            opts.query = parsed.queryKey;
        }
        return io.socket(parsed.path, opts);
    }
    // so that "lookup" can be used both as a function (e.g. `io(...)`) and as a
    // namespace (e.g. `io.connect(...)`), for backward compatibility
    Object.assign(lookup, {
        Manager,
        Socket,
        io: lookup,
        connect: lookup,
    });

    const socket = lookup('/');

    const LAST_PROJECT_ID = 'last-project-id';

    const replaceInStore = (update, item) => update(items => items.map(i => (i.id == item.id ? item : i)));
    const addToStore = (update, item) => update(items => [...items.filter(i => i.id != item.id), item]);
    const removeFromStore = (update, id) => update(items => items.filter(i => i.id != id));

    const itemTypeNames = ['art', 'blocks', 'characters', 'enemies', 'items', 'levels'];

    let $project;
    const project = createActiveProjectStore();
    project.subscribe(p => {
      $project = p;
    });
    const projects = createProjectsStore();

    const art = createProjectItemStore('art');
    const blocks = createProjectItemStore('blocks');
    const characters = createProjectItemStore('characters');
    const enemies = createProjectItemStore('enemies');
    const items = createProjectItemStore('items');
    const levels = createProjectItemStore('levels');
    const particles = createProjectItemStore('particles');

    const stores = { art, blocks, characters, enemies, items, levels };

    function createActiveProjectStore() {
      const { subscribe, set, update } = writable({});

      const customSet = p => {
        set(p);

        // mark it as last selected project in local storage
        if (p == null) return

        localStorage.setItem(LAST_PROJECT_ID, p.id);

        if (p.id == null) return

        // populate item stores with this project's stuff
        art.set(p.art);
        blocks.set(p.blocks);
        characters.set(p.characters);
        enemies.set(p.enemies);
        items.set(p.items);
        levels.set(p.levels);
      };

      const loadFromApi = id => {
        return Api.projects.get(id).then(res => customSet(res))
      };

      // set from server initially, and set active project on first load
      const lastProjectId = localStorage.getItem(LAST_PROJECT_ID);
      if (lastProjectId != null) loadFromApi(lastProjectId);

      // listen for changes on server
      socket.on('projects.update', p => {
        console.log('project update from server', p);
        if ($project.id == p.id) {
          update(v => {
            v.name = p.name;
            v.pixelSize = p.pixelSize;
          });
        }
      });

      socket.on('projects.delete', id => {
        console.log('project delete from server', id);
        update(v => {
          if (v.id == id) {
            customSet({});
          }
        });
      });

      itemTypeNames.forEach(it => {
        socket.on(`${it}.insert`, item => {
          console.log(it, 'insert from server', item);
          if (item.projectId == $project.id) addToStore(stores[it].update, item);
        });
        socket.on(`${it}.update`, item => {
          console.log(it, 'update from server', item);
          if (item.projectId == $project.id) replaceInStore(stores[it].update, item);
        });
        socket.on(`${it}.delete`, ({ id, projectId }) => {
          console.log(it, 'delete from server', id, projectId);
          if (projectId == $project.id) removeFromStore(stores[it].update, id);
        });
      });

      return {
        subscribe,
        loadFromApi,
        set: customSet,
      }
    }

    function createProjectsStore() {
      const { subscribe, set, update } = writable([]);
      const refresh = () => {
        return Api.projects.find().then(projects => {
          set(projects);
          return projects
        })
      };

      socket.on('projects.insert', p => addToStore(update, p));
      socket.on('projects.update', p => replaceInStore(update, p));
      socket.on('projects.update', id => removeFromStore(update, id));

      return {
        subscribe,
        set,
        refresh,

        apiInsert(p) {
          return Api.projects.insert(p).then(res => {
            addToStore(update, res);
            return res
          })
        },

        apiUpdate(p) {
          return Api.projects.update(p).then(res => {
            replaceInStore(update, res);
            return res
          })
        },

        apiDelete(id) {
          return Api.projects.delete(id).then(() => {
            removeFromStore(update, id);
          })
        },
      }
    }

    function createProjectItemStore(itemTypeName) {
      const { set, update, subscribe } = writable([]);
      return {
        subscribe,
        set,
        update,

        // might not be necessary
        // projects.get() returns all the child item collections populated
        loadForProject(projectId) {
          Api[itemTypeName].find(projectId).then(response => {
            set(response);
          });
        },

        apiInsert(item) {
          return Api[itemTypeName].insert(item).then(res => {
            update(c => [...c, res]);
            return res
          })
        },

        apiUpdate(item) {
          return Api[itemTypeName].update(item).then(res => {
            update(c => c.map(o => (o.id == res.id ? item : o)));
            return res
          })
        },

        apiDelete(projectId, id) {
          return Api[itemTypeName].delete(projectId, id).then(() => {
            update(c => c.filter(o => o.id != id));
          })
        },
      }
    }

    /* src\client\components\AnimationPreview.svelte generated by Svelte v3.38.3 */
    const file$s = "src\\client\\components\\AnimationPreview.svelte";

    // (6:0) {#if png != null}
    function create_if_block$e(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (!/*simple*/ ctx[5]) return create_if_block_1$a;
    		return create_else_block$5;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty$1();
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
    		id: create_if_block$e.name,
    		type: "if",
    		source: "(6:0) {#if png != null}",
    		ctx
    	});

    	return block;
    }

    // (17:2) {:else}
    function create_else_block$5(ctx) {
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
    			add_location(div, file$s, 17, 4, 909);
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
    		id: create_else_block$5.name,
    		type: "else",
    		source: "(17:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (7:2) {#if !simple}
    function create_if_block_1$a(ctx) {
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
    			add_location(div0, file$s, 8, 6, 317);
    			attr_dev(div1, "class", "animation-preview-cover svelte-zhpaz2");
    			set_style(div1, "left", "0");
    			set_style(div1, "width", /*width*/ ctx[1] * /*scale*/ ctx[4] - /*frameWidth*/ ctx[3] * /*scale*/ ctx[4] + "px");
    			add_location(div1, file$s, 13, 6, 650);
    			attr_dev(div2, "class", "animation-preview-cover svelte-zhpaz2");
    			set_style(div2, "left", /*width*/ ctx[1] * /*scale*/ ctx[4] + "px");
    			set_style(div2, "width", /*width*/ ctx[1] * /*scale*/ ctx[4] - /*frameWidth*/ ctx[3] * /*scale*/ ctx[4] + "px");
    			add_location(div2, file$s, 14, 6, 761);
    			attr_dev(div3, "class", "animation-preview-container svelte-zhpaz2");
    			add_location(div3, file$s, 7, 4, 268);
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
    		id: create_if_block_1$a.name,
    		type: "if",
    		source: "(7:2) {#if !simple}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$u(ctx) {
    	let if_block_anchor;
    	let if_block = /*png*/ ctx[0] != null && create_if_block$e(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty$1();
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
    					if_block = create_if_block$e(ctx);
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
    		id: create_fragment$u.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$u($$self, $$props, $$invalidate) {
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

    		init(this, options, instance$u, create_fragment$u, safe_not_equal, {
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
    			id: create_fragment$u.name
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

    /* src\client\components\AppLayout.svelte generated by Svelte v3.38.3 */
    const file$r = "src\\client\\components\\AppLayout.svelte";

    // (16:6) {#if $project?.name}
    function create_if_block$d(ctx) {
    	let a0;
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

    	const block = {
    		c: function create() {
    			a0 = element("a");
    			a0.textContent = "Project settings";
    			t1 = space();
    			a1 = element("a");
    			a1.textContent = "Art";
    			t3 = space();
    			a2 = element("a");
    			a2.textContent = "Blocks";
    			t5 = space();
    			a3 = element("a");
    			a3.textContent = "Items";
    			t7 = space();
    			a4 = element("a");
    			a4.textContent = "Characters";
    			t9 = space();
    			a5 = element("a");
    			a5.textContent = "Enemies";
    			t11 = space();
    			a6 = element("a");
    			a6.textContent = "Levels";
    			attr_dev(a0, "href", "/#/project");
    			attr_dev(a0, "class", "svelte-174n1kp");
    			toggle_class(a0, "active", /*active*/ ctx[0] == "project");
    			add_location(a0, file$r, 16, 8, 401);
    			attr_dev(a1, "href", "/#/art");
    			attr_dev(a1, "class", "svelte-174n1kp");
    			toggle_class(a1, "active", /*active*/ ctx[0] == "art");
    			add_location(a1, file$r, 17, 8, 486);
    			attr_dev(a2, "href", "/#/blocks");
    			attr_dev(a2, "class", "svelte-174n1kp");
    			toggle_class(a2, "active", /*active*/ ctx[0] == "blocks");
    			add_location(a2, file$r, 18, 8, 550);
    			attr_dev(a3, "href", "/#/items");
    			attr_dev(a3, "class", "svelte-174n1kp");
    			toggle_class(a3, "active", /*active*/ ctx[0] == "items");
    			add_location(a3, file$r, 19, 8, 623);
    			attr_dev(a4, "href", "/#/characters");
    			attr_dev(a4, "class", "svelte-174n1kp");
    			toggle_class(a4, "active", /*active*/ ctx[0] == "characters");
    			add_location(a4, file$r, 20, 8, 693);
    			attr_dev(a5, "href", "/#/enemies");
    			attr_dev(a5, "class", "svelte-174n1kp");
    			toggle_class(a5, "active", /*active*/ ctx[0] == "enemies");
    			add_location(a5, file$r, 22, 8, 869);
    			attr_dev(a6, "href", "/#/levels");
    			attr_dev(a6, "class", "svelte-174n1kp");
    			toggle_class(a6, "active", /*active*/ ctx[0] == "levels");
    			add_location(a6, file$r, 23, 8, 945);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, a1, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, a2, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, a3, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, a4, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, a5, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, a6, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*active*/ 1) {
    				toggle_class(a0, "active", /*active*/ ctx[0] == "project");
    			}

    			if (dirty & /*active*/ 1) {
    				toggle_class(a1, "active", /*active*/ ctx[0] == "art");
    			}

    			if (dirty & /*active*/ 1) {
    				toggle_class(a2, "active", /*active*/ ctx[0] == "blocks");
    			}

    			if (dirty & /*active*/ 1) {
    				toggle_class(a3, "active", /*active*/ ctx[0] == "items");
    			}

    			if (dirty & /*active*/ 1) {
    				toggle_class(a4, "active", /*active*/ ctx[0] == "characters");
    			}

    			if (dirty & /*active*/ 1) {
    				toggle_class(a5, "active", /*active*/ ctx[0] == "enemies");
    			}

    			if (dirty & /*active*/ 1) {
    				toggle_class(a6, "active", /*active*/ ctx[0] == "levels");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(a1);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(a2);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(a3);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(a4);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(a5);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(a6);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$d.name,
    		type: "if",
    		source: "(16:6) {#if $project?.name}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$t(ctx) {
    	let div5;
    	let div3;
    	let div1;
    	let h1;
    	let t1;
    	let div0;
    	let strong;
    	let t2_value = /*$project*/ ctx[1].name + "";
    	let t2;
    	let t3;
    	let a;
    	let t4_value = ((/*$project*/ ctx[1]?.name) ? "Change" : "Select") + "";
    	let t4;
    	let t5;
    	let t6;
    	let div2;
    	let t7;
    	let div4;
    	let current;
    	let if_block = /*$project*/ ctx[1]?.name && create_if_block$d(ctx);
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div3 = element("div");
    			div1 = element("div");
    			h1 = element("h1");
    			h1.textContent = "CSBuilder";
    			t1 = space();
    			div0 = element("div");
    			strong = element("strong");
    			t2 = text(t2_value);
    			t3 = space();
    			a = element("a");
    			t4 = text(t4_value);
    			t5 = text(" project");
    			t6 = space();
    			div2 = element("div");
    			if (if_block) if_block.c();
    			t7 = space();
    			div4 = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(h1, "class", "svelte-174n1kp");
    			add_location(h1, file$r, 3, 6, 63);
    			add_location(strong, file$r, 5, 8, 114);
    			attr_dev(a, "href", "/#/");
    			attr_dev(a, "title", "Change project");
    			attr_dev(a, "class", "svelte-174n1kp");
    			toggle_class(a, "active", /*active*/ ctx[0] == "projects");
    			add_location(a, file$r, 9, 8, 176);
    			attr_dev(div0, "class", "px1");
    			add_location(div0, file$r, 4, 6, 88);
    			add_location(div1, file$r, 2, 4, 51);
    			attr_dev(div2, "class", "nav svelte-174n1kp");
    			add_location(div2, file$r, 14, 4, 348);
    			attr_dev(div3, "class", "header svelte-174n1kp");
    			add_location(div3, file$r, 1, 2, 26);
    			attr_dev(div4, "class", "main svelte-174n1kp");
    			add_location(div4, file$r, 28, 2, 1045);
    			attr_dev(div5, "class", "container svelte-174n1kp");
    			add_location(div5, file$r, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div3);
    			append_dev(div3, div1);
    			append_dev(div1, h1);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, strong);
    			append_dev(strong, t2);
    			append_dev(div0, t3);
    			append_dev(div0, a);
    			append_dev(a, t4);
    			append_dev(a, t5);
    			append_dev(div3, t6);
    			append_dev(div3, div2);
    			if (if_block) if_block.m(div2, null);
    			append_dev(div5, t7);
    			append_dev(div5, div4);

    			if (default_slot) {
    				default_slot.m(div4, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if ((!current || dirty & /*$project*/ 2) && t2_value !== (t2_value = /*$project*/ ctx[1].name + "")) set_data_dev(t2, t2_value);
    			if ((!current || dirty & /*$project*/ 2) && t4_value !== (t4_value = ((/*$project*/ ctx[1]?.name) ? "Change" : "Select") + "")) set_data_dev(t4, t4_value);

    			if (dirty & /*active*/ 1) {
    				toggle_class(a, "active", /*active*/ ctx[0] == "projects");
    			}

    			if (/*$project*/ ctx[1]?.name) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$d(ctx);
    					if_block.c();
    					if_block.m(div2, null);
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
    			if (detaching) detach_dev(div5);
    			if (if_block) if_block.d();
    			if (default_slot) default_slot.d(detaching);
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
    		init(this, options, instance$t, create_fragment$t, safe_not_equal, { active: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AppLayout",
    			options,
    			id: create_fragment$t.name
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

    /* src\client\components\ArtThumb.svelte generated by Svelte v3.38.3 */
    const file$q = "src\\client\\components\\ArtThumb.svelte";

    // (1:0) {#if _art}
    function create_if_block$c(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1$9, create_else_block$4];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*_art*/ ctx[0].animated) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty$1();
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
    		id: create_if_block$c.name,
    		type: "if",
    		source: "(1:0) {#if _art}",
    		ctx
    	});

    	return block;
    }

    // (6:2) {:else}
    function create_else_block$4(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "art-thumb");
    			set_style(div, "background-image", "url(" + /*_art*/ ctx[0].png + ")");
    			add_location(div, file$q, 6, 4, 136);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*_art*/ 1) {
    				set_style(div, "background-image", "url(" + /*_art*/ ctx[0].png + ")");
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
    		id: create_else_block$4.name,
    		type: "else",
    		source: "(6:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (2:2) {#if _art.animated}
    function create_if_block_1$9(ctx) {
    	let div;
    	let animationpreview;
    	let current;
    	const animationpreview_spread_levels = [/*_art*/ ctx[0], { simple: true }];
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
    			add_location(div, file$q, 2, 4, 39);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(animationpreview, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const animationpreview_changes = (dirty & /*_art*/ 1)
    			? get_spread_update(animationpreview_spread_levels, [get_spread_object(/*_art*/ ctx[0]), animationpreview_spread_levels[1]])
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
    		id: create_if_block_1$9.name,
    		type: "if",
    		source: "(2:2) {#if _art.animated}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$s(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*_art*/ ctx[0] && create_if_block$c(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty$1();
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
    			if (/*_art*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*_art*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$c(ctx);
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
    		id: create_fragment$s.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$s($$self, $$props, $$invalidate) {
    	let _art;
    	let $art;
    	validate_store(art, "art");
    	component_subscribe($$self, art, $$value => $$invalidate(2, $art = $$value));
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

    	$$self.$capture_state = () => ({ art, AnimationPreview, id, _art, $art });

    	$$self.$inject_state = $$props => {
    		if ("id" in $$props) $$invalidate(1, id = $$props.id);
    		if ("_art" in $$props) $$invalidate(0, _art = $$props._art);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$art, id*/ 6) {
    			$$invalidate(0, _art = $art.find(a => a.id == id));
    		}
    	};

    	return [_art, id, $art];
    }

    class ArtThumb extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$s, create_fragment$s, safe_not_equal, { id: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ArtThumb",
    			options,
    			id: create_fragment$s.name
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

    var autoSaveStore = LocalStorageStore('auto-saves', {});

    /* node_modules\svelte-awesome\components\svg\Path.svelte generated by Svelte v3.38.3 */

    const file$p = "node_modules\\svelte-awesome\\components\\svg\\Path.svelte";

    function create_fragment$r(ctx) {
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
    			add_location(path, file$p, 0, 0, 0);
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
    		id: create_fragment$r.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$r($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$r, create_fragment$r, safe_not_equal, { id: 0, data: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Path",
    			options,
    			id: create_fragment$r.name
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

    const file$o = "node_modules\\svelte-awesome\\components\\svg\\Polygon.svelte";

    function create_fragment$q(ctx) {
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
    			add_location(polygon, file$o, 0, 0, 0);
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
    		id: create_fragment$q.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$q($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$q, create_fragment$q, safe_not_equal, { id: 0, data: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Polygon",
    			options,
    			id: create_fragment$q.name
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

    const file$n = "node_modules\\svelte-awesome\\components\\svg\\Raw.svelte";

    function create_fragment$p(ctx) {
    	let g;

    	const block = {
    		c: function create() {
    			g = svg_element("g");
    			add_location(g, file$n, 0, 0, 0);
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
    		id: create_fragment$p.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$p($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$p, create_fragment$p, safe_not_equal, { data: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Raw",
    			options,
    			id: create_fragment$p.name
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

    const file$m = "node_modules\\svelte-awesome\\components\\svg\\Svg.svelte";

    function create_fragment$o(ctx) {
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
    			add_location(svg, file$m, 0, 0, 0);
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
    		id: create_fragment$o.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$o($$self, $$props, $$invalidate) {
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

    		init(this, options, instance$o, create_fragment$o, safe_not_equal, {
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
    			id: create_fragment$o.name
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

    const { Object: Object_1$1, console: console_1$1 } = globals;

    function get_each_context$5(ctx, list, i) {
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
    function create_if_block$b(ctx) {
    	let t0;
    	let t1;
    	let if_block2_anchor;
    	let current;
    	let if_block0 = /*self*/ ctx[0].paths && create_if_block_3$3(ctx);
    	let if_block1 = /*self*/ ctx[0].polygons && create_if_block_2$4(ctx);
    	let if_block2 = /*self*/ ctx[0].raw && create_if_block_1$8(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			if_block2_anchor = empty$1();
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
    					if_block0 = create_if_block_3$3(ctx);
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
    					if_block2 = create_if_block_1$8(ctx);
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
    		id: create_if_block$b.name,
    		type: "if",
    		source: "(4:4) {#if self}",
    		ctx
    	});

    	return block;
    }

    // (5:6) {#if self.paths}
    function create_if_block_3$3(ctx) {
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

    			each_1_anchor = empty$1();
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
    		id: create_if_block_3$3.name,
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
    		each_blocks[i] = create_each_block$5(get_each_context$5(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty$1();
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
    					const child_ctx = get_each_context$5(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$5(child_ctx);
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
    function create_each_block$5(ctx) {
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
    		id: create_each_block$5.name,
    		type: "each",
    		source: "(11:8) {#each self.polygons as polygon, i}",
    		ctx
    	});

    	return block;
    }

    // (15:6) {#if self.raw}
    function create_if_block_1$8(ctx) {
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
    		id: create_if_block_1$8.name,
    		type: "if",
    		source: "(15:6) {#if self.raw}",
    		ctx
    	});

    	return block;
    }

    // (3:8)      
    function fallback_block$4(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*self*/ ctx[0] && create_if_block$b(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty$1();
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
    		id: fallback_block$4.name,
    		type: "fallback",
    		source: "(3:8)      ",
    		ctx
    	});

    	return block;
    }

    // (1:0) <Svg label={label} width={width} height={height} box={box} style={combinedStyle}   spin={spin} flip={flip} inverse={inverse} pulse={pulse} class={className}>
    function create_default_slot$c(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[14].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[16], null);
    	const default_slot_or_fallback = default_slot || fallback_block$4(ctx);

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
    		id: create_default_slot$c.name,
    		type: "slot",
    		source: "(1:0) <Svg label={label} width={width} height={height} box={box} style={combinedStyle}   spin={spin} flip={flip} inverse={inverse} pulse={pulse} class={className}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$n(ctx) {
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
    				$$slots: { default: [create_default_slot$c] },
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
    		id: create_fragment$n.name,
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

    function instance$n($$self, $$props, $$invalidate) {
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

    	Object_1$1.keys($$props).forEach(key => {
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
    			instance$n,
    			create_fragment$n,
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
    			id: create_fragment$n.name
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

    /* src\client\components\QuickDropdown.svelte generated by Svelte v3.38.3 */
    const file$l = "src\\client\\components\\QuickDropdown.svelte";
    const get_label_slot_changes = dirty => ({});
    const get_label_slot_context = ctx => ({});

    // (16:6) {#if label != null}
    function create_if_block_2$3(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			add_location(span, file$l, 16, 8, 445);
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
    function fallback_block$3(ctx) {
    	let if_block_anchor;
    	let if_block = /*label*/ ctx[6] != null && create_if_block_2$3(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty$1();
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
    		id: fallback_block$3.name,
    		type: "fallback",
    		source: "(15:23)         ",
    		ctx
    	});

    	return block;
    }

    // (22:4) {#if !noCaret}
    function create_if_block_1$7(ctx) {
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
    		id: create_if_block_1$7.name,
    		type: "if",
    		source: "(22:4) {#if !noCaret}",
    		ctx
    	});

    	return block;
    }

    // (26:2) {#if isOpen}
    function create_if_block$a(ctx) {
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
    			add_location(div, file$l, 26, 4, 617);
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
    		id: create_if_block$a.name,
    		type: "if",
    		source: "(26:2) {#if isOpen}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$m(ctx) {
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
    	const label_slot_or_fallback = label_slot || fallback_block$3(ctx);
    	let if_block0 = !/*noCaret*/ ctx[4] && create_if_block_1$7(ctx);
    	let if_block1 = /*isOpen*/ ctx[0] && create_if_block$a(ctx);

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
    			add_location(a, file$l, 1, 2, 93);
    			attr_dev(div, "class", div_class_value = "quick-dropdown " + /*className*/ ctx[9] + " svelte-p48vlg");
    			attr_dev(div, "data-test", /*dataTest*/ ctx[1]);
    			add_location(div, file$l, 0, 0, 0);
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
    					if_block0 = create_if_block_1$7(ctx);
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
    					if_block1 = create_if_block$a(ctx);
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
    		id: create_fragment$m.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const tabindex$1 = 0;

    function instance$m($$self, $$props, $$invalidate) {
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

    		init(this, options, instance$m, create_fragment$m, safe_not_equal, {
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
    			id: create_fragment$m.name
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

    /* src\client\components\FieldNumber.svelte generated by Svelte v3.38.3 */

    const file$k = "src\\client\\components\\FieldNumber.svelte";

    function create_fragment$l(ctx) {
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
    			add_location(label, file$k, 1, 1, 27);
    			attr_dev(input, "name", /*name*/ ctx[1]);
    			attr_dev(input, "id", /*name*/ ctx[1]);
    			attr_dev(input, "type", "number");
    			attr_dev(input, "min", /*min*/ ctx[2]);
    			attr_dev(input, "max", /*max*/ ctx[3]);
    			attr_dev(input, "step", /*step*/ ctx[4]);
    			attr_dev(input, "class", "form-control");
    			add_location(input, file$k, 4, 1, 71);
    			attr_dev(div, "class", "form-group");
    			add_location(div, file$k, 0, 0, 0);
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
    		id: create_fragment$l.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$l($$self, $$props, $$invalidate) {
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

    		init(this, options, instance$l, create_fragment$l, safe_not_equal, {
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
    			id: create_fragment$l.name
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

    /* src\client\components\ColorPicker.svelte generated by Svelte v3.38.3 */
    const file$j = "src\\client\\components\\ColorPicker.svelte";

    function get_each_context$4(ctx, list, i) {
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
    			add_location(div, file$j, 8, 10, 378);
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
    			add_location(div, file$j, 6, 6, 304);
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
    function create_if_block$9(ctx) {
    	let div1;
    	let label;
    	let t1;
    	let div0;
    	let each_value = /*$recentColors*/ ctx[4];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
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
    			add_location(label, file$j, 21, 8, 768);
    			attr_dev(div0, "class", "color-group wrap svelte-1k8fjru");
    			add_location(div0, file$j, 22, 8, 824);
    			attr_dev(div1, "class", "form-group");
    			add_location(div1, file$j, 20, 6, 734);
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
    					const child_ctx = get_each_context$4(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$4(child_ctx);
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
    		id: create_if_block$9.name,
    		type: "if",
    		source: "(20:4) {#if $recentColors.length}",
    		ctx
    	});

    	return block;
    }

    // (24:10) {#each $recentColors as color}
    function create_each_block$4(ctx) {
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
    			add_location(div, file$j, 24, 12, 910);
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
    		id: create_each_block$4.name,
    		type: "each",
    		source: "(24:10) {#each $recentColors as color}",
    		ctx
    	});

    	return block;
    }

    // (1:0) <QuickDropdown btnClass="color-picker-toggle" {dropdownClass} noCaret bind:isOpen>
    function create_default_slot$b(ctx) {
    	let div;
    	let t;
    	let each_value_1 = /*colors*/ ctx[3];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$2(get_each_context_1$2(ctx, each_value_1, i));
    	}

    	let if_block = /*$recentColors*/ ctx[4].length && create_if_block$9(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			if (if_block) if_block.c();
    			attr_dev(div, "class", "color-picker-choices svelte-1k8fjru");
    			add_location(div, file$j, 4, 2, 228);
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
    					if_block = create_if_block$9(ctx);
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
    		id: create_default_slot$b.name,
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
    			add_location(div, file$j, 2, 4, 111);
    			attr_dev(span, "slot", "label");
    			add_location(span, file$j, 1, 2, 86);
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

    function create_fragment$k(ctx) {
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
    			default: [create_default_slot$b]
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
    		id: create_fragment$k.name,
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

    function instance$k($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$k, create_fragment$k, safe_not_equal, { value: 0, dropdownClass: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ColorPicker",
    			options,
    			id: create_fragment$k.name
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

    /* src\client\components\FieldCheckbox.svelte generated by Svelte v3.38.3 */

    const file$i = "src\\client\\components\\FieldCheckbox.svelte";

    function create_fragment$j(ctx) {
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
    			add_location(input, file$i, 2, 4, 58);
    			attr_dev(label, "class", "form-check-label");
    			attr_dev(label, "for", /*name*/ ctx[1]);
    			add_location(label, file$i, 3, 4, 154);
    			attr_dev(div0, "class", "form-check");
    			add_location(div0, file$i, 1, 2, 28);
    			attr_dev(div1, "class", "form-group");
    			add_location(div1, file$i, 0, 0, 0);
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
    				dispose = [
    					listen_dev(input, "change", /*input_change_handler*/ ctx[5]),
    					listen_dev(input, "change", /*change_handler*/ ctx[4], false, false, false)
    				];

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
    			run_all(dispose);
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
    	validate_slots("FieldCheckbox", slots, ['default']);
    	let { checked = null } = $$props;
    	let { name = "check" } = $$props;
    	const writable_props = ["checked", "name"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FieldCheckbox> was created with unknown prop '${key}'`);
    	});

    	function change_handler(event) {
    		bubble.call(this, $$self, event);
    	}

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

    	return [checked, name, $$scope, slots, change_handler, input_change_handler];
    }

    class FieldCheckbox extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$j, create_fragment$j, safe_not_equal, { checked: 0, name: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FieldCheckbox",
    			options,
    			id: create_fragment$j.name
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

    /* src\client\components\FieldText.svelte generated by Svelte v3.38.3 */
    const file$h = "src\\client\\components\\FieldText.svelte";

    function create_fragment$i(ctx) {
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
    			add_location(label, file$h, 1, 1, 27);
    			attr_dev(input, "name", /*name*/ ctx[1]);
    			attr_dev(input, "id", /*name*/ ctx[1]);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "form-control");
    			attr_dev(input, "placeholder", /*placeholder*/ ctx[2]);
    			add_location(input, file$h, 4, 1, 71);
    			attr_dev(div, "class", "form-group");
    			add_location(div, file$h, 0, 0, 0);
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
    		id: create_fragment$i.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$i($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$i, create_fragment$i, safe_not_equal, { value: 0, name: 1, placeholder: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FieldText",
    			options,
    			id: create_fragment$i.name
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

    /* src\client\components\SaveBtn.svelte generated by Svelte v3.38.3 */

    const file$g = "src\\client\\components\\SaveBtn.svelte";

    // (2:7) Save
    function fallback_block$2(ctx) {
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
    		id: fallback_block$2.name,
    		type: "fallback",
    		source: "(2:7) Save",
    		ctx
    	});

    	return block;
    }

    function create_fragment$h(ctx) {
    	let button;
    	let button_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);
    	const default_slot_or_fallback = default_slot || fallback_block$2(ctx);

    	const block = {
    		c: function create() {
    			button = element("button");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", button_class_value = "btn btn-" + (/*disabled*/ ctx[0] ? "disabled" : "success"));
    			toggle_class(button, "disabled", /*disabled*/ ctx[0]);
    			add_location(button, file$g, 0, 0, 0);
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
    		id: create_fragment$h.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$h($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$h, create_fragment$h, safe_not_equal, { disabled: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SaveBtn",
    			options,
    			id: create_fragment$h.name
    		});
    	}

    	get disabled() {
    		throw new Error("<SaveBtn>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<SaveBtn>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\client\components\Form.svelte generated by Svelte v3.38.3 */
    const file$f = "src\\client\\components\\Form.svelte";
    const get_buttons_slot_changes = dirty => ({});
    const get_buttons_slot_context = ctx => ({});

    function create_fragment$g(ctx) {
    	let form;
    	let div2;
    	let div0;
    	let t0;
    	let div1;
    	let savebtn;
    	let t1;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	savebtn = new SaveBtn({
    			props: { disabled: !/*hasChanges*/ ctx[0] },
    			$$inline: true
    		});

    	const buttons_slot_template = /*#slots*/ ctx[3].buttons;
    	const buttons_slot = create_slot(buttons_slot_template, ctx, /*$$scope*/ ctx[2], get_buttons_slot_context);

    	const block = {
    		c: function create() {
    			form = element("form");
    			div2 = element("div");
    			div0 = element("div");
    			if (default_slot) default_slot.c();
    			t0 = space();
    			div1 = element("div");
    			create_component(savebtn.$$.fragment);
    			t1 = space();
    			if (buttons_slot) buttons_slot.c();
    			attr_dev(div0, "class", "form-content svelte-makcpi");
    			add_location(div0, file$f, 2, 4, 59);
    			attr_dev(div1, "class", "form-buttons svelte-makcpi");
    			add_location(div1, file$f, 6, 4, 121);
    			attr_dev(div2, "class", "form");
    			add_location(div2, file$f, 1, 2, 35);
    			add_location(form, file$f, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);
    			append_dev(form, div2);
    			append_dev(div2, div0);

    			if (default_slot) {
    				default_slot.m(div0, null);
    			}

    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			mount_component(savebtn, div1, null);
    			append_dev(div1, t1);

    			if (buttons_slot) {
    				buttons_slot.m(div1, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(form, "submit", prevent_default(/*submit_handler*/ ctx[4]), false, true, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], !current ? -1 : dirty, null, null);
    				}
    			}

    			const savebtn_changes = {};
    			if (dirty & /*hasChanges*/ 1) savebtn_changes.disabled = !/*hasChanges*/ ctx[0];
    			savebtn.$set(savebtn_changes);

    			if (buttons_slot) {
    				if (buttons_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot(buttons_slot, buttons_slot_template, ctx, /*$$scope*/ ctx[2], !current ? -1 : dirty, get_buttons_slot_changes, get_buttons_slot_context);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			transition_in(savebtn.$$.fragment, local);
    			transition_in(buttons_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			transition_out(savebtn.$$.fragment, local);
    			transition_out(buttons_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			if (default_slot) default_slot.d(detaching);
    			destroy_component(savebtn);
    			if (buttons_slot) buttons_slot.d(detaching);
    			mounted = false;
    			dispose();
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

    function instance$g($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Form", slots, ['default','buttons']);
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
    		init(this, options, instance$g, create_fragment$g, safe_not_equal, { hasChanges: 0, class: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Form",
    			options,
    			id: create_fragment$g.name
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

    /* src\client\components\InputSelect.svelte generated by Svelte v3.38.3 */
    const file$e = "src\\client\\components\\InputSelect.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[42] = list[i];
    	child_ctx[44] = i;
    	return child_ctx;
    }

    const get_default_slot_changes_1 = dirty => ({
    	option: dirty[0] & /*filteredOptions*/ 16384
    });

    const get_default_slot_context_1 = ctx => ({ option: /*option*/ ctx[42] });

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[42] = list[i];
    	child_ctx[44] = i;
    	return child_ctx;
    }

    const get_default_slot_changes$1 = dirty => ({
    	option: dirty[0] & /*selectedOptions*/ 262144
    });

    const get_default_slot_context$1 = ctx => ({ option: /*option*/ ctx[42] });

    // (14:6) {#if selectedOptions.length === 0 || (!multiple && selectedOptions[0].value)}
    function create_if_block_6$1(ctx) {
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
    		id: create_if_block_6$1.name,
    		type: "if",
    		source: "(14:6) {#if selectedOptions.length === 0 || (!multiple && selectedOptions[0].value)}",
    		ctx
    	});

    	return block;
    }

    // (16:8) {#if multiple}
    function create_if_block_4$2(ctx) {
    	let if_block_anchor;
    	let if_block = /*index*/ ctx[44] > 0 && create_if_block_5$2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty$1();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*index*/ ctx[44] > 0) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_5$2(ctx);
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
    		id: create_if_block_4$2.name,
    		type: "if",
    		source: "(16:8) {#if multiple}",
    		ctx
    	});

    	return block;
    }

    // (17:10) {#if index > 0}
    function create_if_block_5$2(ctx) {
    	let t0;

    	let t1_value = (/*inline*/ ctx[9] && /*index*/ ctx[44] == /*selectedOptions*/ ctx[18].length - 1
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
    			if (dirty[0] & /*inline, selectedOptions*/ 262656 && t1_value !== (t1_value = (/*inline*/ ctx[9] && /*index*/ ctx[44] == /*selectedOptions*/ ctx[18].length - 1
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
    		id: create_if_block_5$2.name,
    		type: "if",
    		source: "(17:10) {#if index > 0}",
    		ctx
    	});

    	return block;
    }

    // (20:25)               
    function fallback_block_1(ctx) {
    	let html_tag;
    	let raw_value = /*option*/ ctx[42].label + "";
    	let html_anchor;

    	const block = {
    		c: function create() {
    			html_tag = new HtmlTag();
    			html_anchor = empty$1();
    			html_tag.a = html_anchor;
    		},
    		m: function mount(target, anchor) {
    			html_tag.m(raw_value, target, anchor);
    			insert_dev(target, html_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*selectedOptions*/ 262144 && raw_value !== (raw_value = /*option*/ ctx[42].label + "")) html_tag.p(raw_value);
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
    	let if_block = /*multiple*/ ctx[3] && create_if_block_4$2(ctx);
    	const default_slot_template = /*#slots*/ ctx[27].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[26], get_default_slot_context$1);
    	const default_slot_or_fallback = default_slot || fallback_block_1(ctx);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty$1();
    			if (if_block) if_block.c();
    			t = space();
    			span = element("span");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			attr_dev(span, "class", "select-input-text svelte-15j36pp");
    			add_location(span, file$e, 18, 8, 683);
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
    					if_block = create_if_block_4$2(ctx);
    					if_block.c();
    					if_block.m(t.parentNode, t);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty[0] & /*$$scope, selectedOptions*/ 67371008)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[26], !current ? [-1, -1] : dirty, get_default_slot_changes$1, get_default_slot_context$1);
    				}
    			} else {
    				if (default_slot_or_fallback && default_slot_or_fallback.p && (!current || dirty[0] & /*selectedOptions*/ 262144)) {
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
    function create_if_block_3$2(ctx) {
    	let span;

    	let t_value = (/*placeholder*/ ctx[5] != null
    	? /*placeholder*/ ctx[5]
    	: "") + "";

    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			attr_dev(span, "class", "select-input-text svelte-15j36pp");
    			add_location(span, file$e, 25, 8, 906);
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
    		id: create_if_block_3$2.name,
    		type: "if",
    		source: "(25:6) {#if selectedOptions == null || selectedOptions.length === 0}",
    		ctx
    	});

    	return block;
    }

    // (34:2) {#if isOpen && !disabled}
    function create_if_block$8(ctx) {
    	let div;
    	let t;
    	let current;
    	let if_block = /*filterable*/ ctx[6] && create_if_block_2$2(ctx);
    	let each_value = /*filteredOptions*/ ctx[14];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	let each_1_else = null;

    	if (!each_value.length) {
    		each_1_else = create_else_block$3(ctx);
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

    			attr_dev(div, "class", "select-dropdown svelte-15j36pp");
    			toggle_class(div, "right", /*right*/ ctx[11]);
    			add_location(div, file$e, 34, 4, 1152);
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

    			if (dirty[0] & /*filteredOptions, viewIndex, toggle, $$scope, filter*/ 67657729) {
    				each_value = /*filteredOptions*/ ctx[14];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
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
    					each_1_else = create_else_block$3(ctx);
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
    		id: create_if_block$8.name,
    		type: "if",
    		source: "(34:2) {#if isOpen && !disabled}",
    		ctx
    	});

    	return block;
    }

    // (36:6) {#if filterable}
    function create_if_block_2$2(ctx) {
    	let div;
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
    			div = element("div");
    			input = element("input");
    			t = space();
    			a = element("a");
    			span = element("span");
    			create_component(icon.$$.fragment);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "form-control");
    			attr_dev(input, "placeholder", /*filterPlaceholder*/ ctx[12]);
    			add_location(input, file$e, 37, 10, 1259);
    			attr_dev(span, "class", "input-group-text");
    			add_location(span, file$e, 46, 12, 1589);
    			attr_dev(a, "href", "/");
    			attr_dev(a, "tabindex", "-1");
    			add_location(a, file$e, 45, 10, 1503);
    			attr_dev(div, "class", "filter svelte-15j36pp");
    			add_location(div, file$e, 36, 8, 1227);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input);
    			set_input_value(input, /*filter*/ ctx[0]);
    			/*input_binding*/ ctx[30](input);
    			append_dev(div, t);
    			append_dev(div, a);
    			append_dev(a, span);
    			mount_component(icon, span, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[29]),
    					listen_dev(input, "keydown", /*keyListener*/ ctx[21], false, false, false),
    					listen_dev(a, "click", prevent_default(/*click_handler*/ ctx[31]), false, true, false)
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
    			if (detaching) detach_dev(div);
    			/*input_binding*/ ctx[30](null);
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

    // (65:6) {:else}
    function create_else_block$3(ctx) {
    	let if_block_anchor;
    	let if_block = /*filter*/ ctx[0] != null && /*filter*/ ctx[0].length > 0 && create_if_block_1$6(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty$1();
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
    					if_block = create_if_block_1$6(ctx);
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
    		id: create_else_block$3.name,
    		type: "else",
    		source: "(65:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (66:8) {#if filter != null && filter.length > 0}
    function create_if_block_1$6(ctx) {
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
    			attr_dev(div, "class", "no-results svelte-15j36pp");
    			add_location(div, file$e, 66, 10, 2221);
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
    		id: create_if_block_1$6.name,
    		type: "if",
    		source: "(66:8) {#if filter != null && filter.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (61:25)               
    function fallback_block$1(ctx) {
    	let html_tag;
    	let raw_value = /*option*/ ctx[42].label + "";
    	let html_anchor;

    	const block = {
    		c: function create() {
    			html_tag = new HtmlTag();
    			html_anchor = empty$1();
    			html_tag.a = html_anchor;
    		},
    		m: function mount(target, anchor) {
    			html_tag.m(raw_value, target, anchor);
    			insert_dev(target, html_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*filteredOptions*/ 16384 && raw_value !== (raw_value = /*option*/ ctx[42].label + "")) html_tag.p(raw_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block$1.name,
    		type: "fallback",
    		source: "(61:25)               ",
    		ctx
    	});

    	return block;
    }

    // (53:6) {#each filteredOptions as option, index}
    function create_each_block$3(ctx) {
    	let div;
    	let t;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[27].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[26], get_default_slot_context_1);
    	const default_slot_or_fallback = default_slot || fallback_block$1(ctx);

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[32](/*option*/ ctx[42], /*index*/ ctx[44]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			t = space();
    			attr_dev(div, "class", "item svelte-15j36pp");
    			toggle_class(div, "selected", /*option*/ ctx[42].selected);
    			toggle_class(div, "viewing", /*viewIndex*/ ctx[13] == /*index*/ ctx[44]);
    			toggle_class(div, "disabled", /*option*/ ctx[42].disabled);
    			add_location(div, file$e, 53, 8, 1797);
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
    				if (default_slot.p && (!current || dirty[0] & /*$$scope, filteredOptions*/ 67125248)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[26], !current ? [-1, -1] : dirty, get_default_slot_changes_1, get_default_slot_context_1);
    				}
    			} else {
    				if (default_slot_or_fallback && default_slot_or_fallback.p && (!current || dirty[0] & /*filteredOptions*/ 16384)) {
    					default_slot_or_fallback.p(ctx, !current ? [-1, -1] : dirty);
    				}
    			}

    			if (dirty[0] & /*filteredOptions*/ 16384) {
    				toggle_class(div, "selected", /*option*/ ctx[42].selected);
    			}

    			if (dirty[0] & /*viewIndex*/ 8192) {
    				toggle_class(div, "viewing", /*viewIndex*/ ctx[13] == /*index*/ ctx[44]);
    			}

    			if (dirty[0] & /*filteredOptions*/ 16384) {
    				toggle_class(div, "disabled", /*option*/ ctx[42].disabled);
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
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(53:6) {#each filteredOptions as option, index}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$f(ctx) {
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
    	let if_block0 = (/*selectedOptions*/ ctx[18].length === 0 || !/*multiple*/ ctx[3] && /*selectedOptions*/ ctx[18][0].value) && create_if_block_6$1(ctx);
    	let each_value_1 = /*selectedOptions*/ ctx[18];
    	validate_each_argument(each_value_1);
    	const get_key = ctx => /*option*/ ctx[42];
    	validate_each_keys(ctx, each_value_1, get_each_context_1$1, get_key);

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1$1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_1$1(key, child_ctx));
    	}

    	let if_block1 = (/*selectedOptions*/ ctx[18] == null || /*selectedOptions*/ ctx[18].length === 0) && create_if_block_3$2(ctx);

    	icon = new Icon({
    			props: { data: caretDownIcon, class: "fw" },
    			$$inline: true
    		});

    	let if_block2 = /*isOpen*/ ctx[1] && !/*disabled*/ ctx[7] && create_if_block$8(ctx);

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
    			attr_dev(div0, "class", "input-select-content svelte-15j36pp");
    			add_location(div0, file$e, 12, 4, 346);
    			attr_dev(span, "class", "dropdown-icon svelte-15j36pp");
    			add_location(span, file$e, 28, 4, 1016);
    			attr_dev(div1, "class", div1_class_value = "btn btn-light " + /*className*/ ctx[8] + " svelte-15j36pp");
    			attr_dev(div1, "data-test", div1_data_test_value = "" + (/*name*/ ctx[2] + "-btn"));
    			attr_dev(div1, "tabindex", tabindex);
    			toggle_class(div1, "btn-sm", /*sm*/ ctx[10]);
    			toggle_class(div1, "open", /*isOpen*/ ctx[1]);
    			add_location(div1, file$e, 1, 2, 101);
    			attr_dev(div2, "class", "select svelte-15j36pp");
    			attr_dev(div2, "data-test", /*name*/ ctx[2]);
    			attr_dev(div2, "id", /*name*/ ctx[2]);
    			toggle_class(div2, "inline", /*inline*/ ctx[9]);
    			toggle_class(div2, "disabled", /*disabled*/ ctx[7]);
    			add_location(div2, file$e, 0, 0, 0);
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
    			/*div1_binding*/ ctx[28](div1);
    			append_dev(div2, t3);
    			if (if_block2) if_block2.m(div2, null);
    			/*div2_binding*/ ctx[33](div2);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div1, "click", /*open*/ ctx[20], false, false, false),
    					listen_dev(div1, "focus", /*open*/ ctx[20], false, false, false),
    					listen_dev(div1, "keydown", /*keyListener*/ ctx[21], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*selectedOptions*/ ctx[18].length === 0 || !/*multiple*/ ctx[3] && /*selectedOptions*/ ctx[18][0].value) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_6$1(ctx);
    					if_block0.c();
    					if_block0.m(div0, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty[0] & /*selectedOptions, $$scope, inline, multiple*/ 67371528) {
    				each_value_1 = /*selectedOptions*/ ctx[18];
    				validate_each_argument(each_value_1);
    				group_outros();
    				validate_each_keys(ctx, each_value_1, get_each_context_1$1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_1, each_1_lookup, div0, outro_and_destroy_block, create_each_block_1$1, t1, get_each_context_1$1);
    				check_outros();
    			}

    			if (/*selectedOptions*/ ctx[18] == null || /*selectedOptions*/ ctx[18].length === 0) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_3$2(ctx);
    					if_block1.c();
    					if_block1.m(div0, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (!current || dirty[0] & /*className*/ 256 && div1_class_value !== (div1_class_value = "btn btn-light " + /*className*/ ctx[8] + " svelte-15j36pp")) {
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
    					if_block2 = create_if_block$8(ctx);
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
    			/*div1_binding*/ ctx[28](null);
    			if (if_block2) if_block2.d();
    			/*div2_binding*/ ctx[33](null);
    			mounted = false;
    			run_all(dispose);
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

    const tabindex = 0;

    function instance$f($$self, $$props, $$invalidate) {
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
    	let filterField = null;
    	let { filter = "" } = $$props;
    	let { filterPlaceholder = "Filter" } = $$props;

    	// option we're currently viewing w/ keyboard navigation
    	let viewIndex = -1;

    	function makeValueArray() {
    		if (!Array.isArray(value)) $$invalidate(22, value = [value]); else $$invalidate(22, value = optionsToArray(options, value).filter(o => o.selected).map(option => option.value));
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
    			$$invalidate(22, value = option.selected
    			? (value || []).filter(v => v != option.value)
    			: (value || []).concat(option.value));

    			// if user clicked an option in multi-select, refocus the fakeField
    			if (document.activeElement != fakeField) focusField();
    		} else {
    			$$invalidate(22, value = option.value);
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
    		if (fakeField && !filterable) fakeField.focus(); else if (filterField) filterField.focus();
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

    	function input_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			filterField = $$value;
    			$$invalidate(17, filterField);
    		});
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
    		if ("options" in $$props) $$invalidate(23, options = $$props.options);
    		if ("valueProp" in $$props) $$invalidate(24, valueProp = $$props.valueProp);
    		if ("labelProp" in $$props) $$invalidate(25, labelProp = $$props.labelProp);
    		if ("value" in $$props) $$invalidate(22, value = $$props.value);
    		if ("filterable" in $$props) $$invalidate(6, filterable = $$props.filterable);
    		if ("isOpen" in $$props) $$invalidate(1, isOpen = $$props.isOpen);
    		if ("disabled" in $$props) $$invalidate(7, disabled = $$props.disabled);
    		if ("class" in $$props) $$invalidate(8, className = $$props.class);
    		if ("inline" in $$props) $$invalidate(9, inline = $$props.inline);
    		if ("sm" in $$props) $$invalidate(10, sm = $$props.sm);
    		if ("right" in $$props) $$invalidate(11, right = $$props.right);
    		if ("filter" in $$props) $$invalidate(0, filter = $$props.filter);
    		if ("filterPlaceholder" in $$props) $$invalidate(12, filterPlaceholder = $$props.filterPlaceholder);
    		if ("$$scope" in $$props) $$invalidate(26, $$scope = $$props.$$scope);
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
    		filterField,
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
    		if ("options" in $$props) $$invalidate(23, options = $$props.options);
    		if ("valueProp" in $$props) $$invalidate(24, valueProp = $$props.valueProp);
    		if ("labelProp" in $$props) $$invalidate(25, labelProp = $$props.labelProp);
    		if ("value" in $$props) $$invalidate(22, value = $$props.value);
    		if ("filterable" in $$props) $$invalidate(6, filterable = $$props.filterable);
    		if ("isOpen" in $$props) $$invalidate(1, isOpen = $$props.isOpen);
    		if ("disabled" in $$props) $$invalidate(7, disabled = $$props.disabled);
    		if ("className" in $$props) $$invalidate(8, className = $$props.className);
    		if ("inline" in $$props) $$invalidate(9, inline = $$props.inline);
    		if ("sm" in $$props) $$invalidate(10, sm = $$props.sm);
    		if ("right" in $$props) $$invalidate(11, right = $$props.right);
    		if ("container" in $$props) $$invalidate(15, container = $$props.container);
    		if ("fakeField" in $$props) $$invalidate(16, fakeField = $$props.fakeField);
    		if ("filterField" in $$props) $$invalidate(17, filterField = $$props.filterField);
    		if ("filter" in $$props) $$invalidate(0, filter = $$props.filter);
    		if ("filterPlaceholder" in $$props) $$invalidate(12, filterPlaceholder = $$props.filterPlaceholder);
    		if ("viewIndex" in $$props) $$invalidate(13, viewIndex = $$props.viewIndex);
    		if ("filteredOptions" in $$props) $$invalidate(14, filteredOptions = $$props.filteredOptions);
    		if ("selectedOptions" in $$props) $$invalidate(18, selectedOptions = $$props.selectedOptions);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*value*/ 4194304) {
    			if (markDirty != null && value != null && !validator.equals(value, initialValue)) markDirty();
    		}

    		if ($$self.$$.dirty[0] & /*options, value, filterable, filter*/ 12582977) {
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

    		if ($$self.$$.dirty[0] & /*multiple, value*/ 4194312) {
    			// if multiple...
    			// make sure value is always array
    			// make sure value is always sorted to match option order - just nice to pass the same order around regardless of user click order
    			if (multiple && value) makeValueArray();
    		}

    		if ($$self.$$.dirty[0] & /*options, value, multiple*/ 12582920) {
    			// options to render in the selected box (so we can use the same slot logic)
    			$$invalidate(18, selectedOptions = optionsToArray(options, value).filter(option => multiple
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
    		filterField,
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
    		input_binding,
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
    			instance$f,
    			create_fragment$f,
    			safe_not_equal,
    			{
    				name: 2,
    				multiple: 3,
    				prefixLabel: 4,
    				placeholder: 5,
    				options: 23,
    				valueProp: 24,
    				labelProp: 25,
    				value: 22,
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
    			id: create_fragment$f.name
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

    /* src\client\components\ItemListNav.svelte generated by Svelte v3.38.3 */

    const file$d = "src\\client\\components\\ItemListNav.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    const get_default_slot_changes = dirty => ({ item: dirty & /*collection*/ 1 });
    const get_default_slot_context = ctx => ({ item: /*item*/ ctx[6] });

    // (7:19) {item.name}
    function fallback_block(ctx) {
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
    		id: fallback_block.name,
    		type: "fallback",
    		source: "(7:19) {item.name}",
    		ctx
    	});

    	return block;
    }

    // (5:2) {#each collection as item (item.id)}
    function create_each_block$2(key_1, ctx) {
    	let a;
    	let t;
    	let a_href_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], get_default_slot_context);
    	const default_slot_or_fallback = default_slot || fallback_block(ctx);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			a = element("a");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			t = space();
    			attr_dev(a, "href", a_href_value = "#/" + /*slug*/ ctx[1] + "/" + /*item*/ ctx[6].id);
    			attr_dev(a, "class", "svelte-14k5oh");
    			toggle_class(a, "active", /*item*/ ctx[6].id == /*active*/ ctx[3]);
    			add_location(a, file$d, 5, 4, 157);
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

    			if (dirty & /*collection, active*/ 9) {
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
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(5:2) {#each collection as item (item.id)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$e(ctx) {
    	let div;
    	let a;
    	let t0;
    	let t1;
    	let a_href_value;
    	let t2;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let current;
    	let each_value = /*collection*/ ctx[0];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*item*/ ctx[6].id;
    	validate_each_keys(ctx, each_value, get_each_context$2, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$2(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$2(key, child_ctx));
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
    			attr_dev(a, "class", "svelte-14k5oh");
    			toggle_class(a, "active", /*active*/ ctx[3] == "new");
    			add_location(a, file$d, 1, 2, 31);
    			attr_dev(div, "class", "item-list-nav svelte-14k5oh");
    			add_location(div, file$d, 0, 0, 0);
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

    			if (dirty & /*slug, collection, active, $$scope*/ 27) {
    				each_value = /*collection*/ ctx[0];
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context$2, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div, outro_and_destroy_block, create_each_block$2, null, get_each_context$2);
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
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ItemListNav", slots, ['default']);
    	let { collection } = $$props;
    	let { slug } = $$props;
    	let { type } = $$props;
    	let { active } = $$props;
    	const writable_props = ["collection", "slug", "type", "active"];

    	Object.keys($$props).forEach(key => {
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

    		init(this, options, instance$e, create_fragment$e, safe_not_equal, {
    			collection: 0,
    			slug: 1,
    			type: 2,
    			active: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ItemListNav",
    			options,
    			id: create_fragment$e.name
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

    /* src\client\pages\ArtBuilder.svelte generated by Svelte v3.38.3 */
    const file$c = "src\\client\\pages\\ArtBuilder.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[88] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[91] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[94] = list[i];
    	child_ctx[96] = i;
    	return child_ctx;
    }

    // (5:4) <ItemListNav slug="art" type="art" collection={$art} active={paramId} let:item>
    function create_default_slot_10(ctx) {
    	let artthumb;
    	let t0;
    	let t1_value = /*item*/ ctx[98].name + "";
    	let t1;
    	let current;

    	artthumb = new ArtThumb({
    			props: { id: /*item*/ ctx[98].id },
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
    			if (dirty[3] & /*item*/ 32) artthumb_changes.id = /*item*/ ctx[98].id;
    			artthumb.$set(artthumb_changes);
    			if ((!current || dirty[3] & /*item*/ 32) && t1_value !== (t1_value = /*item*/ ctx[98].name + "")) set_data_dev(t1, t1_value);
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
    		id: create_default_slot_10.name,
    		type: "slot",
    		source: "(5:4) <ItemListNav slug=\\\"art\\\" type=\\\"art\\\" collection={$art} active={paramId} let:item>",
    		ctx
    	});

    	return block;
    }

    // (10:2) {#if input}
    function create_if_block$7(ctx) {
    	let div13;
    	let div12;
    	let div7;
    	let div6;
    	let button0;
    	let t1;
    	let colorpicker;
    	let updating_value;
    	let t2;
    	let div0;
    	let button1;
    	let icon0;
    	let button1_class_value;
    	let t3;
    	let button2;
    	let icon1;
    	let button2_class_value;
    	let t4;
    	let button3;
    	let icon2;
    	let button3_class_value;
    	let t5;
    	let div1;
    	let button4;
    	let icon3;
    	let t6;

    	let t7_value = (/*undos*/ ctx[6].length > 0
    	? /*undos*/ ctx[6].length
    	: "") + "";

    	let t7;
    	let button4_disabled_value;
    	let t8;
    	let button5;
    	let icon4;
    	let t9;

    	let t10_value = (/*redos*/ ctx[7].length > 0
    	? /*redos*/ ctx[7].length
    	: "") + "";

    	let t10;
    	let button5_disabled_value;
    	let t11;
    	let div2;
    	let button6;
    	let icon5;
    	let t12;
    	let button7;
    	let icon6;
    	let t13;
    	let div3;
    	let button8;
    	let icon7;
    	let t14;
    	let button9;
    	let icon8;
    	let t15;
    	let button10;
    	let icon9;
    	let t16;
    	let button11;
    	let icon10;
    	let t17;
    	let quickdropdown;
    	let t18;
    	let div4;
    	let button12;
    	let icon11;
    	let t19;
    	let t20;
    	let button13;
    	let icon12;
    	let t21;
    	let t22;
    	let inputselect0;
    	let updating_value_1;
    	let t23;
    	let div5;
    	let label;
    	let input_1;
    	let t24;
    	let t25;
    	let inputselect1;
    	let updating_value_2;
    	let t26;
    	let div8;
    	let canvas0;
    	let t27;
    	let canvas1;
    	let t28;
    	let div11;
    	let form;
    	let t29;
    	let div10;
    	let fieldcheckbox;
    	let updating_checked;
    	let t30;
    	let div9;
    	let t31;
    	let current_block_type_index;
    	let if_block1;
    	let current;
    	let mounted;
    	let dispose;

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
    				create_default_slot_8$2,
    				({ option }) => ({ 97: option }),
    				({ option }) => [0, 0, 0, option ? 16 : 0]
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
    				create_default_slot_7$3,
    				({ option }) => ({ 97: option }),
    				({ option }) => [0, 0, 0, option ? 16 : 0]
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
    					buttons: [create_buttons_slot$5],
    					default: [create_default_slot_5$5]
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
    		$$slots: { default: [create_default_slot_4$5] },
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
    	let if_block0 = /*input*/ ctx[0].animated && create_if_block_4$1(ctx);
    	const if_block_creators = [create_if_block_1$5, create_if_block_3$1];
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
    			div13 = element("div");
    			div12 = element("div");
    			div7 = element("div");
    			div6 = element("div");
    			button0 = element("button");
    			button0.textContent = "Start over";
    			t1 = space();
    			create_component(colorpicker.$$.fragment);
    			t2 = space();
    			div0 = element("div");
    			button1 = element("button");
    			create_component(icon0.$$.fragment);
    			t3 = space();
    			button2 = element("button");
    			create_component(icon1.$$.fragment);
    			t4 = space();
    			button3 = element("button");
    			create_component(icon2.$$.fragment);
    			t5 = space();
    			div1 = element("div");
    			button4 = element("button");
    			create_component(icon3.$$.fragment);
    			t6 = space();
    			t7 = text(t7_value);
    			t8 = space();
    			button5 = element("button");
    			create_component(icon4.$$.fragment);
    			t9 = space();
    			t10 = text(t10_value);
    			t11 = space();
    			div2 = element("div");
    			button6 = element("button");
    			create_component(icon5.$$.fragment);
    			t12 = space();
    			button7 = element("button");
    			create_component(icon6.$$.fragment);
    			t13 = space();
    			div3 = element("div");
    			button8 = element("button");
    			create_component(icon7.$$.fragment);
    			t14 = space();
    			button9 = element("button");
    			create_component(icon8.$$.fragment);
    			t15 = space();
    			button10 = element("button");
    			create_component(icon9.$$.fragment);
    			t16 = space();
    			button11 = element("button");
    			create_component(icon10.$$.fragment);
    			t17 = space();
    			create_component(quickdropdown.$$.fragment);
    			t18 = space();
    			div4 = element("div");
    			button12 = element("button");
    			create_component(icon11.$$.fragment);
    			t19 = text("\r\n                Half size");
    			t20 = space();
    			button13 = element("button");
    			create_component(icon12.$$.fragment);
    			t21 = text("\r\n                Double size");
    			t22 = space();
    			create_component(inputselect0.$$.fragment);
    			t23 = space();
    			div5 = element("div");
    			label = element("label");
    			input_1 = element("input");
    			t24 = text("\r\n                Show grid");
    			t25 = space();
    			create_component(inputselect1.$$.fragment);
    			t26 = space();
    			div8 = element("div");
    			canvas0 = element("canvas");
    			t27 = space();
    			canvas1 = element("canvas");
    			t28 = space();
    			div11 = element("div");
    			create_component(form.$$.fragment);
    			t29 = space();
    			div10 = element("div");
    			create_component(fieldcheckbox.$$.fragment);
    			t30 = space();
    			div9 = element("div");
    			if (if_block0) if_block0.c();
    			t31 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "btn btn-light btn-sm mr1");
    			add_location(button0, file$c, 14, 12, 458);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", button1_class_value = "btn btn-sm btn-" + (/*mode*/ ctx[5] == "paint" ? "primary" : "light"));
    			attr_dev(button1, "title", "Paint brush");
    			add_location(button1, file$c, 18, 14, 747);
    			attr_dev(button2, "type", "button");
    			attr_dev(button2, "class", button2_class_value = "btn btn-sm btn-" + (/*mode*/ ctx[5] == "fill" ? "primary" : "light"));
    			attr_dev(button2, "title", "Paint bucket");
    			add_location(button2, file$c, 26, 14, 1054);
    			attr_dev(button3, "type", "button");
    			attr_dev(button3, "class", button3_class_value = "btn btn-sm btn-" + (/*mode*/ ctx[5] == "erase" ? "primary" : "light"));
    			attr_dev(button3, "title", "Eraser");
    			add_location(button3, file$c, 34, 14, 1359);
    			attr_dev(div0, "class", "btn-group");
    			add_location(div0, file$c, 17, 12, 708);
    			attr_dev(button4, "type", "button");
    			button4.disabled = button4_disabled_value = /*undos*/ ctx[6].length == 0;
    			attr_dev(button4, "class", "btn btn-default btn-sm");
    			add_location(button4, file$c, 40, 14, 1636);
    			attr_dev(button5, "type", "button");
    			button5.disabled = button5_disabled_value = /*redos*/ ctx[7].length == 0;
    			attr_dev(button5, "class", "btn btn-default btn-sm");
    			add_location(button5, file$c, 44, 14, 1873);
    			attr_dev(div1, "class", "btn-group");
    			add_location(div1, file$c, 39, 12, 1597);
    			attr_dev(button6, "type", "button");
    			attr_dev(button6, "class", "btn btn-light btn-sm");
    			attr_dev(button6, "title", "Flip horizontal");
    			add_location(button6, file$c, 51, 14, 2187);
    			attr_dev(button7, "type", "button");
    			attr_dev(button7, "class", "btn btn-light btn-sm");
    			attr_dev(button7, "title", "Flip vertical");
    			add_location(button7, file$c, 54, 14, 2362);
    			attr_dev(div2, "class", "btn-group");
    			add_location(div2, file$c, 50, 12, 2148);
    			attr_dev(button8, "type", "button");
    			attr_dev(button8, "class", "btn btn-light btn-sm");
    			attr_dev(button8, "title", "Move left");
    			add_location(button8, file$c, 60, 14, 2628);
    			attr_dev(button9, "type", "button");
    			attr_dev(button9, "class", "btn btn-light btn-sm");
    			attr_dev(button9, "title", "Move right");
    			add_location(button9, file$c, 63, 14, 2805);
    			attr_dev(button10, "type", "button");
    			attr_dev(button10, "class", "btn btn-light btn-sm");
    			attr_dev(button10, "title", "Move up");
    			add_location(button10, file$c, 66, 14, 2985);
    			attr_dev(button11, "type", "button");
    			attr_dev(button11, "class", "btn btn-light btn-sm");
    			attr_dev(button11, "title", "Move down");
    			add_location(button11, file$c, 69, 14, 3156);
    			attr_dev(div3, "class", "btn-group");
    			add_location(div3, file$c, 59, 12, 2589);
    			attr_dev(button12, "type", "button");
    			attr_dev(button12, "class", "btn btn-light btn-sm");
    			attr_dev(button12, "title", "Scale down");
    			add_location(button12, file$c, 88, 14, 4024);
    			attr_dev(button13, "type", "button");
    			attr_dev(button13, "class", "btn btn-light btn-sm");
    			attr_dev(button13, "title", "Scale up");
    			add_location(button13, file$c, 93, 14, 4228);
    			add_location(div4, file$c, 87, 12, 4003);
    			attr_dev(input_1, "type", "checkbox");
    			add_location(input_1, file$c, 105, 16, 4716);
    			add_location(label, file$c, 104, 14, 4691);
    			add_location(div5, file$c, 103, 12, 4670);
    			attr_dev(div6, "class", "art-actions svelte-1gatncs");
    			add_location(div6, file$c, 13, 10, 419);
    			attr_dev(div7, "class", "col1");
    			add_location(div7, file$c, 12, 8, 389);
    			attr_dev(canvas0, "class", "draw-canvas svelte-1gatncs");
    			add_location(canvas0, file$c, 127, 10, 5426);
    			attr_dev(canvas1, "class", "grid-canvas svelte-1gatncs");
    			toggle_class(canvas1, "paint-cursor", /*mode*/ ctx[5] == "paint");
    			toggle_class(canvas1, "fill-cursor", /*mode*/ ctx[5] == "fill");
    			toggle_class(canvas1, "erase-cursor", /*mode*/ ctx[5] == "erase");
    			add_location(canvas1, file$c, 128, 10, 5491);
    			attr_dev(div8, "class", "grow canvas-container svelte-1gatncs");
    			add_location(div8, file$c, 126, 8, 5379);
    			attr_dev(div9, "class", "preview flex");
    			add_location(div9, file$c, 154, 12, 6520);
    			attr_dev(div10, "class", "p1");
    			add_location(div10, file$c, 151, 10, 6360);
    			attr_dev(div11, "class", "col2");
    			add_location(div11, file$c, 141, 8, 5985);
    			attr_dev(div12, "class", "grow columns");
    			add_location(div12, file$c, 11, 6, 353);
    			attr_dev(div13, "class", "grow rows");
    			add_location(div13, file$c, 10, 4, 322);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div13, anchor);
    			append_dev(div13, div12);
    			append_dev(div12, div7);
    			append_dev(div7, div6);
    			append_dev(div6, button0);
    			append_dev(div6, t1);
    			mount_component(colorpicker, div6, null);
    			append_dev(div6, t2);
    			append_dev(div6, div0);
    			append_dev(div0, button1);
    			mount_component(icon0, button1, null);
    			append_dev(div0, t3);
    			append_dev(div0, button2);
    			mount_component(icon1, button2, null);
    			append_dev(div0, t4);
    			append_dev(div0, button3);
    			mount_component(icon2, button3, null);
    			append_dev(div6, t5);
    			append_dev(div6, div1);
    			append_dev(div1, button4);
    			mount_component(icon3, button4, null);
    			append_dev(button4, t6);
    			append_dev(button4, t7);
    			append_dev(div1, t8);
    			append_dev(div1, button5);
    			mount_component(icon4, button5, null);
    			append_dev(button5, t9);
    			append_dev(button5, t10);
    			append_dev(div6, t11);
    			append_dev(div6, div2);
    			append_dev(div2, button6);
    			mount_component(icon5, button6, null);
    			append_dev(div2, t12);
    			append_dev(div2, button7);
    			mount_component(icon6, button7, null);
    			append_dev(div6, t13);
    			append_dev(div6, div3);
    			append_dev(div3, button8);
    			mount_component(icon7, button8, null);
    			append_dev(div3, t14);
    			append_dev(div3, button9);
    			mount_component(icon8, button9, null);
    			append_dev(div3, t15);
    			append_dev(div3, button10);
    			mount_component(icon9, button10, null);
    			append_dev(div3, t16);
    			append_dev(div3, button11);
    			mount_component(icon10, button11, null);
    			append_dev(div6, t17);
    			mount_component(quickdropdown, div6, null);
    			append_dev(div6, t18);
    			append_dev(div6, div4);
    			append_dev(div4, button12);
    			mount_component(icon11, button12, null);
    			append_dev(button12, t19);
    			append_dev(div4, t20);
    			append_dev(div4, button13);
    			mount_component(icon12, button13, null);
    			append_dev(button13, t21);
    			append_dev(div6, t22);
    			mount_component(inputselect0, div6, null);
    			append_dev(div6, t23);
    			append_dev(div6, div5);
    			append_dev(div5, label);
    			append_dev(label, input_1);
    			input_1.checked = /*showGrid*/ ctx[1];
    			append_dev(label, t24);
    			append_dev(div6, t25);
    			mount_component(inputselect1, div6, null);
    			append_dev(div12, t26);
    			append_dev(div12, div8);
    			append_dev(div8, canvas0);
    			/*canvas0_binding*/ ctx[58](canvas0);
    			append_dev(div8, t27);
    			append_dev(div8, canvas1);
    			/*canvas1_binding*/ ctx[59](canvas1);
    			append_dev(div12, t28);
    			append_dev(div12, div11);
    			mount_component(form, div11, null);
    			append_dev(div11, t29);
    			append_dev(div11, div10);
    			mount_component(fieldcheckbox, div10, null);
    			append_dev(div10, t30);
    			append_dev(div10, div9);
    			if (if_block0) if_block0.m(div9, null);
    			append_dev(div10, t31);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(div10, null);
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

    			if ((!current || dirty[0] & /*undos*/ 64) && t7_value !== (t7_value = (/*undos*/ ctx[6].length > 0
    			? /*undos*/ ctx[6].length
    			: "") + "")) set_data_dev(t7, t7_value);

    			if (!current || dirty[0] & /*undos*/ 64 && button4_disabled_value !== (button4_disabled_value = /*undos*/ ctx[6].length == 0)) {
    				prop_dev(button4, "disabled", button4_disabled_value);
    			}

    			if ((!current || dirty[0] & /*redos*/ 128) && t10_value !== (t10_value = (/*redos*/ ctx[7].length > 0
    			? /*redos*/ ctx[7].length
    			: "") + "")) set_data_dev(t10, t10_value);

    			if (!current || dirty[0] & /*redos*/ 128 && button5_disabled_value !== (button5_disabled_value = /*redos*/ ctx[7].length == 0)) {
    				prop_dev(button5, "disabled", button5_disabled_value);
    			}

    			const quickdropdown_changes = {};
    			if (dirty[0] & /*input*/ 1) quickdropdown_changes.label = "" + (/*input*/ ctx[0].width + "W x " + /*input*/ ctx[0].height + "H");

    			if (dirty[0] & /*changeSize*/ 8192 | dirty[3] & /*$$scope*/ 64) {
    				quickdropdown_changes.$$scope = { dirty, ctx };
    			}

    			quickdropdown.$set(quickdropdown_changes);
    			const inputselect0_changes = {};

    			if (dirty[3] & /*$$scope, option*/ 80) {
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

    			if (dirty[3] & /*$$scope, option*/ 80) {
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

    			if (dirty[0] & /*isAdding, input*/ 16385 | dirty[3] & /*$$scope*/ 64) {
    				form_changes.$$scope = { dirty, ctx };
    			}

    			form.$set(form_changes);
    			const fieldcheckbox_changes = {};

    			if (dirty[3] & /*$$scope*/ 64) {
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
    					if_block0 = create_if_block_4$1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div9, null);
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
    					if_block1.m(div10, null);
    				} else {
    					if_block1 = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
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
    			if (detaching) detach_dev(div13);
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
    		id: create_if_block$7.name,
    		type: "if",
    		source: "(10:2) {#if input}",
    		ctx
    	});

    	return block;
    }

    // (75:12) <QuickDropdown label="{input.width}W x {input.height}H" on:open={startChangeSize} dropdownClass="below left">
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
    			t0 = text("W\r\n                  ");
    			input0 = element("input");
    			t1 = space();
    			strong = element("strong");
    			strong.textContent = "x";
    			t3 = text("\r\n                  H\r\n                  ");
    			input1 = element("input");
    			t4 = space();
    			button = element("button");
    			button.textContent = "Apply";
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "min", 1);
    			attr_dev(input0, "max", 1500);
    			attr_dev(input0, "class", "svelte-1gatncs");
    			add_location(input0, file$c, 78, 18, 3602);
    			add_location(strong, file$c, 79, 18, 3694);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "min", 1);
    			attr_dev(input1, "max", 1500);
    			attr_dev(input1, "class", "svelte-1gatncs");
    			add_location(input1, file$c, 81, 18, 3753);
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "btn btn-info btn-sm");
    			add_location(button, file$c, 82, 18, 3846);
    			attr_dev(div, "class", "p1");
    			add_location(div, file$c, 76, 16, 3545);
    			add_location(form, file$c, 75, 14, 3478);
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
    		source: "(75:12) <QuickDropdown label=\\\"{input.width}W x {input.height}H\\\" on:open={startChangeSize} dropdownClass=\\\"below left\\\">",
    		ctx
    	});

    	return block;
    }

    // (100:12) <InputSelect sm placeholder="Zoom" bind:value={zoom} let:option options={[...Array(11)].map((_, i) => i + 10)}>
    function create_default_slot_8$2(ctx) {
    	let icon;
    	let t0;
    	let t1_value = /*option*/ ctx[97].value + "";
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
    			if ((!current || dirty[3] & /*option*/ 16) && t1_value !== (t1_value = /*option*/ ctx[97].value + "")) set_data_dev(t1, t1_value);
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
    		id: create_default_slot_8$2.name,
    		type: "slot",
    		source: "(100:12) <InputSelect sm placeholder=\\\"Zoom\\\" bind:value={zoom} let:option options={[...Array(11)].map((_, i) => i + 10)}>",
    		ctx
    	});

    	return block;
    }

    // (111:12) <InputSelect                disabled={$autoSaveStore[input.name] == null}                options={$autoSaveStore[input.name]}                bind:value={selectedAutoSave}                on:change={e => loadAutoSave(e.detail)}                let:option                placeholder="Auto-saves"                inline                sm                right              >
    function create_default_slot_7$3(ctx) {
    	let t0_value = /*option*/ ctx[97].name + "";
    	let t0;
    	let t1;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			t0 = text(t0_value);
    			t1 = space();
    			img = element("img");
    			if (img.src !== (img_src_value = /*option*/ ctx[97].png)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "height", "40");
    			attr_dev(img, "alt", "");
    			add_location(img, file$c, 122, 14, 5264);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[3] & /*option*/ 16 && t0_value !== (t0_value = /*option*/ ctx[97].name + "")) set_data_dev(t0, t0_value);

    			if (dirty[3] & /*option*/ 16 && img.src !== (img_src_value = /*option*/ ctx[97].png)) {
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
    		id: create_default_slot_7$3.name,
    		type: "slot",
    		source: "(111:12) <InputSelect                disabled={$autoSaveStore[input.name] == null}                options={$autoSaveStore[input.name]}                bind:value={selectedAutoSave}                on:change={e => loadAutoSave(e.detail)}                let:option                placeholder=\\\"Auto-saves\\\"                inline                sm                right              >",
    		ctx
    	});

    	return block;
    }

    // (149:12) <FieldText name="name" bind:value={input.name}>
    function create_default_slot_6$5(ctx) {
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
    		id: create_default_slot_6$5.name,
    		type: "slot",
    		source: "(149:12) <FieldText name=\\\"name\\\" bind:value={input.name}>",
    		ctx
    	});

    	return block;
    }

    // (143:10) <Form on:submit={save} {hasChanges}>
    function create_default_slot_5$5(ctx) {
    	let fieldtext;
    	let updating_value;
    	let current;

    	function fieldtext_value_binding(value) {
    		/*fieldtext_value_binding*/ ctx[60](value);
    	}

    	let fieldtext_props = {
    		name: "name",
    		$$slots: { default: [create_default_slot_6$5] },
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

    			if (dirty[3] & /*$$scope*/ 64) {
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
    		id: create_default_slot_5$5.name,
    		type: "slot",
    		source: "(143:10) <Form on:submit={save} {hasChanges}>",
    		ctx
    	});

    	return block;
    }

    // (145:14) {#if !isAdding}
    function create_if_block_5$1(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Delete";
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-danger");
    			add_location(button, file$c, 145, 16, 6134);
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
    		id: create_if_block_5$1.name,
    		type: "if",
    		source: "(145:14) {#if !isAdding}",
    		ctx
    	});

    	return block;
    }

    // (144:12) 
    function create_buttons_slot$5(ctx) {
    	let div;
    	let if_block = !/*isAdding*/ ctx[14] && create_if_block_5$1(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			attr_dev(div, "slot", "buttons");
    			add_location(div, file$c, 143, 12, 6065);
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
    					if_block = create_if_block_5$1(ctx);
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
    		id: create_buttons_slot$5.name,
    		type: "slot",
    		source: "(144:12) ",
    		ctx
    	});

    	return block;
    }

    // (153:12) <FieldCheckbox name="animated" bind:checked={input.animated} on:change={animatedChanged}>
    function create_default_slot_4$5(ctx) {
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
    		id: create_default_slot_4$5.name,
    		type: "slot",
    		source: "(153:12) <FieldCheckbox name=\\\"animated\\\" bind:checked={input.animated} on:change={animatedChanged}>",
    		ctx
    	});

    	return block;
    }

    // (156:14) {#if input.animated}
    function create_if_block_4$1(ctx) {
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
    		$$slots: { default: [create_default_slot_3$6] },
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
    		$$slots: { default: [create_default_slot_2$6] },
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
    		$$slots: { default: [create_default_slot_1$7] },
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
    			add_location(img, file$c, 164, 22, 7197);
    			attr_dev(div0, "class", "frame-editor svelte-1gatncs");
    			add_location(div0, file$c, 163, 20, 7147);
    			attr_dev(div1, "class", "flex-column");
    			add_location(div1, file$c, 161, 18, 6980);
    			add_location(div2, file$c, 156, 16, 6600);
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

    			if (dirty[3] & /*$$scope*/ 64) {
    				fieldnumber0_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty[0] & /*input*/ 1) {
    				updating_value = true;
    				fieldnumber0_changes.value = /*input*/ ctx[0].frameWidth;
    				add_flush_callback(() => updating_value = false);
    			}

    			fieldnumber0.$set(fieldnumber0_changes);
    			const fieldnumber1_changes = {};

    			if (dirty[3] & /*$$scope*/ 64) {
    				fieldnumber1_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_1 && dirty[0] & /*input*/ 1) {
    				updating_value_1 = true;
    				fieldnumber1_changes.value = /*input*/ ctx[0].frameRate;
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			fieldnumber1.$set(fieldnumber1_changes);
    			const fieldcheckbox_changes = {};

    			if (dirty[3] & /*$$scope*/ 64) {
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
    		id: create_if_block_4$1.name,
    		type: "if",
    		source: "(156:14) {#if input.animated}",
    		ctx
    	});

    	return block;
    }

    // (158:18) <FieldNumber name="frameWidth" bind:value={input.frameWidth} max={200} step={1}>
    function create_default_slot_3$6(ctx) {
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
    		id: create_default_slot_3$6.name,
    		type: "slot",
    		source: "(158:18) <FieldNumber name=\\\"frameWidth\\\" bind:value={input.frameWidth} max={200} step={1}>",
    		ctx
    	});

    	return block;
    }

    // (159:18) <FieldNumber name="frameRate" bind:value={input.frameRate} max={60} min={1} step={1}>
    function create_default_slot_2$6(ctx) {
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
    		id: create_default_slot_2$6.name,
    		type: "slot",
    		source: "(159:18) <FieldNumber name=\\\"frameRate\\\" bind:value={input.frameRate} max={60} min={1} step={1}>",
    		ctx
    	});

    	return block;
    }

    // (160:18) <FieldCheckbox name="yoyo" bind:checked={input.yoyo}>
    function create_default_slot_1$7(ctx) {
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
    		id: create_default_slot_1$7.name,
    		type: "slot",
    		source: "(160:18) <FieldCheckbox name=\\\"yoyo\\\" bind:checked={input.yoyo}>",
    		ctx
    	});

    	return block;
    }

    // (166:22) {#each [...Array(numFrames)] as x, frameNumber}
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
    		return /*click_handler_3*/ ctx[65](/*frameNumber*/ ctx[96]);
    	}

    	icon1 = new Icon({
    			props: { data: copyIcon },
    			$$inline: true
    		});

    	function click_handler_4() {
    		return /*click_handler_4*/ ctx[66](/*frameNumber*/ ctx[96]);
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
    			add_location(a0, file$c, 167, 26, 7564);
    			attr_dev(a1, "href", "#/");
    			attr_dev(a1, "class", "text-info svelte-1gatncs");
    			add_location(a1, file$c, 170, 26, 7770);
    			attr_dev(div, "class", "frame svelte-1gatncs");
    			set_style(div, "left", /*frameNumber*/ ctx[96] * /*input*/ ctx[0].frameWidth * artScale + "px");
    			set_style(div, "width", /*input*/ ctx[0].frameWidth * artScale + "px");
    			add_location(div, file$c, 166, 24, 7416);
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
    				set_style(div, "left", /*frameNumber*/ ctx[96] * /*input*/ ctx[0].frameWidth * artScale + "px");
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
    		source: "(166:22) {#each [...Array(numFrames)] as x, frameNumber}",
    		ctx
    	});

    	return block;
    }

    // (198:38) 
    function create_if_block_3$1(ctx) {
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
    			add_location(img, file$c, 198, 14, 8953);
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
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(198:38) ",
    		ctx
    	});

    	return block;
    }

    // (183:12) {#if isBlockSize}
    function create_if_block_1$5(ctx) {
    	let div;
    	let t;
    	let current;
    	let each_value = [0, 0, 0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < 3; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text("Block tiling preview\r\n                ");

    			for (let i = 0; i < 3; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "ml-2");
    			add_location(div, file$c, 183, 14, 8234);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);

    			for (let i = 0; i < 3; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*input, pngCanvas*/ 1025) {
    				each_value = [0, 0, 0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < 3; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
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
    		id: create_if_block_1$5.name,
    		type: "if",
    		source: "(183:12) {#if isBlockSize}",
    		ctx
    	});

    	return block;
    }

    // (191:22) {:else}
    function create_else_block$2(ctx) {
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
    			add_location(img, file$c, 191, 24, 8649);
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
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(191:22) {:else}",
    		ctx
    	});

    	return block;
    }

    // (189:22) {#if input.animated}
    function create_if_block_2$1(ctx) {
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
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(189:22) {#if input.animated}",
    		ctx
    	});

    	return block;
    }

    // (188:20) {#each [0, 0, 0] as margin}
    function create_each_block_1(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_2$1, create_else_block$2];
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
    			if_block_anchor = empty$1();
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
    		source: "(188:20) {#each [0, 0, 0] as margin}",
    		ctx
    	});

    	return block;
    }

    // (186:16) {#each [0, 0, 0] as r}
    function create_each_block$1(ctx) {
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
    			add_location(div, file$c, 186, 18, 8350);
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
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(186:16) {#each [0, 0, 0] as r}",
    		ctx
    	});

    	return block;
    }

    // (3:0) <AppLayout active="art">
    function create_default_slot$a(ctx) {
    	let div;
    	let itemlistnav;
    	let t;
    	let if_block_anchor;
    	let current;

    	itemlistnav = new ItemListNav({
    			props: {
    				slug: "art",
    				type: "art",
    				collection: /*$art*/ ctx[4],
    				active: /*paramId*/ ctx[3],
    				$$slots: {
    					default: [
    						create_default_slot_10,
    						({ item }) => ({ 98: item }),
    						({ item }) => [0, 0, 0, item ? 32 : 0]
    					]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	let if_block = /*input*/ ctx[0] && create_if_block$7(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(itemlistnav.$$.fragment);
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty$1();
    			attr_dev(div, "class", "col1");
    			add_location(div, file$c, 3, 2, 116);
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
    			if (dirty[0] & /*$art*/ 16) itemlistnav_changes.collection = /*$art*/ ctx[4];
    			if (dirty[0] & /*paramId*/ 8) itemlistnav_changes.active = /*paramId*/ ctx[3];

    			if (dirty[3] & /*$$scope, item*/ 96) {
    				itemlistnav_changes.$$scope = { dirty, ctx };
    			}

    			itemlistnav.$set(itemlistnav_changes);

    			if (/*input*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[0] & /*input*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$7(ctx);
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
    		id: create_default_slot$a.name,
    		type: "slot",
    		source: "(3:0) <AppLayout active=\\\"art\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$d(ctx) {
    	let applayout;
    	let current;
    	let mounted;
    	let dispose;

    	applayout = new AppLayout({
    			props: {
    				active: "art",
    				$$slots: { default: [create_default_slot$a] },
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

    			if (dirty[0] & /*input, pngCanvas, isBlockSize, numFrames, hasChanges, isAdding, gridCanvas, mode, drawCanvas, $autoSaveStore, selectedAutoSave, showGrid, zoom, changeSize, redos, undos, selectedColor, $art, paramId*/ 524287 | dirty[3] & /*$$scope*/ 64) {
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
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const artScale = 1;

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

    function instance$d($$self, $$props, $$invalidate) {
    	let paramId;
    	let isAdding;
    	let inputWidth;
    	let inputHeight;
    	let hasChanges;
    	let numFrames;
    	let isBlockSize;
    	let $art;
    	let $project;
    	let $autoSaveStore;
    	validate_store(art, "art");
    	component_subscribe($$self, art, $$value => $$invalidate(4, $art = $$value));
    	validate_store(project, "project");
    	component_subscribe($$self, project, $$value => $$invalidate(72, $project = $$value));
    	validate_store(autoSaveStore, "autoSaveStore");
    	component_subscribe($$self, autoSaveStore, $$value => $$invalidate(18, $autoSaveStore = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ArtBuilder", slots, []);
    	let { params = {} } = $$props;
    	let input = null;
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
    		$$invalidate(0, input = createDefaultInput());
    		redraw();
    	}

    	function createDefaultInput() {
    		return {
    			projectId: $project.id,
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

    	function edit(id) {
    		const item = $art.find(a => a.id === id);
    		if (item == null) return;
    		$$invalidate(6, undos = []);
    		$$invalidate(7, redos = []);

    		$$invalidate(0, input = {
    			...createDefaultInput(),
    			...JSON.parse(JSON.stringify(item))
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

    		

    		(isAdding
    		? art.apiInsert(input).then(item => {
    				$$invalidate(0, input = item);
    			})
    		: art.apiUpdate(input)).then(() => {
    			push(`/art/${encodeURIComponent(input.id)}`);
    		});
    	}

    	function del() {
    		if (confirm(`Are you sure you want to delete "${input.name}"?`)) {
    			art.apiDelete(input.projectId, input.id);
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
    		onMount,
    		project,
    		art,
    		push,
    		AnimationPreview,
    		AppLayout,
    		ArtThumb,
    		autoSaveStore,
    		ColorPicker,
    		debounce,
    		FieldCheckbox,
    		FieldNumber,
    		FieldText,
    		Form,
    		Icon,
    		InputSelect,
    		ItemListNav,
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
    		createDefaultInput,
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
    		$art,
    		isAdding,
    		inputWidth,
    		inputHeight,
    		hasChanges,
    		numFrames,
    		isBlockSize,
    		$project,
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

    		if ($$self.$$.dirty[0] & /*paramId, $art*/ 24) {
    			if (paramId == "new" || $art != null) {
    				paramId == "new" ? create() : edit(paramId);
    			}
    		}

    		if ($$self.$$.dirty[0] & /*input*/ 1) {
    			$$invalidate(14, isAdding = input?.id == null);
    		}

    		if ($$self.$$.dirty[0] & /*input*/ 1) {
    			$$invalidate(44, inputWidth = input?.width);
    		}

    		if ($$self.$$.dirty[0] & /*input*/ 1) {
    			$$invalidate(45, inputHeight = input?.height);
    		}

    		if ($$self.$$.dirty[0] & /*input, $art*/ 17) {
    			$$invalidate(15, hasChanges = input != null && !validator.equals(input, $art.find(a => a.id == input.id)));
    		}

    		if ($$self.$$.dirty[0] & /*input*/ 1) {
    			$$invalidate(16, numFrames = input != null && input.width != null && input.frameWidth != null
    			? Math.ceil(input.width / input.frameWidth)
    			: 0);
    		}

    		if ($$self.$$.dirty[0] & /*showGrid, zoom*/ 6 | $$self.$$.dirty[1] & /*inputWidth, inputHeight*/ 24576) {
    			if (inputWidth != 0 && inputHeight != 0 && showGrid != null && zoom != null) debouncedRedraw();
    		}

    		if ($$self.$$.dirty[0] & /*input*/ 1) {
    			$$invalidate(17, isBlockSize = input != null && input.height == 40 && (input.width == 40 || input.animated && input.frameWidth == 40));
    		}
    	};

    	return [
    		input,
    		showGrid,
    		zoom,
    		paramId,
    		$art,
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
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, { params: 43 }, [-1, -1, -1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ArtBuilder",
    			options,
    			id: create_fragment$d.name
    		});
    	}

    	get params() {
    		throw new Error("<ArtBuilder>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set params(value) {
    		throw new Error("<ArtBuilder>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\client\pages\ParticleBuilder.svelte generated by Svelte v3.38.3 */
    const file$b = "src\\client\\pages\\ParticleBuilder.svelte";

    // (3:4) <ItemListNav slug="particles" type="particles" collection={$particles} active={paramId} let:item>
    function create_default_slot_1$6(ctx) {
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
    		id: create_default_slot_1$6.name,
    		type: "slot",
    		source: "(3:4) <ItemListNav slug=\\\"particles\\\" type=\\\"particles\\\" collection={$particles} active={paramId} let:item>",
    		ctx
    	});

    	return block;
    }

    // (1:0) <AppLayout active="particles">
    function create_default_slot$9(ctx) {
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
    				collection: /*$particles*/ ctx[1],
    				active: /*paramId*/ ctx[0],
    				$$slots: {
    					default: [
    						create_default_slot_1$6,
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
    			add_location(div0, file$b, 1, 2, 34);
    			attr_dev(div1, "class", "grow p1");
    			add_location(div1, file$b, 7, 2, 246);
    			attr_dev(div2, "class", "col2");
    			add_location(div2, file$b, 8, 2, 288);
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
    			if (dirty & /*$particles*/ 2) itemlistnav_changes.collection = /*$particles*/ ctx[1];
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
    		id: create_default_slot$9.name,
    		type: "slot",
    		source: "(1:0) <AppLayout active=\\\"particles\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$c(ctx) {
    	let applayout;
    	let current;

    	applayout = new AppLayout({
    			props: {
    				active: "particles",
    				$$slots: { default: [create_default_slot$9] },
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

    			if (dirty & /*$$scope, $particles, paramId*/ 19) {
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
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let paramId;
    	let $particles;
    	validate_store(particles, "particles");
    	component_subscribe($$self, particles, $$value => $$invalidate(1, $particles = $$value));
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
    		particles,
    		params,
    		paramId,
    		$particles
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

    	return [paramId, $particles, params];
    }

    class ParticleBuilder extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, { params: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ParticleBuilder",
    			options,
    			id: create_fragment$c.name
    		});
    	}

    	get params() {
    		throw new Error("<ParticleBuilder>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set params(value) {
    		throw new Error("<ParticleBuilder>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\client\components\FieldArtPicker.svelte generated by Svelte v3.38.3 */
    const file$a = "src\\client\\components\\FieldArtPicker.svelte";

    // (6:4) <InputSelect inline {name} bind:value let:option {options} filterable={options.length > 3} {placeholder}>
    function create_default_slot$8(ctx) {
    	let artthumb;
    	let t0;
    	let t1_value = /*option*/ ctx[9].name + "";
    	let t1;
    	let current;

    	artthumb = new ArtThumb({
    			props: { id: /*option*/ ctx[9].id },
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
    			if (dirty & /*option*/ 512) artthumb_changes.id = /*option*/ ctx[9].id;
    			artthumb.$set(artthumb_changes);
    			if ((!current || dirty & /*option*/ 512) && t1_value !== (t1_value = /*option*/ ctx[9].name + "")) set_data_dev(t1, t1_value);
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
    		source: "(6:4) <InputSelect inline {name} bind:value let:option {options} filterable={options.length > 3} {placeholder}>",
    		ctx
    	});

    	return block;
    }

    // (11:2) {#if selected}
    function create_if_block$6(ctx) {
    	let a;
    	let t0;
    	let t1_value = /*selected*/ ctx[4].name + "";
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
    			add_location(a, file$a, 11, 4, 302);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t0);
    			append_dev(a, t1);
    			append_dev(a, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*selected*/ 16 && t1_value !== (t1_value = /*selected*/ ctx[4].name + "")) set_data_dev(t1, t1_value);

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
    		id: create_if_block$6.name,
    		type: "if",
    		source: "(11:2) {#if selected}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$b(ctx) {
    	let div1;
    	let label;
    	let t0;
    	let div0;
    	let inputselect;
    	let updating_value;
    	let t1;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[6].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);

    	function inputselect_value_binding(value) {
    		/*inputselect_value_binding*/ ctx[7](value);
    	}

    	let inputselect_props = {
    		inline: true,
    		name: /*name*/ ctx[1],
    		options: /*options*/ ctx[3],
    		filterable: /*options*/ ctx[3].length > 3,
    		placeholder: /*placeholder*/ ctx[2],
    		$$slots: {
    			default: [
    				create_default_slot$8,
    				({ option }) => ({ 9: option }),
    				({ option }) => option ? 512 : 0
    			]
    		},
    		$$scope: { ctx }
    	};

    	if (/*value*/ ctx[0] !== void 0) {
    		inputselect_props.value = /*value*/ ctx[0];
    	}

    	inputselect = new InputSelect({ props: inputselect_props, $$inline: true });
    	binding_callbacks.push(() => bind(inputselect, "value", inputselect_value_binding));
    	let if_block = /*selected*/ ctx[4] && create_if_block$6(ctx);

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
    			attr_dev(label, "for", /*name*/ ctx[1]);
    			add_location(label, file$a, 1, 2, 28);
    			add_location(div0, file$a, 4, 2, 76);
    			attr_dev(div1, "class", "form-group");
    			add_location(div1, file$a, 0, 0, 0);
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
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 256)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[8], !current ? -1 : dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*name*/ 2) {
    				attr_dev(label, "for", /*name*/ ctx[1]);
    			}

    			const inputselect_changes = {};
    			if (dirty & /*name*/ 2) inputselect_changes.name = /*name*/ ctx[1];
    			if (dirty & /*options*/ 8) inputselect_changes.options = /*options*/ ctx[3];
    			if (dirty & /*options*/ 8) inputselect_changes.filterable = /*options*/ ctx[3].length > 3;
    			if (dirty & /*placeholder*/ 4) inputselect_changes.placeholder = /*placeholder*/ ctx[2];

    			if (dirty & /*$$scope, option*/ 768) {
    				inputselect_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*value*/ 1) {
    				updating_value = true;
    				inputselect_changes.value = /*value*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			inputselect.$set(inputselect_changes);

    			if (/*selected*/ ctx[4]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$6(ctx);
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
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let options;
    	let selected;
    	let $art;
    	validate_store(art, "art");
    	component_subscribe($$self, art, $$value => $$invalidate(5, $art = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("FieldArtPicker", slots, ['default']);
    	let { value = null } = $$props;
    	let { name = "art-picker" } = $$props;
    	let { placeholder = "Select art" } = $$props;
    	const writable_props = ["value", "name", "placeholder"];

    	Object.keys($$props).forEach(key => {
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
    		if ("$$scope" in $$props) $$invalidate(8, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		sortByName,
    		art,
    		InputSelect,
    		ArtThumb,
    		value,
    		name,
    		placeholder,
    		options,
    		$art,
    		selected
    	});

    	$$self.$inject_state = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    		if ("placeholder" in $$props) $$invalidate(2, placeholder = $$props.placeholder);
    		if ("options" in $$props) $$invalidate(3, options = $$props.options);
    		if ("selected" in $$props) $$invalidate(4, selected = $$props.selected);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$art*/ 32) {
    			$$invalidate(3, options = $art.map(a => ({ ...a, value: a.id })).sort(sortByName));
    		}

    		if ($$self.$$.dirty & /*options, value*/ 9) {
    			$$invalidate(4, selected = options?.find(o => o.value == value));
    		}
    	};

    	return [
    		value,
    		name,
    		placeholder,
    		options,
    		selected,
    		$art,
    		slots,
    		inputselect_value_binding,
    		$$scope
    	];
    }

    class FieldArtPicker extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, { value: 0, name: 1, placeholder: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FieldArtPicker",
    			options,
    			id: create_fragment$b.name
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

    /* src\client\pages\BlockBuilder.svelte generated by Svelte v3.38.3 */
    const file$9 = "src\\client\\pages\\BlockBuilder.svelte";

    // (3:4) <ItemListNav slug="blocks" type="block" collection={$blocks} active={paramId} let:item>
    function create_default_slot_6$4(ctx) {
    	let artthumb;
    	let t0;
    	let t1_value = /*item*/ ctx[16].name + "";
    	let t1;
    	let current;

    	artthumb = new ArtThumb({
    			props: { id: /*item*/ ctx[16].graphic },
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
    			if (dirty & /*item*/ 65536) artthumb_changes.id = /*item*/ ctx[16].graphic;
    			artthumb.$set(artthumb_changes);
    			if ((!current || dirty & /*item*/ 65536) && t1_value !== (t1_value = /*item*/ ctx[16].name + "")) set_data_dev(t1, t1_value);
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
    		id: create_default_slot_6$4.name,
    		type: "slot",
    		source: "(3:4) <ItemListNav slug=\\\"blocks\\\" type=\\\"block\\\" collection={$blocks} active={paramId} let:item>",
    		ctx
    	});

    	return block;
    }

    // (8:2) {#if input}
    function create_if_block$5(ctx) {
    	let div0;
    	let form;
    	let t0;
    	let div1;
    	let current;

    	form = new Form({
    			props: {
    				hasChanges: /*hasChanges*/ ctx[4],
    				$$slots: {
    					buttons: [create_buttons_slot$4],
    					default: [create_default_slot_1$5]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	form.$on("submit", /*save*/ ctx[5]);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			create_component(form.$$.fragment);
    			t0 = space();
    			div1 = element("div");
    			div1.textContent = "Preview maybe?";
    			attr_dev(div0, "class", "grow p1");
    			add_location(div0, file$9, 8, 4, 250);
    			attr_dev(div1, "class", "col2");
    			add_location(div1, file$9, 57, 4, 3019);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			mount_component(form, div0, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const form_changes = {};
    			if (dirty & /*hasChanges*/ 16) form_changes.hasChanges = /*hasChanges*/ ctx[4];

    			if (dirty & /*$$scope, isAdding, input*/ 131081) {
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
    			if (detaching) detach_dev(div0);
    			destroy_component(form);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(8:2) {#if input}",
    		ctx
    	});

    	return block;
    }

    // (11:8) <FieldText name="name" bind:value={input.name} placeholder="Type a name...">
    function create_default_slot_5$4(ctx) {
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
    		id: create_default_slot_5$4.name,
    		type: "slot",
    		source: "(11:8) <FieldText name=\\\"name\\\" bind:value={input.name} placeholder=\\\"Type a name...\\\">",
    		ctx
    	});

    	return block;
    }

    // (12:8) <FieldArtPicker bind:value={input.graphic}>
    function create_default_slot_4$4(ctx) {
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
    		id: create_default_slot_4$4.name,
    		type: "slot",
    		source: "(12:8) <FieldArtPicker bind:value={input.graphic}>",
    		ctx
    	});

    	return block;
    }

    // (14:8) <FieldCheckbox name="can-walk" bind:checked={input.canWalk}>
    function create_default_slot_3$5(ctx) {
    	let t0;
    	let div;

    	const block = {
    		c: function create() {
    			t0 = text("Can walk on?\r\n          ");
    			div = element("div");
    			div.textContent = "Can players walk on or through this block?";
    			attr_dev(div, "class", "help-text");
    			add_location(div, file$9, 15, 10, 683);
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
    		id: create_default_slot_3$5.name,
    		type: "slot",
    		source: "(14:8) <FieldCheckbox name=\\\"can-walk\\\" bind:checked={input.canWalk}>",
    		ctx
    	});

    	return block;
    }

    // (18:8) <FieldCheckbox name="can-see" bind:checked={input.canSee}>
    function create_default_slot_2$5(ctx) {
    	let t0;
    	let div;

    	const block = {
    		c: function create() {
    			t0 = text("Can see through / across?\r\n          ");
    			div = element("div");
    			div.textContent = "Can players and enemies see through / across this block?";
    			attr_dev(div, "class", "help-text");
    			add_location(div, file$9, 19, 10, 897);
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
    		id: create_default_slot_2$5.name,
    		type: "slot",
    		source: "(18:8) <FieldCheckbox name=\\\"can-see\\\" bind:checked={input.canSee}>",
    		ctx
    	});

    	return block;
    }

    // (10:6) <Form on:submit={save} {hasChanges}>
    function create_default_slot_1$5(ctx) {
    	let fieldtext;
    	let updating_value;
    	let t0;
    	let fieldartpicker;
    	let updating_value_1;
    	let t1;
    	let fieldcheckbox0;
    	let updating_checked;
    	let t2;
    	let fieldcheckbox1;
    	let updating_checked_1;
    	let current;

    	function fieldtext_value_binding(value) {
    		/*fieldtext_value_binding*/ ctx[8](value);
    	}

    	let fieldtext_props = {
    		name: "name",
    		placeholder: "Type a name...",
    		$$slots: { default: [create_default_slot_5$4] },
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
    		$$slots: { default: [create_default_slot_4$4] },
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

    	function fieldcheckbox0_checked_binding(value) {
    		/*fieldcheckbox0_checked_binding*/ ctx[10](value);
    	}

    	let fieldcheckbox0_props = {
    		name: "can-walk",
    		$$slots: { default: [create_default_slot_3$5] },
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
    		/*fieldcheckbox1_checked_binding*/ ctx[11](value);
    	}

    	let fieldcheckbox1_props = {
    		name: "can-see",
    		$$slots: { default: [create_default_slot_2$5] },
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

    	const block = {
    		c: function create() {
    			create_component(fieldtext.$$.fragment);
    			t0 = space();
    			create_component(fieldartpicker.$$.fragment);
    			t1 = space();
    			create_component(fieldcheckbox0.$$.fragment);
    			t2 = space();
    			create_component(fieldcheckbox1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(fieldtext, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(fieldartpicker, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(fieldcheckbox0, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(fieldcheckbox1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const fieldtext_changes = {};

    			if (dirty & /*$$scope*/ 131072) {
    				fieldtext_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*input*/ 1) {
    				updating_value = true;
    				fieldtext_changes.value = /*input*/ ctx[0].name;
    				add_flush_callback(() => updating_value = false);
    			}

    			fieldtext.$set(fieldtext_changes);
    			const fieldartpicker_changes = {};

    			if (dirty & /*$$scope*/ 131072) {
    				fieldartpicker_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_1 && dirty & /*input*/ 1) {
    				updating_value_1 = true;
    				fieldartpicker_changes.value = /*input*/ ctx[0].graphic;
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			fieldartpicker.$set(fieldartpicker_changes);
    			const fieldcheckbox0_changes = {};

    			if (dirty & /*$$scope*/ 131072) {
    				fieldcheckbox0_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_checked && dirty & /*input*/ 1) {
    				updating_checked = true;
    				fieldcheckbox0_changes.checked = /*input*/ ctx[0].canWalk;
    				add_flush_callback(() => updating_checked = false);
    			}

    			fieldcheckbox0.$set(fieldcheckbox0_changes);
    			const fieldcheckbox1_changes = {};

    			if (dirty & /*$$scope*/ 131072) {
    				fieldcheckbox1_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_checked_1 && dirty & /*input*/ 1) {
    				updating_checked_1 = true;
    				fieldcheckbox1_changes.checked = /*input*/ ctx[0].canSee;
    				add_flush_callback(() => updating_checked_1 = false);
    			}

    			fieldcheckbox1.$set(fieldcheckbox1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(fieldtext.$$.fragment, local);
    			transition_in(fieldartpicker.$$.fragment, local);
    			transition_in(fieldcheckbox0.$$.fragment, local);
    			transition_in(fieldcheckbox1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(fieldtext.$$.fragment, local);
    			transition_out(fieldartpicker.$$.fragment, local);
    			transition_out(fieldcheckbox0.$$.fragment, local);
    			transition_out(fieldcheckbox1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(fieldtext, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(fieldartpicker, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(fieldcheckbox0, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(fieldcheckbox1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$5.name,
    		type: "slot",
    		source: "(10:6) <Form on:submit={save} {hasChanges}>",
    		ctx
    	});

    	return block;
    }

    // (52:10) {#if !isAdding}
    function create_if_block_1$4(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Delete";
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-danger");
    			add_location(button, file$9, 52, 12, 2877);
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
    		id: create_if_block_1$4.name,
    		type: "if",
    		source: "(52:10) {#if !isAdding}",
    		ctx
    	});

    	return block;
    }

    // (51:8) 
    function create_buttons_slot$4(ctx) {
    	let span;
    	let if_block = !/*isAdding*/ ctx[3] && create_if_block_1$4(ctx);

    	const block = {
    		c: function create() {
    			span = element("span");
    			if (if_block) if_block.c();
    			attr_dev(span, "slot", "buttons");
    			add_location(span, file$9, 50, 8, 2815);
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
    					if_block = create_if_block_1$4(ctx);
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
    		id: create_buttons_slot$4.name,
    		type: "slot",
    		source: "(51:8) ",
    		ctx
    	});

    	return block;
    }

    // (1:0) <AppLayout active="blocks">
    function create_default_slot$7(ctx) {
    	let div;
    	let itemlistnav;
    	let t;
    	let if_block_anchor;
    	let current;

    	itemlistnav = new ItemListNav({
    			props: {
    				slug: "blocks",
    				type: "block",
    				collection: /*$blocks*/ ctx[2],
    				active: /*paramId*/ ctx[1],
    				$$slots: {
    					default: [
    						create_default_slot_6$4,
    						({ item }) => ({ 16: item }),
    						({ item }) => item ? 65536 : 0
    					]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	let if_block = /*input*/ ctx[0] && create_if_block$5(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(itemlistnav.$$.fragment);
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty$1();
    			attr_dev(div, "class", "col1");
    			add_location(div, file$9, 1, 2, 31);
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
    			if (dirty & /*$blocks*/ 4) itemlistnav_changes.collection = /*$blocks*/ ctx[2];
    			if (dirty & /*paramId*/ 2) itemlistnav_changes.active = /*paramId*/ ctx[1];

    			if (dirty & /*$$scope, item*/ 196608) {
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
    					if_block = create_if_block$5(ctx);
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
    		id: create_default_slot$7.name,
    		type: "slot",
    		source: "(1:0) <AppLayout active=\\\"blocks\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
    	let applayout;
    	let current;

    	applayout = new AppLayout({
    			props: {
    				active: "blocks",
    				$$slots: { default: [create_default_slot$7] },
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

    			if (dirty & /*$$scope, hasChanges, isAdding, input, $blocks, paramId*/ 131103) {
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
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let paramId;
    	let isAdding;
    	let hasChanges;
    	let $blocks;
    	let $project;
    	validate_store(blocks, "blocks");
    	component_subscribe($$self, blocks, $$value => $$invalidate(2, $blocks = $$value));
    	validate_store(project, "project");
    	component_subscribe($$self, project, $$value => $$invalidate(12, $project = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("BlockBuilder", slots, []);
    	let { params = {} } = $$props;
    	let input = null;

    	function createDefaultInput() {
    		return {
    			projectId: $project.id,
    			name: "",
    			graphic: null,
    			canWalk: true,
    			canSee: true
    		};
    	}

    	function create() {
    		$$invalidate(0, input = createDefaultInput());
    	}

    	function edit(id) {
    		const block = $blocks.find(b => b.id === id);
    		if (block == null) return;

    		$$invalidate(0, input = {
    			...createDefaultInput(),
    			...JSON.parse(JSON.stringify(block))
    		});
    	}

    	function save() {
    		if (validator.empty(input.name)) {
    			document.getElementById("name").focus();
    			return;
    		}

    		

    		(isAdding
    		? blocks.apiInsert(input).then(item => {
    				$$invalidate(0, input = item);
    			})
    		: blocks.apiUpdate(input)).then(() => {
    			push(`/blocks/${encodeURIComponent(input.id)}`);
    		});
    	}

    	function del() {
    		if (confirm(`Are you sure you want to delete "${input.name}"?`)) {
    			blocks.apiDelete(input.projectId, input.id);
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

    	$$self.$$set = $$props => {
    		if ("params" in $$props) $$invalidate(7, params = $$props.params);
    	};

    	$$self.$capture_state = () => ({
    		project,
    		blocks,
    		push,
    		AppLayout,
    		ArtThumb,
    		FieldArtPicker,
    		FieldCheckbox,
    		FieldText,
    		Form,
    		ItemListNav,
    		validator,
    		params,
    		input,
    		createDefaultInput,
    		create,
    		edit,
    		save,
    		del,
    		paramId,
    		$blocks,
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

    		if ($$self.$$.dirty & /*paramId, $blocks*/ 6) {
    			if (paramId == "new" || $blocks != null) {
    				paramId == "new" ? create() : edit(paramId);
    			}
    		}

    		if ($$self.$$.dirty & /*input*/ 1) {
    			$$invalidate(3, isAdding = input?.id == null);
    		}

    		if ($$self.$$.dirty & /*input, $blocks*/ 5) {
    			$$invalidate(4, hasChanges = input != null && !validator.equals(input, $blocks.find(b => b.id == input.id)));
    		}
    	};

    	return [
    		input,
    		paramId,
    		$blocks,
    		isAdding,
    		hasChanges,
    		save,
    		del,
    		params,
    		fieldtext_value_binding,
    		fieldartpicker_value_binding,
    		fieldcheckbox0_checked_binding,
    		fieldcheckbox1_checked_binding
    	];
    }

    class BlockBuilder extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, { params: 7 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "BlockBuilder",
    			options,
    			id: create_fragment$a.name
    		});
    	}

    	get params() {
    		throw new Error("<BlockBuilder>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set params(value) {
    		throw new Error("<BlockBuilder>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\client\components\FieldScriptEditor.svelte generated by Svelte v3.38.3 */

    const file$8 = "src\\client\\components\\FieldScriptEditor.svelte";

    function create_fragment$9(ctx) {
    	let div;
    	let label;
    	let t0;
    	let textarea;
    	let t1;
    	let pre;
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
    			t0 = space();
    			textarea = element("textarea");
    			t1 = space();
    			pre = element("pre");
    			pre.textContent = "// Examples:\r\n// change speed:\r\nsprite.speed += 1\r\n\r\nsprite.speed = sprite.speed * sprite.speed\r\n\r\n// change size:\r\nsprite.scale.x *= 2\r\nsprite.scale.y *= 2\r\n\r\n// create text:\r\nconst text = new PIXI.Text('Your text here', { fontFamily: 'Arial', fontSize: 18, fill : 0xffffff })\r\ntext.x = -100\r\ntext.y = -50\r\nsprite.addChild(text)\r\n\r\n// turn off an effect after 5 seconds\r\nsetTimeout(() => {\r\n  sprite.speed -= 1\r\n}, 5000)";
    			attr_dev(label, "for", /*name*/ ctx[1]);
    			add_location(label, file$8, 1, 2, 28);
    			attr_dev(textarea, "name", /*name*/ ctx[1]);
    			attr_dev(textarea, "id", /*name*/ ctx[1]);
    			attr_dev(textarea, "type", "text");
    			attr_dev(textarea, "class", "form-control svelte-1xt4vs5");
    			attr_dev(textarea, "placeholder", /*placeholder*/ ctx[2]);
    			add_location(textarea, file$8, 4, 2, 76);
    			attr_dev(pre, "class", "svelte-1xt4vs5");
    			add_location(pre, file$8, 5, 2, 185);
    			attr_dev(div, "class", "form-group");
    			add_location(div, file$8, 0, 0, 0);
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

    			append_dev(div, t0);
    			append_dev(div, textarea);
    			set_input_value(textarea, /*value*/ ctx[0]);
    			/*textarea_binding*/ ctx[7](textarea);
    			append_dev(div, t1);
    			append_dev(div, pre);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[6]);
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
    				attr_dev(textarea, "name", /*name*/ ctx[1]);
    			}

    			if (!current || dirty & /*name*/ 2) {
    				attr_dev(textarea, "id", /*name*/ ctx[1]);
    			}

    			if (!current || dirty & /*placeholder*/ 4) {
    				attr_dev(textarea, "placeholder", /*placeholder*/ ctx[2]);
    			}

    			if (dirty & /*value*/ 1) {
    				set_input_value(textarea, /*value*/ ctx[0]);
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
    			/*textarea_binding*/ ctx[7](null);
    			mounted = false;
    			dispose();
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

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("FieldScriptEditor", slots, ['default']);
    	let { value = null } = $$props;
    	let { name = "text" } = $$props;
    	let { placeholder = null } = $$props;
    	let field;
    	const writable_props = ["value", "name", "placeholder"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FieldScriptEditor> was created with unknown prop '${key}'`);
    	});

    	function textarea_input_handler() {
    		value = this.value;
    		$$invalidate(0, value);
    	}

    	function textarea_binding($$value) {
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

    	$$self.$capture_state = () => ({ value, name, placeholder, field });

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
    		textarea_input_handler,
    		textarea_binding
    	];
    }

    class FieldScriptEditor extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { value: 0, name: 1, placeholder: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FieldScriptEditor",
    			options,
    			id: create_fragment$9.name
    		});
    	}

    	get value() {
    		throw new Error("<FieldScriptEditor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<FieldScriptEditor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get name() {
    		throw new Error("<FieldScriptEditor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<FieldScriptEditor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get placeholder() {
    		throw new Error("<FieldScriptEditor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set placeholder(value) {
    		throw new Error("<FieldScriptEditor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\client\pages\ItemBuilder.svelte generated by Svelte v3.38.3 */
    const file$7 = "src\\client\\pages\\ItemBuilder.svelte";

    // (3:4) <ItemListNav slug="items" type="item" collection={$items} active={paramId} let:item>
    function create_default_slot_8$1(ctx) {
    	let artthumb;
    	let t0;
    	let t1_value = /*item*/ ctx[18].name + "";
    	let t1;
    	let current;

    	artthumb = new ArtThumb({
    			props: { id: /*item*/ ctx[18].graphics.still },
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
    			if (dirty & /*item*/ 262144) artthumb_changes.id = /*item*/ ctx[18].graphics.still;
    			artthumb.$set(artthumb_changes);
    			if ((!current || dirty & /*item*/ 262144) && t1_value !== (t1_value = /*item*/ ctx[18].name + "")) set_data_dev(t1, t1_value);
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
    		id: create_default_slot_8$1.name,
    		type: "slot",
    		source: "(3:4) <ItemListNav slug=\\\"items\\\" type=\\\"item\\\" collection={$items} active={paramId} let:item>",
    		ctx
    	});

    	return block;
    }

    // (8:2) {#if input}
    function create_if_block$4(ctx) {
    	let div0;
    	let form;
    	let t0;
    	let div1;
    	let current;

    	form = new Form({
    			props: {
    				hasChanges: /*hasChanges*/ ctx[4],
    				$$slots: {
    					buttons: [create_buttons_slot$3],
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
    			create_component(form.$$.fragment);
    			t0 = space();
    			div1 = element("div");
    			div1.textContent = "Preview maybe?";
    			attr_dev(div0, "class", "grow p1");
    			add_location(div0, file$7, 8, 4, 253);
    			attr_dev(div1, "class", "col2");
    			add_location(div1, file$7, 24, 4, 1186);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			mount_component(form, div0, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const form_changes = {};
    			if (dirty & /*hasChanges*/ 16) form_changes.hasChanges = /*hasChanges*/ ctx[4];

    			if (dirty & /*$$scope, isAdding, input*/ 524297) {
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
    			if (detaching) detach_dev(div0);
    			destroy_component(form);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(8:2) {#if input}",
    		ctx
    	});

    	return block;
    }

    // (11:8) <FieldText name="name" bind:value={input.name} placeholder="Type a name...">
    function create_default_slot_7$2(ctx) {
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
    		id: create_default_slot_7$2.name,
    		type: "slot",
    		source: "(11:8) <FieldText name=\\\"name\\\" bind:value={input.name} placeholder=\\\"Type a name...\\\">",
    		ctx
    	});

    	return block;
    }

    // (12:8) <FieldArtPicker bind:value={input.graphics.still}>
    function create_default_slot_6$3(ctx) {
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
    		id: create_default_slot_6$3.name,
    		type: "slot",
    		source: "(12:8) <FieldArtPicker bind:value={input.graphics.still}>",
    		ctx
    	});

    	return block;
    }

    // (14:8) <FieldScriptEditor bind:value={input.onCollision}>
    function create_default_slot_5$3(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("onCollision(item, sprite)");
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
    		id: create_default_slot_5$3.name,
    		type: "slot",
    		source: "(14:8) <FieldScriptEditor bind:value={input.onCollision}>",
    		ctx
    	});

    	return block;
    }

    // (15:8) <FieldCheckbox bind:checked={input.removeOnCollision} name="remove-on-collision">
    function create_default_slot_4$3(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Remove on collision");
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
    		id: create_default_slot_4$3.name,
    		type: "slot",
    		source: "(15:8) <FieldCheckbox bind:checked={input.removeOnCollision} name=\\\"remove-on-collision\\\">",
    		ctx
    	});

    	return block;
    }

    // (16:8) <FieldCheckbox bind:checked={input.playersCanUse} name="players-can-use">
    function create_default_slot_3$4(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Players can use");
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
    		source: "(16:8) <FieldCheckbox bind:checked={input.playersCanUse} name=\\\"players-can-use\\\">",
    		ctx
    	});

    	return block;
    }

    // (17:8) <FieldCheckbox bind:checked={input.enemiesCanUse} name="enemies-can-use">
    function create_default_slot_2$4(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Enemies can use");
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
    		source: "(17:8) <FieldCheckbox bind:checked={input.enemiesCanUse} name=\\\"enemies-can-use\\\">",
    		ctx
    	});

    	return block;
    }

    // (10:6) <Form on:submit={save} {hasChanges}>
    function create_default_slot_1$4(ctx) {
    	let fieldtext;
    	let updating_value;
    	let t0;
    	let fieldartpicker;
    	let updating_value_1;
    	let t1;
    	let fieldscripteditor;
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
    	let current;

    	function fieldtext_value_binding(value) {
    		/*fieldtext_value_binding*/ ctx[8](value);
    	}

    	let fieldtext_props = {
    		name: "name",
    		placeholder: "Type a name...",
    		$$slots: { default: [create_default_slot_7$2] },
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
    		$$slots: { default: [create_default_slot_6$3] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].graphics.still !== void 0) {
    		fieldartpicker_props.value = /*input*/ ctx[0].graphics.still;
    	}

    	fieldartpicker = new FieldArtPicker({
    			props: fieldartpicker_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(fieldartpicker, "value", fieldartpicker_value_binding));

    	function fieldscripteditor_value_binding(value) {
    		/*fieldscripteditor_value_binding*/ ctx[10](value);
    	}

    	let fieldscripteditor_props = {
    		$$slots: { default: [create_default_slot_5$3] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].onCollision !== void 0) {
    		fieldscripteditor_props.value = /*input*/ ctx[0].onCollision;
    	}

    	fieldscripteditor = new FieldScriptEditor({
    			props: fieldscripteditor_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(fieldscripteditor, "value", fieldscripteditor_value_binding));

    	function fieldcheckbox0_checked_binding(value) {
    		/*fieldcheckbox0_checked_binding*/ ctx[11](value);
    	}

    	let fieldcheckbox0_props = {
    		name: "remove-on-collision",
    		$$slots: { default: [create_default_slot_4$3] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].removeOnCollision !== void 0) {
    		fieldcheckbox0_props.checked = /*input*/ ctx[0].removeOnCollision;
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
    		name: "players-can-use",
    		$$slots: { default: [create_default_slot_3$4] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].playersCanUse !== void 0) {
    		fieldcheckbox1_props.checked = /*input*/ ctx[0].playersCanUse;
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
    		name: "enemies-can-use",
    		$$slots: { default: [create_default_slot_2$4] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].enemiesCanUse !== void 0) {
    		fieldcheckbox2_props.checked = /*input*/ ctx[0].enemiesCanUse;
    	}

    	fieldcheckbox2 = new FieldCheckbox({
    			props: fieldcheckbox2_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(fieldcheckbox2, "checked", fieldcheckbox2_checked_binding));

    	const block = {
    		c: function create() {
    			create_component(fieldtext.$$.fragment);
    			t0 = space();
    			create_component(fieldartpicker.$$.fragment);
    			t1 = space();
    			create_component(fieldscripteditor.$$.fragment);
    			t2 = space();
    			create_component(fieldcheckbox0.$$.fragment);
    			t3 = space();
    			create_component(fieldcheckbox1.$$.fragment);
    			t4 = space();
    			create_component(fieldcheckbox2.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(fieldtext, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(fieldartpicker, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(fieldscripteditor, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(fieldcheckbox0, target, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(fieldcheckbox1, target, anchor);
    			insert_dev(target, t4, anchor);
    			mount_component(fieldcheckbox2, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const fieldtext_changes = {};

    			if (dirty & /*$$scope*/ 524288) {
    				fieldtext_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*input*/ 1) {
    				updating_value = true;
    				fieldtext_changes.value = /*input*/ ctx[0].name;
    				add_flush_callback(() => updating_value = false);
    			}

    			fieldtext.$set(fieldtext_changes);
    			const fieldartpicker_changes = {};

    			if (dirty & /*$$scope*/ 524288) {
    				fieldartpicker_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_1 && dirty & /*input*/ 1) {
    				updating_value_1 = true;
    				fieldartpicker_changes.value = /*input*/ ctx[0].graphics.still;
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			fieldartpicker.$set(fieldartpicker_changes);
    			const fieldscripteditor_changes = {};

    			if (dirty & /*$$scope*/ 524288) {
    				fieldscripteditor_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_2 && dirty & /*input*/ 1) {
    				updating_value_2 = true;
    				fieldscripteditor_changes.value = /*input*/ ctx[0].onCollision;
    				add_flush_callback(() => updating_value_2 = false);
    			}

    			fieldscripteditor.$set(fieldscripteditor_changes);
    			const fieldcheckbox0_changes = {};

    			if (dirty & /*$$scope*/ 524288) {
    				fieldcheckbox0_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_checked && dirty & /*input*/ 1) {
    				updating_checked = true;
    				fieldcheckbox0_changes.checked = /*input*/ ctx[0].removeOnCollision;
    				add_flush_callback(() => updating_checked = false);
    			}

    			fieldcheckbox0.$set(fieldcheckbox0_changes);
    			const fieldcheckbox1_changes = {};

    			if (dirty & /*$$scope*/ 524288) {
    				fieldcheckbox1_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_checked_1 && dirty & /*input*/ 1) {
    				updating_checked_1 = true;
    				fieldcheckbox1_changes.checked = /*input*/ ctx[0].playersCanUse;
    				add_flush_callback(() => updating_checked_1 = false);
    			}

    			fieldcheckbox1.$set(fieldcheckbox1_changes);
    			const fieldcheckbox2_changes = {};

    			if (dirty & /*$$scope*/ 524288) {
    				fieldcheckbox2_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_checked_2 && dirty & /*input*/ 1) {
    				updating_checked_2 = true;
    				fieldcheckbox2_changes.checked = /*input*/ ctx[0].enemiesCanUse;
    				add_flush_callback(() => updating_checked_2 = false);
    			}

    			fieldcheckbox2.$set(fieldcheckbox2_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(fieldtext.$$.fragment, local);
    			transition_in(fieldartpicker.$$.fragment, local);
    			transition_in(fieldscripteditor.$$.fragment, local);
    			transition_in(fieldcheckbox0.$$.fragment, local);
    			transition_in(fieldcheckbox1.$$.fragment, local);
    			transition_in(fieldcheckbox2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(fieldtext.$$.fragment, local);
    			transition_out(fieldartpicker.$$.fragment, local);
    			transition_out(fieldscripteditor.$$.fragment, local);
    			transition_out(fieldcheckbox0.$$.fragment, local);
    			transition_out(fieldcheckbox1.$$.fragment, local);
    			transition_out(fieldcheckbox2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(fieldtext, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(fieldartpicker, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(fieldscripteditor, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(fieldcheckbox0, detaching);
    			if (detaching) detach_dev(t3);
    			destroy_component(fieldcheckbox1, detaching);
    			if (detaching) detach_dev(t4);
    			destroy_component(fieldcheckbox2, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$4.name,
    		type: "slot",
    		source: "(10:6) <Form on:submit={save} {hasChanges}>",
    		ctx
    	});

    	return block;
    }

    // (19:10) {#if !isAdding}
    function create_if_block_1$3(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Delete";
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-danger");
    			add_location(button, file$7, 19, 12, 1044);
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
    		id: create_if_block_1$3.name,
    		type: "if",
    		source: "(19:10) {#if !isAdding}",
    		ctx
    	});

    	return block;
    }

    // (18:8) 
    function create_buttons_slot$3(ctx) {
    	let span;
    	let if_block = !/*isAdding*/ ctx[3] && create_if_block_1$3(ctx);

    	const block = {
    		c: function create() {
    			span = element("span");
    			if (if_block) if_block.c();
    			attr_dev(span, "slot", "buttons");
    			add_location(span, file$7, 17, 8, 982);
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
    					if_block = create_if_block_1$3(ctx);
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
    		id: create_buttons_slot$3.name,
    		type: "slot",
    		source: "(18:8) ",
    		ctx
    	});

    	return block;
    }

    // (1:0) <AppLayout active="items">
    function create_default_slot$6(ctx) {
    	let div;
    	let itemlistnav;
    	let t;
    	let if_block_anchor;
    	let current;

    	itemlistnav = new ItemListNav({
    			props: {
    				slug: "items",
    				type: "item",
    				collection: /*$items*/ ctx[2],
    				active: /*paramId*/ ctx[1],
    				$$slots: {
    					default: [
    						create_default_slot_8$1,
    						({ item }) => ({ 18: item }),
    						({ item }) => item ? 262144 : 0
    					]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	let if_block = /*input*/ ctx[0] && create_if_block$4(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(itemlistnav.$$.fragment);
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty$1();
    			attr_dev(div, "class", "col1");
    			add_location(div, file$7, 1, 2, 30);
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
    			if (dirty & /*$items*/ 4) itemlistnav_changes.collection = /*$items*/ ctx[2];
    			if (dirty & /*paramId*/ 2) itemlistnav_changes.active = /*paramId*/ ctx[1];

    			if (dirty & /*$$scope, item*/ 786432) {
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
    					if_block = create_if_block$4(ctx);
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
    		id: create_default_slot$6.name,
    		type: "slot",
    		source: "(1:0) <AppLayout active=\\\"items\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$8(ctx) {
    	let applayout;
    	let current;

    	applayout = new AppLayout({
    			props: {
    				active: "items",
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

    			if (dirty & /*$$scope, hasChanges, isAdding, input, $items, paramId*/ 524319) {
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

    function instance$8($$self, $$props, $$invalidate) {
    	let paramId;
    	let isAdding;
    	let hasChanges;
    	let $items;
    	let $project;
    	validate_store(items, "items");
    	component_subscribe($$self, items, $$value => $$invalidate(2, $items = $$value));
    	validate_store(project, "project");
    	component_subscribe($$self, project, $$value => $$invalidate(14, $project = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ItemBuilder", slots, []);
    	let { params = {} } = $$props;
    	let input = null;

    	function createDefaultInput() {
    		return {
    			projectId: $project.id,
    			name: "",
    			graphics: { still: null },
    			onCollision: null,
    			removeOnCollision: true,
    			playersCanUse: true,
    			enemiesCanUse: false
    		};
    	}

    	function create() {
    		$$invalidate(0, input = createDefaultInput());
    	}

    	function edit(id) {
    		const item = $items.find(i => i.id == id);
    		if (item == null) return;

    		$$invalidate(0, input = {
    			...createDefaultInput(),
    			...JSON.parse(JSON.stringify(item))
    		});
    	}

    	function save() {
    		if (validator.empty(input.name)) {
    			document.getElementById("name").focus();
    			return;
    		}

    		

    		(isAdding
    		? items.apiInsert(input).then(item => {
    				$$invalidate(0, input = item);
    			})
    		: items.apiUpdate(input)).then(() => {
    			push(`/items/${encodeURIComponent(input.id)}`);
    		});
    	}

    	function del() {
    		if (confirm(`Are you sure you want to delete "${input.name}"?`)) {
    			items.apiDelete(input.projectId, input.id);
    			push(`/items/new`);
    		}
    	}

    	const writable_props = ["params"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ItemBuilder> was created with unknown prop '${key}'`);
    	});

    	function fieldtext_value_binding(value) {
    		if ($$self.$$.not_equal(input.name, value)) {
    			input.name = value;
    			$$invalidate(0, input);
    		}
    	}

    	function fieldartpicker_value_binding(value) {
    		if ($$self.$$.not_equal(input.graphics.still, value)) {
    			input.graphics.still = value;
    			$$invalidate(0, input);
    		}
    	}

    	function fieldscripteditor_value_binding(value) {
    		if ($$self.$$.not_equal(input.onCollision, value)) {
    			input.onCollision = value;
    			$$invalidate(0, input);
    		}
    	}

    	function fieldcheckbox0_checked_binding(value) {
    		if ($$self.$$.not_equal(input.removeOnCollision, value)) {
    			input.removeOnCollision = value;
    			$$invalidate(0, input);
    		}
    	}

    	function fieldcheckbox1_checked_binding(value) {
    		if ($$self.$$.not_equal(input.playersCanUse, value)) {
    			input.playersCanUse = value;
    			$$invalidate(0, input);
    		}
    	}

    	function fieldcheckbox2_checked_binding(value) {
    		if ($$self.$$.not_equal(input.enemiesCanUse, value)) {
    			input.enemiesCanUse = value;
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
    		Form,
    		ItemListNav,
    		project,
    		items,
    		validator,
    		push,
    		FieldScriptEditor,
    		FieldCheckbox,
    		params,
    		input,
    		createDefaultInput,
    		create,
    		edit,
    		save,
    		del,
    		paramId,
    		$items,
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

    		if ($$self.$$.dirty & /*paramId, $items*/ 6) {
    			if (paramId == "new" || $items != null) {
    				paramId == "new" ? create() : edit(paramId);
    			}
    		}

    		if ($$self.$$.dirty & /*input*/ 1) {
    			$$invalidate(3, isAdding = input?.id == null);
    		}

    		if ($$self.$$.dirty & /*input, $items*/ 5) {
    			$$invalidate(4, hasChanges = input != null && !validator.equals(input, $items.find(i => i.id == input.id)));
    		}
    	};

    	return [
    		input,
    		paramId,
    		$items,
    		isAdding,
    		hasChanges,
    		save,
    		del,
    		params,
    		fieldtext_value_binding,
    		fieldartpicker_value_binding,
    		fieldscripteditor_value_binding,
    		fieldcheckbox0_checked_binding,
    		fieldcheckbox1_checked_binding,
    		fieldcheckbox2_checked_binding
    	];
    }

    class ItemBuilder extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, { params: 7 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ItemBuilder",
    			options,
    			id: create_fragment$8.name
    		});
    	}

    	get params() {
    		throw new Error("<ItemBuilder>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set params(value) {
    		throw new Error("<ItemBuilder>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\client\pages\CharacterBuilder.svelte generated by Svelte v3.38.3 */
    const file$6 = "src\\client\\pages\\CharacterBuilder.svelte";

    // (3:4) <ItemListNav slug="characters" type="character" collection={$characters} active={paramId} let:item>
    function create_default_slot_6$2(ctx) {
    	let artthumb;
    	let t0;
    	let t1_value = /*item*/ ctx[16].name + "";
    	let t1;
    	let current;

    	artthumb = new ArtThumb({
    			props: { id: /*item*/ ctx[16].graphics.still },
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
    			if (dirty & /*item*/ 65536) artthumb_changes.id = /*item*/ ctx[16].graphics.still;
    			artthumb.$set(artthumb_changes);
    			if ((!current || dirty & /*item*/ 65536) && t1_value !== (t1_value = /*item*/ ctx[16].name + "")) set_data_dev(t1, t1_value);
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
    		id: create_default_slot_6$2.name,
    		type: "slot",
    		source: "(3:4) <ItemListNav slug=\\\"characters\\\" type=\\\"character\\\" collection={$characters} active={paramId} let:item>",
    		ctx
    	});

    	return block;
    }

    // (8:2) {#if input}
    function create_if_block$3(ctx) {
    	let div0;
    	let form;
    	let t0;
    	let div1;
    	let current;

    	form = new Form({
    			props: {
    				hasChanges: /*hasChanges*/ ctx[4],
    				$$slots: {
    					buttons: [create_buttons_slot$2],
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
    			create_component(form.$$.fragment);
    			t0 = space();
    			div1 = element("div");
    			div1.textContent = "Preview maybe?";
    			attr_dev(div0, "class", "grow p1");
    			add_location(div0, file$6, 8, 4, 273);
    			attr_dev(div1, "class", "col2");
    			add_location(div1, file$6, 22, 4, 978);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			mount_component(form, div0, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const form_changes = {};
    			if (dirty & /*hasChanges*/ 16) form_changes.hasChanges = /*hasChanges*/ ctx[4];

    			if (dirty & /*$$scope, isAdding, input*/ 131081) {
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
    			if (detaching) detach_dev(div0);
    			destroy_component(form);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(8:2) {#if input}",
    		ctx
    	});

    	return block;
    }

    // (11:8) <FieldText name="name" bind:value={input.name} placeholder="Type a name...">
    function create_default_slot_5$2(ctx) {
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
    		id: create_default_slot_5$2.name,
    		type: "slot",
    		source: "(11:8) <FieldText name=\\\"name\\\" bind:value={input.name} placeholder=\\\"Type a name...\\\">",
    		ctx
    	});

    	return block;
    }

    // (12:8) <FieldNumber name="speed" bind:value={input.speed} placeholder="Speed (pixels per frame)">
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
    		source: "(12:8) <FieldNumber name=\\\"speed\\\" bind:value={input.speed} placeholder=\\\"Speed (pixels per frame)\\\">",
    		ctx
    	});

    	return block;
    }

    // (13:8) <FieldArtPicker bind:value={input.graphics.still}>
    function create_default_slot_3$3(ctx) {
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
    		id: create_default_slot_3$3.name,
    		type: "slot",
    		source: "(13:8) <FieldArtPicker bind:value={input.graphics.still}>",
    		ctx
    	});

    	return block;
    }

    // (14:8) <FieldArtPicker bind:value={input.graphics.moving}>
    function create_default_slot_2$3(ctx) {
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
    		id: create_default_slot_2$3.name,
    		type: "slot",
    		source: "(14:8) <FieldArtPicker bind:value={input.graphics.moving}>",
    		ctx
    	});

    	return block;
    }

    // (10:6) <Form on:submit={save} {hasChanges}>
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
    		$$slots: { default: [create_default_slot_5$2] },
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
    		$$slots: { default: [create_default_slot_3$3] },
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
    		$$slots: { default: [create_default_slot_2$3] },
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

    			if (dirty & /*$$scope*/ 131072) {
    				fieldtext_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*input*/ 1) {
    				updating_value = true;
    				fieldtext_changes.value = /*input*/ ctx[0].name;
    				add_flush_callback(() => updating_value = false);
    			}

    			fieldtext.$set(fieldtext_changes);
    			const fieldnumber_changes = {};

    			if (dirty & /*$$scope*/ 131072) {
    				fieldnumber_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_1 && dirty & /*input*/ 1) {
    				updating_value_1 = true;
    				fieldnumber_changes.value = /*input*/ ctx[0].speed;
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			fieldnumber.$set(fieldnumber_changes);
    			const fieldartpicker0_changes = {};

    			if (dirty & /*$$scope*/ 131072) {
    				fieldartpicker0_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_2 && dirty & /*input*/ 1) {
    				updating_value_2 = true;
    				fieldartpicker0_changes.value = /*input*/ ctx[0].graphics.still;
    				add_flush_callback(() => updating_value_2 = false);
    			}

    			fieldartpicker0.$set(fieldartpicker0_changes);
    			const fieldartpicker1_changes = {};

    			if (dirty & /*$$scope*/ 131072) {
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
    		source: "(10:6) <Form on:submit={save} {hasChanges}>",
    		ctx
    	});

    	return block;
    }

    // (17:10) {#if !isAdding}
    function create_if_block_1$2(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Delete";
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-danger");
    			add_location(button, file$6, 17, 12, 836);
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
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(17:10) {#if !isAdding}",
    		ctx
    	});

    	return block;
    }

    // (16:8) 
    function create_buttons_slot$2(ctx) {
    	let span;
    	let if_block = !/*isAdding*/ ctx[3] && create_if_block_1$2(ctx);

    	const block = {
    		c: function create() {
    			span = element("span");
    			if (if_block) if_block.c();
    			attr_dev(span, "slot", "buttons");
    			add_location(span, file$6, 15, 8, 774);
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
    					if_block = create_if_block_1$2(ctx);
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
    		source: "(16:8) ",
    		ctx
    	});

    	return block;
    }

    // (1:0) <AppLayout active="characters">
    function create_default_slot$5(ctx) {
    	let div;
    	let itemlistnav;
    	let t;
    	let if_block_anchor;
    	let current;

    	itemlistnav = new ItemListNav({
    			props: {
    				slug: "characters",
    				type: "character",
    				collection: /*$characters*/ ctx[2],
    				active: /*paramId*/ ctx[1],
    				$$slots: {
    					default: [
    						create_default_slot_6$2,
    						({ item }) => ({ 16: item }),
    						({ item }) => item ? 65536 : 0
    					]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	let if_block = /*input*/ ctx[0] && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(itemlistnav.$$.fragment);
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty$1();
    			attr_dev(div, "class", "col1");
    			add_location(div, file$6, 1, 2, 35);
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
    			if (dirty & /*$characters*/ 4) itemlistnav_changes.collection = /*$characters*/ ctx[2];
    			if (dirty & /*paramId*/ 2) itemlistnav_changes.active = /*paramId*/ ctx[1];

    			if (dirty & /*$$scope, item*/ 196608) {
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
    					if_block = create_if_block$3(ctx);
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
    		id: create_default_slot$5.name,
    		type: "slot",
    		source: "(1:0) <AppLayout active=\\\"characters\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
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

    			if (dirty & /*$$scope, hasChanges, isAdding, input, $characters, paramId*/ 131103) {
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
    	let isAdding;
    	let hasChanges;
    	let $characters;
    	let $project;
    	validate_store(characters, "characters");
    	component_subscribe($$self, characters, $$value => $$invalidate(2, $characters = $$value));
    	validate_store(project, "project");
    	component_subscribe($$self, project, $$value => $$invalidate(12, $project = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("CharacterBuilder", slots, []);
    	let { params = {} } = $$props;
    	let input = null;

    	function createDefaultInput() {
    		return {
    			projectId: $project.id,
    			name: "",
    			graphics: { still: null, moving: null },
    			abilities: []
    		};
    	}

    	function create() {
    		$$invalidate(0, input = createDefaultInput());
    	}

    	function edit(id) {
    		const character = $characters.find(c => c.id == id);
    		if (character == null) return;

    		$$invalidate(0, input = {
    			...createDefaultInput(),
    			...JSON.parse(JSON.stringify(character))
    		});
    	}

    	function save() {
    		if (validator.empty(input.name)) {
    			document.getElementById("name").focus();
    			return;
    		}

    		

    		(isAdding
    		? characters.apiInsert(input).then(item => {
    				$$invalidate(0, input = item);
    			})
    		: characters.apiUpdate(input)).then(() => {
    			push(`/characters/${encodeURIComponent(input.id)}`);
    		});
    	}

    	function del() {
    		if (confirm(`Are you sure you want to delete "${input.name}"?`)) {
    			characters.apiDelete(input.projectId, input.id);
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
    		characters,
    		validator,
    		push,
    		params,
    		input,
    		createDefaultInput,
    		create,
    		edit,
    		save,
    		del,
    		paramId,
    		$characters,
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

    		if ($$self.$$.dirty & /*paramId, $characters*/ 6) {
    			if (paramId == "new" || $characters != null) {
    				paramId == "new" ? create() : edit(paramId);
    			}
    		}

    		if ($$self.$$.dirty & /*input*/ 1) {
    			$$invalidate(3, isAdding = input?.id == null);
    		}

    		if ($$self.$$.dirty & /*input, $characters*/ 5) {
    			$$invalidate(4, hasChanges = input != null && !validator.equals(input, $characters.find(c => c.id == input.id)));
    		}
    	};

    	return [
    		input,
    		paramId,
    		$characters,
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
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { params: 7 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CharacterBuilder",
    			options,
    			id: create_fragment$7.name
    		});
    	}

    	get params() {
    		throw new Error("<CharacterBuilder>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set params(value) {
    		throw new Error("<CharacterBuilder>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\client\pages\EnemyBuilder.svelte generated by Svelte v3.38.3 */
    const file$5 = "src\\client\\pages\\EnemyBuilder.svelte";

    // (3:4) <ItemListNav slug="enemies" type="enemy" collection={$enemies} active={paramId} let:item>
    function create_default_slot_7$1(ctx) {
    	let artthumb;
    	let t0;
    	let t1_value = /*item*/ ctx[17].name + "";
    	let t1;
    	let current;

    	artthumb = new ArtThumb({
    			props: { id: /*item*/ ctx[17].graphics.still },
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
    			if (dirty & /*item*/ 131072) artthumb_changes.id = /*item*/ ctx[17].graphics.still;
    			artthumb.$set(artthumb_changes);
    			if ((!current || dirty & /*item*/ 131072) && t1_value !== (t1_value = /*item*/ ctx[17].name + "")) set_data_dev(t1, t1_value);
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
    		id: create_default_slot_7$1.name,
    		type: "slot",
    		source: "(3:4) <ItemListNav slug=\\\"enemies\\\" type=\\\"enemy\\\" collection={$enemies} active={paramId} let:item>",
    		ctx
    	});

    	return block;
    }

    // (8:2) {#if input}
    function create_if_block$2(ctx) {
    	let div0;
    	let form;
    	let t0;
    	let div1;
    	let current;

    	form = new Form({
    			props: {
    				hasChanges: /*hasChanges*/ ctx[4],
    				$$slots: {
    					buttons: [create_buttons_slot$1],
    					default: [create_default_slot_1$2]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	form.$on("submit", /*save*/ ctx[5]);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			create_component(form.$$.fragment);
    			t0 = space();
    			div1 = element("div");
    			div1.textContent = "Preview maybe?";
    			attr_dev(div0, "class", "grow p1");
    			add_location(div0, file$5, 8, 4, 260);
    			attr_dev(div1, "class", "col2");
    			add_location(div1, file$5, 23, 4, 1071);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			mount_component(form, div0, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const form_changes = {};
    			if (dirty & /*hasChanges*/ 16) form_changes.hasChanges = /*hasChanges*/ ctx[4];

    			if (dirty & /*$$scope, isAdding, input*/ 262153) {
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
    			if (detaching) detach_dev(div0);
    			destroy_component(form);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(8:2) {#if input}",
    		ctx
    	});

    	return block;
    }

    // (11:8) <FieldText name="name" bind:value={input.name} placeholder="Type a name...">
    function create_default_slot_6$1(ctx) {
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
    		id: create_default_slot_6$1.name,
    		type: "slot",
    		source: "(11:8) <FieldText name=\\\"name\\\" bind:value={input.name} placeholder=\\\"Type a name...\\\">",
    		ctx
    	});

    	return block;
    }

    // (12:8) <FieldNumber name="speed" bind:value={input.speed} placeholder="Speed (pixels per frame)">
    function create_default_slot_5$1(ctx) {
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
    		id: create_default_slot_5$1.name,
    		type: "slot",
    		source: "(12:8) <FieldNumber name=\\\"speed\\\" bind:value={input.speed} placeholder=\\\"Speed (pixels per frame)\\\">",
    		ctx
    	});

    	return block;
    }

    // (13:8) <FieldArtPicker bind:value={input.graphics.still}>
    function create_default_slot_4$1(ctx) {
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
    		id: create_default_slot_4$1.name,
    		type: "slot",
    		source: "(13:8) <FieldArtPicker bind:value={input.graphics.still}>",
    		ctx
    	});

    	return block;
    }

    // (14:8) <FieldArtPicker bind:value={input.graphics.moving}>
    function create_default_slot_3$2(ctx) {
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
    		id: create_default_slot_3$2.name,
    		type: "slot",
    		source: "(14:8) <FieldArtPicker bind:value={input.graphics.moving}>",
    		ctx
    	});

    	return block;
    }

    // (15:8) <FieldNumber name="max-range" bind:value={input.sightRadius}>
    function create_default_slot_2$2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Sight radius (pixels)");
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
    		source: "(15:8) <FieldNumber name=\\\"max-range\\\" bind:value={input.sightRadius}>",
    		ctx
    	});

    	return block;
    }

    // (10:6) <Form on:submit={save} {hasChanges}>
    function create_default_slot_1$2(ctx) {
    	let fieldtext;
    	let updating_value;
    	let t0;
    	let fieldnumber0;
    	let updating_value_1;
    	let t1;
    	let fieldartpicker0;
    	let updating_value_2;
    	let t2;
    	let fieldartpicker1;
    	let updating_value_3;
    	let t3;
    	let fieldnumber1;
    	let updating_value_4;
    	let current;

    	function fieldtext_value_binding(value) {
    		/*fieldtext_value_binding*/ ctx[8](value);
    	}

    	let fieldtext_props = {
    		name: "name",
    		placeholder: "Type a name...",
    		$$slots: { default: [create_default_slot_6$1] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].name !== void 0) {
    		fieldtext_props.value = /*input*/ ctx[0].name;
    	}

    	fieldtext = new FieldText({ props: fieldtext_props, $$inline: true });
    	binding_callbacks.push(() => bind(fieldtext, "value", fieldtext_value_binding));

    	function fieldnumber0_value_binding(value) {
    		/*fieldnumber0_value_binding*/ ctx[9](value);
    	}

    	let fieldnumber0_props = {
    		name: "speed",
    		placeholder: "Speed (pixels per frame)",
    		$$slots: { default: [create_default_slot_5$1] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].speed !== void 0) {
    		fieldnumber0_props.value = /*input*/ ctx[0].speed;
    	}

    	fieldnumber0 = new FieldNumber({
    			props: fieldnumber0_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(fieldnumber0, "value", fieldnumber0_value_binding));

    	function fieldartpicker0_value_binding(value) {
    		/*fieldartpicker0_value_binding*/ ctx[10](value);
    	}

    	let fieldartpicker0_props = {
    		$$slots: { default: [create_default_slot_4$1] },
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
    		$$slots: { default: [create_default_slot_3$2] },
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

    	function fieldnumber1_value_binding(value) {
    		/*fieldnumber1_value_binding*/ ctx[12](value);
    	}

    	let fieldnumber1_props = {
    		name: "max-range",
    		$$slots: { default: [create_default_slot_2$2] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].sightRadius !== void 0) {
    		fieldnumber1_props.value = /*input*/ ctx[0].sightRadius;
    	}

    	fieldnumber1 = new FieldNumber({
    			props: fieldnumber1_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(fieldnumber1, "value", fieldnumber1_value_binding));

    	const block = {
    		c: function create() {
    			create_component(fieldtext.$$.fragment);
    			t0 = space();
    			create_component(fieldnumber0.$$.fragment);
    			t1 = space();
    			create_component(fieldartpicker0.$$.fragment);
    			t2 = space();
    			create_component(fieldartpicker1.$$.fragment);
    			t3 = space();
    			create_component(fieldnumber1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(fieldtext, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(fieldnumber0, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(fieldartpicker0, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(fieldartpicker1, target, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(fieldnumber1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const fieldtext_changes = {};

    			if (dirty & /*$$scope*/ 262144) {
    				fieldtext_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*input*/ 1) {
    				updating_value = true;
    				fieldtext_changes.value = /*input*/ ctx[0].name;
    				add_flush_callback(() => updating_value = false);
    			}

    			fieldtext.$set(fieldtext_changes);
    			const fieldnumber0_changes = {};

    			if (dirty & /*$$scope*/ 262144) {
    				fieldnumber0_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_1 && dirty & /*input*/ 1) {
    				updating_value_1 = true;
    				fieldnumber0_changes.value = /*input*/ ctx[0].speed;
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			fieldnumber0.$set(fieldnumber0_changes);
    			const fieldartpicker0_changes = {};

    			if (dirty & /*$$scope*/ 262144) {
    				fieldartpicker0_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_2 && dirty & /*input*/ 1) {
    				updating_value_2 = true;
    				fieldartpicker0_changes.value = /*input*/ ctx[0].graphics.still;
    				add_flush_callback(() => updating_value_2 = false);
    			}

    			fieldartpicker0.$set(fieldartpicker0_changes);
    			const fieldartpicker1_changes = {};

    			if (dirty & /*$$scope*/ 262144) {
    				fieldartpicker1_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_3 && dirty & /*input*/ 1) {
    				updating_value_3 = true;
    				fieldartpicker1_changes.value = /*input*/ ctx[0].graphics.moving;
    				add_flush_callback(() => updating_value_3 = false);
    			}

    			fieldartpicker1.$set(fieldartpicker1_changes);
    			const fieldnumber1_changes = {};

    			if (dirty & /*$$scope*/ 262144) {
    				fieldnumber1_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_4 && dirty & /*input*/ 1) {
    				updating_value_4 = true;
    				fieldnumber1_changes.value = /*input*/ ctx[0].sightRadius;
    				add_flush_callback(() => updating_value_4 = false);
    			}

    			fieldnumber1.$set(fieldnumber1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(fieldtext.$$.fragment, local);
    			transition_in(fieldnumber0.$$.fragment, local);
    			transition_in(fieldartpicker0.$$.fragment, local);
    			transition_in(fieldartpicker1.$$.fragment, local);
    			transition_in(fieldnumber1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(fieldtext.$$.fragment, local);
    			transition_out(fieldnumber0.$$.fragment, local);
    			transition_out(fieldartpicker0.$$.fragment, local);
    			transition_out(fieldartpicker1.$$.fragment, local);
    			transition_out(fieldnumber1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(fieldtext, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(fieldnumber0, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(fieldartpicker0, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(fieldartpicker1, detaching);
    			if (detaching) detach_dev(t3);
    			destroy_component(fieldnumber1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$2.name,
    		type: "slot",
    		source: "(10:6) <Form on:submit={save} {hasChanges}>",
    		ctx
    	});

    	return block;
    }

    // (18:10) {#if !isAdding}
    function create_if_block_1$1(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Delete";
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-danger");
    			add_location(button, file$5, 18, 12, 929);
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
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(18:10) {#if !isAdding}",
    		ctx
    	});

    	return block;
    }

    // (17:8) 
    function create_buttons_slot$1(ctx) {
    	let span;
    	let if_block = !/*isAdding*/ ctx[3] && create_if_block_1$1(ctx);

    	const block = {
    		c: function create() {
    			span = element("span");
    			if (if_block) if_block.c();
    			attr_dev(span, "slot", "buttons");
    			add_location(span, file$5, 16, 8, 867);
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
    					if_block = create_if_block_1$1(ctx);
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
    		source: "(17:8) ",
    		ctx
    	});

    	return block;
    }

    // (1:0) <AppLayout active="enemies">
    function create_default_slot$4(ctx) {
    	let div;
    	let itemlistnav;
    	let t;
    	let if_block_anchor;
    	let current;

    	itemlistnav = new ItemListNav({
    			props: {
    				slug: "enemies",
    				type: "enemy",
    				collection: /*$enemies*/ ctx[2],
    				active: /*paramId*/ ctx[1],
    				$$slots: {
    					default: [
    						create_default_slot_7$1,
    						({ item }) => ({ 17: item }),
    						({ item }) => item ? 131072 : 0
    					]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	let if_block = /*input*/ ctx[0] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(itemlistnav.$$.fragment);
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty$1();
    			attr_dev(div, "class", "col1");
    			add_location(div, file$5, 1, 2, 32);
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
    			if (dirty & /*$enemies*/ 4) itemlistnav_changes.collection = /*$enemies*/ ctx[2];
    			if (dirty & /*paramId*/ 2) itemlistnav_changes.active = /*paramId*/ ctx[1];

    			if (dirty & /*$$scope, item*/ 393216) {
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
    					if_block = create_if_block$2(ctx);
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
    		id: create_default_slot$4.name,
    		type: "slot",
    		source: "(1:0) <AppLayout active=\\\"enemies\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
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

    			if (dirty & /*$$scope, hasChanges, isAdding, input, $enemies, paramId*/ 262175) {
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
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let paramId;
    	let isAdding;
    	let hasChanges;
    	let $enemies;
    	let $project;
    	validate_store(enemies, "enemies");
    	component_subscribe($$self, enemies, $$value => $$invalidate(2, $enemies = $$value));
    	validate_store(project, "project");
    	component_subscribe($$self, project, $$value => $$invalidate(13, $project = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("EnemyBuilder", slots, []);
    	let { params = {} } = $$props;
    	let input = null;

    	function createDefaultInput() {
    		return {
    			projectId: $project.id,
    			name: "",
    			graphics: { still: null, moving: null },
    			abilities: [],
    			sightRadius: 150
    		};
    	}

    	function create() {
    		$$invalidate(0, input = createDefaultInput());
    	}

    	function edit(id) {
    		const enemy = $enemies.find(e => e.id == id);
    		if (enemy == null) return;

    		$$invalidate(0, input = {
    			...createDefaultInput(),
    			...JSON.parse(JSON.stringify(enemy))
    		});
    	}

    	function save() {
    		if (validator.empty(input.name)) {
    			document.getElementById("name").focus();
    			return;
    		}

    		

    		(isAdding
    		? enemies.apiInsert(input).then(item => {
    				$$invalidate(0, input = item);
    			})
    		: enemies.apiUpdate(input)).then(() => {
    			push(`/enemies/${encodeURIComponent(input.id)}`);
    		});
    	}

    	function del() {
    		if (confirm(`Are you sure you want to delete "${input.name}"?`)) {
    			enemies.apiDelete(input.projectId, input.id);
    			push(`/enemies/new`);
    		}
    	}

    	const writable_props = ["params"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<EnemyBuilder> was created with unknown prop '${key}'`);
    	});

    	function fieldtext_value_binding(value) {
    		if ($$self.$$.not_equal(input.name, value)) {
    			input.name = value;
    			$$invalidate(0, input);
    		}
    	}

    	function fieldnumber0_value_binding(value) {
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

    	function fieldnumber1_value_binding(value) {
    		if ($$self.$$.not_equal(input.sightRadius, value)) {
    			input.sightRadius = value;
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
    		enemies,
    		validator,
    		push,
    		params,
    		input,
    		createDefaultInput,
    		create,
    		edit,
    		save,
    		del,
    		paramId,
    		$enemies,
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

    		if ($$self.$$.dirty & /*paramId, $enemies*/ 6) {
    			if (paramId == "new" || $enemies != null) {
    				paramId == "new" ? create() : edit(paramId);
    			}
    		}

    		if ($$self.$$.dirty & /*input*/ 1) {
    			$$invalidate(3, isAdding = input?.id == null);
    		}

    		if ($$self.$$.dirty & /*input, $enemies*/ 5) {
    			$$invalidate(4, hasChanges = input != null && !validator.equals(input, $enemies.find(e => e.id == input.id)));
    		}
    	};

    	return [
    		input,
    		paramId,
    		$enemies,
    		isAdding,
    		hasChanges,
    		save,
    		del,
    		params,
    		fieldtext_value_binding,
    		fieldnumber0_value_binding,
    		fieldartpicker0_value_binding,
    		fieldartpicker1_value_binding,
    		fieldnumber1_value_binding
    	];
    }

    class EnemyBuilder extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { params: 7 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "EnemyBuilder",
    			options,
    			id: create_fragment$6.name
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

    function makeArtSprite(art) {
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
        const sprite = new PIXI.Sprite(texture);
        return sprite
      }
    }

    class LivingSprite extends PIXI.Container {
      constructor(graphics, config, x, y, levelGrid, showPaths) {
        super();
        this.x = x;
        this.y = y;

        this.sortableChildren = true;
        this.config = config;
        this.speed = config.speed; // so events can modify without affecting config

        this.sprites = new PIXI.Container();
        this.sprites.zIndex = 2;
        this.addChild(this.sprites);
        this.sprites.still = makeArtSprite(graphics.still);
        this.sprites.still.anchor.set(0.5);
        this.sprites.addChild(this.sprites.still);
        this.sprites.moving = makeArtSprite(graphics.moving);
        this.sprites.moving.anchor.set(0.5);
        this.sprites.moving.visible = false;
        this.sprites.addChild(this.sprites.moving);

        this.isMoving = false;

        this.path = [];
        this.target = null;
        this.zIndex = 2;

        this.levelGrid = levelGrid;
        this.showPaths = showPaths;
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
        this.sprites.still.visible = !isMoving;
        this.sprites.moving.visible = isMoving;
      }

      canSee(target) {
        // check distance between ourself and target
        // a^2 + b^2 = c^2
        // a = distance in x
        const a = this.x - target.x;

        // b = distance in y
        const b = this.y - target.y;

        // c = distance in straight line from x1,y1 to x2,y2
        const c = Math.sqrt(a * a + b * b);

        // check if we can find a visible path to target
        return c <= this.config.sightRadius && this.levelGrid.canSee(this.position, target)
      }

      clearPathAfterCurrentTarget() {
        this.path = [];
      }

      setTarget(target) {
        if (target == null) {
          this.path = [];
          this.target = null;
          this.endTarget = null;
          return
        }
        if (target.x == this.x && target.y == this.y) return
        // don't recompute path if target position hasn't changed
        // if (this.endTarget?.x == target.x && this.endTarget?.y == target.y) return
        this.endTarget = target;

        // make it compute a path around any blocks in the way
        // if no path available, get as close as possible to clicked point
        this.path = this.levelGrid.findPath(this.position, target);

        this.targetNextPathPoint();
      }

      targetNextPathPoint() {
        this.target = this.path.shift();
        if (this.target == null) this.endTarget = null;
        else {
          this.sprites.rotation = Math.atan2(this.target.y - this.y, this.target.x - this.x) + (90 * Math.PI) / 180;
        }
      }

      setTint(tint) {
        this.sprites.still.tint = tint;
        this.sprites.moving.tint = tint;
      }

      onTick() {
        this.moveTowardTarget();
      }

      moveTowardTarget() {
        if (this.target == null && this.path.length) {
          this.targetNextPathPoint();
        }

        this.drawPathLine();

        if (this.target) {
          // change to moving texture
          this.setMoving(true);

          // move player toward target
          const run = this.target.x - this.x;
          const rise = this.target.y - this.y;
          const length = Math.sqrt(rise * rise + run * run);
          let xChange = (run / length) * this.speed;
          let yChange = (rise / length) * this.speed;
          if (isNaN(xChange)) xChange = 0;
          if (isNaN(yChange)) yChange = 0;

          // change player position
          const canHitTargetX = Math.abs(this.target.x - this.x) <= xChange;
          const canHitTargetY = Math.abs(this.target.y - this.y) <= yChange;
          this.x = canHitTargetX ? this.target.x : this.x + xChange;
          this.y = canHitTargetY ? this.target.y : this.y + yChange;

          // if we hit our target on this frame, start moving toward the next target
          if (canHitTargetX && canHitTargetY) this.targetNextPathPoint();
        } else {
          this.setMoving(false);
        }
      }

      drawPathLine() {
        if (!this.showPaths) return

        if (this.pathLine == null) {
          this.pathLine = new PIXI.Graphics();
          this.pathLine.x = 0;
          this.pathLine.y = 0;
          this.pathLine.zIndex = 1;
          this.parent.addChild(this.pathLine);
        } else {
          this.pathLine.clear();
        }

        if (this.target == null) return

        this.pathLine.moveTo(this.x, this.y);

        // line to current target
        this.pathLine.lineStyle(5, 0xffffff, 0.5);
        this.pathLine.lineTo(this.target.x, this.target.y);
        this.pathLine.drawCircle(this.target.x, this.target.y, 5);

        // line to each subsequent target
        this.pathLine.lineStyle(5, 0xffffff, 0.3);
        this.path.forEach(p => {
          this.pathLine.lineTo(p.x, p.y);
          this.pathLine.drawCircle(p.x, p.y, 5);
        });
      }
    }

    class Player extends LivingSprite {
      constructor(player, config, x, y, levelGrid, showPaths) {
        super(player, config, x, y, levelGrid, showPaths);
      }
    }

    class Enemy extends LivingSprite {
      constructor(graphics, config, x, y, levelGrid, showPaths, showSightRadius) {
        super(graphics, config, x, y, levelGrid, showPaths);

        // render a little sight radius circle
        if (showSightRadius) {
          this.radiusPreview = new PIXI.Graphics();
          this.radiusPreview.beginFill(0xff0000, 0.2);
          // radiusPreview.lineStyle(2, 0xffffff, 0.5)
          this.radiusPreview.drawCircle(0, 0, config.sightRadius ?? 150);
          this.radiusPreview.zIndex = 1;
          this.addChild(this.radiusPreview);
        }
      }
    }

    class Block extends PIXI.Sprite {
      constructor(block, art, { id, x, y }, gridSize) {
        super(PIXI.Texture.from(art.png));

        this.x = x * gridSize;
        this.y = y * gridSize;
      }
    }

    class Item extends PIXI.Sprite {
      constructor(itemConfig, art, { id, x, y }, gridSize) {
        super(PIXI.Texture.from(art.png));

        this.config = itemConfig;

        this.x = x * gridSize + gridSize / 4;
        this.y = y * gridSize + gridSize / 4;

        // run our item.config.onCollision code
        const customOnCollisionHandler = Function('item', 'sprite', itemConfig.onCollision);
        this.onCollision = sprite => customOnCollisionHandler(this, sprite);
      }
    }

    var heap$1 = createCommonjsModule(function (module) {
    // Generated by CoffeeScript 1.8.0
    (function() {
      var Heap, defaultCmp, floor, heapify, heappop, heappush, heappushpop, heapreplace, insort, min, nlargest, nsmallest, updateItem, _siftdown, _siftup;

      floor = Math.floor, min = Math.min;


      /*
      Default comparison function to be used
       */

      defaultCmp = function(x, y) {
        if (x < y) {
          return -1;
        }
        if (x > y) {
          return 1;
        }
        return 0;
      };


      /*
      Insert item x in list a, and keep it sorted assuming a is sorted.
      
      If x is already in a, insert it to the right of the rightmost x.
      
      Optional args lo (default 0) and hi (default a.length) bound the slice
      of a to be searched.
       */

      insort = function(a, x, lo, hi, cmp) {
        var mid;
        if (lo == null) {
          lo = 0;
        }
        if (cmp == null) {
          cmp = defaultCmp;
        }
        if (lo < 0) {
          throw new Error('lo must be non-negative');
        }
        if (hi == null) {
          hi = a.length;
        }
        while (lo < hi) {
          mid = floor((lo + hi) / 2);
          if (cmp(x, a[mid]) < 0) {
            hi = mid;
          } else {
            lo = mid + 1;
          }
        }
        return ([].splice.apply(a, [lo, lo - lo].concat(x)), x);
      };


      /*
      Push item onto heap, maintaining the heap invariant.
       */

      heappush = function(array, item, cmp) {
        if (cmp == null) {
          cmp = defaultCmp;
        }
        array.push(item);
        return _siftdown(array, 0, array.length - 1, cmp);
      };


      /*
      Pop the smallest item off the heap, maintaining the heap invariant.
       */

      heappop = function(array, cmp) {
        var lastelt, returnitem;
        if (cmp == null) {
          cmp = defaultCmp;
        }
        lastelt = array.pop();
        if (array.length) {
          returnitem = array[0];
          array[0] = lastelt;
          _siftup(array, 0, cmp);
        } else {
          returnitem = lastelt;
        }
        return returnitem;
      };


      /*
      Pop and return the current smallest value, and add the new item.
      
      This is more efficient than heappop() followed by heappush(), and can be
      more appropriate when using a fixed size heap. Note that the value
      returned may be larger than item! That constrains reasonable use of
      this routine unless written as part of a conditional replacement:
          if item > array[0]
            item = heapreplace(array, item)
       */

      heapreplace = function(array, item, cmp) {
        var returnitem;
        if (cmp == null) {
          cmp = defaultCmp;
        }
        returnitem = array[0];
        array[0] = item;
        _siftup(array, 0, cmp);
        return returnitem;
      };


      /*
      Fast version of a heappush followed by a heappop.
       */

      heappushpop = function(array, item, cmp) {
        var _ref;
        if (cmp == null) {
          cmp = defaultCmp;
        }
        if (array.length && cmp(array[0], item) < 0) {
          _ref = [array[0], item], item = _ref[0], array[0] = _ref[1];
          _siftup(array, 0, cmp);
        }
        return item;
      };


      /*
      Transform list into a heap, in-place, in O(array.length) time.
       */

      heapify = function(array, cmp) {
        var i, _i, _len, _ref1, _results, _results1;
        if (cmp == null) {
          cmp = defaultCmp;
        }
        _ref1 = (function() {
          _results1 = [];
          for (var _j = 0, _ref = floor(array.length / 2); 0 <= _ref ? _j < _ref : _j > _ref; 0 <= _ref ? _j++ : _j--){ _results1.push(_j); }
          return _results1;
        }).apply(this).reverse();
        _results = [];
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          i = _ref1[_i];
          _results.push(_siftup(array, i, cmp));
        }
        return _results;
      };


      /*
      Update the position of the given item in the heap.
      This function should be called every time the item is being modified.
       */

      updateItem = function(array, item, cmp) {
        var pos;
        if (cmp == null) {
          cmp = defaultCmp;
        }
        pos = array.indexOf(item);
        if (pos === -1) {
          return;
        }
        _siftdown(array, 0, pos, cmp);
        return _siftup(array, pos, cmp);
      };


      /*
      Find the n largest elements in a dataset.
       */

      nlargest = function(array, n, cmp) {
        var elem, result, _i, _len, _ref;
        if (cmp == null) {
          cmp = defaultCmp;
        }
        result = array.slice(0, n);
        if (!result.length) {
          return result;
        }
        heapify(result, cmp);
        _ref = array.slice(n);
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          elem = _ref[_i];
          heappushpop(result, elem, cmp);
        }
        return result.sort(cmp).reverse();
      };


      /*
      Find the n smallest elements in a dataset.
       */

      nsmallest = function(array, n, cmp) {
        var elem, los, result, _i, _j, _len, _ref, _ref1, _results;
        if (cmp == null) {
          cmp = defaultCmp;
        }
        if (n * 10 <= array.length) {
          result = array.slice(0, n).sort(cmp);
          if (!result.length) {
            return result;
          }
          los = result[result.length - 1];
          _ref = array.slice(n);
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            elem = _ref[_i];
            if (cmp(elem, los) < 0) {
              insort(result, elem, 0, null, cmp);
              result.pop();
              los = result[result.length - 1];
            }
          }
          return result;
        }
        heapify(array, cmp);
        _results = [];
        for (_j = 0, _ref1 = min(n, array.length); 0 <= _ref1 ? _j < _ref1 : _j > _ref1; 0 <= _ref1 ? ++_j : --_j) {
          _results.push(heappop(array, cmp));
        }
        return _results;
      };

      _siftdown = function(array, startpos, pos, cmp) {
        var newitem, parent, parentpos;
        if (cmp == null) {
          cmp = defaultCmp;
        }
        newitem = array[pos];
        while (pos > startpos) {
          parentpos = (pos - 1) >> 1;
          parent = array[parentpos];
          if (cmp(newitem, parent) < 0) {
            array[pos] = parent;
            pos = parentpos;
            continue;
          }
          break;
        }
        return array[pos] = newitem;
      };

      _siftup = function(array, pos, cmp) {
        var childpos, endpos, newitem, rightpos, startpos;
        if (cmp == null) {
          cmp = defaultCmp;
        }
        endpos = array.length;
        startpos = pos;
        newitem = array[pos];
        childpos = 2 * pos + 1;
        while (childpos < endpos) {
          rightpos = childpos + 1;
          if (rightpos < endpos && !(cmp(array[childpos], array[rightpos]) < 0)) {
            childpos = rightpos;
          }
          array[pos] = array[childpos];
          pos = childpos;
          childpos = 2 * pos + 1;
        }
        array[pos] = newitem;
        return _siftdown(array, startpos, pos, cmp);
      };

      Heap = (function() {
        Heap.push = heappush;

        Heap.pop = heappop;

        Heap.replace = heapreplace;

        Heap.pushpop = heappushpop;

        Heap.heapify = heapify;

        Heap.updateItem = updateItem;

        Heap.nlargest = nlargest;

        Heap.nsmallest = nsmallest;

        function Heap(cmp) {
          this.cmp = cmp != null ? cmp : defaultCmp;
          this.nodes = [];
        }

        Heap.prototype.push = function(x) {
          return heappush(this.nodes, x, this.cmp);
        };

        Heap.prototype.pop = function() {
          return heappop(this.nodes, this.cmp);
        };

        Heap.prototype.peek = function() {
          return this.nodes[0];
        };

        Heap.prototype.contains = function(x) {
          return this.nodes.indexOf(x) !== -1;
        };

        Heap.prototype.replace = function(x) {
          return heapreplace(this.nodes, x, this.cmp);
        };

        Heap.prototype.pushpop = function(x) {
          return heappushpop(this.nodes, x, this.cmp);
        };

        Heap.prototype.heapify = function() {
          return heapify(this.nodes, this.cmp);
        };

        Heap.prototype.updateItem = function(x) {
          return updateItem(this.nodes, x, this.cmp);
        };

        Heap.prototype.clear = function() {
          return this.nodes = [];
        };

        Heap.prototype.empty = function() {
          return this.nodes.length === 0;
        };

        Heap.prototype.size = function() {
          return this.nodes.length;
        };

        Heap.prototype.clone = function() {
          var heap;
          heap = new Heap();
          heap.nodes = this.nodes.slice(0);
          return heap;
        };

        Heap.prototype.toArray = function() {
          return this.nodes.slice(0);
        };

        Heap.prototype.insert = Heap.prototype.push;

        Heap.prototype.top = Heap.prototype.peek;

        Heap.prototype.front = Heap.prototype.peek;

        Heap.prototype.has = Heap.prototype.contains;

        Heap.prototype.copy = Heap.prototype.clone;

        return Heap;

      })();

      if (module !== null ? module.exports : void 0) {
        module.exports = Heap;
      } else {
        window.Heap = Heap;
      }

    }).call(commonjsGlobal);
    });

    var heap = heap$1;

    /**
     * A node in grid. 
     * This class holds some basic information about a node and custom 
     * attributes may be added, depending on the algorithms' needs.
     * @constructor
     * @param {number} x - The x coordinate of the node on the grid.
     * @param {number} y - The y coordinate of the node on the grid.
     * @param {boolean} [walkable] - Whether this node is walkable.
     */
    function Node(x, y, walkable) {
        /**
         * The x coordinate of the node on the grid.
         * @type number
         */
        this.x = x;
        /**
         * The y coordinate of the node on the grid.
         * @type number
         */
        this.y = y;
        /**
         * Whether this node can be walked through.
         * @type boolean
         */
        this.walkable = (walkable === undefined ? true : walkable);
    }

    var Node_1 = Node;

    var DiagonalMovement = {
        Always: 1,
        Never: 2,
        IfAtMostOneObstacle: 3,
        OnlyWhenNoObstacles: 4
    };

    var DiagonalMovement_1 = DiagonalMovement;

    /**
     * The Grid class, which serves as the encapsulation of the layout of the nodes.
     * @constructor
     * @param {number|Array<Array<(number|boolean)>>} width_or_matrix Number of columns of the grid, or matrix
     * @param {number} height Number of rows of the grid.
     * @param {Array<Array<(number|boolean)>>} [matrix] - A 0-1 matrix
     *     representing the walkable status of the nodes(0 or false for walkable).
     *     If the matrix is not supplied, all the nodes will be walkable.  */
    function Grid(width_or_matrix, height, matrix) {
        var width;

        if (typeof width_or_matrix !== 'object') {
            width = width_or_matrix;
        } else {
            height = width_or_matrix.length;
            width = width_or_matrix[0].length;
            matrix = width_or_matrix;
        }

        /**
         * The number of columns of the grid.
         * @type number
         */
        this.width = width;
        /**
         * The number of rows of the grid.
         * @type number
         */
        this.height = height;

        /**
         * A 2D array of nodes.
         */
        this.nodes = this._buildNodes(width, height, matrix);
    }

    /**
     * Build and return the nodes.
     * @private
     * @param {number} width
     * @param {number} height
     * @param {Array<Array<number|boolean>>} [matrix] - A 0-1 matrix representing
     *     the walkable status of the nodes.
     * @see Grid
     */
    Grid.prototype._buildNodes = function(width, height, matrix) {
        var i, j,
            nodes = new Array(height);

        for (i = 0; i < height; ++i) {
            nodes[i] = new Array(width);
            for (j = 0; j < width; ++j) {
                nodes[i][j] = new Node_1(j, i);
            }
        }


        if (matrix === undefined) {
            return nodes;
        }

        if (matrix.length !== height || matrix[0].length !== width) {
            throw new Error('Matrix size does not fit');
        }

        for (i = 0; i < height; ++i) {
            for (j = 0; j < width; ++j) {
                if (matrix[i][j]) {
                    // 0, false, null will be walkable
                    // while others will be un-walkable
                    nodes[i][j].walkable = false;
                }
            }
        }

        return nodes;
    };


    Grid.prototype.getNodeAt = function(x, y) {
        return this.nodes[y][x];
    };


    /**
     * Determine whether the node at the given position is walkable.
     * (Also returns false if the position is outside the grid.)
     * @param {number} x - The x coordinate of the node.
     * @param {number} y - The y coordinate of the node.
     * @return {boolean} - The walkability of the node.
     */
    Grid.prototype.isWalkableAt = function(x, y) {
        return this.isInside(x, y) && this.nodes[y][x].walkable;
    };


    /**
     * Determine whether the position is inside the grid.
     * XXX: `grid.isInside(x, y)` is wierd to read.
     * It should be `(x, y) is inside grid`, but I failed to find a better
     * name for this method.
     * @param {number} x
     * @param {number} y
     * @return {boolean}
     */
    Grid.prototype.isInside = function(x, y) {
        return (x >= 0 && x < this.width) && (y >= 0 && y < this.height);
    };


    /**
     * Set whether the node on the given position is walkable.
     * NOTE: throws exception if the coordinate is not inside the grid.
     * @param {number} x - The x coordinate of the node.
     * @param {number} y - The y coordinate of the node.
     * @param {boolean} walkable - Whether the position is walkable.
     */
    Grid.prototype.setWalkableAt = function(x, y, walkable) {
        this.nodes[y][x].walkable = walkable;
    };


    /**
     * Get the neighbors of the given node.
     *
     *     offsets      diagonalOffsets:
     *  +---+---+---+    +---+---+---+
     *  |   | 0 |   |    | 0 |   | 1 |
     *  +---+---+---+    +---+---+---+
     *  | 3 |   | 1 |    |   |   |   |
     *  +---+---+---+    +---+---+---+
     *  |   | 2 |   |    | 3 |   | 2 |
     *  +---+---+---+    +---+---+---+
     *
     *  When allowDiagonal is true, if offsets[i] is valid, then
     *  diagonalOffsets[i] and
     *  diagonalOffsets[(i + 1) % 4] is valid.
     * @param {Node} node
     * @param {DiagonalMovement} diagonalMovement
     */
    Grid.prototype.getNeighbors = function(node, diagonalMovement) {
        var x = node.x,
            y = node.y,
            neighbors = [],
            s0 = false, d0 = false,
            s1 = false, d1 = false,
            s2 = false, d2 = false,
            s3 = false, d3 = false,
            nodes = this.nodes;

        // ↑
        if (this.isWalkableAt(x, y - 1)) {
            neighbors.push(nodes[y - 1][x]);
            s0 = true;
        }
        // →
        if (this.isWalkableAt(x + 1, y)) {
            neighbors.push(nodes[y][x + 1]);
            s1 = true;
        }
        // ↓
        if (this.isWalkableAt(x, y + 1)) {
            neighbors.push(nodes[y + 1][x]);
            s2 = true;
        }
        // ←
        if (this.isWalkableAt(x - 1, y)) {
            neighbors.push(nodes[y][x - 1]);
            s3 = true;
        }

        if (diagonalMovement === DiagonalMovement_1.Never) {
            return neighbors;
        }

        if (diagonalMovement === DiagonalMovement_1.OnlyWhenNoObstacles) {
            d0 = s3 && s0;
            d1 = s0 && s1;
            d2 = s1 && s2;
            d3 = s2 && s3;
        } else if (diagonalMovement === DiagonalMovement_1.IfAtMostOneObstacle) {
            d0 = s3 || s0;
            d1 = s0 || s1;
            d2 = s1 || s2;
            d3 = s2 || s3;
        } else if (diagonalMovement === DiagonalMovement_1.Always) {
            d0 = true;
            d1 = true;
            d2 = true;
            d3 = true;
        } else {
            throw new Error('Incorrect value of diagonalMovement');
        }

        // ↖
        if (d0 && this.isWalkableAt(x - 1, y - 1)) {
            neighbors.push(nodes[y - 1][x - 1]);
        }
        // ↗
        if (d1 && this.isWalkableAt(x + 1, y - 1)) {
            neighbors.push(nodes[y - 1][x + 1]);
        }
        // ↘
        if (d2 && this.isWalkableAt(x + 1, y + 1)) {
            neighbors.push(nodes[y + 1][x + 1]);
        }
        // ↙
        if (d3 && this.isWalkableAt(x - 1, y + 1)) {
            neighbors.push(nodes[y + 1][x - 1]);
        }

        return neighbors;
    };


    /**
     * Get a clone of this grid.
     * @return {Grid} Cloned grid.
     */
    Grid.prototype.clone = function() {
        var i, j,

            width = this.width,
            height = this.height,
            thisNodes = this.nodes,

            newGrid = new Grid(width, height),
            newNodes = new Array(height);

        for (i = 0; i < height; ++i) {
            newNodes[i] = new Array(width);
            for (j = 0; j < width; ++j) {
                newNodes[i][j] = new Node_1(j, i, thisNodes[i][j].walkable);
            }
        }

        newGrid.nodes = newNodes;

        return newGrid;
    };

    var Grid_1 = Grid;

    /**
     * Backtrace according to the parent records and return the path.
     * (including both start and end nodes)
     * @param {Node} node End node
     * @return {Array<Array<number>>} the path
     */
    function backtrace(node) {
        var path = [[node.x, node.y]];
        while (node.parent) {
            node = node.parent;
            path.push([node.x, node.y]);
        }
        return path.reverse();
    }
    var backtrace_1 = backtrace;

    /**
     * Backtrace from start and end node, and return the path.
     * (including both start and end nodes)
     * @param {Node}
     * @param {Node}
     */
    function biBacktrace(nodeA, nodeB) {
        var pathA = backtrace(nodeA),
            pathB = backtrace(nodeB);
        return pathA.concat(pathB.reverse());
    }
    var biBacktrace_1 = biBacktrace;

    /**
     * Compute the length of the path.
     * @param {Array<Array<number>>} path The path
     * @return {number} The length of the path
     */
    function pathLength(path) {
        var i, sum = 0, a, b, dx, dy;
        for (i = 1; i < path.length; ++i) {
            a = path[i - 1];
            b = path[i];
            dx = a[0] - b[0];
            dy = a[1] - b[1];
            sum += Math.sqrt(dx * dx + dy * dy);
        }
        return sum;
    }
    var pathLength_1 = pathLength;


    /**
     * Given the start and end coordinates, return all the coordinates lying
     * on the line formed by these coordinates, based on Bresenham's algorithm.
     * http://en.wikipedia.org/wiki/Bresenham's_line_algorithm#Simplification
     * @param {number} x0 Start x coordinate
     * @param {number} y0 Start y coordinate
     * @param {number} x1 End x coordinate
     * @param {number} y1 End y coordinate
     * @return {Array<Array<number>>} The coordinates on the line
     */
    function interpolate(x0, y0, x1, y1) {
        var abs = Math.abs,
            line = [],
            sx, sy, dx, dy, err, e2;

        dx = abs(x1 - x0);
        dy = abs(y1 - y0);

        sx = (x0 < x1) ? 1 : -1;
        sy = (y0 < y1) ? 1 : -1;

        err = dx - dy;

        while (true) {
            line.push([x0, y0]);

            if (x0 === x1 && y0 === y1) {
                break;
            }
            
            e2 = 2 * err;
            if (e2 > -dy) {
                err = err - dy;
                x0 = x0 + sx;
            }
            if (e2 < dx) {
                err = err + dx;
                y0 = y0 + sy;
            }
        }

        return line;
    }
    var interpolate_1 = interpolate;


    /**
     * Given a compressed path, return a new path that has all the segments
     * in it interpolated.
     * @param {Array<Array<number>>} path The path
     * @return {Array<Array<number>>} expanded path
     */
    function expandPath(path) {
        var expanded = [],
            len = path.length,
            coord0, coord1,
            interpolated,
            interpolatedLen,
            i, j;

        if (len < 2) {
            return expanded;
        }

        for (i = 0; i < len - 1; ++i) {
            coord0 = path[i];
            coord1 = path[i + 1];

            interpolated = interpolate(coord0[0], coord0[1], coord1[0], coord1[1]);
            interpolatedLen = interpolated.length;
            for (j = 0; j < interpolatedLen - 1; ++j) {
                expanded.push(interpolated[j]);
            }
        }
        expanded.push(path[len - 1]);

        return expanded;
    }
    var expandPath_1 = expandPath;


    /**
     * Smoothen the give path.
     * The original path will not be modified; a new path will be returned.
     * @param {PF.Grid} grid
     * @param {Array<Array<number>>} path The path
     */
    function smoothenPath(grid, path) {
        var len = path.length,
            x0 = path[0][0],        // path start x
            y0 = path[0][1],        // path start y
            x1 = path[len - 1][0],  // path end x
            y1 = path[len - 1][1],  // path end y
            sx, sy,                 // current start coordinate
            ex, ey,                 // current end coordinate
            newPath,
            i, j, coord, line, testCoord, blocked;

        sx = x0;
        sy = y0;
        newPath = [[sx, sy]];

        for (i = 2; i < len; ++i) {
            coord = path[i];
            ex = coord[0];
            ey = coord[1];
            line = interpolate(sx, sy, ex, ey);

            blocked = false;
            for (j = 1; j < line.length; ++j) {
                testCoord = line[j];

                if (!grid.isWalkableAt(testCoord[0], testCoord[1])) {
                    blocked = true;
                    break;
                }
            }
            if (blocked) {
                var lastValidCoord = path[i - 1];
                newPath.push(lastValidCoord);
                sx = lastValidCoord[0];
                sy = lastValidCoord[1];
            }
        }
        newPath.push([x1, y1]);

        return newPath;
    }
    var smoothenPath_1 = smoothenPath;


    /**
     * Compress a path, remove redundant nodes without altering the shape
     * The original path is not modified
     * @param {Array<Array<number>>} path The path
     * @return {Array<Array<number>>} The compressed path
     */
    function compressPath(path) {

        // nothing to compress
        if(path.length < 3) {
            return path;
        }

        var compressed = [],
            sx = path[0][0], // start x
            sy = path[0][1], // start y
            px = path[1][0], // second point x
            py = path[1][1], // second point y
            dx = px - sx, // direction between the two points
            dy = py - sy, // direction between the two points
            lx, ly,
            ldx, ldy,
            sq, i;

        // normalize the direction
        sq = Math.sqrt(dx*dx + dy*dy);
        dx /= sq;
        dy /= sq;

        // start the new path
        compressed.push([sx,sy]);

        for(i = 2; i < path.length; i++) {

            // store the last point
            lx = px;
            ly = py;

            // store the last direction
            ldx = dx;
            ldy = dy;

            // next point
            px = path[i][0];
            py = path[i][1];

            // next direction
            dx = px - lx;
            dy = py - ly;

            // normalize
            sq = Math.sqrt(dx*dx + dy*dy);
            dx /= sq;
            dy /= sq;

            // if the direction has changed, store the point
            if ( dx !== ldx || dy !== ldy ) {
                compressed.push([lx,ly]);
            }
        }

        // store the last point
        compressed.push([px,py]);

        return compressed;
    }
    var compressPath_1 = compressPath;

    var Util = {
    	backtrace: backtrace_1,
    	biBacktrace: biBacktrace_1,
    	pathLength: pathLength_1,
    	interpolate: interpolate_1,
    	expandPath: expandPath_1,
    	smoothenPath: smoothenPath_1,
    	compressPath: compressPath_1
    };

    /**
     * @namespace PF.Heuristic
     * @description A collection of heuristic functions.
     */
    var Heuristic = {

      /**
       * Manhattan distance.
       * @param {number} dx - Difference in x.
       * @param {number} dy - Difference in y.
       * @return {number} dx + dy
       */
      manhattan: function(dx, dy) {
          return dx + dy;
      },

      /**
       * Euclidean distance.
       * @param {number} dx - Difference in x.
       * @param {number} dy - Difference in y.
       * @return {number} sqrt(dx * dx + dy * dy)
       */
      euclidean: function(dx, dy) {
          return Math.sqrt(dx * dx + dy * dy);
      },

      /**
       * Octile distance.
       * @param {number} dx - Difference in x.
       * @param {number} dy - Difference in y.
       * @return {number} sqrt(dx * dx + dy * dy) for grids
       */
      octile: function(dx, dy) {
          var F = Math.SQRT2 - 1;
          return (dx < dy) ? F * dx + dy : F * dy + dx;
      },

      /**
       * Chebyshev distance.
       * @param {number} dx - Difference in x.
       * @param {number} dy - Difference in y.
       * @return {number} max(dx, dy)
       */
      chebyshev: function(dx, dy) {
          return Math.max(dx, dy);
      }

    };

    /**
     * A* path-finder. Based upon https://github.com/bgrins/javascript-astar
     * @constructor
     * @param {Object} opt
     * @param {boolean} opt.allowDiagonal Whether diagonal movement is allowed.
     *     Deprecated, use diagonalMovement instead.
     * @param {boolean} opt.dontCrossCorners Disallow diagonal movement touching 
     *     block corners. Deprecated, use diagonalMovement instead.
     * @param {DiagonalMovement} opt.diagonalMovement Allowed diagonal movement.
     * @param {function} opt.heuristic Heuristic function to estimate the distance
     *     (defaults to manhattan).
     * @param {number} opt.weight Weight to apply to the heuristic to allow for
     *     suboptimal paths, in order to speed up the search.
     */
    function AStarFinder(opt) {
        opt = opt || {};
        this.allowDiagonal = opt.allowDiagonal;
        this.dontCrossCorners = opt.dontCrossCorners;
        this.heuristic = opt.heuristic || Heuristic.manhattan;
        this.weight = opt.weight || 1;
        this.diagonalMovement = opt.diagonalMovement;

        if (!this.diagonalMovement) {
            if (!this.allowDiagonal) {
                this.diagonalMovement = DiagonalMovement_1.Never;
            } else {
                if (this.dontCrossCorners) {
                    this.diagonalMovement = DiagonalMovement_1.OnlyWhenNoObstacles;
                } else {
                    this.diagonalMovement = DiagonalMovement_1.IfAtMostOneObstacle;
                }
            }
        }

        // When diagonal movement is allowed the manhattan heuristic is not
        //admissible. It should be octile instead
        if (this.diagonalMovement === DiagonalMovement_1.Never) {
            this.heuristic = opt.heuristic || Heuristic.manhattan;
        } else {
            this.heuristic = opt.heuristic || Heuristic.octile;
        }
    }

    /**
     * Find and return the the path.
     * @return {Array<Array<number>>} The path, including both start and
     *     end positions.
     */
    AStarFinder.prototype.findPath = function(startX, startY, endX, endY, grid) {
        var openList = new heap(function(nodeA, nodeB) {
                return nodeA.f - nodeB.f;
            }),
            startNode = grid.getNodeAt(startX, startY),
            endNode = grid.getNodeAt(endX, endY),
            heuristic = this.heuristic,
            diagonalMovement = this.diagonalMovement,
            weight = this.weight,
            abs = Math.abs, SQRT2 = Math.SQRT2,
            node, neighbors, neighbor, i, l, x, y, ng;

        // set the `g` and `f` value of the start node to be 0
        startNode.g = 0;
        startNode.f = 0;

        // push the start node into the open list
        openList.push(startNode);
        startNode.opened = true;

        // while the open list is not empty
        while (!openList.empty()) {
            // pop the position of node which has the minimum `f` value.
            node = openList.pop();
            node.closed = true;

            // if reached the end position, construct the path and return it
            if (node === endNode) {
                return Util.backtrace(endNode);
            }

            // get neigbours of the current node
            neighbors = grid.getNeighbors(node, diagonalMovement);
            for (i = 0, l = neighbors.length; i < l; ++i) {
                neighbor = neighbors[i];

                if (neighbor.closed) {
                    continue;
                }

                x = neighbor.x;
                y = neighbor.y;

                // get the distance between current node and the neighbor
                // and calculate the next g score
                ng = node.g + ((x - node.x === 0 || y - node.y === 0) ? 1 : SQRT2);

                // check if the neighbor has not been inspected yet, or
                // can be reached with smaller cost from the current node
                if (!neighbor.opened || ng < neighbor.g) {
                    neighbor.g = ng;
                    neighbor.h = neighbor.h || weight * heuristic(abs(x - endX), abs(y - endY));
                    neighbor.f = neighbor.g + neighbor.h;
                    neighbor.parent = node;

                    if (!neighbor.opened) {
                        openList.push(neighbor);
                        neighbor.opened = true;
                    } else {
                        // the neighbor can be reached with smaller cost.
                        // Since its f value has been updated, we have to
                        // update its position in the open list
                        openList.updateItem(neighbor);
                    }
                }
            } // end for each neighbor
        } // end while not open list empty

        // fail to find the path
        return [];
    };

    var AStarFinder_1 = AStarFinder;

    /**
     * Best-First-Search path-finder.
     * @constructor
     * @extends AStarFinder
     * @param {Object} opt
     * @param {boolean} opt.allowDiagonal Whether diagonal movement is allowed.
     *     Deprecated, use diagonalMovement instead.
     * @param {boolean} opt.dontCrossCorners Disallow diagonal movement touching
     *     block corners. Deprecated, use diagonalMovement instead.
     * @param {DiagonalMovement} opt.diagonalMovement Allowed diagonal movement.
     * @param {function} opt.heuristic Heuristic function to estimate the distance
     *     (defaults to manhattan).
     */
    function BestFirstFinder(opt) {
        AStarFinder_1.call(this, opt);

        var orig = this.heuristic;
        this.heuristic = function(dx, dy) {
            return orig(dx, dy) * 1000000;
        };
    }

    BestFirstFinder.prototype = new AStarFinder_1();
    BestFirstFinder.prototype.constructor = BestFirstFinder;

    var BestFirstFinder_1 = BestFirstFinder;

    /**
     * Breadth-First-Search path finder.
     * @constructor
     * @param {Object} opt
     * @param {boolean} opt.allowDiagonal Whether diagonal movement is allowed.
     *     Deprecated, use diagonalMovement instead.
     * @param {boolean} opt.dontCrossCorners Disallow diagonal movement touching
     *     block corners. Deprecated, use diagonalMovement instead.
     * @param {DiagonalMovement} opt.diagonalMovement Allowed diagonal movement.
     */
    function BreadthFirstFinder(opt) {
        opt = opt || {};
        this.allowDiagonal = opt.allowDiagonal;
        this.dontCrossCorners = opt.dontCrossCorners;
        this.diagonalMovement = opt.diagonalMovement;

        if (!this.diagonalMovement) {
            if (!this.allowDiagonal) {
                this.diagonalMovement = DiagonalMovement_1.Never;
            } else {
                if (this.dontCrossCorners) {
                    this.diagonalMovement = DiagonalMovement_1.OnlyWhenNoObstacles;
                } else {
                    this.diagonalMovement = DiagonalMovement_1.IfAtMostOneObstacle;
                }
            }
        }
    }

    /**
     * Find and return the the path.
     * @return {Array<Array<number>>} The path, including both start and
     *     end positions.
     */
    BreadthFirstFinder.prototype.findPath = function(startX, startY, endX, endY, grid) {
        var openList = [],
            diagonalMovement = this.diagonalMovement,
            startNode = grid.getNodeAt(startX, startY),
            endNode = grid.getNodeAt(endX, endY),
            neighbors, neighbor, node, i, l;

        // push the start pos into the queue
        openList.push(startNode);
        startNode.opened = true;

        // while the queue is not empty
        while (openList.length) {
            // take the front node from the queue
            node = openList.shift();
            node.closed = true;

            // reached the end position
            if (node === endNode) {
                return Util.backtrace(endNode);
            }

            neighbors = grid.getNeighbors(node, diagonalMovement);
            for (i = 0, l = neighbors.length; i < l; ++i) {
                neighbor = neighbors[i];

                // skip this neighbor if it has been inspected before
                if (neighbor.closed || neighbor.opened) {
                    continue;
                }

                openList.push(neighbor);
                neighbor.opened = true;
                neighbor.parent = node;
            }
        }
        
        // fail to find the path
        return [];
    };

    var BreadthFirstFinder_1 = BreadthFirstFinder;

    /**
     * Dijkstra path-finder.
     * @constructor
     * @extends AStarFinder
     * @param {Object} opt
     * @param {boolean} opt.allowDiagonal Whether diagonal movement is allowed.
     *     Deprecated, use diagonalMovement instead.
     * @param {boolean} opt.dontCrossCorners Disallow diagonal movement touching
     *     block corners. Deprecated, use diagonalMovement instead.
     * @param {DiagonalMovement} opt.diagonalMovement Allowed diagonal movement.
     */
    function DijkstraFinder(opt) {
        AStarFinder_1.call(this, opt);
        this.heuristic = function(dx, dy) {
            return 0;
        };
    }

    DijkstraFinder.prototype = new AStarFinder_1();
    DijkstraFinder.prototype.constructor = DijkstraFinder;

    var DijkstraFinder_1 = DijkstraFinder;

    /**
     * A* path-finder.
     * based upon https://github.com/bgrins/javascript-astar
     * @constructor
     * @param {Object} opt
     * @param {boolean} opt.allowDiagonal Whether diagonal movement is allowed.
     *     Deprecated, use diagonalMovement instead.
     * @param {boolean} opt.dontCrossCorners Disallow diagonal movement touching
     *     block corners. Deprecated, use diagonalMovement instead.
     * @param {DiagonalMovement} opt.diagonalMovement Allowed diagonal movement.
     * @param {function} opt.heuristic Heuristic function to estimate the distance
     *     (defaults to manhattan).
     * @param {number} opt.weight Weight to apply to the heuristic to allow for
     *     suboptimal paths, in order to speed up the search.
     */
    function BiAStarFinder(opt) {
        opt = opt || {};
        this.allowDiagonal = opt.allowDiagonal;
        this.dontCrossCorners = opt.dontCrossCorners;
        this.diagonalMovement = opt.diagonalMovement;
        this.heuristic = opt.heuristic || Heuristic.manhattan;
        this.weight = opt.weight || 1;

        if (!this.diagonalMovement) {
            if (!this.allowDiagonal) {
                this.diagonalMovement = DiagonalMovement_1.Never;
            } else {
                if (this.dontCrossCorners) {
                    this.diagonalMovement = DiagonalMovement_1.OnlyWhenNoObstacles;
                } else {
                    this.diagonalMovement = DiagonalMovement_1.IfAtMostOneObstacle;
                }
            }
        }

        //When diagonal movement is allowed the manhattan heuristic is not admissible
        //It should be octile instead
        if (this.diagonalMovement === DiagonalMovement_1.Never) {
            this.heuristic = opt.heuristic || Heuristic.manhattan;
        } else {
            this.heuristic = opt.heuristic || Heuristic.octile;
        }
    }

    /**
     * Find and return the the path.
     * @return {Array<Array<number>>} The path, including both start and
     *     end positions.
     */
    BiAStarFinder.prototype.findPath = function(startX, startY, endX, endY, grid) {
        var cmp = function(nodeA, nodeB) {
                return nodeA.f - nodeB.f;
            },
            startOpenList = new heap(cmp),
            endOpenList = new heap(cmp),
            startNode = grid.getNodeAt(startX, startY),
            endNode = grid.getNodeAt(endX, endY),
            heuristic = this.heuristic,
            diagonalMovement = this.diagonalMovement,
            weight = this.weight,
            abs = Math.abs, SQRT2 = Math.SQRT2,
            node, neighbors, neighbor, i, l, x, y, ng,
            BY_START = 1, BY_END = 2;

        // set the `g` and `f` value of the start node to be 0
        // and push it into the start open list
        startNode.g = 0;
        startNode.f = 0;
        startOpenList.push(startNode);
        startNode.opened = BY_START;

        // set the `g` and `f` value of the end node to be 0
        // and push it into the open open list
        endNode.g = 0;
        endNode.f = 0;
        endOpenList.push(endNode);
        endNode.opened = BY_END;

        // while both the open lists are not empty
        while (!startOpenList.empty() && !endOpenList.empty()) {

            // pop the position of start node which has the minimum `f` value.
            node = startOpenList.pop();
            node.closed = true;

            // get neigbours of the current node
            neighbors = grid.getNeighbors(node, diagonalMovement);
            for (i = 0, l = neighbors.length; i < l; ++i) {
                neighbor = neighbors[i];

                if (neighbor.closed) {
                    continue;
                }
                if (neighbor.opened === BY_END) {
                    return Util.biBacktrace(node, neighbor);
                }

                x = neighbor.x;
                y = neighbor.y;

                // get the distance between current node and the neighbor
                // and calculate the next g score
                ng = node.g + ((x - node.x === 0 || y - node.y === 0) ? 1 : SQRT2);

                // check if the neighbor has not been inspected yet, or
                // can be reached with smaller cost from the current node
                if (!neighbor.opened || ng < neighbor.g) {
                    neighbor.g = ng;
                    neighbor.h = neighbor.h ||
                        weight * heuristic(abs(x - endX), abs(y - endY));
                    neighbor.f = neighbor.g + neighbor.h;
                    neighbor.parent = node;

                    if (!neighbor.opened) {
                        startOpenList.push(neighbor);
                        neighbor.opened = BY_START;
                    } else {
                        // the neighbor can be reached with smaller cost.
                        // Since its f value has been updated, we have to
                        // update its position in the open list
                        startOpenList.updateItem(neighbor);
                    }
                }
            } // end for each neighbor


            // pop the position of end node which has the minimum `f` value.
            node = endOpenList.pop();
            node.closed = true;

            // get neigbours of the current node
            neighbors = grid.getNeighbors(node, diagonalMovement);
            for (i = 0, l = neighbors.length; i < l; ++i) {
                neighbor = neighbors[i];

                if (neighbor.closed) {
                    continue;
                }
                if (neighbor.opened === BY_START) {
                    return Util.biBacktrace(neighbor, node);
                }

                x = neighbor.x;
                y = neighbor.y;

                // get the distance between current node and the neighbor
                // and calculate the next g score
                ng = node.g + ((x - node.x === 0 || y - node.y === 0) ? 1 : SQRT2);

                // check if the neighbor has not been inspected yet, or
                // can be reached with smaller cost from the current node
                if (!neighbor.opened || ng < neighbor.g) {
                    neighbor.g = ng;
                    neighbor.h = neighbor.h ||
                        weight * heuristic(abs(x - startX), abs(y - startY));
                    neighbor.f = neighbor.g + neighbor.h;
                    neighbor.parent = node;

                    if (!neighbor.opened) {
                        endOpenList.push(neighbor);
                        neighbor.opened = BY_END;
                    } else {
                        // the neighbor can be reached with smaller cost.
                        // Since its f value has been updated, we have to
                        // update its position in the open list
                        endOpenList.updateItem(neighbor);
                    }
                }
            } // end for each neighbor
        } // end while not open list empty

        // fail to find the path
        return [];
    };

    var BiAStarFinder_1 = BiAStarFinder;

    /**
     * Bi-direcitional Best-First-Search path-finder.
     * @constructor
     * @extends BiAStarFinder
     * @param {Object} opt
     * @param {boolean} opt.allowDiagonal Whether diagonal movement is allowed.
     *     Deprecated, use diagonalMovement instead.
     * @param {boolean} opt.dontCrossCorners Disallow diagonal movement touching
     *     block corners. Deprecated, use diagonalMovement instead.
     * @param {DiagonalMovement} opt.diagonalMovement Allowed diagonal movement.
     * @param {function} opt.heuristic Heuristic function to estimate the distance
     *     (defaults to manhattan).
     */
    function BiBestFirstFinder(opt) {
        BiAStarFinder_1.call(this, opt);

        var orig = this.heuristic;
        this.heuristic = function(dx, dy) {
            return orig(dx, dy) * 1000000;
        };
    }

    BiBestFirstFinder.prototype = new BiAStarFinder_1();
    BiBestFirstFinder.prototype.constructor = BiBestFirstFinder;

    var BiBestFirstFinder_1 = BiBestFirstFinder;

    /**
     * Bi-directional Breadth-First-Search path finder.
     * @constructor
     * @param {object} opt
     * @param {boolean} opt.allowDiagonal Whether diagonal movement is allowed.
     *     Deprecated, use diagonalMovement instead.
     * @param {boolean} opt.dontCrossCorners Disallow diagonal movement touching
     *     block corners. Deprecated, use diagonalMovement instead.
     * @param {DiagonalMovement} opt.diagonalMovement Allowed diagonal movement.
     */
    function BiBreadthFirstFinder(opt) {
        opt = opt || {};
        this.allowDiagonal = opt.allowDiagonal;
        this.dontCrossCorners = opt.dontCrossCorners;
        this.diagonalMovement = opt.diagonalMovement;

        if (!this.diagonalMovement) {
            if (!this.allowDiagonal) {
                this.diagonalMovement = DiagonalMovement_1.Never;
            } else {
                if (this.dontCrossCorners) {
                    this.diagonalMovement = DiagonalMovement_1.OnlyWhenNoObstacles;
                } else {
                    this.diagonalMovement = DiagonalMovement_1.IfAtMostOneObstacle;
                }
            }
        }
    }


    /**
     * Find and return the the path.
     * @return {Array<Array<number>>} The path, including both start and
     *     end positions.
     */
    BiBreadthFirstFinder.prototype.findPath = function(startX, startY, endX, endY, grid) {
        var startNode = grid.getNodeAt(startX, startY),
            endNode = grid.getNodeAt(endX, endY),
            startOpenList = [], endOpenList = [],
            neighbors, neighbor, node,
            diagonalMovement = this.diagonalMovement,
            BY_START = 0, BY_END = 1,
            i, l;

        // push the start and end nodes into the queues
        startOpenList.push(startNode);
        startNode.opened = true;
        startNode.by = BY_START;

        endOpenList.push(endNode);
        endNode.opened = true;
        endNode.by = BY_END;

        // while both the queues are not empty
        while (startOpenList.length && endOpenList.length) {

            // expand start open list

            node = startOpenList.shift();
            node.closed = true;

            neighbors = grid.getNeighbors(node, diagonalMovement);
            for (i = 0, l = neighbors.length; i < l; ++i) {
                neighbor = neighbors[i];

                if (neighbor.closed) {
                    continue;
                }
                if (neighbor.opened) {
                    // if this node has been inspected by the reversed search,
                    // then a path is found.
                    if (neighbor.by === BY_END) {
                        return Util.biBacktrace(node, neighbor);
                    }
                    continue;
                }
                startOpenList.push(neighbor);
                neighbor.parent = node;
                neighbor.opened = true;
                neighbor.by = BY_START;
            }

            // expand end open list

            node = endOpenList.shift();
            node.closed = true;

            neighbors = grid.getNeighbors(node, diagonalMovement);
            for (i = 0, l = neighbors.length; i < l; ++i) {
                neighbor = neighbors[i];

                if (neighbor.closed) {
                    continue;
                }
                if (neighbor.opened) {
                    if (neighbor.by === BY_START) {
                        return Util.biBacktrace(neighbor, node);
                    }
                    continue;
                }
                endOpenList.push(neighbor);
                neighbor.parent = node;
                neighbor.opened = true;
                neighbor.by = BY_END;
            }
        }

        // fail to find the path
        return [];
    };

    var BiBreadthFirstFinder_1 = BiBreadthFirstFinder;

    /**
     * Bi-directional Dijkstra path-finder.
     * @constructor
     * @extends BiAStarFinder
     * @param {Object} opt
     * @param {boolean} opt.allowDiagonal Whether diagonal movement is allowed.
     *     Deprecated, use diagonalMovement instead.
     * @param {boolean} opt.dontCrossCorners Disallow diagonal movement touching
     *     block corners. Deprecated, use diagonalMovement instead.
     * @param {DiagonalMovement} opt.diagonalMovement Allowed diagonal movement.
     */
    function BiDijkstraFinder(opt) {
        BiAStarFinder_1.call(this, opt);
        this.heuristic = function(dx, dy) {
            return 0;
        };
    }

    BiDijkstraFinder.prototype = new BiAStarFinder_1();
    BiDijkstraFinder.prototype.constructor = BiDijkstraFinder;

    var BiDijkstraFinder_1 = BiDijkstraFinder;

    /**
     * Iterative Deeping A Star (IDA*) path-finder.
     *
     * Recursion based on:
     *   http://www.apl.jhu.edu/~hall/AI-Programming/IDA-Star.html
     *
     * Path retracing based on:
     *  V. Nageshwara Rao, Vipin Kumar and K. Ramesh
     *  "A Parallel Implementation of Iterative-Deeping-A*", January 1987.
     *  ftp://ftp.cs.utexas.edu/.snapshot/hourly.1/pub/AI-Lab/tech-reports/UT-AI-TR-87-46.pdf
     *
     * @author Gerard Meier (www.gerardmeier.com)
     *
     * @constructor
     * @param {Object} opt
     * @param {boolean} opt.allowDiagonal Whether diagonal movement is allowed.
     *     Deprecated, use diagonalMovement instead.
     * @param {boolean} opt.dontCrossCorners Disallow diagonal movement touching
     *     block corners. Deprecated, use diagonalMovement instead.
     * @param {DiagonalMovement} opt.diagonalMovement Allowed diagonal movement.
     * @param {function} opt.heuristic Heuristic function to estimate the distance
     *     (defaults to manhattan).
     * @param {number} opt.weight Weight to apply to the heuristic to allow for
     *     suboptimal paths, in order to speed up the search.
     * @param {boolean} opt.trackRecursion Whether to track recursion for
     *     statistical purposes.
     * @param {number} opt.timeLimit Maximum execution time. Use <= 0 for infinite.
     */
    function IDAStarFinder(opt) {
        opt = opt || {};
        this.allowDiagonal = opt.allowDiagonal;
        this.dontCrossCorners = opt.dontCrossCorners;
        this.diagonalMovement = opt.diagonalMovement;
        this.heuristic = opt.heuristic || Heuristic.manhattan;
        this.weight = opt.weight || 1;
        this.trackRecursion = opt.trackRecursion || false;
        this.timeLimit = opt.timeLimit || Infinity; // Default: no time limit.

        if (!this.diagonalMovement) {
            if (!this.allowDiagonal) {
                this.diagonalMovement = DiagonalMovement_1.Never;
            } else {
                if (this.dontCrossCorners) {
                    this.diagonalMovement = DiagonalMovement_1.OnlyWhenNoObstacles;
                } else {
                    this.diagonalMovement = DiagonalMovement_1.IfAtMostOneObstacle;
                }
            }
        }

        // When diagonal movement is allowed the manhattan heuristic is not
        // admissible, it should be octile instead
        if (this.diagonalMovement === DiagonalMovement_1.Never) {
            this.heuristic = opt.heuristic || Heuristic.manhattan;
        } else {
            this.heuristic = opt.heuristic || Heuristic.octile;
        }
    }

    /**
     * Find and return the the path. When an empty array is returned, either
     * no path is possible, or the maximum execution time is reached.
     *
     * @return {Array<Array<number>>} The path, including both start and
     *     end positions.
     */
    IDAStarFinder.prototype.findPath = function(startX, startY, endX, endY, grid) {

        // Execution time limitation:
        var startTime = new Date().getTime();

        // Heuristic helper:
        var h = function(a, b) {
            return this.heuristic(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
        }.bind(this);

        // Step cost from a to b:
        var cost = function(a, b) {
            return (a.x === b.x || a.y === b.y) ? 1 : Math.SQRT2;
        };

        /**
         * IDA* search implementation.
         *
         * @param {Node} The node currently expanding from.
         * @param {number} Cost to reach the given node.
         * @param {number} Maximum search depth (cut-off value).
         * @param {Array<Array<number>>} The found route.
         * @param {number} Recursion depth.
         *
         * @return {Object} either a number with the new optimal cut-off depth,
         * or a valid node instance, in which case a path was found.
         */
        var search = function(node, g, cutoff, route, depth) {

            // Enforce timelimit:
            if (this.timeLimit > 0 &&
                new Date().getTime() - startTime > this.timeLimit * 1000) {
                // Enforced as "path-not-found".
                return Infinity;
            }

            var f = g + h(node, end) * this.weight;

            // We've searched too deep for this iteration.
            if (f > cutoff) {
                return f;
            }

            if (node == end) {
                route[depth] = [node.x, node.y];
                return node;
            }

            var min, t, k, neighbour;

            var neighbours = grid.getNeighbors(node, this.diagonalMovement);

            // Sort the neighbours, gives nicer paths. But, this deviates
            // from the original algorithm - so I left it out.
            //neighbours.sort(function(a, b){
            //    return h(a, end) - h(b, end);
            //});

            
            /*jshint -W084 *///Disable warning: Expected a conditional expression and instead saw an assignment
            for (k = 0, min = Infinity; neighbour = neighbours[k]; ++k) {
            /*jshint +W084 *///Enable warning: Expected a conditional expression and instead saw an assignment
                if (this.trackRecursion) {
                    // Retain a copy for visualisation. Due to recursion, this
                    // node may be part of other paths too.
                    neighbour.retainCount = neighbour.retainCount + 1 || 1;

                    if(neighbour.tested !== true) {
                        neighbour.tested = true;
                    }
                }

                t = search(neighbour, g + cost(node, neighbour), cutoff, route, depth + 1);

                if (t instanceof Node_1) {
                    route[depth] = [node.x, node.y];

                    // For a typical A* linked list, this would work:
                    // neighbour.parent = node;
                    return t;
                }

                // Decrement count, then determine whether it's actually closed.
                if (this.trackRecursion && (--neighbour.retainCount) === 0) {
                    neighbour.tested = false;
                }

                if (t < min) {
                    min = t;
                }
            }

            return min;

        }.bind(this);

        // Node instance lookups:
        var start = grid.getNodeAt(startX, startY);
        var end   = grid.getNodeAt(endX, endY);

        // Initial search depth, given the typical heuristic contraints,
        // there should be no cheaper route possible.
        var cutOff = h(start, end);

        var j, route, t;

        // With an overflow protection.
        for (j = 0; true; ++j) {

            route = [];

            // Search till cut-off depth:
            t = search(start, 0, cutOff, route, 0);

            // Route not possible, or not found in time limit.
            if (t === Infinity) {
                return [];
            }

            // If t is a node, it's also the end node. Route is now
            // populated with a valid path to the end node.
            if (t instanceof Node_1) {
                return route;
            }

            // Try again, this time with a deeper cut-off. The t score
            // is the closest we got to the end node.
            cutOff = t;
        }

        // This _should_ never to be reached.
        return [];
    };

    var IDAStarFinder_1 = IDAStarFinder;

    /**
     * @author imor / https://github.com/imor
     */

    /**
     * Base class for the Jump Point Search algorithm
     * @param {object} opt
     * @param {function} opt.heuristic Heuristic function to estimate the distance
     *     (defaults to manhattan).
     */
    function JumpPointFinderBase(opt) {
        opt = opt || {};
        this.heuristic = opt.heuristic || Heuristic.manhattan;
        this.trackJumpRecursion = opt.trackJumpRecursion || false;
    }

    /**
     * Find and return the path.
     * @return {Array<Array<number>>} The path, including both start and
     *     end positions.
     */
    JumpPointFinderBase.prototype.findPath = function(startX, startY, endX, endY, grid) {
        var openList = this.openList = new heap(function(nodeA, nodeB) {
                return nodeA.f - nodeB.f;
            }),
            startNode = this.startNode = grid.getNodeAt(startX, startY),
            endNode = this.endNode = grid.getNodeAt(endX, endY), node;

        this.grid = grid;


        // set the `g` and `f` value of the start node to be 0
        startNode.g = 0;
        startNode.f = 0;

        // push the start node into the open list
        openList.push(startNode);
        startNode.opened = true;

        // while the open list is not empty
        while (!openList.empty()) {
            // pop the position of node which has the minimum `f` value.
            node = openList.pop();
            node.closed = true;

            if (node === endNode) {
                return Util.expandPath(Util.backtrace(endNode));
            }

            this._identifySuccessors(node);
        }

        // fail to find the path
        return [];
    };

    /**
     * Identify successors for the given node. Runs a jump point search in the
     * direction of each available neighbor, adding any points found to the open
     * list.
     * @protected
     */
    JumpPointFinderBase.prototype._identifySuccessors = function(node) {
        var grid = this.grid,
            heuristic = this.heuristic,
            openList = this.openList,
            endX = this.endNode.x,
            endY = this.endNode.y,
            neighbors, neighbor,
            jumpPoint, i, l,
            x = node.x, y = node.y,
            jx, jy, d, ng, jumpNode,
            abs = Math.abs;

        neighbors = this._findNeighbors(node);
        for(i = 0, l = neighbors.length; i < l; ++i) {
            neighbor = neighbors[i];
            jumpPoint = this._jump(neighbor[0], neighbor[1], x, y);
            if (jumpPoint) {

                jx = jumpPoint[0];
                jy = jumpPoint[1];
                jumpNode = grid.getNodeAt(jx, jy);

                if (jumpNode.closed) {
                    continue;
                }

                // include distance, as parent may not be immediately adjacent:
                d = Heuristic.octile(abs(jx - x), abs(jy - y));
                ng = node.g + d; // next `g` value

                if (!jumpNode.opened || ng < jumpNode.g) {
                    jumpNode.g = ng;
                    jumpNode.h = jumpNode.h || heuristic(abs(jx - endX), abs(jy - endY));
                    jumpNode.f = jumpNode.g + jumpNode.h;
                    jumpNode.parent = node;

                    if (!jumpNode.opened) {
                        openList.push(jumpNode);
                        jumpNode.opened = true;
                    } else {
                        openList.updateItem(jumpNode);
                    }
                }
            }
        }
    };

    var JumpPointFinderBase_1 = JumpPointFinderBase;

    /**
     * @author imor / https://github.com/imor
     */

    /**
     * Path finder using the Jump Point Search algorithm allowing only horizontal
     * or vertical movements.
     */
    function JPFNeverMoveDiagonally(opt) {
        JumpPointFinderBase_1.call(this, opt);
    }

    JPFNeverMoveDiagonally.prototype = new JumpPointFinderBase_1();
    JPFNeverMoveDiagonally.prototype.constructor = JPFNeverMoveDiagonally;

    /**
     * Search recursively in the direction (parent -> child), stopping only when a
     * jump point is found.
     * @protected
     * @return {Array<Array<number>>} The x, y coordinate of the jump point
     *     found, or null if not found
     */
    JPFNeverMoveDiagonally.prototype._jump = function(x, y, px, py) {
        var grid = this.grid,
            dx = x - px, dy = y - py;

        if (!grid.isWalkableAt(x, y)) {
            return null;
        }

        if(this.trackJumpRecursion === true) {
            grid.getNodeAt(x, y).tested = true;
        }

        if (grid.getNodeAt(x, y) === this.endNode) {
            return [x, y];
        }

        if (dx !== 0) {
            if ((grid.isWalkableAt(x, y - 1) && !grid.isWalkableAt(x - dx, y - 1)) ||
                (grid.isWalkableAt(x, y + 1) && !grid.isWalkableAt(x - dx, y + 1))) {
                return [x, y];
            }
        }
        else if (dy !== 0) {
            if ((grid.isWalkableAt(x - 1, y) && !grid.isWalkableAt(x - 1, y - dy)) ||
                (grid.isWalkableAt(x + 1, y) && !grid.isWalkableAt(x + 1, y - dy))) {
                return [x, y];
            }
            //When moving vertically, must check for horizontal jump points
            if (this._jump(x + 1, y, x, y) || this._jump(x - 1, y, x, y)) {
                return [x, y];
            }
        }
        else {
            throw new Error("Only horizontal and vertical movements are allowed");
        }

        return this._jump(x + dx, y + dy, x, y);
    };

    /**
     * Find the neighbors for the given node. If the node has a parent,
     * prune the neighbors based on the jump point search algorithm, otherwise
     * return all available neighbors.
     * @return {Array<Array<number>>} The neighbors found.
     */
    JPFNeverMoveDiagonally.prototype._findNeighbors = function(node) {
        var parent = node.parent,
            x = node.x, y = node.y,
            grid = this.grid,
            px, py, dx, dy,
            neighbors = [], neighborNodes, neighborNode, i, l;

        // directed pruning: can ignore most neighbors, unless forced.
        if (parent) {
            px = parent.x;
            py = parent.y;
            // get the normalized direction of travel
            dx = (x - px) / Math.max(Math.abs(x - px), 1);
            dy = (y - py) / Math.max(Math.abs(y - py), 1);

            if (dx !== 0) {
                if (grid.isWalkableAt(x, y - 1)) {
                    neighbors.push([x, y - 1]);
                }
                if (grid.isWalkableAt(x, y + 1)) {
                    neighbors.push([x, y + 1]);
                }
                if (grid.isWalkableAt(x + dx, y)) {
                    neighbors.push([x + dx, y]);
                }
            }
            else if (dy !== 0) {
                if (grid.isWalkableAt(x - 1, y)) {
                    neighbors.push([x - 1, y]);
                }
                if (grid.isWalkableAt(x + 1, y)) {
                    neighbors.push([x + 1, y]);
                }
                if (grid.isWalkableAt(x, y + dy)) {
                    neighbors.push([x, y + dy]);
                }
            }
        }
        // return all neighbors
        else {
            neighborNodes = grid.getNeighbors(node, DiagonalMovement_1.Never);
            for (i = 0, l = neighborNodes.length; i < l; ++i) {
                neighborNode = neighborNodes[i];
                neighbors.push([neighborNode.x, neighborNode.y]);
            }
        }

        return neighbors;
    };

    var JPFNeverMoveDiagonally_1 = JPFNeverMoveDiagonally;

    /**
     * @author imor / https://github.com/imor
     */

    /**
     * Path finder using the Jump Point Search algorithm which always moves
     * diagonally irrespective of the number of obstacles.
     */
    function JPFAlwaysMoveDiagonally(opt) {
        JumpPointFinderBase_1.call(this, opt);
    }

    JPFAlwaysMoveDiagonally.prototype = new JumpPointFinderBase_1();
    JPFAlwaysMoveDiagonally.prototype.constructor = JPFAlwaysMoveDiagonally;

    /**
     * Search recursively in the direction (parent -> child), stopping only when a
     * jump point is found.
     * @protected
     * @return {Array<Array<number>>} The x, y coordinate of the jump point
     *     found, or null if not found
     */
    JPFAlwaysMoveDiagonally.prototype._jump = function(x, y, px, py) {
        var grid = this.grid,
            dx = x - px, dy = y - py;

        if (!grid.isWalkableAt(x, y)) {
            return null;
        }

        if(this.trackJumpRecursion === true) {
            grid.getNodeAt(x, y).tested = true;
        }

        if (grid.getNodeAt(x, y) === this.endNode) {
            return [x, y];
        }

        // check for forced neighbors
        // along the diagonal
        if (dx !== 0 && dy !== 0) {
            if ((grid.isWalkableAt(x - dx, y + dy) && !grid.isWalkableAt(x - dx, y)) ||
                (grid.isWalkableAt(x + dx, y - dy) && !grid.isWalkableAt(x, y - dy))) {
                return [x, y];
            }
            // when moving diagonally, must check for vertical/horizontal jump points
            if (this._jump(x + dx, y, x, y) || this._jump(x, y + dy, x, y)) {
                return [x, y];
            }
        }
        // horizontally/vertically
        else {
            if( dx !== 0 ) { // moving along x
                if((grid.isWalkableAt(x + dx, y + 1) && !grid.isWalkableAt(x, y + 1)) ||
                   (grid.isWalkableAt(x + dx, y - 1) && !grid.isWalkableAt(x, y - 1))) {
                    return [x, y];
                }
            }
            else {
                if((grid.isWalkableAt(x + 1, y + dy) && !grid.isWalkableAt(x + 1, y)) ||
                   (grid.isWalkableAt(x - 1, y + dy) && !grid.isWalkableAt(x - 1, y))) {
                    return [x, y];
                }
            }
        }

        return this._jump(x + dx, y + dy, x, y);
    };

    /**
     * Find the neighbors for the given node. If the node has a parent,
     * prune the neighbors based on the jump point search algorithm, otherwise
     * return all available neighbors.
     * @return {Array<Array<number>>} The neighbors found.
     */
    JPFAlwaysMoveDiagonally.prototype._findNeighbors = function(node) {
        var parent = node.parent,
            x = node.x, y = node.y,
            grid = this.grid,
            px, py, dx, dy,
            neighbors = [], neighborNodes, neighborNode, i, l;

        // directed pruning: can ignore most neighbors, unless forced.
        if (parent) {
            px = parent.x;
            py = parent.y;
            // get the normalized direction of travel
            dx = (x - px) / Math.max(Math.abs(x - px), 1);
            dy = (y - py) / Math.max(Math.abs(y - py), 1);

            // search diagonally
            if (dx !== 0 && dy !== 0) {
                if (grid.isWalkableAt(x, y + dy)) {
                    neighbors.push([x, y + dy]);
                }
                if (grid.isWalkableAt(x + dx, y)) {
                    neighbors.push([x + dx, y]);
                }
                if (grid.isWalkableAt(x + dx, y + dy)) {
                    neighbors.push([x + dx, y + dy]);
                }
                if (!grid.isWalkableAt(x - dx, y)) {
                    neighbors.push([x - dx, y + dy]);
                }
                if (!grid.isWalkableAt(x, y - dy)) {
                    neighbors.push([x + dx, y - dy]);
                }
            }
            // search horizontally/vertically
            else {
                if(dx === 0) {
                    if (grid.isWalkableAt(x, y + dy)) {
                        neighbors.push([x, y + dy]);
                    }
                    if (!grid.isWalkableAt(x + 1, y)) {
                        neighbors.push([x + 1, y + dy]);
                    }
                    if (!grid.isWalkableAt(x - 1, y)) {
                        neighbors.push([x - 1, y + dy]);
                    }
                }
                else {
                    if (grid.isWalkableAt(x + dx, y)) {
                        neighbors.push([x + dx, y]);
                    }
                    if (!grid.isWalkableAt(x, y + 1)) {
                        neighbors.push([x + dx, y + 1]);
                    }
                    if (!grid.isWalkableAt(x, y - 1)) {
                        neighbors.push([x + dx, y - 1]);
                    }
                }
            }
        }
        // return all neighbors
        else {
            neighborNodes = grid.getNeighbors(node, DiagonalMovement_1.Always);
            for (i = 0, l = neighborNodes.length; i < l; ++i) {
                neighborNode = neighborNodes[i];
                neighbors.push([neighborNode.x, neighborNode.y]);
            }
        }

        return neighbors;
    };

    var JPFAlwaysMoveDiagonally_1 = JPFAlwaysMoveDiagonally;

    /**
     * @author imor / https://github.com/imor
     */

    /**
     * Path finder using the Jump Point Search algorithm which moves
     * diagonally only when there are no obstacles.
     */
    function JPFMoveDiagonallyIfNoObstacles(opt) {
        JumpPointFinderBase_1.call(this, opt);
    }

    JPFMoveDiagonallyIfNoObstacles.prototype = new JumpPointFinderBase_1();
    JPFMoveDiagonallyIfNoObstacles.prototype.constructor = JPFMoveDiagonallyIfNoObstacles;

    /**
     * Search recursively in the direction (parent -> child), stopping only when a
     * jump point is found.
     * @protected
     * @return {Array<Array<number>>} The x, y coordinate of the jump point
     *     found, or null if not found
     */
    JPFMoveDiagonallyIfNoObstacles.prototype._jump = function(x, y, px, py) {
        var grid = this.grid,
            dx = x - px, dy = y - py;

        if (!grid.isWalkableAt(x, y)) {
            return null;
        }

        if(this.trackJumpRecursion === true) {
            grid.getNodeAt(x, y).tested = true;
        }

        if (grid.getNodeAt(x, y) === this.endNode) {
            return [x, y];
        }

        // check for forced neighbors
        // along the diagonal
        if (dx !== 0 && dy !== 0) {
            // if ((grid.isWalkableAt(x - dx, y + dy) && !grid.isWalkableAt(x - dx, y)) ||
                // (grid.isWalkableAt(x + dx, y - dy) && !grid.isWalkableAt(x, y - dy))) {
                // return [x, y];
            // }
            // when moving diagonally, must check for vertical/horizontal jump points
            if (this._jump(x + dx, y, x, y) || this._jump(x, y + dy, x, y)) {
                return [x, y];
            }
        }
        // horizontally/vertically
        else {
            if (dx !== 0) {
                if ((grid.isWalkableAt(x, y - 1) && !grid.isWalkableAt(x - dx, y - 1)) ||
                    (grid.isWalkableAt(x, y + 1) && !grid.isWalkableAt(x - dx, y + 1))) {
                    return [x, y];
                }
            }
            else if (dy !== 0) {
                if ((grid.isWalkableAt(x - 1, y) && !grid.isWalkableAt(x - 1, y - dy)) ||
                    (grid.isWalkableAt(x + 1, y) && !grid.isWalkableAt(x + 1, y - dy))) {
                    return [x, y];
                }
                // When moving vertically, must check for horizontal jump points
                // if (this._jump(x + 1, y, x, y) || this._jump(x - 1, y, x, y)) {
                    // return [x, y];
                // }
            }
        }

        // moving diagonally, must make sure one of the vertical/horizontal
        // neighbors is open to allow the path
        if (grid.isWalkableAt(x + dx, y) && grid.isWalkableAt(x, y + dy)) {
            return this._jump(x + dx, y + dy, x, y);
        } else {
            return null;
        }
    };

    /**
     * Find the neighbors for the given node. If the node has a parent,
     * prune the neighbors based on the jump point search algorithm, otherwise
     * return all available neighbors.
     * @return {Array<Array<number>>} The neighbors found.
     */
    JPFMoveDiagonallyIfNoObstacles.prototype._findNeighbors = function(node) {
        var parent = node.parent,
            x = node.x, y = node.y,
            grid = this.grid,
            px, py, dx, dy,
            neighbors = [], neighborNodes, neighborNode, i, l;

        // directed pruning: can ignore most neighbors, unless forced.
        if (parent) {
            px = parent.x;
            py = parent.y;
            // get the normalized direction of travel
            dx = (x - px) / Math.max(Math.abs(x - px), 1);
            dy = (y - py) / Math.max(Math.abs(y - py), 1);

            // search diagonally
            if (dx !== 0 && dy !== 0) {
                if (grid.isWalkableAt(x, y + dy)) {
                    neighbors.push([x, y + dy]);
                }
                if (grid.isWalkableAt(x + dx, y)) {
                    neighbors.push([x + dx, y]);
                }
                if (grid.isWalkableAt(x, y + dy) && grid.isWalkableAt(x + dx, y)) {
                    neighbors.push([x + dx, y + dy]);
                }
            }
            // search horizontally/vertically
            else {
                var isNextWalkable;
                if (dx !== 0) {
                    isNextWalkable = grid.isWalkableAt(x + dx, y);
                    var isTopWalkable = grid.isWalkableAt(x, y + 1);
                    var isBottomWalkable = grid.isWalkableAt(x, y - 1);

                    if (isNextWalkable) {
                        neighbors.push([x + dx, y]);
                        if (isTopWalkable) {
                            neighbors.push([x + dx, y + 1]);
                        }
                        if (isBottomWalkable) {
                            neighbors.push([x + dx, y - 1]);
                        }
                    }
                    if (isTopWalkable) {
                        neighbors.push([x, y + 1]);
                    }
                    if (isBottomWalkable) {
                        neighbors.push([x, y - 1]);
                    }
                }
                else if (dy !== 0) {
                    isNextWalkable = grid.isWalkableAt(x, y + dy);
                    var isRightWalkable = grid.isWalkableAt(x + 1, y);
                    var isLeftWalkable = grid.isWalkableAt(x - 1, y);

                    if (isNextWalkable) {
                        neighbors.push([x, y + dy]);
                        if (isRightWalkable) {
                            neighbors.push([x + 1, y + dy]);
                        }
                        if (isLeftWalkable) {
                            neighbors.push([x - 1, y + dy]);
                        }
                    }
                    if (isRightWalkable) {
                        neighbors.push([x + 1, y]);
                    }
                    if (isLeftWalkable) {
                        neighbors.push([x - 1, y]);
                    }
                }
            }
        }
        // return all neighbors
        else {
            neighborNodes = grid.getNeighbors(node, DiagonalMovement_1.OnlyWhenNoObstacles);
            for (i = 0, l = neighborNodes.length; i < l; ++i) {
                neighborNode = neighborNodes[i];
                neighbors.push([neighborNode.x, neighborNode.y]);
            }
        }

        return neighbors;
    };

    var JPFMoveDiagonallyIfNoObstacles_1 = JPFMoveDiagonallyIfNoObstacles;

    /**
     * @author imor / https://github.com/imor
     */

    /**
     * Path finder using the Jump Point Search algorithm which moves
     * diagonally only when there is at most one obstacle.
     */
    function JPFMoveDiagonallyIfAtMostOneObstacle(opt) {
        JumpPointFinderBase_1.call(this, opt);
    }

    JPFMoveDiagonallyIfAtMostOneObstacle.prototype = new JumpPointFinderBase_1();
    JPFMoveDiagonallyIfAtMostOneObstacle.prototype.constructor = JPFMoveDiagonallyIfAtMostOneObstacle;

    /**
     * Search recursively in the direction (parent -> child), stopping only when a
     * jump point is found.
     * @protected
     * @return {Array<Array<number>>} The x, y coordinate of the jump point
     *     found, or null if not found
     */
    JPFMoveDiagonallyIfAtMostOneObstacle.prototype._jump = function(x, y, px, py) {
        var grid = this.grid,
            dx = x - px, dy = y - py;

        if (!grid.isWalkableAt(x, y)) {
            return null;
        }

        if(this.trackJumpRecursion === true) {
            grid.getNodeAt(x, y).tested = true;
        }

        if (grid.getNodeAt(x, y) === this.endNode) {
            return [x, y];
        }

        // check for forced neighbors
        // along the diagonal
        if (dx !== 0 && dy !== 0) {
            if ((grid.isWalkableAt(x - dx, y + dy) && !grid.isWalkableAt(x - dx, y)) ||
                (grid.isWalkableAt(x + dx, y - dy) && !grid.isWalkableAt(x, y - dy))) {
                return [x, y];
            }
            // when moving diagonally, must check for vertical/horizontal jump points
            if (this._jump(x + dx, y, x, y) || this._jump(x, y + dy, x, y)) {
                return [x, y];
            }
        }
        // horizontally/vertically
        else {
            if( dx !== 0 ) { // moving along x
                if((grid.isWalkableAt(x + dx, y + 1) && !grid.isWalkableAt(x, y + 1)) ||
                   (grid.isWalkableAt(x + dx, y - 1) && !grid.isWalkableAt(x, y - 1))) {
                    return [x, y];
                }
            }
            else {
                if((grid.isWalkableAt(x + 1, y + dy) && !grid.isWalkableAt(x + 1, y)) ||
                   (grid.isWalkableAt(x - 1, y + dy) && !grid.isWalkableAt(x - 1, y))) {
                    return [x, y];
                }
            }
        }

        // moving diagonally, must make sure one of the vertical/horizontal
        // neighbors is open to allow the path
        if (grid.isWalkableAt(x + dx, y) || grid.isWalkableAt(x, y + dy)) {
            return this._jump(x + dx, y + dy, x, y);
        } else {
            return null;
        }
    };

    /**
     * Find the neighbors for the given node. If the node has a parent,
     * prune the neighbors based on the jump point search algorithm, otherwise
     * return all available neighbors.
     * @return {Array<Array<number>>} The neighbors found.
     */
    JPFMoveDiagonallyIfAtMostOneObstacle.prototype._findNeighbors = function(node) {
        var parent = node.parent,
            x = node.x, y = node.y,
            grid = this.grid,
            px, py, dx, dy,
            neighbors = [], neighborNodes, neighborNode, i, l;

        // directed pruning: can ignore most neighbors, unless forced.
        if (parent) {
            px = parent.x;
            py = parent.y;
            // get the normalized direction of travel
            dx = (x - px) / Math.max(Math.abs(x - px), 1);
            dy = (y - py) / Math.max(Math.abs(y - py), 1);

            // search diagonally
            if (dx !== 0 && dy !== 0) {
                if (grid.isWalkableAt(x, y + dy)) {
                    neighbors.push([x, y + dy]);
                }
                if (grid.isWalkableAt(x + dx, y)) {
                    neighbors.push([x + dx, y]);
                }
                if (grid.isWalkableAt(x, y + dy) || grid.isWalkableAt(x + dx, y)) {
                    neighbors.push([x + dx, y + dy]);
                }
                if (!grid.isWalkableAt(x - dx, y) && grid.isWalkableAt(x, y + dy)) {
                    neighbors.push([x - dx, y + dy]);
                }
                if (!grid.isWalkableAt(x, y - dy) && grid.isWalkableAt(x + dx, y)) {
                    neighbors.push([x + dx, y - dy]);
                }
            }
            // search horizontally/vertically
            else {
                if(dx === 0) {
                    if (grid.isWalkableAt(x, y + dy)) {
                        neighbors.push([x, y + dy]);
                        if (!grid.isWalkableAt(x + 1, y)) {
                            neighbors.push([x + 1, y + dy]);
                        }
                        if (!grid.isWalkableAt(x - 1, y)) {
                            neighbors.push([x - 1, y + dy]);
                        }
                    }
                }
                else {
                    if (grid.isWalkableAt(x + dx, y)) {
                        neighbors.push([x + dx, y]);
                        if (!grid.isWalkableAt(x, y + 1)) {
                            neighbors.push([x + dx, y + 1]);
                        }
                        if (!grid.isWalkableAt(x, y - 1)) {
                            neighbors.push([x + dx, y - 1]);
                        }
                    }
                }
            }
        }
        // return all neighbors
        else {
            neighborNodes = grid.getNeighbors(node, DiagonalMovement_1.IfAtMostOneObstacle);
            for (i = 0, l = neighborNodes.length; i < l; ++i) {
                neighborNode = neighborNodes[i];
                neighbors.push([neighborNode.x, neighborNode.y]);
            }
        }

        return neighbors;
    };

    var JPFMoveDiagonallyIfAtMostOneObstacle_1 = JPFMoveDiagonallyIfAtMostOneObstacle;

    /**
     * @author aniero / https://github.com/aniero
     */

    /**
     * Path finder using the Jump Point Search algorithm
     * @param {Object} opt
     * @param {function} opt.heuristic Heuristic function to estimate the distance
     *     (defaults to manhattan).
     * @param {DiagonalMovement} opt.diagonalMovement Condition under which diagonal
     *      movement will be allowed.
     */
    function JumpPointFinder(opt) {
        opt = opt || {};
        if (opt.diagonalMovement === DiagonalMovement_1.Never) {
            return new JPFNeverMoveDiagonally_1(opt);
        } else if (opt.diagonalMovement === DiagonalMovement_1.Always) {
            return new JPFAlwaysMoveDiagonally_1(opt);
        } else if (opt.diagonalMovement === DiagonalMovement_1.OnlyWhenNoObstacles) {
            return new JPFMoveDiagonallyIfNoObstacles_1(opt);
        } else {
            return new JPFMoveDiagonallyIfAtMostOneObstacle_1(opt);
        }
    }

    var JumpPointFinder_1 = JumpPointFinder;

    var PathFinding$1 = {
        'Heap'                      : heap,
        'Node'                      : Node_1,
        'Grid'                      : Grid_1,
        'Util'                      : Util,
        'DiagonalMovement'          : DiagonalMovement_1,
        'Heuristic'                 : Heuristic,
        'AStarFinder'               : AStarFinder_1,
        'BestFirstFinder'           : BestFirstFinder_1,
        'BreadthFirstFinder'        : BreadthFirstFinder_1,
        'DijkstraFinder'            : DijkstraFinder_1,
        'BiAStarFinder'             : BiAStarFinder_1,
        'BiBestFirstFinder'         : BiBestFirstFinder_1,
        'BiBreadthFirstFinder'      : BiBreadthFirstFinder_1,
        'BiDijkstraFinder'          : BiDijkstraFinder_1,
        'IDAStarFinder'             : IDAStarFinder_1,
        'JumpPointFinder'           : JumpPointFinder_1,
    };

    var PathFinding = PathFinding$1;

    class LevelGrid {
      constructor(blocks, level, gridSize) {
        this.smoothPathing = level.smoothPathing;
        this.gridSize = gridSize;

        const walkableBlocks = level.blocks
          .filter(b => blocks.find(bc => bc.id == b.id).canWalk)
          // sort by x, then y
          .sort((a, b) => (a.x == b.x ? a.y - b.y : a.x - b.x));

        let highestX = walkableBlocks.map(b => b.x).sort((a, b) => b - a)[0];
        let highestY = walkableBlocks.map(b => b.y).sort((a, b) => b - a)[0];

        if (highestX == null) highestX = 10;
        if (highestY == null) highestY = 10;

        this.grid = new PathFinding.Grid(highestX + 1, highestY + 1);

        // make only walkable blocks work
        for (let x = 0; x <= highestX; x++) {
          for (let y = 0; y <= highestY; y++) {
            this.grid.setWalkableAt(x, y, false);
          }
        }
        walkableBlocks.forEach(b => this.grid.setWalkableAt(b.x, b.y, true));

        this.finder = new PathFinding.AStarFinder({
          allowDiagonal: true,
          dontCrossCorners: true,
        });
      }

      /**
       * return a path between {from} and {to} as an array of {x, y} coordinates
       * @param {x, y coordinates} from
       * @param {x, y coordinates} to
       * @returns
       */
      findPath(from, to) {
        const [startX, startY] = this.toGridCoordinates(from);
        const [goalX, goalY] = this.toGridCoordinates(to);

        // find all points in a line between from and to
        // filter to only walkable points
        // loop walkable points backward, trying to find paths to them.  use the first path found.
        const lineBetween = PathFinding.Util.interpolate(startX, startY, goalX, goalY).filter(([x, y]) => this.grid.isWalkableAt(x, y));
        let path = null;
        for (let i = lineBetween.length - 1; i >= 0; i--) {
          let [x, y] = lineBetween[i];
          path = this.finder.findPath(startX, startY, x, y, this.grid.clone());
          if (path.length > 0) break
        }
        if (path == null || path.length == 0) return []

        path = this.smoothPathing ? PathFinding.Util.smoothenPath(this.grid, path) : PathFinding.Util.compressPath(path);

        // remove the first point if it's the same as start
        if (path.length && path[0][0] == startX && path[0][1] == startY) path.shift();

        return path.map(([x, y]) => this.toGameCoordinates({ x, y }))
      }

      canSee(from, to) {
        const [startX, startY] = this.toGridCoordinates(from);
        const [goalX, goalY] = this.toGridCoordinates(to);
        const line = PathFinding.Util.interpolate(startX, startY, goalX, goalY);
        const allwalkable = line.every(([x, y]) => this.grid.isWalkableAt(x, y));
        // console.log(
        //   'cansee',
        //   line.map(([x, y]) => `${x},${y},${this.grid.isWalkableAt(x, y)}`),
        //   allwalkable
        // )
        return allwalkable
      }

      toGridCoordinates(coords) {
        return [Math.floor(coords.x / this.gridSize), Math.floor(coords.y / this.gridSize)]
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

    function isTouching(_a, _b) {
      let a = _a.getBounds();
      let b = _b.getBounds();
      return a.x + a.width > b.x && a.x < b.x + b.width && a.y + a.height > b.y && a.y < b.y + b.height
    }

    /* src\client\pages\LevelBuilder.Renderer.svelte generated by Svelte v3.38.3 */

    const { Object: Object_1, console: console_1 } = globals;
    const file$4 = "src\\client\\pages\\LevelBuilder.Renderer.svelte";

    function create_fragment$5(ctx) {
    	let div;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "pixi-container svelte-1fhmuas");
    			add_location(div, file$4, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			/*div_binding*/ ctx[12](div);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "pointerdown", prevent_default(/*onPointerDown*/ ctx[1]), false, true, false),
    					listen_dev(div, "pointerup", prevent_default(/*onPointerUp*/ ctx[3]), false, true, false),
    					listen_dev(div, "pointermove", prevent_default(/*onPointerMove*/ ctx[2]), false, true, false),
    					listen_dev(div, "contextmenu", prevent_default(/*contextmenu_handler*/ ctx[11]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*div_binding*/ ctx[12](null);
    			mounted = false;
    			run_all(dispose);
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

    function emptyContainer(container) {
    	container?.children.forEach(c => {
    		c.destroy();
    		container.removeChild(c);
    	});
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let $blocks;
    	let $art;
    	let $items;
    	let $enemies;
    	let $characters;
    	validate_store(blocks, "blocks");
    	component_subscribe($$self, blocks, $$value => $$invalidate(22, $blocks = $$value));
    	validate_store(art, "art");
    	component_subscribe($$self, art, $$value => $$invalidate(23, $art = $$value));
    	validate_store(items, "items");
    	component_subscribe($$self, items, $$value => $$invalidate(24, $items = $$value));
    	validate_store(enemies, "enemies");
    	component_subscribe($$self, enemies, $$value => $$invalidate(25, $enemies = $$value));
    	validate_store(characters, "characters");
    	component_subscribe($$self, characters, $$value => $$invalidate(26, $characters = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("LevelBuilder_Renderer", slots, []);
    	const dispatch = createEventDispatcher();
    	let pixiContainer;
    	let pixiApp;
    	let world;
    	let player;
    	let itemContainer;
    	let blockContainer;
    	let enemyContainer;
    	let levelGrid;
    	let screenTarget = { x: 0, y: 0 };
    	let { level } = $$props;
    	let { playable = false } = $$props;
    	let { gridSize } = $$props;

    	////// input
    	let pointerIsDown = false;

    	function onPointerDown(event) {
    		pointerIsDown = true;
    		if (playable) movePlayerToEvent(event);
    		dispatch("pointerdown", event);
    	}

    	function onPointerMove(event) {
    		if (playable && pointerIsDown) movePlayerToEvent(event);
    		dispatch("pointermove", event);
    	}

    	function onPointerUp(event) {
    		pointerIsDown = false;
    		dispatch("pointerup", event);
    	}

    	function movePlayerToEvent(event) {
    		$$invalidate(10, screenTarget = { x: event.offsetX, y: event.offsetY });
    	}

    	////// end input
    	function startPixi() {
    		pixiApp = new PIXI.Application({ resizeTo: pixiContainer });
    		pixiContainer.appendChild(pixiApp.view);
    		pixiApp.ticker.add(onTick);
    		renderLevel();
    	}

    	function redrawBlocks() {
    		emptyContainer(blockContainer);

    		for (const blockConfig of level.blocks) {
    			const bc = $blocks.find(b => b.id == blockConfig.id);
    			if (bc == null) continue;
    			const block = new Block(bc, $art.find(a => a.id == bc.graphic), blockConfig, gridSize);
    			blockContainer.addChild(block);
    		}
    	}

    	function redrawItems() {
    		emptyContainer(itemContainer);

    		for (const itemConfig of level.items) {
    			const ic = $items.find(i => i.id == itemConfig.id);
    			const item = new Item(ic, $art.find(a => a.id == ic.graphics.still), itemConfig, gridSize);
    			itemContainer.addChild(item);
    		}
    	}

    	function redrawEnemies() {
    		emptyContainer(enemyContainer);

    		for (const enemyConfig of level.enemies) {
    			const e = $enemies.find(e => e.id == enemyConfig.id);
    			const enemy = new Enemy(buildGraphics(e.graphics), e, (enemyConfig.x + 1) * gridSize, (enemyConfig.y + 1) * gridSize, levelGrid, level.showPaths, level.showSightRadius);
    			enemyContainer.addChild(enemy);
    		}
    	}

    	function renderLevel() {
    		// clear pixi stage to re-render everything
    		pixiApp.stage.children.forEach(c => pixiApp.stage.removeChild(c));

    		// preload art
    		preloadArt().then(() => {
    			// set background color and clear stage whenever we re-render level (this should only be called once when playing levels, or any time the level is changed when editing levels)
    			pixiApp.renderer.backgroundColor = rgbaStringToHex(level.backgroundColor);

    			// level grid helper for pathing
    			levelGrid = new LevelGrid($blocks, level, gridSize);

    			// world contains everything but player
    			world = new PIXI.Container();

    			blockContainer = new PIXI.Container();
    			world.addChild(blockContainer);
    			redrawBlocks();
    			itemContainer = new PIXI.Container();
    			world.addChild(itemContainer);
    			redrawItems();
    			enemyContainer = new PIXI.Container();
    			world.addChild(enemyContainer);
    			redrawEnemies();
    			pixiApp.stage.addChild(world);
    			pixiApp.stage.sortableChildren = true; // makes pixi automatically sort children by zIndex

    			// create player
    			if ($characters.length > 0) {
    				const char = $characters[0];
    				player = new Player(buildGraphics(char.graphics), char, 1.5 * gridSize, 1.5 * gridSize, levelGrid, level.showPaths);
    				pixiApp.stage.addChild(player);
    			}
    		});
    	}

    	function preloadArt() {
    		return new Promise((resolve, reject) => {
    				const loader = new PIXI.Loader();

    				$art.forEach(a => {
    					loader.add(a.png);
    					loader.onError.add(err => console.log("art loader failed", err));
    				});

    				loader.load(resolve);
    			});
    	}

    	function buildGraphics(graphicIds) {
    		const graphics = {};

    		Object.keys(graphicIds).forEach(key => {
    			graphics[key] = $art.find(a => a.id == graphicIds[key]);
    		});

    		return graphics;
    	}

    	const screenCenter = { x: 0, y: 0 };

    	function setPlayerTarget() {
    		if (player == null) return;

    		const worldCoordinates = {
    			x: screenTarget.x - screenCenter.x + player?.x ?? 0,
    			y: screenTarget.y - screenCenter.y + player?.y ?? 0
    		};

    		player.setTarget(worldCoordinates);
    	}

    	function onTick() {
    		player?.onTick();
    		centerViewOnPlayer();

    		if (playable) {
    			enemyContainer?.children.filter(e => e.config != null).forEach(enemy => {
    				// if enemy can see player, target player
    				// otherwise clear their target
    				if (enemy.canSee(player)) {
    					enemy.setTarget(player);
    				} else {
    					enemy.clearPathAfterCurrentTarget();
    				}

    				enemy.onTick();
    			});

    			checkCollisions();
    		}
    	}

    	function centerViewOnPlayer() {
    		screenCenter.x = pixiApp.renderer.width / 2;
    		screenCenter.y = pixiApp.renderer.height / 2;

    		if (playable && player) {
    			pixiApp.stage.x = screenCenter.x;
    			pixiApp.stage.y = screenCenter.y;
    			pixiApp.stage.pivot.x = player.x;
    			pixiApp.stage.pivot.y = player.y;
    		} else {
    			pixiApp.stage.x = 0;
    			pixiApp.stage.y = 0;
    			pixiApp.stage.pivot.x = 0;
    			pixiApp.stage.pivot.y = 0;
    		}
    	}

    	function checkCollisions() {
    		itemContainer?.children.forEach(item => {
    			if (item.config.playersCanUse) {
    				if (isTouching(item, player)) {
    					item.onCollision(player);
    					if (item.config.removeOnCollision) itemContainer.removeChild(item);
    				}
    			}

    			if (item.config.enemiesCanUse) {
    				enemyContainer.children.forEach(enemy => {
    					if (isTouching(item, enemy)) {
    						item.onCollision(enemy);
    						if (item.config.removeOnCollision) itemContainer.removeChild(item);
    					}
    				});
    			}
    		});
    	}

    	const writable_props = ["level", "playable", "gridSize"];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<LevelBuilder_Renderer> was created with unknown prop '${key}'`);
    	});

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
    		if ("level" in $$props) $$invalidate(4, level = $$props.level);
    		if ("playable" in $$props) $$invalidate(5, playable = $$props.playable);
    		if ("gridSize" in $$props) $$invalidate(6, gridSize = $$props.gridSize);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		rgbaStringToHex,
    		art,
    		blocks,
    		characters,
    		enemies,
    		items,
    		Player,
    		Enemy,
    		Block,
    		Item,
    		LevelGrid,
    		isTouching,
    		dispatch,
    		pixiContainer,
    		pixiApp,
    		world,
    		player,
    		itemContainer,
    		blockContainer,
    		enemyContainer,
    		levelGrid,
    		screenTarget,
    		level,
    		playable,
    		gridSize,
    		pointerIsDown,
    		onPointerDown,
    		onPointerMove,
    		onPointerUp,
    		movePlayerToEvent,
    		startPixi,
    		redrawBlocks,
    		redrawItems,
    		redrawEnemies,
    		emptyContainer,
    		renderLevel,
    		preloadArt,
    		buildGraphics,
    		screenCenter,
    		setPlayerTarget,
    		onTick,
    		centerViewOnPlayer,
    		checkCollisions,
    		$blocks,
    		$art,
    		$items,
    		$enemies,
    		$characters
    	});

    	$$self.$inject_state = $$props => {
    		if ("pixiContainer" in $$props) $$invalidate(0, pixiContainer = $$props.pixiContainer);
    		if ("pixiApp" in $$props) pixiApp = $$props.pixiApp;
    		if ("world" in $$props) world = $$props.world;
    		if ("player" in $$props) player = $$props.player;
    		if ("itemContainer" in $$props) itemContainer = $$props.itemContainer;
    		if ("blockContainer" in $$props) blockContainer = $$props.blockContainer;
    		if ("enemyContainer" in $$props) enemyContainer = $$props.enemyContainer;
    		if ("levelGrid" in $$props) levelGrid = $$props.levelGrid;
    		if ("screenTarget" in $$props) $$invalidate(10, screenTarget = $$props.screenTarget);
    		if ("level" in $$props) $$invalidate(4, level = $$props.level);
    		if ("playable" in $$props) $$invalidate(5, playable = $$props.playable);
    		if ("gridSize" in $$props) $$invalidate(6, gridSize = $$props.gridSize);
    		if ("pointerIsDown" in $$props) pointerIsDown = $$props.pointerIsDown;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*pixiContainer*/ 1) {
    			if (pixiContainer != null) startPixi();
    		}

    		if ($$self.$$.dirty[0] & /*screenTarget*/ 1024) {
    			if (screenTarget.x != 0 || screenTarget.y != 0) setPlayerTarget();
    		}
    	};

    	return [
    		pixiContainer,
    		onPointerDown,
    		onPointerMove,
    		onPointerUp,
    		level,
    		playable,
    		gridSize,
    		redrawBlocks,
    		redrawItems,
    		redrawEnemies,
    		screenTarget,
    		contextmenu_handler,
    		div_binding
    	];
    }

    class LevelBuilder_Renderer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$5,
    			create_fragment$5,
    			safe_not_equal,
    			{
    				level: 4,
    				playable: 5,
    				gridSize: 6,
    				redrawBlocks: 7,
    				redrawItems: 8,
    				redrawEnemies: 9
    			},
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LevelBuilder_Renderer",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*level*/ ctx[4] === undefined && !("level" in props)) {
    			console_1.warn("<LevelBuilder_Renderer> was created without expected prop 'level'");
    		}

    		if (/*gridSize*/ ctx[6] === undefined && !("gridSize" in props)) {
    			console_1.warn("<LevelBuilder_Renderer> was created without expected prop 'gridSize'");
    		}
    	}

    	get level() {
    		throw new Error("<LevelBuilder_Renderer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set level(value) {
    		throw new Error("<LevelBuilder_Renderer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get playable() {
    		throw new Error("<LevelBuilder_Renderer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set playable(value) {
    		throw new Error("<LevelBuilder_Renderer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get gridSize() {
    		throw new Error("<LevelBuilder_Renderer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set gridSize(value) {
    		throw new Error("<LevelBuilder_Renderer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get redrawBlocks() {
    		return this.$$.ctx[7];
    	}

    	set redrawBlocks(value) {
    		throw new Error("<LevelBuilder_Renderer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get redrawItems() {
    		return this.$$.ctx[8];
    	}

    	set redrawItems(value) {
    		throw new Error("<LevelBuilder_Renderer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get redrawEnemies() {
    		return this.$$.ctx[9];
    	}

    	set redrawEnemies(value) {
    		throw new Error("<LevelBuilder_Renderer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\client\pages\LevelBuilder.svelte generated by Svelte v3.38.3 */
    const file$3 = "src\\client\\pages\\LevelBuilder.svelte";

    // (4:6) {#if $characters?.length}
    function create_if_block_6(ctx) {
    	let artthumb;
    	let current;

    	artthumb = new ArtThumb({
    			props: {
    				id: /*$characters*/ ctx[13][0].graphics.still
    			},
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
    			if (dirty[0] & /*$characters*/ 8192) artthumb_changes.id = /*$characters*/ ctx[13][0].graphics.still;
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
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(4:6) {#if $characters?.length}",
    		ctx
    	});

    	return block;
    }

    // (3:4) <ItemListNav slug="levels" type="level" collection={$levels} active={paramId} let:item>
    function create_default_slot_9(ctx) {
    	let t0;
    	let t1_value = /*item*/ ctx[49].name + "";
    	let t1;
    	let current;
    	let if_block = /*$characters*/ ctx[13]?.length && create_if_block_6(ctx);

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
    			if (/*$characters*/ ctx[13]?.length) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[0] & /*$characters*/ 8192) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_6(ctx);
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

    			if ((!current || dirty[1] & /*item*/ 262144) && t1_value !== (t1_value = /*item*/ ctx[49].name + "")) set_data_dev(t1, t1_value);
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
    		id: create_default_slot_9.name,
    		type: "slot",
    		source: "(3:4) <ItemListNav slug=\\\"levels\\\" type=\\\"level\\\" collection={$levels} active={paramId} let:item>",
    		ctx
    	});

    	return block;
    }

    // (14:2) {#if input}
    function create_if_block$1(ctx) {
    	let div0;
    	let current_block_type_index;
    	let if_block;
    	let t0;
    	let div3;
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
    	let current;
    	let mounted;
    	let dispose;
    	const if_block_creators = [create_if_block_5, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*$isDrawing*/ ctx[14]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	form = new Form({
    			props: {
    				hasChanges: /*hasChanges*/ ctx[9],
    				$$slots: {
    					buttons: [create_buttons_slot],
    					default: [create_default_slot_1$1]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	form.$on("submit", /*save*/ ctx[17]);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			if_block.c();
    			t0 = space();
    			div3 = element("div");
    			div1 = element("div");
    			button0 = element("button");
    			t1 = text("Play");
    			t2 = space();
    			button1 = element("button");
    			t3 = text("Edit");
    			t4 = space();
    			div2 = element("div");
    			create_component(form.$$.fragment);
    			attr_dev(div0, "class", "grow");
    			set_style(div0, "position", "relative");
    			add_location(div0, file$3, 14, 4, 444);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", button0_class_value = "btn " + (!/*$isDrawing*/ ctx[14] ? "btn-success" : ""));
    			add_location(button0, file$3, 32, 8, 995);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", button1_class_value = "btn " + (/*$isDrawing*/ ctx[14] ? "btn-success" : ""));
    			add_location(button1, file$3, 33, 8, 1125);
    			attr_dev(div1, "class", "btn-group");
    			add_location(div1, file$3, 31, 6, 962);
    			attr_dev(div2, "class", "grow");
    			add_location(div2, file$3, 36, 6, 1267);
    			attr_dev(div3, "class", "col2 rows");
    			add_location(div3, file$3, 30, 4, 931);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			if_blocks[current_block_type_index].m(div0, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div1);
    			append_dev(div1, button0);
    			append_dev(button0, t1);
    			append_dev(div1, t2);
    			append_dev(div1, button1);
    			append_dev(button1, t3);
    			append_dev(div3, t4);
    			append_dev(div3, div2);
    			mount_component(form, div2, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[29], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[30], false, false, false)
    				];

    				mounted = true;
    			}
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
    				if_block.m(div0, null);
    			}

    			if (!current || dirty[0] & /*$isDrawing*/ 16384 && button0_class_value !== (button0_class_value = "btn " + (!/*$isDrawing*/ ctx[14] ? "btn-success" : ""))) {
    				attr_dev(button0, "class", button0_class_value);
    			}

    			if (!current || dirty[0] & /*$isDrawing*/ 16384 && button1_class_value !== (button1_class_value = "btn " + (/*$isDrawing*/ ctx[14] ? "btn-success" : ""))) {
    				attr_dev(button1, "class", button1_class_value);
    			}

    			const form_changes = {};
    			if (dirty[0] & /*hasChanges*/ 512) form_changes.hasChanges = /*hasChanges*/ ctx[9];

    			if (dirty[0] & /*isAdding, drawMode, enemyOptions, selectedEnemyId, itemOptions, selectedItemId, blockOptions, selectedBlockId, input*/ 7665 | dirty[1] & /*$$scope*/ 524288) {
    				form_changes.$$scope = { dirty, ctx };
    			}

    			form.$set(form_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(form.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			transition_out(form.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if_blocks[current_block_type_index].d();
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div3);
    			destroy_component(form);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(14:2) {#if input}",
    		ctx
    	});

    	return block;
    }

    // (26:6) {:else}
    function create_else_block$1(ctx) {
    	let levelrenderer;
    	let current;

    	let levelrenderer_props = {
    		level: /*input*/ ctx[0],
    		playable: true,
    		gridSize
    	};

    	levelrenderer = new LevelBuilder_Renderer({
    			props: levelrenderer_props,
    			$$inline: true
    		});

    	/*levelrenderer_binding_1*/ ctx[28](levelrenderer);

    	const block = {
    		c: function create() {
    			create_component(levelrenderer.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(levelrenderer, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const levelrenderer_changes = {};
    			if (dirty[0] & /*input*/ 1) levelrenderer_changes.level = /*input*/ ctx[0];
    			levelrenderer.$set(levelrenderer_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(levelrenderer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(levelrenderer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			/*levelrenderer_binding_1*/ ctx[28](null);
    			destroy_component(levelrenderer, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(26:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (16:6) {#if $isDrawing}
    function create_if_block_5(ctx) {
    	let levelrenderer;
    	let current;

    	let levelrenderer_props = {
    		level: /*input*/ ctx[0],
    		playable: false,
    		gridSize
    	};

    	levelrenderer = new LevelBuilder_Renderer({
    			props: levelrenderer_props,
    			$$inline: true
    		});

    	/*levelrenderer_binding*/ ctx[27](levelrenderer);
    	levelrenderer.$on("pointerdown", /*onDrawPointerDown*/ ctx[19]);
    	levelrenderer.$on("pointerup", /*onDrawPointerUp*/ ctx[21]);
    	levelrenderer.$on("pointermove", /*onDrawPointerMove*/ ctx[20]);

    	const block = {
    		c: function create() {
    			create_component(levelrenderer.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(levelrenderer, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const levelrenderer_changes = {};
    			if (dirty[0] & /*input*/ 1) levelrenderer_changes.level = /*input*/ ctx[0];
    			levelrenderer.$set(levelrenderer_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(levelrenderer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(levelrenderer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			/*levelrenderer_binding*/ ctx[27](null);
    			destroy_component(levelrenderer, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(16:6) {#if $isDrawing}",
    		ctx
    	});

    	return block;
    }

    // (45:10) <FieldText name="name" bind:value={input.name} placeholder="Type a name...">
    function create_default_slot_8(ctx) {
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
    		id: create_default_slot_8.name,
    		type: "slot",
    		source: "(45:10) <FieldText name=\\\"name\\\" bind:value={input.name} placeholder=\\\"Type a name...\\\">",
    		ctx
    	});

    	return block;
    }

    // (51:10) <FieldCheckbox bind:checked={input.smoothPathing} name="smooth-pathing">
    function create_default_slot_7(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Smooth pathing");
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
    		source: "(51:10) <FieldCheckbox bind:checked={input.smoothPathing} name=\\\"smooth-pathing\\\">",
    		ctx
    	});

    	return block;
    }

    // (52:10) <FieldCheckbox bind:checked={input.showPaths} name="show-paths">
    function create_default_slot_6(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Show paths");
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
    		id: create_default_slot_6.name,
    		type: "slot",
    		source: "(52:10) <FieldCheckbox bind:checked={input.showPaths} name=\\\"show-paths\\\">",
    		ctx
    	});

    	return block;
    }

    // (53:10) <FieldCheckbox bind:checked={input.showSightRadius} name="show-sight-radius">
    function create_default_slot_5(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Show sight radius");
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
    		source: "(53:10) <FieldCheckbox bind:checked={input.showSightRadius} name=\\\"show-sight-radius\\\">",
    		ctx
    	});

    	return block;
    }

    // (60:18) {#if option.graphic != null}
    function create_if_block_4(ctx) {
    	let artthumb;
    	let current;

    	artthumb = new ArtThumb({
    			props: { id: /*option*/ ctx[48].graphic },
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
    			if (dirty[1] & /*option*/ 131072) artthumb_changes.id = /*option*/ ctx[48].graphic;
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
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(60:18) {#if option.graphic != null}",
    		ctx
    	});

    	return block;
    }

    // (59:16) <InputSelect bind:value={selectedBlockId} options={blockOptions} let:option>
    function create_default_slot_4(ctx) {
    	let t0;
    	let t1_value = /*option*/ ctx[48].name + "";
    	let t1;
    	let current;
    	let if_block = /*option*/ ctx[48].graphic != null && create_if_block_4(ctx);

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
    			if (/*option*/ ctx[48].graphic != null) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[1] & /*option*/ 131072) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_4(ctx);
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

    			if ((!current || dirty[1] & /*option*/ 131072) && t1_value !== (t1_value = /*option*/ ctx[48].name + "")) set_data_dev(t1, t1_value);
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
    		id: create_default_slot_4.name,
    		type: "slot",
    		source: "(59:16) <InputSelect bind:value={selectedBlockId} options={blockOptions} let:option>",
    		ctx
    	});

    	return block;
    }

    // (72:18) {#if option.graphics?.still != null}
    function create_if_block_3(ctx) {
    	let artthumb;
    	let current;

    	artthumb = new ArtThumb({
    			props: { id: /*option*/ ctx[48].graphics.still },
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
    			if (dirty[1] & /*option*/ 131072) artthumb_changes.id = /*option*/ ctx[48].graphics.still;
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
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(72:18) {#if option.graphics?.still != null}",
    		ctx
    	});

    	return block;
    }

    // (71:16) <InputSelect bind:value={selectedItemId} options={itemOptions} let:option>
    function create_default_slot_3$1(ctx) {
    	let t0;
    	let t1_value = /*option*/ ctx[48].name + "";
    	let t1;
    	let current;
    	let if_block = /*option*/ ctx[48].graphics?.still != null && create_if_block_3(ctx);

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
    			if (/*option*/ ctx[48].graphics?.still != null) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[1] & /*option*/ 131072) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_3(ctx);
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

    			if ((!current || dirty[1] & /*option*/ 131072) && t1_value !== (t1_value = /*option*/ ctx[48].name + "")) set_data_dev(t1, t1_value);
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
    		id: create_default_slot_3$1.name,
    		type: "slot",
    		source: "(71:16) <InputSelect bind:value={selectedItemId} options={itemOptions} let:option>",
    		ctx
    	});

    	return block;
    }

    // (84:18) {#if option.graphics?.still != null}
    function create_if_block_2(ctx) {
    	let artthumb;
    	let current;

    	artthumb = new ArtThumb({
    			props: { id: /*option*/ ctx[48].graphics.still },
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
    			if (dirty[1] & /*option*/ 131072) artthumb_changes.id = /*option*/ ctx[48].graphics.still;
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
    		source: "(84:18) {#if option.graphics?.still != null}",
    		ctx
    	});

    	return block;
    }

    // (83:16) <InputSelect bind:value={selectedEnemyId} options={enemyOptions} let:option>
    function create_default_slot_2$1(ctx) {
    	let t0;
    	let t1_value = /*option*/ ctx[48].name + "";
    	let t1;
    	let current;
    	let if_block = /*option*/ ctx[48].graphics?.still != null && create_if_block_2(ctx);

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
    			if (/*option*/ ctx[48].graphics?.still != null) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[1] & /*option*/ 131072) {
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

    			if ((!current || dirty[1] & /*option*/ 131072) && t1_value !== (t1_value = /*option*/ ctx[48].name + "")) set_data_dev(t1, t1_value);
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
    		source: "(83:16) <InputSelect bind:value={selectedEnemyId} options={enemyOptions} let:option>",
    		ctx
    	});

    	return block;
    }

    // (38:8) <Form on:submit={save} {hasChanges}>
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
    	let fieldcheckbox0;
    	let updating_checked;
    	let t4;
    	let fieldcheckbox1;
    	let updating_checked_1;
    	let t5;
    	let fieldcheckbox2;
    	let updating_checked_2;
    	let t6;
    	let div7;
    	let div2;
    	let div1;
    	let label1;
    	let t8;
    	let inputselect0;
    	let updating_value_2;
    	let t9;
    	let div4;
    	let div3;
    	let label2;
    	let t11;
    	let inputselect1;
    	let updating_value_3;
    	let t12;
    	let div6;
    	let div5;
    	let label3;
    	let t14;
    	let inputselect2;
    	let updating_value_4;
    	let current;
    	let mounted;
    	let dispose;

    	function fieldtext_value_binding(value) {
    		/*fieldtext_value_binding*/ ctx[31](value);
    	}

    	let fieldtext_props = {
    		name: "name",
    		placeholder: "Type a name...",
    		$$slots: { default: [create_default_slot_8] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].name !== void 0) {
    		fieldtext_props.value = /*input*/ ctx[0].name;
    	}

    	fieldtext = new FieldText({ props: fieldtext_props, $$inline: true });
    	binding_callbacks.push(() => bind(fieldtext, "value", fieldtext_value_binding));

    	function colorpicker_value_binding(value) {
    		/*colorpicker_value_binding*/ ctx[32](value);
    	}

    	let colorpicker_props = { dropdownClass: "below right" };

    	if (/*input*/ ctx[0].backgroundColor !== void 0) {
    		colorpicker_props.value = /*input*/ ctx[0].backgroundColor;
    	}

    	colorpicker = new ColorPicker({ props: colorpicker_props, $$inline: true });
    	binding_callbacks.push(() => bind(colorpicker, "value", colorpicker_value_binding));

    	function fieldcheckbox0_checked_binding(value) {
    		/*fieldcheckbox0_checked_binding*/ ctx[33](value);
    	}

    	let fieldcheckbox0_props = {
    		name: "smooth-pathing",
    		$$slots: { default: [create_default_slot_7] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].smoothPathing !== void 0) {
    		fieldcheckbox0_props.checked = /*input*/ ctx[0].smoothPathing;
    	}

    	fieldcheckbox0 = new FieldCheckbox({
    			props: fieldcheckbox0_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(fieldcheckbox0, "checked", fieldcheckbox0_checked_binding));

    	function fieldcheckbox1_checked_binding(value) {
    		/*fieldcheckbox1_checked_binding*/ ctx[34](value);
    	}

    	let fieldcheckbox1_props = {
    		name: "show-paths",
    		$$slots: { default: [create_default_slot_6] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].showPaths !== void 0) {
    		fieldcheckbox1_props.checked = /*input*/ ctx[0].showPaths;
    	}

    	fieldcheckbox1 = new FieldCheckbox({
    			props: fieldcheckbox1_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(fieldcheckbox1, "checked", fieldcheckbox1_checked_binding));

    	function fieldcheckbox2_checked_binding(value) {
    		/*fieldcheckbox2_checked_binding*/ ctx[35](value);
    	}

    	let fieldcheckbox2_props = {
    		name: "show-sight-radius",
    		$$slots: { default: [create_default_slot_5] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].showSightRadius !== void 0) {
    		fieldcheckbox2_props.checked = /*input*/ ctx[0].showSightRadius;
    	}

    	fieldcheckbox2 = new FieldCheckbox({
    			props: fieldcheckbox2_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(fieldcheckbox2, "checked", fieldcheckbox2_checked_binding));

    	function inputselect0_value_binding(value) {
    		/*inputselect0_value_binding*/ ctx[36](value);
    	}

    	let inputselect0_props = {
    		options: /*blockOptions*/ ctx[10],
    		$$slots: {
    			default: [
    				create_default_slot_4,
    				({ option }) => ({ 48: option }),
    				({ option }) => [0, option ? 131072 : 0]
    			]
    		},
    		$$scope: { ctx }
    	};

    	if (/*selectedBlockId*/ ctx[4] !== void 0) {
    		inputselect0_props.value = /*selectedBlockId*/ ctx[4];
    	}

    	inputselect0 = new InputSelect({
    			props: inputselect0_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(inputselect0, "value", inputselect0_value_binding));

    	function inputselect1_value_binding(value) {
    		/*inputselect1_value_binding*/ ctx[38](value);
    	}

    	let inputselect1_props = {
    		options: /*itemOptions*/ ctx[11],
    		$$slots: {
    			default: [
    				create_default_slot_3$1,
    				({ option }) => ({ 48: option }),
    				({ option }) => [0, option ? 131072 : 0]
    			]
    		},
    		$$scope: { ctx }
    	};

    	if (/*selectedItemId*/ ctx[5] !== void 0) {
    		inputselect1_props.value = /*selectedItemId*/ ctx[5];
    	}

    	inputselect1 = new InputSelect({
    			props: inputselect1_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(inputselect1, "value", inputselect1_value_binding));

    	function inputselect2_value_binding(value) {
    		/*inputselect2_value_binding*/ ctx[40](value);
    	}

    	let inputselect2_props = {
    		options: /*enemyOptions*/ ctx[12],
    		$$slots: {
    			default: [
    				create_default_slot_2$1,
    				({ option }) => ({ 48: option }),
    				({ option }) => [0, option ? 131072 : 0]
    			]
    		},
    		$$scope: { ctx }
    	};

    	if (/*selectedEnemyId*/ ctx[6] !== void 0) {
    		inputselect2_props.value = /*selectedEnemyId*/ ctx[6];
    	}

    	inputselect2 = new InputSelect({
    			props: inputselect2_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(inputselect2, "value", inputselect2_value_binding));

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
    			create_component(fieldcheckbox0.$$.fragment);
    			t4 = space();
    			create_component(fieldcheckbox1.$$.fragment);
    			t5 = space();
    			create_component(fieldcheckbox2.$$.fragment);
    			t6 = space();
    			div7 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			label1 = element("label");
    			label1.textContent = "Place a block";
    			t8 = space();
    			create_component(inputselect0.$$.fragment);
    			t9 = space();
    			div4 = element("div");
    			div3 = element("div");
    			label2 = element("label");
    			label2.textContent = "Place an item";
    			t11 = space();
    			create_component(inputselect1.$$.fragment);
    			t12 = space();
    			div6 = element("div");
    			div5 = element("div");
    			label3 = element("label");
    			label3.textContent = "Place an enemy";
    			t14 = space();
    			create_component(inputselect2.$$.fragment);
    			add_location(label0, file$3, 46, 12, 1678);
    			attr_dev(div0, "class", "form-group");
    			add_location(div0, file$3, 45, 10, 1640);
    			add_location(label1, file$3, 57, 16, 2386);
    			attr_dev(div1, "class", "form-group svelte-1xxxijt");
    			add_location(div1, file$3, 56, 14, 2344);
    			attr_dev(div2, "class", "draw-option svelte-1xxxijt");
    			toggle_class(div2, "selected", /*drawMode*/ ctx[7] == /*DrawMode*/ ctx[16].Blocks);
    			add_location(div2, file$3, 55, 12, 2212);
    			add_location(label2, file$3, 69, 16, 2930);
    			attr_dev(div3, "class", "form-group svelte-1xxxijt");
    			add_location(div3, file$3, 68, 14, 2888);
    			attr_dev(div4, "class", "draw-option svelte-1xxxijt");
    			toggle_class(div4, "selected", /*drawMode*/ ctx[7] == /*DrawMode*/ ctx[16].Items);
    			add_location(div4, file$3, 67, 12, 2758);
    			add_location(label3, file$3, 81, 16, 3491);
    			attr_dev(div5, "class", "form-group svelte-1xxxijt");
    			add_location(div5, file$3, 80, 14, 3449);
    			attr_dev(div6, "class", "draw-option svelte-1xxxijt");
    			toggle_class(div6, "selected", /*drawMode*/ ctx[7] == /*DrawMode*/ ctx[16].Enemies);
    			add_location(div6, file$3, 79, 12, 3315);
    			attr_dev(div7, "class", "flex-column");
    			add_location(div7, file$3, 54, 10, 2173);
    		},
    		m: function mount(target, anchor) {
    			mount_component(fieldtext, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div0, anchor);
    			append_dev(div0, label0);
    			append_dev(div0, t2);
    			mount_component(colorpicker, div0, null);
    			insert_dev(target, t3, anchor);
    			mount_component(fieldcheckbox0, target, anchor);
    			insert_dev(target, t4, anchor);
    			mount_component(fieldcheckbox1, target, anchor);
    			insert_dev(target, t5, anchor);
    			mount_component(fieldcheckbox2, target, anchor);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div2);
    			append_dev(div2, div1);
    			append_dev(div1, label1);
    			append_dev(div1, t8);
    			mount_component(inputselect0, div1, null);
    			append_dev(div7, t9);
    			append_dev(div7, div4);
    			append_dev(div4, div3);
    			append_dev(div3, label2);
    			append_dev(div3, t11);
    			mount_component(inputselect1, div3, null);
    			append_dev(div7, t12);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, label3);
    			append_dev(div5, t14);
    			mount_component(inputselect2, div5, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div2, "click", /*click_handler_2*/ ctx[37], false, false, false),
    					listen_dev(div4, "click", /*click_handler_3*/ ctx[39], false, false, false),
    					listen_dev(div6, "click", /*click_handler_4*/ ctx[41], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			const fieldtext_changes = {};

    			if (dirty[1] & /*$$scope*/ 524288) {
    				fieldtext_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty[0] & /*input*/ 1) {
    				updating_value = true;
    				fieldtext_changes.value = /*input*/ ctx[0].name;
    				add_flush_callback(() => updating_value = false);
    			}

    			fieldtext.$set(fieldtext_changes);
    			const colorpicker_changes = {};

    			if (!updating_value_1 && dirty[0] & /*input*/ 1) {
    				updating_value_1 = true;
    				colorpicker_changes.value = /*input*/ ctx[0].backgroundColor;
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			colorpicker.$set(colorpicker_changes);
    			const fieldcheckbox0_changes = {};

    			if (dirty[1] & /*$$scope*/ 524288) {
    				fieldcheckbox0_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_checked && dirty[0] & /*input*/ 1) {
    				updating_checked = true;
    				fieldcheckbox0_changes.checked = /*input*/ ctx[0].smoothPathing;
    				add_flush_callback(() => updating_checked = false);
    			}

    			fieldcheckbox0.$set(fieldcheckbox0_changes);
    			const fieldcheckbox1_changes = {};

    			if (dirty[1] & /*$$scope*/ 524288) {
    				fieldcheckbox1_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_checked_1 && dirty[0] & /*input*/ 1) {
    				updating_checked_1 = true;
    				fieldcheckbox1_changes.checked = /*input*/ ctx[0].showPaths;
    				add_flush_callback(() => updating_checked_1 = false);
    			}

    			fieldcheckbox1.$set(fieldcheckbox1_changes);
    			const fieldcheckbox2_changes = {};

    			if (dirty[1] & /*$$scope*/ 524288) {
    				fieldcheckbox2_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_checked_2 && dirty[0] & /*input*/ 1) {
    				updating_checked_2 = true;
    				fieldcheckbox2_changes.checked = /*input*/ ctx[0].showSightRadius;
    				add_flush_callback(() => updating_checked_2 = false);
    			}

    			fieldcheckbox2.$set(fieldcheckbox2_changes);
    			const inputselect0_changes = {};
    			if (dirty[0] & /*blockOptions*/ 1024) inputselect0_changes.options = /*blockOptions*/ ctx[10];

    			if (dirty[1] & /*$$scope, option*/ 655360) {
    				inputselect0_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_2 && dirty[0] & /*selectedBlockId*/ 16) {
    				updating_value_2 = true;
    				inputselect0_changes.value = /*selectedBlockId*/ ctx[4];
    				add_flush_callback(() => updating_value_2 = false);
    			}

    			inputselect0.$set(inputselect0_changes);

    			if (dirty[0] & /*drawMode, DrawMode*/ 65664) {
    				toggle_class(div2, "selected", /*drawMode*/ ctx[7] == /*DrawMode*/ ctx[16].Blocks);
    			}

    			const inputselect1_changes = {};
    			if (dirty[0] & /*itemOptions*/ 2048) inputselect1_changes.options = /*itemOptions*/ ctx[11];

    			if (dirty[1] & /*$$scope, option*/ 655360) {
    				inputselect1_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_3 && dirty[0] & /*selectedItemId*/ 32) {
    				updating_value_3 = true;
    				inputselect1_changes.value = /*selectedItemId*/ ctx[5];
    				add_flush_callback(() => updating_value_3 = false);
    			}

    			inputselect1.$set(inputselect1_changes);

    			if (dirty[0] & /*drawMode, DrawMode*/ 65664) {
    				toggle_class(div4, "selected", /*drawMode*/ ctx[7] == /*DrawMode*/ ctx[16].Items);
    			}

    			const inputselect2_changes = {};
    			if (dirty[0] & /*enemyOptions*/ 4096) inputselect2_changes.options = /*enemyOptions*/ ctx[12];

    			if (dirty[1] & /*$$scope, option*/ 655360) {
    				inputselect2_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_4 && dirty[0] & /*selectedEnemyId*/ 64) {
    				updating_value_4 = true;
    				inputselect2_changes.value = /*selectedEnemyId*/ ctx[6];
    				add_flush_callback(() => updating_value_4 = false);
    			}

    			inputselect2.$set(inputselect2_changes);

    			if (dirty[0] & /*drawMode, DrawMode*/ 65664) {
    				toggle_class(div6, "selected", /*drawMode*/ ctx[7] == /*DrawMode*/ ctx[16].Enemies);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(fieldtext.$$.fragment, local);
    			transition_in(colorpicker.$$.fragment, local);
    			transition_in(fieldcheckbox0.$$.fragment, local);
    			transition_in(fieldcheckbox1.$$.fragment, local);
    			transition_in(fieldcheckbox2.$$.fragment, local);
    			transition_in(inputselect0.$$.fragment, local);
    			transition_in(inputselect1.$$.fragment, local);
    			transition_in(inputselect2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(fieldtext.$$.fragment, local);
    			transition_out(colorpicker.$$.fragment, local);
    			transition_out(fieldcheckbox0.$$.fragment, local);
    			transition_out(fieldcheckbox1.$$.fragment, local);
    			transition_out(fieldcheckbox2.$$.fragment, local);
    			transition_out(inputselect0.$$.fragment, local);
    			transition_out(inputselect1.$$.fragment, local);
    			transition_out(inputselect2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(fieldtext, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div0);
    			destroy_component(colorpicker);
    			if (detaching) detach_dev(t3);
    			destroy_component(fieldcheckbox0, detaching);
    			if (detaching) detach_dev(t4);
    			destroy_component(fieldcheckbox1, detaching);
    			if (detaching) detach_dev(t5);
    			destroy_component(fieldcheckbox2, detaching);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(div7);
    			destroy_component(inputselect0);
    			destroy_component(inputselect1);
    			destroy_component(inputselect2);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$1.name,
    		type: "slot",
    		source: "(38:8) <Form on:submit={save} {hasChanges}>",
    		ctx
    	});

    	return block;
    }

    // (40:12) {#if !isAdding}
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
    			add_location(button, file$3, 40, 14, 1409);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*del*/ ctx[18], false, false, false);
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
    		source: "(40:12) {#if !isAdding}",
    		ctx
    	});

    	return block;
    }

    // (39:10) 
    function create_buttons_slot(ctx) {
    	let span;
    	let if_block = !/*isAdding*/ ctx[8] && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			span = element("span");
    			if (if_block) if_block.c();
    			attr_dev(span, "slot", "buttons");
    			add_location(span, file$3, 38, 10, 1343);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			if (if_block) if_block.m(span, null);
    		},
    		p: function update(ctx, dirty) {
    			if (!/*isAdding*/ ctx[8]) {
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
    		source: "(39:10) ",
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
    				collection: /*$levels*/ ctx[2],
    				active: /*paramId*/ ctx[1],
    				$$slots: {
    					default: [
    						create_default_slot_9,
    						({ item }) => ({ 49: item }),
    						({ item }) => [0, item ? 262144 : 0]
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
    			if_block_anchor = empty$1();
    			attr_dev(div, "class", "col1");
    			add_location(div, file$3, 1, 2, 31);
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
    			if (dirty[0] & /*$levels*/ 4) itemlistnav_changes.collection = /*$levels*/ ctx[2];
    			if (dirty[0] & /*paramId*/ 2) itemlistnav_changes.active = /*paramId*/ ctx[1];

    			if (dirty[0] & /*$characters*/ 8192 | dirty[1] & /*$$scope, item*/ 786432) {
    				itemlistnav_changes.$$scope = { dirty, ctx };
    			}

    			itemlistnav.$set(itemlistnav_changes);

    			if (/*input*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[0] & /*input*/ 1) {
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

    function create_fragment$4(ctx) {
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
    		p: function update(ctx, dirty) {
    			const applayout_changes = {};

    			if (dirty[0] & /*hasChanges, isAdding, drawMode, enemyOptions, selectedEnemyId, itemOptions, selectedItemId, blockOptions, selectedBlockId, input, $isDrawing, levelRenderer, $levels, paramId, $characters*/ 32767 | dirty[1] & /*$$scope*/ 524288) {
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

    const gridSize = 40;

    function getBlockCoordsFromEvent(event) {
    	return {
    		x: Math.floor(event.detail.offsetX / gridSize),
    		y: Math.floor(event.detail.offsetY / gridSize)
    	};
    }

    function replaceAtCoord(objects, x, y, id) {
    	const objectsMinusAnyAtThisXY = objects.filter(o => o.x != x || o.y != y);

    	if (id == null) {
    		objects = objectsMinusAnyAtThisXY;
    	} else {
    		const newObject = { x, y, id };
    		objects = [...objectsMinusAnyAtThisXY, newObject].sort((a, b) => a.x == b.x ? a.y - b.y : a.x - b.x);
    	}

    	return objects;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let paramId;
    	let isAdding;
    	let hasChanges;
    	let blockOptions;
    	let itemOptions;
    	let enemyOptions;
    	let $levels;
    	let $blocks;
    	let $items;
    	let $enemies;
    	let $project;
    	let $characters;
    	let $isDrawing;
    	validate_store(levels, "levels");
    	component_subscribe($$self, levels, $$value => $$invalidate(2, $levels = $$value));
    	validate_store(blocks, "blocks");
    	component_subscribe($$self, blocks, $$value => $$invalidate(24, $blocks = $$value));
    	validate_store(items, "items");
    	component_subscribe($$self, items, $$value => $$invalidate(25, $items = $$value));
    	validate_store(enemies, "enemies");
    	component_subscribe($$self, enemies, $$value => $$invalidate(26, $enemies = $$value));
    	validate_store(project, "project");
    	component_subscribe($$self, project, $$value => $$invalidate(43, $project = $$value));
    	validate_store(characters, "characters");
    	component_subscribe($$self, characters, $$value => $$invalidate(13, $characters = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("LevelBuilder", slots, []);
    	let isDrawing = LocalStorageStore("is-drawing", false);
    	validate_store(isDrawing, "isDrawing");
    	component_subscribe($$self, isDrawing, value => $$invalidate(14, $isDrawing = value));
    	let levelRenderer;
    	let { params = {} } = $$props;
    	let input = null;
    	let selectedBlockId = 0;
    	let selectedItemId = null;
    	let selectedEnemyId = null;
    	const DrawMode = { Blocks: 0, Items: 1, Enemies: 2 };
    	let drawMode = DrawMode.Blocks;

    	function create() {
    		$$invalidate(0, input = createDefaultInput());
    	}

    	function createDefaultInput() {
    		return {
    			projectId: $project.id,
    			name: "",
    			backgroundColor: "rgba(0,0,0,1)",
    			smoothPathing: false,
    			showPaths: true,
    			showSightRadius: true,
    			blocks: [],
    			items: [],
    			enemies: []
    		};
    	}

    	async function edit(id) {
    		const level = $levels.find(l => l.id == id);
    		if (level == null) return;
    		$$invalidate(0, input = null);
    		await tick();

    		$$invalidate(0, input = {
    			...createDefaultInput(),
    			...JSON.parse(JSON.stringify(level))
    		});
    	}

    	function save() {
    		if (validator.empty(input.name)) {
    			document.getElementById("name").focus();
    			return;
    		}

    		

    		(isAdding
    		? levels.apiInsert(input).then(item => {
    				$$invalidate(0, input = item);
    			})
    		: levels.apiUpdate(input)).then(() => {
    			push(`/levels/${encodeURIComponent(input.id)}`);
    		});
    	}

    	function del() {
    		if (confirm(`Are you sure you want to delete "${input.name}"?`)) {
    			levels.apiDelete(input.projectId, input.id);
    			push(`/levels/new`);
    		}
    	}

    	let pointerIsDown = false;

    	function onDrawPointerDown(event) {
    		pointerIsDown = true;

    		// if they do anything but left click, select the block at the current position (or eraser if null)
    		if (event.detail.button != 0) {
    			const { x, y } = getBlockCoordsFromEvent(event);

    			switch (drawMode) {
    				case DrawMode.Blocks:
    					$$invalidate(4, selectedBlockId = input.blocks.find(b => b.x == x && b.y == y)?.id);
    					break;
    				case DrawMode.Items:
    					$$invalidate(5, selectedItemId = input.items.find(i => i.x == x && i.y == y)?.id);
    					break;
    				case DrawMode.Enemies:
    					$$invalidate(6, selectedEnemyId = input.enemies.find(i => i.x == x && i.y == y)?.id);
    					break;
    			}
    		} else {
    			drawAtEvent(event);
    		}
    	}

    	function onDrawPointerMove(event) {
    		if (!pointerIsDown) return;
    		drawAtEvent(event);
    	}

    	function onDrawPointerUp(event) {
    		pointerIsDown = false;
    	}

    	function drawAtEvent(event) {
    		const { x, y } = getBlockCoordsFromEvent(event);

    		switch (drawMode) {
    			case DrawMode.Blocks:
    				$$invalidate(0, input.blocks = replaceAtCoord(input.blocks, x, y, selectedBlockId), input);
    				levelRenderer.redrawBlocks();
    				break;
    			case DrawMode.Items:
    				$$invalidate(0, input.items = replaceAtCoord(input.items, x, y, selectedItemId), input);
    				levelRenderer.redrawItems();
    				break;
    			case DrawMode.Enemies:
    				$$invalidate(0, input.enemies = replaceAtCoord(input.enemies, x, y, selectedEnemyId), input);
    				levelRenderer.redrawEnemies();
    				break;
    		}
    	}

    	function setDrawMode(dm) {
    		$$invalidate(7, drawMode = dm);
    	}

    	const writable_props = ["params"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<LevelBuilder> was created with unknown prop '${key}'`);
    	});

    	function levelrenderer_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			levelRenderer = $$value;
    			$$invalidate(3, levelRenderer);
    		});
    	}

    	function levelrenderer_binding_1($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			levelRenderer = $$value;
    			$$invalidate(3, levelRenderer);
    		});
    	}

    	const click_handler = () => set_store_value(isDrawing, $isDrawing = false, $isDrawing);
    	const click_handler_1 = () => set_store_value(isDrawing, $isDrawing = true, $isDrawing);

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

    	function fieldcheckbox0_checked_binding(value) {
    		if ($$self.$$.not_equal(input.smoothPathing, value)) {
    			input.smoothPathing = value;
    			$$invalidate(0, input);
    		}
    	}

    	function fieldcheckbox1_checked_binding(value) {
    		if ($$self.$$.not_equal(input.showPaths, value)) {
    			input.showPaths = value;
    			$$invalidate(0, input);
    		}
    	}

    	function fieldcheckbox2_checked_binding(value) {
    		if ($$self.$$.not_equal(input.showSightRadius, value)) {
    			input.showSightRadius = value;
    			$$invalidate(0, input);
    		}
    	}

    	function inputselect0_value_binding(value) {
    		selectedBlockId = value;
    		$$invalidate(4, selectedBlockId);
    	}

    	const click_handler_2 = () => setDrawMode(DrawMode.Blocks);

    	function inputselect1_value_binding(value) {
    		selectedItemId = value;
    		$$invalidate(5, selectedItemId);
    	}

    	const click_handler_3 = () => setDrawMode(DrawMode.Items);

    	function inputselect2_value_binding(value) {
    		selectedEnemyId = value;
    		$$invalidate(6, selectedEnemyId);
    	}

    	const click_handler_4 = () => setDrawMode(DrawMode.Enemies);

    	$$self.$$set = $$props => {
    		if ("params" in $$props) $$invalidate(23, params = $$props.params);
    	};

    	$$self.$capture_state = () => ({
    		project,
    		blocks,
    		enemies,
    		items,
    		levels,
    		characters,
    		push,
    		sortByName,
    		tick,
    		AppLayout,
    		ArtThumb,
    		ColorPicker,
    		FieldCheckbox,
    		FieldText,
    		Form,
    		InputSelect,
    		ItemListNav,
    		LevelRenderer: LevelBuilder_Renderer,
    		LocalStorageStore,
    		validator,
    		isDrawing,
    		levelRenderer,
    		params,
    		input,
    		gridSize,
    		selectedBlockId,
    		selectedItemId,
    		selectedEnemyId,
    		DrawMode,
    		drawMode,
    		create,
    		createDefaultInput,
    		edit,
    		save,
    		del,
    		pointerIsDown,
    		onDrawPointerDown,
    		onDrawPointerMove,
    		onDrawPointerUp,
    		getBlockCoordsFromEvent,
    		drawAtEvent,
    		replaceAtCoord,
    		setDrawMode,
    		paramId,
    		$levels,
    		isAdding,
    		hasChanges,
    		blockOptions,
    		$blocks,
    		itemOptions,
    		$items,
    		enemyOptions,
    		$enemies,
    		$project,
    		$characters,
    		$isDrawing
    	});

    	$$self.$inject_state = $$props => {
    		if ("isDrawing" in $$props) $$invalidate(15, isDrawing = $$props.isDrawing);
    		if ("levelRenderer" in $$props) $$invalidate(3, levelRenderer = $$props.levelRenderer);
    		if ("params" in $$props) $$invalidate(23, params = $$props.params);
    		if ("input" in $$props) $$invalidate(0, input = $$props.input);
    		if ("selectedBlockId" in $$props) $$invalidate(4, selectedBlockId = $$props.selectedBlockId);
    		if ("selectedItemId" in $$props) $$invalidate(5, selectedItemId = $$props.selectedItemId);
    		if ("selectedEnemyId" in $$props) $$invalidate(6, selectedEnemyId = $$props.selectedEnemyId);
    		if ("drawMode" in $$props) $$invalidate(7, drawMode = $$props.drawMode);
    		if ("pointerIsDown" in $$props) pointerIsDown = $$props.pointerIsDown;
    		if ("paramId" in $$props) $$invalidate(1, paramId = $$props.paramId);
    		if ("isAdding" in $$props) $$invalidate(8, isAdding = $$props.isAdding);
    		if ("hasChanges" in $$props) $$invalidate(9, hasChanges = $$props.hasChanges);
    		if ("blockOptions" in $$props) $$invalidate(10, blockOptions = $$props.blockOptions);
    		if ("itemOptions" in $$props) $$invalidate(11, itemOptions = $$props.itemOptions);
    		if ("enemyOptions" in $$props) $$invalidate(12, enemyOptions = $$props.enemyOptions);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*params*/ 8388608) {
    			$$invalidate(1, paramId = decodeURIComponent(params.id) || "new");
    		}

    		if ($$self.$$.dirty[0] & /*paramId, $levels*/ 6) {
    			if (paramId == "new" || $levels != null) {
    				paramId == "new" ? create() : edit(paramId);
    			}
    		}

    		if ($$self.$$.dirty[0] & /*input*/ 1) {
    			$$invalidate(8, isAdding = input?.id == null);
    		}

    		if ($$self.$$.dirty[0] & /*input, $levels*/ 5) {
    			$$invalidate(9, hasChanges = input != null && !validator.equals(input, $levels.find(l => l.id == input.id)));
    		}

    		if ($$self.$$.dirty[0] & /*$blocks*/ 16777216) {
    			$$invalidate(10, blockOptions = [
    				{ value: null, name: "Erase blocks" },
    				...$blocks.map(b => ({ ...b, value: b.id })).sort(sortByName)
    			]);
    		}

    		if ($$self.$$.dirty[0] & /*$items*/ 33554432) {
    			$$invalidate(11, itemOptions = [
    				{ value: null, name: "Erase items" },
    				...$items.map(i => ({ ...i, value: i.id })).sort(sortByName)
    			]);
    		}

    		if ($$self.$$.dirty[0] & /*$enemies*/ 67108864) {
    			$$invalidate(12, enemyOptions = [
    				{ value: null, name: "Erase enemies" },
    				...$enemies.map(i => ({ ...i, value: i.id })).sort(sortByName)
    			]);
    		}
    	};

    	return [
    		input,
    		paramId,
    		$levels,
    		levelRenderer,
    		selectedBlockId,
    		selectedItemId,
    		selectedEnemyId,
    		drawMode,
    		isAdding,
    		hasChanges,
    		blockOptions,
    		itemOptions,
    		enemyOptions,
    		$characters,
    		$isDrawing,
    		isDrawing,
    		DrawMode,
    		save,
    		del,
    		onDrawPointerDown,
    		onDrawPointerMove,
    		onDrawPointerUp,
    		setDrawMode,
    		params,
    		$blocks,
    		$items,
    		$enemies,
    		levelrenderer_binding,
    		levelrenderer_binding_1,
    		click_handler,
    		click_handler_1,
    		fieldtext_value_binding,
    		colorpicker_value_binding,
    		fieldcheckbox0_checked_binding,
    		fieldcheckbox1_checked_binding,
    		fieldcheckbox2_checked_binding,
    		inputselect0_value_binding,
    		click_handler_2,
    		inputselect1_value_binding,
    		click_handler_3,
    		inputselect2_value_binding,
    		click_handler_4
    	];
    }

    class LevelBuilder extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { params: 23 }, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LevelBuilder",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get params() {
    		throw new Error("<LevelBuilder>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set params(value) {
    		throw new Error("<LevelBuilder>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\client\pages\NotFound.svelte generated by Svelte v3.38.3 */
    const file$2 = "src\\client\\pages\\NotFound.svelte";

    // (1:0) <AppLayout>
    function create_default_slot$2(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Page not found";
    			attr_dev(div, "class", "grow p1");
    			add_location(div, file$2, 1, 2, 15);
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

    function create_fragment$3(ctx) {
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
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NotFound",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\client\pages\SelectProject.svelte generated by Svelte v3.38.3 */
    const file$1 = "src\\client\\pages\\SelectProject.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    // (3:4) {#each $projects as p}
    function create_each_block(ctx) {
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
    			add_location(a0, file$1, 4, 8, 126);
    			attr_dev(a1, "href", "#/");
    			attr_dev(a1, "class", "delete-project svelte-14jovk9");
    			add_location(a1, file$1, 5, 8, 207);
    			attr_dev(div, "class", "project-item svelte-14jovk9");
    			add_location(div, file$1, 3, 6, 90);
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
    		id: create_each_block.name,
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
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
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
    			add_location(a, file$1, 9, 6, 369);
    			attr_dev(div0, "class", "project-item svelte-14jovk9");
    			add_location(div0, file$1, 8, 4, 335);
    			attr_dev(div1, "class", "grow p2");
    			add_location(div1, file$1, 1, 2, 33);
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
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
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

    function create_fragment$2(ctx) {
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
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const PROJECT_VERSION = 1;

    function instance$2($$self, $$props, $$invalidate) {
    	let $project;
    	let $projects;
    	validate_store(project, "project");
    	component_subscribe($$self, project, $$value => $$invalidate(6, $project = $$value));
    	validate_store(projects, "projects");
    	component_subscribe($$self, projects, $$value => $$invalidate(0, $projects = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("SelectProject", slots, []);
    	projects.refresh();

    	function setProject(p) {
    		project.loadFromApi(p.id).then(() => push("/project"));
    	}

    	function createNewProject() {
    		const name = prompt("Project name?", "");

    		if (name?.trim().length > 0) {
    			const p = {
    				version: PROJECT_VERSION,
    				name,
    				pixelSize: 1
    			};

    			projects.apiInsert(p);
    		}
    	}

    	function deleteProject(p) {
    		if (prompt(`If you are sure you want to delete this project, type the project name:`, "") !== p.name.trim()) return;

    		projects.apiDelete(p.id).then(() => {
    			if ($project?.id == p.id) set_store_value(project, $project = {}, $project);
    		});
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
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SelectProject",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\client\pages\ProjectSettings.svelte generated by Svelte v3.38.3 */
    const file = "src\\client\\pages\\ProjectSettings.svelte";

    // (4:6) <FieldText name="name" bind:value={input.name}>
    function create_default_slot_3(ctx) {
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
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(4:6) <FieldText name=\\\"name\\\" bind:value={input.name}>",
    		ctx
    	});

    	return block;
    }

    // (5:6) <FieldNumber name="pixel-size" bind:value={input.pixelSize} min={1} max={10} step={0.1}>
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
    		source: "(5:6) <FieldNumber name=\\\"pixel-size\\\" bind:value={input.pixelSize} min={1} max={10} step={0.1}>",
    		ctx
    	});

    	return block;
    }

    // (3:4) <Form on:submit={save} {hasChanges}>
    function create_default_slot_1(ctx) {
    	let fieldtext;
    	let updating_value;
    	let t;
    	let fieldnumber;
    	let updating_value_1;
    	let current;

    	function fieldtext_value_binding(value) {
    		/*fieldtext_value_binding*/ ctx[4](value);
    	}

    	let fieldtext_props = {
    		name: "name",
    		$$slots: { default: [create_default_slot_3] },
    		$$scope: { ctx }
    	};

    	if (/*input*/ ctx[0].name !== void 0) {
    		fieldtext_props.value = /*input*/ ctx[0].name;
    	}

    	fieldtext = new FieldText({ props: fieldtext_props, $$inline: true });
    	binding_callbacks.push(() => bind(fieldtext, "value", fieldtext_value_binding));

    	function fieldnumber_value_binding(value) {
    		/*fieldnumber_value_binding*/ ctx[5](value);
    	}

    	let fieldnumber_props = {
    		name: "pixel-size",
    		min: 1,
    		max: 10,
    		step: 0.1,
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
    			t = space();
    			create_component(fieldnumber.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(fieldtext, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(fieldnumber, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const fieldtext_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				fieldtext_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*input*/ 1) {
    				updating_value = true;
    				fieldtext_changes.value = /*input*/ ctx[0].name;
    				add_flush_callback(() => updating_value = false);
    			}

    			fieldtext.$set(fieldtext_changes);
    			const fieldnumber_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				fieldnumber_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_1 && dirty & /*input*/ 1) {
    				updating_value_1 = true;
    				fieldnumber_changes.value = /*input*/ ctx[0].pixelSize;
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			fieldnumber.$set(fieldnumber_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(fieldtext.$$.fragment, local);
    			transition_in(fieldnumber.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(fieldtext.$$.fragment, local);
    			transition_out(fieldnumber.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(fieldtext, detaching);
    			if (detaching) detach_dev(t);
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

    	form.$on("submit", /*save*/ ctx[2]);

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

    			if (dirty & /*$$scope, input*/ 65) {
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

    			if (dirty & /*$$scope, hasChanges, input*/ 67) {
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
    	return { id: null, name: "", pixelSize: 1 };
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let hasChanges;
    	let $project;
    	validate_store(project, "project");
    	component_subscribe($$self, project, $$value => $$invalidate(3, $project = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ProjectSettings", slots, []);
    	let input = createDefaultInput();

    	function save() {
    		const p = {
    			...$project,
    			name: input.name,
    			pixelSize: input.pixelSize
    		};

    		project.set(p);
    		projects.apiUpdate(p);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ProjectSettings> was created with unknown prop '${key}'`);
    	});

    	function fieldtext_value_binding(value) {
    		if ($$self.$$.not_equal(input.name, value)) {
    			input.name = value;
    			($$invalidate(0, input), $$invalidate(3, $project));
    		}
    	}

    	function fieldnumber_value_binding(value) {
    		if ($$self.$$.not_equal(input.pixelSize, value)) {
    			input.pixelSize = value;
    			($$invalidate(0, input), $$invalidate(3, $project));
    		}
    	}

    	$$self.$capture_state = () => ({
    		AppLayout,
    		FieldNumber,
    		Form,
    		validator,
    		project,
    		projects,
    		FieldText,
    		input,
    		createDefaultInput,
    		save,
    		hasChanges,
    		$project
    	});

    	$$self.$inject_state = $$props => {
    		if ("input" in $$props) $$invalidate(0, input = $$props.input);
    		if ("hasChanges" in $$props) $$invalidate(1, hasChanges = $$props.hasChanges);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*input, $project*/ 9) {
    			if (input.id == null && $project.id != null) {
    				$$invalidate(0, input = { ...createDefaultInput(), ...$project });
    			}
    		}

    		if ($$self.$$.dirty & /*input, $project*/ 9) {
    			$$invalidate(1, hasChanges = !validator.equals(input, $project));
    		}
    	};

    	return [
    		input,
    		hasChanges,
    		save,
    		$project,
    		fieldtext_value_binding,
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

    /* src\client\App.svelte generated by Svelte v3.38.3 */

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
    		"/": SelectProject,
    		"/project": ProjectSettings,
    		"/art/:id?": ArtBuilder,
    		"/particles/:id?": ParticleBuilder,
    		"/blocks/:id?": BlockBuilder,
    		"/items/:id?": ItemBuilder,
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
    		ItemBuilder,
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
