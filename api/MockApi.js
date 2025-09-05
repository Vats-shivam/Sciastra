// api/mockApi.js

// Current user ID (hardcoded for demo)
const CURRENT_USER_ID = '1';

const fakeUsers = [
  { 
    id: '1', 
    name: 'John Doe', 
    bio: 'Software Engineer', 
    location: 'Bangalore', 
    interests: ['Tech', 'Networking', 'React Native'], 
    profilePic: null,
    designation: 'Software Engineer',
    email: 'johndoe@gmail.com',
    phone: '1234567890',
    connections: ['2', '3'], // Connected to Bob and Clara
    pendingRequests: ['4'], // David has sent a request
  },
  { 
    id: '2', 
    name: 'Alice Johnson', 
    bio: 'Product Manager', 
    location: 'Bangalore', 
    interests: ['Tech', 'Networking'], 
    profilePic: null,
    designation: 'Product Manager',
    email: 'alice@gmail.com',
    phone: '9876543210',
    connections: ['3'], // Connected to Bob
    pendingRequests: [],
  },
  { 
    id: '3', 
    name: 'Bob Lee', 
    bio: 'React Developer', 
    location: 'Mumbai', 
    interests: ['React Native'], 
    profilePic: null,
    designation: 'React Developer',
    email: 'bob@gmail.com',
    phone: '5555555555',
    connections: ['1', '2'], // Connected to John and Alice
    pendingRequests: [],
  },
  { 
    id: '4', 
    name: 'Clara Singh', 
    bio: 'Designer', 
    location: 'Delhi', 
    interests: ['UI/UX', 'Art'], 
    profilePic: null,
    designation: 'Designer',
    email: 'clara@gmail.com',
    phone: '1111111111',
    connections: ['1', '2'], // Connected to John and Alice
    pendingRequests: [],
  },
  { 
    id: '5', 
    name: 'David Kumar', 
    bio: 'Student', 
    location: 'Pune', 
    interests: ['Learning', 'Startups'], 
    profilePic: null,
    designation: 'Student',
    email: 'david@gmail.com',
    phone: '2222222222',
    connections: [], // No connections yet
    pendingRequests: ['1'], // Has sent request to John
  },
];

const fakePosts = [
  // John's posts
  {
    id: 'post1',
    authorId: '1',
    author: 'John Doe',
    text: 'Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!',
    likes: 4,
    comments: [
      { user: 'Bob Lee', text: 'Good luck!' },
    ],
    visibility: 'public',
    reactions: { like: 2, love: 1, clap: 1 },
  },
  {
    id: 'post2',
    authorId: '1',
    author: 'John Doe',
    text: 'Just finished a React Native project. The learning curve was steep but worth it!',
    likes: 8,
    comments: [
      { user: 'Alice Johnson', text: 'Great work!' },
      { user: 'Bob Lee', text: 'Share the code?' },
    ],
    visibility: 'public',
    reactions: { like: 5, clap: 3 },
  },

  // Alice's posts
  {
    id: 'post3',
    authorId: '2',
    author: 'Alice Johnson',
    text: 'Here\'s a sneak peek of the UI I\'m working on 👇',
    images: ['https://images.unsplash.com/photo-1628563694622-5a76957fd09c?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8aW5zdGFncmFtJTIwcHJvZmlsZXxlbnwwfHwwfHx8MA%3D%3D'],
    likes: 10,
    comments: [],
    visibility: 'connections',
    reactions: { like: 5, fire: 3, wow: 2 },
  },
  {
    id: 'post4',
    authorId: '2',
    author: 'Alice Johnson',
    text: 'Product management is all about understanding user needs and translating them into features.',
    likes: 15,
    comments: [
      { user: 'John Doe', text: 'Well said!' },
    ],
    visibility: 'public',
    reactions: { like: 10, insightful: 5 },
  },

  // Bob's posts
  {
    id: 'post5',
    authorId: '3',
    author: 'Bob Lee',
    text: 'My weekend photography shots 📸',
    images: [
      'https://images.unsplash.com/photo-1628563694622-5a76957fd09c?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8aW5zdGFncmFtJTIwcHJvZmlsZXxlbnwwfHwwfHx8MA%3D%3D',
      'https://images.unsplash.com/photo-1628563694622-5a76957fd09c?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8aW5zdGFncmFtJTIwcHJvZmlsZXxlbnwwfHwwfHx8MA%3D%3D',
      'https://images.unsplash.com/photo-1628563694622-5a76957fd09c?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8aW5zdGFncmFtJTIwcHJvZmlsZXxlbnwwfHwwfHx8MA%3D%3D',
    ],
    likes: 20,
    comments: [
      { user: 'Alice Johnson', text: 'Beautiful clicks!' },
      { user: 'David Kumar', text: 'Amazing work 👏' },
    ],
    visibility: 'public',
    reactions: { love: 10, like: 5, wow: 5 },
  },

  // Clara's posts
  {
    id: 'post6',
    authorId: '4',
    author: 'Clara Singh',
    text: 'This article changed how I think about design systems →',
    link: {
      url: 'https://example.com/design-systems',
      title: 'The Future of Design Systems',
      description: 'A deep dive into modern scalable design practices.',
      thumbnail: 'https://placehold.co/300x200',
    },
    likes: 12,
    comments: [
      { user: 'Bob Lee', text: 'Great read, thanks for sharing!' },
    ],
    visibility: 'public',
    reactions: { clap: 7, like: 3, insightful: 2 },
  },
  {
    id: 'post7',
    authorId: '4',
    author: 'Clara Singh',
    text: 'What\'s your go-to productivity tool?',
    likes: 5,
    comments: [
      { user: 'David Kumar', text: 'Notion all the way!' },
      { user: 'Bob Lee', text: 'I stick with Trello + Slack' },
      { user: 'Alice Johnson', text: 'Figma + Asana combo for me' },
    ],
    visibility: 'connections',
    reactions: { like: 2, clap: 2, insightful: 1 },
  },

  // David's posts
  {
    id: 'post8',
    authorId: '5',
    author: 'David Kumar',
    text: 'Quick thought: consistency beats intensity.',
    likes: 0,
    comments: [],
    visibility: 'private',
    reactions: {},
  },
  {
    id: 'post9',
    authorId: '5',
    author: 'David Kumar',
    text: 'Just started learning React Native. Any tips for beginners?',
    likes: 3,
    comments: [
      { user: 'Bob Lee', text: 'Start with the basics and build small projects!' },
    ],
    visibility: 'public',
    reactions: { like: 2, clap: 1 },
  },
];

export const api = {
  loginWithPhone: (phone) =>
    new Promise((res) =>
      setTimeout(() => res({ success: true, sessionId: 'fakeSession123' }), 1000)
    ),

  verifyOtp: (sessionId, otp) =>
    new Promise((res) =>
      setTimeout(
        () =>
          res(
            otp === '123456'
              ? { success: true, token: 'fakeAuthToken' }
              : { success: false }
          ),
        1000
      )
    ),

  fetchSuggestedConnections: () =>
    new Promise((res) => setTimeout(() => res(fakeUsers), 1000)),

  fetchFeedPosts: () =>
    new Promise((res) => setTimeout(() => res(fakePosts), 1000)),

  sendConnectRequest: (userIds) =>
    new Promise((res) =>
      setTimeout(() => res({ success: true, requested: userIds }), 1000)
    ),

  // New APIs for user profile system
  getCurrentUser: () =>
    new Promise((res) => 
      setTimeout(() => res(fakeUsers.find(user => user.id === CURRENT_USER_ID)), 500)
    ),

  getUserById: (userId) =>
    new Promise((res) => 
      setTimeout(() => res(fakeUsers.find(user => user.id === userId)), 500)
    ),

  getUserPosts: (userId) =>
    new Promise((res) => 
      setTimeout(() => res(fakePosts.filter(post => post.authorId === userId)), 500)
    ),

  checkConnectionStatus: (userId) => {
    const currentUser = fakeUsers.find(user => user.id === CURRENT_USER_ID);
    const targetUser = fakeUsers.find(user => user.id === userId);
    
    if (!currentUser || !targetUser) {
      return new Promise((res) => res({ status: 'unknown' }));
    }

    const isConnected = currentUser.connections.includes(userId);
    const hasPendingRequest = currentUser.pendingRequests.includes(userId);
    const hasSentRequest = targetUser.pendingRequests.includes(CURRENT_USER_ID);

    let status = 'not_connected';
    if (isConnected) status = 'connected';
    else if (hasPendingRequest) status = 'pending_incoming';
    else if (hasSentRequest) status = 'pending_outgoing';

    return new Promise((res) => setTimeout(() => res({ status }), 300));
  },

  sendConnectionRequest: (userId) =>
    new Promise((res) => {
      // Simulate adding to pending requests
      setTimeout(() => res({ success: true, message: 'Connection request sent' }), 500);
    }),

  acceptConnectionRequest: (userId) =>
    new Promise((res) => {
      // Simulate accepting connection
      setTimeout(() => res({ success: true, message: 'Connection accepted' }), 500);
    }),

  rejectConnectionRequest: (userId) =>
    new Promise((res) => {
      // Simulate rejecting connection
      setTimeout(() => res({ success: true, message: 'Connection rejected' }), 500);
    }),

  removeConnection: (userId) =>
    new Promise((res) => {
      // Simulate removing connection
      setTimeout(() => res({ success: true, message: 'Connection removed' }), 500);
    }),
};
