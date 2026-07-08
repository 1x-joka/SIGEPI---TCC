const db = require('../config/db');
const registrarLog = require('../utils/registrarLog');

// Painel gerencial (F13) — todos os números filtrados pela empresa e pelo período
async function obterDashboard(req, res) {
  const empresa = req.usuario.empresa;
  const ano = parseInt(req.query.ano) || new Date().getFullYear(); // É a terceira forma de receber dados (body, params, e agora query string), usada para filtros. o ?ano=2026 da URL.
  const mes = req.query.mes ? parseInt(req.query.mes) : null;         // ?mes=7 (opcional)

  try {
    // Filtro de período para as métricas de ENTREGA (sempre ano; mês só se informado)
    const filtroEntrega = [empresa, ano];
    let condMes = '';
    if (mes) { condMes = ' AND MONTH(e.dt_entrega) = ?'; filtroEntrega.push(mes); }

    // 1) EPI ENTREGUE (total no período) — COUNT conta linhas
    const [totalEntregas] = await db.query(
      `SELECT COUNT(*) AS total
       FROM tb_entrega e
       JOIN tb_funcionario f ON f.id_funcionario = e.tb_funcionario_id_funcionario
       WHERE f.tb_empresa_id_empresa = ? AND YEAR(e.dt_entrega) = ?${condMes}`,
      filtroEntrega
    );

    // 2) EPI COM NECESSIDADE DE COMPRA (estoque abaixo do mínimo) — estado atual
    const [necessidadeCompra] = await db.query(
      `SELECT epi.nm_epi, epi.ca_epi,
              SUM(es.qtd_disponivel_estoque) AS disponivel,
              SUM(es.qtd_minima_estoque)    AS minimo,
              (SUM(es.qtd_minima_estoque) - SUM(es.qtd_disponivel_estoque)) AS qtd_sugerida
       FROM tb_estoque es
       JOIN tb_epi epi ON epi.id_epi = es.tb_epi_id_epi
       WHERE es.tb_empresa_id_empresa = ?
       GROUP BY epi.id_epi, epi.nm_epi, epi.ca_epi
       HAVING SUM(es.qtd_disponivel_estoque) < SUM(es.qtd_minima_estoque)
       ORDER BY qtd_sugerida DESC`,
      [empresa]
    );

    // 3) STATUS DE CA (Válido / A vencer / Vencido) — estado atual
    const [statusCa] = await db.query(
      `SELECT
         COALESCE(SUM(CASE WHEN dt_validade_ca < CURDATE() THEN 1 ELSE 0 END), 0) AS vencido,
         COALESCE(SUM(CASE WHEN dt_validade_ca BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END), 0) AS a_vencer,
         COALESCE(SUM(CASE WHEN dt_validade_ca > DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END), 0) AS valido
       FROM tb_epi
       WHERE tb_empresa_id_empresa = ? AND st_epi = 'A' AND dt_validade_ca IS NOT NULL`,
      [empresa]
    );

    // 4) 5 EPIs MAIS ENTREGUES (no período) — agrupa por EPI e conta
    const [topEpis] = await db.query(
      `SELECT epi.nm_epi, COUNT(*) AS total
       FROM tb_entrega e
       JOIN tb_funcionario f ON f.id_funcionario = e.tb_funcionario_id_funcionario
       JOIN tb_epi epi       ON epi.id_epi = e.tb_epi_id_epi
       WHERE f.tb_empresa_id_empresa = ? AND YEAR(e.dt_entrega) = ?${condMes}
       GROUP BY epi.id_epi, epi.nm_epi
       ORDER BY total DESC
       LIMIT 5`,
      filtroEntrega
    );

    // 5) ENTREGAS POR MÊS (gráfico anual) — usa só o ANO
    const [porMes] = await db.query(
      `SELECT MONTH(e.dt_entrega) AS mes, COUNT(*) AS total
       FROM tb_entrega e
       JOIN tb_funcionario f ON f.id_funcionario = e.tb_funcionario_id_funcionario
       WHERE f.tb_empresa_id_empresa = ? AND YEAR(e.dt_entrega) = ?
       GROUP BY MONTH(e.dt_entrega)
       ORDER BY mes`,
      [empresa, ano]
    );

    // Preenche os 12 meses (o gráfico precisa de Jan..Dez, mesmo os zerados)
    const entregasPorMes = Array.from({ length: 12 }, (_, i) => {
      const achado = porMes.find(m => m.mes === i + 1);
      return { mes: i + 1, total: achado ? achado.total : 0 };
    });

    return res.status(200).json({
      periodo: { ano, mes },
      epiEntregue: totalEntregas[0].total,
      necessidadeCompra,
      statusCa: statusCa[0],
      topEpisEntregues: topEpis,
      entregasPorMes
    });

  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });
  }
}

module.exports = { obterDashboard };