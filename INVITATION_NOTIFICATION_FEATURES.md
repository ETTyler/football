# Invitation and Notification System

## 🎉 New Features Added

### ✅ 1. Invite People to Matches
- **User Search**: Smart search functionality to find users by name
- **Invitation Management**: Select multiple users to invite when creating a match
- **Custom Messages**: Add personal messages to invitations
- **Visual Feedback**: Shows number of selected invitees on create button

### ✅ 2. Notification System
- **Real-time Notifications**: Bell icon in navigation with unread count
- **Notification Types**:
  - Match invitations
  - Invitation accepted/declined responses
  - New match announcements (optional)
- **Interactive Actions**: Accept/decline invitations directly from notifications
- **Full Notifications Page**: Complete notification management interface

### ✅ 3. Database Schema
- **`invitations` table**: Tracks match invitations with status
- **`notifications` table**: Stores all notification types
- **Automatic Triggers**: Database functions handle notification creation
- **RLS Policies**: Secure access control for all new tables

## 🗂️ Files Added/Modified

### New Components
- `src/components/UserSearch.tsx` - User search and selection
- `src/components/NotificationCenter.tsx` - Notification dropdown
- `src/app/notifications/page.tsx` - Full notifications page

### Updated Files
- `src/lib/supabase.ts` - Added types and helper functions
- `src/components/Navigation.tsx` - Added notification center
- `src/app/create-match/page.tsx` - Added invitation functionality

### Database Files
- `database-schema-updates.sql` - New tables and functions

## 🚀 How to Set Up

### 1. Database Setup
Run the SQL commands in `database-schema-updates.sql` in your Supabase SQL Editor:

```sql
-- This will create:
-- - invitations table
-- - notifications table  
-- - Trigger functions for automatic notifications
-- - RLS policies for security
```

### 2. Optional: Enable New Match Notifications
If you want ALL users to be notified when new matches are created, uncomment these lines in the SQL file:

```sql
DROP TRIGGER IF EXISTS new_match_notification_trigger ON matches;
CREATE TRIGGER new_match_notification_trigger
  AFTER INSERT ON matches
  FOR EACH ROW EXECUTE FUNCTION handle_new_match_notification();
```

**⚠️ Warning**: This will send notifications to all users for every new match. You might want to add location-based or preference-based filtering.

### 3. Restart Your Application
```bash
npm run dev
```

## 📱 User Experience

### Creating a Match with Invitations
1. Go to "Create Match" page
2. Fill in match details as usual
3. Scroll to "Invite Players" section
4. Search for users by typing their names
5. Select users to invite
6. Customize the invitation message
7. Create match - invitations are sent automatically

### Receiving Notifications
1. Bell icon in navigation shows unread count
2. Click bell to see recent notifications
3. Accept/decline invitations directly from dropdown
4. Visit `/notifications` for full notification management

### Managing Notifications
- Mark individual notifications as read
- Mark all notifications as read
- Delete unwanted notifications
- Filter by type (all, unread, invitations)
- View related match details

## 🔧 Customization Options

### Notification Preferences
You can extend the system to add user preferences:
```sql
-- Example: Add notification preferences to user_profiles
ALTER TABLE user_profiles ADD COLUMN notification_preferences JSONB DEFAULT '{"new_matches": true, "invitations": true}';
```

### Location-Based Notifications
Modify the `handle_new_match_notification()` function to only notify users within a certain radius:
```sql
-- Example: Only notify users within 50km
WHERE ST_DWithin(
  ST_MakePoint(user_location_lng, user_location_lat)::geography,
  ST_MakePoint(NEW.longitude, NEW.latitude)::geography,
  50000 -- 50km in meters
)
```

### Rate Limiting
The current system limits new match notifications to 50 users to prevent spam. Adjust this in the SQL function:
```sql
LIMIT 50 -- Change this number or remove entirely
```

## 🎯 Next Steps (Optional Enhancements)

### Email Notifications
Add email sending capability:
- Install email service (SendGrid, Resend, etc.)
- Create API route to send emails
- Trigger emails for important notifications

### Push Notifications
Add browser push notifications:
- Service worker setup
- Push notification permissions
- Real-time updates via websockets

### Friends System
Add user relationships:
- Friend requests and connections
- Only notify friends of new matches
- Friend-based invitation suggestions

### Advanced Filtering
- Location-based notifications
- Skill level matching
- Time/day preferences
- Sport type preferences

## 🐛 Troubleshooting

### Notifications Not Appearing
1. Check database permissions (RLS policies)
2. Verify user is authenticated
3. Check browser console for errors
4. Ensure database triggers are installed

### Invitations Not Working
1. Verify `invitations` table exists
2. Check user has permission to create invitations
3. Ensure notification triggers are working
4. Check for duplicate invitation constraints

### Search Not Finding Users
1. Verify `user_profiles` table has data
2. Check search is case-insensitive
3. Ensure RLS allows reading user profiles
4. Verify users have proper names set

## 🎊 Features Summary

✅ **Match Creation**: Invite users when creating matches  
✅ **Smart Search**: Find users by name with autocomplete  
✅ **Notifications**: Real-time notification system  
✅ **Interactive UI**: Accept/decline invitations in-app  
✅ **Complete Management**: Full notifications page  
✅ **Secure**: Proper RLS policies and permissions  
✅ **Scalable**: Efficient database queries and indexing  

Your MatchHub app now has a complete invitation and notification system! 🚀 