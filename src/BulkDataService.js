/**
 * Enhanced Bulk Data Service with ClaudeVisionService Integration
 * Downloads and manages local MTG card database with smart triggering
 */

class BulkDataService {
    constructor() {
        this.cards = [];
        this.cardMap = new Map(); // For fast lookups
        this.isInitialized = false;
        this.lastUpdated = null;
        this.dataUrl = null;
        this.updateCheckInterval = 24 * 60 * 60 * 1000; // 24 hours
        
        console.log('🗃️ BulkDataService initialized (fixed version)');
    }

    /**
     * Initialize the bulk data service
     */
    async initialize() {
        try {
            console.log('🚀 Initializing BulkDataService...');
            
            // Check if we already have data in memory
            if (this.cards.length > 0) {
                console.log('✅ Using existing bulk data');
                this.isInitialized = true;
                
                // ✅ TRIGGER: Notify ClaudeVisionService
                this.notifyClaudeVisionServiceReady();
                return;
            }
            
            // Try to load from localStorage first
            const cachedData = this.loadFromCache();
            if (cachedData) {
                this.cards = cachedData.cards;
                this.lastUpdated = new Date(cachedData.lastUpdated);
                this.buildCardMap();
                this.isInitialized = true;
                
                console.log(`✅ Loaded ${this.cards.length} cards from cache`);
                
                // ✅ TRIGGER: Notify ClaudeVisionService 
                this.notifyClaudeVisionServiceReady();
                
                // Check if we need to update in background
                if (this.shouldUpdate()) {
                    console.log('🔄 Cache is old, updating in background...');
                    this.downloadAndUpdate().catch(err => 
                        console.warn('Background update failed:', err)
                    );
                }
                
                return;
            }
            
            // No cached data, need to download
            console.log('📥 No cached data found, downloading bulk data...');
            await this.downloadAndUpdate();
            
        } catch (error) {
            console.error('❌ Failed to initialize BulkDataService:', error);
            this.isInitialized = false;
        }
    }

    /**
     * ✅ NEW: Notify ClaudeVisionService that database is ready
     */
    notifyClaudeVisionServiceReady() {
        try {
            console.log('🎉 BulkDataService: Notifying ClaudeVisionService that database is ready...');
            
            // Method 1: Direct function call
            if (window.notifyClaudeVisionDatabaseReady) {
                console.log('📞 Calling notifyClaudeVisionDatabaseReady...');
                window.notifyClaudeVisionDatabaseReady();
            }
            
            // Method 2: Direct service access
            if (window.claudeVisionService && typeof window.claudeVisionService.reconnectDatabase === 'function') {
                console.log('🔗 Directly calling ClaudeVisionService.reconnectDatabase...');
                window.claudeVisionService.reconnectDatabase().then(success => {
                    if (success) {
                        console.log('✅ ClaudeVisionService successfully connected to database via BulkDataService!');
                    } else {
                        console.log('❌ ClaudeVisionService connection failed');
                    }
                }).catch(err => {
                    console.error('❌ ClaudeVisionService reconnection error:', err);
                });
            }
            
            // Method 3: Set global flags
            window.bulkDataService = this;
            window.mtgDatabaseReady = true;
            
            // Method 4: Dispatch custom event
            if (typeof window !== 'undefined' && window.dispatchEvent) {
                const event = new CustomEvent('bulkDataReady', { 
                    detail: { 
                        cardCount: this.cards.length,
                        source: 'BulkDataService',
                        lastUpdated: this.lastUpdated
                    } 
                });
                window.dispatchEvent(event);
                console.log('📡 Dispatched bulkDataReady event');
            }
            
            // Method 5: Console notification for debugging
            console.log(`🎯 Database notification complete: ${this.cards.length} cards available for ClaudeVisionService`);
            
        } catch (error) {
            console.error('❌ Error notifying ClaudeVisionService from BulkDataService:', error);
        }
    }

    /**
     * Download and update bulk data
     */
    async downloadAndUpdate() {
        try {
            console.log('📥 Downloading bulk data from Scryfall...');
            
            // Get bulk data info
            const bulkDataResponse = await fetch('https://api.scryfall.com/bulk-data');
            const bulkDataInfo = await bulkDataResponse.json();
            
            // Find the default cards bulk data
            const defaultCards = bulkDataInfo.data.find(item => item.type === 'default_cards');
            if (!defaultCards) {
                throw new Error('Default cards bulk data not found');
            }
            
            this.dataUrl = defaultCards.download_uri;
            console.log('📥 Downloading card data...');
            
            // Download the actual data
            const cardsResponse = await fetch(this.dataUrl);
            const cardsData = await cardsResponse.json();
            
            // Process and store
            this.cards = this.processCardData(cardsData);
            this.lastUpdated = new Date();
            this.buildCardMap();
            this.isInitialized = true;
            
            // Cache for next time
            this.saveToCache();
            
            console.log(`🧠 Loaded ${this.cards.length} cards into memory`);
            console.log(`✅ BulkDataService ready with ${this.cards.length} cards`);
            
            // ✅ TRIGGER: Notify ClaudeVisionService
            this.notifyClaudeVisionServiceReady();
            
        } catch (error) {
            console.error('❌ Failed to download bulk data:', error);
            throw error;
        }
    }

    /**
     * Process raw card data from Scryfall
     */
    processCardData(rawCards) {
        console.log(`🔄 Processing ${rawCards.length} raw cards...`);
        
        const processedCards = rawCards
            .filter(card => {
                // Filter out tokens, schemes, etc. - keep only real cards
                return card.set_type !== 'token' && 
                       card.set_type !== 'memorabilia' &&
                       card.layout !== 'token' &&
                       card.layout !== 'emblem' &&
                       card.type_line && 
                       card.name;
            })
            .map(card => ({
                // Essential fields for ClaudeVisionService
                id: card.id,
                name: card.name,
                set: card.set,
                set_name: card.set_name,
                collector_number: card.collector_number,
                rarity: card.rarity,
                type_line: card.type_line,
                mana_cost: card.mana_cost || '',
                cmc: card.cmc || 0,
                colors: card.colors || [],
                color_identity: card.color_identity || [],
                prices: card.prices || {},
                image_uris: card.image_uris || {},
                oracle_text: card.oracle_text || '',
                power: card.power || null,
                toughness: card.toughness || null,
                legalities: card.legalities || {},
                released_at: card.released_at,
                layout: card.layout,
                frame: card.frame || '2015',
                border_color: card.border_color || 'black',
                lang: card.lang || 'en',
                scryfall_uri: card.scryfall_uri
            }));
        
        console.log(`✅ Processed ${processedCards.length} cards (filtered from ${rawCards.length})`);
        return processedCards;
    }

    /**
     * Build fast lookup map
     */
    buildCardMap() {
        console.log('🗂️ Building card lookup map...');
        this.cardMap.clear();
        
        for (const card of this.cards) {
            // Exact name lookup
            this.cardMap.set(card.name.toLowerCase(), card);
            
            // ID lookup
            this.cardMap.set(card.id, card);
            
            // Set + collector number lookup
            const setKey = `${card.set}_${card.collector_number}`.toLowerCase();
            this.cardMap.set(setKey, card);
        }
        
        console.log(`🗂️ Built lookup map with ${this.cardMap.size} entries`);
    }

    /**
     * Get all cards (for ClaudeVisionService)
     */
    async getAllCards() {
        if (!this.isInitialized) {
            console.log('⏳ BulkDataService not initialized, waiting...');
            await this.initialize();
        }
        
        return this.cards;
    }

    /**
     * Find card by exact name
     */
    findCardByName(name) {
        if (!this.isInitialized) return null;
        return this.cardMap.get(name.toLowerCase()) || null;
    }

    /**
     * Find card by ID
     */
    findCardById(id) {
        if (!this.isInitialized) return null;
        return this.cardMap.get(id) || null;
    }

    /**
     * Enhanced fuzzy matching for OCR results
     */
    findFuzzyMatches(searchText, options = {}) {
        if (!this.isInitialized || !searchText) return [];
        
        const {
            maxResults = 10,
            minSimilarity = 0.3,
            exactMatchFirst = true
        } = options;
        
        const searchLower = searchText.toLowerCase().trim();
        console.log(`🔍 Fuzzy searching for: "${searchLower}"`);
        
        const matches = [];
        
        // Exact match check first
        if (exactMatchFirst) {
            const exactMatch = this.cardMap.get(searchLower);
            if (exactMatch) {
                matches.push({
                    card: exactMatch,
                    similarity: 1.0,
                    matchType: 'exact'
                });
                console.log(`🎯 Exact match found: ${exactMatch.name}`);
                return matches;
            }
        }
        
        // Fuzzy matching
        for (const card of this.cards) {
            const cardNameLower = card.name.toLowerCase();
            
            // Calculate similarity
            const similarity = this.calculateStringSimilarity(searchLower, cardNameLower);
            
            if (similarity >= minSimilarity) {
                matches.push({
                    card,
                    similarity,
                    matchType: similarity > 0.8 ? 'high' : similarity > 0.6 ? 'medium' : 'low'
                });
            }
        }
        
        // Sort by similarity (highest first)
        matches.sort((a, b) => b.similarity - a.similarity);
        
        const results = matches.slice(0, maxResults);
        console.log(`🔍 Found ${results.length} fuzzy matches (max similarity: ${results[0]?.similarity.toFixed(3) || 0})`);
        
        return results;
    }

    /**
     * Calculate string similarity using Levenshtein distance
     */
    calculateStringSimilarity(str1, str2) {
        if (str1 === str2) return 1.0;
        if (str1.length === 0 || str2.length === 0) return 0.0;
        
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
        
        for (let i = 0; i <= str1.length; i += 1) {
            matrix[0][i] = i;
        }
        for (let j = 0; j <= str2.length; j += 1) {
            matrix[j][0] = j;
        }
        
        for (let j = 1; j <= str2.length; j += 1) {
            for (let i = 1; i <= str1.length; i += 1) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + indicator
                );
            }
        }
        
        const distance = matrix[str2.length][str1.length];
        const maxLength = Math.max(str1.length, str2.length);
        
        return 1 - (distance / maxLength);
    }

    /**
     * Cache management
     */
    saveToCache() {
        try {
            const cacheData = {
                cards: this.cards,
                lastUpdated: this.lastUpdated.toISOString(),
                version: '1.0'
            };
            
            localStorage.setItem('mtg_bulk_data', JSON.stringify(cacheData));
            console.log('💾 Bulk data cached successfully');
        } catch (error) {
            console.warn('⚠️ Failed to cache bulk data:', error);
        }
    }

    loadFromCache() {
        try {
            const cached = localStorage.getItem('mtg_bulk_data');
            if (!cached) return null;
            
            const cacheData = JSON.parse(cached);
            console.log(`📁 Found cached data from ${cacheData.lastUpdated}`);
            
            return cacheData;
        } catch (error) {
            console.warn('⚠️ Failed to load cached data:', error);
            return null;
        }
    }

    shouldUpdate() {
        if (!this.lastUpdated) return true;
        
        const now = new Date();
        const timeDiff = now - this.lastUpdated;
        
        return timeDiff > this.updateCheckInterval;
    }

    /**
     * Force refresh bulk data
     */
    async forceRefresh() {
        console.log('🔄 Force refreshing bulk data...');
        this.cards = [];
        this.cardMap.clear();
        this.isInitialized = false;
        
        try {
            localStorage.removeItem('mtg_bulk_data');
        } catch (error) {
            console.warn('Failed to clear cache:', error);
        }
        
        await this.downloadAndUpdate();
        return true;
    }

    /**
     * Get service statistics
     */
    getStats() {
        return {
            isInitialized: this.isInitialized,
            cardCount: this.cards.length,
            lastUpdated: this.lastUpdated?.toISOString(),
            cacheSize: this.cardMap.size,
            dataUrl: this.dataUrl
        };
    }

    /**
     * Search cards by various criteria (for future use)
     */
    searchCards(query, options = {}) {
        if (!this.isInitialized) return [];
        
        const {
            type = 'name',
            limit = 20,
            exactMatch = false
        } = options;
        
        const queryLower = query.toLowerCase();
        const results = [];
        
        for (const card of this.cards) {
            let match = false;
            
            switch (type) {
                case 'name':
                    match = exactMatch 
                        ? card.name.toLowerCase() === queryLower
                        : card.name.toLowerCase().includes(queryLower);
                    break;
                case 'type':
                    match = card.type_line.toLowerCase().includes(queryLower);
                    break;
                case 'set':
                    match = card.set.toLowerCase() === queryLower || 
                           card.set_name.toLowerCase().includes(queryLower);
                    break;
                case 'text':
                    match = card.oracle_text.toLowerCase().includes(queryLower);
                    break;
            }
            
            if (match) {
                results.push(card);
                if (results.length >= limit) break;
            }
        }
        
        return results;
    }
}

// Export singleton instance
const bulkDataService = new BulkDataService();

// ✅ GLOBAL: Make available globally for ClaudeVisionService
if (typeof window !== 'undefined') {
    window.bulkDataService = bulkDataService;
}

export default bulkDataService;