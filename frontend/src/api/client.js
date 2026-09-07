const BASE = "/api";

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(path, { method = "GET", body, isForm = false } = {}) {
  const headers = {};
  if (!isForm) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data);
  }

  return data;
}

export const api = {
  // Auth
  register: (payload) => request("/auth/register", { method: "POST", body: payload }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload }),
  requestOtp: (email) => request("/auth/request-otp", { method: "POST", body: { email } }),
  verifyOtp: (payload) => request("/auth/verify-otp", { method: "POST", body: payload }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),

  // Catalog
  categories: () => request("/categories"),
  explore: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v))
    ).toString();
    return request(`/explore${qs ? `?${qs}` : ""}`);
  },
  mediaItem: (id) => request(`/media/${id}`),
  streamUrl: (id) => `${BASE}/media/${id}/stream`,

  // Dashboard / profile
  dashboard: () => request("/dashboard"),
  myUploads: () => request("/user/my-uploads"),
  editProfile: (payload) => request("/user/profile/edit", { method: "PUT", body: payload }),
  publicProfile: (userId) => request(`/user/${userId}/profile`),

  // Media management
  uploadMedia: (formData) => request("/media/upload", { method: "POST", body: formData, isForm: true }),
  editMedia: (id, payload) => request(`/media/${id}/edit`, { method: "PUT", body: payload }),
  deleteMedia: (id) => request(`/media/${id}/delete`, { method: "DELETE" }),

  // Social
  toggleFollow: (creatorId) => request(`/creator/${creatorId}/follow`, { method: "POST" }),
  toggleLike: (itemId) => request(`/media/${itemId}/like`, { method: "POST" }),

  // Admin
  adminUsers: () => request("/admin/users"),
  adminSetUserStatus: (userId, status) =>
    request(`/admin/user/${userId}/status`, { method: "PUT", body: { status } }),
  adminSetFeatured: (itemId, isFeatured) =>
    request(`/admin/media/${itemId}/feature`, { method: "PUT", body: { is_featured: isFeatured } }),
};

export { ApiError };
