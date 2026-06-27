const BASE_URL = 'http://localhost:8001';

/**
 * Retrieves the stored JWT access token from localStorage.
 * @returns {string|null} The access token or null if not found.
 */
export const getToken = () => {
  return localStorage.getItem('token');
};

/**
 * Helper to construct headers with optional JWT authorization and content typing.
 * For FormData uploads, the Content-Type header should be omitted so the browser sets it automatically.
 */
const getHeaders = (includeAuth = true, isMultipart = false) => {
  const headers = {};
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  if (includeAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
};

/**
 * Handles fetch response checking status codes and returning JSON payload or throwing Error.
 */
const handleResponse = async (response) => {
  if (!response.ok) {
    let errorMessage = 'Something went wrong';
    try {
      const errorData = await response.json();
      const detail = errorData.detail || errorData.message || errorMessage;
      if (typeof detail === 'object' && detail !== null) {
        errorMessage = JSON.stringify(detail);
      } else {
        errorMessage = detail;
      }
    } catch (e) {
      // Ignore parsing error if response is not JSON
    }
    throw new Error(errorMessage);
  }
  return response.json();
};

/**
 * Registers a new user with the specified email, password, and role.
 */
export const registerUser = async (email, password, role) => {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: getHeaders(false),
      body: JSON.stringify({ email, password, role }),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
};

/**
 * Authenticates user, obtains a JWT token, and saves the token & decoded user role in localStorage.
 */
export const loginUser = async (email, password) => {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: getHeaders(false),
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse(response);
    if (data.access_token) {
      localStorage.setItem('token', data.access_token);
      
      // Decode JWT token locally to retrieve the user's role and ID without importing external libraries
      try {
        const base64Url = data.access_token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const payload = JSON.parse(jsonPayload);
        if (payload.role) {
          localStorage.setItem('role', payload.role);
        }
        if (payload.id) {
          localStorage.setItem('user_id', payload.id.toString());
        }
      } catch (jwtError) {
        console.error('Failed to decode JWT token for user metadata:', jwtError);
      }
    }
    return data;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

/**
 * Fetches all available job listings.
 */
export const fetchJobs = async () => {
  try {
    const response = await fetch(`${BASE_URL}/api/jobs`, {
      method: 'GET',
      headers: getHeaders(true),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Fetching jobs failed:', error);
    throw error;
  }
};

/**
 * Creates a new job posting. Requires HR credentials (JWT).
 */
export const createJob = async (jobData) => {
  try {
    const response = await fetch(`${BASE_URL}/api/jobs`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(jobData),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Creating job failed:', error);
    throw error;
  }
};

/**
 * Uploads a resume PDF to preview match results and missing skills. Requires Candidate credentials.
 */
export const previewMatch = async (jobId, pdfFile) => {
  try {
    const formData = new FormData();
    formData.append('file', pdfFile);

    const response = await fetch(`${BASE_URL}/api/jobs/${jobId}/preview-match`, {
      method: 'POST',
      headers: getHeaders(true, true),
      body: formData,
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Preview match failed:', error);
    throw error;
  }
};

/**
 * Submits an official job application with a resume PDF. Requires Candidate credentials.
 */
export const applyToJob = async (jobId, pdfFile) => {
  try {
    const formData = new FormData();
    formData.append('file', pdfFile);

    const response = await fetch(`${BASE_URL}/api/jobs/${jobId}/apply`, {
      method: 'POST',
      headers: getHeaders(true, true),
      body: formData,
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Job application failed:', error);
    throw error;
  }
};

/**
 * Fetches all applicants/applications for a specific job opening. Requires HR credentials (JWT).
 */
export const fetchApplicantsForJob = async (jobId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/jobs/${jobId}/applicants`, {
      method: 'GET',
      headers: getHeaders(true),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Fetching applicants failed:', error);
    throw error;
  }
};

/**
 * Extract a clean error message string from various error objects,
 * including Fetch/Axios error shapes and FastAPI validation lists.
 */
export const extractErrorMessage = (error) => {
  if (!error) return 'An unexpected error occurred.';
  
  // Extract detail/message from custom or network error formats
  let detail = error.response?.data?.detail || error.detail || error.message;
  
  // If detail is a JSON-formatted string, try to parse it
  if (typeof detail === 'string') {
    try {
      const parsed = JSON.parse(detail);
      if (parsed) {
        detail = parsed;
      }
    } catch (e) {
      // Ignore parsing errors and treat as normal string
    }
  }

  // Handle FastAPI list of validation errors
  if (Array.isArray(detail)) {
    return detail.map(err => {
      const field = err.loc ? err.loc[err.loc.length - 1] : '';
      return field ? `${field}: ${err.msg}` : err.msg;
    }).join(', ');
  }

  // Handle dictionary/object details
  if (typeof detail === 'object' && detail !== null) {
    return detail.detail || detail.message || JSON.stringify(detail);
  }

  return typeof detail === 'string' ? detail : String(error);
};

/**
 * Downloads the resume PDF for a specific application.
 */
export const downloadResume = async (applicationId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/applications/${applicationId}/resume`, {
      method: 'GET',
      headers: getHeaders(true),
    });
    if (!response.ok) {
      throw new Error('Failed to download resume');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume_${applicationId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Downloading resume failed:', error);
    throw error;
  }
};

