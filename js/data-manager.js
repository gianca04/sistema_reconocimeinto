// === FUNCIONES DE EXPORTACIÓN E IMPORTACIÓN ===

class DataManager {
  constructor(gestureSystem) {
    this.gestureSystem = gestureSystem;
  }

  exportDataset() {
    if (this.gestureSystem.savedGestures.length === 0) {
      alert("No hay gestos para exportar.");
      return;
    }

    const dataset = {
      version: "1.0",
      createdAt: new Date().toISOString(),
      totalGestures: this.gestureSystem.savedGestures.length,
      totalFrames: this.gestureSystem.savedGestures.reduce((sum, g) => sum + g.frameCount, 0),
      gestures: this.gestureSystem.savedGestures,
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

    this.gestureSystem.statusText.textContent = "Dataset exportado";
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
            this.gestureSystem.savedGestures = data.gestures;
          } else {
            // Agregar gestos nuevos, evitando duplicados por nombre
            data.gestures.forEach((newGesture) => {
              const existingIndex = this.gestureSystem.savedGestures.findIndex(
                (g) => g.name === newGesture.name
              );
              if (existingIndex !== -1) {
                // Reemplazar gesto existente
                this.gestureSystem.savedGestures[existingIndex] = newGesture;
              } else {
                // Agregar nuevo gesto
                this.gestureSystem.savedGestures.push(newGesture);
              }
            });
          }

          this.saveSavedGestures();
          this.gestureSystem.uiManager.updateDisplay();
          this.gestureSystem.statusText.textContent = `Dataset importado: ${data.gestures.length} gestos cargados`;
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
    localStorage.setItem("savedGestures", JSON.stringify(this.gestureSystem.savedGestures));
  }
}
