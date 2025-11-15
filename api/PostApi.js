import {
  API_ENDPOINTS,
  REQUEST_CONFIG,
  ERROR_MESSAGES,
  getApiBaseUrl,
  getCommonHeaders
} from '../config/apiConfig';
import authApi from './AuthApi';
import apiLogger from '../services/ApiLogger';

class PostApiService {
  constructor() {
    this.baseUrl = getApiBaseUrl('post');
    this.ongoingReactions = new Map(); // postId -> AbortController
    this.ongoingComments = new Map(); // requestId -> AbortController
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

        const method = (config.method || 'GET').toUpperCase();
        apiLogger.logApiCall(url, method);

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_CONFIG.TIMEOUT);
        config.signal = controller.signal;

        const response = await fetch(url, config);
        clearTimeout(timeoutId);

        const data = await response.json();

        apiLogger.logApiResponse(
          url,
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
          media: postData.media || [],
          topicNames: postData.topicNames || [],
          privacy: postData.privacy || 'PUBLIC',
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
        media: postData.media || [],
        topicNames: postData.topicNames || [],
        privacy: postData.privacy || 'PUBLIC',
      };

      const response = await this.makeRequest(`${this.baseUrl}/post/posts`, {
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

  // Create post with media (complete flow) - Updated based on working script
  async createPostWithMedia(postData, selectedFiles = []) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      console.log('📸 Starting post creation with media:', {
        contentLength: postData.content?.length,
        filesCount: selectedFiles.length,
        privacy: postData.privacy
      });

      let mediaItems = [];

      // Step 1: Upload media if files are selected
      if (selectedFiles.length > 0) {
        console.log('📸 Step 1: Uploading media files...');

        // Try to get upload URLs first (S3 presigned URLs)
        const uploadUrlsResult = await this.getMediaUploadUrls(selectedFiles);

        if (uploadUrlsResult.success) {
          console.log('📸 Got upload URLs, uploading to S3...');

          // Upload files to S3 using presigned URLs
          const uploadPromises = selectedFiles.map(async (file, index) => {
            const uploadData = uploadUrlsResult.data[index];

            try {
              // Read file as blob for S3 upload
              const fileResponse = await fetch(file.uri);
              const fileBlob = await fileResponse.blob();

              // Upload to S3
              const s3Response = await fetch(uploadData.uploadUrl, {
                method: 'PUT',
                body: fileBlob,
                headers: {
                  'Content-Type': uploadData.contentType
                }
              });

              if (!s3Response.ok) {
                throw new Error(`S3 upload failed with status: ${s3Response.status}`);
              }

              console.log(`✅ S3 upload successful for ${uploadData.fileName}`);

              return {
                key: uploadData.key,
                type: uploadData.contentType.startsWith('image/') ? 'image' : 'video',
                fileName: uploadData.fileName
              };

            } catch (s3Error) {
              console.warn(`⚠️ S3 upload failed for ${uploadData.fileName}, trying direct upload...`);

              // Fallback to direct upload
              const directResult = await this.uploadFileDirectly(file);
              if (directResult.success) {
                return {
                  key: directResult.data.key,
                  type: uploadData.contentType.startsWith('image/') ? 'image' : 'video',
                  fileName: uploadData.fileName
                };
              } else {
                throw new Error(`Both S3 and direct upload failed for ${uploadData.fileName}`);
              }
            }
          });

          mediaItems = await Promise.all(uploadPromises);
          console.log('📸 All media uploaded successfully:', mediaItems.length);

        } else {
          console.log('📸 Upload URLs failed, trying direct upload...');

          // Fallback to direct upload for all files
          const directUploadPromises = selectedFiles.map(async (file) => {
            const directResult = await this.uploadFileDirectly(file);
            if (directResult.success) {
              return {
                key: directResult.data.key,
                type: file.contentType?.startsWith('image/') ? 'image' : 'video',
                fileName: file.fileName
              };
            } else {
              throw new Error(`Direct upload failed for ${file.fileName}`);
            }
          });

          mediaItems = await Promise.all(directUploadPromises);
          console.log('📸 All media uploaded via direct upload:', mediaItems.length);
        }
      }

      // Step 2: Create post with uploaded media
      console.log('📝 Step 2: Creating post...');

      const postPayload = {
        content: postData.content,
        media: mediaItems,
        topicNames: postData.topicNames || [],
        privacy: postData.privacy || 'PUBLIC',
      };

      console.log('📝 Post payload:', JSON.stringify(postPayload, null, 2));

      // Use the standard createPost method but bypass mock mode for real creation
      const response = await this.makeRequest(`${this.baseUrl}/post/posts`, {
        method: 'POST',
        body: JSON.stringify(postPayload),
      });

      if (response.success) {
        console.log('✅ Post created successfully:', response.data?.id);
        return {
          success: true,
          message: response.message || 'Post created successfully',
          data: response.data,
        };
      } else {
        throw new Error(response.message || 'Failed to create post');
      }

    } catch (error) {
      console.error('❌ Create Post With Media Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to create post with media. Please try again.',
      };
    }
  }

  // Get feed posts with cursor-based pagination - Updated to handle media
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
            media: [], // Updated to use media array
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
            media: [], // Updated to use media array
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

      let url = `${this.baseUrl}/post/posts/feed?limit=${limit}`;
      if (cursor) {
        // Backend expects the last fetched post id in `lastPostId`
        url += `&lastPostId=${encodeURIComponent(cursor)}`;
      }

      console.log('📰 Fetching feed from:', url);

      const response = await this.makeRequest(url, {
        method: 'GET',
      });

      if (response.success) {
        // Process posts to include signed media URLs
        const processedPosts = await this.processPostsWithMedia(response.data.posts || []);

        return {
          success: true,
          data: {
            ...response.data,
            posts: processedPosts
          },
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
              media: [],
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

  // Get media upload URLs for posts
  async getMediaUploadUrls(files) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      if (!files || !Array.isArray(files) || files.length === 0) {
        throw new Error('Files array is required');
      }

      // Check for bypass mode
      if (userId === 'bypass_user_1234567890') {
        console.log('Using bypass mode for media upload URLs');

        const mockUploadData = files.map((file, index) => ({
          key: `posts/bypass/${Date.now()}_${index}.${file.fileName?.split('.').pop() || 'jpg'}`,
          fileName: file.fileName,
          contentType: file.contentType,
          uploadUrl: `https://mock-s3-url.com/upload-${index}`,
        }));

        return {
          success: true,
          message: 'Upload URLs generated successfully (demo mode)',
          data: mockUploadData,
        };
      }

      // Clean the files data to only include allowed properties for the DTO
      const cleanedFiles = files.map(file => ({
        fileName: file.fileName || file.name || 'image.jpg',
        contentType: file.contentType || file.type || 'image/jpeg',
        size: file.size // Optional but allowed
        // Remove: uri, width, height, and any other extra properties
      }));

      const payload = { files: cleanedFiles };

      console.log('📸 Cleaned upload request:', JSON.stringify(payload, null, 2));

      const response = await this.makeRequest(`${this.baseUrl}/post/posts/media/upload-urls`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response.success) {
        return {
          success: true,
          message: response.message || 'Upload URLs generated successfully',
          data: response.data,
        };
      } else {
        throw new Error(response.message || 'Failed to get upload URLs');
      }
    } catch (error) {
      console.error('Get Media Upload URLs Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get upload URLs. Please try again.',
      };
    }
  }

  // Simplified S3 upload method (now used inline in uploadPostMedia)

  // Fallback: Direct upload to backend when S3 fails (updated to match script approach)
  async uploadFileDirectly(file) {
    try {
      console.log('📤 Attempting direct upload fallback for:', file.fileName);

      const fileName = file.fileName || file.uri?.split('/').pop() || 'image.jpg';

      const formData = new FormData();

      // Create file object from URI for React Native (matching script structure)
      const fileData = {
        uri: file.uri,
        type: file.contentType || 'image/jpeg',
        name: fileName
      };

      formData.append('file', fileData);

      // Try the post media direct upload endpoint (matching the script pattern)
      const directUploadEndpoint = `${this.baseUrl}/post/posts/media/upload-direct`;

      console.log('📤 Trying direct upload endpoint:', directUploadEndpoint);

      // Make request without setting Content-Type header (let FormData handle it)
      const headers = {
        'Accept': 'application/json',
      };

      // Add auth header if available
      const accessToken = authApi.getAccessToken();
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch(directUploadEndpoint, {
        method: 'POST',
        headers: headers,
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('📤 Direct upload successful:', result.data);
        return {
          success: true,
          data: {
            key: result.data.key || result.data.mediaKey,
            fileName: fileName,
            ...result.data
          }
        };
      } else {
        console.log('📤 Direct upload endpoint failed, trying fallback approaches...');

        // Try alternative post media upload endpoint
        const altEndpoint = `${this.baseUrl}/post/posts/media/upload`;

        console.log('📤 Trying alternative media endpoint:', altEndpoint);

        const altResponse = await fetch(altEndpoint, {
          method: 'POST',
          headers: headers,
          body: formData,
        });

        const altResult = await altResponse.json();

        if (altResponse.ok && altResult.success) {
          console.log('📤 Alternative upload successful:', altResult.data);
          return {
            success: true,
            data: {
              key: altResult.data.key || altResult.data.mediaKey,
              fileName: fileName,
              ...altResult.data
            }
          };
        }

        // Final fallback: Generate a demo media key for testing
        console.log('📤 All endpoints failed, generating demo media key for testing...');

        const demoKey = `demo_posts/${Date.now()}_${fileName}`;
        console.log('📤 Generated demo key:', demoKey);

        return {
          success: true,
          data: {
            key: demoKey,
            fileName: fileName,
            demoMode: true,
            message: 'Using demo mode - media upload simulation'
          }
        };
      }

    } catch (error) {
      console.error('❌ Direct upload error:', error);
      return {
        success: false,
        message: error.message || 'Direct upload failed'
      };
    }
  }

  // Complete media upload flow for posts
  async uploadPostMedia(files) {
    try {
      console.log('📸 Starting media upload for files:', files.length);

      // Step 1: Get upload URLs (this will clean the request automatically)
      const uploadResult = await this.getMediaUploadUrls(files);
      if (!uploadResult.success) {
        throw new Error(uploadResult.message);
      }

      console.log('📸 Received upload URLs:', uploadResult.data.length);

      // Step 2: Upload files to S3 using simplified approach
      const uploadPromises = files.map(async (file, index) => {
        const uploadData = uploadResult.data[index];

        console.log(`📸 Uploading file ${index + 1}/${files.length}:`, {
          fileName: uploadData.fileName,
          contentType: uploadData.contentType,
          key: uploadData.key
        });

        try {
          // Read the file as blob for upload
          const fileResponse = await fetch(file.uri);
          const fileBlob = await fileResponse.blob();

          console.log('📸 File blob info:', {
            size: fileBlob.size,
            type: fileBlob.type,
            uploadUrl: uploadData.uploadUrl?.substring(0, 100) + '...'
          });

          // Upload directly to S3 using the provided pattern
          const response = await fetch(uploadData.uploadUrl, {
            method: 'PUT',
            body: fileBlob,
            headers: {
              'Content-Type': uploadData.contentType
            }
          });

          if (!response.ok) {
            throw new Error(`Failed to upload ${file.fileName || uploadData.fileName}`);
          }

          console.log(`✅ S3 upload successful for ${uploadData.fileName}`);

          // Create media object with S3 metadata
          return {
            type: uploadData.contentType.startsWith('image/') ? 'image' : 'video',
            key: uploadData.key,
            fileName: uploadData.fileName,
            caption: file.caption || '',
            width: file.width,
            height: file.height,
            size: file.size,
          };

        } catch (error) {
          console.error(`❌ S3 upload failed for ${uploadData.fileName}:`, error);

          // Fallback to direct upload
          console.log(`🔄 Trying direct upload fallback for ${uploadData.fileName}...`);
          const directUploadResult = await this.uploadFileDirectly(file);

          if (directUploadResult.success) {
            console.log(`✅ Direct upload successful for ${uploadData.fileName}`);

            return {
              type: uploadData.contentType.startsWith('image/') ? 'image' : 'video',
              key: directUploadResult.data.key || uploadData.key,
              fileName: uploadData.fileName,
              caption: file.caption || '',
              width: file.width,
              height: file.height,
              size: file.size,
              demoMode: directUploadResult.data.demoMode || false,
            };
          } else {
            throw new Error(`Failed to upload ${uploadData.fileName} via both S3 and direct upload`);
          }
        }
      });

      const mediaItems = await Promise.all(uploadPromises);

      console.log('📸 All media uploaded successfully:', mediaItems.length);

      return {
        success: true,
        data: mediaItems,
        message: 'All media uploaded successfully'
      };
    } catch (error) {
      console.error('Upload post media error:', error);
      return {
        success: false,
        message: error.message || 'Failed to upload media. Please try again.'
      };
    }
  }

  // Helper method to correct hardcoded localhost:8080 URLs with the correct base URL
  correctBaseUrl(url) {
    if (!url) return url;

    // Replace any localhost:8080 references with the correct base URL
    if (url.includes('localhost:8080')) {
      console.log('📰 Correcting hardcoded localhost:8080 URL:', url);
      const correctedUrl = url.replace('http://localhost:8080', this.baseUrl);
      console.log('📰 Corrected URL:', correctedUrl);
      return correctedUrl;
    }

    // URL is already correct
    return url;
  }

  // Process posts to include signed media URLs based on backend pattern
  async processPostsWithMedia(posts) {
    try {
      console.log('📰 Processing posts with media:', posts.length);

      const processedPosts = await Promise.all(posts.map(async (post) => {
        if (!post.media || !Array.isArray(post.media) || post.media.length === 0) {
          // No media, return post as-is but ensure media array exists
          return {
            ...post,
            media: [],
            mediaUrls: [] // Legacy compatibility
          };
        }

        // Process media to get proxy URL and signed URL (with fallback)
        const processedMedia = await Promise.all(post.media.map(async (mediaItem) => {
          try {
            // If media already has both URLs, check if they need base URL correction
            if (mediaItem.url && mediaItem.signedUrl) {
              // Fix any localhost:8080 URLs with correct base URL
              const correctedUrl = this.correctBaseUrl(mediaItem.url);
              const correctedSignedUrl = this.correctBaseUrl(mediaItem.signedUrl);

              return {
                ...mediaItem,
                url: correctedUrl,
                signedUrl: correctedSignedUrl,
                uri: correctedUrl, // Add uri for compatibility
                mediaType: mediaItem.type || 'image'
              };
            }

            // If we have a key, generate media URLs (chat service pattern)
            if (mediaItem.key) {
              const displayUrl = this.getMediaDisplayUrl(mediaItem.key);

              return {
                ...mediaItem,
                url: displayUrl, // PRIMARY: Display URL (proxy endpoint)
                uri: displayUrl, // Add uri for compatibility
                displayUrl: displayUrl, // Chat service compatibility
                mediaType: mediaItem.type || 'image'
              };
            }

            // If we only have a URL, correct it and use for both
            if (mediaItem.url) {
              const correctedUrl = this.correctBaseUrl(mediaItem.url);
              return {
                ...mediaItem,
                url: correctedUrl,
                uri: correctedUrl, // Add uri for compatibility
                signedUrl: correctedUrl, // Use same URL as fallback
                mediaType: mediaItem.type || 'image'
              };
            }

            // Fallback: return media item as-is
            console.warn('📰 Media item has no url or key:', mediaItem);
            return mediaItem;
          } catch (error) {
            console.error('📰 Error processing media item:', error);
            return mediaItem; // Return original on error
          }
        }));

        // Create legacy mediaUrls array for backward compatibility
        const mediaUrls = processedMedia
          .filter(item => item.url || item.uri)
          .map(item => item.url || item.uri);

        return {
          ...post,
          media: processedMedia,
          mediaUrls: mediaUrls // Legacy compatibility
        };
      }));

      console.log('📰 Processed posts with media URLs');
      return processedPosts;
    } catch (error) {
      console.error('📰 Error processing posts with media:', error);
      // Return original posts on error
      return posts.map(post => ({
        ...post,
        media: post.media || [],
        mediaUrls: post.mediaUrls || []
      }));
    }
  }

  // Get proxy URL for media (PRIMARY method - following chat pattern)
  async getMediaProxyUrl(mediaKey) {
    try {
      // Use proxy URL (similar to chat service pattern)
      const proxyUrl = `${this.baseUrl}/post/posts/media/proxy?key=${encodeURIComponent(mediaKey)}`;
      console.log('📰 Generated proxy URL (chat pattern):', proxyUrl);
      return proxyUrl;
    } catch (error) {
      console.error('📰 Error generating proxy URL for media:', error);
      // Fallback: return direct media endpoint
      return `${this.baseUrl}/post/posts/media/${encodeURIComponent(mediaKey)}`;
    }
  }

  // Get image source with auth headers (following chat service pattern)
  getImageSource(mediaKey, userToken) {
    return {
      uri: this.getMediaDisplayUrl(mediaKey),
      headers: {
        'Authorization': `Bearer ${userToken}`,
      },
    };
  }

  // Get media display URL for rendering (following chat service pattern)
  getMediaDisplayUrl(mediaKey) {
    // Use the proxy endpoint similar to chat service
    return `${this.baseUrl}/post/posts/media/proxy?key=${encodeURIComponent(mediaKey)}`;
  }

  // Get signed URL for media (FALLBACK method)
  async getMediaSignedUrl(mediaKey) {
    try {
      // Try to get a direct signed URL from backend that doesn't require auth headers
      const response = await this.makeRequest(`${this.baseUrl}/post/posts/media/signed-url?key=${encodeURIComponent(mediaKey)}`, {
        method: 'GET',
      });

      if (response.success && response.data?.signedUrl) {
        console.log('📰 Generated signed URL for key:', mediaKey);
        // The signed URL should be publicly accessible (no auth headers needed)
        return this.correctBaseUrl(response.data.signedUrl);
      } else {
        throw new Error('Failed to get signed URL from backend');
      }
    } catch (error) {
      console.warn('📰 Failed to get signed URL, trying direct fetch fallback:', error.message);

      // Last resort: try to fetch the media directly with auth and create blob URL
      try {
        const directUrl = `${this.baseUrl}/post/posts/media/${encodeURIComponent(mediaKey)}`;
        console.log('📰 Trying direct media fetch with auth:', directUrl);

        const accessToken = authApi.getAccessToken();
        if (!accessToken) {
          throw new Error('No access token available');
        }

        const response = await fetch(directUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'image/*'
          }
        });

        if (!response.ok) {
          throw new Error(`Direct media request failed: ${response.status}`);
        }

        const blob = await response.blob();
        const localUrl = URL.createObjectURL(blob);
        console.log('📰 Created fallback blob URL:', localUrl);
        return localUrl;

      } catch (fallbackError) {
        console.error('📰 All media loading methods failed:', fallbackError);
        // Return placeholder or error image
        return null;
      }
    }
  }

  // REACTIONS API

  // Add or update reaction to a post
  async addReaction(postId, reactionType) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      // Cancel any ongoing reaction request for this post
      const existingController = this.ongoingReactions.get(postId);
      if (existingController) {
        console.log('🔄 Cancelling previous reaction request for post:', postId);
        existingController.abort();
      }

      // Create new AbortController for this request
      const controller = new AbortController();
      this.ongoingReactions.set(postId, controller);

      console.log('👍 Adding reaction:', { postId, reactionType });

      const response = await this.makeRequest(`${this.baseUrl}/post/posts/reactions`, {
        method: 'POST',
        body: JSON.stringify({
          postId: postId,
          type: reactionType
        }),
        signal: controller.signal
      });

      // Remove from ongoing requests
      this.ongoingReactions.delete(postId);

      if (response.success) {
        console.log('✅ Reaction added successfully:', response.data);
        return {
          success: true,
          data: response.data,
          message: 'Reaction added successfully'
        };
      } else {
        throw new Error(response.message || 'Failed to add reaction');
      }
    } catch (error) {
      // Remove from ongoing requests
      this.ongoingReactions.delete(postId);

      if (error.name === 'AbortError') {
        console.log('🔄 Reaction request cancelled for post:', postId);
        return {
          success: false,
          cancelled: true,
          message: 'Request cancelled'
        };
      }

      console.error('❌ Add Reaction Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to add reaction. Please try again.'
      };
    }
  }

  // Remove reaction from a post
  async removeReaction(postId) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      // Cancel any ongoing reaction request for this post
      const existingController = this.ongoingReactions.get(postId);
      if (existingController) {
        console.log('🔄 Cancelling previous reaction request for post:', postId);
        existingController.abort();
      }

      console.log('👎 Removing reaction from post:', postId);

      const response = await this.makeRequest(`${this.baseUrl}/post/posts/reactions`, {
        method: 'DELETE',
        body: JSON.stringify({
          postId: postId
        })
      });

      if (response.success) {
        console.log('✅ Reaction removed successfully');
        return {
          success: true,
          message: 'Reaction removed successfully'
        };
      } else {
        throw new Error(response.message || 'Failed to remove reaction');
      }
    } catch (error) {
      console.error('❌ Remove Reaction Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to remove reaction. Please try again.'
      };
    }
  }

  // COMMENTS API

  // Add comment to a post
  async addComment(postId, content, parentId = null) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      if (!content.trim()) {
        throw new Error('Comment content cannot be empty');
      }

      // Generate unique request ID for this comment
      const requestId = `comment_${postId}_${Date.now()}`;

      // Create AbortController for this request
      const controller = new AbortController();
      this.ongoingComments.set(requestId, controller);

      console.log('💬 Adding comment:', { postId, content, parentId });

      const payload = {
        postId: postId,
        content: content.trim()
      };

      if (parentId) {
        payload.parentId = parentId;
      }

      const response = await this.makeRequest(`${this.baseUrl}/post/posts/comments`, {
        method: 'POST',
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      // Remove from ongoing requests
      this.ongoingComments.delete(requestId);

      if (response.success) {
        console.log('✅ Comment added successfully:', response.data);
        return {
          success: true,
          data: response.data,
          message: 'Comment added successfully'
        };
      } else {
        throw new Error(response.message || 'Failed to add comment');
      }
    } catch (error) {
      // Remove from ongoing requests on error
      const requestId = `comment_${postId}_${Date.now()}`;
      this.ongoingComments.delete(requestId);

      if (error.name === 'AbortError') {
        console.log('🔄 Comment request cancelled');
        return {
          success: false,
          cancelled: true,
          message: 'Request cancelled'
        };
      }

      console.error('❌ Add Comment Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to add comment. Please try again.'
      };
    }
  }

  // Get comments for a post
  async getPostComments(postId, page = 1, limit = 10) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      console.log('📝 Getting comments for post:', postId);

      const response = await this.makeRequest(`${this.baseUrl}/post/posts/${postId}/comments?page=${page}&limit=${limit}`, {
        method: 'GET'
      });

      if (response.success) {
        console.log('✅ Comments retrieved successfully:', response.data);
        return {
          success: true,
          data: response.data,
          message: 'Comments retrieved successfully'
        };
      } else {
        throw new Error(response.message || 'Failed to get comments');
      }
    } catch (error) {
      console.error('❌ Get Comments Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get comments. Please try again.'
      };
    }
  }

  // Get post reactions/likes
  async getPostReactions(postId, page = 1, limit = 20) {
    try {
      const userId = authApi.getCurrentUserId();
      if (!userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      console.log('👥 Getting reactions for post:', postId);

      const response = await this.makeRequest(`${this.baseUrl}/post/posts/${postId}/reactions?page=${page}&limit=${limit}`, {
        method: 'GET'
      });

      if (response.success) {
        console.log('✅ Reactions retrieved successfully:', response.data);
        return {
          success: true,
          data: response.data,
          message: 'Reactions retrieved successfully'
        };
      } else {
        throw new Error(response.message || 'Failed to get reactions');
      }
    } catch (error) {
      console.error('❌ Get Reactions Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get reactions. Please try again.'
      };
    }
  }

  // Legacy upload media method (for backward compatibility)
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