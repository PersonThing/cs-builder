import PF from 'pathfinding'

export default class LevelGrid {
  constructor(project, level, gridSize) {
    this.gridSize = gridSize

    const walkableBlocks = level.blocks
      .filter(b => project.blocks[b.blockId].canWalk)
      // sort by x, then y
      .sort((a, b) => (a.x == b.x ? a.y - b.y : a.x - b.x))

    let highestX = walkableBlocks.map(b => b.x).sort((a, b) => b - a)[0]
    let highestY = walkableBlocks.map(b => b.y).sort((a, b) => b - a)[0]

    if (highestX == null) highestX = 10
    if (highestY == null) highestY = 10

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
  findPath(from, to, smoothPathing) {
    const gridFrom = this.toGridCoordinates(from)
    let gridTo = this.toGridCoordinates(to)
    gridTo = this.getNearestWalkablePointBetween(gridFrom[0], gridFrom[1], gridTo[0], gridTo[1]) ?? gridFrom
    const grid = this.grid.clone()
    const path = this.finder.findPath(gridFrom[0], gridFrom[1], gridTo[0], gridTo[1], grid)
    const smoothPath = smoothPathing ? PF.Util.smoothenPath(this.grid, path) : path

    // remove the first point if it's the same as gridFrom
    if (smoothPath[0][0] == gridFrom[0] && smoothPath[0][1] == gridFrom[1]) smoothPath.shift()

    return smoothPath.map(([x, y]) => this.toGameCoordinates({ x, y }))
  }

  /**
   * if they click on something that isn't walkable / is outside grid, path to walkable point nearest the target on a line between current position and where they clicked
   * @param {*} gridFrom
   * @param {*} gridTo
   * @returns
   */
  getNearestWalkablePointBetween(x1, y1, x2, y2) {
    return PF.Util.interpolate(x1, y1, x2, y2)
      .filter(([x, y]) => this.grid.isWalkableAt(x, y))
      .pop()
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
