
# Lost and Found Management System

A full-stack web application for managing lost and found items with real-time notifications, user authentication, and admin capabilities.

## Features

- User Authentication & Authorization
- Lost/Found Item Reporting
- Real-time Notifications via WebSocket
- Item Status Tracking (Lost, Found, Claimed, Returned)
- Admin Dashboard
- Role-based Access Control
- Search Functionality
- Image Upload Support
- Activity Logging

## Tech Stack

- **Frontend**: React, Tailwind CSS, Radix UI Components
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: WebSocket
- **Authentication**: Passport.js
- **Validation**: Zod

## Project Structure

```
├── client/          # React frontend application
├── server/          # Express backend server
├── shared/          # Shared types and schemas
├── migrations/      # Database migrations
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The application will be available at port 5000.
