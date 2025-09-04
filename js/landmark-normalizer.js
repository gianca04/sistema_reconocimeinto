// === FUNCIONES DE NORMALIZACIÓN DE LANDMARKS ===

class LandmarkNormalizer {
  
  calcularCentroide(landmarks) {
    let cx = 0, cy = 0;
    for (const lm of landmarks) {
      cx += lm.x;
      cy += lm.y;
    }
    return { x: cx / landmarks.length, y: cy / landmarks.length };
  }

  normalizarLandmarks(landmarks) {
    // Paso 1: Calcular centroide
    const centroide = this.calcularCentroide(landmarks);
    
    // Paso 2: Trasladar landmarks al centro (restar centroide)
    const landmarksTransladados = landmarks.map(lm => ({
      x: lm.x - centroide.x,
      y: lm.y - centroide.y,
      z: lm.z || 0 // Mantener z si existe
    }));
    
    // Paso 3: Calcular la distancia máxima desde el centro
    let maxDist = 0;
    for (const lm of landmarksTransladados) {
      const dist = Math.sqrt(lm.x * lm.x + lm.y * lm.y);
      if (dist > maxDist) maxDist = dist;
    }
    
    // Evitar división por cero
    if (maxDist === 0) return landmarksTransladados;
    
    // Paso 4: Escalar landmarks para normalizar el tamaño
    const landmarksNormalizados = landmarksTransladados.map(lm => ({
      x: lm.x / maxDist,
      y: lm.y / maxDist,
      z: lm.z || 0
    }));
    
    return landmarksNormalizados;
  }

  processarFrameParaCaptura(results) {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      return null;
    }

    const landmarks = results.multiHandLandmarks[0]; // Primera mano detectada
    const landmarksNormalizados = this.normalizarLandmarks(landmarks);
    
    return {
      landmarks: results.multiHandLandmarks, // Mantener originales para visualización
      landmarksNormalizados: landmarksNormalizados, // Landmarks procesados para comparación
      handedness: results.multiHandedness || []
    };
  }

  calculateFrameSimilarity(frame1, frame2) {
    // Usar landmarks normalizados si están disponibles, sino normalizar sobre la marcha
    let landmarks1, landmarks2;
    
    if (frame1.landmarksNormalizados) {
      landmarks1 = frame1.landmarksNormalizados;
    } else if (frame1.landmarks && frame1.landmarks.length > 0) {
      landmarks1 = this.normalizarLandmarks(frame1.landmarks[0]);
    } else {
      return 0;
    }
    
    if (frame2.landmarksNormalizados) {
      landmarks2 = frame2.landmarksNormalizados;
    } else if (frame2.landmarks && frame2.landmarks.length > 0) {
      landmarks2 = this.normalizarLandmarks(frame2.landmarks[0]);
    } else {
      return 0;
    }

    if (!landmarks1 || !landmarks2 || landmarks1.length !== landmarks2.length) {
      return 0;
    }

    // Calcular distancia euclidiana entre landmarks normalizados
    let totalDistance = 0;
    let validPoints = 0;

    for (let i = 0; i < landmarks1.length; i++) {
      const lm1 = landmarks1[i];
      const lm2 = landmarks2[i];

      if (lm1 && lm2) {
        const dx = lm1.x - lm2.x;
        const dy = lm1.y - lm2.y;
        const dz = (lm1.z || 0) - (lm2.z || 0);
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        totalDistance += distance;
        validPoints++;
      }
    }

    if (validPoints === 0) return 0;

    // Convertir distancia a similitud (0-1)
    // Con landmarks normalizados, las distancias son más consistentes
    const avgDistance = totalDistance / validPoints;
    const similarity = Math.max(0, 1 - avgDistance * 1.5); // Factor ajustado para landmarks normalizados

    return similarity;
  }
}
