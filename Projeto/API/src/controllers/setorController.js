const db = require('../config/db');

// Cadastrar um setor vinculado à empresa do usuário logado
async function cadastrarSetor(req, res) {
    const { nome } = req.body;
    const empresa = req.usuario.empresa; // vem do middleware (banco), nunca do cliente

    if (!nome) {
        return res.status(400).json({ erro: 'Informe o nome do setor.' })
    }

    try {
        // Impede setor duplicado dentro da mesma empresa
        const [existe] = await db.query(
            'SELECT id_setor FROM tb_setor WHERE nm_setor = ? AND tb_empresa_id_empresa = ?',
            [nome, empresa]
        );
        if (existe.length > 0) {
            return res.status(409).json({ erro: 'Já existe um setor com esse nome'});
        }

        const [result] = await db.query(
            'INSERT INTO tb_setor (nm_setor, tb_empresa_id_empresa) VALUES (?, ?)',
            [nome, empresa]
        );

        return res.status(201).json({
            mensagem: 'Setor cadastrado com sucesso!',
            id_setor: result.insertId,
            nm_setor: nome
        });
    }
    catch (err) {
        return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message});
    }
}

// Lista apenas os setores da empresa do usuário logado
async function listarSetores(req, res) {
    const empresa = req.usuario.empresa;

    try{
        const [setores] = await db.query(
            'SELECT id_setor, nm_setor FROM tb_setor WHERE tb_empresa_id_empresa = ? ORDER BY nm_setor',
            [empresa]
        );

        return res.status(200).json(setores);
    }
    catch (err) {
        return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message});
    }
}

// ADMIN exclui um setor — BLOQUEIA se houver funcionário vinculado (integridade)
async function deletarSetor(req, res) {
  const id_setor = req.params.id;
  const empresa = req.usuario.empresa;

  try {
    // O setor precisa ser desta empresa
    const [setores] = await db.query(
      'SELECT id_setor FROM tb_setor WHERE id_setor = ? AND tb_empresa_id_empresa = ?',
      [id_setor, empresa]
    );
    if (setores.length === 0) {
      return res.status(404).json({ erro: 'Setor não encontrado para esta empresa.' });
    }

    // TRAVA: não excluir se houver funcionário no setor
    const [funcs] = await db.query(
      'SELECT COUNT(*) AS total FROM tb_funcionario WHERE tb_setor_id_setor = ?',
      [id_setor]
    );
    if (funcs[0].total > 0) {
      return res.status(409).json({
        erro: `Não é possível excluir: há ${funcs[0].total} funcionário(s) neste setor. Altere o setor deles primeiro.`
      });
    }

    await db.query('DELETE FROM tb_setor WHERE id_setor = ?', [id_setor]);
    return res.status(200).json({ mensagem: 'Setor excluído com sucesso.' });

  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });
  }
}

module.exports = { cadastrarSetor, listarSetores, deletarSetor };