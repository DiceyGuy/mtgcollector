class CameraService {
  constructor() {
    this.stream = null;
    this.video = null;
    this.canvas = null;
    this.context = null;
  }

  // Initialize camera access
  async initializeCamera(videoElement, constraints = {}) {
    try {
      const defaultConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment', // Back camera on mobile
        },
        audio: false
      };

      const mergedConstraints = {
        ...defaultConstraints,
        ...constraints
      };

      this.stream = await navigator.mediaDevices.getUserMedia(mergedConstraints);
      this.video = videoElement;
      this.video.srcObject = this.stream;
      
      return new Promise((resolve, reject) => {
        this.video.onloadedmetadata = () => {
          this.video.play();
          this.setupCanvas();
          resolve(true);
        };
        this.video.onerror = reject;
      });
    } catch (error) {
      console.error('Camera initialization failed:', error);
      throw new Error(`Camera access failed: ${error.message}`);
    }
  }

  // Setup canvas for image capture
  setupCanvas() {
    if (!this.video) return;
    
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;
    this.context = this.canvas.getContext('2d');
  }

  // Capture image from video stream
  captureImage() {
    if (!this.video || !this.canvas || !this.context) {
      throw new Error('Camera not initialized');
    }

    // Draw current video frame to canvas
    this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    
    // Return image data
    return {
      dataURL: this.canvas.toDataURL('image/jpeg', 0.8),
      blob: this.canvasToBlob(),
      canvas: this.canvas,
      timestamp: new Date().toISOString(),
      dimensions: {
        width: this.canvas.width,
        height: this.canvas.height
      }
    };
  }

  // Convert canvas to blob for file operations
  canvasToBlob() {
    return new Promise((resolve) => {
      this.canvas.toBlob(resolve, 'image/jpeg', 0.8);
    });
  }

  // Get available camera devices
  async getAvailableDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
      console.error('Failed to get camera devices:', error);
      return [];
    }
  }

  // Switch between cameras (front/back)
  async switchCamera(deviceId) {
    if (this.stream) {
      this.stopCamera();
    }

    const constraints = {
      video: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    };

    return this.initializeCamera(this.video, constraints);
  }

  // Stop camera stream
  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  }

  // Check if camera is supported
  static isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  // Get camera permissions status
  async getPermissionStatus() {
    try {
      const result = await navigator.permissions.query({ name: 'camera' });
      return result.state; // 'granted', 'denied', or 'prompt'
    } catch (error) {
      console.warn('Permission API not supported');
      return 'unknown';
    }
  }
}

export default CameraService;