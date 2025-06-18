// Scanner.js - MTG INFINITY SCANNER - COMPLETE CLEAN VERSION

import React, { useState, useRef, useEffect } from 'react';
import ClaudeVisionService from './ClaudeVisionService';
import DonationButton from './DonationButton';
import AdminPanel from './AdminPanel';
import AlphaUserSystem from './AlphaUserSystem';

const Scanner = () => {
    // State
    const [scanResult, setScanResult] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [cameraError, setCameraError] = useState(null);
    const [scannedCards, setScannedCards] = useState([]);
    const [cameraReady, setCameraReady] = useState(false);
    const [showAdminPanel, setShowAdminPanel] = useState(false);
    const [scanMode, setScanMode] = useState('auto');
    const [countdown, setCountdown] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [showCollection, setShowCollection] = useState(false);
    
    // Refs
    const videoRef = useRef(null);
    const fileInputRef = useRef(null);
    const scanningRef = useRef(false);
    const frameTimeoutRef = useRef(null);
    const countdownRef = useRef(null);
    
    // Services
    const [visionService] = useState(() => {
        console.log('🔧 Creating ClaudeVisionService...');
        try {
            const service = new ClaudeVisionService();
            console.log('✅ ClaudeVisionService created successfully');
            return service;
        } catch (error) {
            console.error('❌ Failed to create ClaudeVisionService:', error);
            return null;
        }
    });

    const [userSystem] = useState(() => {
        console.log('👤 Creating AlphaUserSystem...');
        return new AlphaUserSystem();
    });
    
    // Initialize user on component mount
    useEffect(() => {
        const user = userSystem.getCurrentUser();
        setCurrentUser(user);
        console.log(`👋 Welcome back, Alpha Tester #${user.alphaNumber}: ${user.username}`);
    }, [userSystem]);
    
    // Check for admin access
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('admin') === 'true') {
            setShowAdminPanel(true);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    // Record successful scans with "DING" sound
    const recordSuccessfulScan = (cardName, confidence, mode) => {
        if (!cardName || confidence < 70) {
            console.log('⚠️ Scan not recorded: low confidence or no card name');
            return;
        }

        console.log(`🔔 DING! Recording successful scan: ${cardName} (${confidence}%)`);
        
        // Play success sound (optional)
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+L3wmolBJa6n9j91N');
            audio.volume = 0.3;
            audio.play().catch(() => {});
        } catch (error) {
            // Ignore audio errors
        }
        
        // Use correct method name
        const updatedUser = userSystem.recordSuccessfulScan(cardName, confidence, mode);
        setCurrentUser(updatedUser);
        
        // Add to recent scans display
        setScannedCards(prev => [{
            id: Date.now(),
            name: cardName,
            confidence: confidence,
            timestamp: new Date().toISOString(),
            mode: mode
        }, ...prev.slice(0, 9)]);
    };
    
    // Camera setup
    useEffect(() => {
        if (!visionService || scanMode !== 'auto') return;
        
        let mounted = true;
        
        const setupCamera = async () => {
            try {
                console.log('🎥 Setting up camera for auto-scan mode...');
                setCameraReady(false);
                setCameraError(null);
                
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(device => device.kind === 'videoinput');
                
                let selectedDeviceId = null;
                for (const device of videoDevices) {
                    const label = device.label.toLowerCase();
                    if (!label.includes('elgato') && 
                        !label.includes('virtual') && 
                        !label.includes('obs') && 
                        !label.includes('zoom') &&
                        !label.includes('teams')) {
                        selectedDeviceId = device.deviceId;
                        console.log('✅ Selected real camera:', device.label);
                        break;
                    }
                }
                
                const constraints = {
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: 'environment'
                    }
                };
                
                if (selectedDeviceId) {
                    constraints.video.deviceId = { exact: selectedDeviceId };
                }
                
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                
                if (mounted && videoRef.current) {
                    if (videoRef.current.srcObject) {
                        const tracks = videoRef.current.srcObject.getTracks();
                        tracks.forEach(track => track.stop());
                    }
                    
                    videoRef.current.srcObject = stream;
                    
                    videoRef.current.onloadedmetadata = () => {
                        if (mounted) {
                            console.log('✅ Camera ready');
                            setCameraReady(true);
                            setCameraError(null);
                        }
                    };
                    
                    videoRef.current.onerror = (e) => {
                        console.error('❌ Video error:', e);
                        if (mounted) setCameraError('Video playback failed');
                    };
                    
                    try {
                        await videoRef.current.play();
                        console.log('▶️ Video playing');
                    } catch (playError) {
                        console.warn('⚠️ Video play warning:', playError.message);
                    }
                }
            } catch (error) {
                console.error('❌ Camera setup failed:', error);
                if (mounted) {
                    setCameraError(`Camera failed: ${error.message}`);
                    setCameraReady(false);
                }
            }
        };
        
        setupCamera();
        
        return () => {
            mounted = false;
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = videoRef.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            }
        };
    }, [visionService, scanMode]);
    
    // AUTO SCANNING FUNCTIONS
    const startAutoScanning = () => {
        if (!visionService || !videoRef.current || cameraError || !cameraReady) {
            console.error('❌ Camera not ready for auto scan');
            return;
        }
        if (scanningRef.current) {
            console.log('⚠️ Already scanning');
            return;
        }
        
        console.log('▶️ Starting auto scan with 3-second countdown...');
        startCountdown();
    };
    
    const startCountdown = () => {
        let count = 3;
        setCountdown(count);
        
        countdownRef.current = setInterval(() => {
            count--;
            if (count > 0) {
                setCountdown(count);
            } else {
                clearInterval(countdownRef.current);
                setCountdown(null);
                startActualScanning();
            }
        }, 1000);
    };
    
    const startActualScanning = () => {
        scanningRef.current = true;
        setIsScanning(true);
        processFrame();
    };
    
    const stopAutoScanning = () => {
        console.log('⏹️ Stopping auto scan...');
        scanningRef.current = false;
        setIsScanning(false);
        setCountdown(null);
        
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }
        
        if (frameTimeoutRef.current) {
            clearTimeout(frameTimeoutRef.current);
            frameTimeoutRef.current = null;
        }
    };
    
    const processFrame = async () => {
        if (!scanningRef.current || !videoRef.current || !visionService) {
            console.log('🛑 Stopping frame processing');
            return;
        }
        
        try {
            console.log('🎯 Processing frame...');
            const result = await visionService.processVideoFrame(videoRef.current);
            
            if (!scanningRef.current) return;
            
            if (result.hasCard) {
                setScanResult({
                    type: 'success',
                    cardName: result.cardName,
                    confidence: result.confidence,
                    detectionConfidence: result.detectionConfidence,
                    dimensions: result.dimensions,
                    processingTime: result.processingTime,
                    timestamp: new Date().toISOString(),
                    scanMode: 'auto'
                });
                
                console.log(`🎯 Auto-scan found: ${result.cardName} (${result.confidence}%)`);
                
                // Only record if high confidence
                if (result.confidence >= 70) {
                    recordSuccessfulScan(result.cardName, result.confidence, 'auto');
                }
                
            } else {
                setScanResult({
                    type: 'waiting',
                    message: result.message,
                    reason: result.reason,
                    details: result.details,
                    timestamp: new Date().toISOString(),
                    scanMode: 'auto'
                });
                console.log(`📍 ${result.reason}: ${result.message}`);
            }
            
        } catch (error) {
            console.error('❌ Frame processing error:', error);
            if (scanningRef.current) {
                setScanResult({
                    type: 'error',
                    message: 'Processing error: ' + error.message,
                    timestamp: new Date().toISOString(),
                    scanMode: 'auto'
                });
            }
        }
        
        if (scanningRef.current) {
            frameTimeoutRef.current = setTimeout(processFrame, 1500);
        }
    };
    
    // MANUAL SCANNING FUNCTIONS
    const handleManualScan = () => {
        if (!visionService) {
            console.error('❌ Vision service not available');
            return;
        }
        fileInputRef.current?.click();
    };
    
    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        console.log('📁 Manual scan starting with file:', file.name);
        setScanResult({
            type: 'processing',
            message: 'Processing uploaded image...',
            timestamp: new Date().toISOString(),
            scanMode: 'manual'
        });
        
        try {
            const dataUrl = await fileToDataUrl(file);
            const result = await visionService.scanCard(dataUrl, 'standard');
            
            if (result.success && result.confidence >= 70) {
                const cardName = result.correctedName || result.cleanText || result.text;
                
                setScanResult({
                    type: 'success',
                    cardName: cardName,
                    confidence: result.confidence,
                    strategy: result.strategy,
                    isKnownCard: result.isKnownCard,
                    finalScore: result.finalScore,
                    timestamp: new Date().toISOString(),
                    scanMode: 'manual'
                });
                
                console.log(`🎯 Manual scan found: ${cardName} (${result.confidence}%)`);
                
                // Only record successful manual scans
                recordSuccessfulScan(cardName, result.confidence, 'manual');
                
            } else {
                setScanResult({
                    type: 'error',
                    message: `Low confidence scan: ${result.confidence}%. Try a clearer image.`,
                    details: `Strategy: ${result.strategy}, Text: "${result.cleanText}"`,
                    timestamp: new Date().toISOString(),
                    scanMode: 'manual'
                });
            }
            
        } catch (error) {
            console.error('❌ Manual scan error:', error);
            setScanResult({
                type: 'error',
                message: 'Failed to process image: ' + error.message,
                timestamp: new Date().toISOString(),
                scanMode: 'manual'
            });
        }
        
        event.target.value = '';
    };
    
    const fileToDataUrl = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };
    
    // COLLECTION MANAGEMENT
    const handleRemoveCard = (cardId) => {
        const updatedUser = userSystem.removeFromCollection(cardId);
        setCurrentUser(updatedUser);
    };
    
    const handleUpdateCardCount = (cardId, newCount) => {
        const updatedUser = userSystem.updateCardCount(cardId, newCount);
        setCurrentUser(updatedUser);
    };
    
    // Cleanup
    useEffect(() => {
        return () => {
            if (frameTimeoutRef.current) {
                clearTimeout(frameTimeoutRef.current);
            }
            if (countdownRef.current) {
                clearInterval(countdownRef.current);
            }
        };
    }, []);
    
    // RENDER FUNCTIONS
    const renderUserInfo = () => {
        if (!currentUser) return null;
        
        return (
            <div style={{ 
                backgroundColor: 'rgba(255,255,255,0.15)', 
                padding: '10px 16px', 
                borderRadius: '8px',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                        🧪 Alpha Tester #{currentUser.alphaNumber}: {currentUser.username}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.8 }}>
                        {currentUser.totalScans} scans • {currentUser.collection.length} unique cards
                    </div>
                </div>
                <button
                    onClick={() => setShowCollection(!showCollection)}
                    style={{
                        padding: '6px 12px',
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                    }}
                >
                    📚 Collection
                </button>
            </div>
        );
    };
    
    const renderCollection = () => {
        if (!showCollection || !currentUser) return null;
        
        const collection = userSystem.getCollection();
        
        return (
            <div style={{ 
                marginBottom: '20px',
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '2px solid #28a745'
            }}>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '15px'
                }}>
                    <h3 style={{ margin: 0 }}>📚 Your Collection ({collection.length} unique cards)</h3>
                    <button
                        onClick={() => setShowCollection(false)}
                        style={{
                            padding: '6px 12px',
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        ✕ Close
                    </button>
                </div>
                
                {collection.length === 0 ? (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '40px',
                        color: '#666'
                    }}>
                        <h4>📦 No cards in collection yet</h4>
                        <p>Start scanning some MTG cards to build your collection!</p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gap: '10px',
                        maxHeight: '400px',
                        overflowY: 'auto'
                    }}>
                        {collection.map(card => (
                            <div key={card.id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '12px',
                                backgroundColor: 'white',
                                borderRadius: '6px',
                                border: '1px solid #ddd'
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                                        {card.name}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#666' }}>
                                        Avg confidence: {card.avgConfidence}% • 
                                        Last scanned: {new Date(card.lastScanned).toLocaleDateString()}
                                    </div>
                                </div>
                                
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '10px' 
                                }}>
                                    <div style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '5px' 
                                    }}>
                                        <button
                                            onClick={() => handleUpdateCardCount(card.id, card.count - 1)}
                                            style={{
                                                padding: '4px 8px',
                                                backgroundColor: '#dc3545',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }}
                                        >
                                            −
                                        </button>
                                        
                                        <span style={{ 
                                            minWidth: '30px', 
                                            textAlign: 'center',
                                            fontWeight: 'bold'
                                        }}>
                                            {card.count}
                                        </span>
                                        
                                        <button
                                            onClick={() => handleUpdateCardCount(card.id, card.count + 1)}
                                            style={{
                                                padding: '4px 8px',
                                                backgroundColor: '#28a745',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }}
                                        >
                                            +
                                        </button>
                                    </div>
                                    
                                    <button
                                        onClick={() => handleRemoveCard(card.id)}
                                        style={{
                                            padding: '4px 8px',
                                            backgroundColor: '#f44336',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '3px',
                                            cursor: 'pointer',
                                            fontSize: '12px'
                                        }}
                                        title="Remove from collection"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };
    
    const renderStatus = () => {
        if (scanMode === 'auto' && cameraError) {
            return (
                <div style={{ padding: '20px', backgroundColor: '#ffebee', border: '1px solid #f44336', borderRadius: '8px' }}>
                    <h3>❌ Camera Error</h3>
                    <p>{cameraError}</p>
                    <p style={{ fontSize: '14px', color: '#666' }}>
                        💡 Try switching to Manual Scan mode or use a different camera
                    </p>
                </div>
            );
        }
        
        if (!visionService) {
            return (
                <div style={{ padding: '20px', backgroundColor: '#ffebee', border: '1px solid #f44336', borderRadius: '8px' }}>
                    <h3>❌ Service Error</h3>
                    <p>Vision service failed to initialize</p>
                </div>
            );
        }
        
        if (scanMode === 'auto' && !cameraReady) {
            return (
                <div style={{ padding: '20px', backgroundColor: '#fff3e0', border: '1px solid #ff9800', borderRadius: '8px', textAlign: 'center' }}>
                    <h3>📹 Setting up Camera...</h3>
                    <p>Connecting for auto-scan mode...</p>
                </div>
            );
        }
        
        if (countdown !== null) {
            return (
                <div style={{ padding: '20px', backgroundColor: '#e3f2fd', border: '1px solid #2196f3', borderRadius: '8px', textAlign: 'center' }}>
                    <h3>🕐 Scan Starting in {countdown}...</h3>
                    <p>Position your MTG card clearly in the camera view</p>
                    <button 
                        onClick={stopAutoScanning}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                </div>
            );
        }
        
        if (!scanResult) {
            if (scanMode === 'auto') {
                return (
                    <div style={{ padding: '20px', backgroundColor: '#e8f5e8', border: '1px solid #4caf50', borderRadius: '8px', textAlign: 'center' }}>
                        <h3>✅ Auto-Scan Ready!</h3>
                        <p>Camera ready for automatic card scanning</p>
                    </div>
                );
            } else {
                return (
                    <div style={{ padding: '20px', backgroundColor: '#e8f5e8', border: '1px solid #4caf50', borderRadius: '8px', textAlign: 'center' }}>
                        <h3>📁 Manual Scan Ready!</h3>
                        <p>Click "Upload & Scan" to select an image file</p>
                    </div>
                );
            }
        }
        
        switch (scanResult.type) {
            case 'processing':
                return (
                    <div style={{ padding: '20px', backgroundColor: '#e3f2fd', border: '1px solid #2196f3', borderRadius: '8px', textAlign: 'center' }}>
                        <h3>🔄 Processing...</h3>
                        <p>{scanResult.message}</p>
                    </div>
                );
                
            case 'success':
                return (
                    <div style={{ padding: '20px', backgroundColor: '#e8f5e8', border: '1px solid #4caf50', borderRadius: '8px' }}>
                        <h3>✅ Card Detected ({scanResult.scanMode}) 🔔</h3>
                        <p style={{ fontSize: '20px', fontWeight: 'bold', margin: '10px 0' }}>{scanResult.cardName}</p>
                        <p>Confidence: <strong>{scanResult.confidence}%</strong></p>
                        {scanResult.strategy && <p>Strategy: <strong>{scanResult.strategy}</strong></p>}
                        {scanResult.processingTime && <p>Processing Time: {scanResult.processingTime}ms</p>}
                        <p style={{ fontSize: '12px', color: '#28a745', fontWeight: 'bold' }}>
                            🔔 Added to collection!
                        </p>
                    </div>
                );
                
            case 'waiting':
                return (
                    <div style={{ padding: '20px', backgroundColor: '#fff3e0', border: '1px solid #ff9800', borderRadius: '8px' }}>
                        <h3>🔍 Looking for Card...</h3>
                        <p>{scanResult.message}</p>
                        {scanResult.details && <p style={{ fontSize: '12px', color: '#999' }}>{scanResult.details}</p>}
                    </div>
                );
                
            case 'error':
                return (
                    <div style={{ padding: '20px', backgroundColor: '#ffebee', border: '1px solid #f44336', borderRadius: '8px' }}>
                        <h3>❌ Scan Error ({scanResult.scanMode})</h3>
                        <p>{scanResult.message}</p>
                        {scanResult.details && <p style={{ fontSize: '12px', color: '#666' }}>{scanResult.details}</p>}
                    </div>
                );
                
            default:
                return null;
        }
    };
    
    const renderHistory = () => {
        if (scannedCards.length === 0) return null;
        
        return (
            <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                <h4>📋 Recent Scans ({scannedCards.length})</h4>
                {scannedCards.slice(0, 5).map(card => (
                    <div key={card.id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '8px', 
                        margin: '5px 0', 
                        backgroundColor: 'white', 
                        borderRadius: '4px' 
                    }}>
                        <span style={{ fontWeight: 'bold' }}>{card.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ 
                                padding: '2px 6px',
                                backgroundColor: card.mode === 'auto' ? '#2196f3' : '#ff9800',
                                color: 'white',
                                borderRadius: '3px',
                                fontSize: '11px'
                            }}>
                                {card.mode}
                            </span>
                            <span>{card.confidence}%</span>
                            <span style={{ fontSize: '12px', color: '#666' }}>
                                {new Date(card.timestamp).toLocaleTimeString()}
                            </span>
                        </div>
                    </div>
                ))}
                <button 
                    onClick={() => setScannedCards([])}
                    style={{ 
                        marginTop: '10px', 
                        padding: '8px 16px', 
                        backgroundColor: '#f44336', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Clear History
                </button>
            </div>
        );
    };

    // Admin panel check
    if (showAdminPanel) {
        return <AdminPanel />;
    }
    
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            {/* Header */}
            <div style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px', 
                padding: '20px', 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                color: 'white', 
                borderRadius: '12px' 
            }}>
                <div style={{ flex: 1 }}>
                    <h1 style={{ margin: 0, fontSize: '28px' }}>🃏 MTG Infinity Scanner</h1>
                    {renderUserInfo()}
                    <span style={{ fontWeight: 'bold' }}>
                        {countdown !== null ? `🕐 Starting in ${countdown}...` :
                         isScanning ? '🟢 Auto-Scanning Active' : 
                         scanMode === 'auto' && cameraReady ? '🔴 Auto-Scan Ready' : 
                         scanMode === 'manual' ? '📁 Manual Scan Mode' :
                         '🟡 Setting up...'}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <DonationButton placement="header" />
                    <button
                        onDoubleClick={() => setShowAdminPanel(true)}
                        style={{
                            padding: '6px 8px',
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            opacity: 0.7
                        }}
                        title="Double-click for admin access"
                    >
                        🔧
                    </button>
                </div>
            </div>
            
            {/* Collection View */}
            {renderCollection()}
            
            {/* Scan Mode Toggle */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                marginBottom: '20px',
                gap: '10px'
            }}>
                <button
                    onClick={() => setScanMode('auto')}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: scanMode === 'auto' ? '#4caf50' : '#e0e0e0',
                        color: scanMode === 'auto' ? 'white' : '#333',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    📹 Auto Scan (Camera)
                </button>
                <button
                    onClick={() => setScanMode('manual')}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: scanMode === 'manual' ? '#4caf50' : '#e0e0e0',
                        color: scanMode === 'manual' ? 'white' : '#333',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    📁 Manual Scan (Upload)
                </button>
            </div>
            
            {/* Video Container (Auto Mode Only) */}
            {scanMode === 'auto' && (
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ 
                        position: 'relative',
                        display: 'inline-block',
                        border: '3px solid #4caf50',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        backgroundColor: '#000'
                    }}>
                        <video 
                            ref={videoRef}
                            autoPlay 
                            playsInline 
                            muted
                            style={{
                                width: '100%',
                                maxWidth: '640px',
                                height: 'auto',
                                display: 'block'
                            }}
                        />
                        {!cameraReady && (
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                color: 'white',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                textAlign: 'center',
                                backgroundColor: 'rgba(0,0,0,0.8)',
                                padding: '20px',
                                borderRadius: '8px'
                            }}>
                                📹<br/>Connecting to Camera...
                            </div>
                        )}
                        {countdown !== null && (
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                color: 'white',
                                fontSize: '48px',
                                fontWeight: 'bold',
                                textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                            }}>
                                {countdown}
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* Controls */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                {scanMode === 'auto' ? (
                    <button 
                        onClick={isScanning || countdown !== null ? stopAutoScanning : startAutoScanning}
                        disabled={!!cameraError || !visionService || !cameraReady}
                        style={{
                            padding: '16px 32px',
                            fontSize: '18px',
                            backgroundColor: (isScanning || countdown !== null) ? '#f44336' : '#4caf50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: (!!cameraError || !visionService || !cameraReady) ? 'not-allowed' : 'pointer',
                            opacity: (!!cameraError || !visionService || !cameraReady) ? 0.6 : 1,
                            fontWeight: 'bold'
                        }}
                    >
                        {countdown !== null ? '⏹️ Cancel Countdown' :
                         isScanning ? '⏹️ Stop Auto-Scan' : '▶️ Start Auto-Scan (3s)'}
                    </button>
                ) : (
                    <div>
                        <button 
                            onClick={handleManualScan}
                            disabled={!visionService}
                            style={{
                                padding: '16px 32px',
                                fontSize: '18px',
                                backgroundColor: '#ff9800',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: !visionService ? 'not-allowed' : 'pointer',
                                opacity: !visionService ? 0.6 : 1,
                                fontWeight: 'bold'
                            }}
                        >
                            📁 Upload & Scan Image
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                        />
                        <p style={{ margin: '10px 0 0 0', color: '#666', fontSize: '14px' }}>
                            Supports: JPG, PNG, WEBP • Max size: 10MB
                        </p>
                    </div>
                )}
            </div>
            
            {/* Results */}
            <div>
                {renderStatus()}
                {renderHistory()}
            </div>

            {/* Footer */}
            <div style={{ 
                marginTop: '40px', 
                padding: '20px', 
                textAlign: 'center',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
            }}>
                <p style={{ margin: '0 0 15px 0', color: '#666' }}>
                    🍕 Support a Starving Dev - Coffee and ramen funds appreciated!
                </p>
                <DonationButton placement="footer" />
                <p style={{ margin: '15px 0 0 0', fontSize: '12px', color: '#999' }}>
                    Alpha Build • Collection System • Built with ❤️ for Magic players
                </p>
            </div>
        </div>
    );
};

export default Scanner;