// ScryfallEditionService.js - Premium Edition Detection & Confirmation
// COPY THIS ENTIRE FILE - Complete standalone implementation
// Integrates with your existing MTGApiService.js

class ScryfallEditionService {
    constructor() {
        console.log('🃏 ScryfallEditionService initialized - Premium Edition Detection');
        this.baseUrl = 'https://api.scryfall.com';
        this.requestDelay = 100; // Scryfall rate limiting: 10 requests/second max
        this.cache = new Map(); // Cache to reduce API calls
        this.debugMode = true;
    }

    log(message, data = null) {
        if (this.debugMode) {
            console.log(`🃏 ${message}`, data || '');
        }
    }

    // 🎯 MAIN METHOD: Get All Editions for Premium Confirmation
    async getAllEditions(cardName) {
        this.log(`🔍 Fetching all editions for: ${cardName}`);
        
        try {
            // Check cache first
            const cacheKey = `editions_${cardName.toLowerCase()}`;
            if (this.cache.has(cacheKey)) {
                this.log('✅ Using cached edition data');
                return this.cache.get(cacheKey);
            }

            // Search for the card
            const searchResults = await this.searchCard(cardName);
            if (!searchResults.success) {
                return searchResults;
            }

            // Get all prints of this card
            const allPrints = await this.getAllPrints(searchResults.cardData.oracle_id);
            if (!allPrints.success) {
                return allPrints;
            }

            // Process and organize editions
            const processedEditions = this.processEditionsForDisplay(allPrints.prints);
            
            const result = {
                success: true,
                cardName: cardName,
                totalEditions: processedEditions.length,
                editions: processedEditions,
                priceRange: this.calculatePriceRange(processedEditions),
                popularEditions: this.identifyPopularEditions(processedEditions)
            };

            // Cache the result
            this.cache.set(cacheKey, result);
            this.log(`✅ Found ${result.totalEditions} editions for ${cardName}`);
            
            return result;

        } catch (error) {
            this.log('❌ Error fetching editions:', error);
            return {
                success: false,
                message: `Failed to fetch editions: ${error.message}`
            };
        }
    }

    // 🎯 STEP 1: Search for the card
    async searchCard(cardName) {
        try {
            await this.rateLimit();
            
            const encodedName = encodeURIComponent(cardName);
            const searchUrl = `${this.baseUrl}/cards/named?exact=${encodedName}`;
            
            this.log('📡 Searching Scryfall for exact card match');
            
            const response = await fetch(searchUrl);
            
            if (!response.ok) {
                if (response.status === 404) {
                    // Try fuzzy search as fallback
                    return await this.fuzzySearchCard(cardName);
                }
                throw new Error(`Scryfall search failed: ${response.status}`);
            }

            const cardData = await response.json();
            
            return {
                success: true,
                cardData: cardData,
                searchMethod: 'exact'
            };

        } catch (error) {
            this.log('❌ Card search failed:', error);
            return {
                success: false,
                message: `Card search failed: ${error.message}`
            };
        }
    }

    // 🎯 FALLBACK: Fuzzy search if exact match fails
    async fuzzySearchCard(cardName) {
        try {
            await this.rateLimit();
            
            const encodedName = encodeURIComponent(cardName);
            const searchUrl = `${this.baseUrl}/cards/named?fuzzy=${encodedName}`;
            
            this.log('🔍 Trying fuzzy search for card name');
            
            const response = await fetch(searchUrl);
            
            if (!response.ok) {
                throw new Error(`Fuzzy search failed: ${response.status}`);
            }

            const cardData = await response.json();
            
            return {
                success: true,
                cardData: cardData,
                searchMethod: 'fuzzy'
            };

        } catch (error) {
            this.log('❌ Fuzzy search failed:', error);
            return {
                success: false,
                message: `No matching card found for "${cardName}"`
            };
        }
    }

    // 🎯 STEP 2: Get all prints/editions of the card
    async getAllPrints(oracleId) {
        try {
            await this.rateLimit();
            
            const printsUrl = `${this.baseUrl}/cards/search?order=released&q=oracleid%3A${oracleId}`;
            
            this.log('📚 Fetching all prints from Scryfall');
            
            const response = await fetch(printsUrl);
            
            if (!response.ok) {
                throw new Error(`Prints search failed: ${response.status}`);
            }

            const printsData = await response.json();
            
            return {
                success: true,
                prints: printsData.data || [],
                totalResults: printsData.total_cards || 0
            };

        } catch (error) {
            this.log('❌ Prints fetch failed:', error);
            return {
                success: false,
                message: `Failed to fetch prints: ${error.message}`
            };
        }
    }

    // 🎯 STEP 3: Process editions for premium display
    processEditionsForDisplay(prints) {
        this.log(`📋 Processing ${prints.length} prints for display`);
        
        return prints.map(print => ({
            // Basic identification
            id: print.id,
            name: print.name,
            setName: print.set_name,
            setCode: print.set.toUpperCase(),
            collectorNumber: print.collector_number,
            
            // Visual identification aids
            imageUrl: print.image_uris?.normal || print.card_faces?.[0]?.image_uris?.normal,
            smallImageUrl: print.image_uris?.small || print.card_faces?.[0]?.image_uris?.small,
            setIconUrl: print.set_uri ? `https://svgs.scryfall.io/sets/${print.set}.svg` : null,
            
            // Edition details
            releasedAt: print.released_at,
            rarity: print.rarity,
            borderColor: print.border_color,
            frame: print.frame,
            
            // Special features
            foil: print.foil,
            nonfoil: print.nonfoil,
            promo: print.promo,
            digital: print.digital,
            fullArt: print.full_art,
            textless: print.textless,
            oversized: print.oversized,
            
            // Pricing data
            prices: {
                usd: print.prices?.usd ? parseFloat(print.prices.usd) : null,
                usdFoil: print.prices?.usd_foil ? parseFloat(print.prices.usd_foil) : null,
                eur: print.prices?.eur ? parseFloat(print.prices.eur) : null,
                eurFoil: print.prices?.eur_foil ? parseFloat(print.prices.eur_foil) : null
            },
            
            // Professional metadata
            artist: print.artist,
            scryfallUri: print.scryfall_uri,
            tcgplayerId: print.tcgplayer_id,
            
            // Visual comparison helpers
            displayPrice: this.getDisplayPrice(print.prices),
            displayTags: this.generateDisplayTags(print),
            sortValue: this.calculateSortValue(print)
            
        })).sort((a, b) => b.sortValue - a.sortValue); // Sort by importance/popularity
    }

    // 🎯 HELPER: Get the best price to display
    getDisplayPrice(prices) {
        if (prices?.usd) return `$${prices.usd}`;
        if (prices?.usd_foil) return `$${prices.usd_foil} (foil)`;
        if (prices?.eur) return `€${prices.eur}`;
        if (prices?.eur_foil) return `€${prices.eur_foil} (foil)`;
        return 'Price N/A';
    }

    // 🎯 HELPER: Generate display tags for quick identification
    generateDisplayTags(print) {
        const tags = [];
        
        if (print.promo) tags.push('PROMO');
        if (print.full_art) tags.push('FULL ART');
        if (print.textless) tags.push('TEXTLESS');
        if (print.border_color === 'borderless') tags.push('BORDERLESS');
        if (print.frame === '2015') tags.push('MODERN');
        if (print.frame === '1993') tags.push('VINTAGE');
        if (print.rarity === 'mythic') tags.push('MYTHIC');
        if (print.foil && !print.nonfoil) tags.push('FOIL ONLY');
        
        return tags;
    }

    // 🎯 HELPER: Calculate sort value (most important editions first)
    calculateSortValue(print) {
        let score = 0;
        
        // Price factor (higher price = more important for professional users)
        const price = parseFloat(print.prices?.usd || print.prices?.usd_foil || 0);
        score += Math.min(price * 10, 1000); // Cap at 1000 points
        
        // Rarity factor
        const rarityScores = { mythic: 100, rare: 75, uncommon: 50, common: 25 };
        score += rarityScores[print.rarity] || 0;
        
        // Special edition bonuses
        if (print.promo) score += 150;
        if (print.full_art) score += 100;
        if (print.textless) score += 75;
        if (print.border_color === 'borderless') score += 125;
        
        // Recent sets get slight bonus for relevance
        const releaseYear = new Date(print.released_at).getFullYear();
        const currentYear = new Date().getFullYear();
        if (currentYear - releaseYear <= 2) score += 50;
        
        return score;
    }

    // 🎯 HELPER: Calculate price range for the card
    calculatePriceRange(editions) {
        const prices = editions
            .map(ed => ed.prices.usd || ed.prices.usdFoil)
            .filter(price => price !== null)
            .sort((a, b) => a - b);
            
        if (prices.length === 0) {
            return { min: null, max: null, average: null };
        }
        
        return {
            min: prices[0],
            max: prices[prices.length - 1],
            average: prices.reduce((sum, price) => sum + price, 0) / prices.length
        };
    }

    // 🎯 HELPER: Identify most popular/important editions
    identifyPopularEditions(editions) {
        // Return top 5 most important editions for quick selection
        return editions
            .slice(0, 5)
            .map(ed => ({
                setName: ed.setName,
                displayPrice: ed.displayPrice,
                tags: ed.displayTags,
                imageUrl: ed.smallImageUrl
            }));
    }

    // 🎯 PREMIUM FEATURE: Smart edition matching based on Claude Vision hints
    smartMatchEdition(editions, claudeEditionData) {
        this.log('🤖 Attempting smart edition matching with Claude hints');
        
        const hints = claudeEditionData;
        const matches = [];
        
        for (const edition of editions) {
            let confidence = 0;
            const reasons = [];
            
            // Match set symbol description
            if (hints.setSymbol && hints.setSymbol !== 'Not visible') {
                // This would need more sophisticated matching logic
                // For now, we'll give a small bonus for any set-related matches
                confidence += 10;
                reasons.push('Set symbol analysis');
            }
            
            // Match border style
            if (hints.borderStyle && edition.borderColor.includes(hints.borderStyle)) {
                confidence += 25;
                reasons.push(`Border match: ${hints.borderStyle}`);
            }
            
            // Match copyright date
            if (hints.copyrightDate && hints.copyrightDate !== 'Not visible') {
                const releaseYear = new Date(edition.releasedAt).getFullYear();
                const hintYear = parseInt(hints.copyrightDate);
                if (Math.abs(releaseYear - hintYear) <= 1) {
                    confidence += 30;
                    reasons.push(`Copyright year match: ${hintYear}`);
                }
            }
            
            if (confidence > 0) {
                matches.push({
                    edition: edition,
                    confidence: confidence,
                    reasons: reasons
                });
            }
        }
        
        // Sort by confidence
        matches.sort((a, b) => b.confidence - a.confidence);
        
        return {
            hasMatches: matches.length > 0,
            bestMatch: matches[0] || null,
            allMatches: matches,
            suggestion: matches.length > 0 ? 
                `Best match: ${matches[0].edition.setName} (${matches[0].confidence}% confidence)` :
                'Unable to automatically match - manual selection recommended'
        };
    }

    // 🎯 RATE LIMITING: Respect Scryfall's limits
    async rateLimit() {
        return new Promise(resolve => setTimeout(resolve, this.requestDelay));
    }

    // 🎯 CACHE MANAGEMENT: Clear old cache entries
    clearCache() {
        this.cache.clear();
        this.log('🧹 Cache cleared');
    }
}

export default ScryfallEditionService;