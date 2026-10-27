import type { AuthProvider } from "ra-core";

import type { Sale } from "../../types";
import { canAccess } from "../commons/canAccess";
import { dataProvider } from "./dataProvider";

const DEFAULT_AVATAR_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#0d82e4"/><text x="32" y="41" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#fff" text-anchor="middle">DK</text></svg>';

export const DEFAULT_USER = {
  id: 0,
  first_name: "Dilip",
  last_name: "Kumar",
  email: "dilip@zephvion.com",
  password: "demo",
  administrator: true,
  avatar: {
    src: `data:image/svg+xml,${encodeURIComponent(DEFAULT_AVATAR_SVG)}`,
  },
} as const;

export const USER_STORAGE_KEY = "user";

localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ ...DEFAULT_USER }));

async function getUser(email: string) {
  const sales = await dataProvider.getList("sales", {
    pagination: { page: 1, perPage: 200 },
    sort: { field: "name", order: "ASC" },
  });

  if (!sales.data.length) {
    return { ...DEFAULT_USER };
  }

  const user = sales.data.find((sale) => sale.email === email);
  if (!user || user.disabled) {
    return { ...DEFAULT_USER };
  }
  return user;
}

export const authProvider: AuthProvider = {
  login: async ({ email }) => {
    const user = await getUser(email);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    return Promise.resolve();
  },
  resetPassword: async () => {
    // FakeRest doesn't send real emails. Keep this async to mimic network latency.
    await new Promise((resolve) => setTimeout(resolve, 250));
    return;
  },
  setPassword: async () => {
    // FakeRest doesn't persist auth credentials. This is only for local UX testing.
    await new Promise((resolve) => setTimeout(resolve, 250));
    return;
  },
  logout: () => {
    localStorage.removeItem(USER_STORAGE_KEY);
    return Promise.resolve();
  },
  checkError: () => Promise.resolve(),
  checkAuth: () =>
    localStorage.getItem(USER_STORAGE_KEY)
      ? Promise.resolve()
      : Promise.reject(),
  canAccess: async ({ signal: _signal, ...params }) => {
    // Get the current user
    const userItem = localStorage.getItem(USER_STORAGE_KEY);
    const localUser = userItem ? (JSON.parse(userItem) as Sale) : null;
    if (!localUser) return false;

    // Compute access rights from the sale role
    const role = localUser.administrator ? "admin" : "user";
    return canAccess(role, params);
  },
  getIdentity: () => {
    const userItem = localStorage.getItem(USER_STORAGE_KEY);
    const user = userItem ? (JSON.parse(userItem) as Sale) : null;
    return Promise.resolve({
      id: user?.id ?? 0,
      fullName: user ? `${user.first_name} ${user.last_name}` : "Dilip Kumar",
      avatar: user?.avatar?.src,
    });
  },
  async getAuthorizationDetails() {
    await new Promise((resolve) => setTimeout(resolve, 500));
    // return dummy data to avoid errors in OAuthConsentPage
    return {
      data: {
        authorization_id: "dummy",
        user: {
          id: "0",
          email: "johndoe@example.com",
        },
        client: {
          name: "Dummy Client",
        },
        scope: "openid profile email phone",
        redirect_uri: "https://example.com/auth_callback",
      },
      error: null,
    };
  },
  async approveAuthorization() {
    // return dummy success response
    return {
      data: {
        redirect_url: "https://example.com/auth_callback",
      },
      error: null,
    };
  },
  async denyAuthorization() {
    // return dummy denied response
    return {
      data: {
        redirect_url: "https://example.com/denied",
      },
      error: null,
    };
  },
};
