create database db_SIGEPI;
use db_SIGEPI;

create table tb_cidade (
    id_cidade int primary key auto_increment, -- não se adiciona "not null" pois o SQL já aplica NN em toda PK
    nm_cidade varchar(45) not null
);

create table tb_endereco (
    id_endereco int primary key auto_increment,
    nm_endereco varchar(100) not null,
    nm_complemento varchar(45),
    nm_bairro varchar(45),
    cd_cep varchar(9),
    tb_cidade_id_cidade int not null,
    foreign key (tb_cidade_id_cidade) references tb_cidade(id_cidade)
);

create table tb_empresa (
    id_empresa int primary key auto_increment,
    nm_empresa varchar(45) not null,
    cnpj_empresa varchar(18),
    st_empresa char(1) not null default 'A',
    dt_cadastro_empresa date,
    tb_endereco_id_endereco int,
    responsavel_empresa varchar(45),
    logo_empresa varchar(45),
    dt_contratacao date,
    email_empresa varchar(255),
    tel_empresa varchar(20),
    foreign key (tb_endereco_id_endereco) references tb_endereco(id_endereco)
);

create table tb_setor (
    id_setor int primary key auto_increment,
    nm_setor varchar(45) not null,
    tb_empresa_id_empresa int not null,
    foreign key (tb_empresa_id_empresa) references tb_empresa(id_empresa)
);

create table tb_categoria (
    id_categoria int primary key auto_increment,
    nm_categoria varchar(45) not null
);

create table tb_epi (
    id_epi int primary key auto_increment,
    nm_epi varchar(45) not null,
    desc_epi longtext,
    st_epi char(1), -- A (Ativo - EPI pronta para uso e entrega); I (Inativo - EPI descontinuado, CA vencido ou removido do sistema)
    dt_cadastro_epi date,
    ca_epi varchar(10),
    tb_categoria_id_categoria int,
    foreign key (tb_categoria_id_categoria) references tb_categoria(id_categoria)
);

create table tb_estoque (
    id_estoque int primary key auto_increment,
    qtd_disponivel_estoque int,
    qtd_minima_estoque int,
    dt_validade_estoque date,
    tb_empresa_id_empresa int not null,
    tb_epi_id_epi int not null,
    foreign key (tb_empresa_id_empresa) references tb_empresa(id_empresa),
    foreign key (tb_epi_id_epi) references tb_epi(id_epi)
);

create table tb_movimentacao (
    id_movimentacao int primary key auto_increment,
    tipo_movimentacao char(1),
    qtd_movimentacao int,
    dt_movimentacao date,
    desc_movimentacao varchar(255),
    tb_estoque_id_estoque int not null,
    foreign key (tb_estoque_id_estoque) references tb_estoque(id_estoque)
);

create table tb_tipousuario (
    id_tipousuario int primary key auto_increment,
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
    tb_empresa_id_empresa int not null,
    tb_tipousuario_id_tipousuario int,
    foreign key (tb_empresa_id_empresa) references tb_empresa(id_empresa),
    foreign key (tb_tipousuario_id_tipousuario) references tb_tipousuario(id_tipousuario)
);

create table tb_funcionario (
    id_funcionario int primary key auto_increment,
    nm_funcionario varchar(45) not null,
    sobrenome_funcionario varchar(60) not null,
    dt_nascimento_funcionario date,
    st_funcionario char(1), -- A (Ativo - funcionário na empresa); I (Inativo - funcionário desligado/exclusão pelo admin) 
    dt_cadastro_funcionario date,
    motivo_inativacao_funcionario varchar(255),
    data_inativacao date,
    tb_empresa_id_empresa int not null,
    tb_setor_id_setor int,
    tb_endereco_id_endereco int,
    tb_usuario_id_usuario int unique,    -- liga funcionário à conta de usuário
    foreign key (tb_empresa_id_empresa) references tb_empresa(id_empresa),
    foreign key (tb_setor_id_setor) references tb_setor(id_setor),
    foreign key (tb_endereco_id_endereco) references tb_endereco(id_endereco),
    foreign key (tb_usuario_id_usuario) references tb_usuario(id_usuario)
);

create table tb_solicitacao (
    id_solicitacao int primary key auto_increment,
    dt_solicitacao date,
    st_solicitacao char(1), -- P (Pendente - aguardando aprovação do admin); A (Aprovada); R (Recusada)
    desc_motivo_solicitacao varchar(255),
    dt_previsao date,
    tb_funcionario_id_funcionario int not null,
    tb_epi_id_epi int not null,
    foreign key (tb_funcionario_id_funcionario) references tb_funcionario(id_funcionario),
    foreign key (tb_epi_id_epi) references tb_epi(id_epi)
);

create table tb_entrega (
    id_entrega int primary key auto_increment,
    dt_entrega date,
    dt_devolucao date,
    st_entrega char(1), -- A (Ativo - EPI está com o funcionário); D (Devolvido)
    tb_funcionario_id_funcionario int not null,
    tb_epi_id_epi int not null,
    tb_usuario_id_usuario int not null,
    foreign key (tb_funcionario_id_funcionario) references tb_funcionario(id_funcionario),
    foreign key (tb_epi_id_epi) references tb_epi(id_epi),
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
    where tb_epi_id_epi = new.tb_epi_id_epi
      and tb_empresa_id_empresa = (
          select tb_empresa_id_empresa
          from tb_funcionario
          where id_funcionario = new.tb_funcionario_id_funcionario
      )
    order by dt_validade_estoque asc  -- FIFO: retira do lote mais antigo primeiro
    limit 1;
end$$
delimiter ;

-- Permitindo "NULO" na coluna id_empresa
alter table tb_usuario 
modify tb_empresa_id_empresa int null;

-- Declarando que existem dois tipos de usuários (admin e funcionários)
insert into tb_tipousuario (nm_tipousuario)
values
('Administrador'), ('Funcionário');