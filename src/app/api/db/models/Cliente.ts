import mongoose, { Schema, Document } from 'mongoose';

export interface ICliente extends Document {
  nombre: string;
  apellido: string;
  cedula: string;
  telefono: string;
  email?: string;
  direccion?: string;
  fechaRegistro: Date;
  estado: 'pendiente' | 'pagado' | 'mora';
  prestamosActivos: number;
}

const ClienteSchema: Schema = new Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true
  },
  apellido: {
    type: String,
    required: [true, 'El apellido es obligatorio'],
    trim: true
  },
  cedula: {
    type: String,
    required: [true, 'La cédula es obligatoria'],
    unique: true,
    trim: true
  },
  telefono: {
    type: String,
    required: [true, 'El teléfono es obligatorio'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  direccion: {
    type: String,
    trim: true
  },
  fechaRegistro: {
    type: Date,
    default: Date.now
  },
  estado: {
    type: String,
    enum: ['pendiente', 'pagado', 'mora'],
    default: 'pendiente'
  },
  prestamosActivos: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Índices para búsquedas rápidas
ClienteSchema.index({ nombre: 1, apellido: 1 });

export default mongoose.models.Cliente || mongoose.model<ICliente>('Cliente', ClienteSchema);