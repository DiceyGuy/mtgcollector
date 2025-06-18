// EnhancedClaudeVisionService.js - Premium Edition Detection
// Built on your working 95% accuracy foundation
// COPY THIS ENTIRE FILE - Complete standalone implementation

class EnhancedClaudeVisionService {
    constructor() {
        console.log('🚀 Enhanced ClaudeVisionService initialized - Premium Edition Detection Mode!');
        this.debugMode = true;
        this.apiEndpoint = 'http://localhost:3001/api/claude-vision'; // Your working proxy server
        this.retryAttempts = 3;
        this.retryDelay = 1000;
    }

    log(message, data = null) {
        if (this.debugMode) {
            console.log(`🎯 ${message}`, data || '');
        }
    }

    // 🎯 ENHANCED: Premium Edition Detection Prompt
    buildPremiumPrompt(userTier = 'free') {
        const basePrompt = `You are an expert MTG card identifier. Analyze this image and identify the Magic: The Gathering card.

CRITICAL REQUIREMENTS:
1. Identify the exact card name with 100% confidence
2. Look for edition/set indicators (set symbol, copyright date, artist, border style)
3. Note any special characteristics (foil, promo, alternate art, etc.)
4. Provide confidence levels for each identification

Please respond in this exact JSON format:
{
    "cardName": "Exact card name",
    "confidence": 95,
    "setDetection": {
        "detectedSet": "Best guess at set/edition",
        "setConfidence": 70,
        "setSymbol": "Description of set symbol if visible",
        "borderStyle": "black/white/silver/gold/other",
        "copyrightDate": "YYYY if visible"
    },
    "specialFeatures": {
        "foil": true/false,
        "promo": true/false,
        "alternateArt": true/false,
        "borderless": true/false,
        "showcase": true/false
    },
    "reasoning": "Detailed explanation of identification process"
}`;

        if (userTier === 'premium') {
            return basePrompt + `

PREMIUM TIER INSTRUCTIONS:
- Maximum detail on set identification clues
- Describe ANY visible set symbols, even partial ones
- Note frame style, text layout, copyright positioning
- Identify artist signature if visible
- Look for collector number if present
- Note any unique visual elements that could identify the edition`;
        }

        return basePrompt;
    }

    // 🎯 MAIN METHOD: Process Video Frame with Premium Features
    async processVideoFrame(videoElement, userTier = 'free') {
        this.log(`🎥 Processing video frame - ${userTier.toUpperCase()} tier`);
        
        try {
            // Capture frame (your existing working method)
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            ctx.drawImage(videoElement, 0, 0);
            
            // Convert to base64 (your existing working method)
            const imageData = canvas.toDataURL('image/jpeg', 0.9);
            this.log('📷 Frame captured for Claude Vision analysis');
            
            // Enhanced Claude Vision analysis
            const result = await this.callClaudeVisionAPI(imageData, userTier);
            
            if (result.success) {
                // Return enhanced result format
                return {
                    hasCard: true,
                    cardName: result.cardName,
                    confidence: result.confidence,
                    editionData: result.setDetection,
                    specialFeatures: result.specialFeatures,
                    reasoning: result.reasoning,
                    userTier: userTier,
                    needsEditionConfirmation: userTier === 'premium' && result.setDetection.setConfidence < 90,
                    timestamp: new Date().toISOString()
                };
            } else {
                return {
                    hasCard: false,
                    message: result.message || 'No card detected clearly enough for analysis',
                    reason: 'CLAUDE_VISION_FAILED',
                    userTier: userTier,
                    timestamp: new Date().toISOString()
                };
            }
            
        } catch (error) {
            this.log('❌ Enhanced video frame processing error:', error);
            return {
                hasCard: false,
                message: 'Enhanced scanner processing error: ' + error.message,
                reason: 'PROCESSING_ERROR',
                userTier: userTier,
                timestamp: new Date().toISOString()
            };
        }
    }

    // 🎯 ENHANCED: Claude Vision API Call with Premium Features
    async callClaudeVisionAPI(imageData, userTier = 'free', attempt = 1) {
        try {
            this.log(`🤖 Calling Claude Vision API - Attempt ${attempt}/${this.retryAttempts}`);
            
            const requestBody = {
                image: imageData,
                prompt: this.buildPremiumPrompt(userTier),
                model: 'claude-3-5-sonnet-20241022' // Your working model
            };

            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            this.log('✅ Claude Vision API response received');

            // Parse Claude's response
            const parsedResult = this.parseClaudeResponse(result.response);
            
            if (parsedResult.success) {
                this.log('🎯 Card identified successfully', {
                    cardName: parsedResult.cardName,
                    confidence: parsedResult.confidence,
                    setDetection: parsedResult.setDetection?.detectedSet || 'Unknown'
                });
                return parsedResult;
            } else {
                throw new Error('Claude Vision could not identify the card clearly');
            }

        } catch (error) {
            this.log(`❌ Claude Vision API error (attempt ${attempt}):`, error.message);
            
            if (attempt < this.retryAttempts) {
                this.log(`🔄 Retrying in ${this.retryDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.callClaudeVisionAPI(imageData, userTier, attempt + 1);
            }
            
            return {
                success: false,
                message: `Claude Vision failed after ${this.retryAttempts} attempts: ${error.message}`
            };
        }
    }

    // 🎯 ENHANCED: Parse Claude's JSON Response
    parseClaudeResponse(responseText) {
        try {
            // Extract JSON from Claude's response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No valid JSON found in Claude response');
            }

            const parsedData = JSON.parse(jsonMatch[0]);
            
            // Validate required fields
            if (!parsedData.cardName || !parsedData.confidence) {
                throw new Error('Missing required fields in Claude response');
            }

            // Ensure confidence is a number
            const confidence = parseInt(parsedData.confidence);
            if (isNaN(confidence) || confidence < 0 || confidence > 100) {
                throw new Error('Invalid confidence value');
            }

            return {
                success: true,
                cardName: parsedData.cardName.trim(),
                confidence: confidence,
                setDetection: parsedData.setDetection || {
                    detectedSet: 'Unknown',
                    setConfidence: 0,
                    setSymbol: 'Not visible',
                    borderStyle: 'unknown',
                    copyrightDate: 'Not visible'
                },
                specialFeatures: parsedData.specialFeatures || {
                    foil: false,
                    promo: false,
                    alternateArt: false,
                    borderless: false,
                    showcase: false
                },
                reasoning: parsedData.reasoning || 'Standard identification process'
            };

        } catch (error) {
            this.log('❌ Error parsing Claude response:', error.message);
            this.log('📝 Raw response:', responseText);
            
            return {
                success: false,
                message: `Response parsing failed: ${error.message}`
            };
        }
    }

    // 🎯 NEW: Get Enhanced Card Analysis (for premium features)
    async getDetailedCardAnalysis(imageData, cardName) {
        const enhancedPrompt = `You are analyzing an MTG card image for "${cardName}". 

Focus specifically on EDITION IDENTIFICATION:
1. Examine the set symbol carefully - describe shape, color, rarity
2. Look at border style and color (black, white, silver, gold)
3. Check copyright date and format
4. Note frame style and layout differences
5. Look for collector numbers
6. Identify any special edition markers

Provide detailed technical analysis for professional card identification.

Respond in JSON format:
{
    "technicalAnalysis": {
        "setSymbol": "Detailed description",
        "borderAnalysis": "Border type and condition",
        "copyrightAnalysis": "Copyright date and format",
        "frameAnalysis": "Frame style and era",
        "printQuality": "Assessment of print quality",
        "uniqueMarkers": "Any edition-specific features"
    },
    "recommendedActions": ["List of steps for manual verification"]
}`;

        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: imageData,
                    prompt: enhancedPrompt,
                    model: 'claude-3-5-sonnet-20241022'
                })
            });

            const result = await response.json();
            return this.parseClaudeResponse(result.response);

        } catch (error) {
            this.log('❌ Detailed analysis failed:', error);
            return { success: false, message: error.message };
        }
    }

    // 🎯 COMPATIBILITY: Maintain your existing scanCard method
    async scanCard(imageSrc, cardType = 'standard', userTier = 'free') {
        this.log('🎯 scanCard() called - delegating to enhanced processing');
        
        // Handle different input types (maintain compatibility)
        if (imageSrc instanceof HTMLVideoElement) {
            return await this.processVideoFrame(imageSrc, userTier);
        }
        
        // For other input types, convert to video element format
        // (This maintains compatibility with your existing code)
        return {
            success: false,
            message: 'Enhanced service requires video element input'
        };
    }
}

export default EnhancedClaudeVisionService;