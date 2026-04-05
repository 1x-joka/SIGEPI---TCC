# SIGEPI – Sistema Web de Gerenciamento de Equipamentos de Proteção Individual

> Trabalho de Conclusão de Curso — Técnico em Desenvolvimento de Sistemas  
> Escola Técnica Estadual Ilza Nascimento Pintus — São José dos Campos, 2026

---

## 📋 Sobre o Projeto

O **SIGEPI** é uma aplicação web responsiva desenvolvida para otimizar o gerenciamento de Equipamentos de Proteção Individual (EPIs) em empresas de diferentes portes e setores.

Segundo pesquisa da plataforma Flash, 48% das empresas brasileiras ainda utilizam planilhas eletrônicas para controlar dados de seus colaboradores. No contexto dos EPIs, isso resulta em registros desatualizados, falta de rastreabilidade e risco de descumprimento da NR-6. O SIGEPI surge como solução digital para substituir esses processos manuais.

---

## ✨ Funcionalidades

- **Autenticação** com criptografia de senhas e validação por CAPTCHA
- **Cadastro de funcionários** e controle por empresa e setor
- **Cadastro e gestão de EPIs** com categorias e validade
- **Controle de estoque** com alertas automáticos de reposição
- **Registro de entregas e devoluções** com histórico completo
- **Dashboard** com indicadores visuais e EPIs mais utilizados
- **Geração de relatórios** exportáveis em PDF
- **Progressive Web App (PWA)** para uso em dispositivos móveis

---

## 🛠️ Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Front-end | HTML, CSS, JavaScript |
| Back-end | Node.js + Express.js |
| Banco de Dados | MySQL |
| Prototipação | Figma |
| Testes de API | Postman |
| Versionamento | Git + GitHub |

---

## 👥 Equipe

| Nome | Função |
|------|--------|
| Davi Delmondes Machado | Scrum Master |
| Igor de Oliveira Bernardo | Developer |
| João Pedro Bernardes Cardoso | Product Owner |
| Joaquim Pereira Lima | Developer |

---

## 🚀 Como Rodar o Projeto

### Pré-requisitos

- [Node.js](https://nodejs.org/) v18 ou superior
- [MySQL](https://www.mysql.com/) v8 ou superior
- [Git](https://git-scm.com/)

### Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/sigepi.git
cd sigepi

# 2. Instale as dependências do back-end
cd src/backend
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas credenciais do banco de dados

# 4. Execute os scripts SQL para criar o banco
mysql -u root -p < database/sigepi.sql

# 5. Inicie o servidor
npm start
```

Acesse em: `http://localhost:3000`

---

## 🗓️ Status do Projeto

| Etapa | Status |
|-------|--------|
| Planejamento e Documentação | ✅ Concluído |
| Prototipação (Figma) | ✅ Concluído |
| Modelagem do Banco de Dados | ✅ Concluído |
| Desenvolvimento Back-end | 🔄 Em andamento |
| Desenvolvimento Front-end | 🔄 Em andamento |
| Adaptação PWA | ⏳ Previsto |
| Testes e Ajustes Finais | ⏳ Previsto |

---

## 🎨 Protótipo

> 🔗 [Visualizar protótipo no Figma](https://www.figma.com/design/DDS2raMUfaX0Cw292iuYP5/Prototipa%C3%A7%C3%A3o-do-SIGEPI?node-id=14-16&t=QGWUwhOPTXNjq9C6-1)

---

## 📚 Documentação

A documentação completa do projeto está na pasta `/docs`, incluindo:

- Regras de negócio
- Requisitos funcionais e não funcionais
- Diagrama de casos de uso
- Modelo entidade-relacionamento (MER)
- Cronograma de desenvolvimento

---

## 📄 Licença

Este projeto foi desenvolvido para fins acadêmicos como Trabalho de Conclusão de Curso do curso Técnico em Desenvolvimento de Sistemas da ETEC Ilza Nascimento Pintus.

---

Desenvolvido pela equipe SIGEPI — São José dos Campos, 2026