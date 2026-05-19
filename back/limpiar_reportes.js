require('dotenv').config();
const mysql = require('mysql2');
const readline = require('readline');

const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'crm_inmobiliario',
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log("==========================================");
console.log("🧹 UTILERÍA DE LIMPIEZA DE REPORTES - C21");
console.log("==========================================\n");
console.log("Elige una opción para limpiar los datos del dashboard:");
console.log("1. Limpiar TODO (Borra todos los prospectos y todas las ventas cerradas).");
console.log("2. Limpiar solo VENTAS (Borra las ventas, pero conserva los prospectos restableciendo su estado a 'Nuevo').");
console.log("3. Cancelar.");

rl.question('\nSelecciona una opción (1, 2 o 3): ', async (opcion) => {
    if (opcion === '1') {
        rl.question('⚠️ ¿Estás COMPLETAMENTE seguro de borrar TODOS los prospectos y ventas? (si/no): ', async (confirm) => {
            if (confirm.toLowerCase() === 'si') {
                try {
                    console.log('\nEliminando registros...');
                    await db.promise().query('TRUNCATE TABLE ventas_cerradas;');
                    console.log('✅ Tabla ventas_cerradas vaciada (Ventas y comisiones en 0).');
                    
                    await db.promise().query('TRUNCATE TABLE clientes_prospectos;');
                    console.log('✅ Tabla clientes_prospectos vaciada (Prospectos y embudo en 0).');
                    
                    console.log('\n🎉 ¡Limpieza completa realizada exitosamente! Tu panel de reportes está en blanco.');
                } catch (e) {
                    console.error('❌ Error al limpiar base de datos:', e.message);
                }
            } else {
                console.log('Operación cancelada.');
            }
            rl.close();
            process.exit(0);
        });
    } else if (opcion === '2') {
        rl.question('⚠️ ¿Estás seguro de borrar las ventas cerradas y reiniciar el estado de los prospectos? (si/no): ', async (confirm) => {
            if (confirm.toLowerCase() === 'si') {
                try {
                    console.log('\nLimpiando ventas...');
                    await db.promise().query('TRUNCATE TABLE ventas_cerradas;');
                    console.log('✅ Tabla ventas_cerradas vaciada (Ventas y comisiones en 0).');
                    
                    console.log('Restableciendo estados de prospectos...');
                    await db.promise().query("UPDATE clientes_prospectos SET estado_seguimiento = 'Nuevo', fecha_cierre = NULL, motivo_descarte = NULL;");
                    console.log('✅ Todos los prospectos existentes se han restablecido a estado "Nuevo".');
                    
                    console.log('\n🎉 ¡Limpieza de ventas realizada exitosamente! Los prospectos se conservan.');
                } catch (e) {
                    console.error('❌ Error al limpiar base de datos:', e.message);
                }
            } else {
                console.log('Operación cancelada.');
            }
            rl.close();
            process.exit(0);
        });
    } else {
        console.log('Operación cancelada. No se modificó ningún dato.');
        rl.close();
        process.exit(0);
    }
});
