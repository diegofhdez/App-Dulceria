-- Script de inicialización de Supabase para Bite

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla: productos
CREATE TABLE IF NOT EXISTS productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_barras VARCHAR UNIQUE NOT NULL,
    nombre VARCHAR NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    precio_costo DECIMAL(10, 2) NOT NULL,
    precio_venta DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: clientes
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR NOT NULL,
    telefono VARCHAR,
    deuda_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: movimientos
CREATE TABLE IF NOT EXISTS movimientos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,
    cantidad INT NOT NULL,
    tipo_movimiento VARCHAR NOT NULL CHECK (tipo_movimiento IN ('surtido_matutino', 'venta')),
    ganancia_neta DECIMAL(10, 2),
    metodo_pago VARCHAR CHECK (metodo_pago IN ('efectivo', 'pendiente', 'n/a')),
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: abonos (Para registrar pagos de deudas)
CREATE TABLE IF NOT EXISTS abonos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    cantidad DECIMAL(10, 2) NOT NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
