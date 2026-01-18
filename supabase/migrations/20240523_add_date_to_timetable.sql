-- Add date column to timetable_sessions table
ALTER TABLE timetable_sessions ADD COLUMN IF NOT EXISTS "date" DATE;
