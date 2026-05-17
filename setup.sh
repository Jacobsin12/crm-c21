#!/bin/bash
# Script de instalación automática del CRM Century 21
set -e

echo "========================================"
echo "🚀 Instalando CRM Century 21..."
echo "========================================"

# 1. Dependencias del sistema
echo "📦 [1/6] Instalando dependencias..."
sudo apt-get update -qq
sudo apt-get install -y -qq nginx nodejs npm python3-pip python3-venv libzbar0 mysql-server

# 2. MySQL
echo "🗄️  [2/6] Configurando MySQL..."
sudo systemctl start mysql
sudo systemctl enable mysql
sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '0512'; FLUSH PRIVILEGES;"
sudo mysql -u root -p0512 -e "CREATE DATABASE IF NOT EXISTS crm_inmobiliario;"

# 3. Importar base de datos
echo "📊 [3/6] Importando base de datos..."
if [ -f ~/crm_backup.sql ]; then
    mysql -u root -p0512 crm_inmobiliario < ~/crm_backup.sql
    echo "   ✅ Base de datos importada"
else
    echo "   ⚠️  No se encontró crm_backup.sql, la base de datos estará vacía"
fi

# 4. Python IA
echo "🐍 [4/6] Configurando Inteligencia Artificial..."
cd ~/C21/back
python3 -m venv venv
./venv/bin/pip install -q PyMuPDF pyzbar Pillow mysql-connector-python

# Actualizar ruta de python en server.js
sed -i "s|exec('python |exec('./venv/bin/python3 |g" server.js
sed -i 's|exec("python |exec("./venv/bin/python3 |g' server.js

# 5. Node.js + PM2
echo "⚙️  [5/6] Configurando servidor Node.js..."
npm install --silent
sudo npm install -g pm2 --silent
pm2 delete crm-backend 2>/dev/null || true
pm2 start server.js --name "crm-backend"
pm2 save
sudo pm2 startup systemd -u $USER --hp $HOME | tail -1 | bash || true

# 6. Nginx
echo "🌐 [6/6] Configurando servidor web Nginx..."
USERNAME=$(whoami)
sudo bash -c "cat > /etc/nginx/sites-available/default << 'NGINXEOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    root /home/${USERNAME}/C21/front;
    index a_admin/clientes.html;
    server_name _;

    # Ruta pública del cliente
    location = / {
        rewrite ^ /a_cliente/index.html break;
    }

    location /a_cliente/ {
        try_files \$uri \$uri/ =404;
    }

    # Panel de administrador
    location /admin {
        rewrite ^ /a_admin/clientes.html break;
    }

    location /a_admin/ {
        try_files \$uri \$uri/ =404;
    }

    # Archivos estáticos generales
    location /assets/ {
        try_files \$uri \$uri/ =404;
    }

    # API (Node.js backend)
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
NGINXEOF"

sudo nginx -t && sudo systemctl restart nginx && sudo systemctl enable nginx

# Abrir firewall
sudo ufw allow 22 2>/dev/null || true
sudo ufw allow 80 2>/dev/null || true
sudo ufw --force enable 2>/dev/null || true

echo ""
echo "========================================"
echo "✅ ¡INSTALACIÓN COMPLETADA CON ÉXITO!"
IP=$(curl -s ifconfig.me 2>/dev/null || echo "35.224.239.170")
echo "🌍 Tu CRM está en: http://${IP}/admin"
echo "👤 Perfilamiento clientes: http://${IP}/"
echo "========================================"
