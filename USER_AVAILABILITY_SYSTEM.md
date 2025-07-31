# User Availability System 🗓️

## 🎉 New Features Added

### ✅ **Smart Player Suggestions**
- **Availability-Based Search**: Players who are free on match day appear first
- **Visual Indicators**: Clear green checkmarks for available players
- **Intelligent Filtering**: System automatically prioritizes suitable players
- **Day-of-Week Detection**: Converts match date to day of week for matching

### ✅ **Personal Availability Management**
- **Easy Settings Page**: Simple toggle switches for each day of the week
- **Automatic Saving**: Changes save instantly with feedback
- **Default Available**: New users are considered available all days
- **Dashboard Integration**: Quick access from dashboard stats

### ✅ **Enhanced Match Creation**
- **Priority Search Results**: Available players show first with green badges
- **Separate Sections**: Clear distinction between available and other users
- **Real-time Updates**: Match date updates instantly affect search results
- **Better Organization**: Helps organizers find committed players

## 🗂️ Files Added/Modified

### New Files
- `user-availability-schema.sql` - Database schema for availability tracking
- `src/app/settings/availability/page.tsx` - Availability settings interface
- `USER_AVAILABILITY_SYSTEM.md` - This documentation

### Updated Files
- `src/lib/supabase.ts` - Added availability interfaces and helper functions
- `src/components/UserSearch.tsx` - Redesigned to prioritize available users
- `src/app/create-match/page.tsx` - Pass match date to search component
- `src/app/matches/[id]/page.tsx` - Pass match date for post-creation invites
- `src/app/dashboard/page.tsx` - Added availability settings quick link

## 🚀 How It Works

### **For Players:**

#### **Setting Your Availability:**
1. Go to **Dashboard**
2. Click **"Availability"** card in the stats section
3. Toggle switches for each day of the week
4. Changes save automatically

#### **Benefits:**
- 🎯 **Higher Visibility**: Appear first in search results for your available days
- ⚡ **More Invitations**: Organizers see you're reliable for specific days
- 🤝 **Better Matches**: Play with other committed players
- 🔄 **Flexible**: Can still join matches on "unavailable" days if plans change

### **For Match Organizers:**

#### **Smart Player Search:**
When creating or inviting players to matches:

1. **Search for Players**: Type names as usual
2. **Available Players First**: Users free on match day appear at the top
3. **Visual Indicators**: Green checkmarks show who's available
4. **Other Players**: Still shown below, but marked as "availability unknown"

#### **Search Result Sections:**
```
✅ Available on [Day Name] (3)
   🟢 John Smith - Available for this match
   🟢 Sarah Johnson - Available for this match
   🟢 Mike Wilson - Available for this match

⚠️  Other Users (2)
   ⏰ Alex Brown - Availability unknown
   ⏰ Lisa Davis - Availability unknown
```

## 🎯 **Smart Availability Logic**

### **Day of Week Mapping:**
- **Sunday** = 0
- **Monday** = 1
- **Tuesday** = 2
- **Wednesday** = 3
- **Thursday** = 4
- **Friday** = 5
- **Saturday** = 6

### **Default Behavior:**
- 🆕 **New Users**: Available all days (no restrictions)
- 🔍 **Search Priority**: Available users shown first, others below
- 📅 **Date Conversion**: Match date automatically converts to day of week
- 🔄 **Real-time**: Search results update as match date changes

### **Database Efficiency:**
- **Indexed Queries**: Fast lookups by user and day
- **Bulk Operations**: Handles multiple availability checks efficiently
- **Fallback Logic**: Graceful handling if availability data missing

## 📱 **User Experience Examples**

### **Example 1: Weekend Warriors**
1. **Sarah** sets herself available only on weekends (Saturday/Sunday)
2. **John** creates a Saturday match and searches for "Sarah"
3. **Result**: Sarah appears first with green "Available for this match" badge
4. **Outcome**: John knows Sarah is reliable for weekend games

### **Example 2: Weekday Players**
1. **Mike** available Monday-Friday only (works weekends)
2. **Alex** creates a Wednesday evening match
3. **Search Results**: Mike appears first in "Available on Wednesday" section
4. **Benefit**: Alex gets players who can commit to weekday matches

### **Example 3: Flexible Player**
1. **Lisa** marks herself unavailable on Fridays (date night)
2. **Tom** creates a Friday match and searches for "Lisa"
3. **Display**: Lisa appears in "Other Users" section
4. **Choice**: Tom can still invite Lisa, but knows she might decline

## 🔧 **Database Schema**

### **user_availability Table:**
```sql
CREATE TABLE user_availability (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  day_of_week INTEGER (0-6), -- 0=Sunday, 6=Saturday
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(user_id, day_of_week)
);
```

### **Helper Functions:**
- `get_user_availability(user_id)` - Get all 7 days for a user
- `set_user_availability(user_id, day, available)` - Update specific day
- `get_available_users_for_date(date)` - Find available users for match date
- `get_available_users_for_day(day_num)` - Find available users for day of week

## 🎊 **Benefits**

### **For Match Organizers:**
- ✅ **Better Player Discovery**: Find committed players faster
- ✅ **Reduced No-shows**: Invite people who are actually free
- ✅ **Efficient Planning**: See availability at a glance
- ✅ **Higher Success Rate**: More likely to fill matches

### **For Players:**
- ✅ **More Relevant Invites**: Get invited to matches you can actually attend
- ✅ **Increased Visibility**: Stand out when you're available
- ✅ **Better Reputation**: Build trust as a reliable player
- ✅ **Flexible Participation**: Still can join "unavailable" day matches

### **For the Community:**
- ✅ **Higher Match Success**: More matches reach full capacity
- ✅ **Better Commitment**: Players more likely to attend
- ✅ **Reduced Cancellations**: Fewer last-minute dropouts
- ✅ **Improved Experience**: Better organized, more reliable matches

## 🔄 **Setup Instructions**

### **1. Database Setup (Required)**
Run this in your **Supabase SQL Editor**:
```sql
-- Copy and paste the entire content from user-availability-schema.sql
-- This creates the table, indexes, policies, and helper functions
```

### **2. Test the Feature**
1. **Set Availability**: Go to Dashboard → Availability → Toggle some days off
2. **Create Match**: Create a match on an "available" day
3. **Search Players**: Notice available players appear first with green badges
4. **Test Different Days**: Change match date and see search results update

### **3. Verify Database**
Check that the availability system is working:
```sql
-- See all availability data
SELECT * FROM user_availability;

-- Test availability function
SELECT * FROM get_available_users_for_date('2024-03-15');
```

## 🎯 **Perfect For:**

### **Regular Weekly Games:**
- **Monday Night Football**: Players set themselves available on Mondays
- **Weekend Warriors**: Only available Saturday/Sunday players get priority
- **After Work Games**: Tuesday/Thursday evening regulars

### **Seasonal Planning:**
- **Summer League**: Players available specific days during season
- **Holiday Matches**: Account for changed availability during holidays
- **Tournament Prep**: Find players available for specific tournament days

### **Community Building:**
- **Local Clubs**: Members set regular availability for club matches
- **Corporate Teams**: Work colleagues set availability around work schedules
- **Friend Groups**: Regular playing groups coordinate availability

## 🚀 **Future Enhancements** (Ideas)

### **Potential Additions:**
- ⏰ **Time Slots**: More granular availability (morning/evening)
- 📍 **Location Preferences**: Availability by location/distance
- 📅 **Date-Specific**: One-off availability changes for holidays
- 🤖 **Smart Suggestions**: AI-powered match scheduling based on group availability
- 📊 **Analytics**: Show organizers the best days/times for their community

Your MatchHub now has **intelligent player matching** that makes organizing successful matches easier than ever! 🚀⚽

The system learns from player availability patterns and helps create better, more committed teams automatically. 