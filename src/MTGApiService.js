/**
 * Enhanced MTG API Service with Bulk Data Integration
 * Combines local bulk dataset with Scryfall API for optimal performance
 */

import bulkDataService from './BulkDataService';

class MTGApiService {
    constructor() {
        this.baseUrl = 'https://api.scryfall.com';
        this.requestQueue = [];
        this.isProcessingQueue = false;
        this.rateLimitDelay = 100; // 100ms between requests
        this.cache = new Map();
        this.cacheExpiry = 1000 * 60 * 30; // 30 minutes
        
        console.log('🃏 MTGApiService enhanced with bulk data integration');
    }

    /**
     * Initialize the service - CALL THIS WHEN APP STARTS
     */
    async initialize() {
        try {
            console.log('🚀 Initializing enhanced MTG API service...');
            
            // Initialize bulk data service
            await bulkDataService.initialize();
            
            console.log('✅ MTG API Service ready with bulk data support');
            
            // ✅ TRIGGER: Notify ClaudeVisionService that database is ready
            this.notifyClaudeVisionServiceReady();
            
            return true;
            
        } catch (error) {
            console.error('❌ Failed to initialize MTG API service:', error);
            console.log('⚠️ Falling back to API-only mode');
            return false;
        }
    }

    /**
     * ✅ NEW: Notify ClaudeVisionService that database is ready
     */
    notifyClaudeVisionServiceReady() {
        try {
            // Method 1: Direct function call
            if (window.notifyClaudeVisionDatabaseReady) {
                console.log('🎉 Notifying ClaudeVisionService that database is ready...');
                window.notifyClaudeVisionDatabaseReady();
            }
            
            // Method 2: Direct service access
            if (window.claudeVisionService && typeof window.claudeVisionService.reconnectDatabase === 'function') {
                console.log('🔄 Directly triggering ClaudeVisionService reconnection...');
                window.claudeVisionService.reconnectDatabase().then(success => {
                    if (success) {
                        console.log('✅ ClaudeVisionService successfully connected to database!');
                    } else {
                        console.log('❌ ClaudeVisionService connection failed');
                    }
                }).catch(err => {
                    console.error('❌ ClaudeVisionService reconnection error:', err);
                });
            }
            
            // Method 3: Set global flag
            window.mtgDatabaseReady = true;
            
            // Method 4: Dispatch custom event
            if (typeof window !== 'undefined' && window.dispatchEvent) {
                const event = new CustomEvent('mtgDatabaseReady', { 
                    detail: { 
                        cardCount: bulkDataService.getStats().cardCount,
                        source: 'MTGApiService'
                    } 
                });
                window.dispatchEvent(event);
                console.log('📡 Dispatched mtgDatabaseReady event');
            }
            
        } catch (error) {
            console.error('❌ Error notifying ClaudeVisionService:', error);
        }
    }

    /**
     * MAIN METHOD: Find card with enhanced OCR support
     * This is what you'll call from ClaudeVisionService.js
     */
    async findCardWithOCR(ocrText, ocrConfidence = 0) {
        try {
            console.log(`🎯 Finding card for OCR text: "${ocrText}" (confidence: ${(ocrConfidence * 100).toFixed(1)}%)`);
            
            // Strategy 1: If OCR confidence is high, try exact API search first
            if (ocrConfidence >= 0.7) {
                console.log('🎯 High confidence - trying exact API search first');
                const apiResult = await this.searchCardByName(ocrText);
                if (apiResult) {
                    console.log(`✅ Found via API: ${apiResult.name}`);
                    return {
                        card: apiResult,
                        method: 'api_exact',
                        confidence: ocrConfidence,
                        alternatives: []
                    };
                }
            }
            
            // Strategy 2: Use bulk data fuzzy matching
            if (bulkDataService.isInitialized) {
                console.log('🔍 Using bulk data fuzzy matching...');
                
                const fuzzyMatches = bulkDataService.findFuzzyMatches(ocrText, {
                    maxResults: 5,
                    minSimilarity: ocrConfidence >= 0.3 ? 0.4 : 0.2, // Lower threshold for low OCR confidence
                    exactMatchFirst: true
                });
                
                if (fuzzyMatches.length > 0) {
                    const bestMatch = fuzzyMatches[0];
                    console.log(`✅ Best fuzzy match: ${bestMatch.card.name} (${(bestMatch.similarity * 100).toFixed(1)}% similarity)`);
                    
                    return {
                        card: bestMatch.card,
                        method: 'bulk_fuzzy',
                        confidence: bestMatch.similarity,
                        ocrConfidence: ocrConfidence,
                        alternatives: fuzzyMatches.slice(1)
                    };
                }
            }
            
            // Strategy 3: Fallback to API fuzzy search
            console.log('🌐 Fallback to API fuzzy search...');
            const apiResults = await this.fuzzySearchByName(ocrText);
            
            if (apiResults.length > 0) {
                console.log(`✅ Found via API fuzzy search: ${apiResults[0].name}`);
                return {
                    card: apiResults[0],
                    method: 'api_fuzzy',
                    confidence: 0.6, // Moderate confidence for API fuzzy
                    ocrConfidence: ocrConfidence,
                    alternatives: apiResults.slice(1).map(card => ({ card, similarity: 0.5 }))
                };
            }
            
            console.log('❌ No matches found for OCR text');
            return null;
            
        } catch (error) {
            console.error('❌ Error in findCardWithOCR:', error);
            return null;
        }
    }

    /**
     * Search for card by exact name (API)
     */
    async searchCardByName(name) {
        try {
            const cacheKey = `exact_${name.toLowerCase()}`;
            
            // Check cache first
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheExpiry) {
                    return cached.data;
                }
            }
            
            const encodedName = encodeURIComponent(name);
            const url = `${this.baseUrl}/cards/named?exact=${encodedName}`;
            
            const response = await this.makeRequest(url);
            
            if (response && response.object === 'card') {
                // Cache the result
                this.cache.set(cacheKey, {
                    data: response,
                    timestamp: Date.now()
                });
                
                return response;
            }
            
            return null;
            
        } catch (error) {
            console.error('Error searching by exact name:', error);
            return null;
        }
    }

    /**
     * Fuzzy search by name (API)
     */
    async fuzzySearchByName(name) {
        try {
            const cacheKey = `fuzzy_${name.toLowerCase()}`;
            
            // Check cache first
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheExpiry) {
                    return cached.data;
                }
            }
            
            const encodedName = encodeURIComponent(name);
            const url = `${this.baseUrl}/cards/named?fuzzy=${encodedName}`;
            
            const response = await this.makeRequest(url);
            
            if (response && response.object === 'card') {
                const results = [response];
                
                // Cache the result
                this.cache.set(cacheKey, {
                    data: results,
                    timestamp: Date.now()
                });
                
                return results;
            }
            
            return [];
            
        } catch (error) {
            console.error('Error in fuzzy search:', error);
            return [];
        }
    }

    /**
     * Get card by Scryfall ID
     */
    async getCardById(id) {
        try {
            const cacheKey = `id_${id}`;
            
            // Check cache first
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheExpiry) {
                    return cached.data;
                }
            }
            
            const url = `${this.baseUrl}/cards/${id}`;
            const response = await this.makeRequest(url);
            
            if (response && response.object === 'card') {
                // Cache the result
                this.cache.set(cacheKey, {
                    data: response,
                    timestamp: Date.now()
                });
                
                return response;
            }
            
            return null;
            
        } catch (error) {
            console.error('Error getting card by ID:', error);
            return null;
        }
    }

    /**
     * Make HTTP request with rate limiting and error handling
     */
    async makeRequest(url) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ url, resolve, reject });
            this.processQueue();
        });
    }

    /**
     * Process request queue with rate limiting
     */
    async processQueue() {
        if (this.isProcessingQueue || this.requestQueue.length === 0) {
            return;
        }
        
        this.isProcessingQueue = true;
        
        while (this.requestQueue.length > 0) {
            const { url, resolve, reject } = this.requestQueue.shift();
            
            try {
                const response = await fetch(url, {
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'MTGScanner/1.0'
                    }
                });
                
                if (!response.ok) {
                    if (response.status === 404) {
                        resolve(null);
                    } else {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                } else {
                    const data = await response.json();
                    resolve(data);
                }
                
            } catch (error) {
                console.error(`Request failed for ${url}:`, error);
                reject(error);
            }
            
            // Rate limiting delay
            if (this.requestQueue.length > 0) {
                await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
            }
        }
        
        this.isProcessingQueue = false;
    }

    /**
     * Get card price information
     */
    getCardPrices(card) {
        if (!card || !card.prices) {
            return {
                usd: null,
                usd_foil: null,
                eur: null,
                tix: null
            };
        }
        
        return {
            usd: card.prices.usd ? parseFloat(card.prices.usd) : null,
            usd_foil: card.prices.usd_foil ? parseFloat(card.prices.usd_foil) : null,
            eur: card.prices.eur ? parseFloat(card.prices.eur) : null,
            tix: card.prices.tix ? parseFloat(card.prices.tix) : null
        };
    }

    /**
     * Enhanced card data formatting for your dataset
     */
    formatCardForDataset(card, matchInfo = {}) {
        return {
            // Basic Info
            id: card.id,
            name: card.name,
            set: card.set.toUpperCase(),
            set_name: card.set_name,
            collector_number: card.collector_number,
            rarity: card.rarity,
            
            // Type Info
            type_line: card.type_line,
            mana_cost: card.mana_cost || '',
            cmc: card.cmc || 0,
            
            // Card Text
            oracle_text: card.oracle_text || '',
            flavor_text: card.flavor_text || '',
            
            // Power/Toughness (for creatures)
            power: card.power || null,
            toughness: card.toughness || null,
            
            // Colors
            colors: card.colors || [],
            color_identity: card.color_identity || [],
            
            // Prices
            prices: this.getCardPrices(card),
            
            // Images
            image_uris: card.image_uris || {},
            
            // Legalities
            legalities: card.legalities || {},
            
            // Match metadata (for OCR tracking)
            match_method: matchInfo.method || 'unknown',
            match_confidence: matchInfo.confidence || 0,
            ocr_confidence: matchInfo.ocrConfidence || 0,
            scan_timestamp: new Date().toISOString(),
            
            // Additional useful fields
            layout: card.layout,
            frame: card.frame,
            border_color: card.border_color,
            lang: card.lang || 'en',
            released_at: card.released_at,
            scryfall_uri: card.scryfall_uri
        };
    }

    /**
     * Bulk data service status
     */
    getBulkDataStatus() {
        return bulkDataService.getStats();
    }

    /**
     * Force refresh bulk data
     */
    async refreshBulkData() {
        return await bulkDataService.forceRefresh();
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🗑️ API cache cleared');
    }

    /**
     * Get service statistics
     */
    getStats() {
        return {
            cacheSize: this.cache.size,
            queueLength: this.requestQueue.length,
            isProcessingQueue: this.isProcessingQueue,
            bulkDataStatus: this.getBulkDataStatus()
        };
    }
}

// Export singleton instance
const mtgApiService = new MTGApiService();
export default mtgApiService;