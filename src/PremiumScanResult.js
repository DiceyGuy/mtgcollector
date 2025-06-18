// PremiumScanResult.js - PREMIUM UI WITH FREEMIUM CONVERSION
// Save this file as: C:\Users\kim-a\Documents\DiceyTech\MTG Scanner\PremiumScanResult.js
import React, { useState } from 'react';

const PremiumScanResult = ({ scanResult, userTier = 'free', onUpgrade }) => {
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    
    if (!scanResult) return null;
    
    // FREE TIER - PREMIUM TEASERS
    if (userTier === 'free' && scanResult.premiumTeaser) {
        return (
            <div className="premium-teaser-container">
                <FreeTierResult 
                    scanResult={scanResult} 
                    onUpgrade={() => setShowUpgradeModal(true)}
                />
                {showUpgradeModal && (
                    <UpgradeModal 
                        scanResult={scanResult}
                        onClose={() => setShowUpgradeModal(false)}
                        onUpgrade={onUpgrade}
                    />
                )}
            </div>
        );
    }
    
    // PREMIUM TIER - FULL RESULTS
    if (userTier === 'premium' || userTier === 'business') {
        return <PremiumResult scanResult={scanResult} userTier={userTier} />;
    }
    
    return <BasicResult scanResult={scanResult} />;
};

// FREE TIER WITH PREMIUM TEASERS
const FreeTierResult = ({ scanResult, onUpgrade }) => {
    const isPremiumCard = scanResult.premiumTeaser?.isPremiumCard;
    
    return (
        <div className={`scan-result-card ${isPremiumCard ? 'premium-card' : 'standard-card'}`}>
            {/* Basic Card Info */}
            <div className="card-header">
                <h2 className="card-name">{scanResult.cardName}</h2>
                <div className="tier-badge free-tier">FREE TIER</div>
            </div>
            
            {/* PREMIUM TEASER SECTION */}
            {isPremiumCard ? (
                <div className="premium-teaser-section">
                    <div className="value-teaser">
                        <div className="teaser-icon">💎</div>
                        <div className="teaser-content">
                            <h3>High-Value Card Detected!</h3>
                            <p className="teaser-message">{scanResult.premiumTeaser.message}</p>
                            <div className="price-range">
                                <span className="price-text">{scanResult.pricing?.range || 'Value varies by edition'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="locked-features">
                        <div className="locked-feature">
                            <span className="lock-icon">🔒</span>
                            <span className="feature-name">Edition Detection</span>
                            <span className="feature-value">Alpha? Beta? Revised?</span>
                        </div>
                        <div className="locked-feature">
                            <span className="lock-icon">🔒</span>
                            <span className="feature-name">Exact Pricing</span>
                            <span className="feature-value">Live market data</span>
                        </div>
                        <div className="locked-feature">
                            <span className="lock-icon">🔒</span>
                            <span className="feature-name">Condition Assessment</span>
                            <span className="feature-value">Mint? Near Mint? Played?</span>
                        </div>
                    </div>
                    
                    <button className="upgrade-cta-button" onClick={onUpgrade}>
                        <span className="cta-text">🚀 Unlock Edition Detection</span>
                        <span className="cta-price">Starting at $9.99/month</span>
                    </button>
                </div>
            ) : (
                <div className="standard-teaser-section">
                    <div className="basic-info">
                        <p>✅ Card identified successfully</p>
                        <p>📊 Confidence: {Math.floor(scanResult.confidence)}%</p>
                    </div>
                    
                    <div className="upgrade-benefits">
                        <h4>Upgrade for premium features:</h4>
                        <ul>
                            <li>📈 Live pricing data</li>
                            <li>🎯 Edition detection</li>
                            <li>📊 Condition grading</li>
                            <li>📋 Bulk scanning</li>
                            <li>📤 Export to spreadsheets</li>
                        </ul>
                        <button className="upgrade-button-small" onClick={onUpgrade}>
                            Try Premium Free
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// PREMIUM TIER - FULL FEATURED RESULTS
const PremiumResult = ({ scanResult, userTier }) => {
    const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
    
    return (
        <div className="premium-result-container">
            {/* Premium Header */}
            <div className="premium-header">
                <h2 className="card-name">{scanResult.cardName}</h2>
                <div className="tier-badge premium-tier">
                    {userTier === 'business' ? '💼 BUSINESS' : '💎 PREMIUM'}
                </div>
            </div>
            
            {/* Edition & Pricing Section */}
            <div className="edition-pricing-section">
                <div className="edition-info">
                    <h3>📜 Edition Analysis</h3>
                    <div className="edition-details">
                        <div className="edition-main">
                            <span className="edition-name">{scanResult.edition}</span>
                            <span className="confidence-badge">
                                {Math.floor(scanResult.confidence * 100)}% confidence
                            </span>
                        </div>
                        {scanResult.setSymbol && (
                            <div className="set-info">
                                <span>Set Symbol: {scanResult.setSymbol}</span>
                                <span>Rarity: {scanResult.rarity}</span>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="pricing-info">
                    <h3>💰 Current Pricing</h3>
                    <div className="price-display">
                        <div className="main-price">${scanResult.pricing?.current || 'N/A'}</div>
                        <div className="price-range">
                            Low: ${scanResult.pricing?.low} | High: ${scanResult.pricing?.high}
                        </div>
                        <div className="price-trend">
                            Trend: <span className={`trend-${scanResult.pricing?.trend}`}>
                                {scanResult.pricing?.trend || 'stable'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Condition Assessment */}
            {scanResult.condition && (
                <div className="condition-section">
                    <h3>🔍 Condition Assessment</h3>
                    <div className="condition-details">
                        <div className="condition-grade">
                            <span className="grade-name">{scanResult.condition}</span>
                            <span className="grade-confidence">
                                {Math.floor(scanResult.conditionConfidence * 100)}% confidence
                            </span>
                        </div>
                        <div className="value-adjustment">
                            Estimated Value: <strong>${scanResult.valueAssessment?.estimated}</strong>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Action Buttons */}
            <div className="action-buttons-section">
                <button className="action-btn save-btn">
                    📋 Save to Collection
                </button>
                <button className="action-btn export-btn">
                    📤 Export Data
                </button>
                <button className="action-btn price-alert-btn">
                    🔔 Set Price Alert
                </button>
                <button className="action-btn share-btn">
                    📱 Share Find
                </button>
            </div>
            
            {/* Technical Details (Collapsible) */}
            <div className="technical-section">
                <button 
                    className="technical-toggle"
                    onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                >
                    🔧 Technical Details {showTechnicalDetails ? '▼' : '▶'}
                </button>
                
                {showTechnicalDetails && (
                    <div className="technical-details">
                        <div className="detail-grid">
                            <div className="detail-item">
                                <label>Scan Method:</label>
                                <span>AI Vision + Edition Analysis</span>
                            </div>
                            <div className="detail-item">
                                <label>Processing Time:</label>
                                <span>{scanResult.processingTime || 'N/A'}ms</span>
                            </div>
                            <div className="detail-item">
                                <label>Last Updated:</label>
                                <span>{new Date(scanResult.timestamp).toLocaleString()}</span>
                            </div>
                            <div className="detail-item">
                                <label>Data Sources:</label>
                                <span>{scanResult.pricing?.sources?.join(', ') || 'Premium APIs'}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// UPGRADE MODAL
const UpgradeModal = ({ scanResult, onClose, onUpgrade }) => {
    const potentialValue = scanResult.premiumTeaser?.potentialValue || 0;
    
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="upgrade-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>🚀 Unlock Premium Features</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                
                <div className="modal-content">
                    <div className="value-highlight">
                        <h3>This {scanResult.cardName} could be worth up to ${potentialValue}!</h3>
                        <p>Don't miss out on valuable finds. Get instant edition detection.</p>
                    </div>
                    
                    <div className="pricing-tiers">
                        <div className="pricing-tier recommended">
                            <div className="tier-header">
                                <h4>💎 Individual Pro</h4>
                                <div className="tier-price">$9.99/month</div>
                            </div>
                            <div className="tier-features">
                                <ul>
                                    <li>✅ Edition detection</li>
                                    <li>✅ Live pricing data</li>
                                    <li>✅ Condition assessment</li>
                                    <li>✅ Price alerts</li>
                                    <li>✅ Collection tracking</li>
                                </ul>
                            </div>
                            <button className="select-tier-btn" onClick={() => onUpgrade('individual')}>
                                Start Free Trial
                            </button>
                        </div>
                        
                        <div className="pricing-tier">
                            <div className="tier-header">
                                <h4>💼 Business</h4>
                                <div className="tier-price">$29.99/month</div>
                            </div>
                            <div className="tier-features">
                                <ul>
                                    <li>✅ Everything in Pro</li>
                                    <li>✅ Bulk scanning</li>
                                    <li>✅ Excel exports</li>
                                    <li>✅ Business reports</li>
                                    <li>✅ Priority support</li>
                                </ul>
                            </div>
                            <button className="select-tier-btn" onClick={() => onUpgrade('business')}>
                                Start Free Trial
                            </button>
                        </div>
                    </div>
                    
                    <div className="modal-footer">
                        <p>🎯 <strong>Money-back guarantee:</strong> Find $50+ in value in your first month or get a full refund</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// BASIC RESULT (FALLBACK)
const BasicResult = ({ scanResult }) => (
    <div className="basic-result">
        <h2>{scanResult.cardName}</h2>
        <p>Confidence: {Math.floor(scanResult.confidence)}%</p>
    </div>
);

export default PremiumScanResult;