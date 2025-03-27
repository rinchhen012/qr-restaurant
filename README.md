# QR Restaurant Ordering System

A modern restaurant ordering system that allows customers to scan QR codes at their tables to view the menu, place orders, and make special requests. The system includes a kitchen display system for order management.

## Features

### Customer Interface

- Scan QR code to access digital menu
- Browse menu items by category
- Place orders directly from the table
- Real-time order status updates
- Special requests (water/service)
- Cart management
- Order history

### Kitchen Display System

- Real-time order notifications
- Order status management
- Special request notifications
- Active and completed orders view
- Sound alerts for new orders

### Admin Dashboard

- Menu item management
- Category management
- Order tracking
- Staff management

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
   git clone https://github.com/rinchhen012/qr-restaurant.git
   cd qr-restaurant
   ```

2. Start the application using Docker Compose:

   ```bash
   docker-compose up --build
   ```

3. Access the applications:
   - Customer Menu: http://localhost:3000/table/1
   - Kitchen Display: http://localhost:3000/kitchen
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
│   ├── public/
│   ├── Dockerfile
│   └── nginx.conf
├── server/                 # Node.js backend
│   ├── src/
│   ├── controllers/
│   ├── models/
│   ├── routes/
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
   - Write unit tests for new features
   - Ensure all tests pass before committing
   - Test across different devices and browsers

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
