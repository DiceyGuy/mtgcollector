// Scanner.js - FIXED SCANNING LOGIC

import React, { useState, useRef, useEffect } from 'react';
import ClaudeVisionService from './ClaudeVisionService';

const Scanner = () => {
    // State
    const [scanResult, setScanResult] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [cameraError, setCameraError] = useState(null);
    const [scannedCards, setScannedCards] = useState([]);
    const [cameraReady, setCameraReady] = useState(false);
    
    // Refs
    const videoRef = useRef(null);
    const scanningRef = useRef(false); // FIXED: Use ref to track scanning state
    const frameTimeoutRef = useRef(null); // FIXED: Track timeout to prevent duplicates
    
    // Create service instance once when component mounts
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
    
    // Camera setup - only run once
    useEffect(() => {
        if (!visionService) {
            setCameraError('Vision service failed to initialize');
            return;
        }
        
        let mounted = true;
        
        const setupCamera = async () => {
            try {
                console.log('🎥 Setting up REAL camera (avoiding virtual cameras)...');
                setCameraReady(false);
                setCameraError(null);
                
                // Get list of all cameras and avoid virtual ones
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(device => device.kind === 'videoinput');
                
                console.log('📹 Available cameras:', videoDevices.map(d => d.label));
                
                // Try to find a real camera (not virtual)
                let selectedDeviceId = null;
                for (const device of videoDevices) {
                    const label = device.label.toLowerCase();
                    // Skip virtual cameras
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
                
                // Camera constraints - force real camera
                const constraints = {
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: 'environment'
                    }
                };
                
                // If we found a real camera, use it specifically
                if (selectedDeviceId) {
                    constraints.video.deviceId = { exact: selectedDeviceId };
                }
                
                console.log('🎥 Requesting camera with constraints:', constraints);
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                
                if (mounted && videoRef.current) {
                    // Stop any existing stream first
                    if (videoRef.current.srcObject) {
                        const tracks = videoRef.current.srcObject.getTracks();
                        tracks.forEach(track => track.stop());
                    }
                    
                    videoRef.current.srcObject = stream;
                    
                    // FIXED: Better video loading handling
                    videoRef.current.onloadedmetadata = () => {
                        if (mounted) {
                            console.log('✅ Real camera ready and displaying');
                            console.log('📐 Video dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
                            setCameraReady(true);
                            setCameraError(null);
                        }
                    };
                    
                    videoRef.current.onerror = (e) => {
                        console.error('❌ Video element error:', e);
                        if (mounted) setCameraError('Video playback failed');
                    };
                    
                    // Force play
                    try {
                        await videoRef.current.play();
                        console.log('▶️ Video playing successfully');
                    } catch (playError) {
                        console.warn('⚠️ Video play warning (may still work):', playError.message);
                    }
                    
                    console.log('📹 Real camera stream assigned successfully');
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
            // Cleanup camera stream
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = videoRef.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            }
        };
    }, [visionService]);
    
    // FIXED: Better scanning control
    const startScanning = () => {
        if (!visionService) {
            console.error('❌ Vision service not available');
            return;
        }
        if (!videoRef.current || cameraError || !cameraReady) {
            console.error('❌ Camera not ready');
            return;
        }
        if (scanningRef.current) {
            console.log('⚠️ Already scanning, ignoring duplicate start');
            return;
        }
        
        console.log('▶️ Starting scan...');
        scanningRef.current = true;
        setIsScanning(true);
        processFrame();
    };
    
    // FIXED: Better stop control
    const stopScanning = () => {
        console.log('⏹️ Stopping scan...');
        scanningRef.current = false;
        setIsScanning(false);
        
        // Clear any pending timeouts
        if (frameTimeoutRef.current) {
            clearTimeout(frameTimeoutRef.current);
            frameTimeoutRef.current = null;
        }
    };
    
    // FIXED: More robust frame processing
    const processFrame = async () => {
        // Check if we should still be scanning
        if (!scanningRef.current || !videoRef.current || !visionService) {
            console.log('🛑 Stopping frame processing (scanning stopped or resources unavailable)');
            return;
        }
        
        try {
            console.log('🎯 Processing frame...');
            const result = await visionService.processVideoFrame(videoRef.current);
            
            // Only update state if still scanning
            if (!scanningRef.current) return;
            
            if (result.hasCard) {
                // Success: Valid card detected
                setScanResult({
                    type: 'success',
                    cardName: result.cardName,
                    confidence: result.confidence,
                    detectionConfidence: result.detectionConfidence,
                    dimensions: result.dimensions,
                    processingTime: result.processingTime,
                    timestamp: new Date().toISOString()
                });
                
                console.log(`🎯 Card found: ${result.cardName} (${result.confidence}%)`);
                
                // Add to history
                if (result.confidence > 70) {
                    setScannedCards(prev => [{
                        id: Date.now(),
                        name: result.cardName,
                        confidence: result.confidence,
                        timestamp: new Date().toISOString()
                    }, ...prev.slice(0, 9)]);
                }
                
            } else {
                // Waiting: No valid card
                setScanResult({
                    type: 'waiting',
                    message: result.message,
                    reason: result.reason,
                    details: result.details,
                    timestamp: new Date().toISOString()
                });
                console.log(`📍 ${result.reason}: ${result.message}`);
            }
            
        } catch (error) {
            console.error('❌ Frame processing error:', error);
            if (scanningRef.current) {
                setScanResult({
                    type: 'error',
                    message: 'Processing error: ' + error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        // Continue scanning if still active
        if (scanningRef.current) {
            frameTimeoutRef.current = setTimeout(processFrame, 1000); // FIXED: Slower, more stable rate
        }
    };
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (frameTimeoutRef.current) {
                clearTimeout(frameTimeoutRef.current);
            }
        };
    }, []);
    
    // Render scan status
    const renderStatus = () => {
        if (cameraError) {
            return (
                <div style={{ padding: '20px', backgroundColor: '#ffebee', border: '1px solid #f44336', borderRadius: '8px' }}>
                    <h3>❌ Camera Error</h3>
                    <p>{cameraError}</p>
                    <p style={{ fontSize: '14px', color: '#666' }}>
                        💡 <strong>Tip:</strong> If using Elgato/Virtual camera, try switching to your built-in webcam
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
        
        if (!cameraReady) {
            return (
                <div style={{ padding: '20px', backgroundColor: '#fff3e0', border: '1px solid #ff9800', borderRadius: '8px', textAlign: 'center' }}>
                    <h3>📹 Setting up Real Camera...</h3>
                    <p>Connecting to HD Pro Webcam C920...</p>
                </div>
            );
        }
        
        if (!scanResult) {
            return (
                <div style={{ padding: '20px', backgroundColor: '#e8f5e8', border: '1px solid #4caf50', borderRadius: '8px', textAlign: 'center' }}>
                    <h3>✅ Real Camera Active!</h3>
                    <p>HD Pro Webcam C920 ready! Click "Start Scanning" to begin</p>
                </div>
            );
        }
        
        switch (scanResult.type) {
            case 'success':
                return (
                    <div style={{ padding: '20px', backgroundColor: '#e8f5e8', border: '1px solid #4caf50', borderRadius: '8px' }}>
                        <h3>✅ Card Detected</h3>
                        <p style={{ fontSize: '20px', fontWeight: 'bold', margin: '10px 0' }}>{scanResult.cardName}</p>
                        <p>OCR Confidence: <strong>{scanResult.confidence}%</strong></p>
                        {scanResult.detectionConfidence && (
                            <p>Detection: <strong>{(scanResult.detectionConfidence * 100).toFixed(1)}%</strong></p>
                        )}
                        <p>Size: {scanResult.dimensions} | Time: {scanResult.processingTime}ms</p>
                    </div>
                );
                
            case 'waiting':
                return (
                    <div style={{ padding: '20px', backgroundColor: '#fff3e0', border: '1px solid #ff9800', borderRadius: '8px' }}>
                        <h3>🔍 Looking for Card...</h3>
                        <p>{scanResult.message}</p>
                        {scanResult.reason && <p style={{ fontSize: '14px', color: '#666' }}>Issue: {scanResult.reason.replace(/_/g, ' ')}</p>}
                        {scanResult.details && <p style={{ fontSize: '12px', color: '#999' }}>Details: {scanResult.details}</p>}
                    </div>
                );
                
            case 'error':
                return (
                    <div style={{ padding: '20px', backgroundColor: '#ffebee', border: '1px solid #f44336', borderRadius: '8px' }}>
                        <h3>❌ Scanner Error</h3>
                        <p>{scanResult.message}</p>
                    </div>
                );
                
            default:
                return null;
        }
    };
    
    // Render scanned cards history
    const renderHistory = () => {
        if (scannedCards.length === 0) return null;
        
        return (
            <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                <h4>📋 Recent Scans ({scannedCards.length})</h4>
                {scannedCards.slice(0, 5).map(card => (
                    <div key={card.id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        padding: '8px', 
                        margin: '5px 0', 
                        backgroundColor: 'white', 
                        borderRadius: '4px' 
                    }}>
                        <span style={{ fontWeight: 'bold' }}>{card.name}</span>
                        <span>{card.confidence}%</span>
                        <span style={{ fontSize: '12px', color: '#666' }}>
                            {new Date(card.timestamp).toLocaleTimeString()}
                        </span>
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
                        borderRadius: '4px' 
                    }}
                >
                    Clear History
                </button>
            </div>
        );
    };
    
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            {/* Header */}
            <div style={{ 
                textAlign: 'center', 
                marginBottom: '20px', 
                padding: '20px', 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                color: 'white', 
                borderRadius: '12px' 
            }}>
                <h1>🃏 MTG Infinity Scanner</h1>
                <span style={{ fontWeight: 'bold' }}>
                    {isScanning ? '🟢 Scanning Active' : cameraReady ? '🔴 Camera Ready' : '🟡 Setting up Camera'}
                </span>
            </div>
            
            {/* Video Container */}
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
                            📹<br/>Connecting to Camera...<br/>
                            <small>HD Pro Webcam C920</small>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Controls */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <button 
                    onClick={isScanning ? stopScanning : startScanning}
                    disabled={!!cameraError || !visionService || !cameraReady}
                    style={{
                        padding: '16px 32px',
                        fontSize: '18px',
                        backgroundColor: isScanning ? '#f44336' : '#4caf50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: (!!cameraError || !visionService || !cameraReady) ? 'not-allowed' : 'pointer',
                        opacity: (!!cameraError || !visionService || !cameraReady) ? 0.6 : 1,
                        fontWeight: 'bold'
                    }}
                >
                    {isScanning ? '⏹️ Stop Scanning' : '▶️ Start Scanning'}
                </button>
            </div>
            
            {/* Results */}
            <div>
                {renderStatus()}
                {renderHistory()}
            </div>
        </div>
    );
};

export default Scanner;