import React, { useState } from 'react';
import { Box, Container, Button, HStack, VStack, useToast } from '@chakra-ui/react';
import SettingsForm from '../components/SettingsForm/SettingsForm';

function OptionsApp() {
  const toast = useToast();
  const [hasChanges, setHasChanges] = useState(false);
  const [currentSettings, setCurrentSettings] = useState(null);

  const handleSave = async () => {
    if (currentSettings) {
      await chrome.storage.sync.set(currentSettings);
      toast({
        title: 'Settings saved',
        status: 'success',
        duration: 1000,
        isClosable: true,
        onCloseComplete: () => {
          window.close();
        }
      });
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        window.close();
      }
    } else {
      window.close();
    }
  };

  return (
    <Container maxW="container.sm" py={8}>
      <VStack spacing={6} align="stretch">
        <Box>
          <SettingsForm 
            onSettingsChange={setHasChanges}
            onSave={setCurrentSettings}
          />
        </Box>
        <HStack spacing={4} justify="flex-end">
          <Button variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            colorScheme="blue" 
            onClick={handleSave}
            isDisabled={!hasChanges}
          >
            Save & Close
          </Button>
        </HStack>
      </VStack>
    </Container>
  );
}

export default OptionsApp; 