const swaggerJsdoc = require("swagger-jsdoc");
const path = require("path");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Mercadinho Virtual API",
      version: "1.0.0",
      description: "REST API do frontoffice da plataforma Mercadinho Virtual — Marketplace de Supermercados Locais"
    },
    servers: [
      { url: "http://localhost:3000", description: "Servidor de desenvolvimento" }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Token JWT obtido em POST /api/v1/auth/login"
        }
      },
      schemas: {

        /* ── Utilitários ───────────────────────────────────────────── */

        ErrorResponse: {
          type: "object",
          properties: {
            message: { type: "string", example: "Descrição do erro." }
          }
        },

        SuccessMessage: {
          type: "object",
          properties: {
            message: { type: "string", example: "Operação realizada com sucesso." }
          }
        },

        Pagination: {
          type: "object",
          properties: {
            total:  { type: "integer", example: 120, description: "Total de registos" },
            page:   { type: "integer", example: 1,   description: "Página atual" },
            limit:  { type: "integer", example: 24,  description: "Registos por página" },
            pages:  { type: "integer", example: 5,   description: "Total de páginas" }
          }
        },

        /* ── Utilizador ────────────────────────────────────────────── */

        User: {
          type: "object",
          properties: {
            _id:     { type: "string", example: "665f1a2b3c4d5e6f78901234" },
            name:    { type: "string", example: "Maria Silva" },
            email:   { type: "string", example: "maria@email.com" },
            phone:   { type: "string", example: "912345678" },
            address: { type: "string", example: "Rua das Flores, 10, Porto" },
            role:    { type: "string", enum: ["client", "courier"], example: "client" }
          }
        },

        /* ── Categoria ─────────────────────────────────────────────── */

        Category: {
          type: "object",
          properties: {
            _id:      { type: "string", example: "665a000000000000000001" },
            name:     { type: "string", example: "Bebidas" },
            isActive: { type: "boolean", example: true }
          }
        },

        /* ── Supermercado ──────────────────────────────────────────── */

        DeliveryMethod: {
          type: "object",
          properties: {
            type:   { type: "string", enum: ["pickup", "courier"], example: "courier" },
            label:  { type: "string", example: "Entrega ao domicílio" },
            cost:   { type: "number", example: 2.50 },
            active: { type: "boolean", example: true }
          }
        },

        Rating: {
          type: "object",
          properties: {
            average: { type: "number", example: 4.3 },
            count:   { type: "integer", example: 17 }
          }
        },

        Supermarket: {
          type: "object",
          properties: {
            _id:         { type: "string", example: "665b111111111111111111" },
            name:        { type: "string", example: "Mercadinho do Bairro" },
            description: { type: "string", example: "Produtos frescos e locais." },
            location:    { type: "string", example: "Rua Central, 5, Porto" },
            isOpen:      { type: "boolean", example: true },
            schedule: {
              type: "object",
              description: "Horário semanal. Chaves: monday…sunday. Formato: 'HH:MM-HH:MM' ou 'Fechado'.",
              example: { monday: "09:00-19:00", saturday: "09:00-13:00", sunday: "Fechado" }
            },
            rating:          { "$ref": "#/components/schemas/Rating" },
            deliveryMethods: { type: "array", items: { "$ref": "#/components/schemas/DeliveryMethod" } },
            logoImage:       { type: "string", example: "logo_mercadinho.jpg" }
          }
        },

        /* ── Produto ───────────────────────────────────────────────── */

        Product: {
          type: "object",
          properties: {
            _id:         { type: "string", example: "665c222222222222222222" },
            name:        { type: "string", example: "Leite UHT 1L" },
            description: { type: "string", example: "Leite magro de longa duração." },
            price:       { type: "number", example: 0.89 },
            stock:       { type: "integer", example: 50 },
            image:       { type: "string", example: "leite.jpg" },
            isActive:    { type: "boolean", example: true },
            category: {
              type: "object",
              properties: {
                _id:  { type: "string" },
                name: { type: "string", example: "Bebidas" }
              }
            },
            supermarket: {
              type: "object",
              properties: {
                _id:    { type: "string" },
                name:   { type: "string", example: "Mercadinho do Bairro" },
                isOpen: { type: "boolean" },
                location: { type: "string" }
              }
            }
          }
        },

        /* ── Avaliação ─────────────────────────────────────────────── */

        Review: {
          type: "object",
          properties: {
            _id:    { type: "string" },
            rating: { type: "integer", minimum: 1, maximum: 5, example: 4 },
            comment:{ type: "string", example: "Ótimo serviço!" },
            author: {
              type: "object",
              properties: { name: { type: "string", example: "João Costa" } }
            },
            createdAt: { type: "string", format: "date-time" },
            reply: {
              type: "object",
              nullable: true,
              properties: {
                text:      { type: "string", example: "Obrigado pelo feedback!" },
                repliedAt: { type: "string", format: "date-time" }
              }
            }
          }
        },

        /* ── Encomenda ─────────────────────────────────────────────── */

        OrderItem: {
          type: "object",
          properties: {
            productName:  { type: "string", example: "Leite UHT 1L" },
            productPrice: { type: "number", example: 0.89 },
            quantity:     { type: "integer", example: 3 }
          }
        },

        Order: {
          type: "object",
          properties: {
            _id:            { type: "string", example: "665d333333333333333333" },
            status: {
              type: "string",
              enum: ["pending", "confirmed", "preparing", "ready", "in_delivery", "delivered", "cancelled"],
              example: "confirmed"
            },
            subtotal:       { type: "number", example: 12.50 },
            discountAmount: { type: "number", example: 1.00 },
            deliveryCost:   { type: "number", example: 2.50 },
            total:          { type: "number", example: 14.00 },
            deliveryMethod: { type: "string", enum: ["pickup", "courier"], example: "courier" },
            couponCode:     { type: "string", nullable: true, example: "BOAS-VINDAS" },
            reviewSubmitted:{ type: "boolean", example: false },
            createdAt:      { type: "string", format: "date-time" },
            supermarket: {
              type: "object",
              properties: {
                _id:  { type: "string" },
                name: { type: "string", example: "Mercadinho do Bairro" }
              }
            },
            items: { type: "array", items: { "$ref": "#/components/schemas/OrderItem" } }
          }
        },

        /* ── Entrega ───────────────────────────────────────────────── */

        Delivery: {
          type: "object",
          nullable: true,
          properties: {
            _id:    { type: "string" },
            status: { type: "string", example: "delivered" },
            courier: {
              type: "object",
              nullable: true,
              properties: {
                name:  { type: "string", example: "Rui Estafeta" },
                phone: { type: "string", example: "934567890" }
              }
            }
          }
        },

        /* ── Cupão ─────────────────────────────────────────────────── */

        CouponValidation: {
          type: "object",
          properties: {
            valid:          { type: "boolean", example: true },
            message:        { type: "string",  example: "Cupão válido!" },
            discountAmount: { type: "number",  example: 2.00 },
            deliveryFree:   { type: "boolean", example: false },
            code:           { type: "string",  example: "BOAS-VINDAS" }
          }
        }

      }
    }
  },
  apis: [
    path.join(__dirname, "../routes/api/*.js"),
    path.join(__dirname, "../controllers/api/*.js")
  ]
};

module.exports = swaggerJsdoc(options);
