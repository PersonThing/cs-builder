const audioCache = {}

export default {
  parseAudio(base64) {
    return new Promise((resolve, reject) => {
      if (base64 == null) reject()
      if (audioCache[base64]) resolve(audioCache[base64])
      fetch(base64)
        .then(res => res.blob())
        .then(blob => {
          const src = URL.createObjectURL(blob)
          const value = {
            blob,
            src,
          }
          audioCache[base64] = value
          resolve(value)
        })
    })
  },

  play(base64, start = 0) {
    start = parseFloat(start) ?? 0
    return this.parseAudio(base64).then(au => {
      const audio = new Audio(au.src)
      audio.currentTime = start
      audio.play()
    })
  },

  startRecording() {
    return new Promise((resolve, reject) => {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        this.mediaRecorder = new MediaRecorder(stream)
        this.mediaRecorder.start()
        const audioChunks = []
        this.mediaRecorder.addEventListener('dataavailable', event => {
          audioChunks.push(event.data)
        })
        this.mediaRecorder.addEventListener('stop', () => {
          const blob = new Blob(audioChunks)
          const reader = new FileReader()
          reader.addEventListener('loadend', () => {
            const base64Data = reader.result.toString()
            resolve({
              size: blob.size,
              base64: base64Data,
            })
          })
          reader.readAsDataURL(blob)
        })
      })
    })
  },

  stopRecording() {
    this.mediaRecorder?.stop()
  },
}
