// Scanner.js - PDF SCANNER Mode
// Location: C:\Users\kim-a\Documents\DiceyTeck\MTG Scanner\src\components\scanner\Scanner.js

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ClaudeVisionService from '../../../ClaudeVisionService';
import MTGApiService from '../../../MTGApiService';

const Scanner = () => {
    // Core state
    const [isScanning, setIsScanning] = useState(false);
    const [scanResults, setScanResults] = useState(null);
    const [cardType, setCardType] = useState('standard');
    const [isRealTimeMode, setIsRealTimeMode] = useState(false);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [ocrStatus, setOcrStatus] = useState('initializing');
    const [availableCameras, setAvailableCameras] = useState([]);
    const [selectedCamera, setSelectedCamera] = useState('');
    
    // PDF SCANNER FEEDBACK
    const [qualityFeedback, setQualityFeedback] = useState({});
    const [userGuidance, setUserGuidance] = useState('Hold MTG card UPRIGHT (portrait orientation) in yellow frame');
    const [confidenceHistory, setConfidenceHistory] = useState([]);
    
    // Performance tracking
    const [frameRate, setFrameRate] = useState(0);
    const [processingTime, setProcessingTime] = useState(0);
    const [ocrConfidence, setOcrConfidence] = useState(0);
    
    // Refs
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const overlayCanvasRef = useRef(null);
    const streamRef = useRef(null);
    const visionServiceRef = useRef(null);
    const apiServiceRef = useRef(null);
    const animationFrameRef = useRef(null);
    const lastProcessTimeRef = useRef(0);
    const frameCountRef = useRef(0);
    
    // PDF SCANNER PARAMETERS
    const [lastScanTime, setLastScanTime] = useState(0);
    const SCAN_THROTTLE_MS = 2000; // Slower for better quality
    const PERFORMANCE_UPDATE_INTERVAL = 3000;
    const CONFIDENCE_THRESHOLD = 50; // Lower threshold for PDF scanner mode

    // Initialize services
    useEffect(() => {
        console.log('📄 Initializing PDF SCANNER mode services...');
        
        const initializeServices = async () => {
            try {
                visionServiceRef.current = new ClaudeVisionService();
                apiServiceRef.current = new MTGApiService();
                
                // Get available cameras
                await enumerateCameras();
                
                // Check OCR status
                const checkOCRStatus = () => {
                    if (visionServiceRef.current?.isInitialized) {
                        setOcrStatus('ready');
                        setUserGuidance('Camera ready! Hold MTG card UPRIGHT (portrait) in yellow frame');
                        console.log('✅ PDF SCANNER OCR service ready');
                    } else {
                        setOcrStatus('initializing');
                        setTimeout(checkOCRStatus, 2000);
                    }
                };
                checkOCRStatus();
                
            } catch (error) {
                console.error('❌ PDF SCANNER service initialization failed:', error);
                setOcrStatus('error');
                setUserGuidance('Service initialization failed. Please refresh page.');
            }
        };
        
        initializeServices();
        
        // Performance monitoring
        const performanceInterval = setInterval(updatePerformanceStats, PERFORMANCE_UPDATE_INTERVAL);
        
        return () => {
            clearInterval(performanceInterval);
            cleanup();
        };
    }, []);

    // PERFORMANCE MONITORING
    const updatePerformanceStats = useCallback(() => {
        const now = performance.now();
        const timeDelta = now - lastProcessTimeRef.current;
        
        if (timeDelta > 0) {
            const currentFrameRate = (frameCountRef.current * 1000) / timeDelta;
            setFrameRate(currentFrameRate);
            frameCountRef.current = 0;
            lastProcessTimeRef.current = now;
        }
        
        // Update confidence trend
        setConfidenceHistory(prev => {
            const newHistory = [...prev, ocrConfidence].slice(-10); // Keep last 10
            const trend = newHistory.length > 5 ? 
                (newHistory.slice(-3).reduce((a, b) => a + b, 0) / 3) - 
                (newHistory.slice(0, 3).reduce((a, b) => a + b, 0) / 3) : 0;
                
            // Update guidance based on trend
            if (trend > 15) {
                setUserGuidance('Excellent! PDF scanner working well');
            } else if (trend < -15) {
                setUserGuidance('Adjusting... try different lighting angle');
            }
            
            return newHistory;
        });
    }, [ocrConfidence]);

    // ENUMERATE CAMERAS
    const enumerateCameras = useCallback(async () => {
        try {
            console.log('📹 Finding cameras for PDF SCANNER...');
            
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            console.log('📷 Available cameras:', videoDevices.map(d => d.label || 'Unknown Camera'));
            
            setAvailableCameras(videoDevices);
            
            // Select best camera for document scanning
            const realCameras = videoDevices.filter(device => 
                !device.label.toLowerCase().includes('elgato') && 
                !device.label.toLowerCase().includes('virtual') &&
                !device.label.toLowerCase().includes('obs')
            );
            
            const selectedDevice = realCameras.length > 0 ? realCameras[0] : videoDevices[0];
            
            if (selectedDevice) {
                setSelectedCamera(selectedDevice.deviceId);
                console.log('📄 PDF SCANNER camera selection:', selectedDevice.label);
                setUserGuidance(`Selected camera: ${selectedDevice.label.split(' ')[0]}`);
            }
            
        } catch (error) {
            console.error('❌ Camera enumeration failed:', error);
            setUserGuidance('Camera access failed. Please allow camera permissions.');
        }
    }, []);

    // PDF SCANNER CAMERA INITIALIZATION
    const initializeCamera = useCallback(async () => {
        try {
            console.log('📹 Starting PDF SCANNER camera...');
            setIsCameraReady(false);
            setUserGuidance('Starting camera...');
            
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            
            // Optimized constraints for document scanning
            const constraints = {
                video: {
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 },
                    frameRate: { ideal: 30, max: 30 },
                    facingMode: 'environment',
                    // Enhanced settings for document scanning
                    focusMode: 'continuous',
                    exposureMode: 'continuous',
                    whiteBalanceMode: 'continuous'
                }
            };
            
            if (selectedCamera) {
                constraints.video.deviceId = { exact: selectedCamera };
            }
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Video load timeout')), 15000);
                    
                    videoRef.current.onloadedmetadata = () => {
                        clearTimeout(timeout);
                        videoRef.current.play().then(resolve).catch(reject);
                    };
                });
                
                console.log(`✅ PDF SCANNER camera ready: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
                
                setupCanvas();
                setIsCameraReady(true);
                setUserGuidance('Camera ready! Hold MTG card UPRIGHT (portrait) in yellow frame');
                
                if (isRealTimeMode) {
                    startRealTimeProcessing();
                }
            }
            
        } catch (error) {
            console.error('❌ PDF SCANNER camera failed:', error);
            setIsCameraReady(false);
            setUserGuidance('Camera failed. Try different camera or check permissions.');
        }
    }, [isRealTimeMode, selectedCamera]);

    // CANVAS SETUP
    const setupCanvas = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        
        console.log(`📄 PDF SCANNER canvas ready: ${canvas.width}x${canvas.height}`);
    }, []);

    // REAL-TIME PROCESSING
    const startRealTimeProcessing = useCallback(() => {
        if (!isRealTimeMode || !isCameraReady) return;
        
        console.log('📄 Starting PDF SCANNER real-time processing...');
        
        const processFrame = async () => {
            if (!isRealTimeMode || !videoRef.current || !canvasRef.current) {
                return;
            }
            
            try {
                frameCountRef.current++;
                
                const now = Date.now();
                if (now - lastScanTime < SCAN_THROTTLE_MS) {
                    animationFrameRef.current = requestAnimationFrame(processFrame);
                    return;
                }
                
                const frameCanvas = captureFrame();
                if (frameCanvas) {
                    processFrameInBackground(frameCanvas, now);
                }
                
            } catch (error) {
                console.warn('⚠️ PDF scanner frame processing error:', error);
            }
            
            animationFrameRef.current = requestAnimationFrame(processFrame);
        };
        
        animationFrameRef.current = requestAnimationFrame(processFrame);
    }, [isRealTimeMode, isCameraReady, lastScanTime]);

    // FRAME PROCESSING
    const processFrameInBackground = useCallback(async (frameCanvas, timestamp) => {
        try {
            if (!visionServiceRef.current) return;
            
            // Get quality feedback
            const context = frameCanvas.getContext('2d');
            const quality = visionServiceRef.current.assessImageQuality(frameCanvas, context);
            
            setQualityFeedback(quality);
            
            // Update guidance
            if (!quality.isAcceptable) {
                setUserGuidance('Hold card UPRIGHT • Fill yellow frame • Card name at TOP in red area');
                return;
            }
            
            // Process with PDF scanner
            const result = await visionServiceRef.current.processCardRealTime(frameCanvas, cardType, 0);
            
            if (result && result.confidence > 15) {
                setScanResults(result);
                setOcrConfidence(result.confidence);
                setProcessingTime(result.processingTime);
                setLastScanTime(timestamp);
                
                // Update guidance based on confidence
                if (result.confidence > CONFIDENCE_THRESHOLD) {
                    setUserGuidance('Perfect! PDF scanner detected card clearly');
                    
                    // Auto-fetch card data
                    if (result.text.name?.cleaned && result.text.name.cleaned !== 'No card detected') {
                        fetchCardData(result.text.name.cleaned);
                    }
                } else if (result.confidence > 20) {
                    setUserGuidance('Good! Hold card UPRIGHT • Keep name at TOP');
                } else if (result.confidence > 10) {
                    setUserGuidance('Card detected - ensure PORTRAIT orientation • Name at TOP');
                } else {
                    setUserGuidance('Hold card UPRIGHT (portrait) • Fill yellow frame completely');
                }
                
                console.log(`📄 PDF scanner real-time: ${result.confidence.toFixed(1)}% confidence`);
            }
            
        } catch (error) {
            console.warn('⚠️ PDF scanner background processing error:', error);
        }
    }, [cardType]);

    // FRAME CAPTURE
    const captureFrame = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return null;
        
        try {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const frameCanvas = document.createElement('canvas');
            const frameContext = frameCanvas.getContext('2d', { willReadFrequently: true });
            frameCanvas.width = canvas.width;
            frameCanvas.height = canvas.height;
            frameContext.drawImage(canvas, 0, 0);
            
            return frameCanvas;
            
        } catch (error) {
            console.error('❌ PDF scanner frame capture failed:', error);
            return null;
        }
    }, []);

    // SINGLE PDF SCAN
    const performSingleScan = useCallback(async () => {
        if (isScanning || !isCameraReady) return;
        
        setIsScanning(true);
        setUserGuidance('Processing with PDF scanner techniques...');
        
        try {
            console.log('📄 Starting PDF SCANNER single scan...');
            
            const frameCanvas = captureFrame();
            if (!frameCanvas) {
                throw new Error('Failed to capture frame');
            }
            
            const result = await visionServiceRef.current.processCardImmediate(frameCanvas, cardType, 0);
            
            if (result) {
                setScanResults(result);
                setOcrConfidence(result.confidence);
                setProcessingTime(result.processingTime);
                
                if (result.confidence > 30 && result.text.name?.cleaned && 
                    result.text.name.cleaned !== 'No card detected') {
                    setUserGuidance('Card identified with PDF scanner! Fetching details...');
                    await fetchCardData(result.text.name.cleaned);
                } else {
                    setUserGuidance('Low confidence. Try better lighting and UPRIGHT positioning.');
                }
                
                console.log(`📄 PDF SCANNER scan: ${result.confidence.toFixed(1)}% confidence`);
            }
            
        } catch (error) {
            console.error('❌ PDF scanner scan failed:', error);
            setUserGuidance('Scan failed. Please try again.');
            setScanResults({
                error: error.message,
                confidence: 0,
                processingTime: 0,
                zones: 0
            });
        } finally {
            setIsScanning(false);
        }
    }, [isScanning, isCameraReady, cardType]);

    // CARD DATA FETCHING
    const fetchCardData = useCallback(async (cardName) => {
        try {
            console.log(`📄 PDF SCANNER search: "${cardName}"`);
            
            const cardData = await apiServiceRef.current.searchCard(cardName);
            
            if (cardData) {
                setScanResults(prev => ({
                    ...prev,
                    scryfall: cardData,
                    cardName: cardData.name,
                    setName: cardData.set_name,
                    price: cardData.prices?.usd || 'N/A'
                }));
                
                setUserGuidance(`Found: ${cardData.name} ($${cardData.prices?.usd || 'N/A'})`);
                console.log(`💰 PDF SCANNER result: ${cardData.name} ($${cardData.prices?.usd || 'N/A'})`);
            } else {
                setUserGuidance(`"${cardName}" not found in database`);
            }
            
        } catch (error) {
            console.warn('⚠️ PDF scanner card data fetch failed:', error);
            setUserGuidance('Card database lookup failed');
        }
    }, []);

    // TOGGLE REAL-TIME
    const toggleRealTimeMode = useCallback(() => {
        setIsRealTimeMode(prev => {
            const newMode = !prev;
            console.log(`📄 PDF SCANNER real-time: ${newMode ? 'ON' : 'OFF'}`);
            
            if (newMode && isCameraReady) {
                setUserGuidance('Real-time PDF scanning active');
                startRealTimeProcessing();
            } else {
                setUserGuidance('Real-time PDF scanning stopped');
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                }
            }
            
            return newMode;
        });
    }, [isCameraReady, startRealTimeProcessing]);

    // CLEANUP
    const cleanup = useCallback(() => {
        console.log('🧹 Cleaning up PDF SCANNER...');
        
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        
        if (visionServiceRef.current) {
            visionServiceRef.current.cleanup();
        }
    }, []);

    // STATUS INDICATORS
    const getQualityIndicator = () => {
        if (!qualityFeedback.sharpness) return '⚪';
        if (qualityFeedback.sharpness > 15) return '🟢';
        if (qualityFeedback.sharpness > 8) return '🟡';
        return '🔴';
    };

    const getConfidenceTrend = () => {
        if (confidenceHistory.length < 3) return '⚪';
        const recent = confidenceHistory.slice(-3);
        const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
        if (avg > 40) return '📈';
        if (avg > 20) return '📊';
        return '📉';
    };

    return (
        <div className="scanner-container p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    📄 MTG Scanner - PDF SCANNER Mode
                </h1>
                <p className="text-gray-600">
                    Document scanner techniques • Multiple preprocessing • Alternative OCR engines available
                </p>
            </div>

            {/* PDF SCANNER Status Dashboard */}
            <div className="status-dashboard bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">📄 PDF SCANNER Status</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="stat-card bg-white rounded-lg p-3 text-center shadow-sm">
                        <div className="text-2xl font-bold text-blue-600">
                            {isCameraReady ? '✅' : '❌'}
                        </div>
                        <div className="text-sm text-gray-600">Camera</div>
                    </div>
                    <div className="stat-card bg-white rounded-lg p-3 text-center shadow-sm">
                        <div className="text-2xl font-bold text-green-600">
                            {ocrStatus === 'ready' ? '📄' : ocrStatus === 'initializing' ? '⏳' : '❌'}
                        </div>
                        <div className="text-sm text-gray-600">PDF OCR</div>
                    </div>
                    <div className="stat-card bg-white rounded-lg p-3 text-center shadow-sm">
                        <div className="text-2xl font-bold text-purple-600">{getQualityIndicator()}</div>
                        <div className="text-sm text-gray-600">Quality</div>
                    </div>
                    <div className="stat-card bg-white rounded-lg p-3 text-center shadow-sm">
                        <div className="text-2xl font-bold text-orange-600">{ocrConfidence.toFixed(0)}%</div>
                        <div className="text-sm text-gray-600">Confidence</div>
                    </div>
                    <div className="stat-card bg-white rounded-lg p-3 text-center shadow-sm">
                        <div className="text-2xl font-bold text-indigo-600">{getConfidenceTrend()}</div>
                        <div className="text-sm text-gray-600">Trend</div>
                    </div>
                </div>
                
                {/* PDF SCANNER Guidance */}
                <div className="mt-4 p-3 bg-white rounded-lg border-l-4 border-orange-500">
                    <div className="flex items-center">
                        <span className="text-orange-500 mr-2">📄</span>
                        <span className="text-gray-800 font-medium">{userGuidance}</span>
                    </div>
                </div>
            </div>

            {/* PDF SCANNER Controls */}
            <div className="controls bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-4 items-end">
                        {/* Camera Selection */}
                        {availableCameras.length > 1 && (
                            <div className="control-group">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    🎥 Camera Selection
                                </label>
                                <select 
                                    value={selectedCamera} 
                                    onChange={(e) => setSelectedCamera(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                    disabled={isCameraReady}
                                >
                                    {availableCameras.map(camera => (
                                        <option key={camera.deviceId} value={camera.deviceId}>
                                            {camera.label.includes('Virtual') ? '📹' : '📷'} {camera.label.split(' ').slice(0, 3).join(' ')}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Card Type Selection */}
                        <div className="control-group">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                🃏 Card Type Optimization
                            </label>
                            <select 
                                value={cardType} 
                                onChange={(e) => setCardType(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            >
                                <option value="standard">🃏 Standard Cards</option>
                                <option value="foil">✨ Foil Cards</option>
                                <option value="old">📜 Old Cards (Pre-8th Edition)</option>
                                <option value="borderless">🎨 Borderless/Showcase</option>
                            </select>
                        </div>
                    </div>

                    {/* PDF SCANNER Action Buttons */}
                    <div className="button-group flex gap-3">
                        <button
                            onClick={initializeCamera}
                            disabled={isCameraReady}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
                        >
                            {isCameraReady ? '✅ Camera Ready' : '📹 Start Camera'}
                        </button>
                        
                        {isCameraReady && (
                            <button
                                onClick={() => {
                                    if (streamRef.current) {
                                        streamRef.current.getTracks().forEach(track => track.stop());
                                    }
                                    setIsCameraReady(false);
                                    setUserGuidance('Camera stopped');
                                }}
                                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                            >
                                🛑 Stop Camera
                            </button>
                        )}
                        
                        <button
                            onClick={performSingleScan}
                            disabled={isScanning || !isCameraReady}
                            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 transition-colors font-medium"
                        >
                            {isScanning ? '⏳ Processing...' : '📄 PDF SCAN'}
                        </button>
                        
                        <button
                            onClick={toggleRealTimeMode}
                            disabled={!isCameraReady}
                            className={`px-6 py-3 rounded-lg transition-colors font-medium ${
                                isRealTimeMode 
                                    ? 'bg-red-600 text-white hover:bg-red-700' 
                                    : 'bg-purple-600 text-white hover:bg-purple-700'
                            } ${!isCameraReady ? 'bg-gray-400' : ''}`}
                        >
                            {isRealTimeMode ? '⏹️ Stop Live' : '📄 Live Mode'}
                        </button>
                    </div>
                </div>
            </div>

            {/* PDF SCANNER Camera Feed */}
            <div className="camera-section bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    {!isCameraReady && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                            <div className="text-center">
                                <div className="text-4xl mb-2">📄</div>
                                <div className="text-gray-600">PDF SCANNER Ready</div>
                                <div className="text-sm text-gray-500 mt-2">Click "Start Camera" to begin</div>
                            </div>
                        </div>
                    )}
                    <video
                        ref={videoRef}
                        className={`w-full h-full object-cover ${!isCameraReady ? 'opacity-0' : 'opacity-100'}`}
                        autoPlay
                        playsInline
                        muted
                        style={{ backgroundColor: '#000' }}
                    />
                    <canvas
                        ref={canvasRef}
                        className="hidden"
                    />
                    
                    {/* Card Position Guide Overlay - PORTRAIT orientation */}
                    {isCameraReady && (
                        <div className="absolute inset-0 pointer-events-none">
                            {/* Outer boundary */}
                            <div className="absolute inset-8 border-2 border-dashed border-white opacity-30 rounded-lg"></div>
                            
                            {/* MTG Card positioning frame - PORTRAIT (taller than wide) */}
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-96 border-3 border-yellow-400 rounded-lg shadow-lg">
                                {/* Card name area highlight - TOP of card */}
                                <div className="absolute top-3 left-3 right-3 h-12 border-2 border-red-400 bg-red-400 bg-opacity-30 rounded"></div>
                                <div className="absolute top-16 left-3 text-yellow-400 text-sm font-bold">CARD NAME HERE</div>
                            </div>
                            
                            {/* Instructions */}
                            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-90 text-white px-4 py-2 rounded-lg text-sm text-center">
                                <div className="font-bold">📄 Hold Card UPRIGHT (Portrait)</div>
                                <div className="text-xs mt-1">Card name in RED area at TOP</div>
                            </div>
                            
                            {/* Quality indicators */}
                            <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded text-sm">
                                Sharp: {qualityFeedback.sharpness?.toFixed(1) || 'N/A'} | Card: {(qualityFeedback.cardDetection * 100 || 0).toFixed(0)}%
                            </div>
                        </div>
                    )}
                    
                    {/* Status Indicators */}
                    <div className="absolute top-4 left-4 flex gap-2">
                        {isRealTimeMode && (
                            <div className="bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                                📄 LIVE PDF
                            </div>
                        )}
                        {isScanning && (
                            <div className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                                🔍 PDF SCANNING
                            </div>
                        )}
                    </div>
                    
                    {/* Quality Indicator */}
                    <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-lg text-sm">
                        {getQualityIndicator()} {ocrConfidence.toFixed(1)}% | {processingTime.toFixed(0)}ms
                    </div>
                </div>
            </div>

            {/* PDF SCANNER Results Display */}
            {scanResults && (
                <div className="results bg-white rounded-lg shadow-md p-6 mb-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">📄 PDF SCANNER Results</h3>
                    
                    {scanResults.error ? (
                        <div className="error-message bg-red-50 border border-red-200 rounded-lg p-4">
                            <h4 className="text-red-800 font-medium mb-2">❌ Error</h4>
                            <p className="text-red-600">{scanResults.error}</p>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* OCR Results */}
                            <div className="ocr-results">
                                <h4 className="font-medium text-gray-700 mb-3">📄 PDF SCANNER Text Extraction</h4>
                                
                                {Object.entries(scanResults.text || {}).map(([zone, data]) => (
                                    <div key={zone} className="mb-3 p-3 bg-gray-50 rounded-lg">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-medium text-sm text-gray-600 capitalize">
                                                {zone === 'name' ? '🎯 Card Name' : zone}
                                            </span>
                                            <span className={`text-sm font-medium ${
                                                data.confidence > 60 ? 'text-green-600' : 
                                                data.confidence > 30 ? 'text-yellow-600' : 'text-red-600'
                                            }`}>
                                                {data.confidence.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="text-gray-800 font-medium">{data.cleaned || 'No text detected'}</div>
                                        {data.raw !== data.cleaned && data.raw && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                Raw: {data.raw}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Card Data */}
                            {scanResults.scryfall && (
                                <div className="card-data">
                                    <h4 className="font-medium text-gray-700 mb-3">🃏 Card Information</h4>
                                    
                                    <div className="space-y-3">
                                        <div>
                                            <span className="font-medium text-gray-600">Name:</span>
                                            <span className="ml-2 text-gray-800 font-semibold">{scanResults.scryfall.name}</span>
                                        </div>
                                        
                                        <div>
                                            <span className="font-medium text-gray-600">Set:</span>
                                            <span className="ml-2 text-gray-800">{scanResults.scryfall.set_name}</span>
                                        </div>
                                        
                                        <div>
                                            <span className="font-medium text-gray-600">Price:</span>
                                            <span className="ml-2 text-green-600 font-bold text-lg">
                                                ${scanResults.scryfall.prices?.usd || 'N/A'}
                                            </span>
                                        </div>
                                        
                                        {scanResults.scryfall.image_uris?.normal && (
                                            <div className="mt-4">
                                                <img 
                                                    src={scanResults.scryfall.image_uris.normal} 
                                                    alt={scanResults.scryfall.name}
                                                    className="w-40 h-auto rounded-lg border shadow-md"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* PDF SCANNER Performance Details */}
                    <div className="performance-details mt-6 pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                            <div>
                                <span className="text-gray-600">Processing:</span>
                                <div className="font-medium">{scanResults.processingTime?.toFixed(0)}ms</div>
                            </div>
                            <div>
                                <span className="text-gray-600">Confidence:</span>
                                <div className="font-medium">{scanResults.confidence?.toFixed(1)}%</div>
                            </div>
                            <div>
                                <span className="text-gray-600">Quality:</span>
                                <div className="font-medium">{qualityFeedback.sharpness?.toFixed(1) || 'N/A'}</div>
                            </div>
                            <div>
                                <span className="text-gray-600">Card Type:</span>
                                <div className="font-medium capitalize">{scanResults.cardType}</div>
                            </div>
                            <div>
                                <span className="text-gray-600">AI Mode:</span>
                                <div className="font-medium">📄 PDF SCANNER</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Alternative Solutions Section */}
            <div className="alternatives bg-gradient-to-r from-orange-50 to-red-50 rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">🚀 Alternative OCR Solutions</h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="solution-card bg-white rounded-lg p-4 border-l-4 border-blue-500">
                        <h4 className="font-semibold text-gray-800 mb-2">📱 Mobile Apps (Recommended)</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                            <li>• <strong>Google Lens</strong> - Excellent text recognition</li>
                            <li>• <strong>Adobe Scan</strong> - Professional document scanning</li>
                            <li>• <strong>CamScanner</strong> - Advanced image preprocessing</li>
                            <li>• <strong>Microsoft Office Lens</strong> - Built-in OCR</li>
                        </ul>
                        <div className="mt-2 text-xs text-green-600">✅ Usually 90%+ accuracy</div>
                    </div>
                    
                    <div className="solution-card bg-white rounded-lg p-4 border-l-4 border-purple-500">
                        <h4 className="font-semibold text-gray-800 mb-2">☁️ Cloud OCR Services</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                            <li>• <strong>Google Vision API</strong> - $1.50/1000 images</li>
                            <li>• <strong>AWS Textract</strong> - $1.50/1000 images</li>
                            <li>• <strong>Azure Computer Vision</strong> - $1/1000 images</li>
                            <li>• <strong>OCR.space API</strong> - Free tier available</li>
                        </ul>
                        <div className="mt-2 text-xs text-green-600">✅ Extremely high accuracy</div>
                    </div>
                    
                    <div className="solution-card bg-white rounded-lg p-4 border-l-4 border-green-500">
                        <h4 className="font-semibold text-gray-800 mb-2">🔍 MTG-Specific Solutions</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                            <li>• <strong>Delver Lens</strong> - MTG card scanner app</li>
                            <li>• <strong>MTG Scanner</strong> - Dedicated card recognition</li>
                            <li>• <strong>TCGPlayer Scanner</strong> - Card marketplace app</li>
                            <li>• <strong>Dragon Shield Scanner</strong> - Collection management</li>
                        </ul>
                        <div className="mt-2 text-xs text-green-600">✅ Trained specifically for MTG cards</div>
                    </div>
                    
                    <div className="solution-card bg-white rounded-lg p-4 border-l-4 border-red-500">
                        <h4 className="font-semibold text-gray-800 mb-2">⚡ Quick Workarounds</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                            <li>• <strong>Manual typing</strong> - Search card names directly</li>
                            <li>• <strong>Voice input</strong> - "Hey Google, Atarka Monument MTG"</li>
                            <li>• <strong>Barcode scanning</strong> - If cards have set codes</li>
                            <li>• <strong>Photo + manual lookup</strong> - Take pic, type later</li>
                        </ul>
                        <div className="mt-2 text-xs text-blue-600">⚡ Fastest for immediate results</div>
                    </div>
                </div>
                
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-semibold text-yellow-800 mb-2">💡 Why This Is Hard</h4>
                    <p className="text-sm text-yellow-700">
                        MTG card scanning is challenging because: cards have complex backgrounds, artistic text fonts, 
                        foil treatments, and varied lighting conditions. Professional apps use machine learning models 
                        trained specifically on millions of card images, plus server-side processing with much more 
                        powerful OCR engines than what runs in browsers.
                    </p>
                </div>
                
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">🔬 Technical Improvements We Could Try</h4>
                    <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-700">
                        <div>
                            <strong>Software Upgrades:</strong>
                            <ul className="mt-1 space-y-1">
                                <li>• Switch to Google Vision API integration</li>
                                <li>• Use OpenCV.js for better preprocessing</li>
                                <li>• Implement perspective correction</li>
                                <li>• Add multiple exposure processing</li>
                            </ul>
                        </div>
                        <div>
                            <strong>Alternative Approaches:</strong>
                            <ul className="mt-1 space-y-1">
                                <li>• Pattern matching against MTG database</li>
                                <li>• Image similarity search</li>
                                <li>• Hybrid OCR + visual recognition</li>
                                <li>• Server-side processing with better OCR</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Scanner;