import { astar, Graph } from '../services/astar.js'

export default class LevelGrid {
  constructor(project, level, gridSize) {
    this.gridSize = gridSize
    this.blocks = level.blocks
      .filter(b => project.blocks[b.blockId].canWalk)
      // sort by x, then y
      .sort((a, b) => (a.x == b.x ? a.y - b.y : a.x - b.x))

    // build a 2d array representing walkable space
    // [0,0,0,1]
    // [0,1,1,1]
    // [1,1,0,0]
    // 1 = walkable
    // 0/empty/null = not walkable

    this.grid = []
    for (const b of this.blocks) {
      if (this.grid[b.x] == null) {
        this.grid[b.x] = []
      }
      this.grid[b.x][b.y] = 1
    }

    // fill in blanks
    const highestX = this.blocks.map(b => b.x).sort((a, b) => b - a)[0]
    const highestY = this.blocks.map(b => b.y).sort((a, b) => b - a)[0]
    for (let x = 0; x < highestX; x++) {
      // fill entire missing columns with 0
      if (this.grid[x] == null) {
        this.grid[x] = Array.from(Array(highestY)).map(n => 0)
      } else {
        // fill any missing y values in a row
        for (let y = 0; y < highestY; y++) {
          this.grid[x][y] = this.grid[x][y] == 1 ? 1 : 0
        }
      }
    }

    this.graph = new Graph(this.grid, { diagonal: true })
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
    const roughResult = astar.search(this.graph, this.graph.grid[gridFrom.x][gridFrom.y], this.graph.grid[gridTo.x][gridTo.y])

    const smoothResult = this.smoothPath(roughResult)
    // if (smoothResult[0].x == gridFrom.x && smoothResult[0].y == gridFrom.y) smoothResult.shift()
    return smoothResult.map(gridNode => this.toGameCoordinates(gridNode))
  }

  /**
   * if they click on something that isn't walkable / is outside grid, path to nearest walkable point on a line between current position and where they clicked
   * @param {*} gridFrom
   * @param {*} gridTo
   * @returns
   */
  getNearestAvailablePointBetween(gridFrom, gridTo) {
    return this.isWalkable(gridTo.x, gridTo.y)
      ? gridTo
      : this.lineBetween(gridFrom.x, gridFrom.y, gridTo.x, gridTo.y, (x, y) => !this.isWalkable(x, y)).pop()
  }

  isWalkable(x, y) {
    return this.grid[x] != null && this.grid[x][y] == 1
  }

  /**
   * smooth an a* generated path https://www.gamedeveloper.com/programming/toward-more-realistic-pathfinding
   */
  smoothPath(result) {
    return result

    // bit buggy yet
    if (result.length < 2) return result

    let lastUsefulPoint = result[0]
    for (let i = 1; i < result.length - 1; i++) {
      if (this.canWalk(lastUsefulPoint, result[i + 1])) {
        result[i].redundant = true
      } else {
        lastUsefulPoint = result[i]
      }
    }

    // we should always be able to skip the first target as it will always be where the thing started from
    return result.filter(p => !p.redundant)
  }

  canWalk(p1, p2) {
    const pointsBetween = this.lineBetween(p1.x, p1.y, p2.x, p2.y)
    return pointsBetween.every(p => this.isWalkable(p.x, p.y))
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
