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
  }

  findPath(from, to) {
    const gridFrom = this.toGridCoordinates(from)
    // TODO: translate to into the nearest grid coordinate if they clicked off the grid
    // find closest walkable grid spot to [x,y] they clicked
    // if (this.grid[gridTo.x] == null || this.grid[gridTo.x][gridTo.y] == null || this.grid[gridTo.x][gridTo.y] == 0) {
    //   const gridWithDistance = this.grid
    //     .map(g => {
    //       return {
    //         ...g,
    //         distance: Math.sqrt(Math.pow(Math.abs(g.x - gridTo.x), 2) + Math.pow(Math.abs(g.y - gridTo.y), 2)),
    //       }
    //     })
    //     .sort((a, b) => a.distance - b.distance)
    //   gridTo = gridWithDistance[0]
    // }

    let gridTo = this.toGridCoordinates(to)
    const graph = new Graph(this.grid, { diagonal: true })
    const result = astar.search(graph, graph.grid[gridFrom.x][gridFrom.y], graph.grid[gridTo.x][gridTo.y])

    // TODO: make the last node in the path the exact coordinates clicked if possible?  or just rely on everything always moving to center of grid spaces?
    return result.map(gridNode => this.toGameCoordinates(gridNode))
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
