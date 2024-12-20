import React from 'react';
import { ChakraProvider, Box, VStack, Heading } from '@chakra-ui/react';
import EventList from './components/EventList/EventList';
import SettingsButton from './components/SettingsButton/SettingsButton';
import ErrorMessage from './components/ErrorMessage/ErrorMessage';
import useCalendarEvents from './hooks/useCalendarEvents';
import './App.css';

function App() {
  const { events, error, isLoading } = useCalendarEvents();

  return (
    <ChakraProvider>
      <Box className="app-container" p={4} maxW="600px" margin="0 auto">
        <VStack spacing={4} align="stretch">
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Heading size="md">Today's Meetings</Heading>
            <SettingsButton />
          </Box>
          
          {error && <ErrorMessage message={error} />}
          <EventList events={events} isLoading={isLoading} />
        </VStack>
      </Box>
    </ChakraProvider>
  );
}

export default App; 