import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  // This tells Axios to send cookies along with the request
  withCredentials: true
})

export default api
