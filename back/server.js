const express = require('express');
const multer = require('multer');
const mysql = require('mysql2');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

require('dotenv').config();
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const webpush = require('web-push');

const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
webpush.setVapidDetails(process.env.VAPID_MAILTO || 'mailto:soporte@century21.com', publicVapidKey, privateVapidKey);

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
const PORT = process.env.PORT || 3000;

app.use(cors()); 

// ==========================================
// AJUSTE: LÍMITES AMPLIADOS PARA PETICIONES PESADAS
// ==========================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ==========================================
// ENMASCARAMIENTO DE RUTAS (URLs Limpias)
// ==========================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../front/a_cliente/index.html'));
});

app.get('/admin', (req, res) => {
    res.redirect('/admin/clientes.html');
});

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
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '', 
    database: process.env.DB_NAME || 'crm_inmobiliario',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Auto-migración de comisiones históricas nulas usando la fórmula real C21
db.query(`UPDATE ventas_cerradas 
          SET comision = CASE 
            WHEN notas LIKE '%compartida%' OR notas LIKE '%compartido%' THEN (precio_venta * 0.06 * 0.92 * 0.45) / 2
            ELSE (precio_venta * 0.06 * 0.92 * 0.45)
          END 
          WHERE comision IS NULL`, (err, result) => {
    if (err) {
        console.error("⚠️ Error en auto-migración de comisiones:", err.message);
    } else if (result.affectedRows > 0) {
        console.log(`✅ Auto-migradas ${result.affectedRows} comisiones históricas de NULL a la nueva fórmula C21.`);
    }
});

// ==========================================
// RUTA DE LOGIN (NO PROTEGIDA)
// ==========================================
app.post('/api/admin/login', async (req, res) => {
    const { usuario_o_correo, password } = req.body;
    if (!usuario_o_correo || !password) {
        return res.status(400).json({ status: 'error', message: 'Faltan credenciales.' });
    }

    try {
        const query = 'SELECT * FROM usuarios WHERE username = ? OR correo = ?';
        db.execute(query, [usuario_o_correo, usuario_o_correo], async (err, results) => {
            if (err) return res.status(500).json({ status: 'error', message: 'Error de base de datos.' });
            
            if (results.length === 0) {
                return res.status(401).json({ status: 'error', message: 'Usuario incorrecto.' });
            }

            const user = results[0];

            if (user.estado === 'inactivo') {
                return res.status(403).json({ status: 'error', message: 'Tu cuenta está inactiva. Contacta al administrador.' });
            }

            const validPassword = await bcrypt.compare(password, user.password_hash);
            
            if (!validPassword) {
                return res.status(401).json({ status: 'error', message: 'Contraseña incorrecta.' });
            }

            const token = jwt.sign(
                { id: user.id, username: user.username, rol: user.rol, nombre_completo: user.nombre_completo }, 
                process.env.JWT_SECRET, 
                { expiresIn: '365d' }
            );
            
            res.json({ status: 'success', token, message: 'Login exitoso' });
        });
    } catch (e) {
        res.status(500).json({ status: 'error', message: 'Error interno del servidor.' });
    }
});

// ==========================================
// MIDDLEWARE DE PROTECCIÓN PARA TODAS LAS RUTAS ADMIN
// ==========================================
const verificarToken = (req, res, next) => {
    let token = req.headers['authorization'];
    if (token && token.startsWith('Bearer ')) {
        token = token.slice(7, token.length);
    } else if (req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({ status: 'unauthorized', message: 'Acceso denegado. Se requiere iniciar sesión.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'century21_secreto_super_seguro_2026');
        req.usuario = decoded;
        next();
    } catch (ex) {
        res.status(401).json({ status: 'unauthorized', message: 'Sesión expirada o token inválido.' });
    }
};

app.use('/api/admin', verificarToken);

// ==========================================
// PUSH NOTIFICATIONS SUBSCRIPTION
// ==========================================
app.post('/api/admin/push/subscribe', (req, res) => {
    const subscription = req.body;
    const userId = req.usuario.id;
    const q = 'UPDATE usuarios SET push_subscription = ? WHERE id = ?';
    db.execute(q, [JSON.stringify(subscription), userId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Subscribed successfully' });
    });
});

app.post('/api/admin/push/unsubscribe', (req, res) => {
    const userId = req.usuario.id;
    const q = 'UPDATE usuarios SET push_subscription = NULL WHERE id = ?';
    db.execute(q, [userId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: 'Unsubscribed successfully' });
    });
});

// ==========================================
// NOTIFICACIONES GLOBALES (SSE)
// ==========================================
const sseClients = new Set();

app.get('/api/admin/sse', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Evita que Nginx bloquee los eventos
    
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
// RUTA 1: SUBIR FICHAS TÉCNICAS AL INVENTARIO (AJUSTADA PARA VENV)
// ==========================================

// Función reutilizable para ejecutar el Python
function ejecutarProcesoPython(rutasArchivos, extraArgs = '') {
    const scriptPath = path.join(__dirname, 'importador_pdf.py');
    const rutas = Array.isArray(rutasArchivos) ? rutasArchivos.map(f => `"${f}"`).join(' ') : `"${rutasArchivos}"`;
    const comando = `"/home/ceciramirez066/C21/back/venv/bin/python" "${scriptPath}" ${rutas} ${extraArgs}`;

    exec(comando, (error, stdout, stderr) => {
        // Limpiar archivos temporales
        const archivosArr = Array.isArray(rutasArchivos) ? rutasArchivos : [rutasArchivos];
        archivosArr.forEach(filePath => { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); });

        if (error) {
            console.error(`❌ Error en IA: ${error.message}`);
            broadcastSSE({ type: 'pdf_status', status: 'error', message: 'Hubo un error al procesar las fichas técnicas.' });
            return;
        }
        console.log(`🖥️ Respuesta IA:\n${stdout}`);
        
        // Extraer los IDs creados del stdout del script de Python
        const idsGuardados = [...stdout.matchAll(/Guardado exitoso con ID: (\w+)/g)].map(m => m[1]);
        
        broadcastSSE({ 
            type: 'pdf_status', 
            status: 'success', 
            message: `¡${archivosArr.length} ficha(s) indexada(s) con éxito por la IA!`,
            nuevosIds: idsGuardados
        });
    });
}

app.post('/api/admin/subir-fichas', upload, (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ status: 'error', message: 'No se enviaron archivos.' });
    }

    // 1. Responder de INMEDIATO al frontend para liberar la UI
    res.json({ status: 'success', message: 'Tus archivos se están procesando en segundo plano con Inteligencia Artificial. Recibirás una notificación al terminar.' });

    console.log(`\n🤖 Node.js recibió ${req.files.length} archivo(s). Verificando duplicados...`);

    // 2. PRE-CHECK: Separar archivos en "nuevos" y "duplicados"
    const archivosSinDuplicado = [];
    let pendientes = req.files.length;

    req.files.forEach(file => {
        const matchId = file.originalname.match(/\(([^)]+)\)/);
        const idDetectado = matchId ? matchId[1] : null;

        if (!idDetectado) {
            // No tiene ID en el nombre, procesamos normal
            archivosSinDuplicado.push(path.resolve(file.path));
            pendientes--;
            if (pendientes === 0) procesarRestantes();
            return;
        }

        // Buscar en DB si el ID ya existe
        db.query('SELECT id_propiedad, titulo FROM propiedades WHERE id_propiedad = ?', [idDetectado], (err, rows) => {
            if (!err && rows.length > 0) {
                // ¡Duplicado! Enviar alerta SSE y guardar la ruta temporal
                console.log(`⚠️ Propiedad duplicada detectada: ${idDetectado} (${rows[0].titulo})`);
                broadcastSSE({
                    type: 'pdf_status',
                    status: 'duplicated_check',
                    id_propiedad: idDetectado,
                    titulo: rows[0].titulo,
                    temp_path: path.resolve(file.path),
                    message: `La propiedad con ID ${idDetectado} ya está registrada.`
                });
            } else {
                // No existe, lo añadimos a la cola de procesamiento normal
                archivosSinDuplicado.push(path.resolve(file.path));
            }
            pendientes--;
            if (pendientes === 0) procesarRestantes();
        });
    });

    function procesarRestantes() {
        if (archivosSinDuplicado.length > 0) {
            ejecutarProcesoPython(archivosSinDuplicado);
        }
    }
});

// ==========================================
// RUTA 1.5: CONFIRMAR/CANCELAR ACTUALIZACIÓN DE PROPIEDAD DUPLICADA
// ==========================================
app.post('/api/admin/confirmar-actualizacion', (req, res) => {
    const { temp_path, forzar } = req.body;
    
    if (!temp_path) {
        return res.status(400).json({ status: 'error', message: 'No se proporcionó la ruta del archivo.' });
    }

    if (forzar) {
        // El usuario dijo "Sí, actualiza"
        console.log(`🔄 Usuario confirmó actualización forzada para: ${temp_path}`);
        ejecutarProcesoPython(temp_path, '--forzar');
        return res.json({ status: 'success', message: 'Procesando actualización...' });
    } else {
        // El usuario dijo "Cancelar" → borramos el PDF temporal
        console.log(`🗑️ Usuario canceló. Eliminando temporal: ${temp_path}`);
        if (fs.existsSync(temp_path)) fs.unlinkSync(temp_path);
        broadcastSSE({ type: 'pdf_status', status: 'info', message: 'Operación cancelada por el usuario.' });
        return res.json({ status: 'success', message: 'Operación cancelada.' });
    }
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

        // Enviar Push a los administradores
        db.query('SELECT push_subscription FROM usuarios WHERE push_subscription IS NOT NULL', (err, rows) => {
            if (!err && rows && rows.length > 0) {
                const payload = JSON.stringify({
                    title: '¡Nuevo Prospecto!',
                    body: `${nombre} busca un(a) ${tipo_propiedad} en ${zona_interes}`,
                    icon: '/assets/icons/c21.png',
                    data: { url: `/admin/clientes.html?nuevoId=${result.insertId}` }
                });
                rows.forEach(row => {
                    try {
                        const sub = typeof row.push_subscription === 'string' ? JSON.parse(row.push_subscription) : row.push_subscription;
                        webpush.sendNotification(sub, payload).catch(e => console.error("Error al enviar Push:", e.message));
                    } catch(e) { console.error("Error parsing subscription:", e); }
                });
            }
        });

        // ENVIAR EVENTO EN TIEMPO REAL AL DASHBOARD
        if (typeof broadcastSSE === 'function') {
            broadcastSSE({ type: 'nuevo_prospecto', nuevoId: result.insertId, message: '¡Nuevo prospecto registrado!' });
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
// RUTA DE ESTADÍSTICAS (ANALYTICS)
// ==========================================
// RUTA DE ESTADÍSTICAS (ANALYTICS)
// ==========================================
app.get('/api/admin/estadisticas', (req, res) => {
    const { mes, motivo_descarte } = req.query;
    const prospectosParams = [];
    let prospectosWhere = '';
    if (mes && mes !== 'Todos') {
        prospectosWhere += " AND DATE_FORMAT(fecha_registro, '%Y-%m') = ?";
        prospectosParams.push(mes);
    }
    if (motivo_descarte && motivo_descarte !== 'Todos') {
        if (motivo_descarte === '__SIN_MOTIVO__') {
            prospectosWhere += " AND motivo_descarte IS NULL";
        } else {
            prospectosWhere += " AND motivo_descarte = ?";
            prospectosParams.push(motivo_descarte);
        }
    }

    const ventasParams = [];
    let ventasWhere = '';
    let ventasWhereJoined = '';
    if (mes && mes !== 'Todos') {
        ventasWhere += " AND DATE_FORMAT(fecha_cierre, '%Y-%m') = ?";
        ventasWhereJoined += " AND DATE_FORMAT(v.fecha_cierre, '%Y-%m') = ?";
        ventasParams.push(mes);
    }

    const q1 = "SELECT estado_seguimiento, COUNT(*) as total FROM clientes_prospectos WHERE 1=1" + prospectosWhere + " GROUP BY estado_seguimiento";
    const q2 = "SELECT zona_interes, COUNT(*) as total FROM clientes_prospectos WHERE 1=1" + prospectosWhere + " GROUP BY zona_interes ORDER BY total DESC LIMIT 5";
    const q3 = "SELECT motivo_descarte, COUNT(*) as total FROM clientes_prospectos WHERE estado_seguimiento = 'Descartado'" + prospectosWhere + " GROUP BY motivo_descarte";
    
    // Ventas por mes (últimos 12 meses)
    const q4 = `SELECT 
        DATE_FORMAT(fecha_cierre, '%Y-%m') as mes,
        COUNT(*) as cantidad,
        SUM(precio_venta) as ingreso_total,
        SUM(comision) as comision_total,
        tipo_operacion
        FROM ventas_cerradas 
        WHERE fecha_cierre >= DATE_SUB(NOW(), INTERVAL 12 MONTH)` + ventasWhere + `
        GROUP BY mes, tipo_operacion
        ORDER BY mes ASC`;
    
    // Resumen general de ventas
    const q5 = `SELECT 
        COUNT(*) as total_ventas,
        COALESCE(SUM(precio_venta), 0) as ingreso_total,
        COALESCE(SUM(comision), 0) as comision_total,
        COALESCE(MAX(precio_venta), 0) as venta_max,
        COALESCE(AVG(precio_venta), 0) as venta_promedio
        FROM ventas_cerradas` + ventasWhere + `;`;
    
    // Total prospectos para tasa de conversión
    const q6 = "SELECT COUNT(*) as total FROM clientes_prospectos WHERE 1=1" + prospectosWhere;
    
    // Tiempo promedio de cierre (días entre registro y cierre)
    const q7 = `SELECT COALESCE(AVG(DATEDIFF(fecha_cierre, fecha_registro)), 0) as dias_promedio 
        FROM clientes_prospectos 
        WHERE estado_seguimiento = 'Cerrado' AND fecha_cierre IS NOT NULL` + prospectosWhere + `;`;
    
    // Distribución por tipo de operación
    const q8 = `SELECT tipo_operacion, COUNT(*) as total, SUM(precio_venta) as monto 
        FROM ventas_cerradas WHERE 1=1` + ventasWhere + ` GROUP BY tipo_operacion`;
    
    // Detalle de descartados con nombre y motivo
    const q9 = `SELECT nombre, motivo_descarte, fecha_registro, zona_interes, presupuesto_max 
        FROM clientes_prospectos 
        WHERE estado_seguimiento = 'Descartado'` + prospectosWhere + ` 
        ORDER BY fecha_registro DESC`;

    const q10 = `SELECT v.id, c.nombre, p.titulo AS propiedad_titulo, v.tipo_operacion, v.precio_venta, v.comision, v.fecha_cierre, c.zona_interes 
        FROM ventas_cerradas v 
        LEFT JOIN clientes_prospectos c ON v.id_cliente = c.id_cliente 
        LEFT JOIN propiedades p ON v.id_propiedad COLLATE utf8mb4_unicode_ci = p.id_propiedad COLLATE utf8mb4_unicode_ci
        WHERE 1=1` + ventasWhereJoined + `
        ORDER BY v.fecha_cierre DESC
        LIMIT 100`;

    db.query(q1, prospectosParams, (err, estados) => {
        if(err) return res.status(500).json({error: err.message});
        db.query(q2, prospectosParams, (err, zonas) => {
            if(err) return res.status(500).json({error: err.message});
            db.query(q3, prospectosParams, (err, perdidas) => {
                if(err) return res.status(500).json({error: err.message});
                db.query(q4, ventasParams, (err, ventasMensuales) => {
                    if(err) return res.status(500).json({error: err.message});
                    db.query(q5, ventasParams, (err, resumenVentas) => {
                        if(err) return res.status(500).json({error: err.message});
                        db.query(q6, prospectosParams, (err, totalProspectos) => {
                            if(err) return res.status(500).json({error: err.message});
                            db.query(q7, prospectosParams, (err, tiempoCierre) => {
                                if(err) return res.status(500).json({error: err.message});
                                db.query(q8, ventasParams, (err, distribOperacion) => {
                                    if(err) return res.status(500).json({error: err.message});
                                    db.query(q9, prospectosParams, (err, detalleDescartados) => {
                                        if(err) return res.status(500).json({error: err.message});
                                        db.query(q10, ventasParams, (err, ventasCerradas) => {
                                            if(err) return res.status(500).json({error: err.message});
                                            const rv = resumenVentas[0] || {};
                                            const totalP = totalProspectos[0]?.total || 0;
                                            const tasaConversion = totalP > 0 ? ((rv.total_ventas / totalP) * 100).toFixed(1) : 0;
                                            res.json({
                                                estados,
                                                zonas,
                                                perdidas,
                                                detalleDescartados,
                                                ventasMensuales,
                                                ventasCerradas,
                                                resumen: {
                                                    total_ventas: rv.total_ventas || 0,
                                                    ingreso_total: parseFloat(rv.ingreso_total) || 0,
                                                    comision_total: parseFloat(rv.comision_total) || 0,
                                                    venta_max: parseFloat(rv.venta_max) || 0,
                                                    venta_promedio: parseFloat(rv.venta_promedio) || 0,
                                                    tasa_conversion: parseFloat(tasaConversion),
                                                    dias_promedio_cierre: Math.round(tiempoCierre[0]?.dias_promedio || 0),
                                                    total_prospectos: totalP,
                                                    total_descartados: perdidas.reduce((sum, p) => sum + p.total, 0)
                                                },
                                                distribOperacion
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

// ==========================================
// RUTA: REGISTRAR UNA VENTA CERRADA
// ==========================================
app.post('/api/admin/ventas/registrar', (req, res) => {
    const { id_cliente, id_propiedad, precio_venta, tipo_operacion, notas, comision_porcentaje, comision_compartida, comision } = req.body;
    
    if (!id_cliente || !precio_venta) {
        return res.status(400).json({ status: 'error', message: 'Faltan datos obligatorios (cliente y precio).' });
    }

    const parsedPrecio = parseFloat(precio_venta);
    const parsedComisionPct = parseFloat(comision_porcentaje);
    const isCompartida = comision_compartida === 1 || comision_compartida === true;

    let comisionFinal;
    if (!Number.isNaN(parsedComisionPct) && parsedComisionPct >= 0) {
        // Fórmula de Comisión Century 21 Real:
        // 1. Comisión Bruta Oficina = Precio de venta * (Porcentaje de comisión total / 100)
        const comisionTotal = parsedPrecio * (parsedComisionPct / 100);
        // 2. Neto Oficina tras deducir 8% de regalías a Century 21 México
        const netoOficina = comisionTotal * 0.92;
        // 3. Comisión Agente (45% del Neto Oficina)
        const comisionAgente = netoOficina * 0.45;
        // 4. Dividido entre 2 si es compartida con otro asesor
        comisionFinal = isCompartida ? (comisionAgente / 2) : comisionAgente;
        comisionFinal = parseFloat(comisionFinal.toFixed(2));
    } else {
        const parsedComision = parseFloat(comision);
        comisionFinal = (!Number.isNaN(parsedComision) && parsedComision >= 0) ? parsedComision : parseFloat((parsedPrecio * 0.06 * 0.92 * 0.45).toFixed(2));
    }

    const qInsert = `INSERT INTO ventas_cerradas (id_cliente, id_propiedad, precio_venta, comision, tipo_operacion, notas, registrado_por)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [id_cliente, id_propiedad || null, parsedPrecio, comisionFinal, tipo_operacion || 'Venta', notas || null, req.usuario.id];

    db.query(qInsert, params, (err) => {
        if (err) return res.status(500).json({ status: 'error', message: 'Error al registrar la venta: ' + err.message });

        // Actualizar estado del cliente a Cerrado y guardar fecha_cierre
        db.query('UPDATE clientes_prospectos SET estado_seguimiento = ?, fecha_cierre = CURRENT_TIMESTAMP WHERE id_cliente = ?', 
            ['Cerrado', id_cliente], (err2) => {
                if (err2) console.error('Error al actualizar estado del cliente:', err2.message);
                
                // Marcar propiedad como no disponible si se vinculó una
                if (id_propiedad) {
                    db.query("UPDATE propiedades SET estatus_propiedad = 'No Disponible' WHERE id_propiedad = ?", [id_propiedad], () => {});
                }
                
                res.json({ status: 'success', message: '¡Venta registrada exitosamente!', comision: comisionFinal });
            }
        );
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
                
                // Fuzzy Match de Tipo
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
                const presupuestoExtendido = precio <= (maxPresupuesto * 1.30);

                // Reglas de Clasificación
                if (coincideTipoProp && coincideOperacion && coincideZona && dentroPresupuesto) {
                    exactas.push(prop);
                } else {
                    if (coincideTipoProp && coincideOperacion && coincideZona && !dentroPresupuesto && presupuestoExtendido) {
                        alternativas.push(prop);
                    }
                    else if (coincideTipoProp && coincideOperacion && !coincideZona && dentroPresupuesto) {
                        alternativas.push(prop);
                    }
                    else if (coincideTipoProp && coincideZona && dentroPresupuesto && !coincideOperacion) {
                        alternativas.push(prop);
                    }
                }
            });

            alternativas.sort((a, b) => parseFloat(a.precio) - parseFloat(b.precio));

            res.json({
                status: 'success',
                cliente: cliente,
                coincidencias_exactas: exactas,
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
    const { estado, motivo } = req.body;
    let query = 'UPDATE clientes_prospectos SET estado_seguimiento = ? WHERE id_cliente = ?';
    let params = [estado, id];
    
    if (estado === 'Descartado') {
        query = 'UPDATE clientes_prospectos SET estado_seguimiento = ?, motivo_descarte = ? WHERE id_cliente = ?';
        params = [estado, motivo || 'Otro', id];
    } else {
        query = 'UPDATE clientes_prospectos SET estado_seguimiento = ?, motivo_descarte = NULL WHERE id_cliente = ?';
    }

    db.query(query, params, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'success', message: 'Estado actualizado' });
    });
});

app.put('/api/admin/clientes/:id/contacto', (req, res) => {
    const { id } = req.params;
    db.query('UPDATE clientes_prospectos SET fecha_ultimo_contacto = CURRENT_TIMESTAMP WHERE id_cliente = ?', [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'success' });
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

// ==========================================
// RUTA 8 (BIS): AUTENTICACIÓN GOOGLE CALENDAR
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
            maxResults: 250,
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

    const fechaCita = new Date(startDateTime);
    const ahora = new Date();
    if (fechaCita < ahora) {
        return res.status(400).json({ status: 'error', message: 'No puedes agendar una cita en una fecha u hora del pasado.' });
    }

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

// ==========================================
// RUTA 11: EDITAR CITA EN GOOGLE CALENDAR
// ==========================================
app.put('/api/admin/calendario/:id', async (req, res) => {
    if (!fs.existsSync(TOKEN_PATH)) {
        return res.json({ status: 'unauthorized', message: 'No has iniciado sesión con Google.' });
    }

    const eventId = req.params.id;
    const { summary, description, location, startDateTime, endDateTime } = req.body;

    const fechaCita = new Date(startDateTime);
    const ahora = new Date();
    if (fechaCita < ahora) {
        return res.status(400).json({ status: 'error', message: 'No puedes reprogramar a una fecha del pasado.' });
    }

    try {
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        
        const event = {
            summary: summary,
            location: location,
            description: description,
            start: { dateTime: startDateTime, timeZone: 'America/Mexico_City' },
            end: { dateTime: endDateTime, timeZone: 'America/Mexico_City' }
        };

        const response = await calendar.events.update({
            calendarId: 'primary',
            eventId: eventId,
            resource: event,
        });

        res.json({ status: 'success', message: 'Cita actualizada exitosamente.', data: response.data });
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ status: 'error', message: 'Error al actualizar la cita.' });
    }
});

// ==========================================
// RUTA 12: ELIMINAR CITA EN GOOGLE CALENDAR
// ==========================================
app.delete('/api/admin/calendario/:id', async (req, res) => {
    if (!fs.existsSync(TOKEN_PATH)) {
        return res.json({ status: 'unauthorized', message: 'No has iniciado sesión con Google.' });
    }

    const eventId = req.params.id;

    try {
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        await calendar.events.delete({
            calendarId: 'primary',
            eventId: eventId,
        });

        res.json({ status: 'success', message: 'Cita correcta.' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ status: 'error', message: 'Error al eliminar la cita.' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor CRM Backend corriendo en http://localhost:${PORT}`);
});