// Handle installation and updates
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Initialize opened meetings storage
    chrome.storage.local.set({ openedMeetings: [] });
  }
});

// Store scheduled meeting timers
let scheduledMeetings = new Map();

// Handle messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SCHEDULE_MEETINGS') {
    // Create an async context to handle the scheduling
    (async () => {
      try {
        await scheduleUpcomingMeetings(request.events);
        sendResponse({ success: true });
      } catch (error) {
        console.error('Error scheduling meetings:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
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

// Helper function to get UTC timestamp
function getUtcTimestamp(dateTimeString) {
  const date = new Date(dateTimeString);
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds()
  );
}

function isValidTimeZone(tz) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch (e) {
    return false;
  }
}

// Check if a meeting has been opened before
async function hasBeenOpened(event) {
  const data = await chrome.storage.local.get('openedMeetings');
  const openedMeetings = data.openedMeetings || [];
  
  // Get UTC timestamp for comparison
  const startTime = getUtcTimestamp(event.start.dateTime || event.start.date);
  return openedMeetings.some(meeting => 
    meeting.id === event.id && 
    meeting.startTime === startTime &&
    meeting.timeZone === event.start.timeZone // Compare timezone
  );
}

// Mark a meeting as opened
async function markMeetingAsOpened(event) {
  const data = await chrome.storage.local.get('openedMeetings');
  const openedMeetings = data.openedMeetings || [];
  const startTime = getUtcTimestamp(event.start.dateTime || event.start.date);
  
  // Store meeting info with timezone
  const meetingKey = {
    id: event.id,
    startTime: startTime,
    timeZone: event.start.timeZone,
    summary: event.summary,
    originalStart: event.start.dateTime || event.start.date // Store original time for debugging
  };
  
  if (!openedMeetings.some(m => 
    m.id === event.id && 
    m.startTime === startTime && 
    m.timeZone === event.start.timeZone
  )) {
    openedMeetings.push(meetingKey);
    await chrome.storage.local.set({ openedMeetings: openedMeetings });
  }
}

// Clean up old opened meetings (older than 24 hours)
async function cleanupOldMeetings() {
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000); // 24 hours in milliseconds
  
  const data = await chrome.storage.local.get('openedMeetings');
  const openedMeetings = data.openedMeetings || [];
  
  // Filter out meetings older than 24 hours using UTC time
  const filteredMeetings = openedMeetings.filter(meeting => {
    return meeting.startTime > oneDayAgo;
  });
  
  await chrome.storage.local.set({ openedMeetings: filteredMeetings });
}

async function scheduleUpcomingMeetings(events) {
  console.log('Scheduling meetings:', events);

  // Clear existing timers
  scheduledMeetings.forEach(timerId => clearTimeout(timerId));
  scheduledMeetings.clear();
  await chrome.storage.local.remove('scheduledMeetings');

  // Process events sequentially to avoid race conditions
  for (const event of events) {
    // Get global and event-specific settings
    const { autoOpenMinutes: globalMinutes } = await chrome.storage.sync.get({ autoOpenMinutes: 1 });
    const { eventSettings } = await chrome.storage.local.get(['eventSettings']);
    const eventMinutes = eventSettings?.[event.id]?.autoOpenMinutes;
    
    // Use event-specific setting if available, otherwise use global setting
    const minutesBefore = eventMinutes ?? globalMinutes;
    
    const startTime = getUtcTimestamp(event.start.dateTime || event.start.date);
    const now = Date.now();
    
    console.log(`Processing event: ${event.summary}`);
    console.log(`Start time UTC: ${new Date(startTime).toUTCString()}`);
    console.log(`Time until meeting: ${startTime - now}ms`);
    console.log(`Timezone: ${event.start.timeZone}`);
    
    // Skip if meeting is in the past
    if (startTime < now) {
      console.log('Skipping past meeting');
      continue;
    }

    // Skip if meeting was already opened
    const wasOpened = await hasBeenOpened(event);  // Pass entire event object
    if (wasOpened) {
      console.log('Skipping already opened meeting');
      continue;
    }

    const meetingUrl = await getMeetingUrl(event);
    if (!meetingUrl) {
      console.log('No meeting URL found');
      continue;
    }

    const timeUntilMeeting = startTime - now;
    const scheduleTime = timeUntilMeeting - (minutesBefore * 60000);

    // Only schedule future meetings
    if (timeUntilMeeting > minutesBefore * 60000) {  // More than 1 minute away
      console.log(`Scheduling meeting for ${new Date(startTime - minutesBefore * 60000)}`);
      const timerId = setTimeout(async () => {
        console.log(`Opening scheduled meeting: ${event.summary}`);
        chrome.tabs.create({ url: meetingUrl, active: true }, async (tab) => {
          chrome.windows.update(tab.windowId, { focused: true });
          await markMeetingAsOpened(event);  // Pass entire event object
        });
        scheduledMeetings.delete(event.id);
        await persistScheduledMeetings();
      }, scheduleTime);

      scheduledMeetings.set(event.id, timerId);
      await persistScheduledMeetings();
    } 
    // Only open immediately if within the 1-minute window and not already opened
    else if (timeUntilMeeting > 0 && timeUntilMeeting <= minutesBefore * 60000) {
      console.log(`Opening immediate meeting: ${event.summary}`);
      chrome.tabs.create({ url: meetingUrl, active: true }, async (tab) => {
        chrome.windows.update(tab.windowId, { focused: true });
        await markMeetingAsOpened(event);  // Pass entire event object
      });
    }
  }

  // Clean up old meetings
  await cleanupOldMeetings();
}

async function getMeetingUrl(event) {
  // First check if meeting is skipped
  const data = await chrome.storage.local.get('skippedMeetings');
  const skippedMeetings = data.skippedMeetings || [];
  const isSkipped = skippedMeetings.some(meeting => 
    meeting.id === event.id && 
    meeting.startTime === new Date(event.start.dateTime || event.start.date).getTime() &&
    meeting.timeZone === event.start.timeZone
  );

  if (isSkipped) {
    return null; // Don't open skipped meetings
  }

  // Get settings
  const settings = await chrome.storage.sync.get({
    enableZoom: true,
    enableMeet: true,
    meetingFilters: []
  });

  // Check if meeting title matches any filter
  if (settings.meetingFilters.length > 0) {
    const matchesFilter = settings.meetingFilters.some(filter => {
      try {
        const filterRegex = new RegExp(filter);
        return filterRegex.test(event.summary);
      } catch (e) {
        return false;
      }
    });
    if (!matchesFilter) {
      return null;
    }
  }

  // Check for Google Meet
  if (settings.enableMeet && event.conferenceData?.conferenceId) {
    const meetLink = event.conferenceData.entryPoints?.find(e => e.entryPointType === 'video')?.uri;
    if (meetLink) {
      return meetLink;
    }
  }
  
  // Check for Zoom
  if (settings.enableZoom) {
    const zoomRegex = /https:\/\/[^\/]*zoom\.us\/[^\s<)"]*/i;
    const description = event.description || '';
    const location = event.location || '';
    
    const zoomLink = description.match(zoomRegex) || location.match(zoomRegex);
    if (zoomLink) {
      return zoomLink[0];
    }
  }

  return null;
}

// Add timezone change detection
chrome.runtime.onStartup.addListener(() => {
  const currentZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  chrome.storage.local.get('lastTimeZone', (data) => {
    if (data.lastTimeZone && data.lastTimeZone !== currentZone) {
      // Timezone has changed, reschedule all meetings
      console.log(`Timezone changed from ${data.lastTimeZone} to ${currentZone}`);
      chrome.storage.local.remove('openedMeetings');
    }
    chrome.storage.local.set({ lastTimeZone: currentZone });
  });
});