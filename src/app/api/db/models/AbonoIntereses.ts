import mongoose from 'mongoose';

const AbonoInteresesSchema = new mongoose.Schema({
  clienteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true
  },
  prestamoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prestamo',
    required: true
  },
  pagoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pago',
    required: true
  },
  montoAbono: {
    type: Number,
    required: true,
    min: 0
  },
  tipo: {
    type: String,
    required: true,
    enum: ['interes', 'capital', 'ambos', 'solo_intereses', 'solo_capital', 'intereses_mora']
  },
  abonoCapital: {
    type: Number,
    default: 0
  },
  abonoInteres: {
    type: Number,
    default: 0
  },
  abonoInteresesMora: {
    type: Number,
    default: 0
  },
  fechaAbono: {
    type: Date,
    default: Date.now
  },
  observaciones: {
    type: String,
    default: ''
  },
  saldoAnterior: {
    type: Number,
    default: 0
  },
  saldoNuevo: {
    type: Number,
    default: 0
  },
  interesesAnteriores: {
    type: Number,
    default: 0
  },
  interesesNuevos: {
    type: Number,
    default: 0
  },
  metodoPago: {
    type: String,
    default: 'Efectivo',
    enum: ['Efectivo', 'Transferencia', 'Tarjeta', 'Cheque']
  }
}, {
  timestamps: true // Crea automáticamente createdAt y updatedAt
});

// Crear índices para mejor rendimiento
AbonoInteresesSchema.index({ clienteId: 1 });
AbonoInteresesSchema.index({ fechaAbono: -1 });
AbonoInteresesSchema.index({ tipo: 1 });
AbonoInteresesSchema.index({ prestamoId: 1 });

// Verificar si el modelo ya existe para evitar sobrescribirlo
const AbonoIntereses = mongoose.models.AbonoIntereses || mongoose.model('AbonoIntereses', AbonoInteresesSchema);

export default AbonoIntereses;