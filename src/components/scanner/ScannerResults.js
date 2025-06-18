import React, { useState } from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ArrowPathIcon,
  MagnifyingGlassIcon,
  PhotoIcon 
} from '@heroicons/react/24/outline';

const ScannerResults = ({ 
  scanResult, 
  cardData, 
  isLoading, 
  error, 
  onRetry, 
  onSave, 
  onNewScan,
  className = "" 
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  // ✅ SAFE OBJECT ACCESS HELPERS
  const safeGetValue = (obj, path, defaultValue = '') => {
    try {
      return path.split('.').reduce((current, key) => current?.[key], obj) ?? defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const safeRenderObject = (obj, maxDepth = 2, currentDepth = 0) => {
    if (currentDepth >= maxDepth) return '[Object]';
    if (obj === null || obj === undefined) return 'null';
    if (typeof obj !== 'object') return String(obj);
    if (Array.isArray(obj)) return `[${obj.length} items]`;
    
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    
    return `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}}`;
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <ArrowPathIcon className="h-8 w-8 text-blue-600 animate-spin mr-3" />
          <div>
            <p className="text-lg font-medium text-gray-900">Processing Image...</p>
            <p className="text-sm text-gray-600">Recognizing text and searching for card data</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="text-center py-8">
          <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Scan Failed</h3>
          <p className="text-gray-600 mb-4">{String(error)}</p>
          <div className="space-x-3">
            <button
              onClick={onRetry}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={onNewScan}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
            >
              New Scan
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!scanResult && !cardData) {
    return (
      <div className={`bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-6 ${className}`}>
        <div className="text-center py-8">
          <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Scan a card to see results here</p>
        </div>
      </div>
    );
  }

  // ✅ SAFE DATA EXTRACTION
  const confidence = safeGetValue(scanResult, 'confidence', 0);
  const avgConfidence = safeGetValue(scanResult, 'avgConfidence', confidence);
  const extractedData = safeGetValue(scanResult, 'extractedData', {});
  const recognizedText = safeGetValue(scanResult, 'text', '');
  const wordCount = safeGetValue(scanResult, 'wordCount', 0);
  const processingTime = safeGetValue(scanResult, 'processingTime', 0);
  const confidenceScores = safeGetValue(scanResult, 'confidenceScores', {});

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              {safeGetValue(cardData, 'name', 'Scan Results')}
            </h3>
            <p className="text-blue-100 text-sm">
              {cardData ? 'Card Found!' : 'Text Recognition Complete'}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center">
              {cardData ? (
                <CheckCircleIcon className="h-6 w-6 text-green-300 mr-1" />
              ) : (
                <MagnifyingGlassIcon className="h-6 w-6 text-yellow-300 mr-1" />
              )}
              <span className="text-sm">
                {Number(avgConfidence).toFixed(1)}% confidence
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex">
          {['overview', 'ocr', 'details'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-4 text-sm font-medium border-b-2 ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {cardData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card Image */}
                {safeGetValue(cardData, 'imageUrls.normal') && (
                  <div className="text-center">
                    <img
                      src={safeGetValue(cardData, 'imageUrls.normal')}
                      alt={safeGetValue(cardData, 'name', 'Card')}
                      className="w-full max-w-xs mx-auto rounded-lg shadow-md"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                
                {/* Card Info */}
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {safeGetValue(cardData, 'name', 'Unknown Card')}
                    </h4>
                    <p className="text-gray-600">
                      {safeGetValue(cardData, 'type_line', 'Unknown Type')}
                    </p>
                  </div>
                  
                  {safeGetValue(cardData, 'mana_cost') && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Mana Cost: </span>
                      <span className="text-sm text-gray-600">
                        {safeGetValue(cardData, 'mana_cost')}
                      </span>
                    </div>
                  )}
                  
                  {safeGetValue(cardData, 'power') && safeGetValue(cardData, 'toughness') && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">P/T: </span>
                      <span className="text-sm text-gray-600">
                        {safeGetValue(cardData, 'power')}/{safeGetValue(cardData, 'toughness')}
                      </span>
                    </div>
                  )}
                  
                  {safeGetValue(cardData, 'set_name') && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Set: </span>
                      <span className="text-sm text-gray-600">
                        {safeGetValue(cardData, 'set_name')} ({safeGetValue(cardData, 'set', '').toUpperCase()})
                      </span>
                    </div>
                  )}
                  
                  {safeGetValue(cardData, 'rarity') && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Rarity: </span>
                      <span className={`text-sm font-medium ${
                        safeGetValue(cardData, 'rarity') === 'mythic' ? 'text-orange-600' :
                        safeGetValue(cardData, 'rarity') === 'rare' ? 'text-yellow-600' :
                        safeGetValue(cardData, 'rarity') === 'uncommon' ? 'text-gray-600' :
                        'text-gray-500'
                      }`}>
                        {safeGetValue(cardData, 'rarity', '').charAt(0).toUpperCase() + 
                         safeGetValue(cardData, 'rarity', '').slice(1)}
                      </span>
                    </div>
                  )}
                  
                  {safeGetValue(cardData, 'priceInfo.usd') && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Price: </span>
                      <span className="text-sm text-green-600 font-medium">
                        ${safeGetValue(cardData, 'priceInfo.usd')}
                      </span>
                    </div>
                  )}

                  {/* OCR Verification Info */}
                  {safeGetValue(cardData, 'ocrVerification.matchQuality') && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Match Quality: </span>
                      <span className={`text-sm font-medium ${
                        safeGetValue(cardData, 'ocrVerification.matchQuality', 0) >= 0.9 ? 'text-green-600' :
                        safeGetValue(cardData, 'ocrVerification.matchQuality', 0) >= 0.7 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {(safeGetValue(cardData, 'ocrVerification.matchQuality', 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <MagnifyingGlassIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Card not found in database</p>
                <p className="text-sm text-gray-500">Check OCR tab for recognized text</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ocr' && scanResult && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Recognized Text</h4>
              <div className="bg-gray-50 p-3 rounded-lg">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                  {recognizedText || 'No text recognized'}
                </pre>
              </div>
            </div>
            
            {/* ✅ SAFE EXTRACTED DATA RENDERING */}
            {extractedData && Object.keys(extractedData).length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Extracted MTG Data</h4>
                <div className="bg-blue-50 p-3 rounded-lg space-y-2">
                  {Object.entries(extractedData).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-sm font-medium text-blue-700">
                        {key.charAt(0).toUpperCase() + key.slice(1)}:
                      </span>
                      <span className="text-sm text-blue-600">
                        {Array.isArray(value) ? value.join(', ') : 
                         typeof value === 'object' ? safeRenderObject(value) : 
                         String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ✅ SAFE CONFIDENCE SCORES RENDERING */}
            {confidenceScores && Object.keys(confidenceScores).length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Confidence Breakdown</h4>
                <div className="bg-green-50 p-3 rounded-lg space-y-2">
                  {Object.entries(confidenceScores).map(([key, score]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-sm font-medium text-green-700">
                        {key.charAt(0).toUpperCase() + key.slice(1)}:
                      </span>
                      <span className="text-sm text-green-600">
                        {typeof score === 'number' ? `${score.toFixed(1)}%` : String(score)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="font-medium text-gray-700">OCR Confidence</div>
                <div className="text-gray-600">{Number(confidence).toFixed(1)}%</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="font-medium text-gray-700">Words Found</div>
                <div className="text-gray-600">{Number(wordCount) || 0}</div>
              </div>
              {processingTime > 0 && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="font-medium text-gray-700">Processing Time</div>
                  <div className="text-gray-600">{Number(processingTime)}ms</div>
                </div>
              )}
            </div>

            {/* ✅ DEBUG INFO (OPTIONAL) */}
            {scanResult._original && (
              <div className="mt-4">
                <details className="bg-gray-50 p-3 rounded-lg">
                  <summary className="font-medium text-gray-700 cursor-pointer">
                    Debug Info (Click to expand)
                  </summary>
                  <pre className="text-xs text-gray-600 mt-2 overflow-auto max-h-40">
                    {JSON.stringify(scanResult._original, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        )}

        {activeTab === 'details' && cardData && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Oracle Text</h4>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-700">
                  {safeGetValue(cardData, 'oracle_text', 'No oracle text available')}
                </p>
              </div>
            </div>
            
            {safeGetValue(cardData, 'flavor_text') && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Flavor Text</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600 italic">
                    {safeGetValue(cardData, 'flavor_text')}
                  </p>
                </div>
              </div>
            )}
            
            {safeGetValue(cardData, 'formatLegality') && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Format Legality</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(safeGetValue(cardData, 'formatLegality', {})).map(([format, legality]) => (
                    <div key={format} className="flex justify-between text-sm">
                      <span className="text-gray-700 capitalize">{format}:</span>
                      <span className={`font-medium ${
                        legality === 'legal' ? 'text-green-600' :
                        legality === 'banned' ? 'text-red-600' :
                        'text-gray-500'
                      }`}>
                        {String(legality).charAt(0).toUpperCase() + String(legality).slice(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Card Details */}
            {safeGetValue(cardData, 'collector_number') && (
              <div>
                <span className="text-sm font-medium text-gray-700">Collector Number: </span>
                <span className="text-sm text-gray-600">
                  {safeGetValue(cardData, 'collector_number')}
                </span>
              </div>
            )}

            {safeGetValue(cardData, 'artist') && (
              <div>
                <span className="text-sm font-medium text-gray-700">Artist: </span>
                <span className="text-sm text-gray-600">
                  {safeGetValue(cardData, 'artist')}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-gray-50 px-4 py-3 flex justify-between">
        <button
          onClick={onNewScan}
          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
        >
          New Scan
        </button>
        
        {cardData && (
          <button
            onClick={() => onSave?.(cardData, scanResult)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Card
          </button>
        )}
      </div>
    </div>
  );
};

export default ScannerResults;