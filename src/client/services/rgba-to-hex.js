function componentToHex(c) {
  var hex = c.toString(16)
  return hex.length == 1 ? '0' + hex : hex
}

export function rgbToHex(r, g, b) {
  return parseInt(componentToHex(r) + componentToHex(g) + componentToHex(b), 16)
}

export function rgbaStringToHex(rgbaString) {
  const [r, g, b, a] = rgbaString
    .replace('rgba(', '')
    .replace('rgb(', '')
    .replace(')', '')
    .split(',')
    .map(s => parseInt(s.trim()))
  return rgbToHex(r, g, b)
}
