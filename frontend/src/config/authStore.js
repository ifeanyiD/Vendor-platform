let accessToken = null;
let vendor = null;

export const authStore = {
  getToken: () => accessToken,
  setToken: (t) => (accessToken = t),

  getVendor: () => vendor,
  setVendor: (v) => (vendor = v),

  clear: () => {
    accessToken = null;
    vendor = null;
  }
};