const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '0512', 
    database: 'crm_inmobiliario'
});

db.connect((err) => {
    if (err) throw err;
    const q1 = "ALTER TABLE clientes_prospectos MODIFY COLUMN estado_seguimiento ENUM('Nuevo', 'Contactado', 'Cerrado', 'Descartado') DEFAULT 'Nuevo';";
    const q2 = "ALTER TABLE clientes_prospectos ADD COLUMN motivo_descarte VARCHAR(100) NULL;";
    
    db.query(q1, (err) => {
        if (err) console.log('Error q1:', err.message);
        db.query(q2, (err) => {
            if (err && err.code !== 'ER_DUP_FIELDNAME') console.log('Error q2:', err.message);
            console.log('DB Actualizada.');
            db.end();
        });
    });
});
