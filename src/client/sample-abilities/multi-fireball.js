const angle = Math.atan2(target.y - source.y, target.x - source.x)
const sin = Math.sin(angle)
const cos = Math.cos(angle)

const getPerpendicularPoint = distance => {
  const x = target.x - sin * distance
  const y = target.y + cos * distance
  return { x, y }
}

const fire = t =>
  ability.createProjectile(t, {
    damageType: 'Fire',
    damage: 0,
    areaDamage: 35,
    areaDamageRadius: 50,
    speed: 10,
  })

// fire projectiles at points on a line perpendicular to the line between source and target
fire(target)
for (let i = 1; i <= 3; i++) {
  fire(getPerpendicularPoint(i * 50))
  fire(getPerpendicularPoint(i * -50))
}
