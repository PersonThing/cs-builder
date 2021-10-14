import PF from 'pathfinding'

export default class LevelGrid {
  constructor(project, level, gridSize) {
    this.gridSize = gridSize
    const walkableBlocks = level.blocks
      .filter(b => project.blocks[b.blockId].canWalk)
      // sort by x, then y
      .sort((a, b) => (a.x == b.x ? a.y - b.y : a.x - b.x))

    const highestX = walkableBlocks.map(b => b.x).sort((a, b) => b - a)[0]
    const highestY = walkableBlocks.map(b => b.y).sort((a, b) => b - a)[0]

    this.grid = new PF.Grid(highestX + 1, highestY + 1)

    // make only walkable blocks work
    for (let x = 0; x <= highestX; x++) {
      for (let y = 0; y <= highestY; y++) {
        this.grid.setWalkableAt(x, y, false)
      }
    }
    walkableBlocks.forEach(b => this.grid.setWalkableAt(b.x, b.y, true))

    this.finder = new PF.AStarFinder({
      allowDiagonal: true,
      dontCrossCorners: true,
    })
  }

  /**
   * return a path between {from} and {to} as an array of {x, y} coordinates
   * @param {x, y coordinates} from
   * @param {x, y coordinates} to
   * @returns
   */
  findPath(from, to) {
    const gridFrom = this.toGridCoordinates(from)
    const gridTo = this.getNearestAvailablePointBetween(gridFrom, this.toGridCoordinates(to))
    const grid = this.grid.clone()
    const path = this.finder.findPath(gridFrom.x, gridFrom.y, gridTo.x, gridTo.y, grid)
    const smoothPath = PF.Util.smoothenPath(this.grid, path) //this.grid.clone(), path)

    // remove the first point if it's the same as gridFrom
    if (smoothPath[0][0] == gridFrom.x && smoothPath[0][1] == gridFrom.y) smoothPath.shift()

    return smoothPath.map(([x, y]) => this.toGameCoordinates({ x, y }))
  }

  /**
   * if they click on something that isn't walkable / is outside grid, path to walkable point nearest the target on a line between current position and where they clicked
   * @param {*} gridFrom
   * @param {*} gridTo
   * @returns
   */
  getNearestAvailablePointBetween(gridFrom, gridTo) {
    return this.grid.isWalkableAt(gridTo.x, gridTo.y)
      ? gridTo
      : this.lineBetween(gridFrom.x, gridFrom.y, gridTo.x, gridTo.y, (x, y) => !this.grid.isWalkableAt(x, y)).pop()
  }

  lineBetween(x0, y0, x1, y1, shortCheck) {
    const result = []

    // diff between x
    var dx = Math.abs(x1 - x0)
    // diff between y
    var dy = Math.abs(y1 - y0)
    // x going up or down
    var sx = x0 < x1 ? 1 : -1
    // y going up or down
    var sy = y0 < y1 ? 1 : -1
    // ???
    var err = dx - dy

    while (true) {
      // short if caller wants us to short on certain conditions (like point not in the grid)
      if (shortCheck != null && shortCheck(x0, y0)) return result

      // otherwise add current x,y to result
      result.push({
        x: x0,
        y: y0,
      })

      if (x0 === x1 && y0 === y1) break
      var e2 = 2 * err
      if (e2 > -dy) {
        err -= dy
        x0 += sx
      }
      if (e2 < dx) {
        err += dx
        y0 += sy
      }
    }

    return result
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
