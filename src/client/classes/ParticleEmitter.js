import * as particles from '@pixi/particle-emitter'
import buildParticleEmitterConfig from './default-particle-options'

export default class ParticleEmitter {
  constructor(texture, container, rotation) {
    this.emitter = new particles.Emitter(container, buildParticleEmitterConfig(texture))
    this.emitter.emit = true
    this.emitter.rotation = rotation
  }

  move(x, y) {
    this.emitter.spawnPos.x = x
    this.emitter.spawnPos.y = y
  }

  onTick(time) {
    // if (this.lastTime == null) this.lastTime = time
    // The emitter requires the elapsed
    // number of seconds since the last update
    if (this.lastTime == null) this.lastTime = time
    this.emitter.update((time - this.lastTime) / 1000)
    this.lastTime = time
  }

  stop() {
    this.emitter.emit = false
  }

  destroy() {
    this.emitter.destroy()
  }

  getMaxLifetime() {
    return this.emitter.maxLifetime
  }
}
