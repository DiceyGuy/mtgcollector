import React, { useState, useRef, useEffect } from 'react';

const MobileBridgeScanner = () => {
    // State management
    const [cards, setCards] = useState([]);
    const [currentEntry, setCurrentEntry] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedCard, setSelectedCard] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [ocrResult, setOcrResult] = useState(null);
    const [showInstructions, setShowInstructions] = useState(true);
    const [recentSearches, setRecentSearches] = useState([]);
    
    // Refs
    const inputRef = useRef(null);
    const recognition = useRef(null);
    
    // Initialize voice recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window) {
            recognition.current = new webkitSpeechRecognition();
            recognition.current.continuous = false;
            recognition.current.interimResults = false;
            recognition.current.onresult = (event) => {
                const text = event.results[0][0].transcript;
                setCurrentEntry(text);
                handleSearch(text);
            };
        }
    }, []);

    // Mock MTG API service (replace with your actual service)
    const searchCard = async (cardName) => {
        setIsSearching(true);
        try {
            // Simulate API call - replace with your MTGApiService
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Mock results based on common cards
            const mockResults = [
                {
                    name: cardName.includes('Lightning') ? 'Lightning Bolt' : 
                          cardName.includes('Sol') ? 'Sol Ring' :
                          cardName.includes('Black') ? 'Black Lotus' :
                          cardName.includes('Chromatic') ? 'Chromatic Lantern' :
                          cardName,
                    set_name: 'Magic 2011',
                    prices: { usd: Math.random() > 0.5 ? (Math.random() * 50).toFixed(2) : null },
                    image_uris: {
                        small: `https://via.placeholder.com/146x204/4a5568/ffffff?text=${encodeURIComponent(cardName.slice(0, 8))}`
                    },
                    scryfall_id: Math.random().toString(36)
                }
            ];
            
            setSearchResults(mockResults);
        } catch (error) {
            console.error('Search failed:', error);
            setSearchResults([]);
        }
        setIsSearching(false);
    };

    const handleSearch = async (searchTerm = currentEntry) => {
        if (!searchTerm.trim()) return;
        
        // Add to recent searches
        setRecentSearches(prev => {
            const updated = [searchTerm, ...prev.filter(s => s !== searchTerm)].slice(0, 5);
            return updated;
        });
        
        await searchCard(searchTerm);
    };

    const selectCard = (card) => {
        setSelectedCard(card);
        setSearchResults([]);
    };

    const addToDataset = () => {
        if (!selectedCard) return;
        
        const newCard = {
            ...selectedCard,
            id: Date.now(),
            addedAt: new Date().toISOString(),
            source: ocrResult ? 'OCR + Manual' : 'Manual Entry'
        };
        
        setCards(prev => [newCard, ...prev]);
        setSelectedCard(null);
        setCurrentEntry('');
        setOcrResult(null);
        
        // Auto-focus for next entry
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const startVoiceInput = () => {
        if (recognition.current) {
            recognition.current.start();
        }
    };

    const quickEntry = (cardName) => {
        setCurrentEntry(cardName);
        handleSearch(cardName);
    };

    const exportDataset = () => {
        const csv = [
            'Name,Set,Price,Added Date,Source',
            ...cards.map(card => 
                `"${card.name}","${card.set_name}","${card.prices?.usd || 'N/A'}","${card.addedAt}","${card.source}"`
            )
        ].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mtg_dataset_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    📱➡️💻 Mobile Bridge MTG Scanner
                </h1>
                <p className="text-gray-600">
                    Use your phone's camera (Google Lens, etc.) then paste results here for dataset building
                </p>
            </div>

            {/* Instructions Panel */}
            {showInstructions && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-lg font-semibold text-blue-800">🚀 How to Use Mobile Bridge</h2>
                        <button 
                            onClick={() => setShowInstructions(false)}
                            className="text-blue-600 hover:text-blue-800"
                        >
                            ✕
                        </button>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-semibold text-blue-700 mb-2">📱 Method 1: Mobile OCR (Recommended)</h3>
                            <ol className="text-sm text-blue-600 space-y-1">
                                <li>1. Open <strong>Google Lens</strong> on your phone</li>
                                <li>2. Point camera at MTG card name</li>
                                <li>3. Tap to select text → "Copy"</li>
                                <li>4. Return to this page → Paste in box below</li>
                                <li>5. Hit Enter or Search → Verify → Add to dataset</li>
                            </ol>
                            <div className="mt-2 text-xs text-green-600">✅ 90%+ accuracy, very fast</div>
                        </div>
                        
                        <div>
                            <h3 className="font-semibold text-blue-700 mb-2">✏️ Method 2: Manual Entry</h3>
                            <ol className="text-sm text-blue-600 space-y-1">
                                <li>1. Look at your MTG card</li>
                                <li>2. Type card name in box below</li>
                                <li>3. Hit Enter or Search</li>
                                <li>4. Verify details → Add to dataset</li>
                                <li>5. Use voice input button for hands-free</li>
                            </ol>
                            <div className="mt-2 text-xs text-yellow-600">⚡ Fastest for cards you know</div>
                        </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-white rounded border-l-4 border-green-500">
                        <strong className="text-green-700">💡 Pro Tip:</strong>
                        <span className="text-gray-700"> Use "Hey Google, [card name] MTG" on your phone, then copy the result for super-fast entry!</span>
                    </div>
                </div>
            )}

            {/* Main Entry Interface */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">🔍 Card Entry</h2>
                
                {/* Input Section */}
                <div className="flex gap-2 mb-4">
                    <input
                        ref={inputRef}
                        type="text"
                        value={currentEntry}
                        onChange={(e) => setCurrentEntry(e.target.value)}
                        placeholder="Paste from mobile OCR or type card name..."
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        autoFocus
                    />
                    <button
                        onClick={() => handleSearch()}
                        disabled={!currentEntry.trim() || isSearching}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
                    >
                        {isSearching ? '⏳' : '🔍'} Search
                    </button>
                    {recognition.current && (
                        <button
                            onClick={startVoiceInput}
                            className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                            title="Voice Input"
                        >
                            🎤
                        </button>
                    )}
                </div>

                {/* Quick Entry Buttons */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                    {['Lightning Bolt', 'Sol Ring', 'Chromatic Lantern', 'Black Lotus'].map(card => (
                        <button
                            key={card}
                            onClick={() => quickEntry(card)}
                            className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                        >
                            ⚡ {card}
                        </button>
                    ))}
                </div>

                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                    <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-600 mb-2">🕒 Recent Searches:</h4>
                        <div className="flex flex-wrap gap-2">
                            {recentSearches.map((search, index) => (
                                <button
                                    key={index}
                                    onClick={() => quickEntry(search)}
                                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                                >
                                    {search}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">🎯 Search Results</h3>
                    <div className="grid gap-4">
                        {searchResults.map((card, index) => (
                            <div 
                                key={index}
                                className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                                onClick={() => selectCard(card)}
                            >
                                <img 
                                    src={card.image_uris?.small} 
                                    alt={card.name}
                                    className="w-16 h-22 object-cover rounded border"
                                />
                                <div className="flex-1">
                                    <h4 className="font-semibold text-gray-800">{card.name}</h4>
                                    <p className="text-sm text-gray-600">{card.set_name}</p>
                                    <p className="text-lg font-bold text-green-600">
                                        ${card.prices?.usd || 'N/A'}
                                    </p>
                                </div>
                                <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                                    ➕ Select
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Selected Card Confirmation */}
            {selectedCard && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-semibold text-green-800 mb-4">✅ Confirm Card Details</h3>
                    <div className="flex items-start gap-6">
                        <img 
                            src={selectedCard.image_uris?.small} 
                            alt={selectedCard.name}
                            className="w-32 h-auto rounded border shadow-md"
                        />
                        <div className="flex-1">
                            <h4 className="text-xl font-bold text-green-800">{selectedCard.name}</h4>
                            <p className="text-green-600 mb-2">{selectedCard.set_name}</p>
                            <p className="text-2xl font-bold text-green-700 mb-4">
                                ${selectedCard.prices?.usd || 'N/A'}
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={addToDataset}
                                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                                >
                                    ✅ Add to Dataset
                                </button>
                                <button
                                    onClick={() => setSelectedCard(null)}
                                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                                >
                                    ❌ Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Dataset Display */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                        📊 Your Dataset ({cards.length} cards)
                    </h3>
                    {cards.length > 0 && (
                        <button
                            onClick={exportDataset}
                            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        >
                            📄 Export CSV
                        </button>
                    )}
                </div>

                {cards.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-2">📱</div>
                        <p>No cards added yet. Start by scanning with your mobile device!</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-2 px-4 font-medium text-gray-600">Card</th>
                                    <th className="text-left py-2 px-4 font-medium text-gray-600">Set</th>
                                    <th className="text-left py-2 px-4 font-medium text-gray-600">Price</th>
                                    <th className="text-left py-2 px-4 font-medium text-gray-600">Source</th>
                                    <th className="text-left py-2 px-4 font-medium text-gray-600">Added</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cards.map((card, index) => (
                                    <tr key={card.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <img 
                                                    src={card.image_uris?.small} 
                                                    alt={card.name}
                                                    className="w-8 h-11 object-cover rounded"
                                                />
                                                <span className="font-medium">{card.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-gray-600">{card.set_name}</td>
                                        <td className="py-3 px-4 font-bold text-green-600">
                                            ${card.prices?.usd || 'N/A'}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-500">{card.source}</td>
                                        <td className="py-3 px-4 text-sm text-gray-500">
                                            {new Date(card.addedAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {cards.length > 0 && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div>
                                <div className="text-2xl font-bold text-blue-600">{cards.length}</div>
                                <div className="text-sm text-gray-600">Total Cards</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-green-600">
                                    ${cards.reduce((sum, card) => sum + parseFloat(card.prices?.usd || 0), 0).toFixed(2)}
                                </div>
                                <div className="text-sm text-gray-600">Total Value</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-purple-600">
                                    ${(cards.reduce((sum, card) => sum + parseFloat(card.prices?.usd || 0), 0) / cards.length || 0).toFixed(2)}
                                </div>
                                <div className="text-sm text-gray-600">Avg Price</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-orange-600">
                                    {new Set(cards.map(card => card.set_name)).size}
                                </div>
                                <div className="text-sm text-gray-600">Unique Sets</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile OCR Apps Recommendations */}
            <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">📱 Recommended Mobile OCR Apps</h3>
                <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 border">
                        <h4 className="font-semibold text-blue-700 mb-2">📷 Google Lens</h4>
                        <p className="text-sm text-gray-600 mb-2">Built into Google app, excellent for text recognition</p>
                        <div className="text-xs text-green-600">✅ 95%+ accuracy • Free • Always available</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border">
                        <h4 className="font-semibold text-purple-700 mb-2">🎯 Delver Lens</h4>
                        <p className="text-sm text-gray-600 mb-2">MTG-specific scanner app</p>
                        <div className="text-xs text-green-600">✅ MTG trained • Card prices • Collection tracking</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border">
                        <h4 className="font-semibold text-orange-700 mb-2">🎤 Voice Input</h4>
                        <p className="text-sm text-gray-600 mb-2">"Hey Google, Lightning Bolt MTG"</p>
                        <div className="text-xs text-green-600">✅ Hands-free • Very fast • Surprisingly accurate</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileBridgeScanner;