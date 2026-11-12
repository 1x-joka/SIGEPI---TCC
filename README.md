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

Edite o .env preenchendo cada variável (o .env.example já traz todas elas como guia):

- **Banco de dados:** `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` — credenciais do seu MySQL.
- **Servidor:** `PORT` (padrão `3000`).
- **`JWT_SECRET`:** chave para assinar os tokens de login. Gere uma com `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
- **`RECAPTCHA_SECRET`:** a *secret key* do Google reCAPTCHA v2.
- **Recuperação de senha (Resend):** `RESEND_API_KEY`, `APP_URL` (ex.: `http://localhost:3000`) e `EMAIL_REMETENTE` (e-mail remetente verificado no Resend).

Depois:

```bash
npm start
```

A API sobe na porta 3000 (aparece Servidor rodando na porta 3000 no terminal) e o sistema abre em `http://localhost:3000`

### 4. Acesse o Sistema !

Com a API rodando (npm start), abra o navegador em `http://localhost:3000`. O próprio servidor já entrega o front-end e a API no mesmo endereço.

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
