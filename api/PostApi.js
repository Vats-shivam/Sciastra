import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  API_ENDPOINTS, 
  STORAGE_KEYS, 
  REQUEST_CONFIG, 
  ERROR_MESSAGES,
  getApiBaseUrl,
  getCommonHeaders 
} from '../config/apiConfig';
import authApi from './AuthApi';

class PostApiService {
  constructor() {
    this.baseUrl = getApiBaseUrl('post');
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
          console.error('Post API Request Error:', error);
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
        return apiMessage || 'Invalid post data. Please check your inputs.';
      case 401:
        return ERROR_MESSAGES.UNAUTHORIZED;
      case 404:
        return 'Post not found.';
      case 413:
        return 'Media file is too large. Please choose a smaller file.';
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

  // Create a new post
  async createPost(postData) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      // Check for bypass mode
      if (userId === 'bypass_user_1234567890') {
        console.log('Using bypass mode for post creation');
        
        const mockPost = {
          id: 'bypass_post_' + Date.now(),
          userId: userId,
          content: postData.content,
          topics: postData.topics || [],
          mediaUrls: postData.mediaUrls || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        return {
          success: true,
          message: 'Post created successfully (demo mode)',
          data: mockPost,
        };
      }

      const payload = {
        content: postData.content,
        topics: postData.topics || [],
        mediaUrls: postData.mediaUrls || [],
      };

      const response = await this.makeRequest(`${this.baseUrl}${API_ENDPOINTS.POST.CREATE}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response.success) {
        return {
          success: true,
          message: response.message || 'Post created successfully',
          data: response.data,
        };
      } else {
        throw new Error(response.message || 'Failed to create post');
      }
    } catch (error) {
      console.error('Create Post Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to create post. Please try again.',
      };
    }
  }

  // Get feed posts with cursor-based pagination
  async getFeedPosts(cursor = null, limit = 15) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      // Check for bypass mode
      if (userId === 'bypass_user_1234567890') {
        console.log('Using bypass mode for feed posts');
        
        const mockPosts = [
          {
            id: 'mock_post_1',
            userId: 'user_123',
            content: 'Welcome to SciAstra Community! This is a sample post.',
            topics: ['Science', 'Learning'],
            mediaUrls: [],
            createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            author: {
              name: 'Sample User',
              profession: 'Science Student',
              profilePic: null,
            }
          },
          {
            id: 'mock_post_2',
            userId: 'user_456',
            content: 'Excited to connect with fellow learners!',
            topics: ['Community', 'Networking'],
            mediaUrls: [],
            createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
            author: {
              name: 'Demo User',
              profession: 'Educator',
              profilePic: null,
            }
          },
        ];

        return {
          success: true,
          data: {
            posts: mockPosts,
            pagination: {
              hasMore: false,
              nextCursor: null,
              limit: limit,
            }
          }
        };
      }

      let url = `${this.baseUrl}${API_ENDPOINTS.POST.GET_FEED}?limit=${limit}`;
      if (cursor) {
        url += `&cursor=${cursor}`;
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
        throw new Error(response.message || 'Failed to load posts');
      }
    } catch (error) {
      console.error('Get Feed Posts Error:', error);
      
      // Handle "Post not found" as empty feed (expected for new users/systems)
      if (error.message.includes('Post not found') || error.message.includes('not found')) {
        console.log('No posts found, returning empty feed');
        return {
          success: true,
          data: {
            posts: [],
            pagination: {
              hasMore: false,
              nextCursor: null,
              limit: limit,
            }
          },
          message: 'No posts available yet'
        };
      }
      
      // For timeout/network errors, return mock data in demo mode
      if (error.message.includes('timeout') || error.message.includes('Network')) {
        const userId = authApi.getCurrentUserId();
        if (userId === 'bypass_user_1234567890') {
          console.log('Network error detected, returning mock feed data');
          
          const mockPosts = [
            {
              id: 'offline_post_1',
              userId: 'user_offline',
              content: 'This is sample content from offline mode.',
              topics: ['Offline'],
              mediaUrls: [],
              createdAt: new Date().toISOString(),
              author: {
                name: 'Offline User',
                profession: 'Demo',
                profilePic: null,
              }
            },
          ];

          return {
            success: true,
            data: {
              posts: mockPosts,
              pagination: {
                hasMore: false,
                nextCursor: null,
                limit: limit,
              }
            }
          };
        }
      }
      
      return {
        success: false,
        message: error.message || 'Failed to load posts. Please try again.',
      };
    }
  }

  // Get trending posts
  async getTrendingPosts(limit = 10) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      // Check for bypass mode
      if (userId === 'bypass_user_1234567890') {
        console.log('Using bypass mode for trending posts');
        
        const mockTrendingPosts = [
          {
            id: 'trending_1',
            userId: 'user_trending',
            content: 'This is a trending post about scientific discoveries!',
            topics: ['Science', 'Trending'],
            mediaUrls: [],
            createdAt: new Date().toISOString(),
            author: {
              name: 'Trending User',
              profession: 'Researcher',
              profilePic: null,
            }
          }
        ];

        return {
          success: true,
          data: mockTrendingPosts,
        };
      }

      const response = await this.makeRequest(`${this.baseUrl}${API_ENDPOINTS.POST.GET_TRENDING}?limit=${limit}`, {
        method: 'GET',
      });

      if (response.success) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        throw new Error(response.message || 'Failed to load trending posts');
      }
    } catch (error) {
      console.error('Get Trending Posts Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load trending posts. Please try again.',
      };
    }
  }

  // Search users, posts, and topics
  async search(query, type = 'all', page = 1, limit = 10) {
    try {
      console.log('📡 PostApi Search - Request received:', JSON.stringify({
        query: query,
        queryLength: query?.length,
        trimmedLength: query?.trim().length,
        type: type,
        page: page,
        limit: limit
      }));

      const userId = authApi.getCurrentUserId();
      if (!userId) {
        console.log('📡 PostApi Search - Error: No user ID');
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      if (!query || query.trim().length < 2) {
        console.log('📡 PostApi Search - Validation failed: Query too short');
        return {
          success: false,
          message: 'Search query must be at least 2 characters long',
        };
      }

      // Check for bypass mode
      if (userId === 'bypass_user_1234567890') {
        console.log('Using bypass mode for search');
        
        const mockResults = {
          users: [
            {
              userId: 'search_user_1',
              name: 'John Doe',
              profession: 'Data Scientist',
              profilePic: null,
            }
          ],
          posts: [
            {
              id: 'search_post_1',
              content: `Search result for "${query}"`,
              topics: ['Search'],
              createdAt: new Date().toISOString(),
              author: {
                name: 'Search Author',
                profession: 'Content Creator',
              }
            }
          ],
          topics: ['Science', 'Technology', 'Learning'],
        };

        return {
          success: true,
          data: mockResults,
        };
      }

      let endpoint;
      switch (type) {
        case 'users':
          endpoint = API_ENDPOINTS.POST.SEARCH_USERS;
          break;
        case 'posts':
          endpoint = API_ENDPOINTS.POST.SEARCH_POSTS;
          break;
        case 'topics':
          endpoint = API_ENDPOINTS.POST.SEARCH_TOPICS;
          break;
        default:
          // For 'all', we'll search users first, then extend to other types
          endpoint = API_ENDPOINTS.POST.SEARCH_USERS;
      }

      const url = `${this.baseUrl}${endpoint}?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`;
      
      console.log('📡 PostApi Search - Making API request to URL:', url);

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
      console.error('Search Error:', error);
      return {
        success: false,
        message: error.message || 'Search failed. Please try again.',
      };
    }
  }

  // Get post by ID
  async getPostById(postId) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      if (!postId) {
        throw new Error('Post ID is required');
      }

      // Check for bypass mode
      if (userId === 'bypass_user_1234567890') {
        console.log('Using bypass mode for get post by ID');
        
        const mockPost = {
          id: postId,
          userId: 'mock_author',
          content: 'This is a detailed post view in demo mode.',
          topics: ['Demo', 'Detail'],
          mediaUrls: [],
          createdAt: new Date().toISOString(),
          author: {
            name: 'Mock Author',
            profession: 'Demo User',
            profilePic: null,
          }
        };

        return {
          success: true,
          data: mockPost,
        };
      }

      const response = await this.makeRequest(`${this.baseUrl}${API_ENDPOINTS.POST.GET_BY_ID}/${postId}`, {
        method: 'GET',
      });

      if (response.success) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        throw new Error(response.message || 'Post not found');
      }
    } catch (error) {
      console.error('Get Post By ID Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load post. Please try again.',
      };
    }
  }

  // Get user posts
  async getUserPosts(userId = null, page = 1, limit = 10) {
    try {
      const currentUserId = authApi.getCurrentUserId();
      const targetUserId = userId || currentUserId;
      
      if (!currentUserId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      // Check for bypass mode
      if (currentUserId === 'bypass_user_1234567890') {
        console.log('Using bypass mode for user posts');
        
        const mockUserPosts = [
          {
            id: 'user_post_1',
            userId: targetUserId,
            content: 'My first post in the community!',
            topics: ['Introduction'],
            mediaUrls: [],
            createdAt: new Date().toISOString(),
          }
        ];

        return {
          success: true,
          data: mockUserPosts,
        };
      }

      const url = `${this.baseUrl}${API_ENDPOINTS.POST.GET_USER_POSTS}/${targetUserId}?page=${page}&limit=${limit}`;

      const response = await this.makeRequest(url, {
        method: 'GET',
      });

      if (response.success) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        throw new Error(response.message || 'Failed to load user posts');
      }
    } catch (error) {
      console.error('Get User Posts Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load posts. Please try again.',
      };
    }
  }

  // Upload media for posts
  async uploadMedia(mediaUri, mediaType) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      if (!mediaUri || !mediaType) {
        throw new Error('Media URI and type are required');
      }

      // Check for bypass mode
      if (userId === 'bypass_user_1234567890') {
        console.log('Using bypass mode for media upload');
        
        const mockMediaUrl = `https://example.com/media/bypass_${Date.now()}.jpg`;
        
        return {
          success: true,
          message: 'Media uploaded successfully (demo mode)',
          data: {
            mediaUrl: mockMediaUrl,
          },
        };
      }

      // Create form data for media upload
      const formData = new FormData();
      formData.append('media', {
        uri: mediaUri,
        type: mediaType,
        name: `media_${Date.now()}.${mediaType.split('/')[1]}`,
      });

      const response = await this.makeRequest(`${this.baseUrl}${API_ENDPOINTS.POST.UPLOAD_MEDIA}`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.success) {
        return {
          success: true,
          message: response.message || 'Media uploaded successfully',
          data: response.data,
        };
      } else {
        throw new Error(response.message || 'Failed to upload media');
      }
    } catch (error) {
      console.error('Upload Media Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to upload media. Please try again.',
      };
    }
  }

  // Validate post data
  validatePostData(postData) {
    const errors = [];

    if (!postData.content || postData.content.trim().length < 1) {
      errors.push('Post content is required');
    }

    if (postData.content && postData.content.length > 2000) {
      errors.push('Post content must be less than 2000 characters');
    }

    if (postData.topics && postData.topics.length > 10) {
      errors.push('Maximum 10 topics are allowed per post');
    }

    if (postData.mediaUrls && postData.mediaUrls.length > 5) {
      errors.push('Maximum 5 media files are allowed per post');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Create and export singleton instance
const postApi = new PostApiService();

export default postApi;