/**
 * each damage type has:
 *   name
 *   color
 *   applyDamage(source, target, ability, isDirectHit)
 *     source = who is dealing the damage (a player or enemy instance)
 *     target = who is taking the damage (a player or enemy instance)
 *     ability = what ability is doing the damage
 *     isDirectHit = whether this is a direct hit, or just being applied via area of effect
 */

export const Physical = {
  name: 'Physical',
  color: 0x4d4d4d,
  applyDamage: (source, target, ability, isDirectHit) => {
    const totalDamage = getTotalDamage(ability, isDirectHit)

    // check if target is physical immune
    // stun target briefly or something?
    // chance to critically hit?
    target.takeDamage(totalDamage)
  },
}

export const Cold = {
  name: 'Cold',
  color: 0x00aeed,
  applyDamage: (source, target, ability, isDirectHit) => {
    const totalDamage = getTotalDamage(ability, isDirectHit)
    // check if target is cold immune
    // tint target blue
    // slow?  maybe chance to freeze?
    // ice / cold particles on target?
    target.setTint(Cold.color)
    target.speed *= 0.5
    target.takeDamage(totalDamage)
    setTimeout(() => {
      target.speed *= 2
      target.resetTint()
    }, 2000)
  },
}

export const Fire = {
  name: 'Fire',
  color: 0xf72702,
  applyDamage: (source, target, ability, isDirectHit) => {
    const totalDamage = getTotalDamage(ability, isDirectHit)

    // check if target is fire immune
    // tint target red
    // fire / smoke particles on target?

    // do 50% of the damage right away
    const halfDamage = totalDamage / 2
    target.takeDamage(halfDamage)

    // the other 50% over time
    const duration = 3000
    const tickInterval = 50
    const damagePerTick = (halfDamage * tickInterval) / duration
    applyTickDamage(target, duration, tickInterval, damagePerTick, Fire.color)
  },
}

export const Lightning = {
  name: 'Lightning',
  color: 0xfbff26,
  applyDamage: (source, target, ability, isDirectHit) => {
    const totalDamage = getTotalDamage(ability, isDirectHit)

    // check if target is lightning immune

    // lightning just tints them and does 1.5x damage for now
    target.setTint(Lightning.color)
    target.takeDamage(totalDamage * 1.5)
    target.speed = 0
    setTimeout(() => {
      target.resetTint()
      target.speed = target.config.speed
    }, 500)
  },
}

export const Poison = {
  name: 'Poison',
  color: 0x85de12,
  applyDamage: (source, target, ability, isDirectHit) => {
    // divide damage over time instead of doing it all at once
    // let's just do all damage over 5s for poison for now
    const duration = 5000
    const tickInterval = 50
    const totalDamage = getTotalDamage(ability, isDirectHit)
    const damagePerTick = (totalDamage * tickInterval) / duration
    applyTickDamage(target, duration, tickInterval, damagePerTick, Poison.color)
  },
}

function applyTickDamage(target, duration, tickInterval, damagePerTick, tintColor) {
  let ticks = duration / tickInterval
  target.setTint(tintColor)
  const damageInterval = setInterval(() => {
    if (ticks <= 0 || target == null || target.health <= 0) {
      if (target?.health > 0) target.resetTint()
      clearInterval(damageInterval)
    } else {
      target.setTint(tintColor)
      target.takeDamage(damagePerTick)
      ticks--
    }
  }, tickInterval)
}

function getTotalDamage(ability, isDirectHit) {
  return isDirectHit ? ability.damage : ability.areaDamage
}

export default {
  Physical,
  Cold,
  Fire,
  Lightning,
  Poison,
}
