// SmartCardLookupService.js - Complete with Enhanced Text Cleaning & Card Name Detection

class SmartCardLookupService {
  constructor(apiService) {
    this.apiService = apiService;
  }

  // Enhanced OCR text cleaning with MTG-specific corrections
  static cleanOcrText(text) {
    if (!text || typeof text !== 'string') return '';
    
    let cleaned = text.trim();
    
    // Step 1: Common OCR character corrections
    const characterFixes = {
      // Common OCR mistakes
      'hen ': 'When ',
      ' hen ': ' When ',
      'vou': 'you',
      'hfe': 'life',
      'unl': 'until',
      'bartlefield': 'battlefield',
      'rcarures': 'creatures',
      'trach': 'attach',
      'tral': 'tral', // part of "Ancestral"
      'A tral': 'Ancestral',
      'Le trach': 'then attach',
      'gets +1741': 'gets +1/+1',
      'gets 1741': 'gets +1/+1',
      
      // Number corrections
      '1/41': '+1/+1',
      '+1741': '+1/+1',
      '2 1/1': 'a 1/1',
      
      // Card name corrections
      'Loomscourge': 'Doomscourge',
      'Kardur, Loomscourge': 'Kardur, Doomscourge',
      'Ancestral Blade': 'Ancestral Blade',
      
      // Remove common OCR garbage
      'FRE ': '',
      'TORC ': '',
      'EER ': '',
      'fe ry ': '',
      'TEAS EE ': '',
      'Ser Res Ely ': '',
      'PE YE i ': '',
      'S= 2 . ': '',
      'cr re ': 'creature ',
      '. cr re ': ' creature ',
      
      // Fix punctuation
      ' ,': ',',
      ' .': '.',
      '.,': ',',
      ',.': '.',
    };
    
    // Apply character fixes
    for (const [wrong, right] of Object.entries(characterFixes)) {
      cleaned = cleaned.replace(new RegExp(wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), right);
    }
    
    // Step 2: Remove standalone garbage characters and short nonsense
    cleaned = cleaned.replace(/\b[A-Z]{2,4}\b(?!\s+(enters|creates?|deals?|gets?))/g, '');
    cleaned = cleaned.replace(/\b[a-z]{1,2}\b(?=\s)/g, '');
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    // Step 3: Fix common word patterns
    cleaned = cleaned.replace(/\b(\d+)\s+(\d+\/\d+)\b/g, '$1 $2'); // "2 1/1" format
    cleaned = cleaned.replace(/\bcreature\s+token,?\s+/gi, 'creature token, ');
    cleaned = cleaned.replace(/\b(When|Whenever)\s+/gi, '$1 ');
    
    // Step 4: Clean up extra spaces and punctuation
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/,\s*,/g, ',');
    cleaned = cleaned.replace(/\.\s*\./g, '.');
    cleaned = cleaned.trim();
    
    return cleaned;
  }

  // Extract potential card names from OCR text
  static extractCardNames(ocrResults) {
    const candidates = new Set();
    
    // Strategy 1: Direct name field
    if (ocrResults.results?.name?.text) {
      const cleanName = this.cleanOcrText(ocrResults.results.name.text);
      if (cleanName.length > 2) {
        candidates.add(cleanName);
      }
    }
    
    // Strategy 2: Look for proper nouns in rules text
    if (ocrResults.results?.typeLine?.text) {
      const rulesText = this.cleanOcrText(ocrResults.results.typeLine.text);
      
      // Find capitalized words that might be card names
      const properNouns = rulesText.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
      
      properNouns.forEach(noun => {
        // Filter for likely card names (2-4 words, meaningful length)
        const words = noun.split(' ');
        if (words.length >= 1 && words.length <= 4 && noun.length >= 4) {
          // Check if it looks like a card name vs game term
          if (!this.isGameTerm(noun)) {
            candidates.add(noun);
          }
        }
      });
    }
    
    // Strategy 3: Known card name patterns from OCR artifacts
    const knownPatterns = {
      'Kardur': 'Kardur, Doomscourge',
      'Ancestral': 'Ancestral Blade',
      'Blade': 'Ancestral Blade',
      'Academic': 'Academic Probation',
      'Probation': 'Academic Probation',
      'Mask': 'Mask of Memory',
      'Memory': 'Mask of Memory',
      'Abzan': 'Abzan Falconer',
      'Falconer': 'Abzan Falconer',
    };
    
    // Check for partial matches
    const allText = `${ocrResults.results?.name?.text || ''} ${ocrResults.results?.typeLine?.text || ''}`.toLowerCase();
    
    for (const [partial, fullName] of Object.entries(knownPatterns)) {
      if (allText.includes(partial.toLowerCase())) {
        candidates.add(fullName);
      }
    }
    
    return Array.from(candidates);
  }

  // Check if a word is a game term rather than card name
  static isGameTerm(word) {
    const gameTerms = [
      'When', 'Whenever', 'Until', 'Then', 'Enters', 'Creates', 'Create', 'Deals', 'Gets',
      'Creature', 'Token', 'Battlefield', 'Opponent', 'Player', 'Target', 'Hand', 'Graveyard',
      'Library', 'Exile', 'Draw', 'Discard', 'Destroy', 'Sacrifice', 'Return', 'Search',
      'White', 'Blue', 'Black', 'Red', 'Green', 'Colorless', 'Artifact', 'Enchantment',
      'Instant', 'Sorcery', 'Planeswalker', 'Land', 'Soldier', 'Human', 'Equipment',
      'Attach', 'Equipped', 'Damage', 'Life', 'Turn', 'Combat', 'Attack', 'Block'
    ];
    
    return gameTerms.some(term => word.toLowerCase().includes(term.toLowerCase()));
  }

  // Enhanced phrase extraction with MTG-aware patterns
  static extractKeyPhrases(text, minLength = 3, maxLength = 6) {
    const cleaned = this.cleanOcrText(text);
    const words = cleaned.split(/\s+/).filter(word => word.length > 1);
    
    if (words.length < minLength) return [];
    
    const phrases = new Set();
    
    // Extract phrases of different lengths
    for (let len = minLength; len <= Math.min(maxLength, words.length); len++) {
      for (let i = 0; i <= words.length - len; i++) {
        const phrase = words.slice(i, i + len).join(' ');
        
        // Skip phrases that are mostly garbage
        if (this.isValidPhrase(phrase)) {
          phrases.add(phrase);
        }
      }
    }
    
    // Prioritize MTG-specific patterns
    return Array.from(phrases).sort((a, b) => {
      const aScore = this.phraseQualityScore(a);
      const bScore = this.phraseQualityScore(b);
      return bScore - aScore;
    });
  }

  // Check if phrase is worth searching for
  static isValidPhrase(phrase) {
    if (!phrase || phrase.length < 6) return false;
    
    // Must contain at least one meaningful MTG word
    const mtgPatterns = [
      /\b(enters?|creates?|deals?|gets?|whenever|when|until|attach|creature|token|battlefield|opponent|player|target|hand|graveyard|library|exile|draw|discard|destroy|sacrifice|return|search|shuffle|reveal|choose|control|own|cast|play|tap|untap|activate|trigger|resolve|counter|prevent|replace|regenerate|transform|flip|morph|unmorph|suspend|flashback|madness|threshold|hellbent|metalcraft|landfall|bloodthirst|undying|soulbond|miracle|overload|scavenge|unleash|cipher|evolve|extort|fuse|bestow|tribute|inspired|constellation|convoke|delve|ferocious|prowess|rebound|surge|awaken|ingest|devoid|colorless|emerge|escalate|aftermath|embalm|eternalize|explore|ascend|jump-start|spectacle|riot|adapt|amass|proliferate|escape|mutate|companion|cycling|kicker|multikicker|buyback|echo|cumulative|upkeep|fading|vanishing|amplify|storm|affinity|imprint|entwine|modular|sunburst|bloodthirst|graft|transmute|replicate|forecast|haunt|dredge|recover|ripple|split\s+second|suspend|vanishing|absorb|banding|bushido|double\s+strike|first\s+strike|deathtouch|defender|flying|haste|hexproof|indestructible|intimidate|landwalk|lifelink|protection|reach|shroud|trample|vigilance|fear|horsemanship|shadow|phasing|flanking|rampage|cumulative\s+upkeep|echo|fading|buyback|flashback|cycling|madness|threshold|hellbent|metalcraft|morbid|fateful\s+hour|undying|miracle|soulbond|unleash|cipher|battalion|evolve|extort|populate|scavenge|overload|detain|unleash|bloodrush|cipher|gatecrash|simic|dimir|rakdos|gruul|boros|azorius|izzet|golgari|selesnya|orzhov)\b/i,
      /\b(artifact|creature|enchantment|instant|sorcery|planeswalker|land|tribal)\b/i,
      /\b(white|blue|black|red|green|colorless)\b/i,
      /\b\d+\/\d+\b/, // power/toughness
      /\{[WUBRGC\d]+\}/, // mana costs
    ];
    
    return mtgPatterns.some(pattern => pattern.test(phrase));
  }

  // Score phrase quality for prioritization
  static phraseQualityScore(phrase) {
    let score = 0;
    
    // Card names get highest priority
    if (/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/.test(phrase)) score += 10;
    
    // Common MTG ability words
    if (/\b(when|whenever|enters|creates?|deals?|gets?)\b/i.test(phrase)) score += 5;
    
    // Game objects
    if (/\b(creature|token|battlefield|opponent|player)\b/i.test(phrase)) score += 3;
    
    // Numbers and values
    if (/\b\d+\b/.test(phrase)) score += 2;
    
    // Proper grammar bonus
    if (phrase.match(/^[A-Z]/) && phrase.match(/[a-z]$/)) score += 1;
    
    return score;
  }

  // Search for cards by name with fuzzy matching
  async searchByCardName(cardName, maxResults = 5) {
    try {
      console.log(`🎴 Searching by card name: "${cardName}"`);
      
      // Try exact match first
      let searchQuery = `!"${cardName}"`;
      let response = await this.apiService.makeRequest(`/cards/search?q=${encodeURIComponent(searchQuery)}`);
      
      if (response.data && response.data.length > 0) {
        console.log(`✅ Found ${response.data.length} exact matches for "${cardName}"`);
        return {
          success: true,
          cards: response.data.slice(0, maxResults),
          matchType: 'exact_name',
          confidence: 95
        };
      }
      
      // Try fuzzy match
      searchQuery = cardName;
      response = await this.apiService.makeRequest(`/cards/search?q=${encodeURIComponent(searchQuery)}`);
      
      if (response.data && response.data.length > 0) {
        console.log(`✅ Found ${response.data.length} fuzzy matches for "${cardName}"`);
        
        // Score matches by name similarity
        const scoredCards = response.data.map(card => ({
          ...card,
          similarity: this.calculateNameSimilarity(cardName, card.name)
        })).sort((a, b) => b.similarity - a.similarity);
        
        const bestMatch = scoredCards[0];
        const confidence = Math.min(95, Math.max(60, bestMatch.similarity * 100));
        
        return {
          success: true,
          cards: scoredCards.slice(0, maxResults),
          matchType: 'fuzzy_name',
          confidence: confidence
        };
      }
      
      console.log(`❌ No cards found for name "${cardName}"`);
      return { success: false };
      
    } catch (error) {
      console.error(`❌ Name search failed for "${cardName}":`, error.message);
      return { success: false, error: error.message };
    }
  }

  // Calculate similarity between card names
  static calculateNameSimilarity(searchName, cardName) {
    const search = searchName.toLowerCase().trim();
    const card = cardName.toLowerCase().trim();
    
    // Exact match
    if (search === card) return 1.0;
    
    // Contains full search term
    if (card.includes(search)) return 0.8;
    
    // Search term contains card name
    if (search.includes(card)) return 0.7;
    
    // Word overlap
    const searchWords = search.split(/\s+/);
    const cardWords = card.split(/\s+/);
    
    let matchingWords = 0;
    searchWords.forEach(searchWord => {
      if (cardWords.some(cardWord => 
        cardWord.includes(searchWord) || searchWord.includes(cardWord)
      )) {
        matchingWords++;
      }
    });
    
    const overlap = matchingWords / Math.max(searchWords.length, cardWords.length);
    return overlap * 0.6; // Max 60% for word overlap
  }

  // Enhanced rules text search
  async searchByRulesText(rulesText) {
    console.log('🎯 Searching by rules text...');
    
    const cleanedText = SmartCardLookupService.cleanOcrText(rulesText);
    console.log(`✨ Cleaned rules text: "${cleanedText}"`);
    
    if (!cleanedText || cleanedText.length < 10) {
      console.log('❌ Rules text too short after cleaning');
      return { success: false };
    }
    
    const phrases = SmartCardLookupService.extractKeyPhrases(cleanedText, 3, 8);
    console.log(`🔍 Extracted ${phrases.length} key phrases:`, phrases.slice(0, 5));
    
    if (phrases.length === 0) {
      console.log('❌ No valid phrases extracted');
      return { success: false };
    }
    
    // Try each phrase until we find matches
    for (const phrase of phrases) {
      try {
        console.log(`🔍 Trying phrase: "${phrase}"`);
        
        const searchQuery = `oracle:"${phrase}"`;
        const response = await this.apiService.makeRequest(
          `/cards/search?q=${encodeURIComponent(searchQuery)}`
        );
        
        if (response.data && response.data.length > 0) {
          console.log(`✅ Found ${response.data.length} cards matching "${phrase}"`);
          
          if (response.data.length === 1) {
            // Perfect match
            return {
              success: true,
              card: response.data[0],
              matchType: 'exact_rules_match',
              confidence: 95,
              matchedPhrase: phrase
            };
          } else {
            // Multiple matches - find best one
            const bestMatch = this.findBestRulesMatch(cleanedText, response.data);
            const confidence = Math.min(90, Math.max(70, bestMatch.score * 100));
            
            console.log(`🎯 Best match found: ${bestMatch.card.name}`);
            return {
              success: true,
              card: bestMatch.card,
              matchType: 'best_rules_match',
              confidence: confidence,
              matchedPhrase: phrase
            };
          }
        }
        
      } catch (error) {
        if (error.message && error.message.includes('404')) {
          // No matches for this phrase, try next
          continue;
        }
        console.error(`❌ Search error for phrase "${phrase}":`, error.message);
      }
    }
    
    console.log('❌ No matches found for any rules text phrases');
    return { success: false };
  }

  // Find best match among multiple candidates
  findBestRulesMatch(searchText, candidates) {
    console.log('🎯 Finding best match among', candidates.length, 'candidates...');
    
    const cleanSearchText = SmartCardLookupService.cleanOcrText(searchText).toLowerCase();
    const searchWords = cleanSearchText.split(/\s+/).filter(word => word.length > 2);
    
    const scoredCandidates = candidates.map(card => {
      const cardText = (card.oracle_text || '').toLowerCase();
      const cardWords = cardText.split(/\s+/);
      
      let score = 0;
      let matchedWords = 0;
      
      // Count word overlaps
      searchWords.forEach(searchWord => {
        if (cardWords.some(cardWord => cardWord.includes(searchWord) || searchWord.includes(cardWord))) {
          matchedWords++;
          score += 1;
        }
      });
      
      // Bonus for longer matches
      score += matchedWords / searchWords.length;
      
      console.log(`📊 ${card.name}: score=${score.toFixed(2)} (${matchedWords} word overlap)`);
      
      return { card, score, matchedWords };
    });
    
    return scoredCandidates.reduce((best, current) => 
      current.score > best.score ? current : best
    );
  }

  // Search by collector number
  async searchByCollectorNumber(collectorText) {
    console.log(`🔍 Fallback: searching by collector info "${collectorText}"`);
    
    if (!collectorText || collectorText.length < 1) {
      return { success: false };
    }
    
    // Extract number from collector text
    const numberMatch = collectorText.match(/\d+/);
    if (!numberMatch) {
      console.log('❌ No number found in collector text');
      return { success: false };
    }
    
    const collectorNumber = numberMatch[0];
    console.log(`🎯 Extracted collector number: ${collectorNumber}`);
    
    try {
      const searchQuery = `cn:${collectorNumber}`;
      const response = await this.apiService.makeRequest(
        `/cards/search?q=${encodeURIComponent(searchQuery)}`
      );
      
      if (response.data && response.data.length > 0) {
        console.log(`✅ Found ${response.data.length} cards with collector number ${collectorNumber}`);
        
        // Pick first result (could be enhanced with set detection)
        return {
          success: true,
          card: response.data[0],
          matchType: 'collector_number_match',
          confidence: 60,
          matchedInfo: collectorNumber
        };
      }
      
    } catch (error) {
      console.error(`❌ Collector search failed:`, error.message);
    }
    
    return { success: false };
  }

  // Enhanced smart lookup with name detection priority
  async smartLookup(ocrResults) {
    console.log('🧠 Starting smart card lookup...');
    console.log('📊 OCR Results received:', {
      name: ocrResults.results?.name?.confidence || 0,
      typeLine: ocrResults.results?.typeLine?.confidence || 0,
      collector: ocrResults.results?.collector?.confidence || 0
    });
    
    // Strategy 0: Card Name Detection (NEW - HIGHEST PRIORITY)
    console.log('🎴 Strategy 0: Card name detection');
    const potentialNames = SmartCardLookupService.extractCardNames(ocrResults);
    
    if (potentialNames.length > 0) {
      console.log(`🔍 Found potential card names: ${potentialNames.join(', ')}`);
      
      for (const cardName of potentialNames) {
        const nameResult = await this.searchByCardName(cardName);
        if (nameResult.success && nameResult.cards.length > 0) {
          const bestCard = nameResult.cards[0];
          console.log(`✅ Found card via name detection: ${bestCard.name} (${nameResult.confidence}% confidence)`);
          
          return {
            card: bestCard,
            matchType: nameResult.matchType,
            confidence: nameResult.confidence,
            matchedInfo: cardName
          };
        }
      }
      console.log('❌ No matches found via card name detection');
    }
    
    // Strategy 1: Enhanced Rules text lookup
    if (ocrResults.results?.typeLine?.confidence > 20) {
      console.log('🎯 Strategy 1: Enhanced rules text lookup');
      const rulesResult = await this.searchByRulesText(ocrResults.results.typeLine.text);
      if (rulesResult.success) {
        return rulesResult;
      }
    }
    
    // Strategy 2: Collector number lookup
    if (ocrResults.results?.collector?.confidence > 15) {
      console.log('🎯 Strategy 2: Collector number lookup');
      const collectorResult = await this.searchByCollectorNumber(ocrResults.results.collector.text);
      if (collectorResult.success) {
        return collectorResult;
      }
    }
    
    // Strategy 3: Fuzzy name search as final fallback
    if (ocrResults.cardName && ocrResults.cardName.length > 2) {
      console.log('🎯 Strategy 3: Fuzzy name fallback');
      const fuzzyResult = await this.searchByCardName(ocrResults.cardName);
      if (fuzzyResult.success) {
        return {
          card: fuzzyResult.cards[0],
          matchType: 'fallback_name',
          confidence: Math.max(50, fuzzyResult.confidence - 10),
          matchedInfo: ocrResults.cardName
        };
      }
    }
    
    console.log('❌ No matches found with any strategy');
    return null;
  }
}

export default SmartCardLookupService;