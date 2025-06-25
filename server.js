import express from "express";
import { Mistral } from '@mistralai/mistralai';
import axios from "axios";
import 'dotenv/config';

///import of cors
import cors from "cors";



// Environment variables setup
const apiKey = process.env.MISTRAL_API_KEY;
const port = process.env.PORT || 3500;

// Check if API key exists
if (!apiKey) {
    console.error('❌ ERROR: MISTRAL_API_KEY missing in environment variables');
    process.exit(1);
}

// Single Mistral instance
const mistral = new Mistral({
    apiKey: apiKey,
});

// Express setup
const app = express();
app.use(express.json());

app.use(cors());
// using cors to allow cross-origin requests

// JSON validation middleware
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ error: 'Invalid JSON' });
    }
    next();
});

// Basic route
app.get('/', (req, res) => {
    res.json({
        message: 'Mistral Express API',
        status: 'Online',
        endpoints: ['/chatWithAi', '/generateLetter']
    });

});


// Generate letter endpoint
app.post('/generateLetter', async (req, res) => {
    try {
        // Input validation
        const { LetterRecipientName, LetterOccasion, LetterTone, LetterStyle } = req.body;

        // Check required fields
        if (!LetterRecipientName || !LetterOccasion) {
            return res.status(400).json({
                error: 'LetterRecipientName and LetterOccasion fields are required',
                success: false
            });
        }

        // Default values
        const tone = LetterTone || 'friendly';
        const style = LetterStyle || 'formal';

        console.log('📝 Generating letter for:', {
            recipient: LetterRecipientName,
            occasion: LetterOccasion,
            tone: tone,
            style: style
        });

        // Call internal API
        const callAiFunction = await axios.post(`http://localhost:${port}/chatWithAi`, {
            messages: [
                {
                    content: `Generate a ${tone} ${style} letter for ${LetterRecipientName} on the occasion of ${LetterOccasion}.`,
                    role: "user",
                },
            ],
        }, {
            timeout: 30000 // 30 seconds timeout
        });

        // Get AI response
        const AiResponse = callAiFunction.data.data;

        console.log('✅ Letter generated successfully');

        res.json({
            success: true,
            message: "Letter generated successfully",
            data: AiResponse,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error in /generateLetter:', error.message);

        // Handle specific axios errors
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                error: 'Cannot connect to AI service',
                success: false
            });
        }

        res.status(500).json({
            error: 'Failed to generate letter',
            success: false,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});





// Chat with AI endpoint
app.post('/chatWithAi', async (req, res) => {
    try {
        // Input validation
        const { messages } = req.body;

        // to check if messages is not empty
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({
                error: 'Messages field is required and must be a non-empty array'
            });
        }

        // Message format validation
        // to check data validity
        const isValidMessages = messages.every(msg =>
            msg && typeof msg === 'object' &&
            // check msg is object
            typeof msg.content === 'string' &&
            // check content is string
            typeof msg.role === 'string'
            // check role is string
            // it s use to avoid bad injection
        );

        if (!isValidMessages) {
            return res.status(400).json({
                error: 'Invalid message format. Each message must have "content" and "role"'
            });
        }

        console.log('📨 Sending request to Mistral AI...');


        // Call Mistral AI chat completion
        const result = await mistral.chat.complete({
            model: "mistral-small-latest",
            messages: messages,
        });

        // Check if result contains choices
        if (result.choices && result.choices.length > 0) {
            const message = result.choices[0].message.content;
            console.log('✅ Response received from Mistral AI');

            res.json({
                success: true,
                message: "Chat with AI successful",
                data: message,
                timestamp: new Date().toISOString()
            });
        }
        // If no choices are found, return an error
        else {
            console.error('❌ No response found from Mistral AI');
            res.status(500).json({
                error: "No response found from Mistral AI",
                success: false
            });
        }

    }
    // Handle specific axios errors
    catch (error) {
        console.error('❌ Error in /chatWithAi:', error.message);
        res.status(500).json({
            error: 'Internal server error',
            success: false,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});



// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        success: false,
        available_routes: ['GET /', 'POST /chatWithAi', 'POST /generateLetter']
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('❌ Unhandled error:', error);
    res.status(500).json({
        error: 'Something went wrong',
        success: false
    });
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Server started on port ${port}`);
    console.log(`🔗 Available at: http://localhost:${port}`);
});