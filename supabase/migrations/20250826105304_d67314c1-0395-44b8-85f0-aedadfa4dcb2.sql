-- Create function to get common clubs between two users
CREATE OR REPLACE FUNCTION get_common_clubs(user_1_id uuid, user_2_id uuid)
RETURNS TABLE(
  club_id uuid,
  club_name text,
  club_description text,
  club_avatar_url text,
  club_code text
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    c.id,
    c.group_name,
    c.group_description,
    c.group_avatar_url,
    c.club_code
  FROM conversations c
  WHERE c.is_group = true
    AND c.id IN (
      SELECT gm1.conversation_id 
      FROM group_members gm1 
      WHERE gm1.user_id = user_1_id
    )
    AND c.id IN (
      SELECT gm2.conversation_id 
      FROM group_members gm2 
      WHERE gm2.user_id = user_2_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;