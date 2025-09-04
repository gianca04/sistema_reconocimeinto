// === CLASE PRINCIPAL DEL SISTEMA ===

class GestureCaptureSystem {
  constructor() {
    this.currentFrames = [];
    this.savedGestures = [];
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

    // Inicializar managers
    this.dataManager = new DataManager(this);
    this.landmarkNormalizer = new LandmarkNormalizer();
    this.captureManager = new CaptureManager(this);
    this.practiceManager = new PracticeManager(this);
    this.recognitionManager = new RecognitionManager(this);
    this.uiManager = new UIManager(this);
    this.mediaPipeManager = new MediaPipeManager(this);

    // Cargar datos guardados
    this.savedGestures = this.dataManager.loadSavedGestures();

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
    await this.mediaPipeManager.initializeMediaPipe();
  }

  onResults(results) {
    this.mediaPipeManager.onResults(results);
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
    
    // Eventos del modal de normalización
    document
      .getElementById("showNormalizationBtn")
      .addEventListener("click", () => this.showNormalizationModal());
    document
      .getElementById("showNormalizationBannerBtn")
      .addEventListener("click", () => this.showNormalizationModal());
    
    // Cerrar modal
    document
      .querySelector(".close")
      .addEventListener("click", () => this.hideNormalizationModal());
    
    // Cerrar modal al hacer clic fuera
    window.addEventListener("click", (event) => {
      const modal = document.getElementById("normalizationModal");
      if (event.target === modal) {
        this.hideNormalizationModal();
      }
    });
  }

  // Delegación a managers
  startSequence() {
    this.captureManager.startSequence();
  }

  captureFrame() {
    this.captureManager.captureFrame();
  }

  finishSequence() {
    this.captureManager.finishSequence();
  }

  clearCurrentFrames() {
    this.captureManager.clearCurrentFrames();
  }

  startPractice() {
    this.practiceManager.startPractice();
  }

  stopPractice() {
    this.practiceManager.stopPractice();
  }

  updateSimilarityThreshold(event) {
    this.practiceManager.updateSimilarityThreshold(event);
  }

  processPractice(results) {
    this.practiceManager.processPractice(results);
  }

  startRecognition() {
    this.recognitionManager.startRecognition();
  }

  stopRecognition() {
    this.recognitionManager.stopRecognition();
  }

  updateTolerance(event) {
    this.recognitionManager.updateTolerance(event);
  }

  processRecognition(results) {
    this.recognitionManager.processRecognition(results);
  }

  switchMode(mode) {
    this.uiManager.switchMode(mode);
  }

  updateDisplay() {
    this.uiManager.updateDisplay();
  }

  clearAllGestures() {
    this.uiManager.clearAllGestures();
  }

  exportDataset() {
    this.dataManager.exportDataset();
  }

  importDataset(event) {
    this.dataManager.importDataset(event);
  }

  saveSavedGestures() {
    this.dataManager.saveSavedGestures();
  }

  showNormalizationModal() {
    this.uiManager.showNormalizationModal();
  }

  hideNormalizationModal() {
    this.uiManager.hideNormalizationModal();
  }
}

// Inicializar sistema
let gestureSystem;
document.addEventListener("DOMContentLoaded", () => {
  gestureSystem = new GestureCaptureSystem();
});
