// Datos de ejemplo del menú - Inspirado en Pizza Hut
const menuData = {
  pizzas: [
    {
      name: "Super Supreme",
      description: "Carne de res, pepperoni, jamón, pimiento, champiñones, aceitunas y cebolla",
      category: "pizzas",
      sizes: [
        { name: "Personal", price: 18.90 },
        { name: "Mediana", price: 29.90 },
        { name: "Familiar", price: 39.90 }
      ],
      customizations: [
        "Sin aceitunas",
        "Sin cebolla",
        "Extra queso",
        "Borde de queso",
        "Borde hot dog",
        "Masa delgada"
      ],
      imageUrl: "https://example.com/pizzas/super-supreme.jpg",
      isAvailable: true
    },
    {
      name: "Hawaiana",
      description: "Jamón y piña",
      category: "pizzas",
      sizes: [
        { name: "Personal", price: 15.90 },
        { name: "Mediana", price: 25.90 },
        { name: "Familiar", price: 35.90 }
      ],
      customizations: [
        "Sin piña",
        "Extra jamón",
        "Extra queso",
        "Borde de queso",
        "Masa delgada"
      ],
      imageUrl: "https://example.com/pizzas/hawaiana.jpg",
      isAvailable: true
    },
    {
      name: "Pepperoni",
      description: "Pepperoni y queso mozzarella",
      category: "pizzas",
      sizes: [
        { name: "Personal", price: 16.90 },
        { name: "Mediana", price: 26.90 },
        { name: "Familiar", price: 36.90 }
      ],
      customizations: [
        "Extra pepperoni",
        "Extra queso",
        "Borde de queso",
        "Borde hot dog",
        "Masa delgada"
      ],
      imageUrl: "https://example.com/pizzas/pepperoni.jpg",
      isAvailable: true
    },
    {
      name: "Americana",
      description: "Carne de res, tocino y jamón",
      category: "pizzas",
      sizes: [
        { name: "Personal", price: 17.90 },
        { name: "Mediana", price: 28.90 },
        { name: "Familiar", price: 38.90 }
      ],
      customizations: [
        "Sin tocino",
        "Extra carne",
        "Extra queso",
        "Borde de queso",
        "Masa delgada"
      ],
      imageUrl: "https://example.com/pizzas/americana.jpg",
      isAvailable: true
    },
    {
      name: "4 Quesos",
      description: "Mozzarella, parmesano, gouda y edam",
      category: "pizzas",
      sizes: [
        { name: "Personal", price: 19.90 },
        { name: "Mediana", price: 31.90 },
        { name: "Familiar", price: 41.90 }
      ],
      customizations: [
        "Borde de queso",
        "Masa delgada"
      ],
      imageUrl: "https://example.com/pizzas/4-quesos.jpg",
      isAvailable: true
    },
    {
      name: "Vegetariana",
      description: "Champiñones, pimiento, aceitunas, cebolla y tomate",
      category: "pizzas",
      sizes: [
        { name: "Personal", price: 16.90 },
        { name: "Mediana", price: 26.90 },
        { name: "Familiar", price: 36.90 }
      ],
      customizations: [
        "Sin aceitunas",
        "Sin cebolla",
        "Extra champiñones",
        "Extra queso",
        "Borde de queso",
        "Masa delgada"
      ],
      imageUrl: "https://example.com/pizzas/vegetariana.jpg",
      isAvailable: true
    }
  ],

  bebidas: [
    {
      name: "Coca Cola",
      description: "Refresco de cola",
      category: "bebidas",
      sizes: [
        { name: "500ml", price: 4.50 },
        { name: "1 Litro", price: 7.50 },
        { name: "1.5 Litros", price: 9.50 }
      ],
      customizations: [],
      imageUrl: "https://example.com/bebidas/coca-cola.jpg",
      isAvailable: true
    },
    {
      name: "Inca Kola",
      description: "Refresco de sabor original",
      category: "bebidas",
      sizes: [
        { name: "500ml", price: 4.50 },
        { name: "1 Litro", price: 7.50 },
        { name: "1.5 Litros", price: 9.50 }
      ],
      customizations: [],
      imageUrl: "https://example.com/bebidas/inca-kola.jpg",
      isAvailable: true
    },
    {
      name: "Sprite",
      description: "Refresco de lima-limón",
      category: "bebidas",
      sizes: [
        { name: "500ml", price: 4.50 },
        { name: "1 Litro", price: 7.50 }
      ],
      customizations: [],
      imageUrl: "https://example.com/bebidas/sprite.jpg",
      isAvailable: true
    },
    {
      name: "Agua Mineral San Luis",
      description: "Agua mineral sin gas",
      category: "bebidas",
      sizes: [
        { name: "625ml", price: 3.50 }
      ],
      customizations: [],
      imageUrl: "https://example.com/bebidas/agua.jpg",
      isAvailable: true
    }
  ],

  entradas: [
    {
      name: "Alitas Picantes",
      description: "8 alitas de pollo con salsa BBQ o picante",
      category: "entradas",
      sizes: [
        { name: "8 unidades", price: 18.90 },
        { name: "12 unidades", price: 26.90 }
      ],
      customizations: [
        "Salsa BBQ",
        "Salsa Picante",
        "Salsa Honey Mustard"
      ],
      imageUrl: "https://example.com/entradas/alitas.jpg",
      isAvailable: true
    },
    {
      name: "Pan al Ajo",
      description: "Pan con mantequilla de ajo gratinado",
      category: "entradas",
      sizes: [
        { name: "Porción", price: 8.90 }
      ],
      customizations: [
        "Extra queso"
      ],
      imageUrl: "https://example.com/entradas/pan-ajo.jpg",
      isAvailable: true
    },
    {
      name: "Tequeños",
      description: "6 tequeños de queso",
      category: "entradas",
      sizes: [
        { name: "6 unidades", price: 12.90 }
      ],
      customizations: [],
      imageUrl: "https://example.com/entradas/tequenos.jpg",
      isAvailable: true
    },
    {
      name: "Chicken Poppers",
      description: "Trozos de pollo empanizado",
      category: "entradas",
      sizes: [
        { name: "Porción", price: 15.90 }
      ],
      customizations: [
        "Salsa BBQ",
        "Salsa Ranch"
      ],
      imageUrl: "https://example.com/entradas/poppers.jpg",
      isAvailable: true
    }
  ],

  postres: [
    {
      name: "Brownie con Helado",
      description: "Brownie de chocolate caliente con helado de vainilla",
      category: "postres",
      sizes: [
        { name: "Personal", price: 10.90 }
      ],
      customizations: [
        "Con salsa de chocolate",
        "Con salsa de caramelo"
      ],
      imageUrl: "https://example.com/postres/brownie.jpg",
      isAvailable: true
    },
    {
      name: "Cheesecake",
      description: "Cheesecake de frutos rojos",
      category: "postres",
      sizes: [
        { name: "Porción", price: 12.90 }
      ],
      customizations: [],
      imageUrl: "https://example.com/postres/cheesecake.jpg",
      isAvailable: true
    },
    {
      name: "Helado Artesanal",
      description: "Helado artesanal - 2 bolas",
      category: "postres",
      sizes: [
        { name: "2 bolas", price: 8.90 },
        { name: "3 bolas", price: 12.90 }
      ],
      customizations: [
        "Sabor Vainilla",
        "Sabor Chocolate",
        "Sabor Fresa",
        "Sabor Lúcuma"
      ],
      imageUrl: "https://example.com/postres/helado.jpg",
      isAvailable: true
    }
  ],

  combos: [
    {
      name: "Combo Familiar",
      description: "Pizza Familiar + 1.5L Bebida + Pan al ajo",
      category: "combos",
      sizes: [
        { name: "Combo", price: 49.90 }
      ],
      customizations: [
        "Pizza Hawaiana",
        "Pizza Pepperoni",
        "Pizza Americana",
        "Coca Cola",
        "Inca Kola"
      ],
      imageUrl: "https://example.com/combos/familiar.jpg",
      isAvailable: true
    },
    {
      name: "Combo Personal",
      description: "Pizza Personal + Bebida 500ml",
      category: "combos",
      sizes: [
        { name: "Combo", price: 19.90 }
      ],
      customizations: [
        "Pizza Hawaiana",
        "Pizza Pepperoni",
        "Coca Cola",
        "Inca Kola",
        "Sprite"
      ],
      imageUrl: "https://example.com/combos/personal.jpg",
      isAvailable: true
    },
    {
      name: "Combo Fiesta",
      description: "2 Pizzas Medianas + 2 Bebidas 1L + Alitas",
      category: "combos",
      sizes: [
        { name: "Combo", price: 79.90 }
      ],
      customizations: [
        "Pizza Hawaiana",
        "Pizza Pepperoni",
        "Pizza Americana",
        "Pizza Super Supreme",
        "Coca Cola",
        "Inca Kola"
      ],
      imageUrl: "https://example.com/combos/fiesta.jpg",
      isAvailable: true
    }
  ]
};

module.exports = menuData;
