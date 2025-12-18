import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise;

if (!process.env.MONGODB_URI) {
  throw new Error('Por favor define MONGODB_URI en el archivo .env.local');
}

if (process.env.NODE_ENV === 'development') {
  // En desarrollo, usa una variable global para preservar el cliente
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // En producción, crea un nuevo cliente
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Función para conectar a la base de datos
export async function connectToDatabase() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DATABASE_NAME || 'prestamos_db');
    
    // 🔥 NUEVO: Asegurar que existan las colecciones necesarias
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);
    
    // Crear colección de abonos_intereses si no existe
    if (!collectionNames.includes('abonos_intereses')) {
      await db.createCollection('abonos_intereses');
      console.log('✅ Colección abonos_intereses creada');
    }
    
    // Crear índices para mejor rendimiento
    await db.collection('abonos_intereses').createIndex({ clienteId: 1 });
    await db.collection('abonos_intereses').createIndex({ fechaAbono: -1 });
    await db.collection('abonos_intereses').createIndex({ createdAt: -1 });
    
    return { client, db };
  } catch (error) {
    console.error('Error conectando a la base de datos:', error);
    throw error;
  }
}

export default clientPromise;