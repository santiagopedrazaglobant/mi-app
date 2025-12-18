import mongoose from 'mongoose';

const ClienteSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true
  },
  apellido: {
    type: String,
    required: [true, 'El apellido es requerido'],
    trim: true
  },
  cedula: {
    type: String,
    required: [true, 'La cédula es requerida'],
    unique: true,
    trim: true
  },
  telefono: {
    type: String,
    required: [true, 'El teléfono es requerido'],
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
  observaciones: {
    type: String,
    default: ''
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

// Índices para mejor rendimiento
ClienteSchema.index({ cedula: 1 });
ClienteSchema.index({ nombre: 1, apellido: 1 });
ClienteSchema.index({ estado: 1 });
ClienteSchema.index({ createdAt: -1 });

export default mongoose.models.Cliente || mongoose.model('Cliente', ClienteSchema);