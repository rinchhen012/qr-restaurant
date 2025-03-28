# QR Restaurant Ordering System

A modern restaurant ordering system that allows customers to scan QR codes at their tables to view the menu, place orders, and make special requests. The system includes a kitchen display system for order management and a comprehensive table management interface.

## Features

### Customer Interface

- Scan QR code to access digital menu
- Browse menu items by category
- Select item options and quantities
- Place orders directly from the table
- Request water or staff assistance
- View order status in real-time
- View order history

### Kitchen Display System

- Real-time order notifications
- Order status management (pending, in-progress, completed)
- Special request alerts
- Order queue management
- Sound alerts for new orders

### Table Management System

- Interactive drag-and-drop floor plan editor
- Visual table status indicators (active/inactive, paid/unpaid)
- Real-time table timers showing duration of customer occupancy
- Order information displayed directly on table cards
- Grid snapping and alignment guides for easy layout design
- Multiple table shapes (square, round, rectangle)
- Payment status tracking and management
- Table activation/deactivation with safety checks

### Admin Dashboard

- Menu item management (add, edit, delete)
- Category management
- Price and availability updates
- Order history and tracking

## Tech Stack

- **Frontend**: React, TypeScript, Chakra UI
- **Backend**: Node.js, Express, TypeScript
- **Database**: MongoDB
- **Real-time Communication**: Socket.IO
- **Containerization**: Docker

## Prerequisites

- Docker and Docker Compose
- Node.js v18 or higher (for local development)
- MongoDB (for local development)

## Getting Started

### Using Docker (Recommended)

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/qr-restaurant.git
   cd qr-restaurant
   ```

2. Start the application using Docker Compose:

   ```bash
   docker-compose up --build
   ```

3. Access the applications:
   - Customer Menu: http://localhost:3000/table/1
   - Kitchen Display: http://localhost:3000/kitchen
   - Table Management: http://localhost:3000/tables
   - Admin Dashboard: http://localhost:3000/admin/menu

### Local Development

1. Install dependencies:

   ```bash
   # Install client dependencies
   cd client
   npm install

   # Install server dependencies
   cd ../server
   npm install
   ```

2. Set up environment variables:

   ```bash
   # In server directory
   cp .env.example .env
   ```

3. Start the development servers:

   ```bash
   # Start server (from server directory)
   npm run dev

   # Start client (from client directory)
   npm start
   ```

## Project Structure

```
qr-restaurant/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   │   ├── TableManagement.tsx  # Table floor plan editor
│   │   │   ├── Kitchen.tsx          # Kitchen display system
│   │   │   ├── Menu.tsx             # Customer menu interface
│   │   │   └── Admin.tsx            # Admin dashboard
│   │   ├── utils/          # Utility functions
│   │   └── context/        # React context providers
│   ├── public/
│   ├── Dockerfile
│   └── nginx.conf
├── server/                 # Node.js backend
│   ├── controllers/        # Request handlers
│   ├── models/             # Database models (Table, Order, MenuItem, etc.)
│   ├── routes/             # API routes
│   ├── schemas/            # Validation schemas
│   └── Dockerfile
└── docker-compose.yml      # Docker composition
```

## Development Guidelines

1. **Code Style**

   - Use TypeScript for type safety
   - Follow ESLint and Prettier configurations
   - Write meaningful commit messages

2. **Git Workflow**

   - Create feature branches from `develop`
   - Submit pull requests for review
   - Squash commits before merging

3. **Testing**
   - Test across different devices and browsers
   - Validate UI/UX on both desktop and mobile views

## Recent Updates

- **Enhanced Table Management**: Added comprehensive floor plan editor with drag-and-drop functionality
- **Table Timers**: Implemented active time tracking for tables to monitor customer duration
- **Payment Tracking**: Added visual indicators for order payment status
- **Improved UX**: Added alignment guides, grid snapping, and visual cues for better usability
- **Visual Indicators**: Tables now display real-time information about current orders and status
- **Mobile Optimization**: Improved layout for tablet devices used by staff

## Deployment

1. Build the Docker images:

   ```bash
   docker-compose build
   ```

2. Start the services:

   ```bash
   docker-compose up -d
   ```

3. Seed the database (first time only):
   ```bash
   docker-compose exec server npm run seed
   ```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
