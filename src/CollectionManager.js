// CollectionManager.js - ALPHA TEST COLLECTION FEATURES
import React, { useState, useEffect } from 'react';

const CollectionManager = () => {
    // Collection State
    const [collection, setCollection] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [filterBy, setFilterBy] = useState('all');
    const [selectedCards, setSelectedCards] = useState(new Set());
    const [isExporting, setIsExporting] = useState(false);
    
    // Alpha User State
    const [alphaUser, setAlphaUser] = useState(null);
    const [userStats, setUserStats] = useState({
        totalCards: 0,
        totalValue: 0,
        cardsToday: 0,
        collectionsCreated: 0
    });

    // Alpha User Registration
    const AlphaUserRegistration = ({ onRegister }) => {
        const [email, setEmail] = useState('');
        const [username, setUsername] = useState('');
        const [isRegistering, setIsRegistering] = useState(false);
        
        const handleRegister = async () => {
            setIsRegistering(true);
            
            // Simulate alpha user registration
            const newUser = {
                id: Date.now(),
                email: email,
                username: username,
                registeredAt: new Date().toISOString(),
                alphaNumber: Math.floor(Math.random() * 500) + 1, // Alpha user #1-500
                tier: 'ALPHA_TESTER',
                limits: {
                    maxCards: 10000,
                    maxCollections: 50,
                    maxExports: 100
                }
            };
            
            // Store in localStorage for alpha testing
            localStorage.setItem('alpha_user', JSON.stringify(newUser));
            
            setTimeout(() => {
                setIsRegistering(false);
                onRegister(newUser);
            }, 1500);
        };
        
        return (
            <div style={{
                maxWidth: '400px',
                margin: '40px auto',
                padding: '30px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
                <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#333' }}>
                    🧪 Join Alpha Testing
                </h2>
                <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>
                    Get early access to collection management and Moxfield integration!
                </p>
                
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Username:
                    </label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '16px'
                        }}
                        placeholder="Choose a username"
                    />
                </div>
                
                <div style={{ marginBottom: '30px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Email:
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '16px'
                        }}
                        placeholder="your.email@example.com"
                    />
                </div>
                
                <button
                    onClick={handleRegister}
                    disabled={!email || !username || isRegistering}
                    style={{
                        width: '100%',
                        padding: '14px',
                        backgroundColor: isRegistering ? '#ccc' : '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: isRegistering ? 'not-allowed' : 'pointer'
                    }}
                >
                    {isRegistering ? '⏳ Registering...' : '🚀 Join Alpha Testing'}
                </button>
                
                <div style={{
                    marginTop: '20px',
                    padding: '15px',
                    backgroundColor: '#e8f5e8',
                    borderRadius: '6px',
                    fontSize: '14px'
                }}>
                    <strong>Alpha Features:</strong>
                    <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                        <li>Collection management (10,000 cards)</li>
                        <li>Moxfield export integration</li>
                        <li>Advanced search and filtering</li>
                        <li>Bulk operations</li>
                        <li>Priority support</li>
                    </ul>
                </div>
            </div>
        );
    };

    // Initialize alpha user
    useEffect(() => {
        const storedUser = localStorage.getItem('alpha_user');
        if (storedUser) {
            setAlphaUser(JSON.parse(storedUser));
            loadCollection();
            loadUserStats();
        }
    }, []);

    const loadCollection = () => {
        const storedCollection = localStorage.getItem('mtg_collection');
        if (storedCollection) {
            setCollection(JSON.parse(storedCollection));
        }
    };

    const loadUserStats = () => {
        const storedStats = localStorage.getItem('user_stats');
        if (storedStats) {
            setUserStats(JSON.parse(storedStats));
        }
    };

    const saveCollection = (newCollection) => {
        localStorage.setItem('mtg_collection', JSON.stringify(newCollection));
        setCollection(newCollection);
        updateUserStats(newCollection);
    };

    const updateUserStats = (collection) => {
        const stats = {
            totalCards: collection.length,
            totalValue: collection.reduce((sum, card) => sum + (card.estimatedPrice || 0), 0),
            cardsToday: collection.filter(card => {
                const today = new Date().toDateString();
                const cardDate = new Date(card.addedAt).toDateString();
                return today === cardDate;
            }).length,
            collectionsCreated: 1 // For now, assuming 1 collection
        };
        setUserStats(stats);
        localStorage.setItem('user_stats', JSON.stringify(stats));
    };

    // Add card to collection from scanner
    const addCardToCollection = (cardData) => {
        const newCard = {
            id: Date.now(),
            name: cardData.name,
            confidence: cardData.confidence,
            addedAt: new Date().toISOString(),
            addedBy: 'scanner',
            quantity: 1,
            condition: 'NM',
            estimatedPrice: Math.random() * 50, // Placeholder - would integrate with pricing API
            set: 'Unknown', // Would be detected in premium version
            rarity: 'Common' // Would be detected in premium version
        };

        const updatedCollection = [...collection, newCard];
        saveCollection(updatedCollection);
        
        console.log('🎯 Card added to collection:', newCard);
        return newCard;
    };

    // Remove card from collection
    const removeCard = (cardId) => {
        const updatedCollection = collection.filter(card => card.id !== cardId);
        saveCollection(updatedCollection);
    };

    // Bulk operations
    const bulkRemove = () => {
        const updatedCollection = collection.filter(card => !selectedCards.has(card.id));
        saveCollection(updatedCollection);
        setSelectedCards(new Set());
    };

    const selectAll = () => {
        if (selectedCards.size === filteredCollection.length) {
            setSelectedCards(new Set());
        } else {
            setSelectedCards(new Set(filteredCollection.map(card => card.id)));
        }
    };

    // Export to Moxfield
    const exportToMoxfield = async () => {
        setIsExporting(true);
        
        try {
            // Convert collection to Moxfield format
            const moxfieldData = {
                name: `${alphaUser.username}'s Collection`,
                description: `Exported from MTG Scanner Alpha on ${new Date().toLocaleDateString()}`,
                format: 'vintage',
                mainboard: {}
            };

            // Group cards by name and sum quantities
            collection.forEach(card => {
                if (moxfieldData.mainboard[card.name]) {
                    moxfieldData.mainboard[card.name].quantity += card.quantity;
                } else {
                    moxfieldData.mainboard[card.name] = {
                        quantity: card.quantity,
                        card: {
                            name: card.name,
                            set: card.set || 'Unknown',
                            collector_number: '1'
                        }
                    };
                }
            });

            // For alpha testing, download as JSON file
            // In production, this would use Moxfield API
            const dataStr = JSON.stringify(moxfieldData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `mtg-scanner-collection-${Date.now()}.json`;
            link.click();
            
            console.log('📤 Collection exported to Moxfield format');
            
        } catch (error) {
            console.error('❌ Export failed:', error);
        } finally {
            setIsExporting(false);
        }
    };

    // Filter and sort collection
    const filteredCollection = collection
        .filter(card => {
            if (filterBy === 'all') return true;
            if (filterBy === 'recent') {
                const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
                return new Date(card.addedAt).getTime() > weekAgo;
            }
            return true;
        })
        .filter(card => 
            card.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'date':
                    return new Date(b.addedAt) - new Date(a.addedAt);
                case 'price':
                    return (b.estimatedPrice || 0) - (a.estimatedPrice || 0);
                default:
                    return 0;
            }
        });

    // Alpha User Dashboard
    const AlphaUserDashboard = () => (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '20px'
        }}>
            <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '20px',
                borderRadius: '12px'
            }}>
                <h3 style={{ margin: '0 0 10px 0' }}>Alpha Tester #{alphaUser?.alphaNumber}</h3>
                <p style={{ margin: 0, opacity: 0.9 }}>{alphaUser?.username}</p>
            </div>
            
            <div style={{
                backgroundColor: '#e8f5e8',
                padding: '20px',
                borderRadius: '12px'
            }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#2e7d32' }}>Total Cards</h4>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#2e7d32' }}>
                    {userStats.totalCards}
                </p>
            </div>
            
            <div style={{
                backgroundColor: '#fff3e0',
                padding: '20px',
                borderRadius: '12px'
            }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#f57c00' }}>Collection Value</h4>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#f57c00' }}>
                    ${userStats.totalValue.toFixed(2)}
                </p>
            </div>
            
            <div style={{
                backgroundColor: '#e3f2fd',
                padding: '20px',
                borderRadius: '12px'
            }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>Cards Today</h4>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>
                    {userStats.cardsToday}
                </p>
            </div>
        </div>
    );

    // Collection Controls
    const CollectionControls = () => (
        <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto auto',
                gap: '16px',
                alignItems: 'center',
                marginBottom: '16px'
            }}>
                <input
                    type="text"
                    placeholder="Search your collection..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '16px'
                    }}
                />
                
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px'
                    }}
                >
                    <option value="name">Sort by Name</option>
                    <option value="date">Sort by Date</option>
                    <option value="price">Sort by Price</option>
                </select>
                
                <select
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value)}
                    style={{
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px'
                    }}
                >
                    <option value="all">All Cards</option>
                    <option value="recent">Recent (7 days)</option>
                </select>
                
                <button
                    onClick={exportToMoxfield}
                    disabled={collection.length === 0 || isExporting}
                    style={{
                        padding: '12px 20px',
                        backgroundColor: isExporting ? '#ccc' : '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        cursor: collection.length === 0 || isExporting ? 'not-allowed' : 'pointer'
                    }}
                >
                    {isExporting ? '⏳ Exporting...' : '📤 Export to Moxfield'}
                </button>
            </div>
            
            {selectedCards.size > 0 && (
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '6px'
                }}>
                    <span>{selectedCards.size} cards selected</span>
                    <button
                        onClick={bulkRemove}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Remove Selected
                    </button>
                    <button
                        onClick={selectAll}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        {selectedCards.size === filteredCollection.length ? 'Deselect All' : 'Select All'}
                    </button>
                </div>
            )}
        </div>
    );

    // Collection Grid
    const CollectionGrid = () => (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px'
        }}>
            {filteredCollection.map(card => (
                <div
                    key={card.id}
                    style={{
                        backgroundColor: 'white',
                        border: selectedCards.has(card.id) ? '2px solid #4CAF50' : '1px solid #ddd',
                        borderRadius: '8px',
                        padding: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    onClick={() => {
                        const newSelected = new Set(selectedCards);
                        if (newSelected.has(card.id)) {
                            newSelected.delete(card.id);
                        } else {
                            newSelected.add(card.id);
                        }
                        setSelectedCards(newSelected);
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                        <h4 style={{ margin: 0, color: '#333' }}>{card.name}</h4>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                removeCard(card.id);
                            }}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#f44336',
                                cursor: 'pointer',
                                fontSize: '18px'
                            }}
                        >
                            ×
                        </button>
                    </div>
                    
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                        <div>Quantity: {card.quantity}</div>
                        <div>Condition: {card.condition}</div>
                        <div>Confidence: {card.confidence}%</div>
                        <div>Added: {new Date(card.addedAt).toLocaleDateString()}</div>
                    </div>
                    
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#4CAF50' }}>
                        ~${card.estimatedPrice?.toFixed(2) || '0.00'}
                    </div>
                </div>
            ))}
        </div>
    );

    // Main render
    if (!alphaUser) {
        return <AlphaUserRegistration onRegister={setAlphaUser} />;
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
            <div style={{ marginBottom: '30px' }}>
                <h1 style={{ color: '#333', marginBottom: '10px' }}>🗃️ Collection Manager</h1>
                <p style={{ color: '#666', fontSize: '18px' }}>
                    Alpha Testing - Collection Management & Moxfield Integration
                </p>
            </div>

            <AlphaUserDashboard />
            <CollectionControls />

            {collection.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{ color: '#666', marginBottom: '16px' }}>No cards in your collection yet</h3>
                    <p style={{ color: '#999', marginBottom: '24px' }}>
                        Start scanning cards to build your collection!
                    </p>
                    <button
                        onClick={() => window.location.hash = '#scanner'}
                        style={{
                            padding: '14px 28px',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        🎯 Start Scanning Cards
                    </button>
                </div>
            ) : (
                <CollectionGrid />
            )}

            {/* Alpha Testing Info */}
            <div style={{
                marginTop: '40px',
                padding: '20px',
                backgroundColor: '#e8f5e8',
                borderRadius: '12px',
                border: '1px solid #4CAF50'
            }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#2e7d32' }}>🧪 Alpha Testing Features</h4>
                <div style={{ fontSize: '14px', color: '#2e7d32' }}>
                    <p style={{ margin: '8px 0' }}>✅ Collection Management (up to 10,000 cards)</p>
                    <p style={{ margin: '8px 0' }}>✅ Moxfield Export Integration</p>
                    <p style={{ margin: '8px 0' }}>✅ Advanced Search & Filtering</p>
                    <p style={{ margin: '8px 0' }}>✅ Bulk Operations</p>
                    <p style={{ margin: '8px 0' }}>🔄 Real-time Collection Statistics</p>
                </div>
            </div>
        </div>
    );

    // Export function for use in Scanner
    window.addCardToCollection = addCardToCollection;
};

export default CollectionManager;