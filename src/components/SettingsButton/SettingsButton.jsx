import React from 'react';
import { IconButton } from '@chakra-ui/react';
import { FiSettings } from 'react-icons/fi';

function SettingsButton() {
  const handleClick = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <IconButton
      icon={<FiSettings />}
      variant="ghost"
      onClick={handleClick}
      aria-label="Settings"
    />
  );
}

export default SettingsButton; 