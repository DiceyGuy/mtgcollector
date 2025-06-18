// Enhanced ImagePreprocessor.js - Specialized preprocessing for challenging MTG cards
// 🎯 Targets: Foils, Old Cards, Borderless, Low Contrast, Specialty treatments

class EnhancedImagePreprocessor {
  constructor() {
    this.debugMode = false; // Set to true for debugging
    
    // Specialized filters for different card types
    this.filters = {
      foil: {
        glareReduction: 0.7,
        reflectionThreshold: 240,
        contrastBoost: 1.3,
        saturationReduction: 0.8
      },
      oldCard: {
        gammaCorrection: 0.8,
        contrastBoost: 1.5,
        brightnessBoost: 1.2,
        noiseReduction: true
      },
      borderless: {
        edgeEnhancement: true,
        adaptiveThreshold: true,
        colorNormalization: true
      },
      specialty: {
        multiPassProcessing: true,
        advancedDenoising: true,
        textIsolation: true
      }
    };
    
    console.log('🎨 Enhanced Image Preprocessor initialized');
  }

  // Main preprocessing entry point
  async preprocessForCardType(imageElement, cardType) {
    console.log(`🔧 Preprocessing for ${cardType.primaryType}...`);
    
    try {
      // Create base canvas
      const canvas = this.createOptimalCanvas(imageElement);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
      
      // Apply type-specific preprocessing
      switch (cardType.primaryType) {
        case 'foil':
        case 'specialty_foil':
          return await this.preprocessFoilCard(canvas, cardType);
        
        case 'old_card':
          return await this.preprocessOldCard(canvas, cardType);
        
        case 'borderless':
          return await this.preprocessBorderlessCard(canvas, cardType);
        
        case 'dark_card':
          return await this.preprocessDarkCard(canvas, cardType);
        
        case 'low_contrast':
          return await this.preprocessLowContrastCard(canvas, cardType);
        
        default:
          return await this.preprocessStandardCard(canvas, cardType);
      }
      
    } catch (error) {
      console.error('❌ Preprocessing failed:', error);
      // Return original as fallback
      const canvas = this.createOptimalCanvas(imageElement);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
      return canvas;
    }
  }

  // Create optimal canvas size
  createOptimalCanvas(imageElement) {
    const canvas = document.createElement('canvas');
    
    // Optimal size for OCR processing
    const maxDimension = 1200;
    const minDimension = 600;
    
    let width = imageElement.width;
    let height = imageElement.height;
    
    // Scale to optimal size
    if (width > maxDimension || height > maxDimension) {
      const scale = maxDimension / Math.max(width, height);
      width *= scale;
      height *= scale;
    }
    
    if (width < minDimension && height < minDimension) {
      const scale = minDimension / Math.min(width, height);
      width *= scale;
      height *= scale;
    }
    
    canvas.width = Math.round(width);
    canvas.height = Math.round(height);
    
    return canvas;
  }

  // Foil card preprocessing - handle reflections and glare
  async preprocessFoilCard(canvas, cardType) {
    console.log('✨ Preprocessing foil card...');
    
    // Step 1: Reduce glare and bright spots
    let processed = await this.reduceGlare(canvas);
    
    // Step 2: Normalize reflections
    processed = await this.normalizeReflections(processed);
    
    // Step 3: Enhance text contrast
    processed = await this.enhanceTextContrast(processed, 'foil');
    
    // Step 4: Apply specialized denoising
    processed = await this.applySpecializedDenoising(processed, 'foil');
    
    if (this.debugMode) {
      console.log('✨ Foil preprocessing complete');
    }
    
    return processed;
  }

  // Old card preprocessing - handle unique layouts and low quality
  async preprocessOldCard(canvas, cardType) {
    console.log('📜 Preprocessing old card...');
    
    // Step 1: Gamma correction for old printing
    let processed = await this.applyGammaCorrection(canvas, this.filters.oldCard.gammaCorrection);
    
    // Step 2: Brightness and contrast adjustment
    processed = await this.adjustBrightnessContrast(processed, 
      this.filters.oldCard.brightnessBoost, 
      this.filters.oldCard.contrastBoost
    );
    
    // Step 3: Handle white-on-black text if detected
    if (cardType.isDark) {
      processed = await this.handleWhiteOnBlackText(processed);
    }
    
    // Step 4: Noise reduction for old printing
    processed = await this.oldCardDenoising(processed);
    
    return processed;
  }

  // Borderless card preprocessing - adaptive zone detection
  async preprocessBorderlessCard(canvas, cardType) {
    console.log('🎨 Preprocessing borderless card...');
    
    // Step 1: Edge enhancement for better zone detection
    let processed = await this.enhanceEdges(canvas);
    
    // Step 2: Color normalization
    processed = await this.normalizeColors(processed);
    
    // Step 3: Adaptive contrast enhancement
    processed = await this.adaptiveContrastEnhancement(processed);
    
    return processed;
  }

  // Dark card preprocessing
  async preprocessDarkCard(canvas, cardType) {
    console.log('🌙 Preprocessing dark card...');
    
    // Step 1: Gamma correction for dark images
    let processed = await this.applyGammaCorrection(canvas, 0.6);
    
    // Step 2: Brightness boost
    processed = await this.adjustBrightnessContrast(processed, 1.4, 1.3);
    
    // Step 3: Shadow detail enhancement
    processed = await this.enhanceShadowDetails(processed);
    
    return processed;
  }

  // Low contrast preprocessing
  async preprocessLowContrastCard(canvas, cardType) {
    console.log('📊 Preprocessing low contrast card...');
    
    // Step 1: Histogram equalization
    let processed = await this.applyHistogramEqualization(canvas);
    
    // Step 2: CLAHE (Contrast Limited Adaptive Histogram Equalization)
    processed = await this.applyCLAHE(processed);
    
    // Step 3: Text-specific enhancement
    processed = await this.enhanceTextContrast(processed, 'low_contrast');
    
    return processed;
  }

  // Standard card preprocessing
  async preprocessStandardCard(canvas, cardType) {
    console.log('📋 Preprocessing standard card...');
    
    // Step 1: Basic contrast enhancement
    let processed = await this.adjustBrightnessContrast(canvas, 1.1, 1.2);
    
    // Step 2: Sharpening
    processed = await this.applySharpen(processed);
    
    // Step 3: Basic denoising
    processed = await this.applyBasicDenoising(processed);
    
    return processed;
  }

  // Glare reduction for foil cards
  async reduceGlare(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    const threshold = this.filters.foil.reflectionThreshold;
    const reduction = this.filters.foil.glareReduction;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Detect bright spots (glare)
      if (r > threshold && g > threshold && b > threshold) {
        // Reduce brightness of glare spots
        data[i] = Math.min(255, r * reduction + 50);
        data[i + 1] = Math.min(255, g * reduction + 50);
        data[i + 2] = Math.min(255, b * reduction + 50);
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  // Normalize reflections for foil cards
  async normalizeReflections(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Calculate average brightness
    let totalBrightness = 0;
    const pixelCount = data.length / 4;
    
    for (let i = 0; i < data.length; i += 4) {
      totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    
    const avgBrightness = totalBrightness / pixelCount;
    
    // Normalize based on average
    for (let i = 0; i < data.length; i += 4) {
      const currentBrightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      
      if (currentBrightness > avgBrightness * 1.5) {
        // Tone down bright areas
        const factor = 0.8;
        data[i] = Math.min(255, data[i] * factor);
        data[i + 1] = Math.min(255, data[i + 1] * factor);
        data[i + 2] = Math.min(255, data[i + 2] * factor);
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  // Gamma correction
  async applyGammaCorrection(canvas, gamma) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Create gamma lookup table
    const gammaTable = new Array(256);
    for (let i = 0; i < 256; i++) {
      gammaTable[i] = Math.min(255, Math.pow(i / 255, gamma) * 255);
    }
    
    // Apply gamma correction
    for (let i = 0; i < data.length; i += 4) {
      data[i] = gammaTable[data[i]];       // Red
      data[i + 1] = gammaTable[data[i + 1]]; // Green
      data[i + 2] = gammaTable[data[i + 2]]; // Blue
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  // Brightness and contrast adjustment
  async adjustBrightnessContrast(canvas, brightness, contrast) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      // Apply contrast then brightness
      data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrast + 128 + brightness));
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrast + 128 + brightness));
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrast + 128 + brightness));
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  // Handle white-on-black text (invert if needed)
  async handleWhiteOnBlackText(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Check if image is predominantly dark
    let darkPixels = 0;
    const pixelCount = data.length / 4;
    
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (brightness < 128) darkPixels++;
    }
    
    // If more than 60% dark pixels, invert the image
    if (darkPixels / pixelCount > 0.6) {
      console.log('🔄 Inverting white-on-black text');
      
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];       // Invert red
        data[i + 1] = 255 - data[i + 1]; // Invert green
        data[i + 2] = 255 - data[i + 2]; // Invert blue
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  // Enhanced text contrast
  async enhanceTextContrast(canvas, cardType) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Convert to grayscale and enhance
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      
      let enhanced;
      if (cardType === 'foil') {
        // Sigmoid curve for foil cards
        enhanced = 255 / (1 + Math.exp(-((gray - 127) / 30)));
      } else if (cardType === 'low_contrast') {
        // Stronger enhancement for low contrast
        enhanced = 255 / (1 + Math.exp(-((gray - 127) / 20)));
      } else {
        // Standard enhancement
        enhanced = 255 / (1 + Math.exp(-((gray - 127) / 25)));
      }
      
      data[i] = enhanced;
      data[i + 1] = enhanced;
      data[i + 2] = enhanced;
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  // Specialized denoising
  async applySpecializedDenoising(canvas, cardType) {
    if (cardType === 'foil') {
      return await this.medianFilter(canvas, 3);
    } else {
      return await this.gaussianBlur(canvas, 0.5);
    }
  }

  // Old card specific denoising
  async oldCardDenoising(canvas) {
    // Apply bilateral filter to preserve edges while reducing noise
    return await this.bilateralFilter(canvas);
  }

  // Edge enhancement
  async enhanceEdges(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    
    const output = new Uint8ClampedArray(data.length);
    
    // Sobel edge detection kernel
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pos = ((y + ky) * width + (x + kx)) * 4;
            const gray = (data[pos] + data[pos + 1] + data[pos + 2]) / 3;
            const kernelIndex = (ky + 1) * 3 + (kx + 1);
            
            gx += gray * sobelX[kernelIndex];
            gy += gray * sobelY[kernelIndex];
          }
        }
        
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        const pos = (y * width + x) * 4;
        
        // Enhance edges
        const enhanced = Math.min(255, data[pos] + magnitude * 0.3);
        output[pos] = enhanced;
        output[pos + 1] = enhanced;
        output[pos + 2] = enhanced;
        output[pos + 3] = data[pos + 3];
      }
    }
    
    const outputImageData = new ImageData(output, width, height);
    ctx.putImageData(outputImageData, 0, 0);
    
    return canvas;
  }

  // Histogram equalization
  async applyHistogramEqualization(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Calculate histogram
    const histogram = new Array(256).fill(0);
    const pixelCount = data.length / 4;
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      histogram[gray]++;
    }
    
    // Calculate cumulative distribution
    const cdf = new Array(256);
    cdf[0] = histogram[0];
    for (let i = 1; i < 256; i++) {
      cdf[i] = cdf[i - 1] + histogram[i];
    }
    
    // Normalize CDF
    for (let i = 0; i < 256; i++) {
      cdf[i] = Math.round((cdf[i] / pixelCount) * 255);
    }
    
    // Apply equalization
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      const enhanced = cdf[gray];
      
      data[i] = enhanced;
      data[i + 1] = enhanced;
      data[i + 2] = enhanced;
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  // CLAHE implementation (simplified)
  async applyCLAHE(canvas) {
    // For now, use enhanced local contrast
    return await this.adaptiveContrastEnhancement(canvas);
  }

  // Adaptive contrast enhancement
  async adaptiveContrastEnhancement(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    
    const tileSize = 64; // Size of local regions
    
    for (let ty = 0; ty < height; ty += tileSize) {
      for (let tx = 0; tx < width; tx += tileSize) {
        const tileWidth = Math.min(tileSize, width - tx);
        const tileHeight = Math.min(tileSize, height - ty);
        
        // Calculate local statistics
        let sum = 0, count = 0;
        for (let y = ty; y < ty + tileHeight; y++) {
          for (let x = tx; x < tx + tileWidth; x++) {
            const pos = (y * width + x) * 4;
            const gray = (data[pos] + data[pos + 1] + data[pos + 2]) / 3;
            sum += gray;
            count++;
          }
        }
        
        const localMean = sum / count;
        const contrastFactor = localMean < 128 ? 1.3 : 1.1;
        
        // Apply local contrast enhancement
        for (let y = ty; y < ty + tileHeight; y++) {
          for (let x = tx; x < tx + tileWidth; x++) {
            const pos = (y * width + x) * 4;
            
            for (let c = 0; c < 3; c++) {
              const value = data[pos + c];
              const enhanced = ((value - localMean) * contrastFactor) + localMean;
              data[pos + c] = Math.min(255, Math.max(0, enhanced));
            }
          }
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  // Utility filters
  async medianFilter(canvas, radius) {
    // Simplified median filter
    return await this.gaussianBlur(canvas, radius * 0.5);
  }

  async gaussianBlur(canvas, radius) {
    const ctx = canvas.getContext('2d');
    ctx.filter = `blur(${radius}px)`;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCtx.drawImage(canvas, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.filter = 'none';
    
    return canvas;
  }

  async bilateralFilter(canvas) {
    // Simplified bilateral filter using multiple passes
    let result = canvas;
    for (let i = 0; i < 3; i++) {
      result = await this.gaussianBlur(result, 0.5);
    }
    return result;
  }

  async applySharpen(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    
    const output = new Uint8ClampedArray(data.length);
    
    // Sharpening kernel
    const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const pos = ((y + ky) * width + (x + kx)) * 4 + c;
              sum += data[pos] * kernel[(ky + 1) * 3 + (kx + 1)];
            }
          }
          const pos = (y * width + x) * 4 + c;
          output[pos] = Math.min(255, Math.max(0, sum));
        }
        // Copy alpha
        output[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3];
      }
    }
    
    const outputImageData = new ImageData(output, width, height);
    ctx.putImageData(outputImageData, 0, 0);
    
    return canvas;
  }

  async applyBasicDenoising(canvas) {
    return await this.gaussianBlur(canvas, 0.3);
  }

  async normalizeColors(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Calculate color statistics
    let rSum = 0, gSum = 0, bSum = 0;
    const pixelCount = data.length / 4;
    
    for (let i = 0; i < data.length; i += 4) {
      rSum += data[i];
      gSum += data[i + 1];
      bSum += data[i + 2];
    }
    
    const rAvg = rSum / pixelCount;
    const gAvg = gSum / pixelCount;
    const bAvg = bSum / pixelCount;
    const overallAvg = (rAvg + gAvg + bAvg) / 3;
    
    // Normalize channels
    const rFactor = overallAvg / rAvg;
    const gFactor = overallAvg / gAvg;
    const bFactor = overallAvg / bAvg;
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * rFactor);
      data[i + 1] = Math.min(255, data[i + 1] * gFactor);
      data[i + 2] = Math.min(255, data[i + 2] * bFactor);
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  async enhanceShadowDetails(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      const brightness = (r + g + b) / 3;
      
      // Enhance shadows (dark areas)
      if (brightness < 100) {
        const enhancement = 1.5;
        data[i] = Math.min(255, r * enhancement);
        data[i + 1] = Math.min(255, g * enhancement);
        data[i + 2] = Math.min(255, b * enhancement);
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }
}

export default EnhancedImagePreprocessor;