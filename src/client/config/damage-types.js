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
    // check if target is physical immune
    // stun target briefly or something?
    // chance to critically hit?
    applySimpleDamage(target, ability, isDirectHit)
  },
}

export const Cold = {
  name: 'Cold',
  color: 0x00aeed,
  applyDamage: (source, target, ability, isDirectHit) => {
    // check if target is cold immune
    // tint target blue
    // slow?  maybe chance to freeze?
    // ice / cold particles on target?
    target.setTint(Cold.color)
    target.speed *= 0.5
    applySimpleDamage(target, ability, isDirectHit)
    setTimeout(() => {
      target.speed *= 2
      target.resetTint()
    })
  },
}

export const Fire = {
  name: 'Fire',
  color: 0xf72702,
  applyDamage: (source, target, ability, isDirectHit, projectile) => {
    // check if target is fire immune
    // tint target red
    // fire / smoke particles on target?

    applySimpleDamage(target, ability, isDirectHit)
  },
}

export const Lightning = {
  name: 'Lightning',
  color: 0xadb300,
  applyDamage: (source, target, ability, isDirectHit) => {
    // check if target is lightning immune
    // draw a zap graphic around target
    applySimpleDamage(target, ability, isDirectHit)
  },
}

export const Poison = {
  name: 'Poison',
  color: 0x85de12,
  applyDamage: (source, target, ability, isDirectHit) => {
    // divide damage over time instead of doing it all at once
    // let's just do all damage over 5s for poison for now
    const poisonDuration = 5000
    const tickInterval = 500

    let ticks = poisonDuration / tickInterval
    const damageMultiplierPerTick = tickInterval / poisonDuration

    target.setTint(Poison.color)
    const interval = setInterval(() => {
      if (ticks == 0 || target == null || target.health <= 0) {
        if (target?.health > 0) target.resetTint()
        clearInterval(interval)
      } else {
        target.setTint(Poison.color)
        applySimpleDamage(target, ability, isDirectHit, damageMultiplierPerTick)
        ticks--
      }
    }, tickInterval)
  },
}

function applySimpleDamage(target, ability, isDirectHit, damageMultiplier = 1.0) {
  if (isDirectHit && ability.damage > 0) {
    target.takeDamage(ability.damage * damageMultiplier)
  } else if (!isDirectHit && ability.areaDamage > 0) {
    target.takeDamage(ability.areaDamage * damageMultiplier)
  }
}

export default {
  Physical,
  Cold,
  Fire,
  Lightning,
  Poison,
}
