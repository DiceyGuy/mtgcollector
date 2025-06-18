// FINAL WORKING ClaudeVisionService.js - Replace YOUR ENTIRE FILE with this
// Location: C:\Users\kim-a\Documents\DiceyTeck\MTG Scanner\ClaudeVisionService.js

import Tesseract from 'tesseract.js';

// ✅ SOFTWARE IMAGE CORRECTOR - Fixes overexposed camera
class MTGImageCorrector {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    console.log('🎨 MTG Image Corrector: SOFTWARE EXPOSURE FIX READY');
  }

  // ✅ MAIN FIX: Correct overexposed camera images
  correctOverexposure(sourceCanvas) {
    console.log('🔧 APPLYING SOFTWARE EXPOSURE CORRECTION...');

    // Set canvas size
    this.canvas.width = sourceCanvas.width;
    this.canvas.height = sourceCanvas.height;

    // Draw source
    this.ctx.drawImage(sourceCanvas, 0, 0);

    // Get image data for pixel manipulation
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;

    // AGGRESSIVE CORRECTION for overexposed camera
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Calculate luminance
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      // STEP 1: Reduce brightness significantly  
      let newR = r - 70;  // Heavy brightness reduction
      let newG = g - 70;
      let newB = b - 70;

      // STEP 2: Increase contrast dramatically
      const contrastFactor = 3.0;  // Very high contrast
      newR = contrastFactor * (newR - 128) + 128;
      newG = contrastFactor * (newG - 128) + 128;
      newB = contrastFactor * (newB - 128) + 128;

      // STEP 3: Gamma correction for text visibility
      const gamma = 0.5;  // Dark gamma for bright images
      newR = 255 * Math.pow(Math.max(0, newR / 255), gamma);
      newG = 255 * Math.pow(Math.max(0, newG / 255), gamma);
      newB = 255 * Math.pow(Math.max(0, newB / 255), gamma);

      // STEP 4: Target text areas specifically
      if (luminance > 0.7) {  // Very bright areas (overexposed)
        const reductionFactor = 0.2;  // Reduce to 20% of original
        newR *= reductionFactor;
        newG *= reductionFactor;
        newB *= reductionFactor;
      }

      // STEP 5: Boost dark areas (where text should be)
      if (luminance < 0.3) {
        const boostFactor = 50;
        newR += boostFactor;
        newG += boostFactor;
        newB += boostFactor;
      }

      // Apply corrected values
      data[i] = Math.max(0, Math.min(255, newR));
      data[i + 1] = Math.max(0, Math.min(255, newG));
      data[i + 2] = Math.max(0, Math.min(255, newB));
    }

    // Put corrected data back
    this.ctx.putImageData(imageData, 0, 0);

    console.log('✅ SOFTWARE EXPOSURE CORRECTION APPLIED - IMAGE SHOULD BE MUCH DARKER');
    return this.canvas;
  }
}

class ClaudeVisionService {
    constructor() {
        this.worker = null;
        this.isInitialized = false;
        this.debugMode = true;
        
        // ✅ INITIALIZE SOFTWARE EXPOSURE CORRECTOR
        this.imageCorrector = new MTGImageCorrector();
        
        console.log('🎯 ClaudeVisionService: SOFTWARE EXPOSURE CORRECTION READY');
        
        // MTG card name zone
        this.nameZone = { x: 0.04, y: 0.04, width: 0.70, height: 0.12 };
    }

    async initialize() {
        if (this.isInitialized) return;
        
        console.log('🚀 Initializing OCR with SOFTWARE EXPOSURE CORRECTION...');
        
        try {
            this.worker = await Tesseract.createWorker(['eng'], 1, {
                logger: this.debugMode ? (m) => console.log('📝 Tesseract:', m) : undefined
            });
            
            this.isInitialized = true;
            console.log('✅ OCR with SOFTWARE EXPOSURE CORRECTION ready');
        } catch (error) {
            console.log('❌ Failed to initialize OCR:', error);
            throw error;
        }
    }

    // ✅ MAIN PROCESSING WITH SOFTWARE EXPOSURE CORRECTION
    async processCardImage(imageData, cardType = 'standard') {
        if (!this.isInitialized) {
            await this.initialize();
        }

        console.log(`🎯 PROCESSING WITH SOFTWARE EXPOSURE CORRECTION: ${cardType}`);
        
        try {
            // Load image to canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const img = await this.loadImage(imageData);
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            // ✅ APPLY SOFTWARE EXPOSURE CORRECTION
            console.log('🔧 Applying SOFTWARE exposure correction to fix overexposed camera...');
            const correctedCanvas = this.imageCorrector.correctOverexposure(canvas);

            // Extract card name zone from corrected image
            const nameZoneCanvas = this.extractZone(correctedCanvas, this.nameZone);
            
            console.log(`🔍 Extracted card name zone from SOFTWARE-CORRECTED image`);
            
            // Run OCR on corrected zone
            const ocrResult = await this.performOCR(nameZoneCanvas);
            
            if (ocrResult && ocrResult.confidence > 15) {
                const cardName = this.cleanOCRText(ocrResult.text);
                
                console.log(`🎉 SOFTWARE CORRECTION SUCCESS: "${cardName}" (${ocrResult.confidence}% confidence)`);
                
                return {
                    cardName,
                    confidence: ocrResult.confidence,
                    method: 'software_exposure_corrected',
                    exposureCorrected: true
                };
            } else {
                console.log(`⚠️ Low confidence after software correction: ${ocrResult?.confidence || 0}%`);
                return {
                    cardName: '',
                    confidence: 0,
                    method: 'software_correction_failed',
                    exposureCorrected: true
                };
            }
            
        } catch (error) {
            console.log('❌ Software exposure correction failed:', error);
            throw error;
        }
    }

    async performOCR(canvas) {
        try {
            // Configure for MTG card names
            await this.worker.setParameters({
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 -\',./',
                tessedit_pageseg_mode: '8',
                preserve_interword_spaces: '1'
            });
            
            const imageData = canvas.toDataURL();
            const result = await this.worker.recognize(imageData);
            
            return {
                text: result.data.text,
                confidence: result.data.confidence
            };
            
        } catch (error) {
            console.log('❌ OCR failed:', error);
            return null;
        }
    }

    extractZone(canvas, zone) {
        const zoneCanvas = document.createElement('canvas');
        const zoneCtx = zoneCanvas.getContext('2d');
        
        const x = Math.floor(zone.x * canvas.width);
        const y = Math.floor(zone.y * canvas.height);
        const width = Math.floor(zone.width * canvas.width);
        const height = Math.floor(zone.height * canvas.height);
        
        zoneCanvas.width = width;
        zoneCanvas.height = height;
        
        zoneCtx.drawImage(canvas, x, y, width, height, 0, 0, width, height);
        
        return zoneCanvas;
    }

    cleanOCRText(text) {
        if (!text) return '';
        
        let cleaned = text.trim();
        
        // Remove OCR artifacts
        cleaned = cleaned.replace(/[|\\]/g, 'I');
        cleaned = cleaned.replace(/[{}[\]]/g, '');
        cleaned = cleaned.replace(/\s+/g, ' ');
        cleaned = cleaned.replace(/[^a-zA-Z0-9\s\-',]/g, '');
        
        // Convert to title case
        cleaned = cleaned.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
        
        return cleaned.trim();
    }

    async loadImage(imageData) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            
            if (imageData instanceof HTMLCanvasElement) {
                img.src = imageData.toDataURL();
            } else if (typeof imageData === 'string') {
                img.src = imageData;
            } else {
                img.src = imageData;
            }
        });
    }

    log(message, data = null) {
        if (this.debugMode) {
            if (data) {
                console.log(message, data);
            } else {
                console.log(message);
            }
        }
    }

    async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
            this.isInitialized = false;
            console.log('🔄 OCR with SOFTWARE EXPOSURE CORRECTION terminated');
        }
    }
}

export default ClaudeVisionService;