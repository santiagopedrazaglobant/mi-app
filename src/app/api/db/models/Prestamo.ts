import mongoose from 'mongoose';

const PrestamoSchema = new mongoose.Schema({
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: [true, 'El cliente es requerido']
  },
  montoPrestamo: {
    type: Number,
    required: [true, 'El monto del préstamo es requerido'],
    min: [1, 'El monto debe ser mayor a 0']
  },
  tasaInteres: {
    type: Number,
    required: [true, 'La tasa de interés es requerida'],
    min: [0, 'La tasa de interés no puede ser negativa']
  },
  numeroCuotas: {
    type: Number,
    required: [true, 'El número de cuotas es requerido'],
    min: [1, 'Debe haber al menos 1 cuota']
  },
  fechaPrestamo: {
    type: Date,
    default: Date.now
  },
  fechaProximoPago: {
    type: Date,
    default: function() {
      const fecha = new Date(this.fechaPrestamo || Date.now());
      fecha.setDate(fecha.getDate() + 30); // 30 días después
      return fecha;
    }
  },
  observaciones: {
    type: String,
    default: ''
  },
  estado: {
    type: String,
    enum: ['pendiente', 'pagado', 'mora'],
    default: 'pendiente'
  },
  cuotasPagadas: {
    type: Number,
    default: 0
  },
  saldoPendiente: {
    type: Number,
    default: 0
  },
  totalIntereses: {
    type: Number,
    default: 0
  },
  total4x1000: {
    type: Number,
    default: 0
  },
  cuotaMensual: {
    type: Number,
    default: 0
  },
  capitalMensual: {
    type: Number,
    default: 0
  },
  interesMensual: {
    type: Number,
    default: 0
  },
  valor4x1000Mensual: {
    type: Number,
    default: 0
  },
  interesesAcumulados: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Índices para mejor rendimiento
PrestamoSchema.index({ cliente: 1 });
PrestamoSchema.index({ estado: 1 });
PrestamoSchema.index({ fechaProximoPago: 1 });
PrestamoSchema.index({ createdAt: -1 });

// Middleware para actualizar el cliente cuando se crea/elimina un préstamo
PrestamoSchema.post('save', async function(doc) {
  if (doc.estado === 'pendiente' || doc.estado === 'mora') {
    await mongoose.model('Cliente').findByIdAndUpdate(doc.cliente, {
      $inc: { prestamosActivos: 1 }
    });
  }
});

export default mongoose.models.Prestamo || mongoose.model('Prestamo', PrestamoSchema);