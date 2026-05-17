const express = require('express');
const multer = require('multer');
const mysql = require('mysql2');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

require('dotenv').config();
const { google } = require('googleapis');

// ==========================================
// CONFIGURACIÓN DE GOOGLE CALENDAR API
// ==========================================
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

const TOKEN_PATH = path.join(__dirname, 'google_token.json');
// Cargar token si existe
if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oauth2Client.setCredentials(token);
}

const app = express();
const PORT = 3000;

app.use(cors()); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir la carpeta del frontend como archivos estáticos para evitar errores de CORS y Service Worker en origin 'null'
app.use(express.static(path.join(__dirname, '../front')));

// ==========================================
// CARPETA TEMPORAL PARA SUBIR PDFs
// ==========================================
const uploadDir = path.join(__dirname, 'uploads_temp');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (path.extname(file.originalname).toLowerCase() === '.pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos PDF.'));
        }
    }
}).array('fichas', 5);

// ==========================================
// CONEXIÓN A TU MYSQL LOCAL
// ==========================================
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '0512', 
    database: 'crm_inmobiliario',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ==========================================
// NOTIFICACIONES GLOBALES (SSE)
// ==========================================
const sseClients = new Set();

app.get('/api/admin/sse', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Enviar comentario inicial para mantener conexión
    res.write(': keep-alive\n\n');
    
    sseClients.add(res);
    req.on('close', () => { sseClients.delete(res); });
});

function broadcastSSE(data) {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    sseClients.forEach(client => client.write(payload));
}

// ==========================================
// RUTA 1: SUBIR FICHAS TÉCNICAS AL INVENTARIO
// ==========================================
app.post('/api/admin/subir-fichas', upload, (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ status: 'error', message: 'No se enviaron archivos.' });
    }

    // 1. Responder de INMEDIATO al frontend para liberar la UI
    res.json({ status: 'success', message: 'Tus archivos se están procesando en segundo plano con Inteligencia Artificial. Recibirás una notificación al terminar.' });

    // 2. Procesamiento asíncrono
    const rutasArchivos = req.files.map(f => `"${path.resolve(f.path)}"`).join(' ');
    console.log(`\n🤖 Node.js recibió ${req.files.length} archivo(s). Procesando en segundo plano...`);

    const scriptPath = path.join(__dirname, 'importador_pdf.py');
    const comando = `python "${scriptPath}" ${rutasArchivos}`;

    exec(comando, (error, stdout, stderr) => {
        req.files.forEach(file => { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); });

        if (error) {
            console.error(`❌ Error en IA: ${error.message}`);
            broadcastSSE({ type: 'pdf_status', status: 'error', message: 'Hubo un error al procesar las fichas técnicas.' });
            return;
        }
        console.log(`🖥️ Respuesta IA:\n${stdout}`);
        
        // Extraer IDs guardados de los logs de stdout si es posible, o solo mandar éxito genérico
        broadcastSSE({ type: 'pdf_status', status: 'success', message: `¡${req.files.length} ficha(s) indexada(s) con éxito por la IA!` });
    });
});

// ==========================================
// RUTA 2: RECIBIR PERFILAMIENTO DEL CLIENTE (FORMULARIO)
// ==========================================
app.post('/api/clientes/perfilar', (req, res) => {
    const { nombre, telefono, correo, tipo_propiedad, tipo_operacion, presupuesto_max, zona_interes, especificaciones } = req.body;

    const query = `
        INSERT INTO clientes_prospectos 
        (nombre, telefono, correo, tipo_propiedad_buscada, tipo_operacion_buscada, presupuesto_max, zona_interes, especificaciones_clave)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.execute(query, [nombre, telefono, correo, tipo_propiedad, tipo_operacion, presupuesto_max, zona_interes, especificaciones], (err, result) => {
        if (err) {
            console.error("❌ Error al guardar perfilamiento:", err.message);
            return res.status(500).json({ status: 'error', message: 'Error interno al guardar los datos.' });
        }
        res.json({ status: 'success', message: '¡Perfilamiento registrado con éxito! Tu asesor se comunicará contigo.' });
    });
});

// ==========================================
// RUTA 3: LISTAR TODOS LOS CLIENTES (DASHBOARD ADMIN)
// ==========================================
app.get('/api/admin/clientes', (req, res) => {
    db.query('SELECT * FROM clientes_prospectos ORDER BY fecha_registro DESC', (err, results) => {
        if (err) {
            console.error("❌ Error al traer clientes:", err.message);
            return res.status(500).json({ status: 'error', message: 'Error al consultar clientes.' });
        }
        res.json({ status: 'success', data: results });
    });
});

// ==========================================
// RUTA 4: MOTOR DE EMPAREJAMIENTO AUTOMÁTICO (MATCHMAKING)
// ==========================================
app.get('/api/admin/match/:id_cliente', (req, res) => {
    const idCliente = req.params.id_cliente;

    db.execute('SELECT * FROM clientes_prospectos WHERE id_cliente = ?', [idCliente], (err, clienteResults) => {
        if (err || clienteResults.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Cliente no encontrado.' });
        }

        const cliente = clienteResults[0];
        const queryPropiedades = `SELECT * FROM propiedades WHERE estatus_propiedad = 'Disponible'`;

        db.query(queryPropiedades, (err, propiedades) => {
            if (err) return res.status(500).json({ status: 'error', message: 'Error al buscar propiedades.' });

            // Función para limpiar acentos y mayúsculas
            const normalizar = (texto) => texto ? texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
            
            // Extraer palabras clave de la zona del cliente
            const palabrasCliente = normalizar(cliente.zona_interes)
                .split(/[\s,]+/)
                .filter(p => p.length > 3 || ['sur', 'norte', 'este', 'oeste'].includes(p));

            if (palabrasCliente.includes('sakia') && !palabrasCliente.includes('zakia')) palabrasCliente.push('zakia');
            if (palabrasCliente.includes('zakia') && !palabrasCliente.includes('sakia')) palabrasCliente.push('sakia');

            const clienteTipoProp = normalizar(cliente.tipo_propiedad_buscada);
            const clienteTipoOp = normalizar(cliente.tipo_operacion_buscada);
            const maxPresupuesto = parseFloat(cliente.presupuesto_max);

            const exactas = [];
            const alternativas = [];

            propiedades.forEach(prop => {
                const precio = parseFloat(prop.precio);
                const zonaProp = normalizar(prop.zona) + " " + normalizar(prop.direccion) + " " + normalizar(prop.titulo);
                const tipoProp = normalizar(prop.tipo_propiedad);
                const tipoOp = normalizar(prop.tipo_operacion);
                
                // Fuzzy Match de Tipo (Casa vs Casa en Condominio, Local vs Locales)
                let coincideTipoProp = false;
                if (clienteTipoProp) {
                    if (clienteTipoProp.includes('local')) coincideTipoProp = tipoProp.includes('local');
                    else coincideTipoProp = tipoProp.includes(clienteTipoProp) || clienteTipoProp.includes(tipoProp);
                } else { coincideTipoProp = true; }

                // Fuzzy Match de Operación
                const coincideOperacion = tipoOp.includes(clienteTipoOp) || clienteTipoOp.includes(tipoOp);

                // Fuzzy Match de Zona
                let coincideZona = false;
                if (palabrasCliente.length === 0) {
                    coincideZona = true;
                } else {
                    coincideZona = palabrasCliente.some(palabra => zonaProp.includes(palabra));
                }

                const dentroPresupuesto = precio <= maxPresupuesto;
                const presupuestoExtendido = precio <= (maxPresupuesto * 1.30); // 30% de flexibilidad

                // Reglas de Clasificación
                if (coincideTipoProp && coincideOperacion && coincideZona && dentroPresupuesto) {
                    // MATCH EXACTO: Todo coincide
                    exactas.push(prop);
                } else {
                    // POSIBLES ALTERNATIVAS
                    // 1. Todo bien, pero ligeramente fuera de presupuesto
                    if (coincideTipoProp && coincideOperacion && coincideZona && !dentroPresupuesto && presupuestoExtendido) {
                        alternativas.push(prop);
                    }
                    // 2. Excelente precio y misma operación/propiedad, pero en otra zona
                    else if (coincideTipoProp && coincideOperacion && !coincideZona && dentroPresupuesto) {
                        alternativas.push(prop);
                    }
                    // 3. (CASO ESPECIAL) Si la zona y presupuesto coinciden, pero la operación es diferente (Ej. Tiene 2 Millones para Renta, ofrecerle Venta)
                    else if (coincideTipoProp && coincideZona && dentroPresupuesto && !coincideOperacion) {
                        alternativas.push(prop);
                    }
                }
            });

            // Ordenar alternativas: Primero las de la misma operación y luego por precio
            alternativas.sort((a, b) => parseFloat(a.precio) - parseFloat(b.precio));

            res.json({
                status: 'success',
                cliente: cliente,
                coincidencias_exactas: exactas,
                // Quitar duplicados por id_propiedad en caso de cualquier error
                alternativas_fuera_presupuesto: [...new Map(alternativas.map(item => [item.id_propiedad, item])).values()]
            });
        });
    });
});

// ==========================================
// RUTA 5: OBTENER TODAS LAS PROPIEDADES (CATÁLOGO / INVENTARIO)
// ==========================================
app.get('/api/admin/propiedades', (req, res) => {
    db.query("SELECT * FROM propiedades ORDER BY estatus_propiedad ASC, precio ASC", (err, results) => {
        if (err) {
            console.error("❌ Error al traer inventario:", err.message);
            return res.status(500).json({ status: 'error', message: 'Error al consultar inventario.' });
        }
        res.json({ status: 'success', data: results });
    });
});

// ==========================================
// RUTA 6: ACTUALIZAR ESTATUS DE PROPIEDAD
// ==========================================
app.put('/api/admin/propiedades/:id/estatus', (req, res) => {
    const { id } = req.params;
    const { estatus } = req.body;
    db.query("UPDATE propiedades SET estatus_propiedad = ? WHERE id_propiedad = ?", [estatus, id], (err) => {
        if (err) return res.status(500).json({ status: 'error', message: 'Error al actualizar estatus de propiedad.' });
        res.json({ status: 'success', message: 'Estatus actualizado' });
    });
});

// ==========================================
// RUTA 7: ACTUALIZAR ESTADO DE SEGUIMIENTO DE CLIENTE
// ==========================================
app.put('/api/admin/clientes/:id/estado', (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    db.query("UPDATE clientes_prospectos SET estado_seguimiento = ? WHERE id_cliente = ?", [estado, id], (err) => {
        if (err) return res.status(500).json({ status: 'error', message: 'Error al actualizar estado del cliente.' });
        res.json({ status: 'success', message: 'Estado actualizado' });
    });
});

// ==========================================
// RUTA 8: ACTUALIZAR ENLACE DE DRIVE DE PROPIEDAD
// ==========================================
app.put('/api/admin/propiedades/:id/drive', (req, res) => {
    const { id } = req.params;
    const { url } = req.body;
    db.query("UPDATE propiedades SET carpeta_drive_fotos = ? WHERE id_propiedad = ?", [url, id], (err) => {
        if (err) return res.status(500).json({ status: 'error', message: 'Error al actualizar enlace de Drive.' });
        res.json({ status: 'success', message: 'Enlace actualizado correctamente' });
    });
});

// Arrancar el servidor
// ==========================================
// RUTA 8: AUTENTICACIÓN GOOGLE CALENDAR
// ==========================================
app.get('/api/auth/google/url', (req, res) => {
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: ['https://www.googleapis.com/auth/calendar.events']
    });
    res.json({ status: 'success', url });
});

app.get('/api/auth/google/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.send('No se proporcionó código de autorización.');
    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        res.send('<script>window.close();</script>Autenticación exitosa. Puedes cerrar esta ventana y recargar tu dashboard.');
    } catch (err) {
        console.error("Error obteniendo tokens de Google:", err);
        res.status(500).send('Error de autenticación.');
    }
});

// ==========================================
// RUTA 9: OBTENER CITAS DE GOOGLE CALENDAR
// ==========================================
app.get('/api/admin/calendario', async (req, res) => {
    if (!fs.existsSync(TOKEN_PATH)) {
        return res.json({ status: 'unauthorized', message: 'No has iniciado sesión con Google.' });
    }
    
    try {
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        
        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: (new Date()).toISOString(),
            maxResults: 15,
            singleEvents: true,
            orderBy: 'startTime',
        });
        
        res.json({ status: 'success', data: response.data.items });
    } catch (error) {
        console.error('Error fetching calendar:', error);
        res.status(500).json({ status: 'error', message: 'Error al conectar con Google Calendar.' });
    }
});

// ==========================================
// RUTA 10: CREAR CITA EN GOOGLE CALENDAR
// ==========================================
app.post('/api/admin/calendario', async (req, res) => {
    if (!fs.existsSync(TOKEN_PATH)) {
        return res.json({ status: 'unauthorized', message: 'No has iniciado sesión con Google.' });
    }

    const { summary, description, location, startDateTime, endDateTime } = req.body;

    try {
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        
        const event = {
            summary: summary,
            location: location,
            description: description,
            start: {
                dateTime: startDateTime,
                timeZone: 'America/Mexico_City',
            },
            end: {
                dateTime: endDateTime,
                timeZone: 'America/Mexico_City',
            },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 },
                    { method: 'popup', minutes: 60 },
                ],
            },
        };

        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
        });

        res.json({ status: 'success', message: 'Cita creada exitosamente.', data: response.data });
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ status: 'error', message: 'Error al crear la cita en Google Calendar.' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor CRM Backend corriendo en http://localhost:${PORT}`);
});