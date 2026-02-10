# Base Web Application

> A robust, generalized React/TypeScript foundation for building modern web applications.

## 📋 Overview

This Base Web Application serves as a scalable starting point for new projects, providing essential features like authentication, user management, and UI components out of the box, without domain-specific logic.

### Core Features

- 🔐 **Authentication**: Complete flow (Login, Register, Logout) with JWT and RBAC.
- 👥 **User Management**: Profile management and admin user controls.
- 🖼️ **UI Components**: Built on Ant Design 5 with a consistent layout system.
- 🧩 **Modular Structure**: Clean architecture using Redux Toolkit and feature-based slicing.

## 🚀 Getting Started

### 📦 Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### 🔧 Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd Base/Web

# Install dependencies
npm install

# Configure Environment
cp .env.example .env
```

### 💻 Development

```bash
# Start the development server
npm run dev
```
Access the app at `http://localhost:3001` (or the port specified by Vite).

### 🏗️ Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
src/
├── components/        # Reusable UI components
├── config/            # App configuration (API, constants)
├── hooks/             # Custom React hooks
├── layouts/           # Page layouts (Auth, Main, Admin)
├── pages/             # Page views
├── routes/            # Route definitions
├── services/          # API services
├── store/             # Redux state management
├── types/             # TypeScript definitions
└── utils/             # Helper functions
```

## 🛠️ Tech Stack

- **Core**: React 18, TypeScript, Vite
- **UI**: Ant Design 5, LESS
- **State**: Redux Toolkit
- **Routing**: React Router v6
- **HTTP**: Axios

## 🤝 Contributing

This is a base project intended to be cloned and customized.

1. Clone the repo for your new project.
2. Update `package.json` with your project details.
3. Start building your features!


## 📄 License

This project is licensed under the MIT License.

## 👥 Team

- **Development Team**: Sen Development Team
- **Contact**: support@sen-game.com
- **GitHub**: [Tunhoclaptrinh](https://github.com/Tunhoclaptrinh)

## 📞 Support

- 📧 Email: support@sen.com
- 🐛 Issues: [GitHub Issues](https://github.com/Tunhoclaptrinh/Sen-Web/issues)
- 📖 Docs: [Documentation](https://docs.sen-game.com)

---

**Version**: 2.0.0  
**Last Updated**: January 10, 2026  
**Status**: Production Ready

**New in v2.0.0**:
- 🤖 AI Chat Assistant với RAG Pipeline
- 🎵 Text-to-Speech tiếng Việt
- 📱 Responsive chat interface
- 🔄 Real-time messaging với Redux

