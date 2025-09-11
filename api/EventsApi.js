import { 
  API_ENDPOINTS, 
  REQUEST_CONFIG, 
  ERROR_MESSAGES,
  getApiBaseUrl,
  getCommonHeaders 
} from '../config/apiConfig';
import authApi from './AuthApi';

class EventsApiService {
  constructor() {
    this.baseUrl = getApiBaseUrl('events');
  }

  // Generic API request method with authentication
  async makeRequest(url, options = {}) {
    const maxRetries = REQUEST_CONFIG.RETRY_ATTEMPTS;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        // Ensure we have a valid access token
        const accessToken = authApi.getAccessToken();
        if (!accessToken && !options.skipAuth) {
          throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
        }

        const config = {
          headers: getCommonHeaders(!options.skipAuth, accessToken),
          ...options,
        };

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_CONFIG.TIMEOUT);
        config.signal = controller.signal;

        const response = await fetch(url, config);
        clearTimeout(timeoutId);

        const data = await response.json();

        // Handle token expiration
        if (response.status === 401 && !options.skipRefresh) {
          const refreshed = await authApi.refreshAccessToken();
          if (refreshed) {
            // Retry the original request with new token
            return this.makeRequest(url, { ...options, skipRefresh: true });
          } else {
            // Refresh failed, clear tokens and throw error
            await authApi.clearTokens();
            throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
          }
        }

        if (!response.ok) {
          const errorMessage = this.getErrorMessage(response.status, data.message);
          throw new Error(errorMessage);
        }

        return data;
      } catch (error) {
        attempt++;
        
        if (error.name === 'AbortError') {
          throw new Error(ERROR_MESSAGES.TIMEOUT_ERROR);
        }
        
        if (attempt >= maxRetries) {
          console.error('Events API Request Error:', error);
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, REQUEST_CONFIG.RETRY_DELAY));
      }
    }
  }

  // Get appropriate error message based on status code
  getErrorMessage(status, apiMessage) {
    switch (status) {
      case 400:
        return apiMessage || 'Invalid request data. Please check your inputs.';
      case 401:
        return ERROR_MESSAGES.UNAUTHORIZED;
      case 404:
        return 'Event not found.';
      case 403:
        return 'You do not have permission to access this event.';
      case 409:
        return 'You are already registered for this event.';
      case 410:
        return 'This event is no longer available.';
      case 429:
        return 'Too many requests. Please wait and try again.';
      case 500:
      case 502:
      case 503:
        return ERROR_MESSAGES.SERVER_ERROR;
      default:
        return apiMessage || ERROR_MESSAGES.GENERIC_ERROR;
    }
  }

  // Get all public events
  async getAllEvents(page = 1, limit = 10, filters = {}) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      // Check for bypass mode
      if (userId === 'bypass_user_1234567890') {
        console.log('Using bypass mode for events');
        
        const mockEvents = [
          {
            id: 'event_1',
            title: 'Science Workshop 2024',
            description: 'Join us for an exciting workshop on modern scientific discoveries and innovations.',
            category: 'Workshop',
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
            location: 'Virtual Event',
            maxCapacity: 100,
            registeredCount: 25,
            fee: 0,
            currency: 'INR',
            status: 'OPEN',
            organizer: {
              id: 'organizer_1',
              name: 'SciAstra Team',
              profilePic: null,
            },
            coverImage: null,
            tags: ['Science', 'Education', 'Workshop'],
            createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          },
          {
            id: 'event_2',
            title: 'Tech Conference 2024',
            description: 'Explore the latest trends in technology and connect with industry experts.',
            category: 'Conference',
            date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
            location: 'Bangalore, India',
            maxCapacity: 500,
            registeredCount: 150,
            fee: 2000,
            currency: 'INR',
            status: 'OPEN',
            organizer: {
              id: 'organizer_2',
              name: 'Tech Community',
              profilePic: null,
            },
            coverImage: null,
            tags: ['Technology', 'Conference', 'Networking'],
            createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          }
        ];

        return {
          success: true,
          data: {
            events: mockEvents,
            pagination: {
              page: page,
              limit: limit,
              total: mockEvents.length,
              hasMore: false,
            }
          }
        };
      }

      let url = `${this.baseUrl}${API_ENDPOINTS.EVENTS.GET_ALL}?page=${page}&limit=${limit}`;
      
      // Add filters to URL
      if (filters.category) {
        url += `&category=${encodeURIComponent(filters.category)}`;
      }
      if (filters.location) {
        url += `&location=${encodeURIComponent(filters.location)}`;
      }
      if (filters.startDate) {
        url += `&startDate=${filters.startDate}`;
      }
      if (filters.endDate) {
        url += `&endDate=${filters.endDate}`;
      }
      if (filters.freeOnly) {
        url += `&freeOnly=true`;
      }

      const response = await this.makeRequest(url, {
        method: 'GET',
      });

      if (response.success) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        throw new Error(response.message || 'Failed to load events');
      }
    } catch (error) {
      console.error('Get All Events Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load events. Please try again.',
      };
    }
  }

  // Get event by ID
  async getEventById(eventId) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      if (!eventId) {
        throw new Error('Event ID is required');
      }

      // Check for bypass mode
      if (userId === 'bypass_user_1234567890') {
        console.log('Using bypass mode for event details');
        
        const mockEvent = {
          id: eventId,
          title: 'Detailed Science Workshop 2024',
          description: 'This is a comprehensive workshop covering various aspects of modern scientific research and discoveries. Participants will learn about cutting-edge technologies and methodologies used in scientific research.',
          category: 'Workshop',
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          location: 'Virtual Event',
          maxCapacity: 100,
          registeredCount: 25,
          fee: 0,
          currency: 'INR',
          status: 'OPEN',
          organizer: {
            id: 'organizer_1',
            name: 'SciAstra Team',
            profilePic: null,
            email: 'events@sciastra.com',
            phone: '+91-9876543210'
          },
          coverImage: null,
          tags: ['Science', 'Education', 'Workshop'],
          agenda: [
            {
              time: '10:00 AM',
              topic: 'Introduction to Modern Science',
              speaker: 'Dr. Jane Smith'
            },
            {
              time: '11:30 AM',
              topic: 'Research Methodologies',
              speaker: 'Prof. John Doe'
            }
          ],
          requirements: [
            'Basic understanding of scientific concepts',
            'Laptop/Computer for virtual participation',
            'Stable internet connection'
          ],
          benefits: [
            'Certificate of completion',
            'Access to exclusive resources',
            'Networking opportunities'
          ],
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 86400000).toISOString(),
        };

        return {
          success: true,
          data: mockEvent,
        };
      }

      const response = await this.makeRequest(`${this.baseUrl}${API_ENDPOINTS.EVENTS.GET_BY_ID}/${eventId}`, {
        method: 'GET',
      });

      if (response.success) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        throw new Error(response.message || 'Event not found');
      }
    } catch (error) {
      console.error('Get Event By ID Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load event details. Please try again.',
      };
    }
  }

  // Register for an event
  async registerForEvent(eventId, registrationData = {}) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      if (!eventId) {
        throw new Error('Event ID is required');
      }

      // Check for bypass mode
      if (userId === 'bypass_user_1234567890') {
        console.log('Using bypass mode for event registration');
        
        const mockRegistration = {
          id: `registration_${eventId}_${Date.now()}`,
          eventId: eventId,
          userId: userId,
          registrationData: registrationData,
          status: 'CONFIRMED',
          paymentStatus: registrationData.paymentRequired ? 'PENDING' : 'NOT_REQUIRED',
          registeredAt: new Date().toISOString(),
        };

        return {
          success: true,
          message: 'Successfully registered for the event (demo mode)',
          data: mockRegistration,
        };
      }

      const payload = {
        eventId: eventId,
        ...registrationData,
      };

      const response = await this.makeRequest(`${this.baseUrl}${API_ENDPOINTS.EVENTS.REGISTER}/${eventId}/register`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response.success) {
        return {
          success: true,
          message: response.message || 'Successfully registered for the event',
          data: response.data,
        };
      } else {
        throw new Error(response.message || 'Failed to register for event');
      }
    } catch (error) {
      console.error('Register For Event Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to register for event. Please try again.',
      };
    }
  }

  // Cancel event registration
  async cancelRegistration(eventId, cancellationReason = '') {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      if (!eventId) {
        throw new Error('Event ID is required');
      }

      // Check for bypass mode
      if (userId === 'bypass_user_1234567890') {
        console.log('Using bypass mode for event registration cancellation');
        
        return {
          success: true,
          message: 'Event registration cancelled successfully (demo mode)',
        };
      }

      const payload = {
        cancellationReason: cancellationReason,
      };

      const response = await this.makeRequest(`${this.baseUrl}${API_ENDPOINTS.EVENTS.CANCEL_REGISTRATION}/${eventId}/cancel`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response.success) {
        return {
          success: true,
          message: response.message || 'Event registration cancelled successfully',
        };
      } else {
        throw new Error(response.message || 'Failed to cancel registration');
      }
    } catch (error) {
      console.error('Cancel Registration Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to cancel registration. Please try again.',
      };
    }
  }

  // Get user's registered events
  async getRegisteredEvents(page = 1, limit = 10, status = 'all') {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      // Check for bypass mode
      if (userId === 'bypass_user_1234567890') {
        console.log('Using bypass mode for registered events');
        
        const mockRegisteredEvents = [
          {
            registration: {
              id: 'reg_1',
              status: 'CONFIRMED',
              paymentStatus: 'NOT_REQUIRED',
              registeredAt: new Date(Date.now() - 86400000).toISOString(),
            },
            event: {
              id: 'event_1',
              title: 'Science Workshop 2024',
              description: 'Join us for an exciting workshop on modern scientific discoveries.',
              category: 'Workshop',
              date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              location: 'Virtual Event',
              fee: 0,
              currency: 'INR',
              status: 'OPEN',
              coverImage: null,
            }
          }
        ];

        return {
          success: true,
          data: {
            registrations: mockRegisteredEvents,
            pagination: {
              page: page,
              limit: limit,
              total: mockRegisteredEvents.length,
              hasMore: false,
            }
          }
        };
      }

      let url = `${this.baseUrl}${API_ENDPOINTS.EVENTS.GET_REGISTERED}?page=${page}&limit=${limit}`;
      if (status !== 'all') {
        url += `&status=${status}`;
      }

      const response = await this.makeRequest(url, {
        method: 'GET',
      });

      if (response.success) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        throw new Error(response.message || 'Failed to load registered events');
      }
    } catch (error) {
      console.error('Get Registered Events Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load registered events. Please try again.',
      };
    }
  }

  // Get registration status for a specific event
  async getRegistrationStatus(eventId) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      if (!eventId) {
        throw new Error('Event ID is required');
      }

      // Check for bypass mode
      if (userId === 'bypass_user_1234567890') {
        console.log('Using bypass mode for registration status');
        
        const mockStatus = {
          isRegistered: false,
          registrationId: null,
          status: null,
          paymentStatus: null,
          canRegister: true,
          canCancel: false,
        };

        return {
          success: true,
          data: mockStatus,
        };
      }

      const response = await this.makeRequest(`${this.baseUrl}${API_ENDPOINTS.EVENTS.GET_REGISTRATION_STATUS}/${eventId}/status`, {
        method: 'GET',
      });

      if (response.success) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        throw new Error(response.message || 'Failed to get registration status');
      }
    } catch (error) {
      console.error('Get Registration Status Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get registration status. Please try again.',
      };
    }
  }

  // Search events
  async searchEvents(query, filters = {}, page = 1, limit = 10) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      if (!query || query.trim().length < 2) {
        return {
          success: false,
          message: 'Search query must be at least 2 characters long',
        };
      }

      // Check for bypass mode
      if (userId === 'bypass_user_1234567890') {
        console.log('Using bypass mode for event search');
        
        const mockSearchResults = [
          {
            id: 'search_event_1',
            title: `Event matching "${query}"`,
            description: 'This is a search result for your query.',
            category: 'Workshop',
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            location: 'Search Location',
            fee: 0,
            currency: 'INR',
            status: 'OPEN',
            coverImage: null,
            tags: ['Search', 'Demo'],
          }
        ];

        return {
          success: true,
          data: {
            events: mockSearchResults,
            pagination: {
              page: page,
              limit: limit,
              total: mockSearchResults.length,
              hasMore: false,
            }
          }
        };
      }

      let url = `${this.baseUrl}${API_ENDPOINTS.EVENTS.SEARCH}?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`;
      
      // Add filters
      if (filters.category) {
        url += `&category=${encodeURIComponent(filters.category)}`;
      }
      if (filters.location) {
        url += `&location=${encodeURIComponent(filters.location)}`;
      }
      if (filters.startDate) {
        url += `&startDate=${filters.startDate}`;
      }
      if (filters.endDate) {
        url += `&endDate=${filters.endDate}`;
      }
      if (filters.freeOnly) {
        url += `&freeOnly=true`;
      }

      const response = await this.makeRequest(url, {
        method: 'GET',
      });

      if (response.success) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        throw new Error(response.message || 'Search failed');
      }
    } catch (error) {
      console.error('Search Events Error:', error);
      return {
        success: false,
        message: error.message || 'Search failed. Please try again.',
      };
    }
  }

  // Validate event registration data
  validateRegistrationData(registrationData, eventRequirements = []) {
    const errors = [];

    if (registrationData.name && registrationData.name.length > 100) {
      errors.push('Name must be less than 100 characters');
    }

    if (registrationData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registrationData.email)) {
      errors.push('Please enter a valid email address');
    }

    if (registrationData.phone && !/^[+]?[\d\s-()]{10,15}$/.test(registrationData.phone)) {
      errors.push('Please enter a valid phone number');
    }

    // Check custom requirements
    eventRequirements.forEach(requirement => {
      if (requirement.required && !registrationData[requirement.field]) {
        errors.push(`${requirement.label} is required`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Format event date for display
  formatEventDate(dateString, includeTime = true) {
    try {
      const date = new Date(dateString);
      const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      };

      if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
        options.hour12 = true;
      }

      return date.toLocaleDateString('en-IN', options);
    } catch (error) {
      console.error('Date formatting error:', error);
      return dateString;
    }
  }

  // Check if event registration is still open
  isRegistrationOpen(event) {
    const now = new Date();
    const eventDate = new Date(event.date);
    const registrationDeadline = event.registrationDeadline ? 
      new Date(event.registrationDeadline) : 
      new Date(eventDate.getTime() - 24 * 60 * 60 * 1000); // 1 day before event

    return (
      event.status === 'OPEN' &&
      now < registrationDeadline &&
      event.registeredCount < event.maxCapacity
    );
  }
}

// Create and export singleton instance
const eventsApi = new EventsApiService();

export default eventsApi;