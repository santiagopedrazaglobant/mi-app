'use client';

import { useState, useEffect, useMemo } from 'react';

// Interfaz para el cliente con cálculo detallado
interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  telefono: string;
  email?: string;
  direccion?: string;
  montoPrestamo: number;
  tasaInteres: number;
  numeroCuotas: number;
  fechaPrestamo: string;
  fechaProximoPago: string;
  estado: 'pendiente' | 'pagado' | 'mora';
  cuotasPagadas: number;
  saldoPendiente: number;
  totalIntereses: number;
  total4x1000: number;
  cuotaMensual: number;
  capitalMensual: number;
  interesMensual: number;
  valor4x1000Mensual: number;
  interesesAcumulados: number;
  observaciones?: string;
}

// Interfaz para el pago
interface Pago {
  id: string;
  clienteId: string;
  fechaPago: string;
  montoPagado: number;
  cuotaNumero: number;
  interesPagado: number;
  capitalPagado: number;
  observaciones?: string;
  fechaPagoFormateada?: string;
  tipoPago?: string;
}

// Función para calcular préstamo detallado
const calcularPrestamoDetallado = (
  monto: number,
  tasaInteres: number,
  numeroCuotas: number
) => {
  const tasaMensual = tasaInteres / 100;
  const capitalMensual = monto / numeroCuotas;
  const interesMensual = monto * tasaMensual;
  const cuotaBase = capitalMensual + interesMensual;
  const valor4x1000Mensual = cuotaBase * 0.004;
  const cuotaMensual = cuotaBase + valor4x1000Mensual;
  const totalPagar = cuotaMensual * numeroCuotas;
  const totalIntereses = interesMensual * numeroCuotas;
  const total4x1000 = valor4x1000Mensual * numeroCuotas;

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
};

// Función para manejar fechas sin problemas de zona horaria
const manejarFechaSinZonaHoraria = (fechaString: string): string => {
  if (!fechaString) {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Si ya está en formato YYYY-MM-DD, devolverlo tal cual
  if (fechaString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return fechaString;
  }

  // Para fechas en formato ISO, extraer solo la parte de la fecha
  const fechaObj = new Date(fechaString);

  // Usar UTC para evitar problemas de zona horaria
  const year = fechaObj.getUTCFullYear();
  const month = String(fechaObj.getUTCMonth() + 1).padStart(2, '0');
  const day = String(fechaObj.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

// Función para formatear fecha a YYYY-MM-DD sin problemas de zona horaria
const formatearFechaParaBackend = (fechaString: string): string => {
  if (!fechaString) {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Si la fecha ya está en formato YYYY-MM-DD, devolverla directamente
  if (fechaString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return fechaString;
  }

  // Para fechas en formato ISO, extraer solo la parte de la fecha
  const fechaObj = new Date(fechaString);

  // Usar UTC para evitar problemas de zona horaria
  const year = fechaObj.getUTCFullYear();
  const month = String(fechaObj.getUTCMonth() + 1).padStart(2, '0');
  const day = String(fechaObj.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

// SERVICIO CONEXIÓN API REAL - ACTUALIZADO
class SistemaPrestamosService {
  // Obtener todos los clientes con sus préstamos
  static async obtenerClientes(): Promise<Cliente[]> {
    try {
      console.log('🔄 Obteniendo clientes...');

      const timestamp = new Date().getTime();
      const clientesResponse = await fetch(`/api/clientes?_=${timestamp}`);

      if (!clientesResponse.ok) {
        throw new Error('Error al obtener clientes');
      }

      const clientesResult = await clientesResponse.json();

      if (!clientesResult.success) {
        throw new Error(clientesResult.error || 'Error en la respuesta');
      }

      console.log(`✅ ${clientesResult.data?.length || 0} clientes obtenidos`);

      // Transformar los datos: convertir _id a id
      const clientesTransformados = (clientesResult.data || []).map((cliente: any) => {
        if (!cliente.id && cliente._id) {
          return {
            ...cliente,
            id: cliente._id.toString()
          };
        }
        return cliente;
      });

      return clientesTransformados;

    } catch (error: any) {
      console.error('❌ Error fetching clientes:', error);
      throw error;
    }
  }

  // Editar cliente y préstamo
  static async editarCliente(id: string, datosActualizados: any): Promise<Cliente> {
    try {
      console.log('✏️ Editando cliente:', id, datosActualizados);

      // Primero actualizar los datos del préstamo para recalcular el saldo
      if (datosActualizados.montoPrestamo || datosActualizados.tasaInteres || datosActualizados.numeroCuotas) {
        await this.actualizarPrestamo(id, datosActualizados);
      }

      // Luego actualizar los datos del cliente
      const response = await fetch(`/api/clientes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: id,
          ...datosActualizados
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al editar cliente');
      }

      const result = await response.json();
      console.log('✅ Cliente editado:', result);

      // Finalmente, obtener el cliente actualizado
      const clienteActualizado = await this.obtenerClientePorId(id);
      return clienteActualizado;

    } catch (error: any) {
      console.error('❌ Error editando cliente:', error);
      throw error;
    }
  }

  // Actualizar préstamo - CORREGIDO para fecha de registro un mes antes
  static async actualizarPrestamo(clienteId: string, datosPrestamo: any): Promise<any> {
    try {
      console.log('🔄 Actualizando préstamo con datos:', datosPrestamo);

      const prestamosResponse = await fetch(`/api/prestamos?clienteId=${clienteId}`);
      if (!prestamosResponse.ok) throw new Error('Error al buscar préstamo');

      const prestamosResult = await prestamosResponse.json();

      if (!prestamosResult.success || prestamosResult.data.length === 0) {
        throw new Error('No se encontró préstamo para actualizar');
      }

      const prestamoActual = prestamosResult.data[0];
      const prestamoId = prestamoActual._id;

      // Obtener valores actuales o nuevos
      const monto = datosPrestamo.montoPrestamo || prestamoActual.montoPrestamo;
      const tasa = datosPrestamo.tasaInteres || prestamoActual.tasaInteres;
      const cuotas = datosPrestamo.numeroCuotas || prestamoActual.numeroCuotas;
      const cuotasPagadas = prestamoActual.cuotasPagadas || 0;

      // 🔥 IMPORTANTE: Si hay nueva fecha de próximo pago, calcular fecha de registro
      let fechaProximoPago = datosPrestamo.fechaProximoPago || prestamoActual.fechaProximoPago;
      let fechaPrestamo = prestamoActual.fechaPrestamo; // Por defecto mantener la actual

      // Función para calcular fecha de registro (un mes antes)
      const calcularFechaRegistro = (fechaProxPago: string) => {
        const fecha = new Date(fechaProxPago);
        fecha.setMonth(fecha.getMonth() - 1);

        const year = fecha.getFullYear();
        const month = String(fecha.getMonth() + 1).padStart(2, '0');
        const day = String(fecha.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Si se está actualizando la fecha de próximo pago
      if (datosPrestamo.fechaProximoPago && datosPrestamo.fechaProximoPago !== prestamoActual.fechaProximoPago) {
        console.log('📅 Calculando nueva fecha de registro...');
        console.log('Fecha próximo pago recibida:', datosPrestamo.fechaProximoPago);

        // Calcular la nueva fecha de registro (un mes antes)
        fechaPrestamo = calcularFechaRegistro(datosPrestamo.fechaProximoPago);

        console.log('Fechas calculadas:', {
          nuevoProximoPago: datosPrestamo.fechaProximoPago,
          nuevaFechaRegistro: fechaPrestamo,
          diferencia: 'La fecha de registro es un mes antes del próximo pago'
        });
      }

      // Calcular el nuevo préstamo
      const calculo = calcularPrestamoDetallado(monto, tasa, cuotas);

      // Recalcular el saldo pendiente
      const totalPagadoHastaAhora = cuotasPagadas * calculo.cuotaMensual;
      const saldoPendienteNuevo = Math.max(0, calculo.totalPagar - totalPagadoHastaAhora);

      console.log('🔄 Recalculando préstamo:', {
        fechaProximoPago,
        fechaPrestamo,
        montoAnterior: prestamoActual.montoPrestamo,
        montoNuevo: monto,
        cuotasPagadas,
        cuotaMensualNueva: calculo.cuotaMensual,
        totalPagadoHastaAhora,
        totalPagarNuevo: calculo.totalPagar,
        saldoPendienteAnterior: prestamoActual.saldoPendiente,
        saldoPendienteNuevo
      });

      const prestamoData = {
        id: prestamoId,
        montoPrestamo: monto,
        tasaInteres: tasa,
        numeroCuotas: cuotas,
        cuotaMensual: calculo.cuotaMensual,
        capitalMensual: calculo.capitalMensual,
        interesMensual: calculo.interesMensual,
        valor4x1000Mensual: calculo.valor4x1000Mensual,
        saldoPendiente: saldoPendienteNuevo,
        totalIntereses: calculo.totalIntereses,
        total4x1000: calculo.total4x1000,
        interesesAcumulados: datosPrestamo.interesesAcumulados || prestamoActual.interesesAcumulados || 0,
        // ENVIAR AMBAS FECHAS
        fechaProximoPago: datosPrestamo.fechaProximoPago || prestamoActual.fechaProximoPago,
        fechaPrestamo: fechaPrestamo // La fecha calculada (un mes antes)
      };

      console.log('📤 Enviando datos al backend:', prestamoData);

      const response = await fetch(`/api/prestamos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prestamoData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Error del backend:', errorData);
        throw new Error(errorData.error || 'Error al actualizar préstamo');
      }

      const result = await response.json();
      console.log('✅ Préstamo actualizado correctamente:', result);
      return result;

    } catch (error: any) {
      console.error('❌ Error actualizando prestamo:', error);
      throw error;
    }
  }

  // Obtener cliente por ID
  static async obtenerClientePorId(id: string): Promise<Cliente> {
    try {
      const response = await fetch(`/api/clientes?id=${id}`);
      if (!response.ok) throw new Error('Error al obtener cliente');

      const result = await response.json();

      if (result.success && result.data) {
        const clienteData = result.data;

        const clienteId = clienteData._id || clienteData.id;

        const prestamosResponse = await fetch(`/api/prestamos?clienteId=${clienteId}`);
        const prestamosResult = await prestamosResponse.json();
        const prestamoCliente = prestamosResult.success && prestamosResult.data.length > 0
          ? prestamosResult.data[0]
          : null;

        return {
          id: clienteId,
          nombre: clienteData.nombre,
          apellido: clienteData.apellido,
          cedula: clienteData.cedula,
          telefono: clienteData.telefono,
          email: clienteData.email || '',
          direccion: clienteData.direccion || '',
          montoPrestamo: prestamoCliente?.montoPrestamo || 0,
          tasaInteres: prestamoCliente?.tasaInteres || 0,
          numeroCuotas: prestamoCliente?.numeroCuotas || 0,
          fechaPrestamo: prestamoCliente?.fechaPrestamo || new Date().toISOString().split('T')[0],
          fechaProximoPago: prestamoCliente?.fechaProximoPago || new Date().toISOString().split('T')[0],
          estado: prestamoCliente?.estado || 'pendiente',
          cuotasPagadas: prestamoCliente?.cuotasPagadas || 0,
          saldoPendiente: prestamoCliente?.saldoPendiente || 0,
          totalIntereses: prestamoCliente?.totalIntereses || 0,
          total4x1000: prestamoCliente?.total4x1000 || 0,
          cuotaMensual: prestamoCliente?.cuotaMensual || 0,
          capitalMensual: prestamoCliente?.capitalMensual || 0,
          interesMensual: prestamoCliente?.interesMensual || 0,
          valor4x1000Mensual: prestamoCliente?.valor4x1000Mensual || 0,
          interesesAcumulados: prestamoCliente?.interesesAcumulados || 0,
          observaciones: clienteData.observaciones || ''
        };
      }

      throw new Error('Cliente no encontrado');
    } catch (error: any) {
      console.error('❌ Error obteniendo cliente por ID:', error);
      throw error;
    }
  }

  // Obtener clientes por fecha de registro del préstamo
  static async obtenerClientesPorFechaRegistro(fechaInicio: string, fechaFin: string): Promise<Cliente[]> {
    try {
      const response = await fetch(`/api/clientes?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&filtro=fechaRegistro`);

      if (!response.ok) throw new Error('Error al filtrar por fecha de registro');

      const result = await response.json();

      if (result.success) {
        return result.data;
      }

      return [];
    } catch (error) {
      console.error('Error filtrando por fecha de registro:', error);
      return [];
    }
  }

  // Crear cliente y préstamo en un solo paso
  static async crearCliente(clienteData: any): Promise<Cliente> {
    try {
      console.log('📝 Creando cliente con datos:', clienteData);

      // Convertir fechas a formato YYYY-MM-DD sin problemas de zona horaria
      const fechaPrestamo = formatearFechaParaBackend(clienteData.fechaPrestamo);
      const fechaProximoPago = clienteData.fechaProximoPago ?
        formatearFechaParaBackend(clienteData.fechaProximoPago) :
        fechaPrestamo;

      console.log('📅 Fechas procesadas:', {
        fechaPrestamoOriginal: clienteData.fechaPrestamo,
        fechaPrestamoProcesada: fechaPrestamo,
        fechaProximoPagoOriginal: clienteData.fechaProximoPago,
        fechaProximoPagoProcesada: fechaProximoPago
      });

      const clienteResponse = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: clienteData.nombre,
          apellido: clienteData.apellido,
          cedula: clienteData.cedula,
          telefono: clienteData.telefono,
          email: clienteData.email || '',
          direccion: clienteData.direccion || '',
          observaciones: clienteData.observaciones || ''
        })
      });

      if (!clienteResponse.ok) {
        const errorData = await clienteResponse.json();
        throw new Error(errorData.error || 'Error al crear cliente');
      }

      const clienteResult = await clienteResponse.json();
      const nuevoCliente = clienteResult.data;

      console.log('✅ Cliente creado:', nuevoCliente);

      const montoPrestamo = parseFloat(clienteData.montoPrestamo);
      const tasaInteres = parseFloat(clienteData.tasaInteres);
      const numeroCuotas = parseInt(clienteData.numeroCuotas);

      const calculo = calcularPrestamoDetallado(montoPrestamo, tasaInteres, numeroCuotas);

      console.log('🧮 Cálculo del préstamo:', calculo);

      const prestamoData = {
        cliente: nuevoCliente._id,
        montoPrestamo: montoPrestamo,
        tasaInteres: tasaInteres,
        numeroCuotas: numeroCuotas,
        fechaPrestamo: fechaPrestamo,
        fechaProximoPago: fechaProximoPago,
        observaciones: 'Préstamo inicial'
      };

      console.log('📤 Enviando datos del préstamo:', prestamoData);

      const prestamoResponse = await fetch('/api/prestamos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prestamoData)
      });

      if (!prestamoResponse.ok) {
        const errorData = await prestamoResponse.json();
        console.error('❌ Error creando préstamo:', errorData);

        try {
          await fetch(`/api/clientes?id=${nuevoCliente._id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deleteAll: false })
          });
        } catch (e) {
          console.error('Error eliminando cliente fallido:', e);
        }

        throw new Error(errorData.error || 'Error al crear el prestamo');
      }

      const prestamoResult = await prestamoResponse.json();
      const nuevoPrestamo = prestamoResult.data;

      console.log('✅ Préstamo creado:', nuevoPrestamo);

      return {
        id: nuevoCliente._id,
        nombre: nuevoCliente.nombre,
        apellido: nuevoCliente.apellido,
        cedula: nuevoCliente.cedula,
        telefono: nuevoCliente.telefono,
        email: nuevoCliente.email,
        direccion: nuevoCliente.direccion,
        montoPrestamo: nuevoPrestamo.montoPrestamo,
        tasaInteres: nuevoPrestamo.tasaInteres,
        numeroCuotas: nuevoPrestamo.numeroCuotas,
        fechaPrestamo: nuevoPrestamo.fechaPrestamo,
        fechaProximoPago: nuevoPrestamo.fechaProximoPago,
        estado: nuevoPrestamo.estado,
        cuotasPagadas: nuevoPrestamo.cuotasPagadas || 0,
        saldoPendiente: nuevoPrestamo.saldoPendiente || calculo.totalPagar,
        totalIntereses: nuevoPrestamo.totalIntereses || calculo.totalIntereses,
        total4x1000: nuevoPrestamo.total4x1000 || calculo.total4x1000,
        cuotaMensual: nuevoPrestamo.cuotaMensual || calculo.cuotaMensual,
        capitalMensual: nuevoPrestamo.capitalMensual || calculo.capitalMensual,
        interesMensual: nuevoPrestamo.interesMensual || calculo.interesMensual,
        valor4x1000Mensual: nuevoPrestamo.valor4x1000Mensual || calculo.valor4x1000Mensual,
        interesesAcumulados: nuevoPrestamo.interesesAcumulados || 0,
        observaciones: nuevoCliente.observaciones || ''
      };

    } catch (error: any) {
      console.error('❌ Error creating cliente:', error);
      throw new Error(error.message || 'Error al crear cliente y préstamo');
    }
  }

  // Eliminar cliente COMPLETAMENTE
  static async eliminarCliente(id: string): Promise<void> {
    try {
      console.log('🗑️ Eliminando cliente:', id);

      const response = await fetch(`/api/clientes?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deleteAll: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar cliente');
      }

      const result = await response.json();
      console.log('✅ Eliminación exitosa:', result.message);

    } catch (error: any) {
      console.error('❌ Error eliminando cliente:', error);
      throw error;
    }
  }

  // Registrar pago
  static async registrarPago(pagoData: any): Promise<Pago> {
    try {
      console.log('💰 Registrando pago:', pagoData);

      const fechaPagoReal = pagoData.fechaPago ?
        formatearFechaParaBackend(pagoData.fechaPago) :
        new Date().toISOString().split('T')[0];

      console.log('📅 Fecha de pago a usar:', fechaPagoReal);

      const prestamosResponse = await fetch(`/api/prestamos?clienteId=${pagoData.clienteId}`);

      if (!prestamosResponse.ok) {
        const errorText = await prestamosResponse.text();
        console.error('❌ Error HTTP buscando préstamo:', {
          status: prestamosResponse.status,
          statusText: prestamosResponse.statusText,
          error: errorText
        });
        throw new Error(`Error ${prestamosResponse.status} al buscar préstamo`);
      }

      const prestamosResult = await prestamosResponse.json();
      console.log('📊 Resultado búsqueda préstamo:', {
        success: prestamosResult.success,
        count: prestamosResult.data?.length || 0
      });

      if (!prestamosResult.success) {
        throw new Error(prestamosResult.error || 'Error en la búsqueda de préstamo');
      }

      if (!prestamosResult.data || prestamosResult.data.length === 0) {
        throw new Error('No se encontró ningún préstamo para este cliente. Primero crea un préstamo.');
      }

      const prestamo = prestamosResult.data[0];
      const prestamoId = prestamo._id || prestamo.id;

      console.log('✅ Préstamo encontrado:', {
        id: prestamoId,
        monto: prestamo.montoPrestamo,
        saldo: prestamo.saldoPendiente,
        cuotas: prestamo.cuotasPagadas + '/' + prestamo.numeroCuotas,
        cuotaMensual: prestamo.cuotaMensual
      });

      const cuotaSugerida = prestamo.cuotasPagadas + 1;
      const montoSugerido = prestamo.cuotaMensual || prestamo.montoPrestamo / prestamo.numeroCuotas;

      const pagoRequest = {
        prestamoId: prestamoId,
        montoPagado: parseFloat(pagoData.montoPagado) || montoSugerido,
        cuotaNumero: parseInt(pagoData.cuotaNumero) || cuotaSugerida,
        fechaPago: fechaPagoReal,
        observaciones: pagoData.observaciones || `Pago cuota ${pagoData.cuotaNumero || cuotaSugerida}`
      };

      console.log('📤 Enviando pago a API:', pagoRequest);

      const response = await fetch('/api/pagos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(pagoRequest)
      });

      console.log('📡 Estado respuesta pago:', response.status);

      if (!response.ok) {
        let errorMessage = 'Error al registrar pago';
        try {
          const errorData = await response.json();
          console.error('❌ Error JSON:', errorData);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          const errorText = await response.text();
          console.error('❌ Error texto:', errorText);
          errorMessage = `${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Resultado pago:', {
        success: result.success,
        message: result.message
      });

      if (!result.success) {
        throw new Error(result.error || 'Error al registrar pago');
      }

      const nuevoPago = result.data.pago;
      const prestamoActualizado = result.data.prestamo;

      console.log('✅ Pago registrado exitosamente:', {
        id: nuevoPago._id,
        monto: nuevoPago.montoPagado,
        cuota: nuevoPago.cuotaNumero,
        fecha: nuevoPago.fechaPago,
        prestamoActualizado: prestamoActualizado ? 'Sí' : 'No'
      });

      return {
        id: nuevoPago._id || nuevoPago.id,
        clienteId: nuevoPago.cliente?._id || nuevoPago.cliente || pagoData.clienteId,
        fechaPago: nuevoPago.fechaPago,
        montoPagado: nuevoPago.montoPagado,
        cuotaNumero: nuevoPago.cuotaNumero,
        interesPagado: nuevoPago.interesPagado || 0,
        capitalPagado: nuevoPago.capitalPagado || 0,
        observaciones: nuevoPago.observaciones
      };

    } catch (error: any) {
      console.error('❌ Error completo en registrarPago:', {
        message: error.message,
        stack: error.stack,
        data: pagoData
      });

      let mensajeError = error.message;
      if (error.message.includes('No se encontró ningún préstamo')) {
        mensajeError = '❌ Este cliente no tiene préstamos registrados. Primero crea un préstamo.';
      } else if (error.message.includes('404') || error.message.includes('no encontrado')) {
        mensajeError = '❌ No se encontró el préstamo del cliente. Recarga la página e intenta nuevamente.';
      } else if (error.message.includes('400')) {
        mensajeError = '❌ Datos inválidos. Verifica el monto y número de cuota.';
      } else if (error.message.includes('500')) {
        mensajeError = '❌ Error del servidor. Intenta nuevamente en unos momentos.';
      }

      throw new Error(mensajeError);
    }
  }

  // Obtener pagos por cliente
  static async obtenerPagosPorCliente(clienteId: string): Promise<Pago[]> {
    try {
      console.log('🔍 Obteniendo pagos para cliente:', clienteId);

      const response = await fetch(`/api/pagos?clienteId=${clienteId}&limit=1000`);

      if (!response.ok) {
        console.warn('⚠️ No se pudieron obtener pagos para cliente:', clienteId);
        return [];
      }

      const result = await response.json();
      console.log('📊 Respuesta pagos:', {
        success: result.success,
        count: result.data?.length || 0,
        tieneDatos: !!result.data
      });

      if (result.success && result.data && result.data.length > 0) {
        console.log('✅ Primer pago recibido:', {
          id: result.data[0]._id,
          fechaPago: result.data[0].fechaPago,
          capitalPagado: result.data[0].capitalPagado,
          interesPagado: result.data[0].interesPagado,
          montoPagado: result.data[0].montoPagado,
          todasLasPropiedades: Object.keys(result.data[0])
        });

        const pagosOrdenados = result.data.sort((a: any, b: any) =>
          new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime()
        );

        const pagos = pagosOrdenados.map((pagoData: any) => {
          const fechaOriginal = pagoData.fechaPago;

          // Formatear fecha para visualización usando UTC
          const fechaObj = new Date(fechaOriginal);
          const year = fechaObj.getUTCFullYear();
          const month = String(fechaObj.getUTCMonth() + 1).padStart(2, '0');
          const day = String(fechaObj.getUTCDate()).padStart(2, '0');
          const hours = String(fechaObj.getUTCHours()).padStart(2, '0');
          const minutes = String(fechaObj.getUTCMinutes()).padStart(2, '0');

          return {
            id: pagoData._id || pagoData.id,
            clienteId: clienteId,
            fechaPago: fechaOriginal,
            fechaPagoFormateada: `${day}/${month}/${year} ${hours}:${minutes}`,
            montoPagado: pagoData.montoPagado,
            cuotaNumero: pagoData.cuotaNumero,
            interesPagado: pagoData.interesPagado || 0,
            capitalPagado: pagoData.capitalPagado || 0,
            tipoPago: this.determinarTipoPago(pagoData.observaciones),
            observaciones: pagoData.observaciones || ''
          };
        });

        console.log(`✅ ${pagos.length} pagos obtenidos para cliente ${clienteId}`);
        return pagos;
      }

      console.log('ℹ️ No hay pagos para el cliente:', clienteId);
      return [];

    } catch (error) {
      console.error('❌ Error obteniendo pagos:', error);
      return [];
    }
  }

  // Función para determinar el tipo de pago
  static determinarTipoPago(observaciones: string): string {
    if (!observaciones) return 'Pago regular';

    const obs = observaciones.toLowerCase();

    if (obs.includes('abono')) {
      if (obs.includes('solo') && obs.includes('intereses')) return 'Abono solo intereses';
      if (obs.includes('solo') && obs.includes('capital')) return 'Abono solo capital';
      if (obs.includes('intereses') && obs.includes('mora')) return 'Abono intereses mora';
      if (obs.includes('parcial')) return 'Abono parcial';
      return 'Abono';
    }

    if (obs.includes('mora') || obs.includes('acumulados')) return 'Pago mora';
    if (obs.includes('cuota')) return 'Pago cuota regular';

    return 'Pago regular';
  }

  // Marcar cliente en mora
  static async marcarEnMora(clienteId: string): Promise<void> {
    try {
      console.log('🚨 Marcando cliente en mora:', clienteId);

      const requestData = {
        action: 'marcar-mora',
        clienteId: clienteId,
        timestamp: new Date().toISOString()
      };

      const response = await fetch('/api/clientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al marcar en mora');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al marcar en mora');
      }

      console.log('✅ Cliente marcado en mora exitosamente');

    } catch (error: any) {
      console.error('❌ Error marcando en mora:', error);
      throw error;
    }
  }
}

// Componente principal
export default function SistemaPrestamosElegante() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalPagoOpen, setIsModalPagoOpen] = useState(false);
  const [isModalEditarOpen, setIsModalEditarOpen] = useState(false);
  const [isModalAbonoInteresesOpen, setIsModalAbonoInteresesOpen] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [isModalBusquedaFechaOpen, setIsModalBusquedaFechaOpen] = useState(false);
  const [fechaBusqueda, setFechaBusqueda] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    cedula: '',
    telefono: '',
    email: '',
    direccion: '',
    montoPrestamo: '',
    tasaInteres: '',
    numeroCuotas: '',
    fechaPrestamo: new Date().toISOString().split('T')[0],
    fechaProximoPago: new Date().toISOString().split('T')[0],
    observaciones: ''
  });
  const [formEditar, setFormEditar] = useState<any>({});
  const [formAbonoIntereses, setFormAbonoIntereses] = useState({
    montoAbono: '',
    tipo: 'interes',
    observaciones: '',
    fechaAbono: new Date().toISOString().split('T')[0]
  });
  const [calculoPreview, setCalculoPreview] = useState<ReturnType<typeof calcularPrestamoDetallado> | null>(null);
  const [formPago, setFormPago] = useState({
    montoPagado: '',
    cuotaNumero: '',
    fechaPago: new Date().toISOString().split('T')[0],
    observaciones: ''
  });
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pagos, setPagos] = useState<Record<string, Pago[]>>({});
  const [activeTab, setActiveTab] = useState('resumen');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFilter, setSearchFilter] = useState('todos');
  const [searchTermPrestamos, setSearchTermPrestamos] = useState('');
  const [searchFilterPrestamos, setSearchFilterPrestamos] = useState('todos');

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete' | 'mora' | null;
    clienteId: string | null;
    clienteNombre: string;
  }>({
    type: null,
    clienteId: null,
    clienteNombre: ''
  });

  // Estados para mostrar/ocultar historiales individuales
  const [historialesAbiertos, setHistorialesAbiertos] = useState<Record<string, boolean>>({});
  const [historialesCargando, setHistorialesCargando] = useState<Record<string, boolean>>({});

  // Estados para búsqueda por fecha
  const [clientesOriginalesCount, setClientesOriginalesCount] = useState<number>(0);
  const [clientesOriginales, setClientesOriginales] = useState<Cliente[]>([]);
  const [prestamosFiltradosPorFecha, setPrestamosFiltradosPorFecha] = useState<Cliente[]>([]);

  // Funciones de formateo actualizadas
  const formatearFecha = (fecha: string) => {
    try {
      // Si la fecha ya está en formato YYYY-MM-DD, usarla directamente
      if (fecha && fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = fecha.split('-');
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      }

      const fechaObj = new Date(fecha);

      // Usar UTC para evitar problemas de zona horaria
      const year = fechaObj.getUTCFullYear();
      const month = String(fechaObj.getUTCMonth() + 1).padStart(2, '0');
      const day = String(fechaObj.getUTCDate()).padStart(2, '0');

      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('❌ Error formateando fecha:', fecha, error);
      return 'Fecha inválida';
    }
  };

  const formatearFechaHora = (fecha: string) => {
    try {
      const fechaObj = new Date(fecha);

      // Usar UTC para consistencia
      const year = fechaObj.getUTCFullYear();
      const month = String(fechaObj.getUTCMonth() + 1).padStart(2, '0');
      const day = String(fechaObj.getUTCDate()).padStart(2, '0');
      const hours = String(fechaObj.getUTCHours()).padStart(2, '0');
      const minutes = String(fechaObj.getUTCMinutes()).padStart(2, '0');

      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
      console.error('❌ Error formateando fecha/hora:', fecha, error);
      return 'Fecha inválida';
    }
  };

  const formatearMoneda = (monto: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(monto);
  };

  // Cargar clientes al inicio (sin historiales)
  useEffect(() => {
    const cargarClientes = async () => {
      try {
        setLoading(true);
        console.log('📂 Cargando clientes...');

        const clientesData = await SistemaPrestamosService.obtenerClientes();
        setClientes(clientesData);
        setClientesOriginalesCount(clientesData.length);
        setClientesOriginales([...clientesData]);
        setPrestamosFiltradosPorFecha([]);

        console.log(`✅ Clientes cargados: ${clientesData.length}`);

      } catch (err: any) {
        mostrarError('❌ Error al cargar clientes: ' + err.message);
        console.error('Error cargando clientes:', err);
      } finally {
        setLoading(false);
      }
    };

    cargarClientes();
  }, []);

  // Función para cargar historial de UN cliente específico
  const cargarHistorialCliente = async (clienteId: string) => {
    try {
      setHistorialesCargando(prev => ({ ...prev, [clienteId]: true }));
      console.log(`📂 Cargando historial para cliente ${clienteId}...`);

      const pagosCliente = await SistemaPrestamosService.obtenerPagosPorCliente(clienteId);

      // Actualizar el estado de pagos solo para este cliente
      setPagos(prev => ({
        ...prev,
        [clienteId]: pagosCliente
      }));

      console.log(`✅ Historial cargado: ${pagosCliente.length} pagos para cliente ${clienteId}`);

      // Abrir el historial después de cargarlo
      setHistorialesAbiertos(prev => ({ ...prev, [clienteId]: true }));

    } catch (error) {
      console.error(`❌ Error cargando historial para ${clienteId}:`, error);
    } finally {
      setHistorialesCargando(prev => ({ ...prev, [clienteId]: false }));
    }
  };

  // Función para alternar visibilidad del historial
  const toggleHistorialCliente = async (clienteId: string) => {
    const estaAbierto = historialesAbiertos[clienteId];

    if (!estaAbierto && !pagos[clienteId]) {
      // Si no está abierto y no tenemos los datos, cargarlos
      await cargarHistorialCliente(clienteId);
    } else {
      // Solo alternar visibilidad
      setHistorialesAbiertos(prev => ({
        ...prev,
        [clienteId]: !estaAbierto
      }));
    }
  };

  const clientesFiltrados = useMemo(() => {
    let filtered = [...clientes];

    if (searchFilter !== 'todos') {
      filtered = filtered.filter(cliente => cliente.estado === searchFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(cliente =>
        cliente.nombre.toLowerCase().includes(term) ||
        cliente.apellido.toLowerCase().includes(term) ||
        cliente.cedula.includes(term) ||
        cliente.telefono.includes(term) ||
        cliente.email?.toLowerCase().includes(term) ||
        cliente.direccion?.toLowerCase().includes(term) ||
        `${cliente.nombre} ${cliente.apellido}`.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [clientes, searchTerm, searchFilter]);

  const prestamosFiltrados = useMemo(() => {
    let filtered = [...clientes];

    if (searchFilterPrestamos !== 'todos') {
      filtered = filtered.filter(cliente => cliente.estado === searchFilterPrestamos);
    }

    if (searchTermPrestamos.trim()) {
      const term = searchTermPrestamos.toLowerCase().trim();
      filtered = filtered.filter(cliente =>
        cliente.nombre.toLowerCase().includes(term) ||
        cliente.apellido.toLowerCase().includes(term) ||
        cliente.cedula.includes(term) ||
        cliente.telefono.includes(term) ||
        cliente.email?.toLowerCase().includes(term) ||
        cliente.direccion?.toLowerCase().includes(term) ||
        `${cliente.nombre} ${cliente.apellido}`.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [clientes, searchTermPrestamos, searchFilterPrestamos]);

  const calcularPreview = () => {
    if (formData.montoPrestamo && formData.tasaInteres && formData.numeroCuotas) {
      const monto = parseFloat(formData.montoPrestamo);
      const tasa = parseFloat(formData.tasaInteres);
      const cuotas = parseInt(formData.numeroCuotas);

      if (monto > 0 && tasa >= 0 && cuotas > 0) {
        const calculo = calcularPrestamoDetallado(monto, tasa, cuotas);
        setCalculoPreview(calculo);
      }
    } else {
      setCalculoPreview(null);
    }
  };

  useEffect(() => {
    calcularPreview();
  }, [formData.montoPrestamo, formData.tasaInteres, formData.numeroCuotas]);

  const mostrarError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  const mostrarExito = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Funciones para modales
  const abrirModalCliente = () => {
    setIsModalOpen(true);
    setFormData({
      nombre: '',
      apellido: '',
      cedula: '',
      telefono: '',
      email: '',
      direccion: '',
      montoPrestamo: '',
      tasaInteres: '',
      numeroCuotas: '',
      fechaPrestamo: new Date().toISOString().split('T')[0],
      fechaProximoPago: new Date().toISOString().split('T')[0],
      observaciones: ''
    });
    setCalculoPreview(null);
  };

  const cerrarModalCliente = () => setIsModalOpen(false);

  const abrirModalPago = async (cliente: Cliente) => {
    setClienteSeleccionado(cliente);

    const cuotaSugerida = cliente.cuotasPagadas + 1;
    const montoSugerido = cliente.cuotaMensual;

    setFormPago({
      montoPagado: montoSugerido.toFixed(0),
      cuotaNumero: cuotaSugerida.toString(),
      fechaPago: new Date().toISOString().split('T')[0],
      observaciones: `Pago cuota ${cuotaSugerida}`
    });

    // Cargar historial del cliente para el modal de pago
    if (!pagos[cliente.id]) {
      await cargarHistorialCliente(cliente.id);
    }

    setIsModalPagoOpen(true);
  };

  const cerrarModalPago = () => {
    setIsModalPagoOpen(false);
    setClienteSeleccionado(null);
  };

  const abrirModalEditar = (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    setFormEditar({
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      cedula: cliente.cedula,
      telefono: cliente.telefono,
      email: cliente.email || '',
      direccion: cliente.direccion || '',
      montoPrestamo: cliente.montoPrestamo.toString(),
      tasaInteres: cliente.tasaInteres.toString(),
      numeroCuotas: cliente.numeroCuotas.toString(),
      fechaProximoPago: cliente.fechaProximoPago || new Date().toISOString().split('T')[0],
      observaciones: cliente.observaciones || '',
      saldoPendiente: cliente.saldoPendiente.toString(),
      interesesAcumulados: cliente.interesesAcumulados?.toString() || '0'
    });
    setIsModalEditarOpen(true);
  };

  const cerrarModalEditar = () => {
    setIsModalEditarOpen(false);
    setClienteSeleccionado(null);
  };

  const abrirModalAbonoIntereses = async (cliente: Cliente) => {
    setClienteSeleccionado(cliente);

    // Cargar historial si no existe
    if (!pagos[cliente.id]) {
      await cargarHistorialCliente(cliente.id);
    }

    const interesesSugeridos = cliente.interesMensual || 0;
    const interesesAcumulados = cliente.interesesAcumulados || 0;

    let tipoPorDefecto = 'intereses_mensuales';
    let montoSugerido = interesesSugeridos;
    let observacionesPorDefecto = 'Pago de intereses mensuales';

    if (interesesAcumulados > 0) {
      tipoPorDefecto = 'intereses_acumulados';
      montoSugerido = interesesAcumulados;
      observacionesPorDefecto = 'Pago de intereses acumulados';
    }

    setFormAbonoIntereses({
      montoAbono: montoSugerido > 0 ? montoSugerido.toString() : '0',
      tipo: tipoPorDefecto,
      observaciones: observacionesPorDefecto,
      fechaAbono: new Date().toISOString().split('T')[0]
    });

    setIsModalAbonoInteresesOpen(true);
  };

  const cerrarModalAbonoIntereses = () => {
    setIsModalAbonoInteresesOpen(false);
    setClienteSeleccionado(null);
  };

  // Función de búsqueda por fecha de registro
  const buscarPorFechaRegistro = async () => {
    if (!fechaBusqueda) {
      mostrarError('❌ Selecciona una fecha para buscar');
      return;
    }

    try {
      setLoading(true);

      let todosClientes = [...clientesOriginales];
      if (todosClientes.length === 0) {
        todosClientes = await SistemaPrestamosService.obtenerClientes();
        setClientesOriginales(todosClientes);
        setClientesOriginalesCount(todosClientes.length);
      }

      // Formatear la fecha de búsqueda para comparación
      const fechaBuscarFormateada = formatearFechaParaBackend(fechaBusqueda);

      const prestamosEncontrados = todosClientes.filter(cliente => {
        const fechaPrestamoFormateada = formatearFechaParaBackend(cliente.fechaPrestamo);
        return fechaPrestamoFormateada === fechaBuscarFormateada;
      });

      if (prestamosEncontrados.length === 0) {
        mostrarExito(`No se encontraron préstamos registrados el ${formatearFecha(fechaBusqueda)}`);
        setClientes(todosClientes);
        setPrestamosFiltradosPorFecha([]);
      } else {
        setClientes(todosClientes);
        setPrestamosFiltradosPorFecha(prestamosEncontrados);

        const mensaje = `✅ Encontrados ${prestamosEncontrados.length} préstamo(s) registrado(s) el ${formatearFecha(fechaBusqueda)}`;
        mostrarExito(mensaje);

        console.log('📅 Préstamos encontrados:', {
          fecha: fechaBusqueda,
          cantidad: prestamosEncontrados.length,
          clientes: prestamosEncontrados.map(c => `${c.nombre} ${c.apellido} - ${c.fechaPrestamo}`)
        });
      }

      setIsModalBusquedaFechaOpen(false);

    } catch (error: any) {
      mostrarError('❌ Error al buscar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para limpiar búsqueda
  const limpiarBusquedaFecha = async () => {
    setFechaBusqueda('');
    setPrestamosFiltradosPorFecha([]);
    try {
      setLoading(true);
      const clientesData = await SistemaPrestamosService.obtenerClientes();
      setClientes(clientesData);
      setClientesOriginales([...clientesData]);
      setClientesOriginalesCount(clientesData.length);
      mostrarExito('✅ Mostrando todos los préstamos');
    } catch (error: any) {
      mostrarError('❌ Error al recargar clientes: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para verificar si un cliente tiene préstamo en la fecha buscada
  const clienteTienePrestamoEnFecha = (clienteId: string) => {
    return prestamosFiltradosPorFecha.some(prestamo => prestamo.id === clienteId);
  };

  // Función para obtener detalles del préstamo encontrado
  const obtenerDetallePrestamoEncontrado = (clienteId: string) => {
    const prestamoEncontrado = prestamosFiltradosPorFecha.find(p => p.id === clienteId);
    if (prestamoEncontrado) {
      return {
        fecha: prestamoEncontrado.fechaPrestamo,
        monto: prestamoEncontrado.montoPrestamo,
        cuotas: prestamoEncontrado.numeroCuotas,
        tasaInteres: prestamoEncontrado.tasaInteres,
        cuotaMensual: prestamoEncontrado.cuotaMensual
      };
    }
    return null;
  };

  const manejarCambioInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Si es un campo de fecha, asegurarnos de que se guarde en formato YYYY-MM-DD
    if (name === 'fechaPrestamo' || name === 'fechaProximoPago') {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const crearCliente = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      console.log('🚀 Creando nuevo cliente...');
      console.log('📅 DEBUG Fechas originales:', {
        fechaPrestamoInput: formData.fechaPrestamo,
        fechaProximoPagoInput: formData.fechaProximoPago
      });

      // Formatear fechas para backend
      const fechaPrestamoFormateada = formatearFechaParaBackend(formData.fechaPrestamo);
      const fechaProximoPagoFormateada = formatearFechaParaBackend(formData.fechaProximoPago);

      console.log('📅 DEBUG Fechas formateadas:', {
        fechaPrestamoFormateada,
        fechaProximoPagoFormateada
      });

      const nuevoCliente = await SistemaPrestamosService.crearCliente({
        nombre: formData.nombre,
        apellido: formData.apellido,
        cedula: formData.cedula,
        telefono: formData.telefono,
        email: formData.email,
        direccion: formData.direccion,
        montoPrestamo: parseFloat(formData.montoPrestamo),
        tasaInteres: parseFloat(formData.tasaInteres),
        numeroCuotas: parseInt(formData.numeroCuotas),
        fechaPrestamo: formData.fechaPrestamo,
        fechaProximoPago: formData.fechaProximoPago,
        observaciones: formData.observaciones
      });

      console.log('🎉 Nuevo cliente creado:', nuevoCliente);
      console.log('📅 Fechas recibidas del servidor:', {
        fechaPrestamo: nuevoCliente.fechaPrestamo,
        fechaProximoPago: nuevoCliente.fechaProximoPago
      });

      setClientes(prev => [nuevoCliente, ...prev]);
      setClientesOriginales(prev => [nuevoCliente, ...prev]);
      setClientesOriginalesCount(prev => prev + 1);

      mostrarExito('✅ Cliente y préstamo registrado exitosamente');
      cerrarModalCliente();

      setTimeout(async () => {
        try {
          const clientesActualizados = await SistemaPrestamosService.obtenerClientes();
          setClientes(clientesActualizados);
          setClientesOriginales([...clientesActualizados]);
          setClientesOriginalesCount(clientesActualizados.length);
        } catch (error) {
          console.error('Error recargando datos:', error);
        }
      }, 1000);

    } catch (err: any) {
      mostrarError('❌ ' + (err.message || 'Error al crear el cliente'));
      console.error('Error creando cliente:', err);
    } finally {
      setLoading(false);
    }
  };

  const editarCliente = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clienteSeleccionado) return;

    try {
      setLoading(true);
      setError(null);

      const monto = parseFloat(formEditar.montoPrestamo);
      const tasa = parseFloat(formEditar.tasaInteres);
      const cuotas = parseInt(formEditar.numeroCuotas);
      const cuotasPagadas = clienteSeleccionado.cuotasPagadas;

      // IMPORTANTE: Obtener la nueva fecha de próximo pago
      const fechaProximoPago = formEditar.fechaProximoPago || clienteSeleccionado.fechaProximoPago;

      // NOTA: El cálculo de la fecha de registro se hará en el backend
      // Solo enviamos la fecha de próximo pago

      // Recalcular el saldo pendiente basado en el nuevo préstamo
      const calculo = calcularPrestamoDetallado(monto, tasa, cuotas);
      const totalPagadoHastaAhora = cuotasPagadas * calculo.cuotaMensual;
      const saldoPendienteNuevo = Math.max(0, calculo.totalPagar - totalPagadoHastaAhora);

      const datosActualizados = {
        nombre: formEditar.nombre,
        apellido: formEditar.apellido,
        cedula: formEditar.cedula,
        telefono: formEditar.telefono,
        email: formEditar.email || '',
        direccion: formEditar.direccion || '',
        montoPrestamo: monto,
        tasaInteres: tasa,
        numeroCuotas: cuotas,
        fechaProximoPago: fechaProximoPago, // Solo enviamos esta fecha
        // NO enviamos fechaPrestamo, el backend la calculará
        observaciones: formEditar.observaciones || '',
        saldoPendiente: saldoPendienteNuevo,
        interesesAcumulados: parseFloat(formEditar.interesesAcumulados) || clienteSeleccionado.interesesAcumulados || 0
      };

      console.log('📊 Datos enviados para actualizar:', {
        ...datosActualizados,
        nota: 'Solo se envía fechaProximoPago, el backend calculará fechaPrestamo'
      });

      const clienteActualizado = await SistemaPrestamosService.editarCliente(
        clienteSeleccionado.id,
        datosActualizados
      );

      setClientes(prev =>
        prev.map(cliente =>
          cliente.id === clienteSeleccionado.id ? clienteActualizado : cliente
        )
      );

      setClientesOriginales(prev =>
        prev.map(cliente =>
          cliente.id === clienteSeleccionado.id ? clienteActualizado : cliente
        )
      );

      mostrarExito('✅ Cliente y préstamo actualizado exitosamente');
      cerrarModalEditar();

    } catch (err: any) {
      console.error('❌ Error detallado al editar cliente:', {
        message: err.message,
        stack: err.stack,
        datosFormulario: formEditar
      });

      let mensajeError = '❌ Error al editar cliente: ' + (err.message || 'Error desconocido');

      if (err.message.includes('No se encontró préstamo')) {
        mensajeError = '❌ No se encontró el préstamo asociado. Recarga la página e intenta nuevamente.';
      } else if (err.message.includes('Error al actualizar préstamo')) {
        mensajeError = '❌ Error al actualizar los datos del préstamo. Verifica los valores ingresados.';
      } else if (err.message.includes('Error al editar cliente')) {
        mensajeError = '❌ Error al actualizar los datos personales del cliente.';
      }

      mostrarError(mensajeError);
    } finally {
      setLoading(false);
    }
  };

  const registrarAbonoIntereses = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clienteSeleccionado) {
      mostrarError('❌ No hay cliente seleccionado');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const fechaAbonoReal = formAbonoIntereses.fechaAbono || new Date().toISOString().split('T')[0];

      console.log('📅 Fecha a usar:', fechaAbonoReal);

      const monto = parseFloat(formAbonoIntereses.montoAbono);
      if (!monto || monto <= 0) {
        mostrarError('❌ Ingresa un monto válido');
        setLoading(false);
        return;
      }

      // Tipo de abono basado en el monto
      let tipoAbono = formAbonoIntereses.tipo;
      let observaciones = formAbonoIntereses.observaciones;

      // Si el monto corresponde a intereses mensuales pero se seleccionó acumulado
      if (tipoAbono === 'intereses_acumulados' && Math.abs(monto - clienteSeleccionado.interesMensual) < 1) {
        tipoAbono = 'intereses_mensuales';
        observaciones = 'Pago de intereses mensuales';
      }

      const abonoData = {
        clienteId: clienteSeleccionado.id,
        montoAbono: monto.toString(),
        tipo: tipoAbono,
        observaciones: observaciones || '',
        fechaAbono: fechaAbonoReal
      };

      console.log('📤 Enviando abono:', abonoData);

      const response = await fetch('/api/abonos-intereses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(abonoData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al registrar abono');
      }

      if (!result.success) {
        throw new Error(result.error || 'Error en la respuesta del servidor');
      }

      // Recargar el historial del cliente
      await cargarHistorialCliente(clienteSeleccionado.id);

      const clienteActualizado = await SistemaPrestamosService.obtenerClientePorId(clienteSeleccionado.id);

      setClientes(prev =>
        prev.map(cliente =>
          cliente.id === clienteSeleccionado.id ? clienteActualizado : cliente
        )
      );

      setClientesOriginales(prev =>
        prev.map(cliente =>
          cliente.id === clienteSeleccionado.id ? clienteActualizado : cliente
        )
      );

      mostrarExito(`✅ Abono de intereses de ${formatearMoneda(monto)} registrado exitosamente`);

      cerrarModalAbonoIntereses();

    } catch (err: any) {
      console.error('❌ Error:', {
        message: err.message,
        datosFormulario: formAbonoIntereses
      });

      mostrarError('❌ ' + (err.message || 'Error al registrar abono'));
    } finally {
      setLoading(false);
    }
  };

  const registrarPago = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clienteSeleccionado) return;

    try {
      setLoading(true);
      setError(null);

      console.log('💰 Registrando pago para cliente:', {
        id: clienteSeleccionado.id,
        nombre: clienteSeleccionado.nombre + ' ' + clienteSeleccionado.apellido,
        cuotaMensual: clienteSeleccionado.cuotaMensual,
        cuotasPagadas: clienteSeleccionado.cuotasPagadas
      });

      const montoPagado = parseFloat(formPago.montoPagado) || clienteSeleccionado.cuotaMensual;
      const cuotaNumero = parseInt(formPago.cuotaNumero) || (clienteSeleccionado.cuotasPagadas + 1);

      if (!montoPagado || montoPagado <= 0) {
        mostrarError('❌ Ingresa un monto válido para el pago');
        setLoading(false);
        return;
      }

      if (cuotaNumero > clienteSeleccionado.numeroCuotas) {
        mostrarError(`❌ Número de cuota inválido. Máximo: ${clienteSeleccionado.numeroCuotas}`);
        setLoading(false);
        return;
      }

      console.log('📋 Datos del pago a enviar:', {
        clienteId: clienteSeleccionado.id,
        montoPagado,
        cuotaNumero,
        fechaPago: formPago.fechaPago,
        observaciones: formPago.observaciones
      });

      const nuevoPago = await SistemaPrestamosService.registrarPago({
        clienteId: clienteSeleccionado.id,
        montoPagado: montoPagado,
        cuotaNumero: cuotaNumero,
        fechaPago: formPago.fechaPago,
        observaciones: formPago.observaciones
      });

      console.log('✅ Pago registrado exitosamente:', nuevoPago);

      const clienteActualizado = await SistemaPrestamosService.obtenerClientePorId(clienteSeleccionado.id);

      setClientes(prev =>
        prev.map(cliente =>
          cliente.id === clienteSeleccionado.id ? clienteActualizado : cliente
        )
      );

      setClientesOriginales(prev =>
        prev.map(cliente =>
          cliente.id === clienteSeleccionado.id ? clienteActualizado : cliente
        )
      );

      // Actualizar el historial local
      if (pagos[clienteSeleccionado.id]) {
        setPagos(prev => ({
          ...prev,
          [clienteSeleccionado.id]: [nuevoPago, ...(prev[clienteSeleccionado.id] || [])]
        }));
      }

      mostrarExito(`✅ Pago de ${formatearMoneda(montoPagado)} registrado exitosamente (Cuota ${cuotaNumero})`);

      cerrarModalPago();

    } catch (err: any) {
      console.error('❌ Error registrando pago:', {
        message: err.message,
        stack: err.stack
      });

      mostrarError(err.message || 'Error al registrar el pago');
    } finally {
      setLoading(false);
    }
  };

  const solicitarEliminacionCliente = (cliente: Cliente) => {
    setConfirmAction({
      type: 'delete',
      clienteId: cliente.id,
      clienteNombre: `${cliente.nombre} ${cliente.apellido}`
    });
    setShowConfirmModal(true);
  };

  const solicitarMarcarMora = (cliente: Cliente) => {
    setConfirmAction({
      type: 'mora',
      clienteId: cliente.id,
      clienteNombre: `${cliente.nombre} ${cliente.apellido}`
    });
    setShowConfirmModal(true);
  };

  const eliminarCliente = async (clienteId: string) => {
    try {
      setLoading(true);
      console.log('🗑️ Eliminando cliente:', clienteId);

      await SistemaPrestamosService.eliminarCliente(clienteId);

      setClientes(prev => prev.filter(cliente => cliente.id !== clienteId));
      setClientesOriginales(prev => prev.filter(cliente => cliente.id !== clienteId));
      setClientesOriginalesCount(prev => prev - 1);

      // Limpiar pagos del cliente eliminado
      setPagos(prev => {
        const { [clienteId]: _, ...rest } = prev;
        return rest;
      });

      // Limpiar estados de historial
      setHistorialesAbiertos(prev => {
        const { [clienteId]: _, ...rest } = prev;
        return rest;
      });

      setHistorialesCargando(prev => {
        const { [clienteId]: _, ...rest } = prev;
        return rest;
      });

      setPrestamosFiltradosPorFecha(prev => prev.filter(prestamo => prestamo.id !== clienteId));

      mostrarExito('✅ Cliente eliminado exitosamente');

    } catch (err: any) {
      console.error('❌ Error al eliminar:', err);
      mostrarError('❌ ' + (err.message || 'Error al eliminar el cliente'));
      setLoading(false);
    }
  };

  const marcarEnMora = async (clienteId: string) => {
    try {
      setLoading(true);
      console.log(`🔄 Marcando cliente ${clienteId} en mora...`);

      await SistemaPrestamosService.marcarEnMora(clienteId);

      setClientes(prev =>
        prev.map(cliente =>
          cliente.id === clienteId ? { ...cliente, estado: 'mora' } : cliente
        )
      );

      setClientesOriginales(prev =>
        prev.map(cliente =>
          cliente.id === clienteId ? { ...cliente, estado: 'mora' } : cliente
        )
      );

      setPrestamosFiltradosPorFecha(prev =>
        prev.map(cliente =>
          cliente.id === clienteId ? { ...cliente, estado: 'mora' } : cliente
        )
      );

      mostrarExito('✅ Cliente marcado en mora correctamente');

    } catch (err: any) {
      console.error('❌ Error detallado marcando en mora:', err);

      let mensajeError = err.message || 'Error al marcar en mora';

      if (err.message.includes('404')) {
        mensajeError = '❌ Cliente no encontrado. Por favor, recarga la página.';
      } else if (err.message.includes('500')) {
        mensajeError = '❌ Error del servidor. Intenta nuevamente.';
      } else if (err.message.includes('JSON')) {
        mensajeError = '❌ Error en la respuesta del servidor. Verifica que la API esté funcionando.';
      }

      mostrarError(mensajeError);
    } finally {
      setLoading(false);
    }
  };

  const manejarConfirmacion = async (confirmado: boolean) => {
    if (!confirmado) {
      setShowConfirmModal(false);
      setConfirmAction({
        type: null,
        clienteId: null,
        clienteNombre: ''
      });
      return;
    }

    setLoading(true);

    try {
      if (confirmAction.type === 'delete' && confirmAction.clienteId) {
        await eliminarCliente(confirmAction.clienteId);
      } else if (confirmAction.type === 'mora' && confirmAction.clienteId) {
        await marcarEnMora(confirmAction.clienteId);
      }

    } catch (err: any) {
      console.error('❌ Error en acción confirmada:', err);
      mostrarError('❌ ' + (err.message || 'Error al procesar la acción'));
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
      setConfirmAction({
        type: null,
        clienteId: null,
        clienteNombre: ''
      });
    }
  };

  const resumenTotal = clientes.reduce((acc, cliente) => {
    return {
      totalPrestado: acc.totalPrestado + cliente.montoPrestamo,
      totalPorCobrar: acc.totalPorCobrar + cliente.saldoPendiente,
      totalIntereses: acc.totalIntereses + cliente.totalIntereses,
      total4x1000: acc.total4x1000 + cliente.total4x1000,
      clientesPendientes: acc.clientesPendientes + (cliente.estado === 'pendiente' ? 1 : 0),
      clientesPagados: acc.clientesPagados + (cliente.estado === 'pagado' ? 1 : 0),
      clientesMora: acc.clientesMora + (cliente.estado === 'mora' ? 1 : 0),
    };
  }, {
    totalPrestado: 0,
    totalPorCobrar: 0,
    totalIntereses: 0,
    total4x1000: 0,
    clientesPendientes: 0,
    clientesPagados: 0,
    clientesMora: 0
  });

  return (
    <div className="sistema-prestamos">

      {/* Header */}
      <header className="sectionTop">
        <div className="logo-container">
          <div className="logo-icon">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="#1a1a1a" />
              <text x="20" y="28" textAnchor="middle" fill="#ffffff" fontFamily="Arial, sans-serif" fontSize="24" fontWeight="bold">
                $
              </text>
            </svg>
          </div>
          <div>
            <h1>Sistema de Préstamos</h1>
            <p>Gestión simplificada de créditos</p>
          </div>
        </div>

        {/* Botón para buscar por fecha de registro */}
        <div className="busqueda-fecha-container">
          <button
            className="btn-buscar-fecha"
            onClick={() => setIsModalBusquedaFechaOpen(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            Buscar por fecha de préstamo
          </button>

          {fechaBusqueda && (
            <button
              className="btn-limpiar-busqueda"
              onClick={limpiarBusquedaFecha}
              disabled={loading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
              Limpiar búsqueda
            </button>
          )}
        </div>

        <nav className="optionsMain">
          {['resumen', 'clientes', 'prestamos'].map((tab) => (
            <h2
              key={tab}
              className={activeTab === tab ? 'active' : ''}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </h2>
          ))}
          <button
            onClick={abrirModalCliente}
            disabled={loading}
          >
            <span>+</span>
            <span>Nuevo Cliente</span>
          </button>
        </nav>
      </header>

      {/* Indicador de búsqueda activa */}
      {fechaBusqueda && (
        <div className="indicador-busqueda-activa">
          <div className="indicador-content">
            <div className="indicador-icono">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <div className="indicador-texto">
              <strong>Búsqueda activa:</strong> Mostrando préstamos registrados el {formatearFecha(fechaBusqueda)}
              <span className="indicador-contador">
                ({prestamosFiltradosPorFecha.length} préstamo(s) encontrado(s))
              </span>
            </div>
            <button
              className="indicador-cerrar"
              onClick={limpiarBusquedaFecha}
              disabled={loading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Mensajes */}
      {successMessage && (
        <div className="success-message">
          <div className="icon-container">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <span>{successMessage}</span>
        </div>
      )}
      {error && (
        <div className="error-message">
          <div className="icon-container">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Procesando...</p>
        </div>
      )}

      {/* Modal de Confirmación */}
      {showConfirmModal && (
        <div className="modalOverlay">
          <div className="modalContent confirm-modal">
            <div className="modalHeader">
              <h2>
                {confirmAction.type === 'delete'
                  ? '¿Eliminar Cliente?'
                  : '¿Marcar en Mora?'}
              </h2>
              <button
                className="closeButton"
                onClick={() => manejarConfirmacion(false)}
                disabled={loading}
              >
                ×
              </button>
            </div>
            <div className="modalBody">
              <div className="confirm-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {confirmAction.type === 'delete' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.694-.833-2.464 0L4.146 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  )}
                </svg>
              </div>

              <div className="confirm-message">
                <p>
                  {confirmAction.type === 'delete'
                    ? `¿Estás seguro de que quieres eliminar a ${confirmAction.clienteNombre}?`
                    : `¿Marcar a ${confirmAction.clienteNombre} como en mora?`
                  }
                </p>

                <p className="confirm-details">
                  {confirmAction.type === 'delete'
                    ? 'Esta acción no se puede deshacer.'
                    : 'Esta acción cambiará el estado del cliente y sus préstamos pendientes a "mora".'
                  }
                </p>
              </div>

              <div className="confirm-actions">
                <button
                  className="cancel-btn"
                  onClick={() => manejarConfirmacion(false)}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  className={confirmAction.type === 'delete' ? 'delete-confirm-btn' : 'mora-confirm-btn'}
                  onClick={() => manejarConfirmacion(true)}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="spinner"></div>
                      <span>PROCESANDO...</span>
                    </>
                  ) : (
                    confirmAction.type === 'delete' ? 'ELIMINAR' : 'MARCAR EN MORA'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenido Principal */}
      <main>
        {/* Resumen */}
        {activeTab === 'resumen' && (
          <div className="sectionResumen">
            <div className="resumenStats">
              <div className="statCard">
                <div className="stat-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h3>Total Prestado</h3>
                <h1>{formatearMoneda(resumenTotal.totalPrestado)}</h1>
              </div>

              <div className="statCard">
                <div className="stat-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h3>Por Cobrar</h3>
                <h1>{formatearMoneda(resumenTotal.totalPorCobrar)}</h1>
              </div>

              <div className="statCard">
                <div className="stat-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                  </svg>
                </div>
                <h3>Clientes Pendientes</h3>
                <h1>{resumenTotal.clientesPendientes}</h1>
              </div>

              <div className="statCard">
                <div className="stat-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                  </svg>
                </div>
                <h3>Intereses Totales</h3>
                <h1>{formatearMoneda(resumenTotal.totalIntereses)}</h1>
              </div>

              <div className="statCard">
                <div className="stat-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                </div>
                <h3>4x1000 Total</h3>
                <h1>{formatearMoneda(resumenTotal.total4x1000)}</h1>
              </div>

              <div className="statCard">
                <div className="stat-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h3>Préstamos Pagados</h3>
                <h1>{resumenTotal.clientesPagados}</h1>
              </div>
            </div>

            {/* Préstamos Pendientes */}
            <div className="listaPrestamosActivos">
              <div className="headerConBusqueda">
                <div>
                  <h2>Préstamos Pendientes</h2>
                  <div className="contador-activos">
                    {clientes.filter(c => c.estado === 'pendiente').length} pendientes
                    {fechaBusqueda && prestamosFiltradosPorFecha.length > 0 && (
                      <span className="contador-filtro">
                        ({prestamosFiltradosPorFecha.length} con préstamo en {formatearFecha(fechaBusqueda)})
                      </span>
                    )}
                  </div>
                </div>

                <div className="searchContainer">
                  <div className="searchBar">
                    <div className="searchIcon">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar préstamos pendientes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="searchInput"
                    />
                    {searchTerm && (
                      <button
                        className="clearSearch"
                        onClick={() => setSearchTerm('')}
                      >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                    )}
                  </div>

                  <div className="filterContainer">
                    <div className="filterLabel">Filtrar:</div>
                    <div className="filterButtons">
                      {[
                        { value: 'todos', label: 'Todos', count: clientes.length },
                        { value: 'pendiente', label: 'Pendientes', count: clientes.filter(c => c.estado === 'pendiente').length },
                        { value: 'pagado', label: 'Pagados', count: clientes.filter(c => c.estado === 'pagado').length },
                        { value: 'mora', label: 'En Mora', count: clientes.filter(c => c.estado === 'mora').length }
                      ].map(filter => (
                        <button
                          key={filter.value}
                          className={`filterButton ${searchFilter === filter.value ? 'active' : ''}`}
                          onClick={() => setSearchFilter(filter.value)}
                        >
                          {filter.label}
                          <span className="filterCount">{filter.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {fechaBusqueda && prestamosFiltradosPorFecha.length > 0 && (
                <div className="info-filtro-fecha">
                  <div className="icono-info-filtro">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <p>
                    <strong>Filtro activo:</strong> Mostrando todos los clientes.
                    <span className="clientes-destacados">
                      {prestamosFiltradosPorFecha.length} cliente(s) tienen préstamos registrados el {formatearFecha(fechaBusqueda)}
                    </span>
                  </p>
                </div>
              )}

              {searchTerm && (
                <div className="searchResultsInfo">
                  <p>
                    Mostrando {clientesFiltrados.filter(c => c.estado === 'pendiente').length} préstamo(s) pendiente(s)
                    {searchTerm && ` para "${searchTerm}"`}
                  </p>
                </div>
              )}

              {clientesFiltrados.filter(c =>
                searchFilter === 'todos' ? c.estado === 'pendiente' : c.estado === searchFilter
              ).length > 0 ? (
                <div className="prestamos-lista">
                  {clientesFiltrados.filter(c =>
                    searchFilter === 'todos' ? c.estado === 'pendiente' : c.estado === searchFilter
                  ).map(cliente => {
                    const tienePrestamoEnFecha = clienteTienePrestamoEnFecha(cliente.id);
                    const detallePrestamo = obtenerDetallePrestamoEncontrado(cliente.id);

                    return (
                      <div
                        key={cliente.id}
                        className={`prestamoCard ${tienePrestamoEnFecha ? 'destacado-filtro' : ''}`}
                      >
                        {tienePrestamoEnFecha && (
                          <div className="badge-filtro-fecha">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            Préstamo registrado el {formatearFecha(fechaBusqueda)}
                          </div>
                        )}

                        <div className="prestamoInfo">
                          <div className="prestamoHeader">
                            <div className={`icono-cliente ${tienePrestamoEnFecha ? 'icono-destacado' : ''}`}>
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                              </svg>
                            </div>
                            <div>
                              <h3>{cliente.nombre} {cliente.apellido}</h3>
                              <div className="clienteIdentificacion">
                                <span className="cedula">
                                  <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 a2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path>
                                  </svg>
                                  {cliente.cedula}
                                </span>
                                <span className="telefono">
                                  <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                                  </svg>
                                  {cliente.telefono}
                                </span>
                              </div>
                              <div className="proximo-pago">
                                <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                </svg>
                                Próximo pago: {formatearFecha(cliente.fechaProximoPago)}
                              </div>
                              {tienePrestamoEnFecha && detallePrestamo && (
                                <div className="info-prestamo-fecha">
                                  <span className="monto-prestamo-filtro">
                                    <strong>Préstamo encontrado:</strong> {formatearMoneda(detallePrestamo.monto)} - {detallePrestamo.cuotas} cuotas
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="prestamoDetalles">
                            <span>
                              <strong>Cuota Mensual:</strong> {formatearMoneda(cliente.cuotaMensual)}
                            </span>
                            <span>
                              <strong>Cuotas:</strong> {cliente.cuotasPagadas}/{cliente.numeroCuotas}
                            </span>
                            <span>
                              <strong>Saldo:</strong> {formatearMoneda(cliente.saldoPendiente)}
                            </span>
                            <span>
                              <strong>Intereses Acum:</strong> {formatearMoneda(cliente.interesesAcumulados)}
                            </span>
                          </div>
                        </div>

                        <div className="prestamoAcciones">
                          <button
                            onClick={() => abrirModalPago(cliente)}
                            className="btn-pago"
                          >
                            Registrar Pago
                          </button>
                          <button
                            onClick={() => abrirModalAbonoIntereses(cliente)}
                            className="btn-abono"
                          >
                            Abonar Intereses
                          </button>
                          {cliente.estado === 'pendiente' && (
                            <button
                              onClick={() => solicitarMarcarMora(cliente)}
                              className="btn-mora"
                            >
                              Marcar en Mora
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="noResults">
                  <div className="noResultsIcon">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <h3>No se encontraron resultados</h3>
                  <p>
                    {searchFilter === 'todos'
                      ? 'No hay préstamos pendientes'
                      : `No hay préstamos con estado "${searchFilter}"`
                    }
                    {searchTerm && ` que coincidan con "${searchTerm}"`}
                  </p>
                  {(searchTerm || searchFilter !== 'todos') && (
                    <button
                      className="clearSearchButton"
                      onClick={() => {
                        setSearchTerm('');
                        setSearchFilter('todos');
                      }}
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Clientes */}
        {activeTab === 'clientes' && (
          <div className="sectionClientes">
            <div className="listaClientes">
              <div className="headerConBusqueda">
                <div>
                  <h2>Lista de Clientes</h2>
                  <div className="contador-clientes">
                    {clientesFiltrados.length} de {clientes.length} clientes
                    {fechaBusqueda && prestamosFiltradosPorFecha.length > 0 && (
                      <span className="contador-filtro">
                        ({prestamosFiltradosPorFecha.length} con préstamo en {formatearFecha(fechaBusqueda)})
                      </span>
                    )}
                  </div>
                </div>

                <div className="searchContainer">
                  <div className="searchBar">
                    <div className="searchIcon">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar por nombre, cédula, teléfono, email, dirección..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="searchInput"
                    />
                    {searchTerm && (
                      <button
                        className="clearSearch"
                        onClick={() => setSearchTerm('')}
                      >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                    )}
                  </div>

                  <div className="filterContainer">
                    <div className="filterLabel">Filtrar por:</div>
                    <div className="filterButtons">
                      {[
                        { value: 'todos', label: 'Todos', count: clientes.length },
                        { value: 'pendiente', label: 'Pendientes', count: clientes.filter(c => c.estado === 'pendiente').length },
                        { value: 'pagado', label: 'Pagados', count: clientes.filter(c => c.estado === 'pagado').length },
                        { value: 'mora', label: 'En Mora', count: clientes.filter(c => c.estado === 'mora').length }
                      ].map(filter => (
                        <button
                          key={filter.value}
                          className={`filterButton ${searchFilter === filter.value ? 'active' : ''}`}
                          onClick={() => setSearchFilter(filter.value)}
                        >
                          {filter.label}
                          <span className="filterCount">{filter.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {fechaBusqueda && prestamosFiltradosPorFecha.length > 0 && (
                <div className="info-filtro-fecha">
                  <div className="icono-info-filtro">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <p>
                    <strong>Filtro activo:</strong> Mostrando todos los clientes.
                    <span className="clientes-destacados">
                      {prestamosFiltradosPorFecha.length} cliente(s) tienen préstamos registrados el {formatearFecha(fechaBusqueda)}
                    </span>
                  </p>
                </div>
              )}

              {searchTerm && clientesFiltrados.length > 0 && (
                <div className="searchResultsInfo">
                  <p>
                    Mostrando {clientesFiltrados.length} resultado{clientesFiltrados.length !== 1 ? 's' : ''} para "<strong>{searchTerm}</strong>"
                  </p>
                </div>
              )}

              {searchTerm && clientesFiltrados.length === 0 ? (
                <div className="noResults">
                  <div className="noResultsIcon">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <h3>No se encontraron resultados</h3>
                  <p>No hay clientes que coincidan con "<strong>{searchTerm}</strong>"</p>
                  <button
                    className="clearSearchButton"
                    onClick={() => setSearchTerm('')}
                  >
                    Limpiar búsqueda
                  </button>
                </div>
              ) : clientesFiltrados.length > 0 ? (
                <div className="clientes-lista">
                  {clientesFiltrados.map(cliente => {
                    const pagosCliente = pagos[cliente.id] || [];
                    const tienePrestamoEnFecha = clienteTienePrestamoEnFecha(cliente.id);
                    const detallePrestamo = obtenerDetallePrestamoEncontrado(cliente.id);
                    const historialAbierto = historialesAbiertos[cliente.id] || false;
                    const historialCargando = historialesCargando[cliente.id] || false;

                    return (
                      <div
                        key={cliente.id}
                        className={`clienteCard ${tienePrestamoEnFecha ? 'destacado-filtro' : ''}`}
                      >
                        {tienePrestamoEnFecha && (
                          <div className="badge-filtro-fecha">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            Préstamo registrado el {formatearFecha(fechaBusqueda)}
                          </div>
                        )}

                        <div className="clienteInfo">
                          <div className="clienteHeader">
                            <div className={`icono-estado ${cliente.estado} ${tienePrestamoEnFecha ? 'icono-destacado' : ''}`}>
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                              </svg>
                            </div>
                            <div className="clienteInfoHeader">
                              <div className="clienteTitulo">
                                <h3>{cliente.nombre} {cliente.apellido}</h3>
                                <div className="clienteIdentificacion">
                                  <span className="cedula">
                                    <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 a2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path>
                                    </svg>
                                    {cliente.cedula}
                                  </span>
                                  <span className="telefono">
                                    <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                                    </svg>
                                    {cliente.telefono}
                                  </span>
                                  <span className="proximo-pago">
                                    <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                    </svg>
                                    {formatearFecha(cliente.fechaProximoPago)}
                                  </span>
                                </div>
                                {tienePrestamoEnFecha && detallePrestamo && (
                                  <div className="info-prestamo-fecha">
                                    <span className="monto-prestamo-filtro">
                                      <strong>Préstamo encontrado:</strong> {formatearMoneda(detallePrestamo.monto)} - {detallePrestamo.tasaInteres}% interés - {detallePrestamo.cuotas} cuotas
                                    </span>
                                  </div>
                                )}
                              </div>
                              <span className={`estadoBadge estado-${cliente.estado}`}>
                                {cliente.estado === 'pendiente' ? 'Pendiente' :
                                  cliente.estado === 'pagado' ? 'Pagado' :
                                    'En Mora'}
                              </span>
                            </div>
                          </div>

                          <div className="clienteDetalles">
                            <div className="detalleItem">
                              <label>Email</label>
                              <span>{cliente.email || 'No registrado'}</span>
                            </div>
                            <div className="detalleItem">
                              <label>Dirección</label>
                              <span>{cliente.direccion || 'No registrada'}</span>
                            </div>
                            <div className="detalleItem">
                              <label>Monto Prestado</label>
                              <span>{formatearMoneda(cliente.montoPrestamo)}</span>
                            </div>
                            <div className="detalleItem">
                              <label>Cuota Mensual</label>
                              <span>{formatearMoneda(cliente.cuotaMensual)}</span>
                            </div>
                            <div className="detalleItem">
                              <label>Cuotas</label>
                              <span>{cliente.cuotasPagadas} de {cliente.numeroCuotas}</span>
                            </div>
                            <div className="detalleItem">
                              <label>Saldo Pendiente</label>
                              <span>{formatearMoneda(cliente.saldoPendiente)}</span>
                            </div>
                            <div className="detalleItem">
                              <label>Intereses Acumulados</label>
                              <span>{formatearMoneda(cliente.interesesAcumulados)}</span>
                            </div>
                            {cliente.observaciones && (
                              <div className="detalleItem full-width">
                                <label>Observaciones</label>
                                <span className="observaciones-text">{cliente.observaciones}</span>
                              </div>
                            )}
                          </div>

                          {/* BOTÓN PARA MOSTRAR/OCULTAR HISTORIAL */}
                          <div className="historialCliente">
                            <div className="historialHeader">
                              <button
                                onClick={() => toggleHistorialCliente(cliente.id)}
                                className="toggleHistorial"
                                disabled={historialCargando}
                              >
                                <svg
                                  className={`icon-arrow ${historialAbierto ? 'rotate' : ''}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                                <span>
                                  {historialCargando ? 'Cargando...' :
                                    historialAbierto ? 'Ocultar Historial de Pagos' :
                                      pagosCliente.length > 0 ? `Ver Historial (${pagosCliente.length} pagos)` : 'Ver Historial de Pagos'}
                                </span>
                              </button>
                            </div>

                            {/* CONTENIDO DEL HISTORIAL (solo se muestra si está abierto) */}
                            {historialAbierto && (
                              <div className="historialContenido">
                                {pagosCliente.length > 0 ? (
                                  <div className="tablaHistorialCompleta">
                                    <table>
                                      <thead>
                                        <tr>
                                          <th>Cuota</th>
                                          <th>Fecha Real</th>
                                          <th>Capital</th>
                                          <th>Interés</th>
                                          <th>Total</th>
                                          <th>Tipo</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {pagosCliente
                                          .sort((a, b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime())
                                          .map((pago) => (
                                            <tr key={pago.id}>
                                              <td><strong>#{pago.cuotaNumero}</strong></td>
                                              <td>
                                                <div className="fecha-pago-detalle">
                                                  <div className="fecha-principal">
                                                    {formatearFecha(pago.fechaPago)}
                                                  </div>
                                                  <div className="hora-pago">
                                                    <small>
                                                      {new Date(pago.fechaPago).toLocaleTimeString('es-ES', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        hour12: false
                                                      })}
                                                    </small>
                                                  </div>
                                                </div>
                                              </td>
                                              <td>{formatearMoneda(pago.capitalPagado)}</td>
                                              <td>{formatearMoneda(pago.interesPagado)}</td>
                                              <td>
                                                <strong className="text-success">
                                                  {formatearMoneda(pago.montoPagado)}
                                                </strong>
                                              </td>
                                              <td>
                                                <span className="badgeEstado">
                                                  {SistemaPrestamosService.determinarTipoPago(pago.observaciones || '')}
                                                </span>
                                              </td>
                                            </tr>
                                          ))}
                                      </tbody>
                                      <tfoot>
                                        <tr>
                                          <td colSpan={3} className="text-right">
                                            <strong>Total pagado:</strong>
                                          </td>
                                          <td colSpan={2}>
                                            <strong className="text-success">
                                              {formatearMoneda(pagosCliente.reduce((sum, pago) => sum + pago.montoPagado, 0))}
                                            </strong>
                                          </td>
                                          <td>
                                            <span className="badgeResumen">
                                              {pagosCliente.length} {pagosCliente.length === 1 ? 'pago' : 'pagos'}
                                            </span>
                                          </td>
                                        </tr>
                                      </tfoot>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="sinHistorial">
                                    <div className="iconoHistorial">
                                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                      </svg>
                                    </div>
                                    <p>No hay pagos registrados</p>
                                    <button
                                      onClick={() => cargarHistorialCliente(cliente.id)}
                                      className="btn-pago-detalle"
                                    >
                                      Cargar historial
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="clienteAcciones">
                          <button
                            onClick={() => abrirModalPago(cliente)}
                            disabled={cliente.estado === 'pagado'}
                            className="btn-pago"
                          >
                            Registrar Pago
                          </button>
                          <button
                            onClick={() => abrirModalEditar(cliente)}
                            className="btn-editar"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => abrirModalAbonoIntereses(cliente)}
                            className="btn-abono"
                          >
                            Abonar Intereses
                          </button>
                          {cliente.estado === 'pendiente' && (
                            <button
                              onClick={() => solicitarMarcarMora(cliente)}
                              className="btn-mora"
                            >
                              Marcar en Mora
                            </button>
                          )}
                          <button
                            onClick={() => solicitarEliminacionCliente(cliente)}
                            className="delete-btn"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="noResults">
                  <div className="noResultsIcon">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <h3>No se encontraron resultados</h3>
                  <p>No hay clientes registrados</p>
                  <button
                    className="clearSearchButton"
                    onClick={() => setSearchTerm('')}
                  >
                    Limpiar búsqueda
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Préstamos */}
        {activeTab === 'prestamos' && (
          <div className="sectionPrestamos">
            <div className="detallesPrestamos">
              <div className="headerConBusqueda">
                <div>
                  <h2>Detalles de Préstamos</h2>
                  <div className="contador-prestamos">
                    {prestamosFiltrados.length} de {clientes.length} préstamos
                    {fechaBusqueda && prestamosFiltradosPorFecha.length > 0 && (
                      <span className="contador-filtro">
                        ({prestamosFiltradosPorFecha.length} con préstamo en {formatearFecha(fechaBusqueda)})
                      </span>
                    )}
                  </div>
                </div>

                <div className="searchContainer">
                  <div className="searchBar">
                    <div className="searchIcon">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar préstamos..."
                      value={searchTermPrestamos}
                      onChange={(e) => setSearchTermPrestamos(e.target.value)}
                      className="searchInput"
                    />
                    {searchTermPrestamos && (
                      <button
                        className="clearSearch"
                        onClick={() => setSearchTermPrestamos('')}
                      >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                    )}
                  </div>

                  <div className="filterContainer">
                    <div className="filterLabel">Filtrar:</div>
                    <div className="filterButtons">
                      {[
                        { value: 'todos', label: 'Todos', count: clientes.length },
                        { value: 'pendiente', label: 'Pendientes', count: clientes.filter(c => c.estado === 'pendiente').length },
                        { value: 'pagado', label: 'Pagados', count: clientes.filter(c => c.estado === 'pagado').length },
                        { value: 'mora', label: 'En Mora', count: clientes.filter(c => c.estado === 'mora').length }
                      ].map(filter => (
                        <button
                          key={filter.value}
                          className={`filterButton ${searchFilterPrestamos === filter.value ? 'active' : ''}`}
                          onClick={() => setSearchFilterPrestamos(filter.value)}
                        >
                          {filter.label}
                          <span className="filterCount">{filter.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {fechaBusqueda && prestamosFiltradosPorFecha.length > 0 && (
                <div className="info-filtro-fecha">
                  <div className="icono-info-filtro">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <p>
                    <strong>Filtro activo:</strong> Mostrando todos los clientes.
                    <span className="clientes-destacados">
                      {prestamosFiltradosPorFecha.length} cliente(s) tienen préstamos registrados el {formatearFecha(fechaBusqueda)}
                    </span>
                  </p>
                </div>
              )}

              {searchTermPrestamos && prestamosFiltrados.length > 0 && (
                <div className="searchResultsInfo">
                  <p>
                    Mostrando {prestamosFiltrados.length} resultado{prestamosFiltrados.length !== 1 ? 's' : ''} para "<strong>{searchTermPrestamos}</strong>"
                  </p>
                </div>
              )}

              {searchTermPrestamos && prestamosFiltrados.length === 0 ? (
                <div className="noResults">
                  <div className="noResultsIcon">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <h3>No se encontraron resultados</h3>
                  <p>No hay préstamos que coincidan con "<strong>{searchTermPrestamos}</strong>"</p>
                  <button
                    className="clearSearchButton"
                    onClick={() => setSearchTermPrestamos('')}
                  >
                    Limpiar búsqueda
                  </button>
                </div>
              ) : prestamosFiltrados.length > 0 ? (
                <div className="prestamos-detalles-lista">
                  {prestamosFiltrados.map(cliente => {
                    const progreso = (cliente.cuotasPagadas / cliente.numeroCuotas) * 100;
                    const pagosCliente = pagos[cliente.id] || [];
                    const tienePrestamoEnFecha = clienteTienePrestamoEnFecha(cliente.id);
                    const detallePrestamo = obtenerDetallePrestamoEncontrado(cliente.id);
                    const historialAbierto = historialesAbiertos[cliente.id] || false;
                    const historialCargando = historialesCargando[cliente.id] || false;

                    return (
                      <div
                        key={cliente.id}
                        className={`prestamoDetalleCard ${tienePrestamoEnFecha ? 'destacado-filtro' : ''}`}
                      >
                        {tienePrestamoEnFecha && (
                          <div className="badge-filtro-fecha">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            Préstamo registrado el {formatearFecha(fechaBusqueda)}
                          </div>
                        )}

                        <div className="prestamoHeader">
                          <div className="prestamoTitulo">
                            <div className={`icono-prestamo ${cliente.estado} ${tienePrestamoEnFecha ? 'icono-destacado' : ''}`}>
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                              </svg>
                            </div>
                            <div className="prestamoInfoHeader">
                              <div>
                                <h3>{cliente.nombre} {cliente.apellido}</h3>
                                <div className="clienteIdentificacion">
                                  <span className="cedula">
                                    <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 a2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path>
                                    </svg>
                                    {cliente.cedula}
                                  </span>
                                  <span className="telefono">
                                    <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                                    </svg>
                                    {cliente.telefono}
                                  </span>
                                </div>
                              </div>
                              <div className="prestamoSubtitulo">
                                <span className={`estadoBadge estado-${cliente.estado}`}>
                                  {cliente.estado === 'pendiente' ? 'Pendiente' :
                                    cliente.estado === 'pagado' ? 'Pagado' :
                                      'En Mora'}
                                </span>
                                <span className="fechaPrestamo">
                                  Próximo pago: {formatearFecha(cliente.fechaProximoPago)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="accionesPrestamo">
                            <button
                              onClick={() => abrirModalPago(cliente)}
                              disabled={cliente.estado === 'pagado'}
                              className="btn-pago-detalle"
                            >
                              Registrar Pago
                            </button>
                            <button
                              onClick={() => abrirModalAbonoIntereses(cliente)}
                              className="btn-abono"
                            >
                              Abonar Intereses
                            </button>
                            <button
                              onClick={() => abrirModalEditar(cliente)}
                              className="btn-editar"
                            >
                              Editar
                            </button>
                          </div>
                        </div>

                        <div className="infoContacto">
                          <div className="infoItem">
                            <label>Email:</label>
                            <span>{cliente.email || 'No registrado'}</span>
                          </div>
                          <div className="infoItem">
                            <label>Dirección:</label>
                            <span>{cliente.direccion || 'No registrada'}</span>
                          </div>
                          {tienePrestamoEnFecha && detallePrestamo && (
                            <div className="infoItem full-width destacado">
                              <label>Préstamo encontrado:</label>
                              <span className="detalle-prestamo-filtro">
                                <strong>{formatearMoneda(detallePrestamo.monto)}</strong> -
                                {detallePrestamo.tasaInteres}% interés -
                                {detallePrestamo.cuotas} cuotas -
                                Cuota: {formatearMoneda(detallePrestamo.cuotaMensual)}
                              </span>
                            </div>
                          )}
                          {cliente.observaciones && (
                            <div className="infoItem full-width">
                              <label>Observaciones:</label>
                              <span className="observaciones-text">{cliente.observaciones}</span>
                            </div>
                          )}
                        </div>

                        <div className="seccionDesglose">
                          <h4>Desglose del Préstamo</h4>

                          <div className="gridDesglose">
                            <div className="columnaDesglose">
                              <h5>PAGOS MENSUALES</h5>
                              <div className="listaDesglose">
                                <div className="itemDesglose">
                                  <div className="etiqueta">Capital</div>
                                  <div className="valor">{formatearMoneda(cliente.capitalMensual)}</div>
                                </div>
                                <div className="itemDesglose">
                                  <div className="etiqueta">Interés ({cliente.tasaInteres}%)</div>
                                  <div className="valor">{formatearMoneda(cliente.interesMensual)}</div>
                                </div>
                                <div className="itemDesglose">
                                  <div className="etiqueta">4x1000</div>
                                  <div className="valor">{formatearMoneda(cliente.valor4x1000Mensual)}</div>
                                </div>
                                <div className="itemDesglose total">
                                  <div className="etiqueta">CUOTA TOTAL</div>
                                  <div className="valor">{formatearMoneda(cliente.cuotaMensual)}</div>
                                </div>
                            </div>
                            </div>

                            <div className="columnaDesglose">
                              <h5>TOTAL DEL PRÉSTAMO</h5>
                              <div className="listaDesglose">
                                <div className="itemDesglose">
                                  <div className="etiqueta">Monto Prestado</div>
                                  <div className="valor">{formatearMoneda(cliente.montoPrestamo)}</div>
                                </div>
                                <div className="itemDesglose">
                                  <div className="etiqueta">Total Intereses</div>
                                  <div className="valor">{formatearMoneda(cliente.totalIntereses)}</div>
                                </div>
                                <div className="itemDesglose">
                                  <div className="etiqueta">Total 4x1000</div>
                                  <div className="valor">{formatearMoneda(cliente.total4x1000)}</div>
                                </div>
                                <div className="itemDesglose">
                                  <div className="etiqueta">Intereses Acumulados</div>
                                  <div className="valor">{formatearMoneda(cliente.interesesAcumulados)}</div>
                                </div>
                                <div className="itemDesglose total">
                                  <div className="etiqueta">TOTAL A PAGAR</div>
                                  <div className="valor">{formatearMoneda(cliente.montoPrestamo + cliente.totalIntereses + cliente.total4x1000)}</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="resumenEstado">
                            <div className="itemResumen">
                              <p className="etiqueta">CUOTAS</p>
                              <p className="valor">{cliente.cuotasPagadas} / {cliente.numeroCuotas}</p>
                            </div>
                            <div className="itemResumen">
                              <p className="etiqueta">SALDO PENDIENTE</p>
                              <p className="valor">{formatearMoneda(cliente.saldoPendiente)}</p>
                            </div>
                            <div className="itemResumen">
                              <p className="etiqueta">PROGRESO</p>
                              <p className="valor progreso">{progreso.toFixed(0)}%</p>
                            </div>
                          </div>
                        </div>

                        <div className="progresoCuotas">
                          <div className="progresoInfo">
                            <span>Progreso de pagos</span>
                            <span>{cliente.cuotasPagadas} de {cliente.numeroCuotas} cuotas</span>
                          </div>
                          <div className="progresoBarra">
                            <div
                              className="progresoCompletado"
                              style={{ width: `${progreso}%` }}
                            ></div>
                          </div>
                          <div className="progresoMarcadores">
                            <span>0%</span>
                            <span>25%</span>
                            <span>50%</span>
                            <span>75%</span>
                            <span>100%</span>
                          </div>
                        </div>

                        {/* HISTORIAL DE PAGOS - CON BOTÓN DESPLEGABLE */}
                        <div className="seccionHistorial">
                          <div className="historialHeader">
                            <button
                              onClick={() => toggleHistorialCliente(cliente.id)}
                              className="toggleHistorial"
                              disabled={historialCargando}
                            >
                              <svg
                                className={`icon-arrow ${historialAbierto ? 'rotate' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                              </svg>
                              <span>
                                {historialCargando ? 'Cargando...' :
                                  historialAbierto ? 'Ocultar Historial de Pagos' :
                                    pagosCliente.length > 0 ? `Ver Historial (${pagosCliente.length} pagos)` : 'Ver Historial de Pagos'}
                              </span>
                            </button>
                          </div>

                          {/* CONTENIDO DEL HISTORIAL (solo se muestra si está abierto) */}
                          {historialAbierto && (
                            <div className="historialContenido">
                              {pagosCliente.length > 0 ? (
                                <div className="tablaHistorialCompleta">
                                  <table>
                                    <thead>
                                      <tr>
                                        <th>Cuota</th>
                                        <th>Fecha Real</th>
                                        <th>Capital</th>
                                        <th>Interés</th>
                                        <th>Total</th>
                                        <th>Tipo</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {pagosCliente
                                        .sort((a, b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime())
                                        .map((pago) => (
                                          <tr key={pago.id}>
                                            <td><strong>#{pago.cuotaNumero}</strong></td>
                                            <td>
                                              <div className="fecha-pago-detalle">
                                                <div className="fecha-principal">
                                                  {formatearFecha(pago.fechaPago)}
                                                </div>
                                                <div className="hora-pago">
                                                  <small>
                                                    {new Date(pago.fechaPago).toLocaleTimeString('es-ES', {
                                                      hour: '2-digit',
                                                      minute: '2-digit',
                                                      hour12: false
                                                    })}
                                                  </small>
                                                </div>
                                              </div>
                                            </td>
                                            <td>{formatearMoneda(pago.capitalPagado)}</td>
                                            <td>{formatearMoneda(pago.interesPagado)}</td>
                                            <td>
                                              <strong className="text-success">
                                                {formatearMoneda(pago.montoPagado)}
                                              </strong>
                                            </td>
                                            <td>
                                              <span className="badgeEstado">
                                                {SistemaPrestamosService.determinarTipoPago(pago.observaciones || '')}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                      <tr>
                                        <td colSpan={3} className="text-right">
                                          <strong>Total pagado:</strong>
                                        </td>
                                        <td colSpan={2}>
                                          <strong className="text-success">
                                            {formatearMoneda(pagosCliente.reduce((sum, pago) => sum + pago.montoPagado, 0))}
                                          </strong>
                                        </td>
                                        <td>
                                          <span className="badgeResumen">
                                            {pagosCliente.length} {pagosCliente.length === 1 ? 'pago' : 'pagos'}
                                          </span>
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              ) : (
                                <div className="sinHistorial">
                                  <div className="iconoHistorial">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                  </div>
                                  <p>No hay pagos registrados</p>
                                  <button
                                    onClick={() => cargarHistorialCliente(cliente.id)}
                                    className="btn-pago-detalle"
                                  >
                                    Cargar historial
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="noResults">
                  <div className="noResultsIcon">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <h3>No se encontraron resultados</h3>
                  <p>No hay préstamos registrados</p>
                  <button
                    className="clearSearchButton"
                    onClick={() => setSearchTermPrestamos('')}
                  >
                    Limpiar búsqueda
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal Nuevo Cliente */}
      {isModalOpen && (
        <div className="modalOverlay">
          <div className="modalContent">
            <div className="modalHeader">
              <h2>Nuevo Cliente y Préstamo</h2>
              <button
                className="closeButton"
                onClick={cerrarModalCliente}
                disabled={loading}
              >
                ×
              </button>
            </div>
            <div className="modalBody">
              <form onSubmit={crearCliente} className="clienteForm">
                <div className="seccionFormulario">
                  <h3>Datos Personales</h3>
                  <div className="formRow">
                    <div className="formGroup">
                      <input
                        type="text"
                        name="nombre"
                        value={formData.nombre}
                        onChange={manejarCambioInput}
                        placeholder="Nombre"
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="formGroup">
                      <input
                        type="text"
                        name="apellido"
                        value={formData.apellido}
                        onChange={manejarCambioInput}
                        placeholder="Apellido"
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="formGroup">
                      <input
                        type="text"
                        name="cedula"
                        value={formData.cedula}
                        onChange={manejarCambioInput}
                        placeholder="Cédula"
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="formGroup">
                      <input
                        type="tel"
                        name="telefono"
                        value={formData.telefono}
                        onChange={manejarCambioInput}
                        placeholder="Teléfono"
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="formGroup">
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={manejarCambioInput}
                        placeholder="Email (opcional)"
                        disabled={loading}
                      />
                    </div>
                    <div className="formGroup">
                      <input
                        type="text"
                        name="direccion"
                        value={formData.direccion}
                        onChange={manejarCambioInput}
                        placeholder="Dirección (opcional)"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="formGroup">
                    <label>Observaciones</label>
                    <textarea
                      name="observaciones"
                      value={formData.observaciones}
                      onChange={manejarCambioInput}
                      placeholder="Observaciones adicionales..."
                      rows={2}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="seccionFormulario">
                  <h3>Datos del Préstamo</h3>
                  <div className="formRow">
                    <div className="formGroup">
                      <input
                        type="number"
                        name="montoPrestamo"
                        value={formData.montoPrestamo}
                        onChange={manejarCambioInput}
                        placeholder="Monto del Préstamo"
                        min="1"
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="formGroup">
                      <input
                        type="number"
                        name="tasaInteres"
                        value={formData.tasaInteres}
                        onChange={manejarCambioInput}
                        placeholder="Tasa de Interés %"
                        step="0.1"
                        min="0"
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="formGroup">
                      <input
                        type="number"
                        name="numeroCuotas"
                        value={formData.numeroCuotas}
                        onChange={manejarCambioInput}
                        placeholder="Número de Cuotas"
                        min="1"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="formRow">
                    <div className="formGroup">
                      <label>Fecha del Préstamo</label>
                      <input
                        type="date"
                        name="fechaPrestamo"
                        value={formData.fechaPrestamo}
                        onChange={manejarCambioInput}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="formGroup">
                      <label>Próxima fecha de pago</label>
                      <input
                        type="date"
                        name="fechaProximoPago"
                        value={formData.fechaProximoPago}
                        onChange={manejarCambioInput}
                        placeholder="Próximo pago"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {calculoPreview && (
                    <div className="previewCalculo">
                      <h4>Cálculo del Préstamo</h4>

                      <div className="gridCalculo">
                        <div className="columnaCalculo">
                          <h5>PAGOS MENSUALES</h5>
                          <div className="listaCalculo">
                            <div className="itemCalculo">
                              <span>Capital</span>
                              <span>{formatearMoneda(calculoPreview.capitalMensual)}</span>
                            </div>
                            <div className="itemCalculo">
                              <span>Interés</span>
                              <span>{formatearMoneda(calculoPreview.interesMensual)}</span>
                            </div>
                            <div className="itemCalculo">
                              <span>4x1000</span>
                              <span>{formatearMoneda(calculoPreview.valor4x1000Mensual)}</span>
                            </div>
                            <div className="itemCalculo total">
                              <span>CUOTA TOTAL</span>
                              <span>{formatearMoneda(calculoPreview.cuotaMensual)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="columnaCalculo">
                          <h5>TOTAL DEL PRÉSTAMO</h5>
                          <div className="listaCalculo">
                            <div className="itemCalculo">
                              <span>Monto Prestado</span>
                              <span>{formatearMoneda(parseFloat(formData.montoPrestamo))}</span>
                            </div>
                            <div className="itemCalculo">
                              <span>Total Intereses</span>
                              <span>{formatearMoneda(calculoPreview.totalIntereses)}</span>
                            </div>
                            <div className="itemCalculo">
                              <span>Total 4x1000</span>
                              <span>{formatearMoneda(calculoPreview.total4x1000)}</span>
                            </div>
                            <div className="itemCalculo total">
                              <span>TOTAL A PAGAR</span>
                              <span>{formatearMoneda(calculoPreview.totalPagar)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="saveButton"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="spinner"></div>
                      <span>REGISTRANDO CLIENTE...</span>
                    </>
                  ) : (
                    'REGISTRAR CLIENTE Y PRÉSTAMO'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar Pago */}
      {isModalPagoOpen && clienteSeleccionado && (
        <div className="modalOverlay">
          <div className="modalContent">
            <div className="modalHeader">
              <h2>
                Registrar Pago - {clienteSeleccionado.nombre} {clienteSeleccionado.apellido}
              </h2>
              <p>Cuota {clienteSeleccionado.cuotasPagadas + 1} de {clienteSeleccionado.numeroCuotas}</p>
              <button
                className="closeButton"
                onClick={cerrarModalPago}
                disabled={loading}
              >
                ×
              </button>
            </div>
            <div className="modalBody">
              <div className="infoCliente">
                <div className="infoRow">
                  <span>Monto Prestado:</span>
                  <strong>{formatearMoneda(clienteSeleccionado.montoPrestamo)}</strong>
                </div>
                <div className="infoRow">
                  <span>Saldo Pendiente:</span>
                  <strong>{formatearMoneda(clienteSeleccionado.saldoPendiente)}</strong>
                </div>
                <div className="infoRow">
                  <span>Cuotas Pagadas:</span>
                  <strong>{clienteSeleccionado.cuotasPagadas} / {clienteSeleccionado.numeroCuotas}</strong>
                </div>
                <div className="infoRow">
                  <span>Cuota Mensual:</span>
                  <strong>{formatearMoneda(clienteSeleccionado.cuotaMensual)}</strong>
                </div>
                <div className="infoRow">
                  <span>Intereses Acumulados:</span>
                  <strong>{formatearMoneda(clienteSeleccionado.interesesAcumulados)}</strong>
                </div>
              </div>

              <form onSubmit={registrarPago} className="pagoForm">
                <div className="formRow">
                  <div className="formGroup">
                    <label>Número de Cuota</label>
                    <input
                      type="number"
                      name="cuotaNumero"
                      value={formPago.cuotaNumero}
                      onChange={(e) => setFormPago(prev => ({ ...prev, cuotaNumero: e.target.value }))}
                      min="1"
                      max={clienteSeleccionado.numeroCuotas}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="formGroup">
                    <label>Monto a Pagar</label>
                    <input
                      type="number"
                      name="montoPagado"
                      value={formPago.montoPagado}
                      onChange={(e) => setFormPago(prev => ({ ...prev, montoPagado: e.target.value }))}
                      min="1"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="formRow">
                  <div className="formGroup">
                    <label>Fecha del Pago</label>
                    <input
                      type="date"
                      name="fechaPago"
                      value={formPago.fechaPago}
                      onChange={(e) => setFormPago(prev => ({ ...prev, fechaPago: e.target.value }))}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="formGroup">
                  <label>Observaciones</label>
                  <textarea
                    value={formPago.observaciones}
                    onChange={(e) => setFormPago(prev => ({ ...prev, observaciones: e.target.value }))}
                    placeholder="Descripción del pago..."
                    rows={2}
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  className="saveButton"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="spinner"></div>
                      <span>REGISTRANDO PAGO...</span>
                    </>
                  ) : (
                    `REGISTRAR PAGO DE ${formatearMoneda(parseFloat(formPago.montoPagado) || 0)}`
                  )}
                </button>
              </form>

              <div className="historialPagos">
                <h3>Historial de Pagos</h3>
                <div className="listaPagos">
                  {pagos[clienteSeleccionado.id]?.length > 0 ? (
                    <div className="tablaPagosModal">
                      <table>
                        <thead>
                          <tr>
                            <th>Cuota</th>
                            <th>Fecha Real</th>
                            <th>Capital</th>
                            <th>Interés</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagos[clienteSeleccionado.id]
                            .sort((a, b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime())
                            .slice(0, 5)
                            .map((pago) => (
                              <tr key={pago.id}>
                                <td><strong>#{pago.cuotaNumero}</strong></td>
                                <td>{formatearFechaHora(pago.fechaPago)}</td>
                                <td>{formatearMoneda(pago.capitalPagado)}</td>
                                <td>{formatearMoneda(pago.interesPagado)}</td>
                                <td><strong className="text-success">{formatearMoneda(pago.montoPagado)}</strong></td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="sinPagosModal">
                      <div className="icono">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      </div>
                      <p>No hay pagos registrados</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de búsqueda por fecha */}
      {isModalBusquedaFechaOpen && (
        <div className="modalOverlay">
          <div className="modalContent modal-busqueda-fecha">
            <div className="modalHeader">
              <h2>Buscar préstamos por fecha de registro</h2>
              <button
                className="closeButton"
                onClick={() => setIsModalBusquedaFechaOpen(false)}
                disabled={loading}
              >
                ×
              </button>
            </div>
            <div className="modalBody">
              <div className="busqueda-fecha-form">
                <div className="info-busqueda">
                  <div className="icono-info">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <p>Busca todos los préstamos que fueron registrados en una fecha específica.</p>
                </div>

                <div className="formGroup">
                  <label>Fecha de registro del préstamo:</label>
                  <input
                    type="date"
                    value={fechaBusqueda}
                    onChange={(e) => setFechaBusqueda(e.target.value)}
                    className="input-fecha-busqueda"
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="acciones-busqueda">
                  <button
                    onClick={() => setIsModalBusquedaFechaOpen(false)}
                    className="cancel-btn"
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={buscarPorFechaRegistro}
                    disabled={!fechaBusqueda || loading}
                    className="search-btn"
                  >
                    {loading ? (
                      <>
                        <div className="spinner mini"></div>
                        <span>Buscando...</span>
                      </>
                    ) : (
                      'Buscar préstamos'
                    )}
                  </button>
                </div>

                {fechaBusqueda && (
                  <div className="preview-busqueda">
                    <p>
                      <strong>Vas a buscar:</strong> Préstamos registrados el {formatearFecha(fechaBusqueda)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Cliente - ACTUALIZADO CORRECTAMENTE */}
      {isModalEditarOpen && clienteSeleccionado && (
        <div className="modalOverlay">
          <div className="modalContent">
            <div className="modalHeader">
              <h2>Editar Cliente: {clienteSeleccionado.nombre} {clienteSeleccionado.apellido}</h2>
              <button
                className="closeButton"
                onClick={cerrarModalEditar}
                disabled={loading}
              >
                ×
              </button>
            </div>
            <div className="modalBody">
              <form onSubmit={editarCliente} className="clienteForm">
                <div className="seccionFormulario">
                  <h3>Datos Personales</h3>
                  <div className="formRow">
                    <div className="formGroup">
                      <label>Nombre</label>
                      <input
                        type="text"
                        name="nombre"
                        value={formEditar.nombre}
                        onChange={(e) => setFormEditar({ ...formEditar, nombre: e.target.value })}
                        placeholder="Nombre"
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="formGroup">
                      <label>Apellido</label>
                      <input
                        type="text"
                        name="apellido"
                        value={formEditar.apellido}
                        onChange={(e) => setFormEditar({ ...formEditar, apellido: e.target.value })}
                        placeholder="Apellido"
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="formGroup">
                      <label>Cédula</label>
                      <input
                        type="text"
                        name="cedula"
                        value={formEditar.cedula}
                        onChange={(e) => setFormEditar({ ...formEditar, cedula: e.target.value })}
                        placeholder="Cédula"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="formRow">
                    <div className="formGroup">
                      <label>Teléfono</label>
                      <input
                        type="tel"
                        name="telefono"
                        value={formEditar.telefono}
                        onChange={(e) => setFormEditar({ ...formEditar, telefono: e.target.value })}
                        placeholder="Teléfono"
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="formGroup">
                      <label>Email</label>
                      <input
                        type="email"
                        name="email"
                        value={formEditar.email}
                        onChange={(e) => setFormEditar({ ...formEditar, email: e.target.value })}
                        placeholder="Email"
                        disabled={loading}
                      />
                    </div>
                    <div className="formGroup">
                      <label>Dirección</label>
                      <input
                        type="text"
                        name="direccion"
                        value={formEditar.direccion}
                        onChange={(e) => setFormEditar({ ...formEditar, direccion: e.target.value })}
                        placeholder="Dirección"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="formGroup">
                    <label>Observaciones</label>
                    <textarea
                      name="observaciones"
                      value={formEditar.observaciones}
                      onChange={(e) => setFormEditar({ ...formEditar, observaciones: e.target.value })}
                      placeholder="Observaciones adicionales..."
                      rows={2}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="seccionFormulario">
                  <h3>Datos del Préstamo</h3>
                  <div className="formRow">
                    <div className="formGroup">
                      <label>Monto del Préstamo *</label>
                      <input
                        type="number"
                        name="montoPrestamo"
                        value={formEditar.montoPrestamo}
                        onChange={(e) => {
                          const nuevoMonto = e.target.value;
                          setFormEditar({ ...formEditar, montoPrestamo: nuevoMonto });
                        }}
                        min="1"
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="formGroup">
                      <label>Tasa de Interés % *</label>
                      <input
                        type="number"
                        name="tasaInteres"
                        value={formEditar.tasaInteres}
                        onChange={(e) => {
                          const nuevaTasa = e.target.value;
                          setFormEditar({ ...formEditar, tasaInteres: nuevaTasa });
                        }}
                        step="0.1"
                        min="0"
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="formGroup">
                      <label>Número de Cuotas *</label>
                      <input
                        type="number"
                        name="numeroCuotas"
                        value={formEditar.numeroCuotas}
                        onChange={(e) => {
                          const nuevasCuotas = e.target.value;
                          setFormEditar({ ...formEditar, numeroCuotas: nuevasCuotas });
                        }}
                        min="1"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="formRow">
                    <div className="formGroup">
                      <label>Fecha del Próximo Pago *</label>
                      <input
                        type="date"
                        name="fechaProximoPago"
                        value={formEditar.fechaProximoPago}
                        onChange={(e) => {
                          const nuevaFecha = e.target.value;
                          setFormEditar({
                            ...formEditar,
                            fechaProximoPago: nuevaFecha
                          });
                        }}
                        required
                        disabled={loading}
                      />
                      <small className="help-text">
                        Nota: La fecha de registro del préstamo se calculará como un mes antes de esta fecha
                      </small>
                    </div>
                    
                    <div className="formGroup">
                      <label>Saldo Pendiente (calculado automáticamente)</label>
                      <input
                        type="text"
                        name="saldoPendiente"
                        value={
                          (() => {
                            try {
                              const monto = parseFloat(formEditar.montoPrestamo) || clienteSeleccionado.montoPrestamo;
                              const tasa = parseFloat(formEditar.tasaInteres) || clienteSeleccionado.tasaInteres;
                              const cuotas = parseInt(formEditar.numeroCuotas) || clienteSeleccionado.numeroCuotas;
                              const cuotasPagadas = clienteSeleccionado.cuotasPagadas;

                              if (monto > 0 && tasa >= 0 && cuotas > 0) {
                                const calculo = calcularPrestamoDetallado(monto, tasa, cuotas);
                                const totalPagadoHastaAhora = cuotasPagadas * calculo.cuotaMensual;
                                const saldoPendienteNuevo = Math.max(0, calculo.totalPagar - totalPagadoHastaAhora);
                                return formatearMoneda(saldoPendienteNuevo);
                              }
                              return formatearMoneda(clienteSeleccionado.saldoPendiente);
                            } catch {
                              return formatearMoneda(clienteSeleccionado.saldoPendiente);
                            }
                          })()
                        }
                        readOnly
                        className="readonly-input"
                        disabled={loading}
                      />
                      <small className="help-text">
                        El saldo se recalcula automáticamente basado en el nuevo monto, tasa y cuotas.
                      </small>
                    </div>
                  </div>

                  <div className="formRow">
                    <div className="formGroup">
                      <label>Intereses Acumulados</label>
                      <input
                        type="number"
                        name="interesesAcumulados"
                        value={formEditar.interesesAcumulados}
                        onChange={(e) => setFormEditar({ ...formEditar, interesesAcumulados: e.target.value })}
                        min="0"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Mostrar cálculo de la nueva cuota mensual */}
                  {(formEditar.montoPrestamo !== clienteSeleccionado.montoPrestamo?.toString() ||
                    formEditar.tasaInteres !== clienteSeleccionado.tasaInteres?.toString() ||
                    formEditar.numeroCuotas !== clienteSeleccionado.numeroCuotas?.toString() ||
                    formEditar.fechaProximoPago !== clienteSeleccionado.fechaProximoPago) && (
                      <div className="previewCalculoEditar">
                        <h4>Nuevos Datos del Préstamo</h4>
                        <div className="gridCalculo">
                          <div className="columnaCalculo">
                            <h5>INFORMACIÓN ACTUALIZADA</h5>
                            <div className="listaCalculo">
                              <div className="itemCalculo">
                                <span>Nueva Cuota Mensual:</span>
                                <span>
                                  {formatearMoneda(
                                    calcularPrestamoDetallado(
                                      parseFloat(formEditar.montoPrestamo) || clienteSeleccionado.montoPrestamo,
                                      parseFloat(formEditar.tasaInteres) || clienteSeleccionado.tasaInteres,
                                      parseInt(formEditar.numeroCuotas) || clienteSeleccionado.numeroCuotas
                                    ).cuotaMensual
                                  )}
                                </span>
                              </div>
                              
                              {/* NUEVO ITEM: Fecha de Registro calculada */}
                              <div className="itemCalculo">
                                <span>Nueva Fecha de Registro:</span>
                                <span>
                                  {(() => {
                                    if (!formEditar.fechaProximoPago) {
                                      return formatearFecha(clienteSeleccionado.fechaPrestamo);
                                    }

                                    try {
                                      // Calcular fecha de registro (un mes antes)
                                      const fechaProx = new Date(formEditar.fechaProximoPago);
                                      fechaProx.setMonth(fechaProx.getMonth() - 1);

                                      // Ajustar para casos como 31 de marzo -> 28/29 de febrero
                                      const diaOriginal = new Date(formEditar.fechaProximoPago).getDate();
                                      const diaDespues = fechaProx.getDate();

                                      if (diaDespues < diaOriginal) {
                                        fechaProx.setDate(0); // Último día del mes anterior
                                      }

                                      const year = fechaProx.getFullYear();
                                      const month = String(fechaProx.getMonth() + 1).padStart(2, '0');
                                      const day = String(fechaProx.getDate()).padStart(2, '0');
                                      return formatearFecha(`${year}-${month}-${day}`);
                                    } catch {
                                      return formatearFecha(clienteSeleccionado.fechaPrestamo);
                                    }
                                  })()}
                                </span>
                              </div>
                              
                              <div className="itemCalculo">
                                <span>Próximo Pago:</span>
                                <span>
                                  {formatearFecha(formEditar.fechaProximoPago || clienteSeleccionado.fechaProximoPago)}
                                </span>
                              </div>
                              <div className="itemCalculo total">
                                <span>NUEVO SALDO PENDIENTE:</span>
                                <span className="text-success">
                                  {(() => {
                                    try {
                                      const monto = parseFloat(formEditar.montoPrestamo) || clienteSeleccionado.montoPrestamo;
                                      const tasa = parseFloat(formEditar.tasaInteres) || clienteSeleccionado.tasaInteres;
                                      const cuotas = parseInt(formEditar.numeroCuotas) || clienteSeleccionado.numeroCuotas;
                                      const cuotasPagadas = clienteSeleccionado.cuotasPagadas;

                                      if (monto > 0 && tasa >= 0 && cuotas > 0) {
                                        const calculo = calcularPrestamoDetallado(monto, tasa, cuotas);
                                        const totalPagadoHastaAhora = cuotasPagadas * calculo.cuotaMensual;
                                        const saldoPendienteNuevo = Math.max(0, calculo.totalPagar - totalPagadoHastaAhora);
                                        return formatearMoneda(saldoPendienteNuevo);
                                      }
                                      return formatearMoneda(clienteSeleccionado.saldoPendiente);
                                    } catch {
                                      return formatearMoneda(clienteSeleccionado.saldoPendiente);
                                    }
                                  })()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    onClick={cerrarModalEditar}
                    className="cancel-btn"
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="saveButton" disabled={loading}>
                    {loading ? (
                      <>
                        <div className="spinner"></div>
                        <span>ACTUALIZANDO PRÉSTAMO...</span>
                      </>
                    ) : (
                      'ACTUALIZAR PRÉSTAMO'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Abono de Intereses */}
      {isModalAbonoInteresesOpen && clienteSeleccionado && (
        <div className="modalOverlay">
          <div className="modalContent modal-abono-simplificado">
            <div className="modalHeader">
              <h2>Abonar Intereses - {clienteSeleccionado.nombre} {clienteSeleccionado.apellido}</h2>
              <button className="closeButton" onClick={cerrarModalAbonoIntereses}>
                ×
              </button>
            </div>

            <div className="modalBody">
              <div className="info-cliente-abono">
                <div className="info-resumen-abono">
                  <div className="info-item-abono">
                    <span className="label">Cuota Mensual:</span>
                    <span className="value">{formatearMoneda(clienteSeleccionado.cuotaMensual)}</span>
                  </div>
                  <div className="info-item-abono">
                    <span className="label">Interés Mensual:</span>
                    <span className="value">{formatearMoneda(clienteSeleccionado.interesMensual)}</span>
                  </div>
                  <div className="info-item-abono destacado">
                    <span className="label">Intereses Acumulados:</span>
                    <span className={`value ${clienteSeleccionado.interesesAcumulados > 0 ? 'text-danger' : ''}`}>
                      {formatearMoneda(clienteSeleccionado.interesesAcumulados)}
                    </span>
                  </div>
                  <div className="info-item-abono">
                    <span className="label">Saldo Pendiente:</span>
                    <span className="value">{formatearMoneda(clienteSeleccionado.saldoPendiente)}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={registrarAbonoIntereses} className="form-abono-simplificado">
                <div className="seccion-tipo-abono-simplificado">
                  <h3>Tipo de Abono de Intereses</h3>

                  <div className="opciones-abono-intereses">
                    <button
                      type="button"
                      className={`opcion-abono ${formAbonoIntereses.tipo === 'intereses_mensuales' ? 'active' : ''}`}
                      onClick={() => {
                        setFormAbonoIntereses({
                          ...formAbonoIntereses,
                          tipo: 'intereses_mensuales',
                          observaciones: 'Pago de intereses mensuales',
                          montoAbono: clienteSeleccionado.interesMensual.toString()
                        });
                      }}
                    >
                      <div className="info-opcion">
                        <strong>Intereses Mensuales</strong>
                        <p>Pago del interés correspondiente al mes actual</p>
                        <span className="monto-opcion">{formatearMoneda(clienteSeleccionado.interesMensual)}</span>
                      </div>
                    </button>

                    {clienteSeleccionado.interesesAcumulados > 0 && (
                      <button
                        type="button"
                        className={`opcion-abono ${formAbonoIntereses.tipo === 'intereses_acumulados' ? 'active' : ''}`}
                        onClick={() => {
                          setFormAbonoIntereses({
                            ...formAbonoIntereses,
                            tipo: 'intereses_acumulados',
                            observaciones: 'Pago de intereses acumulados',
                            montoAbono: clienteSeleccionado.interesesAcumulados.toString()
                          });
                        }}
                      >
                        <div className="info-opcion">
                          <strong>Intereses Acumulados</strong>
                          <p>Pago de intereses pendientes por mora</p>
                          <span className="monto-opcion text-danger">{formatearMoneda(clienteSeleccionado.interesesAcumulados)}</span>
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                <div className="form-row-abono">
                  <div className="form-group-abono">
                    <label>Monto a Abonar</label>
                    <input
                      type="number"
                      value={formAbonoIntereses.montoAbono}
                      onChange={(e) => setFormAbonoIntereses({ ...formAbonoIntereses, montoAbono: e.target.value })}
                      placeholder="Monto"
                      min="1"
                      required
                      disabled={loading}
                      className="input-monto-abono"
                    />
                  </div>

                  <div className="form-group-abono">
                    <label>Fecha del Abono</label>
                    <input
                      type="date"
                      value={formAbonoIntereses.fechaAbono}
                      onChange={(e) => setFormAbonoIntereses({ ...formAbonoIntereses, fechaAbono: e.target.value })}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="form-group-abono">
                  <label>Observaciones</label>
                  <textarea
                    value={formAbonoIntereses.observaciones}
                    onChange={(e) => setFormAbonoIntereses({ ...formAbonoIntereses, observaciones: e.target.value })}
                    placeholder="Descripción del abono..."
                    rows={2}
                    disabled={loading}
                    className="textarea-observaciones"
                  />
                </div>

                <div className="resumen-abono-final">
                  <h4>Resumen del Abono</h4>
                  <div className="detalles-resumen-abono">
                    <div className="item-resumen-abono">
                      <span>Tipo:</span>
                      <strong>
                        {formAbonoIntereses.tipo === 'intereses_mensuales' ? 'Intereses Mensuales' : 'Intereses Acumulados'}
                      </strong>
                    </div>
                    <div className="item-resumen-abono">
                      <span>Monto:</span>
                      <strong className="monto-final-abono">
                        {formatearMoneda(parseFloat(formAbonoIntereses.montoAbono) || 0)}
                      </strong>
                    </div>
                    <div className="item-resumen-abono">
                      <span>Fecha:</span>
                      <strong>{formatearFecha(formAbonoIntereses.fechaAbono)}</strong>
                    </div>
                  </div>
                </div>

                <button type="submit" className="btn-abonar" disabled={loading}>
                  {loading ? (
                    <>
                      <div className="spinner"></div>
                      <span>REGISTRANDO ABONO...</span>
                    </>
                  ) : (
                    <>
                      ABONAR INTERESES
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación */}
      {showConfirmModal && (
        <div className="modalOverlay">
          <div className="modalContent confirm-modal">
            <div className="modalHeader">
              <h2>
                {confirmAction.type === 'delete'
                  ? '¿Eliminar Cliente?'
                  : '¿Marcar en Mora?'}
              </h2>
              <button
                className="closeButton"
                onClick={() => manejarConfirmacion(false)}
                disabled={loading}
              >
                ×
              </button>
            </div>
            <div className="modalBody">
              <div className="confirm-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {confirmAction.type === 'delete' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.694-.833-2.464 0L4.146 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  )}
                </svg>
              </div>

              <div className="confirm-message">
                <p>
                  {confirmAction.type === 'delete'
                    ? `¿Estás seguro de que quieres eliminar a ${confirmAction.clienteNombre}?`
                    : `¿Marcar a ${confirmAction.clienteNombre} como en mora?`
                  }
                </p>

                <p className="confirm-details">
                  {confirmAction.type === 'delete'
                    ? 'Esta acción no se puede deshacer. Se eliminarán todos los datos del cliente, préstamos y pagos asociados.'
                    : 'Esta acción cambiará el estado del cliente y sus préstamos pendientes a "mora".'
                  }
                </p>
              </div>

              <div className="confirm-actions">
                <button
                  className="cancel-btn"
                  onClick={() => manejarConfirmacion(false)}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  className={confirmAction.type === 'delete' ? 'delete-confirm-btn' : 'mora-confirm-btn'}
                  onClick={() => manejarConfirmacion(true)}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="spinner"></div>
                      <span>PROCESANDO...</span>
                    </>
                  ) : (
                    confirmAction.type === 'delete' ? 'ELIMINAR DEFINITIVAMENTE' : 'MARCAR EN MORA'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}