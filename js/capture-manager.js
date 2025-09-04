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

    // Validar que hay al menos una mano detectada con suficientes landmarks
    if (!this.gestureSystem.lastResults.multiHandLandmarks[0] || 
        this.gestureSystem.lastResults.multiHandLandmarks[0].length < 21) {
      alert("Detección de mano incompleta. Asegúrate de que tu mano esté completamente visible.");
      return;
    }

    // Procesar frame con normalización específica para secuencias
    const frameData = this.processSequenceFrame(this.gestureSystem.lastResults);
    if (!frameData) {
      alert("Error al procesar el frame para secuencia. Inténtalo de nuevo.");
      return;
    }

    // Validar calidad del frame normalizado
    if (!this.validateNormalizedFrame(frameData.landmarksNormalizados)) {
      alert("Frame de baja calidad detectado. Inténtalo de nuevo con mejor iluminación y posición de mano.");
      return;
    }

    // Capturar frame actual con landmarks normalizados y metadatos adicionales
    const frame = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      landmarks: frameData.landmarks, // Originales para visualización
      landmarksNormalizados: frameData.landmarksNormalizados, // Para comparación
      handedness: frameData.handedness,
      gestureName: gestureName,
      frameIndex: this.gestureSystem.currentFrameIndex,
      // Metadatos adicionales para secuencias
      sequenceMetadata: {
        captureQuality: frameData.quality,
        centroide: frameData.centroide,
        boundingBox: frameData.boundingBox,
        handSize: frameData.handSize
      }
    };

    this.gestureSystem.currentFrames.push(frame);
    this.gestureSystem.currentFrameIndex++;

    // Feedback visual con información de calidad
    this.gestureSystem.canvasElement.classList.add("recording");
    setTimeout(() => {
      this.gestureSystem.canvasElement.classList.remove("recording");
    }, 300);

    this.updateSequenceStatus();

    if (this.gestureSystem.currentFrameIndex >= this.gestureSystem.maxFramesPerGesture) {
      this.gestureSystem.statusText.textContent = `Frame ${this.gestureSystem.currentFrameIndex} capturado - Secuencia completa, presiona "Finalizar"`;
      document.getElementById("captureBtn").disabled = true;
    } else {
      // Mostrar información de calidad del frame actual
      const quality = frame.sequenceMetadata.captureQuality;
      let qualityText = "";
      if (quality >= 80) {
        qualityText = " (Excelente calidad ✅)";
      } else if (quality >= 60) {
        qualityText = " (Buena calidad ⚠️)";
      } else {
        qualityText = " (Baja calidad ❌)";
      }
      
      this.gestureSystem.statusText.textContent = `Frame ${
        this.gestureSystem.currentFrameIndex
      } capturado${qualityText} - Listo para Frame ${this.gestureSystem.currentFrameIndex + 1}`;
    }
  }

  finishSequence() {
    if (this.gestureSystem.currentFrames.length === 0) {
      alert("No hay frames para guardar.");
      return;
    }

    const gestureName = this.gestureSystem.gestureNameInput.value.trim();

    // Analizar consistencia de la secuencia antes de guardar
    const sequenceAnalysis = this.analyzeSequenceConsistency();
    
    // Mostrar advertencias si hay problemas de consistencia
    if (!sequenceAnalysis.isConsistent) {
      const shouldContinue = confirm(
        `Se detectaron los siguientes problemas en la secuencia:\n\n${sequenceAnalysis.issues.join('\n')}\n\n¿Deseas guardar la secuencia de todos modos?`
      );
      
      if (!shouldContinue) {
        this.gestureSystem.statusText.textContent = "Secuencia no guardada. Puedes capturar más frames o empezar de nuevo.";
        return;
      }
    }

    // Crear objeto del gesto con información adicional de secuencia
    const gesture = {
      id: Date.now(),
      name: gestureName,
      frames: [...this.gestureSystem.currentFrames],
      frameCount: this.gestureSystem.currentFrames.length,
      createdAt: new Date().toISOString(),
      isSequential: true,
      // Metadatos de secuencia para mejor reconocimiento
      sequenceMetadata: {
        consistency: sequenceAnalysis,
        avgQuality: sequenceAnalysis.stats?.avgQuality || 0,
        normalizedFrames: this.gestureSystem.currentFrames.every(f => f.landmarksNormalizados),
        captureDevice: 'webcam',
        version: '2.0' // Versión con normalización mejorada
      }
    };

    // Guardar en array de gestos
    this.gestureSystem.savedGestures.push(gesture);
    this.gestureSystem.saveSavedGestures();

    // Resetear estado
    this.resetSequenceState();

    this.gestureSystem.updateDisplay();
    this.gestureSystem.practiceManager.updatePracticeGestureList();
    
    // Mensaje de éxito con información de calidad
    let statusMessage = `✅ Gesto "${gestureName}" guardado con ${gesture.frameCount} frames secuenciales`;
    if (sequenceAnalysis.stats?.avgQuality) {
      statusMessage += ` (Calidad: ${sequenceAnalysis.stats.avgQuality}%)`;
    }
    this.gestureSystem.statusText.textContent = statusMessage;
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

      // Mostrar información de calidad si hay frames capturados
      if (this.gestureSystem.currentFrames.length > 0) {
        const lastFrame = this.gestureSystem.currentFrames[this.gestureSystem.currentFrames.length - 1];
        const quality = lastFrame.sequenceMetadata?.captureQuality || 0;
        
        // Actualizar color de la barra de progreso según la calidad
        if (quality >= 80) {
          progressFill.style.background = "linear-gradient(90deg, #28a745, #20c997)";
        } else if (quality >= 60) {
          progressFill.style.background = "linear-gradient(90deg, #ffc107, #fd7e14)";
        } else {
          progressFill.style.background = "linear-gradient(90deg, #dc3545, #c82333)";
        }

        // Mostrar estadísticas de calidad
        if (this.gestureSystem.currentFrames.length >= 2) {
          const analysis = this.analyzeSequenceConsistency();
          if (analysis.stats) {
            statusText.textContent += ` | Calidad: ${analysis.stats.avgQuality}%`;
          }
        }
      }
    }
  }

  clearCurrentFrames() {
    this.resetSequenceState();
    this.gestureSystem.updateDisplay();
    this.gestureSystem.statusText.textContent = "Frames limpiados";
  }

  // === FUNCIONES ESPECÍFICAS PARA PROCESAMIENTO DE SECUENCIAS ===

  processSequenceFrame(results) {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      return null;
    }

    const landmarks = results.multiHandLandmarks[0]; // Primera mano detectada
    
    // Calcular información adicional para secuencias
    const centroide = this.gestureSystem.landmarkNormalizer.calcularCentroide(landmarks);
    const boundingBox = this.calculateBoundingBox(landmarks);
    const handSize = this.calculateHandSize(landmarks);
    const quality = this.assessFrameQuality(landmarks, boundingBox);
    
    // Normalizar landmarks
    const landmarksNormalizados = this.gestureSystem.landmarkNormalizer.normalizarLandmarks(landmarks);
    
    return {
      landmarks: results.multiHandLandmarks, // Mantener originales para visualización
      landmarksNormalizados: landmarksNormalizados, // Landmarks procesados para comparación
      handedness: results.multiHandedness || [],
      centroide: centroide,
      boundingBox: boundingBox,
      handSize: handSize,
      quality: quality
    };
  }

  calculateBoundingBox(landmarks) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    for (const landmark of landmarks) {
      minX = Math.min(minX, landmark.x);
      maxX = Math.max(maxX, landmark.x);
      minY = Math.min(minY, landmark.y);
      maxY = Math.max(maxY, landmark.y);
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    };
  }

  calculateHandSize(landmarks) {
    // Calcular el tamaño de la mano usando la distancia entre puntos clave
    const wrist = landmarks[0];
    const middleTip = landmarks[12];
    const thumbTip = landmarks[4];
    const pinkyTip = landmarks[20];
    
    // Distancia de la muñeca al dedo medio (longitud de mano)
    const handLength = Math.sqrt(
      Math.pow(middleTip.x - wrist.x, 2) + Math.pow(middleTip.y - wrist.y, 2)
    );
    
    // Distancia del pulgar al meñique (ancho de mano)
    const handWidth = Math.sqrt(
      Math.pow(thumbTip.x - pinkyTip.x, 2) + Math.pow(thumbTip.y - pinkyTip.y, 2)
    );
    
    return {
      length: handLength,
      width: handWidth,
      area: handLength * handWidth
    };
  }

  assessFrameQuality(landmarks, boundingBox) {
    let qualityScore = 100;
    
    // Penalizar si la mano está muy cerca del borde
    const edgeMargin = 0.1; // 10% del área de la imagen
    if (boundingBox.x < edgeMargin || boundingBox.y < edgeMargin ||
        (boundingBox.x + boundingBox.width) > (1 - edgeMargin) ||
        (boundingBox.y + boundingBox.height) > (1 - edgeMargin)) {
      qualityScore -= 20;
    }
    
    // Penalizar si la mano es muy pequeña (muy lejos de la cámara)
    if (boundingBox.width < 0.15 || boundingBox.height < 0.15) {
      qualityScore -= 25;
    }
    
    // Penalizar si la mano es muy grande (muy cerca de la cámara)
    if (boundingBox.width > 0.7 || boundingBox.height > 0.7) {
      qualityScore -= 25;
    }
    
    // Verificar que todos los landmarks estén presentes y sean válidos
    let invalidLandmarks = 0;
    for (const landmark of landmarks) {
      if (landmark.x < 0 || landmark.x > 1 || landmark.y < 0 || landmark.y > 1) {
        invalidLandmarks++;
      }
    }
    
    if (invalidLandmarks > 0) {
      qualityScore -= (invalidLandmarks * 5);
    }
    
    return Math.max(0, qualityScore);
  }

  validateNormalizedFrame(landmarksNormalizados) {
    if (!landmarksNormalizados || landmarksNormalizados.length !== 21) {
      return false;
    }
    
    // Verificar que los landmarks normalizados estén en un rango razonable
    for (const landmark of landmarksNormalizados) {
      if (isNaN(landmark.x) || isNaN(landmark.y) || 
          Math.abs(landmark.x) > 2 || Math.abs(landmark.y) > 2) {
        return false;
      }
    }
    
    return true;
  }

  // === FUNCIONES DE ANÁLISIS DE SECUENCIA ===

  analyzeSequenceConsistency() {
    if (this.gestureSystem.currentFrames.length < 2) {
      return { isConsistent: true, issues: [] };
    }

    const issues = [];
    const frames = this.gestureSystem.currentFrames;
    
    // Analizar consistencia de tamaño de mano
    const handSizes = frames.map(f => f.sequenceMetadata?.handSize?.area || 0);
    const avgHandSize = handSizes.reduce((a, b) => a + b, 0) / handSizes.length;
    const sizeVariation = Math.max(...handSizes) - Math.min(...handSizes);
    
    if (sizeVariation > avgHandSize * 0.5) {
      issues.push("Variación significativa en el tamaño de la mano detectada");
    }
    
    // Analizar consistencia de calidad
    const qualities = frames.map(f => f.sequenceMetadata?.captureQuality || 0);
    const avgQuality = qualities.reduce((a, b) => a + b, 0) / qualities.length;
    
    if (avgQuality < 70) {
      issues.push("Calidad promedio de captura baja");
    }
    
    // Analizar fluidez temporal
    const timestamps = frames.map(f => new Date(f.timestamp).getTime());
    const intervals = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i-1]);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const maxInterval = Math.max(...intervals);
    
    if (maxInterval > avgInterval * 3) {
      issues.push("Pausas irregulares detectadas durante la captura");
    }
    
    return {
      isConsistent: issues.length === 0,
      issues: issues,
      stats: {
        avgQuality: Math.round(avgQuality),
        avgHandSize: avgHandSize,
        sizeVariation: sizeVariation,
        avgInterval: Math.round(avgInterval)
      }
    };
  }
}
