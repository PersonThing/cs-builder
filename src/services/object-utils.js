window.logDiffs = false // can set this in production to determine why confirm-nav-away is popping up, for instance

export function hasDifferences(a, b) {
  return JSON.stringify(a) !== JSON.stringify(b)
}

// get an array of keys that are different
// deep keys will have dot notation like 'myObj.subProp.value'
// arrays will specify index like 'myArr[3].itemProp'
export function getDifferences(a, b, ignoreKeys = [], key = null, changedKeys = []) {
  const keyOrRoot = key || '.'
  if (isEmpty(a) && isEmpty(b)) return [] //so null and empty string would be considered equal
  if (a === b) return [] //same ref, strings, numbers
  if (a == b) return [] // "2" should equal 2...
  if ((a == null && b != null) || (b == null && a != null)) return [keyOrRoot] //one's null, but not the other
  if (_.isString(a) && _.isString(b) && a.trim() === b.trim()) return [] //ignore whitespace for strings
  if (_.isDate(a)) {
    if (!_.isDate(b)) return [keyOrRoot]
    if (a.getTime() !== b.getTime()) return [keyOrRoot]
    else return []
  }
  if (dayjs.isDayjs(a)) {
    if (!dayjs.isDayjs(b)) return [keyOrRoot]
    if (a.format() !== b.format()) return [keyOrRoot]
    else return []
  }
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return [keyOrRoot] //one's an array, but not the other
    if (a.length !== b.length) return [keyOrRoot] //different number of items
    // up to calling code to sort as needed
    const keyOrEmpty = key === null ? '' : `${key}`
    for (let i = 0; i < a.length; i++) {
      //recursively compare array items by index. NOTE if you don't care about sort-order, then pass a sorted array here (sort by your unique key, for instance)
      const subKey = `${keyOrEmpty}[${i}]`
      const diffs = getDifferences(a[i], b[i], ignoreKeys, subKey, [])
      changedKeys = changedKeys.concat(diffs)
      log(`diffs for ${subKey}`, diffs)
    }
    return changedKeys
  }
  if (_.isObject(a)) {
    if (!_.isObject(b)) return true //one's an object, but not the other
    const keyOrEmpty = key === null ? '' : `${key}.`
    const allKeys = _.uniq(Object.keys(a).concat(Object.keys(b)))
    for (var i = 0; i < allKeys.length; i++) {
      const subKey = allKeys[i]
      if (!ignoreKeys.some(ik => ik === subKey)) {
        const subKeyDeep = `${keyOrEmpty}${subKey}`
        const diffs = getDifferences(a[subKey], b[subKey], ignoreKeys, subKeyDeep, [])
        changedKeys = changedKeys.concat(diffs)
        log(`diffs for ${subKeyDeep}`, diffs)
      }
    }
    return changedKeys
  }
  return [keyOrRoot] //shouldn't get here, but if it does, default to indicate that there is a difference
}

export function isEmpty(obj) {
  return obj == null || obj.toString().trim().length === 0
}

export function selectMany(array, funcSelector) {
  return array
    .map(funcSelector)
    .filter(x => x != null)
    .reduce((a, b) => a.concat(b), [])
}

export function sortByName(a, b) {
  const a1 = a.name.toLowerCase()
  const b1 = b.name.toLowerCase()
  return a1 == b1 ? 0 : a1 > b1 ? 1 : -1
}

function log() {
  // eslint-disable-next-line no-console
  if (window.logDiffs) console.log.apply(console, arguments)
}
