
// shared/api/client.js
export const createProduct = (axiosInstance) => {
  return {
    getProducts: () => axiosInstance.get("/products"),
    addProduct : data => axiosInstance.post("/products", data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    updateProduct : (id, data) => axiosInstance.put(`/products/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    deleteProduct: id => axiosInstance.delete(`/products/${id}`)
  };
};

export const createStore = (axiosInstance) => {
  return {
    getStore: (slug, searchQuery) => {
      const url = searchQuery
        ? `${slug}?search=${encodeURIComponent(searchQuery)}`
        : `${slug}`;

      return axiosInstance.get(`/store/${url}`)
    },
  };
};


export const createAuth = (API) => {
  return {
    postLogin: (data) => API.post("/auth/login", data),
    putRegistration: (data) => API.put("/auth/register", data)
  }
}


