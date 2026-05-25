function renderLuxuryNavbar(activePage) {
    const nombreAsesor = window.usuarioActual ? (window.usuarioActual.nombre_completo || window.usuarioActual.username || 'Usuario') : 'Usuario';
    
    // Contenedor principal que se inyectará al inicio del body
    const headerWrapper = document.createElement('div');

    headerWrapper.innerHTML = `
        <!-- TOP HEADER -->
        <header class="max-w-6xl mx-auto mb-6 md:mb-8 flex justify-between items-center pb-4 md:pb-5 border-b border-slate-100 md:border-slate-200 gap-4">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-slate-50 border border-amber-500/30 flex items-center justify-center text-[--gold-primary] shadow-sm">
                    <i data-lucide="shield-check" class="w-5 h-5"></i>
                </div>
                <div>
                    <span class="text-[9px] font-bold uppercase tracking-widest text-[--gold-primary]">Consola Corporativa</span>
                    <h1 class="text-lg font-bold tracking-tight text-slate-900">Century 21</h1>
                </div>
            </div>
            
            <!-- DESKTOP NAVIGATION -->
            <nav class="hidden md:flex flex-wrap justify-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80 shadow-inner">
                <a href="clientes.html" class="px-4 py-2 rounded-xl text-xs font-bold transition-all ${activePage === 'clientes' ? 'bg-[--gold-primary] text-black shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-white'}">
                    <i data-lucide="users" class="inline w-3.5 h-3.5 mr-1"></i> Prospectos
                </a>
                <a href="inventario.html" class="px-4 py-2 rounded-xl text-xs font-bold transition-all ${activePage === 'inventario' ? 'bg-[--gold-primary] text-black shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-white'}">
                    <i data-lucide="home" class="inline w-3.5 h-3.5 mr-1"></i> Inventario
                </a>
                <a href="cargar.html" class="px-4 py-2 rounded-xl text-xs font-bold transition-all ${activePage === 'cargar' ? 'bg-[--gold-primary] text-black shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-white'}">
                    <i data-lucide="file-up" class="inline w-3.5 h-3.5 mr-1"></i> Subir PDFs
                </a>
                <a href="calendario.html" class="px-4 py-2 rounded-xl text-xs font-bold transition-all ${activePage === 'calendario' ? 'bg-[--gold-primary] text-black shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-white'}">
                    <i data-lucide="calendar" class="inline w-3.5 h-3.5 mr-1"></i> Agenda
                </a>
                <a href="reportes.html" class="px-4 py-2 rounded-xl text-xs font-bold transition-all ${activePage === 'reportes' ? 'bg-[--gold-primary] text-black shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-white'}">
                    <i data-lucide="bar-chart-3" class="inline w-3.5 h-3.5 mr-1"></i> Reportes
                </a>
            </nav>

            <!-- HAMBURGER MENU (UNIVERSAL) -->
            <button onclick="toggleMobileMenu()" class="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-sm cursor-pointer transition-colors active:scale-95">
                <i data-lucide="menu" class="w-5 h-5"></i>
            </button>
        </header>

        <!-- MOBILE BOTTOM NAVIGATION (Pill Style) -->
        <nav class="md:hidden fixed bottom-4 left-4 right-4 bg-white/95 backdrop-blur-xl border border-slate-200 shadow-[0_10px_40px_rgba(0,0,0,0.1)] rounded-[2rem] px-4 py-2 flex justify-between items-center z-40">
            <a href="clientes.html" class="relative flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${activePage === 'clientes' ? 'text-[--gold-primary]' : 'text-slate-400 hover:text-slate-600'}">
                ${activePage === 'clientes' ? '<div class="absolute -top-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[--gold-primary] rounded-full shadow-[0_0_8px_rgba(212,175,55,0.8)]"></div>' : ''}
                <i data-lucide="users" class="w-5 h-5 mb-1 ${activePage === 'clientes' ? 'scale-110' : ''} transition-transform"></i>
                <span class="text-[9px] font-bold">Clientes</span>
            </a>
            <a href="inventario.html" class="relative flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${activePage === 'inventario' ? 'text-[--gold-primary]' : 'text-slate-400 hover:text-slate-600'}">
                ${activePage === 'inventario' ? '<div class="absolute -top-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[--gold-primary] rounded-full shadow-[0_0_8px_rgba(212,175,55,0.8)]"></div>' : ''}
                <i data-lucide="home" class="w-5 h-5 mb-1 ${activePage === 'inventario' ? 'scale-110' : ''} transition-transform"></i>
                <span class="text-[9px] font-bold">Inventario</span>
            </a>
            <a href="cargar.html" class="relative flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${activePage === 'cargar' ? 'text-[--gold-primary]' : 'text-slate-400 hover:text-slate-600'}">
                ${activePage === 'cargar' ? '<div class="absolute -top-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[--gold-primary] rounded-full shadow-[0_0_8px_rgba(212,175,55,0.8)]"></div>' : ''}
                <i data-lucide="file-up" class="w-5 h-5 mb-1 ${activePage === 'cargar' ? 'scale-110' : ''} transition-transform"></i>
                <span class="text-[9px] font-bold">Subir</span>
            </a>
            <a href="calendario.html" class="relative flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${activePage === 'calendario' ? 'text-[--gold-primary]' : 'text-slate-400 hover:text-slate-600'}">
                ${activePage === 'calendario' ? '<div class="absolute -top-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[--gold-primary] rounded-full shadow-[0_0_8px_rgba(212,175,55,0.8)]"></div>' : ''}
                <i data-lucide="calendar" class="w-5 h-5 mb-1 ${activePage === 'calendario' ? 'scale-110' : ''} transition-transform"></i>
                <span class="text-[9px] font-bold">Agenda</span>
            </a>
            <a href="reportes.html" class="relative flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${activePage === 'reportes' ? 'text-[--gold-primary]' : 'text-slate-400 hover:text-slate-600'}">
                ${activePage === 'reportes' ? '<div class="absolute -top-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[--gold-primary] rounded-full shadow-[0_0_8px_rgba(212,175,55,0.8)]"></div>' : ''}
                <i data-lucide="bar-chart-3" class="w-5 h-5 mb-1 ${activePage === 'reportes' ? 'scale-110' : ''} transition-transform"></i>
                <span class="text-[9px] font-bold">Reportes</span>
            </a>
        </nav>

        <!-- MOBILE SIDEBAR MENU -->
        <div id="mobileMenuOverlay" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] hidden opacity-0 transition-opacity duration-300" onclick="toggleMobileMenu()"></div>
        <div id="mobileMenuSidebar" class="fixed top-0 right-0 h-full w-72 bg-white shadow-2xl z-50 isolate transform translate-x-full transition-transform duration-300 flex flex-col p-6 rounded-l-3xl">
            <div class="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                <div class="flex items-center gap-2">
                    <i data-lucide="settings" class="w-5 h-5 text-[--gold-primary]"></i>
                    <h3 class="font-bold text-slate-900">Ajustes</h3>
                </div>
                <button onclick="toggleMobileMenu()" class="text-slate-400 hover:text-slate-600 p-2 -mr-2 cursor-pointer bg-slate-50 rounded-full hover:bg-slate-100 transition-colors">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            
            <div class="flex flex-col items-center mb-8 bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <div class="w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 mb-3 shadow-sm">
                    <i data-lucide="user" class="w-8 h-8"></i>
                </div>
                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Asesor Century 21</p>
                <p class="text-base font-bold text-slate-900 text-center">${nombreAsesor}</p>
            </div>

            <div class="space-y-3 flex-1">
                <button id="btnPushMenu" onclick="if(typeof manejarPushToggle === 'function') { manejarPushToggle(); } else { alert('Notificaciones no disponibles aquí.'); }" class="w-full flex items-center gap-3 p-4 rounded-2xl bg-amber-50/50 border border-amber-500/20 text-slate-800 hover:bg-amber-50 transition-colors cursor-pointer text-sm font-bold shadow-sm">
                    <div class="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-[--gold-dark]">
                        <i data-lucide="bell-off" class="w-4 h-4"></i>
                    </div>
                    Activar Notificaciones
                </button>
            </div>

            <button onclick="cerrarSesion()" class="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-500 hover:text-white transition-all cursor-pointer text-sm font-bold mt-auto shadow-sm active:scale-95">
                <i data-lucide="log-out" class="w-4 h-4"></i> Cerrar Sesión
            </button>
        </div>
    `;
    
    // Insertamos todo al inicio del body
    while (headerWrapper.firstChild) {
        document.body.insertBefore(headerWrapper.firstChild, document.body.firstChild);
    }
    
    // Agregar padding al body para que el contenido no quede debajo de la navbar flotante en móvil
    document.body.classList.add('pb-28', 'md:pb-6');

    // Crear un espaciador físico al final del body para asegurar que el último elemento sea visible y cliqueable sin cruzarse con la barra flotante
    const bottomSpacer = document.createElement('div');
    bottomSpacer.className = 'w-full h-32 md:hidden block shrink-0 clear-both pointer-events-none';
    document.body.appendChild(bottomSpacer);

    if(window.lucide) {
        lucide.createIcons();
    }
    
    // Configurar estado visual inicial del botón
    if (typeof actualizarBotonPush === 'function') {
        actualizarBotonPush();
    }

    // Mostrar mensaje diario a Mami
    setTimeout(mostrarMensajeMami, 1500); // 1.5s delay so it feels natural after loading
}

function actualizarBotonPush() {
    const btn = document.getElementById('btnPushMenu');
    if (!btn) return;
    
    if (localStorage.getItem('push_suscrito')) {
        btn.className = "w-full flex items-center gap-3 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-500/20 text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer text-sm font-bold shadow-sm";
        btn.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <i data-lucide="bell-ring" class="w-4 h-4"></i>
            </div>
            Notificaciones Activadas
        `;
    } else {
        btn.className = "w-full flex items-center gap-3 p-4 rounded-2xl bg-amber-50/50 border border-amber-500/20 text-slate-800 hover:bg-amber-50 transition-colors cursor-pointer text-sm font-bold shadow-sm";
        btn.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-[--gold-dark]">
                <i data-lucide="bell-off" class="w-4 h-4"></i>
            </div>
            Activar Notificaciones
        `;
    }
    if(window.lucide) lucide.createIcons();
}

function toggleMobileMenu() {
    const overlay = document.getElementById('mobileMenuOverlay');
    const sidebar = document.getElementById('mobileMenuSidebar');
    
    if (sidebar.classList.contains('translate-x-full')) {
        // Abrir
        overlay.classList.remove('hidden');
        // Pequeño delay para que la transición de opacidad funcione
        requestAnimationFrame(() => {
            overlay.classList.remove('opacity-0');
            sidebar.classList.remove('translate-x-full');
        });
    } else {
        // Cerrar
        overlay.classList.add('opacity-0');
        sidebar.classList.add('translate-x-full');
        // Esperar a que termine la animación para ocultar el div
        setTimeout(() => {
            overlay.classList.add('hidden');
        }, 300);
    }
}

function cerrarSesion() {
    localStorage.removeItem('adminToken');
    document.cookie = 'adminToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Secure; SameSite=Strict';
    window.location.href = 'login.html';
}

function mostrarMensajeMami() {
    const ultimoMensaje = localStorage.getItem('ultima_vez_mami');
    const ahora = new Date().getTime();
    
    // 24 horas = 86400000 ms
    if (!ultimoMensaje || (ahora - parseInt(ultimoMensaje)) > 86400000) {
        const mensajes = [
            "¡Te amo mami! ❤️",
            "¡Ten un bonito día mami! ☀️",
            "¡Vende mucho mami, eres la mejor! 🏡",
            "¡Eres la mejor asesora del mundo mami! 🥇",
            "¡Que tengas mucho éxito hoy mami! 🌟",
            "¡Echale muchas ganas mami, te quiero! 💕",
            "¡Un abrazo fuerte mami, tú puedes con todo! 🤗"
        ];
        const mensajeAleatorio = mensajes[Math.floor(Math.random() * mensajes.length)];
        
        const div = document.createElement('div');
        div.id = 'modalMami';
        div.className = 'fixed inset-0 bg-pink-500/20 backdrop-blur-md z-[9999] flex items-center justify-center animate-fade-in p-4';
        div.innerHTML = `
            <div class="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 border-4 border-pink-100 text-center relative overflow-hidden transition-all transform scale-100 duration-500">
                <div class="absolute -top-10 -right-10 w-32 h-32 bg-pink-100 rounded-full blur-2xl"></div>
                <div class="absolute -bottom-10 -left-10 w-32 h-32 bg-rose-100 rounded-full blur-2xl"></div>
                <div class="relative z-10">
                    <div class="w-24 h-24 mx-auto bg-gradient-to-tr from-pink-400 to-rose-300 rounded-full flex items-center justify-center mb-6 shadow-[0_10px_25px_rgba(244,114,182,0.4)]">
                        <i data-lucide="heart" class="w-12 h-12 text-white fill-white animate-pulse"></i>
                    </div>
                    <h2 class="text-2xl font-black text-slate-800 mb-2">¡Hola!</h2>
                    <p class="text-lg font-bold text-pink-600 mb-8 leading-snug">"${mensajeAleatorio}"</p>
                    <button onclick="document.getElementById('modalMami').remove()" class="w-full bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white font-bold text-lg py-4 rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer">
                        ¡Gracias hijo! 🥰
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(div);
        if (window.lucide) lucide.createIcons();
        
        localStorage.setItem('ultima_vez_mami', ahora.toString());
    }
}