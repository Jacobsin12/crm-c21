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

    const alterQuery1 = "ALTER TABLE usuarios ADD COLUMN nombre_completo VARCHAR(150) NULL;";
    const alterQuery2 = "ALTER TABLE usuarios ADD COLUMN estado ENUM('activo', 'inactivo') DEFAULT 'activo';";
    const updateQuery = "UPDATE usuarios SET nombre_completo = 'Maria Cecilia Ramirez Gonzalez', estado = 'activo' WHERE username = 'ceciram';";

    db.query(alterQuery1, (err) => {
        if (err && err.code !== 'ER_DUP_FIELDNAME') console.log('Error agregando nombre_completo:', err.message);
        
        db.query(alterQuery2, (err) => {
            if (err && err.code !== 'ER_DUP_FIELDNAME') console.log('Error agregando estado:', err.message);
            
            db.query(updateQuery, (err, res) => {
                if (err) throw err;
                console.log('Usuario actualizado correctamente.');
                db.end();
            });
        });
    });
});
