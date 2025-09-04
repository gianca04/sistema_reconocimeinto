// === FUNCIONES DE CAPTURA Y SECUENCIAS ===

class CaptureManager {
  constructor(gestureSystem) {
    this.gestureSystem = gestureSystem;
  }

  // === FUNCIONES DE REGISTRO SECUENCIAL ===
  startSequence() {
    const gestureName = this.gestureSystem.gestureNameInput.value.trim();
    if (!gestureName) {
      alert("Por favor ingresa un nombre para el gesto.");
      return;
    }

    this.gestureSystem.isRecordingSequence = true;
    this.gestureSystem.currentFrameIndex = 0;
    this.gestureSystem.currentFrames = [];

    // Actualizar UI
    document.getElementById("startSequenceBtn").disabled = true;
    document.getElementById("captureBtn").disabled = false;
    document.getElementById("finishSequenceBtn").disabled = false;
    document.getElementById("gestureName").disabled = true;

    // Mostrar barra de progreso
    const progressContainer = document.getElementById("progressContainer");
    progressContainer.classList.remove("hidden");

    this.updateSequenceStatus();
    this.gestureSystem.statusText.textContent = `Secuencia iniciada para "${gestureName}" - Captura Frame 1`;
  }

  captureFrame() {
    if (!this.gestureSystem.lastResults || !this.gestureSystem.lastResults.multiHandLandmarks) {
      alert("No se detectan manos. Asegúrate de que tu mano esté visible.");
      return;
    }

    if (!this.gestureSystem.isRecordingSequence) {
      alert("Primero debes iniciar una secuencia.");
      return;
    }

    const gestureName = this.gestureSystem.gestureNameInput.value.trim();

    // Procesar frame con normalización
    const frameData = this.gestureSystem.landmarkNormalizer.processarFrameParaCaptura(this.gestureSystem.lastResults);
    if (!frameData) {
      alert("Error al procesar el frame. Inténtalo de nuevo.");
      return;
    }

    // Capturar frame actual con landmarks normalizados
    const frame = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      landmarks: frameData.landmarks, // Originales para visualización
      landmarksNormalizados: frameData.landmarksNormalizados, // Para comparación
      handedness: frameData.handedness,
      gestureName: gestureName,
      frameIndex: this.gestureSystem.currentFrameIndex,
    };

    this.gestureSystem.currentFrames.push(frame);
    this.gestureSystem.currentFrameIndex++;

    // Feedback visual
    this.gestureSystem.canvasElement.classList.add("recording");
    setTimeout(() => {
      this.gestureSystem.canvasElement.classList.remove("recording");
    }, 300);

    this.updateSequenceStatus();

    if (this.gestureSystem.currentFrameIndex >= this.gestureSystem.maxFramesPerGesture) {
      this.gestureSystem.statusText.textContent = `Frame ${this.gestureSystem.currentFrameIndex} capturado - Secuencia completa, presiona "Finalizar"`;
      document.getElementById("captureBtn").disabled = true;
    } else {
      this.gestureSystem.statusText.textContent = `Frame ${
        this.gestureSystem.currentFrameIndex
      } capturado - Listo para Frame ${this.gestureSystem.currentFrameIndex + 1}`;
    }
  }

  finishSequence() {
    if (this.gestureSystem.currentFrames.length === 0) {
      alert("No hay frames para guardar.");
      return;
    }

    const gestureName = this.gestureSystem.gestureNameInput.value.trim();

    // Crear objeto del gesto
    const gesture = {
      id: Date.now(),
      name: gestureName,
      frames: [...this.gestureSystem.currentFrames],
      frameCount: this.gestureSystem.currentFrames.length,
      createdAt: new Date().toISOString(),
      isSequential: true,
    };

    // Guardar en array de gestos
    this.gestureSystem.savedGestures.push(gesture);
    this.gestureSystem.saveSavedGestures();

    // Resetear estado
    this.resetSequenceState();

    this.gestureSystem.updateDisplay();
    this.gestureSystem.practiceManager.updatePracticeGestureList();
    this.gestureSystem.statusText.textContent = `✅ Gesto "${gestureName}" guardado con ${gesture.frameCount} frames secuenciales`;
  }

  resetSequenceState() {
    this.gestureSystem.isRecordingSequence = false;
    this.gestureSystem.currentFrameIndex = 0;
    this.gestureSystem.currentFrames = [];
    this.gestureSystem.gestureNameInput.value = "";
    this.gestureSystem.gestureNameInput.disabled = false;

    // Resetear botones
    document.getElementById("startSequenceBtn").disabled = false;
    document.getElementById("captureBtn").disabled = true;
    document.getElementById("finishSequenceBtn").disabled = true;

    // Ocultar barra de progreso
    document.getElementById("progressContainer").classList.add("hidden");

    document.getElementById("sequenceStatusText").textContent =
      'Presiona "Iniciar Secuencia" para comenzar';
  }

  updateSequenceStatus() {
    const statusText = document.getElementById("sequenceStatusText");
    const progressFill = document.getElementById("progressFill");
    const progressText = document.getElementById("progressText");

    if (this.gestureSystem.isRecordingSequence) {
      statusText.textContent = `Capturando secuencia - Frame ${
        this.gestureSystem.currentFrameIndex + 1
      } de ${this.gestureSystem.maxFramesPerGesture}`;

      const progress =
        (this.gestureSystem.currentFrames.length / this.gestureSystem.maxFramesPerGesture) * 100;
      progressFill.style.width = progress + "%";
      progressText.textContent = `${this.gestureSystem.currentFrames.length}/${this.gestureSystem.maxFramesPerGesture}`;

      // Actualizar número de frame en el botón
      document.getElementById("frameNumber").textContent =
        this.gestureSystem.currentFrameIndex + 1;
    }
  }

  clearCurrentFrames() {
    this.resetSequenceState();
    this.gestureSystem.updateDisplay();
    this.gestureSystem.statusText.textContent = "Frames limpiados";
  }
}
