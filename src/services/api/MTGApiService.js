// MTGApiService.js - Production-Ready Scryfall API Integration
// 🚀 CRITICAL FIX: Proper headers, rate limiting, and error handling for Scryfall API

class MTGApiService {
  constructor() {
    this.baseURL = 'https://api.scryfall.com';
    this.rateLimit = 100; // 100ms between requests (10 req/sec max)
    this.lastRequestTime = 0;
    this.cache = new Map();
    this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours cache
  }

  // Rate limiting helper
  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimit) {
      const waitTime = this.rateLimit - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  // Enhanced API request with proper headers
  async makeRequest(endpoint, options = {}) {
    await this.waitForRateLimit();

    const url = `${this.baseURL}${endpoint}`;
    
    // ✅ PROPER HEADERS as required by Scryfall
    const headers = {
      'Accept': 'application/json;q=0.9,*/*;q=0.8',
      'User-Agent': 'MTGScannerEnterprise/1.0',
      'Content-Type': 'application/json',
      ...options.headers
    };

    console.log(`🌐 API Request: ${endpoint}`);

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        // Enhanced error handling for different status codes
        if (response.status === 404) {
          throw new Error(`Card not found: ${endpoint}`);
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded - please wait');
        } else if (response.status >= 500) {
          throw new Error('Scryfall server error - try again later');
        } else {
          throw new Error(`API error ${response.status}: ${response.statusText}`);
        }
      }

      const data = await response.json();
      console.log(`✅ API Success: ${endpoint}`, data);
      return data;

    } catch (error) {
      console.error(`❌ API Error: ${endpoint}`, error);
      throw error;
    }
  }

  // Test API connection
  async testConnection() {
    try {
      // Use a simple, reliable endpoint
      const response = await this.makeRequest('/sets');
      return response && Array.isArray(response.data);
    } catch (error) {
      console.error('❌ API connection test failed:', error);
      return false;
    }
  }

  // Enhanced card search with fuzzy matching
  async searchCardsByName(cardName) {
    if (!cardName || cardName.length < 2) {
      throw new Error('Card name must be at least 2 characters');
    }

    // Check cache first
    const cacheKey = `search_${cardName.toLowerCase()}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      console.log(`📦 Cache hit for: ${cardName}`);
      return cached;
    }

    try {
      // Primary search: Exact or fuzzy name match
      console.log(`🔍 Searching for: "${cardName}"`);
      
      const searchQuery = encodeURIComponent(`!"${cardName}"`);
      const endpoint = `/cards/search?q=${searchQuery}&unique=cards&order=name`;
      
      const result = await this.makeRequest(endpoint);
      
      if (result.data && result.data.length > 0) {
        const processed = {
          cards: result.data.map(card => this.processCardData(card)),
          total: result.total_cards,
          hasMore: result.has_more
        };
        
        this.setCachedResult(cacheKey, processed);
        return processed;
      }

      // Fallback: Fuzzy search without exact quotes
      console.log(`🔄 Trying fuzzy search for: ${cardName}`);
      const fuzzyQuery = encodeURIComponent(cardName);
      const fuzzyEndpoint = `/cards/search?q=${fuzzyQuery}&unique=cards&order=name`;
      
      const fuzzyResult = await this.makeRequest(fuzzyEndpoint);
      
      if (fuzzyResult.data && fuzzyResult.data.length > 0) {
        const processed = {
          cards: fuzzyResult.data.map(card => this.processCardData(card)),
          total: fuzzyResult.total_cards,
          hasMore: fuzzyResult.has_more
        };
        
        this.setCachedResult(cacheKey, processed);
        return processed;
      }

      throw new Error('No cards found');

    } catch (error) {
      console.error(`❌ Search failed for "${cardName}":`, error);
      throw error;
    }
  }

  // Enhanced OCR-based card finding
  async findCardWithOCRData(ocrResult) {
    console.log('🧠 Enhanced OCR card matching starting...');
    
    const extractedData = ocrResult.extractedData || {};
    const cardName = extractedData.cardName;
    
    if (!cardName) {
      throw new Error('No card name found in OCR data');
    }

    try {
      // Step 1: Try exact card name search
      const searchResult = await this.searchCardsByName(cardName);
      
      if (searchResult.cards && searchResult.cards.length > 0) {
        const bestMatch = this.findBestOCRMatch(searchResult.cards, ocrResult);
        
        // Add OCR verification data
        bestMatch.ocrVerification = {
          matchQuality: this.calculateMatchQuality(bestMatch, ocrResult),
          ocrConfidence: ocrResult.confidence || 0,
          matchedFields: this.getMatchedFields(bestMatch, extractedData),
          extractedData: extractedData
        };
        
        console.log(`🎯 OCR Match found: "${bestMatch.name}" (${(bestMatch.ocrVerification.matchQuality * 100).toFixed(1)}% match)`);
        return bestMatch;
      }

      throw new Error('No matching cards found');

    } catch (error) {
      console.error('❌ OCR card matching failed:', error);
      throw error;
    }
  }

  // Process raw API card data
  processCardData(rawCard) {
    return {
      id: rawCard.id,
      name: rawCard.name,
      mana_cost: rawCard.mana_cost,
      type_line: rawCard.type_line,
      oracle_text: rawCard.oracle_text,
      flavor_text: rawCard.flavor_text,
      power: rawCard.power,
      toughness: rawCard.toughness,
      loyalty: rawCard.loyalty,
      set: rawCard.set,
      set_name: rawCard.set_name,
      collector_number: rawCard.collector_number,
      rarity: rawCard.rarity,
      artist: rawCard.artist,
      imageUrls: {
        small: rawCard.image_uris?.small,
        normal: rawCard.image_uris?.normal,
        large: rawCard.image_uris?.large,
        png: rawCard.image_uris?.png,
        art_crop: rawCard.image_uris?.art_crop,
        border_crop: rawCard.image_uris?.border_crop
      },
      priceInfo: {
        usd: rawCard.prices?.usd,
        usd_foil: rawCard.prices?.usd_foil,
        eur: rawCard.prices?.eur,
        tix: rawCard.prices?.tix
      },
      formatLegality: rawCard.legalities,
      scryfallUri: rawCard.scryfall_uri,
      tcgplayerId: rawCard.tcgplayer_id,
      mtgoId: rawCard.mtgo_id,
      mtgoFoilId: rawCard.mtgo_foil_id
    };
  }

  // Find best match from OCR data
  findBestOCRMatch(cards, ocrResult) {
    const extractedData = ocrResult.extractedData || {};
    
    let bestMatch = cards[0]; // Default to first
    let bestScore = 0;

    for (const card of cards) {
      let score = 0;
      
      // Name similarity (50% weight)
      if (extractedData.cardName) {
        const nameSimilarity = this.calculateSimilarity(
          extractedData.cardName.toLowerCase(),
          card.name.toLowerCase()
        );
        score += nameSimilarity * 0.5;
      }
      
      // Set match (20% weight)
      if (extractedData.setCode && card.set) {
        if (extractedData.setCode.toLowerCase() === card.set.toLowerCase()) {
          score += 0.2;
        }
      }
      
      // Collector number match (15% weight)
      if (extractedData.collectorNumber && card.collector_number) {
        if (extractedData.collectorNumber === card.collector_number) {
          score += 0.15;
        }
      }
      
      // Rarity match (10% weight)
      if (extractedData.rarity && card.rarity) {
        if (extractedData.rarity.toLowerCase() === card.rarity.toLowerCase()) {
          score += 0.1;
        }
      }
      
      // Artist match (5% weight)
      if (extractedData.artist && card.artist) {
        const artistSimilarity = this.calculateSimilarity(
          extractedData.artist.toLowerCase(),
          card.artist.toLowerCase()
        );
        score += artistSimilarity * 0.05;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = card;
      }
    }

    return bestMatch;
  }

  // Calculate match quality
  calculateMatchQuality(card, ocrResult) {
    const extractedData = ocrResult.extractedData || {};
    let quality = 0;
    let factors = 0;

    // Name quality
    if (extractedData.cardName) {
      quality += this.calculateSimilarity(
        extractedData.cardName.toLowerCase(),
        card.name.toLowerCase()
      );
      factors++;
    }

    // OCR confidence factor
    const ocrConfidence = (ocrResult.confidence || 0) / 100;
    quality += ocrConfidence;
    factors++;

    return factors > 0 ? quality / factors : 0;
  }

  // Get matched fields
  getMatchedFields(card, extractedData) {
    const matched = {};
    
    if (extractedData.cardName) matched.cardName = card.name;
    if (extractedData.setCode) matched.setCode = card.set;
    if (extractedData.collectorNumber) matched.collectorNumber = card.collector_number;
    if (extractedData.rarity) matched.rarity = card.rarity;
    if (extractedData.artist) matched.artist = card.artist;
    
    return matched;
  }

  // String similarity helper
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  // Levenshtein distance for string similarity
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

  // Cache management
  getCachedResult(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCachedResult(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Clear old cache entries
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }
}

export default MTGApiService;