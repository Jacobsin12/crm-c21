const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '0512', 
    database: 'crm_inmobiliario'
});

db.connect((err) => {
    if (err) throw err;
    db.query('SHOW TABLES;', (err, res) => {
        console.log(res);
        db.end();
    });
});
