// Popup script for Tour Comparison Tool

document.addEventListener('DOMContentLoaded', function() {
  loadTourCount();
  
  // Event listeners
  document.getElementById('view-comparison').addEventListener('click', viewComparison);
  document.getElementById('export-data').addEventListener('click', exportData);
  document.getElementById('clear-data').addEventListener('click', clearData);
});

// Load and display tour count
function loadTourCount() {
  chrome.runtime.sendMessage({ action: 'getTours' }, (response) => {
    if (response && response.tours) {
      document.getElementById('tour-count').textContent = response.tours.length;
    }
  });
}

// View comparison table (focus on current tab if it's a supported site)
function viewComparison() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const supportedSites = ['getyourguide.com', 'viator.com'];
    const isSupported = supportedSites.some(site => currentTab.url.includes(site));
    
    if (isSupported) {
      // If current tab is supported, just close popup to show sidebar
      window.close();
    } else {
      // Open a supported site
      chrome.tabs.create({ url: 'https://www.getyourguide.com' });
      window.close();
    }
  });
}

// Export data to CSV
function exportData() {
  chrome.runtime.sendMessage({ action: 'getTours' }, (response) => {
    if (response && response.tours && response.tours.length > 0) {
      const tours = response.tours;
      
      // Create CSV content
      const headers = ['Source', 'Title', 'Price', 'Duration', 'Rating', 'Reviews', 'Highlights', 'Included', 'Excluded', 'URL'];
      const rows = tours.map(tour => [
        tour.source || '',
        `"${(tour.title || '').replace(/"/g, '""')}"`,
        tour.price || '',
        tour.duration || '',
        tour.rating || '',
        tour.reviewCount || '',
        `"${(tour.highlights || []).join('; ').replace(/"/g, '""')}"`,
        `"${(tour.included || []).join('; ').replace(/"/g, '""')}"`,
        `"${(tour.excluded || []).join('; ').replace(/"/g, '""')}"`,
        tour.url || ''
      ]);
      
      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      
      // Create and download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `tour-comparison-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showMessage('CSV exported successfully!');
    } else {
      showMessage('No tours to export');
    }
  });
}

// Clear all data
function clearData() {
  if (confirm('Are you sure you want to clear all saved tours?')) {
    chrome.runtime.sendMessage({ action: 'clearAllTours' }, (response) => {
      if (response && response.success) {
        loadTourCount();
        showMessage('All tours cleared!');
      }
    });
  }
}

// Show temporary message
function showMessage(message) {
  const messageEl = document.createElement('div');
  messageEl.style.cssText = `
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 1000;
  `;
  messageEl.textContent = message;
  document.body.appendChild(messageEl);
  
  setTimeout(() => {
    messageEl.remove();
  }, 2000);
}