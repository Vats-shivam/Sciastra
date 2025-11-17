import authApi from '../api/AuthApi';
import profileApi from '../api/ProfileApi';

const DEFAULT_IMAGE = require('../assets/icon.png');

const resolveProfileMediaKey = (entity) => {
  if (!entity) {
    return null;
  }

  if (typeof entity === 'string') {
    return entity;
  }

  return (
    entity.profile?.profilePic ||
    entity.profilePic ||
    entity.profile?.photo ||
    entity.profileImage ||
    entity.profilePicUrl ||
    entity.avatar ||
    entity.photo ||
    entity.image
  );
};

export const getProfileImageSource = (entity, options = {}) => {
  let mediaKey = resolveProfileMediaKey(entity);

  if (!mediaKey && options.fallbackKey) {
    mediaKey = options.fallbackKey;
  }

  const token = authApi.getAccessToken();

  if (!mediaKey) {
    return DEFAULT_IMAGE;
  }

  return profileApi.getImageSource(mediaKey, token);
};

