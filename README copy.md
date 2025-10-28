# Learning Paths Service

A microservice for managing structured learning journeys with milestones, courses, progress tracking, and completion management.

## Overview

This service provides APIs for:
- Learning path management and browsing
- User enrollment in learning paths
- Course progress tracking with milestone unlocking
- Statistics and analytics
- Certificate generation for completed paths
- Rewards and gamification features

## Port

The service runs on port **4011** by default.

## API Endpoints

### Core Endpoints
- `GET /api/learning-paths` - Get all learning paths with filtering
- `GET /api/learning-paths/{pathId}` - Get specific learning path details
- `GET /api/learning-paths/stats` - Get user's learning path statistics
- `POST /api/learning-paths/enroll` - Enroll in a learning path
- `PUT /api/learning-paths/progress` - Update course progress
- `GET /api/learning-paths/enrollments` - Get user's enrollments

### Certificate & Rewards
- `POST /api/learning-paths/{pathId}/certificate` - Generate completion certificate
- `GET /api/learning-paths/{pathId}/rewards` - Get available rewards

### System Endpoints
- `GET /api/health` - Health check
- `GET /api/version` - Service version

## Features

### Path Management
- Hierarchical structure: Paths → Milestones → Courses
- Sequential progression with automatic unlocking
- Progress tracking and completion management
- Multi-organization support

### Enrollment System
- User enrollment tracking
- Status management (not_started, in_progress, completed)
- Progress calculation and milestone tracking
- Last activity tracking

### Course Progression
- Sequential course unlocking within milestones
- Milestone completion triggers next milestone unlock
- Status transitions: locked → available → in_progress → completed
- Progress persistence and recovery

### Gamification
- Badge system based on path completion
- Points calculation based on progress
- Certificate generation for completed paths
- Skills tracking across learning paths

## Database Schema Requirements

The service expects the following database tables:

### learning_paths
```sql
CREATE TABLE learning_paths (
  id SERIAL PRIMARY KEY,
  title VARCHAR NOT NULL,
  description TEXT,
  category VARCHAR,
  difficulty VARCHAR,
  estimated_time VARCHAR,
  total_courses INTEGER,
  enrolled_students INTEGER DEFAULT 0,
  rating DECIMAL(2,1) DEFAULT 0,
  instructor VARCHAR,
  skills TEXT[], -- Array of skills
  badges TEXT[], -- Array of badge names
  organization_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### milestones
```sql
CREATE TABLE milestones (
  id SERIAL PRIMARY KEY,
  title VARCHAR NOT NULL,
  path_id INTEGER REFERENCES learning_paths(id),
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### courses
```sql
CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  title VARCHAR NOT NULL,
  duration VARCHAR,
  milestone_id INTEGER REFERENCES milestones(id),
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### user_enrollments
```sql
CREATE TABLE user_enrollments (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  path_id INTEGER REFERENCES learning_paths(id),
  status VARCHAR CHECK (status IN ('not_started', 'in_progress', 'completed')),
  progress DECIMAL(5,2) DEFAULT 0,
  completed_courses INTEGER DEFAULT 0,
  enrolled_at TIMESTAMP DEFAULT NOW(),
  last_activity TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, path_id)
);
```

### user_course_progress
```sql
CREATE TABLE user_course_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id INTEGER REFERENCES courses(id),
  status VARCHAR CHECK (status IN ('locked', 'available', 'in_progress', 'completed')),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);
```

### certificates
```sql
CREATE TABLE certificates (
  id SERIAL PRIMARY KEY,
  certificate_id VARCHAR UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  path_id INTEGER REFERENCES learning_paths(id),
  download_url VARCHAR,
  issued_at TIMESTAMP DEFAULT NOW(),
  valid_until TIMESTAMP,
  UNIQUE(user_id, path_id)
);
```

## Development

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm run start
```

## Authentication

All endpoints except `/api/health` and `/api/version` require JWT authentication:

```
Authorization: Bearer {jwt_token}
```

The JWT token should contain:
- `userId`: User's unique identifier
- `organizationId`: User's organization ID
- `email`: User's email address

## Error Handling

The service returns consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

### Error Codes
- `UNAUTHORIZED`: Missing or invalid authentication
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Request validation failed
- `ALREADY_ENROLLED`: User already enrolled
- `PREREQUISITES_NOT_MET`: Prerequisites not completed
- `INTERNAL_ERROR`: Server-side error

## Logging

Logs are written to `../../logs/services/learning-paths-service.log` with structured format including:
- Timestamp
- Log level (INFO, ERROR, DEBUG)
- Message
- Metadata (user ID, path ID, etc.)