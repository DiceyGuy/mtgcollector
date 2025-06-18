// EnhancedOCRService.js - Advanced MTG Card OCR with Multiple Passes
// 🚀 TARGET: 80%+ OCR CONFIDENCE (from current 21%)

import Tesseract from 'tesseract.js';
import ImagePreprocessor from './ImagePreprocessor.js';

class EnhancedOCRService {
  constructor() {
    this.preprocessor = new ImagePreprocessor();
    this.worker = null;
    this.isInitialized = false;
    
    // MTG-specific patterns for text validation
    this.mtgPatterns = {
      // Card names: Start with capital, may include apostrophes, commas, hyphens
      cardName: /^[A-Z][a-zA-Z\s',\-\.]{2,50}$/,
      
      // Set codes: 3-4 characters, usually uppercase
      setCode: /^[A-Z0-9]{3,4}$/,
      
      // Collector numbers: digits with optional letter
      collectorNumber: /^\d{1,3}[a-zA-Z]?$/,
      
      // Rarity words
      rarity: /^(Common|Uncommon|Rare|Mythic|Special|Timeshifted)$/i,
      
      // Mana costs: numbers and mana symbols
      manaCost: /^[\d{WUBRG}XYZ\s\{\}]*$/,
      
      // Power/Toughness: number or * or X
      powerToughness: /^[\d\*X\+\-]+$/
    };
    
    // Common OCR error corrections for MTG terms
    this.errorCorrections = {
      // Common misreads
      '0': 'O',
      '5': 'S',
      '1': 'I',
      '8': 'B',
      'rn': 'm',
      'vv': 'w',
      'cl': 'd',
      'li': 'h',
      
      // MTG-specific corrections
      'Maqic': 'Magic',
      'Gatherlng': 'Gathering',
      'Creaturè': 'Creature',
      'Artlfact': 'Artifact',
      'Enchanment': 'Enchantment',
      'Sorcerv': 'Sorcery',
      'lnstant': 'Instant',
      'Planeswalke': 'Planeswalker'
    };
  }

  // Initialize OCR worker
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('🔧 Initializing Enhanced OCR Service...');
    
    try {
      this.worker = await Tesseract.createWorker();
      await this.worker.loadLanguage('eng');
      await this.worker.initialize('eng');
      
      // Configure for better text recognition
      await this.worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,\'-/() ',
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
        preserve_interword_spaces: '1'
      });
      
      this.isInitialized = true;
      console.log('✅ Enhanced OCR Service initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize OCR Service:', error);
      throw error;
    }
  }

  // Main enhanced OCR function
  async recognizeCard(imageElement) {
    await this.initialize();
    
    console.log('🧠 Starting enhanced card recognition...');
    
    try {
      // Step 1: Generate multiple image variations
      const imageVariations = await this.preprocessor.generateImageVariations(imageElement);
      
      // Step 2: Run OCR on each variation
      const ocrResults = [];
      
      for (const variation of imageVariations) {
        console.log(`🔍 Running OCR on ${variation.name} variation...`);
        
        const result = await this.runOCRPass(variation.imageData, variation.name);
        if (result) {
          ocrResults.push(result);
        }
      }
      
      // Step 3: Consolidate and validate results
      const consolidatedResult = this.consolidateOCRResults(ocrResults);
      
      // Step 4: Extract and validate MTG-specific data
      const extractedData = this.extractMTGData(consolidatedResult);
      
      // Step 5: Apply error corrections
      const correctedData = this.applyErrorCorrections(extractedData);
      
      console.log('✅ Enhanced OCR complete:', correctedData);
      
      return {
        extractedData: correctedData,
        confidence: consolidatedResult.confidence,
        rawText: consolidatedResult.text,
        variations: ocrResults,
        processingSteps: [
          'Multi-variation preprocessing',
          'Multiple OCR passes',
          'MTG pattern validation',
          'Error correction',
          'Data consolidation'
        ]
      };
      
    } catch (error) {
      console.error('❌ Enhanced OCR failed:', error);
      
      // Fallback to basic OCR
      return this.basicOCRFallback(imageElement);
    }
  }

  // Run single OCR pass
  async runOCRPass(imageData, variationName) {
    try {
      const result = await this.worker.recognize(imageData);
      
      const confidence = result.data.confidence;
      const text = result.data.text.trim();
      
      console.log(`📊 ${variationName} OCR: ${confidence.toFixed(1)}% confidence`);
      console.log(`📝 ${variationName} Text: "${text}"`);
      
      return {
        variation: variationName,
        confidence: confidence,
        text: text,
        words: result.data.words || [],
        lines: result.data.lines || []
      };
      
    } catch (error) {
      console.error(`❌ OCR pass failed for ${variationName}:`, error);
      return null;
    }
  }

  // Consolidate multiple OCR results
  consolidateOCRResults(results) {
    if (!results || results.length === 0) {
      return { confidence: 0, text: '', consolidatedText: '' };
    }
    
    // Sort by confidence
    results.sort((a, b) => b.confidence - a.confidence);
    
    const bestResult = results[0];
    let consolidatedText = bestResult.text;
    let totalConfidence = bestResult.confidence;
    
    // Try to improve text by comparing multiple results
    if (results.length > 1) {
      consolidatedText = this.mergeBestWords(results);
      totalConfidence = this.calculateAverageConfidence(results);
    }
    
    return {
      confidence: totalConfidence,
      text: consolidatedText,
      consolidatedText: consolidatedText,
      bestVariation: bestResult.variation,
      allResults: results
    };
  }

  // Merge best words from multiple OCR results
  mergeBestWords(results) {
    // For now, use the highest confidence result
    // TODO: Implement sophisticated word-level merging
    return results[0].text;
  }

  // Calculate average confidence weighted by result quality
  calculateAverageConfidence(results) {
    if (results.length === 0) return 0;
    
    const weights = results.map((r, i) => Math.pow(0.8, i)); // Diminishing weights
    const weightedSum = results.reduce((sum, result, i) => sum + result.confidence * weights[i], 0);
    const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
    
    return weightedSum / weightSum;
  }

  // Extract MTG-specific data from text
  extractMTGData(ocrResult) {
    const text = ocrResult.text || '';
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const extractedData = {
      cardName: null,
      setCode: null,
      collectorNumber: null,
      rarity: null,
      manaCost: null,
      typeLineText: null,
      powerToughness: null,
      artist: null
    };
    
    // Extract card name (usually first significant line)
    for (const line of lines) {
      if (this.mtgPatterns.cardName.test(line) && line.length >= 3) {
        extractedData.cardName = line;
        break;
      }
    }
    
    // Extract other data from text
    for (const line of lines) {
      // Set code (3-4 characters)
      if (this.mtgPatterns.setCode.test(line)) {
        extractedData.setCode = line;
      }
      
      // Collector number
      if (this.mtgPatterns.collectorNumber.test(line)) {
        extractedData.collectorNumber = line;
      }
      
      // Rarity
      if (this.mtgPatterns.rarity.test(line)) {
        extractedData.rarity = line;
      }
      
      // Power/Toughness (format: X/Y)
      if (line.includes('/') && line.length <= 10) {
        const parts = line.split('/');
        if (parts.length === 2 && parts.every(part => this.mtgPatterns.powerToughness.test(part.trim()))) {
          extractedData.powerToughness = line;
        }
      }
    }
    
    // If no card name found, try first non-empty line
    if (!extractedData.cardName && lines.length > 0) {
      extractedData.cardName = lines[0];
    }
    
    return extractedData;
  }

  // Apply error corrections
  applyErrorCorrections(extractedData) {
    const corrected = { ...extractedData };
    
    // Correct card name
    if (corrected.cardName) {
      corrected.cardName = this.correctText(corrected.cardName);
    }
    
    // Correct other fields
    Object.keys(corrected).forEach(key => {
      if (typeof corrected[key] === 'string' && corrected[key]) {
        corrected[key] = this.correctText(corrected[key]);
      }
    });
    
    return corrected;
  }

  // Apply text corrections
  correctText(text) {
    let corrected = text;
    
    // Apply common OCR error corrections
    Object.entries(this.errorCorrections).forEach(([error, correction]) => {
      const regex = new RegExp(error, 'gi');
      corrected = corrected.replace(regex, correction);
    });
    
    // Clean up extra spaces
    corrected = corrected.replace(/\s+/g, ' ').trim();
    
    return corrected;
  }

  // Fallback to basic OCR
  async basicOCRFallback(imageElement) {
    console.log('🔄 Falling back to basic OCR...');
    
    try {
      await this.initialize();
      
      const canvas = document.createElement('canvas');
      canvas.width = imageElement.width;
      canvas.height = imageElement.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imageElement, 0, 0);
      
      const result = await this.worker.recognize(canvas.toDataURL());
      
      return {
        extractedData: {
          cardName: result.data.text.split('\n')[0]?.trim() || 'Unknown'
        },
        confidence: result.data.confidence,
        rawText: result.data.text,
        variations: [],
        processingSteps: ['Basic OCR fallback']
      };
      
    } catch (error) {
      console.error('❌ Basic OCR fallback failed:', error);
      return {
        extractedData: { cardName: 'OCR Failed' },
        confidence: 0,
        rawText: '',
        variations: [],
        processingSteps: ['Failed']
      };
    }
  }

  // Cleanup resources
  async cleanup() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      console.log('🧹 OCR Service cleaned up');
    }
  }
}

export default EnhancedOCRService;