import Dexie from 'dexie';

class DatabaseService extends Dexie {
  constructor() {
    super('MTGScannerDB');
    
    // Define schemas
    this.version(1).stores({
      cards: '++id, scryfallId, name, setCode, rarity, addedAt, scanData',
      scans: '++id, cardId, imageData, ocrResult, timestamp, confidence',
      collections: '++id, name, description, createdAt, cardIds',
      settings: 'key, value, updatedAt'
    });
  }

  // Add card to database
  async addCard(cardData, scanData = null) {
    try {
      const cardRecord = {
        scryfallId: cardData.id,
        name: cardData.name,
        setCode: cardData.set,
        rarity: cardData.rarity,
        addedAt: new Date(),
        scanData: scanData,
        cardData: cardData
      };

      // Check if card already exists
      const existing = await this.cards
        .where('scryfallId')
        .equals(cardData.id)
        .first();

      if (existing) {
        await this.cards.update(existing.id, {
          ...cardRecord,
          addedAt: existing.addedAt,
          updatedAt: new Date()
        });
        return existing.id;
      } else {
        return await this.cards.add(cardRecord);
      }
    } catch (error) {
      console.error('Failed to add card:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Add scan result
  async addScan(cardId, imageData, ocrResult, confidence = 0) {
    const scanRecord = {
      cardId,
      imageData,
      ocrResult,
      confidence,
      timestamp: new Date()
    };

    return await this.scans.add(scanRecord);
  }

  // Get all cards with pagination
  async getAllCards(page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    
    const cards = await this.cards
      .orderBy('addedAt')
      .reverse()
      .offset(offset)
      .limit(pageSize)
      .toArray();

    const total = await this.cards.count();

    return {
      cards,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasMore: offset + pageSize < total
    };
  }

  // Search cards by name
  async searchCards(searchTerm, limit = 50) {
    return await this.cards
      .where('name')
      .startsWithIgnoreCase(searchTerm)
      .limit(limit)
      .toArray();
  }

  // Get database statistics
  async getStats() {
    const [cardCount, scanCount] = await Promise.all([
      this.cards.count(),
      this.scans.count()
    ]);

    return {
      cards: cardCount,
      scans: scanCount,
      generatedAt: new Date().toISOString()
    };
  }

  // Clear all data
  async clearAllData() {
    await Promise.all([
      this.cards.clear(),
      this.scans.clear()
    ]);
    console.log('All scanner data cleared');
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

export default databaseService;