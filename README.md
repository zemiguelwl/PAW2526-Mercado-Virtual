# 🛒 Mercadinho Virtual

> Trabalho Prático — Programação em Ambiente Web | ESTG · P.PORTO | 2025/2026

---

## 📋 Índice

- [Descrição do Projeto](#-descrição-do-projeto)
- [Arquitetura do Sistema](#-arquitetura-do-sistema)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Funcionalidades Implementadas](#-funcionalidades-implementadas)
- [Modelos de Dados](#-modelos-de-dados)
- [REST API — Documentação](#-rest-api--documentação)
- [Estrutura de Ficheiros](#-estrutura-de-ficheiros)
- [Instalação e Configuração](#-instalação-e-configuração)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Executar o Projeto](#-executar-o-projeto)
- [Credenciais de Teste](#-credenciais-de-teste)
- [Decisões de Design](#-decisões-de-design)
- [Funcionalidades Extra](#-funcionalidades-extra-bonificação)
- [Autores](#-autores)

---

## 📌 Descrição do Projeto

O **Mercadinho Virtual** é uma plataforma web de *marketplace* para supermercados locais, desenvolvida no âmbito da UC de Programação em Ambiente Web. Permite que múltiplos supermercados disponibilizem os seus produtos numa plataforma centralizada, onde clientes podem pesquisar, comparar preços e realizar encomendas online, com entrega assegurada por estafetas registados.

O projeto está dividido em dois milestones com requisitos tecnológicos distintos:

| | Milestone 1 | Milestone 2 |
|---|---|---|
| **Âmbito** | Backoffice (admins, supermercados, estafetas) | Frontoffice (clientes) |
| **Frontend** | EJS (Server-Side Rendering) | Angular 18+ (SPA) |
| **Backend** | Express.js + sessões | Express.js + REST API + JWT |


> ⚠️ **Nota importante:** O frontoffice Angular (Milestone 2) foi desenvolvido **exclusivamente para o perfil de cliente**. Todos os outros perfis (administrador, supermercado, estafeta) operam no backoffice EJS em `http://localhost:3000`.

---

## 🏗️ Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENTE (Browser)                            │
│                                                                 │
│   ┌───────────────────────┐   ┌───────────────────────────┐     │
│   │  Angular SPA          │   │  Backoffice EJS           │     │
│   │  localhost:4200       │   │  localhost:3000           │     │
│   │  (perfil: cliente)    │   │  (admin, supermercado,    │     │
│   └──────────┬────────────┘   │   estafeta)               │     │
│              │ HTTP/JSON      └──────────┬────────────────┘     │
│              │ JWT Bearer                 │ Sessão + Cookies    │
└──────────────┼─────────────────────────── │ ────────────────────┘
               │                            │
┌──────────────▼────────────────────────────▼────────────────────┐
│                   Express.js (porta 3000)                      │
│                                                                │
│  ┌─────────────────────┐   ┌──────────────────────────────┐    │
│  │  REST API /api/v1   │   │  Rotas EJS /auth, /admin,    │    │
│  │  jwt.middleware.js  │   │  /supermarket, /courier,     │    │
│  │  ┌───────────────┐  │   │  /catalog, /client           │    │
│  │  │ /auth         │  │   │  auth.middleware.js          │    │
│  │  │ /catalog      │  │   └──────────────────────────────┘    │
│  │  │ /client       │  │                                       │
│  │  └───────────────┘  │                                       │
│  └─────────────────────┘                                       │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Services: order.service · email.service ·               │  │
│  │           coupon.service · delivery.service              │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬─────────────────────────────────┘
                               │ Mongoose ODM
                    ┌──────────▼──────────┐
                    │   MongoDB Atlas     │
                    │                     │
                    │  Users · Products   │
                    │  Orders · Deliveries│
                    │  Supermarkets · ... │
                    └─────────────────────┘
```

---

## 🛠️ Tecnologias Utilizadas

### Backend (comum aos dois milestones)

| Componente | Tecnologia |
|---|---|
| Runtime | Node.js v18+ |
| Framework | Express.js |
| Base de dados | MongoDB + Mongoose |
| Autenticação M1 | express-session + bcrypt |
| Autenticação M2 | JWT (jsonwebtoken) + bcrypt |
| Email | Nodemailer (SMTP / Mailtrap) |
| Upload de imagens | Multer |
| Segurança | Helmet, express-rate-limit |
| Template engine | EJS (Milestone 1) |
| Documentação API | Swagger UI |

### Frontend — Milestone 2 (Angular)

| Componente | Tecnologia |
|---|---|
| Framework | Angular 18 (NgModules) |
| UI Components | Angular Material 18 |
| Formulários | Template-driven Forms |
| HTTP | HttpClient + HTTP_INTERCEPTORS |
| Estado global | RxJS BehaviorSubject |
| Routing | Lazy-loaded feature modules + Guards |

---

## ✅ Funcionalidades Implementadas

### 👤 Cliente — Frontoffice Angular (`localhost:4200`)

- Registo com validação de email (regex RFC-5321) e telemóvel (regex português `[239]\d{8}`)
- Verificação de email por código de 6 dígitos (válido 15 minutos)
- Login com JWT (válido 24h), redirecionamento automático se email não verificado
- Pesquisa de produtos por nome, filtro por categoria e supermercado, ordenação por preço
- **Seletor de quantidade dinâmico** por tipo de produto:
  - `unit` → input numérico com stepper +/−, validado pelo stock disponível
  - `kg` → pills: 100g | 200g | 300g | 400g | 500g | 1 kg | 2 kg | 3 kg
  - `liter` → pills: 250 ml | 500 ml | 1 L | 1,5 L | 2 L | 3 L
- Comparação de preços do mesmo produto entre supermercados
- Carrinho persistido em `localStorage`, restrito a um supermercado por encomenda
- Validação de stock em tempo real (cliente) e atómica no checkout (servidor)
- Checkout com seleção de método de entrega e aplicação de cupões de desconto
- Histórico de encomendas com detalhe de estado e possibilidade de cancelamento
- Cancelamento de encomenda até 5 minutos após confirmação
- Submissão de avaliações (1-5 estrelas) para supermercado e estafeta após entrega
- Edição de perfil (nome, telemóvel, morada)

### 🏪 Supermercado — Backoffice EJS (`localhost:3000`)

- Registo com aprovação obrigatória pelo administrador
- Configuração de horários por dia da semana e métodos de entrega com custos
- CRUD de produtos com imagem, categoria, preço, stock e **tipo de venda** (unidade/kg/litro)
- Ajuste de stock individual
- Gestão de encomendas com transições de estado completas (pendente → confirmada → em preparação → pronta → em entrega → entregue)
- **Ponto de Venda (POS)** para registo de vendas presenciais com associação a cliente
- Criação e gestão de cupões de desconto (percentagem, valor fixo, entrega gratuita)
- Dashboard com métricas de vendas, produtos mais vendidos e alertas de stock baixo

### 🚴 Estafeta — Backoffice EJS (`localhost:3000`)

- Registo com verificação de email
- Visualização de entregas disponíveis (encomendas `ready` com entrega por estafeta)
- Aceitação de entregas (máximo 1 activa em simultâneo)
- Transições de estado: aceite → levantado → entregue
- Cancelamento com devolução automática ao pool de entregas disponíveis
- Histórico de entregas e avaliações recebidas

### 🔑 Administrador — Backoffice EJS (`localhost:3000`)

- Aprovação e rejeição de supermercados com notificação
- Gestão de utilizadores (ativar/desativar contas)
- CRUD de categorias de produtos
- Monitorização global de encomendas com cancelamento forçado
- Gestão de cupões globais e envio massivo por email a utilizadores verificados
- Dashboard com número de utilizadores, supermercados ativos e total de encomendas

---

## 🗃️ Modelos de Dados

### User
```
_id, name, email (único), password (bcrypt), phone, address,
role: ['admin', 'supermarket', 'courier', 'client'],
isEmailVerified, isActive, accountStatus, rating,
supermarketId (ref Supermarket, apenas role=supermarket)
```

### Supermarket
```
_id, owner (ref User), name, description, location,
schedule: { monday..sunday: "HH:MM-HH:MM" | "Fechado" },
deliveryMethods: [{ type: ['pickup','courier','instore'], active, cost }],
status: ['pending','approved','rejected'],
rating, logoImage
```

### Product
```
_id, supermarket (ref), category (ref), name, description,
price, unit: ['unit','kg','liter'], stock, image, isActive
```
> O campo `unit` determina o seletor de quantidade apresentado ao cliente: stepper numérico para `unit`, pills de peso para `kg`, pills de volume para `liter`. O preço representa o custo por unidade, por kg ou por litro, respetivamente.

### Order
```
_id, supermarket (ref), client: { userId, name, email, phone },
items: [{ product, productName, productPrice, quantity, unit }],
subtotal, discountAmount, couponCode, deliveryMethod, deliveryCost, total,
status: ['pending','confirmed','preparing','ready','in_delivery','delivered','cancelled'],
statusHistory: [{ status, changedAt, changedBy, reason }],
source: ['online','pos'], confirmedAt, reviewSubmitted, notes
```
> O stock é decrementado atomicamente no checkout com `findOneAndUpdate + $inc` para evitar race conditions. Quantidades decimais são suportadas para produtos ao kg/litro.

### Delivery
```
_id, order (ref), courier (ref User), status, statusHistory,
acceptedAt, pickedUpAt, deliveredAt, cancelReason
```

### Coupon
```
_id, code (único), type: ['percentage','fixed','free_shipping'],
value, minOrderAmount, maxUses, usedCount,
supermarket (ref, null = global), expiresAt, isActive, assignedTo (ref User)
```

### Review
```
_id, order (ref), author: { name, userId },
targetType: ['supermarket','courier'], targetId,
rating (1-5), comment, isVisible
```

### EmailVerification
```
_id, user (ref), email, code (bcrypt), expiresAt, used
```

---

## 🔌 REST API — Documentação

> Documentação interativa Swagger em `http://localhost:3000/api/docs`

### Auth — `/api/v1/auth`

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/register` | ✗ | Cria conta (client ou courier); envia código de verificação |
| POST | `/verify-email` | ✗ | Verifica email com código de 6 dígitos |
| POST | `/resend-verification` | ✗ | Reenvia código de verificação |
| POST | `/login` | ✗ | Login — devolve JWT (24h) |
| GET | `/me` | JWT | Dados do utilizador autenticado |

### Catálogo — `/api/v1/catalog` (público)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/products` | Produtos com pesquisa, filtros e paginação (24/pág.) |
| GET | `/products/:id` | Detalhe de produto (inclui campo `unit`) |
| GET | `/categories` | Categorias ativas |
| GET | `/supermarkets` | Supermercados aprovados com estado de abertura em tempo real |
| GET | `/supermarkets/:id` | Detalhe de supermercado |
| GET | `/supermarkets/:id/reviews` | Avaliações visíveis de um supermercado |
| GET | `/compare?name=X` | Comparação de preços entre supermercados |

### Cliente — `/api/v1/client` (requer JWT + role=client)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/profile` | Perfil + estatísticas (nº encomendas, top produtos) |
| PUT | `/profile` | Atualizar nome, telefone e morada |
| GET | `/orders` | Listar encomendas ordenadas por data |
| GET | `/orders/:id` | Detalhe + entrega + flag `canCancel` |
| POST | `/orders/:id/cancel` | Cancelar (apenas `pending` ou `confirmed` < 5min) |
| POST | `/orders/:id/review` | Submeter avaliação após entrega |
| POST | `/checkout` | Criar encomenda — decrementa stock atomicamente; suporta `quantity` decimal |
| GET | `/coupons/validate` | Validar cupão antes do checkout |

---

## 📁 Estrutura de Ficheiros

```
PAW_24_8220942_8240621/
│
├── .env                        # Variáveis de ambiente (NÃO versionar — está no .gitignore)
├── .env.example                # Template de configuração
├── .gitignore                  # Exclui .env, node_modules/, dist/, uploads/
├── package.json                # Dependências do backend
├── seed.js                     # Script de população da base de dados
│
├── backend/
│   ├── app.js                  # Configuração Express, middlewares globais, CORS
│   ├── bin/www                 # Ponto de entrada — servidor + conexão MongoDB
│   │
│   ├── controllers/
│   │   ├── api/                # Controladores REST (JSON) — Milestone 2
│   │   │   ├── auth.api.controller.js
│   │   │   ├── catalog.api.controller.js
│   │   │   └── client.api.controller.js
│   │   ├── admin.controller.js
│   │   ├── auth.controller.js
│   │   ├── catalog.controller.js
│   │   ├── client.controller.js
│   │   ├── coupon.controller.js
│   │   ├── courier.controller.js
│   │   ├── order.controller.js
│   │   ├── pos.controller.js
│   │   ├── product.controller.js
│   │   ├── review.controller.js
│   │   └── supermarket.controller.js
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js  # Sessão — backoffice EJS
│   │   ├── jwt.middleware.js   # JWT — REST API
│   │   ├── role.middleware.js  # Autorização por role
│   │   └── upload.middleware.js# Multer — upload de imagens
│   │
│   ├── models/
│   │   ├── Category.js
│   │   ├── Coupon.js
│   │   ├── Delivery.js
│   │   ├── EmailVerification.js
│   │   ├── Order.js            # Items com campo unit (unit/kg/liter)
│   │   ├── Product.js          # Campo unit: enum['unit','kg','liter']
│   │   ├── Review.js
│   │   ├── Supermarket.js
│   │   └── User.js
│   │
│   ├── routes/
│   │   ├── api/                # Rotas REST API
│   │   │   ├── index.js
│   │   │   ├── auth.api.routes.js
│   │   │   ├── catalog.api.routes.js
│   │   │   └── client.api.routes.js
│   │   ├── index.js
│   │   ├── admin.routes.js
│   │   ├── auth.routes.js
│   │   ├── catalog.routes.js
│   │   ├── client.routes.js
│   │   ├── courier.routes.js
│   │   └── supermarket.routes.js
│   │
│   ├── services/
│   │   ├── coupon.service.js   # Validação, aplicação e cupão de boas-vindas
│   │   ├── delivery.service.js # Consultas e estatísticas de entregas
│   │   ├── email.service.js    # SMTP / Mailtrap — verificação, notificações, cupões
│   │   └── order.service.js    # Máquina de estados central das encomendas
│   │
│   ├── swagger/
│   │   └── swagger.js          # Configuração OpenAPI 3.0 — disponível em /api/docs
│   │
│   ├── public/                 # CSS, JS e imagens estáticas do backoffice
│   └── views/                  # Templates EJS
│       ├── layouts/
│       ├── partials/
│       ├── admin/
│       ├── auth/
│       ├── catalog/
│       ├── client/
│       ├── courier/
│       ├── errors/
│       └── supermarket/
│
└── frontend/                   # Angular SPA — Milestone 2 (perfil de cliente)
    ├── angular.json
    ├── proxy.conf.json         # Proxy /api/* e /uploads/* → localhost:3000
    └── src/app/
        ├── app-routing-module.ts
        ├── app.module.ts
        ├── core/
        │   ├── services/
        │   │   ├── auth.service.ts     # JWT, localStorage
        │   │   ├── cart.service.ts     # BehaviorSubject, KG_OPTIONS, LITER_OPTIONS
        │   │   ├── catalog.service.ts
        │   │   ├── order.service.ts
        │   │   └── profile.service.ts
        │   ├── guards/
        │   │   ├── auth.guard.ts       # Protege /orders e /profile
        │   │   └── guest.guard.ts      # Redireciona logados de /auth/*
        │   └── interceptors/
        │       └── auth.interceptor.ts # Injeta Bearer token em todos os pedidos
        ├── features/
        │   ├── auth/           # Login, Register (validação regex), VerifyEmail
        │   ├── catalog/        # Lista produtos, detalhe + seletor qty, comparação
        │   ├── cart/           # Carrinho (dropdown kg/liter), checkout + cupões
        │   ├── orders/         # Lista, detalhe, avaliação
        │   └── profile/        # Editar perfil
        └── shared/
            └── navbar/         # Barra de navegação com badge do carrinho
```

---

## ⚙️ Instalação e Configuração

### Pré-requisitos

- [Node.js](https://nodejs.org/) v18 ou superior
- Conta [MongoDB Atlas](https://www.mongodb.com/atlas) (ou MongoDB local)
- Servidor SMTP ou conta [Mailtrap](https://mailtrap.io/) para envio de emails

### Passos

```bash
# 1. Clonar o repositório
git clone <url-do-repositorio>
cd PAW_24_8220942_8240621

# 2. Instalar dependências do backend
npm install

# 3. Instalar dependências do frontend Angular
cd frontend && npm install && cd ..

# 4. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com os valores reais (ver secção abaixo)

# 5. Popular a base de dados com dados de teste
node seed.js
```

---

## 🔐 Variáveis de Ambiente

Copiar `.env.example` para `.env`. **O ficheiro `.env` está no `.gitignore` e nunca deve ser versionado.**

```env
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# MongoDB
DB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?appName=<app>

# Segurança (strings aleatórias longas — mínimo 32 caracteres)
SESSION_SECRET=<string-aleatoria>
JWT_SECRET=<string-aleatoria>

# Email — Opção A: SMTP (envia emails reais)
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_SECURE=false
EMAIL_SMTP_USER=<email@gmail.com>
EMAIL_SMTP_PASS=<app-password-16-chars>
EMAIL_FROM=<email@gmail.com>

# Email — Opção B: Mailtrap Sandbox (emails captados em mailtrap.io, não chegam ao destinatário)
# EMAIL_API_TOKEN=<token-mailtrap>
# MAILTRAP_INBOX_ID=<inbox-id>
# EMAIL_FROM=noreply@teste.com
```

> **Gmail SMTP:** requer ativação de 2FA e criação de uma *App Password* em [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).

> **`SESSION_SECRET`** é obrigatório — a aplicação não arranca sem esta variável definida.

---

## 🚀 Executar o Projeto

O projeto requer **dois processos em simultâneo**.

### Terminal 1 — Backend

```bash
# Na raiz do projeto
npm start
```

| URL | Descrição |
|---|---|
| `http://localhost:3000` | Backoffice EJS (admin, supermercado, estafeta) |
| `http://localhost:3000/api/v1` | REST API |
| `http://localhost:3000/api/docs` | Documentação Swagger |

### Terminal 2 — Frontend Angular

```bash
cd frontend
npm start
```

| URL | Descrição |
|---|---|
| `http://localhost:4200` | Frontoffice Angular (cliente) |

> O Angular usa `proxy.conf.json` para redirecionar `/api/*` e `/uploads/*` para `localhost:3000`. **Ambos os processos devem estar ativos.**

### Popular base de dados

```bash
node seed.js
```

---

## 🔑 Credenciais de Teste

Após correr `node seed.js`:

### Administrador — Backoffice (`localhost:3000`)

| Email | Password |
|---|---|
| `admin@mercadinho.pt` | `password123` |

### Supermercados — Backoffice (`localhost:3000`)

| Email | Password |
|---|---|
| `antonio@gmail.com` | `password123` |
| `carla@gmail.com` | `password123` |
| `rui@gmail.com` | `password123` |

### Clientes — Frontoffice Angular (`localhost:4200`)

| Email | Password |
|---|---|
| `joao@hotmail.com` | `password123` |
| `sofia@sapo.pt` | `password123` |
| `tiago@gmail.com` | `password123` |

### Estafetas — Backoffice (`localhost:3000`)

| Email | Password |
|---|---|
| `pedro@gmail.com` | `password123` |
| `ana@gmail.com` | `password123` |

> Todas as contas geradas pelo seed têm o email pré-verificado.

---

## 👥 Autores

- **José Miguel** 
- **Afonso Sousa** 

| Campo | Informação |
|---|---|
| **Curso** | Licenciatura em Engenharia Informática |
| **Instituição** | ESTG · Instituto Politécnico do Porto |
| **UC** | Programação em Ambiente Web (PAW) |

