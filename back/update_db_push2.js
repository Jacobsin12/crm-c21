const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '0512', 
    database: 'crm_inmobiliario'
});

db.connect((err) => {
    if (err) throw err;
    const q = "ALTER TABLE clientes_prospectos ADD COLUMN fecha_ultimo_contacto DATETIME DEFAULT CURRENT_TIMESTAMP;";
    db.query(q, (err) => {
        if (err && err.code !== 'ER_DUP_FIELDNAME') console.log('Error:', err.message);
        console.log('BD actualizada.');
        db.end();
    });
});
