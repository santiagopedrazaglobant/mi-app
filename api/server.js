const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Configuración de multer para imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'contact-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  }
});

// Modelo de Contacto
const contactSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'El apellido es requerido'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    unique: true,
    lowercase: true,
    trim: true
  },
  profileImage: {
    type: String,
    default: null
  },
  isFavorite: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Campo virtual para fullName
contactSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

const Contact = mongoose.model('Contact', contactSchema);

// Conexión a MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  }
}

connectDB();

// 📍 ENDPOINTS DE LA API

// 1. Obtener todos los contactos
app.get('/api/contacts', async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: contacts,
      count: contacts.length
    });
  } catch (error) {
    console.error('Error obteniendo contactos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los contactos'
    });
  }
});

// 2. Obtener un contacto por ID
app.get('/api/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de contacto inválido'
      });
    }
    
    const contact = await Contact.findById(id);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contacto no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: contact
    });
  } catch (error) {
    console.error('Error obteniendo contacto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el contacto'
    });
  }
});

// 3. Crear un nuevo contacto
app.post('/api/contacts', upload.single('profileImage'), async (req, res) => {
  try {
    const { firstName, lastName, email, isFavorite } = req.body;
    
    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, apellido y email son requeridos'
      });
    }
    
    let profileImage = null;
    if (req.file) {
      profileImage = `/uploads/${req.file.filename}`;
    }
    
    const newContact = new Contact({
      firstName,
      lastName,
      email,
      profileImage,
      isFavorite: isFavorite === 'true' || isFavorite === true
    });
    
    await newContact.save();
    
    res.status(201).json({
      success: true,
      message: 'Contacto creado exitosamente',
      data: newContact
    });
    
  } catch (error) {
    console.error('Error creando contacto:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al crear el contacto'
    });
  }
});

// 4. Actualizar un contacto
app.put('/api/contacts/:id', upload.single('profileImage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, isFavorite } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de contacto inválido'
      });
    }
    
    const existingContact = await Contact.findById(id);
    if (!existingContact) {
      return res.status(404).json({
        success: false,
        message: 'Contacto no encontrado'
      });
    }
    
    let profileImage = existingContact.profileImage;
    if (req.file) {
      if (profileImage && fs.existsSync('.' + profileImage)) {
        fs.unlinkSync('.' + profileImage);
      }
      profileImage = `/uploads/${req.file.filename}`;
    }
    
    const updateData = {
      firstName: firstName || existingContact.firstName,
      lastName: lastName || existingContact.lastName,
      email: email || existingContact.email,
      profileImage,
      isFavorite: isFavorite !== undefined ? (isFavorite === 'true' || isFavorite === true) : existingContact.isFavorite
    };
    
    const updatedContact = await Contact.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      message: 'Contacto actualizado exitosamente',
      data: updatedContact
    });
    
  } catch (error) {
    console.error('Error actualizando contacto:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado en otro contacto'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el contacto'
    });
  }
});

// 5. Eliminar un contacto
app.delete('/api/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de contacto inválido'
      });
    }
    
    const existingContact = await Contact.findById(id);
    if (!existingContact) {
      return res.status(404).json({
        success: false,
        message: 'Contacto no encontrado'
      });
    }
    
    if (existingContact.profileImage && fs.existsSync('.' + existingContact.profileImage)) {
      fs.unlinkSync('.' + existingContact.profileImage);
    }
    
    await Contact.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'Contacto eliminado exitosamente'
    });
    
  } catch (error) {
    console.error('Error eliminando contacto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el contacto'
    });
  }
});

// 6. Alternar estado de favorito
app.patch('/api/contacts/:id/favorite', async (req, res) => {
  try {
    const { id } = req.params;
    const { isFavorite } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de contacto inválido'
      });
    }
    
    if (isFavorite === undefined) {
      return res.status(400).json({
        success: false,
        message: 'El campo isFavorite es requerido'
      });
    }
    
    const updatedContact = await Contact.findByIdAndUpdate(
      id,
      { isFavorite: isFavorite === 'true' || isFavorite === true },
      { new: true }
    );
    
    if (!updatedContact) {
      return res.status(404).json({
        success: false,
        message: 'Contacto no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: `Contacto ${updatedContact.isFavorite ? 'agregado a' : 'removido de'} favoritos`,
      data: updatedContact
    });
    
  } catch (error) {
    console.error('Error actualizando favorito:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el estado de favorito'
    });
  }
});

// 7. Obtener solo contactos favoritos
app.get('/api/contacts/favorites', async (req, res) => {
  try {
    const favorites = await Contact.find({ isFavorite: true }).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: favorites,
      count: favorites.length
    });
  } catch (error) {
    console.error('Error obteniendo favoritos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los contactos favoritos'
    });
  }
});

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API de Contactos funcionando correctamente',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado'
  });
});

// Manejo de errores
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'La imagen es demasiado grande (máximo 5MB)'
      });
    }
  }
  
  if (error.message === 'Solo se permiten archivos de imagen') {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 API de Contactos corriendo en http://localhost:${PORT}`);
}); 