// === CONFIGURACIÓN Y INICIALIZACIÓN DE MEDIAPIPE ===

class MediaPipeManager {
  constructor(gestureSystem) {
    this.gestureSystem = gestureSystem;
  }

  async initializeMediaPipe() {
    this.gestureSystem.hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    this.gestureSystem.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5,
    });

    this.gestureSystem.hands.onResults((results) => this.gestureSystem.onResults(results));

    // Inicializar cámara
    this.gestureSystem.camera = new Camera(this.gestureSystem.videoElement, {
      onFrame: async () => {
        await this.gestureSystem.hands.send({ image: this.gestureSystem.videoElement });
      },
      width: 640,
      height: 480,
    });

    // Configurar canvas
    this.gestureSystem.canvasElement.width = 640;
    this.gestureSystem.canvasElement.height = 480;

    this.gestureSystem.camera.start();
    this.gestureSystem.statusText.textContent = "Cámara iniciada - Listo para capturar";
  }

  onResults(results) {
    this.gestureSystem.lastResults = results;

    // Limpiar canvas
    this.gestureSystem.canvasCtx.clearRect(
      0,
      0,
      this.gestureSystem.canvasElement.width,
      this.gestureSystem.canvasElement.height
    );

    // Dibujar imagen de video
    this.gestureSystem.canvasCtx.drawImage(
      results.image,
      0,
      0,
      this.gestureSystem.canvasElement.width,
      this.gestureSystem.canvasElement.height
    );

    // Dibujar landmarks si se detectan manos
    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        drawConnectors(this.gestureSystem.canvasCtx, landmarks, HAND_CONNECTIONS, {
          color: "#00FF00",
          lineWidth: 2,
        });
        drawLandmarks(this.gestureSystem.canvasCtx, landmarks, {
          color: "#FF0000",
          lineWidth: 1,
          radius: 3,
        });
      }

      // Procesar reconocimiento si está activo
      if (this.gestureSystem.isRecognizing) {
        this.gestureSystem.processRecognition(results);
      }

      // Procesar práctica si está activa
      if (this.gestureSystem.isPracticing) {
        this.gestureSystem.processPractice(results);
      }
    }
  }
}
