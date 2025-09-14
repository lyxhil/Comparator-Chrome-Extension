// Background service worker for the Tour Comparison Tool

chrome.runtime.onInstalled.addListener(() => {
  console.log('Tour Comparison Tool installed');
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'addTour') {
    // Store tour data
    chrome.storage.local.get(['tours'], (result) => {
      const tours = result.tours || [];
      const newTour = {
        ...message.tourData,
        id: Date.now() + Math.random(), // Simple ID generation
        addedAt: new Date().toISOString()
      };
      
      tours.push(newTour);
      chrome.storage.local.set({ tours }, () => {
        sendResponse({ success: true, tourCount: tours.length });
      });
    });
    return true; // Keep message channel open for async response
  }
  
  if (message.action === 'getTours') {
    chrome.storage.local.get(['tours'], (result) => {
      sendResponse({ tours: result.tours || [] });
    });
    return true;
  }
  
  if (message.action === 'deleteTour') {
    chrome.storage.local.get(['tours'], (result) => {
      const tours = result.tours || [];
      const filteredTours = tours.filter(tour => tour.id.toString() !== message.tourId.toString());
      chrome.storage.local.set({ tours: filteredTours }, () => {
        sendResponse({ success: true, tourCount: filteredTours.length });
      });
    });
    return true;
  }
  
  if (message.action === 'clearAllTours') {
    chrome.storage.local.set({ tours: [] }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});