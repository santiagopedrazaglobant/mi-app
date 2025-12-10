import mongoose, { Schema, Document } from 'mongoose';

export interface IPago extends Document {
  prestamo: mongoose.Types.ObjectId;
  cliente: mongoose.Types.ObjectId;
  fechaPago: Date;
  montoPagado: number;
  cuotaNumero: number;
  interesPagado: number;
  capitalPagado: number;
  valor4x1000Pagado: number;
  metodoPago: string;
  comprobante?: string;
  observaciones?: string;
}

const PagoSchema: Schema = new Schema({
  prestamo: {
    type: Schema.Types.ObjectId,
    ref: 'Prestamo',
    required: [true, 'El préstamo es obligatorio']
  },
  cliente: {
    type: Schema.Types.ObjectId,
    ref: 'Cliente',
    required: [true, 'El cliente es obligatorio']
  },
  fechaPago: {
    type: Date,
    default: Date.now
  },
  montoPagado: {
    type: Number,
    required: [true, 'El monto pagado es obligatorio'],
    min: [1, 'El monto debe ser mayor a 0']
  },
  cuotaNumero: {
    type: Number,
    required: [true, 'El número de cuota es obligatorio'],
    min: [1, 'El número de cuota debe ser al menos 1']
  },
  interesPagado: {
    type: Number,
    required: true,
    min: 0
  },
  capitalPagado: {
    type: Number,
    required: true,
    min: 0
  },
  valor4x1000Pagado: {
    type: Number,
    default: 0
  },
  metodoPago: {
    type: String,
    enum: ['Efectivo', 'Transferencia', 'Tarjeta', 'Cheque'],
    default: 'Efectivo'
  },
  comprobante: {
    type: String,
    trim: true
  },
  observaciones: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Índices para consultas rápidas
PagoSchema.index({ prestamo: 1, cuotaNumero: 1 });
PagoSchema.index({ cliente: 1, fechaPago: -1 });
PagoSchema.index({ fechaPago: -1 });

export default mongoose.models.Pago || mongoose.model<IPago>('Pago', PagoSchema);