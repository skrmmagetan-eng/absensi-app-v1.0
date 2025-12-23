/**
 * Searchable Dropdown Utility
 * Converts a regular select element into a searchable dropdown
 */

export function createSearchableDropdown(elementId, data, options = {}) {
  const {
    placeholder = '-- Pilih --',
    searchPlaceholder = '🔍 Cari...',
    displayField = (item) => item.name || item.toString(),
    searchFields = ['name'],
    valueField = 'id',
    onSelect = null
  } = options;

  const originalSelect = document.getElementById(elementId);
  if (!originalSelect) {
    console.error(`Element with id "${elementId}" not found`);
    return;
  }

  // Create wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'searchable-dropdown';
  wrapper.innerHTML = `
    <div class="searchable-dropdown-input" tabindex="0">
      <span class="searchable-dropdown-text">${placeholder}</span>
      <span class="searchable-dropdown-arrow">▼</span>
    </div>
    <div class="searchable-dropdown-menu">
      <div class="searchable-dropdown-search">
        <input type="text" class="form-input" placeholder="${searchPlaceholder}">
      </div>
      <div class="searchable-dropdown-options">
        <!-- Options will be populated here -->
      </div>
    </div>
  `;

  // Replace original select
  originalSelect.parentNode.insertBefore(wrapper, originalSelect);
  originalSelect.style.display = 'none';

  // Get elements
  const input = wrapper.querySelector('.searchable-dropdown-input');
  const text = wrapper.querySelector('.searchable-dropdown-text');
  const arrow = wrapper.querySelector('.searchable-dropdown-arrow');
  const menu = wrapper.querySelector('.searchable-dropdown-menu');
  const searchInput = wrapper.querySelector('.searchable-dropdown-search input');
  const optionsContainer = wrapper.querySelector('.searchable-dropdown-options');

  let isOpen = false;
  let selectedValue = '';
  let filteredData = [...data];
  let highlightedIndex = -1;

  // Render options
  function renderOptions(items = filteredData) {
    if (items.length === 0) {
      optionsContainer.innerHTML = `
        <div class="searchable-dropdown-no-results">
          <span>🔍</span> Tidak ada hasil ditemukan
        </div>
      `;
      return;
    }

    optionsContainer.innerHTML = items.map((item, index) => `
      <div class="searchable-dropdown-option ${index === highlightedIndex ? 'highlighted' : ''}" data-value="${item[valueField]}" data-index="${index}">
        ${displayField(item)}
      </div>
    `).join('');

    // Add click handlers to options
    optionsContainer.querySelectorAll('.searchable-dropdown-option').forEach(option => {
      option.addEventListener('click', () => {
        selectOption(option.dataset.value, option.textContent.trim());
      });
    });
  }

  // Select option
  function selectOption(value, displayText) {
    selectedValue = value;
    text.textContent = displayText;
    text.classList.remove('placeholder');
    originalSelect.value = value;
    
    // Trigger change event on original select
    originalSelect.dispatchEvent(new Event('change', { bubbles: true }));
    
    closeDropdown();
    
    if (onSelect) {
      const selectedItem = data.find(item => item[valueField] === value);
      onSelect(selectedItem);
    }
  }

  // Open dropdown
  function openDropdown() {
    isOpen = true;
    menu.style.display = 'block';
    arrow.textContent = '▲';
    wrapper.classList.add('open');
    searchInput.focus();
    highlightedIndex = -1;
    renderOptions();
  }

  // Close dropdown
  function closeDropdown() {
    isOpen = false;
    menu.style.display = 'none';
    arrow.textContent = '▼';
    wrapper.classList.remove('open');
    searchInput.value = '';
    filteredData = [...data];
    highlightedIndex = -1;
  }

  // Filter options
  function filterOptions(query) {
    if (!query.trim()) {
      filteredData = [...data];
    } else {
      const lowerQuery = query.toLowerCase();
      filteredData = data.filter(item => {
        return searchFields.some(field => {
          const value = item[field];
          return value && value.toString().toLowerCase().includes(lowerQuery);
        });
      });
    }
    highlightedIndex = -1;
    renderOptions(filteredData);
  }

  // Navigate with keyboard
  function navigateOptions(direction) {
    if (filteredData.length === 0) return;
    
    if (direction === 'down') {
      highlightedIndex = Math.min(highlightedIndex + 1, filteredData.length - 1);
    } else if (direction === 'up') {
      highlightedIndex = Math.max(highlightedIndex - 1, -1);
    }
    
    renderOptions(filteredData);
    
    // Scroll highlighted option into view
    const highlightedOption = optionsContainer.querySelector('.highlighted');
    if (highlightedOption) {
      highlightedOption.scrollIntoView({ block: 'nearest' });
    }
  }

  // Select highlighted option
  function selectHighlighted() {
    if (highlightedIndex >= 0 && highlightedIndex < filteredData.length) {
      const item = filteredData[highlightedIndex];
      selectOption(item[valueField], displayField(item));
    }
  }

  // Event listeners
  input.addEventListener('click', () => {
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  });

  searchInput.addEventListener('input', (e) => {
    filterOptions(e.target.value);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDropdown();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      navigateOptions('down');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      navigateOptions('up');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectHighlighted();
    }
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      closeDropdown();
    }
  });

  // Initialize
  renderOptions();
  
  // Set placeholder style
  text.classList.add('placeholder');

  return {
    setValue: (value) => {
      const item = data.find(item => item[valueField] === value);
      if (item) {
        selectOption(value, displayField(item));
      }
    },
    getValue: () => selectedValue,
    updateData: (newData) => {
      data = newData;
      filteredData = [...newData];
      renderOptions();
    }
  };
}