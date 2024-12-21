import React, { useState, useEffect } from 'react';
import { VStack, Skeleton, Box, Heading, Divider } from '@chakra-ui/react';
import EventCard from '../EventCard/EventCard';
import './EventList.css';

function EventList({ events, isLoading, isPaused }) {
  const [settings, setSettings] = useState({
    enableZoom: true,
    enableMeet: true,
    meetingFilters: []
  });

  useEffect(() => {
    chrome.storage.sync.get({
      enableZoom: true,
      enableMeet: true,
      meetingFilters: []
    }, (items) => {
      setSettings(items);
    });

    const handleStorageChange = (changes) => {
      if (changes.meetingFilters) {
        setSettings(prev => ({
          ...prev,
          meetingFilters: changes.meetingFilters.newValue
        }));
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
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

  // Helper function to check if event matches filters
  const matchesFilters = (event) => {
    if (!settings.meetingFilters.length) return true;
    
    return settings.meetingFilters.some(filter => {
      try {
        const filterRegex = new RegExp(filter, 'i');
        return filterRegex.test(event.summary);
      } catch (e) {
        return false;
      }
    });
  };

  // Filter events based on settings and filters
  const filterEvents = (eventList) => {
    return eventList.filter(event => {
      const type = getMeetingType(event);
      if (type === 'meet' && !settings.enableMeet) return false;
      if (type === 'zoom' && !settings.enableZoom) return false;
      return matchesFilters(event);
    });
  };

  const now = new Date();
  const pastMeetings = filterEvents(events?.filter(event => 
    new Date(event.start.dateTime || event.start.date) < now
  ) || []).sort((a, b) => 
    new Date(b.start.dateTime || b.start.date) - new Date(a.start.dateTime || a.start.date)
  );

  const upcomingMeetings = filterEvents(events?.filter(event => 
    new Date(event.start.dateTime || event.start.date) >= now
  ) || []).sort((a, b) => 
    new Date(a.start.dateTime || a.start.date) - new Date(b.start.dateTime || b.start.date)
  );

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

  if (!upcomingMeetings.length && !pastMeetings.length) {
    return (
      <Box p={4} textAlign="center" color="gray.500" borderRadius="md" bg="gray.50">
        No meetings match the current filters
      </Box>
    );
  }

  return (
    <VStack spacing={0} align="stretch" height="100%" minHeight="0">
      {upcomingMeetings.length > 0 ? (
        <Box opacity={isPaused ? 0.6 : 1} transition="opacity 0.2s">
          <Heading size="sm" mb={3} color="gray.600">
            Upcoming Meetings
          </Heading>
          <Box maxH={upcomingMeetings.length > 4 ? "240px" : "auto"} 
               overflowY={upcomingMeetings.length > 4 ? "auto" : "visible"}
               className="scrollable-section">
            <VStack spacing={1.5} align="stretch" mb={0} pb={0}>
              {upcomingMeetings.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </VStack>
          </Box>
        </Box>
      ) : null}

      <>
        {upcomingMeetings.length > 0 && <Divider my={2} />}
        <Box flex="1" minHeight="0" opacity={isPaused ? 0.6 : 1} transition="opacity 0.2s">
          <Heading size="sm" mb={3} color="gray.600">
            Past Meetings
          </Heading>
          {pastMeetings.length > 0 ? (
            <Box maxH={pastMeetings.length > 3 ? "200px" : `${pastMeetings.length * 48 + (pastMeetings.length - 1) * 10 + 10}px`}
                 height={pastMeetings.length > 3 ? "200px" : `${pastMeetings.length * 48 + (pastMeetings.length - 1) * 10 + 10}px`}
                 overflowY={pastMeetings.length > 3 ? "scroll" : "hidden"}
                 className="scrollable-section"
                 mb={0}
                 pb={0}>
              <VStack spacing={1.5} align="stretch" margin={0} padding={0}>
                {pastMeetings.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </VStack>
            </Box>
          ) : (
            <Box p={4} textAlign="center" color="gray.500" borderRadius="md" bg="gray.50" height="60px">
              No past meetings today
            </Box>
          )}
        </Box>
      </>
    </VStack>
  );
}

export default EventList; 