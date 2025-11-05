'use client';

import { useState, useEffect } from 'react';

// Interfaz para el contacto
interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isFavorite: boolean;
  profileImage?: string;
  fullName: string;
}

// Servicio para llamadas a la API
const API_BASE_URL = 'http://localhost:3001/api';

class ContactsService {
  static async getAllContacts(): Promise<Contact[]> {
    const response = await fetch(`${API_BASE_URL}/contacts`);
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  }

  static async createContact(contactData: Omit<Contact, 'id' | 'fullName'>): Promise<Contact> {
    const formData = new FormData();
    formData.append('firstName', contactData.firstName);
    formData.append('lastName', contactData.lastName);
    formData.append('email', contactData.email);
    formData.append('isFavorite', contactData.isFavorite.toString());
    
    if (contactData.profileImage instanceof File) {
      formData.append('profileImage', contactData.profileImage);
    }

    const response = await fetch(`${API_BASE_URL}/contacts`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  }

  static async deleteContact(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/contacts/${id}`, {
      method: 'DELETE',
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message);
  }

  static async toggleFavorite(id: string, isFavorite: boolean): Promise<Contact> {
    const response = await fetch(`${API_BASE_URL}/contacts/${id}/favorite`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isFavorite }),
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  }
}

export default function About() {
  // Estados
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    isFavorite: false,
    profileImage: null as File | null
  });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Cargar contactos al iniciar
  useEffect(() => {
    loadContacts();
  }, []);

  // Función para cargar contactos
  const loadContacts = async () => {
    try {
      setLoading(true);
      setError(null);
      const contactsData = await ContactsService.getAllContacts();
      setContacts(contactsData);
    } catch (err) {
      showError('Error al cargar los contactos');
      console.error('Error loading contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Función para mostrar errores
  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  // Función para mostrar mensajes de éxito
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Función para abrir/cerrar el modal
  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
    // Limpiar formulario y vista previa al cerrar
    if (!isModalOpen) {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        isFavorite: false,
        profileImage: null
      });
      setImagePreview(null);
      setError(null);
    }
  };

  // Función para manejar cambios en los inputs
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Función para manejar la carga de imagen
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        showError('Por favor selecciona un archivo de imagen válido');
        e.target.value = ''; // Limpiar el input
        return;
      }

      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showError('La imagen debe ser menor a 5MB');
        e.target.value = ''; // Limpiar el input
        return;
      }

      setFormData(prevData => ({
        ...prevData,
        profileImage: file
      }));

      // Crear vista previa
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Función para eliminar la imagen seleccionada
  const handleRemoveImage = () => {
    setFormData(prevData => ({
      ...prevData,
      profileImage: null
    }));
    setImagePreview(null);
  };

  // Función para enviar el formulario y crear contacto
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);

      const newContact = await ContactsService.createContact({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        isFavorite: formData.isFavorite,
        profileImage: formData.profileImage
      });

      // Actualizar la lista de contactos
      setContacts(prev => [newContact, ...prev]);
      
      // Mostrar mensaje de éxito
      showSuccess('Contacto creado exitosamente');
      
      // Cerrar modal y limpiar formulario
      toggleModal();
      
    } catch (err: any) {
      showError(err.message || 'Error al crear el contacto');
      console.error('Error creating contact:', err);
    } finally {
      setLoading(false);
    }
  };

  // Función para eliminar contacto
  const handleRemoveContact = async (contactId: string) => {
    // Reemplazar confirm con un modal personalizado
    if (!window.confirm('¿Estás seguro de que quieres eliminar este contacto?')) {
      return;
    }

    try {
      setLoading(true);
      await ContactsService.deleteContact(contactId);
      
      // Actualizar la lista local
      setContacts(prev => prev.filter(contact => contact.id !== contactId));
      
      // Mostrar mensaje de éxito
      showSuccess('Contacto eliminado exitosamente');
      
    } catch (err: any) {
      showError(err.message || 'Error al eliminar el contacto');
      console.error('Error deleting contact:', err);
    } finally {
      setLoading(false);
    }
  };

  // Función para quitar de favoritos
  const handleRemoveFromFavorites = async (contactId: string) => {
    try {
      setLoading(true);
      const updatedContact = await ContactsService.toggleFavorite(contactId, false);
      
      // Actualizar el contacto en la lista local
      setContacts(prev => 
        prev.map(contact => 
          contact.id === contactId ? updatedContact : contact
        )
      );
      
      // Mostrar mensaje de éxito
      showSuccess('Contacto removido de favoritos');
      
    } catch (err: any) {
      showError(err.message || 'Error al actualizar favoritos');
      console.error('Error updating favorite:', err);
    } finally {
      setLoading(false);
    }
  };

  // Función para alternar favorito
  const handleToggleFavorite = async (contactId: string) => {
    try {
      setLoading(true);
      const contact = contacts.find(c => c.id === contactId);
      if (!contact) return;

      const updatedContact = await ContactsService.toggleFavorite(contactId, !contact.isFavorite);
      
      // Actualizar el contacto en la lista local
      setContacts(prev => 
        prev.map(contact => 
          contact.id === contactId ? updatedContact : contact
        )
      );
      
      // Mostrar mensaje de éxito
      showSuccess(updatedContact.isFavorite ? 'Contacto agregado a favoritos' : 'Contacto removido de favoritos');
      
    } catch (err: any) {
      showError(err.message || 'Error al actualizar favoritos');
      console.error('Error toggling favorite:', err);
    } finally {
      setLoading(false);
    }
  };

  // Función para cambiar de pestaña
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  // Función para construir la URL completa de la imagen
  const getImageUrl = (imagePath: string | undefined) => {
    if (!imagePath) return "/img/user.jpg";
    
    // Si ya es una URL completa, devolverla tal cual
    if (imagePath.startsWith('http')) return imagePath;
    
    // Si es una ruta relativa, agregar la base URL de la API
    if (imagePath.startsWith('/uploads/')) {
      return `http://localhost:3001${imagePath}`;
    }
    
    return imagePath;
  };

  return (
    <>
      <header>
        <section className='sectionTop'>
          <img src="/img/globant.png" alt="Globant Logo" />
          <article className='optionsMain'>
            <h2 
              className={activeTab === 'overview' ? 'active' : ''} 
              onClick={() => handleTabChange('overview')}
            >
              Overview
            </h2>
            <h2 
              className={activeTab === 'contacts' ? 'active' : ''} 
              onClick={() => handleTabChange('contacts')}
            >
              Contacts
            </h2>
            <h2 
              className={activeTab === 'favorites' ? 'active' : ''} 
              onClick={() => handleTabChange('favorites')}
            >
              Favorites
            </h2>
            <button onClick={toggleModal} disabled={loading}>
              <p>+</p>
              <p>NEW</p>
            </button>
          </article>
        </section>
      </header>

      <main>
        {/* Mostrar mensaje de éxito */}
        {successMessage && (
          <div className="success-message" style={{
            background: '#4CAF50',
            color: 'white',
            padding: '10px',
            margin: '10px',
            borderRadius: '5px',
            textAlign: 'center',
            position: 'fixed',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            minWidth: '300px'
          }}>
            ✅ {successMessage}
          </div>
        )}

        {/* Mostrar error */}
        {error && (
          <div className="error-message" style={{
            background: '#ff4444',
            color: 'white',
            padding: '10px',
            margin: '10px',
            borderRadius: '5px',
            textAlign: 'center',
            position: 'fixed',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            minWidth: '300px'
          }}>
            ❌ {error}
          </div>
        )}

        {/* Mostrar loading */}
        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '20px',
            fontSize: '18px',
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(255,255,255,0.9)',
            borderRadius: '10px',
            padding: '20px',
            zIndex: 1000
          }}>
            Cargando...
          </div>
        )}

        {/* CONTENIDO CONDICIONAL SEGÚN LA PESTAÑA ACTIVA */}
        
        {/* PESTAÑA OVERVIEW - Muestra ambas secciones SIN DELETE */}
        {activeTab === 'overview' && (
          <>
            <section className='sectionFavorites'>
              <article className='articleTitleFavorites'>
                <h1>Favorites</h1>
              </article>
              <article className='articleContactsFavorites'>
                {contacts
                  .filter(contact => contact.isFavorite)
                  .map(contact => (
                    <div key={contact.id} className='caseFavorite'>
                      <img 
                        src={getImageUrl(contact.profileImage)} 
                        className={`main_img ${contact.isFavorite ? 'favorite-border' : ''}`}
                        alt={contact.fullName}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/img/user.jpg";
                        }}
                      />
                      <div className='contact-info'>
                        <h2>{contact.fullName}</h2>
                        <p>{contact.email}</p>
                      </div>
                      <div className='contact-actions'>
                        <button 
                          onClick={() => handleRemoveFromFavorites(contact.id)}
                          disabled={loading}
                        >
                          X REMOVE
                        </button>
                      </div>
                    </div>
                  ))
                }
                {contacts.filter(contact => contact.isFavorite).length === 0 && !loading && (
                  <p>No favorite contacts yet</p>
                )}
              </article>
            </section>

            <section className='sectionContactList'>
              <article className='articleTitleFavorites'>
                <h1>Contact List</h1>
              </article>
              <article className='articleContactList'>
                {contacts.map(contact => (
                  <div key={contact.id} className='caseContactList'>
                    <img 
                      src={getImageUrl(contact.profileImage)} 
                      className={`main_img ${contact.isFavorite ? 'favorite-border' : ''}`}
                      alt={contact.fullName}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/img/user.jpg";
                      }}
                    />
                    <div className='contact-info'>
                      <h2>{contact.fullName}</h2>
                      <p>{contact.email}</p>
                    </div>
                    <div className='contact-actions'>
                      <button 
                        onClick={() => handleToggleFavorite(contact.id)}
                        disabled={loading}
                        className="follow-btn"
                      >
                        <img
                          src="/img/follow.png"
                          className="follow_img"
                          alt={contact.isFavorite ? "Remove from favorites" : "Add to favorites"}
                        />
                      </button>
                    </div>
                  </div>
                ))}
                {contacts.length === 0 && !loading && (
                  <p>No contacts yet. Add your first contact!</p>
                )}
              </article>
            </section>
          </>
        )}

        {/* PESTAÑA CONTACTS - Solo muestra la lista de contactos CON DELETE */}
        {activeTab === 'contacts' && (
          <section className='sectionContactList'>
            <article className='articleTitleFavorites'>
              <h1>Contact List</h1>
            </article>
            <article className='articleContactList'>
              {contacts.map(contact => (
                <div key={contact.id} className='caseContactList'>
                  <img 
                    src={getImageUrl(contact.profileImage)} 
                    className={`main_img ${contact.isFavorite ? 'favorite-border' : ''}`}
                    alt={contact.fullName}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/img/user.jpg";
                    }}
                  />
                  <div className='contact-info'>
                    <h2>{contact.fullName}</h2>
                    <p>{contact.email}</p>
                  </div>
                  <div className='contact-actions'>
                    <button 
                      onClick={() => handleToggleFavorite(contact.id)}
                      disabled={loading}
                      className="follow-btn"
                    >
                      <img
                        src="/img/follow.png"
                        className="follow_img"
                        alt={contact.isFavorite ? "Remove from favorites" : "Add to favorites"}
                      />
                    </button>
                    <button 
                      onClick={() => handleRemoveContact(contact.id)}
                      disabled={loading}
                      className="delete-btn"
                    >
                      <img
                        src="/img/delete.png"
                        className="delete_img"
                        alt="Delete contact"
                      />
                    </button>
                  </div>
                </div>
              ))}
              {contacts.length === 0 && !loading && (
                <p>No contacts yet. Add your first contact!</p>
              )}
            </article>
          </section>
        )}

        {/* PESTAÑA FAVORITES - Solo muestra los favoritos SIN DELETE */}
        {activeTab === 'favorites' && (
          <section className='sectionFavorites'>
            <article className='articleTitleFavorites'>
              <h1>Favorites</h1>
            </article>
            <article className='articleContactsFavorites'>
              {contacts
                .filter(contact => contact.isFavorite)
                .map(contact => (
                  <div key={contact.id} className='caseFavorite'>
                    <img 
                      src={getImageUrl(contact.profileImage)} 
                      className={`main_img ${contact.isFavorite ? 'favorite-border' : ''}`}
                      alt={contact.fullName}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/img/user.jpg";
                      }}
                    />
                    <div className='contact-info'>
                      <h2>{contact.fullName}</h2>
                      <p>{contact.email}</p>
                    </div>
                    <div className='contact-actions'>
                      <button 
                        onClick={() => handleRemoveFromFavorites(contact.id)}
                        disabled={loading}
                      >
                        X REMOVE
                      </button>
                    </div>
                  </div>
                ))
              }
              {contacts.filter(contact => contact.isFavorite).length === 0 && !loading && (
                <p>No favorite contacts yet</p>
              )}
            </article>
          </section>
        )}

        {/* MODAL CON SCROLL */}
        {isModalOpen && (
          <div className="modalOverlay">
            <div className="modalContent">
              <div className="modalHeader">
                <h2>Add New Contact</h2>
                <button className="closeButton" onClick={toggleModal} disabled={loading}>×</button>
              </div>

              <div className="modalBody">
                <form onSubmit={handleSubmit} className="contactForm">
                  {/* Campo para cargar imagen */}
                  <div className="formGroup imageUploadGroup">
                    <label htmlFor="profileImage" className="imageUploadLabel">
                      {imagePreview ? (
                        <div className="imagePreviewContainer">
                          <img 
                            src={imagePreview} 
                            alt="Vista previa" 
                            className="imagePreview"
                          />
                          <button 
                            type="button" 
                            className="removeImageBtn"
                            onClick={handleRemoveImage}
                            disabled={loading}
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="imageUploadPlaceholder">
                          <span>+</span>
                          <p>Add Profile Image</p>
                        </div>
                      )}
                    </label>
                    <input
                      type="file"
                      id="profileImage"
                      name="profileImage"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="imageUploadInput"
                      disabled={loading}
                    />
                  </div>

                  <div className="formGroup">
                    <label htmlFor="firstName"></label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder='First name'
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="formGroup">
                    <label htmlFor="lastName"></label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder='Last name'
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="formGroup">
                    <label htmlFor="email"></label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder='Email'
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="formGroup checkboxGroup">
                    <label className="checkboxLabel">
                      <input
                        type="checkbox"
                        name="isFavorite"
                        checked={formData.isFavorite}
                        onChange={handleInputChange}
                        disabled={loading}
                      />
                      Enable like favorite
                      <span className="checkmark"></span>
                    </label>
                  </div>

                  <button type="submit" className="saveButton" disabled={loading}>
                    {loading ? 'SAVING...' : 'SAVE'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>


    </>
  );
}