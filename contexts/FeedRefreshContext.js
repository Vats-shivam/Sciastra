import React, { createContext, useContext, useRef, useCallback } from 'react';

const FeedRefreshContext = createContext(null);

export function FeedRefreshProvider({ children }) {
  const updatePostReactionFnRef = useRef(null);

  const registerUpdatePostReaction = useCallback((fn) => {
    updatePostReactionFnRef.current = fn;
    return () => { updatePostReactionFnRef.current = null; };
  }, []);

  const updatePostReaction = useCallback((postId, { added, reactionType = 'LIKE' }) => {
    updatePostReactionFnRef.current?.(postId, { added, reactionType });
  }, []);

  return (
    <FeedRefreshContext.Provider value={{ registerUpdatePostReaction, updatePostReaction }}>
      {children}
    </FeedRefreshContext.Provider>
  );
}

export function useFeedRefresh() {
  return useContext(FeedRefreshContext);
}
