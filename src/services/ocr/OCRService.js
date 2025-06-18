
import { createWorker } from 'tesseract.js';

class OCRService {
  constructor() {
    this.worker = null;
    this.isInitialized = false;
    this.isProcessing = false;
  }

  // Initialize Tesseract worker
  async initialize(language = 'eng') {
    try {
      if (this.isInitialized) return true;

      this.worker = await createWorker(language, 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      await this.worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?-\'"/()[]{}:; ',
        tessedit_pageseg_mode: '6', // Assume a single uniform block of text
      });

      this.isInitialized = true;
      console.log('OCR Service initialized successfully');
      return true;
    } catch (error) {
      console.error('OCR initialization failed:', error);
      throw new Error(`OCR initialization failed: ${error.message}`);
    }
  }

  // Process image and extract text
  async recognizeText(imageData, options = {}) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (this.isProcessing) {
        throw new Error('OCR is already processing another image');
      }

      this.isProcessing = true;

      const defaultOptions = {
        confidence_threshold: 60,
        language: 'eng',
        whitelist: null
      };

      const config = { ...defaultOptions, ...options };

      // Set whitelist if provided
      if (config.whitelist) {
        await this.worker.setParameters({
          tessedit_char_whitelist: config.whitelist
        });
      }

      // Perform OCR
      const { data } = await this.worker.recognize(imageData);

      // Filter results by confidence
      const filteredWords = data.words.filter(word => 
        word.confidence >= config.confidence_threshold
      );

      const result = {
        text: data.text.trim(),
        confidence: data.confidence,
        words: filteredWords,
        lines: data.lines,
        blocks: data.blocks,
        processingTime: Date.now(),
        wordCount: filteredWords.length,
        avgConfidence: this.calculateAverageConfidence(filteredWords),
        extractedData: this.extractMTGData(data.text)
      };

      this.isProcessing = false;
      return result;

    } catch (error) {
      this.isProcessing = false;
      console.error('OCR recognition failed:', error);
      throw new Error(`Text recognition failed: ${error.message}`);
    }
  }

  // Enhanced MTG-specific data extraction with better patterns
  extractMTGData(text) {
    const mtgPatterns = {
      // Card name patterns (first line, title case)
      cardName: [
        /^([A-Z][a-zA-Z\s,'-]+?)(?:\s*\{|\s*\d|\s*—|\s*\n|$)/m,
        /^([A-Z][a-zA-Z\s,'-]{2,40})/m,
        /([A-Z][a-zA-Z\s,'-]+?)(?=\s+\{|\s+\d+\/\d+|\s+—)/
      ],
      
      // Mana cost patterns (in curly braces or symbols)
      manaCost: [
        /\{([0-9WUBRG\/X]+)\}/g,
        /(?:^|\s)([0-9]+[WUBRG]*)\s/g,
        /Mana Cost[:\s]*([0-9WUBRG\/\{\}]+)/i
      ],
      
      // Power/Toughness patterns
      power: [
        /(\d+|\*|X)\/(\d+|\*|X)(?:\s|$)/,
        /Power[\/:\s]*(\d+|\*|X)[^\d]*Toughness[\/:\s]*(\d+|\*|X)/i,
        /(\d+|\*|X)\s*\/\s*(\d+|\*|X)/
      ],
      
      // Set code patterns (3-4 letter codes)
      setCode: [
        /\[([A-Z0-9]{3,4})\]/,
        /Set[:\s]*([A-Z0-9]{3,4})/i,
        /\b([A-Z]{3,4})\s*[#\d]/,
        /©\s*\d{4}\s*([A-Z]{3,4})/
      ],
      
      // Collector number patterns
      collectorNumber: [
        /(\d+)\/(\d+)/,
        /#(\d+)/,
        /\b(\d{1,4})\/\d+\b/,
        /Number[:\s]*(\d+)/i
      ],
      
      // Rarity patterns
      rarity: [
        /(Mythic\s*Rare|Mythic|Rare|Uncommon|Common)/i,
        /Rarity[:\s]*(Mythic\s*Rare|Mythic|Rare|Uncommon|Common)/i
      ],
      
      // Type line patterns
      type: [
        /(Legendary\s+)?(Artifact|Creature|Enchantment|Instant|Sorcery|Planeswalker|Land|Battle)(\s+—\s+[\w\s]+)?/i,
        /Type[:\s]*([\w\s—]+)/i
      ],
      
      // Artist patterns
      artist: [
        /Illus[.\s]*([A-Za-z\s.]+)/i,
        /Artist[:\s]*([A-Za-z\s.]+)/i,
        /Art\s*by[:\s]*([A-Za-z\s.]+)/i
      ],
      
      // Copyright/Set info
      copyright: [
        /©\s*(\d{4})\s*([A-Z\s]+)/,
        /\d{4}\s*Wizards/
      ],
      
      // Converted mana cost
      cmc: [
        /(?:Converted\s*)?Mana\s*Cost[:\s]*(\d+)/i,
        /CMC[:\s]*(\d+)/i
      ]
    };

    const extracted = {};
    const confidenceScores = {};

    // Helper function to try multiple patterns
    const tryPatterns = (patterns, text, transform = null) => {
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          const result = transform ? transform(match) : match[1];
          if (result && result.trim()) {
            return result.trim();
          }
        }
      }
      return null;
    };

    // Extract card name with confidence scoring
    const cardName = tryPatterns(mtgPatterns.cardName, text);
    if (cardName) {
      extracted.cardName = cardName;
      confidenceScores.cardName = cardName.length > 3 && cardName.length < 50 ? 0.9 : 0.6;
    }

    // Extract mana cost
    const manaCostMatches = [...text.matchAll(/\{([0-9WUBRG\/X]+)\}/g)];
    if (manaCostMatches.length > 0) {
      extracted.manaCost = manaCostMatches.map(match => match[1]);
      confidenceScores.manaCost = 0.95;
    } else {
      // Try alternative mana cost patterns
      const altManaCost = tryPatterns(mtgPatterns.manaCost.slice(1), text);
      if (altManaCost) {
        extracted.manaCost = [altManaCost];
        confidenceScores.manaCost = 0.7;
      }
    }

    // Extract power/toughness
    const powerMatch = tryPatterns(mtgPatterns.power, text, match => ({
      power: match[1],
      toughness: match[2]
    }));
    if (powerMatch) {
      extracted.power = powerMatch.power;
      extracted.toughness = powerMatch.toughness;
      confidenceScores.power = 0.9;
    }

    // Extract set code
    const setCode = tryPatterns(mtgPatterns.setCode, text);
    if (setCode) {
      extracted.setCode = setCode.toUpperCase();
      confidenceScores.setCode = setCode.length === 3 || setCode.length === 4 ? 0.9 : 0.6;
    }

    // Extract collector number
    const collectorNumber = tryPatterns(mtgPatterns.collectorNumber, text);
    if (collectorNumber) {
      extracted.collectorNumber = collectorNumber;
      confidenceScores.collectorNumber = 0.8;
    }

    // Extract rarity
    const rarity = tryPatterns(mtgPatterns.rarity, text);
    if (rarity) {
      extracted.rarity = rarity.toLowerCase().replace(/\s+/g, '_');
      confidenceScores.rarity = 0.9;
    }

    // Extract type line
    const type = tryPatterns(mtgPatterns.type, text);
    if (type) {
      extracted.type = type;
      confidenceScores.type = 0.8;
    }

    // Extract artist
    const artist = tryPatterns(mtgPatterns.artist, text);
    if (artist) {
      extracted.artist = artist;
      confidenceScores.artist = 0.7;
    }

    // Extract copyright year
    const copyright = tryPatterns(mtgPatterns.copyright, text, match => match[1]);
    if (copyright) {
      extracted.copyrightYear = copyright;
      confidenceScores.copyrightYear = 0.8;
    }

    // Calculate overall extraction confidence
    const totalConfidence = Object.values(confidenceScores).reduce((a, b) => a + b, 0);
    const avgConfidence = totalConfidence / Object.keys(confidenceScores).length || 0;

    // Advanced card name cleaning for better API matching
    if (extracted.cardName) {
      extracted.cleanedCardName = extracted.cardName
        .replace(/[^\w\s'-]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\b(the|of|a|an)\b/gi, '')
        .trim();
    }

    // Add metadata
    extracted._metadata = {
      confidenceScores,
      overallConfidence: avgConfidence,
      extractedFields: Object.keys(extracted).filter(k => k !== '_metadata').length,
      processingTime: Date.now()
    };

    return extracted;
  }

  // Calculate average confidence of words
  calculateAverageConfidence(words) {
    if (words.length === 0) return 0;
    const sum = words.reduce((acc, word) => acc + word.confidence, 0);
    return Math.round(sum / words.length);
  }

  // Cleanup resources
  async terminate() {
    try {
      if (this.worker) {
        await this.worker.terminate();
        this.worker = null;
      }
      this.isInitialized = false;
      this.isProcessing = false;
      console.log('OCR Service terminated');
    } catch (error) {
      console.error('OCR termination failed:', error);
    }
  }

  // Get current status
  getStatus() {
    return {
      initialized: this.isInitialized,
      processing: this.isProcessing,
      workerReady: !!this.worker
    };
  }
}

export default OCRService;