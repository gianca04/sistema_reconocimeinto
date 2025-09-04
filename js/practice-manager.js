// === FUNCIONES DE PRÁCTICA SECUENCIAL ===

class PracticeManager {
  constructor(gestureSystem) {
    this.gestureSystem = gestureSystem;
  }

  startPractice() {
    const selectedGestureId = document.getElementById("practiceGesture").value;
    if (!selectedGestureId) {
      alert("Por favor selecciona un gesto para practicar.");
      return;
    }

    this.gestureSystem.practiceGesture = this.gestureSystem.savedGestures.find(
      (g) => g.id == selectedGestureId
    );
    if (!this.gestureSystem.practiceGesture) {
      alert("Gesto no encontrado.");
      return;
    }

    this.gestureSystem.isPracticing = true;
    this.gestureSystem.practiceFrameIndex = 0;
    this.gestureSystem.practiceBuffer = [];

    // Actualizar UI
    document.getElementById("startPracticeBtn").disabled = true;
    document.getElementById("stopPracticeBtn").disabled = false;
    document.getElementById("practiceGesture").disabled = true;

    this.gestureSystem.canvasElement.classList.add("recognizing");
    this.updatePracticeDisplay();

    this.gestureSystem.statusText.textContent = `Práctica iniciada: "${this.gestureSystem.practiceGesture.name}" - Realiza Frame 1`;
  }

  stopPractice() {
    this.gestureSystem.isPracticing = false;
    this.gestureSystem.practiceGesture = null;
    this.gestureSystem.practiceFrameIndex = 0;
    this.gestureSystem.practiceBuffer = [];

    // Actualizar UI
    document.getElementById("startPracticeBtn").disabled = false;
    document.getElementById("stopPracticeBtn").disabled = true;
    document.getElementById("practiceGesture").disabled = false;

    this.gestureSystem.canvasElement.classList.remove("recognizing", "success-animation");

    // Limpiar display
    document.getElementById("targetFrameNumber").textContent = "-";
    document.getElementById("currentSimilarity").textContent = "0%";
    document.getElementById("similarityBar").style.width = "0%";
    document.getElementById("frameProgress").innerHTML = "";

    // Ocultar opciones de completación si están visibles
    this.hideCompletionOptions();

    this.gestureSystem.statusText.textContent = "Práctica detenida";
  }

  updateSimilarityThreshold(event) {
    this.gestureSystem.similarityThreshold = parseInt(event.target.value);
    document.getElementById("thresholdValue").textContent =
      this.gestureSystem.similarityThreshold + "%";
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
      !this.gestureSystem.practiceGesture ||
      this.gestureSystem.practiceFrameIndex >= this.gestureSystem.practiceGesture.frames.length
    ) {
      return;
    }

    // Limitar la frecuencia de verificación para evitar sobrecarga
    const now = Date.now();
    if (now - this.gestureSystem.lastSimilarityCheck < 100) return; // Verificar cada 100ms
    this.gestureSystem.lastSimilarityCheck = now;

    // Procesar frame actual con normalización
    const frameData = this.gestureSystem.landmarkNormalizer.processarFrameParaCaptura(results);
    if (!frameData) return;

    const currentFrame = {
      landmarks: frameData.landmarks,
      landmarksNormalizados: frameData.landmarksNormalizados,
      handedness: frameData.handedness,
    };

    const targetFrame = this.gestureSystem.practiceGesture.frames[this.gestureSystem.practiceFrameIndex];
    const similarity =
      this.gestureSystem.landmarkNormalizer.calculateFrameSimilarity(currentFrame, targetFrame) * 100;

    this.updateSimilarityDisplay(similarity);

    // Verificar si la similitud es suficiente para avanzar
    if (similarity >= this.gestureSystem.similarityThreshold) {
      this.advancePracticeFrame();
    }
  }

  advancePracticeFrame() {
    this.gestureSystem.practiceFrameIndex++;

    // Feedback visual de éxito
    this.gestureSystem.canvasElement.classList.add("success-animation");
    setTimeout(() => {
      this.gestureSystem.canvasElement.classList.remove("success-animation");
    }, 1000);

    if (this.gestureSystem.practiceFrameIndex >= this.gestureSystem.practiceGesture.frames.length) {
      // ¡Práctica completada!
      this.completePractice();
    } else {
      // Continuar con el siguiente frame
      this.updatePracticeDisplay();
      this.gestureSystem.statusText.textContent = `Frame ${
        this.gestureSystem.practiceFrameIndex
      } completado - Realiza Frame ${this.gestureSystem.practiceFrameIndex + 1}`;
    }
  }

  completePractice() {
    // Mostrar mensaje de felicitaciones personalizado
    this.gestureSystem.statusText.textContent = `🎉 ¡Excelente! Práctica completada para "${this.gestureSystem.practiceGesture.name}"`;

    // Mostrar animación de éxito prolongada
    this.gestureSystem.canvasElement.classList.add("success-animation");

    // Verificar si hay más gestos para practicar
    const currentGestureIndex = this.gestureSystem.savedGestures.findIndex(
      (g) => g.id === this.gestureSystem.practiceGesture.id
    );
    const nextGesture = this.findNextGestureToPractice(currentGestureIndex);

    // Mostrar opciones de continuar
    this.showCompletionOptions(nextGesture);

    setTimeout(() => {
      this.stopPractice();
    }, 5000); // Aumentado a 5 segundos para dar tiempo a leer
  }

  findNextGestureToPractice(currentIndex) {
    // Buscar el siguiente gesto en la lista
    for (let i = currentIndex + 1; i < this.gestureSystem.savedGestures.length; i++) {
      return this.gestureSystem.savedGestures[i];
    }
    
    // Si no hay más gestos después, buscar desde el principio (excluyendo el actual)
    for (let i = 0; i < currentIndex; i++) {
      return this.gestureSystem.savedGestures[i];
    }
    
    return null; // No hay otros gestos disponibles
  }

  showCompletionOptions(nextGesture) {
    // Crear o actualizar el contenedor de opciones
    let optionsContainer = document.getElementById("practiceCompletionOptions");
    if (!optionsContainer) {
      optionsContainer = document.createElement("div");
      optionsContainer.id = "practiceCompletionOptions";
      optionsContainer.className = "practice-completion-options";
      
      // Insertar después del contenido de práctica
      const practiceContent = document.getElementById("practiceModeContent");
      practiceContent.appendChild(optionsContainer);
    }

    // Crear contenido del mensaje
    let optionsHTML = `
      <div class="completion-message">
        <div class="celebration-icon">🏆</div>
        <h3>¡Felicitaciones!</h3>
        <p>Has completado exitosamente la práctica del gesto <strong>"${this.gestureSystem.practiceGesture.name}"</strong></p>
        <div class="completion-stats">
          <span class="stat-item">✅ ${this.gestureSystem.practiceGesture.frameCount} frames completados</span>
          <span class="stat-item">⭐ Umbral: ${this.gestureSystem.similarityThreshold}%</span>
        </div>
      </div>
    `;

    if (nextGesture) {
      optionsHTML += `
        <div class="next-gesture-section">
          <h4>¿Quieres continuar practicando?</h4>
          <div class="next-gesture-info">
            <span class="next-gesture-name">Siguiente: "${nextGesture.name}"</span>
            <span class="next-gesture-frames">(${nextGesture.frameCount} frames)</span>
          </div>
          <div class="completion-actions">
            <button id="practiceNextGestureBtn" class="btn btn-primary">
              🚀 Practicar Siguiente Gesto
            </button>
            <button id="finishPracticeSessionBtn" class="btn btn-secondary">
              ✅ Terminar Sesión
            </button>
          </div>
        </div>
      `;
    } else {
      optionsHTML += `
        <div class="session-complete-section">
          <h4>🎯 ¡Sesión de Práctica Completada!</h4>
          <p>Has practicado todos los gestos disponibles. ¡Excelente trabajo!</p>
          <div class="completion-actions">
            <button id="restartPracticeBtn" class="btn btn-primary">
              🔄 Reiniciar Práctica
            </button>
            <button id="finishPracticeSessionBtn" class="btn btn-secondary">
              ✅ Terminar Sesión
            </button>
          </div>
        </div>
      `;
    }

    optionsContainer.innerHTML = optionsHTML;
    optionsContainer.style.display = "block";

    // Agregar event listeners
    this.setupCompletionEventListeners(nextGesture);
  }

  setupCompletionEventListeners(nextGesture) {
    // Botón para practicar siguiente gesto
    const nextGestureBtn = document.getElementById("practiceNextGestureBtn");
    if (nextGestureBtn && nextGesture) {
      nextGestureBtn.onclick = () => {
        this.hideCompletionOptions();
        this.startNextGesture(nextGesture);
      };
    }

    // Botón para reiniciar práctica (cuando no hay más gestos)
    const restartBtn = document.getElementById("restartPracticeBtn");
    if (restartBtn) {
      restartBtn.onclick = () => {
        this.hideCompletionOptions();
        this.startNextGesture(this.gestureSystem.savedGestures[0]);
      };
    }

    // Botón para terminar sesión
    const finishBtn = document.getElementById("finishPracticeSessionBtn");
    if (finishBtn) {
      finishBtn.onclick = () => {
        this.hideCompletionOptions();
        this.gestureSystem.statusText.textContent = "Sesión de práctica finalizada. ¡Buen trabajo!";
      };
    }
  }

  startNextGesture(gesture) {
    // Seleccionar el gesto en el dropdown
    const select = document.getElementById("practiceGesture");
    select.value = gesture.id;

    // Configurar el gesto
    this.gestureSystem.practiceGesture = gesture;
    this.gestureSystem.isPracticing = true;
    this.gestureSystem.practiceFrameIndex = 0;
    this.gestureSystem.practiceBuffer = [];

    // Actualizar UI
    document.getElementById("startPracticeBtn").disabled = true;
    document.getElementById("stopPracticeBtn").disabled = false;
    document.getElementById("practiceGesture").disabled = true;

    this.gestureSystem.canvasElement.classList.add("recognizing");
    this.updatePracticeDisplay();

    this.gestureSystem.statusText.textContent = `Nueva práctica iniciada: "${gesture.name}" - Realiza Frame 1`;
  }

  hideCompletionOptions() {
    const optionsContainer = document.getElementById("practiceCompletionOptions");
    if (optionsContainer) {
      optionsContainer.style.display = "none";
    }
  }

  updatePracticeDisplay() {
    if (!this.gestureSystem.practiceGesture) return;

    const targetFrameNum = this.gestureSystem.practiceFrameIndex + 1;
    const totalFrames = this.gestureSystem.practiceGesture.frames.length;

    document.getElementById(
      "targetFrameNumber"
    ).textContent = `${targetFrameNum} de ${totalFrames}`;

    // Crear indicadores de progreso visual
    const frameProgress = document.getElementById("frameProgress");
    frameProgress.innerHTML = "";

    for (let i = 0; i < totalFrames; i++) {
      const dot = document.createElement("div");
      dot.className = "frame-dot";

      if (i < this.gestureSystem.practiceFrameIndex) {
        dot.classList.add("completed");
      } else if (i === this.gestureSystem.practiceFrameIndex) {
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
    if (similarity >= this.gestureSystem.similarityThreshold) {
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

    this.gestureSystem.savedGestures.forEach((gesture) => {
      const option = document.createElement("option");
      option.value = gesture.id;
      option.textContent = `${gesture.name} (${gesture.frameCount} frames)`;
      select.appendChild(option);
    });
  }
}
