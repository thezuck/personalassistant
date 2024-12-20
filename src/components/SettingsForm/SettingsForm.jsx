import React, { useState, useEffect } from 'react';
import { 
  VStack, 
  FormControl, 
  FormLabel, 
  Switch, 
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Tooltip,
  Icon,
  HStack,
  Input,
  Button,
  Text,
  List,
  ListItem,
  IconButton,
} from '@chakra-ui/react';
import { FiInfo, FiX } from 'react-icons/fi';

function SettingsForm({ onSettingsChange, onSave }) {
  const [settings, setSettings] = useState({
    enableZoom: true,
    enableMeet: true,
    autoOpenMinutes: 1,
    meetingFilters: [],
  });
  const [originalSettings, setOriginalSettings] = useState(null);
  const [newFilter, setNewFilter] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    chrome.storage.sync.get({
      enableZoom: true,
      enableMeet: true,
      autoOpenMinutes: 1,
      meetingFilters: [],
    }, (items) => {
      setSettings(items);
      setOriginalSettings(items);
    });
  }, []);

  useEffect(() => {
    if (originalSettings) {
      const changes = JSON.stringify(settings) !== JSON.stringify(originalSettings);
      setHasChanges(changes);
      onSettingsChange(changes);
      onSave(settings);
    }
  }, [settings, originalSettings, onSettingsChange, onSave]);

  const handleChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
  };

  const addFilter = () => {
    if (newFilter.trim()) {
      const filters = [...settings.meetingFilters, newFilter.trim()];
      handleChange('meetingFilters', filters);
      setNewFilter('');
    }
  };

  const removeFilter = (index) => {
    const filters = settings.meetingFilters.filter((_, i) => i !== index);
    handleChange('meetingFilters', filters);
  };

  const LabelWithTooltip = ({ label, tooltip }) => (
    <HStack spacing={1}>
      <FormLabel mb="0">{label}</FormLabel>
      <Tooltip label={tooltip} placement="top" hasArrow>
        <span>
          <Icon as={FiInfo} color="gray.400" />
        </span>
      </Tooltip>
    </HStack>
  );

  return (
    <VStack spacing={6} align="stretch">
      <FormControl display="flex" alignItems="center" justifyContent="space-between">
        <LabelWithTooltip 
          label="Enable Google Meet" 
          tooltip="Automatically open Google Meet links from calendar events"
        />
        <Switch
          isChecked={settings.enableMeet}
          onChange={(e) => handleChange('enableMeet', e.target.checked)}
        />
      </FormControl>
      
      <FormControl display="flex" alignItems="center" justifyContent="space-between">
        <LabelWithTooltip 
          label="Enable Zoom" 
          tooltip="Automatically open Zoom links from calendar events"
        />
        <Switch
          isChecked={settings.enableZoom}
          onChange={(e) => handleChange('enableZoom', e.target.checked)}
        />
      </FormControl>

      <FormControl>
        <LabelWithTooltip 
          label="Auto-open minutes before meeting" 
          tooltip="Set the default number of minutes before a meeting starts to automatically open the link. You can customize this per meeting using the settings (cog) icon on each meeting."
        />
        <NumberInput
          value={settings.autoOpenMinutes}
          min={0}
          max={60}
          onChange={(value) => handleChange('autoOpenMinutes', parseInt(value))}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>

      <FormControl>
        <LabelWithTooltip 
          label="Meeting Filters" 
          tooltip="Only auto-open meetings whose titles match these filters (supports regex)"
        />
        <HStack mb={2}>
          <Input
            value={newFilter}
            onChange={(e) => setNewFilter(e.target.value)}
            placeholder="Enter filter text or regex"
            onKeyPress={(e) => e.key === 'Enter' && addFilter()}
          />
          <Button onClick={addFilter}>Add</Button>
        </HStack>
        <List spacing={2}>
          {settings.meetingFilters.map((filter, index) => (
            <ListItem key={index} display="flex" alignItems="center">
              <Text flex="1">{filter}</Text>
              <IconButton
                icon={<FiX />}
                size="sm"
                variant="ghost"
                onClick={() => removeFilter(index)}
                aria-label="Remove filter"
              />
            </ListItem>
          ))}
        </List>
      </FormControl>
    </VStack>
  );
}

export default SettingsForm; 