import LocalStorageStore from './local-storage-store'

const { subscribe, set, update } = LocalStorageStore('player-data', {})

let $storeValue
subscribe(v => ($storeValue = v))

export default {
  subscribe,
  addLevelWin(levelId, score, characterId) {
    if ($storeValue == null) $storeValue = {}
    if ($storeValue.levelWins == null) $storeValue.levelWins = {}
    if ($storeValue.levelWins[levelId] == null) $storeValue.levelWins[levelId] = []
    $storeValue.levelWins[levelId] = [
      ...$storeValue.levelWins[levelId],
      {
        score,
        characterId,
      },
    ].sort((a, b) => a.score - b.score)
    set($storeValue)
  },
  hasBeatenLevel(levelId) {
    return $storeValue.levelWins != null && $storeValue.levelWins[levelId] != null && $storeValue.levelWins[levelId].length > 0
  },
  hasBeatenAllLevels(levelIds) {
    return levelIds.every(l => this.hasBeatenLevel(l))
  },
  getHighScores(levelId) {
    return ($storeValue.levelWins[levelId] ?? []).sort((a, b) => b.score - a.score).slice(0, 3)
  },
  reset() {
    set({})
  },
}
