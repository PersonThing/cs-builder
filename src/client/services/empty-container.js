export default function emptyContainer(container) {
  container?.children.forEach(c => {
    container.removeChild(c)
    c.destroy()
  })
}
