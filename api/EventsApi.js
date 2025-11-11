import { 
  API_ENDPOINTS, 
  REQUEST_CONFIG, 
  ERROR_MESSAGES,
  getApiBaseUrl,
  getCommonHeaders 
} from '../config/apiConfig';
import authApi from './AuthApi';
import apiLogger from '../services/ApiLogger';

class EventsApiService {
  constructor() {
    this.baseUrl = getApiBaseUrl('events');
  }

  // Generic API request method with authentication
  async makeRequest(url, options = {}) {
    const maxRetries = REQUEST_CONFIG.RETRY_ATTEMPTS;
    let attempt = 0;
    
    // Ensure the URL is absolute by prepending the base URL if needed
    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;

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

        const method = (config.method || 'GET').toUpperCase();
        apiLogger.logApiCall(fullUrl, method);

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_CONFIG.TIMEOUT);
        config.signal = controller.signal;

        console.log('Making request to:', fullUrl);
        const response = await fetch(fullUrl, config);
        clearTimeout(timeoutId);

        const data = await response.json();

        apiLogger.logApiResponse(
          fullUrl,
          method,
          response.status,
          data,
          response.ok ? null : data?.message || 'Request failed'
        );

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
  async getAllEvents(page = 1, limit = 20, filters = {}) {
    try {
      console.log('EventsApi: Getting all events with filters:', filters);
      
      let url = `${this.baseUrl}${API_ENDPOINTS.EVENTS.GET_ALL}?page=${page}&limit=${limit}`;
      
      // Add filters to URL based on Postman collection
      if (filters.status) {
        url += `&status=${encodeURIComponent(filters.status)}`;
      }
      if (filters.category) {
        url += `&category=${encodeURIComponent(filters.category)}`;
      }
      if (filters.search) {
        url += `&search=${encodeURIComponent(filters.search)}`;
      }

      console.log('EventsApi: Making request to:', url);

      const response = await this.makeRequest(url, {
        method: 'GET',
        skipAuth: true, // Public endpoint
      });

      console.log('EventsApi: Response received:', response);

      // Handle different possible response structures
      let events = [];
      
      // Check for the specific response structure we're seeing
      if (response.events && Array.isArray(response.events)) {
        // Handle the case where events are directly under the 'events' key
        events = response.events;
      } else if (Array.isArray(response)) {
        // If response is directly an array of events
        events = response;
      } else if (response.data && Array.isArray(response.data)) {
        // If response has a data array
        events = response.data;
      } else if (response.data && response.data.events && Array.isArray(response.data.events)) {
        // If response has a data.events array
        events = response.data.events;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        // If response is deeply nested
        events = response.data.data;
      }

      return {
        success: true,
        data: {
          events: events,
          total: events.length,
          page: page,
          limit: limit
        }
      };
    } catch (error) {
      console.error('Get All Events Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load events. Please try again.',
      };
    }
  }

  // Get featured events
  async getFeaturedEvents(limit = 10) {
    try {
      console.log('EventsApi: Getting featured events');
      
      const url = `${this.baseUrl}${API_ENDPOINTS.EVENTS.GET_FEATURED}?limit=${limit}`;
      console.log('EventsApi: Making request to:', url);

      const response = await this.makeRequest(url, {
        method: 'GET',
        skipAuth: true, // Public endpoint
      });

      console.log('EventsApi: Featured events response:', response);

      return {
        success: true,
        data: response.data || response,
      };
    } catch (error) {
      console.error('Get Featured Events Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load featured events. Please try again.',
      };
    }
  }

  // Get upcoming events
  async getUpcomingEvents(page = 1, limit = 20, category = null) {
    try {
      console.log('EventsApi: Getting upcoming events');
      
      let url = `${this.baseUrl}${API_ENDPOINTS.EVENTS.GET_UPCOMING}?page=${page}&limit=${limit}`;
      
      if (category) {
        url += `&category=${encodeURIComponent(category)}`;
      }

      console.log('EventsApi: Making request to:', url);

      const response = await this.makeRequest(url, {
        method: 'GET',
        skipAuth: true, // Public endpoint
      });

      console.log('EventsApi: Upcoming events response:', response);

      return {
        success: true,
        data: response.data || response,
      };
    } catch (error) {
      console.error('Get Upcoming Events Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load upcoming events. Please try again.',
      };
    }
  }

  // Get events by category
  async getEventsByCategory(category, page = 1, limit = 20) {
    try {
      if (!category) {
        throw new Error('Category is required');
      }

      console.log('EventsApi: Getting events by category:', category);

      const url = `${this.baseUrl}${API_ENDPOINTS.EVENTS.GET_BY_CATEGORY}/${category}?page=${page}&limit=${limit}`;
      console.log('EventsApi: Making request to:', url);

      const response = await this.makeRequest(url, {
        method: 'GET',
        skipAuth: true, // Public endpoint
      });

      console.log('EventsApi: Category events response:', response);

      // Handle different possible response structures
      let events = [];
      if (Array.isArray(response)) {
        events = response;
      } else if (response.data && Array.isArray(response.data)) {
        events = response.data;
      } else if (response.data && response.data.events && Array.isArray(response.data.events)) {
        events = response.data.events;
      } else if (response.events && Array.isArray(response.events)) {
        events = response.events;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        events = response.data.data;
      }

      return {
        success: true,
        data: {
          events: events,
          total: events.length,
          page: page,
          limit: limit,
          category: category
        }
      };
    } catch (error) {
      console.error('Get Events By Category Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load events by category. Please try again.',
      };
    }
  }

  // Get available categories
  async getAvailableCategories() {
    try {
      console.log('EventsApi: Getting available categories');
      
      // Return static categories based on the API documentation
      // In production, this could come from a separate endpoint
      const categories = [
        { id: 'FEATURED', name: 'Featured' },
        { id: 'SPOTLIGHT', name: 'Spotlight' },
        { id: 'TRENDING', name: 'Trending' },
      ];

      return {
        success: true,
        data: {
          categories: categories,
        }
      };
    } catch (error) {
      console.error('Get Available Categories Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load categories. Please try again.',
      };
    }
  }

  // Get event by ID
  async getEventById(eventId) {
    try {
      if (!eventId) {
        throw new Error('Event ID is required');
      }

      console.log('EventsApi: Getting event by ID:', eventId);

      // Use the full endpoint path
      const endpoint = `${API_ENDPOINTS.EVENTS.GET_BY_ID}/${eventId}`;
      const response = await this.makeRequest(endpoint, {
        method: 'GET',
        skipAuth: true, // Public endpoint
      });

      console.log('EventsApi: Event details response:', response);

      return {
        success: true,
        data: response.data || response,
      };
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

      console.log('EventsApi: Registering for event:', eventId);

      const payload = {
        registrationData: registrationData,
      };

      // Use the full endpoint path
      const endpoint = `${API_ENDPOINTS.EVENTS.REGISTER}/${eventId}`;
      const response = await this.makeRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      console.log('EventsApi: Registration response:', response);

      return {
        success: true,
        message: response.message || 'Successfully registered for the event',
        data: response.data || response,
      };
    } catch (error) {
      console.error('Register For Event Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to register for event. Please try again.',
      };
    }
  }

  // Cancel event registration
  async cancelRegistration(registrationId, cancellationReason = '') {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      if (!registrationId) {
        throw new Error('Registration ID is required');
      }

      console.log('EventsApi: Cancelling registration:', registrationId);

      const payload = {
        cancellationReason: cancellationReason,
      };

      const response = await this.makeRequest(`${this.baseUrl}${API_ENDPOINTS.EVENTS.CANCEL_REGISTRATION}/${registrationId}/cancel`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      console.log('EventsApi: Cancellation response:', response);

      return {
        success: true,
        message: response.message || 'Event registration cancelled successfully',
      };
    } catch (error) {
      console.error('Cancel Registration Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to cancel registration. Please try again.',
      };
    }
  }

  // Get user's registered events
  async getRegisteredEvents(page = 1, limit = 20, status = 'all') {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      console.log('EventsApi: Getting registered events');

      let url = `${this.baseUrl}${API_ENDPOINTS.EVENTS.GET_REGISTERED}?page=${page}&limit=${limit}`;
      if (status !== 'all') {
        url += `&status=${status}`;
      }

      const response = await this.makeRequest(url, {
        method: 'GET',
      });

      console.log('EventsApi: Registered events response:', response);

      return {
        success: true,
        data: response.data || response,
      };
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

      console.log('EventsApi: Getting registration status for event:', eventId);

      // Check if user is registered by looking at their registered events
      const registeredEventsResult = await this.getRegisteredEvents(1, 100);
      if (registeredEventsResult.success) {
        const registrations = registeredEventsResult.data.registrations || registeredEventsResult.data || [];
        const registration = registrations.find(
          reg => reg.event_id === eventId || reg.eventId === eventId
        );
        
        if (registration) {
          return {
            success: true,
            data: {
              is_registered: true,
              registration_id: registration.id,
              status: registration.status,
              payment_status: registration.payment_status || registration.paymentStatus,
              can_register: false,
              can_cancel: registration.status === 'REGISTERED',
            },
          };
        } else {
          return {
            success: true,
            data: {
              is_registered: false,
              registration_id: null,
              status: null,
              payment_status: null,
              can_register: true,
              can_cancel: false,
            },
          };
        }
      }

      return {
        success: false,
        message: 'Failed to check registration status',
      };
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
      if (!query || query.trim().length < 2) {
        return {
          success: false,
          message: 'Search query must be at least 2 characters long',
        };
      }

      console.log('EventsApi: Searching events with query:', query);

      let url = `${this.baseUrl}${API_ENDPOINTS.EVENTS.SEARCH}?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`;
      
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
        skipAuth: true, // Public endpoint
      });

      console.log('EventsApi: Search response:', response);

      return {
        success: true,
        data: response.data || response,
      };
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
    const eventDate = new Date(event.start_time || event.date);
    const registrationDeadline = event.registration_deadline ? 
      new Date(event.registration_deadline) : 
      new Date(eventDate.getTime() - 24 * 60 * 60 * 1000); // 1 day before event

    return (
      event.status === 'PUBLISHED' &&
      now < registrationDeadline &&
      (event.registered_count || 0) < (event.max_capacity || Infinity)
    );
  }

  // Create default sample events for demo
  async createDefaultSampleEvents() {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    const now = new Date();
    const sampleEvents = [
      {
        id: 'demo_1',
        title: '🚀 AI & Machine Learning Summit 2024',
        description: 'The ultimate AI conference featuring OpenAI researchers, Google AI team, and top ML engineers. Learn cutting-edge techniques in deep learning, computer vision, and NLP. Network with 500+ AI professionals and get hands-on with the latest AI tools. Includes workshops on ChatGPT, Stable Diffusion, and TensorFlow.',
        category: 'FEATURED',
        location: 'Bangalore International Exhibition Centre',
        start_time: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(),
        registration_deadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        max_capacity: 500,
        cheapest_ticket_price: 2500,
        status: 'PUBLISHED',
        registered_count: 347,
        requirements: ['Laptop with Python installed', 'Valid ID', 'Basic ML knowledge'],
        contact_info: {
          email: 'register@aisummit2024.com',
          phone: '+91 9876543210',
        },
        tags: ['AI', 'machine learning', 'deep learning', 'tech', 'networking'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        organizer: {
          name: 'AI Summit India',
          email: 'organizer@aisummit.in',
        },
        image_url: 'https://picsum.photos/400/200?random=1',
      },
      {
        id: 'demo_2',
        title: '💻 FREE Full Stack Web Development Bootcamp',
        description: 'Complete 3-day intensive bootcamp covering React, Node.js, MongoDB, and deployment. Build 3 real projects including a social media app, e-commerce site, and portfolio. Get mentorship from senior developers at Google, Microsoft, and startups. 100% FREE with certificates!',
        category: 'WORKSHOP',
        location: 'Online (Live on YouTube + Discord)',
        start_time: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000).toISOString(),
        registration_deadline: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        max_capacity: 1000,
        cheapest_ticket_price: 0,
        status: 'PUBLISHED',
        registered_count: 756,
        requirements: ['Computer with internet', 'Basic HTML/CSS knowledge', 'GitHub account'],
        contact_info: {
          email: 'bootcamp@webdev.com',
          phone: '+91 8765432109',
        },
        tags: ['web development', 'free', 'bootcamp', 'react', 'nodejs', 'fullstack'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        organizer: {
          name: 'WebDev Masters',
          email: 'academy@webdev.com',
        },
        image_url: 'https://picsum.photos/400/200?random=2',
      },
      {
        id: 'demo_3',
        title: '🎯 Startup Pitch Night & Investor Meetup',
        description: 'Present your startup idea to 50+ VCs and angel investors! Top 3 pitches win ₹10L funding + 6 months incubation. Network with successful entrepreneurs, get feedback from industry experts, and find potential co-founders. Previous winners raised ₹50Cr+ total funding.',
        category: 'NETWORKING',
        location: 'Mumbai - Bombay Stock Exchange Building',
        start_time: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
        registration_deadline: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        max_capacity: 200,
        cheapest_ticket_price: 1000,
        status: 'PUBLISHED',
        registered_count: 156,
        requirements: ['Startup pitch deck (max 10 slides)', 'Business plan', 'Valid ID'],
        contact_info: {
          email: 'pitch@startupmumbai.in',
          phone: '+91 7654321098',
        },
        tags: ['startup', 'networking', 'funding', 'investors', 'pitch', 'entrepreneurship'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        organizer: {
          name: 'Mumbai Startup Hub',
          email: 'events@startupmumbai.in',
        },
        image_url: 'https://picsum.photos/400/200?random=3',
      },
      {
        id: 'demo_4',
        title: '🏆 HackIndia 2024 - 48 Hour Hackathon',
        description: 'Biggest hackathon in India with ₹25L+ prizes! Build solutions for real-world problems in AI, blockchain, fintech, and sustainability. Mentorship from tech leaders at Flipkart, Zomato, and Paytm. Free food, accommodation, and swag for all participants. Win internships and job offers!',
        category: 'COMPETITION',
        location: 'IIT Bombay Campus, Mumbai',
        start_time: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(now.getTime() + 16 * 24 * 60 * 60 * 1000).toISOString(),
        registration_deadline: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString(),
        max_capacity: 800,
        cheapest_ticket_price: 0,
        status: 'PUBLISHED',
        registered_count: 634,
        requirements: ['Laptop', 'Programming skills', 'Team of 2-4 members', 'Student ID'],
        contact_info: {
          email: 'register@hackindia.com',
          phone: '+91 6543210987',
        },
        tags: ['hackathon', 'coding', 'competition', 'prizes', 'AI', 'blockchain'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        organizer: {
          name: 'HackIndia Foundation',
          email: 'team@hackindia.com',
        },
        image_url: 'https://picsum.photos/400/200?random=4',
      },
      {
        id: 'demo_5',
        title: '🎨 Design Thinking Workshop with Google Designers',
        description: 'Learn design thinking methodology from Google UX designers. Hands-on workshop covering user research, prototyping, and testing. Work on real design challenges and get portfolio feedback. Limited to 50 participants for personalized attention. Includes design tools and resources worth ₹5000.',
        category: 'WORKSHOP',
        location: 'Google Office, Hyderabad',
        start_time: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000).toISOString(),
        registration_deadline: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        max_capacity: 50,
        cheapest_ticket_price: 3500,
        status: 'PUBLISHED',
        registered_count: 42,
        requirements: ['Laptop with Figma installed', 'Design portfolio (optional)', 'Creative mindset'],
        contact_info: {
          email: 'design@googleworkshop.com',
          phone: '+91 5432109876',
        },
        tags: ['design thinking', 'UX', 'UI', 'google', 'workshop', 'portfolio'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        organizer: {
          name: 'Google Design Team',
          email: 'design@google.com',
        },
        image_url: 'https://picsum.photos/400/200?random=5',
      },
      {
        id: 'demo_6',
        title: '🚀 Crypto & Blockchain Masterclass',
        description: 'Deep dive into cryptocurrency trading, DeFi protocols, and blockchain development. Learn from crypto millionaires and blockchain architects. Build your own token and NFT collection. Exclusive access to private trading signals and investment opportunities. Network with crypto enthusiasts and investors.',
        category: 'SEMINAR',
        location: 'Taj Hotel, New Delhi',
        start_time: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(),
        registration_deadline: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        max_capacity: 150,
        cheapest_ticket_price: 5000,
        status: 'PUBLISHED',
        registered_count: 98,
        requirements: ['Crypto wallet (MetaMask)', 'Basic understanding of blockchain', 'Investment capital (optional)'],
        contact_info: {
          email: 'crypto@masterclass.in',
          phone: '+91 4321098765',
        },
        tags: ['cryptocurrency', 'blockchain', 'DeFi', 'NFT', 'trading', 'investment'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        organizer: {
          name: 'Crypto Masters India',
          email: 'team@cryptomasters.in',
        },
        image_url: 'https://picsum.photos/400/200?random=6',
      },
      {
        id: 'demo_7',
        title: '🏃‍♂️ FREE Mumbai Marathon Training Camp',
        description: 'Get ready for Mumbai Marathon 2024! Professional coaching, nutrition guidance, injury prevention, and mental preparation. Join 200+ runners of all levels. Includes running gear, energy drinks, and post-workout meals. Build stamina, make friends, and achieve your fitness goals!',
        category: 'TRENDING',
        location: 'Oval Maidan, Mumbai',
        start_time: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30-day program
        registration_deadline: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        max_capacity: 200,
        cheapest_ticket_price: 0,
        status: 'PUBLISHED',
        registered_count: 167,
        requirements: ['Running shoes', 'Water bottle', 'Medical clearance', 'Commitment to attend'],
        contact_info: {
          email: 'marathon@runmumbai.com',
          phone: '+91 2109876543',
        },
        tags: ['marathon', 'running', 'fitness', 'free', 'health', 'training'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        organizer: {
          name: 'Mumbai Runners Club',
          email: 'club@runmumbai.com',
        },
        image_url: 'https://picsum.photos/400/200?random=7',
      },
      {
        id: 'demo_8',
        title: '🎵 Music Production & DJ Workshop',
        description: 'Learn music production from Grammy-nominated producers and top DJs. Hands-on sessions with professional equipment, software training (Ableton, FL Studio), and live performance techniques. Create your first track and perform at the closing party. All skill levels welcome!',
        category: 'SPOTLIGHT',
        location: 'Sound Studio, Pune',
        start_time: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        registration_deadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        max_capacity: 30,
        cheapest_ticket_price: 4000,
        status: 'PUBLISHED',
        registered_count: 23,
        requirements: ['Laptop', 'Headphones', 'Music passion', 'No prior experience needed'],
        contact_info: {
          email: 'music@soundstudio.in',
          phone: '+91 3210987654',
        },
        tags: ['music production', 'DJ', 'workshop', 'ableton', 'creative', 'performance'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        organizer: {
          name: 'Sound Studio Academy',
          email: 'academy@soundstudio.in',
        },
        image_url: 'https://picsum.photos/400/200?random=8',
      },
    ];

    await AsyncStorage.setItem('sample_events', JSON.stringify(sampleEvents));
    return sampleEvents;
  }
}

// Create and export singleton instance
const eventsApi = new EventsApiService();

export default eventsApi;