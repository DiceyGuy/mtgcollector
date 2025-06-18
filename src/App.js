// src/App.js - ALPHA TEST MODE WITH COLLECTION INTEGRATION
import React, { useState, useEffect } from 'react';
import Scanner from './Scanner';
import CollectionManager from './CollectionManager';

// ALPHA BANNER COMPONENT
const AlphaBanner = () => {
  const [alphaUsers, setAlphaUsers] = useState(0);

  useEffect(() => {
    // Simulate alpha user count
    setAlphaUsers(Math.floor(Math.random() * 500) + 150); // 150-650 range
  }, []);

  return (
    <div style={{
      backgroundColor: '#ff6b35',
      color: 'white',
      padding: '12px',
      textAlign: 'center',
      fontSize: '14px',
      fontWeight: 'bold',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      🧪 ALPHA VERSION - Free AI-powered MTG Scanner | {alphaUsers}/500 Alpha Testers | Collection Management + Moxfield Export!
    </div>
  );
};

// MTG SCANNER LOGO COMPONENT
const MTGScannerLogo = ({ size = 'normal' }) => {
  const logoSize = size === 'small' ? '32px' : size === 'large' ? '64px' : '48px';
  const fontSize = size === 'small' ? '12px' : size === 'large' ? '20px' : '16px';

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '12px'
    }}>
      <div style={{
        width: logoSize,
        height: logoSize,
        backgroundColor: '#2c3e50',
        borderRadius: '8px',
        border: '3px solid white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
      }}>
        <div style={{
          color: 'white',
          fontSize: fontSize,
          fontWeight: 'bold',
          lineHeight: '1',
          marginBottom: '2px'
        }}>
          MTG
        </div>
        <div style={{
          width: '70%',
          height: '2px',
          backgroundColor: '#3498db',
          margin: '1px 0'
        }}></div>
        <div style={{
          color: 'white',
          fontSize: size === 'small' ? '8px' : size === 'large' ? '12px' : '10px',
          fontWeight: 'bold',
          lineHeight: '1',
          marginTop: '2px'
        }}>
          SCANNER
        </div>
      </div>

      {size !== 'small' && (
        <span style={{
          fontSize: size === 'large' ? '28px' : '20px',
          fontWeight: 'bold',
          color: 'white'
        }}>
          MTG Scanner
        </span>
      )}
    </div>
  );
};

function App() {
  const [currentView, setCurrentView] = useState('home');
  const [alphaUser, setAlphaUser] = useState(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('alpha_user');
      if (storedUser) {
        setAlphaUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.warn('Failed to parse alpha_user from localStorage:', e);
    }
  }, []);

  const renderContent = () => {
    switch (currentView) {
      case 'scanner':
        return <Scanner alphaUser={alphaUser} />;

      case 'premium-scanner':
        return (
          <div className="max-w-4xl mx-auto p-6 text-center">
            {/* ... premium content as before ... */}
          </div>
        );

      case 'collection':
        return <CollectionManager />;

      default:
        return (
          <div className="max-w-4xl mx-auto p-6">
            {/* ... home content as before ... */}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <AlphaBanner />
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <button
              onClick={() => setCurrentView('home')}
              className="text-white hover:text-blue-200 transition-colors"
              aria-label="Home"
            >
              <MTGScannerLogo size="small" />
            </button>
            <nav className="space-x-2" aria-label="Primary navigation">
              <button
                onClick={() => setCurrentView('scanner')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'scanner'
                    ? 'bg-blue-700 text-white shadow-lg'
                    : 'text-blue-100 hover:bg-blue-500 hover:text-white'
                }`}
              >
                🤖 Scanner
              </button>
              <button
                onClick={() => setCurrentView('collection')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'collection'
                    ? 'bg-green-700 text-white shadow-lg'
                    : 'text-green-100 hover:bg-green-500 hover:text-white'
                }`}
              >
                🗃️ Collection
              </button>
              <button
                onClick={() => setCurrentView('premium-scanner')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'premium-scanner'
                    ? 'bg-purple-700 text-white shadow-lg'
                    : 'text-purple-100 hover:bg-purple-500 hover:text-white'
                }`}
              >
                👑 Premium
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="py-6">{renderContent()}</main>
    </div>
  );
}

export default App;
