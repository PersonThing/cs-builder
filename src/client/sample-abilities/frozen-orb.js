const projectileConfig = {
  damageType: 'Cold',
  damage: 0,
  areaDamage: 5,
  areaDamageRadius: 20,
  speed: 5,
  range: 600,
  ignoreDirectHits: true,
  audioOnHit: null,
}
const lesserProjectileConfig = {
  ...projectileConfig,
  range: 200,
  speed: 10,
  ignoreDirectHits: false,
}

const getPointAtAngle = (point, angle, distance) => {
  const x = point.x + Math.cos(angle) * distance
  const y = point.y + Math.sin(angle) * distance
  return { x, y }
}

const emit = a => {
  let t = getPointAtAngle(projectile, a, lesserProjectileConfig.range)
  ability.createProjectile(t, lesserProjectileConfig, { x: projectile.x, y: projectile.y })
  //source.drawLine(projectile, t)
}

// shoot a projectile at target
const projectile = ability.createProjectile(target, projectileConfig)

// keep shooting projectiles out of that projectile's path in a spiral until the projectile dies
let angle1 = 0
let angle2 = 0
let icicles = 0
let lastEmit = null
let totalEmits = 0
projectile.addOnTick(time => {
  if (projectile.dying || lastEmit + 50 > time) return

  emit((angle1 += 5))
  emit((angle1 += 5))
  emit((angle1 += 5))
  emit((angle2 -= 7))
  emit((angle2 -= 7))
  emit((angle2 -= 7))

  lastEmit = time
  totalEmits++

  if (totalEmits % 6 == 0) ability.playOnHitAudio()
})
