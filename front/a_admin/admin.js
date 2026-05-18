// ==========================================
// FUNCIONES AUXILIARES PARA COOKIES (BLINDAJE IPHONE)
// ==========================================
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/; Secure; SameSite=Strict";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function eraseCookie(name) {   
    document.cookie = name +'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Secure; SameSite=Strict';
}

// ==========================================
// SEGURIDAD / LOGIN GLOBAL
// ==========================================
// Intentar leer de cookie primero (iPhone), si no, fallback a localStorage
window.adminToken = getCookie('adminToken') || localStorage.getItem('adminToken');

if (!window.location.pathname.includes('login.html')) {
    if (!window.adminToken) {
        window.location.href = 'login.html';
    } else {
        try {
            window.usuarioActual = JSON.parse(atob(window.adminToken.split('.')[1]));
            document.addEventListener("DOMContentLoaded", () => {
                const nombreEl = document.getElementById('nombreUsuarioGlobal');
                if (nombreEl) {
                    nombreEl.innerText = window.usuarioActual.nombre_completo || window.usuarioActual.username || 'Usuario';
                }
            });
            
            // Asegurar que ambos almacenes tengan el token por si acaso
            if (!getCookie('adminToken')) setCookie('adminToken', window.adminToken, 365);
            if (!localStorage.getItem('adminToken')) localStorage.setItem('adminToken', window.adminToken);

        } catch (e) {
            localStorage.removeItem('adminToken');
            eraseCookie('adminToken');
            window.location.href = 'login.html';
        }
    }
}

const originalFetch = window.fetch;
window.fetch = async function() {
    let [resource, config] = arguments;
    if (typeof resource === 'string' && resource.includes('/api/admin') && !resource.includes('/login')) {
        config = config || {};
        if (!config.headers) config.headers = {};
        if (window.adminToken) {
            config.headers['Authorization'] = `Bearer ${window.adminToken}`;
        }
        const response = await originalFetch(resource, config);
        if (response.status === 401) {
            localStorage.removeItem('adminToken');
            eraseCookie('adminToken');
            window.location.href = 'login.html';
        }
        return response;
    }
    return originalFetch(resource, config);
};

// ==========================================
// NOTIFICACIONES PUSH (PWA) — BLINDADO CONTRA BUCLES
// ==========================================
async function suscribirPush() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
            const register = await navigator.serviceWorker.register('/sw.js');
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                const publicVapidKey = 'BKEkmGXk344Z78au064U-RqjIYHMuAW5AyfhwPh83tNcb26Pb-TNnsaUcLdSfTpwfu7jHFCtu3MTw0_bq5h4VQA';
                const subscription = await register.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
                });
                
                await fetch('/api/admin/push/subscribe', {
                    method: 'POST',
                    body: JSON.stringify(subscription),
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${window.adminToken}`
                    }
                });
                
                // Ocultar banner si existe
                const banner = document.getElementById('pushBanner');
                if (banner) banner.remove();

                // 🛠️ CONTROL: Solo muestra la alerta la primera vez que se activa de verdad
                if (!localStorage.getItem('push_suscrito')) {
                    mostrarNotificacion('¡Notificaciones activadas! 🔔', 'success');
                    localStorage.setItem('push_suscrito', 'true');
                }
            }
        } catch (e) {
            console.error('Push Registration failed', e);
        }
    }
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Mostrar banner para activar notificaciones (iOS requiere gesto del usuario)
if (!window.location.pathname.includes('login.html')) {
    document.addEventListener("DOMContentLoaded", async () => {
        // Registrar SW silenciosamente
        if ('serviceWorker' in navigator) {
            await navigator.serviceWorker.register('/sw.js').catch(() => {});
        }
        
        // 🛠️ CONTROL: Si ya tiene el permiso Y ya está guardado en localStorage, se queda callado
        if ('Notification' in window && Notification.permission === 'granted') {
            if (!localStorage.getItem('push_suscrito')) {
                setTimeout(suscribirPush, 1000);
            }
        } else if ('Notification' in window && Notification.permission !== 'denied') {
            // Mostrar banner para pedir permiso con gesto del usuario
            setTimeout(() => {
                const banner = document.createElement('div');
                banner.id = 'pushBanner';
                banner.className = 'fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-slate-900 border border-amber-500/30 text-white p-4 rounded-2xl shadow-2xl z-50 flex items-center gap-3 animate-fade-in';
                banner.innerHTML = `
                    <div class="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <i data-lucide="bell-ring" class="w-5 h-5 text-amber-400"></i>
                    </div>
                    <div class="flex-1">
                        <p class="text-sm font-bold">¿Activar notificaciones?</p>
                        <p class="text-xs text-slate-400">Recibe alertas cuando llegue un nuevo prospecto.</p>
                    </div>
                    <button onclick="suscribirPush()" class="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-4 py-2 rounded-xl cursor-pointer transition-colors flex-shrink-0">Activar</button>
                    <button onclick="this.parentElement.remove()" class="text-slate-500 hover:text-white cursor-pointer"><i data-lucide="x" class="w-4 h-4"></i></button>
                `;
                document.body.appendChild(banner);
                if (window.lucide) lucide.createIcons();
            }, 2000);
        }
    });
}

let archivosEnCola = [];

// ==========================================
// SISTEMA DE NOTIFICACIONES (TOAST)
// ==========================================
window.mostrarNotificacion = function(mensaje, tipo = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-5 right-5 z-[100] flex flex-col gap-3';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl transform translate-y-10 opacity-0 transition-all duration-300 ${
        tipo === 'success' ? 'bg-white border-l-4 border-emerald-500' :
        tipo === 'error' ? 'bg-white border-l-4 border-rose-500' :
        'bg-white border-l-4 border-[--gold-primary]'
    }`;
    
    const icon = tipo === 'success' ? '<i data-lucide="check-circle" class="text-emerald-500 w-5 h-5"></i>' :
                 tipo === 'error' ? '<i data-lucide="alert-circle" class="text-rose-500 w-5 h-5"></i>' :
                 '<i data-lucide="info" class="text-[--gold-primary] w-5 h-5"></i>';

    toast.innerHTML = `
        ${icon}
        <p class="text-sm font-bold text-slate-800">${mensaje}</p>
    `;

    container.appendChild(toast);
    if(window.lucide) lucide.createIcons();

    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
    });

    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 4500);
};

// ==========================================
// CONEXIÓN SSE PARA NOTIFICACIONES EN TIEMPO REAL (OPTIMIZADO)
// ==========================================
function inicializarSSE() {
    const sse = new EventSource(`${window.API_BASE_URL}/admin/sse?token=${window.adminToken || ''}`);
    
    sse.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            
            // 🔔 ESCUCHAR EL ESTADO DEL PROCESAMIENTO DEL PDF POR LA IA
            if (data.type === 'pdf_status') {
                
                if (data.status === 'success') {
                    // Si todo salió chido, muestra la alerta en verde con el éxito
                    mostrarNotificacion(data.message, 'success');
                    
                    // 🚀 TRUCO EN VIVO: Si el asesor está parado en la pestaña de inventario,
                    // recargamos el catálogo automáticamente para que vea su nueva propiedad al instante.
                    if (document.getElementById("gridInventario") && typeof cargarInventarioCompleto === 'function') {
                        cargarInventarioCompleto(data.nuevosIds || []);
                    }
                } else if (data.status === 'error') {
                    // Si la IA tronó, te avisa de inmediato con una alerta en rojo
                    mostrarNotificacion(data.message, 'error');
                }
            }
        } catch (e) {
            console.error("Error parseando SSE:", e);
        }
    };
    
    sse.onerror = () => {
        console.log("Desconectado del servidor SSE. Reconectando...");
    };
}

// Inicializar al cargar la página
window.addEventListener('DOMContentLoaded', () => {
    inicializarSSE();
});

// ==========================================
// RUTA 1: PANEL DE PROSPECTOS Y MATCHMAKING
// ==========================================
window.clientesGlobal = [];

async function cargarClientes() {
    const tabla = document.getElementById("tablaClientes");
    if (!tabla) return;
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/admin/clientes`);
        const res = await response.json();

        if (res.status === "success") {
            window.clientesGlobal = res.data;
            aplicarFiltroClientes();
        } else {
            tabla.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400">No hay prospectos.</td></tr>`;
        }
    } catch (error) {
        tabla.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-rose-500">Error al conectar.</td></tr>`;
    }
}

function aplicarFiltroClientes() {
    const tabla = document.getElementById("tablaClientes");
    if (!tabla) return;

    const filtro = document.getElementById("filtroEstadoCliente")?.value || "Todos";
    const filtrados = window.clientesGlobal.filter(c => filtro === "Todos" || c.estado_seguimiento === filtro);

    if (filtrados.length > 0) {
        tabla.innerHTML = filtrados.map(c => {
            const requiereSeguimiento = c.estado_seguimiento !== 'Cerrado' && (!c.fecha_ultimo_contacto || (new Date() - new Date(c.fecha_ultimo_contacto)) / (1000 * 60 * 60 * 24) > 3);
            return `
            <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3">
                    <div class="font-bold text-slate-900 flex items-center gap-2">
                        ${c.nombre}
                        ${requiereSeguimiento ? `<span class="bg-rose-100 text-rose-600 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase animate-pulse" title="Han pasado más de 3 días desde el último contacto">Seguimiento</span>` : ''}
                        <a href="https://wa.me/52${c.telefono.replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(c.nombre)},%20te%20contacto%20de%20Century%2021..." target="_blank" onclick="mostrarNotificacion('Abriendo WhatsApp...', 'success')" class="text-green-500 hover:text-green-600 cursor-pointer" title="Contactar por WhatsApp">
                            <i data-lucide="message-circle" class="w-4 h-4"></i>
                        </a>
                    </div>
                    <div class="text-slate-400 text-[11px]">${c.telefono}</div>
                </td>
                <td class="p-3">
                    <span class="bg-amber-50 text-[--gold-dark] px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border border-amber-200/50">${c.tipo_operacion_buscada}</span>
                    <div class="text-slate-600 mt-1 font-semibold">${c.tipo_propiedad_buscada}</div>
                    ${c.especificaciones_clave ? `<div class="text-slate-400 text-[10px] mt-1.5 italic line-clamp-2 leading-tight" title="${c.especificaciones_clave}">"${c.especificaciones_clave}"</div>` : ''}
                </td>
                <td class="p-3">
                    <div class="font-bold text-slate-800">$${parseFloat(c.presupuesto_max).toLocaleString('es-MX')} MXN</div>
                    <div class="text-slate-400 text-[11px] truncate max-w-[180px]">${c.zona_interes}</div>
                </td>
                <td class="p-3 text-center flex justify-center gap-2 items-center">
                    <select onchange="actualizarEstadoCliente(${c.id_cliente}, this.value)" class="text-[10px] p-1 border border-slate-200 rounded text-slate-600 bg-white cursor-pointer">
                        <option value="Nuevo" ${c.estado_seguimiento === 'Nuevo' ? 'selected' : ''}>Nuevo</option>
                        <option value="Contactado" ${c.estado_seguimiento === 'Contactado' ? 'selected' : ''}>Contactado</option>
                        <option value="Cerrado" ${c.estado_seguimiento === 'Cerrado' ? 'selected' : ''}>Cerrado</option>
                        <option value="Descartado" ${c.estado_seguimiento === 'Descartado' ? 'selected' : ''}>Descartado</option>
                    </select>
                    ${requiereSeguimiento ? `
                    <button onclick="registrarContactoSeguimiento(${c.id_cliente}, '${c.telefono}', '${c.nombre.replace(/'/g, "\\'")}')" class="bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white font-bold p-1.5 rounded-xl border border-rose-200 transition-all cursor-pointer active:scale-95 shadow-md" title="Enviar Seguimiento (WhatsApp)">
                        <i data-lucide="bell-ring" class="w-4 h-4"></i>
                    </button>` : ''}
                    <button onclick="ejecutarMatchmaking(${c.id_cliente})" class="bg-slate-900 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 font-bold p-1.5 rounded-xl border border-emerald-500/20 transition-all cursor-pointer active:scale-95 shadow-md" title="Matchmaking Inteligente">
                        <i data-lucide="sparkles" class="w-4 h-4"></i>
                    </button>
                </td>
            </tr>
        `}).join('');
    } else {
        tabla.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400">No hay prospectos en este estado.</td></tr>`;
    }
    if (window.lucide) lucide.createIcons();
}

async function registrarContactoSeguimiento(id, phone, name) {
    try {
        await fetch(`${window.API_BASE_URL}/admin/clientes/${id}/contacto`, { method: 'PUT', headers: { 'Authorization': `Bearer ${window.adminToken}` }});
        const c = window.clientesGlobal.find(x => x.id_cliente === id);
        if (c) c.fecha_ultimo_contacto = new Date().toISOString();
        aplicarFiltroClientes();
        
        const texto = `Hola ${name}, te escribo de Century 21 para dar seguimiento a tu búsqueda. ¿Pudiste revisar las opciones que te envié? ¿Tienes alguna duda?`;
        window.open(`https://wa.me/52${phone.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`, '_blank');
    } catch { mostrarNotificacion("Error al registrar contacto.", 'error'); }
}

async function actualizarEstadoCliente(id, estado) {
    if (estado === 'Descartado') {
        mostrarModalDescarte(id);
        return;
    }
    if (estado === 'Cerrado') {
        mostrarModalCierre(id);
        return;
    }
    try {
        await fetch(`${window.API_BASE_URL}/admin/clientes/${id}/estado`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado })
        });
        const c = window.clientesGlobal.find(x => x.id_cliente === id);
        if (c) c.estado_seguimiento = estado;
        aplicarFiltroClientes();
        mostrarNotificacion(`Estado cambiado a: ${estado}`, 'info');
    } catch { mostrarNotificacion("Error al actualizar estado.", 'error'); }
}

// ==========================================
// MODAL: REGISTRAR VENTA / CIERRE
// ==========================================
async function mostrarModalCierre(idCliente) {
    const existing = document.getElementById('modalCierreCustom');
    if (existing) existing.remove();

    // Obtener propiedades disponibles para el selector
    let propiedadesOptions = '<option value="">Sin vincular propiedad</option>';
    try {
        const resProp = await fetch(`${window.API_BASE_URL}/admin/propiedades`);
        const dataProp = await resProp.json();
        if (dataProp.status === 'success') {
            dataProp.data.filter(p => p.estatus_propiedad === 'Disponible').forEach(p => {
                propiedadesOptions += `<option value="${p.id_propiedad}" data-precio="${p.precio}">${p.tipo_propiedad} - ${p.zona} ($${parseFloat(p.precio).toLocaleString('es-MX')})</option>`;
            });
        }
    } catch(e) { console.error('Error cargando propiedades:', e); }

    const div = document.createElement('div');
    div.id = 'modalCierreCustom';
    div.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in p-4';
    div.innerHTML = `
        <div class="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100">
            <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <i data-lucide="trophy" class="w-5 h-5 text-emerald-500"></i>
                </div>
                <div>
                    <h3 class="text-lg font-bold text-slate-900">Registrar Venta Cerrada</h3>
                    <p class="text-xs text-slate-500">Registra los detalles del cierre para las métricas.</p>
                </div>
            </div>
            
            <div class="space-y-3 mb-5">
                <div>
                    <label class="text-xs font-bold text-slate-600 mb-1 block">Propiedad vendida</label>
                    <select id="cierrePropiedad" onchange="autoFillPrecio()" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-emerald-400 cursor-pointer">
                        ${propiedadesOptions}
                    </select>
                </div>
                <div>
                    <label class="text-xs font-bold text-slate-600 mb-1 block">Precio de venta (MXN) *</label>
                    <input type="number" id="cierrePrecio" placeholder="Ej. 2500000" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-emerald-400" required>
                    <p class="text-[10px] text-slate-400 mt-1">Tu comisión (3.5%): <span id="cierreComisionPreview" class="font-bold text-emerald-600">$0</span></p>
                </div>
                <div>
                    <label class="text-xs font-bold text-slate-600 mb-1 block">Tipo de operación</label>
                    <select id="cierreTipoOp" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-emerald-400 cursor-pointer">
                        <option value="Venta">Venta</option>
                        <option value="Renta">Renta</option>
                    </select>
                </div>
                <div>
                    <label class="text-xs font-bold text-slate-600 mb-1 block">Notas (opcional)</label>
                    <textarea id="cierreNotas" rows="2" placeholder="Detalles adicionales..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-emerald-400 resize-none"></textarea>
                </div>
            </div>
            
            <div class="flex gap-3">
                <button onclick="cancelarCierre()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-sm transition-colors cursor-pointer">Cancelar</button>
                <button onclick="confirmarCierre(${idCliente})" class="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-sm shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2">
                    <i data-lucide="check-circle" class="w-4 h-4"></i> Registrar Cierre
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(div);
    if (window.lucide) lucide.createIcons();

    // Auto-update commission preview
    document.getElementById('cierrePrecio').addEventListener('input', (e) => {
        const precio = parseFloat(e.target.value) || 0;
        document.getElementById('cierreComisionPreview').textContent = '$' + (precio * 0.035).toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0});
    });
}

function autoFillPrecio() {
    const sel = document.getElementById('cierrePropiedad');
    const opt = sel.options[sel.selectedIndex];
    if (opt && opt.dataset.precio) {
        const precioInput = document.getElementById('cierrePrecio');
        precioInput.value = opt.dataset.precio;
        precioInput.dispatchEvent(new Event('input'));
    }
}

function cancelarCierre() {
    document.getElementById('modalCierreCustom')?.remove();
    aplicarFiltroClientes();
}

async function confirmarCierre(idCliente) {
    const precio = parseFloat(document.getElementById('cierrePrecio').value);
    if (!precio || precio <= 0) {
        mostrarNotificacion("Debes ingresar un precio de venta válido.", "error");
        return;
    }

    const idPropiedad = document.getElementById('cierrePropiedad').value || null;
    const tipoOp = document.getElementById('cierreTipoOp').value;
    const notas = document.getElementById('cierreNotas').value.trim() || null;

    document.getElementById('modalCierreCustom')?.remove();

    try {
        const res = await fetch(`${window.API_BASE_URL}/admin/ventas/registrar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_cliente: idCliente, id_propiedad: idPropiedad, precio_venta: precio, tipo_operacion: tipoOp, notas })
        });
        const data = await res.json();
        if (data.status === 'success') {
            const c = window.clientesGlobal.find(x => x.id_cliente === idCliente);
            if (c) c.estado_seguimiento = 'Cerrado';
            aplicarFiltroClientes();
            mostrarNotificacion(`🎉 ¡Venta registrada! Comisión: $${(precio * 0.035).toLocaleString('es-MX')}`, 'success');
        } else {
            mostrarNotificacion(data.message || 'Error al registrar venta.', 'error');
        }
    } catch { mostrarNotificacion("Error de conexión al registrar la venta.", 'error'); }
}

function mostrarModalDescarte(id) {
    const existing = document.getElementById('modalDescarteCustom');
    if (existing) existing.remove();
    
    const div = document.createElement('div');
    div.id = 'modalDescarteCustom';
    div.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in p-4';
    div.innerHTML = `
        <div class="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100">
            <h3 class="text-lg font-bold text-slate-900 mb-2">Descartar Prospecto</h3>
            <p class="text-xs text-slate-500 mb-4">Por favor, selecciona el motivo principal por el cual se perdió este cliente para alimentar las estadísticas.</p>
            
            <div class="space-y-2 mb-6">
                <label class="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-rose-400 hover:bg-rose-50 cursor-pointer transition-colors" onchange="document.getElementById('otroMotivoContainer').classList.add('hidden')">
                    <input type="radio" name="motivoRadio" value="Presupuesto" class="w-4 h-4 text-rose-500 focus:ring-rose-500">
                    <span class="text-sm font-semibold text-slate-700">Presupuesto / Precio</span>
                </label>
                <label class="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-rose-400 hover:bg-rose-50 cursor-pointer transition-colors" onchange="document.getElementById('otroMotivoContainer').classList.add('hidden')">
                    <input type="radio" name="motivoRadio" value="No era lo que buscaba" class="w-4 h-4 text-rose-500 focus:ring-rose-500">
                    <span class="text-sm font-semibold text-slate-700">No era lo que buscaba</span>
                </label>
                <label class="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-rose-400 hover:bg-rose-50 cursor-pointer transition-colors" onchange="document.getElementById('otroMotivoContainer').classList.add('hidden')">
                    <input type="radio" name="motivoRadio" value="Solo curiosidad" class="w-4 h-4 text-rose-500 focus:ring-rose-500">
                    <span class="text-sm font-semibold text-slate-700">Mera curiosidad</span>
                </label>
                <label class="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-rose-400 hover:bg-rose-50 cursor-pointer transition-colors" onchange="document.getElementById('otroMotivoContainer').classList.remove('hidden')">
                    <input type="radio" name="motivoRadio" value="Otro" class="w-4 h-4 text-rose-500 focus:ring-rose-500">
                    <span class="text-sm font-semibold text-slate-700">Otro motivo...</span>
                </label>
                <div id="otroMotivoContainer" class="hidden pl-7 pt-2">
                    <input type="text" id="otroMotivoInput" placeholder="Escribe el motivo..." class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-rose-400">
                </div>
            </div>
            
            <div class="flex gap-3">
                <button onclick="cancelarDescarte()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-sm transition-colors cursor-pointer">Cancelar</button>
                <button onclick="confirmarDescarte(${id})" class="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 rounded-xl text-sm shadow-md transition-colors cursor-pointer">Descartar Cliente</button>
            </div>
        </div>
    `;
    document.body.appendChild(div);
}

function cancelarDescarte() {
    document.getElementById('modalDescarteCustom').remove();
    aplicarFiltroClientes();
}

async function confirmarDescarte(id) {
    const radios = document.getElementsByName('motivoRadio');
    let motivoSeleccionado = null;
    for (let r of radios) { if (r.checked) motivoSeleccionado = r.value; }
    
    if (motivoSeleccionado === 'Otro') {
        const otroInput = document.getElementById('otroMotivoInput').value.trim();
        if (!otroInput) {
            mostrarNotificacion("Por favor escribe el motivo.", "error");
            return;
        }
        motivoSeleccionado = otroInput;
    } else if (!motivoSeleccionado) {
        const modal = document.getElementById('modalDescarteCustom');
        if (modal) modal.remove();
        aplicarFiltroClientes();
        return;
    }
    
    const targetModal = document.getElementById('modalDescarteCustom');
    if (targetModal) targetModal.remove();
    
    try {
        await fetch(`${window.API_BASE_URL}/admin/clientes/${id}/estado`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'Descartado', motivo: motivoSeleccionado })
        });
        const c = window.clientesGlobal.find(x => x.id_cliente === id);
        if (c) {
            c.estado_seguimiento = 'Descartado';
            c.motivo_descarte = motivoSeleccionado;
        }
        aplicarFiltroClientes();
        mostrarNotificacion(`Cliente descartado exitosamente.`, 'success');
    } catch { mostrarNotificacion("Error al actualizar estado.", 'error'); }
}

async function ejecutarMatchmaking(idCliente) {
    const modal = document.getElementById("modalMatch");
    const contenedorExactas = document.getElementById("contenedorExactas");
    const contenedorAlternativas = document.getElementById("contenedorAlternativas");

    try {
        const response = await fetch(`${window.API_BASE_URL}/admin/match/${idCliente}`);
        const res = await response.json();

        if (res.status === "success") {
            window.ultimoMatch = res;
            document.getElementById("modalClienteNombre").innerText = `Análisis de Match para: ${res.cliente.nombre}`;
            contenedorExactas.innerHTML = res.coincidencias_exactas.length === 0 ? `<p class="text-slate-400 text-xs col-span-2 italic">No hay propiedades exactas disponibles.</p>` : res.coincidencias_exactas.map(p => generarTarjetaPropiedad(p)).join('');
            contenedorAlternativas.innerHTML = res.alternativas_fuera_presupuesto.length === 0 ? `<p class="text-slate-400 text-xs col-span-2 italic">No hay alternativas que ofrecer en este rango.</p>` : res.alternativas_fuera_presupuesto.map(p => generarTarjetaPropiedad(p)).join('');
            modal.classList.remove("hidden");
            if (window.lucide) lucide.createIcons();
        }
    } catch (error) {
        alert("Error al ejecutar el algoritmo de cruce.");
    }
}

function enviarOpcionesWhatsapp() {
    if (!window.ultimoMatch) return;
    const m = window.ultimoMatch;
    let texto = `Hola ${m.cliente.nombre}, analicé tu perfil y tengo excelentes opciones en ${m.cliente.zona_interes}:\n\n`;
    
    m.coincidencias_exactas.slice(0, 3).forEach((p, i) => {
        const detalles = [];
        if (p.recamaras) detalles.push(`${p.recamaras} Rec`);
        if (p.banos_completos) detalles.push(`${p.banos_completos} Baños`);
        const desc = detalles.length > 0 ? ` (${detalles.join(', ')})` : '';
        
        texto += `${i+1}. ${p.tipo_propiedad} en ${p.zona}${desc} - $${parseFloat(p.precio).toLocaleString('es-MX')}\n`;
    });
    
    if (m.alternativas_fuera_presupuesto.length > 0) {
        texto += `\nTambién tengo estas alternativas premium:\n`;
        m.alternativas_fuera_presupuesto.slice(0, 2).forEach((p, i) => {
            const detalles = [];
            if (p.recamaras) detalles.push(`${p.recamaras} Rec`);
            if (p.banos_completos) detalles.push(`${p.banos_completos} Baños`);
            const desc = detalles.length > 0 ? ` (${detalles.join(', ')})` : '';
            
            texto += `- ${p.tipo_propiedad} en ${p.zona}${desc} - $${parseFloat(p.precio).toLocaleString('es-MX')}\n`;
        });
    }
    
    texto += `\n¿Te gustaría agendar una cita para ver alguna?`;
    
    const phone = m.cliente.telefono.replace(/\D/g, '');
    window.open(`https://wa.me/52${phone}?text=${encodeURIComponent(texto)}`, '_blank');
}

function generarTarjetaPropiedad(p, isNew = false) {
    const defaultBg = p.estatus_propiedad === 'Disponible' ? 'bg-slate-50' : 'bg-slate-200 opacity-75';
    const bgClass = isNew ? '' : defaultBg;
    const borderClass = isNew ? 'border-amber-500 border-2 bg-amber-50 shadow-[0_0_15px_rgba(212,175,55,0.4)] nueva-propiedad-destacada transition-all duration-1000' : 'border-slate-100 hover:border-amber-500/40 transition-all';
    
    return `
        <div data-defaultbg="${defaultBg}" class="${bgClass} border ${borderClass} p-3 rounded-2xl flex flex-col justify-between cursor-pointer relative group" onclick="if('${p.carpeta_drive_fotos}') { window.open('${p.carpeta_drive_fotos}', '_blank'); } else { mostrarNotificacion('Esta propiedad aún no tiene fotos en Drive.', 'error'); }">
            <div>
                <div class="flex justify-between items-start mb-1">
                    <span class="font-bold text-slate-900 text-sm flex items-center gap-2">
                        $${parseFloat(p.precio).toLocaleString('es-MX')} MXN
                        ${p.carpeta_drive_fotos ? '<i data-lucide="image" class="w-4 h-4 text-emerald-500" title="Contiene fotos"></i>' : ''}
                    </span>
                    <select onclick="event.stopPropagation()" onchange="actualizarEstatusPropiedad('${p.id_propiedad}', this.value)" class="text-[9px] bg-slate-200 text-slate-600 px-1 py-0.5 rounded-md font-bold uppercase cursor-pointer outline-none">
                        <option value="Disponible" ${p.estatus_propiedad === 'Disponible' ? 'selected' : ''}>Disponible</option>
                        <option value="No Disponible" ${p.estatus_propiedad !== 'Disponible' ? 'selected' : ''}>Oculto</option>
                    </select>
                </div>
                <div class="flex justify-between items-center mb-2">
                    <span class="text-[9px] bg-[--gold-primary] text-black px-1.5 py-0.5 rounded-md font-bold uppercase">${p.tipo_propiedad}</span>
                    <div class="text-[10px] text-slate-500 font-bold"><i data-lucide="map-pin" class="inline w-3 h-3 mr-0.5"></i> ${p.zona}</div>
                </div>
                <p class="text-slate-600 text-[11px] line-clamp-2 leading-relaxed mb-2">${p.descripcion || 'Sin descripción.'}</p>
            </div>
            <div class="flex justify-between items-center pt-2 border-t border-slate-100/60">
                <div class="flex gap-4 text-[10px] text-slate-400 font-bold">
                    <span><i data-lucide="bed" class="inline w-3.5 h-3.5 mr-0.5 text-slate-400"></i> ${p.recamaras || 0} Rec.</span>
                    <span><i data-lucide="bath" class="inline w-3.5 h-3.5 mr-0.5 text-slate-400"></i> ${p.banos_completos || 0} Baños</span>
                </div>
                <button onclick="event.stopPropagation(); editarDrivePropiedad('${p.id_propiedad}', '${p.carpeta_drive_fotos || ''}')" class="text-slate-400 hover:text-[--gold-primary] transition-colors" title="Editar Link de Drive">
                    <i data-lucide="link" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
    `;
}

async function editarDrivePropiedad(id, currentUrl) {
    const url = prompt("Introduce el enlace de Google Drive para las fotos:", currentUrl);
    if (url !== null) {
        try {
            await fetch(`${window.API_BASE_URL}/admin/propiedades/${id}/drive`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url })
            });
            const p = window.inventarioGlobal?.find(x => x.id_propiedad === id);
            if (p) p.carpeta_drive_fotos = url;
            if (typeof aplicarFiltrosInventario === 'function') aplicarFiltrosInventario();
            mostrarNotificacion("Enlace de Drive actualizado correctamente.", 'success');
        } catch { mostrarNotificacion("Error al actualizar enlace.", 'error'); }
    }
}

async function actualizarEstatusPropiedad(id, estatus) {
    try {
        await fetch(`${window.API_BASE_URL}/admin/propiedades/${id}/estatus`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estatus })
        });
        
        const p = window.inventarioGlobal?.find(x => x.id_propiedad === id);
        if (p) p.estatus_propiedad = estatus;
        
        if (typeof aplicarFiltrosInventario === 'function') {
            aplicarFiltrosInventario();
        }
        mostrarNotificacion(`Propiedad marcada como: ${estatus}`, 'info');
    } catch { mostrarNotificacion("Error al actualizar estatus de propiedad.", 'error'); }
}

function cerrarModal() { document.getElementById("modalMatch").classList.add("hidden"); }

// ==========================================
// RUTA 2: CARGAR PDFs (DROPZONE)
// ==========================================
function inicializarDropzone() {
    const dropzone = document.getElementById("dropzone");
    const fileInput = document.getElementById("fileInput");
    if (!dropzone) return;

    dropzone.addEventListener("click", () => fileInput.click());
    dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("border-[--gold-primary]", "bg-amber-50/20"); });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("border-[--gold-primary]", "bg-amber-50/20"));
    dropzone.addEventListener("drop", (e) => { e.preventDefault(); dropzone.classList.remove("border-[--gold-primary]", "bg-amber-50/20"); manejarArchivos(e.dataTransfer.files); });
    fileInput.addEventListener("change", (e) => manejarArchivos(e.target.files));
}

function manejarArchivos(files) {
    const nuevos = Array.from(files).filter(f => f.type === "application/pdf");
    if (archivosEnCola.length + nuevos.length > 5) return mostrarNotificacion("Máximo 5 PDFs por carga.", "error");
    archivosEnCola = [...archivosEnCola, ...nuevos];
    actualizarLista();
}

function actualizarLista() {
    const fileList = document.getElementById("fileList");
    const btn = document.getElementById("btnProcesarPdf");
    if (!fileList) return;
    fileList.innerHTML = archivosEnCola.map((f, i) => `
        <div class="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
            <span class="truncate pr-4"><i data-lucide="file-text" class="inline w-3.5 h-3.5 mr-1 text-slate-400"></i> ${f.name}</span>
            <button type="button" onclick="archivosEnCola.splice(${i},1); actualizarLista();" class="text-rose-500 cursor-pointer"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
        </div>
    `).join('');
    if (btn) {
        if (archivosEnCola.length > 0) btn.classList.remove("hidden"); else btn.classList.add("hidden");
    }
    if (window.lucide) lucide.createIcons();
}

document.getElementById("btnProcesarPdf")?.addEventListener("click", async () => {
    const btn = document.getElementById("btnProcesarPdf");
    if (!btn) return;
    btn.disabled = true; btn.innerHTML = `Subiendo... <i data-lucide="loader" class="w-4 h-4 animate-spin"></i>`; if (window.lucide) lucide.createIcons();
    
    const formData = new FormData(); 
    archivosEnCola.forEach(f => formData.append("fichas", f));
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/admin/subir-fichas`, { method: "POST", body: formData });
        const res = await response.json();
        
        if (res.status === "success") { 
            mostrarNotificacion(res.message, "info"); 
            archivosEnCola = []; 
            actualizarLista(); 
        } else {
            mostrarNotificacion("Error: " + res.message, "error");
        }
    } catch { 
        mostrarNotificacion("Error de conexión al subir los archivos.", "error"); 
    } finally { 
        btn.disabled = false; 
        btn.innerHTML = `Procesar con IA <i data-lucide="cpu" class="w-4 h-4"></i>`; 
        if (window.lucide) lucide.createIcons(); 
    }
});

// ==========================================
// RUTA 3: PANEL DE INVENTARIO GENERAL
// ==========================================
window.inventarioGlobal = [];

async function cargarInventarioCompleto(nuevosIds = []) {
    const grid = document.getElementById("gridInventario");
    if (!grid) return;

    try {
        grid.innerHTML = `<p class="text-slate-400 text-xs italic col-span-3 text-center">Descargando catálogo desde la base de datos...</p>`;
        const response = await fetch(`${window.API_BASE_URL}/admin/propiedades`);
        const res = await response.json();

        if (res.status === "success") {
            window.inventarioGlobal = res.data;
            aplicarFiltrosInventario(nuevosIds); 
        } else {
            grid.innerHTML = `<p class="text-rose-500 text-xs text-center col-span-3">No se pudo cargar el inventario: ${res.message}</p>`;
        }
    } catch (e) {
        grid.innerHTML = `<p class="text-rose-500 text-xs text-center col-span-3">Error al conectar con la base de datos.</p>`;
    }
}

function aplicarFiltrosInventario(nuevosIds = []) {
    const grid = document.getElementById("gridInventario");
    if (!grid) return;

    const filtroTipo = document.getElementById("filtroTipo")?.value || "";
    const filtroZona = document.getElementById("filtroZona")?.value.toLowerCase() || "";
    const filtroPrecio = parseFloat(document.getElementById("filtroPrecio")?.value) || Infinity;

    const propiedadesFiltradas = window.inventarioGlobal.filter(p => {
        let cumpleTipo = true;
        if (filtroTipo !== "") {
            if (filtroTipo === "Rentas") {
                cumpleTipo = p.tipo_operacion?.toLowerCase().includes("renta");
            } else if (filtroTipo === "Locales") {
                cumpleTipo = p.tipo_propiedad?.toLowerCase().includes("local");
            } else {
                cumpleTipo = p.tipo_propiedad?.toLowerCase().includes(filtroTipo.toLowerCase());
            }
        }
        
        const cumpleZona = filtroZona === "" || (p.zona && p.zona.toLowerCase().includes(filtroZona)) || (p.titulo && p.titulo.toLowerCase().includes(filtroZona));
        const cumplePrecio = p.precio <= filtroPrecio;
        return cumpleTipo && cumpleZona && cumplePrecio;
    });

    if (nuevosIds && nuevosIds.length > 0) {
        propiedadesFiltradas.sort((a, b) => {
            const aNew = nuevosIds.includes(a.id_propiedad) ? 1 : 0;
            const bNew = nuevosIds.includes(b.id_propiedad) ? 1 : 0;
            return bNew - aNew;
        });
    }

    if (propiedadesFiltradas.length === 0) {
        grid.innerHTML = `
            <div class="p-6 border border-slate-100 rounded-2xl text-center bg-slate-50 col-span-3">
                <i data-lucide="search-x" class="w-8 h-8 text-slate-300 mx-auto mb-2"></i>
                <h4 class="font-bold text-slate-500 text-sm">Sin resultados</h4>
                <p class="text-slate-400 text-xs mt-1">No hay propiedades que coincidan con estos filtros.</p>
            </div>
        `;
    } else {
        grid.innerHTML = propiedadesFiltradas.map(p => generarTarjetaPropiedad(p, nuevosIds && nuevosIds.includes(p.id_propiedad))).join('');
    }
    if (window.lucide) lucide.createIcons();

    if (nuevosIds && nuevosIds.length > 0) {
        setTimeout(() => {
            document.querySelectorAll('.nueva-propiedad-destacada').forEach(el => {
                el.classList.remove('border-amber-500', 'border-2', 'bg-amber-50', 'shadow-[0_0_15px_rgba(212,175,55,0.4)]');
                el.classList.add('border-slate-100');
                if(el.dataset.defaultbg) {
                    el.classList.add(el.dataset.defaultbg);
                }
            });
        }, 3000);
    }
}