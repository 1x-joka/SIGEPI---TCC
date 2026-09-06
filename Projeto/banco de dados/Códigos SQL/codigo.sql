create database db_SIGEPI;
use db_SIGEPI;

create table tb_cidade (
    id_cidade int primary key auto_increment, -- não se adiciona "not null" pois o SQL já aplica NN em toda PK
    nm_cidade varchar(45) not null
);

create table tb_endereco (
    id_endereco int primary key auto_increment,
    nm_endereco varchar(100) not null,
    nm_complemento varchar(45) null, -- null: algo ainda não aconteceu, é "opcional"
    nm_bairro varchar(45) null, -- null: algo ainda não aconteceu, é "opcional"
    cd_cep varchar(9) null,
    tb_cidade_id_cidade int not null,
    foreign key (tb_cidade_id_cidade) references tb_cidade(id_cidade)
);

create table tb_empresa (
    id_empresa int primary key auto_increment,
    nm_empresa varchar(45) not null,
    cnpj_empresa varchar(18) not null,
    codigo_empresa varchar(10) unique not null, -- Para o funcionário logar na empresa já cadastrada pelo ADM
    st_empresa enum('A','I') not null default 'A',
    dt_cadastro_empresa date not null,
    responsavel_empresa varchar(45) null, -- null: algo ainda não aconteceu, é "opcional"
    logo_empresa varchar(45) null, -- null: algo ainda não aconteceu, é "opcional"
    dt_contratacao date null, -- null: algo ainda não aconteceu, é "opcional"
    email_empresa varchar(255) null, -- null: algo ainda não aconteceu, é "opcional"
    tel_empresa varchar(20) null, -- null: algo ainda não aconteceu, é "opcional"
    tb_endereco_id_endereco int,
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
    tamanho_epi varchar(20) not null,
    desc_epi longtext null, -- null: algo ainda não aconteceu, é "opcional"
    st_epi enum('A','I') default 'A' not null, -- A (Ativo - EPI pronta para uso e entrega); I (Inativo - EPI descontinuado, CA vencido ou removido do sistema)
    dt_cadastro_epi date not null,
    ca_epi varchar(10) not null,
    dt_validade_ca date not null,
    tb_categoria_id_categoria int not null,
    tb_empresa_id_empresa int not null, -- para que cada empresa tenha seu próprio EPI, não deixando ser global (empresa A ver as q a B tem, ou seja, informação mútua)
    foreign key (tb_categoria_id_categoria) references tb_categoria(id_categoria),
    foreign key (tb_empresa_id_empresa) references tb_empresa(id_empresa)
);

-- Ligação N:N — um EPI pode servir a vários setores, e um setor usa vários EPIs
create table tb_epi_setor (
    tb_epi_id_epi int not null,
    tb_setor_id_setor int not null,
    primary key (tb_epi_id_epi, tb_setor_id_setor),
    foreign key (tb_epi_id_epi) references tb_epi(id_epi),
    foreign key (tb_setor_id_setor) references tb_setor(id_setor)
);

create table tb_estoque (
    id_estoque int primary key auto_increment,
    qtd_disponivel_estoque int not null default 0,
    qtd_minima_estoque int,
    dt_validade_estoque date,
    tb_empresa_id_empresa int not null,
    tb_epi_id_epi int not null,
    foreign key (tb_empresa_id_empresa) references tb_empresa(id_empresa),
    foreign key (tb_epi_id_epi) references tb_epi(id_epi)
);

create table tb_movimentacao (
    id_movimentacao int primary key auto_increment,
    tipo_movimentacao enum('E','S') not null,
    qtd_movimentacao int not null,
    dt_movimentacao date,
    desc_movimentacao varchar(255) not null,
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
    dt_nascimento_usuario date null,
    email_usuario varchar(255) unique not null,
    senha_usuario varchar(255) not null,
    st_usuario enum('A','I') default 'A' not null, -- A (Ativo - consegue logar); I (Inativo - acesso bloqueado)
    dt_cadastro_usuario date not null,
    cpf_usuario varchar(14) unique not null,
    token_reset varchar(255) default null, -- null: considerando que ainda não teve nenhuma tentativa de esqueci minha senha
    token_reset_expira datetime default null, -- null: considerando que ainda não teve nenhuma tentativa de esqueci minha senha
    tentativas_reset int default 0, -- 0: considerando que ainda não teve nenhuma tentativa de esqueci minha senha 
    reset_bloqueado_ate datetime default null, -- null: considerando que ainda não teve nenhuma tentativa de esqueci minha senha
    tb_empresa_id_empresa int null, -- null: funcionário sem empresa ainda
    tb_tipousuario_id_tipousuario int not null,
    foreign key (tb_empresa_id_empresa) references tb_empresa(id_empresa),
    foreign key (tb_tipousuario_id_tipousuario) references tb_tipousuario(id_tipousuario)
);

create table tb_funcionario (
    id_funcionario int primary key auto_increment,
    nm_funcionario varchar(120) not null,
    dt_nascimento_funcionario date,
    st_funcionario enum('A','I') default 'A' not null, -- A (Ativo - funcionário na empresa); I (Inativo - funcionário desligado/exclusão pelo admin) 
    dt_cadastro_funcionario date not null,
    motivo_inativacao_funcionario varchar(255) null, -- null: porque ocorre apenas quando inativa
    data_inativacao date null, -- null: porque ocorre apenas quando inativa
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
    dt_solicitacao date not null,
    st_solicitacao enum('P','A','R') default 'P' not null, -- P (Pendente - aguardando aprovação do admin); A (Aprovada); R (Recusada)
    desc_motivo_solicitacao varchar(255) not null,
    dt_previsao date,
    tb_funcionario_id_funcionario int not null,
    tb_epi_id_epi int not null,
    foreign key (tb_funcionario_id_funcionario) references tb_funcionario(id_funcionario),
    foreign key (tb_epi_id_epi) references tb_epi(id_epi)
);

create table tb_entrega (
    id_entrega int primary key auto_increment,
    dt_entrega date not null,
    dt_confirmacao date null, -- null: só acontece quando inativa
    dt_devolucao date null,
    motivo_recusa varchar(255) null,
    st_entrega enum('P','A','D','R') default 'P' not null,
    tb_funcionario_id_funcionario int not null,
    tb_epi_id_epi int not null,
    tb_usuario_id_usuario int not null,
    foreign key (tb_funcionario_id_funcionario) references tb_funcionario(id_funcionario),
    foreign key (tb_epi_id_epi) references tb_epi(id_epi),
    foreign key (tb_usuario_id_usuario) references tb_usuario(id_usuario)
);

-- COLOCANDO TODAS AS CATEGORIAS DE EPI'S PRESENTES NA NR-6 (NORMA REGULAMENTADORA 6), OU SEJA, O ADM NÃO CRIA POIS É UMA NORMA
insert into tb_categoria (nm_categoria)
values
('Proteção da cabeça'), -- id = 1
('Proteção dos olhos e face'),
('Proteção auditiva'),
('Proteção respiratória'),
('Proteção dos membros superiores'),
('Proteção dos membros inferiores'),
('Proteção do tronco'),
('Proteção contra quedas');

/* ==== CÓDIGO TRIGGER (atualizando estoque automaticamente após fazer uma entrega) ====
    -> Toda vez que um registro é inserido em tb_entrega, ela automaticamente desconta 1 unidade do estoque do EPI correto, da empresa correta, e seguindo FIFO — o lote com validade mais próxima sai primeiro
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

-- Declarando que existem dois tipos de usuários (admin e funcionários)
insert into tb_tipousuario (nm_tipousuario)
values
('Administrador'), ('Funcionário');

/*
    ======== TROCA DE CHAR PARA ENUM ========
        --> enum impediria alguém de inserir um status inválido, ou seja, trava os valores válidos no banco = segurança/integridade
*/

-- ADICIONANDO A TABELA DE AUDITORIA DE LOGS PARA MÁXIMA RASTREABILIDADE
create table tb_log (
    id_log int primary key auto_increment,
    dt_log datetime default current_timestamp not null,
    tipo_acao enum('CADASTRO_EPI','ENTRADA_ESTOQUE','SAIDA_ESTOQUE','ENTREGA','DEVOLUCAO','INATIVACAO_FUNC','INATIVACAO_EPI','EDICAO_FUNC','SOLICITACAO_APROVADA','SOLICITACAO_RECUSADA','ENTREGA_CONFIRMADA','ENTREGA_RECUSADA','LOGIN','ATIVACAO_FUNC', 'EDICAO_EPI') not null,
    descricao varchar(255) null, -- null: pois ainda não foi preenchido
    equipamento varchar(45) null,
    quantidade int null,
    motivo varchar(100) null,
    responsavel varchar(120) null,
    tb_empresa_id_empresa int not null,
    foreign key (tb_empresa_id_empresa) references tb_empresa(id_empresa)
);

select * from tb_epi;
select * from tb_estoque;