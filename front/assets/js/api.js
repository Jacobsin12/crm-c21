// Configuración global de la API del Backend
// En local usa localhost:3000, en producción usa la misma URL del servidor
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api'
    : window.location.origin + '/api';

// Exportamos la URL para que las otras pantallas la puedan usar
window.API_BASE_URL = API_BASE_URL;