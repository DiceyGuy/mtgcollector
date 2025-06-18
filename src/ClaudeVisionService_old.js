// ClaudeVisionService.js - Enhanced OCR for MTG Cards
// Location: C:\Users\kim-a\Documents\DiceyTech\MTG Scanner\ClaudeVisionService.js

import Tesseract from 'tesseract.js';

class ClaudeVisionService {
    constructor() {
        this.worker = null;
        this.isInitialized = false;
        this.debugMode = true;
        
        // Enhanced MTG card zones with better precision
        this.mtgZones = {
            name: { x: 0.04, y: 0.04, width: 0.70, height: 0.12 },
            collector: { x: 0.04, y: 0.88, width: 0.92, height: 0.10 },
            typeLine: { x: 0.04, y: 0.58, width: 0.70, height: 0.08 },
            powerToughness: { x: 0.75, y: 0.88, width: 0.21, height: 0.08 }
        };
        
        // Multiple OCR strategies for different card types
        this.ocrStrategies = {
            standard: {
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 -\',./',
                tessedit_pageseg_mode: '8',
                preserve_interword_spaces: '1'
            },
            foil: {
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 -\',./',
                tessedit_pageseg_mode: '6',
                preserve_interword_spaces: '1',
                tessedit_do_invert: '1'
            },
            oldCard: {
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 -\',./',
                tessedit_pageseg_mode: '7',
                preserve_interword_spaces: '1',
                tessedit_enable_doc_dict: '0'
            },
            collector: {
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/',
                tessedit_pageseg_mode: '8',
                preserve_interword_spaces: '0'
            }
        };
    }

    async initialize() {
        if (this.isInitialized) return;
        
        this.log('🚀 Initializing Enhanced OCR Service...');
        
        try {
            this.worker = await Tesseract.createWorker(['eng'], 1, {
                logger: this.debugMode ? (m) => console.log('📝 Tesseract:', m) : undefined
            });
            
            this.isInitialized = true;
            this.log('✅ OCR Service initialized successfully');
        } catch (error) {
            this.log('❌ Failed to initialize OCR:', error);
            throw error;
        }
    }

    async processCardImage(imageData, cardType = 'standard') {
        if (!this.isInitialized) {
            await this.initialize();
        }

        this.log(`🎯 Enhanced OCR starting: ${cardType}`);
        
        try {
            // Create canvas for image processing
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Load image
            const img = await this.loadImage(imageData);
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            // Detect and correct rotation
            const rotationAngle = await this.detectRotation(canvas);
            if (Math.abs(rotationAngle) > 5) {
                this.rotateCanvas(canvas, ctx, img, -rotationAngle);
                this.log(`🔄 Corrected rotation: ${rotationAngle.toFixed(1)}°`);
            }
            
            // Extract and process zones
            const results = {};
            
            for (const [zoneName, zone] of Object.entries(this.mtgZones)) {
                try {
                    const zoneCanvas = this.extractZone(canvas, zone);
                    const processedCanvas = this.enhanceZoneForOCR(zoneCanvas, cardType, zoneName);
                    
                    this.log(`🔍 Zone extracted: ${zoneName}`, zone);
                    
                    // Try multiple OCR strategies
                    const ocrResult = await this.performMultiStrategyOCR(processedCanvas, cardType, zoneName);
                    
                    if (ocrResult && ocrResult.confidence > 30) {
                        results[zoneName] = {
                            text: this.cleanOCRText(ocrResult.text, zoneName),
                            confidence: ocrResult.confidence,
                            strategy: ocrResult.strategy
                        };
                        
                        this.log(`✨ Processing result: ${zoneName}`, results[zoneName]);
                    } else {
                        this.log(`⚠️ Low confidence for ${zoneName}: ${ocrResult?.confidence || 0}%`);
                        results[zoneName] = {
                            text: '',
                            confidence: 0,
                            strategy: 'failed'
                        };
                    }
                } catch (error) {
                    this.log(`❌ Error processing zone ${zoneName}:`, error);
                    results[zoneName] = { text: '', confidence: 0, strategy: 'error' };
                }
            }
            
            // Determine best card name result
            const cardName = results.name?.text || '';
            const overallConfidence = this.calculateOverallConfidence(results);
            
            this.log(`🎉 Final result: "${cardName}" (${overallConfidence}% confidence)`);
            
            return {
                cardName,
                confidence: overallConfidence,
                zones: results,
                cardType,
                rotationCorrected: Math.abs(rotationAngle) > 5
            };
            
        } catch (error) {
            this.log('❌ OCR processing failed:', error);
            throw error;
        }
    }

    async performMultiStrategyOCR(canvas, cardType, zoneName) {
        const strategies = this.getStrategiesForZone(cardType, zoneName);
        let bestResult = null;
        
        for (const strategyName of strategies) {
            try {
                const config = this.ocrStrategies[strategyName];
                await this.worker.setParameters(config);
                
                const imageData = canvas.toDataURL();
                const result = await this.worker.recognize(imageData);
                
                const confidence = result.data.confidence;
                this.log(`📊 Strategy ${strategyName}: ${confidence}% - "${result.data.text.trim()}"`);
                
                if (!bestResult || confidence > bestResult.confidence) {
                    bestResult = {
                        text: result.data.text,
                        confidence: confidence,
                        strategy: strategyName
                    };
                }
                
                // If we get good enough result, stop trying
                if (confidence > 75) {
                    break;
                }
                
            } catch (error) {
                this.log(`⚠️ Strategy ${strategyName} failed:`, error);
            }
        }
        
        return bestResult;
    }

    getStrategiesForZone(cardType, zoneName) {
        const baseStrategies = ['standard'];
        
        if (cardType === 'foil') {
            return ['foil', 'standard', 'oldCard'];
        }
        
        if (cardType === 'oldCard') {
            return ['oldCard', 'standard'];
        }
        
        if (zoneName === 'collector') {
            return ['collector', 'standard'];
        }
        
        return baseStrategies;
    }

    enhanceZoneForOCR(canvas, cardType, zoneName) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Apply different enhancement based on card type and zone
        if (cardType === 'foil') {
            this.enhanceForFoil(data);
        } else if (cardType === 'oldCard') {
            this.enhanceForOldCard(data);
        } else {
            this.enhanceStandard(data);
        }
        
        // Apply zone-specific enhancements
        if (zoneName === 'name') {
            this.enhanceTextContrast(data, 1.3);
        } else if (zoneName === 'collector') {
            this.enhanceSmallText(data);
        }
        
        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }

    enhanceForFoil(data) {
        // Reduce reflection and increase contrast for foil cards
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Calculate luminance
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            
            // Increase contrast and reduce reflective areas
            const contrast = 1.4;
            const newLuminance = Math.max(0, Math.min(255, (luminance - 128) * contrast + 128));
            
            // Apply enhancement
            const factor = newLuminance / (luminance + 1);
            data[i] = Math.min(255, r * factor);
            data[i + 1] = Math.min(255, g * factor);
            data[i + 2] = Math.min(255, b * factor);
        }
    }

    enhanceForOldCard(data) {
        // Handle white text on dark backgrounds (older cards)
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            
            // If dark background with light text, invert
            if (luminance < 100) {
                data[i] = 255 - r;
                data[i + 1] = 255 - g;
                data[i + 2] = 255 - b;
            }
        }
    }

    enhanceStandard(data) {
        // Standard enhancement for modern cards
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Simple contrast enhancement
            const contrast = 1.2;
            data[i] = Math.max(0, Math.min(255, (r - 128) * contrast + 128));
            data[i + 1] = Math.max(0, Math.min(255, (g - 128) * contrast + 128));
            data[i + 2] = Math.max(0, Math.min(255, (b - 128) * contrast + 128));
        }
    }

    enhanceTextContrast(data, factor) {
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            const enhanced = (value) => Math.max(0, Math.min(255, (value - 128) * factor + 128));
            
            data[i] = enhanced(r);
            data[i + 1] = enhanced(g);
            data[i + 2] = enhanced(b);
        }
    }

    enhanceSmallText(data) {
        // Sharpen filter for small text (collector numbers)
        const sharpenKernel = [
            0, -1, 0,
            -1, 5, -1,
            0, -1, 0
        ];
        this.applyKernel(data, sharpenKernel, Math.sqrt(data.length / 4));
    }

    applyKernel(data, kernel, width) {
        const height = data.length / 4 / width;
        const output = new Uint8ClampedArray(data.length);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                for (let c = 0; c < 3; c++) {
                    let sum = 0;
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const pixel = ((y + ky) * width + (x + kx)) * 4 + c;
                            sum += data[pixel] * kernel[(ky + 1) * 3 + (kx + 1)];
                        }
                    }
                    output[(y * width + x) * 4 + c] = Math.max(0, Math.min(255, sum));
                }
                output[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3]; // Alpha
            }
        }
        
        data.set(output);
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

    cleanOCRText(text, zoneName) {
        if (!text) return '';
        
        let cleaned = text.trim();
        
        // Remove common OCR artifacts
        cleaned = cleaned.replace(/[|\\]/g, 'I');
        cleaned = cleaned.replace(/[{}[\]]/g, '');
        cleaned = cleaned.replace(/\s+/g, ' ');
        
        if (zoneName === 'name') {
            // Card name specific cleaning
            cleaned = cleaned.replace(/[^a-zA-Z0-9\s\-',]/g, '');
            cleaned = this.toTitleCase(cleaned);
        } else if (zoneName === 'collector') {
            // Collector number cleaning
            cleaned = cleaned.replace(/[^A-Z0-9/]/g, '');
        }
        
        return cleaned.trim();
    }

    toTitleCase(str) {
        return str.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    }

    calculateOverallConfidence(results) {
        const weights = { name: 0.5, collector: 0.2, typeLine: 0.2, powerToughness: 0.1 };
        let totalWeight = 0;
        let weightedConfidence = 0;
        
        for (const [zone, result] of Object.entries(results)) {
            if (weights[zone] && result.confidence > 0) {
                weightedConfidence += result.confidence * weights[zone];
                totalWeight += weights[zone];
            }
        }
        
        return totalWeight > 0 ? Math.round(weightedConfidence / totalWeight) : 0;
    }

    async detectRotation(canvas) {
        // Simple edge detection for rotation
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Look for horizontal and vertical edges
        let horizontalEdges = 0;
        let verticalEdges = 0;
        
        for (let y = 1; y < canvas.height - 1; y++) {
            for (let x = 1; x < canvas.width - 1; x++) {
                const i = (y * canvas.width + x) * 4;
                const current = data[i];
                const right = data[i + 4];
                const down = data[(y + 1) * canvas.width * 4 + x * 4];
                
                if (Math.abs(current - right) > 30) horizontalEdges++;
                if (Math.abs(current - down) > 30) verticalEdges++;
            }
        }
        
        // If more vertical edges than horizontal, likely rotated 90°
        if (verticalEdges > horizontalEdges * 1.5) {
            return 90;
        } else if (horizontalEdges > verticalEdges * 1.5) {
            return 0;
        }
        
        return 0; // No rotation detected
    }

    rotateCanvas(canvas, ctx, img, angle) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle * Math.PI / 180);
        ctx.drawImage(img, -centerX, -centerY);
        ctx.restore();
    }

    async loadImage(imageData) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            
            if (typeof imageData === 'string') {
                img.src = imageData;
            } else if (imageData instanceof File) {
                const reader = new FileReader();
                reader.onload = (e) => img.src = e.target.result;
                reader.readAsDataURL(imageData);
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
            this.log('🔄 OCR Service terminated');
        }
    }
}

export default ClaudeVisionService;