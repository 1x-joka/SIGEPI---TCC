const db = require('../config/db');

async function cadastrarEmpresa(req, res) {
  const { nome, cnpj, responsavel, email, telefone, setor } = req.body;

  if (!nome || !cnpj || !responsavel || !email || !telefone) {
    return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios.' });
  }

  try {
    const [existe] = await db.query(
      'SELECT id_empresa FROM tb_empresa WHERE cnpj_empresa = ?', [cnpj]
    );
    if (existe.length > 0) {
      return res.status(409).json({ erro: 'CNPJ já cadastrado.' });
    }

    const codigo = Math.floor(1000000000 + Math.random() * 9000000000).toString(); // Código da empresa gerado automaticamente após o cadastro

    const [result] = await db.query(
      `INSERT INTO tb_empresa 
       (nm_empresa, cnpj_empresa, responsavel_empresa, email_empresa, tel_empresa, codigo_empresa, st_empresa, dt_cadastro_empresa)
       VALUES (?, ?, ?, ?, ?, ?, 'A', CURDATE())`,
      [nome, cnpj, responsavel, email, telefone, codigo]
    );

    const id_empresa = result.insertId;

    await db.query(
      'UPDATE tb_usuario SET tb_empresa_id_empresa = ?, tb_tipousuario_id_tipousuario = 1 WHERE id_usuario = ?',
      [id_empresa, req.usuario.id]
    );

    if (setor) {
      await db.query(
        'INSERT INTO tb_setor (nm_setor, tb_empresa_id_empresa) VALUES (?, ?)',
        [setor, id_empresa]
      );
    }

    return res.status(201).json({
      mensagem: 'Empresa cadastrada com sucesso.',
      id_empresa,
      codigo
    });

  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno.', detalhe: err.message });
  }
}

module.exports = { cadastrarEmpresa };