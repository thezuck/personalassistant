export async function getEvents() {
  try {
    const token = await getAuthToken();
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${now.toISOString()}&` +
      `timeMax=${endOfDay.toISOString()}&` +
      `orderBy=startTime&` +
      `conferenceDataVersion=1&` +
      `singleEvents=true`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch calendar events');
    }

    const data = await response.json();
    
    // Schedule meetings in background
    chrome.runtime.sendMessage({
      type: 'SCHEDULE_MEETINGS',
      events: data.items
    });

    return data.items;
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
}

function getAuthToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ 
      interactive: true,
      scopes: [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events"
      ]
    }, token => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(token);
      }
    });
  });
} 