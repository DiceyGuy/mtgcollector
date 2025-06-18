import React, { useRef, useEffect, useState } from 'react';
import { CameraIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const ScannerCamera = ({ 
  onCapture, 
  onError, 
  isActive = false,
  className = "" 
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [currentDeviceId, setCurrentDeviceId] = useState(null);
  const [permissionState, setPermissionState] = useState('unknown');

  // Check camera permissions on mount
  useEffect(() => {
    checkCameraSupport();
    getAvailableDevices();
  }, []);

  // Initialize camera when component becomes active
  useEffect(() => {
    if (isActive) {
      initializeCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [isActive, currentDeviceId]);

  const checkCameraSupport = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera not supported in this browser');
      setPermissionState('not-supported');
      return false;
    }

    try {
      const permission = await navigator.permissions.query({ name: 'camera' });
      setPermissionState(permission.state);
      console.log('Camera permission state:', permission.state);
      return true;
    } catch (err) {
      console.log('Permission API not supported, proceeding with camera access');
      setPermissionState('unknown');
      return true;
    }
  };

  const getAvailableDevices = async () => {
    try {
      console.log('Getting available camera devices...');
      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = mediaDevices.filter(device => device.kind === 'videoinput');
      
      console.log('Found video devices:', videoDevices);
      setDevices(videoDevices);
      
      if (videoDevices.length > 0) {
        // Filter out virtual cameras and prefer real cameras
        const realCameras = videoDevices.filter(device => 
          !device.label.toLowerCase().includes('virtual') &&
          !device.label.toLowerCase().includes('elgato') &&
          !device.label.toLowerCase().includes('obs')
        );
        
        // Prefer back camera on mobile, otherwise first real camera
        const backCamera = realCameras.find(device => 
          device.label.toLowerCase().includes('back') ||
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
        );
        
        const preferredDevice = backCamera || realCameras[0] || videoDevices[0];
        setCurrentDeviceId(preferredDevice.deviceId);
        console.log('Selected camera:', preferredDevice.label || 'Unknown Camera');
      } else {
        console.log('No video devices found');
      }
    } catch (err) {
      console.warn('Could not enumerate devices:', err);
      setError('Could not access camera devices');
    }
  };

  const initializeCamera = async () => {
    console.log('Initializing camera...');
    setIsLoading(true);
    setError(null);

    try {
      // Stop any existing stream first
      stopCamera();

      const constraints = {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: currentDeviceId ? undefined : { ideal: 'environment' },
          deviceId: currentDeviceId ? { exact: currentDeviceId } : undefined
        },
        audio: false
      };

      console.log('Requesting camera with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          console.log('Camera metadata loaded, starting playback');
          videoRef.current.play()
            .then(() => {
              console.log('Camera playing successfully');
              setIsLoading(false);
              setPermissionState('granted');
            })
            .catch(err => {
              console.error('Video play failed:', err);
              setError('Failed to start camera playback');
              setIsLoading(false);
            });
        };

        videoRef.current.onerror = (err) => {
          console.error('Video error:', err);
          setError('Camera video error');
          setIsLoading(false);
        };
      }
    } catch (err) {
      console.error('Camera initialization failed:', err);
      
      let errorMessage = 'Camera access failed';
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access and refresh the page.';
        setPermissionState('denied');
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera is being used by another application.';
      } else {
        errorMessage = `Camera error: ${err.message}`;
      }
      
      setError(errorMessage);
      setIsLoading(false);
      onError?.(errorMessage);
    }
  };

  const stopCamera = () => {
    console.log('Stopping camera...');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped camera track:', track.label);
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const captureImage = () => {
    console.log('Capturing image...');
    
    if (!videoRef.current || !canvasRef.current) {
      const error = 'Camera not ready for capture';
      console.error(error);
      onError?.(error);
      return;
    }

    if (videoRef.current.readyState !== 4) {
      const error = 'Camera video not ready';
      console.error(error);
      onError?.(error);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    console.log(`Capturing image: ${canvas.width}x${canvas.height}`);

    // Draw current video frame
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Create image data
    const imageData = {
      dataURL: canvas.toDataURL('image/jpeg', 0.8),
      timestamp: new Date().toISOString(),
      dimensions: {
        width: canvas.width,
        height: canvas.height
      }
    };

    console.log('Image captured successfully');
    onCapture?.(imageData);
  };

  const switchCamera = async (deviceId) => {
    console.log('Switching to camera:', deviceId);
    setCurrentDeviceId(deviceId);
  };

  const requestCameraPermission = async () => {
    try {
      setIsLoading(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionState('granted');
      setError(null);
      // Refresh device list after permission granted
      await getAvailableDevices();
      if (isActive) {
        initializeCamera();
      }
    } catch (err) {
      setPermissionState('denied');
      setError('Camera permission denied');
    } finally {
      setIsLoading(false);
    }
  };

  // Render permission denied state
  if (permissionState === 'denied' || (error && error.includes('permission'))) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 text-center ${className}`}>
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-red-800 mb-2">Camera Permission Required</h3>
        <p className="text-red-600 mb-4">
          Please allow camera access to use the scanner functionality.
        </p>
        <button
          onClick={requestCameraPermission}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          disabled={isLoading}
        >
          {isLoading ? 'Requesting...' : 'Grant Camera Permission'}
        </button>
      </div>
    );
  }

  // Render error state
  if (error && !error.includes('permission')) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 text-center ${className}`}>
        <div className="text-red-600 mb-2">
          <CameraIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="font-medium">Camera Error</p>
        </div>
        <p className="text-red-500 text-sm mb-4">{error}</p>
        <div className="space-x-2">
          <button
            onClick={initializeCamera}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry Camera
          </button>
          {devices.length > 1 && (
            <button
              onClick={getAvailableDevices}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh Devices
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />
      
      {/* Hidden Canvas for Capture */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="text-white text-center">
            <CameraIcon className="h-12 w-12 mx-auto mb-2 animate-pulse" />
            <p>Initializing Camera...</p>
          </div>
        </div>
      )}
      
      {/* Camera Controls */}
      {isActive && !isLoading && !error && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center space-x-4">
          {/* Camera Selection Dropdown */}
          {devices.length > 1 && (
            <select
              value={currentDeviceId || ''}
              onChange={(e) => switchCamera(e.target.value)}
              className="bg-white bg-opacity-90 text-gray-800 px-3 py-2 rounded-lg text-sm max-w-48 truncate"
            >
              {devices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${devices.indexOf(device) + 1}`}
                </option>
              ))}
            </select>
          )}
          
          {/* Capture Button */}
          <button
            onClick={captureImage}
            className="bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 p-4 rounded-full shadow-lg transition-all transform hover:scale-105"
            title="Capture Image"
          >
            <CameraIcon className="h-8 w-8" />
          </button>
        </div>
      )}
      
      {/* Scan Area Overlay */}
      {isActive && !isLoading && !error && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Scan Frame */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-52 border-2 border-blue-400 rounded-lg">
            {/* Corner Markers */}
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-blue-400"></div>
            <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-blue-400"></div>
            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-blue-400"></div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-blue-400"></div>
          </div>
          
          {/* Instructions */}
          <div className="absolute top-4 left-0 right-0 text-center">
            <div className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg mx-4">
              <p className="text-sm">Position card within the frame and tap capture</p>
            </div>
          </div>
        </div>
      )}
      
      {/* No Camera Message */}
      {!isActive && !isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-white text-center">
            <CameraIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Click "Start Scanning" to activate camera</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScannerCamera;