class CalendarManager {
  constructor() {
    this.updateInterval = null;
  }

  async getEvents() {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('Failed to get authentication token');
      }

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
        const errorData = await response.json();
        throw new Error(`Calendar API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      chrome.runtime.sendMessage({
        type: 'SCHEDULE_MEETINGS',
        events: data.items
      });
      return data.items;
    } catch (error) {
      console.error('Error fetching events:', error);
      document.getElementById('error-message').textContent = 
        `Error: ${error.message}. Please make sure you are signed in to your Google account and have granted calendar permissions.`;
      throw error;
    }
  }

  startAutoUpdate(eventsContainer) {
    // Update every minute
    this.updateInterval = setInterval(async () => {
      try {
        const events = await this.getEvents();
        await displayEvents(events, eventsContainer, this);
      } catch (error) {
        console.error('Error updating events:', error);
      }
    }, 60000); // 60 seconds
  }

  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  async openEventUrls(event) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const description = event.description || '';
    const urls = description.match(urlRegex) || [];
    
    if (urls.length > 0) {
      chrome.runtime.sendMessage({
        type: 'OPEN_URLS',
        urls: urls
      });
    }
  }

  async getAuthToken() {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ 
        interactive: true,
        scopes: [
          "https://www.googleapis.com/auth/calendar",
          "https://www.googleapis.com/auth/calendar.events"
        ]
      }, token => {
        if (chrome.runtime.lastError) {
          console.error('Auth Error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          resolve(token);
        }
      });
    });
  }

  getMeetingInfo(event) {
    let meetingInfo = [];
    
    // Check for Google Meet
    if (event.conferenceData?.conferenceId) {
      const meetLink = event.conferenceData.entryPoints?.find(e => e.entryPointType === 'video')?.uri;
      if (meetLink) {
        meetingInfo.push(`Google Meet: ${meetLink}`);
      }
    }
    
    // Check for Zoom in description or location
    const zoomRegex = /https:\/\/[^\/]*zoom\.us\/[^\s<)"]*/i;
    const description = event.description || '';
    const location = event.location || '';
    
    const zoomLink = description.match(zoomRegex) || location.match(zoomRegex);
    if (zoomLink) {
      meetingInfo.push(`Zoom: ${zoomLink[0]}`);
    }
    
    return meetingInfo.join(', ');
  }
}

// Initialize the manager and add event listeners
document.addEventListener('DOMContentLoaded', async () => {
  const calendarManager = new CalendarManager();
  const eventsContainer = document.getElementById('events-container');

  // Add settings button handler
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  try {
    const events = await calendarManager.getEvents();
    await displayEvents(events, eventsContainer, calendarManager);
    calendarManager.startAutoUpdate(eventsContainer);
  } catch (error) {
    document.getElementById('error-message').textContent = 
      'Error: Please make sure you are signed in to Google Calendar';
  }
});

// Clean up when popup is closed
window.addEventListener('unload', () => {
  if (window.calendarManager) {
    window.calendarManager.stopAutoUpdate();
  }
});

async function displayEvents(events, container, manager) {
  const now = new Date();
  // Get settings
  const settings = await new Promise(resolve => {
    chrome.storage.sync.get({
      enableZoom: true,
      enableMeet: true,
      meetingFilters: []
    }, resolve);
  });

  // Filter events based on time, meeting type, and filter pattern
  const upcomingEvents = events.filter(event => {
    const eventTime = new Date(event.start.dateTime || event.start.date);
    if (eventTime <= now) return false;

    // Check if meeting title matches any filter
    if (settings.meetingFilters.length > 0) {
      const matchesFilter = settings.meetingFilters.some(filter => {
        try {
          const filterRegex = new RegExp(filter);
          return filterRegex.test(event.summary);
        } catch (e) {
          console.error('Invalid regex pattern:', filter);
          return false;
        }
      });
      if (!matchesFilter) {
        return false;
      }
    }

    // Check if it's a meeting we would auto-activate
    if (settings.enableMeet && event.conferenceData?.conferenceId) {
      return true;
    }

    if (settings.enableZoom) {
      const zoomRegex = /https:\/\/[^\/]*zoom\.us\/[^\s<)"]*/i;
      const description = event.description || '';
      const location = event.location || '';
      if (description.match(zoomRegex) || location.match(zoomRegex)) {
        return true;
      }
    }

    return false;
  });

  container.innerHTML = upcomingEvents.map(event => {
    const startTime = event.start.dateTime ? 
      new Date(event.start.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
      'All day';
    
    let meetingType = '';
    if (event.conferenceData?.conferenceId) {
      meetingType = '[meet] ';
    } else {
      const zoomRegex = /https:\/\/[^\/]*zoom\.us\/[^\s<)"]*/i;
      const hasZoom = (event.description || '').match(zoomRegex) || (event.location || '').match(zoomRegex);
      if (hasZoom) {
        meetingType = '[zoom] ';
      }
    }

    return `
      <div class="event-card">
        <span class="event-time">${startTime}</span>
        <span class="event-title">${meetingType}${event.summary}</span>
      </div>
    `;
  }).join('') || '<div class="no-events">No upcoming events today</div>';
} 