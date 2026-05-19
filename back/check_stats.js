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

console.log("🔍 [DIAGNÓSTICO COMPLETO DE ERRORES 500]");
const mes = '2026-05';
const motivo_descarte = 'Todos';

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

const queries = {
    q1: "SELECT estado_seguimiento, COUNT(*) as total FROM clientes_prospectos WHERE 1=1" + prospectosWhere + " GROUP BY estado_seguimiento",
    q2: "SELECT zona_interes, COUNT(*) as total FROM clientes_prospectos WHERE 1=1" + prospectosWhere + " GROUP BY zona_interes ORDER BY total DESC LIMIT 5",
    q3: "SELECT motivo_descarte, COUNT(*) as total FROM clientes_prospectos WHERE estado_seguimiento = 'Descartado'" + prospectosWhere + " GROUP BY motivo_descarte",
    q4: `SELECT 
        DATE_FORMAT(fecha_cierre, '%Y-%m') as mes,
        COUNT(*) as cantidad,
        SUM(precio_venta) as ingreso_total,
        SUM(comision) as comision_total,
        tipo_operacion
        FROM ventas_cerradas 
        WHERE fecha_cierre >= DATE_SUB(NOW(), INTERVAL 12 MONTH)` + ventasWhere + `
        GROUP BY mes, tipo_operacion
        ORDER BY mes ASC`,
    q5: `SELECT 
        COUNT(*) as total_ventas,
        COALESCE(SUM(precio_venta), 0) as ingreso_total,
        COALESCE(SUM(comision), 0) as comision_total,
        COALESCE(MAX(precio_venta), 0) as venta_max,
        COALESCE(AVG(precio_venta), 0) as venta_promedio
        FROM ventas_cerradas` + ventasWhere + `;`,
    q6: "SELECT COUNT(*) as total FROM clientes_prospectos WHERE 1=1" + prospectosWhere,
    q7: `SELECT COALESCE(AVG(DATEDIFF(fecha_cierre, fecha_registro)), 0) as dias_promedio 
        FROM clientes_prospectos 
        WHERE estado_seguimiento = 'Cerrado' AND fecha_cierre IS NOT NULL` + prospectosWhere + `;`,
    q8: `SELECT tipo_operacion, COUNT(*) as total, SUM(precio_venta) as monto 
        FROM ventas_cerradas WHERE 1=1` + ventasWhere + ` GROUP BY tipo_operacion`,
    q9: `SELECT nombre, motivo_descarte, fecha_registro, zona_interes, presupuesto_max 
        FROM clientes_prospectos 
        WHERE estado_seguimiento = 'Descartado'` + prospectosWhere + ` 
        ORDER BY fecha_registro DESC`,
    q10: `SELECT v.id, c.nombre, p.titulo AS propiedad_titulo, v.tipo_operacion, v.precio_venta, v.comision, v.fecha_cierre, c.zona_interes 
        FROM ventas_cerradas v 
        LEFT JOIN clientes_prospectos c ON v.id_cliente = c.id_cliente 
        LEFT JOIN propiedades p ON v.id_propiedad COLLATE utf8mb4_unicode_ci = p.id_propiedad COLLATE utf8mb4_unicode_ci
        WHERE 1=1` + ventasWhereJoined + `
        ORDER BY v.fecha_cierre DESC
        LIMIT 100`
};

let executed = 0;
const keys = Object.keys(queries);

function executeNext() {
    if (executed >= keys.length) {
        console.log("\n🎉 [TODAS LAS CONSULTAS COMPLETADAS CON ÉXITO]");
        db.end();
        return;
    }
    const name = keys[executed];
    const sql = queries[name];
    const params = name.match(/q[458]|q10/) ? ventasParams : prospectosParams;

    console.log(`\n⏳ Ejecutando ${name}...`);
    db.query(sql, params, (err, rows) => {
        if (err) {
            console.error(`❌ Error en ${name}:`, err.message);
            console.error(`SQL ejecutado:`, sql);
            console.error(`Params vinculados:`, params);
            db.end();
            process.exit(1);
        }
        console.log(`✅ ${name} funcionó perfectamente. Filas devueltas:`, Array.isArray(rows) ? rows.length : '1 (objeto/resumen)');
        executed++;
        executeNext();
    });
}

executeNext();
