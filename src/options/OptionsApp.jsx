import React, { useState } from 'react';
import { 
  ChakraProvider,
  Container, 
  VStack, 
  HStack, 
  Button, 
  Box,
  Heading,
  useToast 
} from '@chakra-ui/react';
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
    <ChakraProvider>
      <Box bg="gray.50" minH="100vh">
        <Container maxW="container.sm" py={8}>
          <VStack spacing={6} align="stretch" bg="white" p={6} borderRadius="lg" boxShadow="sm">
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Heading size="md" color="gray.700">Personal Assistant Settings</Heading>
            </Box>
            
            <Box borderRadius="md" bg="white">
              <SettingsForm 
                onSettingsChange={setHasChanges}
                onSave={setCurrentSettings}
              />
            </Box>

            <HStack spacing={4} justify="flex-end" pt={4} mt={4} borderTop="1px" borderColor="gray.100">
              <Button variant="ghost" onClick={handleCancel} size="md">
                Cancel
              </Button>
              <Button 
                colorScheme="blue" 
                onClick={handleSave}
                isDisabled={!hasChanges}
                size="md"
              >
                Save & Close
              </Button>
            </HStack>
          </VStack>
        </Container>
      </Box>
    </ChakraProvider>
  );
}

export default OptionsApp; 