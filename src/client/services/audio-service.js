const blobCache = {}

export default {
  getUrl(base64) {
    return new Promise((resolve, reject) => {
      if (base64 == null) reject()

      if (blobCache[base64]) resolve(blobCache[base64])

      fetch(base64)
        .then(res => res.blob())
        .then(blob => {
          const value = {
            base64,
            url: URL.createObjectURL(blob),
          }
          blobCache[base64] = value
          resolve(value)
        })
    })
  },

  play(base64) {
    this.getUrl(base64).then(response => {
      const audio = new Audio(response.url)
      audio.currentTime = 0.2
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
