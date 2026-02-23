import React, { createContext, useContext, useState } from 'react';

const EditPostContext = createContext(null);

export const EditPostProvider = ({ children }) => {
  const [editingPost, setEditingPostState] = useState(null);

  const setEditingPost = (post) => {
    try {
      console.log('[EditPostContext] setEditingPost', { time: new Date().toISOString(), postId: post?.id || null });
    } catch {}
    setEditingPostState(post || null);
  };

  const clearEditingPost = () => setEditingPostState(null);

  return (
    <EditPostContext.Provider value={{ editingPost, setEditingPost, clearEditingPost }}>
      {children}
    </EditPostContext.Provider>
  );
};

export const useEditPost = () => {
  const ctx = useContext(EditPostContext);
  if (!ctx) {
    throw new Error('useEditPost must be used within EditPostProvider');
  }
  return ctx;
};

