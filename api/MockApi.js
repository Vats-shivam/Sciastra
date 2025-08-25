// api/mockApi.js
const fakeUsers = [
  { id: '1', name: 'Alice Johnson', bio: 'Product Manager', location: 'Bangalore', interests: ['Tech', 'Networking'], profilePic: null },
  { id: '2', name: 'Bob Lee', bio: 'React Developer', location: 'Mumbai', interests: ['React Native'], profilePic: null },
  { id: '3', name: 'Clara Singh', bio: 'Designer', location: 'Delhi', interests: ['UI/UX', 'Art'], profilePic: null },
  { id: '4', name: 'David Kumar', bio: 'Student', location: 'Pune', interests: ['Learning', 'Startups'], profilePic: null },
];

const fakePosts = [
  // 1. Simple text-only post
  {
    id: 'post1',
    author: 'Alice Johnson',
    text: 'Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!Excited to begin this new project!',
    likes: 4,
    comments: [
      { user: 'Bob Lee', text: 'Good luck!' },
    ],
    visibility: 'public',
    reactions: { like: 2, love: 1, clap: 1 },
  },

  // 2. Single image post
  {
    id: 'post2',
    author: 'Bob Lee',
    text: 'Here’s a sneak peek of the UI I’m working on 👇',
    images: ['https://images.unsplash.com/photo-1628563694622-5a76957fd09c?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8aW5zdGFncmFtJTIwcHJvZmlsZXxlbnwwfHwwfHx8MA%3D%3D'],
    likes: 10,
    comments: [],
    visibility: 'connections',
    reactions: { like: 5, fire: 3, wow: 2 },
  },

  // 3. Multi-image (carousel type) post
  {
    id: 'post3',
    author: 'Clara Singh',
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

  // 4. Post with a link preview
  {
    id: 'post4',
    author: 'David Kumar',
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

  // 5. Private post with no likes
  {
    id: 'post5',
    author: 'Alice Johnson',
    text: 'Quick thought: consistency beats intensity.',
    likes: 0,
    comments: [],
    visibility: 'private',
    reactions: {},
  },

  // 6. Post with many comments (stress test UI)
  {
    id: 'post6',
    author: 'Clara Singh',
    text: 'What’s your go-to productivity tool?',
    likes: 5,
    comments: [
      { user: 'David Kumar', text: 'Notion all the way!' },
      { user: 'Bob Lee', text: 'I stick with Trello + Slack' },
      { user: 'Alice Johnson', text: 'Figma + Asana combo for me' },
    ],
    visibility: 'connections',
    reactions: { like: 2, clap: 2, insightful: 1 },
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
};
