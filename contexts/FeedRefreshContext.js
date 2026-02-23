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

  // Register/remove posts by author callback - used for instant removal after blocking
  const authorRemovalCallbacksRef = useRef(new Set());
  const registerRemovePostsByAuthor = useCallback((fn) => {
    if (!fn) return () => {};
    authorRemovalCallbacksRef.current.add(fn);
    return () => {
      authorRemovalCallbacksRef.current.delete(fn);
    };
  }, []);

  const removePostsByAuthor = useCallback((authorId) => {
    authorRemovalCallbacksRef.current.forEach((fn) => {
      try {
        fn(authorId);
      } catch (e) {
        console.warn('FeedRefreshContext: removePostsByAuthor callback error', e);
      }
    });
  }, []);

  return (
    <FeedRefreshContext.Provider value={{ registerUpdatePostReaction, updatePostReaction, registerRemovePostsByAuthor, removePostsByAuthor }}>
      {children}
    </FeedRefreshContext.Provider>
  );
}

export function useFeedRefresh() {
  return useContext(FeedRefreshContext);
}
