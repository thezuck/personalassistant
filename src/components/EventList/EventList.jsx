import React, { useState, useEffect } from 'react';
import { VStack, Skeleton, Box, Heading, Divider } from '@chakra-ui/react';
import EventCard from '../EventCard/EventCard';
import './EventList.css';

function EventList({ events, isLoading }) {
  const [settings, setSettings] = useState({
    enableZoom: true,
    enableMeet: true
  });

  useEffect(() => {
    chrome.storage.sync.get({
      enableZoom: true,
      enableMeet: true
    }, (items) => {
      setSettings(items);
    });
  }, []);

  // Helper function to determine meeting type
  const getMeetingType = (event) => {
    if (event.conferenceData?.conferenceId) {
      return 'meet';
    }
    if (event.description?.includes('zoom.us') || event.location?.includes('zoom.us')) {
      return 'zoom';
    }
    return null;
  };

  // Filter events based on settings
  const filterEvents = (eventList) => {
    return eventList.filter(event => {
      const type = getMeetingType(event);
      if (type === 'meet' && !settings.enableMeet) return false;
      if (type === 'zoom' && !settings.enableZoom) return false;
      return true;
    });
  };

  if (isLoading) {
    return (
      <VStack spacing={4} align="stretch">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height="80px" borderRadius="md" />
        ))}
      </VStack>
    );
  }

  if (!events?.length) {
    return (
      <Box p={4} textAlign="center" color="gray.500" borderRadius="md" bg="gray.50">
        No upcoming meetings today
      </Box>
    );
  }

  const now = new Date();
  const pastMeetings = filterEvents(events.filter(event => 
    new Date(event.start.dateTime || event.start.date) < now
  )).sort((a, b) => 
    new Date(b.start.dateTime || b.start.date) - new Date(a.start.dateTime || a.start.date)
  );

  const upcomingMeetings = filterEvents(events.filter(event => 
    new Date(event.start.dateTime || event.start.date) >= now
  )).sort((a, b) => 
    new Date(a.start.dateTime || a.start.date) - new Date(b.start.dateTime || b.start.date)
  );

  if (!upcomingMeetings.length && !pastMeetings.length) {
    return (
      <Box p={4} textAlign="center" color="gray.500" borderRadius="md" bg="gray.50">
        No meetings match the current filters
      </Box>
    );
  }

  return (
    <VStack spacing={6} align="stretch" maxH="600px">
      {upcomingMeetings.length > 0 ? (
        <Box>
          <Heading size="sm" mb={3} color="gray.600">
            Upcoming Meetings
          </Heading>
          <Box maxH="300px" overflowY="auto" className="scrollable-section">
            <VStack spacing={3} align="stretch">
              {upcomingMeetings.slice(0, Math.max(5, upcomingMeetings.length)).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </VStack>
          </Box>
        </Box>
      ) : null}

      {pastMeetings.length > 0 && (
        <>
          {upcomingMeetings.length > 0 && <Divider my={2} />}
          <Box>
            <Heading size="sm" mb={3} color="gray.600">
              Past Meetings
            </Heading>
            <Box maxH="200px" overflowY="auto" className="scrollable-section">
              <VStack spacing={3} align="stretch">
                {pastMeetings.slice(0, Math.max(3, pastMeetings.length)).map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </VStack>
            </Box>
          </Box>
        </>
      )}
    </VStack>
  );
}

export default EventList; 