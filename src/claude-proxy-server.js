// 🚀 CLAUDE VISION API PROXY SERVER - CORS SOLUTION
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3001;

// Your Claude API key - REPLACE WITH YOUR ACTUAL KEY
const CLAUDE_API_KEY = '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';

// Enable CORS for your React app
app.use(cors({
    origin: 'http://localhost:3000', // Your React app URL
    credentials: true
}));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Claude Vision Proxy Server is running!',
        apiKeyConfigured: CLAUDE_API_KEY !== 'sk-ant-api03-YOUR-ACTUAL-KEY-HERE'
    });
});

// Claude Vision API proxy endpoint
app.post('/api/claude-vision', async (req, res) => {
    console.log('🤖 Received Claude Vision request');
    
    try {
        // Check if API key is configured
        if (!CLAUDE_API_KEY || CLAUDE_API_KEY === 'sk-ant-api03-YOUR-ACTUAL-KEY-HERE') {
            return res.status(400).json({
                error: 'Claude API key not configured in proxy server',
                message: 'Please set your API key in claude-proxy-server.js'
            });
        }

        // Get the request data from your React app
        const { base64Image, prompt } = req.body;

        if (!base64Image) {
            return res.status(400).json({
                error: 'No image data provided'
            });
        }

        console.log('📷 Processing image for Claude Vision API...');

        // Prepare the request to Claude API
        const claudeRequest = {
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 300,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: 'image/jpeg',
                                data: base64Image
                            }
                        },
                        {
                            type: 'text',
                            text: prompt || `Analyze this Magic: The Gathering card image and identify the card name.

INSTRUCTIONS:
- Look at the card name in the title area (top of the card)
- Return ONLY the exact card name, nothing else
- If you can't read the card name clearly, return "UNCLEAR"
- Examples of good responses: "Lightning Bolt", "Black Lotus", "Gilded Lotus"

Card name:`
                        }
                    ]
                }
            ]
        };

        // Make the API call to Claude
        console.log('🔄 Calling Claude Vision API...');
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(claudeRequest)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Claude API error:', response.status, errorText);
            
            return res.status(response.status).json({
                error: `Claude API error: ${response.status}`,
                details: errorText
            });
        }

        const data = await response.json();
        const cardName = data.content[0].text.trim();

        console.log('✅ Claude Vision response:', cardName);

        // Return the result to your React app
        res.json({
            success: true,
            cardName: cardName,
            confidence: cardName === 'UNCLEAR' ? 0 : 95
        });

    } catch (error) {
        console.error('❌ Proxy server error:', error);
        res.status(500).json({
            error: 'Proxy server error',
            message: error.message
        });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log('🚀 Claude Vision Proxy Server started!');
    console.log(`📍 Server running on: http://localhost:${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`🤖 Claude endpoint: http://localhost:${PORT}/api/claude-vision`);
    
    if (CLAUDE_API_KEY === 'sk-ant-api03-YOUR-ACTUAL-KEY-HERE') {
        console.warn('⚠️  WARNING: Please set your Claude API key in this file!');
    } else {
        console.log('✅ Claude API key configured');
    }
    
    console.log('🎯 Ready to proxy Claude Vision API calls!');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Claude Vision Proxy Server...');
    process.exit(0);
});