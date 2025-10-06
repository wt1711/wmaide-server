import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

// Setup Express
const app = express();
app.use(cors()); // Enable CORS
app.use(express.json()); // Middleware to parse JSON bodies

// Set up OpenAI Client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Assistant can be created via API or UI
const assistantId = process.env.ASSISTANT_ID;
let pollingInterval;

// Set up a Thread
async function createThread() {
    console.log('Creating a new thread...');
    const thread = await openai.beta.threads.create();
    return thread;
}

async function addMessage(threadId, message) {
    console.log('Adding a new message to thread: ' + threadId);
    const response = await openai.beta.threads.messages.create(
        threadId,
        {
            role: "user",
            content: message
        }
    );
    return response;
}

async function runAssistant(threadId) {
    console.log('Running assistant for thread: ' + threadId)
    const response = await openai.beta.threads.runs.create(
        threadId,
        { 
          assistant_id: assistantId
          // Make sure to not overwrite the original instruction, unless you want to
        }
      );

    console.log('response', response)

    return response;
}

async function checkingStatus(res, threadId, runId) {
    try {
        console.log('=== CHECKING STATUS ===');
        console.log('threadId type:', typeof threadId, 'value:', threadId);
        console.log('runId type:', typeof runId, 'value:', runId);
        console.log('=======================');
        
        if (!threadId || threadId === 'undefined') {
            throw new Error('threadId is undefined or invalid');
        }
        
        if (!runId || runId === 'undefined') {
            throw new Error('runId is undefined or invalid');
        }
       
        
        // Debug the parameters before making the API call
        console.log('About to call retrieve with:');
        console.log('- threadId:', threadId, '(type:', typeof threadId, ')');
        console.log('- runId:', runId, '(type:', typeof runId, ')');
        
        let runObject;
        try {
            runObject = await openai.beta.threads.runs.retrieve(
                runId,
                {"thread_id": threadId, "run_id": runId}
            );
        } catch (retrieveError) {
            console.error('Error in retrieve call:', retrieveError);
            console.error('Error details:', {
                message: retrieveError.message,
                status: retrieveError.status,
                code: retrieveError.code,
                type: retrieveError.type
            });
            throw retrieveError;
        }

        const status = runObject.status;
        console.log('Current status: ' + status);
        
        if(status == 'completed') {
            clearInterval(pollingInterval);

            const messagesList = await openai.beta.threads.messages.list(threadId);
            let messages = []
            
            messagesList.body.data.forEach(message => {
                messages.push(message.content);
            });

            res.json({ messages });
        } else if (status == 'failed' || status == 'cancelled') {
            clearInterval(pollingInterval);
            res.status(500).json({ error: `Run ${status}`, status });
        }
    } catch (error) {
        console.error('Error checking status:', error);
        clearInterval(pollingInterval);
        res.status(500).json({ error: 'Failed to check status', details: error.message });
    }
}

//=========================================================
//============== ROUTE SERVER =============================
//=========================================================

// Open a new thread
app.get('/thread', (req, res) => {
    createThread().then(thread => {
        console.log('Thread created:', thread.id);
        res.json({ threadId: thread.id });
    });
})

app.post('/message', async (req, res) => {
    const { message, threadId } = req.body;
    
    console.log('Received request:', { message, threadId });
    
    if (!message || !threadId) {
        return res.status(400).json({ error: 'Missing message or threadId' });
    }
    
    try {
        // Add message to thread
        console.log('Adding message to thread:', threadId);
        const messageResponse = await addMessage(threadId, message);
        console.log('Message added successfully:', messageResponse.id);

        // Run the assistant
        const run = await runAssistant(threadId);
        const runId = run.id;
        console.log('Run started:', runId, 'for thread:', threadId);
        
        // Check the status
        pollingInterval = setInterval(() => {
            console.log('Polling status for threadId:', threadId, 'runId:', runId);
            checkingStatus(res, threadId, runId);
        }, 5000);
        
    } catch (error) {
        console.error('Error in message route:', error);
        res.status(500).json({ error: 'Failed to process message', details: error.message });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});