const Product = require("../../models/Product");
const Supermarket = require("../../models/Supermarket");
const Category = require("../../models/Category");
const Review = require("../../models/Review");

const WEEK_DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function computeIsOpen(schedule) {
  if (!schedule) return false;
  const now = new Date();
  const dayKey = WEEK_DAYS[now.getDay()];
  const hours = schedule[dayKey];
  if (!hours || hours === "Fechado") return false;
  const match = hours.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
  if (!match) return false;
  const openMin = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  const closeMin = parseInt(match[3], 10) * 60 + parseInt(match[4], 10);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin >= openMin && nowMin < closeMin;
}

async function approvedSupermarketIds() {
  const list = await Supermarket.find({ status: "approved" }).select("_id").lean();
  return list.map((s) => s._id);
}

/**
 * @swagger
 * /api/v1/catalog/products:
 *   get:
 *     summary: Listar produtos com pesquisa, filtros e ordenação
 *     tags: [Catalog]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Pesquisa por nome do produto (case-insensitive)
 *         example: leite
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: ID da categoria
 *       - in: query
 *         name: supermarket
 *         schema: { type: string }
 *         description: ID do supermercado
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [name_asc, price_asc, price_desc]
 *           default: name_asc
 *         description: Critério de ordenação
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1, minimum: 1 }
 *         description: Número da página (24 produtos por página)
 *     responses:
 *       200:
 *         description: Lista paginada de produtos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: Supermercado inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
async function getProducts(req, res, next) {
  try {
    const smIds = await approvedSupermarketIds();
    const { q = "", category = "", sort = "name_asc", supermarket = "", page = 1 } = req.query;
    const limit = 24;
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * limit;

    const filter = { isActive: true, stock: { $gt: 0 } };

    if (supermarket) {
      const isValid = smIds.some((id) => String(id) === String(supermarket));
      if (!isValid) return res.status(400).json({ message: "Supermercado inválido." });
      filter.supermarket = supermarket;
    } else {
      filter.supermarket = { $in: smIds };
    }

    if (q && String(q).trim()) {
      filter.name = { $regex: String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    }
    if (category) filter.category = category;

    let sortOpt = { name: 1 };
    if (sort === "price_asc") sortOpt = { price: 1 };
    if (sort === "price_desc") sortOpt = { price: -1 };

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("supermarket", "name isOpen location schedule")
        .populate("category", "name")
        .sort(sortOpt)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter)
    ]);

    const productsWithLiveStatus = products.map((p) => {
      if (p.supermarket) {
        p.supermarket = { ...p.supermarket, isOpen: computeIsOpen(p.supermarket.schedule) };
      }
      return p;
    });

    return res.status(200).json({
      products: productsWithLiveStatus,
      pagination: { total, page: parseInt(page, 10), limit, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @swagger
 * /api/v1/catalog/products/{id}:
 *   get:
 *     summary: Obter detalhe de um produto
 *     tags: [Catalog]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: ID do produto (MongoDB ObjectId)
 *         example: 665c222222222222222222
 *     responses:
 *       200:
 *         description: Produto encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Produto não encontrado ou supermercado não aprovado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
async function getProductById(req, res, next) {
  try {
    const smIds = await approvedSupermarketIds();
    const product = await Product.findOne({
      _id: req.params.id,
      supermarket: { $in: smIds },
      isActive: true
    })
      .populate("supermarket", "name isOpen location deliveryMethods schedule rating")
      .populate("category", "name")
      .lean();

    if (!product) return res.status(404).json({ message: "Produto não encontrado." });
    return res.status(200).json({ product });
  } catch (err) {
    next(err);
  }
}

/**
 * @swagger
 * /api/v1/catalog/categories:
 *   get:
 *     summary: Listar categorias ativas
 *     tags: [Catalog]
 *     responses:
 *       200:
 *         description: Lista de categorias ativas ordenadas por nome
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 categories:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 */
async function getCategories(req, res, next) {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 }).lean();
    return res.status(200).json({ categories });
  } catch (err) {
    next(err);
  }
}

/**
 * @swagger
 * /api/v1/catalog/supermarkets:
 *   get:
 *     summary: Listar supermercados aprovados
 *     tags: [Catalog]
 *     responses:
 *       200:
 *         description: Lista de supermercados aprovados com estado de abertura calculado em tempo real
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 supermarkets:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Supermarket'
 */
async function getSupermarkets(req, res, next) {
  try {
    const supermarkets = await Supermarket.find({ status: "approved" })
      .select("name description location isOpen schedule rating deliveryMethods logoImage")
      .sort({ name: 1 })
      .lean();
    const result = supermarkets.map((sm) => ({ ...sm, isOpen: computeIsOpen(sm.schedule) }));
    return res.status(200).json({ supermarkets: result });
  } catch (err) {
    next(err);
  }
}

/**
 * @swagger
 * /api/v1/catalog/supermarkets/{id}:
 *   get:
 *     summary: Obter detalhe de um supermercado aprovado
 *     tags: [Catalog]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: ID do supermercado (MongoDB ObjectId)
 *         example: 665b111111111111111111
 *     responses:
 *       200:
 *         description: Supermercado encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 supermarket:
 *                   $ref: '#/components/schemas/Supermarket'
 *       404:
 *         description: Supermercado não encontrado ou não aprovado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
async function getSupermarketById(req, res, next) {
  try {
    const supermarket = await Supermarket.findOne({ _id: req.params.id, status: "approved" })
      .select("name description location isOpen schedule rating deliveryMethods logoImage")
      .lean();
    if (!supermarket) return res.status(404).json({ message: "Supermercado não encontrado." });
    return res.status(200).json({ supermarket: { ...supermarket, isOpen: computeIsOpen(supermarket.schedule) } });
  } catch (err) {
    next(err);
  }
}

/**
 * @swagger
 * /api/v1/catalog/supermarkets/{id}/reviews:
 *   get:
 *     summary: Listar avaliações visíveis de um supermercado
 *     tags: [Catalog]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: ID do supermercado
 *         example: 665b111111111111111111
 *     responses:
 *       200:
 *         description: Lista de avaliações (máx. 50, ordenadas da mais recente para a mais antiga)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reviews:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Review'
 */
async function getReviews(req, res, next) {
  try {
    const reviews = await Review.find({
      targetType: "supermarket",
      targetId: req.params.id,
      isVisible: true
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return res.status(200).json({ reviews });
  } catch (err) {
    next(err);
  }
}

/**
 * @swagger
 * /api/v1/catalog/compare:
 *   get:
 *     summary: Comparar preços do mesmo produto entre supermercados
 *     tags: [Catalog]
 *     parameters:
 *       - in: query
 *         name: name
 *         required: true
 *         schema: { type: string }
 *         description: Nome (ou parte do nome) do produto a comparar
 *         example: leite
 *     responses:
 *       200:
 *         description: Lista de produtos com o nome indicado, ordenados por preço crescente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 searchName:
 *                   type: string
 *                   example: leite
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *       400:
 *         description: Parâmetro name em falta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
async function compareProducts(req, res, next) {
  try {
    const nameQuery = String(req.query.name || "").trim();
    if (!nameQuery) return res.status(400).json({ message: "Indica o nome de um produto para comparar." });

    const smIds = await approvedSupermarketIds();
    const products = await Product.find({
      supermarket: { $in: smIds },
      isActive: true,
      stock: { $gt: 0 },
      name: { $regex: nameQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" }
    })
      .populate("supermarket", "name location isOpen")
      .populate("category", "name")
      .sort({ price: 1 })
      .lean();

    return res.status(200).json({ searchName: nameQuery, results: products });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProducts, getProductById, getCategories, getSupermarkets, getSupermarketById, compareProducts, getReviews };
