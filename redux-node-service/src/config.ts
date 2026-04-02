export const config = {
  port: parseInt(process.env.PORT || '3200'),
  backendUrl: process.env.BACKEND_URL || 'http://localhost:8080',
};
