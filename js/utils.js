// utils.js
export async function fetchWithToken(url, options = {}) {
    const token = localStorage.getItem('access');
    if (!token) {
        throw new Error('توکن یافت نشد. لطفا دوباره وارد شوید.');
    }

    const headers = options.headers || {};
    headers['Authorization'] = `Bearer ${token}`;
    options.headers = headers;

    const response = await fetch(url, options);

    if (response.status === 401 || response.status === 403) {
        // توکن منقضی یا دسترسی غیرمجاز
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        throw new Error('دسترسی غیرمجاز یا توکن منقضی شده. دوباره وارد شوید.');
    }

    return response;
}


