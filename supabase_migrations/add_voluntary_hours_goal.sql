-- Migration: Add voluntary_hours_goal to profiles table
-- Description: Adds a column to allow users to set their personal volunteer hours goal
-- Date: 2025-10-04

-- Add the voluntary_hours_goal column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS voluntary_hours_goal INTEGER DEFAULT 50;

-- Add a check constraint to ensure the goal is within reasonable limits
ALTER TABLE profiles 
ADD CONSTRAINT voluntary_hours_goal_check 
CHECK (voluntary_hours_goal IS NULL OR (voluntary_hours_goal >= 10 AND voluntary_hours_goal <= 500));

-- Add a comment to document the column
COMMENT ON COLUMN profiles.voluntary_hours_goal IS 'User''s personal target for volunteer hours';

-- Update the get_user_profile_data RPC function to include the new field
-- This assumes the function exists and needs to be updated
CREATE OR REPLACE FUNCTION get_user_profile_data(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'profile', (
            SELECT row_to_json(p.*)
            FROM profiles p
            WHERE p.id = p_user_id
        ),
        'registrations', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'id', er.id,
                    'role', er.role,
                    'status', er.status,
                    'events', json_build_object(
                        'id', e.id,
                        'title', e.title,
                        'start_time', e.start_time,
                        'end_time', e.end_time,
                        'location', e.location
                    )
                )
            ), '[]'::json)
            FROM event_registrations er
            LEFT JOIN events e ON er.event_id = e.id
            WHERE er.user_id = p_user_id
        ),
        'eventHours', (
            SELECT COALESCE(SUM(
                CASE 
                    WHEN er.status = 'attended' AND er.role = 'organizer' 
                    THEN EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600.0 * 1.5
                    WHEN er.status = 'attended' 
                    THEN EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600.0
                    ELSE 0
                END
            ), 0)
            FROM event_registrations er
            LEFT JOIN events e ON er.event_id = e.id
            WHERE er.user_id = p_user_id
        ),
        'extraHours', (
            SELECT COALESCE(SUM(awarded_hours), 0)
            FROM extra_hours_requests
            WHERE user_id = p_user_id AND status = 'approved'
        )
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_profile_data(UUID) TO authenticated;

