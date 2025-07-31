-- Troubleshooting Script for Match Edit Issues
-- Run this in Supabase SQL Editor if you're still getting errors

-- Option 1: Temporarily disable the match update trigger
DROP TRIGGER IF EXISTS match_update_notification_trigger ON matches;

-- Test your match edit now - if it works, the trigger was the issue
-- If it still fails, the issue is elsewhere

-- Option 2: Re-enable with the robust version (run the updated function first)
-- Then recreate the trigger:
-- CREATE TRIGGER match_update_notification_trigger
--   AFTER UPDATE ON matches
--   FOR EACH ROW EXECUTE FUNCTION handle_match_update();

-- Option 3: Check if there are any constraint violations
-- Run this to see recent errors:
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Option 4: Test the update directly in SQL to see the exact error
-- Replace 'your-match-id' with your actual match ID:
-- UPDATE matches 
-- SET pitch_type = '6-a-side', max_players = 12 
-- WHERE id = 'your-match-id'; 