    let pasoActual = 0;
    const datosRespuestas = {
        zonas_seleccionadas: []
    };

    // Pasos del cuestionario, iniciando con la presentación (Paso 0)
    // Reemplaza el bloque de pasosCuestionario para que use los nuevos colores exactos:
    const pasosCuestionario = [
        {
            id: "presentacion",
            esPresentacion: true,
            html: `
                <div class="text-center space-y-6 py-2">
                    <div class="flex justify-center mb-2">
                        <div class="bg-white border border-slate-200 px-6 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-sm">
                            <img src="../assets/icons/c21.png" alt="Century 21" class="h-6 object-contain">
                            <span class="font-bold tracking-wider text-sm text-[var(--text-dark)]">Century 21</span>
                        </div>
                    </div>

                    <div class="relative w-24 h-24 mx-auto">
                        <div class="absolute inset-0 bg-[var(--gold-primary)] rounded-full blur-md opacity-30 animate-pulse"></div>
                        <div class="w-24 h-24 rounded-full bg-gradient-to-tr from-[var(--gold-primary)] to-[var(--gold-dark)] border border-slate-200 flex items-center justify-center text-white text-3xl font-bold shadow-xl relative z-10">
                            MC
                        </div>
                    </div>

                    <div class="space-y-1">
                        <h1 class="text-2xl font-bold tracking-tight text-[var(--text-dark)]"> Cecilia Ramirez</h1>
                        <p class="text-[var(--gold-dark)] text-xs font-semibold uppercase tracking-widest">Gerente de Ventas y Alianzas Comerciales</p>
                    </div>

                    <p class="text-slate-600 text-sm leading-relaxed px-2">
                        "Hola, bienvenido. Mi objetivo es ayudarte a encontrar el patrimonio o inversión ideal en Querétaro de forma ágil, segura y totalmente personalizada. Diseñé este breve asistente inteligente para entender exactamente qué tienes en mente en menos de 1 minuto."
                    </p>

                    <div class="pt-4">
                        <button type="button" onclick="iniciarCuestionario()" class="luxury-btn w-full py-3.5 flex items-center justify-center gap-2">
                            Comenzar Asistente Inteligente
                            <i data-lucide="sparkles" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            `
        },
        {
            id: "datos_basicos",
            titulo: "Comencemos con tus datos",
            descripcion: "Queremos saber quién eres para darte un seguimiento personalizado.",
            icono: "user",
            html: `
                <div class="space-y-3 pt-2">
                    <input type="text" id="nombre" placeholder="Tu nombre completo" required oninput="capitalizarNombre(this)" 
                        class="luxury-input w-full px-4 py-3">
                    
                    <input type="tel" id="telefono" placeholder="Número de WhatsApp (10 dígitos)" required oninput="validarSoloNumeros(this)" maxlength="10" 
                        class="luxury-input w-full px-4 py-3">
                    
                    <input type="email" id="correo" placeholder="Correo electrónico *" required
                        class="luxury-input w-full px-4 py-3">
                </div>
            `
        },
        {
            id: "tipo_operacion",
            titulo: "¿Qué tipo de operación buscas?",
            descripcion: "Selecciona si buscas comprar o rentar la propiedad.",
            icono: "key",
            html: `
                <div class="grid grid-cols-2 gap-4 pt-2">
                    <button type="button" onclick="seleccionarOpcionQuick('tipo_operacion', 'Venta')" class="luxury-option-btn p-4 rounded-2xl flex flex-col items-center gap-2 cursor-pointer">
                        <i data-lucide="badge-dollar-sign" class="text-[var(--gold-dark)] w-6 h-6"></i>
                        <span class="font-medium text-sm">Comprar</span>
                    </button>
                    <button type="button" onclick="seleccionarOpcionQuick('tipo_operacion', 'Renta')" class="luxury-option-btn p-4 rounded-2xl flex flex-col items-center gap-2 cursor-pointer">
                        <i data-lucide="calendar" class="text-[var(--gold-dark)] w-6 h-6"></i>
                        <span class="font-medium text-sm">Rentar</span>
                    </button>
                </div>
            `
        },
        {
            id: "tipo_propiedad",
            titulo: "¿Qué tipo de inmueble necesitas?",
            descripcion: "Elige la categoría que mejor se adapte a tu búsqueda.",
            icono: "home",
            html: `
                <div class="grid grid-cols-2 gap-3 pt-2">
                    <button type="button" onclick="seleccionarOpcionQuick('tipo_propiedad', 'Casa')" class="luxury-option-btn p-3 rounded-xl text-center text-sm font-medium cursor-pointer">Casa</button>
                    <button type="button" onclick="seleccionarOpcionQuick('tipo_propiedad', 'Departamento')" class="luxury-option-btn p-3 rounded-xl text-center text-sm font-medium cursor-pointer">Departamento</button>
                    <button type="button" onclick="seleccionarOpcionQuick('tipo_propiedad', 'Bodega')" class="luxury-option-btn p-3 rounded-xl text-center text-sm font-medium cursor-pointer">Bodega</button>
                    <button type="button" onclick="seleccionarOpcionQuick('tipo_propiedad', 'Terreno')" class="luxury-option-btn p-3 rounded-xl text-center text-sm font-medium cursor-pointer">Terreno</button>
                    <button type="button" onclick="seleccionarOpcionQuick('tipo_propiedad', 'Local')" class="luxury-option-btn p-3 rounded-xl text-center text-sm font-medium cursor-pointer">Local</button>
                </div>
            `
        },
        {
            id: "presupuesto_rangos",
            titulo: "¿Cuál es tu presupuesto estimado?",
            descripcion: "Selecciona el rango de precio que se adecúe a tus planes.",
            icono: "wallet",
            html: `
                <div class="grid grid-cols-1 gap-2.5 pt-2">
                    <button type="button" onclick="seleccionarOpcionQuick('presupuesto_max', 2000000)" class="luxury-option-btn py-3 px-4 rounded-xl text-left text-sm font-medium flex justify-between items-center cursor-pointer">
                        <span>De $1,000,000 a $2,000,000 MXN</span> <i data-lucide="chevron-right" class="w-4 h-4 text-slate-400"></i>
                    </button>
                    <button type="button" onclick="seleccionarOpcionQuick('presupuesto_max', 3000000)" class="luxury-option-btn py-3 px-4 rounded-xl text-left text-sm font-medium flex justify-between items-center cursor-pointer">
                        <span>De $2,000,000 a $3,000,000 MXN</span> <i data-lucide="chevron-right" class="w-4 h-4 text-slate-400"></i>
                    </button>
                    <button type="button" onclick="seleccionarOpcionQuick('presupuesto_max', 4000000)" class="luxury-option-btn py-3 px-4 rounded-xl text-left text-sm font-medium flex justify-between items-center cursor-pointer">
                        <span>De $3,000,000 a $4,000,000 MXN</span> <i data-lucide="chevron-right" class="w-4 h-4 text-slate-400"></i>
                    </button>
                    <button type="button" onclick="seleccionarOpcionQuick('presupuesto_max', 6000000)" class="luxury-option-btn py-3 px-4 rounded-xl text-left text-sm font-medium flex justify-between items-center cursor-pointer">
                        <span>Más de $4,000,000 MXN</span> <i data-lucide="chevron-right" class="w-4 h-4 text-slate-400"></i>
                    </button>
                </div>
            `
        },
        {
            id: "zona_interes_paso",
            titulo: "¿En qué zonas de Querétaro buscas?",
            descripcion: "Puedes seleccionar una o más opciones. Si buscas en otra parte, elige 'Otra ubicación'.",
            icono: "map-pin",
            html: `
                <div class="space-y-4 pt-2">
                    <div class="grid grid-cols-2 gap-2">
                        <button type="button" onclick="conmutarZonaSeleccionada('Juriquilla', this)" class="zona-btn luxury-option-btn py-2.5 rounded-xl text-center cursor-pointer text-xs font-medium">Juriquilla</button>
                        <button type="button" onclick="conmutarZonaSeleccionada('Sakiá', this)" class="zona-btn luxury-option-btn py-2.5 rounded-xl text-center cursor-pointer text-xs font-medium">Sakiá</button>
                        <button type="button" onclick="conmutarZonaSeleccionada('Campanario', this)" class="zona-btn luxury-option-btn py-2.5 rounded-xl text-center cursor-pointer text-xs font-medium">Campanario</button>
                        <button type="button" onclick="conmutarZonaSeleccionada('Zibatá', this)" class="zona-btn luxury-option-btn py-2.5 rounded-xl text-center cursor-pointer text-xs font-medium">Zibatá</button>
                        <button type="button" onclick="conmutarZonaSeleccionada('Centro', this)" class="zona-btn luxury-option-btn py-2.5 rounded-xl text-center cursor-pointer text-xs font-medium">Centro</button>
                        <button type="button" onclick="conmutarZonaSeleccionada('Corregidora', this)" class="zona-btn luxury-option-btn py-2.5 rounded-xl text-center cursor-pointer text-xs font-medium">Corregidora</button>
                        <button type="button" onclick="conmutarZonaSeleccionada('Otro', this)" class="zona-btn luxury-option-btn py-2.5 rounded-xl text-center cursor-pointer text-xs font-medium col-span-2">Otra ubicación...</button>
                    </div>
                    <div id="wrapperOtro" class="hidden animate-fade-in">
                        <input type="text" id="zona_personalizada" placeholder="Escribe el nombre de la otra zona o colonia" class="luxury-input w-full px-4 py-3">
                    </div>
                    <div class="space-y-1">
                        <label class="text-xs text-slate-500 font-medium">Especificaciones adicionales (Opcional)</label>
                        <textarea id="especificaciones" placeholder="Ej. Patio amplio, alberca, seguridad 24/7..." rows="2" class="luxury-input w-full px-4 py-3"></textarea>
                    </div>
                </div>
            `
        }
    ];

    // ==========================================
    // VALIDACIONES Y FORMATEO
    // ==========================================
    function validarSoloNumeros(input) { input.value = input.value.replace(/[^0-9]/g, ''); }
    function validarEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

    function capitalizarNombre(input) {
        const start = input.selectionStart;
        const end = input.selectionEnd;
        let palabras = input.value.split(' ');
        for (let i = 0; i < palabras.length; i++) {
            if (palabras[i].length > 0) palabras[i] = palabras[i][0].toUpperCase() + palabras[i].substring(1).toLowerCase();
        }
        input.value = palabras.join(' ');
        input.setSelectionRange(start, end);
    }

    // ==========================================
    // ALERTAS ANIMADAS
    // ==========================================
    function mostrarAlerta(mensaje, tipo = 'error') {
        const alertaPrevia = document.getElementById('customAlert');
        if (alertaPrevia) alertaPrevia.remove();

        const alerta = document.createElement('div');
        alerta.id = 'customAlert';
        
        const bgColor = tipo === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800';
        const iconColor = tipo === 'error' ? 'text-red-500' : 'text-green-500';
        const icon = tipo === 'error' ? 'alert-circle' : 'check-circle';
        
        alerta.className = `fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl border shadow-xl transform transition-all duration-300 translate-x-[120%] opacity-0 ${bgColor} font-sans`;
        
        alerta.innerHTML = `
            <i data-lucide="${icon}" class="${iconColor} w-6 h-6"></i>
            <span class="font-semibold text-sm tracking-wide">${mensaje}</span>
        `;
        
        document.body.appendChild(alerta);
        lucide.createIcons();

        // Animar entrada
        setTimeout(() => {
            alerta.classList.remove('translate-x-[120%]', 'opacity-0');
            alerta.classList.add('translate-x-0', 'opacity-100');
        }, 10);

        // Animar salida
        setTimeout(() => {
            alerta.classList.remove('translate-x-0', 'opacity-100');
            alerta.classList.add('translate-x-[120%]', 'opacity-0');
            setTimeout(() => alerta.remove(), 300);
        }, 3500);
    }

    // ==========================================
    // CONTROL DEL RENDERIZADO
    // ==========================================
    function renderizarPaso() {
        const paso = pasosCuestionario[pasoActual];
        const contenedor = document.getElementById("contenedorPregunta");
        
        // Si estamos en la presentación, ocultamos la barra y los botones globales
        if (paso.esPresentacion) {
            document.getElementById("wrapperProgress").classList.add("hidden");
            document.getElementById("wrapperButtons").classList.add("hidden");
            contenedor.innerHTML = paso.html;
            lucide.createIcons();
            return;
        }

        // Mostramos la barra y botones en las preguntas
        document.getElementById("wrapperProgress").classList.remove("hidden");
        document.getElementById("wrapperButtons").classList.remove("hidden");

        // Calcular progreso excluyendo la pantalla de presentación
        const porcentajeProgreso = (pasoActual / (pasosCuestionario.length - 1)) * 100;
        document.getElementById("progressBar").style.width = `${porcentajeProgreso}%`;

        contenedor.innerHTML = `
            <div class="space-y-4">
                <div class="flex items-center gap-3">
                    <div class="p-2 bg-[var(--gold-primary)]/10 rounded-xl border border-[var(--gold-primary)]">
                        <i data-lucide="${paso.icono}" class="text-[var(--gold-dark)] w-6 h-6"></i>
                    </div>
                    <h2 class="text-xl font-semibold tracking-tight text-[var(--text-dark)]">${paso.titulo}</h2>
                </div>
                <p class="text-slate-600 text-sm">${paso.descripcion}</p>
                <div class="pt-2">
                    ${paso.html}
                </div>
            </div>
        `;

        const btnBack = document.getElementById("btnBack");
        if (pasoActual === 1) btnBack.classList.add("invisible"); // El paso 1 es el primero del formulario real
        else btnBack.classList.remove("invisible");

        const btnNext = document.getElementById("btnNext");
        if (pasoActual === pasosCuestionario.length - 1) {
            btnNext.innerHTML = `Finalizar Perfilamiento <i data-lucide="check" class="w-4 h-4"></i>`;
        } else {
            btnNext.innerHTML = `Continuar <i data-lucide="arrow-right" class="w-4 h-4"></i>`;
        }

        if (paso.id === "zona_interes_paso") {
            document.querySelectorAll('.zona-btn').forEach(btn => {
                const textoBoton = btn.innerText === "Otra ubicación..." ? "Otro" : btn.innerText;
                if (datosRespuestas.zonas_seleccionadas.includes(textoBoton)) {
                    btn.classList.add('selected');
                    if (textoBoton === 'Otro') document.getElementById("wrapperOtro").classList.remove("hidden");
                }
            });
        }

        lucide.createIcons();
    }

    function iniciarCuestionario() {
        pasoActual = 1; // Brinca de la presentación a la primera pregunta
        renderizarPaso();
    }

    function seleccionarOpcionQuick(idCampo, valor) {
        datosRespuestas[idCampo] = valor;
        pasoActual++;
        renderizarPaso();
    }

    function conmutarZonaSeleccionada(zona, botonElemento) {
        const index = datosRespuestas.zonas_seleccionadas.indexOf(zona);
        if (index > -1) {
            datosRespuestas.zonas_seleccionadas.splice(index, 1);
            botonElemento.classList.remove('selected');
            if (zona === 'Otro') document.getElementById("wrapperOtro").classList.add("hidden");
        } else {
            datosRespuestas.zonas_seleccionadas.push(zona);
            botonElemento.classList.add('selected');
            if (zona === 'Otro') document.getElementById("wrapperOtro").classList.remove("hidden");
        }
    }

    function avanzarPaso() {
        const paso = pasosCuestionario[pasoActual];

        if (paso.id === "datos_basicos") {
            const nombre = document.getElementById("nombre").value.trim();
            const telefono = document.getElementById("telefono").value.trim();
            const correo = document.getElementById("correo").value.trim();

            if (!nombre || nombre.length < 4) return mostrarAlerta("Por favor, ingresa tu nombre completo.");
            if (telefono.length < 10) return mostrarAlerta("El número de WhatsApp debe tener 10 dígitos.");
            if (!correo) return mostrarAlerta("Por favor, ingresa tu correo electrónico.");
            if (!validarEmail(correo)) return mostrarAlerta("Por favor, ingresa un correo válido.");
            
            datosRespuestas.nombre = nombre;
            datosRespuestas.telefono = telefono;
            datosRespuestas.correo = correo;
        } 
        else if (paso.id === "zona_interes_paso") {
            if (datosRespuestas.zonas_seleccionadas.length === 0) return mostrarAlerta("Por favor, selecciona al menos una zona.");

            let copiaZonas = [...datosRespuestas.zonas_seleccionadas];
            const indexOtro = copiaZonas.indexOf('Otro');
            if (indexOtro > -1) {
                const personalizado = document.getElementById("zona_personalizada").value.trim();
                if (!personalizado) return mostrarAlerta("Por favor, escribe la ubicación personalizada.");
                copiaZonas.splice(indexOtro, 1, personalizado);
            }

            datosRespuestas.zona_interes = copiaZonas.join(', ');
            datosRespuestas.especificaciones = document.getElementById("especificaciones").value.trim() || null;

            enviarPerfilamientoAlBackend();
            return;
        } else {
            if (!datosRespuestas[paso.id === "tipo_operacion" ? "tipo_operacion" : paso.id === "tipo_propiedad" ? "tipo_propiedad" : "presupuesto_max"]) {
                return mostrarAlerta("Por favor, selecciona una opción.");
            }
        }

        pasoActual++;
        renderizarPaso();
    }

    let enviando = false;
    async function enviarPerfilamientoAlBackend() {
        if (enviando) return;
        enviando = true;
        
        try {
            const response = await fetch(`${window.API_BASE_URL}/clientes/perfilar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosRespuestas)
            });
            const resultado = await response.json();

            if (resultado.status === 'success') {
                document.getElementById("perfilamientoForm").innerHTML = `
                    <div class="text-center py-6 space-y-4 animate-fade-in">
                        <div class="w-16 h-16 bg-green-50 border border-green-200 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                            <i data-lucide="party-popper" class="w-8 h-8"></i>
                        </div>
                        <h2 class="text-2xl font-bold tracking-tight text-[var(--text-dark)]">¡Muchas gracias, ${datosRespuestas.nombre.split(' ')[0]}!</h2>
                        <p class="text-slate-600 text-sm px-4">Tus requerimientos han sido asignados directamente a la gerencia de <strong class="text-[var(--gold-dark)]">Cecilia Ramirez</strong>. Analizaremos las mejores opciones de inmediato.</p>
                    </div>
                `;
                document.getElementById("wrapperProgress")?.remove();
                document.getElementById("wrapperButtons")?.remove();
                lucide.createIcons();
            } else {
                mostrarAlerta("Hubo un error: " + resultado.message);
                enviando = false;
            }
        } catch (error) {
            console.error("Error en el envío:", error);
            mostrarAlerta("No se pudo conectar con el servidor.");
            enviando = false;
        }
    }

    document.getElementById("btnNext").addEventListener("click", avanzarPaso);
    document.getElementById("btnBack").addEventListener("click", () => {
        if (pasoActual > 1) { // Evita regresar a la pantalla de presentación una vez iniciado
            pasoActual--;
            renderizarPaso();
        }
    });

    renderizarPaso();