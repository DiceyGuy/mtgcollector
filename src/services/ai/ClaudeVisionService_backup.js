
// ClaudeVisionService.js - RAW OCR WITHOUT PREPROCESSING
// Location: C:\Users\kim-a\Documents\DiceyTeck\MTG Scanner\ClaudeVisionService.js (ROOT directory)

import { createWorker } from 'tesseract.js';

class ClaudeVisionService {
    constructor() {
        this.worker = null;
        this.isInitialized = false;
        this.cardDatabase = null;
        
        // ✅ SMART: Multiple zones to try (without preprocessing)
        this.cardZones = [
            { name: 'top_left', x: 0.04, y: 0.04, width: 0.70, height: 0.12 },    // Traditional
            { name: 'higher_up', x: 0.06, y: 0.02, width: 0.75, height: 0.10 },   // Higher
            { name: 'wider_area', x: 0.02, y: 0.05, width: 0.80, height: 0.15 },  // Wider
            { name: 'full_top', x: 0.00, y: 0.00, width: 1.00, height: 0.25 }     // Full top
        ];
        
        console.log('🧠 RAW ClaudeVisionService: No preprocessing, pure OCR');
    }

    async initialize() {
        try {
            console.log('🚀 Initializing RAW ClaudeVisionService...');
            
            this.worker = await createWorker('eng');
            
            // ✅ SIMPLE: Basic OCR settings, let Tesseract handle the image
            await this.worker.setParameters({
                tesseract_pageseg_mode: '6' // Single uniform block of text
            });
            
            // Load database
            await this.loadCardDatabase();
            
            this.isInitialized = true;
            console.log('✅ RAW ClaudeVisionService ready!');
            
        } catch (error) {
            console.error('❌ RAW initialization failed:', error);
            throw error;
        }
    }

    // ✅ QUICK FIX: Reconnect to database when it becomes available
    async reconnectDatabase() {
        try {
            console.log('🔄 Attempting to reconnect to database...');
            
            // Try to get from global BulkDataService instance
            if (window.bulkDataService && typeof window.bulkDataService.getAllCards === 'function') {
                console.log('📚 Found BulkDataService, connecting...');
                this.cardDatabase = await window.bulkDataService.getAllCards();
                console.log(`✅ Reconnected to database: ${this.cardDatabase.length} cards`);
                return true;
            }
            
            console.log('❌ BulkDataService still not available');
            return false;
            
        } catch (error) {
            console.error('❌ Database reconnection failed:', error);
            return false;
        }
    }

    // ✅ FIXED: Connect to BulkDataService properly
    async loadCardDatabase() {
        try {
            console.log('📚 Loading card database...');
            
            // ✅ METHOD 1: Try to get from global BulkDataService instance
            if (window.bulkDataService && typeof window.bulkDataService.getAllCards === 'function') {
                console.log('📚 Found global BulkDataService, getting cards...');
                this.cardDatabase = await window.bulkDataService.getAllCards();
                console.log(`✅ Connected to global database: ${this.cardDatabase.length} cards`);
                return;
            }
            
            // ✅ METHOD 2: Try to access existing BulkDataService from root
            try {
                const { default: BulkDataService } = await import('../../../BulkDataService.js');
                if (BulkDataService && typeof BulkDataService === 'function') {
                    console.log('📚 Creating new BulkDataService instance...');
                    const bulkService = new BulkDataService();
                    this.cardDatabase = await bulkService.getAllCards();
                    console.log(`✅ Created new database connection: ${this.cardDatabase.length} cards`);
                    return;
                }
            } catch (importError) {
                console.warn('⚠️ BulkDataService import failed:', importError);
            }
            
            // ✅ METHOD 3: Set up listener for when database becomes ready
            console.log('🔄 Setting up database listener...');
            
            // Listen for database ready event
            const checkDatabase = () => {
                if (window.bulkDataService) {
                    console.log('🎉 Database became available, reconnecting...');
                    this.reconnectDatabase();
                }
            };
            
            // Check periodically (fallback)
            const intervalId = setInterval(async () => {
                const connected = await this.reconnectDatabase();
                if (connected) {
                    clearInterval(intervalId);
                }
            }, 2000);
            
            // Clean up after 30 seconds
            setTimeout(() => {
                clearInterval(intervalId);
                console.log('⏰ Database connection timeout, continuing with OCR-only');
            }, 30000);
            
            // ✅ IMMEDIATE: Set up global notification system
            window.claudeVisionService = this;
            
            // ✅ GLOBAL: Set up callback for when database becomes ready
            window.notifyClaudeVisionDatabaseReady = () => {
                console.log('🎉 Received database ready notification!');
                this.reconnectDatabase().then(success => {
                    if (success) {
                        console.log('🎉 Successfully connected to database via notification!');
                    }
                }).catch(err => {
                    console.error('❌ Database reconnection via notification failed:', err);
                });
            };
            
            // ✅ FALLBACK: OCR-only mode for now
            console.log('📝 Starting in OCR-only mode, will connect to database when available');
            this.cardDatabase = null;
            
        } catch (error) {
            console.warn('⚠️ Database loading failed:', error);
            this.cardDatabase = null;
        }
    }

    // ✅ MAIN: Smart analysis without preprocessing
    async analyzeImage(canvas, cardType = 'normal') {
        if (!this.isInitialized) {
            throw new Error('RAW ClaudeVisionService not initialized');
        }

        try {
            console.log('🎯 RAW card analysis starting...');
            const startTime = performance.now();

            // ✅ SMART: Try multiple zones until we find text
            let bestResult = null;
            let bestConfidence = 0;

            for (const zone of this.cardZones) {
                console.log(`🔍 Trying zone: ${zone.name}`);
                
                const zoneResult = await this.tryZoneOCR(canvas, zone);
                
                if (zoneResult.confidence > bestConfidence && zoneResult.text.length > 2) {
                    bestResult = zoneResult;
                    bestConfidence = zoneResult.confidence;
                    console.log(`✅ Better result in ${zone.name}: "${zoneResult.text}" (${zoneResult.confidence}%)`);
                }
                
                // If we get good confidence, stop searching
                if (bestConfidence > 60) {
                    console.log(`🎯 Good confidence reached, stopping search`);
                    break;
                }
            }

            const endTime = performance.now();
            
            if (!bestResult || !bestResult.text) {
                console.log('❌ No text found in any zone');
                return {
                    success: false,
                    cardName: 'No Text Found',
                    confidence: 0,
                    method: 'no_text',
                    processingTime: endTime - startTime
                };
            }

            // ✅ SMART: Clean and search database
            const smartResult = await this.smartCardLookup(bestResult.text);
            
            console.log(`🎯 RAW analysis complete: ${(endTime - startTime).toFixed(0)}ms`);
            
            return {
                success: true,
                cardName: smartResult.name,
                confidence: smartResult.confidence,
                method: smartResult.method,
                ocrText: bestResult.text,
                ocrConfidence: bestResult.confidence,
                cardData: smartResult.cardData,
                alternatives: smartResult.alternatives || [],
                processingTime: endTime - startTime,
                datasetEntry: smartResult.cardData
            };

        } catch (error) {
            console.error('❌ RAW analysis failed:', error);
            return {
                success: false,
                error: error.message,
                confidence: 0,
                cardName: 'Scan Failed',
                method: 'error'
            };
        }
    }

    // ✅ CORE: Try OCR on specific zone WITHOUT any preprocessing
    async tryZoneOCR(canvas, zone) {
        try {
            // ✅ RAW: Extract zone without any image processing
            const zoneCanvas = this.extractRawZone(canvas, zone);
            
            console.log(`🔍 OCR on ${zone.name}: ${zoneCanvas.width}x${zoneCanvas.height}`);
            
            // ✅ RAW: Give original pixels to Tesseract
            const { data: { text, confidence } } = await this.worker.recognize(zoneCanvas);
            
            const cleanText = text.trim();
            console.log(`📝 ${zone.name}: "${cleanText}" (${confidence}%)`);
            
            return {
                text: cleanText,
                confidence: confidence || 0,
                zone: zone.name
            };
            
        } catch (error) {
            console.error(`❌ OCR failed for ${zone.name}:`, error);
            return {
                text: '',
                confidence: 0,
                zone: zone.name
            };
        }
    }

    // ✅ RAW: Extract zone without any image manipulation
    extractRawZone(canvas, zone) {
        const zoneCanvas = document.createElement('canvas');
        const ctx = zoneCanvas.getContext('2d');
        
        // Calculate zone coordinates
        const x = Math.floor(canvas.width * zone.x);
        const y = Math.floor(canvas.height * zone.y);
        const width = Math.floor(canvas.width * zone.width);
        const height = Math.floor(canvas.height * zone.height);
        
        zoneCanvas.width = width;
        zoneCanvas.height = height;
        
        // ✅ RAW: Copy pixels directly without any processing
        ctx.drawImage(
            canvas,
            x, y, width, height,  // Source
            0, 0, width, height   // Destination
        );
        
        console.log(`🎯 Extracted RAW zone ${zone.name}: ${width}x${height} from (${x},${y})`);
        
        // ✅ DEBUG: Show what we're actually reading
        if (console.debug) {
            try {
                const dataUrl = zoneCanvas.toDataURL();
                console.log(`🔍 RAW Zone Preview (${zone.name}):`, dataUrl.substring(0, 50) + '...');
            } catch (e) {
                // Ignore preview errors
            }
        }
        
        return zoneCanvas;
    }

    // ✅ SMART: Clean text and search database
    async smartCardLookup(rawText) {
        try {
            console.log(`🧠 Smart lookup for: "${rawText}"`);
            
            // ✅ SMART: Check if database became available since initialization
            if (!this.cardDatabase && window.bulkDataService) {
                console.log('🔄 Database now available, reconnecting...');
                await this.reconnectDatabase();
            }
            
            // ✅ SMART: Extract card name intelligently
            const cardName = this.extractCardNameFromOCR(rawText);
            console.log(`🎯 Extracted card name: "${cardName}"`);
            
            // ✅ SMART: Search database if available and we have a good name
            if (this.cardDatabase && this.cardDatabase.length > 0 && cardName.length > 2) {
                console.log(`🔍 Searching database with ${this.cardDatabase.length} cards for: "${cardName}"`);
                const dbMatch = this.searchDatabase(cardName);
                
                if (dbMatch && dbMatch.confidence > 0.6) {
                    console.log(`✅ Database match: ${dbMatch.name} (${(dbMatch.confidence * 100).toFixed(1)}%)`);
                    return {
                        name: dbMatch.name,
                        confidence: Math.min(95, dbMatch.confidence * 100),
                        method: 'database_match',
                        cardData: dbMatch.cardData,
                        alternatives: []
                    };
                } else {
                    console.log(`❌ No good database match found (best confidence: ${dbMatch ? (dbMatch.confidence * 100).toFixed(1) : 0}%)`);
                }
            } else {
                if (!this.cardDatabase) {
                    console.log('❌ No database available for smart lookup');
                } else {
                    console.log(`❌ Card name too short for database search: "${cardName}"`);
                }
            }
            
            // ✅ FALLBACK: Use extracted card name
            const fallbackName = cardName || 'Unknown Card';
            return {
                name: fallbackName,
                confidence: Math.max(15, cardName.length > 0 ? 35 : 0),
                method: 'extracted_name',
                cardData: {
                    name: fallbackName,
                    set: 'Unknown'
                },
                alternatives: []
            };
            
        } catch (error) {
            console.error('❌ Smart lookup failed:', error);
            return {
                name: rawText || 'Lookup Failed',
                confidence: 5,
                method: 'fallback',
                cardData: null,
                alternatives: []
            };
        }
    }

    // ✅ SMART: Extract meaningful card name from OCR noise
    extractCardNameFromOCR(rawText) {
        if (!rawText) return '';
        
        console.log(`🎯 Extracting card name from: "${rawText}"`);
        
        // Split into words and analyze each one
        const words = rawText.split(/[\s\n\r]+/).filter(word => word.length > 0);
        const cardNameWords = [];
        
        for (const word of words) {
            // Clean the word
            const cleanWord = word.replace(/[^a-zA-Z'-]/g, '');
            
            // Skip if too short or looks like noise
            if (cleanWord.length < 2) continue;
            if (/^[A-Z]{1}$/.test(cleanWord)) continue; // Single capital letters
            if (/^\d+$/.test(word)) continue; // Pure numbers
            
            // Add meaningful words
            cardNameWords.push(cleanWord);
            
            // Stop if we have enough words for a card name (most MTG cards are 1-3 words)
            if (cardNameWords.length >= 4) break;
        }
        
        const extracted = cardNameWords.join(' ');
        console.log(`🎯 Extracted card name: "${extracted}"`);
        return extracted;
    }

    // ✅ ENHANCED: Smart database search with multiple strategies
    searchDatabase(searchText) {
        if (!this.cardDatabase || !searchText) return null;
        
        const searchLower = searchText.toLowerCase().trim();
        console.log(`🔍 Enhanced database search for: "${searchLower}"`);
        
        // ✅ STRATEGY 1: Exact match (highest confidence)
        for (const card of this.cardDatabase) {
            if (card.name && card.name.toLowerCase() === searchLower) {
                console.log(`🎯 EXACT match: ${card.name}`);
                return {
                    name: card.name,
                    confidence: 0.98,
                    cardData: this.formatCardData(card)
                };
            }
        }
        
        // ✅ STRATEGY 2: Starts with (very high confidence)
        for (const card of this.cardDatabase) {
            if (card.name && card.name.toLowerCase().startsWith(searchLower)) {
                console.log(`🎯 STARTS WITH match: ${card.name}`);
                return {
                    name: card.name,
                    confidence: 0.90,
                    cardData: this.formatCardData(card)
                };
            }
        }
        
        // ✅ STRATEGY 3: Contains all words (high confidence)
        const searchWords = searchLower.split(' ').filter(word => word.length > 1);
        if (searchWords.length > 1) {
            for (const card of this.cardDatabase) {
                if (card.name) {
                    const cardNameLower = card.name.toLowerCase();
                    const hasAllWords = searchWords.every(word => cardNameLower.includes(word));
                    
                    if (hasAllWords) {
                        console.log(`🎯 ALL WORDS match: ${card.name}`);
                        return {
                            name: card.name,
                            confidence: 0.85,
                            cardData: this.formatCardData(card)
                        };
                    }
                }
            }
        }
        
        // ✅ STRATEGY 4: First word match (medium confidence)
        const firstWord = searchWords[0];
        if (firstWord && firstWord.length > 3) {
            for (const card of this.cardDatabase) {
                if (card.name && card.name.toLowerCase().startsWith(firstWord)) {
                    console.log(`🎯 FIRST WORD match: ${card.name}`);
                    return {
                        name: card.name,
                        confidence: 0.75,
                        cardData: this.formatCardData(card)
                    };
                }
            }
        }
        
        // ✅ STRATEGY 5: Contains any significant word (lower confidence)
        for (const word of searchWords) {
            if (word.length > 4) { // Only check longer words
                for (const card of this.cardDatabase) {
                    if (card.name && card.name.toLowerCase().includes(word)) {
                        console.log(`🎯 PARTIAL match: ${card.name} (contains "${word}")`);
                        return {
                            name: card.name,
                            confidence: 0.65,
                            cardData: this.formatCardData(card)
                        };
                    }
                }
            }
        }
        
        console.log('❌ No database match found with any strategy');
        return null;
    }

    // ✅ HELPER: Format card data consistently
    formatCardData(card) {
        return {
            name: card.name,
            set: card.set_name || card.set || 'Unknown',
            collector_number: card.collector_number,
            rarity: card.rarity,
            price_usd: card.prices?.usd || null,
            image_normal: card.image_uris?.normal || null,
            scryfall_id: card.id
        };
    }

    // ✅ SIMPLE: Cleanup
    async terminate() {
        try {
            console.log('🧹 Terminating RAW ClaudeVisionService...');
            
            if (this.worker) {
                await this.worker.terminate();
                this.worker = null;
            }
            
            this.isInitialized = false;
            this.cardDatabase = null;
            
            console.log('✅ RAW ClaudeVisionService terminated');
        } catch (error) {
            console.error('❌ Termination error:', error);
        }
    }

    // ✅ DEBUG: Get status with reconnection attempt
    getStatus() {
        // Try to reconnect if database is now available
        if (!this.cardDatabase && window.bulkDataService) {
            console.log('🔄 Database detected during status check, attempting reconnection...');
            this.reconnectDatabase().catch(err => console.warn('Reconnection failed:', err));
        }
        
        return {
            initialized: this.isInitialized,
            databaseLoaded: !!this.cardDatabase,
            cardCount: this.cardDatabase?.length || 0,
            zonesAvailable: this.cardZones.length,
            bulkServiceAvailable: !!window.bulkDataService,
            reconnectionAvailable: !this.cardDatabase && !!window.bulkDataService
        };
    }

    // ✅ HELPER: Manual database check (for debugging)
    async checkDatabaseConnection() {
        console.log('🔍 Manual database connection check...');
        console.log('- this.cardDatabase:', !!this.cardDatabase);
        console.log('- window.bulkDataService:', !!window.bulkDataService);
        
        if (window.bulkDataService) {
            console.log('- bulkDataService.getAllCards:', typeof window.bulkDataService.getAllCards);
        }
        
        if (!this.cardDatabase && window.bulkDataService) {
            console.log('🔄 Attempting manual reconnection...');
            const result = await this.reconnectDatabase();
            console.log('🔄 Reconnection result:', result);
            return result;
        }
        
        return !!this.cardDatabase;
    }
}

export default ClaudeVisionService;