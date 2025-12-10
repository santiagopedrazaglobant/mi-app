import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../db/connect';
import Prestamo from '../db/models/Prestamo';
import Cliente from '../db/models/Cliente';

// Función para calcular préstamo detallado
function calcularPrestamoDetallado(monto: number, tasaInteres: number, numeroCuotas: number) {
  const tasaMensual = tasaInteres / 100; 
  const capitalMensual = monto / numeroCuotas;
  const interesMensual = monto * tasaMensual;
  const cuotaBase = capitalMensual + interesMensual;
  const valor4x1000Mensual = cuotaBase * 0.004;
  const cuotaMensual = cuotaBase + valor4x1000Mensual;
  const totalIntereses = interesMensual * numeroCuotas;
  const total4x1000 = valor4x1000Mensual * numeroCuotas;
  const totalPagar = monto + totalIntereses + total4x1000;

  return {
    capitalMensual,
    interesMensual,
    cuotaBase,
    valor4x1000Mensual,
    cuotaMensual,
    totalPagar,
    totalIntereses,
    total4x1000
  };
}

// GET /api/prestamos - Obtener todos los préstamos
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const searchParams = request.nextUrl.searchParams;
    const estado = searchParams.get('estado');
    const clienteId = searchParams.get('clienteId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = (page - 1) * limit;

    let query: any = {};
    
    if (estado && estado !== 'todos') {
      query.estado = estado;
    }
    
    if (clienteId) {
      query.cliente = clienteId;
    }
    
    if (search) {
      const clientes = await Cliente.find({
        $or: [
          { nombre: { $regex: search, $options: 'i' } },
          { apellido: { $regex: search, $options: 'i' } },
          { cedula: { $regex: search, $options: 'i' } }
        ]
      });
      
      const clienteIds = clientes.map(c => c._id);
      query.cliente = { $in: clienteIds };
    }

    // Obtener préstamos con datos del cliente
    const prestamos = await Prestamo.find(query)
      .populate({
        path: 'cliente',
        select: 'nombre apellido cedula telefono estado'
      })
      .sort({ fechaPrestamo: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Prestamo.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: prestamos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('Error en GET /api/prestamos:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error al obtener préstamos'
      },
      { status: 500 }
    );
  }
}

// POST /api/prestamos - Crear nuevo préstamo
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const data = await request.json();
    
    console.log('💰 Datos recibidos para crear préstamo:', JSON.stringify(data, null, 2));

    // Validar datos requeridos
    if (!data.cliente || !data.montoPrestamo || !data.tasaInteres || !data.numeroCuotas) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Faltan campos obligatorios: cliente, montoPrestamo, tasaInteres, numeroCuotas' 
        },
        { status: 400 }
      );
    }

    // Verificar que el cliente existe
    const cliente = await Cliente.findById(data.cliente);
    if (!cliente) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    // Convertir valores
    const montoPrestamo = Number(data.montoPrestamo);
    const tasaInteres = Number(data.tasaInteres);
    const numeroCuotas = Number(data.numeroCuotas);

    // Validar valores numéricos
    if (isNaN(montoPrestamo) || montoPrestamo <= 0) {
      return NextResponse.json(
        { success: false, error: 'El monto del préstamo debe ser un número mayor a 0' },
        { status: 400 }
      );
    }

    if (isNaN(tasaInteres) || tasaInteres < 0) {
      return NextResponse.json(
        { success: false, error: 'La tasa de interés debe ser un número válido' },
        { status: 400 }
      );
    }

    if (isNaN(numeroCuotas) || numeroCuotas <= 0) {
      return NextResponse.json(
        { success: false, error: 'El número de cuotas debe ser mayor a 0' },
        { status: 400 }
      );
    }

    // Calcular detalles del préstamo
    const calculo = calcularPrestamoDetallado(montoPrestamo, tasaInteres, numeroCuotas);

    console.log('🧮 Cálculos del préstamo:', calculo);

    // Calcular fecha de vencimiento
    const fechaPrestamo = new Date();
    const fechaVencimiento = new Date();
    fechaVencimiento.setMonth(fechaVencimiento.getMonth() + numeroCuotas);

    // Crear objeto del préstamo - ESTADO: 'pendiente'
    const prestamoData = {
      cliente: data.cliente,
      clienteData: {
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        cedula: cliente.cedula,
        telefono: cliente.telefono
      },
      montoPrestamo,
      tasaInteres,
      numeroCuotas,
      fechaPrestamo: fechaPrestamo,
      fechaVencimiento: fechaVencimiento,
      estado: 'pendiente', // CAMBIADO: 'pendiente' en lugar de 'Activo'
      cuotasPagadas: 0,
      saldoPendiente: calculo.totalPagar,
      totalIntereses: calculo.totalIntereses,
      total4x1000: calculo.total4x1000,
      cuotaMensual: calculo.cuotaMensual,
      capitalMensual: calculo.capitalMensual,
      interesMensual: calculo.interesMensual,
      valor4x1000Mensual: calculo.valor4x1000Mensual,
      observaciones: data.observaciones || 'Préstamo inicial'
    };

    console.log('📝 Datos del préstamo a guardar:', JSON.stringify(prestamoData, null, 2));

    console.log('📝 Guardando préstamo...');

    // Crear y guardar el préstamo
    const nuevoPrestamo = new Prestamo(prestamoData);
    const prestamoGuardado = await nuevoPrestamo.save();
    
    console.log('✅ Préstamo guardado con ID:', prestamoGuardado._id);
    console.log('✅ Estado del préstamo:', prestamoGuardado.estado);

    // Actualizar cliente
    await Cliente.findByIdAndUpdate(data.cliente, {
      $inc: { prestamosActivos: 1 },
      estado: 'pendiente'
    });

    console.log('👤 Cliente actualizado a estado: pendiente');

    // Obtener el préstamo con datos del cliente poblados
    const prestamoConCliente = await Prestamo.findById(prestamoGuardado._id)
      .populate('cliente', 'nombre apellido cedula telefono estado')
      .lean();

    console.log('📊 Préstamo con cliente:', prestamoConCliente);

    return NextResponse.json({
      success: true,
      message: 'Préstamo creado exitosamente',
      data: prestamoConCliente
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Error en POST /api/prestamos:', error);
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      keyValue: error.keyValue
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error al crear préstamo',
        details: process.env.NODE_ENV === 'development' ? {
          name: error.name,
          code: error.code,
          keyValue: error.keyValue
        } : undefined
      },
      { status: 500 }
    );
  }
}

// PUT /api/prestamos - Actualizar préstamo
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

    const prestamoActualizado = await Prestamo.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('cliente', 'nombre apellido cedula telefono');

    if (!prestamoActualizado) {
      return NextResponse.json(
        { success: false, error: 'Préstamo no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Préstamo actualizado exitosamente',
      data: prestamoActualizado
    });

  } catch (error: any) {
    console.error('Error en PUT /api/prestamos:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al actualizar préstamo' },
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

    const prestamo = await Prestamo.findById(id);
    if (!prestamo) {
      return NextResponse.json(
        { success: false, error: 'Préstamo no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar préstamo directamente sin verificar estados
    await Prestamo.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Préstamo eliminado exitosamente'
    });

  } catch (error: any) {
    console.error('Error en DELETE /api/prestamos:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al eliminar préstamo' },
      { status: 500 }
    );
  }
}