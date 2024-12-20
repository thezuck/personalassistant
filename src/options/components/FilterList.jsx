import React from 'react';
import {
  VStack,
  Input,
  IconButton,
  HStack,
  Button,
  Text,
  FormHelperText,
} from '@chakra-ui/react';
import { FiTrash2, FiPlus } from 'react-icons/fi';

function FilterList({ filters, onChange }) {
  const handleAddFilter = () => {
    onChange([...filters, '']);
  };

  const handleRemoveFilter = (index) => {
    const newFilters = filters.filter((_, i) => i !== index);
    onChange(newFilters);
  };

  const handleFilterChange = (index, value) => {
    const newFilters = [...filters];
    newFilters[index] = value;
    onChange(newFilters);
  };

  return (
    <VStack spacing={3} align="stretch">
      {filters.map((filter, index) => (
        <HStack key={index} spacing={2}>
          <Input
            value={filter}
            onChange={(e) => handleFilterChange(index, e.target.value)}
            placeholder="e.g. Standup|Team Meeting"
          />
          <IconButton
            icon={<FiTrash2 />}
            onClick={() => handleRemoveFilter(index)}
            aria-label="Remove filter"
            variant="ghost"
            colorScheme="red"
          />
        </HStack>
      ))}
      
      <Button
        leftIcon={<FiPlus />}
        variant="ghost"
        size="sm"
        onClick={handleAddFilter}
      >
        Add Filter
      </Button>

      <FormHelperText>
        Leave empty to auto-join all meetings. Each filter is a regular expression pattern.
      </FormHelperText>
    </VStack>
  );
}

export default FilterList; 