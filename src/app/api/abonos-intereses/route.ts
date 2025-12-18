import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../db/connect';
import Pago from '../db/models/Pago';
import Prestamo from '../db/models/Prestamo';
import Cliente from '../db/models/Cliente';
import AbonoIntereses from '../db/models/AbonoIntereses';

// Configuración de segmento de ruta
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

// GET /api/abonos-intereses - Obtener todos los abonos de intereses
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const searchParams = request.nextUrl.searchParams;
    const clienteId = searchParams.get('clienteId');
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = (page - 1) * limit;

    // Construir query
    let query: any = {};
    
    if (clienteId) {
      query.clienteId = clienteId;
    }
    
    if (fechaInicio && fechaFin) {
      query.fechaAbono = {
        $gte: new Date(fechaInicio),
        $lte: new Date(fechaFin)
      };
    }

    // Obtener abonos con paginación usando Mongoose
    const abonos = await AbonoIntereses.find(query)
      .populate('cliente', 'nombre apellido cedula telefono')
      .populate('prestamo', 'montoPrestamo tasaInteres cuotaMensual numeroCuotas')
      .populate('pago', 'montoPagado cuotaNumero fechaPago')
      .sort({ fechaAbono: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Contar total
    const total = await AbonoIntereses.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: abonos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('Error en GET /api/abonos-intereses:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener abonos' },
      { status: 500 }
    );
  }
}

// POST /api/abonos-intereses - Crear nuevo abono de intereses (ADAPTADO AL FRONTEND)
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    console.log('🔍 [ABONO] === INICIO DEPURACIÓN COMPLETA ===');
    
    // Leer el body
    const data = await request.json();
    console.log('🔍 [ABONO] Datos recibidos:', data);
    
    // 🔥 VALIDACIÓN DE CAMPOS REQUERIDOS - SEGÚN FRONTEND
    const camposRequeridos = ['clienteId', 'montoAbono', 'tipo'];
    const camposFaltantes = camposRequeridos.filter(campo => !data[campo]);
    
    if (camposFaltantes.length > 0) {
      console.error('❌ [ABONO] Campos faltantes:', camposFaltantes);
      return NextResponse.json(
        { 
          success: false, 
          error: `Faltan campos obligatorios: ${camposFaltantes.join(', ')}`,
          camposFaltantes,
          datosRecibidos: data
        },
        { status: 400 }
      );
    }
    
    // Validar que montoAbono sea número
    const montoAbono = parseFloat(data.montoAbono);
    if (isNaN(montoAbono) || montoAbono <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Monto de abono debe ser un número mayor a 0',
          montoRecibido: data.montoAbono
        },
        { status: 400 }
      );
    }
    
    console.log('✅ [ABONO] Datos válidos recibidos:', {
      clienteId: data.clienteId,
      montoAbono: montoAbono,
      tipo: data.tipo,
      fechaAbono: data.fechaAbono || new Date().toISOString().split('T')[0],
      observaciones: data.observaciones || ''
    });
    
    // 🔥 PASO 1: OBTENER CLIENTE Y PRÉSTAMO
    const cliente = await Cliente.findById(data.clienteId);
    if (!cliente) {
      console.error('❌ [ABONO] Cliente no encontrado:', data.clienteId);
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    // Buscar préstamo activo del cliente
    const prestamo = await Prestamo.findOne({ 
      cliente: data.clienteId, 
      estado: { $in: ['pendiente', 'mora'] } 
    }).sort({ createdAt: -1 });

    if (!prestamo) {
      console.error('❌ [ABONO] No hay préstamos pendientes para cliente:', data.clienteId);
      return NextResponse.json(
        { success: false, error: 'El cliente no tiene préstamos pendientes' },
        { status: 400 }
      );
    }

    console.log(`📊 [ABONO] Préstamo encontrado:`, {
      id: prestamo._id,
      saldo: prestamo.saldoPendiente,
      interesesAcum: prestamo.interesesAcumulados,
      estado: prestamo.estado,
      cuotaMensual: prestamo.cuotaMensual,
      interesMensual: prestamo.interesMensual,
      capitalMensual: prestamo.capitalMensual
    });

    // 🔥 PASO 2: OBTENER DATOS ACTUALES DEL PRÉSTAMO
    const saldoPendienteActual = prestamo.saldoPendiente || 0;
    const interesesAcumuladosActual = prestamo.interesesAcumulados || 0;
    const interesMensualActual = prestamo.interesMensual || 0;
    const capitalMensualActual = prestamo.capitalMensual || 0;
    const cuotasPagadasActual = prestamo.cuotasPagadas || 0;
    const numeroCuotasTotal = prestamo.numeroCuotas || 0;

    // 🔥 PASO 3: CALCULAR DISTRIBUCIÓN SEGÚN TIPO DE ABONO DEL FRONTEND
    let abonoCapital = 0;
    let abonoInteres = 0;
    let abonoInteresesMora = 0;
    let observacionesFinal = data.observaciones || '';
    
    // 🔥 MAPPING DE TIPOS DEL FRONTEND
    let tipoBackend = 'interes'; // Por defecto
    
    switch (data.tipo) {
      case 'intereses_mensuales':
        // Solo paga intereses del mes actual (viene del frontend)
        abonoInteres = Math.min(montoAbono, interesMensualActual);
        observacionesFinal = data.observaciones || 'Pago de intereses mensuales';
        tipoBackend = 'solo_intereses';
        console.log(`📈 [ABONO] Abono intereses mensuales: ${abonoInteres}`);
        break;
        
      case 'intereses_acumulados':
        // Paga intereses acumulados por mora
        abonoInteresesMora = Math.min(montoAbono, interesesAcumuladosActual);
        observacionesFinal = data.observaciones || 'Pago de intereses acumulados';
        tipoBackend = 'intereses_mora';
        console.log(`📈 [ABONO] Abono intereses acumulados: ${abonoInteresesMora}`);
        break;
        
      case 'capital':
        // Solo reduce el capital (deuda principal)
        abonoCapital = Math.min(montoAbono, saldoPendienteActual);
        observacionesFinal = data.observaciones || 'Abono de capital';
        tipoBackend = 'solo_capital';
        console.log(`📈 [ABONO] Abono solo capital: ${abonoCapital}`);
        break;
        
      case 'ambos':
        // Distribución: 70% capital, 30% intereses
        abonoCapital = Math.min(montoAbono * 0.7, saldoPendienteActual);
        abonoInteres = Math.min(montoAbono * 0.3, interesMensualActual);
        observacionesFinal = data.observaciones || 'Abono parcial de capital e intereses';
        tipoBackend = 'ambos';
        console.log(`📈 [ABONO] Abono ambos: capital=${abonoCapital}, interes=${abonoInteres}`);
        break;
        
      default:
        // Por defecto, asumir que es solo intereses
        abonoInteres = Math.min(montoAbono, interesMensualActual);
        observacionesFinal = data.observaciones || 'Abono de intereses';
        tipoBackend = 'interes';
        console.log(`📈 [ABONO] Tipo no reconocido, usando solo intereses: ${abonoInteres}`);
    }

    // 🔥 PASO 4: CALCULAR NUEVOS VALORES DEL PRÉSTAMO
    const nuevoSaldoPendiente = Math.max(0, saldoPendienteActual - abonoCapital);
    const nuevosInteresesAcumulados = Math.max(0, interesesAcumuladosActual - (abonoInteres + abonoInteresesMora));
    
    console.log(`📈 [ABONO] Cálculos completos:`, {
      montoAbono,
      tipoFrontend: data.tipo,
      tipoBackend,
      abonoCapital,
      abonoInteres,
      abonoInteresesMora,
      saldoAnterior: saldoPendienteActual,
      saldoNuevo: nuevoSaldoPendiente,
      interesesAnteriores: interesesAcumuladosActual,
      interesesNuevos: nuevosInteresesAcumulados
    });

    // 🔥 PASO 5: DETERMINAR NUEVO ESTADO DEL PRÉSTAMO
    let nuevoEstadoPrestamo = prestamo.estado;
    
    // Si saldo llega a 0, préstamo pagado
    if (nuevoSaldoPendiente <= 0) {
      nuevoEstadoPrestamo = 'pagado';
      console.log('✅ [ABONO] Préstamo completamente pagado');
    }
    // Si paga intereses de mora y quedan 0, vuelve a pendiente
    else if (data.tipo === 'intereses_acumulados' && nuevosInteresesAcumulados === 0 && prestamo.estado === 'mora') {
      nuevoEstadoPrestamo = 'pendiente';
      console.log('✅ [ABONO] Cliente sale de mora');
    }

    // 🔥 PASO 6: CALCULAR SI SE COMPLETÓ UNA CUOTA
    let incrementarCuotasPagadas = 0;
    if (abonoCapital > 0 && capitalMensualActual > 0) {
      // Calcular cuántas cuotas completas se pagaron con este abono
      const cuotasCompletasPagadas = Math.floor(abonoCapital / capitalMensualActual);
      incrementarCuotasPagadas = Math.min(
        cuotasCompletasPagadas,
        numeroCuotasTotal - cuotasPagadasActual
      );
      
      if (incrementarCuotasPagadas > 0) {
        console.log(`📊 [ABONO] Se completaron ${incrementarCuotasPagadas} cuota(s) con el abono de capital`);
      }
    }

    // 🔥 CORREGIDO: Convertir fecha si es string
    let fechaAbono = data.fechaAbono || new Date();
    if (typeof fechaAbono === 'string') {
      // Formato YYYY-MM-DD del frontend
      const [year, month, day] = fechaAbono.split('-').map(Number);
      fechaAbono = new Date(year, month - 1, day);
    }

    // 🔥 PASO 7: REGISTRAR EL PAGO EN EL HISTORIAL
    const nuevoPago = new Pago({
      prestamo: prestamo._id,
      cliente: data.clienteId,
      montoPagado: montoAbono,
      cuotaNumero: cuotasPagadasActual + (incrementarCuotasPagadas > 0 ? 1 : 0),
      fechaPago: fechaAbono,
      capitalPagado: abonoCapital,
      interesPagado: abonoInteres + abonoInteresesMora,
      valor4x1000Pagado: 0,
      metodoPago: data.metodoPago || 'Efectivo',
      observaciones: observacionesFinal,
      tipo: 'abono',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await nuevoPago.save();
    console.log('✅ [ABONO] Pago registrado en historial:', {
      id: nuevoPago._id,
      capitalPagado: nuevoPago.capitalPagado,
      interesPagado: nuevoPago.interesPagado,
      cuotaNumero: nuevoPago.cuotaNumero
    });

    // 🔥 PASO 8: REGISTRAR EL ABONO ESPECÍFICO
    const abonoInteresesNuevo = new AbonoIntereses({
      clienteId: data.clienteId,
      prestamoId: prestamo._id,
      pagoId: nuevoPago._id,
      montoAbono: montoAbono,
      tipo: tipoBackend, // Usamos el tipo mapeado para el backend
      abonoCapital,
      abonoInteres,
      abonoInteresesMora,
      fechaAbono: fechaAbono,
      observaciones: observacionesFinal,
      saldoAnterior: saldoPendienteActual,
      saldoNuevo: nuevoSaldoPendiente,
      interesesAnteriores: interesesAcumuladosActual,
      interesesNuevos: nuevosInteresesAcumulados,
      metodoPago: data.metodoPago || 'Efectivo',
      cuotasPagadasAnteriores: cuotasPagadasActual,
      cuotasPagadasNuevas: cuotasPagadasActual + incrementarCuotasPagadas,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await abonoInteresesNuevo.save();
    console.log('✅ [ABONO] Abono registrado:', {
      id: abonoInteresesNuevo._id,
      tipoFrontend: data.tipo,
      tipoBackend: abonoInteresesNuevo.tipo,
      monto: abonoInteresesNuevo.montoAbono
    });

    // 🔥 PASO 9: ACTUALIZAR EL PRÉSTAMO CON LOS NUEVOS VALORES
    const updateData: any = {
      saldoPendiente: nuevoSaldoPendiente,
      interesesAcumulados: nuevosInteresesAcumulados,
      estado: nuevoEstadoPrestamo,
      updatedAt: new Date()
    };

    // Solo actualizar cuotas pagadas si se pagó capital suficiente para completar una cuota
    if (incrementarCuotasPagadas > 0) {
      updateData.cuotasPagadas = Math.min(
        numeroCuotasTotal,
        cuotasPagadasActual + incrementarCuotasPagadas
      );
      
      // Actualizar fecha de próximo pago si se pagó una cuota
      if (incrementarCuotasPagadas === 1) {
        const fechaProximoPago = new Date(prestamo.fechaProximoPago || new Date());
        fechaProximoPago.setMonth(fechaProximoPago.getMonth() + 1);
        updateData.fechaProximoPago = fechaProximoPago;
      }
    }

    const prestamoActualizado = await Prestamo.findByIdAndUpdate(
      prestamo._id,
      updateData,
      { new: true }
    );

    console.log('✅ [ABONO] Préstamo actualizado:', {
      id: prestamoActualizado._id,
      nuevoSaldo: prestamoActualizado.saldoPendiente,
      nuevosIntereses: prestamoActualizado.interesesAcumulados,
      nuevoEstado: prestamoActualizado.estado,
      cuotasPagadas: prestamoActualizado.cuotasPagadas,
      fechaProximoPago: prestamoActualizado.fechaProximoPago
    });

    // 🔥 PASO 10: ACTUALIZAR ESTADO DEL CLIENTE
    const prestamosCliente = await Prestamo.find({ cliente: data.clienteId });
    const tienePrestamosEnMora = prestamosCliente.some(p => p.estado === 'mora');
    const todosPagados = prestamosCliente.every(p => p.estado === 'pagado');
    
    let nuevoEstadoCliente = 'pendiente';
    if (tienePrestamosEnMora) {
      nuevoEstadoCliente = 'mora';
    } else if (todosPagados) {
      nuevoEstadoCliente = 'pagado';
    }

    await Cliente.findByIdAndUpdate(data.clienteId, {
      estado: nuevoEstadoCliente,
      updatedAt: new Date()
    });

    console.log('✅ [ABONO] Cliente actualizado, nuevo estado:', nuevoEstadoCliente);

    // 🔥 PASO 11: RESPONDER CON FORMATO QUE ESPERA EL FRONTEND
    return NextResponse.json({
      success: true,
      message: `Abono de intereses de ${formatearMoneda(montoAbono)} registrado exitosamente`,
      data: {
        abono: abonoInteresesNuevo,
        pago: nuevoPago,
        prestamo: prestamoActualizado,
        cliente: {
          id: cliente._id,
          estado: nuevoEstadoCliente
        },
        resumen: {
          tipo: data.tipo, // Mantener el tipo original del frontend
          montoTotal: montoAbono,
          capitalAbonado: abonoCapital,
          interesesAbonados: abonoInteres + abonoInteresesMora,
          nuevoSaldo: nuevoSaldoPendiente,
          nuevosInteresesAcum: nuevosInteresesAcumulados
        }
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ [ABONO] Error completo:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error al registrar abono',
        detalles: error.stack
      },
      { status: 500 }
    );
  }
}

// PUT /api/abonos-intereses - Actualizar abono
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const data = await request.json();

    if (!data.id) {
      return NextResponse.json(
        { success: false, error: 'ID del abono es requerido' },
        { status: 400 }
      );
    }

    const abonoActualizado = await AbonoIntereses.findByIdAndUpdate(
      data.id,
      { ...data, updatedAt: new Date() },
      { new: true }
    );

    if (!abonoActualizado) {
      return NextResponse.json(
        { success: false, error: 'Abono no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Abono actualizado exitosamente',
      data: abonoActualizado
    });

  } catch (error: any) {
    console.error('Error en PUT /api/abonos-intereses:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al actualizar abono' },
      { status: 500 }
    );
  }
}

// DELETE /api/abonos-intereses - Eliminar abono
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID del abono es requerido' },
        { status: 400 }
      );
    }

    const abonoEliminado = await AbonoIntereses.findByIdAndDelete(id);

    if (!abonoEliminado) {
      return NextResponse.json(
        { success: false, error: 'Abono no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Abono eliminado exitosamente',
      data: abonoEliminado
    });

  } catch (error: any) {
    console.error('Error en DELETE /api/abonos-intereses:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al eliminar abono' },
      { status: 500 }
    );
  }
}

// Función auxiliar para formatear moneda
function formatearMoneda(monto: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monto);
}