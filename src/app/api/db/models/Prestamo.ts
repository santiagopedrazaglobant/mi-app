import mongoose, { Schema, Document } from 'mongoose';

export interface IPrestamo extends Document {
  cliente: mongoose.Types.ObjectId;
  clienteData?: {
    nombre: string;
    apellido: string;
    cedula: string;
    telefono: string;
  };
  montoPrestamo: number;
  tasaInteres: number;
  numeroCuotas: number;
  fechaPrestamo: Date;
  fechaVencimiento?: Date;
  estado: 'pendiente' | 'pagado' | 'mora'; // CAMBIADO: mismos estados
  cuotasPagadas: number;
  saldoPendiente: number;
  totalIntereses: number;
  total4x1000: number;
  cuotaMensual: number;
  capitalMensual: number;
  interesMensual: number;
  valor4x1000Mensual: number;
  observaciones?: string;
}

const PrestamoSchema: Schema = new Schema({
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: [true, 'El cliente es obligatorio']
  },
  clienteData: {
    nombre: String,
    apellido: String,
    cedula: String,
    telefono: String
  },
  montoPrestamo: {
    type: Number,
    required: [true, 'El monto del préstamo es obligatorio'],
    min: [1, 'El monto debe ser mayor a 0']
  },
  tasaInteres: {
    type: Number,
    required: [true, 'La tasa de interés es obligatoria'],
    min: [0, 'La tasa de interés no puede ser negativa']
  },
  numeroCuotas: {
    type: Number,
    required: [true, 'El número de cuotas es obligatorio'],
    min: [1, 'Debe haber al menos una cuota']
  },
  fechaPrestamo: {
    type: Date,
    default: Date.now
  },
  fechaVencimiento: {
    type: Date
  },
  estado: {
    type: String,
    enum: {
      values: ['pendiente', 'pagado', 'mora'],
      message: '{VALUE} no es un estado válido. Estados permitidos: pendiente, pagado, mora'
    },
    default: 'pendiente' // CAMBIADO: por defecto 'pendiente'
  },
  cuotasPagadas: {
    type: Number,
    default: 0,
    min: 0
  },
  saldoPendiente: {
    type: Number,
    default: 0,
    min: 0
  },
  totalIntereses: {
    type: Number,
    default: 0,
    min: 0
  },
  total4x1000: {
    type: Number,
    default: 0,
    min: 0
  },
  cuotaMensual: {
    type: Number,
    required: [true, 'La cuota mensual es obligatoria'],
    min: [1, 'La cuota mensual debe ser mayor a 0']
  },
  capitalMensual: {
    type: Number,
    required: [true, 'El capital mensual es obligatorio'],
    min: [1, 'El capital mensual debe ser mayor a 0']
  },
  interesMensual: {
    type: Number,
    required: [true, 'El interés mensual es obligatorio'],
    min: [0, 'El interés mensual no puede ser negativo']
  },
  valor4x1000Mensual: {
    type: Number,
    required: [true, 'El valor 4x1000 mensual es obligatorio'],
    min: [0, 'El valor 4x1000 mensual no puede ser negativo']
  },
  observaciones: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// FORZAR LA ELIMINACIÓN DEL MODELO ANTES DE CREARLO NUEVO
if (mongoose.models.Prestamo) {
  delete mongoose.models.Prestamo;
}

// Índices para búsquedas rápidas
PrestamoSchema.index({ cliente: 1 });
PrestamoSchema.index({ estado: 1 });
PrestamoSchema.index({ fechaPrestamo: -1 });

// Crear el modelo directamente
const Prestamo = mongoose.model<IPrestamo>('Prestamo', PrestamoSchema);
export default Prestamo;