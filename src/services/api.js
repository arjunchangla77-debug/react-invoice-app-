// Force backend URL for production deployment - Updated
const API_BASE_URL = 'https://invoice-backend-sh6p.onrender.com/api';
console.log('API Base URL configured:', API_BASE_URL);

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Helper method to make HTTP requests
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Add authorization header if token exists
    const token = localStorage.getItem('authToken');
    if (token) {
      defaultOptions.headers.Authorization = `Bearer ${token}`;
    }

    const config = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication endpoints
  async login(credentials) {
    return this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(userData) {
    return this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async forgotPassword(email) {
    return this.makeRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token, newPassword) {
    return this.makeRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  }

  async getProfile() {
    return this.makeRequest('/auth/profile', {
      method: 'GET',
    });
  }

  async changePassword(currentPassword, newPassword) {
    return this.makeRequest('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }


  async getNotificationPreferences() {
    return this.makeRequest('/auth/notification-preferences', {
      method: 'GET',
    });
  }

  async updateNotificationPreferences(emailNotifications, systemNotifications) {
    return this.makeRequest('/auth/notification-preferences', {
      method: 'PUT',
      body: JSON.stringify({ emailNotifications, systemNotifications }),
    });
  }

  // Health check
  async healthCheck() {
    return this.makeRequest('/auth/health', {
      method: 'GET',
    });
  }

  // Dental Office endpoints
  async getDentalOffices(search = '', includeDeleted = false) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (includeDeleted) params.append('includeDeleted', 'true');
    
    const queryString = params.toString();
    const endpoint = queryString ? `/dental-offices?${queryString}` : '/dental-offices';
    
    return this.makeRequest(endpoint, {
      method: 'GET',
    });
  }

  async createDentalOffice(officeData) {
    return this.makeRequest('/dental-offices', {
      method: 'POST',
      body: JSON.stringify(officeData),
    });
  }

  async getDentalOffice(officeId) {
    return this.makeRequest(`/dental-offices/${officeId}`, {
      method: 'GET',
    });
  }

  // Invoice endpoints
  async getInvoice(invoiceId) {
    return this.makeRequest(`/invoices/${invoiceId}`, {
      method: 'GET',
    });
  }

  // Token management
  setAuthToken(token) {
    localStorage.setItem('authToken', token);
  }

  getAuthToken() {
    return localStorage.getItem('authToken');
  }

  removeAuthToken() {
    localStorage.removeItem('authToken');
  }

  isAuthenticated() {
    const token = this.getAuthToken();
    if (!token) return false;

    try {
      // Basic token validation (check if it's not expired)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch (error) {
      console.error('Token validation error:', error);
      this.removeAuthToken();
      return false;
    }
  }
}

const apiService = new ApiService();
export default apiService;
