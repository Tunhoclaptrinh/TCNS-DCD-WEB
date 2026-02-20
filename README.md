# Base Web Application

> A robust, generalized React/TypeScript foundation for building modern web applications.

## 📋 Overview

This Base Web Application serves as a scalable starting point for new projects, providing essential features like authentication, user management, and UI components out of the box.

### Core Features

- 🔐 **Authentication**: Complete flow (Login, Register, Logout) with JWT and Dynamic Permission-based Access Control.
- 👥 **User Management**: Profile management and admin user controls with advanced filtering.
- 🖼️ **UI Components**: Built on Ant Design 5 with a premium, consistent layout system.
- 🧩 **Modular Structure**: Clean architecture using Redux Toolkit and feature-based slicing.
- 📊 **Smart Data Tables**: Unified `DataTable` component with `useCRUD` hook for rapid development.

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
- **UI**: Ant Design 5, LESS (Lotus Pink Theme)
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

## 👤 Author

- **GitHub**: [Tunhoclaptrinh](https://github.com/Tunhoclaptrinh)

---

**Version**: 2.1.0  
**Last Updated**: February 20, 2026  
**Status**: Production Ready
