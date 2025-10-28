# Learning Paths Service - Code Walkthrough

## Overview

The Learning Paths Service is a comprehensive microservice built with Next.js that manages structured learning journeys in the LMS ecosystem. It handles path enrollment, progress tracking, milestone management, and gamification features like certificates and rewards.

## Table of Contents

1. [Architecture & Design](#architecture--design)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Code Flow & Logic](#code-flow--logic)
7. [Configuration](#configuration)
8. [Local Development Setup](#local-development-setup)
9. [Testing & Debugging](#testing--debugging)
10. [Integration](#integration)

---

## Architecture & Design

### Microservices Pattern
The service follows a **microservices architecture** with:
- **Independent deployment** on port 4011
- **Database connection pooling** for PostgreSQL
- **JWT-based authentication** for security
- **RESTful API design** with structured responses
- **Horizontal scaling** capability

### Core Concepts
```
Learning Path → Milestones → Courses
     ↓              ↓          ↓
  Progress      Sequential   Status
  Tracking      Unlocking   Management
```

### Business Logic Flow
1. **Path Discovery**: Users browse available learning paths
2. **Enrollment**: Users enroll in paths they want to pursue
3. **Sequential Learning**: Courses unlock as prerequisites are completed
4. **Progress Tracking**: Real-time progress calculation and persistence
5. **Milestone Completion**: Automatic unlocking of next milestone
6. **Gamification**: Badges, points, and certificates upon completion

---

## Tech Stack

### Core Framework
- **Next.js 14.2.5**: React framework with API routes
- **TypeScript 5.4.5**: Type safety and developer experience
- **React 18.2.0**: Component-based UI (minimal usage)

### Database & Authentication
- **PostgreSQL**: Primary database with connection pooling
- **pg 8.11.3**: PostgreSQL client for Node.js
- **jose 5.9.6**: JWT verification and handling

### Validation & Environment
- **Zod 3.23.8**: Runtime type validation and schema parsing
- **dotenv 17.2.2**: Environment variable management

### Development Tools
- **@types/node**: TypeScript definitions
- **@types/react**: React TypeScript definitions

---

## Project Structure

```
services/learning-paths-service/
├── app/                                 # Next.js App Router
│   ├── api/                            # API route handlers
│   │   ├── health/route.ts             # Health check endpoint
│   │   ├── version/route.ts            # Service version info
│   │   └── learning-paths/
│   │       ├── route.ts                # Main paths CRUD (GET)
│   │       ├── [pathId]/
│   │       │   ├── route.ts            # Individual path details
│   │       │   ├── certificate/route.ts # Certificate generation
│   │       │   └── rewards/route.ts    # Rewards & gamification
│   │       ├── enroll/route.ts         # Path enrollment
│   │       ├── progress/route.ts       # Course progress updates
│   │       ├── stats/route.ts          # User statistics
│   │       └── enrollments/route.ts    # User enrollments list
│   ├── layout.tsx                      # Root layout component
│   └── page.tsx                        # Service landing page
├── lib/                                # Shared utilities
│   ├── auth.ts                         # JWT authentication helper
│   ├── db.ts                           # Database connection & pooling
│   ├── env.ts                          # Environment validation
│   ├── logger.ts                       # Structured logging
│   └── types.ts                        # TypeScript type definitions
├── middleware.ts                       # JWT authentication middleware
├── next.config.js                      # Next.js configuration
├── package.json                        # Dependencies & scripts
├── README.md                           # Service documentation
└── Code-Walkthrough.md                 # This file
```

### Key Design Patterns

#### 1. **Route-based API Structure**
```typescript
// app/api/learning-paths/route.ts
export async function GET(req: NextRequest) {
  // Handle listing learning paths with filtering
}
```

#### 2. **Middleware Authentication**
```typescript
// middleware.ts
export async function middleware(req: NextRequest) {
  // JWT validation for all protected routes
}
```

#### 3. **Database Abstraction**
```typescript
// lib/db.ts
export async function query<T>(text: string, params?: any[]) {
  // PostgreSQL connection pooling
}
```

#### 4. **Type Safety**
```typescript
// lib/types.ts
export interface LearningPath {
  // Comprehensive type definitions
}
```

---

## Database Schema

The service expects these PostgreSQL tables:

### Core Tables

#### `learning_paths`
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
  skills TEXT[],                    -- PostgreSQL array
  badges TEXT[],                    -- PostgreSQL array
  organization_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `milestones`
```sql
CREATE TABLE milestones (
  id SERIAL PRIMARY KEY,
  title VARCHAR NOT NULL,
  path_id INTEGER REFERENCES learning_paths(id),
  order_index INTEGER NOT NULL,     -- Sequential ordering
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `courses`
```sql
CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  title VARCHAR NOT NULL,
  duration VARCHAR,
  milestone_id INTEGER REFERENCES milestones(id),
  order_index INTEGER NOT NULL,     -- Sequential ordering
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Progress Tracking Tables

#### `user_enrollments`
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
  UNIQUE(user_id, path_id)          -- Prevent duplicate enrollments
);
```

#### `user_course_progress`
```sql
CREATE TABLE user_course_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id INTEGER REFERENCES courses(id),
  status VARCHAR CHECK (status IN ('locked', 'available', 'in_progress', 'completed')),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, course_id)        -- One record per user-course
);
```

#### `certificates`
```sql
CREATE TABLE certificates (
  id SERIAL PRIMARY KEY,
  certificate_id VARCHAR UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  path_id INTEGER REFERENCES learning_paths(id),
  download_url VARCHAR,
  issued_at TIMESTAMP DEFAULT NOW(),
  valid_until TIMESTAMP,
  UNIQUE(user_id, path_id)          -- One certificate per user-path
);
```

---

## API Endpoints

### Core Learning Paths Management

#### `GET /api/learning-paths`
**Purpose**: List and filter learning paths
```typescript
// Query parameters
interface QueryParams {
  status?: 'not_started' | 'in_progress' | 'completed';
  category?: string;
  difficulty?: string;
  page?: number;
  limit?: number;
}

// Response format
interface Response {
  success: boolean;
  data: {
    paths: LearningPath[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}
```

#### `GET /api/learning-paths/{pathId}`
**Purpose**: Get detailed path information with milestones and courses
```typescript
// Response includes full path details with nested structure
interface LearningPath {
  id: number;
  title: string;
  milestones: Milestone[];
  // ... full path data
}
```

### User Interaction Endpoints

#### `POST /api/learning-paths/enroll`
**Purpose**: Enroll user in a learning path
```typescript
// Request body
interface EnrollmentRequest {
  pathId: number;
}

// Business logic
1. Validate path exists and belongs to user's organization
2. Check for existing enrollment
3. Create enrollment record
4. Initialize first course as 'available'
```

#### `PUT /api/learning-paths/progress`
**Purpose**: Update course progress and handle unlocking logic
```typescript
// Request body
interface ProgressUpdate {
  courseId: number;
  status: 'in_progress' | 'completed';
  completedAt?: string;
}

// Complex business logic flow:
1. Validate course and user enrollment
2. Update course progress
3. If completed:
   a. Check for next course in milestone
   b. If milestone complete, unlock next milestone
   c. Calculate overall path progress
   d. Update path status if 100% complete
```

### Analytics & Gamification

#### `GET /api/learning-paths/stats`
**Purpose**: Get user's learning statistics
```typescript
// Aggregated data from multiple enrollments
interface PathStats {
  inProgressCount: number;
  completedCount: number;
  skillsGained: number;
  certificates: number;
}
```

#### `POST /api/learning-paths/{pathId}/certificate`
**Purpose**: Generate completion certificates
```typescript
// Business logic:
1. Verify path completion (100% progress)
2. Check for existing certificate
3. Generate unique certificate ID
4. Create download URL
5. Set 2-year validity period
```

---

## Code Flow & Logic

### Authentication Flow
```typescript
// middleware.ts - Applied to all routes except health/version
Request → JWT Extraction → Token Verification → User Context → Route Handler
```

### Path Listing Flow
```typescript
// app/api/learning-paths/route.ts
1. Extract user from JWT token
2. Parse query parameters (filters, pagination)
3. Build dynamic SQL query with filters
4. Fetch paths with user enrollment status
5. For each path:
   - Get milestones and courses
   - Calculate next milestone
   - Format response data
6. Return paginated response
```

### Progress Update Flow
```typescript
// app/api/learning-paths/progress/route.ts
1. Validate request (courseId, status)
2. Fetch course and path information
3. Verify user enrollment
4. Update course progress record
5. If course completed:
   a. Check for next course in milestone
   b. Unlock next course or milestone
   c. Recalculate path progress
   d. Update enrollment status
6. Return progress update response
```

### Enrollment Flow
```typescript
// app/api/learning-paths/enroll/route.ts
1. Validate pathId parameter
2. Check path exists in user's organization
3. Verify no existing enrollment
4. Create enrollment record
5. Initialize first course as 'available'
6. Return enrollment confirmation
```

### Database Transaction Patterns
```typescript
// Complex operations use multiple queries
try {
  await query('BEGIN');
  await query('UPDATE user_course_progress...');
  await query('INSERT INTO user_course_progress...');
  await query('UPDATE user_enrollments...');
  await query('COMMIT');
} catch (error) {
  await query('ROLLBACK');
  throw error;
}
```

---

## Configuration

### Environment Variables
```bash
# Required environment variables
DATABASE_URL="postgresql://user:password@localhost:5432/lms_db"
JWT_SECRET="dev_jwt_secret_change_me"

# Optional environment variables
NODE_ENV="development"
PORT="4011"
```

### Database Connection
```typescript
// lib/db.ts
- Uses connection pooling for performance
- Global connection reuse in development
- Parameterized queries for security
- Error handling and logging
```

### JWT Configuration
```typescript
// lib/auth.ts & middleware.ts
- HS256 signing algorithm
- Token extraction from Authorization header
- User context extraction (userId, organizationId, email)
- Route-level protection
```

### Logging Configuration
```typescript
// lib/logger.ts
- Structured logging to file system
- Log levels: info, error, debug
- Automatic log rotation
- Service-specific log files
```

---

## Local Development Setup

### Prerequisites
1. **Node.js 18+** and npm
2. **PostgreSQL 16+** running locally
3. **Git** for version control

### Step-by-Step Setup

#### 1. **Clone and Navigate**
```bash
cd /Users/s1dando/LMS/services/learning-paths-service
```

#### 2. **Install Dependencies**
```bash
npm install
```

#### 3. **Database Setup**
```bash
# Start PostgreSQL (if using local instance)
bash ../../postgresql/scripts/start_postgres.sh

# Create database and tables (if not exists)
bash ../../postgresql/scripts/create_lms_db.sh

# Verify connection
bash ../../postgresql/scripts/connect_db.sh
```

#### 4. **Environment Configuration**
```bash
# Set environment variables (automatically handled by run-services.sh)
export DATABASE_URL="postgresql://lms_user:lms_password_2024@localhost:5432/lms_db"
export JWT_SECRET="dev_jwt_secret_change_me"
```

#### 5. **Start Service**

**Option A: Individual Service**
```bash
npm run dev
# Service runs on http://localhost:4011
```

**Option B: All Services (Recommended)**
```bash
# From project root
bash scripts/run-services.sh start
# Starts all services including learning-paths-service
```

#### 6. **Verify Service**
```bash
# Health check
curl http://localhost:4011/api/health

# Version info
curl http://localhost:4011/api/version

# Expected responses:
# Health: {"status":"ok"}
# Version: {"name":"learning-paths-service","version":"0.1.0"}
```

---

## Testing & Debugging

### API Testing with Swagger UI

#### 1. **Access Swagger Documentation**
```bash
# Start all services
bash scripts/run-services.sh start

# Open Swagger UI
open http://localhost:4000
```

#### 2. **Authentication Setup**
```bash
# Generate JWT token
export JWT_SECRET=dev_jwt_secret_change_me
TOKEN=$(bash scripts/generate-jwt.sh -t 10m)
echo $TOKEN
```

#### 3. **Test Endpoints**
```bash
# Using Swagger UI:
1. Click "Authorize" button
2. Paste JWT token (without "Bearer ")
3. Test any learning-paths endpoint

# Using curl:
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:4000/api/proxy/learning-paths/learning-paths
```

### Direct API Testing

#### List Learning Paths
```bash
curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:4011/api/learning-paths?status=in_progress&page=1&limit=5"
```

#### Enroll in Path
```bash
curl -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"pathId": 1}' \
     http://localhost:4011/api/learning-paths/enroll
```

#### Update Progress
```bash
curl -X PUT \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"courseId": 1, "status": "completed"}' \
     http://localhost:4011/api/learning-paths/progress
```

### Debugging Tools

#### 1. **Log Files**
```bash
# Service logs
tail -f ../../logs/services/learning-paths-service.log

# PostgreSQL logs
tail -f ../../postgresql/logs/postgresql.log
```

#### 2. **Database Debugging**
```bash
# Connect to database
bash ../../postgresql/scripts/connect_db.sh

# Check tables
\dt

# Query data
SELECT * FROM learning_paths LIMIT 5;
SELECT * FROM user_enrollments WHERE user_id = 'user-uuid';
```

#### 3. **Service Status**
```bash
# Check all services
bash scripts/run-services.sh status

# Check specific port
lsof -i :4011
```

### Common Issues & Solutions

#### **Service Won't Start**
```bash
# Check port availability
lsof -i :4011

# Kill existing process
kill $(lsof -t -i :4011)

# Check logs
cat ../../logs/services/learning-paths-service.log
```

#### **Database Connection Issues**
```bash
# Verify PostgreSQL is running
ps aux | grep postgres

# Test connection
psql "postgresql://lms_user:lms_password_2024@localhost:5432/lms_db" -c "SELECT 1;"
```

#### **JWT Authentication Issues**
```bash
# Verify JWT secret
echo $JWT_SECRET

# Test token generation
bash scripts/generate-jwt.sh -t 1h

# Decode JWT (for debugging)
# Use online JWT decoder or jwt-cli tool
```

---

## Integration

### Service Dependencies

#### **Required Services**
- **PostgreSQL**: Primary database
- **docs-service**: Swagger documentation and API proxy

#### **Optional Services**
- **user-service**: User management integration
- **organization-service**: Organization context
- **logging-service**: Centralized logging

### Frontend Integration

#### **API Client Usage**
```typescript
// Example frontend integration
const apiClient = axios.create({
  baseURL: 'http://localhost:4000/api/proxy/learning-paths',
  headers: {
    'Authorization': `Bearer ${userToken}`
  }
});

// Fetch learning paths
const paths = await apiClient.get('/learning-paths?status=in_progress');

// Enroll in path
await apiClient.post('/learning-paths/enroll', { pathId: 1 });

// Update progress
await apiClient.put('/learning-paths/progress', {
  courseId: 1,
  status: 'completed'
});
```

#### **State Management**
```typescript
// Learning paths state management
interface LearningPathsState {
  paths: LearningPath[];
  enrollments: UserEnrollment[];
  stats: PathStats;
  loading: boolean;
  error: string | null;
}
```

### Deployment Considerations

#### **Production Environment**
```bash
# Build for production
npm run build

# Start production server
npm run start

# Environment variables
DATABASE_URL="production_postgresql_url"
JWT_SECRET="production_jwt_secret"
NODE_ENV="production"
```

#### **Monitoring & Health Checks**
```bash
# Health endpoint for load balancers
GET /api/health

# Version endpoint for deployment tracking
GET /api/version

# Service metrics
GET /api/learning-paths/stats
```

### Performance Considerations

#### **Database Optimization**
- Connection pooling for concurrent requests
- Indexed queries on organization_id and user_id
- Efficient JOIN operations for nested data
- Pagination for large result sets

#### **Caching Strategy**
- Path metadata caching
- User enrollment status caching
- Statistics aggregation caching

#### **Scaling Options**
- Horizontal scaling with load balancers
- Read replicas for heavy read operations
- Service mesh integration
- Container orchestration

---

## Summary

The Learning Paths Service is a robust, scalable microservice that provides comprehensive learning journey management. It features:

- **Modern Tech Stack**: Next.js, TypeScript, PostgreSQL
- **Secure Authentication**: JWT-based security
- **Complex Business Logic**: Sequential course unlocking, progress tracking
- **Comprehensive API**: 8 endpoints covering all learning path operations
- **Developer Friendly**: Extensive documentation, Swagger integration
- **Production Ready**: Logging, error handling, scalability considerations

The service integrates seamlessly with the broader LMS ecosystem while maintaining independence and focused functionality.