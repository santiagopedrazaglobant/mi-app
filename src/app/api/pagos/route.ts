import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../db/connect';
import Pago from '../db/models/Pago';
import Prestamo from '../db/models/Prestamo';
import Cliente from '../db/models/Cliente';
import { ObjectId } from 'mongodb';

// Configuración de segmento de ruta
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;


// GET /api/pagos - Obtener todos los pagos con filtros mejorados
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const searchParams = request.nextUrl.searchParams;
    const prestamoId = searchParams.get('prestamoId');
    const clienteId = searchParams.get('clienteId');
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const tipo = searchParams.get('tipo');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = (page - 1) * limit;

    // Construir query
    let query: any = {};
    
    if (prestamoId) {
      query.prestamo = prestamoId;
    }
    
    // 🔥 CORREGIDO: Validar clienteId antes de usarlo
    if (clienteId && clienteId !== "undefined" && clienteId !== "null" && clienteId.trim() !== "") {
      if (ObjectId.isValid(clienteId)) {
        query.cliente = new ObjectId(clienteId);
        console.log('✅ [PAGOS] Filtrando por clienteId válido:', clienteId);
      } else {
        console.warn('⚠️ [PAGOS] clienteId no es un ObjectId válido:', clienteId);
        // No agregamos al query si no es válido
      }
    } else if (clienteId === "undefined" || clienteId === "null") {
      console.warn('⚠️ [PAGOS] Se recibió clienteId como string "undefined" o "null"');
      // No agregamos al query
    }
    
    if (fechaInicio && fechaFin) {
      query.fechaPago = {
        $gte: new Date(fechaInicio),
        $lte: new Date(fechaFin)
      };
    }

    // Filtrar por tipo de pago basado en observaciones
    if (tipo) {
      if (tipo === 'pago_completo') {
        query.$or = [
          { observaciones: { $regex: 'Pago cuota', $options: 'i' } },
          { observaciones: { $regex: 'Cuota', $options: 'i' } }
        ];
      } else if (tipo === 'abono') {
        query.$or = [
          { observaciones: { $regex: 'Abono', $options: 'i' } },
          { observaciones: { $regex: 'solo', $options: 'i' } },
          { observaciones: { $regex: 'parcial', $options: 'i' } }
        ];
      } else if (tipo === 'mora') {
        query.$or = [
          { observaciones: { $regex: 'mora', $options: 'i' } },
          { observaciones: { $regex: 'acumulados', $options: 'i' } }
        ];
      }
    }

    console.log('🔍 Buscando pagos con query:', JSON.stringify(query));

    // Obtener pagos con paginación
    const pagos = await Pago.find(query)
      .populate('cliente', 'nombre apellido cedula telefono')
      .populate({
        path: 'prestamo',
        populate: {
          path: 'cliente',
          select: 'nombre apellido cedula telefono'
        }
      })
      .sort({ fechaPago: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Contar total
    const total = await Pago.countDocuments(query);

    // Obtener estadísticas de pagos
    const estadisticas = {
      totalPagado: 0,
      totalCapital: 0,
      totalInteres: 0,
      total4x1000: 0,
      pagosCompletos: 0,
      abonos: 0,
      pagosMora: 0
    };

    pagos.forEach(pago => {
      estadisticas.totalPagado += pago.montoPagado || 0;
      estadisticas.totalCapital += pago.capitalPagado || 0;
      estadisticas.totalInteres += pago.interesPagado || 0;
      estadisticas.total4x1000 += pago.valor4x1000Pagado || 0;
      
      if (pago.observaciones?.includes('Abono') || pago.observaciones?.includes('solo') || pago.observaciones?.includes('parcial')) {
        estadisticas.abonos++;
      } else if (pago.observaciones?.includes('mora') || pago.observaciones?.includes('acumulados')) {
        estadisticas.pagosMora++;
      } else {
        estadisticas.pagosCompletos++;
      }
    });

    return NextResponse.json({
      success: true,
      data: pagos,
      estadisticas,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('❌ Error en GET /api/pagos:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener pagos' },
      { status: 500 }
    );
  }
}

// POST /api/pagos - Crear nuevo pago
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const data = await request.json();

    console.log('💵 Creando pago con datos:', data);

    // 🔥 VALIDACIONES MEJORADAS
    if (!data.prestamoId || !data.montoPagado) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos obligatorios: prestamoId, montoPagado' },
        { status: 400 }
      );
    }

    // Verificar que el préstamo exista
    let prestamo;
    try {
      prestamo = await Prestamo.findById(data.prestamoId)
        .populate('cliente', 'nombre apellido cedula telefono email direccion');
    } catch (error) {
      console.error('❌ Error buscando préstamo:', error);
      return NextResponse.json(
        { success: false, error: 'Error al buscar el préstamo' },
        { status: 500 }
      );
    }

    if (!prestamo) {
      return NextResponse.json(
        { success: false, error: 'Préstamo no encontrado' },
        { status: 404 }
      );
    }

    console.log('📊 Préstamo encontrado:', {
      id: prestamo._id,
      cliente: prestamo.cliente,
      monto: prestamo.montoPrestamo,
      saldo: prestamo.saldoPendiente,
      cuotasPagadas: prestamo.cuotasPagadas,
      numeroCuotas: prestamo.numeroCuotas
    });

    // Obtener el cliente del préstamo
    const clienteId = prestamo.cliente._id || prestamo.cliente;
    
    if (!clienteId) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado en el préstamo' },
        { status: 404 }
      );
    }

    // 🔥 CALCULAR NÚMERO DE CUOTA AUTOMÁTICAMENTE SI NO SE ESPECIFICA
    let cuotaNumero = data.cuotaNumero;
    if (!cuotaNumero || isNaN(parseInt(cuotaNumero))) {
      cuotaNumero = prestamo.cuotasPagadas + 1;
    } else {
      cuotaNumero = parseInt(cuotaNumero);
    }

    // Verificar que el número de cuota sea válido
    if (cuotaNumero > prestamo.numeroCuotas) {
      return NextResponse.json(
        { success: false, error: `Número de cuota inválido. El préstamo tiene ${prestamo.numeroCuotas} cuotas máximo` },
        { status: 400 }
      );
    }

    // 🔥 CÁLCULO MEJORADO DE DISTRIBUCIÓN DEL PAGO
    const montoPagado = parseFloat(data.montoPagado);
    
    // 1. Primero pagar intereses acumulados
    const interesesAcumulados = prestamo.interesesAcumulados || 0;
    let interesPagado = Math.min(montoPagado, interesesAcumulados);
    
    // 2. Lo que sobra después de intereses acumulados va a interés del mes
    const montoRestanteDespuesInteresesAcum = montoPagado - interesPagado;
    const interesMensual = prestamo.interesMensual || 0;
    const interesMensualPagado = Math.min(montoRestanteDespuesInteresesAcum, interesMensual);
    interesPagado += interesMensualPagado;
    
    // 3. Lo que sobra después del interés mensual va a capital
    const montoRestante = montoPagado - interesPagado;
    const capitalPagado = Math.max(0, montoRestante);

    // 4. Calcular 4x1000 (si hay saldo después de capital)
    const valor4x1000Mensual = prestamo.valor4x1000Mensual || 0;
    const valor4x1000Pagado = Math.min(valor4x1000Mensual, montoRestante - capitalPagado);

    console.log('🧮 Distribución del pago:', {
      montoPagado,
      interesPagado,
      capitalPagado,
      valor4x1000Pagado,
      interesesAcumuladosAntes: interesesAcumulados,
      interesMensual: interesMensual
    });

    // 🔥 CREAR NUEVO PAGO (CON CLIENTE INCLUIDO)
    const nuevoPago = new Pago({
      prestamo: data.prestamoId,
      cliente: clienteId,
      montoPagado: montoPagado,
      cuotaNumero: cuotaNumero,
      fechaPago: data.fechaPago || new Date(),
      capitalPagado: capitalPagado,
      interesPagado: interesPagado,
      valor4x1000Pagado: valor4x1000Pagado,
      metodoPago: data.metodoPago || 'Efectivo',
      observaciones: data.observaciones || `Pago cuota ${cuotaNumero}`,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await nuevoPago.save();

    console.log('✅ Pago creado:', nuevoPago._id);

    // 🔥 ACTUALIZAR EL PRÉSTAMO
    const nuevosCuotasPagadas = Math.max(prestamo.cuotasPagadas, cuotaNumero);
    
    // Calcular nuevo saldo pendiente
    const totalPagadoEstePago = capitalPagado + interesPagado + valor4x1000Pagado;
    const nuevoSaldoPendiente = Math.max(0, prestamo.saldoPendiente - totalPagadoEstePago);
    
    // Calcular nuevos intereses acumulados
    const nuevosInteresesAcumulados = Math.max(0, interesesAcumulados - (interesPagado - interesMensualPagado));
    
    // Determinar nuevo estado
    let nuevoEstado = prestamo.estado;
    if (nuevosCuotasPagadas >= prestamo.numeroCuotas && nuevoSaldoPendiente <= 0) {
      nuevoEstado = 'pagado';
    } else if (nuevoSaldoPendiente > 0) {
      nuevoEstado = 'pendiente';
    }

    // 🔥 CALCULAR PRÓXIMA FECHA DE PAGO (30 días después)
    const fechaProximoPago = new Date(data.fechaPago || new Date());
    fechaProximoPago.setDate(fechaProximoPago.getDate() + 30);

    const prestamoActualizado = await Prestamo.findByIdAndUpdate(
      data.prestamoId,
      {
        cuotasPagadas: nuevosCuotasPagadas,
        saldoPendiente: nuevoSaldoPendiente,
        interesesAcumulados: nuevosInteresesAcumulados,
        estado: nuevoEstado,
        fechaProximoPago: fechaProximoPago,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('cliente', 'nombre apellido cedula telefono email direccion');

    console.log('✅ Préstamo actualizado:', {
      cuotasPagadas: nuevosCuotasPagadas,
      saldo: nuevoSaldoPendiente,
      estado: nuevoEstado
    });

    // 🔥 ACTUALIZAR ESTADO DEL CLIENTE
    if (prestamoActualizado && prestamoActualizado.cliente) {
      const clienteId = prestamoActualizado.cliente._id || prestamoActualizado.cliente;
      
      // Buscar todos los préstamos del cliente
      const prestamosCliente = await Prestamo.find({ cliente: clienteId });
      
      // Determinar estado basado en todos los préstamos
      const tienePrestamosEnMora = prestamosCliente.some(p => p.estado === 'mora');
      const todosPagados = prestamosCliente.length > 0 && prestamosCliente.every(p => p.estado === 'pagado');
      const tienePendientes = prestamosCliente.some(p => p.estado === 'pendiente');
      
      let estadoCliente = 'pendiente';
      if (tienePrestamosEnMora) {
        estadoCliente = 'mora';
      } else if (todosPagados) {
        estadoCliente = 'pagado';
      } else if (tienePendientes) {
        estadoCliente = 'pendiente';
      }

      await Cliente.findByIdAndUpdate(clienteId, {
        estado: estadoCliente,
        updatedAt: new Date()
      });

      console.log('✅ Estado cliente actualizado:', estadoCliente);
    }

    // 🔥 POPULAR EL PAGO CON INFORMACIÓN DEL CLIENTE
    const pagoConCliente = await Pago.findById(nuevoPago._id)
      .populate('cliente', 'nombre apellido cedula telefono')
      .populate({
        path: 'prestamo',
        populate: {
          path: 'cliente',
          select: 'nombre apellido cedula telefono'
        }
      })
      .lean();

    return NextResponse.json({
      success: true,
      message: 'Pago registrado exitosamente',
      data: {
        pago: pagoConCliente,
        prestamo: prestamoActualizado
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Error en POST /api/pagos:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al registrar pago' },
      { status: 500 }
    );
  }
}

// PUT /api/pagos - Actualizar pago
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const data = await request.json();
    const { id, ...updateData } = data;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID del pago es requerido' },
        { status: 400 }
      );
    }

    updateData.updatedAt = new Date();

    const pagoActualizado = await Pago.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('cliente', 'nombre apellido cedula telefono')
     .populate({
        path: 'prestamo',
        populate: {
          path: 'cliente',
          select: 'nombre apellido cedula telefono'
        }
      });

    if (!pagoActualizado) {
      return NextResponse.json(
        { success: false, error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Pago actualizado exitosamente',
      data: pagoActualizado
    });

  } catch (error: any) {
    console.error('❌ Error en PUT /api/pagos:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al actualizar pago' },
      { status: 500 }
    );
  }
}

// DELETE /api/pagos - Eliminar pago
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID del pago es requerido' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Eliminando pago ${id}`);

    // Buscar el pago
    const pago = await Pago.findById(id);
    if (!pago) {
      return NextResponse.json(
        { success: false, error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar el pago
    await Pago.findByIdAndDelete(id);
    console.log(`✅ Pago ${id} eliminado`);

    // Recalcular el préstamo
    const prestamoId = pago.prestamo;
    const prestamo = await Prestamo.findById(prestamoId);
    
    if (prestamo) {
      // Obtener todos los pagos restantes del préstamo
      const pagosRestantes = await Pago.find({ prestamo: prestamoId });
      
      const totalPagado = pagosRestantes.reduce((sum, p) => sum + p.montoPagado, 0);
      const cuotasPagadas = pagosRestantes.length > 0 
        ? Math.max(...pagosRestantes.map(p => p.cuotaNumero))
        : 0;
      
      const saldoPendiente = Math.max(0, (prestamo.cuotaMensual * prestamo.numeroCuotas) - totalPagado);
      const estado = cuotasPagadas >= prestamo.numeroCuotas && saldoPendiente <= 0 ? 'pagado' : 'pendiente';

      await Prestamo.findByIdAndUpdate(prestamoId, {
        cuotasPagadas,
        saldoPendiente,
        estado,
        updatedAt: new Date()
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Pago eliminado exitosamente'
    });

  } catch (error: any) {
    console.error('❌ Error en DELETE /api/pagos:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error al eliminar pago'
      },
      { status: 500 }
    );
  }
}