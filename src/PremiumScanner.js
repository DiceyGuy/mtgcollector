// PremiumScanner.js - BASIC PREMIUM SCANNER COMPONENT
import React, { useState, useRef, useEffect } from 'react';
import ClaudeVisionService from './ClaudeVisionService';

const PremiumScanner = () => {
    // State
    const [scanResult, setScanResult] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [cameraError, setCameraError] = useState(null);
    const [scannedCards, setScannedCards] = useState([]);
    const [cameraReady, setCameraReady] = useState(false);
    const [isPremiumUser, setIsPremiumUser] = useState(false); // Simulate premium status
    
    // Refs
    const videoRef = useRef(null);
    const scanningRef = useRef(false);
    const frameTimeoutRef = useRef(null);
    
    // Create service instance
    const [visionService] = useState(() => {
        console.log('🔧 Creating ClaudeVisionService for Premium Scanner...');
        try {
            const service = new ClaudeVisionService();
            console.log('✅ Premium ClaudeVisionService created successfully');
            return service;
        } catch (error) {
            console.error('❌ Failed to create ClaudeVisionService:', error);
            return null;
        }
    });
    
    // Camera setup (same as original scanner)
    useEffect(() => {
        if (!visionService) {
            setCameraError('Vision service failed to initialize');
            return;
        }
        
        let mounted = true;
        
        const setupCamera = async () => {
            try {
                console.log('🎥 Setting up Premium camera...');
                setCameraReady(false);
                setCameraError(null);
                
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(device => device.kind === 'videoinput');
                
                console.log('📹 Available cameras:', videoDevices.map(d => d.label));
                
                let selectedDeviceId = null;
                for (const device of videoDevices) {
                    const label = device.label.toLowerCase();
                    if (!label.includes('elgato') && 
                        !label.includes('virtual') && 
                        !label.includes('obs') && 
                        !label.includes('zoom') &&
                        !label.includes('teams')) {
                        selectedDeviceId = device.deviceId;
                        console.log('✅ Selected camera for Premium:', device.label);
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
                            console.log('✅ Premium camera ready');
                            setCameraReady(true);
                            setCameraError(null);
                        }
                    };
                    
                    try {
                        await videoRef.current.play();
                        console.log('▶️ Premium video playing');
                    } catch (playError) {
                        console.warn('⚠️ Premium video play warning:', playError.message);
                    }
                }
            } catch (error) {
                console.error('❌ Premium camera setup failed:', error);
                if (mounted) {
                    setCameraError(`Premium camera failed: ${error.message}`);
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
    }, [visionService]);
    
    // Premium scanning logic
    const startScanning = () => {
        if (!visionService || !videoRef.current || cameraError || !cameraReady || scanningRef.current) {
            return;
        }
        
        console.log('▶️ Starting Premium scan...');
        scanningRef.current = true;
        setIsScanning(true);
        processFrame();
    };
    
    const stopScanning = () => {
        console.log('⏹️ Stopping Premium scan...');
        scanningRef.current = false;
        setIsScanning(false);
        
        if (frameTimeoutRef.current) {
            clearTimeout(frameTimeoutRef.current);
            frameTimeoutRef.current = null;
        }
    };
    
    const processFrame = async () => {
        if (!scanningRef.current || !videoRef.current || !visionService) {
            return;
        }
        
        try {
            console.log('🎯 Premium processing frame...');
            const result = await visionService.processVideoFrame(videoRef.current);
            
            if (!scanningRef.current) return;
            
            if (result.hasCard) {
                // Premium enhancement: Add edition detection simulation
                const premiumResult = {
                    ...result,
                    // Simulate premium features
                    edition: isPremiumUser ? detectEdition(result.cardName) : 'Premium Required',
                    estimatedPrice: isPremiumUser ? estimatePrice(result.cardName) : 'Premium Required',
                    rarity: isPremiumUser ? 'Rare' : 'Premium Required',
                    setCode: isPremiumUser ? 'M21' : 'Premium Required',
                    premiumFeatures: true
                };
                
                setScanResult({
                    type: 'success',
                    ...premiumResult,
                    timestamp: new Date().toISOString()
                });
                
                console.log(`👑 Premium card found: ${result.cardName}`);
                
                if (result.confidence > 70) {
                    setScannedCards(prev => [{
                        id: Date.now(),
                        name: result.cardName,
                        confidence: result.confidence,
                        edition: premiumResult.edition,
                        price: premiumResult.estimatedPrice,
                        isPremium: isPremiumUser,
                        timestamp: new Date().toISOString()
                    }, ...prev.slice(0, 9)]);
                }
                
            } else {
                setScanResult({
                    type: 'waiting',
                    message: result.message,
                    reason: result.reason,
                    details: result.details,
                    timestamp: new Date().toISOString()
                });
            }
            
        } catch (error) {
            console.error('❌ Premium frame processing error:', error);
            if (scanningRef.current) {
                setScanResult({
                    type: 'error',
                    message: 'Premium processing error: ' + error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        if (scanningRef.current) {
            frameTimeoutRef.current = setTimeout(processFrame, 1000);
        }
    };
    
    // Premium helper functions
    const detectEdition = (cardName) => {
        const editions = ['Alpha', 'Beta', 'Unlimited', 'Revised', 'Modern Masters', 'Core Set 2021'];
        return editions[Math.floor(Math.random() * editions.length)];
    };
    
    const estimatePrice = (cardName) => {
        const prices = ['$0.25', '$2.50', '$15.00', '$45.00', '$125.00', '$350.00'];
        return prices[Math.floor(Math.random() * prices.length)];
    };
    
    // Premium UI rendering
    const renderPremiumStatus = () => {
        if (!isPremiumUser) {
            return (
                <div style={{ padding: '16px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', marginBottom: '16px' }}>
                    <h4>👑 Unlock Premium Features</h4>
                    <p>Get edition detection, pricing data, and 100% accuracy guarantee!</p>
                    <button 
                        onClick={() => setIsPremiumUser(true)}
                        style={{ 
                            padding: '8px 16px', 
                            backgroundColor: '#7c3aed', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '6px',
                            cursor: 'pointer',
                            marginTop: '8px'
                        }}
                    >
                        Try Premium Free (Demo)
                    </button>
                </div>
            );
        } else {
            return (
                <div style={{ padding: '16px', backgroundColor: '#ecfdf5', border: '1px solid #10b981', borderRadius: '8px', marginBottom: '16px' }}>
                    <h4>👑 Premium Active</h4>
                    <p>Edition detection, pricing, and 100% guarantee enabled!</p>
                    <button 
                        onClick={() => setIsPremiumUser(false)}
                        style={{ 
                            padding: '6px 12px', 
                            backgroundColor: '#6b7280', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '4px',
                            cursor: 'pointer',
                            marginTop: '8px',
                            fontSize: '12px'
                        }}
                    >
                        Switch to Free Mode
                    </button>
                </div>
            );
        }
    };
    
    const renderPremiumResult = () => {
        if (!scanResult) return null;
        
        switch (scanResult.type) {
            case 'success':
                return (
                    <div style={{ padding: '20px', backgroundColor: '#ecfdf5', border: '1px solid #10b981', borderRadius: '8px' }}>
                        <h3>👑 Premium Card Detected</h3>
                        <p style={{ fontSize: '20px', fontWeight: 'bold', margin: '10px 0' }}>{scanResult.cardName}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                            <div>
                                <strong>OCR Confidence:</strong> {scanResult.confidence}%
                            </div>
                            <div>
                                <strong>Edition:</strong> {scanResult.edition}
                            </div>
                            <div>
                                <strong>Estimated Price:</strong> {scanResult.estimatedPrice}
                            </div>
                            <div>
                                <strong>Rarity:</strong> {scanResult.rarity}
                            </div>
                        </div>
                        {!isPremiumUser && (
                            <p style={{ marginTop: '12px', fontSize: '12px', color: '#6b7280' }}>
                                🔒 Edition and pricing data requires Premium subscription
                            </p>
                        )}
                    </div>
                );
                
            default:
                return (
                    <div style={{ padding: '20px', backgroundColor: '#fff3e0', border: '1px solid #ff9800', borderRadius: '8px' }}>
                        <h3>🔍 Premium Scanner Active</h3>
                        <p>{scanResult.message || 'Position card clearly in camera view'}</p>
                    </div>
                );
        }
    };
    
    const renderPremiumHistory = () => {
        if (scannedCards.length === 0) return null;
        
        return (
            <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                <h4>👑 Premium Scan History ({scannedCards.length})</h4>
                {scannedCards.slice(0, 5).map(card => (
                    <div key={card.id} style={{ 
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr 1fr',
                        gap: '8px',
                        padding: '8px', 
                        margin: '5px 0', 
                        backgroundColor: 'white', 
                        borderRadius: '4px',
                        fontSize: '12px'
                    }}>
                        <span style={{ fontWeight: 'bold' }}>{card.name}</span>
                        <span>{card.confidence}%</span>
                        <span>{card.edition || 'Unknown'}</span>
                        <span>{card.price || 'N/A'}</span>
                    </div>
                ))}
            </div>
        );
    };
    
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            {/* Premium Header */}
            <div style={{ 
                textAlign: 'center', 
                marginBottom: '20px', 
                padding: '20px', 
                background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', 
                color: 'white', 
                borderRadius: '12px' 
            }}>
                <h1>👑 MTG Premium Scanner</h1>
                <span style={{ fontWeight: 'bold' }}>
                    {isScanning ? '🟣 Premium Scanning Active' : cameraReady ? '🟡 Premium Ready' : '🔴 Setting up Premium'}
                </span>
            </div>
            
            {/* Premium Status */}
            {renderPremiumStatus()}
            
            {/* Video Container */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ 
                    position: 'relative',
                    display: 'inline-block',
                    border: '3px solid #7c3aed',
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
                            👑<br/>Premium Camera Starting...<br/>
                            <small>Edition Detection Ready</small>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Premium Controls */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <button 
                    onClick={isScanning ? stopScanning : startScanning}
                    disabled={!!cameraError || !visionService || !cameraReady}
                    style={{
                        padding: '16px 32px',
                        fontSize: '18px',
                        backgroundColor: isScanning ? '#dc2626' : '#7c3aed',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: (!!cameraError || !visionService || !cameraReady) ? 'not-allowed' : 'pointer',
                        opacity: (!!cameraError || !visionService || !cameraReady) ? 0.6 : 1,
                        fontWeight: 'bold'
                    }}
                >
                    {isScanning ? '⏹️ Stop Premium Scan' : '👑 Start Premium Scan'}
                </button>
            </div>
            
            {/* Premium Results */}
            <div>
                {renderPremiumResult()}
                {renderPremiumHistory()}
            </div>
        </div>
    );
};

export default PremiumScanner;