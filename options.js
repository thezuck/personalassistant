// Saves options to chrome.storage
function saveOptions() {
  const enableZoom = document.getElementById('enableZoom').checked;
  const enableMeet = document.getElementById('enableMeet').checked;
  const filters = Array.from(document.querySelectorAll('.filter-input'))
    .map(input => input.value.trim())
    .filter(filter => filter !== '');

  chrome.storage.sync.set({
    enableZoom,
    enableMeet,
    meetingFilters: filters
  }, () => {
    const status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(() => {
      window.close();
    }, 2000);
  });
}

// Creates a new filter input field
function createFilterInput(value = '') {
  const filterDiv = document.createElement('div');
  filterDiv.className = 'filter-row';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'filter-input';
  input.placeholder = 'e.g. Standup|Team Meeting';
  input.value = value;

  const removeButton = document.createElement('button');
  removeButton.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <path d="M4.5 2V1.5C4.5 1.22386 4.72386 1 5 1H9C9.27614 1 9.5 1.22386 9.5 1.5V2H11.5C11.7761 2 12 2.22386 12 2.5C12 2.77614 11.7761 3 11.5 3H2.5C2.22386 3 2 2.77614 2 2.5C2 2.22386 2.22386 2 2.5 2H4.5ZM3 4H11V11.5C11 12.3284 10.3284 13 9.5 13H4.5C3.67157 13 3 12.3284 3 11.5V4Z"/>
    </svg>`;
  removeButton.className = 'delete-button';
  removeButton.title = 'Remove filter';
  removeButton.onclick = () => {
    filterDiv.remove();
  };

  filterDiv.appendChild(input);
  filterDiv.appendChild(removeButton);
  return filterDiv;
}

// Restores options from chrome.storage
function restoreOptions() {
  chrome.storage.sync.get({
    enableZoom: true,
    enableMeet: true,
    meetingFilters: []
  }, (items) => {
    document.getElementById('enableZoom').checked = items.enableZoom;
    document.getElementById('enableMeet').checked = items.enableMeet;
    
    const filtersContainer = document.getElementById('filters-container');
    filtersContainer.innerHTML = '';
    
    if (items.meetingFilters.length === 0) {
      filtersContainer.appendChild(createFilterInput());
    } else {
      items.meetingFilters.forEach(filter => {
        filtersContainer.appendChild(createFilterInput(filter));
      });
    }
  });
}

// Cancel and close the options page
function cancelOptions() {
  window.close();
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
document.getElementById('cancel').addEventListener('click', cancelOptions);
document.getElementById('add-filter').addEventListener('click', () => {
  const filtersContainer = document.getElementById('filters-container');
  filtersContainer.appendChild(createFilterInput());
});
  