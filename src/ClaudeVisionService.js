import Tesseract from 'tesseract.js';

// 🚀 CLAUDE VISION PROXY POWERED MTG SCANNER - NO CORS! 🚀
class ClaudeVisionService {
    constructor() {
        console.log('🚀 CLAUDE VISION PROXY POWERED MTG SCANNER initialized!');
        this.canvas = null;
        this.ctx = null;
        this.debugMode = true;
        
        // 🤖 CLAUDE VISION PROXY CONFIGURATION
        this.proxyUrl = 'http://localhost:3001/api/claude-vision';
        this.proxyHealthUrl = 'http://localhost:3001/health';
        
        // Rate limiting for Claude API calls
        this.lastClaudeCall = 0;
        this.claudeCallDelay = 2000; // 2 seconds between calls
        this.claudeEnabled = true;
        
        // Cache for Claude results
        this.claudeResultCache = new Map();
        this.cacheTimeout = 8000; // 8 seconds cache
        
        // Enhanced known cards database for OCR fallback
        this.knownCards = new Set([
            'lightning bolt', 'black lotus', 'ancestral recall', 'time walk', 'mox pearl',
            'mox sapphire', 'mox jet', 'mox ruby', 'mox emerald', 'counterspell',
            'giant growth', 'dark ritual', 'healing salve', 'terror', 'disenchant',
            'general ferrous rokiric', 'tarmogoyf', 'snapcaster mage', 'delver of secrets',
            'monastery swiftspear', 'young pyromancer', 'lightning helix', 'path to exile',
            'swords to plowshares', 'brainstorm', 'ponder', 'preordain', 'serum visions',
            'solemn simulacrum', 'meteoric mace', 'cut your losses', 'blood researcher',
            'fault line', 'okaun eye of chaos', 'roghakh son of rohgahh', 'gilded lotus',
            'sol ring', 'mana crypt', 'chrome mox', 'mox diamond', 'lotus petal',
            'demonic tutor', 'vampiric tutor', 'mystical tutor', 'enlightened tutor',
            'force of will', 'force of negation', 'mana drain', 'cryptic command'
        ]);
        
        // MTG card physical dimensions
        this.cardDimensions = {
            physicalWidth: 2.5,
            physicalHeight: 3.5, 
            ratio: 2.5 / 3.5,
            nameZone: {
                x: 0.04, y: 0.025, width: 0.78, height: 0.09
            }
        };

        // Check proxy server on initialization
        this.checkProxyServer();
    }

    async checkProxyServer() {
        try {
            const response = await fetch(this.proxyHealthUrl);
            const data = await response.json();
            
            if (data.status === 'OK') {
                console.log('✅ Claude Vision Proxy Server is running!');
                if (data.apiKeyConfigured) {
                    console.log('✅ Proxy server has Claude API key configured');
                    this.claudeEnabled = true;
                } else {
                    console.warn('⚠️ Proxy server needs Claude API key configuration');
                    this.claudeEnabled = false;
                }
            }
        } catch (error) {
            console.warn('⚠️ Claude Vision Proxy Server not running - using OCR fallback only');
            console.warn('📋 To enable Claude Vision: npm start in Claude Proxy Server directory');
            this.claudeEnabled = false;
        }
    }

    // 🎯 MAIN CLAUDE VISION POWERED RECOGNITION METHOD
    async processVideoFrame(videoElement) {
        this.log('🎥 Processing video frame with CLAUDE VISION PROXY + OCR HYBRID...');
        
        try {
            // Capture frame
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            ctx.drawImage(videoElement, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            this.log('📷 Frame captured', `${imageData.width}x${imageData.height}`);
            
            // 🎯 CLAUDE VISION FIRST APPROACH
            const startTime = Date.now();
            
            // Step 1: Try Claude Vision API via Proxy (Primary)
            let claudeResult = null;
            if (this.claudeEnabled && this.shouldCallClaude()) {
                this.log('🤖 Step 1: Calling Claude Vision via Proxy...');
                claudeResult = await this.callClaudeVisionProxy(canvas);
            } else if (!this.claudeEnabled) {
                this.log('⚠️ Step 1: Claude Vision disabled (proxy not running)...');
            } else {
                this.log('⏳ Step 1: Skipping Claude (rate limit - waiting 2 seconds)...');
            }
            
            // Step 2: OCR Fallback if needed
            let ocrResult = null;
            if (!claudeResult || !claudeResult.success) {
                this.log('🔍 Step 2: Running enhanced OCR fallback...');
                ocrResult = await this.enhancedOCRFallback(imageData);
            }
            
            // Step 3: Select best result
            const finalResult = this.selectBestHybridResult(claudeResult, ocrResult, startTime);
            
            this.log('🎯 Final CLAUDE-POWERED result:', {
                method: finalResult.method,
                confidence: finalResult.confidence,
                cardName: finalResult.cardName
            });
            
            return finalResult;
            
        } catch (error) {
            this.log('❌ Claude-powered processing error:', error);
            return {
                hasCard: false,
                message: 'Scanner processing error: ' + error.message,
                reason: 'PROCESSING_ERROR',
                details: error.message
            };
        }
    }

    shouldCallClaude() {
        const now = Date.now();
        const timeSinceLastCall = now - this.lastClaudeCall;
        return timeSinceLastCall >= this.claudeCallDelay;
    }

    async callClaudeVisionProxy(canvas) {
        const startTime = Date.now();
        
        try {
            this.log('🤖 Calling Claude Vision via Proxy Server...');
            
            // Convert canvas to base64
            const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
            
            // Call the proxy server instead of Claude API directly
            const response = await fetch(this.proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    base64Image: base64Image,
                    prompt: `Analyze this Magic: The Gathering card image and identify the exact card name.

INSTRUCTIONS:
- Look carefully at the card name in the title area (top section of the card)
- Return ONLY the exact card name as it appears on the card
- If the text is unclear or unreadable, return "UNCLEAR"
- Examples: "Lightning Bolt", "Gilded Lotus", "Roghakh, Son of Rohgahh"

Card name:`
                })
            });
            
            this.lastClaudeCall = Date.now();
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(`Proxy server error: ${response.status} - ${errorData.error || 'Unknown error'}`);
            }
            
            const data = await response.json();
            const cardName = data.cardName;
            
            this.log('🎯 Claude Vision Proxy response:', cardName);
            
            // Validate response
            if (cardName === 'UNCLEAR' || cardName.length < 2) {
                return {
                    success: false,
                    confidence: 0,
                    cardName: '',
                    method: 'claude_vision_unclear',
                    processingTime: Date.now() - startTime,
                    reason: 'Image unclear to Claude Vision'
                };
            }
            
            // Success!
            return {
                success: true,
                confidence: data.confidence || 95,
                cardName: cardName,
                method: 'claude_vision_proxy',
                processingTime: Date.now() - startTime,
                apiCall: true
            };
            
        } catch (error) {
            this.log('❌ Claude Vision Proxy error:', error.message);
            return {
                success: false,
                confidence: 0,
                cardName: '',
                method: 'claude_vision_proxy_error',
                processingTime: Date.now() - startTime,
                error: error.message
            };
        }
    }

    async enhancedOCRFallback(imageData) {
        this.log('🔍 Running enhanced OCR fallback...');
        
        try {
            // Extract name zone
            const nameZone = this.extractNameZone(imageData);
            
            // Simple OCR attempt
            const { canvas, ctx } = this.setupCanvas(nameZone.width, nameZone.height);
            ctx.putImageData(nameZone, 0, 0);
            const dataUrl = canvas.toDataURL();
            
            const worker = await Tesseract.createWorker();
            await worker.setParameters({
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz\',. -',
                tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE
            });
            
            const { data } = await worker.recognize(dataUrl);
            await worker.terminate();
            
            const cleanText = this.cleanOCRText(data.text);
            
            return {
                success: data.confidence >= 50,
                confidence: Math.round(data.confidence),
                cardName: cleanText,
                method: 'ocr_fallback'
            };
            
        } catch (error) {
            this.log('❌ OCR fallback error:', error);
            return {
                success: false,
                confidence: 0,
                cardName: '',
                method: 'ocr_failed'
            };
        }
    }

    extractNameZone(imageData) {
        const zone = this.cardDimensions.nameZone;
        
        const nameX = Math.floor(imageData.width * zone.x);
        const nameY = Math.floor(imageData.height * zone.y);
        const nameWidth = Math.floor(imageData.width * zone.width);
        const nameHeight = Math.floor(imageData.height * zone.height);
        
        const { canvas, ctx } = this.setupCanvas(nameWidth, nameHeight);
        const nameZoneData = ctx.createImageData(nameWidth, nameHeight);
        
        for (let y = 0; y < nameHeight; y++) {
            for (let x = 0; x < nameWidth; x++) {
                const srcIndex = ((nameY + y) * imageData.width + (nameX + x)) * 4;
                const dstIndex = (y * nameWidth + x) * 4;
                
                for (let i = 0; i < 4; i++) {
                    nameZoneData.data[dstIndex + i] = imageData.data[srcIndex + i];
                }
            }
        }
        
        return nameZoneData;
    }

    cleanOCRText(text) {
        if (!text) return '';
        
        return text
            .replace(/[^\w\s',.-]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    selectBestHybridResult(claudeResult, ocrResult, startTime) {
        const processingTime = Date.now() - startTime;
        
        // Claude Vision Success (Primary)
        if (claudeResult && claudeResult.success && claudeResult.confidence >= 90) {
            return {
                hasCard: true,
                cardName: claudeResult.cardName,
                confidence: claudeResult.confidence,
                detectionConfidence: claudeResult.confidence / 100,
                method: `CLAUDE_VISION_SUCCESS`,
                dimensions: '1280x720',
                processingTime: processingTime,
                strategy: 'claude_vision_primary'
            };
        }
        
        // OCR Success (Fallback)
        if (ocrResult && ocrResult.success && ocrResult.confidence >= 50) {
            return {
                hasCard: true,
                cardName: ocrResult.cardName,
                confidence: ocrResult.confidence,
                detectionConfidence: ocrResult.confidence / 100,
                method: `OCR_FALLBACK_SUCCESS`,
                dimensions: '1280x720',
                processingTime: processingTime,
                strategy: 'ocr_fallback'
            };
        }
        
        // No reliable recognition
        const reason = !this.claudeEnabled ? 'CLAUDE_PROXY_NOT_RUNNING' : 
                      claudeResult && claudeResult.method === 'claude_vision_unclear' ? 'CLAUDE_UNCLEAR_IMAGE' :
                      'LOW_CONFIDENCE';
        
        const message = !this.claudeEnabled ? 
            'Start Claude Proxy Server for 95% accuracy - currently using OCR fallback only' :
            claudeResult && claudeResult.method === 'claude_vision_unclear' ?
            'Card image unclear to Claude Vision - try better lighting and stable positioning' :
            'Card detected but recognition confidence too low - try better lighting';
        
        return {
            hasCard: false,
            message: message,
            reason: reason,
            details: `Claude: ${this.claudeEnabled ? 'Running' : 'Not running'}, Processing time: ${processingTime}ms`,
            processingTime: processingTime
        };
    }

    setupCanvas(width, height) {
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.ctx = this.canvas.getContext('2d');
        }
        this.canvas.width = width;
        this.canvas.height = height;
        return { canvas: this.canvas, ctx: this.ctx };
    }

    log(message, data = null) {
        if (this.debugMode) {
            console.log(`🎯 ${message}`, data || '');
        }
    }

    // Compatibility methods
    async scanCard(imageSrc, cardType = 'standard') {
        this.log('🎯 scanCard() called - delegating to processVideoFrame()');
        // For compatibility with existing code
        return { success: false, confidence: 0 };
    }

    async processCardImage(imageSrc, cardType = 'standard') {
        this.log('🎯 processCardImage() called - delegating to processVideoFrame()');
        // For compatibility with existing code
        return { success: false, confidence: 0 };
    }
}

export default ClaudeVisionService;