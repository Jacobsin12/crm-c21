const mysql = require('mysql2');
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '0512',
  database: 'crm_inmobiliario'
});

db.query('SHOW CREATE TABLE ventas_cerradas', (err, results) => {
  if (err) {
    console.error('ERROR', err.message);
    process.exit(1);
  }
  console.log(results[0]['Create Table']);
  db.end();
});
