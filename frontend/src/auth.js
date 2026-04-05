/**
 * Auth state management
 */

let currentUser = null;
const listeners = [];

export function getUser() {
  return currentUser;
}

export function setUser(user) {
  currentUser = user;
  listeners.forEach(fn => fn(user));
}

export function onUserChange(fn) {
  listeners.push(fn);
  return () => {
    const index = listeners.indexOf(fn);
    if (index > -1) listeners.splice(index, 1);
  };
}

/**
 * Get user initials for avatar
 */
export function getUserInitials() {
  if (!currentUser?.name) return '?';
  return currentUser.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
