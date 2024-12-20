import React from 'react';
import { Alert, AlertIcon, AlertDescription } from '@chakra-ui/react';

function ErrorMessage({ message }) {
  return (
    <Alert status="error" borderRadius="md">
      <AlertIcon />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export default ErrorMessage; 