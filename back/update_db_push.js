const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '0512', 
    database: 'crm_inmobiliario'
});

db.connect((err) => {
    if (err) throw err;
    console.log('Conectado a la BD.');

    const q1 = "ALTER TABLE usuarios ADD COLUMN push_subscription JSON NULL;";
    const q2 = "ALTER TABLE clientes ADD COLUMN fecha_ultimo_contacto DATETIME DEFAULT CURRENT_TIMESTAMP;";

    db.query(q1, (err) => {
        if (err && err.code !== 'ER_DUP_FIELDNAME') console.log('Error q1:', err.message);
        
        db.query(q2, (err) => {
            if (err && err.code !== 'ER_DUP_FIELDNAME') console.log('Error q2:', err.message);
            
            console.log('BD actualizada.');
            db.end();
        });
    });
});
