require('dotenv').config();
const mysql = require('mysql2');
const bcrypt = require('bcrypt');

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '0512', 
    database: 'crm_inmobiliario',
});

const run = async () => {
    try {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS usuarios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                correo VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                rol VARCHAR(20) DEFAULT 'admin',
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await db.promise().query(createTableQuery);
        console.log('Tabla usuarios creada o ya existía.');

        const hash = await bcrypt.hash('ce18ci06', 10);
        
        const insertQuery = `
            INSERT INTO usuarios (username, correo, password_hash) 
            VALUES ('ceciram', 'ceciramirez066@gmail.com', ?)
            ON DUPLICATE KEY UPDATE password_hash = ?;
        `;
        await db.promise().query(insertQuery, [hash, hash]);
        console.log('Usuario ceciram insertado correctamente.');
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
