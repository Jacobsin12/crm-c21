require('dotenv').config();
const mysql = require('mysql2');

const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'crm_inmobiliario',
});

const run = async () => {
    try {
        // 1. Crear tabla de ventas cerradas
        await db.promise().query(`
            CREATE TABLE IF NOT EXISTS ventas_cerradas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                id_cliente INT NOT NULL,
                id_propiedad VARCHAR(50),
                precio_venta DECIMAL(14,2) NOT NULL,
                tipo_operacion VARCHAR(50) DEFAULT 'Venta',
                fecha_cierre TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notas TEXT,
                registrado_por INT
            );
        `);
        console.log('✅ Tabla ventas_cerradas creada (o ya existía).');

        // 2. Agregar columna fecha_cierre a clientes_prospectos si no existe
        try {
            await db.promise().query(`
                ALTER TABLE clientes_prospectos ADD COLUMN fecha_cierre TIMESTAMP NULL;
            `);
            console.log('✅ Columna fecha_cierre agregada a clientes_prospectos.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️  Columna fecha_cierre ya existía en clientes_prospectos.');
            } else {
                throw e;
            }
        }

        console.log('\n🎉 Migración completada exitosamente.');
        process.exit(0);
    } catch (e) {
        console.error('❌ Error en la migración:', e);
        process.exit(1);
    }
};

run();
