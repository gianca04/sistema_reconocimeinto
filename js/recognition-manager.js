// === FUNCIONES DE RECONOCIMIENTO ===

class RecognitionManager {
  constructor(gestureSystem) {
    this.gestureSystem = gestureSystem;
  }

  startRecognition() {
    if (this.gestureSystem.savedGestures.length === 0) {
      alert(
        "No hay gestos guardados para reconocer. Cambia al modo captura y graba algunos gestos primero."
      );
      return;
    }

    this.gestureSystem.isRecognizing = true;
    this.gestureSystem.recognitionBuffer = [];

    // Actualizar UI
    this.gestureSystem.canvasElement.classList.add("recognizing");
    document.getElementById("startRecognitionBtn").disabled = true;
    document.getElementById("stopRecognitionBtn").disabled = false;
    this.gestureSystem.statusText.textContent = "Reconociendo gestos... Realiza un gesto";

    // Limpiar resultados anteriores
    this.updateRecognitionDisplay("---", 0);
  }

  stopRecognition() {
    this.gestureSystem.isRecognizing = false;
    this.gestureSystem.recognitionBuffer = [];

    // Actualizar UI
    this.gestureSystem.canvasElement.classList.remove("recognizing");
    document.getElementById("startRecognitionBtn").disabled = false;
    document.getElementById("stopRecognitionBtn").disabled = true;
    this.gestureSystem.statusText.textContent = "Reconocimiento detenido";

    // Limpiar resultados
    this.updateRecognitionDisplay("---", 0);
  }

  updateTolerance(event) {
    this.gestureSystem.recognitionTolerance = parseFloat(event.target.value);
    document.getElementById("toleranceValue").textContent =
      Math.round(this.gestureSystem.recognitionTolerance * 100) + "%";
  }

  processRecognition(results) {
    if (
      !results.multiHandLandmarks ||
      results.multiHandLandmarks.length === 0
    ) {
      return;
    }

    // Procesar frame actual con normalización
    const frameData = this.gestureSystem.landmarkNormalizer.processarFrameParaCaptura(results);
    if (!frameData) return;

    // Crear frame actual para comparación
    const currentFrame = {
      landmarks: frameData.landmarks,
      landmarksNormalizados: frameData.landmarksNormalizados,
      handedness: frameData.handedness,
      timestamp: Date.now(),
    };

    // Agregar al buffer de reconocimiento
    this.gestureSystem.recognitionBuffer.push(currentFrame);
    if (this.gestureSystem.recognitionBuffer.length > this.gestureSystem.maxBufferSize) {
      this.gestureSystem.recognitionBuffer.shift();
    }

    // Procesar reconocimiento solo si tenemos suficientes frames
    if (this.gestureSystem.recognitionBuffer.length >= 3) {
      this.performGestureRecognition(currentFrame);
    }
  }

  performGestureRecognition(currentFrame) {
    let bestMatch = null;
    let bestScore = 0;

    // Comparar con todos los gestos guardados
    for (const gesture of this.gestureSystem.savedGestures) {
      const score = this.compareWithGesture(currentFrame, gesture);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = gesture;
      }
    }

    // Aplicar tolerancia
    if (bestMatch && bestScore >= this.gestureSystem.recognitionTolerance) {
      this.updateRecognitionDisplay(bestMatch.name, bestScore * 100);
    } else {
      this.updateRecognitionDisplay("No reconocido", bestScore * 100);
    }
  }

  compareWithGesture(currentFrame, gesture) {
    let maxSimilarity = 0;

    // Comparar con cada frame del gesto guardado
    for (const storedFrame of gesture.frames) {
      const similarity = this.gestureSystem.landmarkNormalizer.calculateFrameSimilarity(
        currentFrame,
        storedFrame
      );
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }

    return maxSimilarity;
  }

  updateRecognitionDisplay(gestureName, confidence) {
    document.getElementById("recognizedGesture").textContent = gestureName;
    document.getElementById("confidenceText").textContent =
      Math.round(confidence) + "%";

    // Actualizar barra de confianza
    const confidenceBar = document.getElementById("confidenceBar");
    confidenceBar.style.width = confidence + "%";

    // Cambiar color según confianza
    if (confidence >= 70) {
      confidenceBar.style.background = "#28a745";
    } else if (confidence >= 50) {
      confidenceBar.style.background = "#ffc107";
    } else {
      confidenceBar.style.background = "#dc3545";
    }
  }
}
