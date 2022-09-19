import Grid from '../path-finding/Grid.js'
import Util from '../path-finding/Util.js'
import AStarFinder from '../path-finding/AStarFinder.js'

export default class LevelGrid {
  constructor(tiles, level, gridSize) {
    this.smoothPathing = level.smoothPathing
    this.gridSize = gridSize
    this.createGridFromTiles(tiles, level.tiles)
  }

  createGridFromTiles(tiles, levelTiles) {
    const walkableTiles = levelTiles
      .filter(t => t.x >= 0 && t.y >= 0)
      .filter(t => tiles.find(tc => tc.id == t.id).canWalk)
      // sort by x, then y
      .sort((a, b) => (a.x == b.x ? a.y - b.y : a.x - b.x))

    const visibleTiles = levelTiles.filter(t => t.x >= 0 && t.y >= 0).filter(t => tiles.find(tc => tc.id == t.id).canSee)

    let highestX = walkableTiles.map(t => t.x).sort((a, b) => b - a)[0]
    let highestY = walkableTiles.map(t => t.y).sort((a, b) => b - a)[0]

    if (highestX == null) highestX = 10
    if (highestY == null) highestY = 10

    this.grid = new Grid(highestX + 1, highestY + 1)

    // make only walkable tiles work
    for (let x = 0; x <= highestX; x++) {
      for (let y = 0; y <= highestY; y++) {
        this.grid.setWalkableAt(x, y, false)
        this.grid.setVisibleAt(x, y, false)
      }
    }
    walkableTiles.forEach(b => this.grid.setWalkableAt(b.x, b.y, true))
    visibleTiles.forEach(b => this.grid.setVisibleAt(b.x, b.y, true))

    this.finder = new AStarFinder({
      allowDiagonal: true,
      dontCrossCorners: true,
    })
  }

  setWalkableAt(x, y, isWalkable) {
    this.grid.setWalkableAt(x, y, isWalkable)
  }

  /**
   * return a path between {from} and {to} as an array of {x, y} coordinates
   * @param {x, y coordinates} from
   * @param {x, y coordinates} to
   * @returns
   */
  findPath(from, to, maxRange) {
    // TODO: respect max range
    const [startX, startY] = this.toGridCoordinates(from)
    const [goalX, goalY] = this.toGridCoordinates(to)

    // find all points in a line between from and to
    // filter to only walkable points
    // loop walkable points backward, trying to find paths to them.  use the first path found.
    const lineBetween = Util.interpolate(startX, startY, goalX, goalY).filter(([x, y]) => this.grid.isWalkableAt(x, y))
    let path = null
    for (let i = lineBetween.length - 1; i >= 0; i--) {
      let [x, y] = lineBetween[i]
      path = this.finder.findPath(startX, startY, x, y, this.grid.clone())
      if (path.length > 0) break
    }
    if (path == null || path.length == 0) return []

    path = this.smoothPathing ? Util.smoothenPath(this.grid, path) : Util.compressPath(path)

    // remove the first point if it's the same as start
    if (path.length && path[0][0] == startX && path[0][1] == startY) path.shift()

    return path.map(([x, y]) => this.toGameCoordinates({ x, y }))
  }

  canSee(from, to) {
    const [startX, startY] = this.toGridCoordinates(from)
    const [goalX, goalY] = this.toGridCoordinates(to)
    const line = Util.interpolate(startX, startY, goalX, goalY)
    const allwalkable = line.every(([x, y]) => this.grid.isVisibleAt(x, y))
    // TODO: this is looking at walkable, not visible
    // console.log(
    //   'cansee',
    //   line.map(([x, y]) => `${x},${y},${this.grid.isVisibleAt(x, y)}`),
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
