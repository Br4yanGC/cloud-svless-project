const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../utils/auth');
const { success, error } = require('../utils/response');
const {
  createProduct,
  getProductById,
  listAllProducts,
  listProductsByCategory,
  updateProduct,
  deleteProduct
} = require('../utils/dynamodb');

// Categorías válidas
const CATEGORIES = ['pizzas', 'bebidas', 'entradas', 'postres', 'combos'];

// Lambda: Listar productos del menú
module.exports.list = async (event) => {
  try {
    const { category, available } = event.queryStringParameters || {};

    let products;

    if (category) {
      if (!CATEGORIES.includes(category)) {
        return error(400, `Categoría inválida. Debe ser una de: ${CATEGORIES.join(', ')}`);
      }
      products = await listProductsByCategory(category);
    } else {
      products = await listAllProducts();
    }

    // Filtrar por disponibilidad si se solicita
    if (available === 'true') {
      products = products.filter(p => p.isAvailable === true);
    }

    return success({
      products: products || [],
      count: products ? products.length : 0
    });

  } catch (err) {
    console.error('Error listando productos:', err);
    return error(500, 'Error interno del servidor');
  }
};

// Lambda: Obtener producto por ID
module.exports.getById = async (event) => {
  try {
    const { id } = event.pathParameters;

    const product = await getProductById(id);
    
    if (!product) {
      return error(404, 'Producto no encontrado');
    }

    return success({ product });

  } catch (err) {
    console.error('Error obteniendo producto:', err);
    return error(500, 'Error interno del servidor');
  }
};

// Lambda: Crear producto (solo admin)
module.exports.create = async (event) => {
  try {
    // Solo admin puede crear productos
    const auth = await requireAuth(event, ['admin']);
    if (!auth.authenticated) {
      return error(401, auth.error);
    }

    const body = JSON.parse(event.body);
    const { name, description, category, sizes, customizations, imageUrl } = body;

    // Validación
    if (!name || !category) {
      return error(400, 'Nombre y categoría son requeridos');
    }

    if (!CATEGORIES.includes(category)) {
      return error(400, `Categoría inválida. Debe ser una de: ${CATEGORIES.join(', ')}`);
    }

    if (!sizes || !Array.isArray(sizes) || sizes.length === 0) {
      return error(400, 'Debe incluir al menos un tamaño con precio');
    }

    // Validar que cada tamaño tenga name y price
    for (const size of sizes) {
      if (!size.name || !size.price || typeof size.price !== 'number') {
        return error(400, 'Cada tamaño debe tener "name" (string) y "price" (número)');
      }
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    
    const product = {
      id,
      name,
      description: description || '',
      category,
      sizes,
      customizations: customizations || [],
      imageUrl: imageUrl || '',
      isAvailable: true,
      createdAt: now,
      updatedAt: now,
      createdBy: auth.user.id,
      createdByName: auth.user.name
    };

    await createProduct(product);

    return success({
      message: 'Producto creado exitosamente',
      product
    }, 201);

  } catch (err) {
    console.error('Error creando producto:', err);
    return error(500, 'Error interno del servidor');
  }
};

// Lambda: Actualizar producto (solo admin)
module.exports.update = async (event) => {
  try {
    const auth = await requireAuth(event, ['admin']);
    if (!auth.authenticated) {
      return error(401, auth.error);
    }

    const { id } = event.pathParameters;
    const body = JSON.parse(event.body);

    const existingProduct = await getProductById(id);
    
    if (!existingProduct) {
      return error(404, 'Producto no encontrado');
    }

    // Campos actualizables
    const { name, description, category, sizes, customizations, imageUrl, isAvailable } = body;

    // Validar categoría si se proporciona
    if (category && !CATEGORIES.includes(category)) {
      return error(400, `Categoría inválida. Debe ser una de: ${CATEGORIES.join(', ')}`);
    }

    // Validar sizes si se proporcionan
    if (sizes) {
      if (!Array.isArray(sizes) || sizes.length === 0) {
        return error(400, 'Sizes debe ser un array con al menos un elemento');
      }
      for (const size of sizes) {
        if (!size.name || !size.price || typeof size.price !== 'number') {
          return error(400, 'Cada tamaño debe tener "name" (string) y "price" (número)');
        }
      }
    }

    const updatedProduct = {
      ...existingProduct,
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(category && { category }),
      ...(sizes && { sizes }),
      ...(customizations !== undefined && { customizations }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(isAvailable !== undefined && { isAvailable }),
      updatedAt: new Date().toISOString(),
      updatedBy: auth.user.id,
      updatedByName: auth.user.name
    };

    await updateProduct(id, updatedProduct);

    return success({
      message: 'Producto actualizado exitosamente',
      product: updatedProduct
    });

  } catch (err) {
    console.error('Error actualizando producto:', err);
    return error(500, 'Error interno del servidor');
  }
};

// Lambda: Eliminar producto (solo admin)
module.exports.delete = async (event) => {
  try {
    const auth = await requireAuth(event, ['admin']);
    if (!auth.authenticated) {
      return error(401, auth.error);
    }

    const { id } = event.pathParameters;

    const product = await getProductById(id);
    
    if (!product) {
      return error(404, 'Producto no encontrado');
    }

    await deleteProduct(id);

    return success({
      message: 'Producto eliminado exitosamente',
      productId: id
    });

  } catch (err) {
    console.error('Error eliminando producto:', err);
    return error(500, 'Error interno del servidor');
  }
};

// Lambda: Toggle disponibilidad (solo admin)
module.exports.toggleAvailability = async (event) => {
  try {
    const auth = await requireAuth(event, ['admin']);
    if (!auth.authenticated) {
      return error(401, auth.error);
    }

    const { id } = event.pathParameters;

    const product = await getProductById(id);
    
    if (!product) {
      return error(404, 'Producto no encontrado');
    }

    product.isAvailable = !product.isAvailable;
    product.updatedAt = new Date().toISOString();
    product.updatedBy = auth.user.id;
    product.updatedByName = auth.user.name;

    await updateProduct(id, product);

    return success({
      message: `Producto ${product.isAvailable ? 'activado' : 'desactivado'} exitosamente`,
      product
    });

  } catch (err) {
    console.error('Error cambiando disponibilidad:', err);
    return error(500, 'Error interno del servidor');
  }
};
