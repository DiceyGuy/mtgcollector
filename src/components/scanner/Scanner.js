// FINAL WORKING WORLD-CLASS Scanner - Copy This Exact Code
// Location: C:\Users\kim-a\Documents\DiceyTeck\MTG Scanner\src\components\scanner\Scanner.js

import React, { useState, useRef, useEffect, useCallback } from 'react';
import WorldClassMTGScanner from '../../../ClaudeVisionService';

const worldClassScanner = new WorldClassMTGScanner();

const Scanner = () => {
    // Core state
    const [isScanning, setIsScanning] = useState(false);
    const [scanResults, setScanResults] = useState(null);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [userGuidance, setUserGuidance] = useState('🌟 World-Class MTG Scanner Ready!');
    const [confidence, setConfidence] = useState(0);
    const [processingTime, setProcessingTime] = useState(0);
    const [currentStrategy, setCurrentStrategy] = useState('adaptive');
    const [scanCount, setScanCount] = useState(0);
    
    // Refs
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    // ✅ WORLD-CLASS: Multiple zone strategies
    const ZONE_STRATEGIES = {
        primary: {
            name: 'Primary Name Zone',
            zone: { x: 0.08, y: 0.08, width: 0.70, height: 0.12 },
            color: 'border-green-500 bg-green-500'
        },
        secondary: {
            name: 'Secondary Higher',
            zone: { x: 0.08, y: 0.05, width: 0.70, height: 0.15 },
            color: 'border-blue-500 bg-blue-500'
        }
    };

    // Initialize
    useEffect(() => {
        console.log('🌟 WORLD-CLASS MTG Scanner initializing...');
        
        const initializeWorldClassScanner = async () => {
            try {
                console.log('🔧 Initializing WORLD-CLASS adaptive system...');
                
                await worldClassScanner.initialize();
                
                console.log('✅ WORLD-CLASS system ready!');
                setUserGuidance('🌟 World-Class MTG Scanner ready! Multi-zone adaptive recognition active.');
                
            } catch (error) {
                console.error('❌ World-class initialization failed:', error);
                setUserGuidance('❌ Initialization failed. Please refresh page.');
            }
        };
        
        initializeWorldClassScanner();
        
        return () => {
            cleanup();
        };
    }, []);

    const initializeCamera = useCallback(async () => {
        try {
            console.log('📹 Starting WORLD-CLASS camera...');
            setIsCameraReady(false);
            setUserGuidance('📹 Starting world-class vision system...');
            
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            
            const constraints = {
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 }
                }
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Video timeout')), 8000);
                    
                    videoRef.current.onloadedmetadata = () => {
                        clearTimeout(timeout);
                        videoRef.current.play().then(resolve).catch(reject);
                    };
                });
                
                console.log(`✅ WORLD-CLASS camera: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
                
                setupCanvas();
                setIsCameraReady(true);
                setUserGuidance('🌟 WORLD-CLASS READY! Multiple detection zones active.');
            }
            
        } catch (error) {
            console.error('❌ Camera failed:', error);
            setIsCameraReady(false);
            setUserGuidance('❌ Camera failed. Check permissions.');
        }
    }, []);

    const setupCanvas = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        console.log(`📸 WORLD-CLASS canvas: ${canvas.width}x${canvas.height}`);
        console.log(`🎯 Multi-zone strategies loaded: ${Object.keys(ZONE_STRATEGIES).length}`);
    }, []);

    const captureFrame = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return null;
        
        try {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            console.log(`📸 Frame captured for WORLD-CLASS processing`);
            return canvas;
            
        } catch (error) {
            console.error('❌ Frame capture failed:', error);
            return null;
        }
    }, []);

    // ✅ WORLD-CLASS: Main scanning function
    const performWorldClassScan = useCallback(async () => {
        if (isScanning || !isCameraReady) return;
        
        setIsScanning(true);
        setUserGuidance('🌟 World-class adaptive scan in progress...');
        
        try {
            console.log('🌟 WORLD-CLASS ADAPTIVE SCAN starting...');
            
            const frameCanvas = captureFrame();
            if (!frameCanvas) {
                throw new Error('Failed to capture frame');
            }
            
            const startTime = performance.now();
            
            // ✅ CORRECT: Use the right method name
            const result = await worldClassScanner.scanCardWithAdaptiveStrategy(frameCanvas);
            
            const endTime = performance.now();
            const processingTimeMs = endTime - startTime;
            
            console.log('🌟 WORLD-CLASS result:', result);
            
            setScanCount(prev => prev + 1);
            
            if (result && result.cardName && result.confidence > 30) {
                const formattedResult = {
                    success: true,
                    text: result.cardName,
                    confidence: result.confidence / 100,
                    method: result.method,
                    strategy: result.strategy,
                    zoneUsed: result.zoneUsed,
                    processingTime: Math.round(processingTimeMs)
                };
                
                setScanResults(formattedResult);
                setConfidence(result.confidence);
                setProcessingTime(Math.round(processingTimeMs));
                setCurrentStrategy(result.strategy || 'adaptive');
                
                console.log(`🌟 WORLD-CLASS SUCCESS: ${result.cardName}`);
                console.log(`🧠 Method: ${result.method} | Strategy: ${result.strategy} | Confidence: ${result.confidence}%`);
                
                if (result.confidence > 85) {
                    setUserGuidance(`🌟 PERFECT! ${result.cardName} (${result.confidence}% in ${Math.round(processingTimeMs)}ms)`);
                } else if (result.confidence > 70) {
                    setUserGuidance(`✅ EXCELLENT! ${result.cardName} (${result.confidence}% confidence)`);
                } else {
                    setUserGuidance(`✅ Found: ${result.cardName} (${result.confidence}% confidence)`);
                }
            } else {
                console.log('❌ No high-confidence card name detected');
                setScanResults({
                    success: false,
                    error: 'No high-confidence card name detected across all zones',
                    confidence: 0,
                    processingTime: Math.round(processingTimeMs)
                });
                setUserGuidance('❌ Could not clearly read card name. Ensure card is well-lit.');
            }
            
        } catch (error) {
            console.error('❌ World-class scan failed:', error);
            setUserGuidance('❌ Scan failed. Try again.');
            setScanResults({
                success: false,
                error: error.message,
                confidence: 0,
                processingTime: 0
            });
        } finally {
            setIsScanning(false);
        }
    }, [isScanning, isCameraReady, captureFrame]);

    const stopCamera = useCallback(() => {
        console.log('📹 Stopping camera...');
        
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        
        setIsCameraReady(false);
        setUserGuidance('📹 Camera stopped');
    }, []);

    const cleanup = useCallback(() => {
        console.log('🧹 Cleaning up world-class scanner...');
        
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        
        worldClassScanner.terminate();
    }, []);

    const getConfidenceColor = () => {
        if (confidence > 85) return 'text-green-600';
        if (confidence > 70) return 'text-blue-600';
        if (confidence > 50) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getSpeedColor = () => {
        if (processingTime < 200) return 'text-green-600';
        if (processingTime < 400) return 'text-blue-600';
        if (processingTime < 600) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className="scanner-container p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-4xl font-bold text-gray-800 mb-2">
                    🌟 World-Class MTG Scanner
                </h1>
                <p className="text-gray-600 text-lg">
                    Multi-Zone Adaptive • Real-Time Recognition • Professional Grade
                </p>
            </div>

            {/* Metrics Dashboard */}
            <div className="status-dashboard bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">🌟 World-Class Performance Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                        <div className="text-3xl font-bold text-blue-600">
                            {isCameraReady ? '🎥' : '📷'}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">Camera</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                        <div className={`text-3xl font-bold ${getConfidenceColor()}`}>
                            {confidence.toFixed(0)}%
                        </div>
                        <div className="text-sm text-gray-600 mt-1">Confidence</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                        <div className={`text-3xl font-bold ${getSpeedColor()}`}>
                            {processingTime}ms
                        </div>
                        <div className="text-sm text-gray-600 mt-1">Speed</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                        <div className="text-3xl font-bold text-emerald-600">{scanCount}</div>
                        <div className="text-sm text-gray-600 mt-1">Scans</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                        <div className="text-2xl font-bold text-indigo-600">
                            {currentStrategy.toUpperCase()}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">Strategy</div>
                    </div>
                </div>
                
                {/* Guidance */}
                <div className="mt-6 p-4 bg-white rounded-lg border-l-4 border-emerald-500">
                    <div className="flex items-center">
                        <span className="text-emerald-500 mr-3 text-xl">🌟</span>
                        <span className="text-gray-800 font-medium text-lg">{userGuidance}</span>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="controls bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex gap-4 items-center justify-center flex-wrap">
                    <button
                        onClick={initializeCamera}
                        disabled={isCameraReady}
                        className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium text-lg"
                    >
                        {isCameraReady ? '✅ Camera Ready' : '📹 Start Camera'}
                    </button>
                    
                    {isCameraReady && (
                        <button
                            onClick={stopCamera}
                            className="px-8 py-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-lg"
                        >
                            🛑 Stop Camera
                        </button>
                    )}
                    
                    <button
                        onClick={performWorldClassScan}
                        disabled={isScanning || !isCameraReady}
                        className="px-8 py-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-400 transition-colors font-medium text-lg"
                    >
                        {isScanning ? '⏳ Scanning...' : '🌟 World-Class Scan'}
                    </button>
                </div>
            </div>

            {/* Camera Feed */}
            <div className="camera-section bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    {!isCameraReady && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                            <div className="text-center">
                                <div className="text-6xl mb-4">🌟</div>
                                <div className="text-2xl text-gray-600 font-bold">World-Class MTG Scanner</div>
                                <div className="text-gray-500 mt-2">Multi-Zone Adaptive • Real-Time Recognition</div>
                            </div>
                        </div>
                    )}
                    
                    {/* Video Feed */}
                    <video
                        ref={videoRef}
                        className={`w-full h-full object-cover ${!isCameraReady ? 'opacity-0' : 'opacity-100'}`}
                        autoPlay
                        playsInline
                        muted
                        style={{ backgroundColor: '#000' }}
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    {/* Zone Overlay */}
                    {isCameraReady && (
                        <div className="absolute inset-0 pointer-events-none">
                            {/* Card Frame Guide */}
                            <div 
                                className="absolute border-2 border-white border-opacity-50 rounded-lg"
                                style={{
                                    left: '5%',
                                    top: '10%',
                                    width: '90%',
                                    height: '80%'
                                }}
                            />
                            
                            {/* Primary Zone */}
                            <div 
                                className={`absolute border-4 ${ZONE_STRATEGIES.primary.color} bg-opacity-20 rounded-lg shadow-lg`}
                                style={{
                                    left: `${ZONE_STRATEGIES.primary.zone.x * 100}%`,
                                    top: `${ZONE_STRATEGIES.primary.zone.y * 100}%`,
                                    width: `${ZONE_STRATEGIES.primary.zone.width * 100}%`,
                                    height: `${ZONE_STRATEGIES.primary.zone.height * 100}%`
                                }}
                            />
                            
                            {/* Zone Label */}
                            <div 
                                className="absolute text-green-500 text-sm font-bold bg-black bg-opacity-75 px-3 py-2 rounded"
                                style={{
                                    left: `${ZONE_STRATEGIES.primary.zone.x * 100}%`,
                                    top: `${(ZONE_STRATEGIES.primary.zone.y + ZONE_STRATEGIES.primary.zone.height + 0.02) * 100}%`
                                }}
                            >
                                🎯 PRIMARY ZONE
                            </div>
                            
                            {/* Instructions */}
                            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-90 text-white px-6 py-3 rounded-lg text-center">
                                <div className="font-bold text-lg">🌟 WORLD-CLASS VISION</div>
                                <div className="text-sm mt-1">Multi-zone adaptive • Real-time recognition</div>
                            </div>
                        </div>
                    )}
                    
                    {/* Status Indicators */}
                    <div className="absolute top-4 left-4 flex gap-3 flex-col">
                        <div className="bg-emerald-600 text-white px-4 py-2 rounded-full font-medium">
                            🌟 WORLD-CLASS
                        </div>
                        {isScanning && (
                            <div className="bg-indigo-600 text-white px-4 py-2 rounded-full font-medium animate-pulse">
                                🧠 SCANNING
                            </div>
                        )}
                    </div>
                    
                    {/* Performance Display */}
                    <div className="absolute top-4 right-4 bg-black bg-opacity-80 text-white px-4 py-2 rounded-lg">
                        <div className="text-lg font-bold">{confidence.toFixed(1)}% | {processingTime}ms</div>
                        <div className="text-sm">{currentStrategy.toUpperCase()}</div>
                        <div className="text-xs">Scans: {scanCount}</div>
                    </div>
                </div>
            </div>

            {/* Results Display */}
            {scanResults && (
                <div className="results bg-white rounded-lg shadow-md p-6 mb-6">
                    <h3 className="text-2xl font-semibold text-gray-800 mb-6">🌟 World-Class Recognition Results</h3>
                    
                    {scanResults.success ? (
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="recognition-results">
                                <h4 className="font-semibold text-gray-700 mb-4 text-lg">🧠 Card Recognition</h4>
                                
                                <div className="mb-4 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-semibold text-gray-600">🌟 Card Name</span>
                                        <span className={`font-bold text-lg ${getConfidenceColor()}`}>
                                            {(scanResults.confidence * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="text-gray-800 font-bold text-xl mb-2">{scanResults.text || 'No text detected'}</div>
                                    <div className="text-sm text-gray-500">
                                        Method: {scanResults.method || 'world_class_adaptive'} | Processing: {scanResults.processingTime}ms
                                    </div>
                                </div>
                                
                                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                    <div className="text-emerald-700 font-medium">🌟 World-Class Processing Applied</div>
                                    <div className="text-emerald-600 text-sm mt-1">Multi-zone adaptive • Advanced pattern matching</div>
                                </div>
                            </div>

                            <div className="advanced-analysis">
                                <h4 className="font-semibold text-gray-700 mb-4 text-lg">🧠 Advanced Analysis</h4>
                                
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                        <span className="text-gray-600 font-medium">Processing Speed:</span>
                                        <span className={`font-bold text-lg ${getSpeedColor()}`}>
                                            {scanResults.processingTime}ms
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                        <span className="text-gray-600 font-medium">Detection Strategy:</span>
                                        <span className="font-bold text-emerald-600">{(scanResults.strategy || 'ADAPTIVE').toUpperCase()}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                        <span className="text-gray-600 font-medium">Zone Used:</span>
                                        <span className="font-medium">{scanResults.zoneUsed || 'Primary Zone'}</span>
                                    </div>
                                    
                                    <div className="mt-6 p-4 bg-gradient-to-r from-emerald-100 to-blue-100 rounded-lg">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-emerald-600 mb-2">
                                                {confidence > 85 ? '🌟 WORLD-CLASS' : 
                                                 confidence > 70 ? '✅ EXCELLENT' : 
                                                 confidence > 50 ? '⚠️ GOOD' : '❌ FAIR'}
                                            </div>
                                            <div className="text-gray-600">
                                                {confidence > 85 ? 'Perfect professional-grade recognition!' : 
                                                 confidence > 70 ? 'Excellent multi-zone detection' : 
                                                 confidence > 50 ? 'Good adaptive recognition' : 'Consider better lighting/positioning'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="error-message bg-red-50 border border-red-200 rounded-lg p-6">
                            <h4 className="text-red-800 font-bold text-lg mb-3">❌ World-Class Scan Failed</h4>
                            <p className="text-red-600 mb-3">{scanResults.error || 'Could not achieve high-confidence recognition'}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Scanner;