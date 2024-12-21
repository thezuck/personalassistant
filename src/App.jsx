import React, { useState, useEffect } from 'react';
import { ChakraProvider, Box, VStack, Heading, HStack, IconButton, Tooltip } from '@chakra-ui/react';
import { FiPause, FiPlay } from 'react-icons/fi';
import EventList from './components/EventList/EventList';
import SettingsButton from './components/SettingsButton/SettingsButton';
import ErrorMessage from './components/ErrorMessage/ErrorMessage';
import useCalendarEvents from './hooks/useCalendarEvents';
import './App.css';

function App() {
  const { events, error, isLoading } = useCalendarEvents();
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    chrome.storage.sync.get({ isPaused: false }, (items) => {
      setIsPaused(items.isPaused);
    });
  }, []);

  const handlePauseToggle = () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    chrome.storage.sync.set({ isPaused: newPausedState });
  };

  return (
    <ChakraProvider>
      <Box className="app-container" p={4} maxW="600px" margin="0 auto" width="100%">
        <VStack spacing={4} align="stretch" width="100%" overflow="hidden">
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Heading size="md">Today's Meetings</Heading>
            <HStack spacing={2}>
              <Tooltip label={isPaused ? "Resume auto-open" : "Pause auto-open"}>
                <IconButton
                  icon={isPaused ? <FiPlay /> : <FiPause />}
                  variant="ghost"
                  onClick={handlePauseToggle}
                  aria-label={isPaused ? "Resume" : "Pause"}
                  colorScheme={isPaused ? "orange" : "gray"}
                />
              </Tooltip>
              <SettingsButton />
            </HStack>
          </Box>
          
          {error && <ErrorMessage message={error} />}
          <EventList events={events} isLoading={isLoading} isPaused={isPaused} />
        </VStack>
      </Box>
    </ChakraProvider>
  );
}

export default App; 