import * as particles from '@pixi/particle-emitter'
import buildParticleEmitterConfig from './default-particle-options'

export default class ParticleEmitter {
  constructor(texture, container, rotation, time) {
    this.emitter = new particles.Emitter(container, buildParticleEmitterConfig(texture))
    this.emitter.emit = true
    this.emitter.rotation = rotation
  }

  move(x, y) {
    console.log('moving particles to', x, y)
    this.emitter.spawnPos.x = x
    this.emitter.spawnPos.y = y
  }

  onTick(time) {
    // if (this.lastTime == null) this.lastTime = time
    // The emitter requires the elapsed
    // number of seconds since the last update
    const ms = performance.now()
    if (this.lastMs == null) this.lastMs = ms
    this.emitter.update((ms - this.lastMs) / 1000)
    this.lastMs = ms
  }

  stop() {
    this.emitter.emit = false
  }

  destroy() {
    this.emitter.destroy()
  }
}
