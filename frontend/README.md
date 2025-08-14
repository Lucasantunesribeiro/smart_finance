# SmartFinance Frontend

A modern, responsive financial management dashboard built with Next.js 14, TypeScript, and Tailwind CSS.

## 🚀 Features

- **Modern UI/UX**: Clean, responsive design with Tailwind CSS
- **Authentication**: JWT-based authentication with refresh tokens
- **Real-time Updates**: SignalR integration for live data updates
- **Dashboard**: Comprehensive financial overview with charts and statistics
- **Type Safety**: Full TypeScript support with strict type checking
- **Performance**: Optimized with React Query for data fetching and caching
- **Responsive**: Mobile-first design that works on all devices

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Authentication**: JWT tokens with automatic refresh
- **Real-time**: SignalR for WebSocket connections
- **UI Components**: Custom components with Lucide React icons
- **Notifications**: Sonner for toast notifications

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page (Dashboard)
│   │   ├── login/             # Login page
│   │   └── providers.tsx      # App providers
│   ├── components/            # Reusable UI components
│   │   ├── auth/              # Authentication components
│   │   ├── dashboard/         # Dashboard components
│   │   └── ui/                # Generic UI components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utility libraries
│   ├── services/              # API service layer
│   └── types/                 # TypeScript type definitions
├── public/                    # Static assets
├── tailwind.config.js         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
└── next.config.js             # Next.js configuration
```

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SmartFinance/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
   NEXT_PUBLIC_SIGNALR_URL=http://localhost:5000/financehub
   NEXT_PUBLIC_PAYMENT_SERVICE_URL=http://localhost:3001/api/v1
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## 🏗️ Architecture

### Authentication Flow
1. User logs in with credentials
2. JWT access token and refresh token are stored
3. API requests include access token in headers
4. Automatic token refresh on expiration
5. SignalR connection authenticated with access token

### State Management
- **React Query**: Server state management and caching
- **React Context**: Authentication and SignalR state
- **Local Storage**: Token persistence

### API Integration
- **Axios**: HTTP client with interceptors
- **Automatic Retry**: Failed requests are retried
- **Error Handling**: Centralized error handling with user-friendly messages

## 🎨 UI Components

### Dashboard
- Financial overview cards (Net Amount, Income, Expenses, Transaction Count)
- Recent transactions list with status indicators
- Period selector (7d, 30d, 90d, 365d)
- Responsive grid layout

### Authentication
- Login form with validation
- Protected routes with AuthGuard
- Automatic redirects based on auth state

## 📱 Responsive Design

The application is fully responsive and optimized for:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (320px - 767px)

## 🔒 Security Features

- JWT token-based authentication
- Automatic token refresh
- Protected routes
- XSS protection
- Input validation
- Secure API communication

## 🚀 Performance Optimizations

- **Static Generation**: Pre-rendered pages for better performance
- **Code Splitting**: Automatic code splitting with Next.js
- **Image Optimization**: Built-in Next.js image optimization
- **Bundle Analysis**: Optimized bundle size
- **Caching**: React Query caching strategy

## 🧪 Testing

The project includes:
- TypeScript type checking
- ESLint for code quality
- Build verification

## 📦 Docker Support

The application can be containerized using the provided Dockerfile:

```bash
docker build -t smartfinance-frontend .
docker run -p 3000:3000 smartfinance-frontend
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and type checking
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🔮 Future Enhancements

- [ ] Dark mode support
- [ ] Advanced charts and analytics
- [ ] Export functionality
- [ ] Multi-language support
- [ ] PWA capabilities
- [ ] Enhanced mobile experience

---

Built with ❤️ using Next.js, TypeScript, and Tailwind CSS