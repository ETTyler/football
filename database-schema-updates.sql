-- MatchHub Database Schema Updates
-- Additional tables for invitations and notifications
-- Run these commands in your Supabase SQL Editor

-- Create invitations table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  inviter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invitee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  message TEXT,
  UNIQUE(match_id, invitee_id)
);

-- Create notifications table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('match_invitation', 'new_match', 'match_update', 'invitation_accepted', 'invitation_declined')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  related_match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  related_invitation_id UUID REFERENCES invitations(id) ON DELETE CASCADE,
  data JSONB -- For additional context data
);

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS invitations_match_idx ON invitations(match_id);
CREATE INDEX IF NOT EXISTS invitations_inviter_idx ON invitations(inviter_id);
CREATE INDEX IF NOT EXISTS invitations_invitee_idx ON invitations(invitee_id);
CREATE INDEX IF NOT EXISTS invitations_status_idx ON invitations(status);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(read);
CREATE INDEX IF NOT EXISTS notifications_type_idx ON notifications(type);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);

-- Enable RLS on new tables
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate them
-- RLS Policies for invitations table
DROP POLICY IF EXISTS "Users can view their invitations" ON invitations;
CREATE POLICY "Users can view their invitations" ON invitations
  FOR SELECT USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

DROP POLICY IF EXISTS "Organizers can create invitations" ON invitations;
CREATE POLICY "Organizers can create invitations" ON invitations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    auth.uid() = inviter_id AND
    EXISTS (SELECT 1 FROM matches WHERE id = match_id AND organizer_id = auth.uid())
  );

DROP POLICY IF EXISTS "Invitees can update invitation status" ON invitations;
CREATE POLICY "Invitees can update invitation status" ON invitations
  FOR UPDATE USING (auth.uid() = invitee_id);

DROP POLICY IF EXISTS "Inviters can delete their invitations" ON invitations;
CREATE POLICY "Inviters can delete their invitations" ON invitations
  FOR DELETE USING (auth.uid() = inviter_id);

-- RLS Policies for notifications table
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
CREATE POLICY "Users can view their notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;
CREATE POLICY "Users can update their notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their notifications" ON notifications;
CREATE POLICY "Users can delete their notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_related_match_id UUID DEFAULT NULL,
  p_related_invitation_id UUID DEFAULT NULL,
  p_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, related_match_id, related_invitation_id, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_related_match_id, p_related_invitation_id, p_data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle invitation status updates
CREATE OR REPLACE FUNCTION handle_invitation_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If invitation was accepted, add user to match participants
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    INSERT INTO match_participants (match_id, user_id)
    VALUES (NEW.match_id, NEW.invitee_id)
    ON CONFLICT (match_id, user_id) DO NOTHING;
    
    -- Notify the inviter that invitation was accepted
    PERFORM create_notification(
      NEW.inviter_id,
      'invitation_accepted',
      'Invitation Accepted!',
      (SELECT up.full_name FROM user_profiles up WHERE up.id = NEW.invitee_id) || 
      ' accepted your invitation to ' || 
      (SELECT m.title FROM matches m WHERE m.id = NEW.match_id),
      NEW.match_id,
      NEW.id
    );
    
  -- If invitation was declined, notify the inviter
  ELSIF OLD.status = 'pending' AND NEW.status = 'declined' THEN
    PERFORM create_notification(
      NEW.inviter_id,
      'invitation_declined',
      'Invitation Declined',
      (SELECT up.full_name FROM user_profiles up WHERE up.id = NEW.invitee_id) || 
      ' declined your invitation to ' || 
      (SELECT m.title FROM matches m WHERE m.id = NEW.match_id),
      NEW.match_id,
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for invitation updates
DROP TRIGGER IF EXISTS invitation_status_change_trigger ON invitations;
CREATE TRIGGER invitation_status_change_trigger
  AFTER UPDATE ON invitations
  FOR EACH ROW EXECUTE FUNCTION handle_invitation_update();

-- Function to create invitation notifications
CREATE OR REPLACE FUNCTION handle_new_invitation()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for the invitee
  PERFORM create_notification(
    NEW.invitee_id,
    'match_invitation',
    'Match Invitation!',
    (SELECT up.full_name FROM user_profiles up WHERE up.id = NEW.inviter_id) || 
    ' invited you to join ' || 
    (SELECT m.title FROM matches m WHERE m.id = NEW.match_id),
    NEW.match_id,
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new invitations
DROP TRIGGER IF EXISTS new_invitation_trigger ON invitations;
CREATE TRIGGER new_invitation_trigger
  AFTER INSERT ON invitations
  FOR EACH ROW EXECUTE FUNCTION handle_new_invitation();

-- Function to handle match updates and notify participants (ROBUST VERSION)
CREATE OR REPLACE FUNCTION handle_match_update()
RETURNS TRIGGER AS $$
DECLARE
  participant_record RECORD;
  changes_array TEXT[] := '{}';
  changes_message TEXT := '';
  change_title TEXT := 'Match Details Updated';
BEGIN
  -- Skip if this is just a player count update (to avoid spam)
  IF OLD.current_players != NEW.current_players AND 
     OLD.title = NEW.title AND OLD.date = NEW.date AND OLD.time = NEW.time AND 
     OLD.location = NEW.location AND OLD.pricing = NEW.pricing AND 
     OLD.max_players = NEW.max_players AND 
     COALESCE(OLD.notes, '') = COALESCE(NEW.notes, '') THEN
    RETURN NEW;
  END IF;

  -- Detect what changed
  IF OLD.title != NEW.title THEN
    changes_array := array_append(changes_array, 'title changed to "' || NEW.title || '"');
  END IF;
  
  IF OLD.date != NEW.date THEN
    changes_array := array_append(changes_array, 'date changed to ' || to_char(NEW.date::date, 'FMMonth DD, YYYY'));
  END IF;
  
  IF OLD.time != NEW.time THEN
    changes_array := array_append(changes_array, 'time changed to ' || NEW.time);
  END IF;
  
  IF OLD.location != NEW.location THEN
    changes_array := array_append(changes_array, 'location changed to "' || NEW.location || '"');
  END IF;
  
  IF OLD.pricing != NEW.pricing THEN
    changes_array := array_append(changes_array, 'price changed to £' || NEW.pricing);
  END IF;
  
  IF OLD.max_players != NEW.max_players THEN
    changes_array := array_append(changes_array, 'max players changed to ' || NEW.max_players);
  END IF;
  
  IF OLD.pitch_type != NEW.pitch_type THEN
    changes_array := array_append(changes_array, 'pitch type changed to ' || NEW.pitch_type);
  END IF;
  
  IF COALESCE(OLD.notes, '') != COALESCE(NEW.notes, '') THEN
    changes_array := array_append(changes_array, 'additional notes updated');
  END IF;

  -- Only proceed if there are actual changes to notify about
  IF array_length(changes_array, 1) > 0 THEN
    -- Build the changes message
    IF array_length(changes_array, 1) = 1 THEN
      changes_message := 'The ' || changes_array[1] || '.';
    ELSIF array_length(changes_array, 1) = 2 THEN
      changes_message := 'The ' || changes_array[1] || ' and ' || changes_array[2] || '.';
    ELSE
      changes_message := 'Multiple details were updated: ' || array_to_string(changes_array, ', ') || '.';
    END IF;

    -- Notify all participants (except the organizer who made the change)
    -- Use exception handling to prevent notification failures from breaking the update
    BEGIN
      FOR participant_record IN 
        SELECT DISTINCT mp.user_id 
        FROM match_participants mp 
        WHERE mp.match_id = NEW.id 
        AND mp.user_id != NEW.organizer_id
      LOOP
        -- Try to create notification, but don't fail if it doesn't work
        BEGIN
          PERFORM create_notification(
            participant_record.user_id,
            'match_update',
            change_title,
            'The match "' || NEW.title || '" has been updated. ' || changes_message || ' Please check the updated details.',
            NEW.id,
            NULL,
            jsonb_build_object('changes', changes_array)
          );
        EXCEPTION WHEN OTHERS THEN
          -- Log the error but don't fail the match update
          RAISE NOTICE 'Failed to create notification for user %: %', participant_record.user_id, SQLERRM;
        END;
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      -- If there's any error with the notification process, log it but don't fail
      RAISE NOTICE 'Failed to process match update notifications: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for match updates
DROP TRIGGER IF EXISTS match_update_notification_trigger ON matches;
CREATE TRIGGER match_update_notification_trigger
  AFTER UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION handle_match_update();

-- Function to notify about new public matches (optional feature)
CREATE OR REPLACE FUNCTION handle_new_match_notification()
RETURNS TRIGGER AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Only send notifications for future matches
  IF NEW.date >= CURRENT_DATE THEN
    -- Notify all users except the organizer about new public matches
    -- You can add additional filters here (e.g., location-based, friends only, etc.)
    FOR user_record IN 
      SELECT id FROM auth.users 
      WHERE id != NEW.organizer_id 
      AND id IN (SELECT id FROM user_profiles) -- Only users with profiles
      LIMIT 50 -- Limit to avoid spam
    LOOP
      PERFORM create_notification(
        user_record.id,
        'new_match',
        'New Match Available!',
        'A new ' || NEW.pitch_type || ' match "' || NEW.title || '" is available on ' || 
        to_char(NEW.date, 'FMMonth DD, YYYY'),
        NEW.id
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Uncomment this trigger if you want notifications for ALL new matches
-- (You might want to make this more selective based on user preferences or location)
-- DROP TRIGGER IF EXISTS new_match_notification_trigger ON matches;
-- CREATE TRIGGER new_match_notification_trigger
--   AFTER INSERT ON matches
--   FOR EACH ROW EXECUTE FUNCTION handle_new_match_notification();

-- Add updated_at trigger to new tables (only if it doesn't already exist)
DROP TRIGGER IF EXISTS update_invitations_updated_at ON invitations;
CREATE TRIGGER update_invitations_updated_at BEFORE UPDATE ON invitations
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Helper function to get user's unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM notifications
    WHERE user_id = p_user_id AND read = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 