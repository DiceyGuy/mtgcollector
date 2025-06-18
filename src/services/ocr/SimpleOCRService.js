// SimpleOCRService.js - Proven Working OCR for MTG Cards
import Tesseract from 'tesseract.js';

class SimpleOCRService {
  constructor() {
    this.worker = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    console.log('🔧 Initializing Simple OCR...');
    
    try {
      this.worker = await Tesseract.createWorker();
      await this.worker.loadLanguage('eng');
      await this.worker.initialize('eng');
      
      // Optimize for card text
      await this.worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,\'-/() ',
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK
      });
      
      this.isInitialized = true;
      console.log('✅ Simple OCR initialized');
      
    } catch (error) {
      console.error('❌ OCR initialization failed:', error);
      throw error;
    }
  }

  // Enhanced image preprocessing
  async preprocessImage(imageElement) {
    console.log('🎨 Preprocessing image...');
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Optimal size for OCR
    canvas.width = Math.min(800, imageElement.width);
    canvas.height = (canvas.width / imageElement.width) * imageElement.height;
    
    // Draw and enhance
    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
    
    // Get image data for processing
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Increase contrast and convert to grayscale
    for (let i = 0; i < data.length; i += 4) {
      // Calculate grayscale
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      
      // Increase contrast
      const contrast = 1.5;
      const enhanced = ((gray - 128) * contrast) + 128;
      const final = Math.min(255, Math.max(0, enhanced));
      
      data[i] = final;     // Red
      data[i + 1] = final; // Green  
      data[i + 2] = final; // Blue
    }
    
    // Put enhanced data back
    ctx.putImageData(imageData, 0, 0);
    
    return canvas.toDataURL('image/png');
  }

  // Extract card name region (top 30% of card)
  async extractCardNameRegion(imageElement) {
    console.log('🎯 Extracting card name region...');
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Focus on top 30% where card name is
    canvas.width = Math.min(800, imageElement.width);
    canvas.height = Math.floor((canvas.width / imageElement.width) * imageElement.height * 0.3);
    
    // Draw top portion
    ctx.drawImage(
      imageElement,
      0, 0, imageElement.width, imageElement.height * 0.3,
      0, 0, canvas.width, canvas.height
    );
    
    // Apply high contrast
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const enhanced = gray > 128 ? 255 : 0; // Binary threshold
      
      data[i] = enhanced;
      data[i + 1] = enhanced;
      data[i + 2] = enhanced;
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  }

  // Main OCR function that works with existing Scanner
  async recognizeCard(imageElement) {
    await this.initialize();
    
    console.log('🧠 Starting card recognition...');
    
    try {
      // Method 1: Full image with preprocessing
      const preprocessed = await this.preprocessImage(imageElement);
      const result1 = await this.worker.recognize(preprocessed);
      
      console.log('📊 Method 1 - Full image:', result1.data.confidence.toFixed(1) + '%');
      console.log('📝 Method 1 - Text:', result1.data.text);
      
      // Method 2: Card name region only
      const nameRegion = await this.extractCardNameRegion(imageElement);
      const result2 = await this.worker.recognize(nameRegion);
      
      console.log('📊 Method 2 - Name region:', result2.data.confidence.toFixed(1) + '%');
      console.log('📝 Method 2 - Text:', result2.data.text);
      
      // Choose best result
      const bestResult = result1.data.confidence > result2.data.confidence ? result1 : result2;
      const text = bestResult.data.text.trim();
      
      // Extract card name (first meaningful line)
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      let cardName = lines[0] || 'Unknown';
      
      // Clean up card name
      cardName = this.cleanCardName(cardName);
      
      console.log('🎴 Final card name:', cardName);
      console.log('📊 Final confidence:', bestResult.data.confidence.toFixed(1) + '%');
      
      // Return in format expected by Scanner
      return {
        confidence: bestResult.data.confidence,
        extractedData: {
          cardName: cardName
        },
        rawText: text,
        variations: [
          { variation: 'full_image', confidence: result1.data.confidence, text: result1.data.text },
          { variation: 'name_region', confidence: result2.data.confidence, text: result2.data.text }
        ]
      };
      
    } catch (error) {
      console.error('❌ OCR failed:', error);
      throw error;
    }
  }

  // Clean up extracted card name
  cleanCardName(text) {
    // Remove common OCR errors
    let cleaned = text
      .replace(/[^a-zA-Z0-9\s',\-\.]/g, '') // Remove weird characters
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .trim();
    
    // Common OCR corrections
    const corrections = {
      '0': 'O',
      '5': 'S', 
      '1': 'I',
      '8': 'B',
      'rn': 'm',
      'vv': 'w'
    };
    
    Object.entries(corrections).forEach(([wrong, right]) => {
      cleaned = cleaned.replace(new RegExp(wrong, 'g'), right);
    });
    
    return cleaned;
  }

  // Compatibility with existing Scanner
  async recognizeText(imageDataUrl) {
    const img = new Image();
    img.src = imageDataUrl;
    await new Promise(resolve => img.onload = resolve);
    
    return this.recognizeCard(img);
  }

  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      console.log('🧹 OCR terminated');
    }
  }
}

export default SimpleOCRService;