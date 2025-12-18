import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../db/connect';
import Prestamo from '../db/models/Prestamo';
import Cliente from '../db/models/Cliente';
import Pago from '../db/models/Pago';
import { ObjectId } from 'mongodb';

// Configuración de segmento de ruta
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

// GET /api/prestamos - Obtener todos los préstamos
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const searchParams = request.nextUrl.searchParams;
    const clienteId = searchParams.get('clienteId');
    const estado = searchParams.get('estado');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = (page - 1) * limit;

    // Construir query
    let query: any = {};
    
    // 🔥 CORREGIDO: Validar clienteId antes de usarlo
    if (clienteId && clienteId !== "undefined" && clienteId !== "null" && clienteId.trim() !== "") {
      try {
        if (ObjectId.isValid(clienteId)) {
          query.cliente = new ObjectId(clienteId);
          console.log('✅ [PRESTAMOS] Filtrando por clienteId válido:', clienteId);
        } else {
          console.warn('⚠️ [PRESTAMOS] clienteId no es un ObjectId válido:', clienteId);
          // No agregamos al query si no es válido
        }
      } catch (error) {
        console.error('❌ [PRESTAMOS] Error procesando clienteId:', error);
        // Retornar array vacío en lugar de causar error
        return NextResponse.json({
          success: true,
          data: [],
          pagination: {
            page: 1,
            limit,
            total: 0,
            pages: 0
          }
        });
      }
    } else if (clienteId === "undefined" || clienteId === "null") {
      console.warn('⚠️ [PRESTAMOS] Se recibió clienteId como string "undefined" o "null"');
      // No agregamos al query
    }
    
    if (estado && estado !== 'todos') {
      query.estado = estado;
    }

    console.log('🔍 Buscando préstamos con query:', JSON.stringify(query));

    // Obtener préstamos con paginación
    const prestamos = await Prestamo.find(query)
      .populate('cliente', 'nombre apellido cedula telefono email direccion')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    console.log(`✅ Encontrados ${prestamos.length} préstamos`);

    // Contar total
    const total = await Prestamo.countDocuments(query);

    // Obtener información adicional de pagos para cada préstamo
    const prestamosConInfo = await Promise.all(
      prestamos.map(async (prestamo: any) => {
        const pagos = await Pago.find({ prestamo: prestamo._id })
          .sort({ fechaPago: -1 })
          .lean();

        const totalPagado = pagos.reduce((sum, pago) => sum + pago.montoPagado, 0);
        const progreso = prestamo.numeroCuotas > 0 
          ? (prestamo.cuotasPagadas / prestamo.numeroCuotas) * 100 
          : 0;

        return {
          ...prestamo,
          pagos: pagos.length,
          totalPagado,
          progreso: Math.round(progreso),
          clienteInfo: prestamo.cliente || null,
          clienteId: prestamo.cliente?._id?.toString() || prestamo.cliente?.toString() || clienteId
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: prestamosConInfo,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('❌ Error en GET /api/prestamos:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener préstamos' },
      { status: 500 }
    );
  }
}

// POST /api/prestamos - Crear nuevo préstamo (VERSIÓN SIMPLIFICADA Y CORREGIDA)
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const data = await request.json();

    console.log('📝 Creando PRÉSTAMO con datos recibidos:', JSON.stringify(data, null, 2));

    // 🔥 Validar que no vengan datos de pago por error
    const prestamoData = {
      cliente: data.cliente,
      montoPrestamo: data.montoPrestamo,
      tasaInteres: data.tasaInteres,
      numeroCuotas: data.numeroCuotas,
      fechaPrestamo: data.fechaPrestamo || new Date(),
      fechaProximoPago: data.fechaProximoPago || data.fechaPrestamo || new Date(),
      observaciones: data.observaciones || 'Préstamo inicial'
    };

    console.log('📝 Datos limpios del préstamo:', prestamoData);

    // Validar datos requeridos
    if (!prestamoData.cliente || !prestamoData.montoPrestamo || !prestamoData.tasaInteres || !prestamoData.numeroCuotas) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Faltan campos obligatorios: cliente, montoPrestamo, tasaInteres, numeroCuotas',
          datosRecibidos: Object.keys(data)
        },
        { status: 400 }
      );
    }

    // Verificar que el cliente exista
    const clienteExistente = await Cliente.findById(prestamoData.cliente);
    if (!clienteExistente) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    // Calcular valores del préstamo
    const tasaMensual = prestamoData.tasaInteres / 100;
    const capitalMensual = prestamoData.montoPrestamo / prestamoData.numeroCuotas;
    const interesMensual = prestamoData.montoPrestamo * tasaMensual;
    const cuotaBase = capitalMensual + interesMensual;
    const valor4x1000Mensual = cuotaBase * 0.004;
    const cuotaMensual = cuotaBase + valor4x1000Mensual;
    const totalPagar = cuotaMensual * prestamoData.numeroCuotas;
    const totalIntereses = interesMensual * prestamoData.numeroCuotas;
    const total4x1000 = valor4x1000Mensual * prestamoData.numeroCuotas;

    // Crear nuevo préstamo
    const nuevoPrestamo = new Prestamo({
      cliente: prestamoData.cliente,
      montoPrestamo: prestamoData.montoPrestamo,
      tasaInteres: prestamoData.tasaInteres,
      numeroCuotas: prestamoData.numeroCuotas,
      fechaPrestamo: prestamoData.fechaPrestamo,
      fechaProximoPago: prestamoData.fechaProximoPago,
      observaciones: prestamoData.observaciones,
      estado: 'pendiente',
      cuotasPagadas: 0,
      saldoPendiente: totalPagar,
      totalIntereses: totalIntereses,
      total4x1000: total4x1000,
      cuotaMensual: cuotaMensual,
      capitalMensual: capitalMensual,
      interesMensual: interesMensual,
      valor4x1000Mensual: valor4x1000Mensual,
      interesesAcumulados: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await nuevoPrestamo.save();

    console.log('✅ Préstamo creado con ID:', nuevoPrestamo._id);

    // Actualizar cliente para reflejar que tiene un préstamo activo
    await Cliente.findByIdAndUpdate(prestamoData.cliente, {
      $inc: { prestamosActivos: 1 },
      estado: 'pendiente',
      updatedAt: new Date()
    });

    // 🔥 NO CREAR PAGOS AUTOMÁTICAMENTE
    console.log('⚠️ NOTA: No se crean pagos automáticamente al crear un préstamo');

    // Obtener el préstamo con información del cliente
    const prestamoConCliente = await Prestamo.findById(nuevoPrestamo._id)
      .populate('cliente', 'nombre apellido cedula telefono email direccion')
      .lean();

    return NextResponse.json({
      success: true,
      message: 'Préstamo creado exitosamente',
      data: prestamoConCliente
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Error en POST /api/prestamos:', error);
    
    console.error('📋 Detalles del error:', {
      message: error.message,
      stack: error.stack?.split('\n')[0],
      errors: error.errors ? Object.keys(error.errors) : []
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error al crear préstamo'
      },
      { status: 500 }
    );
  }
}

// PUT /api/prestamos - Actualizar préstamo (VERSIÓN CORREGIDA)
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const data = await request.json();
    const { id, ...updateData } = data;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID del préstamo es requerido' },
        { status: 400 }
      );
    }

    // Si se está actualizando el estado, asegurarse de que sea uno de los valores permitidos
    if (updateData.estado && !['pendiente', 'pagado', 'mora'].includes(updateData.estado)) {
      return NextResponse.json(
        { success: false, error: 'Estado no válido. Use: pendiente, pagado, mora' },
        { status: 400 }
      );
    }

    // Buscar el préstamo actual
    const prestamoActual = await Prestamo.findById(id);
    if (!prestamoActual) {
      return NextResponse.json(
        { success: false, error: 'Préstamo no encontrado' },
        { status: 404 }
      );
    }

    console.log('🔄 Actualizando préstamo ID:', id);
    console.log('📋 Datos recibidos:', updateData);
    console.log('📅 Fechas actuales:', {
      fechaPrestamo: prestamoActual.fechaPrestamo,
      fechaProximoPago: prestamoActual.fechaProximoPago
    });

    // 🔥 IMPORTANTE: Si se actualiza la fecha de próximo pago,
    // calcular la fecha de registro como UN MES ANTES
    if (updateData.fechaProximoPago && updateData.fechaProximoPago !== prestamoActual.fechaProximoPago) {
      console.log('📅 Se está actualizando la fecha de próximo pago:', updateData.fechaProximoPago);
      
      // Función para restar un mes a una fecha
      const restarUnMes = (fechaStr: string) => {
        const fecha = new Date(fechaStr);
        
        // Restar un mes
        fecha.setMonth(fecha.getMonth() - 1);
        
        // Ajustar si el día no existe en el mes anterior (ej: 31 de marzo a 28/29 de febrero)
        const diaOriginal = new Date(fechaStr).getDate();
        const diaDespues = fecha.getDate();
        
        if (diaDespues < diaOriginal) {
          // Si el día cambió (ej: 31 → 28), ir al último día del mes
          fecha.setDate(0); // Ir al último día del mes anterior
        }
        
        // Formatear a YYYY-MM-DD
        const year = fecha.getFullYear();
        const month = String(fecha.getMonth() + 1).padStart(2, '0');
        const day = String(fecha.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      // Calcular la nueva fecha de registro
      updateData.fechaPrestamo = restarUnMes(updateData.fechaProximoPago);
      
      console.log('📅 Fechas calculadas:', {
        nuevoProximoPago: updateData.fechaProximoPago,
        nuevaFechaRegistro: updateData.fechaPrestamo,
        diferencia: 'La fecha de registro es un mes antes del próximo pago'
      });
    } else if (!updateData.fechaPrestamo) {
      // Si no se envía fecha de registro, mantener la actual
      updateData.fechaPrestamo = prestamoActual.fechaPrestamo;
    }

    // 🔥 Si se actualizan datos del préstamo (monto, tasa, cuotas), recalcular valores
    if (updateData.montoPrestamo || updateData.tasaInteres || updateData.numeroCuotas) {
      // Usar valores actualizados o mantener los existentes
      const monto = updateData.montoPrestamo || prestamoActual.montoPrestamo;
      const tasa = updateData.tasaInteres || prestamoActual.tasaInteres;
      const cuotas = updateData.numeroCuotas || prestamoActual.numeroCuotas;

      // Recalcular
      const tasaMensual = tasa / 100;
      const capitalMensual = monto / cuotas;
      const interesMensual = monto * tasaMensual;
      const cuotaBase = capitalMensual + interesMensual;
      const valor4x1000Mensual = cuotaBase * 0.004;
      const cuotaMensual = cuotaBase + valor4x1000Mensual;
      const totalPagar = cuotaMensual * cuotas;
      const totalIntereses = interesMensual * cuotas;
      const total4x1000 = valor4x1000Mensual * cuotas;

      // Actualizar campos calculados
      updateData.capitalMensual = capitalMensual;
      updateData.interesMensual = interesMensual;
      updateData.valor4x1000Mensual = valor4x1000Mensual;
      updateData.cuotaMensual = cuotaMensual;
      updateData.totalIntereses = totalIntereses;
      updateData.total4x1000 = total4x1000;

      console.log('🧮 Valores recalculados:', {
        cuotaMensual,
        capitalMensual,
        interesMensual,
        totalPagar,
        totalIntereses
      });

      // Si no se especifica saldo pendiente, calcularlo basado en los pagos realizados
      if (!updateData.saldoPendiente) {
        const pagos = await Pago.find({ prestamo: id });
        const totalPagado = pagos.reduce((sum, pago) => sum + pago.montoPagado, 0);
        updateData.saldoPendiente = Math.max(0, totalPagar - totalPagado);
        
        console.log('💰 Saldo pendiente recalculado:', {
          totalPagar,
          totalPagado,
          saldoPendiente: updateData.saldoPendiente
        });
      }
    }

    updateData.updatedAt = new Date();

    console.log('📤 Datos finales para actualizar:', updateData);

    const prestamoActualizado = await Prestamo.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('cliente', 'nombre apellido cedula telefono email direccion');

    if (!prestamoActualizado) {
      return NextResponse.json(
        { success: false, error: 'Préstamo no encontrado después de actualizar' },
        { status: 404 }
      );
    }

    console.log('✅ Préstamo actualizado exitosamente:', {
      id: prestamoActualizado._id,
      fechaPrestamoActualizada: prestamoActualizado.fechaPrestamo,
      fechaProximoPagoActualizada: prestamoActualizado.fechaProximoPago,
      monto: prestamoActualizado.montoPrestamo,
      saldoPendiente: prestamoActualizado.saldoPendiente
    });

    // 🔥 Si se cambió el estado, actualizar también el cliente
    if (updateData.estado) {
      await Cliente.findByIdAndUpdate(prestamoActualizado.cliente, {
        estado: updateData.estado,
        updatedAt: new Date()
      });
      console.log(`✅ Estado del cliente actualizado a: ${updateData.estado}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Préstamo actualizado exitosamente',
      data: prestamoActualizado
    });

  } catch (error: any) {
    console.error('❌ Error en PUT /api/prestamos:', error);
    
    console.error('📋 Detalles del error:', {
      message: error.message,
      stack: error.stack?.split('\n')[0],
      errors: error.errors ? Object.keys(error.errors) : []
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error al actualizar préstamo'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/prestamos - Eliminar préstamo
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID del préstamo es requerido' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Eliminando préstamo ${id}`);

    // Buscar el préstamo
    const prestamo = await Prestamo.findById(id);
    if (!prestamo) {
      return NextResponse.json(
        { success: false, error: 'Préstamo no encontrado' },
        { status: 404 }
      );
    }

    // 1. Primero eliminar todos los pagos de este préstamo
    await Pago.deleteMany({ prestamo: id });
    console.log(`✅ Pagos del préstamo ${id} eliminados`);

    // 2. Luego eliminar el préstamo
    await Prestamo.findByIdAndDelete(id);
    console.log(`✅ Préstamo ${id} eliminado`);

    // 3. Actualizar cliente para reflejar que tiene un préstamo menos
    const prestamosRestantes = await Prestamo.countDocuments({ 
      cliente: prestamo.cliente,
      estado: { $in: ['pendiente', 'mora'] }
    });

    await Cliente.findByIdAndUpdate(prestamo.cliente, {
      prestamosActivos: prestamosRestantes,
      estado: prestamosRestantes > 0 ? 'pendiente' : 'pagado',
      updatedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      message: 'Préstamo y pagos asociados eliminados exitosamente'
    });

  } catch (error: any) {
    console.error('❌ Error en DELETE /api/prestamos:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error al eliminar préstamo'
      },
      { status: 500 }
    );
  }
}