/**
 * delivery.service.js
 *
 * Funções auxiliares para o sistema de entregas.
 * A lógica principal do ciclo de vida das entregas (aceitar, levantar, entregar,
 * cancelar) já está implementada em order.service.js:
 *   - onCourierAcceptDelivery()
 *   - onCourierCancelDelivery()
 *   - onCourierDelivered()
 *
 * Este módulo fornece:
 *   - Consultas rápidas de estado (entrega ativa, pendentes por supermercado)
 *   - Estatísticas de desempenho do courier (para o dashboard)
 *   - Validações antes de aceitar entrega (evita ter mais de 1 ativa)
 */

const mongoose = require("mongoose");
const Delivery = require("../models/Delivery");

/**
 * Devolve a entrega ativa do courier (status 'accepted' ou 'picked_up').
 * Existe no máximo 1 entrega ativa por courier em simultâneo.
 *
 * Utilizado em:
 *   - courier.controller.js → dashboard (mostrar entrega em curso)
 *   - courier.controller.js → accept    (verificar antes de aceitar nova entrega)
 *
 * @param {string} courierId
 * @returns {Delivery|null}
 */
async function getActiveDelivery(courierId) {
  return Delivery.findOne({
    courier: new mongoose.Types.ObjectId(courierId),
    status: { $in: ["accepted", "picked_up"] }
  })
    .populate({
      path: "order",
      populate: { path: "supermarket", select: "name location phone" }
    })
    .lean();
}

/**
 * Verifica se um courier tem entrega ativa.
 * Usado para bloquear a aceitação de uma segunda entrega em simultâneo.
 *
 * @param {string} courierId
 * @returns {boolean}
 */
async function hasActiveDelivery(courierId) {
  const count = await Delivery.countDocuments({
    courier: new mongoose.Types.ObjectId(courierId),
    status: { $in: ["accepted", "picked_up"] }
  });
  return count > 0;
}

/**
 * Lista todas as entregas com status 'available' (prontas para um courier aceitar).
 * Inclui informação do pedido e do supermercado para o courier decidir.
 *
 * Utilizado em:
 *   - courier.controller.js → available
 *
 * @returns {Delivery[]}
 */
async function getAvailableDeliveries() {
  return Delivery.find({ status: "available" })
    .populate({
      path: "order",
      populate: { path: "supermarket", select: "name location phone" }
    })
    .sort({ createdAt: 1 }) // mais antigas primeiro (FIFO)
    .lean();
}

/**
 * Devolve entregas pendentes (available ou accepted) de um supermercado específico.
 * Útil para o supermercado saber quantas entregas estão em curso.
 *
 * @param {string} supermarketId
 * @returns {Delivery[]}
 */
async function getPendingDeliveriesForSupermarket(supermarketId) {
  return Delivery.find({
    supermarket: new mongoose.Types.ObjectId(supermarketId),
    status: { $in: ["available", "accepted", "picked_up"] }
  })
    .populate("courier", "name phone")
    .populate("order", "client total createdAt")
    .lean();
}

/**
 * Estatísticas de desempenho de um courier.
 * Usadas no dashboard do courier e nas avaliações.
 *
 * Retorna:
 *   - totalDelivered: total de entregas concluídas
 *   - totalCancelled: total de entregas canceladas pelo courier
 *   - topSupermarkets: os 3 supermercados onde o courier mais entregou
 *
 * @param {string} courierId
 * @returns {{ totalDelivered, totalCancelled, topSupermarkets }}
 */
async function getCourierStats(courierId) {
  const courierObjectId = new mongoose.Types.ObjectId(courierId);

  const [statusCounts, topSupermarkets] = await Promise.all([
    // Contagem por estado
    Delivery.aggregate([
      { $match: { courier: courierObjectId } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]),
    // Top supermercados com mais entregas concluídas
    Delivery.aggregate([
      { $match: { courier: courierObjectId, status: "delivered" } },
      { $group: { _id: "$supermarket", totalDeliveries: { $sum: 1 } } },
      { $sort: { totalDeliveries: -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: "supermarkets",
          localField: "_id",
          foreignField: "_id",
          as: "supermarketInfo"
        }
      },
      { $unwind: "$supermarketInfo" },
      { $project: { name: "$supermarketInfo.name", totalDeliveries: 1 } }
    ])
  ]);

  const byStatus = {};
  statusCounts.forEach((s) => { byStatus[s._id] = s.count; });

  return {
    totalDelivered: byStatus.delivered || 0,
    totalCancelled: byStatus.cancelled || 0,
    topSupermarkets
  };
}

/**
 * Histórico de entregas de um courier (concluídas e canceladas).
 * Ordenadas da mais recente para a mais antiga.
 *
 * @param {string} courierId
 * @returns {Delivery[]}
 */
async function getCourierHistory(courierId) {
  return Delivery.find({
    courier: new mongoose.Types.ObjectId(courierId),
    status: { $in: ["delivered", "cancelled"] }
  })
    .populate({
      path: "order",
      populate: { path: "supermarket", select: "name" }
    })
    .sort({ createdAt: -1 })
    .lean();
}

module.exports = {
  getActiveDelivery,
  hasActiveDelivery,
  getAvailableDeliveries,
  getPendingDeliveriesForSupermarket,
  getCourierStats,
  getCourierHistory
};
