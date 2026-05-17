create database db_SIGEPI;
use db_SIGEPI;

create table tb_cidade (
    cd_cidade int primary key auto_increment, -- não se adiciona "not null" pois o SQL já aplica NN em toda PK
    nm_cidade varchar(45) not null
);

create table tb_endereco (
    cd_endereco int primary key auto_increment,
    nm_endereco varchar(100) not null,
    nm_complemento varchar(45),
    nm_bairro varchar(45),
    cd_cep varchar(9),
    tb_cidade_cd_cidade int not null,
    foreign key (tb_cidade_cd_cidade) references tb_cidade(cd_cidade)
);

create table tb_plano (
    id_plano int primary key auto_increment,
    nm_plano varchar(45) not null,
    valor_plano decimal(10,2) not null,
    limite_funcionarios int,
    limite_admins int
);

create table tb_empresa (
    cd_empresa int primary key auto_increment,
    nm_empresa varchar(45) not null,
    cnpj_empresa varchar(18),
    st_empresa char(1), -- A (Ativa - empresa com plano vigente); I (Inativa - empresa cancelou ou o plano expirou)
    dt_cadastro_empresa date,
    tb_endereco_cd_endereco int,
    plano_empresa char(1),
    dt_inicio_plano date,
    dt_vencimento_plano date,
    responsavel_empresa varchar(45),
    tb_plano_id_plano int,
    logo_empresa varchar(45),
    dt_contratacao date,
    st_cancelamento char(1), -- N (não cancelado); S (cancelado); não usa-se A e I pois status de cancelamento não é um estado de atividade
    email_empresa varchar(255),
    tel_empresa varchar(20),
    foreign key (tb_endereco_cd_endereco) references tb_endereco(cd_endereco),
    foreign key (tb_plano_id_plano) references tb_plano(id_plano)
);

create table tb_setor (
    cd_setor int primary key auto_increment,
    nm_setor varchar(45) not null
);

create table tb_categoria (
    cd_categoria int primary key auto_increment,
    nm_categoria varchar(45) not null
);

create table tb_epi (
    cd_epi int primary key auto_increment,
    nm_epi varchar(45) not null,
    desc_epi longtext,
    st_epi char(1), -- A (Ativo - EPI pronta para uso e entrega); I (Inativo - EPI descontinuado, CA vencido ou removido do sistema)
    dt_cadastro_epi date,
    ca_epi varchar(10),
    tb_categoria_cd_categoria int,
    foreign key (tb_categoria_cd_categoria) references tb_categoria(cd_categoria)
);

create table tb_estoque (
    cd_estoque int primary key auto_increment,
    qtd_disponivel_estoque int,
    qtd_minima_estoque int,
    dt_validade_estoque date,
    tb_empresa_cd_empresa int not null,
    tb_epi_cd_epi int not null,
    foreign key (tb_empresa_cd_empresa) references tb_empresa(cd_empresa),
    foreign key (tb_epi_cd_epi) references tb_epi(cd_epi)
);

create table tb_movimentacao (
    cd_movimentacao int primary key auto_increment,
    tipo_movimentacao char(1),
    qtd_movimentacao int,
    dt_movimentacao date,
    desc_movimentacao varchar(255),
    tb_estoque_cd_estoque int not null,
    foreign key (tb_estoque_cd_estoque) references tb_estoque(cd_estoque)
);

create table tb_tipousuario (
    cd_tipousuario int primary key auto_increment,
    nm_tipousuario varchar(45) not null
);

create table tb_usuario (
    id_usuario int primary key auto_increment,
    nm_usuario varchar(45) not null,
    dt_nascimento_usuario date,
    email_usuario varchar(255),
    senha_usuario varchar(255),
    st_usuario char(1), -- A (Ativo - consegue logar); I (Inativo - acesso bloqueado)
    dt_cadastro_usuario date,
    cpf_usuario varchar(14),
    tb_empresa_cd_empresa int not null,
    tb_tipousuario_cd_tipousuario int,
    foreign key (tb_empresa_cd_empresa) references tb_empresa(cd_empresa),
    foreign key (tb_tipousuario_cd_tipousuario) references tb_tipousuario(cd_tipousuario)
);

create table tb_funcionario (
    cd_funcionario int primary key auto_increment,
    nm_funcionario varchar(45) not null,
    sobrenome_funcionario varchar(60),
    dt_nascimento_funcionario date,
    st_funcionario char(1), -- A (Ativo - funcionário na empresa); I (Inativo - funcionário desligado/exclusão pelo admin) 
    dt_cadastro_funcionario date,
    motivo_inativacao_funcionario varchar(255),
    data_inativacao date,
    tb_empresa_cd_empresa int not null,
    tb_setor_cd_setor int,
    tb_endereco_cd_endereco int,
    tb_usuario_id_usuario int unique,    -- liga funcionário à conta de usuário
    foreign key (tb_empresa_cd_empresa) references tb_empresa(cd_empresa),
    foreign key (tb_setor_cd_setor) references tb_setor(cd_setor),
    foreign key (tb_endereco_cd_endereco) references tb_endereco(cd_endereco),
    foreign key (tb_usuario_id_usuario) references tb_usuario(id_usuario)
);

create table tb_solicitacao (
    cd_solicitacao int primary key auto_increment,
    dt_solicitacao date,
    st_solicitacao char(1), -- P (Pendente - aguardando aprovação do admin); A (Aprovada); R (Recusada)
    des_motivo_solicitacao varchar(255),
    dt_previsao date,
    tb_funcionario_cd_funcionario int not null,
    tb_epi_cd_epi int not null,
    foreign key (tb_funcionario_cd_funcionario) references tb_funcionario(cd_funcionario),
    foreign key (tb_epi_cd_epi) references tb_epi(cd_epi)
);

create table tb_entrega (
    cd_entrega int primary key auto_increment,
    dt_entrega date,
    dt_devolucao date,
    st_entrega char(1), -- A (Ativo - EPI está com o funcionário); D (Devolvido)
    tb_funcionario_cd_funcionario int not null,
    tb_epi_cd_epi int not null,
    tb_usuario_id_usuario int not null,
    foreign key (tb_funcionario_cd_funcionario) references tb_funcionario(cd_funcionario),
    foreign key (tb_epi_cd_epi) references tb_epi(cd_epi),
    foreign key (tb_usuario_id_usuario) references tb_usuario(id_usuario)
);

/* ==== CÓDIGO TRIGGER (atualizando estoque automaticamente após fazer uma entrega) ==== */
/*
toda vez que um registro é inserido em tb_entrega, ela automaticamente desconta 1 unidade do estoque do EPI correto, da
empresa correta, e seguindo FIFO — o lote com validade mais próxima sai primeiro
*/

delimiter $$
create trigger trg_atualizar_estoque_apos_entrega
after insert on tb_entrega
for each row
begin
    update tb_estoque
    set qtd_disponivel_estoque = qtd_disponivel_estoque - 1
    where tb_epi_cd_epi = new.tb_epi_cd_epi
      and tb_empresa_cd_empresa = (
          select tb_empresa_cd_empresa
          from tb_funcionario
          where cd_funcionario = new.tb_funcionario_cd_funcionario
      )
    order by dt_validade_estoque asc  -- FIFO: retira do lote mais antigo primeiro
    limit 1;
end$$
delimiter ;

-- Permitindo "NULO" na coluna cd_empresa
ALTER TABLE tb_usuario 
MODIFY tb_empresa_cd_empresa INT NULL;

SELECT * FROM tb_empresa;
SELECT * FROM tb_usuario;