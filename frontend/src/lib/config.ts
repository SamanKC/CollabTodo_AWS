export const cfg = {
  region: import.meta.env.VITE_REGION as string,
  cognitoDomain: import.meta.env.VITE_COGNITO_DOMAIN as string, // e.g. collabtodo-app.auth.ap-southeast-2.amazoncognito.com
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID as string,
  redirectUri: import.meta.env.VITE_REDIRECT_URI as string,
  logoutRedirectUri: import.meta.env.VITE_LOGOUT_REDIRECT_URI as string,
  apiBase: (import.meta.env.VITE_API_BASE as string).replace(/\/+$/, '') + '/',
} as const;
