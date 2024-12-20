import React from 'react';
import { Box, HStack, Text, Badge, Icon, Button, IconButton, Tooltip, Popover, PopoverTrigger, PopoverContent, PopoverBody, PopoverArrow, FormControl, FormLabel, NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper } from '@chakra-ui/react';
import { FaExternalLinkAlt, FaCog } from 'react-icons/fa';
import { SiGooglemeet, SiZoom } from 'react-icons/si';
import './EventCard.css';

function EventCard({ event }) {
  const [isSkipped, setIsSkipped] = React.useState(false);
  const [isAutoOpened, setIsAutoOpened] = React.useState(false);
  const isPast = new Date(event.start.dateTime || event.start.date) < new Date();
  const [eventSettings, setEventSettings] = React.useState({ autoOpenMinutes: null });

  React.useEffect(() => {
    // Check if meeting is skipped or auto-opened
    chrome.storage.local.get(['skippedMeetings', 'openedMeetings'], (data) => {
      const skippedMeetings = data.skippedMeetings || [];
      const openedMeetings = data.openedMeetings || [];
      
      const startTime = new Date(event.start.dateTime || event.start.date).getTime();
      
      // Check if meeting was auto-opened
      const wasAutoOpened = openedMeetings.some(meeting => 
        meeting.id === event.id && 
        meeting.startTime === startTime &&
        meeting.timeZone === event.start.timeZone
      );

      // If auto-opened, also mark as skipped
      if (wasAutoOpened) {
        setIsAutoOpened(true);
        setIsSkipped(true);
      } else {
        // Check if manually skipped
        const isSkipped = skippedMeetings.some(meeting => 
          meeting.id === event.id && 
          meeting.startTime === startTime &&
          meeting.timeZone === event.start.timeZone
        );
        setIsSkipped(isSkipped);
      }
    });
  }, [event]);

  React.useEffect(() => {
    chrome.storage.local.get(['eventSettings'], (data) => {
      const settings = data.eventSettings?.[event.id] || { autoOpenMinutes: null };
      setEventSettings(settings);
    });
  }, [event.id]);

  const handleSkipToggle = async () => {
    const data = await chrome.storage.local.get('skippedMeetings');
    const skippedMeetings = data.skippedMeetings || [];
    const startTime = new Date(event.start.dateTime || event.start.date).getTime();

    if (isSkipped) {
      // Remove from skipped meetings
      const filteredMeetings = skippedMeetings.filter(meeting => 
        !(meeting.id === event.id && 
          meeting.startTime === startTime && 
          meeting.timeZone === event.start.timeZone)
      );
      await chrome.storage.local.set({ skippedMeetings: filteredMeetings });
      setIsSkipped(false);
    } else {
      // Add to skipped meetings
      const meetingKey = {
        id: event.id,
        startTime: startTime,
        timeZone: event.start.timeZone,
        summary: event.summary
      };
      await chrome.storage.local.set({ 
        skippedMeetings: [...skippedMeetings, meetingKey] 
      });
      setIsSkipped(true);
    }
  };

  const handleJoinNow = async () => {
    const meetingUrl = await getMeetingUrl(event);
    if (meetingUrl) {
      // Open the meeting
      chrome.tabs.create({ url: meetingUrl, active: true }, async (tab) => {
        chrome.windows.update(tab.windowId, { focused: true });
      });

      // Mark as skipped
      const data = await chrome.storage.local.get('skippedMeetings');
      const skippedMeetings = data.skippedMeetings || [];
      const startTime = new Date(event.start.dateTime || event.start.date).getTime();
      
      const meetingKey = {
        id: event.id,
        startTime: startTime,
        timeZone: event.start.timeZone,
        summary: event.summary
      };

      await chrome.storage.local.set({ 
        skippedMeetings: [...skippedMeetings, meetingKey] 
      });
      setIsSkipped(true);
    }
  };

  const getMeetingUrl = (event) => {
    return new Promise((resolve) => {
      chrome.storage.sync.get({
        enableZoom: true,
        enableMeet: true,
      }, (settings) => {
        if (settings.enableMeet && event.conferenceData?.conferenceId) {
          const meetLink = event.conferenceData.entryPoints?.find(e => e.entryPointType === 'video')?.uri;
          if (meetLink) {
            resolve(meetLink);
            return;
          }
        }
        
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
  };

  const startTime = event.start.dateTime
    ? new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: event.start.timeZone
      }).format(new Date(event.start.dateTime))
    : 'All day';

  const getMeetingType = () => {
    if (event.conferenceData?.conferenceId) {
      return { 
        icon: SiGooglemeet, 
        label: 'Google Meet', 
        color: 'green.500' 
      };
    }
    if (event.description?.includes('zoom.us') || event.location?.includes('zoom.us')) {
      return { 
        icon: SiZoom, 
        label: 'Zoom Meeting', 
        color: 'blue.500' 
      };
    }
    return null;
  };

  const meetingType = getMeetingType();

  const handleEventSettingsChange = async (value) => {
    const newSettings = { autoOpenMinutes: value };
    const data = await chrome.storage.local.get(['eventSettings']);
    const allEventSettings = data.eventSettings || {};
    
    await chrome.storage.local.set({
      eventSettings: {
        ...allEventSettings,
        [event.id]: newSettings
      }
    });
    
    setEventSettings(newSettings);
  };

  return (
    <Box 
      className={`event-card ${isSkipped ? 'skipped' : ''} ${isAutoOpened ? 'auto-opened' : ''}`}
    >
      <HStack spacing={4} align="center" justify="space-between">
        <HStack spacing={4} align="center" flex="1">
          <Text className="event-time">{startTime}</Text>
          <Text className="event-title" noOfLines={2}>
            {event.summary}
          </Text>
        </HStack>
        <Box className="event-actions" ml={4}>
          <HStack spacing={2}>
            {!isPast && (
              <>
                <Popover placement="top">
                  <PopoverTrigger>
                    <IconButton
                      size="xs"
                      variant="outline"
                      icon={<FaCog />}
                      aria-label="Event settings"
                    />
                  </PopoverTrigger>
                  <PopoverContent width="200px">
                    <PopoverArrow />
                    <PopoverBody>
                      <FormControl>
                        <FormLabel fontSize="sm">Minutes before</FormLabel>
                        <NumberInput
                          size="sm"
                          value={eventSettings.autoOpenMinutes ?? 'Default'}
                          min={0}
                          max={60}
                          onChange={(value) => handleEventSettingsChange(value === 'Default' ? null : parseInt(value))}
                        >
                          <NumberInputField placeholder="Default" />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      </FormControl>
                    </PopoverBody>
                  </PopoverContent>
                </Popover>
                <Button
                  size="xs"
                  variant="outline"
                  colorScheme="gray"
                  onClick={handleSkipToggle}
                >
                  {isSkipped ? 'Restore' : 'Skip'}
                </Button>
              </>
            )}
            {meetingType && (
              <Tooltip label={`Join ${meetingType.label} Now`} placement="top">
                <IconButton
                  size="xs"
                  variant="outline"
                  icon={<Icon as={meetingType.icon} boxSize={4} />}
                  colorScheme={meetingType.color === 'green.500' ? 'green' : 'blue'}
                  onClick={handleJoinNow}
                  aria-label={`Join ${meetingType.label} now`}
                />
              </Tooltip>
            )}
          </HStack>
        </Box>
      </HStack>
    </Box>
  );
}

export default EventCard; 