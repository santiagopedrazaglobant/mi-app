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
  estado: 'pendiente' | 'pagado' | 'mora';
  cuotasPagadas: number;
  saldoPendiente: number;
  totalIntereses: number;
  total4x1000: number;
  cuotaMensual: number;
  capitalMensual: number;
  interesMensual: number;
  valor4x1000Mensual: number;
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

// SERVICIO CONEXIÓN API REAL - SIMPLIFICADO
class SistemaPrestamosService {
  // Obtener todos los clientes con sus préstamos
  static async obtenerClientes(): Promise<Cliente[]> {
    try {
      const clientesResponse = await fetch('/api/clientes');
      if (!clientesResponse.ok) throw new Error('Error al obtener clientes');

      const clientesResult = await clientesResponse.json();
      const prestamosResponse = await fetch('/api/prestamos');
      if (!prestamosResponse.ok) throw new Error('Error al obtener préstamos');

      const prestamosResult = await prestamosResponse.json();

      if (clientesResult.success) {
        return clientesResult.data.map((clienteData: any) => {
          const prestamoCliente = prestamosResult.success
            ? prestamosResult.data.find((p: any) =>
              p.cliente && p.cliente._id === clienteData._id
            ) || prestamosResult.data.find((p: any) =>
              p.clienteId === clienteData._id
            )
            : null;

          if (prestamoCliente) {
            return {
              id: clienteData._id,
              nombre: clienteData.nombre,
              apellido: clienteData.apellido,
              cedula: clienteData.cedula,
              telefono: clienteData.telefono,
              email: clienteData.email || '',
              direccion: clienteData.direccion || '',
              montoPrestamo: prestamoCliente.montoPrestamo,
              tasaInteres: prestamoCliente.tasaInteres,
              numeroCuotas: prestamoCliente.numeroCuotas,
              fechaPrestamo: prestamoCliente.fechaPrestamo,
              estado: prestamoCliente.estado,
              cuotasPagadas: prestamoCliente.cuotasPagadas || 0,
              saldoPendiente: prestamoCliente.saldoPendiente || 0,
              totalIntereses: prestamoCliente.totalIntereses || 0,
              total4x1000: prestamoCliente.total4x1000 || 0,
              cuotaMensual: prestamoCliente.cuotaMensual || 0,
              capitalMensual: prestamoCliente.capitalMensual || 0,
              interesMensual: prestamoCliente.interesMensual || 0,
              valor4x1000Mensual: prestamoCliente.valor4x1000Mensual || 0
            };
          } else {
            return {
              id: clienteData._id,
              nombre: clienteData.nombre,
              apellido: clienteData.apellido,
              cedula: clienteData.cedula,
              telefono: clienteData.telefono, 
              email: clienteData.email || '',
              direccion: clienteData.direccion || '',
              montoPrestamo: 0,
              tasaInteres: 0,
              numeroCuotas: 0,
              fechaPrestamo: new Date().toISOString().split('T')[0],
              estado: 'pendiente',
              cuotasPagadas: 0,
              saldoPendiente: 0,
              totalIntereses: 0,
              total4x1000: 0,
              cuotaMensual: 0,
              capitalMensual: 0,
              interesMensual: 0,
              valor4x1000Mensual: 0
            };
          }
        });
      }

      return [];
    } catch (error) {
      console.error('Error fetching clientes:', error);
      return [];
    }
  }

  // Crear cliente y préstamo en un solo paso
  static async crearCliente(clienteData: any): Promise<Cliente> {
    try {
      console.log('📝 Creando cliente con datos:', clienteData);

      const clienteResponse = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: clienteData.nombre,
          apellido: clienteData.apellido,
          cedula: clienteData.cedula,
          telefono: clienteData.telefono,
          email: clienteData.email || '',
          direccion: clienteData.direccion || ''
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
        fechaPrestamo: clienteData.fechaPrestamo || new Date().toISOString().split('T')[0],
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
            method: 'DELETE'
          });
        } catch (e) {
          console.error('Error eliminando cliente fallido:', e);
        }

        throw new Error(errorData.error || 'Error al crear el préstamo');
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
        estado: nuevoPrestamo.estado,
        cuotasPagadas: nuevoPrestamo.cuotasPagadas || 0,
        saldoPendiente: nuevoPrestamo.saldoPendiente || calculo.totalPagar,
        totalIntereses: nuevoPrestamo.totalIntereses || calculo.totalIntereses,
        total4x1000: nuevoPrestamo.total4x1000 || calculo.total4x1000,
        cuotaMensual: nuevoPrestamo.cuotaMensual || calculo.cuotaMensual,
        capitalMensual: nuevoPrestamo.capitalMensual || calculo.capitalMensual,
        interesMensual: nuevoPrestamo.interesMensual || calculo.interesMensual,
        valor4x1000Mensual: nuevoPrestamo.valor4x1000Mensual || calculo.valor4x1000Mensual
      };

    } catch (error: any) {
      console.error('❌ Error creating cliente:', error);
      throw new Error(error.message || 'Error al crear cliente y préstamo');
    }
  }

  // Actualizar cliente (principalmente para préstamos)
  static async actualizarCliente(id: string, datosActualizados: Partial<Cliente>): Promise<Cliente> {
    try {
      const prestamosResponse = await fetch(`/api/prestamos?clienteId=${id}`);
      if (!prestamosResponse.ok) throw new Error('Error al buscar préstamo');

      const prestamosResult = await prestamosResponse.json();

      if (!prestamosResult.success || prestamosResult.data.length === 0) {
        throw new Error('No se encontró préstamo para actualizar');
      }

      const prestamoId = prestamosResult.data[0]._id;

      const response = await fetch(`/api/prestamos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: prestamoId,
          estado: datosActualizados.estado || 'pendiente',
          cuotasPagadas: datosActualizados.cuotasPagadas || 0,
          saldoPendiente: datosActualizados.saldoPendiente || 0
        })
      });

      if (!response.ok) throw new Error('Error al actualizar cliente/préstamo');

      const result = await response.json();
      const prestamoActualizado = result.data;

      const clienteResponse = await fetch(`/api/clientes?search=${prestamoActualizado.cliente?.cedula || ''}`);
      const clienteResult = await clienteResponse.json();
      const clienteData = clienteResult.success && clienteResult.data.length > 0
        ? clienteResult.data[0]
        : { nombre: '', apellido: '', cedula: '', telefono: '', email: '', direccion: '' };

      return {
        id,
        nombre: clienteData.nombre,
        apellido: clienteData.apellido,
        cedula: clienteData.cedula,
        telefono: clienteData.telefono,
        email: clienteData.email,
        direccion: clienteData.direccion,
        montoPrestamo: prestamoActualizado.montoPrestamo,
        tasaInteres: prestamoActualizado.tasaInteres,
        numeroCuotas: prestamoActualizado.numeroCuotas,
        fechaPrestamo: prestamoActualizado.fechaPrestamo,
        estado: prestamoActualizado.estado,
        cuotasPagadas: prestamoActualizado.cuotasPagadas,
        saldoPendiente: prestamoActualizado.saldoPendiente,
        totalIntereses: prestamoActualizado.totalIntereses,
        total4x1000: prestamoActualizado.total4x1000,
        cuotaMensual: prestamoActualizado.cuotaMensual,
        capitalMensual: prestamoActualizado.capitalMensual,
        interesMensual: prestamoActualizado.interesMensual,
        valor4x1000Mensual: prestamoActualizado.valor4x1000Mensual
      };

    } catch (error: any) {
      console.error('Error updating cliente:', error);
      throw error;
    }
  }

  // Eliminar cliente COMPLETAMENTE (con préstamos y pagos) - SIMPLIFICADO
  static async eliminarCliente(id: string): Promise<void> {
    try {
      console.log('🗑️ Eliminando cliente:', id);
      
      const response = await fetch(`/api/clientes?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          deleteAll: true // Siempre eliminar todo
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
      console.log('💵 Registrando pago:', pagoData);

      const prestamosResponse = await fetch(`/api/prestamos?clienteId=${pagoData.clienteId}`);
      if (!prestamosResponse.ok) throw new Error('Error al buscar préstamo');

      const prestamosResult = await prestamosResponse.json();
      if (!prestamosResult.success || prestamosResult.data.length === 0) {
        throw new Error('No se encontró préstamo para registrar pago');
      }

      const prestamo = prestamosResult.data[0];
      const prestamoId = prestamo._id;

      console.log('📊 Préstamo encontrado:', prestamo);

      const response = await fetch('/api/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prestamoId: prestamoId,
          montoPagado: pagoData.montoPagado,
          cuotaNumero: pagoData.cuotaNumero,
          fechaPago: pagoData.fechaPago || new Date().toISOString().split('T')[0]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Error en respuesta de pago:', errorData);
        throw new Error(errorData.error || 'Error al registrar pago');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al registrar pago');
      }

      const nuevoPago = result.data.pago;

      console.log('✅ Pago registrado:', nuevoPago);

      return {
        id: nuevoPago._id,
        clienteId: pagoData.clienteId,
        fechaPago: nuevoPago.fechaPago,
        montoPagado: nuevoPago.montoPagado,
        cuotaNumero: nuevoPago.cuotaNumero,
        interesPagado: nuevoPago.interesPagado,
        capitalPagado: nuevoPago.capitalPagado
      };

    } catch (error: any) {
      console.error('❌ Error creating pago:', error);
      throw error;
    }
  }

  // Obtener pagos por cliente
  static async obtenerPagosPorCliente(clienteId: string): Promise<Pago[]> {
    try {
      const prestamosResponse = await fetch(`/api/prestamos?clienteId=${clienteId}`);
      if (!prestamosResponse.ok) throw new Error('Error al buscar préstamo');

      const prestamosResult = await prestamosResponse.json();
      if (!prestamosResult.success || prestamosResult.data.length === 0) {
        return [];
      }

      const prestamoId = prestamosResult.data[0]._id;

      const response = await fetch(`/api/pagos?prestamoId=${prestamoId}`);
      if (!response.ok) throw new Error('Error al obtener pagos');

      const result = await response.json();

      if (result.success) {
        return result.data.map((pagoData: any) => ({
          id: pagoData._id,
          clienteId: clienteId,
          fechaPago: pagoData.fechaPago,
          montoPagado: pagoData.montoPagado,
          cuotaNumero: pagoData.cuotaNumero,
          interesPagado: pagoData.interesPagado,
          capitalPagado: pagoData.capitalPagado
        }));
      }

      return [];
    } catch (error) {
      console.error('Error fetching pagos:', error);
      return [];
    }
  }

  // Marcar cliente en mora
  static async marcarEnMora(clienteId: string): Promise<void> {
    try {
      console.log('🚨 Marcando cliente en mora:', clienteId);
      
      const response = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json' 
        },
        body: JSON.stringify({ 
          action: 'marcar-mora',
          clienteId 
        })
      });

      console.log('📡 Estado de la respuesta:', response.status, response.statusText);

      if (!response.ok) {
        try {
          const errorData = await response.json();
          console.error('❌ Error JSON:', errorData);
          throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
        } catch (jsonError) {
          const errorText = await response.text();
          console.error('❌ Error texto:', errorText.substring(0, 200));
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
      }

      const result = await response.json();
      console.log('✅ Resultado recibido:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Error al marcar en mora');
      }

      console.log('✅ Cliente marcado en mora exitosamente');
      return;

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
  });
  const [calculoPreview, setCalculoPreview] = useState<ReturnType<typeof calcularPrestamoDetallado> | null>(null);
  const [formPago, setFormPago] = useState({
    montoPagado: '',
    cuotaNumero: '',
  });
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [activeTab, setActiveTab] = useState('resumen');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [historialVisible, setHistorialVisible] = useState<string | null>(null);
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

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    try {
      setLoading(true);
      console.log('📂 Cargando clientes desde API...');
      const clientesData = await SistemaPrestamosService.obtenerClientes();
      console.log('✅ Clientes cargados:', clientesData);
      setClientes(clientesData);
    } catch (err: any) {
      mostrarError('Error al cargar los clientes: ' + err.message);
      console.error('❌ Error cargando clientes:', err);
    } finally {
      setLoading(false);
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
    });
    setCalculoPreview(null);
  };

  const cerrarModalCliente = () => setIsModalOpen(false);

  const abrirModalPago = async (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    setFormPago({
      montoPagado: cliente.cuotaMensual.toFixed(0),
      cuotaNumero: (cliente.cuotasPagadas + 1).toString(),
    });

    try {
      const pagosCliente = await SistemaPrestamosService.obtenerPagosPorCliente(cliente.id);
      setPagos(prev => {
        const otrosPagos = prev.filter(p => p.clienteId !== cliente.id);
        return [...pagosCliente, ...otrosPagos];
      });
    } catch (error) {
      console.error('Error al cargar pagos del cliente:', error);
    }

    setIsModalPagoOpen(true);
  };

  const cerrarModalPago = () => {
    setIsModalPagoOpen(false);
    setClienteSeleccionado(null);
  };

  const manejarCambioInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const crearCliente = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      console.log('🚀 Creando nuevo cliente...');
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
        fechaPrestamo: new Date().toISOString().split('T')[0],
      });

      console.log('🎉 Nuevo cliente creado:', nuevoCliente);

      setClientes(prev => [nuevoCliente, ...prev]);
      mostrarExito('✅ Cliente y préstamo registrado exitosamente');
      cerrarModalCliente();

      setTimeout(() => {
        cargarClientes();
      }, 1000);

    } catch (err: any) {
      mostrarError('❌ ' + (err.message || 'Error al crear el cliente'));
      console.error('Error creando cliente:', err);
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

      console.log('💰 Registrando pago para cliente:', clienteSeleccionado.id);

      const montoPagado = parseFloat(formPago.montoPagado);
      const cuotaNumero = parseInt(formPago.cuotaNumero);

      const nuevoPago = await SistemaPrestamosService.registrarPago({
        clienteId: clienteSeleccionado.id,
        montoPagado: montoPagado,
        cuotaNumero: cuotaNumero,
        fechaPago: new Date().toISOString().split('T')[0],
      });

      console.log('✅ Pago registrado:', nuevoPago);

      const cuotasPagadas = clienteSeleccionado.cuotasPagadas + 1;
      const saldoPendiente = Math.max(0, clienteSeleccionado.saldoPendiente - montoPagado);
      const estado = cuotasPagadas >= clienteSeleccionado.numeroCuotas ? 'pagado' : 'pendiente';

      const clienteActualizado = await SistemaPrestamosService.actualizarCliente(clienteSeleccionado.id, {
        cuotasPagadas,
        saldoPendiente,
        estado,
      });

      console.log('🔄 Cliente actualizado:', clienteActualizado);

      setClientes(prev =>
        prev.map(cliente =>
          cliente.id === clienteSeleccionado.id ? clienteActualizado : cliente
        )
      );

      setPagos(prev => [nuevoPago, ...prev]);
      mostrarExito(`✅ Pago de $${montoPagado.toLocaleString()} registrado exitosamente`);

      cerrarModalPago();

      setTimeout(() => {
        cargarClientes();
      }, 1000);

    } catch (err: any) {
      mostrarError('❌ ' + (err.message || 'Error al registrar el pago'));
      console.error('Error registrando pago:', err);
    } finally {
      setLoading(false);
    }
  };

  // Función SIMPLIFICADA para solicitar eliminación de cliente
  const solicitarEliminacionCliente = (cliente: Cliente) => {
    setConfirmAction({
      type: 'delete',
      clienteId: cliente.id,
      clienteNombre: `${cliente.nombre} ${cliente.apellido}`
    });
    setShowConfirmModal(true);
  };

  // Función para solicitar marcar en mora
  const solicitarMarcarMora = (cliente: Cliente) => {
    setConfirmAction({
      type: 'mora',
      clienteId: cliente.id,
      clienteNombre: `${cliente.nombre} ${cliente.apellido}`
    });
    setShowConfirmModal(true);
  };

  // Función para eliminar cliente
  const eliminarCliente = async (clienteId: string) => {
    try {
      setLoading(true);
      console.log('🗑️ Eliminando cliente:', clienteId);
      
      await SistemaPrestamosService.eliminarCliente(clienteId);
      
      setClientes(prev => prev.filter(cliente => cliente.id !== clienteId));
      setPagos(prev => prev.filter(pago => pago.clienteId !== clienteId));
      
      mostrarExito('✅ Cliente eliminado exitosamente');
      
      setTimeout(() => {
        cargarClientes();
      }, 1000);
      
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
      
      mostrarExito('✅ Cliente marcado en mora correctamente');
      
      setTimeout(() => {
        cargarClientes();
      }, 1000);
      
    } catch (err: any) {
      console.error('❌ Error detallado marcando en mora:', err);
      
      let mensajeError = '❌ ' + (err.message || 'Error al marcar en mora');
      
      if (err.message.includes('404')) {
        mensajeError = '❌ Cliente no encontrado. Por favor, recarga la página.';
      } else if (err.message.includes('500')) {
        mensajeError = '❌ Error del servidor. Intenta nuevamente.';
      } else if (err.message.includes('JSON')) {
        mensajeError = '❌ Error en la respuesta del servidor. Verifica que la API esté funcionando.';
      }
      
      mostrarError(mensajeError);
      
      cargarClientes();
    } finally {
      setLoading(false);
    }
  };

  // Función para manejar la confirmación SIMPLIFICADA
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

      setTimeout(() => {
        cargarClientes();
      }, 1000);

    } catch (err: any) {
      console.error('❌ Error en acción confirmada:', err);
      mostrarError('❌ ' + (err.message || 'Error al procesar la acción'));
      
      cargarClientes();
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

  const toggleHistorial = async (clienteId: string) => {
    if (historialVisible === clienteId) {
      setHistorialVisible(null);
    } else {
      setHistorialVisible(clienteId);
      try {
        const pagosCliente = await SistemaPrestamosService.obtenerPagosPorCliente(clienteId);
        setPagos(prev => {
          const otrosPagos = prev.filter(p => p.clienteId !== clienteId);
          return [...pagosCliente, ...otrosPagos];
        });
      } catch (error) {
        console.error('Error al cargar historial:', error);
      }
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

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
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

      {/* Modal de Confirmación SIMPLIFICADO */}
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
                          onClick={() => {
                            console.log('Filtro clickeado:', filter.value);
                            setSearchFilter(filter.value);
                          }}
                        >
                          {filter.label}
                          <span className="filterCount">{filter.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

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
                  ).map(cliente => (
                    <div key={cliente.id} className="prestamoCard">
                      <div className="prestamoInfo">
                        <div className="prestamoHeader">
                          <div className="icono-cliente">
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
                            <strong>Próxima:</strong> Cuota {cliente.cuotasPagadas + 1}
                          </span>
                        </div>
                      </div>

                      <div className="prestamoAcciones">
                        <button onClick={() => abrirModalPago(cliente)}>
                          Registrar Pago
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
                  ))}
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
                    const pagosCliente = pagos.filter(p => p.clienteId === cliente.id);

                    return (
                      <div key={cliente.id} className="clienteCard">
                        <div className="clienteInfo">
                          <div className="clienteHeader">
                            <div className={`icono-estado ${cliente.estado}`}>
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
                          </div>

                          <div className="historialCliente">
                            <div className="historialHeader">
                              <h4>Historial de Pagos</h4>
                              <button
                                onClick={() => toggleHistorial(cliente.id)}
                                className="toggleHistorial"
                              >
                                {historialVisible === cliente.id ? 'Ocultar' : 'Ver'} Historial
                                <svg className={`icon-arrow ${historialVisible === cliente.id ? 'rotate' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                              </button>
                            </div>

                            {historialVisible === cliente.id && (
                              <div className="historialContenido">
                                {pagosCliente.length > 0 ? (
                                  <div className="tablaHistorial">
                                    <div className="tablaHeader">
                                      <div className="columna">Cuota #</div>
                                      <div className="columna">Fecha</div>
                                      <div className="columna text-right">Capital</div>
                                      <div className="columna text-right">Interés</div>
                                      <div className="columna text-right">Total Pagado</div>
                                    </div>

                                    {pagosCliente.map((pago, index) => (
                                      <div key={pago.id} className={`filaPago ${index % 2 === 0 ? 'par' : ''}`}>
                                        <div className="columna">
                                          <strong>#{pago.cuotaNumero}</strong>
                                        </div>
                                        <div className="columna">
                                          {formatearFecha(pago.fechaPago)}
                                        </div>
                                        <div className="columna text-right">
                                          {formatearMoneda(pago.capitalPagado)}
                                        </div>
                                        <div className="columna text-right">
                                          {formatearMoneda(pago.interesPagado)}
                                        </div>
                                        <div className="columna text-right">
                                          <strong className="text-success">{formatearMoneda(pago.montoPagado)}</strong>
                                        </div>
                                      </div>
                                    ))}

                                    <div className="resumenPagos">
                                      <div className="infoResumen">
                                        <p className="label">Total pagado:</p>
                                        <p className="valor">{pagosCliente.length} cuotas</p>
                                      </div>
                                      <div className="infoResumen text-right">
                                        <p className="label">Total abonado:</p>
                                        <p className="valor total">
                                          {formatearMoneda(pagosCliente.reduce((sum, pago) => sum + pago.montoPagado, 0))}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="sinPagos">
                                    <div className="icono">
                                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                      </svg>
                                    </div>
                                    <p>No hay pagos registrados</p>
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
                <p>No hay clientes registrados</p>
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
                    const pagosCliente = pagos.filter(p => p.clienteId === cliente.id);

                    return (
                      <div key={cliente.id} className="prestamoDetalleCard">
                        <div className="prestamoHeader">
                          <div className="prestamoTitulo">
                            <div className={`icono-prestamo ${cliente.estado}`}>
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
                                  Fecha del préstamo: {formatearFecha(cliente.fechaPrestamo)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => abrirModalPago(cliente)}
                            disabled={cliente.estado === 'pagado'}
                            className="btn-pago-detalle"
                          >
                            Registrar Pago
                          </button>
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

                        <div className="seccionHistorial">
                          <div className="historialHeader">
                            <h4>Historial de Pagos</h4>
                            <div className="contadorPagos">
                              {pagosCliente.length} pagos registrados
                            </div>
                          </div>

                          {pagosCliente.length > 0 ? (
                            <div className="tablaHistorialCompleta">
                              <table>
                                <thead>
                                  <tr>
                                    <th>Cuota</th>
                                    <th>Fecha</th>
                                    <th>Capital</th>
                                    <th>Interés</th>
                                    <th>Total</th>
                                    <th>Estado</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {pagosCliente.map((pago) => (
                                    <tr key={pago.id}>
                                      <td><strong>#{pago.cuotaNumero}</strong></td>
                                      <td>{formatearFecha(pago.fechaPago)}</td>
                                      <td>{formatearMoneda(pago.capitalPagado)}</td>
                                      <td>{formatearMoneda(pago.interesPagado)}</td>
                                      <td><strong className="text-success">{formatearMoneda(pago.montoPagado)}</strong></td>
                                      <td>
                                        <span className="badgeEstado">Pagado</span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr>
                                    <td colSpan={4} className="text-right">
                                      <strong>Total pagado:</strong>
                                    </td>
                                    <td>
                                      <strong className="text-success">
                                        {formatearMoneda(pagosCliente.reduce((sum, pago) => sum + pago.montoPagado, 0))}
                                      </strong>
                                    </td>
                                    <td>
                                      <span className="badgeResumen">
                                        {pagosCliente.length} cuotas
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
                              <p className="subtitulo">Registra el primer pago para comenzar el historial</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p>No hay préstamos registrados</p>
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
              </div>

              <form onSubmit={registrarPago} className="pagoForm">
                <div className="formRow">
                  <div className="formGroup">
                    <p>Número de Cuota</p>
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
                    <p>Monto a Pagar</p>
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
                  {pagos.filter(p => p.clienteId === clienteSeleccionado.id).length > 0 ? (
                    <div className="tablaPagosModal">
                      <table>
                        <thead>
                          <tr>
                            <th>Cuota</th>
                            <th>Fecha</th>
                            <th>Capital</th>
                            <th>Interés</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagos.filter(p => p.clienteId === clienteSeleccionado.id).map((pago) => (
                            <tr key={pago.id}>
                              <td><strong>#{pago.cuotaNumero}</strong></td>
                              <td>{formatearFecha(pago.fechaPago)}</td>
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
    </div>
  );
}