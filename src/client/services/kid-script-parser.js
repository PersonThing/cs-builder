export default function parseKidScript(script) {
  // wait(.+).+ with
  // ->
  // setTimeout(() => {
  //   $1
  // }, $0)
  return (script ?? '').replace(
    /wait\(([0-9]+)\)((.|\n)+)/,
    `setTimeout(() => {$2
}, $1)` //.replace(/waitUntil\(([0-9]+)\)((.|\n)+)/)
  )
}
