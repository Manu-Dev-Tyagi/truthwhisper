const API_BASE = 'http://localhost:3000/api/v1';

export const analyzeContent = async (text: string) => {
  try {
    const response = await fetch(`${API_BASE}/analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: text,
        contentType: 'text/plain'
      })
    });
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    return { error: 'Failed to analyze content' };
  }
};