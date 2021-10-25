import { upgradeConfig } from '@pixi/particle-emitter'

const base64ParticlePng =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACwAAAAsCAQAAAC0jZKKAAACPElEQVR4AbXXcW/TMBAF8EtCypa1LCDB9/98ILG1dKNNCOZZT8h6N4562eZTzH8/ni6dfWns4kqtvbMOT2tmv+0XasG/F1aTLFxd5lDcCS8o0tyX58K9bVA9WZe40LNNqLkevrJr1HvrC1vgQoM820/UqQZubQBKWDKjDJjP+wg41/J/eAOQsGb2rWDlvKzMTyEMaJvBIHNpBdswOfhoZ4VL2h3Irc+srSiJPYv9B1Mr3IHcCS2ZJTFf2+RZ1NEWD5PF7mmQ/nfs85I9klb4KrNCa2YkZitcXmVZpwL3zFtwpYH6l3cWtqDMPP+Fb+zWPthW6BvUIJmZuOTN7APqKOjB9vZAuAM6ArvFE9CSeI5Y1B7PPfAFMPKMKMWVZmbCzKusoveoKcODjQDzgx3c6GnUFnADOAFGV5V16B7PI2BkBRjgmf4IWBbYu8I6lPuhSa2w4xP8k7CF/l5Q7HuiZW9ST+wpjgKLvP9ed6gAJXztWcG/2CaAJ/tKlJSnm7RTTHHATQAnwAFKWCn/H3y2eH2L2ZfDIf06rXD8m768l//cAvzN/kBe709a8cPFQ4jXFA8hHpvVh1D9scmrqfbYrD/oO0s5caYrDvraqwlwW3811V6mvXUrLtOq6x+NYCt0vIqv/2hgcUPWqoFFRixlB9tEIxZHWKHJLmuGQraifijUMTbIq63QzDLGrh+8wVYO3rI6nzdohc+81H3cDHiijxvNfAJ9Wv855hJL5nnlB2Tw8ojzC7UelrXqk/cPn233eGpGsfAAAAAASUVORK5CYII='

const oldStyleConfig = {
  alpha: {
    start: 0.4,
    end: 0.1,
  },
  scale: {
    start: 1.0,
    end: 0.3,
    minimumScaleMultiplier: 1,
  },
  color: {
    start: '#e4f9ff',
    end: '#3fcbff',
  },
  speed: {
    start: 200,
    end: 20,
    minimumSpeedMultiplier: 1,
  },
  acceleration: {
    x: 0,
    y: 0,
  },
  maxSpeed: 0,
  startRotation: {
    min: 80,
    max: 100,
  },
  noRotation: false,
  rotationSpeed: {
    min: 50,
    max: 200,
  },
  lifetime: {
    min: 0.5,
    max: 2,
  },
  blendMode: 'normal',
  frequency: 0.01,
  emitterLifetime: -1,
  maxParticles: 500,
  pos: {
    x: 0,
    y: -15,
  },
  addAtBack: false,
  spawnType: 'circle',
  spawnCircle: {
    x: 0,
    y: 0,
    r: 0,
  },
}

export default function buildParticleEmitterConfig(texture) {
  return upgradeConfig(oldStyleConfig, texture ?? base64ParticlePng)
}
