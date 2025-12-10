import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../db/connect';
import Cliente from '../db/models/Cliente';
import Prestamo from '../db/models/Prestamo';
import Pago from '../db/models/Pago'; // <-- AGREGAR ESTA IMPORTACIÓN

// GET /api/clientes - Obtener todos los clientes
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const searchParams = request.nextUrl.searchParams;
    const estado = searchParams.get('estado');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = (page - 1) * limit;

    // Construir query
    let query: any = {};
    
    if (estado && estado !== 'todos') {
      query.estado = estado;
    }
    
    if (search) {
      query.$or = [
        { nombre: { $regex: search, $options: 'i' } },
        { apellido: { $regex: search, $options: 'i' } },
        { cedula: { $regex: search, $options: 'i' } },
        { telefono: { $regex: search, $options: 'i' } }
      ];
    }

    // Obtener clientes con paginación
    const clientes = await Cliente.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Contar total
    const total = await Cliente.countDocuments(query);

    // Obtener información adicional de préstamos para cada cliente
    const clientesConInfo = await Promise.all(
      clientes.map(async (cliente) => {
        // Buscar préstamos del cliente
        const prestamos = await Prestamo.find({ cliente: cliente._id });
        
        // Filtrar préstamos según los nuevos estados
        const prestamosPendientes = prestamos.filter(p => p.estado === 'pendiente').length;
        const prestamosPagados = prestamos.filter(p => p.estado === 'pagado').length;
        const prestamosEnMora = prestamos.filter(p => p.estado === 'mora').length;
        
        const tieneMora = prestamosEnMora > 0;
        const todosPagados = prestamos.length > 0 && prestamos.every(p => p.estado === 'pagado');
        const tienePendientes = prestamosPendientes > 0;
        
        // Determinar estado basado en préstamos (si no hay préstamos, usar el estado guardado)
        let estadoCalculado = cliente.estado;
        
        if (prestamos.length > 0) {
          if (tieneMora) {
            estadoCalculado = 'mora';
          } else if (todosPagados) {
            estadoCalculado = 'pagado';
          } else if (tienePendientes) {
            estadoCalculado = 'pendiente';
          }
        }
        
        // Calcular saldos
        const saldoTotal = prestamos.reduce((sum, p) => sum + (p.saldoPendiente || 0), 0);
        const montoTotalPrestado = prestamos.reduce((sum, p) => sum + (p.montoPrestamo || 0), 0);
        
        return {
          ...cliente,
          prestamosActivos: prestamosPendientes + prestamosEnMora, // Suma de pendientes y en mora
          prestamosPagados,
          prestamosEnMora,
          saldoTotal,
          totalPrestamos: prestamos.length,
          montoTotalPrestado,
          estado: estadoCalculado
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: clientesConInfo,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('Error en GET /api/clientes:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener clientes' },
      { status: 500 }
    );
  }
}

// POST /api/clientes - Crear nuevo cliente O acciones especiales
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const data = await request.json();
    
    console.log('📝 Datos recibidos en POST /api/clientes:', data);

    // VERIFICAR SI ES UNA ACCIÓN ESPECIAL (marcar en mora)
    if (data.action === 'marcar-mora') {
      console.log('🚨 Acción: marcar en mora para cliente:', data.clienteId);
      
      if (!data.clienteId) {
        return NextResponse.json(
          { success: false, error: 'ID del cliente es requerido' },
          { status: 400 }
        );
      }

      // Actualizar cliente a estado 'mora'
      const clienteActualizado = await Cliente.findByIdAndUpdate(
        data.clienteId,
        { estado: 'mora' },
        { new: true }
      );

      if (!clienteActualizado) {
        return NextResponse.json(
          { success: false, error: 'Cliente no encontrado' },
          { status: 404 }
        );
      }

      // También actualizar todos los préstamos pendientes del cliente a 'mora'
      const resultado = await Prestamo.updateMany(
        { cliente: data.clienteId, estado: 'pendiente' },
        { estado: 'mora' }
      );

      console.log(`✅ ${resultado.modifiedCount} préstamos actualizados a mora`);

      return NextResponse.json({
        success: true,
        message: 'Cliente y préstamos pendientes marcados en mora',
        data: clienteActualizado
      });
    }

    // VERIFICAR SI ES UNA ACCIÓN ESPECIAL (actualizar estado)
    if (data.action === 'actualizar-estado') {
      console.log('🔄 Acción: actualizar estado para cliente:', data.clienteId);
      
      if (!data.clienteId) {
        return NextResponse.json(
          { success: false, error: 'ID del cliente es requerido' },
          { status: 400 }
        );
      }

      // Obtener préstamos del cliente
      const prestamosCliente = await Prestamo.find({ cliente: data.clienteId });
      
      // Determinar estado basado en préstamos
      let nuevoEstado = 'pendiente';
      
      if (prestamosCliente.length > 0) {
        const tienePrestamosEnMora = prestamosCliente.some(p => p.estado === 'mora');
        const todosPagados = prestamosCliente.every(p => p.estado === 'pagado');
        const tienePendientes = prestamosCliente.some(p => p.estado === 'pendiente');
        
        if (tienePrestamosEnMora) {
          nuevoEstado = 'mora';
        } else if (todosPagados) {
          nuevoEstado = 'pagado';
        } else if (tienePendientes) {
          nuevoEstado = 'pendiente';
        }
      } else {
        // Si no tiene préstamos, mantener estado actual o 'pendiente'
        const cliente = await Cliente.findById(data.clienteId);
        nuevoEstado = cliente?.estado || 'pendiente';
      }
      
      // Actualizar cliente
      const clienteActualizado = await Cliente.findByIdAndUpdate(
        data.clienteId,
        { estado: nuevoEstado },
        { new: true }
      );

      if (!clienteActualizado) {
        return NextResponse.json(
          { success: false, error: 'Cliente no encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Estado del cliente actualizado exitosamente',
        data: clienteActualizado
      });
    }

    // SI NO ES ACCIÓN ESPECIAL, ES CREACIÓN DE CLIENTE NORMAL
    console.log('👤 Creando nuevo cliente...');

    // Validar datos requeridos
    if (!data.nombre || !data.apellido || !data.cedula || !data.telefono) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos obligatorios: nombre, apellido, cedula, telefono' },
        { status: 400 }
      );
    }

    // Verificar si la cédula ya existe
    const clienteExistente = await Cliente.findOne({ cedula: data.cedula });
    if (clienteExistente) {
      return NextResponse.json(
        { success: false, error: 'Ya existe un cliente con esta cédula' },
        { status: 400 }
      );
    }

    // Crear nuevo cliente
    const nuevoCliente = new Cliente({
      nombre: data.nombre,
      apellido: data.apellido,
      cedula: data.cedula,
      telefono: data.telefono,
      email: data.email || '',
      direccion: data.direccion || '',
      estado: 'pendiente', // Estado por defecto
      prestamosActivos: 0
    });

    await nuevoCliente.save();

    console.log('✅ Cliente creado con ID:', nuevoCliente._id);

    return NextResponse.json({
      success: true,
      message: 'Cliente creado exitosamente',
      data: nuevoCliente
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Error en POST /api/clientes:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al procesar solicitud' },
      { status: 500 }
    );
  }
}

// PUT /api/clientes - Actualizar cliente
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const data = await request.json();
    const { id, ...updateData } = data;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID del cliente es requerido' },
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

    const clienteActualizado = await Cliente.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!clienteActualizado) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Cliente actualizado exitosamente',
      data: clienteActualizado
    });

  } catch (error: any) {
    console.error('Error en PUT /api/clientes:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al actualizar cliente' },
      { status: 500 }
    );
  }
}

// DELETE /api/clientes - Eliminar cliente COMPLETAMENTE
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    // Leer el body para verificar si queremos borrar todo
    let deleteAll = false;
    try {
      const body = await request.json();
      deleteAll = body.deleteAll || false;
    } catch (e) {
      // Si no hay body, continuar sin deleteAll
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID del cliente es requerido' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Eliminando cliente ${id} - deleteAll: ${deleteAll}`);

    // Buscar préstamos del cliente
    const prestamosCliente = await Prestamo.find({ cliente: id });
    
    // Si el cliente tiene préstamos y no se especificó deleteAll
    if (prestamosCliente.length > 0 && !deleteAll) {
      const prestamosPendientes = prestamosCliente.filter(p => 
        p.estado === 'pendiente' || p.estado === 'mora'
      ).length;
      
      const prestamosPagados = prestamosCliente.filter(p => 
        p.estado === 'pagado'
      ).length;
      
      return NextResponse.json(
        { 
          success: false, 
          error: `No se puede eliminar el cliente porque tiene ${prestamosPendientes} préstamo(s) pendiente(s) y ${prestamosPagados} pagado(s). ¿Quieres eliminar todo?`,
          tienePrestamos: true
        },
        { status: 400 }
      );
    }

    // Si el cliente tiene préstamos Y deleteAll=true, eliminamos todo
    if (prestamosCliente.length > 0 && deleteAll) {
      console.log(`📊 Encontrados ${prestamosCliente.length} préstamos para eliminar`);
      
      for (const prestamo of prestamosCliente) {
        console.log(`🗑️ Eliminando préstamo ${prestamo._id}`);
        
        // 1. Primero eliminar todos los pagos de este préstamo
        await Pago.deleteMany({ prestamo: prestamo._id });
        console.log(`✅ Pagos del préstamo ${prestamo._id} eliminados`);
        
        // 2. Luego eliminar el préstamo
        await Prestamo.findByIdAndDelete(prestamo._id);
        console.log(`✅ Préstamo ${prestamo._id} eliminado`);
      }
    }

    // Finalmente, eliminar el cliente
    const clienteEliminado = await Cliente.findByIdAndDelete(id);

    if (!clienteEliminado) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    console.log(`✅ Cliente ${id} eliminado exitosamente`);

    return NextResponse.json({
      success: true,
      message: deleteAll 
        ? 'Cliente, préstamos y pagos eliminados exitosamente'
        : 'Cliente eliminado exitosamente'
    });

  } catch (error: any) {
    console.error('❌ Error en DELETE /api/clientes:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error al eliminar cliente'
      },
      { status: 500 }
    );
  }
}

// Configuración de los métodos HTTP permitidos
export const config = {
  api: {
    bodyParser: true,
  },
};