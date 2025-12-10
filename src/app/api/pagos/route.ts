import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../db/connect';
import Pago from '../db/models/Pago';
import Prestamo from '../db/models/Prestamo';
import Cliente from '../db/models/Cliente';

// GET /api/pagos - Obtener todos los pagos
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const searchParams = request.nextUrl.searchParams;
    const prestamoId = searchParams.get('prestamoId');
    const clienteId = searchParams.get('clienteId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = (page - 1) * limit;

    console.log('🔍 GET /api/pagos - Parámetros:', { prestamoId, clienteId, page, limit });

    let query: any = {};
    
    if (prestamoId) {
      query.prestamo = prestamoId;
    }
    
    if (clienteId) {
      query.cliente = clienteId;
    }

    console.log('📋 Query final para MongoDB:', query);

    // Ejecutar query
    const pagos = await Pago.find(query)
      .populate({
        path: 'prestamo',
        select: 'montoPrestamo tasaInteres numeroCuotas cuotaMensual',
        model: 'Prestamo'
      })
      .populate({
        path: 'cliente',
        select: 'nombre apellido cedula',
        model: 'Cliente'
      })
      .sort({ fechaPago: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    console.log(`✅ Query retornó ${pagos.length} pagos`);

    const total = await Pago.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: pagos,
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
      { 
        success: false, 
        error: error.message || 'Error al obtener pagos'
      },
      { status: 500 }
    );
  }
}

// POST /api/pagos - Registrar nuevo pago
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const data = await request.json();
    
    console.log('💵 Registrando nuevo pago:', data);

    // Validar datos requeridos
    const requiredFields = ['prestamoId', 'montoPagado', 'cuotaNumero'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Faltan campos obligatorios: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Obtener información del préstamo
    const prestamo = await Prestamo.findById(data.prestamoId);
    if (!prestamo) {
      return NextResponse.json(
        { success: false, error: 'Préstamo no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que la cuota no esté ya pagada
    const pagoExistente = await Pago.findOne({
      prestamo: data.prestamoId,
      cuotaNumero: data.cuotaNumero
    });

    if (pagoExistente) {
      return NextResponse.json(
        { success: false, error: 'Esta cuota ya está pagada' },
        { status: 400 }
      );
    }

    // Calcular distribución del pago
    const capitalPagado = prestamo.capitalMensual;
    const interesPagado = prestamo.interesMensual;
    const valor4x1000Pagado = prestamo.valor4x1000Mensual;
    const montoTotalEsperado = prestamo.cuotaMensual;

    // Verificar que el monto pagado sea correcto
    const margenError = montoTotalEsperado * 0.05;
    if (Math.abs(data.montoPagado - montoTotalEsperado) > margenError) {
      return NextResponse.json(
        { 
          success: false, 
          error: `El monto debe ser aproximadamente ${montoTotalEsperado.toFixed(0)}` 
        },
        { status: 400 }
      );
    }

    // Crear nuevo pago
    const nuevoPago = new Pago({
      prestamo: data.prestamoId,
      cliente: prestamo.cliente,
      fechaPago: data.fechaPago || new Date(),
      montoPagado: montoTotalEsperado,
      cuotaNumero: data.cuotaNumero,
      interesPagado,
      capitalPagado,
      valor4x1000Pagado,
      metodoPago: data.metodoPago || 'Efectivo',
      observaciones: data.observaciones || `Pago cuota ${data.cuotaNumero}`
    });

    await nuevoPago.save();
    console.log(`✅ Pago guardado con ID: ${nuevoPago._id}`);

    // Actualizar préstamo
    const nuevaCuotasPagadas = prestamo.cuotasPagadas + 1;
    const nuevoSaldoPendiente = Math.max(0, prestamo.saldoPendiente - montoTotalEsperado);
    
    let nuevoEstado = 'pendiente'; // Por defecto
    if (nuevaCuotasPagadas >= prestamo.numeroCuotas) {
      nuevoEstado = 'pagado'; // CAMBIADO: 'pagado' en lugar de 'Pagado'
    } else if (prestamo.saldoPendiente - montoTotalEsperado > 0) {
      nuevoEstado = 'pendiente'; // Aún pendiente
    }

    const prestamoActualizado = await Prestamo.findByIdAndUpdate(
      data.prestamoId,
      {
        cuotasPagadas: nuevaCuotasPagadas,
        saldoPendiente: nuevoSaldoPendiente,
        estado: nuevoEstado
      },
      { new: true }
    ).populate('cliente', 'nombre apellido cedula telefono');

    // Si el préstamo está pagado, actualizar estado del cliente también
    if (nuevoEstado === 'pagado') {
      await Cliente.findByIdAndUpdate(prestamo.cliente, {
        $inc: { prestamosActivos: -1 },
        estado: 'pagado'
      });
    }

    console.log(`📊 Préstamo actualizado. Nuevo estado: ${nuevoEstado}`);

    return NextResponse.json({
      success: true,
      message: 'Pago registrado exitosamente',
      data: {
        pago: nuevoPago,
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

    const pago = await Pago.findById(id);
    if (!pago) {
      return NextResponse.json(
        { success: false, error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar pago directamente sin verificar estados
    await Pago.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Pago eliminado exitosamente'
    });

  } catch (error: any) {
    console.error('Error en DELETE /api/pagos:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al eliminar pago' },
      { status: 500 }
    );
  }
}