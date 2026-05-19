const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '', 
    database: process.env.DB_NAME || 'crm_inmobiliario',
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
});

console.log("🔍 [PROCESANDO DIAGNÓSTICO DE REPORTES]");
console.log("DB Host:", process.env.DB_HOST || 'localhost');
console.log("DB Name:", process.env.DB_NAME || 'crm_inmobiliario');

// Consulta 1: Contar filas en ventas_cerradas directamente
db.query('SELECT COUNT(*) as count FROM ventas_cerradas', (err, rows) => {
    if (err) {
        console.error("❌ Error en conteo directo:", err.message);
        process.exit(1);
    }
    console.log("📊 Total filas en ventas_cerradas:", rows[0].count);

    // Consulta 2: Ejecutar la consulta Q10 exacta con LEFT JOINs
    const q10 = `SELECT v.id, c.nombre, p.titulo AS propiedad_titulo, v.tipo_operacion, v.precio_venta, v.comision, v.fecha_cierre, c.zona_interes 
        FROM ventas_cerradas v 
        LEFT JOIN clientes_prospectos c ON v.id_cliente = c.id_cliente 
        LEFT JOIN propiedades p ON v.id_propiedad COLLATE utf8mb4_unicode_ci = p.id_propiedad COLLATE utf8mb4_unicode_ci
        WHERE 1=1
        ORDER BY v.fecha_cierre DESC
        LIMIT 100`;

    db.query(q10, (err2, rows2) => {
        if (err2) {
            console.error("❌ Error en consulta Q10 con Joins:", err2.message);
            process.exit(1);
        }
        console.log("📋 Filas devueltas por Q10:", rows2.length);
        console.log("📝 Detalle de filas devueltas:");
        console.log(JSON.stringify(rows2, null, 2));

        // Consulta 3: Verificar si el cliente existe
        db.query('SELECT id_cliente, nombre, estado_seguimiento FROM clientes_prospectos', (err3, rows3) => {
            if (err3) {
                console.error("❌ Error al traer prospectos:", err3.message);
                process.exit(1);
            }
            console.log("👥 Listado de prospectos en BD:");
            console.log(JSON.stringify(rows3, null, 2));
            db.end();
        });
    });
});
