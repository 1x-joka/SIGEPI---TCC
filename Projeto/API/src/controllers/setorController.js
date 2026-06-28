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

module.exports = { cadastrarSetor, listarSetores};