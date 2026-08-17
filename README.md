# SIGEPI – Sistema Web de Gerenciamento de Equipamentos de Proteção Individual

> Trabalho de Conclusão de Curso — Técnico em Desenvolvimento de Sistemas  
> Escola Técnica Estadual Ilza Nascimento Pintus — São José dos Campos, 2026

---

## 📋 Sobre o Projeto

O **SIGEPI** é uma aplicação web responsiva desenvolvida para otimizar o gerenciamento de Equipamentos de Proteção Individual (EPIs) em empresas de diferentes portes e setores.

Segundo pesquisa da plataforma Flash, 48% das empresas brasileiras ainda utilizam planilhas eletrônicas para controlar dados de seus colaboradores. No contexto dos EPIs, isso resulta em registros desatualizados, falta de rastreabilidade e risco de descumprimento da NR-6. O SIGEPI surge como solução digital para substituir esses processos manuais.

---

## ✨ Funcionalidades

- **Autenticação** com criptografia de senhas e validação por reCAPTCHA
- **Auto-cadastro do funcionário** e controle por empresa e setor
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
- Extensão [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) no VS Code
- Chaves do [Google reCAPTCHA v2](https://www.google.com/recaptcha/admin) (site key e secret key)

### 1. Clone o repositório

```bash
git clone https://github.com/1x-joka/SIGEPI---TCC.git
cd "SIGEPI - TCC"
```

### 2. Crie o banco de dados

```bash
mysql -u root -p < "Projeto/banco de dados/Códigos SQL/codigo.sql"
```

### 3. Configure e inicie o back-end

```bash
cd Projeto/API
npm install
cp .env.example .env
```

Edite o `.env` com as credenciais do seu banco, o `JWT_SECRET` e a chave secreta do reCAPTCHA. Depois:

```bash
npm start
```

A API sobe em `http://localhost:3000` — ao acessar, deve responder `{"mensagem":"API SIGEPI funcionando!"}`.

### 4. Inicie o front-end

Com a API rodando, abra o VS Code na raiz do projeto, clique com o botão direito em `Projeto/index.html` e escolha **Open with Live Server**.

O sistema abre em `http://127.0.0.1:5500/Projeto/index.html`.

---

## 🗓️ Status do Projeto

| Etapa | Status |
|-------|--------|
| Planejamento e Documentação | ✅ Concluído |
| Prototipação (Figma) | ✅ Concluído |
| Modelagem do Banco de Dados | ✅ Concluído |
| Desenvolvimento Front-end | ✅ Concluído |
| Desenvolvimento Back-end | ✅ Concluído |
| Responsividade | ✅ Concluído |
| Adaptação PWA | ✅ Concluído |
| Testes e Ajustes Finais | 🔄 Em Andamento |

---

## 🎨 Protótipo

Protótipos desenvolvidos no Figma para os diferentes formatos de tela:

| Formato | Link |
|---------|------|
| 🖥️ Desktop (Mac e Windows) | [Abrir no Figma](https://www.figma.com/design/DDS2raMUfaX0Cw292iuYP5/Prototipa%C3%A7%C3%A3o-do-SIGEPI---Desktop?node-id=0-1&p=f&t=PYUyYww3dqNHNQgO-0) |
| 📱 Mobile | [Abrir no Figma](https://www.figma.com/design/UwsJ5lHa5mrJwR0BePkF0z/Prototipa%C3%A7%C3%A3o-do-SIGEPI---Mobile?t=PYUyYww3dqNHNQgO-0) |
| 📲 Tablet (iPad) | [Abrir no Figma](COLE_AQUI_O_LINK_IPAD) |

> 🔗 [Protótipo completo (todas as telas)](https://www.figma.com/design/DDS2raMUfaX0Cw292iuYP5/Prototipa%C3%A7%C3%A3o-do-SIGEPI?node-id=0-1&t=oVStPrEXnrAm0S5V-1)

## 📚 Documentação

A documentação completa do projeto está na pasta `/Documentação`, incluindo:

- Regras de negócio
- Requisitos funcionais e não funcionais
- Diagrama de casos de uso
- Tecnologias Adotadas
- Viabilidades
- Modelo entidade-relacionamento (MER)
- Cronograma de desenvolvimento

---

## 📄 Licença

Este projeto foi desenvolvido para fins acadêmicos como Trabalho de Conclusão de Curso do curso Técnico em Desenvolvimento de Sistemas da ETEC Ilza Nascimento Pintus.

---

Desenvolvido pela equipe SIGEPI — São José dos Campos, 2026
