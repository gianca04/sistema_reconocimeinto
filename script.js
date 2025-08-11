class GestureCaptureSystem {
  constructor() {
    this.currentFrames = [];
    this.savedGestures = this.loadSavedGestures();
    this.isCapturing = false;
    this.isRecognizing = false;
    this.isPracticing = false;
    this.hands = null;
    this.camera = null;
    this.lastResults = null;
    this.currentMode = "capture";
    this.recognitionTolerance = 0.7;
    this.recognitionBuffer = [];
    this.maxBufferSize = 10;

    // Nuevas propiedades para secuencias
    this.isRecordingSequence = false;
    this.currentFrameIndex = 0;
    this.maxFramesPerGesture = 10; // Máximo de frames por gesto

    // Propiedades para práctica
    this.practiceGesture = null;
    this.practiceFrameIndex = 0;
    this.similarityThreshold = 80; // Porcentaje
    this.practiceBuffer = [];
    this.lastSimilarityCheck = 0;

    this.initializeElements();
    this.initializeMediaPipe();
    this.initializeEventListeners();
    this.updateDisplay();
    this.switchMode("capture");
  }

  initializeElements() {
    this.videoElement = document.getElementById("video");
    this.canvasElement = document.getElementById("outputCanvas");
    this.canvasCtx = this.canvasElement.getContext("2d");
    this.gestureNameInput = document.getElementById("gestureName");
    this.statusText = document.getElementById("statusText");
    this.frameCountSpan = document.getElementById("frameCount");
  }

  async initializeMediaPipe() {
    this.hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5,
    });

    this.hands.onResults((results) => this.onResults(results));

    // Inicializar cámara
    this.camera = new Camera(this.videoElement, {
      onFrame: async () => {
        await this.hands.send({ image: this.videoElement });
      },
      width: 640,
      height: 480,
    });

    // Configurar canvas
    this.canvasElement.width = 640;
    this.canvasElement.height = 480;

    this.camera.start();
    this.statusText.textContent = "Cámara iniciada - Listo para capturar";
  }

  onResults(results) {
    this.lastResults = results;

    // Limpiar canvas
    this.canvasCtx.clearRect(
      0,
      0,
      this.canvasElement.width,
      this.canvasElement.height
    );

    // Dibujar imagen de video
    this.canvasCtx.drawImage(
      results.image,
      0,
      0,
      this.canvasElement.width,
      this.canvasElement.height
    );

    // Dibujar landmarks si se detectan manos
    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        drawConnectors(this.canvasCtx, landmarks, HAND_CONNECTIONS, {
          color: "#00FF00",
          lineWidth: 2,
        });
        drawLandmarks(this.canvasCtx, landmarks, {
          color: "#FF0000",
          lineWidth: 1,
          radius: 3,
        });
      }

      // Procesar reconocimiento si está activo
      if (this.isRecognizing) {
        this.processRecognition(results);
      }

      // Procesar práctica si está activa
      if (this.isPracticing) {
        this.processPractice(results);
      }
    }
  }

  initializeEventListeners() {
    // Eventos de modo
    document
      .getElementById("captureMode")
      .addEventListener("click", () => this.switchMode("capture"));
    document
      .getElementById("practiceMode")
      .addEventListener("click", () => this.switchMode("practice"));
    document
      .getElementById("recognizeMode")
      .addEventListener("click", () => this.switchMode("recognize"));

    // Eventos de captura secuencial
    document
      .getElementById("startSequenceBtn")
      .addEventListener("click", () => this.startSequence());
    document
      .getElementById("captureBtn")
      .addEventListener("click", () => this.captureFrame());
    document
      .getElementById("finishSequenceBtn")
      .addEventListener("click", () => this.finishSequence());
    document
      .getElementById("clearFramesBtn")
      .addEventListener("click", () => this.clearCurrentFrames());

    // Eventos de práctica
    document
      .getElementById("startPracticeBtn")
      .addEventListener("click", () => this.startPractice());
    document
      .getElementById("stopPracticeBtn")
      .addEventListener("click", () => this.stopPractice());
    document
      .getElementById("similarityThreshold")
      .addEventListener("input", (e) => this.updateSimilarityThreshold(e));

    // Eventos de reconocimiento
    document
      .getElementById("startRecognitionBtn")
      .addEventListener("click", () => this.startRecognition());
    document
      .getElementById("stopRecognitionBtn")
      .addEventListener("click", () => this.stopRecognition());
    document
      .getElementById("toleranceSlider")
      .addEventListener("input", (e) => this.updateTolerance(e));

    // Eventos de exportación
    document
      .getElementById("exportBtn")
      .addEventListener("click", () => this.exportDataset());
    document
      .getElementById("importBtn")
      .addEventListener("click", () =>
        document.getElementById("importFile").click()
      );
    document
      .getElementById("importFile")
      .addEventListener("change", (e) => this.importDataset(e));
    document
      .getElementById("clearAllBtn")
      .addEventListener("click", () => this.clearAllGestures());
  }

  // === FUNCIONES DE REGISTRO SECUENCIAL ===
  startSequence() {
    const gestureName = this.gestureNameInput.value.trim();
    if (!gestureName) {
      alert("Por favor ingresa un nombre para el gesto.");
      return;
    }

    this.isRecordingSequence = true;
    this.currentFrameIndex = 0;
    this.currentFrames = [];

    // Actualizar UI
    document.getElementById("startSequenceBtn").disabled = true;
    document.getElementById("captureBtn").disabled = false;
    document.getElementById("finishSequenceBtn").disabled = false;
    document.getElementById("gestureName").disabled = true;

    // Mostrar barra de progreso
    const progressContainer = document.getElementById("progressContainer");
    progressContainer.classList.remove("hidden");

    this.updateSequenceStatus();
    this.statusText.textContent = `Secuencia iniciada para "${gestureName}" - Captura Frame 1`;
  }

  captureFrame() {
    if (!this.lastResults || !this.lastResults.multiHandLandmarks) {
      alert("No se detectan manos. Asegúrate de que tu mano esté visible.");
      return;
    }

    if (!this.isRecordingSequence) {
      alert("Primero debes iniciar una secuencia.");
      return;
    }

    const gestureName = this.gestureNameInput.value.trim();

    // Capturar frame actual
    const frame = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      landmarks: this.lastResults.multiHandLandmarks,
      handedness: this.lastResults.multiHandedness || [],
      gestureName: gestureName,
      frameIndex: this.currentFrameIndex,
    };

    this.currentFrames.push(frame);
    this.currentFrameIndex++;

    // Feedback visual
    this.canvasElement.classList.add("recording");
    setTimeout(() => {
      this.canvasElement.classList.remove("recording");
    }, 300);

    this.updateSequenceStatus();

    if (this.currentFrameIndex >= this.maxFramesPerGesture) {
      this.statusText.textContent = `Frame ${this.currentFrameIndex} capturado - Secuencia completa, presiona "Finalizar"`;
      document.getElementById("captureBtn").disabled = true;
    } else {
      this.statusText.textContent = `Frame ${
        this.currentFrameIndex
      } capturado - Listo para Frame ${this.currentFrameIndex + 1}`;
    }
  }

  finishSequence() {
    if (this.currentFrames.length === 0) {
      alert("No hay frames para guardar.");
      return;
    }

    const gestureName = this.gestureNameInput.value.trim();

    // Crear objeto del gesto
    const gesture = {
      id: Date.now(),
      name: gestureName,
      frames: [...this.currentFrames],
      frameCount: this.currentFrames.length,
      createdAt: new Date().toISOString(),
      isSequential: true,
    };

    // Guardar en array de gestos
    this.savedGestures.push(gesture);
    this.saveSavedGestures();

    // Resetear estado
    this.resetSequenceState();

    this.updateDisplay();
    this.updatePracticeGestureList();
    this.statusText.textContent = `✅ Gesto "${gestureName}" guardado con ${gesture.frameCount} frames secuenciales`;
  }

  resetSequenceState() {
    this.isRecordingSequence = false;
    this.currentFrameIndex = 0;
    this.currentFrames = [];
    this.gestureNameInput.value = "";
    this.gestureNameInput.disabled = false;

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

    if (this.isRecordingSequence) {
      statusText.textContent = `Capturando secuencia - Frame ${
        this.currentFrameIndex + 1
      } de ${this.maxFramesPerGesture}`;

      const progress =
        (this.currentFrames.length / this.maxFramesPerGesture) * 100;
      progressFill.style.width = progress + "%";
      progressText.textContent = `${this.currentFrames.length}/${this.maxFramesPerGesture}`;

      // Actualizar número de frame en el botón
      document.getElementById("frameNumber").textContent =
        this.currentFrameIndex + 1;
    }
  }

  // === FUNCIONES DE PRÁCTICA SECUENCIAL ===
  startPractice() {
    const selectedGestureId = document.getElementById("practiceGesture").value;
    if (!selectedGestureId) {
      alert("Por favor selecciona un gesto para practicar.");
      return;
    }

    this.practiceGesture = this.savedGestures.find(
      (g) => g.id == selectedGestureId
    );
    if (!this.practiceGesture) {
      alert("Gesto no encontrado.");
      return;
    }

    this.isPracticing = true;
    this.practiceFrameIndex = 0;
    this.practiceBuffer = [];

    // Actualizar UI
    document.getElementById("startPracticeBtn").disabled = true;
    document.getElementById("stopPracticeBtn").disabled = false;
    document.getElementById("practiceGesture").disabled = true;

    this.canvasElement.classList.add("recognizing");
    this.updatePracticeDisplay();

    this.statusText.textContent = `Práctica iniciada: "${this.practiceGesture.name}" - Realiza Frame 1`;
  }

  stopPractice() {
    this.isPracticing = false;
    this.practiceGesture = null;
    this.practiceFrameIndex = 0;
    this.practiceBuffer = [];

    // Actualizar UI
    document.getElementById("startPracticeBtn").disabled = false;
    document.getElementById("stopPracticeBtn").disabled = true;
    document.getElementById("practiceGesture").disabled = false;

    this.canvasElement.classList.remove("recognizing", "success-animation");

    // Limpiar display
    document.getElementById("targetFrameNumber").textContent = "-";
    document.getElementById("currentSimilarity").textContent = "0%";
    document.getElementById("similarityBar").style.width = "0%";
    document.getElementById("frameProgress").innerHTML = "";

    this.statusText.textContent = "Práctica detenida";
  }

  updateSimilarityThreshold(event) {
    this.similarityThreshold = parseInt(event.target.value);
    document.getElementById("thresholdValue").textContent =
      this.similarityThreshold + "%";
  }

  processPractice(results) {
    if (
      !results.multiHandLandmarks ||
      results.multiHandLandmarks.length === 0
    ) {
      document.getElementById("currentSimilarity").textContent = "0%";
      document.getElementById("similarityBar").style.width = "0%";
      return;
    }

    if (
      !this.practiceGesture ||
      this.practiceFrameIndex >= this.practiceGesture.frames.length
    ) {
      return;
    }

    // Limitar la frecuencia de verificación para evitar sobrecarga
    const now = Date.now();
    if (now - this.lastSimilarityCheck < 100) return; // Verificar cada 100ms
    this.lastSimilarityCheck = now;

    const currentFrame = {
      landmarks: results.multiHandLandmarks,
      handedness: results.multiHandedness || [],
    };

    const targetFrame = this.practiceGesture.frames[this.practiceFrameIndex];
    const similarity =
      this.calculateFrameSimilarity(currentFrame, targetFrame) * 100;

    this.updateSimilarityDisplay(similarity);

    // Verificar si la similitud es suficiente para avanzar
    if (similarity >= this.similarityThreshold) {
      this.advancePracticeFrame();
    }
  }

  advancePracticeFrame() {
    this.practiceFrameIndex++;

    // Feedback visual de éxito
    this.canvasElement.classList.add("success-animation");
    setTimeout(() => {
      this.canvasElement.classList.remove("success-animation");
    }, 1000);

    if (this.practiceFrameIndex >= this.practiceGesture.frames.length) {
      // ¡Práctica completada!
      this.completePractice();
    } else {
      // Continuar con el siguiente frame
      this.updatePracticeDisplay();
      this.statusText.textContent = `Frame ${
        this.practiceFrameIndex
      } completado - Realiza Frame ${this.practiceFrameIndex + 1}`;
    }
  }

  completePractice() {
    this.statusText.textContent = `¡Excelente! Práctica completada para "${this.practiceGesture.name}"`;

    // Mostrar animación de éxito prolongada
    this.canvasElement.classList.add("success-animation");

    setTimeout(() => {
      this.stopPractice();
    }, 3000);
  }

  updatePracticeDisplay() {
    if (!this.practiceGesture) return;

    const targetFrameNum = this.practiceFrameIndex + 1;
    const totalFrames = this.practiceGesture.frames.length;

    document.getElementById(
      "targetFrameNumber"
    ).textContent = `${targetFrameNum} de ${totalFrames}`;

    // Crear indicadores de progreso visual
    const frameProgress = document.getElementById("frameProgress");
    frameProgress.innerHTML = "";

    for (let i = 0; i < totalFrames; i++) {
      const dot = document.createElement("div");
      dot.className = "frame-dot";

      if (i < this.practiceFrameIndex) {
        dot.classList.add("completed");
      } else if (i === this.practiceFrameIndex) {
        dot.classList.add("current");
      }

      frameProgress.appendChild(dot);
    }
  }

  updateSimilarityDisplay(similarity) {
    document.getElementById("currentSimilarity").textContent =
      Math.round(similarity) + "%";

    const similarityBar = document.getElementById("similarityBar");
    similarityBar.style.width = similarity + "%";

    // Cambiar color según similitud
    if (similarity >= this.similarityThreshold) {
      similarityBar.style.background = "#28a745";
    } else if (similarity >= 60) {
      similarityBar.style.background = "#ffc107";
    } else {
      similarityBar.style.background = "#dc3545";
    }
  }

  updatePracticeGestureList() {
    const select = document.getElementById("practiceGesture");
    select.innerHTML = '<option value="">-- Selecciona un gesto --</option>';

    this.savedGestures.forEach((gesture) => {
      const option = document.createElement("option");
      option.value = gesture.id;
      option.textContent = `${gesture.name} (${gesture.frameCount} frames)`;
      select.appendChild(option);
    });
  }

  captureFrame() {
    if (!this.lastResults || !this.lastResults.multiHandLandmarks) {
      alert("No se detectan manos. Asegúrate de que tu mano esté visible.");
      return;
    }

    if (!this.isRecordingSequence) {
      alert("Primero debes iniciar una secuencia.");
      return;
    }

    const gestureName = this.gestureNameInput.value.trim();

    // Capturar frame actual
    const frame = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      landmarks: this.lastResults.multiHandLandmarks,
      handedness: this.lastResults.multiHandedness || [],
      gestureName: gestureName,
      frameIndex: this.currentFrameIndex,
    };

    this.currentFrames.push(frame);
    this.currentFrameIndex++;

    // Feedback visual
    this.canvasElement.classList.add("recording");
    setTimeout(() => {
      this.canvasElement.classList.remove("recording");
    }, 300);

    this.updateSequenceStatus();

    if (this.currentFrameIndex >= this.maxFramesPerGesture) {
      this.statusText.textContent = `Frame ${this.currentFrameIndex} capturado - Secuencia completa, presiona "Finalizar"`;
      document.getElementById("captureBtn").disabled = true;
    } else {
      this.statusText.textContent = `Frame ${
        this.currentFrameIndex
      } capturado - Listo para Frame ${this.currentFrameIndex + 1}`;
    }
  }

  clearCurrentFrames() {
    this.resetSequenceState();
    this.updateDisplay();
    this.statusText.textContent = "Frames limpiados";
  }

  deleteGesture(gestureId) {
    this.savedGestures = this.savedGestures.filter((g) => g.id !== gestureId);
    this.saveSavedGestures();
    this.updateDisplay();
    this.updatePracticeGestureList();
    this.statusText.textContent = "Gesto eliminado";
  }

  clearAllGestures() {
    if (confirm("¿Estás seguro de que quieres eliminar todos los gestos?")) {
      this.savedGestures = [];
      this.currentFrames = [];
      this.resetSequenceState();
      this.saveSavedGestures();
      this.updateDisplay();
      this.updatePracticeGestureList();
      this.statusText.textContent = "Todos los gestos eliminados";
    }
  }

  // === FUNCIONES DE MODO ===
  switchMode(mode) {
    this.currentMode = mode;

    // Detener cualquier proceso activo
    this.stopRecognition();
    this.stopPractice();
    this.resetSequenceState();

    // Actualizar botones de modo
    document
      .querySelectorAll(".mode-btn")
      .forEach((btn) => btn.classList.remove("active"));
    document
      .querySelectorAll(".mode-content")
      .forEach((content) => content.classList.remove("active"));

    // Activar modo seleccionado
    document.getElementById(mode + "Mode").classList.add("active");
    document.getElementById(mode + "ModeContent").classList.add("active");

    // Mostrar/ocultar elementos según el modo
    if (mode === "capture") {
      document.getElementById("captureInfo").style.display = "block";
      document.getElementById("gestureListSection").style.display = "block";
      document.getElementById("recognitionResults").classList.remove("active");
      this.statusText.textContent =
        "Modo registro activado - Captura gestos secuenciales";
    } else if (mode === "practice") {
      document.getElementById("captureInfo").style.display = "none";
      document.getElementById("gestureListSection").style.display = "none";
      document.getElementById("recognitionResults").classList.remove("active");
      this.updatePracticeGestureList();

      if (this.savedGestures.length === 0) {
        this.statusText.textContent = "No hay gestos guardados para practicar";
      } else {
        this.statusText.textContent =
          "Modo práctica activado - Selecciona un gesto para practicar";
      }
    } else if (mode === "recognize") {
      document.getElementById("captureInfo").style.display = "none";
      document.getElementById("gestureListSection").style.display = "none";
      document.getElementById("recognitionResults").classList.add("active");
      this.statusText.textContent = "Modo reconocimiento activado";

      if (this.savedGestures.length === 0) {
        this.statusText.textContent = "No hay gestos guardados para reconocer";
      }
    }
  }

  // === FUNCIONES DE RECONOCIMIENTO ===
  startRecognition() {
    if (this.savedGestures.length === 0) {
      alert(
        "No hay gestos guardados para reconocer. Cambia al modo captura y graba algunos gestos primero."
      );
      return;
    }

    this.isRecognizing = true;
    this.recognitionBuffer = [];

    // Actualizar UI
    this.canvasElement.classList.add("recognizing");
    document.getElementById("startRecognitionBtn").disabled = true;
    document.getElementById("stopRecognitionBtn").disabled = false;
    this.statusText.textContent = "Reconociendo gestos... Realiza un gesto";

    // Limpiar resultados anteriores
    this.updateRecognitionDisplay("---", 0);
  }

  stopRecognition() {
    this.isRecognizing = false;
    this.recognitionBuffer = [];

    // Actualizar UI
    this.canvasElement.classList.remove("recognizing");
    document.getElementById("startRecognitionBtn").disabled = false;
    document.getElementById("stopRecognitionBtn").disabled = true;
    this.statusText.textContent = "Reconocimiento detenido";

    // Limpiar resultados
    this.updateRecognitionDisplay("---", 0);
  }

  updateTolerance(event) {
    this.recognitionTolerance = parseFloat(event.target.value);
    document.getElementById("toleranceValue").textContent =
      Math.round(this.recognitionTolerance * 100) + "%";
  }

  processRecognition(results) {
    if (
      !results.multiHandLandmarks ||
      results.multiHandLandmarks.length === 0
    ) {
      return;
    }

    // Crear frame actual para comparación
    const currentFrame = {
      landmarks: results.multiHandLandmarks,
      handedness: results.multiHandedness || [],
      timestamp: Date.now(),
    };

    // Agregar al buffer de reconocimiento
    this.recognitionBuffer.push(currentFrame);
    if (this.recognitionBuffer.length > this.maxBufferSize) {
      this.recognitionBuffer.shift();
    }

    // Procesar reconocimiento solo si tenemos suficientes frames
    if (this.recognitionBuffer.length >= 3) {
      this.performGestureRecognition(currentFrame);
    }
  }

  performGestureRecognition(currentFrame) {
    let bestMatch = null;
    let bestScore = 0;

    // Comparar con todos los gestos guardados
    for (const gesture of this.savedGestures) {
      const score = this.compareWithGesture(currentFrame, gesture);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = gesture;
      }
    }

    // Aplicar tolerancia
    if (bestMatch && bestScore >= this.recognitionTolerance) {
      this.updateRecognitionDisplay(bestMatch.name, bestScore * 100);
    } else {
      this.updateRecognitionDisplay("No reconocido", bestScore * 100);
    }
  }

  compareWithGesture(currentFrame, gesture) {
    let maxSimilarity = 0;

    // Comparar con cada frame del gesto guardado
    for (const storedFrame of gesture.frames) {
      const similarity = this.calculateFrameSimilarity(
        currentFrame,
        storedFrame
      );
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }

    return maxSimilarity;
  }

  calculateFrameSimilarity(frame1, frame2) {
    if (
      !frame1.landmarks ||
      !frame2.landmarks ||
      frame1.landmarks.length === 0 ||
      frame2.landmarks.length === 0
    ) {
      return 0;
    }

    const landmarks1 = frame1.landmarks[0]; // Primera mano
    const landmarks2 = frame2.landmarks[0]; // Primera mano

    if (!landmarks1 || !landmarks2 || landmarks1.length !== landmarks2.length) {
      return 0;
    }

    // Calcular distancia euclidiana normalizada
    let totalDistance = 0;
    let validPoints = 0;

    for (let i = 0; i < landmarks1.length; i++) {
      const p1 = landmarks1[i];
      const p2 = landmarks2[i];

      if (p1 && p2) {
        const distance = Math.sqrt(
          Math.pow(p1.x - p2.x, 2) +
            Math.pow(p1.y - p2.y, 2) +
            Math.pow((p1.z || 0) - (p2.z || 0), 2)
        );
        totalDistance += distance;
        validPoints++;
      }
    }

    if (validPoints === 0) return 0;

    // Convertir distancia a similitud (0-1)
    const avgDistance = totalDistance / validPoints;
    const similarity = Math.max(0, 1 - avgDistance * 3); // Factor de escala ajustable

    return similarity;
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

  updateDisplay() {
    // Actualizar contador de frames
    this.frameCountSpan.textContent = this.currentFrames.length;

    // Habilitar/deshabilitar botón de finalizar secuencia
    if (document.getElementById("finishSequenceBtn")) {
      document.getElementById("finishSequenceBtn").disabled =
        this.currentFrames.length === 0 || !this.isRecordingSequence;
    }

    // Actualizar lista de frames actuales
    const currentFramesDiv = document.getElementById("currentFrames");
    if (this.currentFrames.length === 0) {
      currentFramesDiv.innerHTML = "No hay frames capturados";
    } else {
      currentFramesDiv.innerHTML = this.currentFrames
        .map(
          (frame, index) =>
            `<div class="gesture-item">
                            <span>Frame ${index + 1}</span>
                            <span class="frame-info">${new Date(
                              frame.timestamp
                            ).toLocaleTimeString()}</span>
                        </div>`
        )
        .join("");
    }

    // Actualizar lista de gestos guardados
    const savedGesturesDiv = document.getElementById("savedGestures");
    if (this.savedGestures.length === 0) {
      savedGesturesDiv.innerHTML = "No hay gestos guardados";
    } else {
      savedGesturesDiv.innerHTML = this.savedGestures
        .map(
          (gesture) =>
            `<div class="gesture-item">
                            <div>
                                <span class="gesture-name">${
                                  gesture.name
                                }</span>
                                <div class="frame-info">
                                    ${gesture.frameCount} frames${
              gesture.isSequential ? " (secuencial)" : ""
            } - 
                                    ${new Date(
                                      gesture.createdAt
                                    ).toLocaleDateString()}
                                </div>
                            </div>
                            <button class="delete-btn" onclick="gestureSystem.deleteGesture(${
                              gesture.id
                            })">Eliminar</button>
                        </div>`
        )
        .join("");
    }
  }

  exportDataset() {
    if (this.savedGestures.length === 0) {
      alert("No hay gestos para exportar.");
      return;
    }

    const dataset = {
      version: "1.0",
      createdAt: new Date().toISOString(),
      totalGestures: this.savedGestures.length,
      totalFrames: this.savedGestures.reduce((sum, g) => sum + g.frameCount, 0),
      gestures: this.savedGestures,
    };

    const blob = new Blob([JSON.stringify(dataset, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gestos_dataset_${
      new Date().toISOString().split("T")[0]
    }.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.statusText.textContent = "Dataset exportado";
  }

  importDataset(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        // Validar estructura del dataset
        if (data.gestures && Array.isArray(data.gestures)) {
          // Preguntar si quiere reemplazar o agregar
          const replace = confirm(
            "¿Quieres reemplazar los gestos actuales? (Cancelar para agregar al dataset existente)"
          );

          if (replace) {
            this.savedGestures = data.gestures;
          } else {
            // Agregar gestos nuevos, evitando duplicados por nombre
            data.gestures.forEach((newGesture) => {
              const existingIndex = this.savedGestures.findIndex(
                (g) => g.name === newGesture.name
              );
              if (existingIndex !== -1) {
                // Reemplazar gesto existente
                this.savedGestures[existingIndex] = newGesture;
              } else {
                // Agregar nuevo gesto
                this.savedGestures.push(newGesture);
              }
            });
          }

          this.saveSavedGestures();
          this.updateDisplay();
          this.statusText.textContent = `Dataset importado: ${data.gestures.length} gestos cargados`;
        } else {
          alert(
            "Formato de archivo inválido. El archivo debe contener un dataset de gestos válido."
          );
        }
      } catch (error) {
        alert(
          "Error al leer el archivo. Asegúrate de que sea un archivo JSON válido."
        );
        console.error("Error importing dataset:", error);
      }
    };
    reader.readAsText(file);

    // Limpiar input para permitir importar el mismo archivo nuevamente
    event.target.value = "";
  }

  loadSavedGestures() {
    const saved = localStorage.getItem("savedGestures");
    return saved ? JSON.parse(saved) : [];
  }

  saveSavedGestures() {
    localStorage.setItem("savedGestures", JSON.stringify(this.savedGestures));
  }
}

// Inicializar sistema
let gestureSystem;
document.addEventListener("DOMContentLoaded", () => {
  gestureSystem = new GestureCaptureSystem();
});
