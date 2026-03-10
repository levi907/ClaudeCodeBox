import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';

export const chatRouter = Router();

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequestBody {
  message: string;
  history: ConversationMessage[];
}

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT =
  "You are a helpful voice assistant. Keep responses concise and conversational, " +
  "suitable for text-to-speech playback. Avoid markdown, bullet points, code blocks, " +
  "or special characters that don't translate well to speech. Speak naturally as if " +
  "having a real conversation.";

chatRouter.post('/chat', async (req: Request, res: Response) => {
  const { message, history }: ChatRequestBody = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required and must be a string' });
  }

  if (!Array.isArray(history)) {
    return res.status(400).json({ error: 'history must be an array' });
  }

  const messages: ConversationMessage[] = [
    ...history,
    { role: 'user', content: message },
  ];

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    });

    const assistantMessage =
      response.content[0].type === 'text' ? response.content[0].text : '';

    return res.json({
      response: assistantMessage,
      updatedHistory: [
        ...messages,
        { role: 'assistant', content: assistantMessage },
      ],
    });
  } catch (error) {
    console.error('Anthropic API error:', error);
    return res.status(500).json({ error: 'Failed to get response from Claude' });
  }
});
