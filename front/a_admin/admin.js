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
// CONEXIÓN SSE PARA NOTIFICACIONES EN TIEMPO REAL
// ==========================================
function inicializarSSE() {
    const sse = new EventSource(`${window.API_BASE_URL}/admin/sse`);
    
    sse.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'pdf_status') {
                mostrarNotificacion(data.message, data.status);
                
                // Si la IA terminó y estamos en inventario, recargamos silenciosamente
                if (data.status === 'success' && typeof cargarInventarioCompleto === 'function') {
                    cargarInventarioCompleto();
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
        tabla.innerHTML = filtrados.map(c => `
            <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3">
                    <div class="font-bold text-slate-900 flex items-center gap-2">
                        ${c.nombre}
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
                    </select>
                    <button onclick="ejecutarMatchmaking(${c.id_cliente})" class="bg-slate-900 hover:bg-[--gold-primary] text-[--gold-primary] hover:text-black font-bold p-1.5 rounded-xl border border-amber-500/20 transition-all cursor-pointer active:scale-95 shadow-md" title="Matchmaking Inteligente">
                        <i data-lucide="sparkles" class="w-4 h-4"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } else {
        tabla.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400">No hay prospectos en este estado.</td></tr>`;
    }
    lucide.createIcons();
}

async function actualizarEstadoCliente(id, estado) {
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

async function ejecutarMatchmaking(idCliente) {
    const modal = document.getElementById("modalMatch");
    const contenedorExactas = document.getElementById("contenedorExactas");
    const contenedorAlternativas = document.getElementById("contenedorAlternativas");

    try {
        const response = await fetch(`${window.API_BASE_URL}/admin/match/${idCliente}`);
        const res = await response.json();

        if (res.status === "success") {
            document.getElementById("modalClienteNombre").innerText = `Análisis de Match para: ${res.cliente.nombre}`;
            contenedorExactas.innerHTML = res.coincidencias_exactas.length === 0 ? `<p class="text-slate-400 text-xs col-span-2 italic">No hay propiedades exactas disponibles.</p>` : res.coincidencias_exactas.map(p => generarTarjetaPropiedad(p)).join('');
            contenedorAlternativas.innerHTML = res.alternativas_fuera_presupuesto.length === 0 ? `<p class="text-slate-400 text-xs col-span-2 italic">No hay alternativas que ofrecer en este rango.</p>` : res.alternativas_fuera_presupuesto.map(p => generarTarjetaPropiedad(p)).join('');
            modal.classList.remove("hidden");
            lucide.createIcons();
        }
    } catch (error) {
        alert("Error al ejecutar el algoritmo de cruce.");
    }
}

function generarTarjetaPropiedad(p) {
    const bgClass = p.estatus_propiedad === 'Disponible' ? 'bg-slate-50' : 'bg-slate-200 opacity-75';
    
    return `
        <div class="${bgClass} border border-slate-100 p-3 rounded-2xl flex flex-col justify-between hover:border-amber-500/40 transition-all cursor-pointer relative group" onclick="if('${p.carpeta_drive_fotos}') { window.open('${p.carpeta_drive_fotos}', '_blank'); } else { mostrarNotificacion('Esta propiedad aún no tiene fotos en Drive.', 'error'); }">
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
        
        // Actualizar en el estado global y re-renderizar para reflejar los cambios visualmente
        const p = window.inventarioGlobal?.find(x => x.id_propiedad === id);
        if (p) p.estatus_propiedad = estatus;
        
        // Si estamos en inventario, re-filtrar/renderizar
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
    fileList.innerHTML = archivosEnCola.map((f, i) => `
        <div class="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
            <span class="truncate pr-4"><i data-lucide="file-text" class="inline w-3.5 h-3.5 mr-1 text-slate-400"></i> ${f.name}</span>
            <button type="button" onclick="archivosEnCola.splice(${i},1); actualizarLista();" class="text-rose-500 cursor-pointer"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
        </div>
    `).join('');
    if (archivosEnCola.length > 0) btn.classList.remove("hidden"); else btn.classList.add("hidden");
    lucide.createIcons();
}

document.getElementById("btnProcesarPdf")?.addEventListener("click", async () => {
    const btn = document.getElementById("btnProcesarPdf");
    btn.disabled = true; btn.innerHTML = `Subiendo... <i data-lucide="loader" class="w-4 h-4 animate-spin"></i>`; lucide.createIcons();
    
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
        lucide.createIcons(); 
    }
});

// ==========================================
// RUTA 3: PANEL DE INVENTARIO GENERAL
// ==========================================
window.inventarioGlobal = [];

async function cargarInventarioCompleto() {
    const grid = document.getElementById("gridInventario");
    if (!grid) return;

    try {
        grid.innerHTML = `<p class="text-slate-400 text-xs italic col-span-3 text-center">Descargando catálogo desde la base de datos...</p>`;
        const response = await fetch(`${window.API_BASE_URL}/admin/propiedades`);
        const res = await response.json();

        if (res.status === "success") {
            window.inventarioGlobal = res.data;
            aplicarFiltrosInventario(); // Renderiza usando los filtros actuales
        } else {
            grid.innerHTML = `<p class="text-rose-500 text-xs text-center col-span-3">No se pudo cargar el inventario: ${res.message}</p>`;
        }
    } catch (e) {
        grid.innerHTML = `<p class="text-rose-500 text-xs text-center col-span-3">Error al conectar con la base de datos.</p>`;
    }
}

function aplicarFiltrosInventario() {
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

    if (propiedadesFiltradas.length === 0) {
        grid.innerHTML = `
            <div class="p-6 border border-slate-100 rounded-2xl text-center bg-slate-50 col-span-3">
                <i data-lucide="search-x" class="w-8 h-8 text-slate-300 mx-auto mb-2"></i>
                <h4 class="font-bold text-slate-500 text-sm">Sin resultados</h4>
                <p class="text-slate-400 text-xs mt-1">No hay propiedades que coincidan con estos filtros.</p>
            </div>
        `;
    } else {
        grid.innerHTML = propiedadesFiltradas.map(p => generarTarjetaPropiedad(p)).join('');
    }
    lucide.createIcons();
}