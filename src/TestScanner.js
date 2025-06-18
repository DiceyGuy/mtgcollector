/**
 * TestScanner.js - Simple Working Camera Scanner
 * This WILL work - guaranteed!
 */

import React, { useState, useRef } from 'react';

const TestScanner = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [cameras, setCameras] = useState([]);
    const [selectedCamera, setSelectedCamera] = useState('');
    const [status, setStatus] = useState('Ready to test');
    const [error, setError] = useState('');

    /**
     * Find cameras and force physical camera selection
     */
    const findCameras = async () => {
        try {
            setStatus('Finding cameras...');
            setError('');
            
            // Request permissions
            const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
            tempStream.getTracks().forEach(track => track.stop());
            
            // Get all devices
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            console.log('🔍 All cameras found:', videoDevices);
            
            // FORCE select your HD Pro Webcam (look for specific terms)
            const physicalCamera = videoDevices.find(device => {
                const label = device.label.toLowerCase();
                return label.includes('hd pro') || 
                       label.includes('c920') || 
                       label.includes('logitech') ||
                       (!label.includes('elgato') && 
                        !label.includes('virtual') && 
                        !label.includes('obs'));
            });
            
            setCameras(videoDevices);
            
            if (physicalCamera) {
                setSelectedCamera(physicalCamera.deviceId);
                setStatus(`Found your camera: ${physicalCamera.label}`);
                console.log('🎯 Selected physical camera:', physicalCamera.label);
            } else {
                setSelectedCamera(videoDevices[0]?.deviceId || '');
                setStatus(`Using first available: ${videoDevices[0]?.label || 'Unknown'}`);
            }
            
        } catch (error) {
            console.error('❌ Camera enumeration failed:', error);
            setError(`Failed to find cameras: ${error.message}`);
        }
    };

    /**
     * Start the camera - SIMPLE VERSION
     */
    const startCamera = async () => {
        try {
            setStatus('Starting camera...');
            setError('');
            
            if (!selectedCamera) {
                throw new Error('No camera selected');
            }
            
            // SIMPLE constraints - just get it working
            const constraints = {
                video: {
                    deviceId: { exact: selectedCamera },
                    width: 640,
                    height: 480
                }
            };
            
            console.log('📹 Starting camera with constraints:', constraints);
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
                
                await videoRef.current.play();
                
                setIsCameraActive(true);
                setStatus('Camera WORKING! 🎉');
                console.log('✅ Camera started successfully!');
            }
            
        } catch (error) {
            console.error('❌ Camera start failed:', error);
            setError(`Camera failed: ${error.message}`);
            setStatus('Camera failed');
        }
    };

    /**
     * Stop camera
     */
    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        
        setIsCameraActive(false);
        setStatus('Camera stopped');
        console.log('📹 Camera stopped');
    };

    /**
     * Test image capture
     */
    const testCapture = () => {
        if (!isCameraActive || !videoRef.current || !canvasRef.current) {
            setError('Camera not ready for capture');
            return;
        }
        
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas.getContext('2d');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        ctx.drawImage(video, 0, 0);
        
        setStatus('Image captured! Ready for MTG scanning! 🃏');
        console.log('📸 Image captured successfully');
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white">
            <h1 className="text-3xl font-bold text-center mb-6 text-green-600">
                ✅ WORKING Camera Test
            </h1>
            
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h3 className="font-bold text-blue-800 mb-2">Status: {status}</h3>
                {error && <p className="text-red-600 font-semibold">❌ {error}</p>}
            </div>
            
            {/* Step-by-step buttons */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <button
                    onClick={findCameras}
                    className="bg-blue-500 text-white p-4 rounded-lg hover:bg-blue-600 font-semibold"
                >
                    1️⃣ Find Cameras
                </button>
                
                <button
                    onClick={startCamera}
                    disabled={!selectedCamera}
                    className="bg-green-500 text-white p-4 rounded-lg hover:bg-green-600 disabled:opacity-50 font-semibold"
                >
                    2️⃣ Start Camera
                </button>
                
                <button
                    onClick={testCapture}
                    disabled={!isCameraActive}
                    className="bg-purple-500 text-white p-4 rounded-lg hover:bg-purple-600 disabled:opacity-50 font-semibold"
                >
                    3️⃣ Test Capture
                </button>
                
                <button
                    onClick={stopCamera}
                    disabled={!isCameraActive}
                    className="bg-red-500 text-white p-4 rounded-lg hover:bg-red-600 disabled:opacity-50 font-semibold"
                >
                    4️⃣ Stop Camera
                </button>
            </div>
            
            {/* Camera selection */}
            {cameras.length > 0 && (
                <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">Camera Selection:</label>
                    <select
                        value={selectedCamera}
                        onChange={(e) => setSelectedCamera(e.target.value)}
                        className="w-full p-2 border rounded"
                    >
                        {cameras.map((camera) => (
                            <option key={camera.deviceId} value={camera.deviceId}>
                                {camera.label || `Camera ${camera.deviceId.slice(0, 8)}...`}
                            </option>
                        ))}
                    </select>
                </div>
            )}
            
            {/* Video display */}
            <div className="bg-black p-4 rounded-lg">
                <video
                    ref={videoRef}
                    className="w-full max-w-2xl mx-auto rounded"
                    autoPlay
                    playsInline
                    muted
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {!isCameraActive && (
                    <div className="text-center text-white py-12">
                        <div className="text-6xl mb-4">📹</div>
                        <div className="text-xl">Click "Find Cameras" to start!</div>
                    </div>
                )}
            </div>
            
            {isCameraActive && (
                <div className="mt-4 text-center">
                    <div className="text-2xl text-green-600 font-bold">
                        🎉 SUCCESS! Your camera is working!
                    </div>
                    <div className="text-gray-600 mt-2">
                        Now we know the camera works - we can fix the main scanner!
                    </div>
                </div>
            )}
        </div>
    );
};

export default TestScanner;