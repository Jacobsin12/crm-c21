function renderLuxuryNavbar(activePage) {
    const header = document.createElement('header');
    header.className = "max-w-6xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center pb-5 gap-4";
    
    header.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-slate-50 border border-amber-500/30 flex items-center justify-center text-[--gold-primary] shadow-sm">
                <i data-lucide="shield-check" class="w-5 h-5"></i>
            </div>
            <div>
                <span class="text-[9px] font-bold uppercase tracking-widest text-[--gold-primary]">Consola Corporativa</span>
                <h1 class="text-lg font-bold tracking-tight text-slate-900">Century 21</h1>
            </div>
        </div>
        
        <nav class="flex flex-wrap justify-center md:justify-start gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80 shadow-inner w-full md:w-auto">
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

        <div class="hidden md:flex items-center gap-4 text-right text-xs text-slate-500 font-medium">
            <span>Asesor: <span class="text-slate-900 font-semibold">${window.usuarioActual ? (window.usuarioActual.nombre_completo || window.usuarioActual.username || 'Usuario') : 'Usuario'}</span></span>
            <button onclick="cerrarSesion()" class="text-rose-500 hover:text-white hover:bg-rose-500 px-3 py-1.5 rounded-lg font-bold border border-rose-200 transition-all cursor-pointer">
                Cerrar Sesión
            </button>
        </div>
    `;
    
    document.body.insertBefore(header, document.body.firstChild);
    lucide.createIcons();
}

function cerrarSesion() {
    localStorage.removeItem('adminToken');
    window.location.href = 'login.html';
}