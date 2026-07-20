// CRIANDO ESSE UTILS PARA NÃO REPETIR UM CÓDIGO "GRANDE" EM TODOS OS CONTROLLERS = EVITANDO REPETIÇÃO DESNECESSÁRIA/CHATA

const db = require('../config/db');

// Registra uma ação no histórico de auditoria. Campos não aplicáveis vão como null.
async function registrarLog({
  empresa,
  tipo,
  descricao = null,
  equipamento = null,
  quantidade = null,
  motivo = null,
  responsavel = null
})

{
  try {
    await db.execute(
      `INSERT INTO tb_log
        (tipo_acao, descricao, equipamento, quantidade, motivo, responsavel, tb_empresa_id_empresa)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tipo, descricao, equipamento, quantidade, motivo, responsavel, empresa]
    );
  }
  catch (err) {
    console.error('Falha ao registrar log:', err.message); // não derruba a operação principal
  }
}

module.exports = registrarLog;