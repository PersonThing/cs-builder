export default function isTouching(_a, _b) {
  let a = _a.getBounds()
  let b = _b.getBounds()
  return a.x + a.width > b.x && a.x < b.x + b.width && a.y + a.height > b.y && a.y < b.y + b.height
}
