import { hasDifferences, isEmpty } from './object-utils'

const defaultFormat = 'M/D/YYYY'

class Validator {
  constructor() {
    this.emailRegex = /^[^.]([^@<>\s]+)?[^.]@[^@<>\s-][^@<>\s]+\.[a-zA-Z]{1,6}$/
    this.doublePeriodRegex = /\.\./
    this.nameWithSpaceRegex = /[^\s]+\s+[^\s]+/
    this.phoneRegex = /^([+][0-9][-\s.])?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/
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
    ignoreKeys = (ignoreKeys || []).concat('id')
    return !hasDifferences(a, b, ignoreKeys)
  }

  empty(s) {
    return isEmpty(s)
  }

  int(s) {
    return s != null && !isNaN(parseInt(s)) && isFinite(s) && parseInt(s).toString() == s.toString()
  }

  intRange(s, min, max) {
    const n = parseInt(s)
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

const validator = new Validator()

export default validator
