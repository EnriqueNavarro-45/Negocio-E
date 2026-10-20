/* ========== DATOS BASE ========== */
const BASE = [
  ['Mango','frutas',45,'Mango1'],['Manzana','frutas',40,'Manzana1'],['Plátano','frutas',22,'Platano1'],
  ['Fresa','frutas',65,'Fresa1'],['Papaya','frutas',28,'Papaya1'],['Limón','frutas',30,'limon'],
  ['Naranja','frutas',18,'Naranja1'],['Piña','frutas',32,'Piña1'],['Sandía','frutas',20,'Sandia1'],
  ['Melón','frutas',25,'Melon1'],
  ['Jitomate','verduras',28,'Jitomate1'],['Cebolla','verduras',20,'cebolla'],['Papa','verduras',25,'Papa1'],
  ['Aguacate','verduras',75,'Aguacate1'],['Brócoli','verduras',34,'Brocoli1'],['Calabacita','verduras',26,'calabacita'],
  ['Zanahoria','verduras',16,'zanahoria'],['Pepino','verduras',22,'Pepino1'],['Espinaca','verduras',30,'Espinaca1'],
  ['Elote','verduras',24,'Elote1'],
  ['Arroz','cereales',24,'Arroz1'],['Avena','cereales',30,'avena'],['Frijol Negro','cereales',38,'frijol negro'],
  ['Almendras','cereales',180,'almendra'],['Maíz','cereales',26,'Maiz1'],['Trigo','cereales',28,'Trigo1'],
  ['Quinoa','cereales',95,'Quinoa1'],['Lenteja','cereales',36,'Lenteja1'],['Garbanzo','cereales',42,'Garbanzo1'],
  ['Amaranto','cereales',70,'Amaranto1'],
  ['Chile Poblano','chiles',45,'poblano'],['Chile Jalapeño','chiles',32,'Jalapeno1'],['Chile Serrano','chiles',36,'serrano'],
  ['Chile Habanero','chiles',80,'Habanero1'],['Chile Ancho','chiles',88,'Ancho1'],['Chile Guajillo','chiles',82,'Guajillo1'],
  ['Chile Chilaca','chiles',48,'Chilaca1'],['Chile de Árbol','chiles',90,'Arbol1'],['Chile Pasilla','chiles',88,'Pasilla1'],
  ['Chile Morita','chiles',95,'Morita1']
];

const INVENTARIO_INICIAL = BASE.map(([name, category, price, img]) => ({
    name, category, price, stock: 10, unit: 'kg',
    image: `Imagenes/Img productos/${img}.jpg`, active: true
}));

const CLAVE_INVENTARIO  = 'inventarioSanGerardo';
const CLAVE_OFERTAS     = 'ofertasSanGerardo';
const CLAVE_PROMOCIONES = 'promocionesSanGerardo';
const CLAVE_PEDIDOS     = 'pedidosSanGerardo';

const CATEGORIAS = {
    frutas: 'Frutas',
    verduras: 'Verduras',
    cereales: 'Cereales',
    chiles: 'Chiles'
};

const STOCK_BAJO = 3;

/* ========== UTILIDADES ========== */
const $ = id => document.getElementById(id);

const esc = t => String(t ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const normalizar = t => String(t || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-MX');

const dinero = n => '$' + Number(n || 0).toFixed(2);

const hoy = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
};

const fechaCorta = iso => new Date(iso).toLocaleDateString('es-MX');

const leer = clave => {
    try {
        const d = JSON.parse(localStorage.getItem(clave));
        return Array.isArray(d) ? d : [];
    } catch {
        return [];
    }
};
const escribir = (clave, datos) => localStorage.setItem(clave, JSON.stringify(datos));

/* ----- Overlays (modales) ----- */
function abrirOverlay(id) {
    const el = $(id);
    el.classList.add('activo');
    el.setAttribute('aria-hidden', 'false');
}
function cerrarOverlay(id) {
    const el = $(id);
    el.classList.remove('activo');
    el.setAttribute('aria-hidden', 'true');
}

/* ----- Toast ----- */
let toastTimer;
function toast(titulo, mensaje) {
    $('toast-titulo').textContent = titulo;
    $('toast-mensaje').textContent = mensaje;
    $('admin-toast').classList.add('activo');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('admin-toast').classList.remove('activo'), 2800);
}

/* ----- Confirmación ----- */
let accionConfirmacion = null;
function mostrarConfirmacion(titulo, mensaje, textoAceptar, callback) {
    $('admin-confirm-titulo').textContent = titulo;
    $('admin-confirm-mensaje').textContent = mensaje;
    $('admin-confirm-aceptar').textContent = textoAceptar || 'Confirmar';
    accionConfirmacion = callback;
    abrirOverlay('admin-confirmacion');
}
function cerrarConfirmacion() {
    cerrarOverlay('admin-confirmacion');
    accionConfirmacion = null;
}

/* ========== INVENTARIO ========== */
function inventarioValido(d) {
    return Array.isArray(d) && d.length > 0 && d.every(p =>
        p && typeof p.name === 'string' &&
        Number.isFinite(Number(p.price)) &&
        Number.isFinite(Number(p.stock))
    );
}

function cargarInventario() {
    let datos = null;
    try { datos = JSON.parse(localStorage.getItem(CLAVE_INVENTARIO)); } catch {}
    if (!inventarioValido(datos)) {
        datos = structuredClone(INVENTARIO_INICIAL);
        localStorage.setItem(CLAVE_INVENTARIO, JSON.stringify(datos));
    }
    return datos;
}

let inventario = cargarInventario();
let ofertas = leer(CLAVE_OFERTAS);
let promociones = leer(CLAVE_PROMOCIONES);
let pedidos = leer(CLAVE_PEDIDOS);

const guardarInventario = () => localStorage.setItem(CLAVE_INVENTARIO, JSON.stringify(inventario));

function estado(p) {
    if (p.stock <= 0) return ['agotado', 'Agotado'];
    if (!p.active) return ['oculto', 'No disponible'];
    if (p.stock <= STOCK_BAJO) return ['bajo', 'Stock bajo'];
    return ['disponible', 'Disponible'];
}

function renderizarInventario() {
    const termino = normalizar($('buscar-admin').value.trim());
    const categoria = $('filtro-admin').value;

    const filas = inventario
        .map((p, i) => ({ p, i }))
        .filter(({ p }) =>
            (!termino || normalizar(p.name).includes(termino)) &&
            (categoria === 'todos' || p.category === categoria)
        );

    $('inventario-tabla').innerHTML = filas.length
        ? filas.map(({ p, i }) => {
            const [clase, texto] = estado(p);
            return `<tr>
                <td>
                    <div class="admin-product-cell">
                        <img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" onerror="this.style.visibility='hidden'">
                        <strong>${esc(p.name)}</strong>
                    </div>
                </td>
                <td>${esc(CATEGORIAS[p.category] || p.category)}</td>
                <td>${dinero(p.price)} MXN</td>
                <td>${Number(p.stock)} kg</td>
                <td><span class="estado estado-${clase}">${texto}</span></td>
                <td>
                    <div class="admin-row-actions">
                        <button type="button" class="admin-edit-btn" data-indice="${i}">Editar</button>
                        <button type="button" class="btn-eliminar-producto" data-eliminar="${i}">Eliminar</button>
                    </div>
                </td>
            </tr>`;
        }).join('')
        : `<tr><td colspan="6" class="admin-empty">No encontramos productos con esos criterios.</td></tr>`;

    $('stat-productos').textContent   = inventario.length;
    $('stat-disponibles').textContent = inventario.filter(p => p.active && p.stock > 0).length;
    $('stat-stock-bajo').textContent  = inventario.filter(p => p.stock > 0 && p.stock <= STOCK_BAJO).length;
    $('stat-agotados').textContent    = inventario.filter(p => p.stock <= 0).length;
}

function abrirEditor(indice) {
    const p = inventario[indice];
    if (!p) return;
    $('producto-indice').value = indice;
    $('modal-inventario-titulo').textContent = p.name;
    $('modal-producto-nombre').textContent = p.name;
    $('modal-producto-categoria').textContent = CATEGORIAS[p.category] || p.category;
    $('modal-producto-imagen').src = p.image;
    $('modal-producto-imagen').alt = p.name;
    $('producto-precio').value = p.price;
    $('producto-stock').value = p.stock;
    $('producto-activo').checked = p.active;
    abrirOverlay('modal-inventario');
    $('producto-precio').focus();
}
const cerrarEditor = () => cerrarOverlay('modal-inventario');

/* ========== OFERTAS ========== */
function estadoOferta(o) {
    if (!o.activa) return ['pausada', 'Pausada'];
    if (o.fin && o.fin < hoy()) return ['vencida', 'Vencida'];
    return ['vigente', 'Vigente'];
}

function renderOfertas() {
    const seleccionado = $('oferta-producto').value;
    $('oferta-producto').innerHTML =
        '<option value="">Selecciona un producto</option>' +
        inventario.map(p => `<option value="${esc(p.name)}">${esc(p.name)}</option>`).join('');
    $('oferta-producto').value = seleccionado;

    const grid = $('ofertas-grid');
    if (!ofertas.length) {
        grid.innerHTML = `
            <div class="ofertas-vacio">
                <strong>Aún no hay ofertas</strong>
                Crea la primera con el formulario de arriba.
            </div>`;
        return;
    }

    grid.innerHTML = ofertas.map(o => {
        const p = inventario.find(x => x.name === o.producto);
        const base = p ? Number(p.price) : 0;
        const precioOferta = base * (1 - o.descuento / 100);
        const [clase, texto] = estadoOferta(o);
        const img = p ? p.image : '';
        const categoria = p ? (CATEGORIAS[p.category] || p.category) : '';

        return `
        <article class="oferta-card">
            <div class="oferta-card-header">
                <img src="${esc(img)}" alt="${esc(o.producto)}" loading="lazy" onerror="this.style.visibility='hidden'">
                <div>
                    <strong>${esc(o.producto)}</strong>
                    <span>${esc(categoria)}</span>
                </div>
                <span class="oferta-badge estado estado-${clase}">${texto}</span>
            </div>
            <div class="oferta-card-body">
                <span class="oferta-descuento-tag">−${Number(o.descuento)}% OFF</span>
                <div class="oferta-precios">
                    <span class="oferta-precio-oferta">${dinero(precioOferta)}</span>
                    <span class="oferta-precio-normal">${dinero(base)}</span>
                </div>
                <p class="oferta-meta">${o.fin ? 'Válida hasta ' + fechaCorta(o.fin + 'T00:00') : 'Sin fecha de vencimiento'}</p>
            </div>
            <div class="oferta-card-footer">
                <button type="button" data-accion="pausar" data-id="${esc(o.id)}">${o.activa ? 'Pausar' : 'Activar'}</button>
                <button type="button" class="btn-eliminar-oferta" data-accion="eliminar" data-id="${esc(o.id)}">Eliminar</button>
            </div>
        </article>`;
    }).join('');
}

/* ========== PROMOCIONES Y CUPONES ========== */
function beneficioPromocion(p) {
    const valor = String(p.valor ?? '').trim();
    if (p.tipo === 'porcentaje') return (valor ? valor + '%' : 'Porcentaje') + ' de descuento';
    if (p.tipo === 'monto') return (valor ? '$' + valor + ' MXN' : 'Monto') + ' de descuento';
    if (p.tipo === '2x1') return 'Promoción 2x1';
    return p.descripcion || 'Beneficio informativo';
}

function textoAplica(p) {
    if (p.aplica === 'categoria') return 'Línea: ' + (CATEGORIAS[p.categoria] || p.categoria);
    if (p.aplica === 'productos') {
        const n = Array.isArray(p.productos) ? p.productos.length : 0;
        return n + (n === 1 ? ' producto' : ' productos');
    }
    return 'Todos los productos';
}

function estadoPromocion(p) {
    if (!p.activa) return ['inactiva', 'Inactiva'];
    if (p.fechaFin && p.fechaFin < hoy()) return ['vencida', 'Vencida'];
    return ['', 'Activa'];
}

function renderPromociones() {
    promociones = leer(CLAVE_PROMOCIONES);
    const tbody = $('promociones-tabla');
    $('contador-promociones').textContent =
        promociones.length + (promociones.length === 1 ? ' promoción' : ' promociones');

    if (!promociones.length) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="promocion-vacia"><strong>Aún no hay cupones</strong><br>Crea el primero con el botón "+ Agregar cupón".</div></td></tr>`;
        return;
    }

    tbody.innerHTML = promociones.map(p => {
        const [claseEstado, textoEstado] = estadoPromocion(p);
        return `
        <tr>
            <td>
                <strong>${esc(p.nombre || 'Promoción sin nombre')}</strong>
                <small class="admin-muted-subline">${esc(p.descripcion || 'Sin descripción')}</small>
            </td>
            <td><span class="promocion-codigo">${esc(p.codigo || 'SIN CÓDIGO')}</span></td>
            <td>
                ${esc(beneficioPromocion(p))}
                <small class="admin-muted-subline">${esc(textoAplica(p))}${Number(p.minimo) > 0 ? ' · mín. ' + dinero(p.minimo) : ''}${p.fechaFin ? ' · hasta ' + esc(fechaCorta(p.fechaFin + 'T00:00')) : ''}</small>
            </td>
            <td><span class="promocion-estado ${claseEstado}">${textoEstado}</span></td>
            <td>
                <div class="promocion-acciones">
                    <button type="button" data-promo-accion="editar" data-id="${esc(p.id)}">Editar</button>
                    <button type="button" data-promo-accion="estado" data-id="${esc(p.id)}">${p.activa ? 'Desactivar' : 'Activar'}</button>
                    <button type="button" class="eliminar" data-promo-accion="eliminar" data-id="${esc(p.id)}">Eliminar</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function actualizarCamposAplica() {
    const aplica = $('promocion-aplica').value;
    $('promocion-categoria-wrap').hidden = aplica !== 'categoria';
    $('promocion-productos-wrap').hidden = aplica !== 'productos';
}

function llenarSelectProductosPromo(seleccionados = []) {
    $('promocion-productos').innerHTML = inventario
        .map(p => `<option value="${esc(p.name)}" ${seleccionados.includes(p.name) ? 'selected' : ''}>${esc(p.name)}</option>`)
        .join('');
}

function abrirFormPromocion(promo = null) {
    $('form-promocion').reset();
    $('promocion-id-edicion').value = '';
    llenarSelectProductosPromo(promo && Array.isArray(promo.productos) ? promo.productos : []);

    if (promo) {
        $('promocion-id-edicion').value = promo.id;
        $('promocion-nombre').value = promo.nombre ?? '';
        $('promocion-codigo').value = promo.codigo ?? '';
        $('promocion-tipo').value = promo.tipo || 'porcentaje';
        $('promocion-valor').value = promo.valor ?? '';
        $('promocion-descripcion').value = promo.descripcion ?? '';
        $('promocion-aplica').value = promo.aplica || 'todos';
        $('promocion-categoria').value = promo.categoria || 'frutas';
        $('promocion-minimo').value = promo.minimo ?? '';
        $('promocion-fecha-fin').value = promo.fechaFin ?? '';
        $('promocion-activa').checked = promo.activa !== false;
        $('titulo-form-promocion').textContent = 'Editar cupón';
        $('guardar-promocion').textContent = 'Guardar cambios';
    } else {
        $('titulo-form-promocion').textContent = 'Agregar cupón';
        $('guardar-promocion').textContent = 'Guardar promoción';
        $('promocion-activa').checked = true;
    }

    actualizarCamposAplica();
    abrirOverlay('modal-promocion');
    $('promocion-nombre').focus();
}
const cerrarFormPromocion = () => cerrarOverlay('modal-promocion');

/* ========== PEDIDOS ========== */
function normalizarEstadoPedido(estado) {
    const valor = normalizar(estado).trim();
    const validos = ['pendiente', 'confirmado', 'preparando', 'listo para entregar', 'en camino', 'entregado', 'cancelado'];
    if (validos.includes(valor)) return valor;
    if (valor === 'encamino') return 'en camino';
    if (valor === 'listoparaentregar') return 'listo para entregar';
    return 'pendiente';
}

function textoEstadoPedido(estado) {
    const estados = {
        'pendiente': 'Pendiente',
        'confirmado': 'Confirmado',
        'preparando': 'Preparando',
        'listo para entregar': 'Listo para entregar',
        'en camino': 'En camino',
        'entregado': 'Entregado',
        'cancelado': 'Cancelado'
    };
    return estados[normalizarEstadoPedido(estado)];
}

function obtenerItemsPedido(pedido) {
    const lista = (Array.isArray(pedido.items) && pedido.items.length) ? pedido.items
                : (Array.isArray(pedido.productos) ? pedido.productos : []);

    return lista.map(item => {
        const cantidad = Number(item.cantidad ?? item.kg) || 0;
        const precio = Number(item.precioKg ?? item.price) || 0;
        return {
            nombre: item.producto || item.name || 'Producto',
            cantidad,
            unidad: item.unidad || 'kg',
            precio,
            total: Number(item.total) || cantidad * precio
        };
    });
}

function obtenerFechaPedido(pedido) {
    if (!pedido.fecha) return 'Sin fecha';
    if (typeof pedido.fecha === 'string' && pedido.fecha.includes('T')) {
        const fecha = new Date(pedido.fecha);
        if (!Number.isNaN(fecha.getTime())) return fecha.toLocaleDateString('es-MX');
    }
    return pedido.fecha;
}

/* Convierte cualquier valor guardado (texto u objeto) en texto legible */
function textoPlano(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') {
        const partes = [v.nombre, v.apellido, v.apellidos]
            .filter(x => typeof x === 'string' && x.trim());
        if (partes.length) return partes.join(' ');
        return textoPlano(v.name || v.nombreCompleto || v.correo || v.email || '');
    }
    return String(v).trim();
}

function obtenerNombreCliente(pedido) {
    for (const campo of [pedido.nombreCliente, pedido.cliente, pedido.nombre, pedido.usuario]) {
        const t = textoPlano(campo);
        if (t && t !== 'usuario_sin_correo') return t;
    }
    return 'Cliente';
}

function obtenerCorreoPedido(pedido) {
    const t = textoPlano(pedido.correo || pedido.usuario);
    return t && t !== 'usuario_sin_correo' ? t : '';
}

const slugEstado = e => normalizarEstadoPedido(e).replace(/\s+/g, '-');

function obtenerTotalPedido(pedido) {
    if (pedido.total !== undefined && pedido.total !== null && Number.isFinite(Number(pedido.total))) {
        return Number(pedido.total);
    }
    return obtenerItemsPedido(pedido).reduce((suma, item) => suma + Number(item.total || 0), 0);
}

function renderPedidos() {
    pedidos = leer(CLAVE_PEDIDOS);
    const filtro = normalizar($('filtro-pedidos').value);
    const lista = pedidos.filter(p => filtro === 'todos' || normalizarEstadoPedido(p.estado) === filtro);

    const pendientes = pedidos.filter(p => normalizarEstadoPedido(p.estado) === 'pendiente').length;
    $('tab-btn-pedidos').textContent = 'Pedidos' + (pendientes ? ` (${pendientes})` : '');

    if (!lista.length) {
        $('pedidos-tabla').innerHTML = `<tr><td colspan="7" class="admin-empty">No hay pedidos para mostrar.</td></tr>`;
        return;
    }

    const opciones = ['pendiente', 'confirmado', 'preparando', 'listo para entregar', 'en camino', 'entregado', 'cancelado'];

    $('pedidos-tabla').innerHTML = lista.map(pedido => {
        const items = obtenerItemsPedido(pedido);
        const total = obtenerTotalPedido(pedido);
        const est = normalizarEstadoPedido(pedido.estado);
        const id = esc(pedido.id || '');

        const productosTexto = items.length
            ? items.map(i => `${esc(i.nombre)} (${Number(i.cantidad)} ${esc(i.unidad)})`).join(', ')
            : 'Sin productos';

        return `
        <tr>
            <td><strong>${esc(pedido.id || 'Sin ID')}</strong></td>
            <td>
                ${esc(obtenerNombreCliente(pedido))}
                ${obtenerCorreoPedido(pedido) ? `<small class="admin-muted-subline">${esc(obtenerCorreoPedido(pedido))}</small>` : ''}
            </td>
            <td>${productosTexto}</td>
            <td><strong>${dinero(total)}</strong></td>
            <td>
                ${esc(obtenerFechaPedido(pedido))}
                ${pedido.hora ? `<small class="admin-muted-subline">${esc(pedido.hora)}</small>` : ''}
            </td>
            <td>
                <span class="pedido-estado estado-${slugEstado(est)}">
                    <select class="cambiar-estado" data-id="${id}" aria-label="Estado del pedido ${id}">
                        ${opciones.map(o => `<option value="${o}" ${est === o ? 'selected' : ''}>${textoEstadoPedido(o)}</option>`).join('')}
                    </select>
                </span>
            </td>
            <td>
                <div class="admin-order-actions">
                    <button type="button" class="admin-small-btn ver-pedido" data-id="${id}">Ver</button>
                    <button type="button" class="admin-small-btn imprimir-pedido-directo" data-id="${id}">Imprimir</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

let pedidoSeleccionado = null;

function abrirDetallePedido(id) {
    pedidos = leer(CLAVE_PEDIDOS);
    const p = pedidos.find(x => String(x.id) === String(id));
    if (!p) {
        toast('Pedido no encontrado', 'No se encontró el pedido seleccionado.');
        return;
    }
    pedidoSeleccionado = p;
    const items = obtenerItemsPedido(p);

    $('pedido-detalle-titulo').textContent = p.id || 'Pedido';
    $('pedido-detalle-contenido').innerHTML = `
        <div class="admin-order-summary">
            <div class="admin-order-box"><small>Cliente</small><strong>${esc(obtenerNombreCliente(p))}</strong></div>
            <div class="admin-order-box"><small>Estado</small><span class="pedido-badge estado-${slugEstado(p.estado)}">${esc(textoEstadoPedido(p.estado))}</span></div>
            <div class="admin-order-box"><small>Correo</small><strong>${esc(obtenerCorreoPedido(p) || 'No especificado')}</strong></div>
            <div class="admin-order-box"><small>Teléfono</small><strong>${esc(p.telefono || 'No especificado')}</strong></div>
            <div class="admin-order-box admin-order-box-full"><small>Dirección de entrega</small><strong>${esc(p.direccion || 'No especificada')}</strong></div>
        </div>
        <table class="admin-order-items">
            <thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Total</th></tr></thead>
            <tbody>${items.length ? items.map(i => `
                <tr>
                    <td>${esc(i.nombre)}</td>
                    <td>${Number(i.cantidad)} ${esc(i.unidad)}</td>
                    <td>${dinero(i.precio)}</td>
                    <td>${dinero(i.total)}</td>
                </tr>`).join('') : '<tr><td colspan="4">Sin productos</td></tr>'}
            </tbody>
        </table>
        <div class="admin-order-total"><span>Total:</span><strong>${dinero(obtenerTotalPedido(p))} MXN</strong></div>`;
    abrirOverlay('modal-pedido');
}

function cerrarDetallePedido() {
    cerrarOverlay('modal-pedido');
    pedidoSeleccionado = null;
}

function imprimirPedido(p) {
    if (!p) return;
    const items = obtenerItemsPedido(p);
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) {
        toast('Ventana bloqueada', 'Permite las ventanas emergentes para imprimir la nota.');
        return;
    }
    w.document.write(`<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Nota ${esc(p.id || '')}</title>
<style>
    body{font-family:Arial,sans-serif;margin:40px;color:#173b2d}
    h1{margin:0 0 4px}.muted{color:#66756e;margin:0}
    .datos{margin:22px 0;padding:16px;border:1px solid #ddd;border-radius:10px;line-height:1.7}
    table{width:100%;border-collapse:collapse;margin-top:20px}
    th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}
    .total{text-align:right;font-size:20px;font-weight:700;margin-top:20px}
    @media print{body{margin:12mm}}
</style></head><body>
    <h1>San Gerardo Mayela</h1>
    <p class="muted">Nota de pedido ${esc(p.id || '')}</p>
    <div class="datos">
        <strong>Cliente:</strong> ${esc(obtenerNombreCliente(p))}<br>
        <strong>Correo:</strong> ${esc(obtenerCorreoPedido(p) || 'No especificado')}<br>
        <strong>Teléfono:</strong> ${esc(p.telefono || 'No especificado')}<br>
        <strong>Dirección:</strong> ${esc(p.direccion || 'No especificada')}<br>
        <strong>Fecha:</strong> ${esc(obtenerFechaPedido(p))}<br>
        <strong>Estado:</strong> ${esc(textoEstadoPedido(p.estado))}
    </div>
    <table>
        <thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Total</th></tr></thead>
        <tbody>${items.map(i => `<tr><td>${esc(i.nombre)}</td><td>${Number(i.cantidad)} ${esc(i.unidad)}</td><td>${dinero(i.precio)}</td><td>${dinero(i.total)}</td></tr>`).join('')}</tbody>
    </table>
    <div class="total">Total: ${dinero(obtenerTotalPedido(p))} MXN</div>
</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
}

const EJEMPLOS = [
    { cliente: 'María López', estado: 'pendiente',
      items: [{ name: 'Mango', kg: 2, price: 45 }, { name: 'Aguacate', kg: 1, price: 75 }] },
    { cliente: 'Juan Pérez', estado: 'en camino',
      items: [{ name: 'Jitomate', kg: 3, price: 28 }] },
    { cliente: 'Ana Ruiz', estado: 'entregado',
      items: [{ name: 'Chile Habanero', kg: 0.5, price: 80 }, { name: 'Limón', kg: 2, price: 30 }] }
];

/* ========== INICIALIZACIÓN ========== */
document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('sesionActiva') !== 'true' ||
        sessionStorage.getItem('rol') !== 'administrador') {
        window.location.href = 'login.html';
        return;
    }

    /* ----- Cierre global con Escape ----- */
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        if ($('admin-confirmacion').classList.contains('activo')) return cerrarConfirmacion();
        cerrarEditor();
        cerrarFormPromocion();
        cerrarDetallePedido();
    });

    /* ----- Inventario ----- */
    renderizarInventario();

    $('buscar-admin').addEventListener('input', renderizarInventario);
    $('filtro-admin').addEventListener('change', renderizarInventario);

    $('inventario-tabla').addEventListener('click', e => {
        const btnEdit = e.target.closest('.admin-edit-btn');
        if (btnEdit) return abrirEditor(Number(btnEdit.dataset.indice));

        const btnEliminar = e.target.closest('[data-eliminar]');
        if (!btnEliminar) return;

        const i = Number(btnEliminar.dataset.eliminar);
        const p = inventario[i];
        if (!p) return;

        mostrarConfirmacion('Eliminar producto', `¿Seguro que deseas eliminar "${p.name}" del inventario?`, 'Eliminar', () => {
            const nombre = p.name;
            inventario.splice(i, 1);
            guardarInventario();
            ofertas = ofertas.filter(o => normalizar(o.producto) !== normalizar(nombre));
            escribir(CLAVE_OFERTAS, ofertas);
            renderizarInventario();
            renderOfertas();
            toast('Producto eliminado', `${nombre} se eliminó del inventario.`);
        });
    });

    $('form-agregar-producto').addEventListener('submit', e => {
        e.preventDefault();

        const nombre = $('nuevo-nombre').value.trim();
        const category = $('nuevo-categoria').value;
        const textoPrecio = $('nuevo-precio').value.trim();
        const precio = Number(textoPrecio);
        const stock = Number($('nuevo-stock').value);
        let imagenArchivo = $('nuevo-imagen').value.trim();

        if (!nombre) return toast('Datos incompletos', 'Escribe el nombre del producto.');
        if (!textoPrecio || !Number.isFinite(precio) || precio < 0) return toast('Precio no válido', 'Indica un precio mayor o igual a 0.');
        if (!Number.isFinite(stock) || stock < 0) return toast('Stock no válido', 'Indica una existencia mayor o igual a 0.');
        if (inventario.some(p => normalizar(p.name) === normalizar(nombre))) {
            return toast('Producto duplicado', `"${nombre}" ya está en el inventario.`);
        }

        if (!imagenArchivo) imagenArchivo = nombre.replace(/\s+/g, '') + '1.jpg';
        if (!/\.(jpe?g|png|webp|avif)$/i.test(imagenArchivo)) imagenArchivo += '.jpg';

        const imagePath = imagenArchivo.includes('/') ? imagenArchivo : `Imagenes/Img productos/${imagenArchivo}`;

        inventario.push({ name: nombre, category, price: precio, stock, unit: 'kg', image: imagePath, active: true });
        guardarInventario();

        $('form-agregar-producto').reset();
        $('nuevo-stock').value = '10';
        $('nuevo-categoria').value = 'frutas';
        renderizarInventario();
        renderOfertas();
        toast('Producto agregado', `${nombre} se agregó al inventario.`);
    });

    $('form-inventario').addEventListener('submit', e => {
        e.preventDefault();
        const i = Number($('producto-indice').value);
        const textoPrecio = $('producto-precio').value.trim();
        const textoStock = $('producto-stock').value.trim();
        const precio = Number(textoPrecio);
        const stock = Number(textoStock);

        if (!inventario[i]) return;
        if (!textoPrecio || !textoStock || !Number.isFinite(precio) || !Number.isFinite(stock) || precio < 0 || stock < 0) {
            return toast('Datos no válidos', 'Completa el precio y la existencia con números mayores o iguales a 0.');
        }

        inventario[i].price = precio;
        inventario[i].stock = stock;
        inventario[i].active = $('producto-activo').checked;
        guardarInventario();
        cerrarEditor();
        renderizarInventario();
        renderOfertas();
        toast('Inventario actualizado', `${inventario[i].name} se actualizó correctamente.`);
    });

    $('cerrar-modal-admin').addEventListener('click', cerrarEditor);
    $('cancelar-edicion').addEventListener('click', cerrarEditor);
    $('modal-inventario').addEventListener('click', e => { if (e.target.id === 'modal-inventario') cerrarEditor(); });

    $('restaurar-inventario').addEventListener('click', () => {
        mostrarConfirmacion('Restaurar inventario', '¿Restaurar los precios, existencias y disponibilidad iniciales?', 'Restaurar', () => {
            inventario = structuredClone(INVENTARIO_INICIAL);
            guardarInventario();
            renderizarInventario();
            renderOfertas();
            toast('Inventario restaurado', 'Se recuperaron los valores iniciales.');
        });
    });

    /* ----- Confirmación ----- */
    $('admin-confirm-aceptar').addEventListener('click', () => {
        const accion = accionConfirmacion;
        cerrarConfirmacion();
        if (typeof accion === 'function') accion();
    });
    $('admin-confirm-cancelar').addEventListener('click', cerrarConfirmacion);
    $('admin-confirmacion').addEventListener('click', e => { if (e.target.id === 'admin-confirmacion') cerrarConfirmacion(); });

    /* ----- Sesión ----- */
    $('cerrar-sesion-admin').addEventListener('click', () => {
        ['sesionActiva', 'usuario', 'rol', 'nombre', 'datosPerfil'].forEach(k => sessionStorage.removeItem(k));
        window.location.href = 'login.html';
    });

    /* ----- Tabs ----- */
    document.querySelector('.admin-tabs').addEventListener('click', e => {
        const btn = e.target.closest('.admin-tab');
        if (!btn) return;
        document.querySelectorAll('.admin-tab').forEach(b => b.classList.toggle('activo', b === btn));
        ['inventario', 'ofertas', 'promociones', 'pedidos'].forEach(t => {
            $('tab-' + t).hidden = t !== btn.dataset.tab;
        });
        if (btn.dataset.tab === 'ofertas') renderOfertas();
        if (btn.dataset.tab === 'promociones') renderPromociones();
        if (btn.dataset.tab === 'pedidos') {
            $('filtro-pedidos').value = 'todos';
            renderPedidos();
        }
    });

    /* ----- Ofertas ----- */
    renderOfertas();

    $('form-oferta').addEventListener('submit', e => {
        e.preventDefault();
        const producto = $('oferta-producto').value;
        const descuento = Number($('oferta-descuento').value);
        const fin = $('oferta-fin').value;

        if (!producto || !Number.isFinite(descuento) || descuento < 1 || descuento > 90) {
            return toast('Datos no válidos', 'Elige un producto y un descuento entre 1% y 90%.');
        }
        if (fin && fin < hoy()) {
            return toast('Fecha no válida', 'La fecha de vencimiento no puede estar en el pasado.');
        }

        const existente = ofertas.find(o => o.producto === producto);
        if (existente) {
            Object.assign(existente, { descuento, fin, activa: true });
        } else {
            ofertas.push({ id: 'O-' + Date.now(), producto, descuento, fin, activa: true });
        }

        escribir(CLAVE_OFERTAS, ofertas);
        $('form-oferta').reset();
        renderOfertas();
        toast('Oferta guardada', `${producto} con ${descuento}% de descuento.`);
    });

    $('ofertas-grid').addEventListener('click', e => {
        const btn = e.target.closest('[data-accion]');
        if (!btn) return;
        const o = ofertas.find(x => x.id === btn.dataset.id);
        if (!o) return;

        if (btn.dataset.accion === 'pausar') {
            o.activa = !o.activa;
            toast(o.activa ? 'Oferta activada' : 'Oferta pausada', o.producto);
        } else {
            ofertas = ofertas.filter(x => x !== o);
            toast('Oferta eliminada', o.producto);
        }
        escribir(CLAVE_OFERTAS, ofertas);
        renderOfertas();
    });

    /* ----- Promociones ----- */
    renderPromociones();

    $('abrir-form-promocion').addEventListener('click', () => abrirFormPromocion());
    $('cerrar-modal-promocion').addEventListener('click', cerrarFormPromocion);
    $('cancelar-edicion-promocion').addEventListener('click', cerrarFormPromocion);
    $('modal-promocion').addEventListener('click', e => { if (e.target.id === 'modal-promocion') cerrarFormPromocion(); });
    $('promocion-aplica').addEventListener('change', actualizarCamposAplica);

    $('form-promocion').addEventListener('submit', e => {
        e.preventDefault();
        const idEdicion = $('promocion-id-edicion').value;
        const aplica = $('promocion-aplica').value;

        const datos = {
            nombre: $('promocion-nombre').value.trim(),
            codigo: $('promocion-codigo').value.trim().toUpperCase(),
            tipo: $('promocion-tipo').value,
            valor: $('promocion-valor').value.trim(),
            descripcion: $('promocion-descripcion').value.trim(),
            aplica,
            categoria: aplica === 'categoria' ? $('promocion-categoria').value : '',
            productos: aplica === 'productos'
                ? Array.from($('promocion-productos').selectedOptions).map(o => o.value)
                : [],
            minimo: Number($('promocion-minimo').value) || 0,
            fechaFin: $('promocion-fecha-fin').value,
            activa: $('promocion-activa').checked
        };

        if (idEdicion) {
            const indice = promociones.findIndex(p => String(p.id) === String(idEdicion));
            if (indice !== -1) promociones[indice] = { ...promociones[indice], ...datos };
            toast('Promoción actualizada', 'Los cambios se guardaron correctamente.');
        } else {
            promociones.push({
                id: 'P-' + Date.now() + '-' + Math.random().toString(16).slice(2, 6),
                ...datos
            });
            toast('Promoción creada', 'La promoción se guardó correctamente.');
        }

        escribir(CLAVE_PROMOCIONES, promociones);
        cerrarFormPromocion();
        renderPromociones();
    });

    $('promociones-tabla').addEventListener('click', e => {
        const btn = e.target.closest('[data-promo-accion]');
        if (!btn) return;
        const promo = promociones.find(p => String(p.id) === String(btn.dataset.id));
        if (!promo) return;

        const accion = btn.dataset.promoAccion;

        if (accion === 'editar') return abrirFormPromocion(promo);

        if (accion === 'estado') {
            promo.activa = !promo.activa;
            escribir(CLAVE_PROMOCIONES, promociones);
            renderPromociones();
            return toast(promo.activa ? 'Promoción activada' : 'Promoción desactivada', 'El estado se actualizó.');
        }

        mostrarConfirmacion('Eliminar promoción', `¿Quieres eliminar el cupón ${promo.codigo || 'sin código'}?`, 'Eliminar', () => {
            promociones = promociones.filter(p => String(p.id) !== String(promo.id));
            escribir(CLAVE_PROMOCIONES, promociones);
            renderPromociones();
            toast('Promoción eliminada', 'El cupón se eliminó correctamente.');
        });
    });

    /* ----- Pedidos ----- */
    renderPedidos();

    $('filtro-pedidos').addEventListener('change', renderPedidos);

    $('pedidos-tabla').addEventListener('click', e => {
        const ver = e.target.closest('.ver-pedido');
        const imp = e.target.closest('.imprimir-pedido-directo');
        if (ver) abrirDetallePedido(ver.dataset.id);
        if (imp) {
            const p = leer(CLAVE_PEDIDOS).find(x => String(x.id) === String(imp.dataset.id));
            if (p) imprimirPedido(p);
        }
    });

    $('pedidos-tabla').addEventListener('change', e => {
        if (!e.target.classList.contains('cambiar-estado')) return;
        pedidos = leer(CLAVE_PEDIDOS);
        const p = pedidos.find(x => String(x.id) === String(e.target.dataset.id));
        if (!p) return;
        p.estado = e.target.value;
        escribir(CLAVE_PEDIDOS, pedidos);
        renderPedidos();
        toast('Pedido actualizado', `${p.id} ahora está "${textoEstadoPedido(p.estado)}".`);
    });

    $('cerrar-detalle-pedido').addEventListener('click', cerrarDetallePedido);
    $('cerrar-detalle-pedido-2').addEventListener('click', cerrarDetallePedido);
    $('modal-pedido').addEventListener('click', e => { if (e.target.id === 'modal-pedido') cerrarDetallePedido(); });
    $('imprimir-pedido').addEventListener('click', () => imprimirPedido(pedidoSeleccionado));

    $('cargar-ejemplos').addEventListener('click', () => {
        pedidos = leer(CLAVE_PEDIDOS);
        EJEMPLOS.forEach((ej, i) => {
            pedidos.push({
                id: 'P-' + (1001 + pedidos.length),
                cliente: ej.cliente,
                items: ej.items,
                total: ej.items.reduce((s, it) => s + it.kg * it.price, 0),
                fecha: new Date(Date.now() - i * 86400000).toISOString(),
                estado: ej.estado
            });
        });
        escribir(CLAVE_PEDIDOS, pedidos);
        renderPedidos();
        toast('Pedidos de ejemplo', 'Se agregaron 3 pedidos de prueba.');
    });
});