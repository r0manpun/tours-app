import axios from 'axios';

// Function to check and rerfesh token if it's about to expire
export function isUserLoggedIn() {
  console.log(document.cookie);
  return document.cookie.split('; ').some((row) => row.startsWith('jwt='));
}

export async function checkAndRefreshToken() {
  try {
    const token = document.cookie
      .split('; ')
      .find((row) => row.startsWith('jwt='))
      ?.split('=')[1];

    if (!token)
      await axios.get('/api/v1/users/refresh-token', { withCredentials: true });

    // const { exp } = JSON.parse(atob(token.split('.')[1])); // Decode the expiration form token
    // const timeLeft = exp * 1000 - Date.now();

    // if (timeLeft < 5000) {
    //   // If the token is close to expiring (5 seconds left)
    //   await axios.get('/api/v1/users/refresh-token', { withCredentials: true });
    // }
  } catch (error) {
    console.error('Error refreshing token: ', error);
  }
}

// Check token expiration every 10 seconds
