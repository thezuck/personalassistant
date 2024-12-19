// Handle installation and updates
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed');
  }
});

// Store scheduled meeting timers
let scheduledMeetings = new Map();

// Handle messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SCHEDULE_MEETINGS') {
    console.log('Received events to schedule:', request.events);
    scheduleUpcomingMeetings(request.events);
    sendResponse({ success: true });
    return true; // Required for async response
  }
});

// Store scheduled meeting information in chrome.storage
function persistScheduledMeetings() {
  const meetings = Array.from(scheduledMeetings.entries()).map(([eventId, timerId]) => ({
    eventId,
    scheduledTime: Date.now() + timerId._idleTimeout
  }));
  chrome.storage.local.set({ scheduledMeetings: meetings });
}

// Restore scheduled meetings when service worker starts
chrome.storage.local.get(['scheduledMeetings'], (result) => {
  if (result.scheduledMeetings) {
    result.scheduledMeetings.forEach(meeting => {
      const timeUntilMeeting = meeting.scheduledTime - Date.now();
      if (timeUntilMeeting > 0) {
        const timerId = setTimeout(() => {
          chrome.tabs.create({ url: meeting.url, active: true }, (tab) => {
            chrome.windows.update(tab.windowId, { focused: true });
          });
        }, timeUntilMeeting);
        scheduledMeetings.set(meeting.eventId, timerId);
      }
    });
  }
});

function scheduleUpcomingMeetings(events) {
  // Clear existing timers
  scheduledMeetings.forEach(timerId => clearTimeout(timerId));
  scheduledMeetings.clear();
  chrome.storage.local.remove('scheduledMeetings');

  events.forEach(async event => {
    const meetingUrl = await getMeetingUrl(event);
    console.log('Meeting URL for', event.summary, ':', meetingUrl);
    if (!meetingUrl) return;

    const startTime = new Date(event.start.dateTime || event.start.date).getTime();
    const now = new Date().getTime();
    const timeUntilMeeting = startTime - now - 60000; // 1 minute before

    console.log('Time until meeting:', timeUntilMeeting/1000/60, 'minutes');

    if (timeUntilMeeting > 0) {
      const timerId = setTimeout(() => {
        console.log('Opening meeting URL:', meetingUrl);
        chrome.tabs.create({ url: meetingUrl, active: true }, (tab) => {
          console.log('Tab created:', tab);
          chrome.windows.update(tab.windowId, { focused: true });
        });
        scheduledMeetings.delete(event.id);
        persistScheduledMeetings();
      }, timeUntilMeeting);

      scheduledMeetings.set(event.id, timerId);
      persistScheduledMeetings();
      console.log(`Scheduled meeting: ${event.summary} in ${timeUntilMeeting/1000/60} minutes`);
    }
  });
}

function getMeetingUrl(event) {
  // Get settings
  return new Promise((resolve) => {
    chrome.storage.sync.get({
      enableZoom: true,
      enableMeet: true,
      meetingFilters: []
    }, (settings) => {
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
          resolve(null);
          return;
        }
      }

      // Check for Google Meet
      if (settings.enableMeet && event.conferenceData?.conferenceId) {
        const meetLink = event.conferenceData.entryPoints?.find(e => e.entryPointType === 'video')?.uri;
        if (meetLink) {
          resolve(meetLink);
          return;
        }
      }
      
      // Check for Zoom
      if (settings.enableZoom) {
        const zoomRegex = /https:\/\/[^\/]*zoom\.us\/[^\s<)"]*/i;
        const description = event.description || '';
        const location = event.location || '';
        
        const zoomLink = description.match(zoomRegex) || location.match(zoomRegex);
        if (zoomLink) {
          resolve(zoomLink[0]);
          return;
        }
      }

      resolve(null);
    });
  });
}