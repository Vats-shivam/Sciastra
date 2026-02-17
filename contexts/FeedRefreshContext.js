import React, { createContext, useContext, useRef, useCallback } from 'react';

const FeedRefreshContext = createContext(null);

export function FeedRefreshProvider({ children }) {
  const callbacksRef = useRef(new Set());

  const registerUpdatePostReaction = useCallback((fn) => {
    if (!fn) return () => {};
    callbacksRef.current.add(fn);
    return () => {
      callbacksRef.current.delete(fn);
    };
  }, []);

  const updatePostReaction = useCallback((postId, { added, reactionType = 'LIKE' }) => {
    callbacksRef.current.forEach((fn) => {
      try {
        fn(postId, { added, reactionType });
      } catch (e) {
        console.warn('FeedRefreshContext: callback error', e);
      }
    });
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
