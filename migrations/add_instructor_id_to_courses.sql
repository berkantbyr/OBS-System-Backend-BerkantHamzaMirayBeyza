-- Migration: Add instructor_id to courses table
-- Created: 2025-01-XX
-- Description: Adds instructor_id column to courses table to allow admin to assign courses to faculty

-- Add instructor_id column to courses table
ALTER TABLE courses 
ADD COLUMN instructor_id CHAR(36) NULL AFTER department_id;

-- Add foreign key constraint
ALTER TABLE courses
ADD CONSTRAINT fk_courses_instructor
FOREIGN KEY (instructor_id) REFERENCES faculty(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_courses_instructor_id ON courses(instructor_id);

