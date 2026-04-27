const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// SQLite en memoria o archivo
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'database.sqlite',
});

// Validador de Matrícula Vehicular (formato LL-LL-NN)
const validarMatricula = (matricula) => {
  if (!matricula) return false;
  
  // Expresión regular: LL-LL-NN
  const regex = /^[A-Z]{2}-[A-Z]{2}-\d{2}$/;
  
  if (!regex.test(matricula)) return false;
  
  // Letras no permitidas: I, Ñ, O, Q
  const letrasProhibidas = ['I', 'Ñ', 'O', 'Q'];
  const letras = matricula.replace(/-/g, '').replace(/\d/g, '');
  
  for (let letra of letras) {
    if (letrasProhibidas.includes(letra)) return false;
  }
  
  return true;
};

// Modelo de Usuario con Matrícula Vehicular
const User = sequelize.define('User', {
  identidad: { 
    type: DataTypes.STRING, 
    unique: true, 
    allowNull: false,
    comment: 'Cédula o documento de identidad'
  },
  nombre: { 
    type: DataTypes.STRING,
    allowNull: false
  },
  matricula: { 
    type: DataTypes.STRING, 
    unique: true,
    allowNull: false,
    comment: 'Matrícula vehicular formato: LL-LL-NN',
    validate: {
      isValidMatricula(value) {
        if (!validarMatricula(value)) {
          throw new Error('Matrícula inválida. Formato esperado: LL-LL-NN. No use letras I, Ñ, O, Q');
        }
      }
    }
  },
  checkin: { 
    type: DataTypes.BOOLEAN, 
    default: false,
    comment: 'Estado de acceso al estacionamiento'
  },
  checkin_timestamp: { 
    type: DataTypes.DATE,
    comment: 'Fecha y hora del check-in'
  }
});

sequelize.sync();

// Endpoint para validar identidad y realizar check-in
app.post('/validar', async (req, res) => {
  try {
    const { identidad, nombre, matricula } = req.body;

    // Validaciones básicas
    if (!identidad || !nombre || !matricula) {
      return res.status(400).json({ 
        validado: false, 
        mensaje: 'Campos requeridos: identidad, nombre, matricula' 
      });
    }

    // Validar formato de matrícula
    if (!validarMatricula(matricula)) {
      return res.status(400).json({ 
        validado: false, 
        mensaje: 'Matrícula inválida. Formato esperado: LL-LL-NN'
      });
    }

    // Buscar por identidad
    let user = await User.findOne({ where: { identidad } });

    if (!user) {
      // Crear nuevo usuario
      user = await User.create({ identidad, nombre, matricula });
      return res.status(201).json({ 
        validado: true, 
        mensaje: 'Usuario registrado y acceso concedido',
        usuario: {
          identidad: user.identidad,
          nombre: user.nombre,
          matricula: user.matricula,
          checkin_timestamp: user.checkin_timestamp
        }
      });
    }

    // Usuario existe: validar matrícula coincida
    if (user.matricula !== matricula) {
      return res.status(403).json({ 
        validado: false, 
        mensaje: 'Matrícula no coincide con el registro. Acceso denegado.'
      });
    }

    // Validar que no haya realizado check-in
    if (user.checkin) {
      return res.status(403).json({ 
        validado: false, 
        mensaje: 'Usuario ya realizó check-in. No puede ingresar nuevamente.',
        usuario: {
          identidad: user.identidad,
          nombre: user.nombre,
          matricula: user.matricula,
          checkin_timestamp: user.checkin_timestamp
        }
      });
    }

    // Realizar check-in
    await user.update({ 
      checkin: true, 
      checkin_timestamp: new Date() 
    });

    res.json({ 
      validado: true, 
      mensaje: 'Check-in realizado, acceso al estacionamiento concedido',
      usuario: {
        identidad: user.identidad,
        nombre: user.nombre,
        matricula: user.matricula,
        checkin_timestamp: user.checkin_timestamp
      }
    });
  } catch (error) {
    res.status(500).json({ 
      validado: false,
      error: error.message 
    });
  }
});

// Endpoint GET para obtener estado del vehículo (para arquitectura original)
app.get('/validar/:identidad/:matricula', async (req, res) => {
  try {
    const { identidad, matricula } = req.params;
    
    if (!validarMatricula(matricula)) {
      return res.status(400).json({ 
        validado: false,
        mensaje: 'Matrícula inválida. Formato: LL-LL-NN'
      });
    }

    const user = await User.findOne({ 
      where: { identidad, matricula } 
    });

    if (!user) {
      return res.status(404).json({ 
        validado: false,
        mensaje: 'Usuario o matrícula no encontrados'
      });
    }

    if (user.checkin) {
      return res.status(403).json({ 
        validado: false,
        mensaje: 'Ya realizó check-in',
        usuario: {
          identidad: user.identidad,
          nombre: user.nombre,
          matricula: user.matricula
        }
      });
    }

    // Realizar check-in
    await user.update({ 
      checkin: true, 
      checkin_timestamp: new Date() 
    });

    res.json({ 
      validado: true,
      mensaje: 'Check-in realizado, acceso concedido',
      usuario: {
        identidad: user.identidad,
        nombre: user.nombre,
        matricula: user.matricula,
        checkin_timestamp: user.checkin_timestamp
      }
    });
  } catch (error) {
    res.status(500).json({ 
      validado: false,
      error: error.message 
    });
  }
});

// Endpoint para obtener estado de un vehículo
app.get('/estado/:identidad', async (req, res) => {
  try {
    const { identidad } = req.params;
    const user = await User.findOne({ where: { identidad } });
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ 
      identidad: user.identidad,
      nombre: user.nombre,
      matricula: user.matricula,
      checkin: user.checkin, 
      checkin_timestamp: user.checkin_timestamp 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para reset (limpiar check-in - utilitario de desarrollo)
app.post('/checkout/:identidad', async (req, res) => {
  try {
    const { identidad } = req.params;
    const user = await User.findOne({ where: { identidad } });
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await user.update({ 
      checkin: false,
      checkin_timestamp: null
    });

    res.json({ 
      mensaje: 'Check-out realizado',
      usuario: {
        identidad: user.identidad,
        nombre: user.nombre,
        matricula: user.matricula,
        checkin: user.checkin
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 Réplica ejecutándose en puerto ${PORT}`);
  console.log(`📍 URL base: http://localhost:${PORT}`);
  console.log(`📋 Formato matrícula: LL-LL-NN`);
});
