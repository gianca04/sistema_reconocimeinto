# Sistema de Reconocimiento de Gestos - Estructura Modular

## 📁 Estructura de Archivos

```
sistema_reconocimiento/
├── index.html                     # Archivo principal HTML
├── styles.css                     # Estilos CSS
├── script.js                      # ⚠️ ARCHIVO LEGACY (no se usa)
└── js/                            # 📂 Módulos JavaScript organizados
    ├── main.js                    # 🎯 Clase principal y inicialización
    ├── landmark-normalizer.js     # 🔬 Normalización de landmarks
    ├── mediapipe-config.js        # 📹 Configuración de MediaPipe y cámara
    ├── capture-manager.js         # 📸 Gestión de captura de gestos
    ├── practice-manager.js        # 🏃‍♂️ Modo de práctica
    ├── recognition-manager.js     # 🎯 Reconocimiento de gestos
    ├── ui-manager.js             # 🖥️ Gestión de interfaz y modales
    └── data-manager.js           # 💾 Importación/exportación de datos
```

## 🔧 Descripción de Módulos

### 🎯 `main.js` - Clase Principal
- **GestureCaptureSystem**: Clase principal que coordina todos los módulos
- **Inicialización**: Crea instancias de todos los managers
- **Delegación**: Redirige llamadas a los managers correspondientes

### 🔬 `landmark-normalizer.js` - Normalización
- **calcularCentroide()**: Calcula el centro de la mano
- **normalizarLandmarks()**: Normaliza posición y tamaño
- **processarFrameParaCaptura()**: Procesa frames para captura
- **calculateFrameSimilarity()**: Compara gestos normalizados

### 📹 `mediapipe-config.js` - MediaPipe
- **MediaPipeManager**: Configuración de MediaPipe Hands
- **initializeMediaPipe()**: Inicializa cámara y modelo
- **onResults()**: Procesa resultados y dibuja landmarks

### 📸 `capture-manager.js` - Captura
- **CaptureManager**: Gestión de captura secuencial
- **startSequence()**: Inicia secuencia de captura
- **captureFrame()**: Captura frame individual
- **finishSequence()**: Finaliza y guarda gesto

### 🏃‍♂️ `practice-manager.js` - Práctica
- **PracticeManager**: Modo de práctica interactivo
- **startPractice()**: Inicia práctica de gesto
- **processPractice()**: Compara gesto en tiempo real
- **updateSimilarityDisplay()**: Actualiza feedback visual

### 🎯 `recognition-manager.js` - Reconocimiento
- **RecognitionManager**: Reconocimiento de gestos
- **startRecognition()**: Inicia reconocimiento continuo
- **performGestureRecognition()**: Identifica mejor coincidencia
- **compareWithGesture()**: Compara con gestos guardados

### 🖥️ `ui-manager.js` - Interfaz
- **UIManager**: Gestión de interfaz de usuario
- **switchMode()**: Cambia entre modos (captura/práctica/reconocimiento)
- **updateDisplay()**: Actualiza listas y contadores
- **showNormalizationModal()**: Muestra información técnica

### 💾 `data-manager.js` - Datos
- **DataManager**: Gestión de datos y persistencia
- **exportDataset()**: Exporta gestos a JSON
- **importDataset()**: Importa gestos desde JSON
- **saveSavedGestures()**: Guarda en localStorage

## 🚀 Beneficios de la Modularización

### ✅ **Mantenibilidad**
- Cada funcionalidad en su propio archivo
- Fácil localización y modificación de código
- Separación clara de responsabilidades

### ✅ **Escalabilidad**
- Fácil agregar nuevas funcionalidades
- Módulos independientes y reutilizables
- Arquitectura preparada para crecimiento

### ✅ **Legibilidad**
- Código organizado por funcionalidad
- Nombres descriptivos de archivos y clases
- Estructura lógica y predecible

### ✅ **Colaboración**
- Diferentes desarrolladores pueden trabajar en módulos específicos
- Menos conflictos de merge en git
- Revisiones de código más enfocadas

## 🔄 Flujo de Datos

```
index.html
    ↓
main.js (GestureCaptureSystem)
    ↓
mediapipe-config.js (inicialización)
    ↓
landmark-normalizer.js (procesamiento)
    ↓
[capture/practice/recognition]-manager.js (funcionalidad)
    ↓
ui-manager.js (interfaz) + data-manager.js (persistencia)
```

## 📝 Notas Importantes

- **script.js**: El archivo original se mantiene para referencia pero ya no se usa
- **Orden de carga**: Los scripts se cargan en orden específico en index.html
- **Compatibilidad**: Mantiene toda la funcionalidad original
- **Sin cambios**: No se modificó ninguna funcionalidad, solo se reorganizó el código

## 🎯 Próximos Pasos Sugeridos

1. **Testing**: Verificar que todos los módulos funcionan correctamente
2. **Documentación**: Agregar JSDoc a las funciones principales
3. **Optimización**: Considerar lazy loading para módulos grandes
4. **Validación**: Agregar validación de tipos con TypeScript (opcional)
