const mysql = require('mysql2');
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '0512',
  database: 'crm_inmobiliario'
});

db.query('SELECT COUNT(*) AS cnt FROM ventas_cerradas', (err, results) => {
  if (err) {
    console.error('COUNT error', err.message);
    process.exit(1);
  }
  console.log('ventas_cerradas COUNT', results[0].cnt);

  db.query('SELECT COUNT(*) AS cnt FROM clientes_prospectos', (err2, rows2) => {
    if (err2) {
      console.error('CLIENTES count error', err2.message);
      process.exit(1);
    }
    console.log('clientes_prospectos TOTAL COUNT', rows2[0].cnt);

    db.query("SELECT COUNT(*) AS cnt FROM clientes_prospectos WHERE estado_seguimiento = 'Cerrado'", (err3, rows3) => {
      if (err3) {
        console.error('CERRADO count error', err3.message);
        process.exit(1);
      }
      console.log('clientes_prospectos Cerrado COUNT', rows3[0].cnt);

      db.query('SELECT id, id_cliente, id_propiedad, precio_venta, tipo_operacion, fecha_cierre FROM ventas_cerradas ORDER BY fecha_cierre DESC LIMIT 5', (err4, rows4) => {
        if (err4) {
          console.error('SELECT error', err4.message);
          process.exit(1);
        }
        console.log(JSON.stringify(rows4, null, 2));
        db.end();
      });
    });
  });
});
