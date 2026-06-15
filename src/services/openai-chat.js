/**
 * OpenAI Chat Service
 * Handles communication with OpenAI API for WaterOS Copilot
 */

const OPENAI_API_URL = 'https://api.openai.com/chat/completions'
const MODEL = 'gpt-4o-mini' // Using cost-effective model, can be upgraded to gpt-4o

/**
 * Format context data into a system prompt
 */
export function formatContextForPrompt(eventContexts = [], meterContexts = [], impactAnalyses = []) {
  let contextText = ''
  
  // Add event contexts
  if (eventContexts.length > 0) {
    contextText += '\n\nCurrent Event Contexts:\n'
    eventContexts.forEach((ctx, idx) => {
      contextText += `\nEvent ${idx + 1}:\n`
      contextText += `- Name: ${ctx.eventName || 'Unknown Event'}\n`
      if (ctx.affectedPipes) contextText += `- Affected Pipes: ${ctx.affectedPipes}\n`
      if (ctx.customersAffected) contextText += `- Customers Affected: ${ctx.customersAffected}\n`
      if (ctx.severity) {
        contextText += `- Severity: ${ctx.severity.map(s => `${s.count} ${s.label}`).join(', ')}\n`
      }
      if (ctx.dateTimeRange) contextText += `- Time Range: ${ctx.dateTimeRange}\n`
      
      // Meter-specific fields
      if (ctx.source === 'Network Meter Details') {
        contextText += `- Meter ID: ${ctx.meterId}\n`
        contextText += `- Status: ${ctx.status}\n`
        contextText += `- Pressure: ${ctx.pressureDisplay}\n`
        contextText += `- Flow Rate: ${ctx.flow} L/min\n`
        contextText += `- Water Quality: ${ctx.quality}\n`
        contextText += `- Impact Level: ${ctx.impact}\n`
        if (ctx.description) contextText += `- Description: ${ctx.description}\n`
      }
    })
  }
  
  // Add impact analyses
  if (impactAnalyses.length > 0) {
    contextText += '\n\nImpact Analysis Results:\n'
    impactAnalyses.forEach((analysis, idx) => {
      contextText += `\nAnalysis ${idx + 1}:\n`
      contextText += `- Event: ${analysis.eventName}\n`
      contextText += `- Category: ${analysis.category}\n`
      if (analysis.description) contextText += `- Description: ${analysis.description}\n`
    })
  }
  
  return contextText
}

/**
 * Build the system prompt for the AI assistant
 */
function buildSystemPrompt(contextData) {
  const basePrompt = `You are an AI assistant for WaterOS, a water infrastructure management system. You help operators monitor and respond to water network events.

Your Role:
- Provide expert guidance on water infrastructure management
- Analyze burst events, pressure sensor data, and network meter readings
- Offer actionable recommendations based on severity levels (critical, warning, normal)
- Help operators understand complex infrastructure situations

Guidelines:
- Be specific and data-driven in your responses
- Reference specific metrics, sensors, or events when available in the context
- Keep responses concise but informative (2-4 sentences unless more detail is requested)
- Use technical terminology appropriate for water infrastructure operators
- If asked about data not in the current context, acknowledge the limitation
- Focus on actionable insights rather than general information`

  const contextText = formatContextForPrompt(
    contextData.eventContexts,
    contextData.meterContexts,
    contextData.impactAnalyses
  )
  
  if (contextText) {
    return basePrompt + contextText
  }
  
  return basePrompt
}

/**
 * Convert chat messages to OpenAI format
 */
function formatMessagesForOpenAI(chatMessages, contextData) {
  const messages = []
  
  // Add system prompt
  messages.push({
    role: 'system',
    content: buildSystemPrompt(contextData)
  })
  
  // Add conversation history (only user and AI messages, skip context cards and impact analysis)
  chatMessages.forEach(msg => {
    if (msg.type === 'user-message') {
      messages.push({
        role: 'user',
        content: msg.message
      })
    } else if (msg.type === 'ai-message') {
      messages.push({
        role: 'assistant',
        content: msg.message
      })
    }
  })
  
  return messages
}

/**
 * Send a chat message to OpenAI and get a response
 * @param {Array} chatMessages - Array of all chat messages
 * @param {Object} contextData - Context data (eventContexts, meterContexts, impactAnalyses)
 * @returns {Promise<string>} - AI response text
 */
export async function sendChatMessage(chatMessages, contextData) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    throw new Error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.')
  }
  
  const messages = formatMessagesForOpenAI(chatMessages, contextData)
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        temperature: 0.7,
        max_tokens: 500, // Keep responses concise
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      if (response.status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your .env file.')
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.')
      } else if (response.status === 500) {
        throw new Error('OpenAI service error. Please try again later.')
      } else {
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`)
      }
    }
    
    const data = await response.json()
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from AI. Please try again.')
    }
    
    return data.choices[0].message.content.trim()
    
  } catch (error) {
    // Re-throw with better error messages
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('Network error. Please check your internet connection.')
    }
    throw error
  }
}

/**
 * Validate API key format
 */
export function validateApiKey() {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  return apiKey && apiKey !== 'your_openai_api_key_here' && apiKey.startsWith('sk-')
}
