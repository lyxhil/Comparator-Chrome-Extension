let sidebar = null;
let toggleButton = null;
let addButton = null;

function createSidebar() {
  if (document.getElementById('tour-comparison-sidebar')) return;

  sidebar = document.createElement('div');
  sidebar.id = 'tour-comparison-sidebar';
  sidebar.className = 'tour-sidebar';

  sidebar.innerHTML = `
    <div class="sidebar-header">
      <h3>Comparison Table</h3>
      <button id="sidebar-close" class="btn-icon">x</button>
    </div>
    <div class="sidebar-content">
      <div class="comparison-table-container">
        <table id="comparison-table">
          <thead></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  `;

  document.body.appendChild(sidebar);

  // Add close handler
  document.getElementById("sidebar-close").onclick = closeSidebar;
}

function openSidebar() {
  if (!sidebar) createSidebar();
  sidebar.classList.add("visible");

  // Hide buttons
  if (toggleButton) toggleButton.style.display = "none";
  if (addButton) addButton.style.display = "none";

  // Refresh data each time sidebar opens
  loadSavedTours();
}


function closeSidebar() {
  if (sidebar) sidebar.classList.remove("visible");

  // Show Comparison Table button again
  if (toggleButton) toggleButton.style.display = "block";

  // Show Add to Compare button only if on tour page
  if (addButton && isIndividualTourPage()) {
    addButton.style.display = "block";
  }
}


// Always create the toggle button, even on search/landing pages
function ensureToggleButton() {
  if (document.getElementById('tour-comparison-toggle')) return;
  toggleButton = document.createElement('button');
  toggleButton.id = 'tour-comparison-toggle';
  toggleButton.innerText = 'Comparison Table';
  toggleButton.className = 'comparison-btn';
  toggleButton.onclick = () => {
    openSidebar();
  };
  document.body.appendChild(toggleButton);
}


// Sidebar controls
function toggleSidebar() {
  if (!sidebar) return;
  sidebar.classList.toggle('visible');
}

function init() {
  createSidebar();
  ensureToggleButton();
  // Only try to add the button if on individual tour page
  if (isIndividualTourPage()) {
    maybeCreateAddButton();
  } else if (addButton) {
    addButton.remove(); addButton = null;
  }
  loadSavedTours();
}

function isIndividualTourPage() {
  const url = window.location.href;
  const hostname = window.location.hostname;

  if (hostname.includes("viator.com")) {
    // Viator: individual tour pages always have "/tours/"
    return url.includes("/tours/");
  }

  if (hostname.includes("getyourguide.com")) {
    // GetYourGuide: individual tour pages always have "?ranking_uuid="
    return url.includes("ranking_uuid=");
  }

  return false;
}


function maybeCreateAddButton() {
  if (!isIndividualTourPage()) {
    if (addButton) { addButton.remove(); addButton = null; }
    return;
  }
  if (addButton) addButton.remove();
  const tourData = extractTourData();

  addButton = document.createElement('button');
  addButton.id = 'add-to-compare';
  addButton.className = 'comparison-btn';
  addButton.innerText = '+ Add to Compare';
  addButton.onclick = () => {
    const data = extractTourData();
    if (data.title) addTourToComparison(data);
  };
  addButton.style.position = 'fixed';
  addButton.style.bottom = '90px'; // Above toggle
  addButton.style.right = '20px';
  addButton.style.zIndex = '100002';
  document.body.appendChild(addButton);
}


// Add comparison button to the page
function addComparisonButton() {
  // Remove existing button if present
  const existingButton = document.getElementById('add-to-compare');
  if (existingButton) existingButton.remove();
  
  const tourData = extractTourData();
  if (!tourData.title) return; // No valid tour data found
  
  addButton = document.createElement('button');
  addButton.id = 'add-to-compare';
  addButton.className = 'comparison-btn';
  addButton.innerHTML = '+ Add to Compare';
  
  addButton.addEventListener('click', () => {
    const data = extractTourData();
    if (data.title) {
      addTourToComparison(data);
    }
  });
  
  // Position the button
  addButton.style.position = 'fixed';
  addButton.style.bottom = '40px';
  addButton.style.right = '20px';
  addButton.style.zIndex = '10000';
  
  document.body.appendChild(addButton);
}

// Extract tour data based on the current site
function extractTourData() {
  const hostname = window.location.hostname;
  
  if (hostname.includes('getyourguide.com')) {
    return extractGetYourGuideData();
  } else if (hostname.includes('viator.com')) {
    return extractViatorData();
  }
  
  return {};
}

// Extract data from GetYourGuide
function extractGetYourGuideData() {
  const data = {
    source: 'GetYourGuide',
    url: window.location.href,
    title: '',
    price: '',
    duration: '',
    rating: '',
    reviewCount: '',
    highlights: [],
    included: [],
    excluded: [],
    meetingPoint: '',
    cancellation: ''
  };
  
  // Title
  const titleEl = document.querySelector('h1[data-test-id="activity-header-title"], h1');
  if (titleEl) data.title = titleEl.textContent.trim();
  
  // Price
  const priceEl = document.querySelector('[data-test-id="price-lead"], .price, [class*="price"]');
  if (priceEl) {
    const priceText = priceEl.textContent.trim();
    const match = priceText.match(/\d+[\.,]?\d*/);
    if (match) {
        data.price = match[0];
    }
  }
  
  // Duration
  const allSpans = document.querySelectorAll('span');
  for (const span of allSpans) {
    const text = span.textContent.trim();
    if ((text.includes('day') || text.includes('hour') || text.includes('minute')) && text.length < 50) {
      if (text.startsWith('Duration ')) {
        data.duration = text.replace('Duration ', '').trim();
      } else {
        data.duration = text;
      }
      break;
    }
  }

  // Rating score
  const ratingEl = document.querySelector('[data-test-id="rating"], .rating, [class*="rating"]');
  if (ratingEl) {
    const ratingText = ratingEl.textContent.trim();
    const ratingMatch = ratingText.match(/\d\.\d/);
    if (ratingMatch) {
      data.rating = ratingMatch[0];
    }
  }
  
  // Review count
  let reviewText = '';
  const reviewDescEl = document.querySelector(
    'p.reviews-summary__rating-description.js-rating-description'
  );
  if (reviewDescEl) {
    reviewText = reviewDescEl.textContent.trim();
    const match = reviewText.match(/based on\s+([\d,\.]+)\s+reviews?/i);
    if (match) {
      data.reviewCount = match[1].replace(/,/g, ''); // clean commas, e.g. "1,234" -> "1234"
    }
  }

  // Included items
  const includedEls = document.querySelectorAll(
    'li.activity-inclusions__item--inclusion .activity-inclusions__test--include'
  );
  data.included = Array.from(includedEls).map(el => el.textContent.trim());
  // console.log("DEBUG - Extracted Included items:", data.included);

  // Excluded items
  const excludedEls = document.querySelectorAll(
    'li.activity-inclusions__item--exclusion .activity-inclusions__test--exclude'
  );
  data.excluded = Array.from(excludedEls).map(el => el.textContent.trim());
  // console.log("DEBUG - Extracted Included items:", data.included);

  // Highlights
  const highlightEls = document.querySelectorAll('[data-test-id*="highlight"], .highlight li, [class*="highlight"] li');
  data.highlights = Array.from(highlightEls).map(el => el.textContent.trim()).slice(0, 3);
  
  return data;
}

// Extract data from Viator
function extractViatorData() {
  
  const data = {
    source: 'Viator',
    url: window.location.href,
    title: '',
    price: '',
    duration: '',
    rating: '',
    reviewCount: '',
    highlights: [],
    included: [],
    excluded: [],
    meetingPoint: '',
    cancellation: ''
  };
  
  // Title
  const titleEl = document.querySelector('h1[data-test="product-title"], h1');
  if (titleEl) data.title = titleEl.textContent.trim();
  
  // Price
  const priceEl = document.querySelector('[data-test*="price"], .price, [class*="price"]');
  if (priceEl) data.price = priceEl.textContent.trim();
  
  // Duration
  const allSpans = document.querySelectorAll('span');
  for (const span of allSpans) {
    const text = span.textContent.trim();
    if ((text.includes('hour') || text.includes('minute')) && text.length < 50) {
      data.duration = text;
      break; 
    }
  }

  // Rating
  try {
    const ratingWrapper = document.querySelector('.averageRatingWrapper');
    if (ratingWrapper) {
      const ratingText = ratingWrapper.textContent.trim();
      // Use a regular expression to find the number in the text
      const match = ratingText.match(/(\d+(\.\d+)?)/);
      if (match) {
        data.rating = match[0];
      }
    }
  } catch (error) {
    console.error("Failed to get rating:", error);
  }

  // Review count
  const reviewEl = document.querySelector('[data-test*="review"], [class*="review"]');
  if (reviewEl) data.reviewCount = reviewEl.textContent.trim();
  
  // Included items
  const includedEls = document.querySelectorAll(
    'li.activity-inclusions__item--inclusion .activity-inclusions__test--include'
  );
  data.included = Array.from(includedEls).map(el => el.textContent.trim());
  console.error("DEBUG - Extracted Included items:", data.included);

  // Excluded items
  const excludedEls = document.querySelectorAll(
    'li.activity-inclusions__item--exclusion .activity-inclusions__test--exclude'
  );
  data.excluded = Array.from(excludedEls).map(el => el.textContent.trim());
  console.error("DEBUG - Extracted Included items:", data.included);

  // Highlights
  const highlightEls = document.querySelectorAll('[data-test*="highlight"] li, .highlights li, [class*="highlight"] li');
  data.highlights = Array.from(highlightEls).map(el => el.textContent.trim()).slice(0, 3);
  
  return data;
}

// Add tour to comparison
function addTourToComparison(tourData) {
  chrome.runtime.sendMessage({
    action: 'addTour',
    tourData: tourData
  }, (response) => {
    if (response && response.success) {
      showNotification(`Tour added! (${response.tourCount} total)`);
      loadSavedTours();
    }
  });
}

// Load saved tours and update UI
function loadSavedTours() {
  chrome.runtime.sendMessage({ action: 'getTours' }, (response) => {
    if (response && response.tours) {
      updateComparisonTable(response.tours);
    }
  });
}

// Update comparison table
function updateComparisonTable(tours) {
  const table = document.getElementById('comparison-table');
  if (!table) return;

  if (!tours || tours.length === 0) {
    table.style.display = 'none';
    return;
  }

  table.style.display = 'table';

  // Always clear table before repopulating
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  thead.innerHTML = '';
  tbody.innerHTML = '';

  // Header row with delete buttons
  thead.innerHTML = `
  <tr>
    <th class="feature-label">Tour Name</th>
    ${tours.map(tour => `
      <th>
        <a href="${tour.url}" target="_blank" class="tour-title-link">${tour.title || 'N/A'}</a>
        <button class="delete-tour" data-tour-id="${tour.id}" aria-label="Delete tour">×</button>
      </th>
    `
      )
      .join('')}
  </tr>
`;

  // Table body rows
  const rows = [
    { label: 'Source', key: 'source' },
    { label: 'Price', key: 'price' },
    { label: 'Duration', key: 'duration' },
    { label: 'Rating', key: 'rating' },
    { label: 'Reviews', key: 'reviewCount' },
    { label: 'Included', key: 'included', isArray: true },
    { label: 'Excluded', key: 'excluded', isArray: true },
    { label: 'Highlights', key: 'highlights', isArray: true }
  ];

  tbody.innerHTML = rows
    .map(
      (row) => `
    <tr>
      <td class="feature-label">${row.label}</td>
      ${tours
        .map((tour) => {
          let value = tour[row.key];
          if (row.isArray && Array.isArray(value)) {
            value = value.join(', ') || 'N/A';
          } 
          return `<td>${value || 'N/A'}</td>`;
        })
        .join('')}
    </tr>
  `
    )
    .join('');

  // Attach delete handlers for each header button
  thead.querySelectorAll('.delete-tour').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tourId = btn.getAttribute('data-tour-id');
      deleteTour(tourId);
    });
  });
}

function deleteTour(tourId) {
  chrome.runtime.sendMessage(
    { action: 'deleteTour', tourId: tourId },
    (response) => {
      if (response && response.success) {
        // After deletion, always fetch the updated list
        chrome.runtime.sendMessage({ action: 'getTours' }, (res) => {
          if (res && res.tours) {
            updateComparisonTable(res.tours);
          }
        });

        showNotification('Tour removed');
      }
    }
  );
}


// Clear all tours
function clearAllTours() {
  if (confirm('Clear all saved tours?')) {
    chrome.runtime.sendMessage({ action: 'clearAllTours' }, (response) => {
      if (response && response.success) {
        loadSavedTours();
        showNotification('All tours cleared');
      }
    });
  }
}

// Export to CSV
function exportToCSV() {
  chrome.runtime.sendMessage({ action: 'getTours' }, (response) => {
    if (response && response.tours && response.tours.length > 0) {
      const tours = response.tours;
      
      // Create CSV content
      const headers = ['Source', 'Title', 'Price', 'Duration', 'Rating', 'Reviews', 'Highlights', 'Included', 'Excluded'];
      const rows = tours.map(tour => [
        tour.source,
        `"${tour.title}"`,
        tour.price,
        tour.duration,
        tour.rating,
        tour.reviewCount,
        `"${tour.included.join('; ')}"`,
        `"${tour.excluded.join('; ')}"`,
        `"${tour.highlights.join('; ')}"`,
      ]);
      
      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      
      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tour-comparison-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      showNotification('CSV exported successfully');
    } else {
      showNotification('No tours to export');
    }
  });
}

// Show notification
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'tour-notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Make deleteTour available globally
window.deleteTour = deleteTour;

init();

// Re-initialize on navigation (for SPAs)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(() => {
      // Always add comparison table button
      addComparisonTableButton();
      
      // Only add "Add to Compare" button on individual tour pages
      if (isIndividualTourPage()) {
        addComparisonButton();
      } else {
        // Remove add button if it exists and we're not on a tour page
        const existingAddButton = document.getElementById('add-to-compare');
        if (existingAddButton) existingAddButton.remove();
      }
    }, 1000);
  }
}).observe(document, { subtree: true, childList: true });