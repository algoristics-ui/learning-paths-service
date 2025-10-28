// Type definitions for Learning Paths API
export interface LearningPath {
  id: number;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedTime: string;
  totalCourses: number;
  completedCourses: number;
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number;
  enrolledStudents: number;
  rating: number;
  instructor: string;
  skills: string[];
  nextMilestone: string | null;
  badges: string[];
  milestones: Milestone[];
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: number;
  title: string;
  pathId: number;
  orderIndex: number;
  courses: Course[];
}

export interface Course {
  id: number;
  title: string;
  status: 'available' | 'in_progress' | 'completed' | 'locked';
  duration: string;
  milestoneId: number;
  orderIndex: number;
}

export interface PathStats {
  inProgressCount: number;
  completedCount: number;
  skillsGained: number;
  certificates: number;
}

export interface EnrollmentRequest {
  pathId: number;
  userId: string;
}

export interface ProgressUpdate {
  courseId: number;
  status: 'in_progress' | 'completed';
  completedAt?: string;
}

export interface UserEnrollment {
  pathId: number;
  path: LearningPath;
  enrolledAt: string;
  lastActivity: string;
  currentCourse?: {
    id: number;
    title: string;
    milestone: string;
  };
}