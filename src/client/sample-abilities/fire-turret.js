const maxTurrets = 5
const bestTarget = source.getClosestPathablePoint(target)

// if they have 5 turrets out already, kill the oldest one
if (source.turrets == null) source.turrets = []
if (source.turrets.length >= maxTurrets) source.turrets.shift().destroy()

const turret = ability.createProjectile(
  target,
  {
    damageType: 'Fire',
    damage: 0,
    areaDamage: 0,
    areaDamageRadius: 0,
    speed: 0,
    range: 600,
    ignoreDirectHits: true,
    lifetimeMs: 5000,
    graphics: {
      projectile: ability.config.graphics.extra1,
      particle: ability.config.graphics.particle,
    },
  },
  bestTarget
)

const projectileConfig = {
  damageType: 'Fire',
  damage: 0,
  areaDamage: 50,
  areaDamageRadius: 40,
  speed: 10,
  range: 400,
  attacksPerSecond: 3,
  audioOnHit: null,
}

let lastShot = null
turret.addOnTick(time => {
  if (turret.dying || lastShot + 1000 / projectileConfig.attacksPerSecond > time) return
  const e = source.getClosestVisibleEnemyInRange(projectileConfig.range, turret)
  if (e) {
    ability.playOnHitAudio()
    ability.createProjectile(e.enemy, projectileConfig, turret)
    lastShot = time
    turret.rotateToward(e.enemy)
  }
})

source.turrets.push(turret)
