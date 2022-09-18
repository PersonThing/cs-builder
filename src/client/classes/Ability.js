import parseKidScript from '../services/kid-script-parser.js'
import Projectile from './Projectile.js'
import AbilityType from '../config/ability-types.js'
import audioService from '../services/audio-service.js'
import damageTypes from '../config/damage-types.js'

export default class Ability {
  constructor(source, abilityConfig) {
    this.nextFire = 0
    this.source = source
    this.config = abilityConfig
    this.onUseCustom = abilityConfig.onUse ? Function('source', 'ability', 'target', parseKidScript(abilityConfig.onUse)) : () => {}
    this.onHitCustom = abilityConfig.onHit ? Function('source', 'ability', 'target', parseKidScript(abilityConfig.onHit)) : () => {}
  }

  use(target) {
    if (!this.source || !target) return

    const time = performance.now()
    this.nextFire = time + (this.config.cooldown || 0)
    this.source.rotateToward(target)
    this.source.useAbilityCharacterArt(this.config.characterArt)
    this.playOnUseAudio()
    if (this.config.abilityType == AbilityType.Basic) {
      this.createProjectile(target)
    } else {
      this.onUseCustom(this.source, this, target)
    }
  }

  playOnUseAudio() {
    if (this.config.audioOnUse?.data?.base64) {
      audioService.play(this.config.audioOnUse.data.base64, this.config.audioOnUse.start)
    }
  }

  playOnHitAudio() {
    if (this.config.audioOnHit?.data?.base64) {
      audioService.play(this.config.audioOnHit.data.base64, this.config.audioOnHit.start)
    }
  }

  createProjectile(target, overrides, sourcePosition) {
    const projectile = new Projectile(
      this.source,
      sourcePosition ? sourcePosition : this.source.position,
      {
        ...this.config,
        ...overrides,
      },
      target
    )
    this.source.world.projectileContainer.addChild(projectile)
    return projectile
  }
}
