# Jetpack Releases Explorer

A web application for exploring and comparing Android Jetpack library changelogs between two versions.
Loads faster than developer.android.com and gives you an easy way to list changelogs between your
current androidx library version and one you want to update to.

Live version is located here: https://releases.jetpack.love

## 🌟 Features

- 🔍 **Fuzzy search**: In library name or version
- 📊 **Changelog comparison**: Vetween two versions
- 🌓 **Dark/Light Theme**: Comfortable viewing in any environment
- 📱 **Responsive Design**: Works on desktop and mobile
- ⚡ **Static Generation**: Fast loading with no backend required

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v22 or higher)
- [pnpm](https://pnpm.io/) (v9 or higher)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/IlyaGulya/releases.jetpack.love.git
   cd releases.jetpack.love
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

### Development

1. Start the development server:
   ```bash
   pnpm dev
   ```

2. Open [http://localhost:5173](http://localhost:5173) in your browser

### Building

1. Generate static data and build the application:
   ```bash
   pnpm build
   ```

The built files will be in the `packages/spa/dist` directory.

## 🏗️ Project Structure

This is a monorepo using pnpm workspaces with the following packages:

### `/packages/common`

Shared TypeScript interfaces and utilities used across packages.

### `/packages/scraper`

Node.js scraper for fetching and processing Jetpack changelogs:

- Fetches data from Android Developer documentation
- Processes and normalizes changelog content
- Manages library grouping and relationships
- Provides CLI interface for data syncing

### `/packages/spa`

React-based Single Page Application:

- Built with Vite and TypeScript
- Uses TanStack Query for data management
- Styled with Tailwind CSS and shadcn/ui
- Implements fuzzy search with Fuse.js
- Features responsive and accessible design

### `/data`

Storage for processed changelog data and URL mappings:

```
/data/
├── changelogs/              # Processed changelog data
│   ├── activity/
│   │   ├── 1.0.0-alpha01.json
│   │   └── ...
│   └── [library]/
└── url-groups.json         # URL to group mappings
```

## 🛠️ Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm sync-groups` - Update library groupings
- `pnpm sync-changelogs` - Update changelog data
- `pnpm sync-all` - Update both groups and changelogs

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📦 Tech Stack

### Frontend

- React + TypeScript
- TanStack Query
- Tailwind CSS
- shadcn/ui components
- Fuse.js for search
- react-router for routing

### Build Tools

- Vite
- pnpm workspaces
- TypeScript
- ESLint

### Scraper

- Node.js
- Cheerio for parsing

## 📄 License

This project is licensed under the AGPLv3 License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Android Jetpack team for maintaining excellent documentation

---

Built with ❤️ for the Android development community
