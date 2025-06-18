// src/services/ScannerCamera.js
// ENHANCED CAMERA HANDLING + MTG SCANNER WITH SCRYFALL

class EnhancedScannerCamera {
  constructor() {
    this.stream = null;
    this.videoElement = null;
    this.isInitialized = false;
    this.lastPermissionState = null;
    
    console.log('📷 Enhanced Camera Scanner initialized');
  }

  async checkCameraPermissions() {
    console.log('🔒 Checking camera permissions...');
    
    try {
      // Check current permission state
      const permission = await navigator.permissions.query({ name: 'camera' });
      const state = permission.state;
      
      console.log(`📊 Camera permission state: ${state}`);
      this.lastPermissionState = state;
      
      if (state === 'denied') {
        throw new Error('Camera access denied. Please enable camera permissions in browser settings.');
      }
      
      return state;
    } catch (error) {
      console.error('❌ Permission check failed:', error);
      // Fallback - try to request anyway
      return 'unknown';
    }
  }

  async requestCameraAccess() {
    console.log('🎥 Requesting enhanced camera access...');
    
    try {
      // Try different constraint combinations
      const constraints = [
        // High quality for MTG scanning
        {
          video: {
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            facingMode: 'environment', // Back camera preferred
            focusMode: 'continuous',
            exposureMode: 'continuous'
          },
          audio: false
        },
        // Fallback - standard quality
        {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'environment'
          },
          audio: false
        },
        // Last resort - any camera
        {
          video: true,
          audio: false
        }
      ];

      for (let i = 0; i < constraints.length; i++) {
        try {
          console.log(`🎯 Trying camera constraint set ${i + 1}...`);
          
          this.stream = await navigator.mediaDevices.getUserMedia(constraints[i]);
          console.log(`✅ Camera access granted with constraint set ${i + 1}`);
          
          // Get actual capabilities
          const track = this.stream.getVideoTracks()[0];
          const capabilities = track.getCapabilities();
          const settings = track.getSettings();
          
          console.log('📋 Camera capabilities:', capabilities);
          console.log('⚙️ Current settings:', settings);
          
          return this.stream;
          
        } catch (error) {
          console.log(`⚠️ Constraint set ${i + 1} failed:`, error.message);
          if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
          }
        }
      }
      
      throw new Error('All camera constraint combinations failed');
      
    } catch (error) {
      console.error('❌ Camera access failed:', error);
      throw new Error(`Camera access failed: ${error.message}`);
    }
  }

  async getAvailableCameras() {
    console.log('📹 Getting available cameras...');
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log(`🎥 Found ${videoDevices.length} video devices:`, videoDevices);
      
      return videoDevices.map(device => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${device.deviceId.substring(0, 8)}`,
        capabilities: null // Will be filled when selected
      }));
      
    } catch (error) {
      console.error('❌ Failed to enumerate cameras:', error);
      return [];
    }
  }

  async selectSpecificCamera(deviceId) {
    console.log(`🎯 Selecting specific camera: ${deviceId}`);
    
    try {
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
      }
      
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 }
        },
        audio: false
      });
      
      console.log('✅ Specific camera selected successfully');
      return this.stream;
      
    } catch (error) {
      console.error('❌ Failed to select specific camera:', error);
      throw error;
    }
  }

  async initializeCamera(videoElementId) {
    console.log('🚀 Initializing enhanced camera...');
    
    try {
      // Check permissions first
      await this.checkCameraPermissions();
      
      // Get camera access
      if (!this.stream) {
        await this.requestCameraAccess();
      }
      
      // Setup video element
      this.videoElement = document.getElementById(videoElementId);
      if (!this.videoElement) {
        throw new Error(`Video element '${videoElementId}' not found`);
      }
      
      this.videoElement.srcObject = this.stream;
      this.videoElement.playsInline = true;
      
      // Wait for metadata
      await new Promise((resolve, reject) => {
        this.videoElement.onloadedmetadata = () => {
          console.log('📊 Camera metadata loaded');
          resolve();
        };
        this.videoElement.onerror = reject;
        
        // Timeout after 10 seconds
        setTimeout(() => reject(new Error('Camera initialization timeout')), 10000);
      });
      
      // Start playback
      await this.videoElement.play();
      console.log('✅ Camera playing successfully');
      
      this.isInitialized = true;
      return true;
      
    } catch (error) {
      console.error('❌ Camera initialization failed:', error);
      throw error;
    }
  }

  async captureImage() {
    if (!this.isInitialized || !this.videoElement) {
      throw new Error('Camera not initialized');
    }
    
    console.log('📸 Capturing enhanced image...');
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Use actual video dimensions
    canvas.width = this.videoElement.videoWidth;
    canvas.height = this.videoElement.videoHeight;
    
    ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);
    
    console.log(`✅ Image captured: ${canvas.width}x${canvas.height}`);
    return canvas.toDataURL('image/png');
  }

  stopCamera() {
    console.log('🛑 Stopping camera...');
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        console.log(`📴 Stopped track: ${track.label}`);
      });
      this.stream = null;
    }
    
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    
    this.isInitialized = false;
  }

  async refreshCameraAccess() {
    console.log('🔄 Refreshing camera access...');
    
    this.stopCamera();
    
    try {
      await this.requestCameraAccess();
      console.log('✅ Camera access refreshed');
      return true;
    } catch (error) {
      console.error('❌ Failed to refresh camera access:', error);
      return false;
    }
  }
}

// ENHANCED MTG SCANNER WITH SCRYFALL INTEGRATION
class EnhancedMTGScanner {
  constructor() {
    this.camera = new EnhancedScannerCamera();
    this.processor = null; // Will be initialized
    this.ocrWorker = null;
    this.isInitialized = false;
    
    // Scryfall API configuration
    this.SCRYFALL_API = 'https://api.scryfall.com';
    this.requestCache = new Map();
    this.rateLimitDelay = 100; // ms between requests
    
    console.log('🧠 Enhanced MTG Scanner initialized');
  }

  async initialize() {
    if (this.isInitialized) return;
    
    console.log('⚙️ Initializing enhanced MTG scanner...');
    
    try {
      // Initialize OCR
      this.ocrWorker = await Tesseract.createWorker('eng');
      
      // Initialize image processor
      this.processor = new EnhancedImageProcessor();
      
      this.isInitialized = true;
      console.log('✅ Enhanced MTG scanner ready');
      
    } catch (error) {
      console.error('❌ Scanner initialization failed:', error);
      throw error;
    }
  }

  async scanCard(imageData) {
    console.log('🎯 Starting enhanced MTG card scan...');
    
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      // Step 1: Extract card information using OCR
      const ocrResults = await this.extractCardInfo(imageData);
      console.log('📝 OCR Results:', ocrResults);
      
      // Step 2: Search Scryfall with multiple strategies
      const cardData = await this.identifyCardWithScryfall(ocrResults);
      console.log('🔍 Scryfall Results:', cardData);
      
      // Step 3: Enhance results with confidence scoring
      const finalResult = this.buildFinalResult(ocrResults, cardData);
      console.log('✅ Final Result:', finalResult);
      
      return finalResult;
      
    } catch (error) {
      console.error('❌ Card scan failed:', error);
      return this.createErrorResult(error);
    }
  }

  async extractCardInfo(imageData) {
    console.log('📝 Extracting card information...');
    
    // Convert image data to canvas if needed
    const canvas = await this.processor.prepareImage(imageData);
    
    // Extract different zones based on MTG card anatomy
    const zones = await this.processor.extractMTGZones(canvas);
    
    // OCR each zone with specific configurations
    const results = {};
    
    // Name zone - optimized for single line text
    if (zones.name) {
      results.name = await this.performOCR(zones.name, {
        psm: Tesseract.PSM.SINGLE_TEXT_LINE,
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz\' -,.'
      });
    }
    
    // Collector info zone - sparse text
    if (zones.collector) {
      results.collector = await this.performOCR(zones.collector, {
        psm: Tesseract.PSM.SPARSE_TEXT,
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/•'
      });
    }
    
    // Type line zone
    if (zones.typeLine) {
      results.typeLine = await this.performOCR(zones.typeLine, {
        psm: Tesseract.PSM.SINGLE_TEXT_LINE,
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz —-'
      });
    }
    
    // Power/Toughness zone
    if (zones.powerToughness) {
      results.powerToughness = await this.performOCR(zones.powerToughness, {
        psm: Tesseract.PSM.SINGLE_TEXT_LINE,
        tessedit_char_whitelist: '0123456789/*X+-'
      });
    }
    
    return this.cleanOCRResults(results);
  }

  async performOCR(imageCanvas, config) {
    try {
      const dataURL = imageCanvas.toDataURL('image/png');
      const { data } = await this.ocrWorker.recognize(dataURL, config);
      
      return {
        text: data.text.trim(),
        confidence: data.confidence
      };
    } catch (error) {
      console.error('❌ OCR failed:', error);
      return { text: '', confidence: 0 };
    }
  }

  cleanOCRResults(results) {
    const cleaned = {};
    
    if (results.name) {
      cleaned.cardName = this.cleanCardName(results.name.text);
      cleaned.nameConfidence = results.name.confidence;
    }
    
    if (results.collector) {
      const collectorInfo = this.parseCollectorInfo(results.collector.text);
      cleaned.setCode = collectorInfo.setCode;
      cleaned.collectorNumber = collectorInfo.number;
      cleaned.collectorConfidence = results.collector.confidence;
    }
    
    if (results.typeLine) {
      const typeInfo = this.parseTypeLine(results.typeLine.text);
      cleaned.types = typeInfo.types;
      cleaned.subtypes = typeInfo.subtypes;
      cleaned.typeConfidence = results.typeLine.confidence;
    }
    
    if (results.powerToughness) {
      const ptInfo = this.parsePowerToughness(results.powerToughness.text);
      cleaned.power = ptInfo.power;
      cleaned.toughness = ptInfo.toughness;
      cleaned.ptConfidence = results.powerToughness.confidence;
    }
    
    return cleaned;
  }

  cleanCardName(text) {
    return text
      .replace(/[|{}[\]()]/g, '')
      .replace(/[^a-zA-Z\s\'-,.]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  parseCollectorInfo(text) {
    const upperText = text.toUpperCase();
    
    // Look for set code (2-4 letters)
    const setMatch = upperText.match(/\b([A-Z]{2,4})\b/);
    
    // Look for collector number
    const numberMatch = upperText.match(/\b(\d{1,3}[A-Z]?)\b/);
    
    return {
      setCode: setMatch?.[1] || null,
      number: numberMatch?.[1] || null
    };
  }

  parseTypeLine(text) {
    const parts = text.split(/[—-]/);
    const mainTypes = parts[0] ? parts[0].trim().split(/\s+/) : [];
    const subtypes = parts[1] ? parts[1].trim().split(/\s+/) : [];
    
    return {
      types: mainTypes,
      subtypes: subtypes
    };
  }

  parsePowerToughness(text) {
    const match = text.match(/([*\dX+-]+)\s*\/\s*([*\dX+-]+)/);
    
    if (match) {
      return {
        power: match[1],
        toughness: match[2]
      };
    }
    
    return { power: null, toughness: null };
  }

  async identifyCardWithScryfall(ocrResults) {
    console.log('🔍 Searching Scryfall database...');
    
    // Strategy 1: Exact name match
    if (ocrResults.cardName && ocrResults.cardName.length >= 3) {
      const exactMatch = await this.searchScryfallExact(ocrResults.cardName);
      if (exactMatch) {
        console.log('✅ Found exact name match');
        return { ...exactMatch, matchType: 'exact_name' };
      }
    }
    
    // Strategy 2: Name + Set
    if (ocrResults.cardName && ocrResults.setCode) {
      const setMatch = await this.searchScryfallWithSet(ocrResults.cardName, ocrResults.setCode);
      if (setMatch) {
        console.log('✅ Found name + set match');
        return { ...setMatch, matchType: 'name_set' };
      }
    }
    
    // Strategy 3: Fuzzy name search
    if (ocrResults.cardName && ocrResults.cardName.length >= 4) {
      const fuzzyMatch = await this.searchScryfallFuzzy(ocrResults.cardName);
      if (fuzzyMatch) {
        console.log('✅ Found fuzzy name match');
        return { ...fuzzyMatch, matchType: 'fuzzy_name' };
      }
    }
    
    // Strategy 4: Set + Collector Number
    if (ocrResults.setCode && ocrResults.collectorNumber) {
      const collectorMatch = await this.searchScryfallByCollector(ocrResults.setCode, ocrResults.collectorNumber);
      if (collectorMatch) {
        console.log('✅ Found set + collector match');
        return { ...collectorMatch, matchType: 'set_collector' };
      }
    }
    
    console.log('⚠️ No Scryfall matches found');
    return null;
  }

  async searchScryfallExact(cardName) {
    const cacheKey = `exact:${cardName}`;
    if (this.requestCache.has(cacheKey)) {
      return this.requestCache.get(cacheKey);
    }
    
    try {
      await this.rateLimitWait();
      
      const response = await fetch(`${this.SCRYFALL_API}/cards/named?exact=${encodeURIComponent(cardName)}`);
      
      if (response.ok) {
        const card = await response.json();
        this.requestCache.set(cacheKey, card);
        return card;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Scryfall exact search failed:', error);
      return null;
    }
  }

  async searchScryfallWithSet(cardName, setCode) {
    const cacheKey = `set:${cardName}:${setCode}`;
    if (this.requestCache.has(cacheKey)) {
      return this.requestCache.get(cacheKey);
    }
    
    try {
      await this.rateLimitWait();
      
      const query = `"${cardName}" set:${setCode}`;
      const response = await fetch(`${this.SCRYFALL_API}/cards/search?q=${encodeURIComponent(query)}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.data && result.data.length > 0) {
          const card = result.data[0];
          this.requestCache.set(cacheKey, card);
          return card;
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Scryfall set search failed:', error);
      return null;
    }
  }

  async searchScryfallFuzzy(cardName) {
    const cacheKey = `fuzzy:${cardName}`;
    if (this.requestCache.has(cacheKey)) {
      return this.requestCache.get(cacheKey);
    }
    
    try {
      await this.rateLimitWait();
      
      const response = await fetch(`${this.SCRYFALL_API}/cards/named?fuzzy=${encodeURIComponent(cardName)}`);
      
      if (response.ok) {
        const card = await response.json();
        this.requestCache.set(cacheKey, card);
        return card;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Scryfall fuzzy search failed:', error);
      return null;
    }
  }

  async searchScryfallByCollector(setCode, collectorNumber) {
    const cacheKey = `collector:${setCode}:${collectorNumber}`;
    if (this.requestCache.has(cacheKey)) {
      return this.requestCache.get(cacheKey);
    }
    
    try {
      await this.rateLimitWait();
      
      const response = await fetch(`${this.SCRYFALL_API}/cards/${setCode}/${collectorNumber}`);
      
      if (response.ok) {
        const card = await response.json();
        this.requestCache.set(cacheKey, card);
        return card;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Scryfall collector search failed:', error);
      return null;
    }
  }

  async rateLimitWait() {
    await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
  }

  buildFinalResult(ocrResults, scryfallCard) {
    let confidence = 0;
    let cardData = {};
    
    if (scryfallCard) {
      // High confidence if we found the card in Scryfall
      confidence = this.calculateScryfallConfidence(ocrResults, scryfallCard);
      
      cardData = {
        id: scryfallCard.id,
        name: scryfallCard.name,
        manaCost: scryfallCard.mana_cost || '',
        cmc: scryfallCard.cmc || 0,
        type: scryfallCard.type_line || '',
        oracleText: scryfallCard.oracle_text || '',
        power: scryfallCard.power || null,
        toughness: scryfallCard.toughness || null,
        colors: scryfallCard.colors || [],
        colorIdentity: scryfallCard.color_identity || [],
        set: scryfallCard.set || '',
        setName: scryfallCard.set_name || '',
        collectorNumber: scryfallCard.collector_number || '',
        rarity: scryfallCard.rarity || '',
        artist: scryfallCard.artist || '',
        imageUris: scryfallCard.image_uris || {},
        prices: scryfallCard.prices || {},
        legalities: scryfallCard.legalities || {},
        matchType: scryfallCard.matchType,
        scryfallUri: scryfallCard.scryfall_uri || ''
      };
    } else {
      // Lower confidence if no Scryfall match
      confidence = this.calculateOCROnlyConfidence(ocrResults);
      
      cardData = {
        name: ocrResults.cardName || '',
        set: ocrResults.setCode || '',
        collectorNumber: ocrResults.collectorNumber || '',
        type: ocrResults.types?.join(' ') || '',
        power: ocrResults.power || null,
        toughness: ocrResults.toughness || null,
        matchType: 'ocr_only'
      };
    }
    
    return {
      ...cardData,
      confidence,
      ocrResults,
      scanTimestamp: new Date().toISOString(),
      processingTime: performance.now()
    };
  }

  calculateScryfallConfidence(ocrResults, scryfallCard) {
    let confidence = 60; // Base confidence for Scryfall match
    
    // Name similarity bonus
    if (ocrResults.cardName) {
      const nameSimilarity = this.calculateStringSimilarity(
        ocrResults.cardName.toLowerCase(),
        scryfallCard.name.toLowerCase()
      );
      confidence += nameSimilarity * 30;
    }
    
    // Set match bonus
    if (ocrResults.setCode && ocrResults.setCode === scryfallCard.set.toUpperCase()) {
      confidence += 10;
    }
    
    // Collector number match bonus
    if (ocrResults.collectorNumber && ocrResults.collectorNumber === scryfallCard.collector_number) {
      confidence += 10;
    }
    
    return Math.min(100, Math.round(confidence));
  }

  calculateOCROnlyConfidence(ocrResults) {
    let confidence = 0;
    
    if (ocrResults.nameConfidence) confidence += ocrResults.nameConfidence * 0.4;
    if (ocrResults.collectorConfidence) confidence += ocrResults.collectorConfidence * 0.3;
    if (ocrResults.typeConfidence) confidence += ocrResults.typeConfidence * 0.2;
    if (ocrResults.ptConfidence) confidence += ocrResults.ptConfidence * 0.1;
    
    return Math.min(100, Math.round(confidence));
  }

  calculateStringSimilarity(str1, str2) {
    if (str1 === str2) return 1;
    
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 0;
    
    const distance = this.levenshteinDistance(str1, str2);
    return (maxLength - distance) / maxLength;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  createErrorResult(error) {
    return {
      error: true,
      message: error.message,
      confidence: 0,
      scanTimestamp: new Date().toISOString()
    };
  }

  async terminate() {
    console.log('🛑 Terminating enhanced MTG scanner...');
    
    this.camera.stopCamera();
    
    if (this.ocrWorker) {
      await this.ocrWorker.terminate();
      this.ocrWorker = null;
    }
    
    this.requestCache.clear();
    this.isInitialized = false;
  }
}

// Enhanced Image Processor
class EnhancedImageProcessor {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // MTG card zones based on official card anatomy
    this.MTG_ZONES = {
      name: { x: 0.04, y: 0.04, width: 0.70, height: 0.10 },
      manaCost: { x: 0.75, y: 0.04, width: 0.21, height: 0.10 },
      typeLine: { x: 0.04, y: 0.58, width: 0.70, height: 0.08 },
      setSymbol: { x: 0.75, y: 0.58, width: 0.21, height: 0.08 },
      textBox: { x: 0.04, y: 0.67, width: 0.92, height: 0.20 },
      powerToughness: { x: 0.75, y: 0.88, width: 0.21, height: 0.08 },
      collector: { x: 0.04, y: 0.92, width: 0.92, height: 0.06 }
    };
  }

  async prepareImage(imageData) {
    // Convert various input types to canvas
    if (typeof imageData === 'string') {
      return await this.dataURLToCanvas(imageData);
    } else if (imageData instanceof HTMLImageElement) {
      return await this.imageElementToCanvas(imageData);
    } else if (imageData instanceof HTMLCanvasElement) {
      return imageData;
    }
    
    throw new Error('Unsupported image data type');
  }

  async dataURLToCanvas(dataURL) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        this.ctx.drawImage(img, 0, 0);
        resolve(this.canvas);
      };
      img.onerror = reject;
      img.src = dataURL;
    });
  }

  async imageElementToCanvas(img) {
    this.canvas.width = img.width;
    this.canvas.height = img.height;
    this.ctx.drawImage(img, 0, 0);
    return this.canvas;
  }

  async extractMTGZones(canvas) {
    const zones = {};
    
    // Standardize card to expected dimensions
    const standardCard = await this.standardizeCardSize(canvas);
    
    // Extract each zone
    for (const [zoneName, zoneConfig] of Object.entries(this.MTG_ZONES)) {
      zones[zoneName] = this.extractZone(standardCard, zoneConfig, zoneName);
    }
    
    return zones;
  }

  async standardizeCardSize(canvas) {
    const standardWidth = 600;
    const standardHeight = 840; // MTG aspect ratio: 63/88
    
    const newCanvas = document.createElement('canvas');
    const ctx = newCanvas.getContext('2d');
    
    newCanvas.width = standardWidth;
    newCanvas.height = standardHeight;
    
    // Maintain aspect ratio while fitting to standard size
    const sourceRatio = canvas.width / canvas.height;
    const targetRatio = standardWidth / standardHeight;
    
    if (sourceRatio > targetRatio) {
      // Source is wider - fit height and center crop width
      const targetWidth = canvas.height * targetRatio;
      const offsetX = (canvas.width - targetWidth) / 2;
      ctx.drawImage(
        canvas,
        offsetX, 0, targetWidth, canvas.height,
        0, 0, standardWidth, standardHeight
      );
    } else {
      // Source is taller - fit width and center crop height
      const targetHeight = canvas.width / targetRatio;
      const offsetY = (canvas.height - targetHeight) / 2;
      ctx.drawImage(
        canvas,
        0, offsetY, canvas.width, targetHeight,
        0, 0, standardWidth, standardHeight
      );
    }
    
    return newCanvas;
  }

  extractZone(canvas, zoneConfig, zoneName) {
    const zoneCanvas = document.createElement('canvas');
    const ctx = zoneCanvas.getContext('2d');
    
    const x = Math.floor(canvas.width * zoneConfig.x);
    const y = Math.floor(canvas.height * zoneConfig.y);
    const width = Math.floor(canvas.width * zoneConfig.width);
    const height = Math.floor(canvas.height * zoneConfig.height);
    
    // Ensure minimum size for OCR
    const minWidth = 100;
    const minHeight = 30;
    
    const finalWidth = Math.max(width, minWidth);
    const finalHeight = Math.max(height, minHeight);
    
    zoneCanvas.width = finalWidth;
    zoneCanvas.height = finalHeight;
    
    // Scale up for better OCR
    const scale = 2;
    const scaledCanvas = document.createElement('canvas');
    const scaledCtx = scaledCanvas.getContext('2d');
    
    scaledCanvas.width = finalWidth * scale;
    scaledCanvas.height = finalHeight * scale;
    
    // Draw original zone
    ctx.drawImage(canvas, x, y, width, height, 0, 0, finalWidth, finalHeight);
    
    // Scale up
    scaledCtx.imageSmoothingEnabled = false;
    scaledCtx.drawImage(zoneCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
    
    // Apply OCR-friendly processing
    return this.processForOCR(scaledCanvas, zoneName);
  }

  processForOCR(canvas, zoneName) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Convert to grayscale and enhance contrast
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      
      // Zone-specific processing
      let enhanced;
      if (zoneName === 'name' || zoneName === 'typeLine') {
        // Text zones - high contrast
        enhanced = gray > 140 ? 255 : 0;
      } else if (zoneName === 'powerToughness') {
        // P/T box - different threshold
        enhanced = gray > 120 ? 255 : 0;
      } else {
        // Default processing
        enhanced = gray > 130 ? 255 : 0;
      }
      
      data[i] = data[i + 1] = data[i + 2] = enhanced;
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }
}

export { EnhancedScannerCamera, EnhancedMTGScanner, EnhancedImageProcessor };