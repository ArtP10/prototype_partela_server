/**
 * ═══════════════════════════════════════════════════════════════
 * DEMO DATA - Menu Items for Partela Restaurant
 * ═══════════════════════════════════════════════════════════════
 * 
 * Items realistas de un restaurante venezolano/internacional.
 * Cada item tiene nombre, descripción, categoría, precio y emoji.
 */

import { MenuItemTemplate } from '../models';

// ─────────────────────────────────────────────────────────────
// PLATOS / DISHES
// ─────────────────────────────────────────────────────────────

export const DISHES: MenuItemTemplate[] = [
    {
        name: 'Tequeños Artesanales',
        description: '8 unidades con salsa de ajo',
        category: 'dish',
        price: 18.50,
        emoji: '🧀'
    },
    {
        name: 'Arepa Reina Pepiada',
        description: 'Pollo, aguacate y mayonesa',
        category: 'dish',
        price: 22.00,
        emoji: '🫓'
    },
    {
        name: 'Pabellón Criollo',
        description: 'Carne mechada, caraotas, arroz y tajadas',
        category: 'dish',
        price: 35.00,
        emoji: '🍛'
    },
    {
        name: 'Cachapa con Queso',
        description: 'Cachapa tradicional con queso de mano',
        category: 'dish',
        price: 28.00,
        emoji: '🥞'
    },
    {
        name: 'Hamburguesa Gourmet',
        description: '200g de carne, bacon y queso cheddar',
        category: 'dish',
        price: 32.00,
        emoji: '🍔'
    },
    {
        name: 'Sushi Roll Especial',
        description: '8 piezas con salmón y aguacate',
        category: 'dish',
        price: 45.00,
        emoji: '🍣'
    },
    {
        name: 'Pizza Margherita',
        description: 'Tomate, mozzarella y albahaca',
        category: 'dish',
        price: 38.00,
        emoji: '🍕'
    },
    {
        name: 'Ensalada César',
        description: 'Lechuga, pollo, parmesano y crutones',
        category: 'dish',
        price: 24.00,
        emoji: '🥗'
    },
    {
        name: 'Empanadas de Carne',
        description: '3 unidades con guasacaca',
        category: 'dish',
        price: 15.00,
        emoji: '🥟'
    },
    {
        name: 'Pasta Carbonara',
        description: 'Espagueti con bacon, huevo y parmesano',
        category: 'dish',
        price: 29.00,
        emoji: '🍝'
    }
];

// ─────────────────────────────────────────────────────────────
// BEBIDAS / DRINKS
// ─────────────────────────────────────────────────────────────

export const DRINKS: MenuItemTemplate[] = [
    {
        name: 'Limonada de Panela',
        description: 'Refrescante y natural',
        category: 'drink',
        price: 8.00,
        emoji: '🍋'
    },
    {
        name: 'Cerveza Artesanal',
        description: 'IPA local 330ml',
        category: 'drink',
        price: 12.00,
        emoji: '🍺'
    },
    {
        name: 'Copa de Vino Tinto',
        description: 'Malbec argentino',
        category: 'drink',
        price: 18.00,
        emoji: '🍷'
    },
    {
        name: 'Café Espresso',
        description: 'Doble shot',
        category: 'drink',
        price: 6.00,
        emoji: '☕'
    },
    {
        name: 'Mojito Clásico',
        description: 'Ron, menta, limón y soda',
        category: 'drink',
        price: 15.00,
        emoji: '🍹'
    },
    {
        name: 'Agua Mineral',
        description: '500ml',
        category: 'drink',
        price: 4.00,
        emoji: '💧'
    },
    {
        name: 'Jugo de Parchita',
        description: 'Natural sin azúcar añadida',
        category: 'drink',
        price: 10.00,
        emoji: '🧃'
    },
    {
        name: 'Piña Colada',
        description: 'Ron, coco y piña',
        category: 'drink',
        price: 16.00,
        emoji: '🍍'
    },
    {
        name: 'Té Helado',
        description: 'Té negro con limón',
        category: 'drink',
        price: 7.00,
        emoji: '🧊'
    },
    {
        name: 'Sangría',
        description: 'Copa de sangría de la casa',
        category: 'drink',
        price: 14.00,
        emoji: '🍇'
    }
];

// ─────────────────────────────────────────────────────────────
// POSTRES / DESSERTS
// ─────────────────────────────────────────────────────────────

export const DESSERTS: MenuItemTemplate[] = [
    {
        name: 'Quesillo',
        description: 'Postre tradicional venezolano',
        category: 'dessert',
        price: 14.00,
        emoji: '🍮'
    },
    {
        name: 'Brownie con Helado',
        description: 'Chocolate belga con helado de vainilla',
        category: 'dessert',
        price: 16.00,
        emoji: '🍫'
    },
    {
        name: 'Tiramisú',
        description: 'Receta italiana original',
        category: 'dessert',
        price: 18.00,
        emoji: '🍰'
    },
    {
        name: 'Tres Leches',
        description: 'Bizcocho bañado en tres leches',
        category: 'dessert',
        price: 15.00,
        emoji: '🥛'
    },
    {
        name: 'Helado Artesanal',
        description: '2 bolas, sabor a elección',
        category: 'dessert',
        price: 12.00,
        emoji: '🍨'
    },
    {
        name: 'Cheesecake',
        description: 'New York style con frutos rojos',
        category: 'dessert',
        price: 17.00,
        emoji: '🧁'
    }
];

// ─────────────────────────────────────────────────────────────
// ALL MENU ITEMS
// ─────────────────────────────────────────────────────────────

export const ALL_MENU_ITEMS: MenuItemTemplate[] = [
    ...DISHES,
    ...DRINKS,
    ...DESSERTS
];

// ─────────────────────────────────────────────────────────────
// BANCOS VENEZOLANOS
// ─────────────────────────────────────────────────────────────

export const VENEZUELAN_BANKS = [
    'Banesco',
    'Mercantil',
    'Provincial',
    'Venezuela',
    'Banco del Tesoro',
    'Bicentenario',
    'BOD',
    'Exterior',
    'BNC',
    'Bancrecer',
    'Banco Plaza',
    'Banco Activo',
    'Banco Caroní',
    'Bancamiga'
];

// ─────────────────────────────────────────────────────────────
// CÓDIGOS DE TELÉFONO
// ─────────────────────────────────────────────────────────────

export const PHONE_CODES = [
    '0412',
    '0414',
    '0424',
    '0416',
    '0426'
];

// ─────────────────────────────────────────────────────────────
// TIPOS DE DOCUMENTO
// ─────────────────────────────────────────────────────────────

export const ID_TYPES = [
    { value: 'V', label: 'V' },
    { value: 'E', label: 'E' },
    { value: 'J', label: 'J' },
    { value: 'P', label: 'P' }
];
