'use client';

import { useState, useEffect, useMemo } from 'react';

// Interfaces
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
  diaPago: number;
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

// Función para calcular intereses por días específicos
const calcularInteresesPorDias = (
  monto: number,
  tasaInteresAnual: number,
  dias: number
) => {
  const intereses = monto * (tasaInteresAnual / 100) * (dias / 360);
  return Math.round(intereses);
};

// 🔥 NUEVA FUNCIÓN: Calcular porción de intereses mensuales según días
const calcularPorcionInteresesMensuales = (
  interesMensual: number,
  dias: number
): number => {
  if (!interesMensual || interesMensual <= 0 || !dias || dias <= 0) {
    return 0;
  }
  
  // Fórmula: (Interés mensual / 30) × días
  // Esto calcula la porción proporcional del interés mensual
  const interesDiarioPromedio = interesMensual / 30;
  const porcion = interesDiarioPromedio * dias;
  
  // Redondear al entero más cercano
  return Math.round(porcion);
};

// Función para calcular la tasa diaria
const calcularTasaDiaria = (tasaInteresAnual: number) => {
  return (tasaInteresAnual / 100) / 360; // CORREGIDO: 360 días comerciales
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

  if (fechaString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return fechaString;
  }

  try {
    const fechaObj = new Date(fechaString);
    const year = fechaObj.getFullYear();
    const month = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const day = String(fechaObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formateando fecha:', error);
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

// Función para formatear fecha a YYYY-MM-DD
const formatearFechaParaBackend = (fechaString: string): string => {
  if (!fechaString) {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (fechaString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return fechaString;
  }

  try {
    const matchDDMMYYYY = fechaString.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (matchDDMMYYYY) {
      const [, day, month, year] = matchDDMMYYYY;
      return `${year}-${month}-${day}`;
    }
    
    const matchMMDDYYYY = fechaString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (matchMMDDYYYY) {
      const [, month, day, year] = matchMMDDYYYY;
      const monthPadded = month.padStart(2, '0');
      const dayPadded = day.padStart(2, '0');
      return `${year}-${monthPadded}-${dayPadded}`;
    }
    
    console.warn(`⚠️ Formateando fecha desconocida: ${fechaString}`);
    const fecha = new Date(fechaString);
    
    const fechaAjustada = new Date(
      fecha.getFullYear(),
      fecha.getMonth(),
      fecha.getDate(),
      12,
      0,
      0,
      0
    );
    
    const year = fechaAjustada.getFullYear();
    const month = String(fechaAjustada.getMonth() + 1).padStart(2, '0');
    const day = String(fechaAjustada.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('❌ Error formateando fecha para backend:', fechaString, error);
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

// Función auxiliar para obtener día desde fecha
const obtenerDiaPagoDesdeFecha = (fechaString: string): number => {
  if (!fechaString) return 0;
  
  try {
    console.log(`📅 Obteniendo día de pago desde fecha: ${fechaString}`);
    
    const matchYYYYMMDD = fechaString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (matchYYYYMMDD) {
      const [, , , day] = matchYYYYMMDD;
      const dia = parseInt(day, 10);
      console.log(`✅ Extraído directamente del formato YYYY-MM-DD: día ${dia}`);
      return dia;
    }
    
    const matchDDMMYYYY = fechaString.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (matchDDMMYYYY) {
      const [, day, ,] = matchDDMMYYYY;
      const dia = parseInt(day, 10);
      console.log(`✅ Extraído directamente del formato DD/MM/YYYY: día ${dia}`);
      return dia;
    }
    
    if (fechaString.includes('T')) {
      const fechaParte = fechaString.split('T')[0];
      const matchISO = fechaParte.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (matchISO) {
        const [, , , day] = matchISO;
        const dia = parseInt(day, 10);
        console.log(`✅ Extraído de fecha ISO: día ${dia}`);
        return dia;
      }
    }
    
    console.warn(`⚠️ Usando Date como último recurso para: ${fechaString}`);
    const fecha = new Date(fechaString);
    
    if (isNaN(fecha.getTime())) {
      console.error(`❌ Fecha inválida: ${fechaString}`);
      return 0;
    }
    
    const localDate = new Date(
      fecha.getFullYear(),
      fecha.getMonth(),
      fecha.getDate(),
      12,
      0,
      0,
      0
    );
    
    const dia = localDate.getDate();
    console.log(`📊 Día obtenido via Date ajustado: ${dia}`);
    return dia;
  } catch (error) {
    console.error(`❌ Error obteniendo día de pago desde ${fechaString}:`, error);
    return 0;
  }
};

// SERVICIO CONEXIÓN API REAL - MODIFICADO
class SistemaPrestamosService {
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

  static async editarCliente(id: string, datosActualizados: any): Promise<Cliente> {
    try {
      console.log('✏️ Editando cliente:', id, datosActualizados);

      if (datosActualizados.montoPrestamo || datosActualizados.tasaInteres || datosActualizados.numeroCuotas) {
        await this.actualizarPrestamo(id, datosActualizados);
      }

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

      const clienteActualizado = await this.obtenerClientePorId(id);
      return clienteActualizado;

    } catch (error: any) {
      console.error('❌ Error editando cliente:', error);
      throw error;
    }
  }

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

      const monto = datosPrestamo.montoPrestamo || prestamoActual.montoPrestamo;
      const tasa = datosPrestamo.tasaInteres || prestamoActual.tasaInteres;
      const cuotas = datosPrestamo.numeroCuotas || prestamoActual.numeroCuotas;
      const cuotasPagadas = prestamoActual.cuotasPagadas || 0;

      let fechaProximoPago = datosPrestamo.fechaProximoPago || prestamoActual.fechaProximoPago;
      let fechaPrestamo = prestamoActual.fechaPrestamo;

      let diaPago = prestamoActual.diaPago || obtenerDiaPagoDesdeFecha(prestamoActual.fechaProximoPago);
      if (datosPrestamo.fechaProximoPago) {
        diaPago = obtenerDiaPagoDesdeFecha(datosPrestamo.fechaProximoPago);
        console.log(`📅 Nuevo día de pago: ${diaPago}`);
      }

      const calcularFechaRegistro = (fechaProxPago: string) => {
        const fecha = new Date(fechaProxPago);
        fecha.setMonth(fecha.getMonth() - 1);

        const year = fecha.getFullYear();
        const month = String(fecha.getMonth() + 1).padStart(2, '0');
        const day = String(fecha.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      if (datosPrestamo.fechaProximoPago && datosPrestamo.fechaProximoPago !== prestamoActual.fechaProximoPago) {
        fechaPrestamo = calcularFechaRegistro(datosPrestamo.fechaProximoPago);
      }

      const calculo = calcularPrestamoDetallado(monto, tasa, cuotas);
      const totalPagadoHastaAhora = cuotasPagadas * calculo.cuotaMensual;
      const saldoPendienteNuevo = Math.max(0, calculo.totalPagar - totalPagadoHastaAhora);

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
        fechaProximoPago: datosPrestamo.fechaProximoPago || prestamoActual.fechaProximoPago,
        diaPago: diaPago,
        fechaPrestamo: fechaPrestamo
      };

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

        let diaPago = prestamoCliente?.diaPago || 0;
        if (!diaPago && prestamoCliente?.fechaProximoPago) {
          diaPago = obtenerDiaPagoDesdeFecha(prestamoCliente.fechaProximoPago);
        }

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
          diaPago: diaPago,
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

  static async crearCliente(clienteData: any): Promise<Cliente> {
    try {
      console.log('📝 Creando cliente con datos:', clienteData);

      const fechaPrestamo = formatearFechaParaBackend(clienteData.fechaPrestamo);
      const fechaProximoPago = clienteData.fechaProximoPago ?
        formatearFechaParaBackend(clienteData.fechaProximoPago) :
        fechaPrestamo;

      const diaPago = obtenerDiaPagoDesdeFecha(fechaProximoPago);
      console.log(`📅 Día de pago extraído: ${diaPago} de la fecha ${fechaProximoPago}`);

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

      const montoPrestamo = parseFloat(clienteData.montoPrestamo);
      const tasaInteres = parseFloat(clienteData.tasaInteres);
      const numeroCuotas = parseInt(clienteData.numeroCuotas);

      const calculo = calcularPrestamoDetallado(montoPrestamo, tasaInteres, numeroCuotas);

      const prestamoData = {
        cliente: nuevoCliente._id,
        montoPrestamo: montoPrestamo,
        tasaInteres: tasaInteres,
        numeroCuotas: numeroCuotas,
        fechaPrestamo: fechaPrestamo,
        fechaProximoPago: fechaProximoPago,
        diaPago: diaPago,
        observaciones: 'Préstamo inicial'
      };

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
        diaPago: diaPago,
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

  // FUNCIÓN MODIFICADA: Eliminar cliente y todo su historial
  static async eliminarCliente(id: string): Promise<void> {
    try {
      console.log('🗑️ Eliminando cliente y todo su historial:', id);

      // Usar parámetro deleteAll=true para eliminación en cascada
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
      console.log('✅ Eliminación completa exitosa:', result.message);

    } catch (error: any) {
      console.error('❌ Error eliminando cliente y su historial:', error);
      throw error;
    }
  }

  // NUEVA FUNCIÓN: Registrar abono de intereses - CORREGIDA
  static async registrarAbonoIntereses(abonoData: any): Promise<any> {
    try {
      console.log('💰 Registrando abono de intereses:', abonoData);

      const prestamosResponse = await fetch(`/api/prestamos?clienteId=${abonoData.clienteId}`);
      if (!prestamosResponse.ok) {
        throw new Error('Error al buscar préstamo');
      }

      const prestamosResult = await prestamosResponse.json();
      if (!prestamosResult.success || prestamosResult.data.length === 0) {
        throw new Error('No se encontró préstamo para el cliente');
      }

      const prestamoActual = prestamosResult.data[0];
      const prestamoId = prestamoActual._id;

      const fechaAbonoReal = abonoData.fechaAbono || new Date().toISOString().split('T')[0];
      const montoAbono = parseFloat(abonoData.montoAbono);
      
      if (!montoAbono || montoAbono <= 0) {
        throw new Error('Monto de abono inválido');
      }

      // Calcular nuevo saldo y intereses acumulados
      const nuevosInteresesAcumulados = Math.max(0, (prestamoActual.interesesAcumulados || 0) - montoAbono);
      const nuevoSaldoPendiente = Math.max(0, (prestamoActual.saldoPendiente || 0) - montoAbono);

      // Actualizar el préstamo con el abono de intereses
      const prestamoActualizado = {
        id: prestamoId,
        interesesAcumulados: nuevosInteresesAcumulados,
        saldoPendiente: nuevoSaldoPendiente,
        estado: 'pendiente' // Mantener como pendiente aunque sea solo abono de intereses
      };

      // Registrar el pago como abono de intereses (cuotaNumero = 0)
      const pagoInteresesData = {
        prestamoId: prestamoId,
        montoPagado: montoAbono,
        cuotaNumero: 0, // 0 indica que es abono de intereses, no pago de cuota
        fechaPago: fechaAbonoReal,
        observaciones: abonoData.observaciones || 'Abono de intereses',
        tipoPago: 'abono_intereses'
      };

      // 1. Registrar el pago como abono de intereses
      const pagoResponse = await fetch('/api/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pagoInteresesData)
      });

      if (!pagoResponse.ok) {
        throw new Error('Error al registrar el abono');
      }

      // 2. Actualizar el préstamo
      const prestamoResponse = await fetch('/api/prestamos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prestamoActualizado)
      });

      if (!prestamoResponse.ok) {
        throw new Error('Error al actualizar préstamo');
      }

      const result = await prestamoResponse.json();
      
      // También actualizar en el cliente si tiene campos relacionados
      if (prestamoActual.cliente) {
        await this.editarCliente(prestamoActual.cliente, {
          interesesAcumulados: nuevosInteresesAcumulados
        });
      }

      return {
        success: true,
        data: {
          prestamo: result.data,
          pago: pagoInteresesData,
          montoAbonado: montoAbono
        }
      };

    } catch (error: any) {
      console.error('❌ Error registrando abono de intereses:', error);
      throw new Error(error.message || 'Error al registrar abono de intereses');
    }
  }

  static async registrarPago(pagoData: any): Promise<Pago> {
    try {
      console.log('💰 Registrando pago:', pagoData);

      const fechaPagoReal = pagoData.fechaPago ?
        formatearFechaParaBackend(pagoData.fechaPago) :
        new Date().toISOString().split('T')[0];

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

      if (!prestamosResult.success) {
        throw new Error(prestamosResult.error || 'Error en la búsqueda de préstamo');
      }

      if (!prestamosResult.data || prestamosResult.data.length === 0) {
        throw new Error('No se encontró ningún préstamo para este cliente. Primero crea un préstamo.');
      }

      const prestamo = prestamosResult.data[0];
      const prestamoId = prestamo._id || prestamo.id;

      const cuotaSugerida = prestamo.cuotasPagadas + 1;
      const montoSugerido = prestamo.cuotaMensual || prestamo.montoPrestamo / prestamo.numeroCuotas;

      const pagoRequest = {
        prestamoId: prestamoId,
        montoPagado: parseFloat(pagoData.montoPagado) || montoSugerido,
        cuotaNumero: parseInt(pagoData.cuotaNumero) || cuotaSugerida,
        fechaPago: fechaPagoReal,
        observaciones: pagoData.observaciones || `Pago cuota ${pagoData.cuotaNumero || cuotaSugerida}`
      };

      const response = await fetch('/api/pagos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(pagoRequest)
      });

      if (!response.ok) {
        let errorMessage = 'Error al registrar pago';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          const errorText = await response.text();
          errorMessage = `${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al registrar pago');
      }

      const nuevoPago = result.data.pago;

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
      console.error('❌ Error registrando pago:', error);
      let mensajeError = error.message;
      if (error.message.includes('No se encontró ningún préstamo')) {
        mensajeError = '❌ Este cliente no tiene préstamos registrados. Primero crea un préstamo.';
      }
      throw new Error(mensajeError);
    }
  }

  static async obtenerPagosPorCliente(clienteId: string): Promise<Pago[]> {
    try {
      console.log('🔍 Obteniendo pagos para cliente:', clienteId);

      const response = await fetch(`/api/pagos?clienteId=${clienteId}&limit=1000`);

      if (!response.ok) {
        console.warn('⚠️ No se pudieron obtener pagos para cliente:', clienteId);
        return [];
      }

      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        const pagosOrdenados = result.data.sort((a: any, b: any) =>
          new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime()
        );

        const pagos = pagosOrdenados.map((pagoData: any) => {
          const fechaOriginal = pagoData.fechaPago;
          
          // MODIFICADO: Solo formatear la fecha, no la hora
          const fechaObj = new Date(fechaOriginal);
          const year = fechaObj.getFullYear();
          const month = String(fechaObj.getMonth() + 1).padStart(2, '0');
          const day = String(fechaObj.getDate()).padStart(2, '0');
          
          // Solo fecha, sin hora
          const fechaFormateada = `${day}/${month}/${year}`;

          return {
            id: pagoData._id || pagoData.id,
            clienteId: clienteId,
            fechaPago: fechaOriginal,
            fechaPagoFormateada: fechaFormateada, // Solo fecha
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

  static determinarTipoPago(observaciones: string): string {
    if (!observaciones) return 'Abono Intereses';

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
    if (obs.includes('intereses')) return 'Abono Intereses';

    return 'Abono Intereses';
  }

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

  static async obtenerClientesPorDiaPago(dia: number): Promise<Cliente[]> {
    try {
      console.log(`🔍 Buscando clientes con pago el día ${dia}...`);

      const todosClientes = await this.obtenerClientes();
      console.log(`📊 Total de clientes encontrados: ${todosClientes.length}`);

      const clientesFiltrados = todosClientes.filter((cliente: Cliente) => {
        try {
          if (!cliente.diaPago && !cliente.fechaProximoPago) {
            console.warn(`Cliente ${cliente.id} sin fechaProximoPago ni diaPago`);
            return false;
          }

          const diaPago = cliente.diaPago || obtenerDiaPagoDesdeFecha(cliente.fechaProximoPago);
          console.log(`Cliente ${cliente.nombre}: diaPago=${diaPago}, buscando=${dia}`);
          return diaPago === dia;
        } catch (error) {
          console.error(`❌ Error procesando fecha para cliente ${cliente.id}:`, error);
          return false;
        }
      });

      console.log(`✅ Encontrados ${clientesFiltrados.length} clientes con pago el día ${dia}`);

      const clientesCompletos: Cliente[] = [];

      for (const cliente of clientesFiltrados) {
        try {
          const prestamosResponse = await fetch(`/api/prestamos?clienteId=${cliente.id}`);
          if (prestamosResponse.ok) {
            const prestamosResult = await prestamosResponse.json();
            if (prestamosResult.success && prestamosResult.data.length > 0) {
              const prestamoCliente = prestamosResult.data[0];

              const clienteCompleto: Cliente = {
                ...cliente,
                montoPrestamo: prestamoCliente.montoPrestamo || 0,
                tasaInteres: prestamoCliente.tasaInteres || 0,
                numeroCuotas: prestamoCliente.numeroCuotas || 0,
                fechaPrestamo: prestamoCliente.fechaPrestamo || cliente.fechaPrestamo,
                fechaProximoPago: prestamoCliente.fechaProximoPago || cliente.fechaProximoPago,
                diaPago: prestamoCliente.diaPago || cliente.diaPago || obtenerDiaPagoDesdeFecha(prestamoCliente.fechaProximoPago || cliente.fechaProximoPago),
                estado: prestamoCliente.estado || 'pendiente',
                cuotasPagadas: prestamoCliente.cuotasPagadas || 0,
                saldoPendiente: prestamoCliente.saldoPendiente || 0,
                totalIntereses: prestamoCliente.totalIntereses || 0,
                total4x1000: prestamoCliente.total4x1000 || 0,
                cuotaMensual: prestamoCliente.cuotaMensual || 0,
                capitalMensual: prestamoCliente.capitalMensual || 0,
                interesMensual: prestamoCliente.interesMensual || 0,
                valor4x1000Mensual: prestamoCliente.valor4x1000Mensual || 0,
                interesesAcumulados: prestamoCliente.interesesAcumulados || 0
              };

              clientesCompletos.push(clienteCompleto);
            } else {
              clientesCompletos.push(cliente);
            }
          }
        } catch (error) {
          console.error(`❌ Error obteniendo préstamo para cliente ${cliente.id}:`, error);
          clientesCompletos.push(cliente);
        }
      }

      console.log(`✅ ${clientesCompletos.length} clientes completos obtenidos para día ${dia}`);
      return clientesCompletos;

    } catch (error: any) {
      console.error('❌ Error buscando clientes por día de pago:', error);

      try {
        console.log('🔄 Intentando método alternativo de búsqueda...');
        return await this.busquedaAlternativaPorDia(dia);
      } catch (error2) {
        console.error('❌ Error en método alternativo:', error2);
        throw error;
      }
    }
  }

  static async busquedaAlternativaPorDia(dia: number): Promise<Cliente[]> {
    try {
      const todosClientes = await this.obtenerClientes();

      const clientesFiltrados = todosClientes.filter(cliente => {
        try {
          const diaPago = cliente.diaPago || obtenerDiaPagoDesdeFecha(cliente.fechaProximoPago);
          return diaPago === dia;
        } catch {
          return false;
        }
      });

      console.log(`🔍 Método alternativo: ${clientesFiltrados.length} clientes encontrados para día ${dia}`);
      return clientesFiltrados;

    } catch (error) {
      console.error('❌ Error en método alternativo:', error);
      return [];
    }
  }
}

// Componente principal actualizado
export default function SistemaPrestamosElegante() {
  // Estados principales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalPagoOpen, setIsModalPagoOpen] = useState(false);
  const [isModalEditarOpen, setIsModalEditarOpen] = useState(false);
  const [isModalAbonoInteresesOpen, setIsModalAbonoInteresesOpen] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
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
    diaPago: 0,
    observaciones: ''
  });
  const [formEditar, setFormEditar] = useState<any>({});
  const [formAbonoIntereses, setFormAbonoIntereses] = useState({
    montoAbono: '',
    tipo: 'interes',
    observaciones: '',
    fechaAbono: new Date().toISOString().split('T')[0],
    tipoCalculo: 'mensual',
    diasInteres: '30',
    tasaInteresDiaria: '',
    montoCalculado: ''
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

  // Estados para búsqueda inteligente de clientes por día de pago
  const [searchInput, setSearchInput] = useState('');
  const [clientSuggestions, setClientSuggestions] = useState<Cliente[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [clientesFiltradosPorDia, setClientesFiltradosPorDia] = useState<Cliente[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [clientesEncontrados, setClientesEncontrados] = useState<Cliente[]>([]);
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);

  // Funciones de formateo - MODIFICADO: Solo fecha sin hora
  const formatearFecha = (fecha: string) => {
    try {
      if (!fecha) return 'Fecha inválida';
      
      console.log(`🔄 Formateando fecha: ${fecha}`);
      
      const matchYYYYMMDD = fecha.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (matchYYYYMMDD) {
        const [, year, month, day] = matchYYYYMMDD;
        console.log(`✅ Formateado de YYYY-MM-DD a DD/MM/YYYY: ${day}/${month}/${year}`);
        return `${day}/${month}/${year}`;
      }
      
      const matchDDMMYYYY = fecha.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (matchDDMMYYYY) {
        return fecha;
      }
      
      if (fecha.includes('T')) {
        const fechaParte = fecha.split('T')[0];
        const matchISO = fechaParte.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (matchISO) {
          const [, year, month, day] = matchISO;
          return `${day}/${month}/${year}`;
        }
      }
      
      console.warn(`⚠️ Usando Date para formatear: ${fecha}`);
      const fechaObj = new Date(fecha);
      
      if (isNaN(fechaObj.getTime())) {
        return 'Fecha inválida';
      }
      
      const fechaLocal = new Date(
        fechaObj.getFullYear(),
        fechaObj.getMonth(),
        fechaObj.getDate(),
        12,
        0,
        0,
        0
      );
      
      const year = fechaLocal.getFullYear();
      const month = String(fechaLocal.getMonth() + 1).padStart(2, '0');
      const day = String(fechaLocal.getDate()).padStart(2, '0');
      
      console.log(`📊 Fecha formateada: ${day}/${month}/${year}`);
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('❌ Error formateando fecha:', fecha, error);
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

  // 🔥 CORREGIDO: Función para manejar cambios en el tipo de cálculo
  const manejarCambioTipoCalculo = (tipo: string) => {
    if (!clienteSeleccionado) return;
    
    const nuevoEstado = {
      ...formAbonoIntereses,
      tipoCalculo: tipo
    };
    
    if (tipo === 'mensual') {
      // Interés mensual completo
      nuevoEstado.diasInteres = '30';
      nuevoEstado.montoCalculado = clienteSeleccionado.interesMensual?.toString() || '0';
      nuevoEstado.montoAbono = nuevoEstado.montoCalculado;
      nuevoEstado.observaciones = 'Pago de intereses mensuales completos (30 días)';
    } else if (tipo === 'diario') {
      // Porción proporcional - iniciar con 15 días (50% del mes)
      const interesMensual = clienteSeleccionado.interesMensual || 0;
      
      // 🔥 USAR LA NUEVA FUNCIÓN
      const porcion15Dias = calcularPorcionInteresesMensuales(interesMensual, 15);
      
      nuevoEstado.diasInteres = '15';
      nuevoEstado.montoCalculado = porcion15Dias.toString();
      nuevoEstado.montoAbono = porcion15Dias.toString();
      nuevoEstado.observaciones = 'Pago de 15 días de intereses (50% del mes)';
    } else if (tipo === 'acumulado') {
      // Intereses acumulados
      nuevoEstado.montoCalculado = clienteSeleccionado.interesesAcumulados?.toString() || '0';
      nuevoEstado.montoAbono = nuevoEstado.montoCalculado;
      nuevoEstado.observaciones = 'Pago de intereses acumulados';
    }
    
    setFormAbonoIntereses(nuevoEstado);
  };

  // 🔥 CORREGIDO: Manejar cambios en los días - PORCIÓN PROPORCIONAL
  const manejarCambioDiasInteres = (dias: string) => {
    if (!clienteSeleccionado || formAbonoIntereses.tipoCalculo !== 'diario') return;
    
    const diasNum = parseInt(dias);
    if (diasNum <= 0 || diasNum > 30) {
      setFormAbonoIntereses({
        ...formAbonoIntereses,
        diasInteres: dias,
        montoCalculado: '0',
        montoAbono: '0',
        observaciones: `Días inválidos (1-30 máximo)`
      });
      return;
    }
    
    // Obtener interés mensual del cliente
    const interesMensual = clienteSeleccionado.interesMensual || 0;
    
    // 🔥 USAR LA NUEVA FUNCIÓN
    const porcionIntereses = calcularPorcionInteresesMensuales(interesMensual, diasNum);
    
    // Calcular porcentaje del mes
    const porcentajeMes = Math.round((diasNum / 30) * 100);
    
    setFormAbonoIntereses({
      ...formAbonoIntereses,
      diasInteres: dias,
      montoCalculado: porcionIntereses.toString(),
      montoAbono: porcionIntereses.toString(),
      observaciones: `Pago de ${diasNum} días de intereses (${porcentajeMes}% del mes) - ${formatearMoneda(porcionIntereses)}`
    });
  };

  // Obtener día del próximo pago de un cliente
  const obtenerDiaPagoCliente = (cliente: Cliente): number => {
    try {
      if (cliente.diaPago && cliente.diaPago > 0) {
        return cliente.diaPago;
      }

      if (!cliente.fechaProximoPago) {
        console.warn(`Cliente ${cliente.id} sin fechaProximoPago`);
        return 0;
      }

      return obtenerDiaPagoDesdeFecha(cliente.fechaProximoPago);
    } catch (error) {
      console.error(`Error obteniendo día de pago para cliente ${cliente.id}:`, error);
      return 0;
    }
  };

  // Función para generar sugerencias en tiempo real
  const generarSugerenciasClientes = (input: string) => {
    if (!input.trim()) {
      setClientSuggestions([]);
      setSuggestionsVisible(false);
      return;
    }

    const inputNumero = parseInt(input.replace(/\D/g, ''));
    if (isNaN(inputNumero) || inputNumero < 1 || inputNumero > 31) {
      setClientSuggestions([]);
      setSuggestionsVisible(false);
      return;
    }

    const sugerenciasLocales = clientes.filter(cliente => {
      try {
        const diaPago = obtenerDiaPagoCliente(cliente);
        return diaPago === inputNumero;
      } catch {
        return false;
      }
    });

    const sugerenciasMostrar = sugerenciasLocales.slice(0, 5);
    setClientSuggestions(sugerenciasMostrar);
    setSuggestionsVisible(sugerenciasMostrar.length > 0);

    if (sugerenciasLocales.length < 5) {
      const sugerenciasPorNombre = clientes
        .filter(cliente =>
          !sugerenciasLocales.some(c => c.id === cliente.id) &&
          (
            cliente.nombre.toLowerCase().includes(input.toLowerCase()) ||
            cliente.apellido.toLowerCase().includes(input.toLowerCase()) ||
            cliente.cedula.includes(input)
          )
        )
        .slice(0, 5 - sugerenciasLocales.length);

      setClientSuggestions(prev => [...prev, ...sugerenciasPorNombre]);
      setSuggestionsVisible(true);
    }
  };

  // Función para manejar el cambio en el input de búsqueda
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);

    if (!value.trim()) {
      limpiarBusquedaDia();
      return;
    }

    generarSugerenciasClientes(value);
  };

  // Función para seleccionar una sugerencia
  const seleccionarSugerencia = (cliente: Cliente) => {
    const diaPago = obtenerDiaPagoCliente(cliente);
    
    setSearchInput(diaPago.toString());
    setClientesEncontrados([cliente]);
    setClientesFiltradosPorDia([cliente]);
    setIsSearchActive(true);
    setSuggestionsVisible(false);
    
    mostrarExito(`✅ Mostrando: ${cliente.nombre} ${cliente.apellido} (paga el día ${diaPago})`);
    
    scrollToCliente(cliente.id);
  };

  // Función para hacer scroll al cliente seleccionado
  const scrollToCliente = (clienteId: string) => {
    setTimeout(() => {
      const elemento = document.getElementById(`cliente-${clienteId}`);
      if (elemento) {
        elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        elemento.classList.add('cliente-seleccionado');
        setTimeout(() => {
          elemento.classList.remove('cliente-seleccionado');
        }, 2000);
      }
    }, 100);
  };

  // Función para buscar clientes por día de pago
  const buscarClientesPorDiaPago = async (dia: string, clienteEspecifico?: Cliente) => {
    if (!dia.trim()) {
      limpiarBusquedaDia();
      return;
    }

    const diaNumero = parseInt(dia);
    if (isNaN(diaNumero) || diaNumero < 1 || diaNumero > 31) {
      mostrarError('❌ Ingresa un día válido (1-31)');
      return;
    }

    setLoading(true);
    setIsSearching(true);
    setSuggestionsVisible(false);

    try {
      console.log(`🔍 Buscando clientes con pago el día ${diaNumero}...`);
      
      if (clienteEspecifico) {
        setClientesEncontrados([clienteEspecifico]);
        setClientesFiltradosPorDia([clienteEspecifico]);
        setIsSearchActive(true);
        mostrarExito(`✅ Mostrando: ${clienteEspecifico.nombre} ${clienteEspecifico.apellido}`);
        scrollToCliente(clienteEspecifico.id);
        return;
      }
      
      const clientesFiltrados = await SistemaPrestamosService.obtenerClientesPorDiaPago(diaNumero);
      
      console.log(`✅ Encontrados ${clientesFiltrados.length} clientes con pago el día ${diaNumero}`);
      
      setClientesEncontrados(clientesFiltrados);
      setClientesFiltradosPorDia(clientesFiltrados);
      setIsSearchActive(true);
      
      if (clientesFiltrados.length === 0) {
        mostrarExito(`ℹ️ No se encontraron clientes con pago el día ${diaNumero}`);
      } else {
        mostrarExito(`✅ ${clientesFiltrados.length} cliente(s) encontrado(s) con pago el día ${diaNumero}`);
      }
      
    } catch (error: any) {
      console.error('❌ Error al buscar clientes por día:', error);
      
      const filtradosLocales = clienteEspecifico 
        ? [clienteEspecifico]
        : clientes.filter(cliente => {
            const diaPago = cliente.diaPago || obtenerDiaPagoDesdeFecha(cliente.fechaProximoPago);
            return diaPago === diaNumero;
          });
      
      setClientesEncontrados(filtradosLocales);
      setClientesFiltradosPorDia(filtradosLocales);
      setIsSearchActive(true);
      
      if (filtradosLocales.length === 0) {
        mostrarError(`❌ No se encontraron clientes con pago el día ${diaNumero}`);
      } else {
        mostrarExito(`✅ ${filtradosLocales.length} cliente(s) encontrado(s) con pago el día ${diaNumero} (búsqueda local)`);
      }
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  // Función para limpiar búsqueda
  const limpiarBusquedaDia = () => {
    setSearchInput('');
    setClientSuggestions([]);
    setClientesEncontrados([]);
    setClientesFiltradosPorDia([]);
    setIsSearchActive(false);
    setIsSearching(false);
    setSuggestionsVisible(false);

    if (searchTimeout) {
      clearTimeout(searchTimeout);
      setSearchTimeout(null);
    }

    mostrarExito('✅ Mostrando todos los clientes');
  };

  // Cargar clientes al inicio
  useEffect(() => {
    const cargarClientes = async () => {
      try {
        setLoading(true);
        console.log('📂 Cargando clientes...');

        const clientesData = await SistemaPrestamosService.obtenerClientes();
        setClientes(clientesData);

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

  // Actualizar sugerencias cuando cambia el input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchInput.trim()) {
        generarSugerenciasClientes(searchInput);
      } else {
        setSuggestionsVisible(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchInput, clientes]);

  // Función para cargar historial de UN cliente específico
  const cargarHistorialCliente = async (clienteId: string) => {
    try {
      setHistorialesCargando(prev => ({ ...prev, [clienteId]: true }));
      console.log(`📂 Cargando historial para cliente ${clienteId}...`);

      const pagosCliente = await SistemaPrestamosService.obtenerPagosPorCliente(clienteId);

      setPagos(prev => ({
        ...prev,
        [clienteId]: pagosCliente
      }));

      console.log(`✅ Historial cargado: ${pagosCliente.length} pagos para cliente ${clienteId}`);
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
      await cargarHistorialCliente(clienteId);
    } else {
      setHistorialesAbiertos(prev => ({
        ...prev,
        [clienteId]: !estaAbierto
      }));
    }
  };

  // Filtrar clientes según búsqueda normal
  const clientesFiltrados = useMemo(() => {
    if (isSearchActive && clientesFiltradosPorDia.length > 0) {
      let filtered = [...clientesFiltradosPorDia];

      if (searchFilter !== 'todos') {
        filtered = filtered.filter(cliente => cliente.estado === searchFilter);
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        filtered = filtered.filter(cliente =>
          cliente.nombre.toLowerCase().includes(term) ||
          cliente.apellido.toLowerCase().includes(term) ||
          cliente.cedula.includes(term)
        );
      }

      return filtered;
    } else {
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
    }
  }, [clientes, clientesFiltradosPorDia, isSearchActive, searchTerm, searchFilter]);

  // Filtrar préstamos
  const prestamosFiltrados = useMemo(() => {
    if (isSearchActive && clientesFiltradosPorDia.length > 0) {
      let filtered = [...clientesFiltradosPorDia];

      if (searchFilterPrestamos !== 'todos') {
        filtered = filtered.filter(cliente => cliente.estado === searchFilterPrestamos);
      }

      if (searchTermPrestamos.trim()) {
        const term = searchTermPrestamos.toLowerCase().trim();
        filtered = filtered.filter(cliente =>
          cliente.nombre.toLowerCase().includes(term) ||
          cliente.apellido.toLowerCase().includes(term) ||
          cliente.cedula.includes(term)
        );
      }

      return filtered;
    } else {
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
    }
  }, [clientes, clientesFiltradosPorDia, isSearchActive, searchTermPrestamos, searchFilterPrestamos]);

  // Calcular preview del préstamo
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

  // Actualizar día de pago cuando cambia la fecha próxima
  useEffect(() => {
    if (formData.fechaProximoPago) {
      const diaPago = obtenerDiaPagoDesdeFecha(formData.fechaProximoPago);
      setFormData(prev => ({ ...prev, diaPago }));
    }
  }, [formData.fechaProximoPago]);

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
      diaPago: obtenerDiaPagoDesdeFecha(new Date().toISOString().split('T')[0]),
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
      diaPago: cliente.diaPago || obtenerDiaPagoDesdeFecha(cliente.fechaProximoPago || new Date().toISOString().split('T')[0]),
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
    // 🔥 CORREGIDO: Mantener todos los datos del cliente
    setClienteSeleccionado(cliente);

    if (!pagos[cliente.id]) {
      await cargarHistorialCliente(cliente.id);
    }

    const interesMensual = cliente.interesMensual || 0;
    const interesesAcumulados = cliente.interesesAcumulados || 0;

    // 🔥 CALCULAR PORCIÓN INICIAL DE 15 DÍAS USANDO LA NUEVA FUNCIÓN
    const porcion15Dias = calcularPorcionInteresesMensuales(interesMensual, 15);

    setFormAbonoIntereses({
      montoAbono: interesesAcumulados > 0 ? interesesAcumulados.toString() : porcion15Dias.toString(),
      tipo: 'interes',
      observaciones: interesesAcumulados > 0 ? 'Pago de intereses acumulados' : 'Pago de intereses por 15 días (50% del mes)',
      fechaAbono: new Date().toISOString().split('T')[0],
      tipoCalculo: interesesAcumulados > 0 ? 'acumulado' : 'diario',
      diasInteres: '15',
      tasaInteresDiaria: (calcularTasaDiaria(cliente.tasaInteres || 0) * 100).toFixed(4),
      montoCalculado: interesesAcumulados > 0 ? interesesAcumulados.toString() : porcion15Dias.toString()
    });

    setIsModalAbonoInteresesOpen(true);
  };

  const cerrarModalAbonoIntereses = () => {
    setIsModalAbonoInteresesOpen(false);
    setFormAbonoIntereses({
      montoAbono: '',
      tipo: 'interes',
      observaciones: '',
      fechaAbono: new Date().toISOString().split('T')[0],
      tipoCalculo: 'mensual',
      diasInteres: '30',
      tasaInteresDiaria: '',
      montoCalculado: ''
    });
  };

  const manejarCambioInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'fechaPrestamo' || name === 'fechaProximoPago') {
      const nuevaFecha = value;
      setFormData(prev => ({
        ...prev,
        [name]: nuevaFecha,
        ...(name === 'fechaProximoPago' ? { diaPago: obtenerDiaPagoDesdeFecha(nuevaFecha) } : {})
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Funciones CRUD
  const crearCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const fechaPrestamoFormateada = formatearFechaParaBackend(formData.fechaPrestamo);
      const fechaProximoPagoFormateada = formatearFechaParaBackend(formData.fechaProximoPago);

      const diaPago = obtenerDiaPagoDesdeFecha(fechaProximoPagoFormateada);
      console.log(`📅 Día de pago calculado: ${diaPago} de la fecha ${fechaProximoPagoFormateada}`);

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
        fechaPrestamo: fechaPrestamoFormateada,
        fechaProximoPago: fechaProximoPagoFormateada,
        diaPago: diaPago,
        observaciones: formData.observaciones
      });

      setClientes(prev => [nuevoCliente, ...prev]);
      mostrarExito('✅ Cliente y préstamo registrado exitosamente');
      cerrarModalCliente();

      setTimeout(async () => {
        try {
          const clientesActualizados = await SistemaPrestamosService.obtenerClientes();
          setClientes(clientesActualizados);
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

      const fechaProximoPagoFormateada = formatearFechaParaBackend(formEditar.fechaProximoPago || clienteSeleccionado.fechaProximoPago);
      const diaPago = obtenerDiaPagoDesdeFecha(fechaProximoPagoFormateada);

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
        fechaProximoPago: fechaProximoPagoFormateada,
        diaPago: diaPago,
        observaciones: formEditar.observaciones || '',
        saldoPendiente: saldoPendienteNuevo,
        interesesAcumulados: parseFloat(formEditar.interesesAcumulados) || clienteSeleccionado.interesesAcumulados || 0
      };

      const clienteActualizado = await SistemaPrestamosService.editarCliente(
        clienteSeleccionado.id,
        datosActualizados
      );

      setClientes(prev =>
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

  // 🔥 CORREGIDA: Registrar abono de intereses - CON ACTUALIZACIÓN CORRECTA
  const registrarAbonoIntereses = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clienteSeleccionado || !clienteSeleccionado.id) {
      console.error('❌ Cliente seleccionado inválido:', clienteSeleccionado);
      mostrarError('❌ Error: No hay cliente válido seleccionado');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const fechaAbonoReal = formAbonoIntereses.fechaAbono || new Date().toISOString().split('T')[0];
      const monto = parseFloat(formAbonoIntereses.montoAbono);
      
      if (!monto || monto <= 0) {
        mostrarError('❌ Ingresa un monto válido');
        setLoading(false);
        return;
      }

      // Preparar datos para el abono
      const abonoData = {
        clienteId: clienteSeleccionado.id,
        montoAbono: monto.toString(),
        tipo: 'intereses',
        observaciones: formAbonoIntereses.observaciones,
        fechaAbono: fechaAbonoReal
      };

      console.log('🔍 Enviando abono de intereses:', abonoData);

      // Usar el servicio existente para registrar abono
      const result = await SistemaPrestamosService.registrarAbonoIntereses(abonoData);

      if (!result.success) {
        throw new Error(result.error || 'Error al registrar abono');
      }

      console.log('✅ Abono registrado exitosamente:', result);

      // 🔥 CORREGIDO: Actualizar el estado local manteniendo todos los datos del cliente
      setClientes(prev =>
        prev.map(cliente => {
          if (cliente.id === clienteSeleccionado.id) {
            // Mantener todos los datos originales del cliente y solo actualizar los campos necesarios
            return {
              ...cliente, // 🔥 Esto mantiene nombre, apellido, cédula, teléfono, etc.
              saldoPendiente: result.data.prestamo?.saldoPendiente || cliente.saldoPendiente,
              interesesAcumulados: result.data.prestamo?.interesesAcumulados || cliente.interesesAcumulados,
              estado: result.data.prestamo?.estado || cliente.estado,
              fechaProximoPago: result.data.prestamo?.fechaProximoPago || cliente.fechaProximoPago
            };
          }
          return cliente;
        })
      );

      mostrarExito(`✅ Abono de intereses de ${formatearMoneda(monto)} registrado exitosamente`);
      
      // Cargar historial actualizado
      await cargarHistorialCliente(clienteSeleccionado.id);
      
      // Cerrar modal
      cerrarModalAbonoIntereses();

    } catch (err: any) {
      console.error('❌ Error completo en registrarAbonoIntereses:', err);
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

      const nuevoPago = await SistemaPrestamosService.registrarPago({
        clienteId: clienteSeleccionado.id,
        montoPagado: montoPagado,
        cuotaNumero: cuotaNumero,
        fechaPago: formPago.fechaPago,
        observaciones: formPago.observaciones
      });

      // 🔥 CORREGIDO: Actualizar cliente manteniendo todos los datos
      const clienteActualizado = await SistemaPrestamosService.obtenerClientePorId(clienteSeleccionado.id);

      setClientes(prev =>
        prev.map(cliente =>
          cliente.id === clienteSeleccionado.id ? clienteActualizado : cliente
        )
      );

      if (pagos[clienteSeleccionado.id]) {
        setPagos(prev => ({
          ...prev,
          [clienteSeleccionado.id]: [nuevoPago, ...(prev[clienteSeleccionado.id] || [])]
        }));
      }

      mostrarExito(`✅ Pago de ${formatearMoneda(montoPagado)} registrado exitosamente (Cuota ${cuotaNumero})`);
      cerrarModalPago();

    } catch (err: any) {
      console.error('❌ Error registrando pago:', err);
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

  // MODIFICADA: Eliminar cliente y todo su historial
  const eliminarCliente = async (clienteId: string) => {
    try {
      setLoading(true);

      await SistemaPrestamosService.eliminarCliente(clienteId);

      setClientes(prev => prev.filter(cliente => cliente.id !== clienteId));
      setClientesFiltradosPorDia(prev => prev.filter(cliente => cliente.id !== clienteId));

      // Limpiar todos los datos relacionados con este cliente
      setPagos(prev => {
        const { [clienteId]: _, ...rest } = prev;
        return rest;
      });

      setHistorialesAbiertos(prev => {
        const { [clienteId]: _, ...rest } = prev;
        return rest;
      });

      setHistorialesCargando(prev => {
        const { [clienteId]: _, ...rest } = prev;
        return rest;
      });

      mostrarExito('✅ Cliente y todo su historial eliminados exitosamente');

    } catch (err: any) {
      console.error('❌ Error al eliminar:', err);
      mostrarError('❌ ' + (err.message || 'Error al eliminar el cliente'));
      setLoading(false);
    }
  };

  const marcarEnMora = async (clienteId: string) => {
    try {
      setLoading(true);

      await SistemaPrestamosService.marcarEnMora(clienteId);

      setClientes(prev =>
        prev.map(cliente =>
          cliente.id === clienteId ? { ...cliente, estado: 'mora' } : cliente
        )
      );

      setClientesFiltradosPorDia(prev =>
        prev.map(cliente =>
          cliente.id === clienteId ? { ...cliente, estado: 'mora' } : cliente
        )
      );

      mostrarExito('✅ Cliente marcado en mora correctamente');

    } catch (err: any) {
      console.error('❌ Error detallado marcando en mora:', err);
      let mensajeError = err.message || 'Error al marcar en mora';
      throw new Error(mensajeError);
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

        {/* Buscador inteligente */}
        <div className="buscador-clientes-dia">
          <div className="search-input-with-suggestions">
            <div className="search-icon-container">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={handleSearchInputChange}
              onFocus={() => searchInput.trim() && setSuggestionsVisible(true)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  buscarClientesPorDiaPago(searchInput);
                  setSuggestionsVisible(false);
                }
              }}
              placeholder="Buscar por día de pago (ej: 15) o nombre..."
              className="search-day-input"
              maxLength={30}
            />

            {/* Mostrar spinner cuando está buscando */}
            {isSearching && (
              <div className="search-loading-spinner">
                <div className="spinner-small"></div>
              </div>
            )}

            {/* Botón de búsqueda */}
            <button
              className="btn-buscar-dia"
              onClick={() => {
                buscarClientesPorDiaPago(searchInput);
                setSuggestionsVisible(false);
              }}
              disabled={loading || isSearching}
            >
              {isSearching ? (
                <div className="spinner-small"></div>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              )}
            </button>

            {/* Botón de limpiar si hay búsqueda activa */}
            {(isSearchActive || searchInput) && (
              <button
                className="btn-limpiar-dia"
                onClick={limpiarBusquedaDia}
                disabled={loading || isSearching}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            )}

            {/* Sugerencias de CLIENTES */}
            {suggestionsVisible && clientSuggestions.length > 0 && (
              <div className="suggestions-dropdown client-suggestions">
                <div className="suggestions-header">
                  <span>Sugerencias</span>
                  <small>{clientSuggestions.length} sugerencia(s)</small>
                </div>
                {clientSuggestions.map((cliente) => (
                  <div
                    key={cliente.id}
                    className="suggestion-item client-suggestion"
                    onClick={() => seleccionarSugerencia(cliente)}
                  >
                    <div className="suggestion-icon cliente-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                      </svg>
                    </div>
                    <div className="suggestion-text">
                      <span className="suggestion-title">{cliente.nombre} {cliente.apellido}</span>
                      <span className="suggestion-subtitle">
                        <div>Cédula: {cliente.cedula}</div>
                        <div>Próximo pago: {formatearFecha(cliente.fechaProximoPago)}</div>
                        <div>Día de pago: {obtenerDiaPagoCliente(cliente)}</div>
                        <div>Monto: {formatearMoneda(cliente.montoPrestamo)}</div>
                      </span>
                    </div>
                    <div className="suggestion-action">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                      </svg>
                    </div>
                  </div>
                ))}
                <div className="suggestion-footer">
                  <button
                    className="btn-ver-todos"
                    onClick={() => {
                      buscarClientesPorDiaPago(searchInput);
                      setSuggestionsVisible(false);
                    }}
                  >
                    Buscar todos con día {searchInput}
                  </button>
                </div>
              </div>
            )}
          </div>
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

      {/* Indicador de búsqueda activa por día */}
      {isSearchActive && clientesFiltradosPorDia.length > 0 && (
        <div className="indicador-busqueda-activa">
          <div className="indicador-content">
            <div className="indicador-icono">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <div className="indicador-texto">
              <strong>Búsqueda activa por día de pago:</strong>
              Mostrando {clientesFiltradosPorDia.length} cliente(s) con pago el día {searchInput}
            </div>
            <button
              className="indicador-cerrar"
              onClick={limpiarBusquedaDia}
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
                    {isSearchActive
                      ? `${clientesFiltrados.length} encontrado(s) (día ${searchInput})`
                      : `${clientes.filter(c => c.estado === 'pendiente').length} pendientes`}
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
                        { value: 'todos', label: 'Todos', count: isSearchActive ? clientesFiltradosPorDia.length : clientes.length },
                        {
                          value: 'pendiente', label: 'Pendientes', count: isSearchActive
                            ? clientesFiltradosPorDia.filter(c => c.estado === 'pendiente').length
                            : clientes.filter(c => c.estado === 'pendiente').length
                        },
                        {
                          value: 'pagado', label: 'Pagados', count: isSearchActive
                            ? clientesFiltradosPorDia.filter(c => c.estado === 'pagado').length
                            : clientes.filter(c => c.estado === 'pagado').length
                        },
                        {
                          value: 'mora', label: 'En Mora', count: isSearchActive
                            ? clientesFiltradosPorDia.filter(c => c.estado === 'mora').length
                            : clientes.filter(c => c.estado === 'mora').length
                        }
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

              {isSearchActive && clientesFiltradosPorDia.length > 0 && (
                <div className="info-filtro-fecha">
                  <div className="icono-info-filtro">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <p>
                    <strong>Filtro activo por día de pago:</strong> Mostrando clientes con pago el día {searchInput}
                    <span className="clientes-destacados">
                      ({clientesFiltradosPorDia.length} cliente(s) encontrado(s))
                    </span>
                  </p>
                </div>
              )}

              {searchTerm && (
                <div className="searchResultsInfo">
                  <p>
                    Mostrando {clientesFiltrados.filter(c =>
                      searchFilter === 'todos' ? c.estado === 'pendiente' : c.estado === searchFilter
                    ).length} préstamo(s) pendiente(s)
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
                    const tienePrestamoEnFecha = clientesFiltradosPorDia.some(c => c.id === cliente.id);

                    return (
                      <div
                        key={cliente.id}
                        id={`cliente-${cliente.id}`}
                        className={`prestamoCard ${tienePrestamoEnFecha ? 'destacado-filtro' : ''}`}
                      >
                        {tienePrestamoEnFecha && (
                          <div className="badge-filtro-fecha">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            Pago el día {searchInput}
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
                              {tienePrestamoEnFecha && (
                                <div className="info-prestamo-fecha">
                                  <span className="monto-prestamo-filtro">
                                    <strong>Préstamo:</strong> {formatearMoneda(cliente.montoPrestamo)} - {cliente.numeroCuotas} cuotas
                                  </span>
                                  <span className="dia-pago-filtro">
                                    <strong>Día de pago:</strong> {obtenerDiaPagoCliente(cliente)}
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
                    {isSearchActive
                      ? `No hay clientes con pago el día ${searchInput}`
                      : searchFilter === 'todos'
                        ? 'No hay préstamos pendientes'
                        : `No hay préstamos con estado "${searchFilter}"`
                    }
                    {searchTerm && ` que coincidan con "${searchTerm}"`}
                  </p>
                  {(searchTerm || searchFilter !== 'todos' || isSearchActive) && (
                    <button
                      className="clearSearchButton"
                      onClick={() => {
                        setSearchTerm('');
                        setSearchFilter('todos');
                        if (isSearchActive) limpiarBusquedaDia();
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
                    {isSearchActive && clientesFiltradosPorDia.length > 0 && (
                      <span className="contador-filtro">
                        ({clientesFiltradosPorDia.length} con pago el día {searchInput})
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
                      placeholder="Buscar por nombre, cédula, teléfono..."
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

              {isSearchActive && clientesFiltradosPorDia.length > 0 && (
                <div className="info-filtro-fecha">
                  <div className="icono-info-filtro">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <p>
                    <strong>Filtro activo por día de pago:</strong> Mostrando clientes con pago el día {searchInput}
                    <span className="clientes-destacados">
                      ({clientesFiltradosPorDia.length} cliente(s) encontrado(s))
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
                    const tienePrestamoEnFecha = clientesFiltradosPorDia.some(c => c.id === cliente.id);
                    const historialAbierto = historialesAbiertos[cliente.id] || false;
                    const historialCargando = historialesCargando[cliente.id] || false;

                    return (
                      <div
                        key={cliente.id}
                        id={`cliente-${cliente.id}`}
                        className={`clienteCard ${tienePrestamoEnFecha ? 'destacado-filtro' : ''}`}
                      >
                        {tienePrestamoEnFecha && (
                          <div className="badge-filtro-fecha">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            Pago el día {searchInput}
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
                                  <span className="dia-pago">
                                    <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                    </svg>
                                    Día: {obtenerDiaPagoCliente(cliente)}
                                  </span>
                                </div>
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

                            {/* CONTENIDO DEL HISTORIAL - MODIFICADO: Solo fecha sin hora */}
                            {historialAbierto && (
                              <div className="historialContenido">
                                {pagosCliente.length > 0 ? (
                                  <div className="tablaHistorialCompleta">
                                    <table>
                                      <thead>
                                        <tr>
                                          <th>Cuota</th>
                                          <th>Fecha</th> {/* MODIFICADO: Cambiado de "Fecha Real" a "Fecha" */}
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
                                                    {/* MODIFICADO: Solo mostrar la fecha formateada */}
                                                    {formatearFecha(pago.fechaPago)}
                                                  </div>
                                                  {/* ELIMINADO: Div de hora-pago */}
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
                    {isSearchActive && clientesFiltradosPorDia.length > 0 && (
                      <span className="contador-filtro">
                        ({clientesFiltradosPorDia.length} con pago el día {searchInput})
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

              {isSearchActive && clientesFiltradosPorDia.length > 0 && (
                <div className="info-filtro-fecha">
                  <div className="icono-info-filtro">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <p>
                    <strong>Filtro activo por día de pago:</strong> Mostrando clientes con pago el día {searchInput}
                    <span className="clientes-destacados">
                      ({clientesFiltradosPorDia.length} cliente(s) encontrado(s))
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
                    const tienePrestamoEnFecha = clientesFiltradosPorDia.some(c => c.id === cliente.id);
                    const historialAbierto = historialesAbiertos[cliente.id] || false;
                    const historialCargando = historialesCargando[cliente.id] || false;

                    return (
                      <div
                        key={cliente.id}
                        id={`cliente-${cliente.id}`}
                        className={`prestamoDetalleCard ${tienePrestamoEnFecha ? 'destacado-filtro' : ''}`}
                      >
                        {tienePrestamoEnFecha && (
                          <div className="badge-filtro-fecha">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            Pago el día {searchInput}
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
                                  <span className="dia-pago">
                                    <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                    </svg>
                                    Día: {obtenerDiaPagoCliente(cliente)}
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

                      {/* HISTORIAL DE PAGOS - MODIFICADO: Solo fecha sin hora */}
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

                        {/* CONTENIDO DEL HISTORIAL */}
                        {historialAbierto && (
                          <div className="historialContenido">
                            {pagosCliente.length > 0 ? (
                              <div className="tablaHistorialCompleta">
                                <table>
                                  <thead>
                                    <tr>
                                      <th>Cuota</th>
                                      <th>Fecha</th> {/* MODIFICADO */}
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
                                                {/* MODIFICADO: Solo fecha */}
                                                {formatearFecha(pago.fechaPago)}
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
                    <div className="info-dia-pago">
                      <small>
                        <strong>Día de pago calculado:</strong> {formData.diaPago}
                      </small>
                      <small>
                        Este será el día del mes en que el cliente deberá pagar cada mes
                      </small>
                    </div>
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
              <div className="infoRow">
                <span>Día de Pago:</span>
                <strong>{obtenerDiaPagoCliente(clienteSeleccionado)}</strong>
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
                          <th>Fecha</th> {/* MODIFICADO */}
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
                              <td>{formatearFecha(pago.fechaPago)}</td> {/* MODIFICADO */}
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

    {/* Modal Editar Cliente */}
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
                        const diaPago = obtenerDiaPagoDesdeFecha(nuevaFecha);
                        setFormEditar({
                          ...formEditar,
                          fechaProximoPago: nuevaFecha,
                          diaPago: diaPago
                        });
                      }}
                      required
                      disabled={loading}
                    />
                    <div className="info-dia-pago">
                      <small>
                        <strong>Día de pago calculado:</strong> {formEditar.diaPago || obtenerDiaPagoDesdeFecha(formEditar.fechaProximoPago)}
                      </small>
                      <small>
                        Nota: La fecha de registro del préstamo se calculará como un mes antes de esta fecha
                      </small>
                    </div>
                  </div>

                  <div className="formGroup">
                    <label>Día de Pago (automático)</label>
                    <input
                      type="number"
                      name="diaPago"
                      value={formEditar.diaPago || obtenerDiaPagoDesdeFecha(formEditar.fechaProximoPago)}
                      readOnly
                      className="readonly-input"
                      disabled={loading}
                    />
                    <small className="help-text">
                      Este valor se calcula automáticamente desde la fecha de próximo pago
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

                            <div className="itemCalculo">
                              <span>Nuevo Día de Pago:</span>
                              <span>
                                {formEditar.diaPago || obtenerDiaPagoDesdeFecha(formEditar.fechaProximoPago || clienteSeleccionado.fechaProximoPago)}
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
                                    const fechaProx = new Date(formEditar.fechaProximoPago);
                                    fechaProx.setMonth(fechaProx.getMonth() - 1);

                                    const diaOriginal = new Date(formEditar.fechaProximoPago).getDate();
                                    const diaDespues = fechaProx.getDate();

                                    if (diaDespues < diaOriginal) {
                                      fechaProx.setDate(0);
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
                  <span className="label">Monto Prestado:</span>
                  <span className="value">{formatearMoneda(clienteSeleccionado.montoPrestamo)}</span>
                </div>
                <div className="info-item-abono">
                  <span className="label">Tasa de Interés Anual:</span>
                  <span className="value">{clienteSeleccionado.tasaInteres}%</span>
                </div>
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
              {/* Selección de tipo de cálculo */}
              <div className="seccion-tipo-calculo">
                <h3>Tipo de Cálculo de Intereses</h3>
                <div className="opciones-calculo-intereses">
                  <button
                    type="button"
                    className={`opcion-calculo ${formAbonoIntereses.tipoCalculo === 'mensual' ? 'active' : ''}`}
                    onClick={() => manejarCambioTipoCalculo('mensual')}
                  >
                    <div className="info-opcion">
                      <div className="icono-opcion">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                      </div>
                      <strong>Interés Mensual Completo</strong>
                      <p>Pago del interés correspondiente a 30 días</p>
                      <span className="monto-opcion">{formatearMoneda(clienteSeleccionado.interesMensual)}</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`opcion-calculo ${formAbonoIntereses.tipoCalculo === 'diario' ? 'active' : ''}`}
                    onClick={() => manejarCambioTipoCalculo('diario')}
                  >
                    <div className="info-opcion">
                      <div className="icono-opcion">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      </div>
                      <strong>Cálculo por Días</strong>
                      <p>Calcular intereses por días específicos</p>
                      <span className="texto-opcion">Personalizable</span>
                    </div>
                  </button>

                  {clienteSeleccionado.interesesAcumulados > 0 && (
                    <button
                      type="button"
                      className={`opcion-calculo ${formAbonoIntereses.tipoCalculo === 'acumulado' ? 'active' : ''}`}
                      onClick={() => manejarCambioTipoCalculo('acumulado')}
                    >
                      <div className="info-opcion">
                        <div className="icono-opcion">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                          </svg>
                        </div>
                        <strong>Intereses Acumulados</strong>
                        <p>Pago de intereses pendientes por mora</p>
                        <span className="monto-opcion text-danger">{formatearMoneda(clienteSeleccionado.interesesAcumulados)}</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* SECCIÓN PARA CÁLCULO POR DÍAS */}
              {formAbonoIntereses.tipoCalculo === 'diario' && (
                <div className="seccion-calculo-diario">
                  <h4>Cálculo por Días</h4>
                  <div className="info-calculo-diario">
                    <div className="item-info-calculo">
                      <span>Tasa de Interés Anual:</span>
                      <strong>{clienteSeleccionado.tasaInteres}%</strong>
                    </div>
                    <div className="item-info-calculo">
                      <span>Tasa Diaria Calculada:</span>
                      <strong>{(calcularTasaDiaria(clienteSeleccionado.tasaInteres) * 100).toFixed(4)}%</strong>
                    </div>
                    <div className="item-info-calculo">
                      <span>Monto Base:</span>
                      <strong>{formatearMoneda(clienteSeleccionado.montoPrestamo)}</strong>
                    </div>
                  </div>

                  <div className="form-row-abono">
                    <div className="form-group-abono">
                      <label>Número de Días</label>
                      <div className="input-con-botones">
                        <input
                          type="number"
                          value={formAbonoIntereses.diasInteres}
                          onChange={(e) => manejarCambioDiasInteres(e.target.value)}
                          placeholder="Días"
                          min="1"
                          max="30"
                          required
                          disabled={loading}
                          className="input-dias-interes"
                        />
                        <div className="botones-dias-rapidos">
                          <button 
                            type="button" 
                            className="btn-dia-rapido"
                            onClick={() => manejarCambioDiasInteres('7')}
                          >
                            7 días
                          </button>
                          <button 
                            type="button" 
                            className="btn-dia-rapido"
                            onClick={() => manejarCambioDiasInteres('15')}
                          >
                            15 días
                          </button>
                          <button 
                            type="button" 
                            className="btn-dia-rapido"
                            onClick={() => manejarCambioDiasInteres('30')}
                          >
                            30 días
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="form-group-abono">
                      <label>Intereses Calculados</label>
                      <div className="monto-calculado">
                        <strong className="monto-resultado">
                          {formatearMoneda(parseFloat(formAbonoIntereses.montoCalculado) || 0)}
                        </strong>
                        <small>
                          Cálculo proporcional: ({formatearMoneda(clienteSeleccionado.interesMensual)} ÷ 30) × {formAbonoIntereses.diasInteres} días
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                      {formAbonoIntereses.tipoCalculo === 'mensual' ? 'Intereses Mensuales' : 
                       formAbonoIntereses.tipoCalculo === 'diario' ? `Intereses por ${formAbonoIntereses.diasInteres} días` : 
                       'Intereses Acumulados'}
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
                  {formAbonoIntereses.tipoCalculo === 'diario' && (
                    <div className="item-resumen-abono">
                      <span>Detalle Cálculo:</span>
                      <small>
                        {formAbonoIntereses.diasInteres} días × {formatearMoneda(clienteSeleccionado.interesMensual / 30)} diarios
                      </small>
                    </div>
                  )}
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
  </div>
  );
}